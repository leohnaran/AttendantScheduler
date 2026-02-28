function benchmark() {
  const personnel = [];
  for (let i = 0; i < 1000; i++) {
    personnel.push({ id: i, name: `Person ${i}`, caps: ['attendant'], tags: [] });
  }

  const areas = [{ id: 1, limitType: null, limitValue: null }];
  const pos = { id: 1, areaId: 1, limitType: null, teamKeyManId: null };
  const shiftId = 'shift_1';
  const tags = [];
  const assignedId = null;
  const assignedPerson = null;

  const getFilteredCandidates = () => {
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

    let candidates = personnel.map((p) => {
      // Mocking checkQualification for simplicity to measure map+sort overhead
      const qualified = true;
      const reason = null;
      return { ...p, qualified, reason }
    })

    candidates.sort((a, b) => {
      if (a.qualified && !b.qualified) return -1
      if (!a.qualified && b.qualified) return 1

      if (pos.teamKeyManId && !limitType) {
        const aTeam = a.keyManId === pos.teamKeyManId
        const bTeam = b.keyManId === pos.teamKeyManId
        if (aTeam && !bTeam) return -1
        if (!aTeam && bTeam) return 1
      }

      return a.name.localeCompare(b.name)
    })

    if (assignedId && !assignedPerson) {
      const unknownPerson = {
        id: assignedId,
        name: 'Unknown (Removed)',
        qualified: false,
        reason: 'Brother not found in roster',
      }
      return [unknownPerson, ...candidates]
    }

    if (assignedPerson && !candidates.find((c) => c.id === assignedPerson.id)) {
      return [assignedPerson, ...candidates]
    }
    return candidates
  }

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    getFilteredCandidates();
  }
  const end = performance.now();
  console.log(`Execution time (100 calls): ${end - start} ms`);
}

benchmark();
