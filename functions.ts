import path from 'path'
import os from 'os'
import fs from 'fs'
import { Storage } from '@google-cloud/storage'
import { BigQuery } from '@google-cloud/bigquery'
import { parse, TestSuites } from 'junit2json'

type ExtendedTestSuites = TestSuites & {
  allSuccess?: boolean,
  created?: string,
  metadata?: { [key: string]: any }
}

// 同名のファイルをアップロードした場合でもgoogle.storage.object.finalizeはトリガーされる
// 新規作成と上書きを区別する方法が無いため、新規作成のときだけにフィルタリングは不可能
// ref: https://cloud.google.com/storage/docs/object-versioning

// ディレクトリ名をtable名として返す
// ネストした場合は'_'で連結
// 直下（./)の場合は'default'を返す
const filePathToTable = (filePath: string): string => {
  const defaultTable = 'default'

  const dirname = path.dirname(filePath)
  if (dirname === '.') return defaultTable

  return dirname.replace('/', '_')
}

const nowISOString = () => {
  const date = new Date()
  return date.toISOString()
}

// <system-out>, <system-err>のタグは中身が大きい場合があるのでBigQueryに保存させたくない
const replacer = (key: any, value: any) => {
  if (key === 'system-out' || key === 'system-err') return undefined
  return value
}

// XMLをJSON(+独自フィールド追加）に変換
const createJunitTestSuites = async (file: any): Promise<ExtendedTestSuites> => {
  const storage = new Storage()
  const bucket = storage.bucket(file.bucket)
  const uploadedXML = await bucket.file(file.name).download()

  // download()の結果の型はBufferなので、toStringでstringに変換
  const testSuites: ExtendedTestSuites = await parse(uploadedXML.toString())

  // 独自フィールドの追加
  testSuites['allSuccess'] = (testSuites['failures'] === 0 && testSuites['error'] === 0) ? true : false
  // もしtestsuite.0.timestampから取得できなければ、GCF上で起動したときの時間
  testSuites['created'] = testSuites['testsuite'][0]['timestamp'] || nowISOString()
  testSuites['metadata'] = file.metadata

  // console.log(`  testSuites: ${JSON.stringify(convertedJson, null, 2)}`)
  return testSuites
}

// BigQueryにload
const loadJunitJson = async (file: any, testSuites: ExtendedTestSuites) => {
  // BigQuery loadのためにjsonを書き出す
  const tempJsonPath = path.join(os.tmpdir(), path.basename(file.name))
  // replacerで余計なキーは削除
  const convertedJson = JSON.stringify(testSuites, replacer)
  fs.writeFileSync(tempJsonPath, convertedJson)

  const bigquery = new BigQuery()
  const results = await bigquery
    .dataset('pipeline')
    // GCS上のパスからload先のtableを選択
    .table(filePathToTable(file.name))
    .load(tempJsonPath, {
      autodetect: true,
      schemaUpdateOptions: ['ALLOW_FIELD_ADDITION'],
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_APPEND',
    })

  const job = results[0]
  console.log(`Job ${job.id} completed.`)

  fs.unlinkSync(tempJsonPath)

  // jobのエラーチェックとエラーハンドリング
  const errors = job.status?.errors
  if (errors && errors.length > 0) {
    throw errors
  }
}

// このようにアップロードする
// gsutil -h x-goog-meta-build_id:11 -h x-goog-meta-job_name:gcf_junit_xml_to_bq cp example/functions.xml gs://kesin11-pipeline-metrics-bq/junit/
// metadataはx-goog-meta-以降の文字列がそのまま使われる。ただし、自動で小文字に変換されるので注意
exports.loadJunitToBq = async (data: any, context: any) => {
  const file = data;
  console.log(`  Bucket: ${file.bucket}`);
  console.log(`  File: ${file.name}`);
  console.log(`  ContentType: ${file.contentType}`);
  // x-goog-metaのprefixを除いたキーがリストアップされる
  console.log(`  metadata: ${JSON.stringify(file.metadata)}`);

  // XML以外のファイル、ディレクトリ作成の場合は何もしないで終了
  if (file.contentType !== 'application/xml') return

  const testSuites = await createJunitTestSuites(file)
  await loadJunitJson(file, testSuites)
}