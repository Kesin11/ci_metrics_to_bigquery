import * as fs from 'fs'
import * as path from 'path'
import { parse, Job } from '../lib/jenkins/wfapi'

const main = async () => {
  const file = process.argv[2]
  // const file = "job_example/build-pipeline-nested.json"

  const json = JSON.parse(fs.readFileSync(path.resolve(file)).toString())
  const parsedJson: Job[] = json.map((build: {[key: string]: any}) => {
    return parse(build)
  })

  // jqで見る場合
  // console.log(JSON.stringify(parsedJson, null, 2))

  // BigQueryにloadするために1行区切りJSON（Newline Delimited JSON）で出力する場合
  parsedJson.forEach((row) => console.log(JSON.stringify(row)))
}
main()