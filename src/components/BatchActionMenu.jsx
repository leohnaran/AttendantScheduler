import React, { useState, useEffect, useRef } from 'react'

export default function BatchActionMenu({ onAutoFill, onClear, label, icon }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block ml-2" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors text-inherit opacity-50 hover:opacity-100"
        title="Batch Actions"
      >
        <i className={`fa ${icon || 'fa-ellipsis-v'} text-[10px]`}></i>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
            <div className="text-[10px] font-black uppercase text-gray-400">
              {label} Actions
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false)
              onAutoFill()
            }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 flex items-center gap-2"
          >
            <i className="fa fa-robot text-blue-500"></i> Auto-Fill Empty
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              onClear()
            }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <i className="fa fa-trash-can"></i> Clear All
          </button>
        </div>
      )}
    </div>
  )
}
