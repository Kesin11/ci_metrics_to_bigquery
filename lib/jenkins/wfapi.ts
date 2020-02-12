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
// nodeSumDurationMillis: number // rootのdurationは分割されたstagesがキュー待ちしている時間を含んでいるため、stageFlowNodesのdurationを合計する
//   ちなみに、queueDurationは正確ではないように見えるのでアテにしてない
// nodeSumDuration: number // nodeSumDurationMillisをsecに直したもの
// 
// 値を直したキーを追加するもの
// *Millis: /1000してsecに直す。名前から単にMillsを消すだけでいい
// *TimeMillis: /1000してDateTimeのISO文字列にする
//
// 消すもの
// _links, log, console, error

// 最終的にbuildごとに1行のrowJSONに変換してBigQueryに食わせる

import dayjs from 'dayjs'

export type Job = {
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
  nodeSumDurationMillis: number
  nodeSumDuration: number
  stages: Stage[]
  isSuccess: boolean // statusがSUCCESSならtrue
  jobName: string // ジョブ名。_linkの中身から取得
  buildTag: string // jenkins-${jobName}-${id}。Jenkinsで実行されるノードにBUILD_TAGのENVで入るもの
}

export type Stage = {
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

export type StageFlowNode = {
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

const removeKeys = ['_links', 'log', 'console', 'error']

export const parse = (obj: {[key: string]: any}): Job => {
  const result = _parse(obj) as {[key: string]: any}

  const jobName = obj['_links']['self']['href'].split('/')[2]
  const buildId = result['id']
  const status = result['status']
  result['isSuccess'] = (status === 'SUCCESS') ? true : false
  result['jobName'] = jobName
  result['buildTag'] = `jenkins-${jobName}-${buildId}`

  const nodeSumDurationMillis = createNodeSumDurationMillis(result as Job)
  result['nodeSumDurationMillis'] = nodeSumDurationMillis
  result['nodeSumDuration'] = nodeSumDurationMillis / 1000

  return result as Job
}

type ObjOrArray = {[key: string]: any } | Array<ObjOrArray>
const _parse = (objOrArray: ObjOrArray): ObjOrArray => {
  if (Array.isArray(objOrArray)) {
    return objOrArray.map((_obj: ObjOrArray) => {
      // 中身がさらにネストされた配列 or objectなら再起
      if (Array.isArray(_obj) || typeof(_obj) === 'object') {
        return _parse(_obj)
      }
      // それ以外の場合はプリミティブな値なのでreturn
      return _obj
    })
  }
  let output: {[key: string]: any} = {}
  Object.keys(objOrArray).forEach((key) => {
    const nested = objOrArray[key]
    // 除外キー
    if (removeKeys.includes(key)) {
      return
    }
    else if (typeof(nested) === 'object') {
      output[key] = _parse(nested)
    }
    // startTimeMillis, endTimeMillisはDateのISO形式を追加
    else if (key === 'startTimeMillis' || key === 'endTimeMillis') {
      output[key] = nested
      const dateKey = key.replace(/Millis/, '')
      output[dateKey] = dayjs(nested).toISOString()
    }
    // *MillisはMillisを消したキーに秒に直した値を追加
    else if (key.match(/Millis/)) {
      output[key] = nested
      const secKey = key.replace(/Millis/, '')
      output[secKey] = nested / 1000
    }
    else {
      output[key] = nested
    }
  })
  return output
}

const createNodeSumDurationMillis = (job: Job): number => {
  const stages = job['stages']
  let nodeSumDurationMillis = 0
  stages.forEach((stage) => {
    stage.stageFlowNodes.forEach((step) => {
      nodeSumDurationMillis += step.durationMillis
    })
  })

  return nodeSumDurationMillis
}
