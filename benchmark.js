function getAssignId(val) {
  if (!val) return null
  return typeof val === 'object' ? val.id : val
}

const personnel = [];
for (let i = 0; i < 500; i++) {
  personnel.push({ id: i, name: `Person ${i}`, keyManId: Math.floor(i / 10) });
}

const assignments = {};
const areas = [{ id: 1, name: 'Area 1' }, { id: 2, name: 'Area 2' }];
const positions = [];
for (let i = 0; i < 50; i++) {
  positions.push({ id: `pos${i}`, name: `Pos ${i}`, areaId: (i % 2) + 1, type: i % 5 === 0 ? 'auditorium' : 'rotational' });
}

const shifts = [{ id: 's1', label: 'Shift 1' }, { id: 's2', label: 'Shift 2' }, { id: 's3', label: 'Shift 3' }];

positions.forEach((p, i) => {
  if (p.type === 'auditorium') {
    assignments[p.id] = { id: i * 5 % 500 };
  } else {
    shifts.forEach(s => {
      assignments[`${p.id}_${s.id}`] = { id: (i * 7 + s.id.charCodeAt(1)) % 500 };
    });
  }
});

const kmId = 1;

// Simulate myOversightAreas calculation
const myOversightAreas = [];
positions.filter((pos) => pos.type === 'auditorium').forEach((pos) => {
    myOversightAreas.push({ type: 'auditorium', area: areas[0], shiftId: 'all', posName: pos.name });
});
positions.filter((pos) => pos.type === 'rotational').forEach((pos) => {
    shifts.forEach((s) => {
        myOversightAreas.push({ type: 'rotational', area: areas[0], shiftId: s.id, shiftLabel: s.label, posName: pos.name });
    });
});

console.log(`Starting benchmark with ${myOversightAreas.length} oversight items`);

function runBenchmark(useMap) {
  const start = performance.now();
  let iterations = 1000; // Increased to 1000 for clearer difference
  let matches = 0;

  // Create map OUTSIDE the iteration loop as useMemo would do
  const personnelMap = useMap ? new Map(personnel.map(p => [p.id, p])) : null;

  for (let iter = 0; iter < iterations; iter++) {
    myOversightAreas.forEach(oversight => {
      positions.filter(p => p.areaId === oversight.area?.id && p.type === oversight.type).forEach(pos => {
        const isMirror = !!pos.mirrorOf;
        const sourcePosId = pos.mirrorOf;
        let assignmentKey = (oversight.type === 'auditorium' ? pos.id : `${pos.id}_${oversight.shiftId}`);
        if (isMirror) {
            const sourcePos = positions.find(x => x.id === sourcePosId);
            assignmentKey = (sourcePos && sourcePos.type === 'auditorium') ? sourcePosId : `${sourcePosId}_${oversight.shiftId}`;
        }

        const pid = getAssignId(assignments[assignmentKey]);

        let assignedPerson;
        let keyManName;

        if (useMap) {
          assignedPerson = personnelMap.get(pid);
          if (assignedPerson && assignedPerson.keyManId) {
            keyManName = personnelMap.get(assignedPerson.keyManId)?.name;
          }
        } else {
          assignedPerson = personnel.find(x => x.id === pid);
          if (assignedPerson) {
             keyManName = personnel.find(kman => kman.id === assignedPerson.keyManId)?.name;
          }
        }

        if (assignedPerson) matches++;
      });
    });
  }

  const end = performance.now();
  console.log(`${useMap ? 'With Map' : 'Without Map'}: ${end - start}ms`);
}

runBenchmark(false);
runBenchmark(true);
