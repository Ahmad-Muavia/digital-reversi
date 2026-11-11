import { createInitialBoard, getLegalMoves } from '../../game'
import { Board } from '../Board'
import { Brand, Icon } from '../Icon'
import './LandingScreen.css'

interface LandingScreenProps {
  onStart: () => void
  onHowToPlay: () => void
}

const OPENING = createInitialBoard()
const OPENING_MOVES = getLegalMoves(OPENING, 'black')

export function LandingScreen({ onStart, onHowToPlay }: LandingScreenProps) {
  return (
    <div className="landing">
      <header className="landing-bar">
        <Brand />
        <span className="landing-tag">
          <Icon name="users" />
          Two players. One board.
        </span>
      </header>

      <main className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">The classic strategy game</p>
          <h1>
            Digital <span className="landing-accent">Reversi</span>
          </h1>
          <p className="landing-lead">
            A little foresight goes a long way. Surround your opponent’s discs, flip the board, and
            claim more territory.
          </p>
          <div className="app-actions">
            <button type="button" className="button button--primary button--large" onClick={onStart}>
              Start game
              <Icon name="arrowRight" />
            </button>
            <button type="button" className="button button--large" onClick={onHowToPlay}>
              <Icon name="help" />
              How to play
            </button>
          </div>
        </div>

        <figure className="landing-preview">
          <Board
            board={OPENING}
            legalMoves={OPENING_MOVES}
            size="preview"
            label="Opening position: four discs in the centre, Black's four legal moves marked"
          />
          <figcaption>
            <span>8 × 8 board</span>
            <span>Black opens</span>
          </figcaption>
        </figure>
      </main>

      <footer className="landing-foot">
        <span>Digital Reversi</span>
        <span>Classic play, shared across the table.</span>
      </footer>
    </div>
  )
}
