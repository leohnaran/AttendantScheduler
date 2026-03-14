import React, { useEffect } from 'react';

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4 text-blue-600 dark:text-blue-400">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-lg">
              <i className="fa fa-circle-question"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{message}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none transition-transform active:scale-95"
            autoFocus
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
