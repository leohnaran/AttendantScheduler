import React from 'react'
import { t } from '../i18n/translations'

export default function Wizard({
  step,
  steps,
  onNext,
  onBack,
  onClose,
  language,
}) {
  const current = steps[step]
  const isLast = step === steps.length - 1

  // If it's a modal step (Welcome)
  if (current.isModal) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden dark:bg-slate-900 dark:border dark:border-slate-800 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl shadow-md dark:bg-slate-700 dark:text-blue-400">
            <i className="fa fa-wand-magic-sparkles"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 dark:text-white">
            {t(current.title, language)}
          </h2>
          <p className="text-gray-600 text-lg mb-8 dark:text-gray-300">
            {current.description}
          </p>
          <button
            onClick={onNext}
            className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all transform hover:scale-105 active:scale-95 dark:shadow-none"
          >
            {t('wizard_start', language)} <i className="fa fa-arrow-right ml-2"></i>
          </button>
          <button
            onClick={onClose}
            className="block w-full mt-6 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {t('wizard_skip', language)}
          </button>
        </div>
      </div>
    )
  }

  // Floating Overlay for other steps
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96">
      <div className="glass-panel p-6 rounded-2xl shadow-2xl border-l-4 border-blue-500 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
              {step}
            </span>
            {t(current.title, language)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
        <p className="text-gray-600 text-sm mb-6 dark:text-gray-300 leading-relaxed">
          {current.description}
        </p>

        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {steps.map((s, i) => {
              if (s.isModal) return null // Don't show dot for welcome
              return (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step
                      ? 'w-6 bg-blue-600'
                      : 'w-1.5 bg-gray-300 dark:bg-slate-600'
                  }`}
                ></div>
              )
            })}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-800 px-3 py-1.5 text-sm font-medium dark:text-gray-400 dark:hover:text-white"
              >
                {t('wizard_back', language)}
              </button>
            )}
            <button
              onClick={onNext}
              className="bg-blue-600 text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700 shadow-md transition-transform active:scale-95"
            >
              {isLast ? t('wizard_finish', language) : t('wizard_next', language)}{' '}
              <i
                className={`fa ${
                  isLast ? 'fa-check' : 'fa-chevron-right'
                } ml-1`}
              ></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
