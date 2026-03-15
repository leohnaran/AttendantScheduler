import React, { useState, useEffect, useMemo, useRef } from 'react'
import { t } from '../i18n/translations'
import { getAssignId, getHeatColor, getHeatBg } from '../utils/helpers'
import { Person, Position, Assignment } from '../types/models'

interface SearchableSelectProps {
  value: string | number;
  onChange: (val: string | number) => void;
  options: (Person & { qualified?: boolean; reason?: string })[];
  placeholder?: string;
  conflictMsg?: string | null;
  isWarning?: boolean;
  isAuto?: boolean;
  getConflict: (personId: number | null, pos: Position, shiftId: string, assignments: Record<string, Assignment | null>) => { type: string; msg: string } | null;
  pos: Position;
  shiftId: string;
  assignments: Record<string, Assignment | null>;
  language: string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  conflictMsg,
  isWarning,
  isAuto,
  getConflict,
  pos,
  shiftId,
  assignments,
  language,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = useMemo(() => {
    const id = typeof value === 'string' ? parseInt(value) : value
    return isNaN(id) ? null : options.find((o) => o.id === id)
  }, [options, value])

  const filteredOptions = useMemo(() => {
    const s = search.toLowerCase()
    // Pre-calculate shift counts for sorting
    const list = options.map((o) => {
      let count = 0
      Object.keys(assignments).forEach((key) => {
        if (getAssignId(assignments[key]) === o.id && key.includes('_')) count++
      })
      return { ...o, shiftCount: count }
    })

    return list
      .filter((o) => o.name.toLowerCase().includes(s))
      .sort((a, b) => {
        // 1. Qualified first
        if (a.qualified && !b.qualified) return -1
        if (!a.qualified && b.qualified) return 1
        // 2. Least busy first
        if (a.shiftCount !== b.shiftCount) return a.shiftCount - b.shiftCount
        // 3. Alphabetical
        return a.name.localeCompare(b.name)
      })
  }, [options, search, assignments])

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`w-full py-1.5 px-2 pr-6 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-between print:border-none print:bg-transparent print:p-0 print:pr-0 print:shadow-none
                            ${
                              conflictMsg
                                ? isWarning
                                  ? 'bg-white border border-yellow-300 text-yellow-800 shadow-sm shadow-yellow-100 dark:bg-slate-800 dark:border-yellow-600 dark:text-yellow-300'
                                  : 'bg-white border border-red-300 text-red-700 shadow-sm shadow-red-100 dark:bg-slate-800 dark:border-red-600 dark:text-red-300'
                                : 'bg-white/50 border border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm focus-within:bg-white focus-within:border-blue-300 text-gray-700 dark:bg-slate-700/50 dark:text-gray-200 dark:hover:bg-slate-600 dark:focus-within:bg-slate-600 dark:border-transparent'
                            }
                            ${
                              !value
                                ? 'text-gray-400 dark:text-gray-500 font-normal'
                                : 'font-medium'
                            }
                        `}
        onClick={() => {
          const nextState = !isOpen
          setIsOpen(nextState)
          if (nextState) setTimeout(() => inputRef.current?.focus(), 50)
        }}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.name : placeholder || 'Select...'}
        </span>
        <i
          className={`fa fa-chevron-down text-gray-400 text-[10px] transition-transform duration-200 print:hidden ${
            isOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-64 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <div className="relative">
              <i className="fa fa-search absolute left-2.5 top-2.5 text-gray-400 text-xs"></i>
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Search name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                    setSearch('')
                  }
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    onChange(filteredOptions[0].id)
                    setIsOpen(false)
                    setSearch('')
                  }
                }}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <div
              className="p-2.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-2 border-b border-gray-50 dark:border-slate-700"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setIsOpen(false)
                setSearch('')
              }}
            >
              <i className="fa fa-times-circle text-gray-300"></i>{' '}
              {t('grid_clear_assignment', language)}
            </div>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs text-gray-400 text-center italic">
                No matches found
              </div>
            ) : (
              filteredOptions.map((p) => {
                const cData = getConflict(p.id, pos, shiftId, assignments)
                const isWarn = cData && cData.type === 'warning'
                const isTeamMatch =
                  pos.teamKeyManId && p.keyManId === pos.teamKeyManId
                const id = typeof value === 'string' ? parseInt(value) : value
                const isSelected = !isNaN(id) && id === p.id

                return (
                  <div
                    key={p.id}
                    className={`p-2.5 text-xs cursor-pointer flex flex-col transition-colors border-l-2
                                                    ${
                                                      isSelected
                                                        ? 'bg-blue-50 border-blue-600 dark:bg-blue-900/20'
                                                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                                    }
                                                    ${
                                                      !p.qualified
                                                        ? 'opacity-60'
                                                        : ''
                                                    }
                                                `}
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(p.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${getHeatColor(
                            p.shiftCount,
                          )}`}
                        ></div>
                        <span
                          className={`truncate ${
                            isSelected
                              ? 'font-bold text-blue-700 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-200'
                          } ${!p.qualified ? 'italic' : ''}`}
                        >
                          {p.name}
                        </span>
                      </div>
                      <div className="flex gap-1 items-center flex-shrink-0">
                        <span
                          className={`text-[9px] font-black px-1 rounded ${getHeatBg(
                            p.shiftCount,
                          )}`}
                        >
                          {p.shiftCount}
                        </span>
                        {isTeamMatch && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-bold dark:bg-blue-900 dark:text-blue-300">
                            Team
                          </span>
                        )}
                        {cData && (
                          <span
                            title={cData.msg}
                            className={isWarn ? 'text-yellow-500' : 'text-red-500'}
                          >
                            {isWarn ? '⚠️' : '⛔'}
                          </span>
                        )}
                      </div>
                    </div>
                    {!p.qualified && p.reason && (
                      <div className="text-[9px] text-gray-400 uppercase font-bold mt-0.5 ml-4">
                        {p.reason}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
