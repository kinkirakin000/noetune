# Noetune v17 Release Implementation Plan

> Status: Temporary execution document
> Updated: 2026-07-22
> Current repository facts: branch `feature/v17-session-resume`, accepted HEAD `8be86bf599d907e22f0cc979de1bf606480c42c9`, tracked working tree at accepted HEAD: clean, push not performed, deploy not performed
> Current execution point: Unit 3A-2d-3d-0b-2a — Defined leaf validator foundation (Next)

## 1. Objective

Release Noetune v17 with:

1. stable Regular / Deep Session flow
2. exact in-progress Session bookmark and resume
3. explicit Journey completion
4. safe Guest / Free / Pro continuity
5. v17-owned authentication, membership, and billing state
6. global privacy, vendor, deletion, and incident-response readiness
7. three-language and mobile QA

Permanent decisions belong in files `00–03`. This file owns order and release gates only.

## 2. Fixed continuity scope

- first save is manual
- later updates are automatic
- Guest local active 1
- Free cloud active 1
- Pro cloud active maximum 20
- Result remains active
- Repeat uses same sessionId and new cycleId
- maximum three resumeBackFrames
- revision optimistic locking
- old theme bookmark is not migrated

## 3. Execution phases

### Phase 3 — Snapshot Schema

**Status:** Complete

Deliverable: Snapshot Schema v1 in [[02 Technical & Content Specification]].

### Phase 4A — Serializer / validator foundation

**Status:** Complete

Scope:

- Guest only
- localStorage only
- Regular only
- one active snapshot
- no visible UI
- no cloud

Deliverables:

- `serializeV17SessionSnapshot()`
- `validateV17SessionSnapshot()`
- `migrateV17SessionSnapshot()` entrypoint
- local record read/write helpers
- privacy-safe errors

Gate:

- current flow unchanged
- syntax and existing smoke checks pass
- invalid output cannot overwrite valid snapshot

### Phase 4B — Guest local Regular restore

**Status:** Complete

Completed foundation:

- identity, EntryStateV1, response-state round trip
- atomic Regular runtime restore
- Session mode / Before / First / Second screen restore
- guest local record read-to-resume entrypoint

Remaining:

- release-level real-browser save → reload → resume QA
- complete Back matrix QA remains tracked under Phase 5B / Phase 14

Deliverables:

- restore theme / entry / mode / measurement / responses
- restore draft
- restore current canonical screen
- minimal Regular Back behavior

Gate: reload and resume pass on all Regular canonical response positions.

### New Flow Unit 1 — Regular A/B questions

**Status:** Complete

Commits:

```text
453862f fix(v17): restore current session step
98931af feat(v17): add regular question variants
```

Accepted scope:

- Question 1 A/B selector
- default A
- draft preservation during switching
- route/variant-specific prompt rendering
- spiritual-wisdom prompt route uses ideals
- Question 2 quotes Question 1
- ja / en / zh-TW locale keys and localized aria-label

### New Flow Unit 2 — questionVariant Snapshot persistence

**Status:** Complete

Deliverables:

- serialize `questionVariant`
- validate A/B allowlist
- migrate or default an older snapshot with no field
- restore the exact variant before rendering Question 1
- test A and B round trips and invalid-value rejection

Forbidden:

- visible UI changes
- Deep changes
- Back redesign
- auth, billing, history, Bookmark, analytics

Gate: save/reload/resume reopens the exact A or B prompt without losing draft or currentStep.

### Current Session Resume status

Completed:

- Snapshot screen responsibility separation
- ResumeBackFrame validation foundation
- Snapshot semantic state contract reconciliation
- Implementation status synchronization

Accepted commits:

```text
5a9c7d4 refactor(v17): separate snapshot screen responsibilities
c1bc4d6 feat(v17): add safe resume back frame validation foundation
84b59da docs(v17): reconcile snapshot semantic state contracts
8be86bf docs(v17): synchronize session resume implementation status
```

Next:

```text
Unit 3A-2d-3d-0b-2a
Defined leaf validator foundation
Status: Next
```

Target file: `js/v17/session-snapshot.js` only

Constraints: pure internal helpers, confirmed leaf shapes only, Schema version 1, no serializer/migration/restore/public API change, `allowNonEmpty: false`, non-empty `resumeBackFrames` reject, Breath / Final / Result / Deep / Repeat remain unsupported, and valid Schema v1 Snapshot results remain unchanged.

### New Flow Unit 3 — Deep alternating flow

**Status:** Approved specification; not started

Deliverables:

- original theme fixed across all rounds
- A → Q2 → B → Q2 alternation
- round and phase state
- draft, pending round, and Back restoration
- retirement of the old answer-chaining Deep semantics only within the approved scope

Gate: no round loss, duplication, reorder, variant mismatch, or source-theme replacement.

### Phase 5A — Deep serializer / restore (superseded by New Flow Unit 3)

**Status:** Do not execute as written until rewritten for the approved alternating A/B Deep model.


Deliverables:

- round / phase / rounds / pendingRound / sourceQuote / finished
- same-round and previous-round Back after resume

Gate: no round loss, duplication, or reorder.

### Phase 5B — Breath / Final / Result / Repeat exact resume

Deliverables:

- captured pre-Breath Response frame
- maximum three resumeBackFrames
- Result → Final → Breath → Response
- Breath Step 2 internal Back correctness
- all Repeat state fields and cycle identity

Gate: complete Back matrix passes.


### Phase 5C — Global Privacy & Security Gate

**Status:** Policy fixed; implementation not started

Purpose:

Cloud Session content, Pro archive, cross-device resume, and paid Cloud features may not proceed until the data lifecycle is explainable, testable, and contractually supported.

Deliverables:

- legal operator / data controller decision
- High Confidentiality User Content inventory
- complete data-flow map from browser through every processor and log
- vendor DPA / subprocessor / international-transfer / data-region review
- retention and backup policy
- privacy notice, terms, save consent, and deletion copy
- 18+ initial audience and minor-handling policy
- RLS negative-test plan
- no-private-content logging and error-monitoring test
- Journey deletion, Account deletion, and data-request runbook
- incident response and breach notification runbook
- storage-provider adapter boundary review
- restricted rollout and feature-flag plan

Fixed rules:

- Login does not auto-upload Guest local writing
- Session content is not used for ads, sale, AI training, profiling, marketing, or text analytics
- Session content is not sent to console, analytics, logs, error monitoring, support, or AI coding tools
- Vercel remains static/content-free for the Session-content path until vendor review approves otherwise
- no claims of end-to-end encryption or operator unreadability unless implemented and verified

Gate:

All deliverables are reviewed and the Cloud feature flag remains off until approval. A specialist legal review is required before worldwide paid Cloud release.

### Phase 6 — DB / API / RLS

**Blocked by:** Phase 5C

Deliverables:

- `session_snapshots` storage
- owner-only RLS
- Free 1 / Pro 20 enforcement
- status and timestamps
- expected revision / 409 conflict
- account deletion integration

Gate: User A cannot read, update, or delete User B data.

### Phase 7 — Shared Session header UI

Deliverables:

- one quiet bookmark control
- Back left / bookmark right
- all canonical Session pages
- saved / syncing / local / error states
- no forced login for Guest local save

Gate: no layout regression on mobile Safari and Android Chrome.

### Phase 8 — Save flow and synchronization

Deliverables:

- manual first save
- automatic update after save
- debounce and transition flush
- offline pending queue
- Guest → login migration
- conflict resolution UI

Gate: network and auth failure never destroy the current Session.

### Phase 9 — Active Journey list

Deliverables:

- `Theme｜Subtheme`
- mode / position / updated time
- resume / delete
- Free one active behavior
- Pro multiple active behavior

Gate: cards never start a new Session or discard previous answers.

### Phase 10 — Exact resume hardening

Deliverables:

- all canonical screens
- nearest canonical fallback
- corrupt snapshot quarantine
- schema migration tests

Gate: fallback never silently deletes or overwrites the original record.

### Phase 11 — Explicit Journey completion

Deliverables:

- Result secondary completion action
- `v17_result_reached` vs `v17_journey_completed`
- active → completed / delete behavior by plan
- move `clearPendingProgress()`

Gate: Result arrival alone never removes the active Journey.

### Phase 12 — Old bookmark retirement

Deliverables:

- remove Result large CTA
- stop legacy write calls
- keep legacy DB temporarily
- confirm no mixed old/new behavior

Gate: new continuity flow is production-stable before destructive cleanup.

### Phase 13 — Localization / UI QA

Languages:

- Japanese
- English
- Traditional Chinese

Surfaces:

- save states
- migration
- conflict
- completion
- fallback
- deletion
- Free / Pro limits

### Phase 14 — Regression / security QA

Run the complete matrix from [[03 Implementation, QA & Decisions]].

Include:

- Regular / Deep
- Back / Next
- Repeat
- offline / token expiry
- revision conflict
- corrupted schema
- RLS
- mobile
- auth / billing regression

### Phase 15 — Commit / push / release

1. review diff and generated files
2. run syntax / lint / tests / `git diff --check`
3. commit intentionally
4. push
5. production deploy
6. production smoke test
7. record release result in `03`

## 4. Parallel billing workstream

Billing remains required for full Pro release, but must not be mixed into narrow Session snapshot tasks.

Required before paid release:

- v17-only entitlement owner
- normalized membership states
- actual contracted price / currency / interval
- Checkout and Portal contracts
- verified webhook and RLS boundaries
- no test/live environment mixing

Refer to [[06 Current Billing & Auth Snapshot]] for current facts and [[02 Technical & Content Specification]] for target billing rules.

## 5. Codex rules

Every task must specify:

- exact files
- exact objective
- forbidden changes
- required verification

Default:

- GPT-5.4 mini
- low reasoning
- one work unit

Mandatory instruction:

```text
Do not modify files outside the listed scope.
Do not refactor unrelated code.
Do not rename existing functions unless required.
Do not change question order or meaning.
Do not change database schema unless explicitly instructed.
Do not guess missing API fields; report them.
Run syntax checks and git diff --check.
Report changed files, reasons, tests, and remaining risks.
```

## 6. Release blockers

- saved Regular or Deep Session cannot restore exactly
- Back chain fails after resume
- pendingRound is lost, duplicated, or reordered
- Result arrival completes Journey automatically
- private writing reaches logs or analytics
- invalid snapshot overwrites valid data
- local save is lost on cloud/auth failure
- cross-user access is possible
- old and new bookmark flows conflict
- Free / Pro limits silently delete data
- critical three-language copy is missing
- billing entitlement or contracted price is incorrect
- Cloud Session content is enabled before Phase 5C approval
- legal operator / data controller is undefined for Cloud or paid release
- Login silently uploads Guest local writing
- vendor DPA / subprocessor / transfer suitability is unresolved
- Journey or Account deletion is not verified end-to-end
- private writing reaches support tools, coding tools, request logs, or error breadcrumbs
- privacy or encryption claims exceed implemented controls

## 7. Post-release cleanup

After production verification:

1. retire unused old bookmark functions and write endpoints
2. decide legacy bookmark export / theme favorite / deletion separately
3. retire v15 billing/access runtime only after v17 cutover QA
4. merge lasting release facts into `02` and `03`
5. archive this execution plan when no longer current
6. retire `06` after billing migration is factual history
