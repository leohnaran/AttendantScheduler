
import { DEFAULT_AREAS, DEFAULT_POSITIONS, DEFAULT_SHIFTS } from './src/utils/constants.js';

// 1. MOCK DATASET: 20 Brothers
const personnel = Array.from({ length: 20 }, (_, i) => {
    const id = i + 1;
    const isKeyMan = id <= 10; // 10 Key Men
    return {
        id,
        name: `Brother ${id.toString().padStart(2, '0')}`,
        role: id % 3 === 0 ? 'Elder' : (id % 3 === 1 ? 'MS' : 'Exemplary'),
        caps: isKeyMan ? ['auditorium', 'lobby', 'exterior', 'dining', 'stairs', 'backstage', 'keyman'] 
                       : ['auditorium', 'lobby', 'exterior', 'dining', 'stairs', 'backstage'],
        keyManId: isKeyMan ? null : (id % 10) + 1, // Distribute under keymen
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

// 2. HELPER FUNCTIONS (Copy-pasted from ScheduleView.jsx logic)
const getAssignId = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return parseInt(val.id);
    return parseInt(val);
};

const getRotationalShiftCount = (pid, currentAssignments) => {
    let count = 0;
    Object.keys(currentAssignments).forEach((key) => {
      if (getAssignId(currentAssignments[key]) === pid) {
        let posId = key;
        if (key.includes('_')) {
          const parts = key.split('_');
          if (DEFAULT_SHIFTS.some(s => s.id === parts[parts.length - 1])) {
            posId = parts.slice(0, parts.length - 1).join('_');
          }
        }
        const pos = DEFAULT_POSITIONS.find((p) => p.id === posId);
        if (pos && pos.type !== 'auditorium') count++;
      }
    });
    return count;
};

const getTotalAssignmentCount = (pid, currentAssignments) => {
    let count = 0;
    Object.keys(currentAssignments).forEach((key) => {
      if (getAssignId(currentAssignments[key]) === pid) count++;
    });
    return count;
};

const getCandidatesForPosition = (pos, personnel, areas, tags) => {
    const area = areas.find(a => a.id === pos.areaId);
    const requiredCap = area ? area.capability : '';
    return personnel.filter(p => {
        if (!p.caps || !p.caps.includes(requiredCap)) return false;
        if (pos.keyMan && (!p.caps || !p.caps.includes('keyman'))) return false;
        if (pos.limitType === 'keyman' && p.keyManId !== parseInt(pos.limitValue)) return false;
        return true;
    });
};

const getConflict = (personId, pos, shiftId, currentAssignments) => {
    const pid = parseInt(personId);
    const activeAssignments = Object.keys(currentAssignments).filter(k => getAssignId(currentAssignments[k]) === pid);

    for (let aid of activeAssignments) {
        let existingShiftId = 'all';
        if (aid.includes('_')) {
            existingShiftId = aid.split('_').pop();
        }
        const overlap = shiftId === 'all' || existingShiftId === 'all' || shiftId === existingShiftId;
        if (overlap) {
            const isReliefOverlap = (pos.type === 'auditorium' && existingShiftId !== 'all') || (pos.type !== 'auditorium' && existingShiftId === 'all');
            if (isReliefOverlap && rules.auditoriumRotationMode) continue;
            return { type: 'error' };
        }
    }
    return null;
};

// 3. THE AUTO-FILL LOGIC (Current State)
const runAutoFill = () => {
    const assignments = {};
    const getValidCandidates = (pos, shiftId) => {
        let candidates = getCandidatesForPosition(pos, personnel, areas, tags);
        if (rules.auditoriumRotationMode && pos.type === 'rotational') {
            const audPotential = personnel.filter(p => p.caps && p.caps.includes('auditorium') && !candidates.some(c => c.id === p.id));
            candidates = [...candidates, ...audPotential];
        }
        return candidates.filter(p => !getConflict(p.id, pos, shiftId, assignments));
    };

    const sortFairly = (candidates, shiftId, type) => {
        return [...candidates].sort((a, b) => {
            if (type === 'rotational') {
                const rotA = getRotationalShiftCount(a.id, assignments);
                const rotB = getRotationalShiftCount(b.id, assignments);
                if (rotA !== rotB) return rotA - rotB;
            }
            const totalA = getTotalAssignmentCount(a.id, assignments);
            const totalB = getTotalAssignmentCount(b.id, assignments);
            if (totalA !== totalB) return totalA - totalB;
            return Math.random() - 0.5;
        });
    };

    const fillNextHardest = (slots, label) => {
        while (true) {
            const pool = slots.filter(s => !assignments[s.key]).map(s => {
                const valid = getValidCandidates(s.pos, s.shiftId);
                return { ...s, candidates: valid, hardness: valid.length };
            }).filter(s => s.hardness > 0);
            if (pool.length === 0) break;
            pool.sort((a, b) => a.hardness - b.hardness);
            const target = pool[0];
            const sorted = sortFairly(target.candidates, target.shiftId, target.pos.type);
            assignments[target.key] = { id: sorted[0].id, isAuto: true };
        }
    };

    // Stage 1: Specialists
    const constrained = [];
    positions.forEach(pos => {
        if (pos.limitType || pos.keyMan) {
            if (pos.type === 'auditorium') constrained.push({ pos, shiftId: 'all', key: pos.id });
            else shifts.forEach(s => constrained.push({ pos, shiftId: s.id, key: `${pos.id}_${s.id}` }));
        }
    });
    fillNextHardest(constrained, 'SPECIALIST');

    // Stage 2: Auditorium
    const aud = positions.filter(p => p.type === 'auditorium' && !assignments[p.id]).map(p => ({ pos: p, shiftId: 'all', key: p.id }));
    fillNextHardest(aud, 'AUDITORIUM');

    // Stage 3: Rotation
    const rot = [];
    shifts.forEach(s => {
        positions.filter(p => p.type === 'rotational' && !p.isMirror).forEach(p => {
            if (!assignments[`${p.id}_${s.id}`]) rot.push({ pos: p, shiftId: s.id, key: `${p.id}_${s.id}` });
        });
    });
    fillNextHardest(rot, 'ROTATION');

    return assignments;
};

// 4. RUN AND REPORT
const result = runAutoFill();
const stats = personnel.map(p => ({
    name: p.name,
    total: getTotalAssignmentCount(p.id, result),
    rot: getRotationalShiftCount(p.id, result)
}));

const totalAssigned = stats.filter(s => s.total > 0).length;
const total0 = stats.filter(s => s.total === 0).length;
const total1 = stats.filter(s => s.total === 1).length;
const total2 = stats.filter(s => s.total === 2).length;
const total3 = stats.filter(s => s.total >= 3).length;

console.log(`Utilization: ${totalAssigned}/20 (${Math.round(totalAssigned/20*100)}%)`);
console.log(`0 Shifts: ${total0}`);
console.log(`1 Shift:  ${total1}`);
console.log(`2 Shifts: ${total2}`);
console.log(`3+ Shifts: ${total3}`);

if (total0 > 0 && total2 > 0) {
    console.log("FAIL: Some brothers have 0 shifts while others have 2+!");
} else {
    console.log("PASS: Balanced utilization achieved.");
}
