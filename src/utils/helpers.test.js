import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAssignId,
  isAutoAssigned,
  getKeyManName,
  getLastName,
  getHeatColor,
  getHeatBg,
  parseCSV,
  parseAssignmentKey,
  checkQualification,
  getCandidatesForPosition,
} from './helpers.js'

test('getAssignId', (t) => {
  assert.equal(getAssignId(null), null)
  assert.equal(getAssignId(undefined), null)
  assert.equal(getAssignId(123), 123)
  assert.equal(getAssignId('456'), 456)
  assert.equal(getAssignId({ id: '789' }), 789)
  assert.equal(getAssignId({ id: 10 }), 10)
})

test('isAutoAssigned', (t) => {
  assert.equal(isAutoAssigned(null), false)
  assert.equal(isAutoAssigned(undefined), false)
  assert.equal(isAutoAssigned(123), false)
  assert.equal(isAutoAssigned('456'), false)
  assert.equal(isAutoAssigned({}), false)
  assert.equal(isAutoAssigned({ isAuto: false }), false)
  assert.equal(isAutoAssigned({ isAuto: true }), true)
})

test('getKeyManName', (t) => {
  const personnel = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
  ]
  assert.equal(getKeyManName(personnel, 1), 'John Doe')
  assert.equal(getKeyManName(personnel, 2), 'Jane Smith')
  assert.equal(getKeyManName(personnel, 3), '')
})

test('getLastName', (t) => {
  assert.equal(getLastName(null), '')
  assert.equal(getLastName(undefined), '')
  assert.equal(getLastName(''), '')
  assert.equal(getLastName('John'), 'john')
  assert.equal(getLastName('John Doe'), 'doe')
  assert.equal(getLastName('John Doe Smith'), 'smith')
  assert.equal(getLastName('  John Doe   '), 'doe')
})

test('getHeatColor', (t) => {
  assert.equal(getHeatColor(0), 'bg-green-500')
  assert.equal(getHeatColor(1), 'bg-yellow-500')
  assert.equal(getHeatColor(2), 'bg-orange-500')
  assert.equal(getHeatColor(3), 'bg-red-500')
  assert.equal(getHeatColor(10), 'bg-red-500')
})

test('getHeatBg', (t) => {
  assert.equal(
    getHeatBg(0),
    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  )
  assert.equal(
    getHeatBg(1),
    'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  )
  assert.equal(
    getHeatBg(2),
    'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  )
  assert.equal(
    getHeatBg(3),
    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  )
  assert.equal(
    getHeatBg(10),
    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  )
})

test('parseCSV', (t) => {
  const basic = 'a,b,c\n1,2,3'
  assert.deepEqual(parseCSV(basic), [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
  ])

  const withQuotes = 'a,"b,c",d\n1,"2\n3",4'
  assert.deepEqual(parseCSV(withQuotes), [
    ['a', 'b,c', 'd'],
    ['1', '2\n3', '4'],
  ])

  const emptyTrailing = 'a,b,c\n1,2,3\n'
  assert.deepEqual(parseCSV(emptyTrailing), [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
  ])

  const singleRow = 'a,b,c'
  assert.deepEqual(parseCSV(singleRow), [['a', 'b', 'c']])
})

test('parseAssignmentKey', (t) => {
  const shifts = [{ id: 'morning' }, { id: 'afternoon' }]

  // With matching shift
  assert.deepEqual(parseAssignmentKey('pos1_morning', shifts), {
    posId: 'pos1',
    shiftId: 'morning',
  })

  // With non-matching shift, treats entire string as posId
  assert.deepEqual(parseAssignmentKey('pos1_evening', shifts), {
    posId: 'pos1_evening',
    shiftId: 'all',
  })

  // No underscore
  assert.deepEqual(parseAssignmentKey('pos1', shifts), {
    posId: 'pos1',
    shiftId: 'all',
  })

  // Multiple underscores
  assert.deepEqual(parseAssignmentKey('area1_pos1_afternoon', shifts), {
    posId: 'area1_pos1',
    shiftId: 'afternoon',
  })
})

test('checkQualification', async (t) => {
  const areas = [
    { id: 'area1', name: 'Area 1', capability: 'cap1' },
    { id: 'area2', name: 'Area 2', limitType: 'congregation', limitValue: 'Cong1' },
    { id: 'area3', name: 'Area 3' }, // no cap, no limit
  ]

  const personnel = [
    { id: 1, name: 'John Doe', keyManId: 10, congregation: 'Cong1', role: 'Elder', tags: ['tag1'], caps: ['cap1', 'keyman'] },
    { id: 2, name: 'Jane Smith', keyManId: 20, congregation: 'Cong2', role: 'MS', tags: ['tag2'], caps: ['cap1'] },
    { id: 3, name: 'Bob Jones', keyManId: 10, congregation: 'Cong1', role: '', tags: [], caps: [] },
    { id: 10, name: 'KM 10' },
    { id: 20, name: 'KM 20' },
  ]

  const tags = [
    { id: 'tag1', name: 'Tag 1', restrictedAreas: ['area3'] },
    { id: 'tag2', name: 'Tag 2', restrictedShifts: ['morning'] },
    { id: 'tag3', name: 'Tag 3', restrictedShifts: ['all_day'] },
  ]

  await t.test('Missing Area', () => {
    const pos = { id: 'pos1', areaId: 'unknown' }
    const res = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel)
    assert.equal(res.qualified, false)
    assert.equal(res.reason, 'Area not found')
  })

  await t.test('Missing Capability', () => {
    const pos = { id: 'pos1', areaId: 'area1' }
    const res = checkQualification(personnel[2], pos, 'morning', areas, tags, personnel)
    assert.equal(res.qualified, false)
    assert.equal(res.reason, 'Missing Capability: Area 1')
  })

  await t.test('Qualified for Area 1', () => {
    const pos = { id: 'pos1', areaId: 'area1' }
    const res = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel)
    assert.equal(res.qualified, true)
    assert.equal(res.reason, null)
  })

  await t.test('Key Man Requirement', () => {
    // We need an area that has no required capability, or personnel[2] needs to have it.
    // area1 requires 'cap1', which personnel[2] doesn't have.
    // Let's use area3 which has no capability requirement.
    const pos = { id: 'pos1', areaId: 'area3', keyMan: true }

    // Let's create a temporary personnel array and a new person who isn't a keyman but is otherwise qualified for area3.
    // Actually, personnel[3] (KM 10) or personnel[4] (KM 20) don't have caps.
    // personnel[1] is Jane Smith, who has 'cap1'. If we use area3, she isn't restricted by cap.
    // Oh, personnel[1] is restricted for 'morning' shift. Let's use 'afternoon' for personnel[1].
    const res2 = checkQualification(personnel[1], pos, 'afternoon', areas, tags, personnel)
    assert.equal(res2.qualified, false)
    assert.equal(res2.reason, 'Not a Key Man')
  })

  await t.test('Position Limit: Keyman', () => {
    const pos = { id: 'pos1', areaId: 'area1', limitType: 'keyman', limitValue: 10 }
    const res1 = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel) // keyManId: 10
    assert.equal(res1.qualified, true)

    const res2 = checkQualification(personnel[1], pos, 'morning', areas, tags, personnel) // keyManId: 20
    assert.equal(res2.qualified, false)
    assert.match(res2.reason, /Restricted to Team:/)
  })

  await t.test('Legacy Position Limit: Keyman', () => {
    const pos = { id: 'pos1', areaId: 'area1', teamKeyManId: 10 } // no limitType
    const res1 = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel)
    assert.equal(res1.qualified, true)

    const res2 = checkQualification(personnel[1], pos, 'morning', areas, tags, personnel)
    assert.equal(res2.qualified, false)
    assert.match(res2.reason, /Restricted to Team:/)
  })

  await t.test('Position Limit: Congregation', () => {
    const pos = { id: 'pos1', areaId: 'area1', limitType: 'congregation', limitValue: 'Cong1' }
    const res1 = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel)
    assert.equal(res1.qualified, true)

    const res2 = checkQualification(personnel[1], pos, 'morning', areas, tags, personnel)
    assert.equal(res2.qualified, false)
    assert.equal(res2.reason, 'Restricted to Congregation: Cong1')
  })

  await t.test('Position Limit: Tag', () => {
    const pos = { id: 'pos1', areaId: 'area1', limitType: 'tag', limitValue: 'tag1' }
    const res1 = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel)
    assert.equal(res1.qualified, true)

    const res2 = checkQualification(personnel[1], pos, 'morning', areas, tags, personnel)
    assert.equal(res2.qualified, false)
    assert.match(res2.reason, /Restricted to Tag:/)
  })

  await t.test('Position Limit: Role', () => {
    const pos = { id: 'pos1', areaId: 'area1', limitType: 'role', limitValue: 'MS' } // Min MS
    const res1 = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel) // Elder > MS
    assert.equal(res1.qualified, true)

    // For personnel[1], use 'afternoon' to avoid the morning shift restriction from tag2
    const res2 = checkQualification(personnel[1], pos, 'afternoon', areas, tags, personnel) // MS == MS
    assert.equal(res2.qualified, true)

    const res3 = checkQualification(personnel[2], pos, 'morning', areas, tags, personnel) // '' < MS
    assert.equal(res3.qualified, false)
    assert.equal(res3.reason, 'Restricted to Role: MS (Min)')
  })

  await t.test('Area Limit Fallback', () => {
    // Area 2 restricts to Cong1. Pos doesn't have restrictions.
    const pos = { id: 'pos1', areaId: 'area2' }
    const res1 = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel) // Cong1
    assert.equal(res1.qualified, true)

    const res2 = checkQualification(personnel[1], pos, 'morning', areas, tags, personnel) // Cong2
    assert.equal(res2.qualified, false)
    assert.equal(res2.reason, 'Restricted to Congregation: Cong1')
  })

  await t.test('Area Limit Override', () => {
    // Area 2 restricts to Cong1. Pos overrides to restrict to Cong2.
    const pos = { id: 'pos1', areaId: 'area2', limitType: 'congregation', limitValue: 'Cong2' }
    const res1 = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel) // Cong1
    assert.equal(res1.qualified, false)

    // For personnel[1], use 'afternoon' to avoid the morning shift restriction from tag2
    const res2 = checkQualification(personnel[1], pos, 'afternoon', areas, tags, personnel) // Cong2
    assert.equal(res2.qualified, true)
  })

  await t.test('Tag Restriction: Area', () => {
    // personnel[0] has tag1 which restricts area3
    const pos = { id: 'pos1', areaId: 'area3' }
    const res = checkQualification(personnel[0], pos, 'morning', areas, tags, personnel)
    assert.equal(res.qualified, false)
    assert.match(res.reason, /Restricted by your Tag: Tag 1 \(Area\)/)
  })

  await t.test('Tag Restriction: Shift', () => {
    // personnel[1] has tag2 which restricts morning shift
    const pos = { id: 'pos1', areaId: 'area3' }
    const res1 = checkQualification(personnel[1], pos, 'morning', areas, tags, personnel)
    assert.equal(res1.qualified, false)
    assert.match(res1.reason, /Restricted by your Tag: Tag 2 \(Shift\)/)

    const res2 = checkQualification(personnel[1], pos, 'afternoon', areas, tags, personnel)
    assert.equal(res2.qualified, true)
  })

  await t.test('Tag Restriction: All Day Shift', () => {
    const p3 = { id: 4, name: 'Alice', tags: ['tag3'], role: '' } // tag3 restricts all_day
    const pos = { id: 'pos1', areaId: 'area3' }
    const res = checkQualification(p3, pos, 'all', areas, tags, personnel)
    assert.equal(res.qualified, false)
    assert.match(res.reason, /Restricted by your Tag: Tag 3 \(All Day\)/)
  })
})

test('getCandidatesForPosition', (t) => {
  const areas = [
    { id: 'area1', name: 'Area 1' },
  ]
  const personnel = [
    { id: 1, name: 'John Doe', congregation: 'Cong1' },
    { id: 2, name: 'Jane Smith', congregation: 'Cong2' },
  ]
  const tags = []

  const pos = { id: 'pos1', areaId: 'area1', limitType: 'congregation', limitValue: 'Cong1' }
  const candidates = getCandidatesForPosition(pos, personnel, areas, tags)

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].id, 1)
})
