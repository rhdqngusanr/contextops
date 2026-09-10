import { explain } from '../lib/web/jargon'

/** 「낱말 풀이」 한 줄 — 글자 안의 개발자 낱말을 사람 말로. 없으면 아무것도 안 그린다 (정본 `lib/web/jargon.ts`). */
export function Jargon({ text }: { text: string }) {
  const hits = explain(text)
  if (hits.length === 0) return null
  return (
    <p className="key-line jargon">
      <span className="key">낱말 풀이</span>
      {hits.map((h, i) => (
        <span key={h.term}>{i > 0 ? ', ' : ''}<b>{h.term}</b> = {h.means}</span>
      ))}
    </p>
  )
}
