import { performance } from 'perf_hooks';
import { DEFAULT_AREAS, DEFAULT_POSITIONS, DEFAULT_SHIFTS } from './src/utils/constants.js';

// MOCK DATASET: 200 Brothers (larger dataset to exaggerate performance differences)
const personnel = Array.from({ length: 200 }, (_, i) => {
    const id = i + 1;
    const isKeyMan = id <= 40;
    return {
        id,
        name: `Brother ${id.toString().padStart(3, '0')}`,
        role: id % 3 === 0 ? 'Elder' : (id % 3 === 1 ? 'MS' : 'Exemplary'),
        caps: isKeyMan ? ['auditorium', 'lobby', 'exterior', 'dining', 'stairs', 'backstage', 'keyman']
                       : ['auditorium', 'lobby', 'exterior', 'dining', 'stairs', 'backstage'],
        keyManId: isKeyMan ? null : (id % 10) + 1,
        unavailable: [],
        tags: []
    };
});

const rules = {
    auditoriumRotationMode: true,
    auditoriumCoverage: 25,
    maxWorkPercent: 50,
    avoidConsecutive: true,
    anchorLimits: true
};

const areas = DEFAULT_AREAS;
const positions = DEFAULT_POSITIONS;
const shifts = DEFAULT_SHIFTS;
const tags = [];

const getAssignId = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return parseInt(val.id);
    return parseInt(val);
};

// Simulating the parent component useMemo behavior
let memoAreasMap = null;
let memoTagsMap = null;
let memoPositionsMap = null;
let memoPersonnelMap = null;

const getConflict = (personId, pos, shiftId, currentAssignments) => {
    if (!memoAreasMap) memoAreasMap = new Map(areas.map(a => [a.id, a]));
    if (!memoTagsMap) memoTagsMap = new Map(tags.map(t => [t.id, t]));
    if (!memoPositionsMap) memoPositionsMap = new Map(positions.map(p => [p.id, p]));
    if (!memoPersonnelMap) memoPersonnelMap = new Map(personnel.map(p => [p.id, p]));

    if (!personId) return null
    const pid = parseInt(personId)
    const person = memoPersonnelMap.get(pid)
    if (!person) return null

    const activeAssignments = Object.keys(currentAssignments).filter(
      (key) => getAssignId(currentAssignments[key]) === pid,
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

      const overlap =
        shiftId === 'all' || existingShiftId === 'all' || shiftId === existingShiftId

      if (overlap) {
        const otherPos = memoPositionsMap.get(existingPosId)
        const isReliefOverlap = (shiftId === 'all' && existingShiftId !== 'all') || (shiftId !== 'all' && existingShiftId === 'all');
        if (isReliefOverlap && rules.auditoriumRotationMode) {
          const targetRotShiftId = shiftId === 'all' ? existingShiftId : shiftId;
          const targetAudPos = shiftId === 'all' ? pos : memoPositionsMap.get(existingPosId);

          if (targetAudPos && targetAudPos.type === 'auditorium' && targetAudPos.section) {
            const sameSectionPositions = positions.filter(
              (p) =>
                p.type === 'auditorium' &&
                p.section === targetAudPos.section &&
                p.id !== targetAudPos.id,
            )
            const someoneElseRelieved = sameSectionPositions.some((sp) => {
              const otherPid = getAssignId(currentAssignments[sp.id])
              if (!otherPid) return false

              return Object.keys(currentAssignments).some((k) => {
                if (!k.endsWith(`_${targetRotShiftId}`)) return false
                return getAssignId(currentAssignments[k]) === otherPid
              })
            })
            if (someoneElseRelieved) return { type: 'error' }
          }
          const allAudPositions = positions.filter((p) => p.type === 'auditorium')
          const totalAudCount = allAudPositions.length
          const maxReliefPct = rules.auditoriumCoverage || 25
          const maxReliefCount = Math.max(1, Math.floor(totalAudCount * (maxReliefPct / 100)))

          const otherReliefCount = allAudPositions.filter((ap) => {
            const apPid = getAssignId(currentAssignments[ap.id])
            if (!apPid || apPid === pid) return false
            return Object.keys(currentAssignments).some((k) => {
              if (!k.endsWith(`_${targetRotShiftId}`)) return false
              return getAssignId(currentAssignments[k]) === apPid
            })
          }).length

          if (otherReliefCount >= maxReliefCount) return { type: 'error' }
          continue
        }
        return { type: 'error' }
      }
    }

    if (person.unavailable && person.unavailable.includes(shiftId)) return { type: 'error' }

    if (tags && person.tags) {
      for (let tid of person.tags) {
        const tag = memoTagsMap.get(tid)
        if (tag) {
          if (tag.restrictedAreas && tag.restrictedAreas.includes(pos.areaId)) return { type: 'error' }
          if (tag.restrictedShifts) {
            if (tag.restrictedShifts.includes(shiftId)) return { type: 'error' }
            if (shiftId === 'all' && tag.restrictedShifts.includes('all_day')) return { type: 'error' }
          }
        }
      }
    }

    const area = memoAreasMap.get(pos.areaId)
    const requiredCap = area ? area.capability : ''

    const bypassCap =
      rules.auditoriumRotationMode &&
      pos.type === 'rotational' &&
      person.caps &&
      person.caps.includes('auditorium')

    if (!bypassCap && (!person.caps || !person.caps.includes(requiredCap))) return { type: 'error' }
    if (pos.keyMan && (!person.caps || !person.caps.includes('keyman'))) return { type: 'error' }

    return null
}

const runBenchmark = () => {
    let assignments = {};
    const ITERS = 10000;

    // warm up
    for(let i=0; i<100; i++) {
        for(let p of personnel) {
            getConflict(p.id, positions[0], shifts[0].id, assignments);
        }
    }

    const start = performance.now();
    for(let i=0; i<ITERS; i++) {
        for(let p of personnel) {
            getConflict(p.id, positions[0], shifts[0].id, assignments);
            getConflict(p.id, positions[5], shifts[1].id, assignments);
            getConflict(p.id, positions[10], shifts[2].id, assignments);
        }
    }
    const end = performance.now();
    console.log(`Baseline benchmark: ${(end - start).toFixed(2)} ms`);
};

runBenchmark();
