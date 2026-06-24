import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Hint Bank</h1>
        <p className={styles.edition}>Pokémon Edition</p>
      </header>
      <main className={styles.main}>
        <p className={styles.placeholder}>Setup screen coming soon.</p>
      </main>
    </div>
  )
}
