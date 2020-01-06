const path = require('path')
const os = require('os')
const fs = require('fs')
const { Storage } = require('@google-cloud/storage');
const { BigQuery } = require('@google-cloud/bigquery')
const junit2json = require('./lib/junit2json')

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
  // gsutil -h x-goog-meta-build-id:11 cp example/functions.xml gs://kesin11-junit-bigquery/

  const storage = new Storage()
  const bucket = storage.bucket('kesin11-junit-bigquery')
  const uploadedXML = await bucket.file(file.name).download()

  // download()の結果の型はBufferなので、toStringでstringに変換
  const convertedJson = await junit2json.parse(uploadedXML.toString())
  console.log(`  convertedJson: ${JSON.stringify(convertedJson)}`)

  // BigQuery loadのためにjsonを書き出す
  const tempJsonPath = path.join(os.tmpdir(), file.name)
  fs.writeFileSync(tempJsonPath, JSON.stringify(convertedJson))

  const bigquery = new BigQuery()
  // BigQueryはGCSから直接アップできる
  const results = await bigquery
    .dataset('junit')
    .table('raw')
    .load(tempJsonPath, {
      // schema: schema,
      autodetect: true,
      schemaUpdateOptions: ['ALLOW_FIELD_ADDITION'],
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_APPEND',
    })

  const job = results[0]
  console.log(`Job ${job.id} completed.`)

  fs.unlinkSync(tempJsonPath)

  // Check job status for handle errors
  const errors = job.status.errors
  if (errors && errors.length > 0) {
    throw errors
  }
};