import React, { useState } from 'react'
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
  const [selectedAreaId, setSelectedAreaId] = useState(
    areas.length > 0 ? areas[0].id : '',
  )

  const area = areas.find((a) => a.id === selectedAreaId)
  const areaPositions = positions.filter((p) => p.areaId === selectedAreaId)

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm print:shadow-none print:border-none print:p-0">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-white">
            {t('dept_report_title', language) || 'Department Report'}
          </h2>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="border border-gray-300 p-2 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="bg-gray-800 text-white px-5 py-2 rounded-full hover:bg-gray-900 font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-2 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <i className="fa fa-print"></i> {t('nav_slips', language)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm print:border-black dark:bg-slate-800 dark:border-slate-700">
        <div
          style={area ? area.style : {}}
          className="p-4 text-center font-black uppercase tracking-widest text-sm border-b print:border-black"
        >
          {area ? area.name : 'Unknown Area'}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 font-bold uppercase text-[10px] text-gray-400 print:bg-white print:border-black dark:bg-slate-900/50 dark:border-slate-700">
                <th className="p-3 text-left w-48 border-r border-gray-100 print:border-black dark:border-slate-700">
                  {t('grid_position', language)}
                </th>
                {shifts.map((s) => (
                  <th
                    key={s.id}
                    className="p-3 text-center border-r border-gray-100 last:border-r-0 print:border-black dark:border-slate-700"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-black dark:divide-slate-700">
              {areaPositions.map((pos) => (
                <tr key={pos.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-bold text-gray-700 border-r border-gray-100 print:border-black dark:text-gray-200 dark:border-slate-700">
                    {pos.name}
                    {pos.type === 'auditorium' && (
                      <div className="text-[10px] uppercase text-blue-400 font-bold mt-1 tracking-wider print:text-gray-500 dark:text-blue-500">
                        {t('grid_all_day', language)}
                      </div>
                    )}
                  </td>
                  {pos.type === 'auditorium' ? (
                    <td
                      colSpan={shifts.length}
                      className="p-3 text-center font-medium bg-blue-50/20 dark:bg-blue-900/10"
                    >
                      {(() => {
                        const pid = getAssignId(assignments[pos.id])
                        return personnel.find((p) => p.id === pid)?.name || '-'
                      })()}
                    </td>
                  ) : (
                    shifts.map((shift) => {
                      const pid = getAssignId(assignments[`${pos.id}_${shift.id}`])
                      const p = personnel.find((x) => x.id === pid)
                      return (
                        <td
                          key={shift.id}
                          className="p-3 text-center border-r border-gray-100 last:border-r-0 print:border-black dark:border-slate-700"
                        >
                          {p ? (
                            <span className="font-medium text-gray-900 dark:text-white">
                              {p.name}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">-</span>
                          )}
                        </td>
                      )
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
