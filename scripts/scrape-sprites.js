// Downloads the small front sprite for every National Dex entry from the PokeAPI
// sprites mirror into public/sprites/<dex>.png, and records the local path on
// each entry in pokemon.json. Static assets are bundled at build time, never
// hotlinked at runtime. Re-runnable: files already present are skipped, so a
// second run only fetches what's missing.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const MIRROR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const CONCURRENCY = 12

const here = dirname(fileURLToPath(import.meta.url))
const dataPath = join(here, '..', 'src', 'data', 'pokemon.json')
const spriteDir = join(here, '..', 'public', 'sprites')

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function fetchWithRetry(url, attempts = 3) {
  for (let a = 1; ; a++) {
    try {
      const res = await fetch(url)
      if (res.status === 404 || res.ok) return res
      throw new Error(`${res.status} ${res.statusText}`)
    } catch (err) {
      if (a >= attempts) throw new Error(`${url} failed after ${attempts} tries (${err.message})`)
      await new Promise((r) => setTimeout(r, 300 * a))
    }
  }
}

// Returns the stored public-relative path, or null if the mirror has no sprite.
async function getSprite(dex) {
  const file = join(spriteDir, `${dex}.png`)
  const rel = `sprites/${dex}.png`
  if (await exists(file)) return rel

  const res = await fetchWithRetry(`${MIRROR}/${dex}.png`)
  if (res.status === 404) return null

  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  return rel
}

async function main() {
  const pokemon = JSON.parse(await readFile(dataPath, 'utf8'))
  await mkdir(spriteDir, { recursive: true })

  let done = 0
  let missing = 0
  let cursor = 0

  async function worker() {
    while (cursor < pokemon.length) {
      const entry = pokemon[cursor++]
      const rel = await getSprite(entry.dexNumber)
      entry.sprite = rel
      if (rel === null) missing++
      if (++done % 100 === 0) console.log(`  ${done}/${pokemon.length}`)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  await writeFile(dataPath, JSON.stringify(pokemon, null, 2) + '\n')
  console.log(`sprites: ${pokemon.length - missing} saved, ${missing} missing -> ${spriteDir}`)
}

main().catch((err) => {
  console.error(`sprite scrape failed: ${err.message}`)
  process.exit(1)
})
