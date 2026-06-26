import styles from './Footer.module.css'

// Shared site footer for both the game and the standalone randomizer. Static
// content only, so it has no dependency on game state and themes through the CSS
// tokens like the rest of the app.
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.disclaimer}>
        Hint Bank: Pokémon Edition is an unofficial fan project, not affiliated with Nintendo, Game
        Freak, or The Pokémon Company. Pokémon names and sprites are property of their respective
        owners.
      </p>
      <p className={styles.line}>
        Pokémon sprites and data via{' '}
        <a className={styles.link} href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">
          PokéAPI
        </a>
        .
      </p>
      <p className={styles.credit}>
        Hint Bank · Pokémon Edition · A{' '}
        <a
          className={styles.link}
          href="https://discord.gg/DtzNtgwqjf"
          target="_blank"
          rel="noopener noreferrer"
        >
          ZenVolka
        </a>{' '}
        production
      </p>
    </footer>
  )
}
