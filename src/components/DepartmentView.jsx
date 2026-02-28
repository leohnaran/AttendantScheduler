import React, { useState, useMemo, useEffect } from 'react'
import { t } from '../i18n/translations'
import { getAssignId } from '../utils/helpers'

export default function DepartmentView({
  personnel = [],
  assignments = {},
  areas = [],
  positions = [],
  shifts = [],
  language,
}) {
  const keyMen = useMemo(() => {
    return personnel
      .filter((p) => p.caps && p.caps.includes('keyman'))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [personnel])

  const [selectedKeyManId, setSelectedKeyManId] = useState(
    keyMen.length > 0 ? keyMen[0].id : '',
  )
  const [isPrintAllMode, setIsPrintAllMode] = useState(false)

  // Listen for afterprint event to reset the mode
  useEffect(() => {
    const handleAfterPrint = () => setIsPrintAllMode(false)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  const handlePrintRequest = () => {
    if (confirm('Would you like to print EVERY Key Man Report? \n\nSelect "OK" for All, or "Cancel" for just the currently selected one.')) {
        setIsPrintAllMode(true)
        // Give React a moment to render all reports before opening the print dialog
        setTimeout(() => {
            window.print()
        }, 500)
    } else {
        setIsPrintAllMode(false)
        window.print()
    }
  }

  const renderSingleReport = (kmId) => {
    const km = personnel.find(p => p.id === parseInt(kmId))
    if (!km) return null

    // --- LOGIC: MY DIRECT TEAM ---
    // Include the Key Man himself in the direct team list as requested
    const myTeam = personnel
      .filter((p) => p.keyManId === parseInt(kmId) || p.id === km.id)
      .sort((a, b) => a.name.localeCompare(b.name))

    // --- LOGIC: MY AREAS OF OVERSIGHT ---
    const myOversightAreas = []
    
    // 1. Check All-Day (Auditorium) Assignments
    positions
      .filter((pos) => pos.type === 'auditorium')
      .forEach((pos) => {
        if (getAssignId(assignments[pos.id]) === km.id) {
          const area = areas.find((a) => a.id === pos.areaId)
          myOversightAreas.push({
            type: 'auditorium',
            area,
            shiftId: 'all',
            posName: pos.name,
          })
        }
      })

    // 2. Check Rotational Assignments
    positions
      .filter((pos) => pos.type === 'rotational')
      .forEach((pos) => {
        shifts.forEach((s) => {
          if (getAssignId(assignments[`${pos.id}_${s.id}`]) === km.id) {
            const area = areas.find((a) => a.id === pos.areaId)
            myOversightAreas.push({
              type: 'rotational',
              area,
              shiftId: s.id,
              shiftLabel: s.label,
              posName: pos.name,
            })
          }
        })
      })

    // Helper to find time notes for anyone on a page
    const getTimeNotesForTeam = (team) => {
      const notes = []
      team.forEach(member => {
        // Check all shifts for this member
        shifts.forEach(s => {
          // Check rotational
          const rotKey = Object.keys(assignments).find(key => 
            key.endsWith(`_${s.id}`) && getAssignId(assignments[key]) === member.id
          )
          if (rotKey) {
            const posId = rotKey.split('_').slice(0, -1).join('_')
            const pos = positions.find(p => p.id === posId)
            if (pos?.timeNote) {
              notes.push({ label: pos.name, note: pos.timeNote })
            }
            // Check if this position is mirrored from something that has a timeNote
            if (pos?.mirrorOf) {
              const sourcePos = positions.find(p => p.id === pos.mirrorOf)
              if (sourcePos?.timeNote) {
                notes.push({ label: sourcePos.name, note: sourcePos.timeNote })
              }
            }
            // Also check if any position mirrors THIS one and has a timeNote (unlikely but safe)
            positions.filter(p => p.mirrorOf === pos?.id).forEach(m => {
              if (m.timeNote) notes.push({ label: m.name, note: m.timeNote })
            })
          }

          // Check auditorium (all day)
          const audPos = positions.find(p => p.type === 'auditorium' && getAssignId(assignments[p.id]) === member.id)
          if (audPos?.timeNote) {
            notes.push({ label: audPos.name, note: audPos.timeNote })
          }
          if (audPos?.mirrorOf) {
            const sourcePos = positions.find(p => p.id === audPos.mirrorOf)
            if (sourcePos?.timeNote) {
              notes.push({ label: sourcePos.name, note: sourcePos.timeNote })
            }
          }
        })
      })
      
      // Deduplicate by label+note
      return Array.from(new Set(notes.map(n => JSON.stringify(n)))).map(s => JSON.parse(s))
    }

    const getTimeNotesForOversight = (oversightList) => {
        const notes = []
        oversightList.forEach(ov => {
            const areaPos = positions.filter(p => p.areaId === ov.area?.id)
            areaPos.forEach(pos => {
                if (pos.timeNote) {
                    notes.push({ label: pos.name, note: pos.timeNote })
                }
                if (pos.mirrorOf) {
                    const sourcePos = positions.find(p => p.id === pos.mirrorOf)
                    if (sourcePos?.timeNote) {
                        notes.push({ label: sourcePos.name, note: sourcePos.timeNote })
                    }
                }
            })
        })
        return Array.from(new Set(notes.map(n => JSON.stringify(n)))).map(s => JSON.parse(s))
    }

    const teamNotes = getTimeNotesForTeam(myTeam)
    const oversightNotes = getTimeNotesForOversight(myOversightAreas)

    return (
      <div key={km.id} className="space-y-6 print:pt-4 print:break-after-page">
        {/* HEADER */}
        <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:p-0 print:border-none print:shadow-none print:mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 print:hidden">
              <i className="fa fa-clipboard-user text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-2xl print:mb-1">
                {km.name} - Key Man Report
              </h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider print:text-sm print:text-black">
                Assigned oversight for {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 print:space-y-4">
          {/* TEAM ASSIGNMENTS TABLE */}
          <div className="glass-panel p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 print:p-0 print:border-none print:shadow-none print:break-after-page">
            <h3 className="font-black uppercase tracking-widest text-[10px] text-gray-400 mb-4 print:text-sm print:text-black print:mb-2 border-b border-gray-100 pb-2">
              {km.name.split(' ')[0]}'s Direct Team Assignments ({myTeam.length})
            </h3>

            {myTeam.length === 0 ? (
              <div className="py-8 text-center text-gray-400 italic text-sm">
                No brothers report to you.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-200 dark:border-slate-700 print:text-[10px] print:text-black">
                      <th className="py-2 pr-4">Brother</th>
                      {shifts.map(s => (
                          <th key={s.id} className="py-2 px-2 text-center">{s.label.split('(')[0]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 print:divide-black">
                    {myTeam.map(member => (
                      <tr key={member.id} className={`text-xs print:text-[11px] ${member.id === km.id ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                        <td className="py-2 pr-4 font-bold text-gray-900 dark:text-white print:text-black">
                          {member.name} {member.id === km.id && '(YOU)'}
                        </td>
                        {shifts.map(s => {
                          let assignment = '-'
                          let colorClass = 'text-gray-300 print:text-gray-400'

                          const rotKey = Object.keys(assignments).find(key => {
                              return key.endsWith(`_${s.id}`) && getAssignId(assignments[key]) === member.id;
                          });

                          if (rotKey) {
                            const parts = rotKey.split('_');
                            const posId = parts.slice(0, parts.length - 1).join('_');
                            const foundPos = positions.find((p) => p.id === posId);
                            
                            if (foundPos) {
                                const mirrors = positions.filter(p => p.mirrorOf === foundPos.id).map(m => m.name);
                                assignment = [foundPos.name, ...mirrors].join(' + ');
                            } else {
                                assignment = 'Assigned';
                            }
                            colorClass = 'text-blue-600 font-bold print:text-black'
                          } else {
                            const audKey = positions
                              .filter((pos) => pos.type === 'auditorium')
                              .find((pos) => getAssignId(assignments[pos.id]) === member.id)
                            
                            if (audKey) {
                              const mirrors = positions.filter(p => p.mirrorOf === audKey.id).map(m => m.name);
                              assignment = [audKey.name, ...mirrors].join(' + ');
                              colorClass = 'text-purple-600 font-bold print:text-black'
                            }
                          }

                          return (
                            <td key={s.id} className={`py-2 px-2 text-center ${colorClass}`}>
                              {assignment}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* TIME NOTES FOR TEAM */}
                {teamNotes.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-800 print:border-black">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 print:text-black">Team Schedule Notes:</h4>
                        <div className="space-y-1">
                            {teamNotes.map((tn, i) => (
                                <div key={i} className="text-[10px] print:text-[11px] font-medium text-gray-600 print:text-black">
                                    <span className="font-bold">{tn.label}:</span> 🕒 {tn.note}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>

          {/* AREAS OF OVERSIGHT - Only render if there are areas */}
          {myOversightAreas.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 print:p-0 print:border-none print:shadow-none print:break-before-page">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-gray-400 mb-4 print:text-sm print:text-black print:mb-2 border-b border-gray-100 pb-2">
                {km.name.split(' ')[0]}'s Areas of Oversight
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
                    {myOversightAreas.map((oversight, idx) => (
                    <div
                        key={idx}
                        className="border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm break-inside-avoid print:border-black print:rounded-none"
                    >
                        <div className="bg-gray-100 dark:bg-slate-800 p-3 flex justify-between items-center print:bg-gray-200 print:border-b print:border-black">
                        <div>
                            <h4 className="font-black uppercase tracking-widest text-[10px] print:text-xs">
                            {oversight.area?.name} Oversight
                            </h4>
                            <p className="text-[9px] opacity-60 uppercase font-bold print:text-[10px] print:text-black">
                            {oversight.shiftId === 'all'
                                ? 'Full Day'
                                : `Shift: ${oversight.shiftLabel}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-[8px] opacity-60 uppercase font-black block">My Post</span>
                            <span className="font-black text-xs">{oversight.posName}</span>
                        </div>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-900">
                        <table className="w-full text-[10px] print:text-[11px]">
                            <thead>
                            <tr className="text-[8px] uppercase text-gray-400 border-b border-gray-50 print:text-black print:border-black">
                                <th className="pb-1 text-left">Post</th>
                                <th className="pb-1 text-left">Brother</th>
                                <th className="pb-1 text-right">Oversight</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {positions
                                .filter((p) => p.areaId === oversight.area?.id)
                                .filter((p) => p.type === oversight.type)
                                .map((pos) => {
                                const isMirror = !!pos.mirrorOf
                                const sourcePosId = pos.mirrorOf

                                let assignmentKey = (oversight.type === 'auditorium'
                                    ? pos.id
                                    : `${pos.id}_${oversight.shiftId}`)

                                if (isMirror) {
                                    const sourcePos = positions.find(x => x.id === sourcePosId)
                                    assignmentKey = (sourcePos && sourcePos.type === 'auditorium')
                                        ? sourcePosId
                                        : `${sourcePosId}_${oversight.shiftId}`
                                }

                                const pid = getAssignId(assignments[assignmentKey])
                                const assignedPerson = personnel.find((x) => x.id === pid)
                                const itsMe = pid === km.id

                                return (
                                    <tr key={pos.id} className={itsMe ? 'bg-blue-50/50' : ''}>
                                    <td className="py-1.5 font-bold text-gray-600 print:text-black">
                                        {pos.name}
                                    </td>
                                    <td className="py-1.5 font-bold">
                                        {assignedPerson ? (
                                        <span className={itsMe ? 'text-blue-600' : 'print:text-black'}>
                                            {assignedPerson.name} {itsMe && '(YOU)'}
                                        </span>
                                        ) : (
                                        <span className="text-red-500 italic">VACANT</span>
                                        )}
                                    </td>
                                    <td className="py-1.5 text-right text-gray-400 print:text-black">
                                        {assignedPerson
                                        ? personnel.find(kman => kman.id === assignedPerson.keyManId)?.name || 'None'
                                        : '-'}
                                    </td>
                                    </tr>
                                )
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                    ))}
                </div>

                {/* TIME NOTES FOR OVERSIGHT */}
                {oversightNotes.length > 0 && (
                    <div className="mt-6 pt-2 border-t border-gray-100 dark:border-slate-800 print:border-black">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 print:text-black">Area Schedule Notes:</h4>
                        <div className="space-y-1">
                            {oversightNotes.map((tn, i) => (
                                <div key={i} className="text-[10px] print:text-[11px] font-medium text-gray-600 print:text-black">
                                    <span className="font-bold">{tn.label}:</span> 🕒 {tn.note}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (keyMen.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-3xl">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 dark:bg-slate-800">
          <i className="fa fa-user-tie text-gray-400"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Key Men Found</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Please flag some brothers as "Key Man" in the Roster tab to enable this report.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER & SELECTOR (Web UI) */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-700">
            <i className="fa fa-clipboard-user text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Key Man Report
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Personnel Oversight Dashboard
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={selectedKeyManId}
            onChange={(e) => setSelectedKeyManId(e.target.value)}
            className="flex-1 md:w-64 border border-gray-200 p-2.5 rounded-xl bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            {keyMen.map((km) => (
              <option key={km.id} value={km.id}>
                {km.name}
              </option>
            ))}
          </select>
          <button
            onClick={handlePrintRequest}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-full hover:bg-black font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <i className="fa fa-print"></i> Print
          </button>
        </div>
      </div>

      {/* RENDER LOGIC */}
      <div className="print:block">
        {isPrintAllMode ? (
            // PRINT ALL: Loop through every Key Man
            keyMen.map(km => renderSingleReport(km.id))
        ) : (
            // NORMAL: Render just the selected Key Man
            renderSingleReport(selectedKeyManId)
        )}
      </div>
    </div>
  )
}
