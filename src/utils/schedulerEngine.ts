import { 
  Person, 
  Position, 
  Area, 
  Tag, 
  Shift, 
  RuleOptions,
  Assignment 
} from '../types/models';
import { 
  getAssignId,
  parseAssignmentKey,
  getCandidatesForPosition,
  ROLE_HIERARCHY,
  shuffleArray 
} from './helpers';

export const getConflict = (
  personId: number | string | null, 
  pos: Position, 
  shiftId: string, 
  currentAssignments: Record<string, Assignment | null>,
  personnelMap: Map<number, Person>,
  shifts: Shift[],
  positions: Position[],
  rules: Partial<RuleOptions> = {},
  areasMap: Map<string, Area>,
  tags: Tag[] = []
) => {
  if (!personId) return null
  const pid = typeof personId === 'string' ? parseInt(personId) : personId as number
  const person = personnelMap.get(pid)
  if (!person) return null

  // 1. Double Booking
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
      const otherPos = positions.find((p) => p.id === existingPosId)
      const isReliefOverlap = (shiftId === 'all' && existingShiftId !== 'all') || (shiftId !== 'all' && existingShiftId === 'all');

      if (isReliefOverlap && rules.auditoriumRotationMode) {
        const targetRotShiftId = shiftId === 'all' ? existingShiftId : shiftId;
        const targetAudPos = shiftId === 'all' ? pos : positions.find(p => p.id === existingPosId);

        if (targetAudPos && targetAudPos.type === 'auditorium' && targetAudPos.section) {
          const sameSectionPositions = positions.filter(
            (p) =>
              p.type === 'auditorium' &&
              p.section === targetAudPos?.section &&
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

          if (someoneElseRelieved) {
            return {
              type: 'error',
              msg: `Section ${targetAudPos.section} already has a brother relieved in this shift.`,
              key: 'relief_section_limit',
            }
          }
        }

        const allAudPositions = positions.filter((p) => p.type === 'auditorium')
        const totalAudCount = allAudPositions.length
        const maxReliefPct = rules.auditoriumCoverage || 25
        const maxReliefCount = Math.max(
          1,
          Math.floor(totalAudCount * (maxReliefPct / 100)),
        )

        const otherReliefCount = allAudPositions.filter((ap) => {
          const apPid = getAssignId(currentAssignments[ap.id])
          if (!apPid || apPid === pid) return false

          return Object.keys(currentAssignments).some((k) => {
            if (!k.endsWith(`_${targetRotShiftId}`)) return false
            return getAssignId(currentAssignments[k]) === apPid
          })
        }).length

        if (otherReliefCount >= maxReliefCount) {
          return {
            type: 'error',
            msg: `Max relief limit reached (${maxReliefPct}%).`,
            key: 'relief_total_limit',
          }
        }
        continue
      }

      return {
        type: rules.doubleBookingSeverity || 'error',
        msg: `Double booked with ${otherPos ? otherPos.name : existingPosId}`,
        key: aid,
      }
    }
  }

  // 2. Unavailability
  if (person.unavailable) {
    if (shiftId === 'all') {
      if (person.unavailable.includes('all_day')) {
        return {
          type: rules.unavailableSeverity || 'error',
          msg: 'Marked Unavailable',
        }
      }
    } else {
      if (person.unavailable.includes(shiftId)) {
        return {
          type: rules.unavailableSeverity || 'error',
          msg: 'Marked Unavailable',
        }
      }
    }
  }

  // 2a. Tag Restrictions (Shifts & Areas)
  if (tags && person.tags) {
    for (let tid of person.tags) {
      const tag = tags.find((t) => t.id === tid)
      if (tag) {
        if (tag.restrictedAreas && tag.restrictedAreas.includes(pos.areaId)) {
          return { type: 'error', msg: `Restricted Area: ${tag.name}` }
        }
        if (tag.restrictedShifts) {
          if (tag.restrictedShifts.includes(shiftId)) {
            return { type: 'error', msg: `Restricted Shift: ${tag.name}` }
          }
          if (shiftId === 'all' && tag.restrictedShifts.includes('all_day')) {
            return { type: 'error', msg: `Restricted All Day: ${tag.name}` }
          }
        }
      }
    }
  }

  // 3. Capabilities
  const area = areasMap.get(pos.areaId)
  const requiredCap = area ? area.capability : ''

  const bypassCap =
    rules.auditoriumRotationMode &&
    pos.type === 'rotational' &&
    person.caps &&
    person.caps.includes('auditorium')

  if (!bypassCap && (!person.caps || !person.caps.includes(requiredCap || ''))) {
    return {
      type: rules.capabilitySeverity || 'error',
      msg: 'Missing Capability',
    }
  }
  if (pos.keyMan && (!person.caps || !person.caps.includes('keyman'))) {
    return { type: rules.capabilitySeverity || 'error', msg: 'Not a Key Man' }
  }

  return null
}

export const executeAutoFill = (
  assignments: Record<string, Assignment | null>,
  personnel: Person[],
  positions: Position[],
  shifts: Shift[],
  areas: Area[],
  tags: Tag[] = [],
  rules: Partial<RuleOptions> = {}
) => {
  const newAssignments = { ...assignments }
  const newLog: { type: string, msg: string }[] = []
  let filledCount = 0

  const personnelMap = new Map(personnel.map(p => [p.id, p]))
  const areasMap = new Map(areas.map(a => [a.id, a]))
  const shiftsMap = new Map(shifts.map(s => [s.id, s]))

  const workMinutesMap = new Map<number, number>()
  const workloadStatsMap = new Map<number, { score: number, hasKeymanJob: boolean }>()

  Object.keys(newAssignments).forEach((key) => {
    const pid = getAssignId(newAssignments[key])
    if (pid !== null) {
      if (key.includes('_')) {
        const parts = key.split('_')
        const shiftId = parts[parts.length - 1]
        const shift = shiftsMap.get(shiftId)
        if (shift) {
          workMinutesMap.set(pid, (workMinutesMap.get(pid) || 0) + (shift.minutes || 150))
        }
      }

      if (!workloadStatsMap.has(pid)) {
        workloadStatsMap.set(pid, { score: 0, hasKeymanJob: false })
      }
      const stats = workloadStatsMap.get(pid)!
      const { posId } = parseAssignmentKey(key, shifts)
      const pos = positions.find((p) => p.id === posId)
      if (pos) {
        if (pos.type === 'auditorium') stats.score += 0.1
        else stats.score += 1.0
        if (pos.keyMan) stats.hasKeymanJob = true
      }
    }
  })

  const getWorkloadScore = (pid: number, currentAssignments: Record<string, any>, targetPos: Position, targetShiftId: string, workloadMap: any) => {
    let score = 0
    let hasKeymanJob = false

    if (workloadMap && workloadMap.has(pid)) {
      const stats = workloadMap.get(pid)
      score = stats.score
      hasKeymanJob = stats.hasKeymanJob
    } else {
      Object.keys(currentAssignments).forEach((key) => {
        if (getAssignId(currentAssignments[key]) === pid) {
          const { posId } = parseAssignmentKey(key, shifts)
          const pos = positions.find((p) => p.id === posId)
          if (pos) {
            if (pos.type === 'auditorium') score += 0.1
            else score += 1.0
            if (pos.keyMan) hasKeymanJob = true
          }
        }
      })
    }

    const area = areasMap.get(targetPos.areaId)
    let limitType = targetPos.limitType
    let limitValue = targetPos.limitValue
    if (!limitType && area?.limitType) {
      limitType = area.limitType
      limitValue = area.limitValue
    }

    if (limitType === 'role' && limitValue) {
      const p = personnelMap.get(pid)
      if (p) {
        if (p.role === limitValue) score -= 5.0 
        else if (ROLE_HIERARCHY[p.role || ''] > ROLE_HIERARCHY[limitValue]) score += 2.0 
      }
    }

    const targetPosIsRegular = !targetPos.keyMan
    if (targetPosIsRegular && hasKeymanJob) score += 10.0

    return score
  }

  const getRotationalShiftCount = (pid: number, currentAssignments: Record<string, any>) => {
    let count = 0
    Object.keys(currentAssignments).forEach((key) => {
      if (getAssignId(currentAssignments[key]) === pid) {
        const { posId } = parseAssignmentKey(key, shifts)
        const pos = positions.find((p) => p.id === posId)
        if (pos && pos.type !== 'auditorium') count++
      }
    })
    return count
  }

  const isAnchorAvailableForShift = (person: Person, shiftId: string, currentAssignments: Record<string, any>) => {
    if (rules.anchorLimits === false) return true
    const isAnchor = Object.keys(currentAssignments).some(k => {
      const pos = positions.find(p => p.id === k);
      return pos && pos.type === 'auditorium' && getAssignId(currentAssignments[k]) === person.id;
    });
    if (!isAnchor) return true;
    if (getRotationalShiftCount(person.id, currentAssignments) >= 1) return false;
    return true
  }

  const isOverWorkLimit = (pid: number, currentAssignments: Record<string, any>, workMap: Map<number, number>) => {
    const limit = rules.maxWorkPercent || 50
    let minutesWorking = workMap.get(pid) || 0;
    const pct = Math.round((minutesWorking / 600) * 100)
    return pct >= limit
  }

  const workedAdjacentShift = (pid: number, shiftId: string, currentAssignments: Record<string, any>) => {
    if (rules.avoidConsecutive === false) return false
    const sIdx = shifts.findIndex((s) => s.id === shiftId)
    if (sIdx === -1) return false

    const prevShift = sIdx > 0 ? shifts[sIdx - 1] : null
    const workedPrev = prevShift && Object.keys(currentAssignments).some((key) => {
      return key.endsWith(`_${prevShift.id}`) && getAssignId(currentAssignments[key]) === pid
    })
    if (workedPrev) return true

    const nextShift = sIdx < shifts.length - 1 ? shifts[sIdx + 1] : null
    const workedNext = nextShift && Object.keys(currentAssignments).some((key) => {
      return key.endsWith(`_${nextShift.id}`) && getAssignId(currentAssignments[key]) === pid
    })
    if (workedNext) return true

    return false
  }

  const getValidCandidates = (pos: Position, shiftId: string, currentAssignments: Record<string, any>, workMap: Map<number, number>) => {
    let candidates = getCandidatesForPosition(pos, personnel, areas, tags)

    if (rules.auditoriumRotationMode && pos.type === 'rotational') {
      let audPotential = personnel.filter(
        (p) => p.caps && p.caps.includes('auditorium') && !candidates.some((c) => c.id === p.id),
      )

      if (!pos.keyMan) {
        audPotential = audPotential.filter(p => {
          const hasKMString = p.caps && p.caps.includes('keyman');
          const hasKMRole = p.role === 'Elder' || p.role === 'MS';
          const hasTeam = personnel.some(other => other.keyManId === p.id);
          const isKM = hasKMString || hasKMRole || hasTeam;
          return !isKM;
        });
      }

      candidates = [...candidates, ...audPotential]
    }

    return candidates.filter((p) => {
      const conflict = getConflict(p.id, pos, shiftId, currentAssignments, personnelMap, shifts, positions, rules, areasMap, tags)
      if (conflict && conflict.type === 'error') return false
      if (isOverWorkLimit(p.id, currentAssignments, workMap)) return false
      if (workedAdjacentShift(p.id, shiftId, currentAssignments)) return false
      if (!isAnchorAvailableForShift(p, shiftId, currentAssignments)) return false
      return true
    })
  }

  const allSlots: { pos: Position, shiftId: string, key: string }[] = []
  positions.forEach((pos) => {
    if (pos.type === 'auditorium') {
      allSlots.push({ pos, shiftId: 'all', key: pos.id })
    } else if (!pos.isMirror) {
      shifts.forEach((s) => {
        if (pos.validShifts && !pos.validShifts.includes(s.id)) return
        allSlots.push({ pos, shiftId: s.id, key: `${pos.id}_${s.id}` })
      })
    }
  })

  const keymanSlots = allSlots.filter((s) => s.pos.keyMan && !newAssignments[s.key])
  keymanSlots.sort((a, b) => {
    const poolA = getValidCandidates(a.pos, a.shiftId, newAssignments, workMinutesMap).length
    const poolB = getValidCandidates(b.pos, b.shiftId, newAssignments, workMinutesMap).length
    return poolA - poolB
  })

  keymanSlots.forEach(slot => {
    const candidates = getValidCandidates(slot.pos, slot.shiftId, newAssignments, workMinutesMap)
    if (candidates.length === 0) return

    const shuffled = shuffleArray([...candidates]);
    shuffled.sort((a, b) => {
      const scoreA = getWorkloadScore(a.id, newAssignments, slot.pos, slot.shiftId, workloadStatsMap)
      const scoreB = getWorkloadScore(b.id, newAssignments, slot.pos, slot.shiftId, workloadStatsMap)
      return scoreA - scoreB
    })

    const chosen = shuffled[0]
    newAssignments[slot.key] = { id: chosen.id, isAuto: true }
    filledCount++

    if (slot.key.includes('_')) {
      const shift = shiftsMap.get(slot.shiftId)
      workMinutesMap.set(chosen.id, (workMinutesMap.get(chosen.id) || 0) + (shift ? shift.minutes || 150 : 150))
    }
    if (!workloadStatsMap.has(chosen.id)) {
      workloadStatsMap.set(chosen.id, { score: 0, hasKeymanJob: false })
    }
    const stats = workloadStatsMap.get(chosen.id)!
    if (slot.pos.type === 'auditorium') stats.score += 0.1
    else stats.score += 1.0
    if (slot.pos.keyMan) stats.hasKeymanJob = true

    newLog.push({ type: 'keyman', msg: `[KEYMAN] Assigned ${chosen.name} to ${slot.pos.name} (${slot.shiftId})` })
  })

  // Phase 2: REGULAR
  const regularSlots = allSlots.filter((s) => !s.pos.keyMan && !newAssignments[s.key])
  regularSlots.sort((a, b) => {
    const poolA = getValidCandidates(a.pos, a.shiftId, newAssignments, workMinutesMap).length
    const poolB = getValidCandidates(b.pos, b.shiftId, newAssignments, workMinutesMap).length
    return poolA - poolB
  })

  regularSlots.forEach(slot => {
    const candidates = getValidCandidates(slot.pos, slot.shiftId, newAssignments, workMinutesMap)
    if (candidates.length === 0) return

    const shuffled = shuffleArray([...candidates]);
    shuffled.sort((a, b) => {
      const scoreA = getWorkloadScore(a.id, newAssignments, slot.pos, slot.shiftId, workloadStatsMap)
      const scoreB = getWorkloadScore(b.id, newAssignments, slot.pos, slot.shiftId, workloadStatsMap)
      return scoreA - scoreB
    })

    const chosen = shuffled[0]
    newAssignments[slot.key] = { id: chosen.id, isAuto: true }
    filledCount++

    if (slot.key.includes('_')) {
      const shift = shiftsMap.get(slot.shiftId)
      workMinutesMap.set(chosen.id, (workMinutesMap.get(chosen.id) || 0) + (shift ? shift.minutes || 150 : 150))
    }
    if (!workloadStatsMap.has(chosen.id)) {
      workloadStatsMap.set(chosen.id, { score: 0, hasKeymanJob: false })
    }
    const stats = workloadStatsMap.get(chosen.id)!
    if (slot.pos.type === 'auditorium') stats.score += 0.1
    else stats.score += 1.0
    if (slot.pos.keyMan) stats.hasKeymanJob = true

    newLog.push({ type: 'rotational', msg: `[REGULAR] Assigned ${chosen.name} to ${slot.pos.name} (${slot.shiftId})` })
  })

  allSlots.filter(s => !newAssignments[s.key]).forEach(s => {
    newLog.push({ type: 'error', msg: `FAILED TO FILL: ${s.pos.name} (${s.shiftId})` })
  })

  return { newAssignments, newLog, filledCount }
}
