import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAssignmentKey } from './helpers.js'

test('parseAssignmentKey', async (t) => {
  const shifts = [
    { id: 'morning', name: 'Morning Shift' },
    { id: 'afternoon', name: 'Afternoon Shift' }
  ]

  await t.test('returns posId and shiftId="all" if no underscore in key', () => {
    const key = 'pos123'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos123', shiftId: 'all' })
  })

  await t.test('returns posId and shiftId="all" if last part is not a valid shift', () => {
    const key = 'pos123_invalid'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos123_invalid', shiftId: 'all' })
  })

  await t.test('returns parsed posId and shiftId if last part is a valid shift', () => {
    const key = 'pos123_morning'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos123', shiftId: 'morning' })
  })

  await t.test('handles keys with multiple underscores correctly', () => {
    const key = 'pos_abc_123_afternoon'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos_abc_123', shiftId: 'afternoon' })
  })

  await t.test('handles empty shifts array', () => {
    const key = 'pos123_morning'
    const result = parseAssignmentKey(key, [])
    assert.deepEqual(result, { posId: 'pos123_morning', shiftId: 'all' })
  })
})
