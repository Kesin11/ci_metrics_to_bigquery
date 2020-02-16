import path from 'path'
import os from 'os'
import fs from 'fs'
import { Storage } from '@google-cloud/storage'
import { BigQuery } from '@google-cloud/bigquery'
import { parse, Job } from '../jenkins/wfapi'
import { backupFile } from '../gcs'

const BACKUP_BUCKET = process.env.BACKUP_BUCKET

// ディレクトリ名をtable名として返す
// ネストした場合は'_'で連結
// 直下（./)の場合は'default'を返す
const filePathToTable = (filePath: string): string => {
  const defaultTable = 'default'

  const dirname = path.dirname(filePath)
  if (dirname === '.') return defaultTable

  return dirname.replace('/', '_')
}

// wfapiのJSONを整形してJob[]に変換
const createJobs = async (file: any): Promise<Job[]> => {
  const storage = new Storage()
  const bucket = storage.bucket(file.bucket)
  const uploadedJson = await bucket.file(file.name).download()

  const uploaded = JSON.parse(uploadedJson.toString())
  return uploaded.map((build: {[key: string]: any}) => {
    return parse(build)
  })
}

// BigQueryにload
const loadJobJson = async (fileName: string, rowJson: string): Promise<string> => {
  // BigQuery loadのためにjsonをファイルに書き出す
  const tempJsonPath = path.join(os.tmpdir(), path.basename(fileName))
  fs.writeFileSync(tempJsonPath, rowJson)

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

export const loadJobToBq = async (file: any) => {
  if (!BACKUP_BUCKET) {
    throw 'env.BACKUP_BUCKET is null!! Please set correct backup GCS bucket name.'
  }

  const jobs = await createJobs(file)

  const rowJson = jobs.map((row) => JSON.stringify(row)).join("\n")
  const tempJsonPath = await loadJobJson(file.name, rowJson)

  // BigQueryにloadしたjsonを別のバケットにバックアップとして保存する
  const destFilename = file.name
  await backupFile(BACKUP_BUCKET, tempJsonPath, destFilename)
  fs.unlinkSync(tempJsonPath)
}
