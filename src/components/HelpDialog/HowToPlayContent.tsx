const STEPS = [
  'Place a disc so that one or more of your opponent’s discs are trapped in a straight line (across, up and down, or diagonally) between your new disc and another of your own.',
  'All trapped discs flip to your colour. A move must flip at least one opponent disc; legal squares are marked with a gold dot.',
  'If you have no legal move, your turn passes automatically. The game ends when neither player can move, even if squares are empty; the most discs wins, and equal counts are a draw.',
]

/** The rules and controls, shown on the How to play page and in the in-game dialog. */
export function HowToPlayContent() {
  return (
    <div className="howto">
      <p className="lead">
        Reversi is played on an 8×8 board, starting with two black and two white discs in the
        centre. Black moves first, and the player with the most discs at the end wins.
      </p>
      <hr className="rule" />
      <ol className="howto-steps">
        {STEPS.map((step, i) => (
          <li key={i}>
            <span className="howto-num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <h3>Sessions</h3>
      <ul>
        <li>
          A session is 1, 2 or 4 games. Player A has black in games 1 and 3, and white in games 2
          and 4, so each player takes turns going first.
        </li>
        <li>Each name must be 1 to 30 characters, and the two players need different names.</li>
        <li>
          Results and passes are kept in the Results table. After the last game you see the
          session result.
        </li>
        <li>End session (after you confirm) stops the session. A game in progress is not counted.</li>
        <li>There is no undo, and you cannot pass while you have a legal move.</li>
        <li>
          Against the computer, choose Easy (random moves), Medium (plays for good squares) or Hard
          (looks several moves ahead). It moves automatically after a short pause. If it cannot
          choose a move, the board stays as it was and you can retry.
        </li>
      </ul>

      <h3>Controls</h3>
      <ul>
        <li>Click or tap a square to place a disc.</li>
        <li>
          With a keyboard, press <kbd>Tab</kbd> to reach the board, move between squares with the
          arrow keys, and press <kbd>Enter</kbd> or <kbd>Space</kbd> to place a disc.
        </li>
        <li>
          <kbd>Home</kbd> and <kbd>End</kbd> jump to the start or end of a row; <kbd>Ctrl</kbd>+
          <kbd>Home</kbd> and <kbd>Ctrl</kbd>+<kbd>End</kbd> jump to the corners.
        </li>
        <li>Screen readers announce each move, whose turn it is and the result.</li>
      </ul>

      <h3>Your data</h3>
      <ul>
        <li>
          Names are only labels on this device; there are no accounts and nothing is sent over the
          internet.
        </li>
        <li>Nothing is saved: reloading the page clears the session and its results.</li>
      </ul>
    </div>
  )
}
