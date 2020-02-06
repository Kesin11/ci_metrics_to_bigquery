# __tests__/gen_dummy_junit/テストを実行してダミーのXMLを生成、GCSにアップするスクリプト
#
# junit/の中身を最初に削除し、適当な回数テストを実行してXMLを生成
# 1つ1つに異なるmetadata(build_id)を付与しつつ、GCSにアップする
# GCFが正しく発火されれば、BigQueryにまとまった数のダミーデータが登録される

set -u

DUMMY_NUM=20
BUILD_ID=1
JOB_NAME=gcf_junit_xml_to_bq
BUCKET=${BUCKET_PREFIX}-pipeline-metrics-bq # BUCKET_PREFIX from ENV

# rm -f ./junit/*
# for i in `seq 1 ${DUMMY_NUM}`
# do
#   npm run test -- __tests__/gen_dummy_junit
# done

for name in `ls junit`
do
  echo $name
  echo "BUILD_ID = ${BUILD_ID}"
  BUILD_ID=`expr ${BUILD_ID} + 1`
  gsutil \
    -h x-goog-meta-build_id:${BUILD_ID} \
    -h x-goog-meta-job_name:${JOB_NAME} \
    cp junit/${name} gs://${BUCKET}/junit/
done
