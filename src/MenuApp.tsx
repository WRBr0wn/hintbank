import { useState } from 'react'
import Menu from './screens/Menu'
import ThemeToggle from './components/ThemeToggle'
import HowToPlay from './components/HowToPlay'
import styles from './App.module.css'

// The bare / page: choose an edition. Its chrome (wordmark lockup, help, theme)
// comes from the shared App styles so the menu and game pages cannot drift.
export default function MenuApp() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className={styles.app}>
      <ThemeToggle />
      <button
        type="button"
        className={styles.help}
        onClick={() => setShowHelp(true)}
        aria-label="How to play"
        title="How to play"
      >
        ?
      </button>
      <header className={`${styles.header} ${styles.headerMenu}`}>
        <h1 className={styles.wordmark}>
          Hint <span className={styles.wordmarkAccent}>Bank</span>
        </h1>
        {/* The collection name: all editions together are Hint Bank Complete. */}
        <p className={styles.complete}>Complete</p>
      </header>
      <main className={styles.main}>
        <Menu />
      </main>

      {showHelp && <HowToPlay lead="overview" onClose={() => setShowHelp(false)} />}
    </div>
  )
}
