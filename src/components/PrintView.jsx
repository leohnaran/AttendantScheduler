import React, { useMemo } from 'react'
import { t } from '../i18n/translations'
import { getAssignId, getLastName } from '../utils/helpers'

export default function PrintView({
  personnel,
  assignments,
  positions,
  shifts,
  language,
}) {
  const assignmentLookup = useMemo(() => {
    const lookup = {}

    // Group all assignments by person ID
    Object.keys(assignments).forEach((key) => {
      const pId = getAssignId(assignments[key])
      if (!pId) return

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
      const pos = positions.find((x) => x.id === posId)
      const shift = shifts.find((s) => s.id === shiftId)

      if (pos) {
        const shiftLabel = shift
            ? shift.label
            : language === 'en'
            ? 'Full Day'
            : t('grid_all_day', language);

        // Find any positions that MIRROR this one
        const mirrors = positions.filter(p => p.mirrorOf === pos.id).map(m => m.name);
        const fullPosName = [pos.name, ...mirrors].join(' + ');

        if (!lookup[pId]) {
          lookup[pId] = []
        }

        lookup[pId].push({
          posName: fullPosName,
          time: shiftLabel,
          shiftId: shiftId,
        })
      }
    })

    // Sort assignments for each person by time/shift index
    Object.keys(lookup).forEach(pId => {
      lookup[pId].sort((a, b) => {
        const aIdx = shifts.findIndex((s) => s.id === a.shiftId)
        const bIdx = shifts.findIndex((s) => s.id === b.shiftId)
        return aIdx - bIdx
      })
    })

    return lookup
  }, [assignments, positions, shifts, language])

  const getBrotherAssignments = (p) => {
    return assignmentLookup[p.id] || []
  }

  const brothersWithAssignments = useMemo(() => {
    const filtered = personnel.filter(
      (p) => getBrotherAssignments(p).length > 0,
    )
    filtered.sort((a, b) =>
      getLastName(a.name).localeCompare(getLastName(b.name)),
    )
    return filtered
  }, [personnel, assignmentLookup])

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm print:shadow-none print:border-none print:bg-white">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-white">
          {t('nav_slips', language)}
        </h2>
        <button
          onClick={() => window.print()}
          className="bg-gray-800 text-white px-6 py-2 rounded-full hover:bg-gray-900 font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-2 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <i className="fa fa-print"></i> {t('btn_print', language)}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid print:grid-cols-2 print:gap-4">
        {brothersWithAssignments.map((p) => (
          <div
            key={p.id}
            className="border-2 border-gray-800 rounded-xl p-4 mb-4 break-inside-avoid print:mb-2 print:p-3 print:border-black dark:border-slate-500"
          >
            <h3 className="font-bold text-lg border-b-2 border-gray-800 pb-1 mb-2 text-center uppercase dark:text-white dark:border-black">
              {p.name}
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-100 dark:bg-slate-700 dark:text-white">
                  <th className="p-1.5 text-left w-1/2">
                    {t('grid_position', language)}
                  </th>
                  <th className="p-1.5 text-right w-1/2">
                    {t('stats_time', language)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getBrotherAssignments(p).map((a, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-200 dark:border-slate-600"
                  >
                    <td className="p-1.5 dark:text-gray-200">
                      <div className="font-bold">{a.posName}</div>
                      {positions.find(x => x.name === a.posName)?.timeNote && (
                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">
                            🕒 {positions.find(x => x.name === a.posName).timeNote}
                        </div>
                      )}
                    </td>
                    <td className="p-1.5 text-right dark:text-gray-200">
                      {a.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-center text-[10px] text-gray-500 italic dark:text-gray-400 print:text-black">
              Please arrive at your post 5 minutes early.
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
