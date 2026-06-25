// Theme state lives on <html data-theme>, which the CSS tokens in index.css key
// off. An inline script in each HTML head sets it before paint (no flash), and
// this module is what the toggle uses to read and change it at runtime.
export type Theme = 'dark' | 'light'

const KEY = 'hintbank-theme'

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private mode or storage disabled: the choice just will not persist.
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
