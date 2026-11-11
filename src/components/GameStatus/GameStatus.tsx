import type { Disc, GameOutcome, Score } from '../../game'
import './GameStatus.css'

interface StatusProps {
  score: Score
  currentPlayer: Disc
  /** Defaults to an in-progress game. */
  outcome?: GameOutcome | null
  /** Player who had to pass on the last turn. */
  passedPlayer?: Disc | null
  /** Display names; default to the disc colours. */
  names?: Record<Disc, string>
}

const PLAYERS: readonly Disc[] = ['black', 'white']
const DEFAULT_NAMES: Record<Disc, string> = { black: 'Black', white: 'White' }
const COLOUR: Record<Disc, string> = { black: 'Black', white: 'White' }

function describeTurn(
  score: Score,
  currentPlayer: Disc,
  outcome: GameOutcome | null,
  passedPlayer: Disc | null,
  names: Record<Disc, string>,
): string {
  if (outcome) {
    const result = `${score.black}–${score.white}`
    return outcome === 'draw'
      ? `Game over: it's a draw, ${result}.`
      : `Game over: ${names[outcome]} wins, ${result}.`
  }
  if (passedPlayer) {
    return `${names[passedPlayer]} has no legal move and passes. ${names[currentPlayer]} to move.`
  }
  return `${names[currentPlayer]} to move`
}

/** The pill showing whose turn it is, a pass, or the result. Announced politely. */
export function TurnStatus({
  score,
  currentPlayer,
  outcome = null,
  passedPlayer = null,
  names = DEFAULT_NAMES,
}: StatusProps) {
  return (
    <p className={outcome ? 'turn-pill is-finished' : 'turn-pill'} role="status">
      {!outcome && <span className={`turn-dot turn-dot--${currentPlayer}`} aria-hidden="true" />}
      <span>{describeTurn(score, currentPlayer, outcome, passedPlayer, names)}</span>
    </p>
  )
}

/** The players, their colours and disc counts; the player to move is marked. */
export function PlayersPanel({
  score,
  currentPlayer,
  outcome = null,
  names = DEFAULT_NAMES,
}: Omit<StatusProps, 'passedPlayer'>) {
  return (
    <section className="players" aria-labelledby="players-title">
      <h3 id="players-title" className="eyebrow players-title">
        Players
      </h3>
      <ul className="players-list">
        {PLAYERS.map((disc) => {
          const active = !outcome && disc === currentPlayer
          return (
            <li
              key={disc}
              className={active ? 'player is-active' : 'player'}
              aria-current={active ? 'true' : undefined}
            >
              <span className={`disc disc--${disc} player-disc`} aria-hidden="true" />
              <span className="player-who">
                <span className="player-name">{names[disc]}</span>
                <span className="player-colour">{COLOUR[disc]}</span>
              </span>
              <span className="player-score">
                <span className="visually-hidden">discs: </span>
                {score[disc]}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
