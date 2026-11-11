import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMatch } from '../../game'
import type { MatchState } from '../../game'
import { ResultsPanel } from './ResultsPanel'

const base = createMatch({
  p1: { name: 'Ada', kind: 'human' },
  p2: { name: 'Ben', kind: 'human' },
})

describe('ResultsPanel', () => {
  it('shows an empty state before any game finishes', () => {
    render(<ResultsPanel match={base} tally={{ p1: 0, p2: 0, draws: 0 }} />)
    expect(screen.getByText('No games finished yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('lists each game with colours, score, winner and passes', () => {
    const match: MatchState = {
      ...base,
      gameNumber: 3,
      history: [
        { gameNumber: 1, blackPlayer: 'p1', outcome: 'black', score: { black: 40, white: 24 }, winner: 'p1' },
        { gameNumber: 2, blackPlayer: 'p2', outcome: 'draw', score: { black: 32, white: 32 }, winner: null },
      ],
      passes: [
        { gameNumber: 2, player: 'p2', disc: 'black', afterMove: 40 },
        { gameNumber: 2, player: 'p1', disc: 'white', afterMove: 50 },
        { gameNumber: 2, player: 'p2', disc: 'black', afterMove: 55 },
      ],
    }
    render(<ResultsPanel match={match} tally={{ p1: 1, p2: 0, draws: 1 }} />)

    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('GameBlackWhiteScoreWinnerPasses')
    expect(rows[1]).toHaveTextContent(/1\s*Ada\s*Ben\s*40–24\s*Ada\s*—/)
    expect(rows[2]).toHaveTextContent(/2\s*Ben\s*Ada\s*32–32\s*Draw\s*Ben ×2, Ada/)
  })

  it('shows the running tally', () => {
    render(<ResultsPanel match={base} tally={{ p1: 3, p2: 2, draws: 1 }} />)
    const terms = screen.getAllByRole('term').map((t) => t.textContent)
    const values = screen.getAllByRole('definition').map((d) => d.textContent)
    expect(terms).toEqual(['Ada', 'Ben', 'Draws'])
    expect(values).toEqual(['3', '2', '1'])
  })
})
