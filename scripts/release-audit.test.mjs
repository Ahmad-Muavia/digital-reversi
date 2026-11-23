import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { auditRepository } from './release-audit.mjs'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'reversi-release-audit-'))
  const required = [
    'README.md', '.github/workflows/ci.yml', 'docs/D3_TRACEABILITY.md',
    'docs/TESTING.md', 'e2e/browser-check.mjs',
  ]
  for (const path of required) {
    const target = join(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, path.includes('D3_TRACEABILITY') ?
      Array.from({ length: 10 }, (_, i) => `NFR${String(i + 1).padStart(2, '0')}`).join('\n') : 'fixture')
  }
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    engines: { node: '>=22' },
    scripts: { test: 'vitest run', lint: 'oxlint', build: 'vite build', 'test:e2e': 'node e2e/browser-check.mjs' },
  }))
  return root
}

test('complete repository passes the offline release audit', () => {
  const root = fixture()
  try { assert.deepEqual(auditRepository(root), []) }
  finally { rmSync(root, { recursive: true, force: true }) }
})

test('missing script and NFR are reported explicitly', () => {
  const root = fixture()
  try {
    const pkgPath = join(root, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    delete pkg.scripts['test:e2e']
    writeFileSync(pkgPath, JSON.stringify(pkg))
    writeFileSync(join(root, 'docs/D3_TRACEABILITY.md'), 'NFR01')
    const findings = auditRepository(root)
    assert.ok(findings.includes('Missing package script: test:e2e'))
    assert.ok(findings.includes('Traceability missing NFR02'))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

