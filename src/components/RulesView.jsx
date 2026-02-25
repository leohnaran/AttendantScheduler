import React from 'react'
import { t } from '../i18n/translations'

export default function RulesView({ rules, setRules, language }) {
  const toggleRule = (key) => setRules({ ...rules, [key]: !rules[key] })
  const setSeverity = (key, val) => setRules({ ...rules, [key]: val })
  const setVal = (key, val) => setRules({ ...rules, [key]: val })

  return (
    <div className="glass-panel p-8 rounded-3xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-6 dark:text-white">
        Assignment Rules
      </h2>
      <div className="grid gap-4 max-w-2xl">
        {/* 1. Capabilities */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded border dark:bg-slate-800 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">
              {t('rule_capabilities', language)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('rule_capabilities_desc', language) ||
                "Only allow qualified brothers (e.g. 'Auditorium', 'Key Man') to be assigned."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={rules.capabilitySeverity || 'error'}
              onChange={(e) => setSeverity('capabilitySeverity', e.target.value)}
              className="border rounded p-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="error">{t('severity_block', language)}</option>
              <option value="warning">{t('severity_warn', language)}</option>
              <option value="off">{t('severity_off', language)}</option>
            </select>
          </div>
        </div>

        {/* 2. Double Booking */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded border dark:bg-slate-800 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">
              {t('rule_double_booking', language)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('rule_double_booking_desc', language) ||
                'Ensure a brother is not in two places at once.'}
            </p>
          </div>
          <select
            value={rules.doubleBookingSeverity || 'error'}
            onChange={(e) => setSeverity('doubleBookingSeverity', e.target.value)}
            className="border rounded p-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            <option value="error">{t('severity_block', language)}</option>
            <option value="warning">{t('severity_warn', language)}</option>
            <option value="off">{t('severity_off', language)}</option>
          </select>
        </div>

        {/* 3. Unavailability */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded border dark:bg-slate-800 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">
              {t('rule_unavailability', language)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('rule_unavailability_desc', language) ||
                'Do not assign if brother has program part or marked unavailable.'}
            </p>
          </div>
          <select
            value={rules.unavailableSeverity || 'error'}
            onChange={(e) => setSeverity('unavailableSeverity', e.target.value)}
            className="border rounded p-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            <option value="error">{t('severity_block', language)}</option>
            <option value="warning">{t('severity_warn', language)}</option>
            <option value="off">{t('severity_off', language)}</option>
          </select>
        </div>

        {/* 4. Max Work Percentage */}
        <div className="p-4 bg-gray-50 rounded border dark:bg-slate-800 dark:border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 dark:text-white">
              {t('rule_max_load', language)} (Program Watch %)
            </h3>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {rules.maxWorkPercent || 50}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">
            {t('rule_max_load_desc', language)}
          </p>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={rules.maxWorkPercent || 50}
            onChange={(e) => setVal('maxWorkPercent', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 5. Consecutive Shifts */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded border dark:bg-slate-800 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">
              {t('rule_consecutive', language)} (Auto-Fill)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('rule_consecutive_desc', language) ||
                'Try to give a break between shifts.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={rules.avoidConsecutive !== false}
            onChange={() => toggleRule('avoidConsecutive')}
            className="h-5 w-5"
          />
        </div>

        {/* 6. Anchor Limits */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded border dark:bg-slate-800 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">
              {t('rule_anchor_limits', language)} (Auto-Fill)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('rule_anchor_desc', language)}
            </p>
          </div>
          <input
            type="checkbox"
            checked={rules.anchorLimits !== false}
            onChange={() => toggleRule('anchorLimits')}
            className="h-5 w-5"
          />
        </div>

        {/* 7. Auditorium Relief Mode */}
        <div className="p-4 bg-blue-50 rounded border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-300">
                {t('rule_relief_mode', language)}
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                {t('rule_relief_desc', language)}
              </p>
            </div>
            <input
              type="checkbox"
              checked={rules.auditoriumRotationMode === true}
              onChange={() => toggleRule('auditoriumRotationMode')}
              className="h-5 w-5"
            />
          </div>

          {rules.auditoriumRotationMode && (
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                  Max Relief % per Shift
                </h4>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {rules.auditoriumCoverage || 25}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">
                Limit how many Auditorium brothers can be pulled away at once.
              </p>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={rules.auditoriumCoverage || 25}
                onChange={(e) =>
                  setVal('auditoriumCoverage', parseInt(e.target.value))
                }
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
