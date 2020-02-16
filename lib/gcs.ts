import { Storage, File } from '@google-cloud/storage'
import dayjs from 'dayjs'

// ローカルのファイルをバケットに日付ごとのディレクトリを自動で作成して保存する
// YYYYMMDD/${destFilename}
export const backupFile = async (bucketName: string, srcPath: string, destFilename: string) => {
  const today = dayjs().format('YYYYMMDD')
  const storage = new Storage()
  await storage
    .bucket(bucketName)
    .upload(srcPath, {
      destination: `${today}/${destFilename}`,
      gzip: true
    })
}

// GCSのファイルをバケットに日付ごとのディレクトリを自動で作成して保存する
// YYYYMMDD/${destFilename}
export const backupBucketFile = async (destBucketName: string, bucketFile: File, destFilename: string) => {
  const today = dayjs().format('YYYYMMDD')
  const storage = new Storage()
  const destFile = storage.bucket(destBucketName).file(`${today}/${destFilename}`)

  await bucketFile.copy(destFile)
}
