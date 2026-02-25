import React, { useState, useEffect } from 'react'
import { t } from '../i18n/translations'

export default function CSVMapperModal({ data, onImport, onClose, language }) {
  const headers = data[0] || []
  const [mapping, setMapping] = useState({
    nameIdx: -1,
    roleIdx: -1,
    keyManIdx: -1,
    congregationIdx: -1,
  })

  // Try to auto-guess based on common header names
  useEffect(() => {
    const newMapping = {
      nameIdx: -1,
      roleIdx: -1,
      keyManIdx: -1,
      congregationIdx: -1,
    }
    headers.forEach((h, i) => {
      const low = h.toLowerCase().trim()
      if (low.includes('name') && !low.includes('key')) newMapping.nameIdx = i
      if (
        low.includes('appoint') ||
        low.includes('role') ||
        low.includes('servant')
      )
        newMapping.roleIdx = i
      if (low.includes('key man') || low.includes('overseer'))
        newMapping.keyManIdx = i
      if (low.includes('cong')) newMapping.congregationIdx = i
    })
    // Fallback to old hardcoded defaults if nothing found
    if (newMapping.nameIdx === -1 && headers.length > 3) newMapping.nameIdx = 3
    if (newMapping.roleIdx === -1 && headers.length > 5) newMapping.roleIdx = 5
    if (newMapping.keyManIdx === -1 && headers.length > 7) newMapping.keyManIdx = 7

    setMapping(newMapping)
  }, [headers])

  const handleFinish = () => {
    if (mapping.nameIdx === -1)
      return alert("You must at least select a 'Name' column.")
    onImport(mapping)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('csv_map_title', language)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('csv_map_desc', language) ||
                'Match your spreadsheet columns to our roster fields.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <i className="fa fa-times text-gray-400"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              { label: 'Full Name (Required)', key: 'nameIdx', icon: 'fa-user' },
              { label: 'Role / Appointment', key: 'roleIdx', icon: 'fa-user-tie' },
              {
                label: 'Key Man Name',
                key: 'keyManIdx',
                icon: 'fa-users-gear',
              },
              {
                label: 'Congregation',
                key: 'congregationIdx',
                icon: 'fa-church',
              },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1 flex items-center gap-2">
                  <i className={`fa ${field.icon}`}></i> {field.label}
                </label>
                <select
                  value={mapping[field.key]}
                  onChange={(e) =>
                    setMapping({
                      ...mapping,
                      [field.key]: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="-1">-- Skip / Not in CSV --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      Column {i + 1}: {h || `(Empty Header)`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
            <h4 className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
              <i className="fa fa-eye"></i> {t('csv_map_preview', language)} (Top
              3 Rows)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-blue-100 dark:border-blue-800">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Key Man</th>
                    <th className="pb-2">Congregation</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  {data.slice(1, 4).map((row, rid) => (
                    <tr key={rid}>
                      <td className="py-2 pr-2 truncate max-w-[100px]">
                        {mapping.nameIdx !== -1 ? row[mapping.nameIdx] : '-'}
                      </td>
                      <td className="py-2 pr-2 truncate max-w-[100px]">
                        {mapping.roleIdx !== -1 ? row[mapping.roleIdx] : '-'}
                      </td>
                      <td className="py-2 pr-2 truncate max-w-[100px]">
                        {mapping.keyManIdx !== -1 ? row[mapping.keyManIdx] : '-'}
                      </td>
                      <td className="py-2 truncate max-w-[100px]">
                        {mapping.congregationIdx !== -1
                          ? row[mapping.congregationIdx]
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
          >
            Import {data.length - 1} Members
          </button>
        </div>
      </div>
    </div>
  )
}
