import { performance } from 'perf_hooks';

// Simulate a mock component render setup
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
// Assign some people randomly, maybe missing some
for (let i = 0; i < POS_COUNT; i++) {
  const pId = (i % P_COUNT) + 1;
  if (positions[i].type === 'auditorium') {
    assignments[positions[i].id] = { id: pId, isAuto: false };
  } else {
    assignments[`${positions[i].id}_shift_1`] = { id: pId, isAuto: true };
  }
}

const getAssignId = (val) => {
  if (!val) return null
  if (typeof val === 'object') return parseInt(val.id)
  return parseInt(val)
}

const isAutoAssigned = (val) => {
  if (val && typeof val === 'object') return val.isAuto === true
  return false
}

function oldAssignmentCellApproach(pos, shiftId, assignments) {
  const assignmentKey = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`;
  const assignmentVal = assignments[assignmentKey];
  const assignedId = getAssignId(assignmentVal);
  const isAuto = isAutoAssigned(assignmentVal);

  return { assignedId, isAuto, assignmentVal };
}

function newAssignmentCellApproach(pos, shiftId, assignments) {
  const assignmentKey = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`;
  const assignmentVal = assignments[assignmentKey];

  // If no value, we can skip parsing
  if (!assignmentVal) {
    return { assignedId: null, isAuto: false, assignmentVal: null };
  }

  // Directly pull properties instead of calling helper function if it's our standard object
  // Standard object shape is { id: 123, isAuto: false }
  let assignedId;
  let isAuto;

  if (typeof assignmentVal === 'object') {
    assignedId = parseInt(assignmentVal.id);
    isAuto = assignmentVal.isAuto === true;
  } else {
    assignedId = parseInt(assignmentVal);
    isAuto = false;
  }

  return { assignedId, isAuto, assignmentVal };
}

function newAssignmentCellApproach2(pos, shiftId, assignments) {
  const assignmentKey = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`;
  const assignmentVal = assignments[assignmentKey];

  const assignedId = assignmentVal ? (assignmentVal.id ? parseInt(assignmentVal.id) : parseInt(assignmentVal)) : null;
  const isAuto = assignmentVal ? assignmentVal.isAuto === true : false;

  return { assignedId, isAuto, assignmentVal };
}


const ITERATIONS = 1000000;
const shiftId = 'shift_1';

const startOld = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  oldAssignmentCellApproach(positions[0], shiftId, assignments);
  oldAssignmentCellApproach(positions[1], shiftId, assignments);
}
const timeOld = performance.now() - startOld;

const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  newAssignmentCellApproach(positions[0], shiftId, assignments);
  newAssignmentCellApproach(positions[1], shiftId, assignments);
}
const timeNew = performance.now() - startNew;

const startNew2 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  newAssignmentCellApproach2(positions[0], shiftId, assignments);
  newAssignmentCellApproach2(positions[1], shiftId, assignments);
}
const timeNew2 = performance.now() - startNew2;

console.log(`[AssignmentCell] Benchmark:`);
console.log(`Old approach time: ${timeOld.toFixed(2)}ms`);
console.log(`New approach time: ${timeNew.toFixed(2)}ms`);
console.log(`New approach 2 time: ${timeNew2.toFixed(2)}ms`);
console.log(`Improvement: ${((timeOld - timeNew2) / timeOld * 100).toFixed(2)}%`);

// Correctness check
let match = true;
for (let i = 0; i < POS_COUNT; i++) {
    const r1 = oldAssignmentCellApproach(positions[i], shiftId, assignments);
    const r2 = newAssignmentCellApproach2(positions[i], shiftId, assignments);
    if (r1.assignedId !== r2.assignedId || r1.isAuto !== r2.isAuto) {
        match = false;
        console.log('Mismatch!', r1, r2);
        break;
    }
}
if (!match) process.exit(1);
