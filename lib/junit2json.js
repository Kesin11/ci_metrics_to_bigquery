const xml2js = require('xml2js')

const parse = async (xmlString) => {
  const result = await xml2js.parseStringPromise(xmlString, {
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

  // testsuitesへの独自拡張フィールド
  output['isFailure'] = output['failures'] > 0 ? true : false
  // TODO: もしtestsuite.0.timestampから取得できなければ、GCF上で起動するのでnowをISO変換したものでOK
  output['created'] = output['testsuite'][0]['timestamp'] // dummy

  return output
}

module.exports = {
  parse
}