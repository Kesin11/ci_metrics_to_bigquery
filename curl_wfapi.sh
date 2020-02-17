#!/bin/sh
set -eu

# JenkinsのWorkFlowを使っている全ジョブのビルド情報を取得し、JSONをGCSにアップロードしてBigQueryにloadまでを実行させる

USER=${JENKINS_USER}
TOKEN=${JENKINS_TOKEN}
JENKINS_HOME=${JENKINS_HOME}
GCS_BUCKET=${GCS_BUCKET}
DATE=`date '+%Y%m%d%H%M'`
OUTPUT_DIR="wfapi"

CURL="curl -u ${USER}:${TOKEN} -s ${JENKINS_HOME}/api/json"
# Pipelineのジョブだけに限定
JQ="jq -r '.jobs[] | select(._class == \"org.jenkinsci.plugins.workflow.job.WorkflowJob\") | .name'"
# NOTE: ジョブ名でフィルタリングしたい場合は、jqの後にパイプでgrepを追加する
COMMAND="${CURL} | ${JQ}"


mkdir -p ${OUTPUT_DIR}
for job_name in `eval ${COMMAND}`; do
  wfapi_url="${JENKINS_HOME}/job/${job_name}/wfapi/runs?fullStages=true"
  output_json="${OUTPUT_DIR}/wfapi_${job_name}_${DATE}.json"

  curl -u "${USER}:${TOKEN}" -s ${wfapi_url} > ${output_json}
  gsutil cp ${output_json} gs://${GCS_BUCKET}/job/
done
