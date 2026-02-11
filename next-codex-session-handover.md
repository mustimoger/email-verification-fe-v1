# Initial Handover Message For Next Codex Session

Use the message below as the **first message** when the next Codex session starts:

```text
Continue the External API migration from the current in-repo state.

Read these files first, in this exact order:
1) ext-api-updates.md (Sections 0, 4, 5, 8, 9, 10)
2) ui-progress.md (latest completed task entries)
3) next-codex-session-handover.md

Current migration status (locked):
- Frontend Phase B is completed and validated.
- Backend Phases C1 + C2 + C3 + C4 are completed and validated.
- Frontend Phases D1 + D2 are completed and validated.
- Backend Phase E2 is completed and validated.
- Phase E3 integration/smoke checks are completed with artifacts captured.
- Phase F0 `/account` blocker fix is completed and revalidated.
- Phase F1 pre-deploy gate is completed with fresh artifacts captured.
- Next implementation priority is Phase F2 deploy verification.
- NEW constraint (reported 2026-02-10): ext API is up, but cannot perform email verification right now due to a proxy service limitation. Confirm scope and choose degraded vs fallback behavior before treating verify failures as regressions.

Locked rules (do not violate):
- Keep 5 primary statuses: valid, invalid, catchall, disposable_domain, role_based
- Keep disposable_domain separate from invalid
- Keep unknown as secondary (not merged into primary counts)
- Keep credits grant flow using /credits/grant
- Keep upload flow requiring explicit email-column selection
- Do not revert completed Phase B/C1/C2/C3/C4/D1/D2/E2/E3/F0/F1 work unless contract mismatch is proven

Execution requirements for this session:
- Runtime preflight (mandatory before F2):
  - ensure local stack is running (`./run-local-dev.sh`)
  - verify backend health:
    - curl -sS --max-time 5 http://127.0.0.1:8011/health
    - expected: {"status":"ok"}
  - verify auth seed file readiness for Playwright:
    - key-value-pair.txt has a current key/value for http://localhost:8010
- Confirm ext API verification availability and expected behavior (mandatory before deploy verification):
  - determine whether the outage affects realtime verify only or also bulk/task flows
  - if verification is unavailable, decide and implement the intended UX (degrade vs fallback) before attempting to “verify production”
- Complete Phase F2 (deploy verification):
  - deploy to `main`
  - run post-deploy smoke checks and verify no regressions
- Use existing E3 artifacts as baseline:
  - tmp/e3-overview.png + tmp/e3-overview-console.log
  - tmp/e3-history.png + tmp/e3-history-console.log
  - tmp/e3-verify.png + tmp/e3-verify-console.log
  - tmp/e3-api.png + tmp/e3-api-console.log
  - tmp/e3-account.png + tmp/e3-account-console.log
  - tmp/f0-account-reval.png + tmp/f0-account-reval-console.log
  - tmp/f0-overview-reval.png + tmp/f0-overview-reval-console.log
  - tmp/f1-account-predeploy.png + tmp/f1-account-predeploy-console.log
  - tmp/f1-overview-predeploy.png + tmp/f1-overview-predeploy-console.log

After each completed step:
- Append What/Why/How/Where in ext-api-updates.md Section 8
- Update checkboxes in ext-api-updates.md Sections 4 and 5
- Append a completed task entry in ui-progress.md
- Ask user confirmation before starting the next task
```

## Why this file exists

- What: provide a strict, copy-ready kickoff message for the next Codex session.
- Why: prevent context-loss mistakes, phase-order drift, or accidental rework of completed migration phases.
- How: pins exact read order, post-F0 deploy-gate scope (F1/F2), locked rules, required validations, and progress-log obligations.
- Where: root file `next-codex-session-handover.md`.
