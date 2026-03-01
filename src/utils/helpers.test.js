import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getHeatBg, parseAssignmentKey } from './helpers.js'

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

describe('parseAssignmentKey', () => {
  const shifts = [{ id: 's1' }, { id: 's2' }]

  it('should return original key and "all" if key has no underscore', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1', shifts), { posId: 'pos1', shiftId: 'all' })
  })

  it('should return original key and "all" if key has underscore but last part is not a valid shift', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s3', shifts), { posId: 'pos1_s3', shiftId: 'all' })
  })

  it('should extract shiftId and posId if last part is a valid shift', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', shifts), { posId: 'pos1', shiftId: 's1' })
  })

  it('should correctly handle keys with multiple underscores if last part is a valid shift', () => {
    assert.deepStrictEqual(parseAssignmentKey('area_pos1_s2', shifts), { posId: 'area_pos1', shiftId: 's2' })
  })

  it('should return original key and "all" if shifts array is empty', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', []), { posId: 'pos1_s1', shiftId: 'all' })
  })

  it('should handle empty string key gracefully', () => {
    assert.deepStrictEqual(parseAssignmentKey('', shifts), { posId: '', shiftId: 'all' })
  })

  it('should handle null or undefined key gracefully', () => {
    assert.deepStrictEqual(parseAssignmentKey(null, shifts), { posId: null, shiftId: 'all' })
    assert.deepStrictEqual(parseAssignmentKey(undefined, shifts), { posId: undefined, shiftId: 'all' })
  })

  it('should handle non-string key gracefully', () => {
    assert.deepStrictEqual(parseAssignmentKey(123, shifts), { posId: 123, shiftId: 'all' })
    assert.deepStrictEqual(parseAssignmentKey({ id: 'pos1' }, shifts), { posId: { id: 'pos1' }, shiftId: 'all' })
  })

  it('should handle missing or invalid shifts array gracefully', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', null), { posId: 'pos1_s1', shiftId: 'all' })
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', undefined), { posId: 'pos1_s1', shiftId: 'all' })
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', {}), { posId: 'pos1_s1', shiftId: 'all' })
  })

  it('should handle shifts array containing null items gracefully', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', [null, { id: 's1' }]), { posId: 'pos1', shiftId: 's1' })
  })

  it('should handle posId that looks like a shift ID but has no underscore', () => {
    assert.deepStrictEqual(parseAssignmentKey('s1', shifts), { posId: 's1', shiftId: 'all' })
  })

  it('should correctly handle keys with multiple underscores if last part is not a shift', () => {
    assert.deepStrictEqual(parseAssignmentKey('area_pos1_s3', shifts), { posId: 'area_pos1_s3', shiftId: 'all' })
  })
})
