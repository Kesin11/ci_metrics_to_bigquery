import * as fs from 'fs'
import * as path from 'path'
import { parse, TestSuites } from 'junit2json'

type ExtendedTestSuites = TestSuites & {
  allSuccess?: boolean,
  created?: string,
  metadata?: { [key: string]: any }
}

const nowISOString = () => {
  const date = new Date()
  return date.toISOString()
}

const replacer = (key: any, value: any) => {
  if (key === 'system-out' || key === 'system-err') return undefined
  return value
}

const main = async () => {
  const file = process.argv[2]
  // const file = "example/test-output_failure.xml"

  const xml = fs.readFileSync(path.resolve(file))
  const output: ExtendedTestSuites = await parse(xml)

  // 独自フィールドの追加
  output['allSuccess'] = (output['failures'] === 0 && output['error'] === 0) ? true : false
  // もしtestsuite.0.timestampから取得できなければ、GCF上で起動したときの時間
  output['created'] = output['testsuite'][0]['timestamp'] || nowISOString()

  // console.log(JSON.stringify(output, replacer, 2))
  console.log(JSON.stringify(output, replacer))
}
main()