import { chooseMove } from './ai'
import { decodeBoard, discFromCode, toIndex } from './contract'
import type { AiMoveReply, AiMoveRequest, AiProvider } from './contract'

/**
 * The built-in engine, answering through the D3 contract. It only sees the
 * encoded snapshot and returns a cell index; it never touches game state.
 */
export function answerRequest(request: AiMoveRequest): AiMoveReply {
  const move = chooseMove(decodeBoard(request.board), discFromCode(request.aiColour), request.difficulty)
  if (!move) return { requestId: request.requestId, error: 'no_legal_move' }
  return { requestId: request.requestId, cellIndex: toIndex(move) }
}

/** Runs the built-in engine in the page (used where Web Workers are unavailable). */
export const inPageProvider: AiProvider = async (request) => answerRequest(request)

type WorkerFactory = () => Worker

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })

let worker: Worker | null = null
let workerFailed = false
/** Callbacks for in-flight requests, keyed by request id. */
const pending = new Map<string, { resolve: (r: unknown) => void; reject: (e: Error) => void }>()
let factory: WorkerFactory = defaultFactory

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null
  if (worker) return worker
  try {
    worker = factory()
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data as { requestId?: unknown } | null
      const id = typeof data?.requestId === 'string' ? data.requestId : undefined
      const entry = id === undefined ? undefined : pending.get(id)
      if (!entry || id === undefined) return // unknown or already-settled request
      pending.delete(id)
      entry.resolve(event.data)
    }
    worker.onerror = () => {
      // The request fails (the player can retry); later requests run in the page.
      workerFailed = true
      worker?.terminate()
      worker = null
      for (const entry of pending.values()) entry.reject(new Error('AI worker crashed'))
      pending.clear()
    }
    return worker
  } catch {
    workerFailed = true
    return null
  }
}

/**
 * The default provider: the built-in engine in a Web Worker, so long searches
 * never freeze the page. Uses the in-page engine where workers are unavailable.
 */
export const builtInProvider: AiProvider = (request) => {
  const w = getWorker()
  if (!w) return inPageProvider(request)
  return new Promise((resolve, reject) => {
    pending.set(request.requestId, { resolve, reject })
    w.postMessage(request)
  })
}

/** Test hook: replace how the worker is created and reset state. */
export function __setWorkerFactoryForTests(next: WorkerFactory | null): void {
  worker?.terminate()
  worker = null
  workerFailed = false
  pending.clear()
  factory = next ?? defaultFactory
}
