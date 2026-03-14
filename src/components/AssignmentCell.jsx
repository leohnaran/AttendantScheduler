import React, { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { t } from '../i18n/translations'
import {
  getHeatColor,
  getHeatBg,
  checkQualification,
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

  const { isOver, setNodeRef } = useDroppable({
    id: assignmentKey,
  })

  // 0. NEW: Shift Validation (Position-level)
  const isShiftValid = !pos.validShifts || pos.validShifts.length === 0 || pos.validShifts.includes(shiftId) || shiftId === 'all';

  if (!isShiftValid) {
    return (
        <td className="p-3 bg-gray-100/50 dark:bg-slate-800/50 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-not-allowed">
          N/A
        </td>
      )
  }

  // Check if THIS cell is being hovered or if its source/mirror is being hovered
  const isTargetedByHover = hoveredMirrorKey === assignmentKey

  if (isMirror) {
    const mirrorKey = `${sourcePosId}_${shiftId}`
    const mirrorVal = assignments[mirrorKey]
    const mirrorId = mirrorVal ? (typeof mirrorVal === 'object' ? parseInt(mirrorVal.id) : parseInt(mirrorVal)) : null
    const mirrorPerson = personnel.find((p) => p.id === mirrorId)
    return (
      <td
        onMouseEnter={() => setHoveredMirrorKey(mirrorKey)}
        onMouseLeave={() => setHoveredMirrorKey(null)}
        className={`p-3 mirrored-cell text-xs border-l border-dashed border-gray-200 transition-all ${
          isTargetedByHover || hoveredMirrorKey === mirrorKey ? 'mirror-highlight' : ''
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
  const assignedId = assignmentVal ? (typeof assignmentVal === 'object' ? parseInt(assignmentVal.id) : parseInt(assignmentVal)) : null
  const isAuto = assignmentVal ? assignmentVal.isAuto === true : false
  const conflictData = getConflict(assignedId, pos, shiftId, assignments)
  const conflictMsg = conflictData ? conflictData.msg : null
  const isWarning = conflictData ? conflictData.type === 'warning' : false
  const assignedPerson = personnel.find((p) => p.id === assignedId)

  const handleMouseEnter = () => {
    // Set the hovered key to THIS key so that all mirrors can react to it
    setHoveredMirrorKey(assignmentKey);
  }

  const filteredCandidates = useMemo(() => {
    // Performance Optimization: Create map for O(1) lookups during array processing
    const areasMap = new Map(areas.map((a) => [a.id, a]))

    // Determine effective restriction (Inheritance: Pos > Legacy > Area)
    const area = areasMap.get(pos.areaId)
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
      const { qualified, reason } = checkQualification(p, pos, shiftId, areasMap, tags, personnel)
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
  }, [personnel, pos, shiftId, areas, tags, assignedId, assignedPerson])

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
      ref={setNodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHoveredMirrorKey(null)}
      className={`p-3 border-l border-dashed border-gray-200 dark:border-slate-700 transition-all duration-300 relative group-hover:bg-opacity-50 schedule-drop-zone print:border-none print:p-1 ${
        isOver ? 'drag-over ring-2 ring-blue-400 ring-inset bg-blue-50/30 dark:bg-blue-900/30' : ''
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
