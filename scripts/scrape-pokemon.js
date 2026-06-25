// Builds src/data/pokemon.json from the PokeAPI GitHub mirror.
// The live pokeapi.co API isn't reachable from the build environment, so this
// reads the committed CSV data instead: species id is the National Dex number,
// identifier is the name. Re-runnable. Overwrites the JSON in place.

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SPECIES_CSV =
  'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv'

const here = dirname(fileURLToPath(import.meta.url))
const outPath = join(here, '..', 'src', 'data', 'pokemon.json')

async function fetchText(url) {
  let res
  try {
    res = await fetch(url)
  } catch (err) {
    throw new Error(`could not reach ${url} (${err.message})`)
  }
  if (!res.ok) {
    throw new Error(`${url} returned ${res.status} ${res.statusText}`)
  }
  return res.text()
}

function parseSpecies(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line !== '')
  if (lines.length < 2) {
    throw new Error('species CSV looks empty or malformed')
  }

  const out = []
  for (const line of lines.slice(1)) {
    const [id, identifier] = line.split(',')
    const dexNumber = Number(id)
    if (!Number.isInteger(dexNumber) || !identifier) {
      throw new Error(`unexpected CSV row: ${line}`)
    }
    out.push({
      name: identifier,
      dexNumber,
      sprite: null, // populated later from the sprites mirror, keyed on dexNumber
    })
  }

  out.sort((a, b) => a.dexNumber - b.dexNumber)
  return out
}

async function main() {
  const csv = await fetchText(SPECIES_CSV)
  const pokemon = parseSpecies(csv)

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(pokemon, null, 2) + '\n')

  console.log(`wrote ${pokemon.length} species to ${outPath}`)
}

main().catch((err) => {
  console.error(`scrape failed: ${err.message}`)
  process.exit(1)
})
