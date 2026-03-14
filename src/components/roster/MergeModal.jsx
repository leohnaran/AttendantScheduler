import React from 'react'

export default function MergeModal({ mergingId, setMergingId, personnel, handleMergeAction }) {
  if (!mergingId) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Merge Records</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select who to merge <b>{personnel.find(p => p.id === mergingId)?.name}</b> into.
            </p>
          </div>
          <button onClick={() => setMergingId(null)} className="text-gray-400 hover:text-gray-600">
            <i className="fa fa-times"></i>
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            {personnel
              .filter(p => p.id !== mergingId)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => handleMergeAction(p.id)}
                  className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-blue-900/20 transition-all flex justify-between items-center group"
                >
                  <span className="font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{p.name}</span>
                  <i className="fa fa-chevron-right text-[10px] text-gray-300 group-hover:text-blue-400"></i>
                </button>
              ))
            }
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-center">
          <button onClick={() => setMergingId(null)} className="text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  )
}
