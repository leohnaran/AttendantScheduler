import React from 'react'
import { t } from '../../i18n/translations'
import { RosterFormData, Area, Shift, Person } from '../../types/models'

interface RosterFormProps {
  formData: RosterFormData;
  setFormData: React.Dispatch<React.SetStateAction<RosterFormData>> | ((val: any) => void);
  uniqueCongregations: string[];
  areas: Area[];
  shifts: Shift[];
  personnel: Person[];
  editingId: number | null;
  savePerson: () => Promise<void> | void;
  cancelEdit: () => void;
  language: string;
}

export default function RosterForm({
  formData,
  setFormData,
  uniqueCongregations,
  areas,
  shifts,
  personnel,
  editingId,
  savePerson,
  cancelEdit,
  language,
}: RosterFormProps) {
  const handleCapChange = (cap: string, checked: boolean) => {
    if (typeof setFormData === 'function' && !(setFormData instanceof Function)) {
        // Handle the case where setFormData is the custom setter from RosterView
       (setFormData as any)((prev: RosterFormData) => ({ ...prev, caps: { ...prev.caps, [cap]: checked } }))
    } else {
       (setFormData as any)((prev: RosterFormData) => ({ ...prev, caps: { ...prev.caps, [cap]: checked } }))
    }
  }

  const handleUnavailableChange = (shiftId: string, checked: boolean) => {
    (setFormData as any)((prev: RosterFormData) => {
      const newUnavailable = checked
        ? [...(prev.unavailable || []), shiftId]
        : (prev.unavailable || []).filter((id) => id !== shiftId)
      return { ...prev, unavailable: newUnavailable }
    })
  }

  const renderCheckbox = (key: string, label: string) => (
    <label key={key} className="flex items-center cursor-pointer mr-4 mb-2">
      <input
        type="checkbox"
        checked={formData.caps[key] || false}
        onChange={(e) => handleCapChange(key, e.target.checked)}
        className="mr-2"
      />
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </label>
  )

  return (
    <div
      className={`p-6 rounded-2xl border mb-8 transition-colors ${editingId
          ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
          : 'bg-gray-50/50 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700'
        }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          {editingId ? 'Editing Personnel' : t('roster_add_person', language)}
        </h3>
        {editingId && (
          <button
            onClick={cancelEdit}
            className="text-xs text-red-500 hover:text-red-700 font-medium dark:text-red-400 dark:hover:text-red-300"
          >
            {t('btn_cancel', language)}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="mb-2">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
            {t('roster_name', language)}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              (setFormData as any)({ ...formData, name: e.target.value })
            }
            className="border border-gray-300 p-2.5 rounded-xl w-48 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
            placeholder="Full Name"
          />
        </div>
        <div className="mb-2">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
            {t('roster_cong', language)}
          </label>
          <input
            type="text"
            list="congregation-list"
            value={formData.congregation}
            onChange={(e) =>
              (setFormData as any)({ ...formData, congregation: e.target.value })
            }
            className="border border-gray-300 p-2.5 rounded-xl w-32 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
            placeholder="Congregation"
          />
          <datalist id="congregation-list">
            {uniqueCongregations.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="mb-2">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
            {t('roster_role', language)}
          </label>
          <select
            value={formData.role}
            onChange={(e) =>
              (setFormData as any)({ ...formData, role: e.target.value })
            }
            className="border border-gray-300 p-2.5 rounded-xl w-32 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
          >
            <option value="Exemplary">{t('role_exemplary', language)}</option>
            <option value="MS">{t('role_ms', language)}</option>
            <option value="Elder">{t('role_elder', language)}</option>
          </select>
        </div>
        <div className="mb-2">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
            {t('roster_keyman', language)}
          </label>
          <select
            value={formData.keyManId}
            onChange={(e) =>
              (setFormData as any)({ ...formData, keyManId: e.target.value })
            }
            className="border border-gray-300 p-2.5 rounded-xl w-48 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:ring-blue-800"
            disabled={personnel.length === 0}
          >
            <option value="">-- None --</option>
            {personnel
              .filter(
                (p) =>
                  p.caps && p.caps.includes('keyman') && p.id !== editingId,
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        <div className="w-full">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
            {t('roster_perms', language)}
          </label>
          <div className="flex flex-wrap bg-white p-4 rounded-xl border border-gray-200 mb-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            {areas.map((area) => renderCheckbox(area.capability || area.id, area.name))}
            {renderCheckbox(
              'keyman',
              t('roster_keyman', language).toUpperCase(),
            )}
          </div>
        </div>
        <div className="w-full mb-4">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1 dark:text-gray-400">
            {t('roster_unavail', language)}
          </label>
          <div className="flex flex-wrap bg-white p-4 rounded-xl border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 items-center">
            <label className="flex items-center cursor-pointer mr-6 select-none border-r border-gray-200 dark:border-slate-700 pr-6">
              <input
                type="checkbox"
                checked={formData.unavailable && formData.unavailable.includes('all_day')}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (isChecked) {
                    (setFormData as any)({ ...formData, unavailable: ['all_day', ...shifts.map(s => s.id)] });
                  } else {
                    (setFormData as any)({ ...formData, unavailable: [] });
                  }
                }}
                className="mr-2 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-700"
              />
              <span className="text-sm font-black uppercase text-red-600 dark:text-red-400">
                Absent All Day
              </span>
            </label>
            {shifts.map((s) => (
              <label
                key={s.id}
                className="flex items-center cursor-pointer mr-6 select-none"
              >
                <input
                  type="checkbox"
                  checked={
                    formData.unavailable && formData.unavailable.includes(s.id)
                  }
                  onChange={(e) =>
                    handleUnavailableChange(s.id, e.target.checked)
                  }
                  className="mr-2 w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={savePerson}
          className={`px-6 py-2.5 rounded-full font-bold shadow-md transition-all active:scale-95 text-white ${editingId
              ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200 dark:shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
            }`}
        >
          {editingId ? 'Update Person' : t('roster_add_person', language)}
        </button>
      </div>
    </div>
  )
}
