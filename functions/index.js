const { Storage } = require('@google-cloud/storage');

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
  const uploadedFile = await bucket.file(file.name).download()

  // download()の結果の型はBufferなので、toStringでstringに変換
  console.log(`  uploadedFile: ${JSON.stringify(uploadedFile.toString())}`)
};