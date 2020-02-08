import path from 'path'
import os from 'os'
import fs from 'fs'
import { Storage } from '@google-cloud/storage'
import { BigQuery } from '@google-cloud/bigquery'
import { parse, TestSuites } from 'junit2json'
import dayjs from 'dayjs'
import { backupFile } from '../gcs'

const BACKUP_BUCKET = process.env.BACKUP_BUCKET

// NOTE: 同名のファイルをアップロードした場合でもgoogle.storage.object.finalizeはトリガーされる
// 新規作成と上書きを区別する方法が無いため、新規作成のときだけにフィルタリングは不可能
// ref: https://cloud.google.com/storage/docs/object-versioning

type ExtendedTestSuites = TestSuites & {
  allSuccess?: boolean,
  created?: string,
  metadata?: { [key: string]: any }
}

// ディレクトリ名をtable名として返す
// ネストした場合は'_'で連結
// 直下（./)の場合は'default'を返す
const filePathToTable = (filePath: string): string => {
  const defaultTable = 'default'

  const dirname = path.dirname(filePath)
  if (dirname === '.') return defaultTable

  return dirname.replace('/', '_')
}

// <system-out>, <system-err>のタグは中身が大きい場合があるのでBigQueryに保存させたくない
const replacer = (key: any, value: any) => {
  if (key === 'system-out' || key === 'system-err') return undefined
  return value
}

const isAllSuccess = (testSuites: TestSuites): boolean => {
  const failures = testSuites['failures'] || 0
  const errors = testSuites['errors'] || 0
  return (failures === 0 && errors === 0) ? true : false
}

// XMLをJSON(+独自フィールド追加）に変換
const createJunitTestSuites = async (file: any): Promise<ExtendedTestSuites> => {
  const storage = new Storage()
  const bucket = storage.bucket(file.bucket)
  const uploadedXML = await bucket.file(file.name).download()

  // download()の結果の型はBufferなので、toStringでstringに変換
  const testSuites: ExtendedTestSuites = await parse(uploadedXML.toString())

  // 独自フィールドの追加
  testSuites['allSuccess'] = isAllSuccess(testSuites)
  // もしtestsuite.0.timestampから取得できなければ、GCF上で起動したときの時間
  testSuites['created'] = testSuites['testsuite'][0]['timestamp'] || dayjs().format()
  testSuites['metadata'] = file.metadata

  return testSuites
}

// BigQueryにload
const loadJunitJson = async (fileName: string, json: string): Promise<string> => {
  // BigQuery loadのためにjsonをファイルに書き出す
  const tempJsonPath = path.join(os.tmpdir(), path.basename(fileName))
  fs.writeFileSync(tempJsonPath, json)

  const bigquery = new BigQuery()
  const results = await bigquery
    .dataset('pipeline')
    // GCS上のパスからload先のtableを選択
    .table(filePathToTable(fileName))
    .load(tempJsonPath, {
      autodetect: true,
      schemaUpdateOptions: ['ALLOW_FIELD_ADDITION'],
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_APPEND',
    })

  const job = results[0]
  console.log(`BigQuery job ${job.id} completed.`)

  // jobのエラーチェックとエラーハンドリング
  const errors = job.status?.errors
  if (errors && errors.length > 0) {
    throw errors
  }

  return tempJsonPath
}

export const loadJunitToBq = async (file: any) => {
  if (!BACKUP_BUCKET) {
    throw 'env.BACKUP_BUCKET is null!! Please set correct backup GCS bucket name.'
  }

  const testSuites = await createJunitTestSuites(file)
  // console.log(`  testSuites: ${JSON.stringify(testSuites, null, 2)}`)

  // replacerで余計なキーは削除
  const convertedJson = JSON.stringify(testSuites, replacer)

  const tempJsonPath = await loadJunitJson(file.name, convertedJson)

  // BigQueryにloadしたjsonを別のバケットにバックアップとして保存する
  const destFilename = file.name + '.json'
  await backupFile(BACKUP_BUCKET, tempJsonPath, destFilename)
  fs.unlinkSync(tempJsonPath)
}
