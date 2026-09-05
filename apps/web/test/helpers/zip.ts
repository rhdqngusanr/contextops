import { crc32 } from '../../src/lib/api/zip'

// =====================================================================
//  zip 을 **되읽는** 시험용 문 — 제품에는 읽는 코드가 없다 (`src/lib/api/zip.ts` 머리말).
//
//  ★ 왜 쓰는 코드로 되읽지 않나 — 같은 사람이 쓴 쓰기와 읽기는 같은 오해를 공유한다.
//    여기는 zip 규격(APPNOTE)의 central directory 를 **끝에서부터** 따라가고, 각 항목의
//    CRC 를 다시 재서 본문과 대조한다. 독립된 도구(`unzip -l`)로도 한 번 열어 봤다 —
//    docs/evidence/2026-09-06-zip/.
// =====================================================================

export type ZipListed = { path: string; text: string; crcOk: boolean; date: number; time: number; method: number }

const END_OF_CENTRAL = 0x06054b50
const CENTRAL_HEADER = 0x02014b50
const LOCAL_HEADER = 0x04034b50

export function listZip(bytes: Uint8Array): ZipListed[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  //  EOCD 는 마지막 22바이트다 (주석이 없을 때). 우리는 주석을 안 쓴다.
  const eocd = bytes.length - 22
  if (eocd < 0 || view.getUint32(eocd, true) !== END_OF_CENTRAL) throw new Error('EOCD 가 없다')
  const count = view.getUint16(eocd + 10, true)
  let at = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const out: ZipListed[] = []

  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== CENTRAL_HEADER) throw new Error(`central header 가 아니다 @${at}`)
    const method = view.getUint16(at + 10, true)
    const time = view.getUint16(at + 12, true)
    const date = view.getUint16(at + 14, true)
    const crc = view.getUint32(at + 16, true)
    const size = view.getUint32(at + 20, true)
    const nameLen = view.getUint16(at + 28, true)
    const extraLen = view.getUint16(at + 30, true)
    const commentLen = view.getUint16(at + 32, true)
    const local = view.getUint32(at + 42, true)
    const path = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen))

    if (view.getUint32(local, true) !== LOCAL_HEADER) throw new Error(`local header 가 아니다 @${local}`)
    const localNameLen = view.getUint16(local + 26, true)
    const localExtraLen = view.getUint16(local + 28, true)
    const start = local + 30 + localNameLen + localExtraLen
    const body = bytes.subarray(start, start + size)

    out.push({ path, text: decoder.decode(body), crcOk: crc32(body) === crc, date, time, method })
    at += 46 + nameLen + extraLen + commentLen
  }
  return out
}
