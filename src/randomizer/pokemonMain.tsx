import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import Randomizer from './Randomizer'

// Pokemon randomizer entry. The edition is fixed by which page this is and passed
// into the shared Randomizer component. A new edition adds its own entry like this.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Randomizer editionId="pokemon" />
  </StrictMode>,
)
