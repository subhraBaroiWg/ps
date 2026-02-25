import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import UploaderApp from './UploaderApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UploaderApp />
  </StrictMode>,
)
