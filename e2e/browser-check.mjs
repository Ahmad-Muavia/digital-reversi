/**
 * Real-browser end-to-end check of Digital Reversi.
 *
 * Starts headless Chrome (or Edge) with a throwaway profile, drives the game
 * through the Chrome DevTools Protocol and prints PASS/FAIL for each check:
 * a two-player game, keyboard play, Help, a full game against Hard (AI in a
 * Web Worker), phone-width layout, and no console errors or failed requests.
 *
 * Usage:
 *   npm run build && npm run preview          # serves on http://localhost:4173
 *   npm run test:e2e -- http://localhost:4173/ [screenshotDir]
 *   npm run test:e2e -- https://ahmad-muavia.github.io/digital-reversi/
 *
 * Set CHROME_PATH if Chrome/Edge is not in a standard location.
 * Needs Node 22+ (built-in fetch and WebSocket). Exit code 1 if any check fails.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, outDir] = process.argv.slice(2)
if (!url) {
  console.error('Usage: npm run test:e2e -- <url> [screenshotDir]')
  process.exit(2)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
  const found = candidates.find((p) => p && existsSync(p))
  if (!found) throw new Error('Chrome/Edge not found; set CHROME_PATH')
  return found
}

// Port 0 lets the browser pick a free port; it writes it to DevToolsActivePort.
const profile = mkdtempSync(join(tmpdir(), 'reversi-e2e-'))
const browser = spawn(
  findBrowser(),
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: 'ignore' },
)
const browserExited = new Promise((resolve) => browser.once('exit', resolve))
let cleanedUp = false
/** Last resort (e.g. on a crash): kill the whole process tree synchronously. */
function cleanup() {
  if (cleanedUp) return
  cleanedUp = true
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(browser.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    browser.kill('SIGKILL')
  }
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  } catch {
    /* temp folder; the OS will clear it */
  }
}
process.on('exit', cleanup)

/**
 * Normal shutdown: ask the browser to quit through the DevTools Protocol, which
 * ends all of its processes (killing only the launched process can leave Edge's
 * helpers running), then remove the profile.
 */
async function closeBrowser() {
  try {
    const [port, path] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)
    const bws = new WebSocket(`ws://127.0.0.1:${port.trim()}${path.trim()}`)
    await new Promise((r, j) => {
      bws.addEventListener('open', r, { once: true })
      bws.addEventListener('error', j, { once: true })
    })
    bws.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
    await Promise.race([browserExited, sleep(5000)])
  } catch {
    /* fall through to the forced cleanup */
  }
  await sleep(300) // the profile can stay locked briefly after exit
  cleanup()
}

async function getPageWs() {
  for (let i = 0; i < 100; i++) {
    try {
      const port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0].trim()
      const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
      return (await res.json()).webSocketDebuggerUrl
    } catch {
      await sleep(200)
    }
  }
  throw new Error('browser did not start')
}

if (outDir) mkdirSync(outDir, { recursive: true })
const ws = new WebSocket(await getPageWs())
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pending = new Map()
const consoleErrors = []
const exceptions = []
const failedRequests = []
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(JSON.stringify(msg.error)))
    else resolve(msg.result)
  } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '))
  } else if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    consoleErrors.push(`[log] ${msg.params.entry.text} ${msg.params.entry.url ?? ''}`)
  } else if (msg.method === 'Network.loadingFailed') {
    failedRequests.push(msg.params.errorText)
  } else if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
    failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`)
  }
})
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id
    pending.set(i, { resolve, reject })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.exception?.description}`)
  return r.result.value
}
const waitFor = async (expr, ms = 15000, label = expr) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await evaluate(expr)) return
    await sleep(100)
  }
  throw new Error(`timeout waiting for: ${label}`)
}
const shot = async (name) => {
  if (!outDir) return
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(data, 'base64'))
}
const setViewport = (width, height, mobile = false) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })

// In-page helpers
const HELPERS = `
window.__q = (role, name) => [...document.querySelectorAll(role)].find(e => (e.getAttribute('aria-label') ?? e.textContent).trim().startsWith(name));
window.__btn = (name) => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') ?? b.textContent).trim() === name || (b.getAttribute('aria-label') ?? '').startsWith(name + ','));
window.__status = () => document.querySelector('[role=status]')?.textContent ?? '';
window.__legal = () => [...document.querySelectorAll('button[aria-label*="legal move"]')];
window.__setInput = (el, value) => {
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
};
window.__label = (text) => { const l = [...document.querySelectorAll('label')].find(l => l.textContent.includes(text)); return l?.htmlFor ? document.getElementById(l.htmlFor) : l?.querySelector('input,select'); };
true`

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')
await send('Page.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
await setViewport(1280, 1000)

async function load() {
  await send('Page.navigate', { url })
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('h1')`, 20000, 'page load')
  await evaluate(HELPERS)
}

// ---------- 1. Page loads ----------
await load()
check('page loads with title', (await evaluate('document.title')) === 'Digital Reversi')
check('landing page with opening board preview', await evaluate(`!!document.querySelector('h1') && document.querySelectorAll('[role=grid] [data-testid=disc]').length === 4`))
await evaluate(`__btn('Start game').click(); true`)
await waitFor(`!!document.querySelector('form[aria-labelledby=setup-title]')`)
check('setup form shown', true)
await shot('01-setup-desktop')

// ---------- 2. Setup validation, then Human vs Human known game ----------
await evaluate(`__btn('Start game').click(); true`)
await sleep(100)
check('blank names rejected, no game started', await evaluate(`!document.querySelector('[role=grid]') && document.querySelectorAll('.setup-error').length === 2`))
await evaluate(`__setInput(__label('Player A name'), 'Ada'); __setInput(__label('Player B name'), 'Ben'); document.querySelector('input[name=length][value="2"]').click(); true`)
await evaluate(`__btn('Start game').click(); true`)
await waitFor(`!!document.querySelector('[role=grid]')`)
check('board has 64 squares', (await evaluate(`document.querySelectorAll('[role=gridcell]').length`)) === 64)
check('opening: 4 discs, 4 legal moves', await evaluate(`document.querySelectorAll('[data-testid=disc]').length === 4 && __legal().length === 4`))
check('Ada (black) to move', (await evaluate('__status()')).includes('Ada to move'))
await evaluate(`__btn('a1').click(); true`)
check('illegal move rejected with message', (await evaluate(`document.querySelector('[role=alert]').textContent`)).includes('a1 is not a legal move'))
for (const m of ['d3', 'c3', 'b3', 'd2', 'e1', 'd6', 'd7', 'e3', 'f4']) {
  await evaluate(`__btn('${m}').click(); true`)
  await sleep(30)
}
check('HvH game ends Ada wins 13–0', (await evaluate('__status()')).includes('Game over: Ada wins, 13–0.'), await evaluate('__status()'))
check('results table has game 1 row', await evaluate(`[...document.querySelectorAll('table tbody tr')].length === 1`))
await shot('02-hvh-finished-desktop')
await evaluate(`__btn('Next game').click(); true`)
check('game 2 swaps colours', (await evaluate(`document.querySelector('.match-eyebrow').textContent + ': ' + [...document.querySelectorAll('.player')].map(li => li.querySelector('.player-name').textContent + ' (' + li.querySelector('.player-colour').textContent + ')').join(', ')`)) === 'Game 2 of 2: Ben (Black), Ada (White)', await evaluate(`[...document.querySelectorAll('.player')].map(li => li.querySelector('.player-name').textContent + ' (' + li.querySelector('.player-colour').textContent + ')').join(', ')`))

// ---------- 3. Keyboard play ----------
await evaluate(`document.querySelector('button[tabindex="0"][aria-label^="d4"]').focus(); true`)
const key = async (k, code, vk) => {
  // A real key press carries its text; Enter is "\r", which is what activates a button
  const text = k === 'Enter' ? String.fromCharCode(13) : undefined
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk })
}
await key('ArrowUp', 'ArrowUp', 38)
check('arrow key moves focus d4→d3', (await evaluate(`document.activeElement.getAttribute('aria-label')`)).startsWith('d3,'))
await key('Enter', 'Enter', 13)
await sleep(100)
check('Enter places a disc (Ben plays d3)', (await evaluate(`document.querySelector('[aria-live=polite]').textContent`)).includes('Ben played d3'))

// ---------- 4. Help dialog ----------
await evaluate(`__btn('How to play').click(); true`)
check('Help dialog opens', await evaluate(`!!document.querySelector('[role=dialog]')`))
await key('Escape', 'Escape', 27)
await sleep(100)
check('Esc closes Help', await evaluate(`!document.querySelector('[role=dialog]')`))

// ---------- 5. End session (with confirmation), then Human vs Hard computer ----------
await evaluate(`__btn('End session').click(); true`)
await waitFor(`!!document.querySelector('[role=alertdialog]')`)
check('End session asks for confirmation', await evaluate(`!!document.querySelector('[role=grid]')`))
await evaluate(`[...document.querySelectorAll('[role=alertdialog] button')].find(b => b.textContent === 'End session').click(); true`)
await waitFor(`!!__label('Player A name')`)
await evaluate(`[...document.querySelectorAll('input[type=radio]')].find(r => r.value === 'hvc').click(); true`)
await waitFor(`!!document.querySelector('input[name=difficulty]')`)
await evaluate(`__setInput(__label('Player A name'), 'Tester'); document.querySelector('input[name=difficulty][value=hard]').click(); true`)
await evaluate(`__btn('Start game').click(); true`)
await waitFor(`!!document.querySelector('[role=grid]')`)
check('vs computer match started', (await evaluate(`[...document.querySelectorAll('.player')].map(li => li.querySelector('.player-name').textContent + ' (' + li.querySelector('.player-colour').textContent + ')').join(', ')`)).includes('Computer (Hard)'))

const computerTimes = []
let guard = 0
while (!(await evaluate(`__status().startsWith('Game over')`)) && guard++ < 80) {
  const humanTurn = await evaluate(`__status().includes('Tester to move')`)
  if (humanTurn) {
    const n = await evaluate(`__legal().length`)
    if (n === 0) throw new Error('human turn with no legal moves shown')
    // Measure main-thread responsiveness while the computer thinks
    await evaluate(`__legal()[0].click(); true`)
    const t0 = Date.now()
    await waitFor(`__status().includes('Tester to move') || __status().startsWith('Game over')`, 20000, 'computer reply')
    computerTimes.push(Date.now() - t0)
  } else {
    await sleep(100)
  }
}
const finalStatus = await evaluate('__status()')
check('full game vs Hard reaches game over', finalStatus.startsWith('Game over'), finalStatus)
check('computer replied every turn', computerTimes.length > 10, `${computerTimes.length} replies, max ${Math.max(...computerTimes)} ms (incl. 600 ms delay)`)
const workerLoaded = await evaluate(`performance.getEntriesByType('resource').some(e => e.name.includes('ai.worker'))`)
check('AI ran in a Web Worker (worker script loaded)', workerLoaded)
check('result recorded in table', await evaluate(`document.querySelectorAll('table tbody tr').length === 1`))
check('1-game session ends with a summary, no Next game', await evaluate(`document.body.textContent.includes('Session complete') && !__btn('Next game')`))
await shot('03-vs-hard-finished-desktop')

// ---------- 6. Mobile layout ----------
await setViewport(390, 844, true)
await sleep(300)
const overflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
check('no horizontal scroll at 390px wide', overflow <= 0, `overflow ${overflow}px`)
const boardWidth = await evaluate(`Math.round(document.querySelector('.board-frame').getBoundingClientRect().width)`)
check('board fits phone width', boardWidth <= 390, `${boardWidth}px`)
await shot('04-mobile')
await setViewport(320, 640, true)
await sleep(300)
const overflow320 = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
check('no horizontal scroll at 320px wide', overflow320 <= 0, `overflow ${overflow320}px`)
await shot('05-mobile-320')

// ---------- 7. Dark mode ----------
await setViewport(1280, 1000)
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
await sleep(300)
await shot('06-dark')

check('no console errors or warnings', consoleErrors.length === 0, consoleErrors.join(' | '))
check('no uncaught exceptions', exceptions.length === 0, exceptions.join(' | '))
check('no failed network requests', failedRequests.length === 0, failedRequests.join(' | '))

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
ws.close()
await closeBrowser()
process.exit(failed ? 1 : 0)
