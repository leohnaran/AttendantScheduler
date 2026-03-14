import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { ConfirmProvider } from './hooks/useConfirm.jsx'
import App from './App.jsx'
import './index.css'

try {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(
    <ConfirmProvider>
      <App />
      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white',
          duration: 4000
        }}
      />
    </ConfirmProvider>
  )
} catch (e) {
  console.error('Main.jsx: Render failed', e)
  alert('Render failed: ' + e.message)
}
