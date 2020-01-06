const { Storage } = require('@google-cloud/storage');
const { BigQuery } = require('@google-cloud/bigquery')

exports.helloGCSGeneric = async (data, context) => {
  const file = data;
  console.log(`  Event ${context.eventId}`);
  console.log(`  Event Type: ${context.eventType}`);
  console.log(`  Bucket: ${file.bucket}`);
  console.log(`  File: ${file.name}`);
  console.log(`  Metageneration: ${file.metageneration}`);
  console.log(`  Created: ${file.timeCreated}`);
  console.log(`  Updated: ${file.updated}`);
  // x-goog-metaのprefixを除いたキーがリストアップされる
  console.log(`  metadata: ${JSON.stringify(file.metadata)}`);
  // このようにアップする
  // gsutil -h x-goog-meta-build-id:11 cp out/functions.xml.json gs://kesin11-junit-bigquery/

  const storage = new Storage()
  const bucket = storage.bucket('kesin11-junit-bigquery')
  const uploadedFile = bucket.file(file.name)

  // download()の結果の型はBufferなので、toStringでstringに変換
  const tmpFile = await uploadedFile.download()
  console.log(`  uploadedFile: ${JSON.stringify(tmpFile.toString())}`)

  const bigquery = new BigQuery()
  // BigQueryはGCSから直接アップできる
  const results = await bigquery
    .dataset('junit')
    .table('raw')
    .load(uploadedFile, {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      autodetect: true
    })

  const job = results[0]
  console.log(`Job ${job.id} completed.`)

  // Check job status for handle errors
  const errors = job.status.errors
  if (errors && errors.length > 0) {
    throw errors
  }
};