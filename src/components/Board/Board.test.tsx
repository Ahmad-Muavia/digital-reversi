import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createEmptyBoard, createInitialBoard } from '../../game'
import { Board } from './Board'

describe('Board', () => {
  it('renders an 8x8 grid', () => {
    render(<Board board={createInitialBoard()} />)
    const grid = screen.getByRole('grid', { name: 'Reversi board' })
    const rows = within(grid).getAllByRole('row')
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(within(row).getAllByRole('gridcell')).toHaveLength(8)
    }
  })

  it('shows the four starting discs on the correct squares', () => {
    render(<Board board={createInitialBoard()} />)
    expect(screen.getAllByTestId('disc')).toHaveLength(4)
    expect(screen.getByRole('gridcell', { name: 'd4, white disc' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'e4, black disc' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'd5, black disc' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'e5, white disc' })).toBeInTheDocument()
  })

  it('labels empty squares', () => {
    render(<Board board={createInitialBoard()} />)
    expect(screen.getByRole('gridcell', { name: 'a1, empty' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'h8, empty' })).toBeInTheDocument()
  })

  it('renders no discs for an empty board', () => {
    render(<Board board={createEmptyBoard()} />)
    expect(screen.queryAllByTestId('disc')).toHaveLength(0)
  })

  it('applies a colour class to each disc', () => {
    render(<Board board={createInitialBoard()} />)
    const discs = screen.getAllByTestId('disc')
    expect(discs.filter((d) => d.classList.contains('disc--black'))).toHaveLength(2)
    expect(discs.filter((d) => d.classList.contains('disc--white'))).toHaveLength(2)
  })

  it('has no buttons when no click handler is given', () => {
    render(<Board board={createInitialBoard()} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('reports the clicked position when a handler is given', async () => {
    const onCellClick = vi.fn()
    render(<Board board={createInitialBoard()} onCellClick={onCellClick} />)
    expect(screen.getAllByRole('button')).toHaveLength(64)

    await userEvent.click(screen.getByRole('button', { name: 'c4, empty' }))
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick).toHaveBeenCalledWith({ row: 3, col: 2 })
  })

  it('marks legal moves with a hint and label', () => {
    render(
      <Board
        board={createInitialBoard()}
        legalMoves={[{ row: 2, col: 3 }]}
        onCellClick={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: 'd3, empty, legal move' })
    expect(button.querySelector('.legal-hint')).not.toBeNull()
    expect(document.querySelectorAll('.legal-hint')).toHaveLength(1)
  })

  it('highlights the last move', () => {
    render(<Board board={createInitialBoard()} lastMove={{ row: 3, col: 4 }} />)
    const cell = screen.getByRole('gridcell', { name: 'e4, black disc, last move' })
    expect(cell).toHaveClass('is-last-move')
  })

  it('does not report clicks when disabled', async () => {
    const onCellClick = vi.fn()
    render(<Board board={createInitialBoard()} onCellClick={onCellClick} disabled />)
    const button = screen.getByRole('button', { name: 'c4, empty' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(button)
    expect(onCellClick).not.toHaveBeenCalled()
  })

  it('puts only one square in the Tab order (roving tabindex)', () => {
    render(<Board board={createInitialBoard()} onCellClick={() => {}} />)
    const tabbable = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAccessibleName('d4, white disc')
  })

  it('moves focus with the arrow keys and stops at the edges', async () => {
    const user = userEvent.setup()
    render(<Board board={createInitialBoard()} onCellClick={() => {}} />)
    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('d4, white disc')

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toHaveAccessibleName('e4, black disc')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toHaveAccessibleName('e5, white disc')
    await user.keyboard('{ArrowLeft}{ArrowUp}{ArrowUp}')
    expect(document.activeElement).toHaveAccessibleName('d3, empty')

    await user.keyboard('{Home}')
    expect(document.activeElement).toHaveAccessibleName('a3, empty')
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toHaveAccessibleName('a3, empty')
    await user.keyboard('{End}')
    expect(document.activeElement).toHaveAccessibleName('h3, empty')
    await user.keyboard('{PageDown}')
    expect(document.activeElement).toHaveAccessibleName('h8, empty')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toHaveAccessibleName('h8, empty')
    await user.keyboard('{Control>}{Home}{/Control}')
    expect(document.activeElement).toHaveAccessibleName('a1, empty')
    await user.keyboard('{PageDown}{PageUp}')
    expect(document.activeElement).toHaveAccessibleName('a1, empty')
    await user.keyboard('{Control>}{End}{/Control}')
    expect(document.activeElement).toHaveAccessibleName('h8, empty')

    // the focused square is now the only tabbable one
    const tabbable = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(tabbable).toEqual([document.activeElement])
  })

  it('places a disc on the focused square with Enter or Space', async () => {
    const onCellClick = vi.fn()
    const user = userEvent.setup()
    render(<Board board={createInitialBoard()} onCellClick={onCellClick} />)
    await user.tab()
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onCellClick).toHaveBeenLastCalledWith({ row: 2, col: 3 })
    await user.keyboard('{ArrowLeft} ')
    expect(onCellClick).toHaveBeenLastCalledWith({ row: 2, col: 2 })
  })

  it('ignores other keys', async () => {
    const user = userEvent.setup()
    render(<Board board={createInitialBoard()} onCellClick={() => {}} />)
    await user.tab()
    await user.keyboard('x')
    expect(document.activeElement).toHaveAccessibleName('d4, white disc')
  })

  it('supports keyboard activation of squares', async () => {
    const onCellClick = vi.fn()
    render(<Board board={createInitialBoard()} onCellClick={onCellClick} />)
    screen.getByRole('button', { name: 'f5, empty' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(onCellClick).toHaveBeenCalledWith({ row: 4, col: 5 })
  })
})
