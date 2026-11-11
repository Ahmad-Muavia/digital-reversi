import { HowToPlayContent } from '../HelpDialog'
import { Icon } from '../Icon'
import './HowToPage.css'

interface HowToPageProps {
  onBack: () => void
  onSetUp: () => void
}

export function HowToPage({ onBack, onSetUp }: HowToPageProps) {
  return (
    <main className="page">
      <div>
        <button type="button" className="link-button" onClick={onBack}>
          <Icon name="arrowLeft" />
          Back
        </button>
      </div>
      <div className="page-head">
        <span className="howto-page-icon">
          <Icon name="book" />
        </span>
        <h2>How to play</h2>
      </div>
      <HowToPlayContent />
      <div>
        <button type="button" className="button button--primary" onClick={onSetUp}>
          Set up a game
          <Icon name="arrowRight" />
        </button>
      </div>
    </main>
  )
}
