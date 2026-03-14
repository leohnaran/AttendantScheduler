import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import * as htmlToImage from 'html-to-image'
import toast from 'react-hot-toast'
import { exportToExcel } from '../utils/excelExport'
import { t } from '../i18n/translations'
import { useConfirm } from '../hooks/useConfirm'
import {
  getAssignId,
  getCandidatesForPosition,
  isAutoAssigned,
  parseAssignmentKey,
  shuffleArray,
} from '../utils/helpers'
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import { useStore } from '../store/useStore'
import PersonnelSidebar, { DraggablePerson } from './PersonnelSidebar'
import MobileScheduleView from './MobileScheduleView'
import AssignmentCell from './AssignmentCell'
import FindReplacementModal from './FindReplacementModal'
import { executeAutoFill } from '../utils/schedulerEngine'

interface ScheduleViewProps {
  language: string;
}

export default function ScheduleView({ language }: ScheduleViewProps) {
  const confirm = useConfirm()
  const personnel = useStore((state) => state.personnel)
  const assignments = useStore((state) => state.assignments)
  const areas = useStore((state) => state.areas)
  const positions = useStore((state) => state.positions)
  const shifts = useStore((state) => state.shifts)
  const rules = useStore((state) => state.rules)
  const tags = useStore((state) => state.tags)
  const updateState = useStore((state) => state.updateState)

  const setAssignments = (val) => updateState({ assignments: typeof val === 'function' ? val(assignments) : val })
  const onAutoFill = (newAssigns, newLog) => updateState({ assignments: newAssigns, log: newLog })
  const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a])), [areas]);
  const personnelMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);
  const shiftsMap = useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);

  const [layoutMode, setLayoutMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [replacementSlot, setReplacementSlot] = useState(null)
  const [hoveredMirrorKey, setHoveredMirrorKey] = useState(null)
  const [activeDragPersonId, setActiveDragPersonId] = useState<number | null>(null)

  const [resolvingAbsences, setResolvingAbsences] = useState(false)
  const [resolveQueue, setResolveQueue] = useState([])

  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const printMenuRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setShowActionMenu(false)
      }
      if (printMenuRef.current && !printMenuRef.current.contains(e.target)) {
        setShowPrintMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setLayoutMode('mobile')
      else setLayoutMode('grid')
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleExportPNG = async () => {
    // Target the wrapper that has the overflow-auto
    const scrollEl = gridRef.current?.querySelector('.overflow-auto');
    if (!scrollEl) return;

    setShowPrintMenu(false);

    // Temporarily force light mode for clean white background
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      // Give the browser a moment to apply the removed class
      await new Promise(r => setTimeout(r, 50));
    }

    try {
      // Use the actual scrollable dimensions
      const width = scrollEl.scrollWidth;
      const height = scrollEl.scrollHeight;

      const dataUrl = await htmlToImage.toPng(scrollEl, {
        width: width,
        height: height,
        style: {
          width: width + 'px',
          height: height + 'px',
          overflow: 'visible',
          transform: 'none'
        },
        backgroundColor: '#ffffff',
        // CRITICAL: Explicitly filter out UI elements during PNG capture
        filter: (node) => {
          const classList = node.classList;
          if (classList && (
            classList.contains('print:hidden') ||
            node.tagName === 'BUTTON' ||
            classList.contains('fa')
          )) {
            return false;
          }
          return true;
        }
      });

      const link = document.createElement('a');
      link.download = `schedule-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
      toast.error('PNG Export failed. Try standard Print instead.');
    } finally {
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }

  const handleFindReplacement = (pos, shiftId) => {
    setReplacementSlot({ pos, shiftId })
  }

  const handleReplacementAssign = async (pos, shiftId, personId, isDominoSwap = false, dominoData = null) => {
    let newAssignments = { ...assignments }

    if (isDominoSwap && dominoData) {
      // 1. Assign Brother B to the new target slot
      const targetKey = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`
      newAssignments[targetKey] = { id: parseInt(personId), isAuto: false }

      // 2. Assign Brother C to Brother B's old slot, or clear it if no replacement
      const oldSlotKey = dominoData.pos.type === 'auditorium' ? dominoData.pos.id : `${dominoData.pos.id}_${dominoData.shiftId}`
      if (dominoData.replacementId) {
        newAssignments[oldSlotKey] = { id: parseInt(dominoData.replacementId), isAuto: false }
      } else {
        newAssignments[oldSlotKey] = null
      }
    } else {
      const assignmentKey = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`
      const conflictingPos = getConflict(parseInt(personId), pos, shiftId, assignments, personnelMap, shifts, positions, rules, areasMap, tags)
      if (conflictingPos) {
        if (!await confirm(`${personnelMap.get(parseInt(personId))?.name} is already assigned to a concurrent shift. Double book?`)) {
          return
        }
      }
      newAssignments[assignmentKey] = { id: parseInt(personId), isAuto: false }
    }

    setAssignments(newAssignments)

    if (resolvingAbsences && resolveQueue.length > 0) {
      const remainingQueue = resolveQueue.filter(slot => {
        // Remove the slot we just filled
        return !(slot.pos.id === pos.id && slot.shiftId === shiftId)
      })

      if (remainingQueue.length > 0) {
        setResolveQueue(remainingQueue)
        setReplacementSlot(remainingQueue[0])
      } else {
        setResolvingAbsences(false)
        setResolveQueue([])
        setReplacementSlot(null)
      }
    } else {
      setReplacementSlot(null)
    }
  }

  const handleAssignAttempt = (key, personId) => {
    const value = personId || null
    const pid = parseInt(personId)
    const assignObj = value ? { id: parseInt(value), isAuto: false } : null

    const { posId, shiftId } = parseAssignmentKey(key, shifts)

    const pos = positions.find((p) => p.id === posId)
    if (!pos) {
      setAssignments((prev) => ({ ...prev, [key]: assignObj }))
      return
    }

    // Collect ALL conflicts for this person, not just the first one
    const allConflicts = getAllConflicts(value, pos, shiftId, assignments)
    if (allConflicts.length > 0) {
      setPendingAction({
        targetKey: key,
        targetValue: assignObj,
        conflictMsg: allConflicts.map(c => c.msg).join('\n'),
        conflictSourceKeys: allConflicts.map(c => c.key).filter(Boolean),
        personName: personnelMap.get(parseInt(value))?.name,
      })
    } else {
      setAssignments((prev) => ({ ...prev, [key]: assignObj }))
    }
  }

  const confirmConflict = () => {
    if (pendingAction) {
      setAssignments((prev) => ({
        ...prev,
        [pendingAction.targetKey]: pendingAction.targetValue,
      }))
      setPendingAction(null)
    }
  }

  const resolveAndAssign = () => {
    if (pendingAction && pendingAction.conflictSourceKeys && pendingAction.conflictSourceKeys.length > 0) {
      setAssignments((prev) => {
        const updated = { ...prev }
        // Clear ALL conflicting assignments
        pendingAction.conflictSourceKeys.forEach((sourceKey) => {
          updated[sourceKey] = null
        })
        // Assign to the new target
        updated[pendingAction.targetKey] = pendingAction.targetValue
        return updated
      })
      setPendingAction(null)
    }
  }

  const getRotationalShiftCount = (pid, currentAssignments) => {
    let count = 0
        Object.keys(currentAssignments).forEach((key) => {
          if (getAssignId(currentAssignments[key]) === pid) {
            const { posId } = parseAssignmentKey(key, shifts)
            const pos = positions.find((p) => p.id === posId)
            if (pos && pos.type !== 'auditorium') {
              count++
            }
                }
              })
              return count
            }
  const getWorkPercentage = (pid, currentAssignments, workMinutesMap = null) => {
    let minutesWorking = 0
    if (workMinutesMap) {
      minutesWorking = workMinutesMap.get(pid) || 0
    } else {
      Object.keys(currentAssignments).forEach((key) => {
        if (getAssignId(currentAssignments[key]) === pid) {
          // ONLY count rotational assignments (with underscore) towards work load/time away
          if (key.includes('_')) {
            const parts = key.split('_')
            const shiftId = parts[parts.length - 1]
            const shift = shiftsMap.get(shiftId)
            if (shift) minutesWorking += shift.minutes || 150
          }
        }
      })
    }
    return Math.round((minutesWorking / 600) * 100)
  }

  const isOverWorkLimit = (pid, currentAssignments, workMinutesMap = null) => {
    const limit = rules.maxWorkPercent || 50
    const pct = getWorkPercentage(pid, currentAssignments, workMinutesMap)
    return pct >= limit
  }

  const getReliefUsedCount = (shiftId, currentAssignments) => {
    let count = 0
    positions
      .filter((p) => p.type === 'rotational' && !p.isMirror)
      .forEach((pos) => {
        const key = `${pos.id}_${shiftId}`
        const pid = getAssignId(currentAssignments[key])
        const person = personnelMap.get(pid)
        if (person && person.caps && person.caps.includes('auditorium')) count++
      })
    return count
  }

  // Collect ALL conflicts for a person being assigned to a position,
  // instead of returning on the first one like getConflict does.
  const getAllConflicts = (personId, pos, shiftId, currentAssignments) => {
    if (!personId) return []
    const pid = parseInt(personId)
    const person = personnelMap.get(pid)
    if (!person) return []

    const conflicts = []

    // 1. Double Bookings - collect ALL overlapping assignments
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
        const isReliefOverlap = (shiftId === 'all' && existingShiftId !== 'all') || (shiftId !== 'all' && existingShiftId === 'all')

        if (isReliefOverlap && rules.auditoriumRotationMode) {
          // Relief mode — skip this overlap (it's allowed)
          continue
        }

        conflicts.push({
          type: rules.doubleBookingSeverity || 'error',
          msg: `Double booked with ${otherPos ? otherPos.name : existingPosId}`,
          key: aid,
        })
      }
    }

    // 2. Non-double-booking conflicts (unavailability, tags, capabilities)
    // Use existing getConflict but only if it returns a NON-double-booking error
    // (double bookings are already collected above)
    if (person.unavailable) {
      if (shiftId === 'all' && person.unavailable.includes('all_day')) {
        conflicts.push({ type: rules.unavailableSeverity || 'error', msg: 'Marked Unavailable' })
      } else if (person.unavailable.includes(shiftId)) {
        conflicts.push({ type: rules.unavailableSeverity || 'error', msg: 'Marked Unavailable' })
      }
    }

    const area = areasMap.get(pos.areaId)
    const requiredCap = area ? area.capability : ''
    const bypassCap = rules.auditoriumRotationMode && pos.type === 'rotational' && person.caps && person.caps.includes('auditorium')
    if (!bypassCap && (!person.caps || !person.caps.includes(requiredCap))) {
      conflicts.push({ type: rules.capabilitySeverity || 'error', msg: 'Missing Capability' })
    }
    if (pos.keyMan && (!person.caps || !person.caps.includes('keyman'))) {
      conflicts.push({ type: rules.capabilitySeverity || 'error', msg: 'Not a Key Man' })
    }

    // Only return 'error' type conflicts (warnings are allowed through)
    return conflicts.filter(c => c.type === 'error')
  }

  const getConflict = (personId, pos, shiftId, currentAssignments) => {
    if (!personId) return null
    const pid = parseInt(personId)
    const person = personnelMap.get(pid)
    if (!person) return null

    // 1. Double Booking
    const activeAssignments = Object.keys(currentAssignments).filter(
      (key) => getAssignId(currentAssignments[key]) === pid,
    )

    for (let aid of activeAssignments) {
      // Find what position and shift the existing assignment (aid) is for
      let existingPosId = aid
      let existingShiftId = 'all'

      for (const s of shifts) {
        if (aid.endsWith(`_${s.id}`)) {
          existingShiftId = s.id
          existingPosId = aid.substring(0, aid.length - s.id.length - 1)
          break
        }
      }

      // If it's the exact same slot we are checking, it's not a conflict
      if (existingPosId === pos.id && existingShiftId === shiftId) continue

      // Check for temporal overlap
      const overlap =
        shiftId === 'all' || existingShiftId === 'all' || shiftId === existingShiftId

      if (overlap) {
        const otherPos = positions.find((p) => p.id === existingPosId)

        // RELIEF MODE: Allow overlap if one is All-Day ('all') and the other is a specific shift
        const isReliefOverlap = (shiftId === 'all' && existingShiftId !== 'all') || (shiftId !== 'all' && existingShiftId === 'all');

        if (isReliefOverlap && rules.auditoriumRotationMode) {
          // Identify which shift's relief limit we are checking
          const targetRotShiftId = shiftId === 'all' ? existingShiftId : shiftId;
          const targetAudPos = shiftId === 'all' ? pos : positions.find(p => p.id === existingPosId);

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

            if (someoneElseRelieved) {
              return {
                type: 'error',
                msg: `Section ${targetAudPos.section} already has a brother relieved in this shift.`,
                key: 'relief_section_limit',
              }
            }
          }

          // 2. Respect Max Relief % per shift
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

          // If we passed both checks, this overlap is ALLOWED
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
          // Check Restricted Areas
          if (tag.restrictedAreas && tag.restrictedAreas.includes(pos.areaId)) {
            return {
              type: 'error',
              msg: `Restricted Area: ${tag.name}`,
            }
          }
          // Check Restricted Shifts
          if (tag.restrictedShifts) {
            if (tag.restrictedShifts.includes(shiftId)) {
              return {
                type: 'error',
                msg: `Restricted Shift: ${tag.name}`,
              }
            }
            if (shiftId === 'all' && tag.restrictedShifts.includes('all_day')) {
              return {
                type: 'error',
                msg: `Restricted All Day: ${tag.name}`,
              }
            }
          }
        }
      }
    }

    // 3. Capabilities
    const area = areasMap.get(pos.areaId)
    const requiredCap = area ? area.capability : ''

    // RELIEF MODE BYPASS: If enabled, brothers with 'auditorium' capability
    // are allowed to work any rotational position even without the specific capability.
    const bypassCap =
      rules.auditoriumRotationMode &&
      pos.type === 'rotational' &&
      person.caps &&
      person.caps.includes('auditorium')

    if (!bypassCap && (!person.caps || !person.caps.includes(requiredCap))) {
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

  const workedAdjacentShift = (pid, shiftId, currentAssignments) => {
    if (rules.avoidConsecutive === false) return false
    const sIdx = shifts.findIndex((s) => s.id === shiftId)
    if (sIdx === -1) return false

    // Check Previous
    const prevShift = sIdx > 0 ? shifts[sIdx - 1] : null
    const workedPrev = prevShift && Object.keys(currentAssignments).some((key) => {
      return (
        key.endsWith(`_${prevShift.id}`) &&
        getAssignId(currentAssignments[key]) === pid
      )
    })
    if (workedPrev) return true

    // Check Next
    const nextShift = sIdx < shifts.length - 1 ? shifts[sIdx + 1] : null
    const workedNext = nextShift && Object.keys(currentAssignments).some((key) => {
      return (
        key.endsWith(`_${nextShift.id}`) &&
        getAssignId(currentAssignments[key]) === pid
      )
    })
    if (workedNext) return true

    return false
  }

  const isAnchorAvailableForShift = (person, shiftId, currentAssignments) => {
    if (rules.anchorLimits === false) return true

    // Check if he's an anchor (Auditorium assignment)
    const isAnchor = Object.keys(currentAssignments).some(k => {
      const pos = positions.find(p => p.id === k);
      return pos && pos.type === 'auditorium' && getAssignId(currentAssignments[k]) === person.id;
    });

    if (!isAnchor) return true;

    // Enforce 25% rule for anchors in Auto-Fill
    if (getRotationalShiftCount(person.id, currentAssignments) >= 1) return false;

    return true
  }

  const getTotalAssignmentCount = (pid, currentAssignments) => {
    let count = 0
    Object.keys(currentAssignments).forEach((key) => {
      if (getAssignId(currentAssignments[key]) === pid) count++
    })
    return count
  }

  const handleAutoFill = () => {
    try {
      const { newAssignments, newLog, filledCount } = executeAutoFill(
        assignments,
        personnel,
        positions,
        shifts,
        areas,
        tags,
        rules
      )
      
      const totalPersonnel = personnel.length
      const assignedIds = new Set()
      Object.keys(newAssignments).forEach((k) => {
        const id = getAssignId(newAssignments[k])
        if (id) assignedIds.add(id)
      })

      const emptyCount = positions.reduce((count, p) => {
        if (p.type === 'auditorium' && !newAssignments[p.id]) return count + 1;
        if (p.type === 'rotational' && !p.isMirror) {
           return count + shifts.filter(s => (!p.validShifts || p.validShifts.includes(s.id)) && !newAssignments[`${p.id}_${s.id}`]).length;
        }
        return count;
      }, 0);

      const vacancyWarning = emptyCount > 0
        ? `\n\n⚠️ WARNING: ${emptyCount} positions could not be filled! Check for red cells in the schedule.`
        : `\n\n✅ All positions were successfully filled.`;

      onAutoFill(newAssignments, newLog)
      toast.success(
        `Weighted Scoring Auto-Fill Complete!\n\nUtilization: ${assignedIds.size}/${totalPersonnel} Volunteers (${Math.round((assignedIds.size / totalPersonnel) * 100)}%)${vacancyWarning}\n\nPLEASE CHECK THE LOG TAB FOR THE BREAKDOWN.`,
        { duration: 8000 }
      )
    } catch (err) {
      console.error(err);
      toast.error('Auto-Fill encountered an error.');
    }
  }

  const handleClearAll = async () => {
    if (await confirm('Clear ALL assignments?')) {
      const count = Object.keys(assignments).length
      setAssignments({})
      toast.success(`Cleared ${count} assignments.`)
    }
  }

  const handleClearAuto = () => {
    const cleanedAssignments = { ...assignments }
    let count = 0
    Object.keys(cleanedAssignments).forEach((key) => {
      if (isAutoAssigned(cleanedAssignments[key])) {
        cleanedAssignments[key] = null
        count++
      }
    })
    setAssignments(cleanedAssignments)
    toast.success(`Cleared ${count} auto-assigned slots.`)
  }

  const handleFixConflicts = () => {
    const newAssignments = { ...assignments }
    let fixedCount = 0
    let reassignedCount = 0
    let unassignedCount = 0

    Object.keys(newAssignments).forEach((key) => {
      const val = newAssignments[key]
      if (!val) return
      const pid = getAssignId(val)
      const { posId, shiftId } = parseAssignmentKey(key, shifts)
      const pos = positions.find((p) => p.id === posId)
      if (!pos) return

      const conflict = getConflict(pid, pos, shiftId, newAssignments, personnelMap, shifts, positions, rules, areasMap, tags)
      if (conflict && conflict.type === 'error') {
        newAssignments[key] = null
        unassignedCount++
        fixedCount++
      }
    })

    if (fixedCount > 0) {
      setAssignments(newAssignments)
      toast.success(
        `Resolved ${fixedCount} conflicts:\n- Reassigned: ${reassignedCount}\n- Unassigned: ${unassignedCount}`,
      )
    } else {
      toast.success('No conflicts found to fix.')
    }
  }

  const isScheduleEmpty = useMemo(() => {
    return (
      Object.keys(assignments).filter((k) => assignments[k] !== null).length === 0
    )
  }, [assignments])

  const orphanedSlots = useMemo(() => {
    let empty = []
    positions.forEach(pos => {
      if (pos.type === 'auditorium') {
        const slotId = pos.id
        if (!assignments[slotId]) {
          empty.push({ pos, shiftId: 'all' })
        }
      } else if (pos.type === 'rotational' && !pos.isMirror) {
        shifts.forEach(shift => {
          if (pos.validShifts && !pos.validShifts.includes(shift.id)) return
          const slotId = `${pos.id}_${shift.id}`
          if (!assignments[slotId]) {
            empty.push({ pos, shiftId: shift.id })
          }
        })
      }
    })
    return empty
  }, [positions, shifts, assignments])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const personId = active.data.current?.personId;
    if (personId) {
      setActiveDragPersonId(personId);
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragPersonId(null);
    if (!over) return;
    
    const personId = active.data.current?.personId;
    if (personId) {
      handleAssignAttempt(over.id as string, personId);
    }
  }

  const activeDragPerson = useMemo(() => {
    if (!activeDragPersonId) return null;
    return personnelMap.get(activeDragPersonId) || null;
  }, [activeDragPersonId, personnelMap]);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="flex h-[calc(100vh-160px)] gap-6 animate-in fade-in duration-500">
        {layoutMode === 'grid' && (
        <PersonnelSidebar
          personnel={personnel}
          shifts={shifts}
          assignments={assignments}
          positions={positions}
          language={language}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-6 gap-4 print:hidden">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${layoutMode === 'grid'
                ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
              <i className="fa fa-table-cells mr-2"></i> Grid View
            </button>
            <button
              onClick={() => setLayoutMode('mobile')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${layoutMode === 'mobile'
                ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
              <i className="fa fa-mobile-screen mr-2"></i> Card View
            </button>
          </div>

          <div className="flex gap-3">
            {!isScheduleEmpty && orphanedSlots.length > 0 && (
              <button
                onClick={() => {
                  setResolvingAbsences(true)
                  setResolveQueue([...orphanedSlots])
                  setReplacementSlot(orphanedSlots[0])
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center gap-2 dark:shadow-none animate-pulse"
              >
                <i className="fa fa-triangle-exclamation"></i> {t('btn_resolve_absences', language) || `Resolve ${orphanedSlots.length} Missing`}
              </button>
            )}

            <button
              onClick={handleAutoFill}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 dark:shadow-none"
            >
              <i className="fa fa-robot"></i> {t('btn_auto_fill', language)}
            </button>

            <div className="relative" ref={printMenuRef}>
              <button
                onClick={() => setShowPrintMenu(!showPrintMenu)}
                className="bg-gray-900 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <i className="fa fa-print"></i> Export/Print
              </button>
              {showPrintMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-[60] overflow-hidden py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <button
                    onClick={() => { window.print(); setShowPrintMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 flex items-center gap-2 font-bold"
                  >
                    <i className="fa fa-print"></i> Send to Printer
                  </button>
                  <button
                    onClick={handleExportPNG}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center gap-2 font-bold"
                  >
                    <i className="fa fa-image"></i> Download as PNG
                  </button>
                  <button
                    onClick={() => {
                      exportToExcel({
                        personnel,
                        assignments,
                        areas,
                        positions,
                        shifts,
                        language,
                      });
                      setShowPrintMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center gap-2 font-bold"
                  >
                    <i className="fa fa-file-excel"></i> Export to Excel
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={actionMenuRef}>
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className={`bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-full font-semibold shadow-sm transition-all flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 ${showActionMenu ? 'ring-2 ring-blue-500' : ''}`}
              >
                <i className="fa fa-ellipsis-v"></i>
              </button>
              {showActionMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-[60] overflow-hidden py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <button
                    onClick={() => {
                      handleFixConflicts()
                      setShowActionMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 flex items-center gap-2"
                  >
                    <i className="fa fa-wand-magic-sparkles"></i>{' '}
                    {t('btn_fix_conflicts', language)}
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                  <button
                    onClick={() => {
                      handleClearAuto()
                      setShowActionMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <i className="fa fa-eraser"></i> {t('btn_clear_auto', language)}
                  </button>
                  <button
                    onClick={() => {
                      handleClearAll()
                      setShowActionMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
                  >
                    <i className="fa fa-trash-can"></i> {t('btn_clear_all', language)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isScheduleEmpty && personnel.length > 0 && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 dark:bg-blue-800 dark:text-blue-300">
                <i className="fa fa-lightbulb text-xl"></i>
              </div>
              <div>
                <h4 className="font-bold text-blue-900 dark:text-blue-200">
                  {t('ready_to_schedule', language)}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {t('ready_to_schedule_desc', language).replace(
                    '{count}',
                    personnel.length,
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleAutoFill}
              className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all active:scale-95 dark:bg-slate-800 dark:text-blue-400"
            >
              Start Auto-Fill
            </button>
          </div>
        )}

        <div ref={gridRef} className="flex-1 overflow-hidden rounded-3xl border border-gray-200 shadow-xl bg-white dark:bg-slate-900 dark:border-slate-800">
          {layoutMode === 'grid' ? (
            <div className="h-full overflow-auto custom-scrollbar scrolled-x">
              <table className="w-full border-collapse text-xs table-fixed bg-white dark:bg-slate-900">
                <thead className="sticky top-0 z-40">
                  <tr className="bg-gray-50/95 backdrop-blur-md dark:bg-slate-800/95 border-b border-gray-200 dark:border-slate-700">
                    <th className="p-4 text-left w-64 sticky-header-corner font-semibold text-gray-500 uppercase tracking-wider text-xs dark:text-gray-400">
                      {t('grid_position', language)}
                    </th>
                    {shifts.map((s) => (
                      <th
                        key={s.id}
                        className="p-4 text-center font-black uppercase tracking-widest text-[10px] text-gray-400 dark:text-gray-500 border-l border-gray-100 dark:border-slate-700"
                      >
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {areas.map((area) => (
                    <React.Fragment key={area.id}>
                      <tr className="area-header-row bg-gray-50/30 dark:bg-slate-800/20">
                        <td
                          colSpan={shifts.length + 1}
                          style={area.style}
                          className="p-2 text-[10px] font-black uppercase tracking-[0.2em] text-center shadow-sm"
                        >
                          {area.name}
                        </td>
                      </tr>
                      {positions
                        .filter((p) => p.areaId === area.id)
                        .map((pos) => (
                          <tr
                            key={pos.id}
                            className="hover:bg-gray-50/50 group transition-colors dark:hover:bg-slate-800/30"
                          >
                            <td className="p-4 font-bold text-gray-700 sticky-header-col dark:text-gray-300">
                              <div className="flex flex-col">
                                <span>{pos.name}</span>
                                {pos.timeNote && (
                                  <span className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider mt-0.5">
                                    🕒 {pos.timeNote}
                                  </span>
                                )}
                              </div>
                              {pos.type === 'auditorium' && (
                                <span
                                  title="Assigned for the whole day (all shifts)"
                                  className="ml-2 inline-block text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold dark:bg-blue-900 dark:text-blue-300">
                                  ALL DAY
                                </span>
                              )}
                            </td>
                            {pos.type === 'auditorium' ? (
                              <td colSpan={shifts.length} className="p-0">
                                <div className="p-3 bg-blue-50/50 h-full flex items-center justify-center border-l border-dashed border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
                                  <div className="w-[400px]">
                                    <AssignmentCell
                                      shiftId="all"
                                      pos={pos}
                                      assignments={assignments}
                                      personnel={personnel}
                                      onAssign={handleAssignAttempt}
                                      onFindReplacement={handleFindReplacement}
                                      getConflict={getConflict}
                                      areas={areas}
                                      tags={tags}
                                      hoveredMirrorKey={hoveredMirrorKey}
                                      setHoveredMirrorKey={setHoveredMirrorKey}
                                      language={language}
                                    />
                                  </div>
                                </div>
                              </td>
                            ) : (
                              shifts.map((shift) => (
                                <AssignmentCell
                                  key={shift.id}
                                  shiftId={shift.id}
                                  pos={pos}
                                  assignments={assignments}
                                  personnel={personnel}
                                  onAssign={handleAssignAttempt}
                                  onFindReplacement={handleFindReplacement}
                                  getConflict={getConflict}
                                  areas={areas}
                                  tags={tags}
                                  hoveredMirrorKey={hoveredMirrorKey}
                                  setHoveredMirrorKey={setHoveredMirrorKey}
                                  language={language}
                                />
                              ))
                            )}
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6 bg-gray-50/50 dark:bg-slate-900/50">
              <MobileScheduleView
                personnel={personnel}
                assignments={assignments}
                onAssign={handleAssignAttempt}
                onFindReplacement={handleFindReplacement}
                getConflict={getConflict}
                areas={areas}
                positions={positions}
                shifts={shifts}
                tags={tags}
                hoveredMirrorKey={hoveredMirrorKey}
                setHoveredMirrorKey={setHoveredMirrorKey}
                language={language}
              />
            </div>
          )}
        </div>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 dark:border-red-900/30">
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-2xl flex items-center justify-center text-red-600">
                <i className="fa fa-triangle-exclamation text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900 dark:text-red-400">
                  {t('grid_conflict', language)}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-500/80">
                  {pendingAction.personName}
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed font-medium space-y-2">
                {pendingAction.conflictMsg.split('\n').map((line, i) => (
                  <p key={i} className="flex items-center gap-2">
                    <span className="text-red-500">⚠</span> {line}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={resolveAndAssign}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Unassign Previous & Assign Here
                </button>
                <button
                  onClick={confirmConflict}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
                >
                  Override & Double Assign
                </button>
                <button
                  onClick={() => setPendingAction(null)}
                  className="w-full text-gray-400 py-2 text-sm font-bold hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {replacementSlot && (
        <FindReplacementModal
          slot={replacementSlot}
          personnel={personnel}
          assignments={assignments}
          areas={areas}
          positions={positions}
          shifts={shifts}
          tags={tags}
          onAssign={handleReplacementAssign}
          onClose={() => {
            setReplacementSlot(null)
            setResolvingAbsences(false)
            setResolveQueue([])
          }}
          language={language}
        />
      )}
      </div>
      <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeDragPerson && (
          <div className="w-[300px] opacity-90 shadow-2xl scale-105 transform -rotate-1 pointer-events-none">
            <DraggablePerson p={activeDragPerson} shiftCount={getTotalAssignmentCount(activeDragPerson.id, assignments)} isOverlay={true} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
