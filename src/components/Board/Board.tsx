import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { BOARD_SIZE, positionLabel } from '../../game'
import type { Board as BoardModel, Cell, Position } from '../../game'
import './Board.css'

interface BoardProps {
  board: BoardModel
  /** When provided, squares become clickable buttons. */
  onCellClick?: (position: Position) => void
  /** Squares to mark as legal moves for the current player. */
  legalMoves?: readonly Position[]
  /** Square of the most recent move, highlighted. */
  lastMove?: Position | null
  /** When true, squares cannot be activated (e.g. game over). */
  disabled?: boolean
  /** A smaller, decorative-size board (used on the landing page). */
  size?: 'normal' | 'preview'
  /** Accessible name of the grid. */
  label?: string
}

const COLUMN_LABELS = Array.from({ length: BOARD_SIZE }, (_, i) =>
  String.fromCharCode(65 + i),
)

const LAST = BOARD_SIZE - 1
const toIndex = ({ row, col }: Position) => row * BOARD_SIZE + col
/** d4: a sensible starting point for keyboard focus. */
const DEFAULT_FOCUS = toIndex({ row: 3, col: 3 })

function describeCell(cell: Cell, isLegal: boolean, isLast: boolean): string {
  const parts = [cell === null ? 'empty' : `${cell} disc`]
  if (isLegal) parts.push('legal move')
  if (isLast) parts.push('last move')
  return parts.join(', ')
}

/** Where an arrow/Home/End/PageUp/PageDown key moves focus, or null. */
function nextFocus(key: string, { row, col }: Position, ctrl: boolean): Position | null {
  switch (key) {
    case 'ArrowUp':
      return { row: Math.max(0, row - 1), col }
    case 'ArrowDown':
      return { row: Math.min(LAST, row + 1), col }
    case 'ArrowLeft':
      return { row, col: Math.max(0, col - 1) }
    case 'ArrowRight':
      return { row, col: Math.min(LAST, col + 1) }
    case 'Home':
      return ctrl ? { row: 0, col: 0 } : { row, col: 0 }
    case 'End':
      return ctrl ? { row: LAST, col: LAST } : { row, col: LAST }
    case 'PageUp':
      return { row: 0, col }
    case 'PageDown':
      return { row: LAST, col }
    default:
      return null
  }
}

export function Board({
  board,
  onCellClick,
  legalMoves = [],
  lastMove = null,
  disabled = false,
  size = 'normal',
  label: gridLabel = 'Reversi board',
}: BoardProps) {
  const legal = new Set(legalMoves.map(toIndex))
  const lastIndex = lastMove ? toIndex(lastMove) : -1
  // Roving tabindex: only one square is in the Tab order; arrows move between squares.
  const [focusIndex, setFocusIndex] = useState(DEFAULT_FOCUS)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, position: Position) => {
    const target = nextFocus(event.key, position, event.ctrlKey)
    if (!target) return
    event.preventDefault()
    const index = toIndex(target)
    setFocusIndex(index)
    buttons.current[index]?.focus()
  }

  return (
    <div className={size === "preview" ? "board-frame board-frame--preview" : "board-frame"}>
      <div className="board-labels board-labels--cols" aria-hidden="true">
        {COLUMN_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="board-labels board-labels--rows" aria-hidden="true">
        {board.map((_, row) => (
          <span key={row}>{row + 1}</span>
        ))}
      </div>
      <div
        className="board"
        role="grid"
        aria-label={gridLabel}
        aria-disabled={onCellClick && disabled ? true : undefined}
      >
        {board.map((cells, row) => (
          <div className="board-row" role="row" key={row}>
            {cells.map((cell, col) => {
              const position = { row, col }
              const index = toIndex(position)
              const isLegal = legal.has(index)
              const isLast = index === lastIndex
              const label = `${positionLabel(position)}, ${describeCell(cell, isLegal, isLast)}`
              const className = ['board-cell', isLegal && 'is-legal', isLast && 'is-last-move']
                .filter(Boolean)
                .join(' ')
              const content = cell ? (
                <span className={`disc disc--${cell}`} data-testid="disc" aria-hidden="true" />
              ) : (
                isLegal && <span className="legal-hint" aria-hidden="true" />
              )
              return (
                <div
                  className={className}
                  role="gridcell"
                  key={col}
                  aria-label={onCellClick ? undefined : label}
                >
                  {onCellClick ? (
                    <button
                      ref={(el) => {
                        buttons.current[index] = el
                      }}
                      type="button"
                      className="board-cell-button"
                      aria-label={label}
                      aria-disabled={disabled || undefined}
                      tabIndex={index === focusIndex ? 0 : -1}
                      onFocus={() => setFocusIndex(index)}
                      onKeyDown={(e) => handleKeyDown(e, position)}
                      onClick={() => {
                        if (!disabled) onCellClick(position)
                      }}
                    >
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
