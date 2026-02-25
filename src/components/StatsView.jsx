import React, { useMemo } from 'react'
import { t } from '../i18n/translations'
import { getAssignId } from '../utils/helpers'
import { TOTAL_PROGRAM_MINUTES } from '../utils/constants'

export default function StatsView({
  personnel,
  assignments,
  shifts,
  positions,
  language,
}) {
  const formatMinutesToHHMM = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const pad = (num) => num.toString().padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}`
  }

  const getBrotherStats = () => {
    const stats = personnel.map((p) => {
      let minutesAway = 0
      let assignmentLabels = []

      Object.keys(assignments).forEach((key) => {
        const assignVal = assignments[key]
        const assignedId = getAssignId(assignVal)

        if (assignedId === p.id) {
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
          const pos = positions.find((pos) => pos.id === posId)
          if (pos) {
            const shift = shifts.find((s) => s.id === shiftId)
            if (pos.type !== 'auditorium') {
              if (shift) minutesAway += shift.minutes
            }
            assignmentLabels.push(
              `${pos.name} (${
                shift
                  ? shift.label
                  : language === 'en'
                  ? 'All Day'
                  : t('grid_all_day', language)
              })`,
            )
          }
        }
      })

      const percentage = Math.round(
        (minutesAway / TOTAL_PROGRAM_MINUTES) * 100,
      )
      return { ...p, minutesAway, percentage, assignmentLabels }
    })

    return stats.sort((a, b) => b.minutesAway - a.minutesAway)
  }

  const stats = getBrotherStats()

  const getBarColor = (pct) => {
    if (pct > 50) return 'bg-red-500'
    if (pct > 25) return 'bg-yellow-500'
    if (pct === 0) return 'bg-blue-400'
    return 'bg-green-500'
  }

  const getRoleColor = (role) => {
    if (role === 'Elder') return 'text-yellow-600 font-bold'
    if (role === 'MS') return 'text-blue-600 font-bold'
    return 'text-gray-500'
  }

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 tracking-tight dark:text-white">
        {t('stats_title', language)} (Balance Check)
      </h2>
      <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400">
              <th className="p-4">{t('stats_name', language)}</th>
              <th className="p-4">Role</th>
              <th className="p-4">{t('stats_assignments', language)}</th>
              <th className="p-4">
                {t('out_of_auditorium_time', language) ||
                  'Out-of-Auditorium Time'}
              </th>
              <th className="p-4">{t('stats_missed', language)}</th>
              <th className="p-4 w-1/3">{t('stats_load', language)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
            {stats.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-gray-50/50 transition-colors dark:hover:bg-slate-800/50"
              >
                <td className="p-4 font-medium text-gray-700 dark:text-gray-200">
                  {p.name}
                </td>
                <td className={`p-4 ${getRoleColor(p.role)}`}>{p.role}</td>
                <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                  {p.assignmentLabels.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1">
                      {p.assignmentLabels.map((lbl, idx) => (
                        <li key={idx}>{lbl}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-300 italic dark:text-gray-600">
                      -
                    </span>
                  )}
                </td>
                <td
                  className={`p-4 ${
                    p.minutesAway === 0
                      ? 'text-blue-600 font-bold dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {formatMinutesToHHMM(p.minutesAway)}
                </td>
                <td
                  className={`p-4 ${
                    p.percentage > 50
                      ? 'text-red-500 font-bold dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {p.percentage}%
                </td>
                <td className="p-4">
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${getBarColor(
                        p.percentage,
                      )} transition-all duration-500`}
                      style={{ width: `${Math.max(p.percentage, 5)}%` }}
                    ></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
