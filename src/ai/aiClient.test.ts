import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialBoard } from '../game'
import { __setWorkerFactoryForTests, answerRequest, builtInProvider } from './aiClient'
import { buildRequest, validateReply } from './contract'
import type { AiMoveRequest } from './contract'

/** In-memory stand-in for the Web Worker, answering through the D3 contract. */
class FakeWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  received: AiMoveRequest[] = []
  terminated = false
  readonly mode: 'ok' | 'crash'

  constructor(mode: 'ok' | 'crash' = 'ok') {
    this.mode = mode
  }

  postMessage(request: AiMoveRequest) {
    this.received.push(request)
    queueMicrotask(() => {
      if (this.mode === 'crash') {
        this.onerror?.(new ErrorEvent('error'))
        return
      }
      this.onmessage?.({ data: answerRequest(request) } as MessageEvent<unknown>)
    })
  }

  terminate() {
    this.terminated = true
  }
}

let counter = 0
const request = (player: 'black' | 'white' = 'black') =>
  buildRequest({
    board: createInitialBoard(),
    player,
    difficulty: 'easy',
    requestId: `req-${++counter}`,
    gameId: 'g-1',
    revision: 0,
  })

afterEach(() => {
  __setWorkerFactoryForTests(null)
  vi.unstubAllGlobals()
})

describe('answerRequest', () => {
  it('returns a legal cell index for the request', () => {
    const r = request()
    expect(validateReply(r, answerRequest(r)).ok).toBe(true)
  })

  it('returns an error when there is no legal move', () => {
    const r = { ...request(), board: Array(64).fill('B') as AiMoveRequest['board'] }
    expect(answerRequest(r)).toEqual({ requestId: r.requestId, error: 'no_legal_move' })
  })
})

describe('builtInProvider', () => {
  it('runs in the page when Web Workers are unavailable', async () => {
    vi.stubGlobal('Worker', undefined)
    const r = request()
    expect(validateReply(r, await builtInProvider(r)).ok).toBe(true)
  })

  it('sends the contract request to the worker and returns its reply', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const fake = new FakeWorker()
    __setWorkerFactoryForTests(() => fake as unknown as Worker)

    const r = request()
    const reply = await builtInProvider(r)
    expect(fake.received).toEqual([r])
    expect(validateReply(r, reply).ok).toBe(true)
  })

  it('matches concurrent requests to the right replies', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    __setWorkerFactoryForTests(() => new FakeWorker() as unknown as Worker)
    const black = request('black')
    const white = request('white')
    const [a, b] = await Promise.all([builtInProvider(black), builtInProvider(white)])
    expect(validateReply(black, a).ok).toBe(true)
    expect(validateReply(white, b).ok).toBe(true)
  })

  it('reuses one worker across requests', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const factory = vi.fn(() => new FakeWorker() as unknown as Worker)
    __setWorkerFactoryForTests(factory)
    await builtInProvider(request())
    await builtInProvider(request())
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('fails the request if the worker crashes, then uses the page for retries', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const crashing = new FakeWorker('crash')
    const factory = vi.fn(() => crashing as unknown as Worker)
    __setWorkerFactoryForTests(factory)

    await expect(builtInProvider(request())).rejects.toThrow('AI worker crashed')
    expect(crashing.terminated).toBe(true)

    const retry = request()
    expect(validateReply(retry, await builtInProvider(retry)).ok).toBe(true)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('ignores worker messages for unknown requests', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const fake = new FakeWorker()
    __setWorkerFactoryForTests(() => fake as unknown as Worker)
    const r = request()
    const reply = builtInProvider(r)
    fake.onmessage?.({ data: { requestId: 'req-unknown', cellIndex: 19 } } as MessageEvent<unknown>)
    fake.onmessage?.({ data: null } as MessageEvent<unknown>)
    expect(validateReply(r, await reply).ok).toBe(true)
  })

  it('runs in the page if the worker cannot be created', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    __setWorkerFactoryForTests(() => {
      throw new Error('blocked by CSP')
    })
    const r = request('white')
    expect(validateReply(r, await builtInProvider(r)).ok).toBe(true)
  })
})
