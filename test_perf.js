import fs from 'fs'

// Generate mock data
const personnel = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}`, role: 'Publisher', caps: ['auditorium', 'keyman'], tags: [], unavailable: [] }));
const areas = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Area ${i + 1}` }));
const positions = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, areaId: (i % 10) + 1, name: `Position ${i + 1}`, type: 'rotational' }));
const shifts = Array.from({ length: 5 }, (_, i) => ({ id: `shift_${i + 1}` }));
const rules = { doubleBookingSeverity: 'error', capabilitySeverity: 'error' };

// Baseline logic
const getConflictBaseline = (personId, pos, shiftId, currentAssignments) => {
  if (!personId) return null
  const pid = parseInt(personId)
  const person = personnel.find((p) => p.id === pid)
  if (!person) return null

  const activeAssignments = Object.keys(currentAssignments).filter(
    (key) => {
      // simulate getAssignId
      const val = currentAssignments[key]
      return (val ? val.id : null) === pid
    }
  )

  for (let aid of activeAssignments) {
    let existingPosId = aid
    let existingShiftId = 'all'

    for (const s of shifts) {
      if (aid.endsWith(`_${s.id}`)) {
        existingShiftId = s.id
        existingPosId = aid.substring(0, aid.length - s.id.length - 1)
        break
      }
    }

    if (existingPosId === pos.id && existingShiftId === shiftId) continue
    const overlap = shiftId === 'all' || existingShiftId === 'all' || shiftId === existingShiftId
    if (overlap) {
      const otherPos = positions.find((p) => p.id === existingPosId)
      return { type: rules.doubleBookingSeverity || 'error' }
    }
  }

  const area = areas.find((a) => a.id === pos.areaId)
  return null
}

const personnelMap = new Map(personnel.map(p => [p.id, p]))
const areasMap = new Map(areas.map(a => [a.id, a]))
const positionsMap = new Map(positions.map(p => [p.id, p]))

const getConflictOptimized = (personId, pos, shiftId, currentAssignments) => {
  if (!personId) return null
  const pid = parseInt(personId)
  const person = personnelMap.get(pid)
  if (!person) return null

  const activeAssignments = Object.keys(currentAssignments).filter(
    (key) => {
      const val = currentAssignments[key]
      return (val ? val.id : null) === pid
    }
  )

  for (let aid of activeAssignments) {
    let existingPosId = aid
    let existingShiftId = 'all'

    for (const s of shifts) {
      if (aid.endsWith(`_${s.id}`)) {
        existingShiftId = s.id
        existingPosId = aid.substring(0, aid.length - s.id.length - 1)
        break
      }
    }

    if (existingPosId === pos.id && existingShiftId === shiftId) continue
    const overlap = shiftId === 'all' || existingShiftId === 'all' || shiftId === existingShiftId
    if (overlap) {
      const otherPos = positionsMap.get(existingPosId)
      return { type: rules.doubleBookingSeverity || 'error' }
    }
  }

  const area = areasMap.get(pos.areaId)
  return null
}

const currentAssignments = {}
for (let i = 1; i <= 50; i++) {
  currentAssignments[`${i}_shift_1`] = { id: i }
  currentAssignments[`${i + 50}_shift_2`] = { id: i }
}

const runTest = (name, func) => {
  const start = performance.now()
  for (let i = 0; i < 10000; i++) {
    const pId = (i % 500) + 1
    const pos = positions[i % 100]
    func(pId, pos, 'shift_3', currentAssignments)
  }
  const end = performance.now()
  console.log(`${name}: ${(end - start).toFixed(2)} ms`)
}

runTest('Baseline', getConflictBaseline)
runTest('Optimized', getConflictOptimized)
