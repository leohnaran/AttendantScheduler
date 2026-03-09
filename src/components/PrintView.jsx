import React, { useState, useMemo } from 'react'
import { t } from '../i18n/translations'
import { getAssignId, getLastName } from '../utils/helpers'

export default function PrintView({
  personnel,
  assignments,
  positions,
  shifts,
  language,
}) {
  const [displayMode, setDisplayMode] = useState('slips'); // 'slips' or 'table'

  const personnelMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);

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

  const renderVolunteerTableCell = (p, s) => {
    const cellLines = [];
    const audPos = positions.find(pos => pos.type === 'auditorium' && getAssignId(assignments[pos.id]) === p.id);

    if (audPos) {
      const hasOther = Object.keys(assignments).some(k => k.endsWith(`_${s.id}`) && getAssignId(assignments[k]) === p.id);
      cellLines.push(hasOther ? `Primary: ${audPos.name}` : audPos.name);
    }

    const rotAssignments = Object.keys(assignments)
      .filter(k => k.endsWith(`_${s.id}`) && getAssignId(assignments[k]) === p.id)
      .map(k => {
        const posId = k.replace(`_${s.id}`, '');
        return positions.find(pos => pos.id === posId)?.name || 'Unknown';
      });

    if (rotAssignments.length > 0) {
      if (audPos) {
        rotAssignments.forEach(name => cellLines.push(`Additional: ${name} (${s.label})`));
      } else {
        rotAssignments.forEach(name => cellLines.push(`${name} (${s.label})`));
      }
    }

    if (cellLines.length === 0) return <span className="text-gray-300 print:text-gray-200">-</span>;

    return (
      <div className="space-y-0.5">
        {cellLines.map((line, idx) => (
          <div key={idx} className="leading-tight text-[9px] sm:text-[10px] font-medium text-gray-700 dark:text-gray-300 print:text-black print:text-[8px] print:leading-[1.1]">
            {line}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm print:shadow-none print:border-none print:bg-white print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 0.5cm; }
          .volunteer-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          .volunteer-table th, .volunteer-table td { border: 1px solid #000 !important; padding: 2px !important; }
          .volunteer-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
        }
      `}} />
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 print:hidden">
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-white">
            {t('nav_slips', language)}
            </h2>
            <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Reports & Printables</p>
        </div>

        <div className="flex items-center gap-4">
            {/* OPTION 2: Pill Toggle Switch */}
            <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-700">
                <button
                    onClick={() => setDisplayMode('slips')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${displayMode === 'slips'
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                >
                    Slips
                </button>
                <button
                    onClick={() => setDisplayMode('table')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${displayMode === 'table'
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                >
                    Volunteer Table
                </button>
            </div>

            <button
                onClick={() => window.print()}
                className="bg-gray-800 text-white px-6 py-2 rounded-full hover:bg-gray-900 font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-2 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
                <i className="fa fa-print"></i> {t('btn_print', language)}
            </button>
        </div>
      </div>

      {displayMode === 'slips' ? (
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
      ) : (
        <div className="overflow-auto border border-gray-100 dark:border-slate-800 rounded-2xl print:border-none print:rounded-none print:overflow-visible">
            <table className="w-full text-left border-collapse text-xs print:text-[8px] volunteer-table">
                <thead className="bg-gray-50 dark:bg-slate-800 print:bg-gray-100">
                    <tr>
                    <th className="p-3 border-b border-gray-200 dark:border-slate-700 print:border-black font-bold uppercase text-gray-400 print:text-black w-[15%]">Name</th>
                    {shifts.map(s => (
                        <th key={s.id} className="p-3 border-b border-gray-200 dark:border-slate-700 print:border-black font-bold uppercase text-gray-400 print:text-black text-center">
                        {s.label}
                        </th>
                    ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 print:divide-black">
                    {[...personnel].sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-bold text-gray-900 dark:text-white print:text-black">{p.name}</td>
                        {shifts.map(s => (
                        <td key={s.id} className="p-3 border-l border-gray-50 dark:border-slate-800 print:border-black sm:min-w-[120px]">
                            {renderVolunteerTableCell(p, s)}
                        </td>
                        ))}
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  )
}
