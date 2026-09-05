// =====================================================================
//  Pack 한 벌을 **zip 바이트**로 (SPEC §5 `GET …/packs/{semver}/zip` · §6 `manual`)
//
//  ★ 왜 라이브러리가 아니라 여기인가 — 필요한 것은 zip 의 아주 작은 부분집합이다:
//    텍스트 파일 몇십 개를 **압축 없이(store)** 담는 것. 압축을 안 하는 이유는 둘이다.
//    ① Pack 은 전부 작은 Markdown 이라 압축이 아무것도 아끼지 않는다.
//    ② **같은 버전은 언제나 같은 바이트여야 한다** (P4 의 연장). deflate 는 라이브러리
//       버전이 바뀌면 바이트가 바뀔 수 있다. store 는 그럴 자리가 없다.
//
//  🔴 **시각을 여기서 만들지 않는다.** zip 은 항목마다 수정 시각을 담는데, 그걸 `now` 로
//     적으면 같은 버전을 두 번 받을 때 바이트가 달라진다. 시각은 **입력**으로 받고,
//     부르는 쪽은 Manifest 의 `generated_at` 을 준다 — 그 버전이 만들어진 순간이다.
//
//  ⚠ 여기는 **쓰기**만 있다. 읽는 쪽(풀기)은 제품에 없다 — zip 업로드(§11)는 아직
//    안 만들었고, 만들 때는 경로 검사·개수·용량 상한이 **먼저**다. 시험이 zip 을 되읽는
//    것은 `test/helpers/zip.ts` 다 (제품 코드에 넣지 않는다).
// =====================================================================

export type ZipEntry = { path: string; text: string }

/** CRC-32 (IEEE 802.3) 표 — zip 이 요구하는 유일한 검사합이다. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = (CRC_TABLE[(crc ^ (bytes[i] as number)) & 0xff] as number) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * zip 의 MS-DOS 시각 (2초 단위 · 1980년 기준). **UTC 로 읽는다** — 서버의 지역 시간대가
 * 바이트에 새어 들어가면 Vercel 과 노트북이 다른 zip 을 만든다.
 * ⚠ 1980 년 이전은 표현할 수 없다 — 그때는 1980-01-01 로 둔다 (zip 의 관례).
 */
export function dosDateTime(at: Date): { date: number; time: number } {
  const year = Math.max(at.getUTCFullYear(), 1980)
  const date = ((year - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate()
  const time = (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | (at.getUTCSeconds() >> 1)
  return { date: date & 0xffff, time: time & 0xffff }
}

const LOCAL_HEADER = 0x04034b50
const CENTRAL_HEADER = 0x02014b50
const END_OF_CENTRAL = 0x06054b50
/** 2.0 — store 만 쓰므로 그 위가 필요 없다. */
const VERSION_NEEDED = 20
/** 「이름이 UTF-8 이다」(bit 11). 한글 경로가 생겨도 풀 때 깨지지 않게. */
const FLAG_UTF8 = 0x0800
const METHOD_STORE = 0

function compareCodepoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * 항목들을 zip 한 덩어리로 만든다.
 * ★ 경로순으로 **여기서** 정렬한다 — 입력 순서가 바이트에 새는 자리를 하나로 줄인다.
 * ⚠ 같은 경로가 둘이면 던진다. 조용히 뒤의 것이 이기면 풀었을 때 무엇이 남는지 아무도 모른다.
 */
export function zipBytes(entries: readonly ZipEntry[], modifiedAt: Date): Uint8Array {
  const sorted = [...entries].sort((a, b) => compareCodepoints(a.path, b.path))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.path === sorted[i - 1]!.path) throw new Error(`zip 에 같은 경로가 둘이다: ${sorted[i]!.path}`)
  }
  const { date, time } = dosDateTime(modifiedAt)
  const encoder = new TextEncoder()

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of sorted) {
    const name = encoder.encode(entry.path)
    const body = encoder.encode(entry.text)
    const crc = crc32(body)

    const local = new DataView(new ArrayBuffer(30 + name.length))
    local.setUint32(0, LOCAL_HEADER, true)
    local.setUint16(4, VERSION_NEEDED, true)
    local.setUint16(6, FLAG_UTF8, true)
    local.setUint16(8, METHOD_STORE, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, body.length, true)
    local.setUint32(22, body.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    new Uint8Array(local.buffer).set(name, 30)

    const central = new DataView(new ArrayBuffer(46 + name.length))
    central.setUint32(0, CENTRAL_HEADER, true)
    central.setUint16(4, VERSION_NEEDED, true)
    central.setUint16(6, VERSION_NEEDED, true)
    central.setUint16(8, FLAG_UTF8, true)
    central.setUint16(10, METHOD_STORE, true)
    central.setUint16(12, time, true)
    central.setUint16(14, date, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, body.length, true)
    central.setUint32(24, body.length, true)
    central.setUint16(28, name.length, true)
    central.setUint16(30, 0, true)   // extra
    central.setUint16(32, 0, true)   // comment
    central.setUint16(34, 0, true)   // disk
    central.setUint16(36, 0, true)   // internal attrs
    central.setUint32(38, 0, true)   // external attrs — 권한을 안 적는다. 푸는 쪽 기본값이 맞다
    central.setUint32(42, offset, true)
    new Uint8Array(central.buffer).set(name, 46)

    locals.push(new Uint8Array(local.buffer), body)
    centrals.push(new Uint8Array(central.buffer))
    offset += local.byteLength + body.length
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, END_OF_CENTRAL, true)
  end.setUint16(4, 0, true)
  end.setUint16(6, 0, true)
  end.setUint16(8, sorted.length, true)
  end.setUint16(10, sorted.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)
  end.setUint16(20, 0, true)

  const total = offset + centralSize + 22
  const out = new Uint8Array(total)
  let at = 0
  for (const chunk of [...locals, ...centrals, new Uint8Array(end.buffer)]) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}
