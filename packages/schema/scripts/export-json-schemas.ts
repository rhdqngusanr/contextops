import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSON_SCHEMA_FILES, toJsonSchemaText, type JsonSchemaName } from '../src/json-schema'
import { SCHEMA_OUT_DIR } from './out-dir'

// 산출기. 값은 여기 적지 마라 — 무엇을 내보낼지는 src/json-schema.ts 의 표가 정한다.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const outDir = join(root, SCHEMA_OUT_DIR)
mkdirSync(outDir, { recursive: true })

for (const name of Object.keys(JSON_SCHEMA_FILES) as JsonSchemaName[]) {
  // LF 고정 — .gitattributes 가 저장소 안을 LF 하나로 잡는다.
  writeFileSync(join(outDir, `${name}.json`), toJsonSchemaText(name), 'utf8')
  process.stdout.write(`  ${SCHEMA_OUT_DIR}/${name}.json\n`)
}
