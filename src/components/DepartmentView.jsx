import React, { useState, useMemo } from 'react'
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

  const selectedKM = personnel.find((p) => p.id === parseInt(selectedKeyManId))

  // --- LOGIC: MY DIRECT TEAM ---
  const myTeam = useMemo(() => {
    if (!selectedKeyManId) return []
    const kmId = parseInt(selectedKeyManId)
    return personnel
      .filter((p) => p.keyManId === kmId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [personnel, selectedKeyManId])

  // --- LOGIC: MY AREAS OF OVERSIGHT ---
  const myOversightAreas = useMemo(() => {
    if (!selectedKeyManId) return []
    const oversight = []
    const kmId = parseInt(selectedKeyManId)

    // 1. Check All-Day (Auditorium) Assignments
    positions
      .filter((pos) => pos.type === 'auditorium')
      .forEach((pos) => {
        if (getAssignId(assignments[pos.id]) === kmId) {
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
          if (getAssignId(assignments[`${pos.id}_${s.id}`]) === kmId) {
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 print:pb-0 print:space-y-4">
      {/* HEADER & SELECTOR */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:p-0 print:border-none print:shadow-none print:mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 print:hidden">
            <i className="fa fa-clipboard-user text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-2xl print:mb-1">
              {selectedKM?.name} - Key Man Report
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider print:text-sm print:text-black">
              Assigned oversight for {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto print:hidden">
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
            className="bg-gray-900 text-white px-6 py-2.5 rounded-full hover:bg-black font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <i className="fa fa-print"></i> Print
          </button>
        </div>
      </div>

      <div className="space-y-6 print:space-y-4">
        {/* TEAM ASSIGNMENTS TABLE (DENSE) */}
        <div className="glass-panel p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 print:p-0 print:border-none print:shadow-none">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-gray-400 mb-4 print:text-sm print:text-black print:mb-2 border-b border-gray-100 pb-2">
            My Direct Team Assignments ({myTeam.length})
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
                    <tr key={member.id} className="text-xs print:text-[11px]">
                      <td className="py-2 pr-4 font-bold text-gray-900 dark:text-white print:text-black">
                        {member.name}
                        <div className="text-[9px] text-gray-400 font-normal uppercase print:hidden">{member.role}</div>
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
            </div>
          )}
        </div>

        {/* AREAS OF OVERSIGHT (DENSE) */}
        <div className="glass-panel p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 print:p-0 print:border-none print:shadow-none">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-gray-400 mb-4 print:text-sm print:text-black print:mb-2 border-b border-gray-100 pb-2">
            My Areas of Oversight
          </h3>

          {myOversightAreas.length === 0 ? (
            <div className="py-10 text-center text-gray-400 italic text-sm">
              No oversight positions assigned.
            </div>
          ) : (
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
                            const itsMe = pid === parseInt(selectedKeyManId)

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
                                    ? personnel.find(km => km.id === assignedPerson.keyManId)?.name || 'None'
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
  )
}
