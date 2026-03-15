import React, { useState, useMemo, useEffect, useRef } from 'react'
import * as htmlToImage from 'html-to-image'
import toast from 'react-hot-toast'
import { exportToExcel } from '../utils/excelExport'
import { t } from '../i18n/translations'
import { useConfirm } from '../hooks/useConfirm'
import {
  getAssignId,
  parseAssignmentKey,
} from '../utils/helpers'
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import { useAppStore } from '../store/useAppStore'
import PersonnelSidebar, { DraggablePerson } from './PersonnelSidebar'
import MobileScheduleView from './MobileScheduleView'
import AssignmentCell from './AssignmentCell'
import FindReplacementModal from './FindReplacementModal'
import { executeAutoFill } from '../utils/schedulerEngine'
import { Person, Assignment, Area, Position, LogEntry } from '../types/models'

interface ScheduleViewProps {
  language: string;
}

export default function ScheduleView({ language }: ScheduleViewProps) {
  const confirm = useConfirm()
  const personnel = useAppStore((state) => state.personnel)
  const assignments = useAppStore((state) => state.assignments)
  const areas = useAppStore((state) => state.areas)
  const positions = useAppStore((state) => state.positions)
  const shifts = useAppStore((state) => state.shifts)
  const rules = useAppStore((state) => state.rules)
  const tags = useAppStore((state) => state.tags)
  const updateState = useAppStore((state) => state.updateState)

  const setAssignments = (val: any) => updateState({ assignments: typeof val === 'function' ? val(assignments) : val })
  const onAutoFill = (newAssigns: Record<string, Assignment | null>, newLog: LogEntry[]) => updateState({ assignments: newAssigns, log: newLog })
  const areasMap = useMemo(() => new Map<string, Area>(areas.map(a => [a.id, a])), [areas]);
  const personnelMap = useMemo(() => new Map<number, Person>(personnel.map(p => [p.id, p])), [personnel]);

  const [layoutMode, setLayoutMode] = useState<'grid' | 'mobile'>('grid')
  const [pendingAction, setPendingAction] = useState<{
    personId: number;
    personName: string;
    targetKey: string;
    conflictMsg: string;
    targetShiftId: string;
    conflictSourceKeys: string[];
  } | null>(null)
  const [replacementSlot, setReplacementSlot] = useState<{
    posId: string;
    shiftId: string;
    posName: string;
    currentPersonId: number | null;
  } | null>(null)
  const [hoveredMirrorKey, setHoveredMirrorKey] = useState<string | null>(null)
  const [activeDragPersonId, setActiveDragPersonId] = useState<number | null>(null)

  const [resolvingAbsences, setResolvingAbsences] = useState(false)
  const [resolveQueue, setResolveQueue] = useState<{ pos: Position; shiftId: string }[]>([])

  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const printMenuRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setShowActionMenu(false)
      }
      if (printMenuRef.current && !printMenuRef.current.contains(target)) {
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

      const dataUrl = await htmlToImage.toPng(scrollEl as HTMLElement, {
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

  const handleFindReplacement = (pos: Position, shiftId: string) => {
    const key = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`
    setReplacementSlot({ 
      posId: pos.id, 
      shiftId, 
      posName: pos.name,
      currentPersonId: getAssignId(assignments[key])
    })
  }

  const handleReplacementAssign = async (posId: string, shiftId: string, personId: number, isDominoSwap = false, dominoData: { posId?: string, shiftId?: string, currentPersonId?: number } | null = null) => {
    let newAssignments = { ...assignments }
    const pos = positions.find((p) => p.id === posId)
    if (!pos) return

    const assignmentKey = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`
    if (isDominoSwap && dominoData) {
      // 1. Assign Brother B to the new target slot
      newAssignments[assignmentKey] = { id: personId, isAuto: false }

      // 2. Clear Brother B's old slot (the one that triggered the Domino swap)
      const actualDominoKey = dominoData.posId && dominoData.shiftId ? 
        (positions.find(p => p.id === dominoData.posId)?.type === 'auditorium' ? dominoData.posId : `${dominoData.posId}_${dominoData.shiftId}`)
        : null;
      
      if (actualDominoKey) {
        newAssignments[actualDominoKey] = null
      }

      toast.success(`${personnelMap.get(personId)?.name} swapped with ${personnelMap.get(dominoData.currentPersonId)?.name}`)
    } else {
      const conflictingPos = getConflict(personId, pos, shiftId, assignments)
      if (conflictingPos) {
        if (!await confirm(`${personnelMap.get(personId)?.name} is already assigned to a concurrent shift. Double book?`)) {
          return
        }
      }
      newAssignments[assignmentKey] = { id: personId, isAuto: false }
    }

    setAssignments(newAssignments)

    if (resolvingAbsences && resolveQueue.length > 0) {
      const remainingQueue = resolveQueue.filter((slot: { pos: Position, shiftId: string }) => {
        // Remove the slot we just filled
        return !(slot.pos.id === posId && slot.shiftId === shiftId)
      })

      if (remainingQueue.length > 0) {
        setResolveQueue(remainingQueue)
        const next = remainingQueue[0]
        const nextKey = next.pos.type === 'auditorium' ? next.pos.id : `${next.pos.id}_${next.shiftId}`
        setReplacementSlot({
          posId: next.pos.id,
          shiftId: next.shiftId,
          posName: next.pos.name,
          currentPersonId: getAssignId(assignments[nextKey])
        })
      } else {
        setResolvingAbsences(false)
        setResolveQueue([])
        setReplacementSlot(null)
      }
    } else {
      setReplacementSlot(null)
    }
  }

  const handleManualAssign = (posId: string, shiftId: string, personId: number | null) => {
    const pos = positions.find((p) => p.id === posId)
    if (!pos) return

    const key = pos.type === 'auditorium' ? pos.id : `${pos.id}_${shiftId}`
    const assignObj = personId ? { id: personId, isAuto: false } : null

    if (personId === null) {
      setAssignments((prev: Record<string, Assignment | null>) => ({ ...prev, [key]: null }))
      return
    }

    const conflicts = getAllConflicts(personId, pos, shiftId, assignments)
    if (conflicts && conflicts.length > 0) {
      setPendingAction({
        targetKey: key as string,
        personId: personId,
        conflictMsg: conflicts.map((c: { type: string, msg: string }) => c.msg).join('\n'),
        conflictSourceKeys: conflicts.map((c: { type: string, msg: string, key?: string }) => c.key).filter((k): k is string => !!k),
        personName: personnelMap.get(personId)?.name || 'Unknown',
        targetShiftId: shiftId,
      })
    } else {
      setAssignments((prev: Record<string, Assignment | null>) => ({ ...prev, [key]: assignObj }))
    }
  }

  // ALIAS for JSX consistency
  const handleAssignAttempt = (key: string, personId: string) => {
    const { posId, shiftId } = parseAssignmentKey(key, shifts)
    handleManualAssign(posId, shiftId, personId ? parseInt(personId) : null)
  }

  const confirmConflict = () => {
    if (pendingAction) {
      setAssignments((prev: Record<string, Assignment | null>) => ({
        ...prev,
        [pendingAction.targetKey]: { id: pendingAction.personId, isAuto: false },
      }))
      setPendingAction(null)
    }
  }

  const resolveAndAssign = () => {
    if (!pendingAction) return
    const { targetKey, personId, conflictSourceKeys } = pendingAction

    setAssignments((prev: Record<string, Assignment | null>) => {
      const next = { ...prev }
      conflictSourceKeys.forEach(key => {
        next[key] = null
      })
      next[targetKey] = { id: personId, isAuto: false }
      return next
    })
    setPendingAction(null)
    toast.success(`${pendingAction.personName} assigned. Conflicts resolved.`)
  }




  // Collect ALL conflicts for a person being assigned to a position.
  const getAllConflicts = (personId: number, pos: Position, shiftId: string, currentAssignments: Record<string, Assignment | null>) => {
    if (!personId) return []
    const person = personnelMap.get(personId)
    if (!person) return []

    const conflicts: { type: string; msg: string; key?: string }[] = []

    // 1. Double Booking
    const activeAssignments = Object.keys(currentAssignments).filter(
      (key) => getAssignId(currentAssignments[key]) === personId,
    )

    for (let aid of activeAssignments) {
      const { posId: existingPosId, shiftId: existingShiftId } = parseAssignmentKey(aid, shifts)
      if (existingPosId === pos.id && existingShiftId === shiftId) continue

      const overlap = shiftId === 'all' || existingShiftId === 'all' || shiftId === existingShiftId

      if (overlap) {
        const otherPos = positions.find((p) => p.id === existingPosId)
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
              conflicts.push({
                type: 'error',
                msg: `Section ${targetAudPos.section} already has a brother relieved in this shift.`,
                key: 'relief_section_limit',
              })
              continue
            }
          }

          // Respect Max Relief % per shift
          const allAudPositions = positions.filter((p) => p.type === 'auditorium')
          const totalAudCount = allAudPositions.length
          const maxReliefPct = rules.auditoriumCoverage || 25
          const maxReliefCount = Math.max(1, Math.floor(totalAudCount * (maxReliefPct / 100)))

          const otherReliefCount = allAudPositions.filter((ap) => {
            const apPid = getAssignId(currentAssignments[ap.id])
            if (!apPid || apPid === personId) return false

            return Object.keys(currentAssignments).some((k) => {
              if (!k.endsWith(`_${targetRotShiftId}`)) return false
              return getAssignId(currentAssignments[k]) === apPid
            })
          }).length

          if (otherReliefCount >= maxReliefCount) {
            conflicts.push({
              type: 'error',
              msg: `Max relief limit reached (${maxReliefPct}%).`,
              key: 'relief_total_limit',
            })
            continue
          }

          // If we passed both checks, this overlap is ALLOWED
          continue
        }

        conflicts.push({
          type: rules.doubleBookingSeverity || 'error',
          msg: `Double booked with ${otherPos ? otherPos.name : existingPosId}`,
          key: aid,
        })
      }
    }

    // 2. Unavailability
    if (person.unavailable) {
      const isUnavailable = shiftId === 'all' ? person.unavailable.includes('all_day') : person.unavailable.includes(shiftId)
      if (isUnavailable) {
        conflicts.push({
          type: rules.unavailableSeverity || 'error',
          msg: 'Marked Unavailable',
        })
      }
    }

    // 3. Tag Restrictions
    if (tags && person.tags) {
      for (let tid of person.tags) {
        const tag = tags.find((t) => t.id === tid)
        if (tag) {
          if (tag.restrictedAreas && tag.restrictedAreas.includes(pos.areaId)) {
            conflicts.push({ type: 'error', msg: `Restricted Area: ${tag.name}` })
          }
          if (tag.restrictedShifts) {
            const isRestrictedShift = tag.restrictedShifts.includes(shiftId) || (shiftId === 'all' && tag.restrictedShifts.includes('all_day'))
            if (isRestrictedShift) {
              conflicts.push({ type: 'error', msg: `Restricted Shift: ${tag.name}` })
            }
          }
        }
      }
    }

    // 4. Capabilities
    const area = areasMap.get(pos.areaId)
    const requiredCap = (area && area.capability) || ''
    const bypassCap = rules.auditoriumRotationMode && pos.type === 'rotational' && person.caps && person.caps.includes('auditorium')

    if (!bypassCap && (!person.caps || !person.caps.includes(requiredCap))) {
      conflicts.push({ type: rules.capabilitySeverity || 'error', msg: 'Missing Capability' })
    }
    if (pos.keyMan && (!person.caps || !person.caps.includes('keyman'))) {
      conflicts.push({ type: rules.capabilitySeverity || 'error', msg: 'Not a Key Man' })
    }

    return conflicts.filter(c => c.type === 'error')
  }

  const getConflict = (personId: number, pos: Position, shiftId: string, currentAssignments: Record<string, Assignment | null>) => {
    const list = getAllConflicts(personId, pos, shiftId, currentAssignments)
    return list.length > 0 ? list[0] : null
  }

  const getTotalAssignmentCount = (personId: number, currentAssignments: Record<string, Assignment | null>) => {
    return Object.keys(currentAssignments).filter(
      (key) => getAssignId(currentAssignments[key]) === personId,
    ).length
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


      onAutoFill(newAssignments, newLog)
      toast.success(t('toast_autofill_success', language) || `Auto-fill complete. ${filledCount} slots filled.`,
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
      if (cleanedAssignments[key] && (cleanedAssignments[key] as Assignment).isAuto) {
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
      const pid = getAssignId(val as number | Assignment)
      if (!pid) return

      const { posId, shiftId } = parseAssignmentKey(key, shifts)
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
    let empty: { pos: Position, shiftId: string }[] = []
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
    const personId = active.data.current?.personId as number | undefined;
    if (personId) {
      setActiveDragPersonId(personId);
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragPersonId(null)

    if (!over) return

    const personId = active.data.current?.personId as number
    const targetKey = over.id as string // format: posId_shiftId
    const { posId, shiftId } = parseAssignmentKey(targetKey, shifts)

    handleManualAssign(posId, shiftId, personId);
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
                  const first = orphanedSlots[0]
                  const key = first.pos.type === 'auditorium' ? first.pos.id : `${first.pos.id}_${first.shiftId}`
                  setReplacementSlot({
                    posId: first.pos.id,
                    shiftId: first.shiftId,
                    posName: first.pos.name,
                    currentPersonId: getAssignId(assignments[key])
                  })
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
