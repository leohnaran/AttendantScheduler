import React, { useState, useMemo } from 'react'
import { t } from '../i18n/translations'
import { getAssignId } from '../utils/helpers'

export default function DepartmentView({
  personnel,
  assignments,
  areas,
  positions,
  shifts,
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

  const selectedKM = personnel.find((p) => p.id === parseInt(selectedKeyManId))

  // --- LOGIC: MY DIRECT TEAM ---
  const myTeam = useMemo(() => {
    if (!selectedKeyManId) return []
    return personnel
      .filter((p) => p.keyManId === parseInt(selectedKeyManId))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [personnel, selectedKeyManId])

  // --- LOGIC: MY AREAS OF OVERSIGHT ---
  // Find where the Key Man is actually assigned
  const myOversightAreas = useMemo(() => {
    if (!selectedKeyManId) return []
    const oversight = []

    // 1. Check All-Day (Auditorium) Assignments
    positions
      .filter((pos) => pos.type === 'auditorium')
      .forEach((pos) => {
        if (getAssignId(assignments[pos.id]) === parseInt(selectedKeyManId)) {
          const area = areas.find((a) => a.id === pos.areaId)
          oversight.push({
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
          if (
            getAssignId(assignments[`${pos.id}_${s.id}`]) ===
            parseInt(selectedKeyManId)
          ) {
            const area = areas.find((a) => a.id === pos.areaId)
            oversight.push({
              type: 'rotational',
              area,
              shiftId: s.id,
              shiftLabel: s.label,
              posName: pos.name,
            })
          }
        })
      })

    return oversight
  }, [selectedKeyManId, assignments, positions, areas, shifts])

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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* HEADER & SELECTOR */}
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
            onClick={() => window.print()}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-full hover:bg-black font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <i className="fa fa-print"></i> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LEFT COLUMN: DIRECT TEAM */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-gray-400">
                My Direct Team ({myTeam.length})
              </h3>
              <i className="fa fa-users text-gray-300"></i>
            </div>

            {myTeam.length === 0 ? (
              <div className="py-8 text-center text-gray-400 italic text-sm">
                No brothers report to you in the roster.
              </div>
            ) : (
              <div className="space-y-3">
                {myTeam.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm"
                  >
                    <div className="font-bold text-gray-800 dark:text-white mb-2 border-b border-gray-50 dark:border-slate-700 pb-1 flex justify-between items-center">
                      <span>{member.name}</span>
                      <span className="text-[9px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-500 uppercase">{member.role}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {shifts.map((s) => {
                        // Find assignment for this shift
                        let assignment = 'Off Duty'
                        let colorClass = 'text-gray-300 dark:text-gray-600'

                        // 1. Check for rotational assignments
                        const rotKey = Object.keys(assignments).find(key => {
                            return key.endsWith(`_${s.id}`) && getAssignId(assignments[key]) === member.id;
                        });

                        if (rotKey) {
                          const posId = rotKey.substring(0, rotKey.lastIndexOf(`_${s.id}`));
                          const foundPos = positions.find((p) => p.id === posId);
                          assignment = foundPos ? foundPos.name : 'Assigned'
                          colorClass = 'text-blue-600 dark:text-blue-400 font-bold'
                        } else {
                          // 2. Check auditorium (all day)
                          const audKey = positions
                            .filter((pos) => pos.type === 'auditorium')
                            .find((pos) => getAssignId(assignments[pos.id]) === member.id)
                          
                          if (audKey) {
                            assignment = 'Auditorium'
                            colorClass = 'text-purple-600 dark:text-purple-400 font-bold'
                          }
                        }

                        return (
                          <div key={s.id} className="text-[10px] flex flex-col">
                            <span className="text-gray-400 uppercase font-black text-[7px] leading-tight">{s.label}</span>
                            <span className={`truncate ${colorClass}`} title={assignment}>{assignment}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AREAS OF OVERSIGHT */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-gray-400">
                My Areas of Oversight
              </h3>
              <i className="fa fa-shield-halved text-gray-300"></i>
            </div>

            {myOversightAreas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                <i className="fa fa-calendar-xmark text-4xl mb-4 opacity-20"></i>
                <p className="text-sm italic">
                  You are not currently assigned to any Key Man positions in the schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {myOversightAreas.map((oversight, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-100 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm"
                  >
                    <div
                      style={oversight.area?.style}
                      className="p-4 flex justify-between items-center text-white"
                    >
                      <div>
                        <h4 className="font-black uppercase tracking-widest text-sm">
                          {oversight.area?.name} Oversight
                        </h4>
                        <p className="text-[10px] opacity-80 uppercase font-bold">
                          {oversight.shiftId === 'all'
                            ? 'Full Assembly Day'
                            : `Shift: ${oversight.shiftLabel}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] opacity-80 uppercase font-bold block">My Position</span>
                        <span className="font-black">{oversight.posName}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-50 dark:border-slate-700">
                            <th className="pb-2 text-left">Position</th>
                            <th className="pb-2 text-left">Assigned Brother</th>
                            <th className="pb-2 text-right">Reporting To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                          {positions
                            .filter((p) => p.areaId === oversight.area?.id)
                            .filter((p) => p.type === oversight.type)
                            .map((pos) => {
                              // Handle Dynamic Mirrors
                              const isMirror = !!pos.mirrorOf
                              const sourcePosId = pos.mirrorOf

                              const assignmentKey = isMirror
                                ? `${sourcePosId}_${oversight.shiftId}`
                                : (oversight.type === 'auditorium'
                                    ? pos.id
                                    : `${pos.id}_${oversight.shiftId}`)

                              const pid = getAssignId(assignments[assignmentKey])
                              const assignedPerson = personnel.find(
                                (x) => x.id === pid,
                              )
                              const itsMe = pid === parseInt(selectedKeyManId)

                              return (
                                <tr
                                  key={pos.id}
                                  className={`group ${itsMe ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                >
                                  <td className="py-3 font-bold text-gray-600 dark:text-gray-400">
                                    <div>{pos.name}</div>
                                    {pos.timeNote && (
                                        <div className="text-[9px] text-blue-500 font-black uppercase tracking-wider">
                                            🕒 {pos.timeNote}
                                        </div>
                                    )}
                                  </td>
                                  <td className="py-3">
                                    {assignedPerson ? (
                                      <div className="flex items-center gap-2">
                                        {isMirror && <i className="fa fa-link text-[10px] text-orange-500" title="Mirrored Assignment"></i>}
                                        <span className={`font-bold ${itsMe ? 'text-blue-600 dark:text-blue-400' : (isMirror ? 'text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-white')}`}>
                                          {assignedPerson.name}
                                        </span>
                                        {itsMe && <span className="text-[8px] bg-blue-600 text-white px-1 rounded font-black uppercase">YOU</span>}
                                      </div>
                                    ) : (
                                      <span className="text-red-400 font-bold italic text-xs flex items-center gap-1">
                                        <i className="fa fa-triangle-exclamation text-[10px]"></i> VACANT
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 text-right text-xs text-gray-500">
                                    {assignedPerson
                                      ? personnel.find(
                                          (km) => km.id === assignedPerson.keyManId,
                                        )?.name || 'Unassigned'
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
