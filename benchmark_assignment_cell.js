import { performance } from 'perf_hooks';

// Simulate Mock Data for the issue
const P_COUNT = 500;
const POS_COUNT = 200;

const personnel = Array.from({ length: P_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Person ${i + 1}`,
    keyManId: i % 10 === 0 ? 'team_a' : null
}));

const areas = [
    { id: 'area_1', name: 'Area 1', limitType: 'none', limitValue: '' },
    { id: 'area_2', name: 'Area 2', limitType: 'none', limitValue: '' }
];

const pos = {
    id: 'pos_1',
    areaId: 'area_1',
    type: 'rotational',
    teamKeyManId: 'team_a'
};

const tags = [];
const shiftId = 'shift_1';

// Mock checkQualification since it's an import in AssignmentCell
function checkQualification(p, pos, shiftId, areas, tags, personnel) {
    // just a dummy check
    return { qualified: p.id % 2 === 0, reason: '' };
}

function oldGetFilteredCandidates() {
    // Determine effective restriction (Inheritance: Pos > Legacy > Area)
    const area = areas.find((a) => a.id === pos.areaId)
    let limitType = pos.limitType
    let limitValue = pos.limitValue
    if (!limitType && pos.teamKeyManId) {
      limitType = 'keyman'
      limitValue = pos.teamKeyManId
    }
    if (!limitType && area && area.limitType) {
      limitType = area.limitType
      limitValue = area.limitValue
    }

    // Create a list of ALL personnel, but mark if they are recommended or not
    let candidates = personnel.map((p) => {
      const { qualified, reason } = checkQualification(p, pos, shiftId, areas, tags, personnel)
      return { ...p, qualified, reason }
    })

    // Sort: Qualified first, then Team-Match (Legacy), then Alphabetical
    candidates.sort((a, b) => {
      if (a.qualified && !b.qualified) return -1
      if (!a.qualified && b.qualified) return 1

      // Prioritize Team Match (Legacy support for highlighting if no strict constraint)
      if (pos.teamKeyManId && !limitType) {
        const aTeam = a.keyManId === pos.teamKeyManId
        const bTeam = b.keyManId === pos.teamKeyManId
        if (aTeam && !bTeam) return -1
        if (!aTeam && bTeam) return 1
      }

      return a.name.localeCompare(b.name)
    })

    return candidates;
}

const ITERATIONS = 1000;

const startOld = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    oldGetFilteredCandidates();
}
const timeOld = performance.now() - startOld;

console.log(`[AssignmentCell] Benchmark:`);
console.log(`Old approach time: ${timeOld.toFixed(2)}ms`);


// We simulate useMemo by caching the inputs (but actually memoization will be done via React `useMemo`)
// However, the real issue mentioned by the user is that `getFilteredCandidates` runs inside a component
// and `filteredCandidates` is unmemoized, leading to recalculation on every render.
// The task is to wrap the logic of `getFilteredCandidates` in `useMemo`.

let cachedCandidates = null;
let lastArgs = null;

function newGetFilteredCandidatesMemoized(personnel, pos, shiftId, areas, tags) {
    // Simple mock memoization
    const argsKey = JSON.stringify({ personnelLength: personnel.length, posId: pos.id, shiftId });
    if (lastArgs === argsKey && cachedCandidates) {
        return cachedCandidates;
    }

    const area = areas.find((a) => a.id === pos.areaId)
    let limitType = pos.limitType
    let limitValue = pos.limitValue
    if (!limitType && pos.teamKeyManId) {
      limitType = 'keyman'
      limitValue = pos.teamKeyManId
    }
    if (!limitType && area && area.limitType) {
      limitType = area.limitType
      limitValue = area.limitValue
    }

    // Create a list of ALL personnel, but mark if they are recommended or not
    let candidates = personnel.map((p) => {
      const { qualified, reason } = checkQualification(p, pos, shiftId, areas, tags, personnel)
      return { ...p, qualified, reason }
    })

    // Sort: Qualified first, then Team-Match (Legacy), then Alphabetical
    candidates.sort((a, b) => {
      if (a.qualified && !b.qualified) return -1
      if (!a.qualified && b.qualified) return 1

      // Prioritize Team Match (Legacy support for highlighting if no strict constraint)
      if (pos.teamKeyManId && !limitType) {
        const aTeam = a.keyManId === pos.teamKeyManId
        const bTeam = b.keyManId === pos.teamKeyManId
        if (aTeam && !bTeam) return -1
        if (!aTeam && bTeam) return 1
      }

      return a.name.localeCompare(b.name)
    })

    lastArgs = argsKey;
    cachedCandidates = candidates;
    return candidates;
}

const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    newGetFilteredCandidatesMemoized(personnel, pos, shiftId, areas, tags);
}
const timeNew = performance.now() - startNew;

console.log(`New approach time (memoized): ${timeNew.toFixed(2)}ms`);
console.log(`Improvement: ${((timeOld - timeNew) / timeOld * 100).toFixed(2)}%`);
