# Noetune v17 Release Implementation Plan

> Status: Temporary execution document
> Updated: 2026-07-27
> Current execution point: Phase 5C-2c-2 complete. Webhook signature error redaction is complete; Cloud Session Bookmark / Resume remains hard OFF. The next implementation phase requires a separate Commander decision.

## 1. Objective

Release Noetune v17 with:

1. stable Regular / Deep Session flow
2. authenticated Cloud Session bookmark and exact resume
3. explicit Journey completion
4. clear Guest no-save / Free 1 / Pro 50 continuity
5. v17-owned authentication, membership, and billing state
6. global privacy, vendor, deletion, and incident-response readiness
7. three-language and mobile QA

Permanent decisions belong in files `00–03`. This file owns order and release gates only.

## 2. Fixed continuity scope

- Guest persistent bookmark: 0
- Guest remains able to use complete Sessions without Login and without usage limits
- Free cloud active: 1
- Pro cloud active: maximum 50
- first Cloud save is manual and explicit
- later updates to the same `sessionId` are automatic
- Login alone does not create or upload a Cloud record
- Result remains active
- Repeat uses same sessionId and new cycleId
- maximum three resumeBackFrames
- revision optimistic locking
- old theme bookmark is not migrated
- Cloud remains feature-flagged off until the Global Privacy & Security Gate passes

## 3. Execution phases

### Phase 3 — Snapshot Schema

**Status:** Complete

Deliverable: Snapshot Schema v1 in [[02 Technical & Content Specification]].

### Phase 4A — Serializer / validator foundation

**Status:** Complete historical foundation

Original scope:

- Guest
- localStorage
- Regular
- one active snapshot
- no visible UI
- no cloud

Delivered:

- `serializeV17SessionSnapshot()`
- `validateV17SessionSnapshot()`
- `migrateV17SessionSnapshot()` entrypoint
- local record read/write helpers
- privacy-safe errors

Current interpretation:

- this implementation remains repository history and may inform authenticated Cloud continuity
- it is not a current Guest entitlement
- Guest persistent writes are disabled and unreachable in the accepted runtime checkpoint
- Snapshot Schema and validator work may be reused under authenticated Cloud contracts

### Phase 4B — Guest local Regular restore

**Status:** `SUPERSEDED BY PRODUCT DECISION`

Historical foundation completed:

- identity / EntryStateV1 / response-state round trip
- atomic Regular runtime restore
- Session mode / Before / First / Second restore support
- Guest local record read-to-resume entrypoint
- `currentStep` restore
- `questionVariant` restore
- navigation-frame regression coverage
- latest reported test suite: 14/14 PASS

Human QA record:

- Before value persistence was observed
- First Response screen and A/B variant restoration were observed
- unconfirmed First Response draft restoration did not match the expected Guest-local behavior

Disposition:

- no further Guest-local draft fix
- no further Guest-local Human QA
- Phase 4B is not accepted as release PASS
- Phase 4B is not retained as an active release-blocking FAIL
- Guest-local Bookmark, Resume entry, and persistent writes are outside the target product
- commit `048ce45290d9594a9f2bd1f125d813b59ad13906` disabled the Guest-local public paths and removed the legacy Result CTA
- snapshot / navigation tests reached 17/17 PASS
- Human QA passed: no Landing Resume, no Session-page Guest local Bookmark, no Guest snapshot key, no legacy Result CTA, browser restart returns to Landing, and Guest can complete a Regular Session
- authenticated Cloud resume will receive its own acceptance path after Phase 5C

Gate: none for Guest-local release. The feature has been retired. Later Cloud acceptance must be executed through the authenticated production path.

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

Accepted implementation facts:

- `questionVariant` serialization complete
- validator A / B allowlist complete
- missing-field compatibility and migration behavior complete
- restore-before-render complete
- `currentStep` restore maintained
- A / B round trips and invalid-value rejection covered
- Session Snapshot validator tests 9/9 PASS
- implementation HEAD: `df1cefa0007a477a6d0cf3869ed781bf553c44d4`
- local / remote sync complete
- deploy not performed

Forbidden scope remained unchanged:

- no visible UI changes
- no Deep changes
- no Back redesign
- no auth, billing, history, Bookmark, or analytics changes

Gate result: implementation and validator foundation remains accepted as historical code. Guest-local production acceptance is superseded and no longer blocks release sequencing.

### New Flow Unit 3A — Live Deep A/B alternating runtime

**Status:** Complete; commit `c48e0e77a6f0970e620acfc5da3451291120c9da`

Deliverables:

- original theme fixed across all rounds
- A → Q2 → B → Q2 alternation
- round and phase state
- draft, pending round, and Back restoration
- retirement of the old answer-chaining Deep semantics only within the approved scope
- Deep Snapshot remains unsupported; Breath exact resume and Cloud continuity are not included

Gate: no round loss, duplication, reorder, variant mismatch, or source-theme replacement.

### New Flow Unit 3B — Deep Snapshot serializer / validator / restore

**Status:** Complete for Deep response; Unit 3B-2 commit `2f793f42407433db898145bc25e8744e3d08ddfb` activates Snapshot Schema v1 serializer / restore for `s-v17-deep-response` Question 1 / Question 2 only. Unit 3A and 3B-1 remain complete.

Deep Snapshot must be redesigned for the Unit 3A runtime. Do not reuse the old Deep schema by inference.

3B-2 activated serializer and restore together, including restore-before-render, Question 1 / Question 2 drafts, `nextPendingRound`, Deep Back reconstruction, Result adapter reconstruction, and round-trip tests.

Completed in 3B-2: production Deep response resume, Regular / Deep isolation, Q1 / Q2 render, same-round and cross-round Back, `nextPendingRound` forward reuse, and live No More Words boundary. Breath / Final / Result exact resume, Breath pre-frame, `resumeBackFrames`, and Repeat Snapshot remain Phase 5B scope.

### Phase 5B-1 — Breath Snapshot and typed pre-Breath Back frame

**Status:** Complete. Regular / Deep Breath Step 1 / Step 2 and one typed pre-Breath Back frame are production-supported; Final / Result / Repeat remain unsupported.

### Phase 5B-2a — Final Measurement schema and typed Back-frame foundation

**Status:** Complete. Commit `1dbca2af5b799f24a6e941a6ee2b1dde6036daab` defines the Snapshot Schema v1 Final measurement projection, canonical `measurement.after` consistency, and Final candidate response → Breath frame foundation. Production Final serializer / restore remain closed.

### Phase 5B-2b — Final serializer / restore / render / exact Back activation

**Status:** Pending. Remaining scope includes Final runtime producer, serializer and restore activation, restore-before-render, Final controls and draft restoration, exact Final → Breath → response Back, analytics idempotence, and the production write gate. Do not implement 5B-2b during docs-only work.

**Status:** Complete; commit `bc6fee1b0b387788b22e84bea49596d8113cdc67`.

Regular / Deep Breath Step 1 / Step 2、typed pre-Breath frame、restore-before-render、exact response Back、transient timer除外を受入済み。Final / Result / Repeat exact resumeは未完了である。

### Phase 5A — Deep serializer / restore (superseded by New Flow Unit 3B)

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

**Status:** In progress — 5C-1a audit and 5C-1b server hard-off complete; overall Gate remains STOP

Purpose:

Cloud Session content, Free cross-device resume, Pro archive, and paid Cloud features may not proceed until the data lifecycle is explainable, testable, and contractually supported.

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

- Guest writing is not persistently stored
- Login does not auto-upload Guest runtime writing
- explicit save intent is required before Cloud record creation
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
- Free 1 / Pro 50 enforcement
- status and timestamps
- expected revision / 409 conflict
- account deletion integration

Gate: User A cannot read, update, or delete User B data.

### Phase 7 — Common small Cloud Bookmark entry UI

**Status:** UX decision fixed; implementation boundary audit next

Deliverables:

- no Guest persistent Bookmark entitlement
- one common small Bookmark CTA on Session Mode, Before, Regular / Deep response pages, Breath, Final Measurement, Result, and Repeat
- Result uses the same small CTA; the legacy large Result CTA remains retired
- Guest, Free, and Pro use the same visible entry when the feature flag is enabled
- no automatic Login interruption during ordinary Session use
- Guest click shows a short Cloud save explanation, then offers Google Login
- after Login, return to the same Session screen without uploading Guest runtime content
- require a separate final save confirmation before creating the first Cloud record
- Back and Bookmark placement consistent across canonical Session pages
- Login required / confirm save / saved / syncing / Cloud unavailable / error states
- production feature flag off before Phase 5C approval and before the full onboarding path is functional

Gate: no layout regression on mobile Safari and Android Chrome; Guest can complete Sessions without Login; CTA click creates no Guest local record; Login alone does not save or upload; original Session state survives the permitted auth return path.

### Phase 8 — Authenticated Cloud save and synchronization

Deliverables:

- explicit first Cloud save
- no Login-only upload
- automatic update after the first save
- authenticated cache debounce and transition flush
- offline pending queue
- revision conflict resolution UI
- Free active 1 enforcement
- Pro active 50 enforcement
- no silent deletion at either limit

Gate: network and auth failure never destroy the runtime Session or the only authenticated pending copy.

### Phase 9 — Active Journey list

Deliverables:

- `Theme｜Subtheme`
- mode / position / updated time
- resume / delete
- Free one active behavior
- Pro up to 50 active behavior

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
- Guest completion leaves no persistent record
- Free active → delete behavior
- Pro active → completed archive behavior
- move `clearPendingProgress()` away from Result arrival

Gate: Result arrival alone never completes a Journey or removes a Cloud active record.

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
- Login / Cloud consent
- conflict
- completion
- fallback
- deletion
- Guest 0 / Free 1 / Pro 50 limits

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

- Codex Leader only
- `gpt-5.6-luna / low`
- selected agents: none
- subagents prohibited
- Terra / Sol prohibited
- no automatic model or reasoning upgrade
- one narrow work unit

Historical multi-agent capability is retained but dormant, subject to root `AGENTS.md` and the Leader-only decision in `03`.

`one narrow work unit` defines the approved product and implementation scope. It does not require a single agent and does not permit scope expansion when more agents are used.

Credit Mode controls Leader investigation and verification depth only; it never changes agent count:

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

- Guest writing is persistently stored by Noetune
- Guest local Bookmark or Resume entitlement remains active
- ordinary Guest Session use forces Login
- Guest CTA click or Login alone creates or uploads a Cloud Session record
- authenticated saved Regular or Deep Session cannot restore exactly
- Back chain fails after authenticated Cloud resume
- pendingRound is lost, duplicated, or reordered
- Result arrival completes Journey automatically
- private writing reaches logs or analytics
- invalid snapshot overwrites valid data
- authenticated pending save is lost on Cloud or auth failure
- cross-user access is possible
- the legacy large Result CTA reappears or old and new bookmark flows conflict
- Free 1 / Pro 50 limits silently delete data
- Pro 20 remains in target code, copy, or tests
- critical three-language copy is missing
- billing entitlement or contracted price is incorrect
- Cloud Session content is enabled before Phase 5C approval
- legal operator / data controller is undefined for Cloud or paid release
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

### Phase 5B-2b — Final serializer / restore / render / exact Back activation

**Status:** Complete. Commit `a76336497f3c674fc2c627b558cade6638cdde21` enables Final `step5` Snapshot serializer / restore for Regular and Deep, typed response → Breath two-frame Back context, restore-before-render, controls restoration, side-effect isolation, and exact Back to response. Human browser QA remains pending.

### Phase 5B-3 — Result Snapshot, Result reconstruction and exact Back to Final

**Status:** Complete. Result serializer / validator / restore, derived reconstruction, analytics idempotent re-entry, Result → Final exact Back, and the three-frame production stack are complete. Repeat remains split into the Phase 5B-4b Units below.

Phase 5B-3b-2 Result serializer / restore activation is complete. The remaining Repeat scope is split into:

### Phase 5B-4b-1 — Repeat cycle identity and normalized live state

**Status:** Complete. Phase 5B-4b-1a implements live Repeat capture and atomic cycle identity; Phase 5B-4b-1b implements RepeatStateV1 structural validation while keeping the production Repeat Snapshot gate closed.

Runtime identity owner: `D.v17SessionIdentity`. Snapshot persisted cycle shape: `SessionSnapshotV1.currentCycle` (normalized projection, not a second mutable runtime authority).

### Phase 5B-4b-2 — Live Repeat navigation and cycle completion

**Status:** Complete. Phase 5B-4b-2a implements temporary original Result return and exact active-cycle resume; Phase 5B-4b-2b implements new-cycle Result canonical completion and Repeat context clearing. Cycle analytics and trails are idempotent. Snapshot tests are `108/108 PASS` and runtime/navigation tests are `95/95 PASS`. Human browser QA remains unperformed.

### Phase 5B-4b-3 — Repeat serializer / restore and resumed Back matrix

**Status:** Not complete.

- Phase 5B-4b-3a audit: Complete
- Phase 5B-4b-3b Repeat Snapshot restore foundation: Complete; commit `f84833e28a4718fbd4d8c7bec2145a4c5960729b`
- Production browser integration gate: Deferred until an authenticated Resume entrypoint exists
- Phase 5B-4b-3c temporary Result restore: Deferred / Not started
- Snapshot verification: `111/111 PASS`; runtime/navigation: `103/103 PASS`; syntax and diff check PASS
- Human browser QA: not performed

The next product-code Unit is not selected here; Commander must issue a separate decision. Phase 5B-4b-3c and Cloud work must not start automatically.

### Phase 5C-0a — Legacy Auth-Return Safety Closure

**Status:** Complete and pushed in commit `afcf4f6ceabe0e834b3f07eebe3393d129edfb74` (`fix(v17): retire legacy bookmark auth return flows`). Legacy pre-login private persistence and Login-only automatic Result / Progress / Bookmark saves are closed. Cloud Session Bookmark / Resume remains hard OFF.

Phase status: Phase 5B-4b-3a Complete; Phase 5B-4b-3b foundation Complete; Production browser Repeat integration gate Deferred; Phase 5B-4b-3c Deferred / Not started; Phase 5C-0a Complete; Phase 5C-1a audit Complete; Phase 5C-1b server hard-off Complete; overall Phase 5C Gate remains STOP; Cloud Bookmark / Resume implementation Not started; Deployment Not started. Verification recorded: Snapshot `111/111`, runtime/navigation `111/111`, auth.js and snapshot.js syntax PASS, app syntax PASS, diff check PASS; Human browser QA not performed.

The next product-code Unit is not selected here. Bookmark/Resume, Cloud, Popup OAuth, and Phase 5B-4b-3c must not start automatically.

### Phase 5C — Global Privacy & Security Gate

**Status:** In progress — audit and server hard-off complete.

- Phase 5C-1a Global Privacy & Security Gate audit: Complete; overall Gate remains STOP.
- Phase 5C-1b Server-Side Cloud Session Hard-Off: Complete; commit `696ba318861f3e595ed1d82ef6f98f8ff9b8af9c`.
- Phase 5C-2a Logging, Analytics & Error Redaction Audit: Complete; verdict PASS WITH FINDINGS.
- Phase 5C-2b Analytics Measurement Redaction: Complete; L-01 and L-02 are closed.
- Phase 5C-2c-1 Stripe Webhook Error Response Redaction Boundary Audit: Complete; verdict PASS WITH FINDINGS.
- Phase 5C-2c-2 Stripe Webhook Signature Error Response Redaction: Complete; L-04 is closed.

The server hard-off closes Cloud Bookmark GET/POST, saved progress GET/POST, and saved result POST before authentication, body parsing, entitlement, service-role, or database work. Cloud write/read/Resume remains closed.

Remaining findings and gates include L-03, L-05, L-06, and L-07, data classification and consent, production RLS verification, deletion/export/retention, legal/operator/vendor review, authenticated save/read/Resume, and real-browser integration. The next implementation candidate is Phase 5C-2d Auth Browser Error Redaction; this documentation Unit does not start it. Phase 5C is not complete. Phase 5B-4b-3c remains Deferred / Not started. Cloud Session hard-off and Cloud Bookmark / Resume Closed status remain in force. Authenticated save/read/Resume has not started and browser integration has not been performed. The next code Unit is not selected in this document; Commander must decide separately. Leader-only / Micro-Unit / Dual Execution Mode remains in force; multi-agent execution is not a default requirement.

### Phase 5C current execution status — superseding record

**Policy fixed. Repository-level privacy hardening sub-gate partially complete.** Global governance, vendor, lifecycle, RLS, deletion, and deployed integration gates remain open.

Completed repository-code sub-gate:

- Auth browser errors redacted
- Stripe webhook provider errors redacted
- Checkout / Portal logs redacted
- Claim API logs redacted
- Explicit analytics payload minimized
- GA automatic pageviews disabled
- GA4 / PostHog hard-off before consent

Release blockers remain:

- third-party analytics must not be re-enabled without explicit consent and provider network/storage review;
- Cloud content remains disabled until the full Phase 5C gate passes;
- deployed serverless logging behavior must be verified;
- repository-level redaction alone does not prove platform logs are safe.

Current execution point:

```text
Privacy hardening repository-code cluster documented.
Next Phase 5C Unit requires separate Commander decision.
```

Current analytics contract: current v17 does not load GA4 or PostHog, does not execute provider initialization, and retains `trackEvent` call sites only as side-effect-free no-op foundations. No provider network audit has been completed. Phase 5C overall remains incomplete and is not PASS.
