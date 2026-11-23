# Sprint 4 risk register — Digital Reversi

Source: **D4 Risk Assessment v1 (21 November 2026)**. Sprint 4 is planned for **28 November–5 December 2026**.

This is a **tracking supplement** to the original D4. The controls below are **planned**, not marked completed. Evidence links and dates must be added when work is actually performed. Do not backdate records or change historical commit attribution.

| ID | Risk | Probability | Effect | Prevention | Contingency |
| --- | --- | --- | --- | --- | --- |
| R1 | Sprint 4 unfinished by 5 Dec | Medium | Failure | Freeze scope; assign tasks; 1 Dec Jira check | Ship must-haves; disclose incomplete verification |
| R2 | Live demo fails | Low | Serious | Protect `main`, release tag, demo check | Vercel rollback, tested local build, recording |
| R3 | Jira/Git evidence inconsistent | Medium | Serious | Link genuine PRs/CI to Jira; record true dates | Explain actual timeline with evidence |
| R4 | Key-person dependency | Medium | Serious | Share access; code walkthroughs; local setups | Named backup member takes over |
| R5 | Regression reaches production | Low | Serious | CI and review before merge | Revert change or roll back deployment |
| R6 | D3 NFR checks incomplete | High | Moderate | 5-user study; timing logs; 20-game UI run; accessibility | Mark only partly evidenced, with exact gaps |
| R7 | Product/docs differ from D3 | Low | Moderate | Review and update traceability when code changes | Fix functionality; explain residual deviations |

## Sprint 4 evidence checklist

- [ ] Scope freeze recorded in Jira (planned 28 Nov)
- [ ] Five-person usability session conducted and results recorded
- [ ] Screen-reader walkthrough recorded
- [ ] 100 human actions timed (D3 NFR01)
- [ ] 100 AI requests per enabled level timed (D3 NFR02)
- [ ] 20 UI games run with outcomes recorded (D3 NFR04)
- [ ] Branch protection and required CI checks verified
- [ ] Release version/tag and rollback process checked
- [ ] Demo machine and live URL verified
- [ ] Team access and code walkthroughs recorded
- [ ] `docs/D3_TRACEABILITY.md` checked against final code

## Evidence log (fill in only after real work)

| Actual date | Risk/NFR | Activity | Evidence link | Result / remaining gap | Reviewer |
| --- | --- | --- | --- | --- | --- |
| TBD | — | — | — | Pending | — |

## Review checkpoints

- 28 Nov 2026: Sprint start, confirm owners and scope
- 1 Dec 2026: Mid-sprint review of risks and Jira progress
- 3 Dec 2026: Planned release freeze and verification
- 5 Dec 2026: Planned sprint completion

**Note:** The offline script `node scripts/release-audit.mjs` only checks local file/configuration completeness; it does not substitute for browser tests, CI, user testing or the D3 timing measurements.
