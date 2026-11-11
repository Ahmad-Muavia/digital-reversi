import { describe, expect, it } from 'vitest'
import type { Disc } from './types'
import {
  BOARD_SIZE,
  countDiscs,
  createEmptyBoard,
  createInitialBoard,
  getCell,
  isOnBoard,
  opponentOf,
  positionLabel,
} from './board'

describe('createEmptyBoard', () => {
  it('creates an 8x8 board of empty cells', () => {
    const board = createEmptyBoard()
    expect(board).toHaveLength(BOARD_SIZE)
    for (const row of board) {
      expect(row).toHaveLength(BOARD_SIZE)
      expect(row.every((cell) => cell === null)).toBe(true)
    }
  })

  it('does not share row arrays between rows', () => {
    const board = createEmptyBoard()
    expect(new Set(board).size).toBe(BOARD_SIZE)
  })
})

describe('createInitialBoard', () => {
  it('places the four starting discs in the centre', () => {
    const board = createInitialBoard()
    expect(board[3][3]).toBe('white')
    expect(board[3][4]).toBe('black')
    expect(board[4][3]).toBe('black')
    expect(board[4][4]).toBe('white')
  })

  it('leaves every other square empty', () => {
    const board = createInitialBoard()
    const centre = new Set(['3,3', '3,4', '4,3', '4,4'])
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!centre.has(`${r},${c}`)) expect(board[r][c]).toBeNull()
      }
    }
  })

  it('starts with two discs per player', () => {
    expect(countDiscs(createInitialBoard())).toEqual({ black: 2, white: 2 })
  })

  it('returns a fresh board each call', () => {
    expect(createInitialBoard()).not.toBe(createInitialBoard())
    expect(createInitialBoard()[0]).not.toBe(createInitialBoard()[0])
  })
})

describe('isOnBoard', () => {
  it.each([
    [0, 0],
    [7, 7],
    [0, 7],
    [7, 0],
    [3, 4],
  ])('accepts (%i, %i)', (row, col) => {
    expect(isOnBoard({ row, col })).toBe(true)
  })

  it.each([
    [-1, 0],
    [0, -1],
    [8, 0],
    [0, 8],
    [1.5, 2],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])('rejects (%s, %s)', (row, col) => {
    expect(isOnBoard({ row, col })).toBe(false)
  })
})

describe('getCell', () => {
  it('returns the disc or null at a position', () => {
    const board = createInitialBoard()
    expect(getCell(board, { row: 3, col: 3 })).toBe('white')
    expect(getCell(board, { row: 0, col: 0 })).toBeNull()
  })

  it('throws a RangeError for positions off the board', () => {
    const board = createInitialBoard()
    expect(() => getCell(board, { row: 8, col: 0 })).toThrow(RangeError)
    expect(() => getCell(board, { row: 0, col: -1 })).toThrow(RangeError)
  })
})

describe('opponentOf', () => {
  it('returns the other colour', () => {
    expect(opponentOf('black')).toBe('white')
    expect(opponentOf('white')).toBe('black')
  })
})

describe('countDiscs', () => {
  it('returns zero for an empty board', () => {
    expect(countDiscs(createEmptyBoard())).toEqual({ black: 0, white: 0 })
  })

  it('counts each colour separately', () => {
    const board = createEmptyBoard().map((row) => [...row])
    board[0][0] = 'black'
    board[0][1] = 'black'
    board[7][7] = 'white'
    expect(countDiscs(board)).toEqual({ black: 2, white: 1 })
  })

  it('handles a full board', () => {
    const board = createEmptyBoard().map((row, r) =>
      row.map((): Disc => (r < 4 ? 'black' : 'white')),
    )
    expect(countDiscs(board)).toEqual({ black: 32, white: 32 })
  })
})

describe('positionLabel', () => {
  it('uses column letters and 1-based row numbers', () => {
    expect(positionLabel({ row: 0, col: 0 })).toBe('a1')
    expect(positionLabel({ row: 7, col: 7 })).toBe('h8')
    expect(positionLabel({ row: 3, col: 4 })).toBe('e4')
  })
})
