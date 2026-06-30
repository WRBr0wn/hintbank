import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import RandomizerMenu from './RandomizerMenu'

// Bare /randomizer/ entry: the edition selector that links out to each edition's
// own randomizer page.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RandomizerMenu />
  </StrictMode>,
)
