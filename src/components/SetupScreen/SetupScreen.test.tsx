import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_NAME_LENGTH } from '../../game'
import { SetupScreen } from './SetupScreen'

const start = () => screen.getByRole('button', { name: 'Start game' })

describe('SetupScreen', () => {
  it('submits trimmed names and the default 1-game length', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SetupScreen onStart={onStart} />)

    await user.type(screen.getByLabelText('Player A name'), '  Ada ')
    await user.type(screen.getByLabelText('Player B name'), 'Ben')
    await user.click(start())

    expect(onStart).toHaveBeenCalledWith({
      players: {
        p1: { name: 'Ada', kind: 'human' },
        p2: { name: 'Ben', kind: 'human' },
      },
      length: 1,
    })
  })

  it('offers sessions of 1, 2 or 4 games', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SetupScreen onStart={onStart} />)
    const group = screen.getByRole('group', { name: 'Session length' })
    expect(within(group).getAllByRole('radio').map((r) => r.closest('label')!.textContent)).toEqual(['1 game', '2 games', '4 games'])
    expect(screen.getByRole('radio', { name: '1 game' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: '4 games' }))
    await user.type(screen.getByLabelText('Player A name'), 'Ada')
    await user.type(screen.getByLabelText('Player B name'), 'Ben')
    await user.click(start())
    expect(onStart.mock.calls[0][0].length).toBe(4)
  })

  it('can be submitted with the Enter key', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SetupScreen onStart={onStart} />)
    await user.type(screen.getByLabelText('Player A name'), 'Ada')
    await user.type(screen.getByLabelText('Player B name'), 'Ben{Enter}')
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('rejects blank names with a message on each field and does not start', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SetupScreen onStart={onStart} />)
    await user.type(screen.getByLabelText('Player B name'), '   ')
    await user.click(start())

    expect(onStart).not.toHaveBeenCalled()
    const p1 = screen.getByLabelText('Player A name')
    expect(p1).toHaveAttribute('aria-invalid', 'true')
    expect(p1).toHaveAccessibleDescription('Enter a name.')
    expect(screen.getByLabelText('Player B name')).toHaveAccessibleDescription('Enter a name.')
    expect(p1).toHaveFocus()
  })

  it('rejects names that match ignoring case', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SetupScreen onStart={onStart} />)
    await user.type(screen.getByLabelText('Player A name'), 'Ada')
    await user.type(screen.getByLabelText('Player B name'), 'ADA')
    await user.click(start())

    expect(onStart).not.toHaveBeenCalled()
    const p2 = screen.getByLabelText('Player B name')
    expect(p2).toHaveAccessibleDescription('Choose a different name from Player A.')
    expect(p2).toHaveFocus()

    await user.clear(p2)
    await user.type(p2, 'Ben')
    await user.click(start())
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('defaults to two human players', () => {
    render(<SetupScreen onStart={() => {}} />)
    expect(screen.getByRole('radio', { name: /^Human vs Human/ })).toBeChecked()
    expect(screen.queryByRole('group', { name: 'Computer difficulty' })).not.toBeInTheDocument()
  })

  it('sets up a session against the computer at the chosen difficulty', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SetupScreen onStart={onStart} />)

    await user.click(screen.getByRole('radio', { name: /^Human vs AI/ }))
    expect(screen.queryByLabelText('Player B name')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Player A name'), 'Ada')
    await user.click(screen.getByRole('radio', { name: 'Hard' }))
    await user.click(start())

    expect(onStart).toHaveBeenCalledWith({
      players: {
        p1: { name: 'Ada', kind: 'human' },
        p2: { name: 'Computer (Hard)', kind: 'computer', difficulty: 'hard' },
      },
      length: 1,
    })
  })

  it('defaults the computer to medium difficulty', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SetupScreen onStart={onStart} />)
    await user.click(screen.getByRole('radio', { name: /^Human vs AI/ }))
    await user.type(screen.getByLabelText('Player A name'), 'Ada')
    await user.click(start())
    expect(onStart.mock.calls[0][0].players.p2).toMatchObject({
      kind: 'computer',
      difficulty: 'medium',
    })
  })

  it('limits names to 30 characters', () => {
    render(<SetupScreen onStart={() => {}} />)
    expect(MAX_NAME_LENGTH).toBe(30)
    expect(screen.getByLabelText('Player A name')).toHaveAttribute('maxLength', '30')
    expect(screen.getByLabelText('Player B name')).toHaveAttribute('maxLength', '30')
  })
})
