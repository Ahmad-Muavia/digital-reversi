import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DIFFICULTY_LABELS, MAX_NAME_LENGTH, SESSION_LENGTHS, validateNames } from '../../game'
import type {
  Difficulty,
  NameErrors,
  PlayerId,
  PlayerInfo,
  SessionConfig,
  SessionLength,
} from '../../game'
import { Icon } from '../Icon'
import './SetupScreen.css'

interface SetupScreenProps {
  onStart: (config: SessionConfig) => void
  /** Returns to the previous page. */
  onBack?: () => void
}

type Mode = 'hvh' | 'hvc'

const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[]

const MODES: { value: Mode; title: string; hint: string; icon: 'users' | 'bot' }[] = [
  { value: 'hvh', title: 'Human vs Human', hint: 'Share the board with a friend', icon: 'users' },
  { value: 'hvc', title: 'Human vs AI', hint: 'Play against the computer', icon: 'bot' },
]

export function SetupScreen({ onStart, onBack }: SetupScreenProps) {
  const [mode, setMode] = useState<Mode>('hvh')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [length, setLength] = useState<SessionLength>(1)
  const [errors, setErrors] = useState<NameErrors>({})
  const p1Ref = useRef<HTMLInputElement>(null)
  const p2Ref = useRef<HTMLInputElement>(null)

  const buildPlayers = (): Record<PlayerId, PlayerInfo> => ({
    p1: { name: p1, kind: 'human' },
    p2:
      mode === 'hvh'
        ? { name: p2, kind: 'human' }
        : { name: `Computer (${DIFFICULTY_LABELS[difficulty]})`, kind: 'computer', difficulty },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const players = buildPlayers()
    const found = validateNames(players)
    setErrors(found)
    if (found.p1) {
      p1Ref.current?.focus()
      return
    }
    if (found.p2) {
      p2Ref.current?.focus()
      return
    }
    onStart({
      players: {
        p1: { ...players.p1, name: players.p1.name.trim() },
        p2: { ...players.p2, name: players.p2.name.trim() },
      },
      length,
    })
  }

  const changeMode = (next: Mode) => {
    setMode(next)
    setErrors({})
  }

  return (
    <main className="page">
      {onBack && (
        <div>
          <button type="button" className="link-button" onClick={onBack}>
            <Icon name="arrowLeft" />
            Back
          </button>
        </div>
      )}
      <form className="setup" onSubmit={handleSubmit} noValidate aria-labelledby="setup-title">
        <div className="page-head">
          <p className="eyebrow">New session</p>
          <h2 id="setup-title">Set up your game</h2>
          <p className="lead">Choose your opponent and name the players.</p>
        </div>
        <hr className="rule" />

        <fieldset className="setup-group">
          <legend>Game mode</legend>
          <div className="choice-grid">
            {MODES.map((m) => (
              <label key={m.value} className="choice-card">
                <input
                  type="radio"
                  name="mode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => changeMode(m.value)}
                />
                <span className="choice-icon">
                  <Icon name={m.icon} />
                </span>
                <span className="choice-text">
                  <span className="choice-title">{m.title}</span>
                  <span className="choice-hint">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="setup-names">
          <div className="setup-field">
            <label htmlFor="name-p1">Player A name</label>
            <input
              id="name-p1"
              ref={p1Ref}
              type="text"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              placeholder="Enter a name"
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              required
              aria-invalid={errors.p1 ? true : undefined}
              aria-describedby={errors.p1 ? 'name-p1-error' : undefined}
            />
            {errors.p1 && (
              <p id="name-p1-error" className="setup-error">
                {errors.p1}
              </p>
            )}
          </div>

          {mode === 'hvh' ? (
            <div className="setup-field">
              <label htmlFor="name-p2">Player B name</label>
              <input
                id="name-p2"
                ref={p2Ref}
                type="text"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                placeholder="Enter a name"
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                required
                aria-invalid={errors.p2 ? true : undefined}
                aria-describedby={errors.p2 ? 'name-p2-error' : undefined}
              />
              {errors.p2 && (
                <p id="name-p2-error" className="setup-error">
                  {errors.p2}
                </p>
              )}
            </div>
          ) : (
            <fieldset className="setup-group">
              <legend>Computer difficulty</legend>
              <div className="segmented">
                {DIFFICULTIES.map((d) => (
                  <label key={d} className="segment">
                    <input
                      type="radio"
                      name="difficulty"
                      value={d}
                      checked={difficulty === d}
                      onChange={() => setDifficulty(d)}
                    />
                    {DIFFICULTY_LABELS[d]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <fieldset className="setup-group">
          <legend>Session length</legend>
          <div className="segmented">
            {SESSION_LENGTHS.map((n) => (
              <label key={n} className="segment">
                <input
                  type="radio"
                  name="length"
                  value={n}
                  checked={length === n}
                  onChange={() => setLength(n)}
                />
                {n === 1 ? '1 game' : `${n} games`}
              </label>
            ))}
          </div>
          <p className="setup-note">
            Player A has black in odd-numbered games and white in even-numbered games.
          </p>
        </fieldset>

        <hr className="rule" />
        <div className="setup-actions">
          {onBack && (
            <button type="button" className="button" onClick={onBack}>
              Back
            </button>
          )}
          <button type="submit" className="button button--primary">
            Start game
          </button>
        </div>
      </form>
    </main>
  )
}
