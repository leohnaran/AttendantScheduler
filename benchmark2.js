import { performance } from 'perf_hooks';

// Setup Mock Data matching actual structure
const P_COUNT = 500;
const POS_COUNT = 200;

const personnel = Array.from({ length: P_COUNT }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}` }));
const positions = Array.from({ length: POS_COUNT }, (_, i) => ({
  id: `pos_${i + 1}`,
  name: `Position ${i + 1}`,
  type: i % 2 === 0 ? 'auditorium' : 'rotational',
  isMirror: false,
  validShifts: ['shift_1', 'shift_2']
}));

const assignments = {};
// Assign some people
for (let i = 0; i < POS_COUNT; i++) {
  const pId = (i % P_COUNT) + 1;
  if (positions[i].type === 'auditorium') {
    assignments[positions[i].id] = pId;
  } else {
    assignments[`${positions[i].id}_shift_1`] = pId;
  }
}

const getAssignId = (val) => val;
const shiftId = 'shift_1';

function oldApproach() {
  return personnel.map((p) => {
    let isBusy = false;
    let busyWhere = null;
    let busySlot = null;

    for (let otherPos of positions) {
      if (otherPos.type === 'auditorium' && getAssignId(assignments[otherPos.id]) === p.id) {
        isBusy = true;
        busyWhere = otherPos.name;
        busySlot = { pos: otherPos, shiftId: 'all' };
        break;
      }

      if (otherPos.type === 'rotational' && !otherPos.isMirror) {
        if (otherPos.validShifts && !otherPos.validShifts.includes(shiftId)) continue;
        if (getAssignId(assignments[`${otherPos.id}_${shiftId}`]) === p.id) {
          isBusy = true;
          busyWhere = otherPos.name;
          busySlot = { pos: otherPos, shiftId: shiftId };
          break;
        }
      }
    }

    if (!isBusy && p.unavailable && p.unavailable.includes(shiftId)) {
      isBusy = true;
      busyWhere = 'Marked Unavailable';
      busySlot = null;
    }

    return { ...p, isBusy, busyWhere, busySlot };
  });
}

function newApproach() {
  const busyMap = new Map();
  for (let otherPos of positions) {
    if (otherPos.type === 'auditorium') {
      const pId = getAssignId(assignments[otherPos.id]);
      if (pId && !busyMap.has(pId)) {
        busyMap.set(pId, {
          busyWhere: otherPos.name,
          busySlot: { pos: otherPos, shiftId: 'all' }
        });
      }
    } else if (otherPos.type === 'rotational' && !otherPos.isMirror) {
      if (otherPos.validShifts && !otherPos.validShifts.includes(shiftId)) continue;
      const pId = getAssignId(assignments[`${otherPos.id}_${shiftId}`]);
      if (pId && !busyMap.has(pId)) {
        busyMap.set(pId, {
          busyWhere: otherPos.name,
          busySlot: { pos: otherPos, shiftId: shiftId }
        });
      }
    }
  }

  return personnel.map((p) => {
    let isBusy = false;
    let busyWhere = null;
    let busySlot = null;

    const busyData = busyMap.get(p.id);
    if (busyData) {
      isBusy = true;
      busyWhere = busyData.busyWhere;
      busySlot = busyData.busySlot;
    } else if (p.unavailable && p.unavailable.includes(shiftId)) {
      isBusy = true;
      busyWhere = 'Marked Unavailable';
      busySlot = null;
    }

    return { ...p, isBusy, busyWhere, busySlot };
  });
}

const ITERATIONS = 1000;

const startOld = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  oldApproach();
}
const timeOld = performance.now() - startOld;

const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  newApproach();
}
const timeNew = performance.now() - startNew;

console.log(`[FindReplacementModal.jsx:754] Benchmark:`);
console.log(`Old approach time: ${timeOld.toFixed(2)}ms`);
console.log(`New approach time: ${timeNew.toFixed(2)}ms`);
console.log(`Improvement: ${((timeOld - timeNew) / timeOld * 100).toFixed(2)}%`);

// Correctness check
const r1 = oldApproach();
const r2 = newApproach();
let match = true;
for (let i = 0; i < P_COUNT; i++) {
  if (r1[i].isBusy !== r2[i].isBusy || r1[i].busyWhere !== r2[i].busyWhere || r1[i].busySlot?.shiftId !== r2[i].busySlot?.shiftId) {
    match = false;
    console.log('Mismatch!', r1[i], r2[i]);
    break;
  }
}
if (!match) process.exit(1);
