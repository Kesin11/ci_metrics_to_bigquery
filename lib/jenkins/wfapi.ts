// Jenkinsのjob名すべてを取得するAPIは多分これ？
// http://localhost:8080/api/json?tree=jobs[name]
// できれば最後の実行日とかでフィルタリングしたいので、他のAPIがあるか探したい
// 最悪、jqと組み合わせればジョブの名前でdaily-となってるやつだけフィルタリングすることもできそう

// pipelineの情報はこのAPI
// http://localhost:8080/job/build-pipeline/wfapi/runs?fullStages=true

// 理想はJenkinsのAPIを叩くのはcurlとjqだけにして、アップした先のFunctionsでいい感じに整形すること

// 追加で欲しい型
// isSuccess: boolean status見ればOK
// jobName: string // rootの_linkの中身を見ればパース可能
// buildTag: string // jenkins-${jobName}-${id}でENVに自動的に入ってるやつ。jobNameが分かれば自作可能
//  これは後でBigQuery側で重複レコードを省いて集計するときに使う
// 
// 値を直したキーを追加するもの
// *Millis: /1000してsecに直す。名前から単にMillsを消すだけでいい
// *TimeMillis: /1000してDateTimeにする。タイムゾーンは多分UTCになってる
//
// 消すもの
// _links, log, console

// 最終的にbuildごとに1行のrowJSONに変換してBigQueryに食わせる

type Job = {
  id: string
  name: string
  status: string
  startTimeMillis: number
  startTime: string
  endTimeMillis: number
  endTime: string
  durationMillis: number
  duration: number
  queueDurationMillis: number
  queueDuration: number
  pauseDurationMillis: number
  pauseDuration: number
  stages: Stage[]
  isSuccess: boolean
  jobName: string
  buildTag: string
}

type Stage = {
  id: string
  name: string
  execNode: string
  status: string
  startTimeMillis: number
  startTime: string
  durationMillis: number
  duration: number
  pauseDurationMillis: number
  pauseDuration: number
  stageFlowNodes: StageFlowNode[]
}

type StageFlowNode = {
  id: string
  name: string
  execNode: string
  status: string
  parameterDescription: string
  startTimeMillis: number
  startTime: string
  durationMillis: number
  duration: number
  pauseDurationMillis: number
  pauseDuration: number
  parentNodes: string[]
}

export const parse = (obj: {[key: string]: any}): Job => {

}
