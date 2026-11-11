import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './game'
import {
  MAX_NAME_LENGTH,
  blackPlayerFor,
  canStartNextGame,
  createMatch,
  isSessionComplete,
  recordPass,
  validateNames,
  getTally,
  isCurrentGameRecorded,
  namesByDisc,
  normalizeName,
  playerForDisc,
  recordResult,
  startNextGame,
} from './match'
import { boardFromRows } from './testUtils'
import type { GameOutcome, GameState } from './types'

const players = {
  p1: { name: 'Ada', kind: 'human' as const },
  p2: { name: 'Ben', kind: 'human' as const },
}

function finishedGame(outcome: GameOutcome): GameState {
  const rows: Record<GameOutcome, string> = {
    black: 'BBBBBBBB',
    white: 'WWWWWWWW',
    draw: 'BBBBWWWW',
  }
  return {
    ...createInitialGameState(),
    board: boardFromRows(Array(8).fill(rows[outcome])),
    status: 'finished',
    outcome,
  }
}

describe('normalizeName', () => {
  it('trims leading and trailing whitespace only', () => {
    expect(normalizeName('  Ada  Lovelace ')).toBe('Ada  Lovelace')
  })
})

describe('validateNames (D3 R09)', () => {
  const human = (name: string) => ({ name, kind: 'human' as const })
  const computer = { name: 'Computer (Easy)', kind: 'computer' as const, difficulty: 'easy' as const }

  it('accepts two distinct names of 1–30 characters', () => {
    expect(validateNames({ p1: human('A'), p2: human('x'.repeat(MAX_NAME_LENGTH)) })).toEqual({})
    expect(MAX_NAME_LENGTH).toBe(30)
  })

  it('rejects blank names', () => {
    expect(validateNames({ p1: human('   '), p2: human('') })).toEqual({
      p1: 'Enter a name.',
      p2: 'Enter a name.',
    })
  })

  it('rejects names longer than 30 characters after trimming', () => {
    expect(validateNames({ p1: human(` ${'x'.repeat(30)} `), p2: human('Ben') })).toEqual({})
    expect(validateNames({ p1: human('x'.repeat(31)), p2: human('Ben') }).p1).toMatch(/at most 30/)
  })

  it('rejects names that differ only by case or surrounding spaces', () => {
    expect(validateNames({ p1: human('Ada'), p2: human(' aDA ') }).p2).toMatch(/different name/)
  })

  it('only checks the human player against the computer', () => {
    expect(validateNames({ p1: human('Ada'), p2: computer })).toEqual({})
    expect(validateNames({ p1: human('computer (easy)'), p2: computer })).toEqual({})
  })
})

describe('createMatch', () => {
  it('starts at game 1 with no history or passes', () => {
    const match = createMatch(players)
    expect(match).toMatchObject({ gameNumber: 1, length: 1, history: [], passes: [] })
    expect(match.players.p1.name).toBe('Ada')
  })

  it('stores trimmed names and the session length', () => {
    const match = createMatch({ p1: { name: ' Ada ', kind: 'human' }, p2: players.p2 }, 4)
    expect(match.players.p1.name).toBe('Ada')
    expect(match.length).toBe(4)
  })

  it('never starts an invalid setup', () => {
    expect(() =>
      createMatch({ p1: { name: '', kind: 'human' }, p2: players.p2 }),
    ).toThrow(/Invalid player names/)
    expect(() => createMatch(players, 3 as 1)).toThrow(/Unsupported session length/)
  })
})

describe('session length (D3 R07, REQ-SESS-01)', () => {
  it('a 1-game session is complete after its game', () => {
    const match = recordResult(createMatch(players, 1), finishedGame('black'))
    expect(isSessionComplete(match)).toBe(true)
    expect(canStartNextGame(match)).toBe(false)
    expect(() => startNextGame(match)).toThrow('No further game can be started')
  })

  it('a 4-game session offers exactly three further games', () => {
    let match = createMatch(players, 4)
    let started = 1
    for (;;) {
      match = recordResult(match, finishedGame('draw'))
      if (!canStartNextGame(match)) break
      match = startNextGame(match)
      started++
    }
    expect(started).toBe(4)
    expect(isSessionComplete(match)).toBe(true)
    expect(match.history).toHaveLength(4)
  })

  it('cannot advance before the current game is recorded', () => {
    const match = createMatch(players, 2)
    expect(canStartNextGame(match)).toBe(false)
    expect(isSessionComplete(match)).toBe(false)
    expect(() => startNextGame(match)).toThrow()
  })
})

describe('recordPass', () => {
  it('stores the pass by player and colour, separately from results', () => {
    let match = recordResult(createMatch(players, 2), finishedGame('black'))
    match = startNextGame(match)
    match = recordPass(match, 'black', 30) // game 2: Ben has black
    expect(match.passes).toEqual([{ gameNumber: 2, player: 'p2', disc: 'black', afterMove: 30 }])
    expect(match.history).toHaveLength(1)
  })
})

describe('colour alternation', () => {
  it('gives player 1 black in odd games and white in even games', () => {
    expect(blackPlayerFor(1)).toBe('p1')
    expect(blackPlayerFor(2)).toBe('p2')
    expect(blackPlayerFor(3)).toBe('p1')
  })

  it('swaps colours when moving to the next game', () => {
    let match = recordResult(createMatch(players, 2), finishedGame('black'))
    expect(namesByDisc(match)).toEqual({ black: 'Ada', white: 'Ben' })
    match = startNextGame(match)
    expect(namesByDisc(match)).toEqual({ black: 'Ben', white: 'Ada' })
    expect(playerForDisc(match, 'black')).toBe('p2')
    expect(playerForDisc(match, 'white')).toBe('p1')
  })
})

describe('recordResult', () => {
  it('records the winner by player, not by colour', () => {
    let match = createMatch(players, 2)
    match = recordResult(match, finishedGame('black')) // game 1: Ada is black
    match = startNextGame(match)
    match = recordResult(match, finishedGame('black')) // game 2: Ben is black
    expect(match.history.map((r) => r.winner)).toEqual(['p1', 'p2'])
    expect(match.history[1].blackPlayer).toBe('p2')
    expect(match.history[0].score).toEqual({ black: 64, white: 0 })
  })

  it('records draws with no winner', () => {
    const match = recordResult(createMatch(players), finishedGame('draw'))
    expect(match.history[0].winner).toBeNull()
    expect(match.history[0].outcome).toBe('draw')
  })

  it('refuses an unfinished game', () => {
    expect(() => recordResult(createMatch(players), createInitialGameState())).toThrow(
      'Only finished games can be recorded',
    )
  })

  it('refuses to record the same game twice', () => {
    const once = recordResult(createMatch(players), finishedGame('white'))
    expect(isCurrentGameRecorded(once)).toBe(true)
    expect(() => recordResult(once, finishedGame('white'))).toThrow(
      'Game 1 has already been recorded',
    )
  })
})

describe('getTally', () => {
  it('is zero for a new match', () => {
    expect(getTally(createMatch(players))).toEqual({ p1: 0, p2: 0, draws: 0 })
  })

  it('counts wins and draws across games', () => {
    let match = createMatch(players, 4)
    const outcomes: GameOutcome[] = ['black', 'black', 'draw', 'white']
    outcomes.forEach((outcome, i) => {
      if (i > 0) match = startNextGame(match)
      match = recordResult(match, finishedGame(outcome))
    })
    // g1 Ada black wins, g2 Ben black wins, g3 draw, g4 Ada white wins
    expect(getTally(match)).toEqual({ p1: 2, p2: 1, draws: 1 })
  })
})
