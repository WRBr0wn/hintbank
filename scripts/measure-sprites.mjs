// One-off measuring tool, not a build step: reads every sprite referenced by
// pokemon.json, finds the artwork's non-transparent bounding box via the alpha
// channel, and writes it back as each entry's "box": [x, y, w, h] (pixels on
// the 96x96 canvas). The result is part of the hand-owned data; re-run only if
// sprite files change. Usage: node scripts/measure-sprites.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = resolve(root, 'src/editions/pokemon/data/pokemon.json')

// Minimal PNG reader: enough for the sprite set (8-bit, non-interlaced), loud
// about anything else. Returns width, height, and an alpha lookup.
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
  let pos = 8
  let ihdr = null
  let palette = null
  let trns = null
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      }
    } else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  if (!ihdr) throw new Error('no IHDR')
  if (ihdr.interlace !== 0) throw new Error('interlaced PNG unsupported')
  const { width, height, bitDepth, colorType } = ihdr
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (channels === undefined) throw new Error(`color type ${colorType} unsupported`)
  if (colorType === 3 ? ![1, 2, 4, 8].includes(bitDepth) : bitDepth !== 8)
    throw new Error(`bit depth ${bitDepth} unsupported for color type ${colorType}`)

  const raw = inflateSync(Buffer.concat(idat))
  const bytesPerLine = Math.ceil((width * channels * bitDepth) / 8)
  const bpp = Math.max(1, (channels * bitDepth) / 8)
  const lines = Buffer.alloc(bytesPerLine * height)
  let src = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[src++]
    const row = y * bytesPerLine
    const prev = row - bytesPerLine
    for (let i = 0; i < bytesPerLine; i++) {
      const x = raw[src + i]
      const a = i >= bpp ? lines[row + i - bpp] : 0
      const b = y > 0 ? lines[prev + i] : 0
      const c = y > 0 && i >= bpp ? lines[prev + i - bpp] : 0
      let v
      if (filter === 0) v = x
      else if (filter === 1) v = x + a
      else if (filter === 2) v = x + b
      else if (filter === 3) v = x + ((a + b) >> 1)
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      } else throw new Error(`filter ${filter} unsupported`)
      lines[row + i] = v & 0xff
    }
    src += bytesPerLine
  }

  function alphaAt(x, y) {
    const row = y * bytesPerLine
    if (colorType === 6) return lines[row + x * 4 + 3]
    if (colorType === 4) return lines[row + x * 2 + 1]
    if (colorType === 3) {
      const perByte = 8 / bitDepth
      const byte = lines[row + Math.floor(x / perByte)]
      const shift = (perByte - 1 - (x % perByte)) * bitDepth
      const index = (byte >> shift) & ((1 << bitDepth) - 1)
      return trns && index < trns.length ? trns[index] : 255
    }
    return 255 // color types 0 and 2 have no alpha
  }
  void palette
  return { width, height, alphaAt }
}

function contentBox(png) {
  let minX = png.width
  let minY = png.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.alphaAt(x, y) === 0) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null // fully transparent
  return [minX, minY, maxX - minX + 1, maxY - minY + 1]
}

const entries = JSON.parse(readFileSync(dataPath, 'utf8'))
const problems = []
const extents = []
for (const entry of entries) {
  const file = resolve(root, 'public', entry.sprite)
  let png
  try {
    png = decodePng(readFileSync(file))
  } catch (err) {
    problems.push(`${entry.sprite}: ${err.message}`)
    continue
  }
  if (png.width !== 96 || png.height !== 96) {
    problems.push(`${entry.sprite}: canvas ${png.width}x${png.height}, expected 96x96`)
    continue
  }
  const box = contentBox(png)
  if (!box) {
    problems.push(`${entry.sprite}: fully transparent`)
    continue
  }
  entry.box = box
  extents.push({ name: entry.displayName, extent: Math.max(box[2], box[3]) })
}

if (problems.length > 0) {
  console.error(`${problems.length} sprite(s) not measured:`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

// Keep the file's hand-owned style: 2-space indent, number arrays inline.
const json = JSON.stringify(entries, null, 2).replace(/\[\s+([\d\s,]+?)\s+\]/g, (_, inner) =>
  `[${inner.split(',').map((s) => s.trim()).join(', ')}]`,
)
writeFileSync(dataPath, json + '\n')

extents.sort((a, b) => a.extent - b.extent)
const min = extents[0]
const max = extents[extents.length - 1]
console.log(`measured ${extents.length} sprites`)
console.log(`smallest: ${extents.slice(0, 5).map((e) => `${e.name} (${e.extent}px)`).join(', ')}`)
console.log(`largest: ${max.name} (${max.extent}px), min ${min.extent}px`)
