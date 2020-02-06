import path from 'path'
import { loadJunitToBq } from './lib/functions/load_junit'

// このようにアップロードする
// gsutil -h x-goog-meta-build_id:11 -h x-goog-meta-job_name:gcf_junit_xml_to_bq cp example/functions.xml gs://kesin11-pipeline-metrics-bq/junit/
// metadataはx-goog-meta-以降の文字列がそのまま使われる。ただし、自動で小文字に変換されるので注意
exports.dispatch = async (data: any, context: any) => {
  const file = data;
  console.log(`  Bucket: ${file.bucket}`);
  console.log(`  File: ${file.name}`);
  console.log(`  ContentType: ${file.contentType}`);
  // x-goog-metaのprefixを除いたキーがリストアップされる
  console.log(`  metadata: ${JSON.stringify(file.metadata)}`);

  // 実際に実行するfunctionsを条件によって選択
  if (path.dirname(file.name).startsWith('junit') && file.contentType !== 'application/xml') {
    console.log("dispatch: loadJunitToBq")
    return await loadJunitToBq(file)
  } else{
    // XML以外のファイル、GCSへのディレクトリ作成の場合は何もしないで終了
    console.warn("Any functions have not been dispatched.")
    return
  }
}