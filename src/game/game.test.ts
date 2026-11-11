import { describe, expect, it } from 'vitest'
import { countDiscs, createInitialBoard, positionLabel } from './board'
import {
  IllegalMoveError,
  applyMove,
  createInitialGameState,
  getOutcome,
  playMove,
} from './game'
import { getLegalMoves } from './rules'
import { boardFromRows, boardToRows } from './testUtils'
import type { GameState } from './types'

function stateWith(board: GameState['board'], currentPlayer: GameState['currentPlayer']): GameState {
  return { ...createInitialGameState(), board, currentPlayer }
}

describe('createInitialGameState', () => {
  it('gives black the first move', () => {
    expect(createInitialGameState().currentPlayer).toBe('black')
  })

  it('starts from the standard opening position', () => {
    expect(createInitialGameState().board).toEqual(createInitialBoard())
  })

  it('starts in play with no history', () => {
    const state = createInitialGameState()
    expect(state.status).toBe('playing')
    expect(state.outcome).toBeNull()
    expect(state.lastMove).toBeNull()
    expect(state.lastFlips).toEqual([])
    expect(state.passedPlayer).toBeNull()
    expect(state.moveCount).toBe(0)
  })

  it('returns independent states', () => {
    const a = createInitialGameState()
    const b = createInitialGameState()
    expect(a.board).not.toBe(b.board)
  })
})

describe('applyMove', () => {
  it('places the disc and flips captured discs', () => {
    const board = applyMove(createInitialBoard(), { row: 2, col: 3 }, 'black') // d3
    expect(board[2][3]).toBe('black')
    expect(board[3][3]).toBe('black') // d4 flipped
    expect(countDiscs(board)).toEqual({ black: 4, white: 1 })
  })

  it('flips discs in every capturing direction', () => {
    const board = boardFromRows([
      'B.B.B...',
      '.WWW....',
      'BW.WB...',
      '.WWW....',
      'B.B.B...',
      '........',
      '........',
      '........',
    ])
    const next = applyMove(board, { row: 2, col: 2 }, 'black')
    expect(boardToRows(next).slice(0, 5)).toEqual([
      'B.B.B...',
      '.BBB....',
      'BBBBB...',
      '.BBB....',
      'B.B.B...',
    ])
  })

  it('does not flip discs that are not bracketed', () => {
    const board = boardFromRows([
      '.WB.....',
      'W.......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    const next = applyMove(board, { row: 0, col: 0 }, 'black')
    expect(next[0][1]).toBe('black')
    expect(next[1][0]).toBe('white')
  })

  it('does not modify the original board', () => {
    const original = createInitialBoard()
    const snapshot = boardToRows(original)
    applyMove(original, { row: 2, col: 3 }, 'black')
    expect(boardToRows(original)).toEqual(snapshot)
  })

  it('throws IllegalMoveError for an illegal move', () => {
    expect(() => applyMove(createInitialBoard(), { row: 0, col: 0 }, 'black')).toThrow(
      IllegalMoveError,
    )
  })

  it('throws for an occupied square', () => {
    expect(() => applyMove(createInitialBoard(), { row: 3, col: 3 }, 'black')).toThrow(
      'd4 is not a legal move for black',
    )
  })
})

describe('playMove', () => {
  it('passes the turn to the opponent after a legal move', () => {
    const next = playMove(createInitialGameState(), { row: 2, col: 3 })
    expect(next.currentPlayer).toBe('white')
    expect(next.status).toBe('playing')
    expect(next.lastMove).toEqual({ row: 2, col: 3 })
    expect(next.lastFlips).toEqual([{ row: 3, col: 3 }])
    expect(next.moveCount).toBe(1)
    expect(next.passedPlayer).toBeNull()
  })

  it('alternates turns over several moves', () => {
    let state = createInitialGameState()
    state = playMove(state, { row: 2, col: 3 }) // black d3
    state = playMove(state, { row: 2, col: 2 }) // white c3
    expect(state.currentPlayer).toBe('black')
    expect(state.moveCount).toBe(2)
  })

  it('rejects an illegal move and leaves the state unchanged', () => {
    const state = createInitialGameState()
    expect(() => playMove(state, { row: 0, col: 0 })).toThrow(IllegalMoveError)
    expect(state).toEqual(createInitialGameState())
  })

  it('rejects a move by the wrong colour (a square only legal for the opponent)', () => {
    // c5 is legal for white but not for black at the start
    expect(() => playMove(createInitialGameState(), { row: 4, col: 2 })).toThrow(IllegalMoveError)
  })

  it('keeps the turn when the opponent has no legal move', () => {
    const board = boardFromRows([
      'BW......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      'BW.....B',
    ])
    // Black plays c8, capturing b8. White's only disc (b1) cannot bracket
    // anything, but black can still capture it with c1, so white passes.
    const state = stateWith(board, 'black')
    const next = playMove(state, { row: 7, col: 2 })
    expect(next.status).toBe('playing')
    expect(next.currentPlayer).toBe('black')
    expect(next.passedPlayer).toBe('white')
  })

  it('ends the game when neither player can move', () => {
    const board = boardFromRows([
      'BW......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    const next = playMove(stateWith(board, 'black'), { row: 0, col: 2 }) // c1
    expect(next.status).toBe('finished')
    expect(next.outcome).toBe('black')
    expect(countDiscs(next.board)).toEqual({ black: 3, white: 0 })
  })

  it('ends the game when the board is full', () => {
    const board = boardFromRows([
      'BBBBBBBB',
      'BBBBBBBB',
      'BBBBBBBB',
      'BBBBBBBB',
      'WWWWWWWW',
      'WWWWWWWW',
      'WWWWWWWW',
      'WWWWWWB.',
    ])
    // white plays h8, capturing g8
    const next = playMove(stateWith(board, 'white'), { row: 7, col: 7 })
    expect(next.status).toBe('finished')
    expect(countDiscs(next.board)).toEqual({ black: 32, white: 32 })
    expect(next.outcome).toBe('draw')
  })

  it('refuses moves after the game has finished', () => {
    const finished: GameState = { ...createInitialGameState(), status: 'finished', outcome: 'draw' }
    expect(() => playMove(finished, { row: 2, col: 3 })).toThrow('The game is already finished')
  })

  it('plays a complete game to the end using only legal moves', () => {
    let state = createInitialGameState()
    let guard = 0
    while (state.status === 'playing') {
      const moves = getLegalMoves(state.board, state.currentPlayer)
      expect(moves.length, `no moves for ${state.currentPlayer} while playing`).toBeGreaterThan(0)
      state = playMove(state, moves[0])
      guard++
      expect(guard).toBeLessThanOrEqual(60)
    }
    const { black, white } = countDiscs(state.board)
    expect(black + white).toBeLessThanOrEqual(64)
    expect(state.moveCount).toBe(guard)
    expect(state.outcome).toBe(getOutcome({ black, white }))
    expect(getLegalMoves(state.board, 'black')).toEqual([])
    expect(getLegalMoves(state.board, 'white')).toEqual([])
    expect(positionLabel(state.lastMove!)).toMatch(/^[a-h][1-8]$/)
  })
})

describe('getOutcome', () => {
  it('returns the player with more discs', () => {
    expect(getOutcome({ black: 40, white: 24 })).toBe('black')
    expect(getOutcome({ black: 10, white: 54 })).toBe('white')
  })

  it('returns draw for equal counts', () => {
    expect(getOutcome({ black: 32, white: 32 })).toBe('draw')
  })
})
