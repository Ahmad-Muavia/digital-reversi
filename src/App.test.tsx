import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

type User = ReturnType<typeof userEvent.setup>

const square = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label},`) })
/** "Name: discs" for each player, black first, from the Players panel. */
const scores = () =>
  within(screen.getByRole('region', { name: 'Players' }))
    .getAllByRole('listitem')
    .map(
      (li) =>
        `${li.querySelector('.player-name')!.textContent}: ${li.querySelector('.player-score')!.textContent!.replace('discs: ', '')}`,
    )

/** Who has which colour, from the Players panel. */
const colours = () =>
  within(screen.getByRole('region', { name: 'Players' }))
    .getAllByRole('listitem')
    .map((li) => `${li.querySelector('.player-name')!.textContent} (${li.querySelector('.player-colour')!.textContent})`)

/** From the landing page to the setup form. */
async function openSetup(user: User) {
  await user.click(screen.getByRole('button', { name: 'Start game' }))
}

/** 9-move game ending 13–0 to black. */
const SHORT_GAME = ['d3', 'c3', 'b3', 'd2', 'e1', 'd6', 'd7', 'e3', 'f4']

async function startMatch(user: User, games: 1 | 2 | 4 = 1) {
  if (!screen.queryByRole('form', { name: 'Set up your game' })) await openSetup(user)
  await user.type(screen.getByLabelText('Player A name'), 'Ada')
  await user.type(screen.getByLabelText('Player B name'), 'Ben')
  if (games > 1) await user.click(screen.getByRole('radio', { name: `${games} games` }))
  await user.click(screen.getByRole('button', { name: 'Start game' }))
}

async function playMoves(user: User, moves: string[]) {
  for (const move of moves) await user.click(square(move))
}

describe('App', () => {
  it('opens on the landing page with the opening position', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Digital Reversi' }),
    ).toBeInTheDocument()
    const preview = screen.getByRole('grid', { name: /^Opening position/ })
    expect(within(preview).getAllByTestId('disc')).toHaveLength(4)
    expect(within(preview).queryAllByRole('button')).toHaveLength(0) // decorative, not playable

    await openSetup(user)
    expect(screen.getByRole('form', { name: 'Set up your game' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Back' })[0])
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('shows How to play as a page and goes on to set up a game', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'How to play' }))
    expect(screen.getByRole('heading', { level: 2, name: 'How to play' })).toBeInTheDocument()
    expect(screen.getByText(/Black moves first/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'How to play' }))
    await user.click(screen.getByRole('button', { name: 'Set up a game' }))
    expect(screen.getByRole('form', { name: 'Set up your game' })).toBeInTheDocument()
  })

  it('starts a session in the opening position with player 1 on black', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startMatch(user)

    expect(screen.getByText('Game 1 of 1')).toBeInTheDocument()
    expect(colours()).toEqual(['Ada (Black)', 'Ben (White)'])
    expect(screen.getAllByTestId('disc')).toHaveLength(4)
    expect(screen.getByRole('status')).toHaveTextContent('Ada to move')
    expect(scores()).toEqual(['Ada: 2', 'Ben: 2'])
    expect(screen.getAllByRole('button', { name: /legal move/ })).toHaveLength(4)
  })

  it('does not start with missing or duplicate names', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openSetup(user)
    await user.click(screen.getByRole('button', { name: 'Start game' }))
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(screen.getAllByText('Enter a name.')).toHaveLength(2)

    await user.type(screen.getByLabelText('Player A name'), 'Ada')
    await user.type(screen.getByLabelText('Player B name'), 'ada')
    await user.click(screen.getByRole('button', { name: 'Start game' }))
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(screen.getByText('Choose a different name from Player A.')).toBeInTheDocument()
  })

  it('plays a legal move, flips discs and passes the turn', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startMatch(user)
    await user.click(square('d3'))

    expect(square('d3')).toHaveAccessibleName('d3, black disc, last move')
    expect(square('d4')).toHaveAccessibleName('d4, black disc')
    expect(scores()).toEqual(['Ada: 4', 'Ben: 1'])
    expect(screen.getByRole('status')).toHaveTextContent('Ben to move')
  })

  it('rejects an illegal move with a message and no change', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startMatch(user)
    await user.click(square('a1'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'a1 is not a legal move. Choose a highlighted square.',
    )
    expect(scores()).toEqual(['Ada: 2', 'Ben: 2'])

    await user.click(square('d3'))
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it('plays a full game, records the result and swaps colours for the next game', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startMatch(user, 2)
    await playMoves(user, SHORT_GAME)

    expect(screen.getByRole('status')).toHaveTextContent('Game over: Ada wins, 13–0.')
    expect(screen.queryAllByRole('button', { name: /legal move/ })).toHaveLength(0)
    
    const results = screen.getByRole('region', { name: 'Results' })
    const rows = within(results).getAllByRole('row')
    expect(rows[1]).toHaveTextContent(/1\s*Ada\s*Ben\s*13–0\s*Ada/)

    // board is locked
    await user.click(square('a1'))
    expect(scores()).toEqual(['Ada: 13', 'Ben: 0'])

    await user.click(screen.getByRole('button', { name: 'Next game' }))
    expect(screen.getByText('Game 2 of 2')).toBeInTheDocument()
    expect(colours()).toEqual(['Ben (Black)', 'Ada (White)'])
    expect(screen.getByRole('status')).toHaveTextContent('Ben to move')

    // Same moves again: now Ben (black) wins
    await playMoves(user, SHORT_GAME)
    expect(screen.getByRole('status')).toHaveTextContent('Game over: Ben wins, 13–0.')
    const tally = within(results).getAllByRole('definition').map((d) => d.textContent)
    expect(tally).toEqual(['1', '1', '0'])

    // The session is over: a summary and no further game
    expect(screen.getByText('Session drawn: 1–1.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next game' })).not.toBeInTheDocument()
  })

  it('opens How to play during a game without losing progress', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startMatch(user)
    await user.click(square('d3'))
    await user.click(screen.getByRole('button', { name: 'How to play' }))
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(scores()).toEqual(['Ada: 4', 'Ben: 1'])
    expect(screen.getByRole('status')).toHaveTextContent('Ben to move')
  })

  it('plays against the computer, which replies on its own', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openSetup(user)
    await user.click(screen.getByRole('radio', { name: /^Human vs AI/ }))
    await user.type(screen.getByLabelText('Player A name'), 'Ada')
    await user.click(screen.getByRole('radio', { name: 'Easy' }))
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(colours()).toEqual(['Ada (Black)', 'Computer (Easy) (White)'])
    await user.click(square('d3'))

    // While the computer thinks, the board shows no hints for the human
    expect(screen.getByText('Computer (Easy) is thinking…')).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /legal move/ })).toHaveLength(0)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Ada to move'), {
      timeout: 3000,
    })
    expect(screen.getAllByTestId('disc')).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: /legal move/ }).length).toBeGreaterThan(0)
  })

  it('ends the session after confirmation and starts fresh', async () => {
    const user = userEvent.setup()
    render(<App />)
    await startMatch(user, 2)
    await user.click(square('d3'))
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'End session' }),
    )
    expect(screen.getByRole('form', { name: 'Set up your game' })).toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()

    // Nothing from the previous session carries over
    await startMatch(user)
    expect(scores()).toEqual(['Ada: 2', 'Ben: 2'])
    expect(screen.getByText('No games finished yet.')).toBeInTheDocument()
  })

  it('shows markup-like names as plain text (NFR10)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openSetup(user)
    await user.type(screen.getByLabelText('Player A name'), '<b>Ada</b>')
    await user.type(screen.getByLabelText('Player B name'), '<img src=x>')
    await user.click(screen.getByRole('button', { name: 'Start game' }))
    expect(screen.getByRole('status')).toHaveTextContent('<b>Ada</b> to move')
    expect(document.querySelector('main b, main img')).toBeNull()
  })
})
