import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

console.log('%c[boot] App mounting', 'color: #FF7A1A; font-weight: bold')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
