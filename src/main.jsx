import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('Main.jsx: Initializing React...')
try {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  console.log('Main.jsx: Root created')
  root.render(
    <App />
  )
  console.log('Main.jsx: Render called')
} catch (e) {
  console.error('Main.jsx: Render failed', e)
  alert('Render failed: ' + e.message)
}
