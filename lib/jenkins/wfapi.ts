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
// *TimeMillis: /1000してDateTimeのISO文字列にする
//
// 消すもの
// _links, log, console

// 最終的にbuildごとに1行のrowJSONに変換してBigQueryに食わせる

import dayjs from 'dayjs'

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
  isSuccess: boolean // statusがSUCCESSならtrue
  jobName: string // ジョブ名。_linkの中身から取得
  buildTag: string // jenkins-${jobName}-${id}。Jenkinsで実行されるノードにBUILD_TAGのENVで入るもの
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

const removeKeys = ['_links', 'log', 'console']

export const parse = (obj: {[key: string]: any}): Job => {
  return _parse(obj) as Job
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