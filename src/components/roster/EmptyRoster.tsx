import React, { ChangeEvent } from 'react'
import { t } from '../../i18n/translations'
import RosterForm from './RosterForm'
import { RosterFormData, Area, Shift, Person } from '../../types/models'

interface EmptyRosterProps {
  formData: RosterFormData;
  setFormData: React.Dispatch<React.SetStateAction<RosterFormData>>;
  uniqueCongregations: string[];
  areas: Area[];
  shifts: Shift[];
  personnel: Person[];
  savePerson: () => Promise<void> | void;
  cancelEdit: () => void;
  handleCSVUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  language: string;
}

export default function EmptyRoster({
  formData,
  setFormData,
  uniqueCongregations,
  areas,
  shifts,
  personnel,
  savePerson,
  cancelEdit,
  handleCSVUpload,
  language,
}: EmptyRosterProps) {
  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-white">
            {t('roster_title', language)}
          </h2>
          <p className="text-gray-500 text-sm mt-1 dark:text-gray-400">
            {t('roster_start_desc', language) || 'Start by adding your team'}
          </p>
        </div>
        <div className="relative overflow-hidden inline-block group">
          <button className="bg-purple-500 text-white py-2 px-5 rounded-full font-semibold shadow-sm hover:bg-purple-600 hover:shadow-md transition-all active:scale-95 flex items-center gap-2 dark:bg-purple-600 dark:hover:bg-purple-700">
            <i className="fa fa-file-csv"></i> {t('roster_import', language)}
          </button>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <RosterForm
        formData={formData}
        setFormData={setFormData}
        uniqueCongregations={uniqueCongregations}
        areas={areas}
        shifts={shifts}
        personnel={personnel}
        editingId={null}
        savePerson={savePerson}
        cancelEdit={cancelEdit}
        language={language}
      />

      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50 dark:bg-slate-800/50 dark:border-slate-700">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm dark:bg-slate-700 dark:text-blue-400">
          <i className="fa fa-user-plus"></i>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2 dark:text-white">
          {t('roster_empty', language)}
        </h3>
        <p className="text-gray-500 max-w-sm mb-6 dark:text-gray-400">
          {t('roster_empty_desc', language) ||
            'Add brothers manually using the form above, or import your existing list to get started quickly.'}
        </p>
        <div className="relative overflow-hidden inline-block group">
          <button className="bg-white border border-gray-200 text-gray-700 py-2.5 px-6 rounded-full font-semibold shadow-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700">
            <i className="fa fa-file-csv text-green-600 dark:text-green-400"></i>{' '}
            {t('roster_import', language)}
          </button>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
