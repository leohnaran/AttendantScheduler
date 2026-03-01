import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

try {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(
    <App />
  )
} catch (e) {
  console.error('Main.jsx: Render failed', e)
  alert('Render failed: ' + e.message)
}
