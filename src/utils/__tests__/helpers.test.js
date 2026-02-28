import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAssignmentKey } from '../helpers.js'

test('parseAssignmentKey', async (t) => {
  const shifts = [{ id: 's1' }, { id: 's2' }, { id: 's3' }]

  await t.test('returns posId and shiftId="all" for key without shift', () => {
    const key = 'pos1'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos1', shiftId: 'all' })
  })

  await t.test('returns posId and shiftId for key with valid shift', () => {
    const key = 'pos1_s2'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos1', shiftId: 's2' })
  })

  await t.test('returns posId and shiftId="all" for key with invalid shift', () => {
    const key = 'pos1_s4'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos1_s4', shiftId: 'all' })
  })

  await t.test('handles key with multiple underscores correctly when valid shift', () => {
    const key = 'pos_1_a_s1'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos_1_a', shiftId: 's1' })
  })

  await t.test('handles key with multiple underscores correctly when invalid shift', () => {
    const key = 'pos_1_a_s4'
    const result = parseAssignmentKey(key, shifts)
    assert.deepEqual(result, { posId: 'pos_1_a_s4', shiftId: 'all' })
  })
})
