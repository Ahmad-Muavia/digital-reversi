import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { answerRequest } from '../../ai'
import type { AiProvider } from '../../ai'
import { createInitialGameState, playMove } from '../../game'
import type { SessionConfig } from '../../game'
import { describeLastMove } from './describeLastMove'
import { MatchScreen } from './MatchScreen'

const names = { black: 'Ada', white: 'Ben' }
const config: SessionConfig = {
  players: {
    p1: { name: 'Ada', kind: 'human' },
    p2: { name: 'Ben', kind: 'human' },
  },
  length: 1,
}

describe('describeLastMove', () => {
  it('is empty before any move', () => {
    expect(describeLastMove(createInitialGameState(), names)).toBe('')
  })

  it('names the player, square and number of flips', () => {
    const game = playMove(createInitialGameState(), { row: 2, col: 3 })
    expect(describeLastMove(game, names)).toBe('Ada played d3 and flipped 1 disc.')
  })

  it('uses the plural for several flips', () => {
    const game = { ...playMove(createInitialGameState(), { row: 2, col: 3 }) }
    const withTwo = { ...game, lastFlips: [...game.lastFlips, { row: 0, col: 0 }] }
    expect(describeLastMove(withTwo, names)).toBe('Ada played d3 and flipped 2 discs.')
  })
})

describe('MatchScreen', () => {
  it('announces each move in a polite live region', async () => {
    const user = userEvent.setup()
    render(<MatchScreen config={config} onEndSession={() => {}} />)
    const announcer = screen.getByTestId('move-announcer')
    expect(announcer).toHaveAttribute('aria-live', 'polite')
    expect(announcer).toBeEmptyDOMElement()

    await user.click(screen.getByRole('button', { name: /^d3,/ }))
    expect(announcer).toHaveTextContent('Ada played d3 and flipped 1 disc.')
  })

  it('can be played entirely from the keyboard', async () => {
    const user = userEvent.setup()
    render(<MatchScreen config={config} onEndSession={() => {}} />)
    await user.tab() // Setup (top bar)
    await user.tab() // focus enters the board at d4
    await user.keyboard('{ArrowUp}{Enter}') // d3
    expect(screen.getByRole('status')).toHaveTextContent('Ben to move')
    await user.keyboard('{ArrowLeft}{Enter}') // c3, legal for white
    expect(screen.getByRole('status')).toHaveTextContent('Ada to move')
    expect(screen.getByTestId('move-announcer')).toHaveTextContent('Ben played c3')
  })
})

describe('MatchScreen end session (D3 REQ-SET-02)', () => {
  it('asks for confirmation before ending the session', async () => {
    const user = userEvent.setup()
    const onEndSession = vi.fn()
    render(<MatchScreen config={config} onEndSession={onEndSession} />)
    await user.click(screen.getByRole('button', { name: /^d3,/ }))

    await user.click(screen.getByRole('button', { name: 'End session' }))
    const dialog = screen.getByRole('alertdialog', { name: 'End this session?' })
    expect(dialog).toHaveTextContent('The current game will not be counted')
    expect(within(dialog).getByRole('button', { name: 'Keep playing' })).toHaveFocus()

    // Declining returns to the unchanged game
    await user.click(within(dialog).getByRole('button', { name: 'Keep playing' }))
    expect(onEndSession).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Ben to move')
    expect(screen.getByRole('button', { name: 'End session' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'End session' }),
    )
    expect(onEndSession).toHaveBeenCalledTimes(1)
  })

  it('closes the confirmation with Escape', async () => {
    const user = userEvent.setup()
    render(<MatchScreen config={config} onEndSession={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows the session result and no Next game after the last game', async () => {
    const user = userEvent.setup()
    const onEndSession = vi.fn()
    render(<MatchScreen config={config} onEndSession={onEndSession} />)
    for (const label of ['d3', 'c3', 'b3', 'd2', 'e1', 'd6', 'd7', 'e3', 'f4']) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label},`) }))
    }
    expect(screen.getByText('Session complete')).toBeInTheDocument()
    expect(screen.getByText('Ada wins the session 1–0.')).toBeInTheDocument()
    expect(screen.getByText('Game 1 of 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next game' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New session' }))
    expect(onEndSession).toHaveBeenCalledTimes(1)
  })
})

describe('MatchScreen AI failure (D3 REQ-AI-02)', () => {
  const vsComputer: SessionConfig = {
    players: {
      p1: { name: 'Ada', kind: 'human' },
      p2: { name: 'Computer (Easy)', kind: 'computer', difficulty: 'easy' },
    },
    length: 1,
  }

  it('shows the failure, keeps the board, and retries on request', async () => {
    const user = userEvent.setup()
    let broken = true
    const provider: AiProvider = async (request) =>
      broken ? { requestId: request.requestId, cellIndex: 99 } : answerRequest(request)
    render(
      <MatchScreen config={vsComputer} onEndSession={() => {}} aiDelayMs={0} aiProvider={provider} />,
    )
    await user.click(screen.getByRole('button', { name: /^d3,/ }))

    const alert = await screen.findByText(/could not choose a move/)
    expect(alert).toHaveTextContent(
      'Computer (Easy) could not choose a move (cell index out of range). The board has not changed.',
    )
    expect(screen.getAllByTestId('disc')).toHaveLength(5)
    expect(screen.queryByText(/is thinking/)).not.toBeInTheDocument()

    broken = false
    await user.click(screen.getByRole('button', { name: 'Retry computer move' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Ada to move'))
    expect(screen.getAllByTestId('disc')).toHaveLength(6)
    expect(screen.queryByRole('button', { name: 'Retry computer move' })).not.toBeInTheDocument()
  })
})

describe('MatchScreen top bar', () => {
  it('asks before leaving with the Setup button and returns focus to it', async () => {
    const user = userEvent.setup()
    const onEndSession = vi.fn()
    render(<MatchScreen config={config} onEndSession={onEndSession} onHelp={() => {}} />)
    expect(screen.getByText('Session · 1 game')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Setup' }))
    expect(screen.getByRole('alertdialog', { name: 'End this session?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.getByRole('button', { name: 'Setup' })).toHaveFocus()
    expect(onEndSession).not.toHaveBeenCalled()
  })

  it('leaves without asking once the session is complete', async () => {
    const user = userEvent.setup()
    const onEndSession = vi.fn()
    render(<MatchScreen config={config} onEndSession={onEndSession} />)
    for (const label of ['d3', 'c3', 'b3', 'd2', 'e1', 'd6', 'd7', 'e3', 'f4']) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label},`) }))
    }
    await user.click(screen.getByRole('button', { name: 'Setup' }))
    expect(onEndSession).toHaveBeenCalledTimes(1)
  })

  it('opens How to play without changing the game', async () => {
    const user = userEvent.setup()
    const onHelp = vi.fn()
    render(<MatchScreen config={config} onEndSession={() => {}} onHelp={onHelp} />)
    await user.click(screen.getByRole('button', { name: 'How to play' }))
    expect(onHelp).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Black makes the first move.')).toBeInTheDocument()
  })
})
