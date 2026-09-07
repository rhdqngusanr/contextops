// =====================================================================
//  PNG 를 **그림으로** 읽는다 — 바이트가 아니라 픽셀을 견주기 위해 (FINDINGS 161)
//
//  ★ 왜 이 파일이 있나 — 관통이 찍은 캡처를 `public/shots/` 로 **무조건** 옮기면,
//    그림이 한 픽셀도 안 달라진 바퀴에도 파일 바이트가 달라져 워킹트리가 더러워질 수
//    있다. 「같은 그림인가」의 답은 파일 바이트가 아니라 **픽셀**이다.
//
//  ★ 왜 라이브러리를 안 쓰나 — 여기 필요한 것은 **Chrome 이 찍은 PNG 한 종류**
//    (8비트 · 인터레이스 없음 · RGB/RGBA)뿐이다. 그 밖의 모양은 **던진다** —
//    조용히 「안 달라졌다」로 답하면 이 검사가 아무 말도 안 하는 검사가 된다.
//
//  ⚠ 여기는 `e2e/` 다 — 제품 코드가 아니라 관통이 쓰는 자다. 배포되는 번들에 안 들어간다.
// =====================================================================

import { inflateSync } from 'node:zlib'

export type Png = {
  readonly width: number
  readonly height: number
  /** 픽셀당 바이트 수 (RGB 3 · RGBA 4) */
  readonly channels: number
  /** 필터를 푼 원본 픽셀 — 길이는 `width * height * channels` */
  readonly pixels: Buffer
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** 색 종류 → 픽셀당 채널 수. **여기 없는 종류는 안 읽는다** (팔레트·회색조). */
const CHANNELS: Record<number, number> = { 2: 3, 6: 4 }

/**
 * PNG 바이트 → 픽셀.
 * ⚠ 8비트·인터레이스 없음·RGB(2)/RGBA(6) 만 읽는다. 나머지는 **던진다.**
 */
export function decodePng(bytes: Buffer): Png {
  if (!bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error('[png] PNG 가 아니다')

  let header: { width: number; height: number; depth: number; color: number; interlace: number } | null = null
  const idat: Buffer[] = []
  let off = 8
  while (off + 8 <= bytes.length) {
    const len = bytes.readUInt32BE(off)
    const type = bytes.toString('ascii', off + 4, off + 8)
    const data = bytes.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8]!, color: data[9]!, interlace: data[12]!,
      }
    }
    if (type === 'IDAT') idat.push(data)
    off += 12 + len
    if (type === 'IEND') break
  }
  if (!header) throw new Error('[png] IHDR 이 없다')

  const channels = CHANNELS[header.color]
  if (header.depth !== 8 || header.interlace !== 0 || channels === undefined) {
    throw new Error(`[png] 안 읽는 모양이다 — depth ${header.depth} · color ${header.color} · interlace ${header.interlace}`)
  }

  const stride = header.width * channels
  const raw = inflateSync(Buffer.concat(idat))
  if (raw.length !== header.height * (stride + 1)) {
    throw new Error(`[png] 픽셀 길이가 안 맞는다 — ${raw.length} vs ${header.height * (stride + 1)}`)
  }

  //  필터를 푼다 (PNG 명세 9.2 — None·Sub·Up·Average·Paeth).
  const pixels = Buffer.alloc(header.height * stride)
  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)]!
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const rowAt = y * stride
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[rowAt + x - channels]! : 0
      const up = y > 0 ? pixels[rowAt - stride + x]! : 0
      const upLeft = y > 0 && x >= channels ? pixels[rowAt - stride + x - channels]! : 0
      let v = line[x]!
      if (filter === 1) v += left
      else if (filter === 2) v += up
      else if (filter === 3) v += (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - upLeft
        const dl = Math.abs(p - left); const du = Math.abs(p - up); const dul = Math.abs(p - upLeft)
        v += dl <= du && dl <= dul ? left : du <= dul ? up : upLeft
      } else if (filter !== 0) throw new Error(`[png] 모르는 필터 ${filter}`)
      pixels[rowAt + x] = v & 0xff
    }
  }
  return { width: header.width, height: header.height, channels, pixels }
}

export type PixelDiff = {
  /** 한 채널이라도 다른 픽셀의 수 */
  readonly changed: number
  readonly total: number
  /** 달라진 첫 줄과 마지막 줄 (안 달라졌으면 `null`) — 「어디가 달라졌나」를 사람이 찾는 실마리 */
  readonly rows: readonly [number, number] | null
}

/**
 * 두 그림이 **픽셀로** 얼마나 다른가.
 * ⚠ 크기가 다르면 **던진다** — 「전부 달라졌다」로 답하면 화면 크기가 바뀐 것과
 *   내용이 바뀐 것을 같은 수로 말하게 된다.
 */
export function pixelDiff(a: Png, b: Png): PixelDiff {
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) {
    throw new Error(`[png] 크기가 다르다 — ${a.width}x${a.height}/${a.channels} vs ${b.width}x${b.height}/${b.channels}`)
  }
  const stride = a.width * a.channels
  let changed = 0
  let first = -1
  let last = -1
  for (let y = 0; y < a.height; y++) {
    let row = 0
    for (let x = 0; x < stride; x += a.channels) {
      for (let k = 0; k < a.channels; k++) {
        if (a.pixels[y * stride + x + k] !== b.pixels[y * stride + x + k]) { row++; break }
      }
    }
    if (row > 0) {
      changed += row
      if (first < 0) first = y
      last = y
    }
  }
  return { changed, total: a.width * a.height, rows: first < 0 ? null : [first, last] }
}
