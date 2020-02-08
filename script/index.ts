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

const isAllSuccess = (testSuites: TestSuites): boolean => {
  const failures = testSuites['failures'] || 0
  const errors = testSuites['errors'] || 0
  return (failures === 0 && errors === 0) ? true : false
}

const main = async () => {
  const file = process.argv[2]
  // const file = "example/test-output_failure.xml"

  const xml = fs.readFileSync(path.resolve(file))
  const output: ExtendedTestSuites = await parse(xml)

  // 独自フィールドの追加
  output['allSuccess'] = isAllSuccess(output)
  // もしtestsuite.0.timestampから取得できなければ、GCF上で起動したときの時間
  output['created'] = output['testsuite'][0]['timestamp'] || nowISOString()

  // console.log(JSON.stringify(output, replacer, 2))
  console.log(JSON.stringify(output, replacer))
}
main()