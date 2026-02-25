import React, { useState, useMemo, useCallback } from 'react'
import { t } from '../i18n/translations'
import { getAssignId, getHeatBg, getHeatColor } from '../utils/helpers'

export default function PersonnelSidebar({
  personnel,
  shifts,
  assignments,
  positions,
  language,
}) {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')

  const getShiftCount = useCallback(
    (pid) => {
      let count = 0
      Object.keys(assignments).forEach((key) => {
        if (getAssignId(assignments[key]) === pid) {
          if (key.includes('_')) count++
        }
      })
      return count
    },
    [assignments],
  )

  const filteredPersonnel = useMemo(() => {
    let list = personnel.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    )
    if (filterRole !== 'all') {
      list = list.filter((p) => p.role === filterRole)
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [personnel, search, filterRole])

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full border-r border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 backdrop-blur-sm sticky left-0 z-30">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
          <i className="fa fa-users"></i> {t('sidebar_volunteers', language)}
        </h3>
        <div className="relative mb-2">
          <i className="fa fa-search absolute left-2.5 top-2.5 text-gray-400 text-xs"></i>
          <input
            type="text"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder={t('search_placeholder', language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="w-full p-1.5 text-[10px] font-black uppercase border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none"
        >
          <option value="all">{t('all_roles', language) || 'All Roles'}</option>
          <option value="Elder">{t('role_elder', language)}</option>
          <option value="MS">{t('role_ms', language)}</option>
          <option value="Exemplary">{t('role_exemplary', language)}</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filteredPersonnel.map((p) => {
          const shiftCount = getShiftCount(p.id)
          return (
            <div
              key={p.id}
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.setData('personId', p.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              className="p-2.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-500 transition-all group"
            >
              <div className="flex justify-between items-start gap-1">
                <div className="truncate flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getHeatColor(
                      shiftCount,
                    )}`}
                  ></div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors truncate">
                      {p.name}
                    </div>
                    <div className="text-[9px] text-gray-400 uppercase font-bold">
                      {p.role}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${getHeatBg(
                    shiftCount,
                  )}`}
                >
                  {shiftCount}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
