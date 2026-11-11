import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HelpDialog } from './HelpDialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Help
      </button>
      <HelpDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

describe('HelpDialog', () => {
  it('renders nothing when closed', () => {
    render(<HelpDialog open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is a labelled modal dialog explaining the rules', () => {
    render(<HelpDialog open onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'How to play' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    for (const heading of ['Sessions', 'Controls', 'Your data']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    // The three numbered rules
    expect(within(dialog).getAllByRole('list')[0].children).toHaveLength(3)
    expect(dialog).toHaveTextContent('Black moves first')
  })

  it('moves focus into the dialog when opened', () => {
    render(<HelpDialog open onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it.each([
    ['the Close button', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Close' }))
    }],
    ['the Escape key', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.keyboard('{Escape}')
    }],
  ])('closes with %s and returns focus to the trigger', async (_, close) => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Help' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await close(user)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes when the backdrop is clicked but not when the dialog is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<HelpDialog open onClose={onClose} />)
    await user.click(screen.getByRole('heading', { name: 'Sessions' }))
    expect(onClose).not.toHaveBeenCalled()
    await user.click(document.querySelector('.help-backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps keyboard focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<HelpDialog open onClose={() => {}} />)
    const close = screen.getByRole('button', { name: 'Close' })
    const body = document.querySelector<HTMLElement>('.help-body')!

    await user.tab()
    expect(body).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(body).toHaveFocus()
  })
})
