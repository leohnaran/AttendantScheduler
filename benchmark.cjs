const fs = require('fs');

// Create mock data
const personnel = Array.from({ length: 500 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}` }));
const positions = Array.from({ length: 50 }, (_, i) => ({ id: `pos${i}`, name: `Position ${i}`, timeNote: '' }));
const shifts = Array.from({ length: 4 }, (_, i) => ({ id: `s${i}`, label: `Shift ${i}` }));

const assignments = {};
positions.forEach(pos => {
  shifts.forEach(shift => {
    assignments[`${pos.id}_${shift.id}`] = `p${Math.floor(Math.random() * 500)}`;
  });
});

const getBrotherAssignmentsOriginal = (p) => {
    const getAssignId = (val) => (val && typeof val === 'object' ? val.id : val);
    const myAssignments = []
    Object.keys(assignments).forEach((key) => {
      if (getAssignId(assignments[key]) === p.id) {
        let posId = key
        let shiftId = 'all'
        if (key.includes('_')) {
          const parts = key.split('_')
          const lastPart = parts[parts.length - 1]
          if (shifts.find((s) => s.id === lastPart)) {
            shiftId = lastPart
            posId = parts.slice(0, parts.length - 1).join('_')
          }
        }
        const pos = positions.find((x) => x.id === posId)
        const shift = shifts.find((s) => s.id === shiftId)
        if (pos) {
          const shiftLabel = shift
              ? shift.label
              : 'Full Day';

          const mirrors = positions.filter(p => p.mirrorOf === pos.id).map(m => m.name);
          const fullPosName = [pos.name, ...mirrors].join(' + ');

          myAssignments.push({
            posName: fullPosName,
            time: shiftLabel,
            shiftId: shiftId,
          })
        }
      }
    })
    myAssignments.sort((a, b) => {
      const aIdx = shifts.findIndex((s) => s.id === a.shiftId)
      const bIdx = shifts.findIndex((s) => s.id === b.shiftId)
      return aIdx - bIdx
    })
    return myAssignments
}

// Create memoized version to compare against
const createAssignmentLookup = () => {
  const getAssignId = (val) => (val && typeof val === 'object' ? val.id : val);
  const lookup = {};
  Object.keys(assignments).forEach((key) => {
    const pId = getAssignId(assignments[key]);
    if (!pId) return;

    let posId = key
    let shiftId = 'all'
    if (key.includes('_')) {
      const parts = key.split('_')
      const lastPart = parts[parts.length - 1]
      // simplified for benchmark
      shiftId = lastPart
      posId = parts.slice(0, parts.length - 1).join('_')
    }

    if (!lookup[pId]) lookup[pId] = [];
    lookup[pId].push({ posId, shiftId });
  });
  return lookup;
}

const getBrotherAssignmentsMemoized = (p, lookup) => {
    if (!lookup[p.id]) return [];

    const myAssignments = lookup[p.id].map(a => {
        const pos = positions.find((x) => x.id === a.posId)
        const shift = shifts.find((s) => s.id === a.shiftId)

        if (pos) {
          const shiftLabel = shift ? shift.label : 'Full Day';
          const mirrors = positions.filter(p => p.mirrorOf === pos.id).map(m => m.name);
          const fullPosName = [pos.name, ...mirrors].join(' + ');

          return {
            posName: fullPosName,
            time: shiftLabel,
            shiftId: a.shiftId,
          }
        }
        return null;
    }).filter(Boolean);

    myAssignments.sort((a, b) => {
      const aIdx = shifts.findIndex((s) => s.id === a.shiftId)
      const bIdx = shifts.findIndex((s) => s.id === b.shiftId)
      return aIdx - bIdx
    })
    return myAssignments;
}

console.log('Running Original...');
const start1 = performance.now();
for (let i = 0; i < 100; i++) {
  const brothersWithAssignments = personnel.filter(
    (p) => getBrotherAssignmentsOriginal(p).length > 0,
  )
  personnel.forEach(p => {
    getBrotherAssignmentsOriginal(p);
  });
}
const end1 = performance.now();
console.log(`Original Time: ${end1 - start1}ms`);

console.log('Running Memoized...');
const start2 = performance.now();
for (let i = 0; i < 100; i++) {
  const lookup = createAssignmentLookup();
  const brothersWithAssignments = personnel.filter(
    (p) => getBrotherAssignmentsMemoized(p, lookup).length > 0,
  )
  personnel.forEach(p => {
    getBrotherAssignmentsMemoized(p, lookup);
  });
}
const end2 = performance.now();
console.log(`Memoized Time: ${end2 - start2}ms`);
