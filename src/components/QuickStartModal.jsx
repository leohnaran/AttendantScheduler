import React, { useState } from 'react'
import { t } from '../i18n/translations'

export default function QuickStartModal({ onClose, language }) {
  const [step, setStep] = useState(0)
  const steps = [
    {
      title: t('wizard_welcome', language),
      icon: 'fa-hand-sparkles',
      color: 'text-blue-600',
      content: (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            A secure, simple tool for managing Attendant schedules for Circuit
            Assemblies.
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <i className="fa fa-lock"></i> 100% Private
            </span>
            <span className="flex items-center gap-1">
              <i className="fa fa-wifi"></i> Offline Capable
            </span>
          </div>
        </div>
      ),
    },
    {
      title: t('wizard_step1', language),
      icon: 'fa-cog',
      color: 'text-gray-600',
      content:
        'Go to the <b>Config</b> tab to customize your Departments (Areas), Time Slots (Shifts), and specific Posts (Positions). We\'ve started you off with a standard template.',
    },
    {
      title: t('wizard_step2', language),
      icon: 'fa-users',
      color: 'text-purple-600',
      content:
        'Go to the <b>Roster</b> tab. You can manually add brothers or use the <b>Import CSV</b> button for bulk entry. Drag and drop names to assign them to Key Man teams.',
    },
    {
      title: t('wizard_step3', language),
      icon: 'fa-calendar-alt',
      color: 'text-green-600',
      content:
        'Head to the <b>Schedule</b> tab. Use <b>Auto-Fill</b> to automatically fill empty slots based on qualifications and fairness. You can also click any cell to manually assign.',
    },
    {
      title: '4. Review & Print',
      icon: 'fa-print',
      color: 'text-red-600',
      content:
        'Check the <b>Time Stats</b> tab to ensure workload balance. Then use <b>Slips</b> to print individual assignment slips for every volunteer.',
    },
  ]

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1)
    else handleFinish()
  }

  const handleFinish = () => {
    localStorage.setItem('has_seen_quickstart', 'true')
    onClose()
  }

  const current = steps[step]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="bg-gradient-to-br from-gray-50 to-white p-8 text-center border-b border-gray-100 dark:from-slate-800 dark:to-slate-900 dark:border-slate-800">
          <div
            className={`w-16 h-16 mx-auto mb-4 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl ${current.color} dark:bg-slate-700 dark:text-blue-400`}
          >
            <i className={`fa ${current.icon}`}></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {current.title}
          </h2>
        </div>
        <div className="p-8">
          <div className="text-gray-600 text-lg leading-relaxed mb-8 dark:text-slate-300">
            {typeof current.content === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: current.content }} />
            ) : (
              current.content
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-blue-600' : 'w-2 bg-gray-200 dark:bg-slate-700'
                  }`}
                ></div>
              ))}
            </div>
            <button
              onClick={handleNext}
              className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 dark:shadow-none"
            >
              {step === steps.length - 1
                ? t('wizard_start', language)
                : t('wizard_next', language)}{' '}
              <i className="fa fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
