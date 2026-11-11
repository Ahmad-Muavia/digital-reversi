import { IllegalMoveError, createInitialGameState, playMove, positionLabel } from '../game'
import type { GameState, Position } from '../game'

export interface GameViewState {
  game: GameState
  /** Explanation of the last rejected move, cleared by the next valid move. */
  error: string | null
}

export type GameAction = { type: 'move'; position: Position } | { type: 'reset' }

export function initGameView(): GameViewState {
  return { game: createInitialGameState(), error: null }
}

export function gameReducer(state: GameViewState, action: GameAction): GameViewState {
  switch (action.type) {
    case 'reset':
      return initGameView()
    case 'move': {
      if (state.game.status === 'finished') return state
      try {
        return { game: playMove(state.game, action.position), error: null }
      } catch (err) {
        if (err instanceof IllegalMoveError) {
          return {
            ...state,
            error: `${positionLabel(action.position)} is not a legal move. Choose a highlighted square.`,
          }
        }
        throw err
      }
    }
  }
}
