export type Disc = 'black' | 'white'

/** A square holds a disc or is empty (`null`). */
export type Cell = Disc | null

/** Row-major 8×8 grid. `board[row][col]`, row 0 is the top. */
export type Board = readonly (readonly Cell[])[]

export interface Position {
  readonly row: number
  readonly col: number
}

export interface Score {
  readonly black: number
  readonly white: number
}

export type GameStatus = 'playing' | 'finished'

/** Winner of a finished game, or `'draw'`. */
export type GameOutcome = Disc | 'draw'

export interface GameState {
  readonly board: Board
  /** Player to move. After the game ends this is the player who moved last. */
  readonly currentPlayer: Disc
  readonly status: GameStatus
  /** Set once the game is finished. */
  readonly outcome: GameOutcome | null
  /** The most recent move, or `null` at the start of the game. */
  readonly lastMove: Position | null
  /** Discs flipped by the most recent move. */
  readonly lastFlips: readonly Position[]
  /** Player who had to pass on the previous turn because they had no legal move. */
  readonly passedPlayer: Disc | null
  /** Number of discs placed so far. */
  readonly moveCount: number
}
