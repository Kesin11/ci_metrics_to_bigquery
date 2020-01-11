import * as fs from 'fs'
import * as path from 'path'
import * as junit2json from './lib/junit2json'

const nowISOString = () => {
  const date = new Date()
  return date.toISOString()
}

const main = async () => {
  const file = process.argv[2]
  // const file = "example/test-output_failure.xml"

  const xml = fs.readFileSync(path.resolve(file))
  const output = await junit2json.parse(xml)

  // 独自フィールドの追加
  output['allSuccess'] = output['failures'] === 0 ? true : false
  // もしtestsuite.0.timestampから取得できなければ、GCF上で起動したときの時間
  output['created'] = output['testsuite'][0]['timestamp'] || nowISOString()

  // console.log(JSON.stringify(output, null, 4))
  console.log(JSON.stringify(output))
}
main()