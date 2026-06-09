import React from 'react'
import ReactDOM from 'react-dom/client'
import 'antd/dist/reset.css'
import './styles/app.css'
import App from './App'
import { AppToastProvider } from './components/AppToastProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppToastProvider>
      <App />
    </AppToastProvider>
  </React.StrictMode>
)
