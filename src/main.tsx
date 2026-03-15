import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { ConfirmProvider } from './hooks/useConfirm'
import App from './App'
import './index.css'

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement)
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
  } else {
    console.error('Main.tsx: Root element not found');
  }
} catch (e: any) {
  console.error('Main.tsx: Render failed', e)
  alert('Render failed: ' + e.message)
}
