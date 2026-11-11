import { countDiscs } from './board'
import type { Disc, GameOutcome, GameState, Score } from './types'

/** Stable participant identities: p1 is side A, p2 is side B (D3 §2.1). */
export type PlayerId = 'p1' | 'p2'
export type PlayerKind = 'human' | 'computer'
export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

/** Number of games in a session (D3 R07). */
export type SessionLength = 1 | 2 | 4
export const SESSION_LENGTHS: readonly SessionLength[] = [1, 2, 4]

export interface PlayerInfo {
  readonly name: string
  readonly kind: PlayerKind
  /** Only used for computer players. */
  readonly difficulty?: Difficulty
}

/** A validated setup: who plays and how many games (D3 I-SETUP). */
export interface SessionConfig {
  readonly players: Readonly<Record<PlayerId, PlayerInfo>>
  readonly length: SessionLength
}

export interface GameRecord {
  readonly gameNumber: number
  /** Which player had the black discs in this game. */
  readonly blackPlayer: PlayerId
  readonly outcome: GameOutcome
  readonly score: Score
  /** Winning player, or `null` for a draw. */
  readonly winner: PlayerId | null
}

/** A forced pass, stored separately from game results (D3 REQ-TURN-02). */
export interface PassRecord {
  readonly gameNumber: number
  readonly player: PlayerId
  readonly disc: Disc
  /** Number of discs placed in the game when the pass happened. */
  readonly afterMove: number
}

export interface MatchState {
  readonly players: Readonly<Record<PlayerId, PlayerInfo>>
  /** How many games this session has. */
  readonly length: SessionLength
  /** 1-based number of the game currently being played. */
  readonly gameNumber: number
  readonly history: readonly GameRecord[]
  readonly passes: readonly PassRecord[]
}

export interface Tally {
  readonly p1: number
  readonly p2: number
  readonly draws: number
}

/** Display names are 1–30 characters after trimming (D3 R09). */
export const MAX_NAME_LENGTH = 30

/** Removes leading and trailing whitespace (D3 R09). */
export function normalizeName(name: string): string {
  return name.trim()
}

/** Errors per name field; an empty object means the names are valid. */
export type NameErrors = Partial<Record<PlayerId, string>>

/**
 * Validates the human players' display names (D3 R09, REQ-SET-01):
 * required, at most 30 characters after trimming, and distinct ignoring case.
 */
export function validateNames(players: Record<PlayerId, PlayerInfo>): NameErrors {
  const errors: NameErrors = {}
  const ids: PlayerId[] = ['p1', 'p2']
  for (const id of ids) {
    if (players[id].kind !== 'human') continue
    const name = normalizeName(players[id].name)
    if (name.length === 0) errors[id] = 'Enter a name.'
    else if (name.length > MAX_NAME_LENGTH)
      errors[id] = `Use at most ${MAX_NAME_LENGTH} characters.`
  }
  const { p1, p2 } = players
  if (
    !errors.p1 &&
    !errors.p2 &&
    p1.kind === 'human' &&
    p2.kind === 'human' &&
    normalizeName(p1.name).toLowerCase() === normalizeName(p2.name).toLowerCase()
  ) {
    errors.p2 = 'Choose a different name from Player A.'
  }
  return errors
}

/**
 * Creates a session from a configuration. Throws if the names are invalid or
 * the length is unsupported, so an invalid setup can never start a game.
 */
export function createMatch(
  players: Record<PlayerId, PlayerInfo>,
  length: SessionLength = 1,
): MatchState {
  if (!SESSION_LENGTHS.includes(length)) {
    throw new Error(`Unsupported session length: ${String(length)}`)
  }
  const errors = validateNames(players)
  if (Object.keys(errors).length > 0) {
    throw new Error(`Invalid player names: ${Object.values(errors).join(' ')}`)
  }
  return {
    players: {
      p1: { ...players.p1, name: normalizeName(players.p1.name) },
      p2: { ...players.p2, name: normalizeName(players.p2.name) },
    },
    length,
    gameNumber: 1,
    history: [],
    passes: [],
  }
}

/** Player 1 (side A) takes black in odd-numbered games, white in even-numbered games. */
export function blackPlayerFor(gameNumber: number): PlayerId {
  return gameNumber % 2 === 1 ? 'p1' : 'p2'
}

export function playerForDisc(match: MatchState, disc: Disc): PlayerId {
  const black = blackPlayerFor(match.gameNumber)
  if (disc === 'black') return black
  return black === 'p1' ? 'p2' : 'p1'
}

export function namesByDisc(match: MatchState): Record<Disc, string> {
  return {
    black: match.players[playerForDisc(match, 'black')].name,
    white: match.players[playerForDisc(match, 'white')].name,
  }
}

/** True once the current game's result has been added to the history. */
export function isCurrentGameRecorded(match: MatchState): boolean {
  return match.history.some((r) => r.gameNumber === match.gameNumber)
}

/** True when the last game of the session has been played and recorded. */
export function isSessionComplete(match: MatchState): boolean {
  return match.gameNumber >= match.length && isCurrentGameRecorded(match)
}

/** True when the current game is recorded and another game remains. */
export function canStartNextGame(match: MatchState): boolean {
  return isCurrentGameRecorded(match) && match.gameNumber < match.length
}

/**
 * Adds the finished game's result to the match history.
 * Throws if the game is not finished or has already been recorded.
 */
export function recordResult(match: MatchState, game: GameState): MatchState {
  if (game.status !== 'finished' || game.outcome === null) {
    throw new Error('Only finished games can be recorded')
  }
  if (isCurrentGameRecorded(match)) {
    throw new Error(`Game ${match.gameNumber} has already been recorded`)
  }
  const record: GameRecord = {
    gameNumber: match.gameNumber,
    blackPlayer: blackPlayerFor(match.gameNumber),
    outcome: game.outcome,
    score: countDiscs(game.board),
    winner: game.outcome === 'draw' ? null : playerForDisc(match, game.outcome),
  }
  return { ...match, history: [...match.history, record] }
}

/** Records a forced pass by `disc` in the current game. */
export function recordPass(match: MatchState, disc: Disc, afterMove: number): MatchState {
  const pass: PassRecord = {
    gameNumber: match.gameNumber,
    player: playerForDisc(match, disc),
    disc,
    afterMove,
  }
  return { ...match, passes: [...match.passes, pass] }
}

/**
 * Moves on to the next game; colours swap automatically.
 * Throws unless the current game is recorded and another game remains.
 */
export function startNextGame(match: MatchState): MatchState {
  if (!canStartNextGame(match)) {
    throw new Error('No further game can be started')
  }
  return { ...match, gameNumber: match.gameNumber + 1 }
}

export function getTally(match: MatchState): Tally {
  let p1 = 0
  let p2 = 0
  let draws = 0
  for (const { winner } of match.history) {
    if (winner === 'p1') p1++
    else if (winner === 'p2') p2++
    else draws++
  }
  return { p1, p2, draws }
}
