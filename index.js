const fs = require('fs')
const junit2json = require('./lib/junit2json')

const main = async () => {
  const file = process.argv[2]
  // const file = "example/test-output_failure.xml"

  const xml = fs.readFileSync(`${__dirname}/${file}`)
  const output = await junit2json.parse(xml)

  // console.log(JSON.stringify(output, null, 4))
  console.log(JSON.stringify(output))
}
main()