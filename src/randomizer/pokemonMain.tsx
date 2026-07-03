import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import Randomizer from './Randomizer'

// The edition is fixed by which HTML page this entry belongs to.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Randomizer editionId="pokemon" />
  </StrictMode>,
)
