const fs = require('fs')
const xml2js = require('xml2js')

const main = async () => {
  const file = process.argv[2]

  const xml = fs.readFileSync(`${__dirname}/${file}`)
  const result = await xml2js.parseStringPromise(xml, {
    attrValueProcessors: [xml2js.processors.parseNumbers]
  })
  console.dir(result)
}
main()