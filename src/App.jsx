import React, { useState, useEffect, useMemo } from 'react'
import CryptoJS from 'crypto-js'
import { t } from './i18n/translations'
import { useUndoRedo } from './hooks/useUndoRedo'
import {
  DEFAULT_SHIFTS,
  DEFAULT_AREAS,
  DEFAULT_POSITIONS,
  INITIAL_ROSTER,
} from './utils/constants'

// Components
import RosterView from './components/RosterView'
import StatsView from './components/StatsView'
import DepartmentView from './components/DepartmentView'
import LogView from './components/LogView'
import TagsView from './components/TagsView'
import ConfigView from './components/ConfigView'
import ScheduleView from './components/ScheduleView'
import PrintView from './components/PrintView'
import QuickStartModal from './components/QuickStartModal'
import Wizard from './components/Wizard'
import { saveToDatabase, loadFromDatabase, clearDatabase } from './utils/persistence'

const WIZARD_STEPS = [
  {
    id: 'welcome',
    title: 'wizard_welcome',
    description: "Let's get your assembly set up in 3 easy steps.",
    view: 'schedule',
    isModal: true,
  },
  {
    id: 'config',
    title: 'wizard_step1',
    description:
      'Review the default Areas, Shifts, and Positions. Customize them to match your assembly hall layout.',
    view: 'config',
    isModal: false,
  },
  {
    id: 'roster',
    title: 'wizard_step2',
    description:
      "Add your brothers here. You can Import a CSV or add them manually. Don't forget to assign Capabilities!",
    view: 'roster',
    isModal: false,
  },
  {
    id: 'schedule',
    title: 'wizard_step3',
    description:
      "You are ready! Click the 'Auto-Fill' button to generate your first schedule instantly.",
    view: 'schedule',
    isModal: false,
  },
]

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      <div style={{ padding: '20px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', margin: '20px' }}>
        <h2 style={{ color: '#b91c1c', fontWeight: 'bold' }}>Component Crash</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '10px' }}>{this.state.error?.toString()}</pre>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button onClick={() => window.location.reload()} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}>Reload Page</button>
          <button onClick={() => {
            localStorage.removeItem('circuit_scheduler_data');
            if (window.indexedDB) indexedDB.deleteDatabase('AttendantSchedulerDB');
            window.location.reload();
          }} style={{ padding: '6px 12px', cursor: 'pointer', background: '#dc2626', color: 'white', border: '1px solid #dc2626', borderRadius: '4px' }}>Clear Data & Reload</button>
        </div>
      </div>
    }
    return this.props.children
  }
}

const APP_VERSION = 'v3.6.6'

export default function App() {
  console.log(`Attendant Scheduler ${APP_VERSION} - Reset Fix Active`);
  const [view, setView] = useState('schedule')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [language, setLanguage] = useState(
    () => localStorage.getItem('app_language') || 'en',
  )
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(null)

  // Update Checker
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const response = await fetch('https://api.github.com/repos/leohnaran/AttendantScheduler/releases/latest')
        if (!response.ok) return
        const data = await response.json()
        const latestTag = data.tag_name // e.g. "v3.6.6"
        
        if (latestTag && latestTag !== APP_VERSION) {
          // Compare versions simple way (assuming semantic versioning like vX.Y.Z)
          const current = APP_VERSION.replace('v', '').split('.').map(Number)
          const latest = latestTag.replace('v', '').split('.').map(Number)
          
          let isNewer = false
          for (let i = 0; i < Math.max(current.length, latest.length); i++) {
            const vLatest = latest[i] || 0
            const vCurrent = current[i] || 0
            if (vLatest > vCurrent) {
              isNewer = true
              break
            }
            if (vLatest < vCurrent) break
          }

          if (isNewer) {
            setUpdateAvailable(data)
          }
        }
      } catch (err) {
        console.error('Update check failed:', err)
      }
    }
    checkForUpdates()
  }, [])

  const INITIAL_STATE = useMemo(() => ({
    personnel: INITIAL_ROSTER,
    tags: [],
    assignments: {},
    log: [],
    areas: DEFAULT_AREAS,
    positions: DEFAULT_POSITIONS,
    shifts: DEFAULT_SHIFTS,
    blueprints: [
      {
        id: 'bp_default_assembly',
        name: 'Standard Assembly Hall',
        areas: DEFAULT_AREAS,
        positions: DEFAULT_POSITIONS,
        shifts: DEFAULT_SHIFTS,
      },
    ],
    rules: {
      capabilitySeverity: 'error',
      doubleBookingSeverity: 'error',
      unavailableSeverity: 'error',
      avoidConsecutive: true,
      anchorLimits: true,
      maxWorkPercent: 50,
      auditoriumRotationMode: false,
      auditoriumCoverage: 25,
    },
    lastUpdated: 0
  }), [])

  // Load from database OR localStorage on initialization
  const [initialData] = useState(() => {
    try {
      const saved = localStorage.getItem('circuit_scheduler_data')
      if (saved) {
        let parsed = JSON.parse(saved)

        // MIGRATION: Auto-sync mirror properties from default configurations
        if (parsed.positions) {
          parsed.positions = parsed.positions.map(p => {
            const defaultPos = DEFAULT_POSITIONS.find(dp => dp.id === p.id)
            if (defaultPos && defaultPos.isMirror && p.mirrorOf === undefined) {
              return { ...p, isMirror: true, mirrorOf: defaultPos.mirrorOf }
            }
            return p
          })
        }

        return { ...INITIAL_STATE, ...parsed }
      }
    } catch (err) {
      console.error('Error loading initial data:', err)
    }
    return INITIAL_STATE
  })

  const { state, setState, undo, redo, canUndo, canRedo, resetHistory } =
    useUndoRedo(initialData)

  // Safety check for state
  if (!state) {
    return <div className="p-10 text-center">Initializing State...</div>
  }

  const {
    personnel = [],
    tags = [],
    assignments = {},
    log = [],
    areas = [],
    positions = [],
    shifts = [],
    blueprints = [],
    rules = {},
  } = state

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('dark_mode') === 'true',
  )
  const [password, setPassword] = useState('')

  // 1. ROBUST LOAD: Combine Electron Native, LocalStorage and IndexedDB
  useEffect(() => {
    async function loadAll() {
      let finalState = null;

      // FIRST PASS: Am I running in Electron?
      if (window.electronAPI) {
        try {
          console.log("Electron API detected, attempting native file load...");
          const result = await window.electronAPI.loadData();
          if (result && result.success && result.data) {
            finalState = result.data;
            console.log("Restored state from native OS file.");
          }
        } catch (e) {
          console.error("Native Load Failed", e);
        }
      }

      // SECOND PASS: If no Electron file existed, try web storage
      if (!finalState) {
        // Try LocalStorage first (Synchronous data already in initialData, but we check here too for safety)
        try {
          const lsRaw = localStorage.getItem('circuit_scheduler_data');
          if (lsRaw) finalState = JSON.parse(lsRaw);
        } catch (e) { console.error("LS Load Failed", e); }

        // Try IndexedDB (Async, reliable)
        try {
          const dbState = await loadFromDatabase();
          if (dbState) {
            // Pick whichever is newer
            if (!finalState || (dbState.lastUpdated || 0) > (finalState.lastUpdated || 0)) {
              finalState = dbState;
              console.log("Restored state from IndexedDB (Newer or Only copy).");
            }
          }
        } catch (e) { console.error("DB Load Failed", e); }
      }

      if (finalState) {
        resetHistory({ ...INITIAL_STATE, ...finalState });
      }
    }
    loadAll();
  }, []);

  useEffect(() => {
    const wizardComplete = localStorage.getItem('wizard_complete')
    if (!wizardComplete) {
      setShowWizard(true)
    }
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('dark_mode', darkMode)
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('app_language', language)
  }, [language])

  // --- PERSISTENCE: Auto-Save to Native File or Database ---
  useEffect(() => {
    if (!state) return

    // Mirror to localStorage for dual-layer safety (Web only fallback)
    localStorage.setItem('circuit_scheduler_data', JSON.stringify(state))

    // Primary Auto-Save
    if (window.electronAPI) {
      // We are in the Electron Desktop App
      window.electronAPI.saveData(state)
        .then(res => {
          if (!res.success) console.error("Electron Save Error:", res.error)
        })
        .catch(err => console.error("Electron IPC Error:", err))
    } else {
      // We are on the web 
      saveToDatabase(state);
    }
  }, [state])

  // --- WIZARD HANDLERS ---
  const handleWizardNext = () => {
    const nextStep = wizardStep + 1
    if (nextStep < WIZARD_STEPS.length) {
      setWizardStep(nextStep)
      setView(WIZARD_STEPS[nextStep].view)
    } else {
      handleWizardClose()
    }
  }

  const handleWizardBack = () => {
    if (wizardStep > 0) {
      const prevStep = wizardStep - 1
      setWizardStep(prevStep)
      setView(WIZARD_STEPS[prevStep].view)
    }
  }

  const handleWizardClose = () => {
    setShowWizard(false)
    localStorage.setItem('wizard_complete', 'true')
    localStorage.setItem('has_seen_quickstart', 'true')
  }

  // --- WRAPPERS FOR STATE UPDATES ---
  const updateState = (updates) => setState({ ...state, ...updates, lastUpdated: Date.now() })

  const setPersonnel = (val) =>
    updateState({
      personnel: typeof val === 'function' ? val(personnel) : val,
    })
  const setTags = (val) => {
    console.log('App: setTags called', val)
    updateState({ tags: typeof val === 'function' ? val(tags) : val })
  }
  const setAssignments = (val) =>
    updateState({
      assignments: typeof val === 'function' ? val(assignments) : val,
    })
  const setAreas = (val) =>
    updateState({ areas: typeof val === 'function' ? val(areas) : val })
  const setPositions = (val) =>
    updateState({ positions: typeof val === 'function' ? val(positions) : val })
  const setShifts = (val) =>
    updateState({ shifts: typeof val === 'function' ? val(shifts) : val })
  const setBlueprints = (val) =>
    updateState({
      blueprints: typeof val === 'function' ? val(blueprints) : val,
    })
  const setRules = (val) =>
    updateState({ rules: typeof val === 'function' ? val(rules) : val })

  const handleDeleteTag = (tagId) => {
    console.log('App: handleDeleteTag starting for:', tagId)
    const newTags = tags.filter((t) => t.id !== tagId)
    const newPersonnel = personnel.map((p) => ({
      ...p,
      tags: (p.tags || []).filter((tid) => tid !== tagId),
    }))

    console.log('App: Setting new state with tag count:', newTags.length)
    updateState({
      tags: newTags,
      personnel: newPersonnel
    })
  }

  const handleAutoFill = (newAssignments, newLog) => {
    updateState({ assignments: newAssignments, log: newLog })
  }

  const handleMerge = (sourceId, targetId) => {
    if (sourceId === targetId) return
    const source = personnel.find((p) => p.id === sourceId)
    const target = personnel.find((p) => p.id === targetId)
    if (!source || !target) return

    // 1. Update Assignments
    const newAssignments = { ...assignments }
    Object.keys(newAssignments).forEach((key) => {
      const val = newAssignments[key]
      const currentId = val && typeof val === 'object' ? val.id : val
      if (currentId === sourceId) {
        if (val && typeof val === 'object') {
          newAssignments[key] = { ...val, id: targetId }
        } else {
          newAssignments[key] = targetId
        }
      }
    })

    // 2. Update Key Man IDs
    const newPersonnel = personnel
      .filter((p) => p.id !== sourceId)
      .map((p) => {
        if (p.keyManId === sourceId) {
          return { ...p, keyManId: targetId }
        }
        return p
      })

    // 3. Merge Metadata to Target
    const mergedPersonnel = newPersonnel.map((p) => {
      if (p.id === targetId) {
        return {
          ...p,
          caps: [...new Set([...p.caps, ...source.caps])],
          tags: [...new Set([...(p.tags || []), ...(source.tags || [])])],
          unavailable: [
            ...new Set([...(p.unavailable || []), ...(source.unavailable || [])]),
          ],
        }
      }
      return p
    })

    updateState({
      personnel: mergedPersonnel,
      assignments: newAssignments,
    })
    alert(`Merged ${source.name} into ${target.name}. All assignments updated.`)
  }

  const resetAll = async () => {
    if (
      confirm('Are you sure you want to clear EVERYTHING? This cannot be undone.')
    ) {
      // 1. Clear localStorage
      localStorage.removeItem('circuit_scheduler_data');

      // 2. Clear IndexedDB
      try {
        await clearDatabase();
      } catch (err) {
        console.error("Database reset failed", err);
      }

      // 3. Reload
      window.location.reload();
    }
  }

  const handleExport = () => {
    if (!password) return alert('Please enter a password.')
    try {
      const data = JSON.stringify(state)
      const encrypted = CryptoJS.AES.encrypt(data, password).toString()
      const blob = new Blob([encrypted], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendant-schedule-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      setShowSaveModal(false)
      setPassword('')
    } catch (e) {
      alert('Export failed: ' + e.message)
    }
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const encryptedData = event.target.result
        const decrypted = CryptoJS.AES.decrypt(
          encryptedData,
          password,
        ).toString(CryptoJS.enc.Utf8)
        if (!decrypted) throw new Error('Incorrect password or invalid file.')
        const parsed = JSON.parse(decrypted)
        setState(parsed)
        setShowLoadModal(false)
        setPassword('')
        alert('Schedule loaded successfully!')
      } catch (err) {
        alert('Import Error: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen pb-10 text-gray-800 transition-colors duration-300 dark:text-gray-200">
        {/* Update Notification */}
        {updateAvailable && (
          <div className="bg-blue-600 text-white px-6 py-2 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 animate-in slide-in-from-top duration-500 sticky top-0 z-[100] shadow-lg">
            <div className="flex items-center gap-2 text-sm font-bold">
              <i className="fa fa-sparkles animate-pulse"></i>
              <span>New Version Available: {updateAvailable.tag_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href={updateAvailable.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-blue-600 px-4 py-1 rounded-full text-xs font-black hover:bg-blue-50 transition-colors shadow-sm"
              >
                View Release
              </a>
              <button 
                onClick={() => setUpdateAvailable(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <i className="fa fa-times text-xs"></i>
              </button>
            </div>
          </div>
        )}

        <header className="glass-header sticky top-0 z-50 px-6 py-3 shadow-sm mb-8 print:hidden">
          <div className="container mx-auto flex flex-wrap justify-center xl:justify-between items-center gap-4">
            <div className="flex flex-wrap justify-center items-center gap-6">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br from-blue-500 to-blue-700">
                  <i className="fa fa-clipboard-user"></i>
                </div>
                <span className="tracking-tight">{t('app_title', language)}</span>
                <span className="ml-2 text-[10px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full dark:bg-blue-900/40 dark:text-blue-400">
                  {APP_VERSION}
                </span>
              </h1>

              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

              <div className="flex gap-1">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${!canUndo
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'
                    }`}
                  title="Undo"
                >
                  <i className="fa fa-undo"></i>
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${!canRedo
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'
                    }`}
                  title="Redo"
                >
                  <i className="fa fa-redo"></i>
                </button>
              </div>
            </div>

            <nav className="flex flex-wrap justify-center items-center p-1 bg-gray-100/80 rounded-2xl shadow-inner border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700">
              {['schedule', 'roster', 'stats', 'dept', 'log', 'tags', 'print', 'config'].map(
                (v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${view === v
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5 dark:bg-slate-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                  >
                    {v === 'schedule'
                      ? t('nav_schedule', language)
                      : v === 'roster'
                        ? t('nav_roster', language)
                        : v === 'stats'
                          ? t('nav_stats', language)
                          : v === 'dept'
                            ? 'Key Man Report'
                            : v === 'log'
                              ? t('nav_log', language)
                              : v === 'tags'
                                ? t('nav_tags', language)
                                : v === 'print'
                                  ? t('nav_slips', language)
                                  : t('nav_config', language)}
                  </button>
                ),
              )}
            </nav>

            <div className="flex flex-wrap justify-center gap-3 items-center">
              {/* Modern Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                >
                  <i className="fa fa-language text-blue-500 text-sm"></i>
                  <span>{t('label_language', language)}: {t(`lang_${language}`, language)}</span>
                  <i className={`fa fa-chevron-down text-[8px] transition-transform ${showLangDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {showLangDropdown && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowLangDropdown(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-[70] overflow-hidden py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                      {['en', 'es', 'fr', 'pt', 'tl', 'it'].map((l) => (
                        <button
                          key={l}
                          onClick={() => {
                            setLanguage(l);
                            setShowLangDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${language === l
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                          {t(`lang_${l}`, language)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${darkMode
                  ? 'text-yellow-400 hover:bg-white/10'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                  }`}
                title="Toggle Dark Mode"
              >
                <i className={`fa ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
              <button
                onClick={() => setShowQuickStart(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-white/10 dark:text-gray-500 dark:hover:text-blue-400 transition-all"
                title="Help / Quick Start"
              >
                <i className="fa fa-circle-question text-lg"></i>
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
              <button
                onClick={resetAll}
                className="text-gray-400 hover:text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {t('btn_reset', language)}
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                <i className="fa fa-shield-halved text-blue-500"></i>{' '}
                {t('btn_export', language) || 'Backup'}
              </button>
              <button
                onClick={() => setShowLoadModal(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm shadow-blue-200 transition-all flex items-center gap-2"
              >
                <i className="fa fa-rotate-left"></i>{' '}
                {t('btn_import', language) || 'Restore'}
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto mt-6 px-4">
          {view === 'roster' ? (
            <RosterView
              personnel={personnel}
              setPersonnel={setPersonnel}
              assignments={assignments}
              setAssignments={setAssignments}
              areas={areas}
              shifts={shifts}
              tags={tags}
              onMerge={handleMerge}
              language={language}
            />
          ) : view === 'stats' ? (
            <StatsView
              personnel={personnel}
              assignments={assignments}
              shifts={shifts}
              positions={positions}
              language={language}
            />
          ) : view === 'dept' ? (
            <DepartmentView
              personnel={personnel}
              assignments={assignments}
              areas={areas}
              positions={positions}
              shifts={shifts}
              language={language}
            />
          ) : view === 'log' ? (
            <LogView log={log} language={language} />
          ) : view === 'tags' ? (
            <TagsView
              tags={tags}
              setTags={setTags}
              personnel={personnel}
              setPersonnel={setPersonnel}
              shifts={shifts}
              areas={areas}
              onDeleteTag={handleDeleteTag}
              language={language}
            />
          ) : view === 'print' ? (
            <PrintView
              personnel={personnel}
              assignments={assignments}
              positions={positions}
              shifts={shifts}
              language={language}
            />
          ) : view === 'config' ? (
            <ConfigView
              areas={areas}
              setAreas={setAreas}
              positions={positions}
              setPositions={setPositions}
              shifts={shifts}
              setShifts={setShifts}
              personnel={personnel}
              rules={rules}
              setRules={setRules}
              tags={tags}
              blueprints={blueprints}
              setBlueprints={setBlueprints}
              onConfigUpdate={updateState}
              language={language}
            />
          ) : (
            <ScheduleView
              personnel={personnel}
              assignments={assignments}
              setAssignments={setAssignments}
              onAutoFill={handleAutoFill}
              areas={areas}
              positions={positions}
              shifts={shifts}
              rules={rules}
              tags={tags}
              language={language}
            />
          )}
        </main>

        {showSaveModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Secure Export</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter a password to encrypt your schedule data.</p>
              </div>
              <div className="p-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all mb-4"
                  placeholder="Password"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowSaveModal(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
                  <button onClick={handleExport} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95">Download File</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showLoadModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Load Schedule</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Select your encrypted .json file and enter the password.</p>
              </div>
              <div className="p-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all mb-4"
                  placeholder="Password"
                />
                <div className={`transition-all ${!password ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">
                    {!password ? 'Enter password above to unlock file selection' : 'Select your backup file:'}
                  </label>
                  <input
                    type="file"
                    onChange={handleImport}
                    disabled={!password}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-blue-400 mb-4"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowLoadModal(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showQuickStart && (
          <QuickStartModal
            onClose={() => setShowQuickStart(false)}
            language={language}
          />
        )}
        {showWizard && (
          <Wizard
            step={wizardStep}
            steps={WIZARD_STEPS}
            onNext={handleWizardNext}
            onBack={handleWizardBack}
            onClose={handleWizardClose}
            language={language}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
