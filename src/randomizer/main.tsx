import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import Randomizer from './Randomizer'

// Second Vite entry point. This page is a standalone tool with no link to the
// game app: it only draws Pokemon for the hinter to read aloud and type in.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Randomizer />
  </StrictMode>,
)
