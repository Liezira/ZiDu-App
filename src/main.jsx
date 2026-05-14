import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { NavigationProgress } from './components/shared/NavigationProgress.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NavigationProgress />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)