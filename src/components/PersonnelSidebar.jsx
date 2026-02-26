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
  const [filterCong, setFilterCong] = useState('all')
  const [filterKM, setFilterKM] = useState('all')

  const congregations = useMemo(() => {
    return [...new Set(personnel.map(p => p.congregation).filter(c => c))].sort()
  }, [personnel])

  const keyMen = useMemo(() => {
    return personnel.filter(p => p.caps && p.caps.includes('keyman')).sort((a,b) => a.name.localeCompare(b.name))
  }, [personnel])

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
    if (filterCong !== 'all') {
        list = list.filter((p) => p.congregation === filterCong)
    }
    if (filterKM !== 'all') {
        const kmId = parseInt(filterKM)
        list = list.filter((p) => p.keyManId === kmId || p.id === kmId)
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [personnel, search, filterRole, filterCong, filterKM])

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full border-r border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 backdrop-blur-sm sticky left-0 z-30">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-2">
          <i className="fa fa-users"></i> {t('sidebar_volunteers', language)}
        </h3>
        
        {/* Search */}
        <div className="relative">
          <i className="fa fa-search absolute left-2.5 top-2.5 text-gray-400 text-xs"></i>
          <input
            type="text"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            placeholder={t('search_placeholder', language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 gap-1.5">
            <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full p-1.5 text-[9px] font-black uppercase border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none shadow-sm"
            >
                <option value="all">Roles (All)</option>
                <option value="Elder">{t('role_elder', language)}</option>
                <option value="MS">{t('role_ms', language)}</option>
                <option value="Exemplary">{t('role_exemplary', language)}</option>
            </select>

            <select
                value={filterCong}
                onChange={(e) => setFilterCong(e.target.value)}
                className="w-full p-1.5 text-[9px] font-black uppercase border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none shadow-sm"
            >
                <option value="all">Congregation (All)</option>
                {congregations.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
                value={filterKM}
                onChange={(e) => setFilterKM(e.target.value)}
                className="w-full p-1.5 text-[9px] font-black uppercase border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none shadow-sm"
            >
                <option value="all">Oversight (All)</option>
                {keyMen.map(km => <option key={km.id} value={km.id}>Team: {km.name}</option>)}
            </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-gray-50/50 dark:bg-slate-900/20">
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
                <div className="truncate flex items-center gap-2 flex-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getHeatColor(
                      shiftCount,
                    )}`}
                  ></div>
                  <div className="truncate w-full">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors truncate">
                      {p.name}
                    </div>
                    <div className="flex justify-between items-center w-full">
                        <span 
                            title={p.role === 'MS' ? 'Ministerial Servant' : p.role}
                            className="text-[8px] text-gray-400 uppercase font-black tracking-tighter">
                            {p.role}
                        </span>
                        {p.congregation && (
                            <span className="text-[8px] text-blue-500 dark:text-blue-400 font-bold truncate max-w-[80px]">
                                {p.congregation}
                            </span>
                        )}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${getHeatBg(
                    shiftCount,
                  )}`}
                  title={`${shiftCount} shifts assigned`}
                >
                  {shiftCount}
                </div>
              </div>
            </div>
          )
        })}
        {filteredPersonnel.length === 0 && (
            <div className="text-center py-10 text-gray-400 italic text-xs">
                No brothers match filters.
            </div>
        )}
      </div>
    </div>
  )
}
