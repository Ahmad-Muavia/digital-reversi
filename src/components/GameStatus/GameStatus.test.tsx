import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayersPanel, TurnStatus } from './GameStatus'

const playerRows = () =>
  within(screen.getByRole('region', { name: 'Players' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent)

describe('TurnStatus', () => {
  it('announces black as the current player', () => {
    render(<TurnStatus score={{ black: 2, white: 2 }} currentPlayer="black" />)
    expect(screen.getByRole('status')).toHaveTextContent('Black to move')
  })

  it('announces white as the current player', () => {
    render(<TurnStatus score={{ black: 2, white: 2 }} currentPlayer="white" />)
    expect(screen.getByRole('status')).toHaveTextContent('White to move')
  })

  it('announces a pass', () => {
    render(
      <TurnStatus score={{ black: 5, white: 3 }} currentPlayer="black" passedPlayer="white" />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'White has no legal move and passes. Black to move.',
    )
  })

  it('announces the winner when the game is over', () => {
    render(<TurnStatus score={{ black: 40, white: 24 }} currentPlayer="black" outcome="black" />)
    expect(screen.getByRole('status')).toHaveTextContent('Game over: Black wins, 40–24.')
  })

  it('announces a draw', () => {
    render(<TurnStatus score={{ black: 32, white: 32 }} currentPlayer="white" outcome="draw" />)
    expect(screen.getByRole('status')).toHaveTextContent("Game over: it's a draw, 32–32.")
  })

  it('uses custom player names', () => {
    render(
      <TurnStatus
        score={{ black: 2, white: 2 }}
        currentPlayer="white"
        names={{ black: 'Ada', white: 'Ben' }}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Ben to move')
  })
})

describe('PlayersPanel', () => {
  it('shows each player with colour and disc count, black first', () => {
    render(
      <PlayersPanel
        score={{ black: 12, white: 7 }}
        currentPlayer="black"
        names={{ black: 'Ada', white: 'Ben' }}
      />,
    )
    expect(playerRows()).toEqual(['AdaBlackdiscs: 12', 'BenWhitediscs: 7'])
  })

  it('handles zero scores and default names', () => {
    render(<PlayersPanel score={{ black: 0, white: 0 }} currentPlayer="black" />)
    expect(playerRows()).toEqual(['BlackBlackdiscs: 0', 'WhiteWhitediscs: 0'])
  })

  it('marks only the player to move', () => {
    render(<PlayersPanel score={{ black: 2, white: 2 }} currentPlayer="white" />)
    const [black, white] = screen.getAllByRole('listitem')
    expect(black).not.toHaveAttribute('aria-current')
    expect(white).toHaveAttribute('aria-current', 'true')
  })

  it('marks nobody once the game is over', () => {
    render(<PlayersPanel score={{ black: 40, white: 24 }} currentPlayer="black" outcome="black" />)
    for (const li of screen.getAllByRole('listitem')) expect(li).not.toHaveAttribute('aria-current')
  })
})
