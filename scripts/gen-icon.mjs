import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const SIZE = 512
const px = Buffer.alloc(SIZE * SIZE * 4)

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }
function lerp(a, b, t) { return a + (b - a) * t }

function inRoundedRect(x, y, x0, y0, w, h, r) {
  if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return false
  const cx = clamp(x, x0 + r, x0 + w - r)
  const cy = clamp(y, y0 + r, y0 + h - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    if (inRoundedRect(x, y, 8, 8, SIZE - 16, SIZE - 16, 112)) {
      const t = y / SIZE
      r = lerp(20, 13, t)
      g = lerp(24, 16, t)
      b = lerp(34, 22, t)
      a = 255
    }
    const dxc = x - 256
    const dyc = y - 252
    const d = Math.sqrt(dxc * dxc + dyc * dyc)
    if (d < 175) {
      const tt = d / 175
      const soft = clamp((175 - d) / 12, 0, 1)
      const cr = lerp(93, 47, tt)
      const cg = lerp(122, 71, tt)
      const cb = lerp(255, 254, tt)
      const alpha = soft * 255
      const ia = alpha / 255
      r = Math.round(lerp(r, cr, ia))
      g = Math.round(lerp(g, cg, ia))
      b = Math.round(lerp(b, cb, ia))
      a = 255
    }
    if (inRoundedRect(x, y, 156, 148, 200, 176, 46)) {
      r = 255
      g = 255
      b = 255
      a = 255
    }
    const bars = [
      [200, 232, 30, 52],
      [241, 210, 30, 96],
      [282, 226, 30, 64]
    ]
    for (const bar of bars) {
      const bx = bar[0]
      const by = bar[1]
      const bw = bar[2]
      const bh = bar[3]
      if (inRoundedRect(x, y, bx, by, bw, bh, 14)) {
        r = 59
        g = 76
        b = 224
        a = 255
      }
    }
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }
}

const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[n] = c
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

const raw = Buffer.alloc(SIZE * (1 + SIZE * 4))
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (1 + SIZE * 4)
  raw[rowStart] = 0
  px.copy(raw, rowStart + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8
ihdr[9] = 6
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

mkdirSync(join(root, 'build'), { recursive: true })
writeFileSync(join(root, 'build', 'icon.png'), png)
console.log('icon.png written, bytes = ' + png.length)
