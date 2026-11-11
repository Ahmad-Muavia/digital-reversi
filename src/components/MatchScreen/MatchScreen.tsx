import { useEffect, useRef, useState } from 'react'
import type { AiProvider } from '../../ai'
import type { SessionConfig, Tally } from '../../game'
import { useMatch } from '../../hooks/useMatch'
import { Board } from '../Board'
import { PlayersPanel, TurnStatus } from '../GameStatus'
import { Brand, Icon } from '../Icon'
import { ResultsPanel } from '../ResultsPanel'
import { describeLastMove } from './describeLastMove'
import './MatchScreen.css'

interface MatchScreenProps {
  config: SessionConfig
  /** Leaves this session and returns to setup. */
  onEndSession: () => void
  /** Opens the How to play dialog without leaving the game. */
  onHelp?: () => void
  /** Delay before computer moves; lowered in tests. */
  aiDelayMs?: number
  /** Replaces the built-in computer player (tests and integrations). */
  aiProvider?: AiProvider
  aiTimeoutMs?: number
}

function sessionSummary(names: { p1: string; p2: string }, tally: Tally): string {
  if (tally.p1 === tally.p2) return `Session drawn: ${tally.p1}–${tally.p2}.`
  const [winner, high, low] =
    tally.p1 > tally.p2 ? [names.p1, tally.p1, tally.p2] : [names.p2, tally.p2, tally.p1]
  const draws = tally.draws ? `, ${tally.draws} drawn` : ''
  return `${winner} wins the session ${high}–${low}${draws}.`
}

type Opener = 'top' | 'side'

export function MatchScreen({
  config,
  onEndSession,
  onHelp,
  aiDelayMs,
  aiProvider,
  aiTimeoutMs,
}: MatchScreenProps) {
  const {
    match,
    game,
    error,
    legalMoves,
    score,
    names,
    tally,
    isComputerTurn,
    aiError,
    sessionComplete,
    canNextGame,
    play,
    nextGame,
    retryAi,
  } = useMatch(config, { aiDelayMs, aiProvider, aiTimeoutMs })
  const [confirming, setConfirming] = useState<Opener | null>(null)
  const keepPlayingRef = useRef<HTMLButtonElement>(null)
  const topButtonRef = useRef<HTMLButtonElement>(null)
  const sideButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusTo = useRef<Opener | null>(null)
  const finished = game.status === 'finished'

  useEffect(() => {
    if (confirming) {
      keepPlayingRef.current?.focus()
    } else if (returnFocusTo.current) {
      // Back to the button that opened the confirmation
      const ref = returnFocusTo.current === 'top' ? topButtonRef : sideButtonRef
      returnFocusTo.current = null
      ref.current?.focus()
    }
  }, [confirming])

  const askToEnd = (opener: Opener) => {
    // Nothing is lost once the session is complete, so no confirmation is needed
    if (sessionComplete) onEndSession()
    else setConfirming(opener)
  }

  const cancelConfirm = () => {
    returnFocusTo.current = confirming
    setConfirming(null)
  }

  const thinking = isComputerTurn && !aiError
  const title = finished
    ? 'Game over'
    : game.moveCount === 0
      ? 'Opening position'
      : `Move ${game.moveCount + 1}`
  const caption = game.lastMove
    ? describeLastMove(game, names)
    : `Legal moves for ${names[game.currentPlayer]} are marked on the board.`

  return (
    <div className="match">
      <header className="topbar">
        <button
          ref={topButtonRef}
          type="button"
          className="link-button"
          onClick={() => askToEnd('top')}
        >
          <Icon name="arrowLeft" />
          Setup
        </button>
        <Brand />
        <div className="topbar-end">
          <span className="topbar-session">
            Session · {match.length === 1 ? '1 game' : `${match.length} games`}
          </span>
          {onHelp && (
            <button type="button" className="link-button" onClick={onHelp} aria-haspopup="dialog">
              <Icon name="help" />
              How to play
            </button>
          )}
        </div>
      </header>

      <main className="match-layout">
        <div className="match-head">
          <div>
            <p className="eyebrow match-eyebrow">
              Game {match.gameNumber} of {match.length}
            </p>
            <h2 className="match-title">{title}</h2>
          </div>
          <TurnStatus
            score={score}
            currentPlayer={game.currentPlayer}
            outcome={game.outcome}
            passedPlayer={game.passedPlayer}
            names={names}
          />
        </div>

        <div className="match-board">
          <Board
            board={game.board}
            legalMoves={isComputerTurn ? [] : legalMoves}
            lastMove={game.lastMove}
            onCellClick={play}
            disabled={finished || isComputerTurn}
          />
          <p className="match-caption" aria-hidden="true">
            {caption}
          </p>
          <p className="visually-hidden" aria-live="polite" data-testid="move-announcer">
            {describeLastMove(game, names)}
          </p>
        </div>

        <aside className="match-side" aria-label="Game controls">
          <PlayersPanel
            score={score}
            currentPlayer={game.currentPlayer}
            outcome={game.outcome}
            names={names}
          />

          {/* One slot for transient messages, so the layout doesn't jump */}
          <div className="match-messages">
            <p className="match-thinking" aria-hidden={!thinking}>
              {thinking ? `${names[game.currentPlayer]} is thinking…` : ''}
            </p>
            {game.moveCount === 0 && !thinking && !error && !aiError && (
              <p className="match-hint">Black makes the first move.</p>
            )}
            <p className="match-error" role="alert">
              {aiError
                ? `${names[game.currentPlayer]} could not choose a move (${aiError}). The board has not changed.`
                : error}
            </p>
          </div>

          {confirming ? (
            <div
              className="match-panel match-confirm"
              role="alertdialog"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-text"
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelConfirm()
              }}
            >
              <p id="confirm-title" className="match-panel-title">
                End this session?
              </p>
              <p id="confirm-text">
                {finished
                  ? 'All results from this session will be cleared.'
                  : 'The current game will not be counted, and all results from this session will be cleared.'}
              </p>
              <div className="match-actions">
                <button
                  type="button"
                  className="button button--danger button--block"
                  onClick={onEndSession}
                >
                  End session
                </button>
                <button
                  ref={keepPlayingRef}
                  type="button"
                  className="button button--block"
                  onClick={cancelConfirm}
                >
                  Keep playing
                </button>
              </div>
            </div>
          ) : sessionComplete ? (
            <div className="match-panel match-summary" aria-live="polite">
              <p className="match-panel-title">Session complete</p>
              <p>
                {sessionSummary({ p1: match.players.p1.name, p2: match.players.p2.name }, tally)}
              </p>
              <div className="match-actions">
                <button
                  type="button"
                  className="button button--primary button--block"
                  onClick={onEndSession}
                >
                  New session
                </button>
              </div>
            </div>
          ) : (
            <div className="match-actions">
              {aiError && (
                <button
                  type="button"
                  className="button button--primary button--block"
                  onClick={retryAi}
                >
                  <Icon name="retry" />
                  Retry computer move
                </button>
              )}
              {canNextGame && (
                <button
                  type="button"
                  className="button button--primary button--block"
                  onClick={nextGame}
                >
                  Next game
                  <Icon name="arrowRight" />
                </button>
              )}
              <button
                ref={sideButtonRef}
                type="button"
                className="button button--block"
                onClick={() => askToEnd('side')}
              >
                <Icon name="arrowLeft" />
                End session
              </button>
            </div>
          )}
        </aside>

        <div className="match-results">
          <ResultsPanel match={match} tally={tally} />
        </div>
      </main>
    </div>
  )
}
