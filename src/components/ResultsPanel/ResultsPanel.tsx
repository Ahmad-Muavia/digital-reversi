import type { MatchState, PassRecord, PlayerId, Tally } from '../../game'
import './ResultsPanel.css'

interface ResultsPanelProps {
  match: MatchState
  tally: Tally
}

/** e.g. "Ben ×2, Ada" for the forced passes in one game, or a dash. */
function describePasses(passes: readonly PassRecord[], names: Record<PlayerId, string>): string {
  if (passes.length === 0) return '—'
  const counts = new Map<PlayerId, number>()
  for (const { player } of passes) counts.set(player, (counts.get(player) ?? 0) + 1)
  return [...counts]
    .map(([player, n]) => (n > 1 ? `${names[player]} ×${n}` : names[player]))
    .join(', ')
}

export function ResultsPanel({ match, tally }: ResultsPanelProps) {
  const { players, history, passes } = match
  const names = { p1: players.p1.name, p2: players.p2.name }

  return (
    <section className="results" aria-labelledby="results-title">
      <h2 id="results-title">Results</h2>
      <dl className="results-tally">
        <div>
          <dt>{players.p1.name}</dt>
          <dd>{tally.p1}</dd>
        </div>
        <div>
          <dt>{players.p2.name}</dt>
          <dd>{tally.p2}</dd>
        </div>
        <div>
          <dt>Draws</dt>
          <dd>{tally.draws}</dd>
        </div>
      </dl>

      {history.length === 0 ? (
        <p className="results-empty">No games finished yet.</p>
      ) : (
        // Scrolls sideways inside the panel on very narrow screens instead of widening the page
        <div className="results-table-wrap" role="region" aria-label="Game history" tabIndex={0}>
          <table className="results-table">
            <caption className="visually-hidden">Game history</caption>
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Black</th>
                <th scope="col">White</th>
                <th scope="col">Score</th>
                <th scope="col">Winner</th>
                <th scope="col">Passes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const whitePlayer = record.blackPlayer === 'p1' ? 'p2' : 'p1'
                return (
                  <tr key={record.gameNumber}>
                    <td>{record.gameNumber}</td>
                    <td>{players[record.blackPlayer].name}</td>
                    <td>{players[whitePlayer].name}</td>
                    <td>
                      {record.score.black}–{record.score.white}
                    </td>
                    <td>{record.winner ? players[record.winner].name : 'Draw'}</td>
                    <td>
                      {describePasses(
                        passes.filter((p) => p.gameNumber === record.gameNumber),
                        names,
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
