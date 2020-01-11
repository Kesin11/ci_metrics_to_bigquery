import * as fs from 'fs'
import * as path from 'path'
import * as junit2json from './lib/junit2json'

const main = async () => {
  const file = process.argv[2]
  // const file = "example/test-output_failure.xml"

  const xml = fs.readFileSync(path.resolve(file))
  const output = await junit2json.parse(xml)

  // console.log(JSON.stringify(output, null, 4))
  console.log(JSON.stringify(output))
}
main()