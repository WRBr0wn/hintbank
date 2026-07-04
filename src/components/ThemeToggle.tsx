import { useState } from 'react'
import { getTheme, toggleTheme, type Theme } from '../theme'
import styles from './ThemeToggle.module.css'

// Used by both the game and the standalone randomizer, so it depends only on the
// theme helper, nothing game-specific.
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setThemeState(toggleTheme())}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
