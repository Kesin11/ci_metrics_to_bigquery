import * as fs from 'fs'
import * as path from 'path'
import { parse } from '../../lib/jenkins/wfapi'

const fixturePath = (fixtureName: string) => {
  return path.join(__dirname, '../', 'fixtures', fixtureName)
}

describe('jenkins_wfapi', () => {
  it('parse', async () => {
      const json = fs.readFileSync(fixturePath('stage_nested.json')).toString()
      const expected = fs.readFileSync(fixturePath('stage_nested_expected.json')).toString()

      const actual = parse(JSON.parse(json))

      expect(actual).toEqual(JSON.parse(expected))
  })
})