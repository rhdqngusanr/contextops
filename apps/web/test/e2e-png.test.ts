import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

import { decodePng, pixelDiff } from '../e2e/png'

// =====================================================================
//  「같은 그림인가」를 **바이트가 아니라 픽셀로** 답하는지 잠근다 (FINDINGS 161)
//
//  ★ 왜 이 시험인가 — `shotcopy` 는 이 답을 보고 캡처를 옮길지 정한다. 이 함수가
//    바이트를 견주는 것으로 조용히 되돌아가면, 그림이 그대로인 바퀴에도 캡처가
//    옮겨져 **코드와 무관한 diff** 가 매 관통마다 커밋에 섞인다. 그게 161 이 잰 상태다.
//    그래서 **같은 픽셀을 일부러 다른 바이트로 인코딩해** 놓고 0 을 요구한다.
//
//  ★ 왜 인코더가 여기 있나 — 제품에도 관통에도 PNG 를 **쓰는** 쪽이 없다 (Chrome 이
//    쓴다). 재료를 만드는 자라 시험 안에 둔다 — `e2e/png.ts` 에 두면 아무도 안 부르는
//    함수가 하나 생긴다.
// =====================================================================

let crcTable: number[] | null = null
function crc32(buf: Buffer): number {
  if (crcTable === null) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length)
  return out
}

type EncodeOptions = { level?: number; filter?: number; color?: number; depth?: number; interlace?: number }

/** RGB 8비트 PNG 하나. `level`·`filter` 를 바꾸면 **같은 픽셀이 다른 바이트**가 된다. */
function encodePng(width: number, height: number, rgb: Buffer, opts: EncodeOptions = {}): Buffer {
  const { level = 9, filter = 0, color = 2, depth = 8, interlace = 0 } = opts
  const stride = width * 3
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = filter
    if (filter === 0) {
      rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
    } else {
      //  Sub 필터 — 왼쪽 픽셀과의 차를 적는다. 푼 결과는 같아야 한다.
      for (let x = 0; x < stride; x++) {
        const left = x >= 3 ? rgb[y * stride + x - 3]! : 0
        raw[y * (stride + 1) + 1 + x] = (rgb[y * stride + x]! - left) & 0xff
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = depth
  ihdr[9] = color
  ihdr[12] = interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** 가로줄마다 색이 도는 8x6 그림 — 필터가 실제로 일을 하도록 옆 픽셀이 다르다. */
function stripes(width: number, height: number): Buffer {
  const px = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      px[(y * width + x) * 3] = (x * 31 + y * 7) & 0xff
      px[(y * width + x) * 3 + 1] = (x * 11) & 0xff
      px[(y * width + x) * 3 + 2] = (y * 53) & 0xff
    }
  }
  return px
}

describe('e2e/png — 캡처를 그림으로 견준다 (FINDINGS 161)', () => {
  const W = 8
  const H = 6
  const base = stripes(W, H)

  it('🔴 **바이트가 달라도 픽셀이 같으면 0 이다** — 이 시험이 `shotcopy` 의 전제다', () => {
    const a = encodePng(W, H, base, { level: 9, filter: 0 })
    const b = encodePng(W, H, base, { level: 1, filter: 1 })
    //  전제: 두 파일은 실제로 **다른 바이트**다. 같으면 이 시험이 아무것도 안 잰다.
    expect(a.equals(b)).toBe(false)

    const diff = pixelDiff(decodePng(a), decodePng(b))
    expect(diff).toEqual({ changed: 0, total: W * H, rows: null })
  })

  it('🔴 한 픽셀만 달라도 잡고, 어느 줄인지 말한다', () => {
    const changed = Buffer.from(base)
    //  (3, 2) 의 초록 채널 하나만 뒤집는다.
    const at = (2 * W + 3) * 3 + 1
    changed[at] = changed[at]! ^ 0xff

    const diff = pixelDiff(decodePng(encodePng(W, H, base)), decodePng(encodePng(W, H, changed)))
    expect(diff.changed).toBe(1)
    expect(diff.rows).toEqual([2, 2])
  })

  it('🔴 필터 다섯 갈래를 다 풀어도 같은 픽셀이 나온다', () => {
    //  ⚠ Chrome 은 줄마다 다른 필터를 고른다. 하나라도 잘못 풀면 「매번 다른 그림」이
    //    되어 이 자가 영원히 「달라졌다」고 답한다 — 그러면 161 이 도로 열린다.
    const rows: number[] = [0, 1, 2, 3, 4]
    const stride = W * 3
    const raw = Buffer.alloc(rows.length * (stride + 1))
    const want = Buffer.alloc(rows.length * stride)
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < stride; x++) {
        const left = x >= 3 ? want[y * stride + x - 3]! : 0
        const up = y > 0 ? want[(y - 1) * stride + x]! : 0
        const upLeft = y > 0 && x >= 3 ? want[(y - 1) * stride + x - 3]! : 0
        const delta = (x * 7 + y * 13) & 0xff
        raw[y * (stride + 1) + 1 + x] = delta
        const f = rows[y]!
        const paeth = (): number => {
          const p = left + up - upLeft
          const dl = Math.abs(p - left); const du = Math.abs(p - up); const dul = Math.abs(p - upLeft)
          return dl <= du && dl <= dul ? left : du <= dul ? up : upLeft
        }
        const add = f === 1 ? left : f === 2 ? up : f === 3 ? (left + up) >> 1 : f === 4 ? paeth() : 0
        want[y * stride + x] = (delta + add) & 0xff
      }
      raw[y * (stride + 1)] = rows[y]!
    }
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', (() => {
        const h = Buffer.alloc(13)
        h.writeUInt32BE(W, 0); h.writeUInt32BE(rows.length, 4); h[8] = 8; h[9] = 2
        return h
      })()),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ])
    expect(decodePng(png).pixels.equals(want)).toBe(true)
  })

  it('🔴 크기가 다르면 **던진다** — 「전부 달라졌다」로 답하지 않는다', () => {
    const a = decodePng(encodePng(W, H, base))
    const b = decodePng(encodePng(W, H - 1, stripes(W, H - 1)))
    expect(() => pixelDiff(a, b)).toThrow(/크기가 다르다/)
  })

  it('🔴 안 읽는 모양은 **던진다** — 조용히 「안 달라졌다」로 답하지 않는다', () => {
    //  ⚠ 이게 없으면 캡처 형식이 바뀐 날 `shotcopy` 가 아무것도 안 옮기면서 초록이다.
    expect(() => decodePng(encodePng(W, H, base, { interlace: 1 }))).toThrow(/안 읽는 모양/)
    expect(() => decodePng(encodePng(W, H, base, { color: 3 }))).toThrow(/안 읽는 모양/)
    expect(() => decodePng(Buffer.from('not a png at all'))).toThrow(/PNG 가 아니다/)
  })
})
