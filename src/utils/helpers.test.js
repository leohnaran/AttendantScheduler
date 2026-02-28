import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getHeatBg } from './helpers.js'

describe('getHeatBg', () => {
  it('should return green classes for count 0', () => {
    assert.strictEqual(getHeatBg(0), 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400')
  })

  it('should return yellow classes for count 1', () => {
    assert.strictEqual(getHeatBg(1), 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')
  })

  it('should return orange classes for count 2', () => {
    assert.strictEqual(getHeatBg(2), 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400')
  })

  it('should return red classes for count > 2', () => {
    assert.strictEqual(getHeatBg(3), 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400')
    assert.strictEqual(getHeatBg(10), 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400')
  })
})
