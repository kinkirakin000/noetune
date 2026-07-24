# Noetune v17 Release Implementation Plan

> Status: Temporary execution document
> Updated: 2026-07-23
> Current execution point: Phase 4B — Regular production save / resume accepted; minimal Back and final Gate remain

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

**Status:** In Progress — Regular production save / resume accepted; minimal Back and final Gate remain

#### Completed

- identity / EntryStateV1 / response-state round trip
- atomic Regular runtime restore
- Session mode / Before / First / Second restore support
- Guest local record read-to-resume entrypoint
- `currentStep` restore
- `questionVariant` restore
- Session Mode unselected snapshot / validation / restore
- Session Mode / Before / First / Second production UI acceptance
- manual first save
- automatic updates after first save
- explicit Resume; Auto Resume remains absent
- Bookmark / Resume three-language in-flow UX
- Safari Human real-browser QA
- valid-record Resume control eligibility
- Session Snapshot validator tests 13/13 PASS

The accepted implementation is `67ea52d7e1b83ffbf78972d527191e2b17d060da`. It retains Snapshot Schema v1 and accepts Guest-local manual first save, later automatic updates, valid-record eligibility, and explicit Resume across the supported Regular production positions. It does not complete Phase 4B as a whole.

#### Remaining

- minimal Regular Back after resume
- final Phase 4B Gate

The earlier Before first-save blocker is resolved. Phase 7, Phase 8, Deep, Cloud, auth, and billing are not complete or implicitly advanced by this acceptance.

Gate: production UI save, reload, explicit Resume, and automatic-update acceptance have passed at Session Mode, Before, First, and Second; minimal Regular Back and the final Phase 4B Gate must still be accepted before Phase 4B is complete.

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

**Status:** Complete (historical Unit 2 checkpoint)

The following facts are the historical Unit 2 acceptance record at `df1cefa0007a477a6d0cf3869ed781bf553c44d4`; they do not state the current repository HEAD, current test count, or current push state:

- `questionVariant` serialization complete
- validator A / B allowlist complete
- missing-field compatibility and migration behavior complete
- restore-before-render complete
- `currentStep` restore maintained
- A / B round trips and invalid-value rejection covered
- Session Snapshot validator tests 9/9 PASS at the Unit 2 checkpoint
- historical acceptance HEAD: `df1cefa0007a477a6d0cf3869ed781bf553c44d4`
- local / remote sync was complete at that historical checkpoint
- deploy not performed

Forbidden scope remained unchanged:

- no visible UI changes
- no Deep changes
- no Back redesign
- no auth, billing, history, Bookmark, or analytics changes

Gate result: Unit 2 implementation and validator acceptance completed at its historical checkpoint. The current Accepted implementation is `67ea52d7e1b83ffbf78972d527191e2b17d060da`; snapshot tests are 13/13 PASS and push has not been performed. Regular production save / resume is accepted under Phase 4B; minimal Back and final Gate remain in progress.

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

The permanent operating contract is defined in [[03 Implementation, QA & Decisions]].

Repository execution rules are defined by root `AGENTS.md`; executable role and model settings are defined by `.codex/config.toml` and `.codex/agents/*.toml`.

Every task must specify:

- exact files
- exact objective
- forbidden changes
- required verification

Default:

- Codex Leader plus only the minimum necessary roles
- `gpt-5.6-luna / low` for Leader and all roles
- one narrow work unit
- implementer as the normal sole writer
- researcher / qa / reviewer as read-only
- no automatic model or reasoning upgrade

`one narrow work unit` defines the approved product and implementation scope. It does not require a single agent and does not permit scope expansion when more agents are used.

Credit Mode controls investigation and QA depth:

- `CONSERVE`
- `NORMAL`
- `QUALITY`
- `USE-IT`

Without a usage screenshot, use `NORMAL`. If the screenshot or its used/remaining meaning is unclear, do not guess; ask the user.

Mandatory instruction:

```text
Do not modify files outside the listed scope.
Do not refactor unrelated code.
Do not rename existing functions unless required.
Do not change question order or meaning.
Do not change database schema unless explicitly instructed.
Do not guess missing API fields; report them.
Do not assign multiple writers to the same file.
Do not automatically upgrade model or reasoning.
Do not include private Session content in agent prompts, logs, or reports.
Run syntax checks and git diff --check.
Report changed files, reasons, tests, and remaining risks.
Commit, push, and deploy only after explicit approval.
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
