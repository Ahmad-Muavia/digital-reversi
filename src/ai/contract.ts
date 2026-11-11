/**
 * The AI exchange contract from D3 §3.3–3.4 (I-AI-REQUEST / I-AI-REPLY).
 *
 * The platform owns the rules. An AI provider only receives a snapshot and
 * returns a candidate cell index; the adapter checks every reply before the
 * rules engine applies it. Any provider that speaks this contract can replace
 * another without changes to the rules, board UI or outcome code.
 */
import { BOARD_SIZE, getLegalMoves } from '../game'
import type { Board, Difficulty, Disc, Position } from '../game'

export const CONTRACT_VERSION = '1.0'

/** Time the provider is asked to stay within (D3 REQ-AI-01). */
export const AI_TIME_BUDGET_MS = 3000
/** Time after which the adapter gives up on a reply (D3 REQ-AI-02, NFR02). */
export const AI_TIMEOUT_MS = 5000

export type CellCode = 'B' | 'W' | '.'
export type ColourCode = 'B' | 'W'

export interface AiMoveRequest {
  /** 64 entries, row-major, A1 = 0 … H8 = 63. */
  readonly board: readonly CellCode[]
  readonly toMove: ColourCode
  readonly aiColour: ColourCode
  /** Legal cell indices for `toMove`, ascending; never empty. */
  readonly legalMoves: readonly number[]
  readonly difficulty: Difficulty
  readonly requestId: string
  readonly gameId: string
  /** Discs placed so far in this game. */
  readonly revision: number
  readonly timeBudgetMs: number
}

export type AiMoveReply =
  | { readonly requestId: string; readonly cellIndex: number }
  | { readonly requestId: string; readonly error: string; readonly reason?: string }

/** Anything that can answer a request: a Web Worker, an in-page engine, a test double. */
export type AiProvider = (request: AiMoveRequest) => Promise<unknown>

export type AiResult =
  | { readonly ok: true; readonly position: Position; readonly requestId: string }
  | { readonly ok: false; readonly reason: string; readonly requestId: string }

/** Zero-based index = row × 8 + column (D3 §2.1). */
export function toIndex({ row, col }: Position): number {
  return row * BOARD_SIZE + col
}

export function fromIndex(index: number): Position {
  return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE }
}

export function colourCode(disc: Disc): ColourCode {
  return disc === 'black' ? 'B' : 'W'
}

export function discFromCode(code: ColourCode): Disc {
  return code === 'B' ? 'black' : 'white'
}

export function encodeBoard(board: Board): CellCode[] {
  return board.flatMap((row) => row.map((cell) => (cell === null ? '.' : colourCode(cell))))
}

export function decodeBoard(cells: readonly CellCode[]): Board {
  const board: (Disc | null)[][] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    board.push(
      cells
        .slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE)
        .map((c) => (c === '.' ? null : discFromCode(c))),
    )
  }
  return board
}

export interface SnapshotInput {
  readonly board: Board
  readonly player: Disc
  readonly difficulty: Difficulty
  readonly requestId: string
  readonly gameId: string
  readonly revision: number
}

/** Builds one consistent request from the current game (I-AI-REQUEST). */
export function buildRequest(input: SnapshotInput): AiMoveRequest {
  const code = colourCode(input.player)
  return {
    board: encodeBoard(input.board),
    toMove: code,
    aiColour: code,
    legalMoves: getLegalMoves(input.board, input.player)
      .map(toIndex)
      .sort((a, b) => a - b),
    difficulty: input.difficulty,
    requestId: input.requestId,
    gameId: input.gameId,
    revision: input.revision,
    timeBudgetMs: AI_TIME_BUDGET_MS,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks a reply against the request it answers (I-AI-REPLY): it must echo
 * the request id and carry an integer cell index from 0–63 that is in the
 * request's legal list. Anything else is rejected with a safe reason.
 */
export function validateReply(request: AiMoveRequest, reply: unknown): AiResult {
  const fail = (reason: string): AiResult => ({ ok: false, reason, requestId: request.requestId })
  if (!isRecord(reply)) return fail('malformed reply')
  if (reply.requestId !== request.requestId) return fail('reply for a different request')
  if ('error' in reply) {
    return fail(typeof reply.error === 'string' ? `provider error: ${reply.error}` : 'provider error')
  }
  const { cellIndex } = reply
  if (typeof cellIndex !== 'number' || !Number.isInteger(cellIndex)) {
    return fail('cell index is not an integer')
  }
  if (cellIndex < 0 || cellIndex > 63) return fail('cell index out of range')
  if (!request.legalMoves.includes(cellIndex)) return fail('not a legal move')
  return { ok: true, position: fromIndex(cellIndex), requestId: request.requestId }
}

/**
 * Sends one request and returns a validated result. A provider that throws,
 * replies with something invalid, or takes longer than `timeoutMs` yields a
 * failure; the game state is never touched here.
 */
export async function requestAiMove(
  provider: AiProvider,
  request: AiMoveRequest,
  timeoutMs: number = AI_TIMEOUT_MS,
): Promise<AiResult> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  try {
    const reply = await Promise.race([provider(request), timeout])
    if (reply === 'timeout') {
      return { ok: false, reason: 'no reply in time', requestId: request.requestId }
    }
    return validateReply(request, reply)
  } catch {
    return { ok: false, reason: 'provider failed', requestId: request.requestId }
  } finally {
    clearTimeout(timer)
  }
}
