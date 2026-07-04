import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import RandomizerMenu from './RandomizerMenu'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RandomizerMenu />
  </StrictMode>,
)
