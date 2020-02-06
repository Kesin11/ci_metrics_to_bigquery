import { Storage } from '@google-cloud/storage'
import dayjs from 'dayjs'

// バケットに日付ごとのディレクトリを自動で作成して保存する
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
