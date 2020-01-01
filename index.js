const fs = require('fs')
const xml2js = require('xml2js')

const main = async () => {
  const file = process.argv[2]
  // const file = "example/test-output_failure.xml"

  const xml = fs.readFileSync(`${__dirname}/${file}`)
  const result = await xml2js.parseStringPromise(xml, {
    attrValueProcessors: [xml2js.processors.parseNumbers]
  })
  const rawTestsuites = result['testsuites']
  const output = { ...rawTestsuites['$'] }

  const testsuiteList = []
  for (const rawTestsuite of rawTestsuites['testsuite']) {
    const testsuite = { ...rawTestsuite['$'] }

    const testcaseList = []
    for (const rawTestcase of rawTestsuite['testcase']) {
      const testcase = { ...rawTestcase['$'] }
      // TODO: キーの中身を見て$、_、配列であれば展開するように一般化できるはず
      const rawFailure = rawTestcase['failure']
      if (rawFailure) {
        const failureList = []
        for (const rawFailure of rawTestcase['failure']) {
          let failure = { ...rawFailure['$'] }
          if (rawFailure['_']) {
            failure = { ...failure, body: rawFailure['_'] }
          }
          failureList.push(failure)
        }
        testcase['failure'] = failureList
      }

      testcaseList.push(testcase)
    }
    testsuite['testcase'] = testcaseList
    testsuiteList.push(testsuite)
  }
  output['testsuite'] = testsuiteList

  console.log(JSON.stringify(output, null, 4))
}
main()