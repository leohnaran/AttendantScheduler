import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import * as htmlToImage from 'html-to-image'
import { t } from '../i18n/translations'
import {
  getAssignId,
  getCandidatesForPosition,
  isAutoAssigned,
} from '../utils/helpers'
import PersonnelSidebar from './PersonnelSidebar'
import MobileScheduleView from './MobileScheduleView'
import BatchActionMenu from './BatchActionMenu'
import AssignmentCell from './AssignmentCell'
import FindReplacementModal from './FindReplacementModal'

export default function ScheduleView({
  personnel,
  assignments,
  setAssignments,
  onAutoFill,
  areas,
  positions,
  shifts,
  rules,
  tags,
  language,
}) {
  const [layoutMode, setLayoutMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [replacementSlot, setReplacementSlot] = useState(null)
  const [hoveredMirrorKey, setHoveredMirrorKey] = useState(null)

  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  const actionMenuRef = useRef(null)
  const printMenuRef = useRef(null)
  const gridRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
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
      alert('PNG Export failed. Try standard Print instead.');
    }
  }

  const handleFindReplacement = (pos, shiftId) => {
    setReplacementSlot({ pos, shiftId })
  }

  const handleReplacementAssign = (pos, shiftId, personId) => {
    const assignmentKey =
      pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`
    handleAssignAttempt(assignmentKey, personId)
    setReplacementSlot(null)
  }

  const handleAssignAttempt = (key, personId) => {
    const value = personId || null
    const pid = parseInt(personId)
    const assignObj = value ? { id: parseInt(value), isAuto: false } : null

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

    const pos = positions.find((p) => p.id === posId)
    if (!pos) {
      setAssignments((prev) => ({ ...prev, [key]: assignObj }))
      return
    }

    const conflict = getConflict(value, pos, shiftId, assignments)
    if (conflict && conflict.type === 'error') {
      setPendingAction({
        targetKey: key,
        targetValue: assignObj,
        conflictMsg: conflict.msg,
        conflictSourceKey: conflict.key,
        personName: personnel.find((p) => p.id === parseInt(value))?.name,
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
    if (pendingAction && pendingAction.conflictSourceKey) {
      setAssignments((prev) => ({
        ...prev,
        [pendingAction.conflictSourceKey]: null,
        [pendingAction.targetKey]: pendingAction.targetValue,
      }))
      setPendingAction(null)
    }
  }

  const getRotationalShiftCount = (pid, currentAssignments) => {
    let count = 0
    Object.keys(currentAssignments).forEach((key) => {
      if (getAssignId(currentAssignments[key]) === pid) {
        let posId = key
        if (key.includes('_')) {
          const parts = key.split('_')
          // Check if the last part is a valid shift ID
          if (shifts.some(s => s.id === parts[parts.length - 1])) {
            posId = parts.slice(0, parts.length - 1).join('_')
          }
        }
        
        const pos = positions.find((p) => p.id === posId)
        if (pos && pos.type !== 'auditorium') {
          count++
        }
      }
    })
    return count
  }

  const getWorkPercentage = (pid, currentAssignments) => {
    let minutesWorking = 0
    Object.keys(currentAssignments).forEach((key) => {
      if (getAssignId(currentAssignments[key]) === pid) {
        // ONLY count rotational assignments (with underscore) towards work load/time away
        if (key.includes('_')) {
          const parts = key.split('_')
          const shiftId = parts[parts.length - 1]
          const shift = shifts.find((s) => s.id === shiftId)
          if (shift) minutesWorking += shift.minutes || 150
        }
      }
    })
    return Math.round((minutesWorking / 600) * 100)
  }

  const isOverWorkLimit = (pid, currentAssignments) => {
    const limit = rules.maxWorkPercent || 50
    const pct = getWorkPercentage(pid, currentAssignments)
    return pct >= limit
  }

  const getReliefUsedCount = (shiftId, currentAssignments) => {
    let count = 0
    positions
      .filter((p) => p.type === 'rotational' && !p.isMirror)
      .forEach((pos) => {
        const key = `${pos.id}_${shiftId}`
        const pid = getAssignId(currentAssignments[key])
        const person = personnel.find((p) => p.id === pid)
        if (person && person.caps && person.caps.includes('auditorium')) count++
      })
    return count
  }

  const getConflict = (personId, pos, shiftId, currentAssignments) => {
    if (!personId) return null
    const pid = parseInt(personId)
    const person = personnel.find((p) => p.id === pid)
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
    if (person.unavailable && person.unavailable.includes(shiftId)) {
      return {
        type: rules.unavailableSeverity || 'error',
        msg: 'Marked Unavailable',
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
    const area = areas.find((a) => a.id === pos.areaId)
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

  const workedPreviousShift = (pid, shiftId, currentAssignments) => {
    if (rules.avoidConsecutive === false) return false
    const sIdx = shifts.findIndex((s) => s.id === shiftId)
    if (sIdx <= 0) return false
    const prevShift = shifts[sIdx - 1]
    return Object.keys(currentAssignments).some((key) => {
      return (
        key.endsWith(`_${prevShift.id}`) &&
        getAssignId(currentAssignments[key]) === pid
      )
    })
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
    const newAssignments = { ...assignments }
    const newLog = []
    const totalPersonnel = personnel.length
    let filledCount = 0

    // HELPER: Calculate dynamic workload score
    const getWorkloadScore = (pid, currentAssignments, targetPosIsRegular) => {
      let score = 0
      let hasKeymanJob = false

      Object.keys(currentAssignments).forEach((key) => {
        if (getAssignId(currentAssignments[key]) === pid) {
          // Identify position type from key
          let posId = key
          if (key.includes('_')) {
            const parts = key.split('_')
            // Check if last part is a shift ID
            if (shifts.some(s => s.id === parts[parts.length - 1])) {
                posId = parts.slice(0, parts.length - 1).join('_')
            }
          }
          const pos = positions.find((p) => p.id === posId)
          if (pos) {
            if (pos.type === 'auditorium') score += 0.1
            else score += 1.0

            if (pos.keyMan) hasKeymanJob = true
          }
        }
      })

      // If we are filling a regular spot and this brother already has an oversight job
      if (targetPosIsRegular && hasKeymanJob) {
        score += 10.0
      }

      return score
    }

    // HELPER: Get valid candidates based on current state
    const getValidCandidates = (pos, shiftId, currentAssignments) => {
      let candidates = getCandidatesForPosition(pos, personnel, areas, tags)

      // RELIEF MODE expansion
      if (rules.auditoriumRotationMode && pos.type === 'rotational') {
        let audPotential = personnel.filter(
          (p) =>
            p.caps &&
            p.caps.includes('auditorium') &&
            !candidates.some((c) => c.id === p.id),
        )
        
        // RELIEF MODE RESTRICTION: Key Men should ONLY be available for relief duty 
        // if the target position is also a Key Man position.
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
        // 1. Hard Conflict / Capability Check
        const conflict = getConflict(p.id, pos, shiftId, currentAssignments)
        if (conflict && conflict.type === 'error') return false

        // 2. Rules & Load
        if (isOverWorkLimit(p.id, currentAssignments)) return false
        if (workedPreviousShift(p.id, shiftId, currentAssignments)) return false
        if (!isAnchorAvailableForShift(p, shiftId, currentAssignments)) return false

        return true
      })
    }

    // --- PREPARE ALL SLOTS ---
    const allSlots = []
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

    // --- PHASE 1: PROCESS KEYMAN SLOTS ---
    const keymanSlots = allSlots.filter((s) => s.pos.keyMan && !newAssignments[s.key])
    
    // Sort Keyman slots by "Hardness" (Pool Size - static)
    keymanSlots.sort((a, b) => {
        const poolA = getValidCandidates(a.pos, a.shiftId, {}).length
        const poolB = getValidCandidates(b.pos, b.shiftId, {}).length
        return poolA - poolB
    })

    keymanSlots.forEach(slot => {
        const candidates = getValidCandidates(slot.pos, slot.shiftId, newAssignments)
        if (candidates.length === 0) return

        // 1. Pre-shuffle candidates for true randomness among equals
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);

        // 2. Sort candidates by Workload Score (Lowest first)
        shuffled.sort((a, b) => {
            const scoreA = getWorkloadScore(a.id, newAssignments, false)
            const scoreB = getWorkloadScore(b.id, newAssignments, false)
            return scoreA - scoreB
        })

        const chosen = shuffled[0]
        newAssignments[slot.key] = { id: chosen.id, isAuto: true }
        filledCount++
        
        newLog.push({
            type: 'keyman',
            msg: `[KEYMAN] Assigned ${chosen.name} to ${slot.pos.name} (${slot.shiftId}). Final Score: ${getWorkloadScore(chosen.id, newAssignments, false).toFixed(1)}`,
        })
    })

    // --- PHASE 2: PROCESS REGULAR SLOTS ---
    const regularSlots = allSlots.filter((s) => !s.pos.keyMan && !newAssignments[s.key])
    
    // Sort Regular slots by "Hardness"
    regularSlots.sort((a, b) => {
        const poolA = getValidCandidates(a.pos, a.shiftId, {}).length
        const poolB = getValidCandidates(b.pos, b.shiftId, {}).length
        return poolA - poolB
    })

    regularSlots.forEach(slot => {
        const candidates = getValidCandidates(slot.pos, slot.shiftId, newAssignments)
        if (candidates.length === 0) return

        // 1. Pre-shuffle candidates for true randomness among equals
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);

        // 2. Sort candidates by Workload Score (Lowest first, including Keyman Penalty)
        shuffled.sort((a, b) => {
            const scoreA = getWorkloadScore(a.id, newAssignments, true)
            const scoreB = getWorkloadScore(b.id, newAssignments, true)
            return scoreA - scoreB
        })

        const chosen = shuffled[0]
        newAssignments[slot.key] = { id: chosen.id, isAuto: true }
        filledCount++
        
        newLog.push({
            type: 'rotational',
            msg: `[REGULAR] Assigned ${chosen.name} to ${slot.pos.name} (${slot.shiftId}). Final Score: ${getWorkloadScore(chosen.id, newAssignments, true).toFixed(1)}`,
        })
    })

    // --- DIAGNOSTICS FOR EMPTY SLOTS ---
    allSlots.filter(s => !newAssignments[s.key]).forEach(s => {
        newLog.push({
            type: 'error',
            msg: `FAILED TO FILL: ${s.pos.name} (${s.shiftId}). No qualified candidates passed all rules.`,
        })
    })

    const assignedIds = new Set()
    Object.keys(newAssignments).forEach((k) => {
      const id = getAssignId(newAssignments[k])
      if (id) assignedIds.add(id)
    })
    onAutoFill(newAssignments, newLog)
    alert(
      `Weighted Scoring Auto-Fill Complete! (v2.8.0)\n\nUtilization: ${assignedIds.size}/${totalPersonnel} Volunteers (${Math.round((assignedIds.size / totalPersonnel) * 100)}%)\n\nPLEASE CHECK THE LOG TAB FOR THE BREAKDOWN.`,
    )
  }

  const handleClearAll = () => {
    if (confirm('Clear ALL assignments?')) {
      const count = Object.keys(assignments).length
      setAssignments({})
      alert(`Cleared ${count} assignments.`)
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
    alert(`Cleared ${count} auto-assigned slots.`)
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
      let posId = key
      let shiftId = 'all'
      if (key.includes('_')) {
        const parts = key.split('_')
        shiftId = parts[parts.length - 1]
        posId = parts.slice(0, parts.length - 1).join('_')
      }
      const pos = positions.find((p) => p.id === posId)
      if (!pos) return

      const conflict = getConflict(pid, pos, shiftId, newAssignments)
      if (conflict && conflict.type === 'error') {
        newAssignments[key] = null
        unassignedCount++
        fixedCount++
      }
    })

    if (fixedCount > 0) {
      setAssignments(newAssignments)
      alert(
        `Resolved ${fixedCount} conflicts:\n- Reassigned: ${reassignedCount}\n- Unassigned: ${unassignedCount}`,
      )
    } else {
      alert('No conflicts found to fix.')
    }
  }

  const isScheduleEmpty = useMemo(() => {
    return (
      Object.keys(assignments).filter((k) => assignments[k] !== null).length === 0
    )
  }, [assignments])

  return (
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
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layoutMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <i className="fa fa-table-cells mr-2"></i> Grid View
            </button>
            <button
              onClick={() => setLayoutMode('mobile')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layoutMode === 'mobile'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <i className="fa fa-mobile-screen mr-2"></i> Card View
            </button>
          </div>

          <div className="flex gap-3">
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
                              {pos.name}{' '}
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
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed font-medium">
                {pendingAction.conflictMsg}
              </p>
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
          onClose={() => setReplacementSlot(null)}
          language={language}
        />
      )}
    </div>
  )
}
