import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getHeatColor, getHeatBg, getLastName, parseAssignmentKey, parseCSV } from './helpers.js'

describe('getLastName', () => {
  it('should return the last name from a full name', () => {
    assert.strictEqual(getLastName('John Doe'), 'doe')
  })

  it('should handle middle names correctly', () => {
    assert.strictEqual(getLastName('John James Doe'), 'doe')
  })

  it('should handle single names', () => {
    assert.strictEqual(getLastName('John'), 'john')
  })

  it('should handle extra spaces', () => {
    assert.strictEqual(getLastName('  John   Doe  '), 'doe')
  })

  it('should return empty string for null', () => {
    assert.strictEqual(getLastName(null), '')
  })

  it('should return empty string for undefined', () => {
    assert.strictEqual(getLastName(undefined), '')
  })

  it('should return empty string for empty string input', () => {
    assert.strictEqual(getLastName(''), '')
  })

  it('should return empty string for string with only whitespace', () => {
    assert.strictEqual(getLastName('   '), '')
  })
})

describe('parseCSV', () => {
  it('should parse simple CSV', () => {
    const input = 'a,b,c\n1,2,3'
    const expected = [['a', 'b', 'c'], ['1', '2', '3']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should parse CSV with quotes', () => {
    const input = '"a","b","c"\n"1","2","3"'
    const expected = [['a', 'b', 'c'], ['1', '2', '3']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should parse CSV with commas inside quotes', () => {
    const input = 'a,"b,c",d\n1,"2,3",4'
    const expected = [['a', 'b,c', 'd'], ['1', '2,3', '4']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should parse CSV with newlines inside quotes', () => {
    const input = 'a,"b\nc",d\n1,"2\n3",4'
    const expected = [['a', 'b\nc', 'd'], ['1', '2\n3', '4']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should parse CSV with escaped quotes inside quotes', () => {
    const input = 'a,"b""c",d\n1,"2""3",4'
    const expected = [['a', 'b"c', 'd'], ['1', '2"3', '4']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should handle different line endings (CRLF)', () => {
    const input = 'a,b,c\r\n1,2,3'
    const expected = [['a', 'b', 'c'], ['1', '2', '3']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should handle different line endings (CR)', () => {
    const input = 'a,b,c\r1,2,3'
    const expected = [['a', 'b', 'c'], ['1', '2', '3']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should handle empty input', () => {
    assert.deepStrictEqual(parseCSV(''), [])
  })

  it('should handle trailing newline', () => {
    const input = 'a,b,c\n'
    const expected = [['a', 'b', 'c']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })

  it('should handle missing trailing newline on last line', () => {
    const input = 'a,b,c\n1,2,3'
    const expected = [['a', 'b', 'c'], ['1', '2', '3']]
    assert.deepStrictEqual(parseCSV(input), expected)
  })
})

describe('getHeatColor', () => {
  it('should return green bg for count 0', () => {
    assert.strictEqual(getHeatColor(0), 'bg-green-500')
  })

  it('should return yellow bg for count 1', () => {
    assert.strictEqual(getHeatColor(1), 'bg-yellow-500')
  })

  it('should return orange bg for count 2', () => {
    assert.strictEqual(getHeatColor(2), 'bg-orange-500')
  })

  it('should return red bg for count > 2', () => {
    assert.strictEqual(getHeatColor(3), 'bg-red-500')
    assert.strictEqual(getHeatColor(10), 'bg-red-500')
  })
})

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

  it('should handle key with only underscore', () => {
    assert.deepStrictEqual(parseAssignmentKey('_', shifts), { posId: '_', shiftId: 'all' })
  })

  it('should handle posId with leading underscore', () => {
    assert.deepStrictEqual(parseAssignmentKey('_pos1_s1', shifts), { posId: '_pos1', shiftId: 's1' })
  })

  it('should handle posId with trailing underscore before shift', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1__s1', shifts), { posId: 'pos1_', shiftId: 's1' })
  })

  it('should handle shift array with missing id property', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', [{name: 'shift1'}, {id: 's2'}]), { posId: 'pos1_s1', shiftId: 'all' })
  })

  it('should extract shift correctly when given valid inputs', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', shifts), { posId: 'pos1', shiftId: 's1' })
  })

  it('should return original key and "all" if key has no underscore', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1', shifts), { posId: 'pos1', shiftId: 'all' })
  })

  it('should return default posId and shiftId when key is empty string', () => {
    assert.deepStrictEqual(parseAssignmentKey('', shifts), { posId: '', shiftId: 'all' })
  })

  it('should extract correct posId and shiftId when valid key and valid shift', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos1_s1', shifts), { posId: 'pos1', shiftId: 's1' })
    assert.deepStrictEqual(parseAssignmentKey('pos_with_multiple_underscores_s2', shifts), { posId: 'pos_with_multiple_underscores', shiftId: 's2' })
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

describe('parseAssignmentKey edge cases', () => {
  const shifts = [{ id: 's1' }, { id: 's2' }]

  it('should handle extremely long posId', () => {
    const longPosId = 'a'.repeat(1000)
    assert.deepStrictEqual(parseAssignmentKey(`${longPosId}_s1`, shifts), { posId: longPosId, shiftId: 's1' })
  })

  it('should handle shift array where some shifts have no id', () => {
    const mixedShifts = [{ name: 'Morning' }, { id: 's1' }]
    assert.deepStrictEqual(parseAssignmentKey('pos_s1', mixedShifts), { posId: 'pos', shiftId: 's1' })
  })

  it('should handle array as key gracefully', () => {
    assert.deepStrictEqual(parseAssignmentKey(['pos', 's1'], shifts), { posId: ['pos', 's1'], shiftId: 'all' })
  })

  it('should return all for shiftId when shift array contains numbers', () => {
    assert.deepStrictEqual(parseAssignmentKey('pos_1', [1, 2, { id: 's1' }]), { posId: 'pos_1', shiftId: 'all' })
  })

  it('should correctly handle a key that exactly matches a shift id but has no underscore', () => {
    assert.deepStrictEqual(parseAssignmentKey('s1', shifts), { posId: 's1', shiftId: 'all' })
  })

  it('should correctly parse when shift id contains underscores', () => {
    const complexShifts = [{ id: 'shift_morning' }]
    assert.deepStrictEqual(parseAssignmentKey('pos_shift_morning', complexShifts), { posId: 'pos_shift_morning', shiftId: 'all' })
  })
})
