import React from 'react'
import { t } from '../i18n/translations'
import { getAssignId, getLastName } from '../utils/helpers'

export default function PrintView({
  personnel,
  assignments,
  positions,
  shifts,
  language,
}) {
  const getBrotherAssignments = (p) => {
    const myAssignments = []
    Object.keys(assignments).forEach((key) => {
      if (getAssignId(assignments[key]) === p.id) {
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
          myAssignments.push({
            posName: pos.name,
            time: shift
              ? shift.label
              : language === 'en'
              ? 'Full Day'
              : t('grid_all_day', language),
            shiftId: shiftId,
          })
        }
      }
    })
    // Sort by time/shift index
    myAssignments.sort((a, b) => {
      const aIdx = shifts.findIndex((s) => s.id === a.shiftId)
      const bIdx = shifts.findIndex((s) => s.id === b.shiftId)
      return aIdx - bIdx
    })
    return myAssignments
  }

  const brothersWithAssignments = personnel.filter(
    (p) => getBrotherAssignments(p).length > 0,
  )
  brothersWithAssignments.sort((a, b) =>
    getLastName(a.name).localeCompare(getLastName(b.name)),
  )

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
      <div className="grid grid-cols-2 gap-4 print:block print:gap-0">
        {brothersWithAssignments.map((p) => (
          <div
            key={p.id}
            className="border-2 border-gray-800 rounded p-4 mb-4 break-inside-avoid print:mb-6 print:border-black dark:border-slate-500"
          >
            <h3 className="font-bold text-xl border-b-2 border-gray-800 pb-2 mb-2 text-center uppercase dark:text-white dark:border-slate-500">
              {p.name}
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200 print:bg-gray-300 dark:bg-slate-700 dark:text-white">
                  <th className="p-2 text-left w-1/2">
                    {t('grid_position', language)}
                  </th>
                  <th className="p-2 text-right w-1/2">
                    {t('stats_time', language)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getBrotherAssignments(p).map((a, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-400 dark:border-slate-600"
                  >
                    <td className="p-2 font-bold dark:text-gray-200">
                      {a.posName}
                    </td>
                    <td className="p-2 text-right dark:text-gray-200">
                      {a.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-center text-xs text-gray-500 italic dark:text-gray-400">
              Please arrive at your post 5 minutes early.
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
