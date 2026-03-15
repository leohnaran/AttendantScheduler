import React from 'react'
import { t } from '../i18n/translations'
import { LogEntry } from '../types/models'

interface LogViewProps {
  log: LogEntry[];
  language: string;
}

export default function LogView({ log, language }: LogViewProps) {
  if (!log || log.length === 0)
    return (
      <div className="glass-panel p-8 rounded-3xl text-gray-500 text-center italic dark:text-gray-400">
        {t('no_logs', language) || 'No logs available. Run Auto-Fill first.'}
      </div>
    )
  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 tracking-tight dark:text-white print:hidden">
        {t('log_title', language)}
      </h2>
      <div className="h-96 overflow-y-auto border border-gray-100 p-4 rounded-xl bg-gray-50/50 text-xs font-mono shadow-inner dark:bg-slate-900/50 dark:border-slate-800">
        {log.map((entry, i) => (
          <div
            key={i}
            className={`log-entry ${
              entry.type === 'auditorium'
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {entry.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
