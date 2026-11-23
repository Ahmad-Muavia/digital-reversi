/**
 * Lightweight, offline pre-release documentation/configuration audit.
 * It does NOT replace npm tests, browser checks, or manual user studies.
 * Usage: node scripts/release-audit.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export function auditRepository(repo) {
  const findings = []
  const requiredFiles = [
    'README.md',
    'package.json',
    '.github/workflows/ci.yml',
    'docs/D3_TRACEABILITY.md',
    'docs/TESTING.md',
    'e2e/browser-check.mjs',
  ]
  for (const file of requiredFiles) {
    if (!existsSync(resolve(repo, file))) findings.push(`Missing required release file: ${file}`)
  }

  const packagePath = resolve(repo, 'package.json')
  if (existsSync(packagePath)) {
    let pkg
    try {
      pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
    } catch {
      findings.push('package.json is not valid JSON')
    }
    if (pkg) {
      for (const script of ['test', 'lint', 'build', 'test:e2e']) {
        if (typeof pkg.scripts?.[script] !== 'string' || !pkg.scripts[script].trim()) {
          findings.push(`Missing package script: ${script}`)
        }
      }
      if (!pkg.engines?.node) findings.push('Node.js engine requirement is not documented')
    }
  }

  const traceability = resolve(repo, 'docs/D3_TRACEABILITY.md')
  if (existsSync(traceability)) {
    const text = readFileSync(traceability, 'utf8')
    for (let number = 1; number <= 10; number++) {
      const label = `NFR${String(number).padStart(2, '0')}`
      if (!text.includes(label)) findings.push(`Traceability missing ${label}`)
    }
  }

  return findings
}

const ranAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (ranAsScript) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const findings = auditRepository(repo)
  if (findings.length) {
    for (const finding of findings) console.error(`FAIL ${finding}`)
    process.exitCode = 1
  } else {
    console.log('PASS Offline release file/configuration audit')
    console.log('NEXT Run npm test, npm run lint, npm run build and browser checks separately.')
  }
}
