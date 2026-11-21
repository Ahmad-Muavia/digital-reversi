/**
 * The Web Worker entry point. In the browser it runs in its own thread; here
 * `self` is the jsdom window, so the module's message handler can be called
 * directly and its reply captured from `postMessage`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialBoard } from '../game'
import { buildRequest, validateReply } from './contract'

type Handler = (event: MessageEvent<unknown>) => void

let handler: Handler
let posted: ReturnType<typeof vi.fn>

beforeEach(async () => {
  posted = vi.fn()
  vi.spyOn(self, 'postMessage').mockImplementation(posted as unknown as typeof self.postMessage)
  vi.resetModules()
  await import('./ai.worker')
  handler = self.onmessage as unknown as Handler
})

afterEach(() => {
  self.onmessage = null
})

const send = (data: unknown) => handler({ data } as MessageEvent<unknown>)

describe('ai.worker', () => {
  it('answers a contract request with a legal move', () => {
    const request = buildRequest({
      board: createInitialBoard(),
      player: 'black',
      difficulty: 'easy',
      requestId: 'req-w1',
      gameId: 'g-1',
      revision: 0,
    })
    send(request)
    expect(posted).toHaveBeenCalledTimes(1)
    expect(validateReply(request, posted.mock.calls[0][0]).ok).toBe(true)
  })

  it('replies with an internal error instead of crashing on a broken request', () => {
    send({ requestId: 'req-bad', board: 'not a board', aiColour: 'B', difficulty: 'easy' })
    expect(posted).toHaveBeenCalledWith({ requestId: 'req-bad', error: 'internal_error' })
  })

  it('still replies when the request has no id', () => {
    send(null)
    expect(posted).toHaveBeenCalledWith({ requestId: 'undefined', error: 'internal_error' })
  })
})
