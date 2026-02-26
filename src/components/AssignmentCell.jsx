import React, { useState, useMemo } from 'react'
import { t } from '../i18n/translations'
import {
  getAssignId,
  getHeatColor,
  getHeatBg,
  isAutoAssigned,
} from '../utils/helpers'
import SearchableSelect from './SearchableSelect'

export default function AssignmentCell({
  shiftId,
  pos,
  assignments,
  personnel,
  onAssign,
  onFindReplacement,
  getConflict,
  areas,
  tags,
  hoveredMirrorKey,
  setHoveredMirrorKey,
  language,
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  if (pos.validShifts && !pos.validShifts.includes(shiftId) && shiftId !== 'all')
    return (
      <td className="p-3 bg-gray-50/50 border-l border-dashed border-gray-200 dark:bg-slate-800/50 dark:border-slate-700 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-not-allowed">
        N/A
      </td>
    )

  const isMirror = !!pos.mirrorOf
  const sourcePosId = pos.mirrorOf
  const assignmentKey =
    pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`

  // Check if THIS cell is being hovered by its mirror counterpart
  const isTargetedByHover = hoveredMirrorKey === assignmentKey

  if (isMirror) {
    const mirrorKey = `${sourcePosId}_${shiftId}`
    const mirrorId = getAssignId(assignments[mirrorKey])
    const mirrorPerson = personnel.find((p) => p.id === mirrorId)
    return (
      <td
        onMouseEnter={() => setHoveredMirrorKey(mirrorKey)}
        onMouseLeave={() => setHoveredMirrorKey(null)}
        className={`p-3 mirrored-cell text-xs border-l border-dashed border-gray-200 transition-all ${
          isTargetedByHover ? 'mirror-highlight' : ''
        }`}
      >
        {mirrorPerson ? (
          <span className="flex items-center gap-1 text-orange-700 font-bold">
            <i className="fa fa-link text-[10px]"></i> {mirrorPerson.name}
          </span>
        ) : (
          <span className="text-gray-400 italic">-- Linked --</span>
        )}
      </td>
    )
  }

  const assignmentVal = assignments[assignmentKey]
  const assignedId = getAssignId(assignmentVal)
  const isAuto = isAutoAssigned(assignmentVal)
  const conflictData = getConflict(assignedId, pos, shiftId, assignments)
  const conflictMsg = conflictData ? conflictData.msg : null
  const isWarning = conflictData ? conflictData.type === 'warning' : false
  const assignedPerson = personnel.find((p) => p.id === assignedId)

  // Handle hover for source cells (highlight their mirrors)
  const handleMouseEnter = () => {
    // Dynamically find any positions that mirror THIS one
    const mirrorPositions = positions.filter(p => p.mirrorOf === pos.id);
    if (mirrorPositions.length > 0) {
        // For simplicity in highlight logic, we pick the first mirror to highlight
        setHoveredMirrorKey(`${mirrorPositions[0].id}_${shiftId}`);
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const personId = e.dataTransfer.getData('personId')
    if (personId) {
      onAssign(assignmentKey, personId)
    }
  }

  const getFilteredCandidates = () => {
    const area = areas.find((a) => a.id === pos.areaId)
    const requiredCap = area ? area.capability : ''

    // Determine effective restriction (Inheritance: Pos > Legacy > Area)
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
      let qualified = true
      let reason = null

      // --- LEVEL 1: POSITION/AREA LEVEL CONSTRAINTS (Most Restrictive) ---
      if (limitType && limitValue) {
        if (limitType === 'keyman') {
          if (p.keyManId !== parseInt(limitValue)) {
            qualified = false
            const km = personnel.find((x) => x.id === parseInt(limitValue))
            reason = `Restricted to Team: ${km ? km.name : limitValue}`
          }
        } else if (limitType === 'congregation') {
          if (p.congregation !== limitValue) {
            qualified = false
            reason = `Restricted to Congregation: ${limitValue}`
          }
        } else if (limitType === 'tag') {
          if (!p.tags || !p.tags.includes(limitValue)) {
            qualified = false
            const tObj = tags.find((x) => x.id === limitValue)
            reason = `Restricted to Tag: ${tObj ? tObj.name : limitValue}`
          }
        } else if (limitType === 'role') {
          if (p.role !== limitValue) {
            qualified = false
            reason = `Restricted to Role: ${limitValue}`
          }
        }
      }

      // --- LEVEL 2: TAG RESTRICTIONS (Person's own tags) ---
      if (qualified && tags && p.tags) {
        for (let tid of p.tags) {
          const tag = tags.find((t) => t.id === tid)
          if (tag) {
            if (tag.restrictedAreas && tag.restrictedAreas.includes(pos.areaId)) {
              qualified = false
              reason = `Restricted by your Tag: ${tag.name} (Area)`
              break
            }
            if (tag.restrictedShifts) {
              if (tag.restrictedShifts.includes(shiftId)) {
                qualified = false
                reason = `Restricted by your Tag: ${tag.name} (Shift)`
                break
              }
              if (shiftId === 'all' && tag.restrictedShifts.includes('all_day')) {
                qualified = false
                reason = `Restricted by your Tag: ${tag.name} (All Day)`
                break
              }
            }
          }
        }
      }

      // --- LEVEL 3: ROSTER SETTINGS (Missing Caps) ---
      if (qualified) {
        if (!p.caps || !p.caps.includes(requiredCap)) {
          qualified = false
          reason = `Missing Capability: ${area ? area.name : 'Unknown'}`
        } else if (pos.keyMan && (!p.caps || !p.caps.includes('keyman'))) {
          qualified = false
          reason = `Not a Key Man`
        }
      }

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
      // Ensure current assignment is in list even if logic changes
      return [assignedPerson, ...candidates]
    }
    return candidates
  }

  const filteredCandidates = getFilteredCandidates()

  const quickFixes = useMemo(() => {
    if (!conflictMsg) return []
    // Top 3 qualified candidates with ZERO conflicts
    return filteredCandidates
      .filter((p) => p.qualified && !getConflict(p.id, pos, shiftId, assignments))
      .slice(0, 3)
  }, [
    conflictMsg,
    filteredCandidates,
    getConflict,
    pos,
    shiftId,
    assignments,
  ])

  return (
    <td
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHoveredMirrorKey(null)}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`p-3 border-l border-dashed border-gray-200 dark:border-slate-700 transition-all duration-300 relative group-hover:bg-opacity-50 schedule-drop-zone print:border-none print:p-1 ${
        isDragOver ? 'drag-over' : ''
      } ${isTargetedByHover ? 'mirror-highlight' : ''} ${
        conflictMsg
          ? isWarning
            ? 'bg-yellow-50/80 dark:bg-yellow-900/40 print:bg-transparent'
            : 'bg-red-50/80 dark:bg-red-900/40 print:bg-transparent'
          : isAuto
          ? 'bg-green-50/30 dark:bg-green-900/20 print:bg-transparent'
          : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {isAuto && (
          <i
            className="fa fa-robot text-green-600 dark:text-green-400 text-[10px] print:hidden"
            title="Auto-Assigned"
          ></i>
        )}
        <div className="relative w-full">
          <SearchableSelect
            value={assignedId || ''}
            onChange={(val) => onAssign(assignmentKey, val)}
            options={filteredCandidates}
            placeholder={t('grid_unassigned', language)}
            conflictMsg={conflictMsg}
            isWarning={isWarning}
            isAuto={isAuto}
            getConflict={getConflict}
            pos={pos}
            shiftId={shiftId}
            assignments={assignments}
            language={language}
          />
        </div>
        <button
          onClick={() => onFindReplacement(pos, shiftId)}
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors print:hidden"
          title="Find Replacement"
        >
          <i className="fa fa-search text-xs"></i>
        </button>
      </div>
      {conflictMsg && (
        <div className="mt-1.5 space-y-1.5 print:hidden">
          <div
            className={`text-[10px] font-bold flex items-center gap-1 ${
              isWarning ? 'text-yellow-600' : 'text-red-500'
            }`}
          >
            <i className={`fa ${isWarning ? 'fa-exclamation-triangle' : 'fa-ban'}`}></i>{' '}
            {conflictMsg}
          </div>
          {quickFixes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[8px] font-black uppercase text-gray-400 w-full mb-0.5">
                {t('grid_suggestions', language)}:
              </span>
              {quickFixes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onAssign(assignmentKey, p.id)}
                  className="text-[9px] bg-white border border-gray-200 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 px-1.5 py-0.5 rounded shadow-sm transition-all active:scale-95"
                  title={`Quick Assign ${p.name}`}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </td>
  )
}
