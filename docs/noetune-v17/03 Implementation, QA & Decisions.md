> [!info] Noetune v17 Canonical Documents
> [[00 Noetune v17 Master]] · [[01 Product, Monetization & Journey]] · [[02 Technical & Content Specification]] · [[03 Implementation, QA & Decisions]] · [[04 Theme Source Database]]

# Noetune v17 Implementation, QA & Decisions

**Status:** Canonical implementation decisions and QA record
**Updated:** 2026-07-22
**Implementation baseline:** Local repository is the runtime source of truth. Obsidian is the decision source of truth.

## 1. Operating model

### Commander ChatGPT

- product and architecture decisions
- implementation scope and order
- Codex Leader instruction creation
- integrated report review
- PASS / STOP judgment
- commit / push / deploy / release decision

### Codex Leader

- the only Codex agent that communicates directly with the user
- runs preflight and confirms repository facts
- evaluates Unit difficulty, risk, and affected scope
- selects the Credit Mode
- starts only the minimum necessary subagents
- compares results, resolves contradictions where possible, and returns one integrated report
- does not return large volumes of raw subagent logs to the user

### Formal subagent roles

#### researcher

- read-only
- investigates repository facts, canonical documents, dependencies, and affected scope

#### implementer

- workspace-write
- normally the only writer
- changes only the approved scope and keeps the diff minimal

#### qa

- read-only
- checks regression, boundaries, error paths, privacy, and required verification

#### reviewer

- read-only
- independently audits the diff, scope, contracts, and safety rules

### Fixed execution rules

- default model and reasoning for Leader and all roles: `gpt-5.6-luna / low`
- no automatic model or reasoning upgrade from Luna Low
- when escalation appears necessary, STOP and request Commander ChatGPT approval
- never assign multiple writers to the same file
- avoid unnecessary duplicate investigation
- retain one narrow work unit per execution
- one work unit defines the product and implementation scope, not the number of agents
- no unrelated refactor
- exact files, objective, forbidden changes, and verification are required
- commit / push / deploy occur only after explicit approval
- never include private Session content in subagent prompts, logs, or reports

### Credit Mode

- `CONSERVE`: Leader-centered; start a subagent only when necessary
- `NORMAL`: default; use the minimum writer and read-only support required by the Unit
- `QUALITY`: use independent research, implementation, and review; add QA only when justified
- `USE-IT`: near weekly reset, spend remaining capacity on useful independent QA or read-only preparation, never on redundant agents

If no usage screenshot is provided, use `NORMAL`.

If a screenshot is unclear, or it is not possible to distinguish used percentage from remaining percentage, do not guess and ask the user.

Agent count is determined by Unit complexity, security/privacy risk, affected scope, and Credit Mode. Credit Mode never justifies unnecessary scope expansion.

### Source of truth

- permanent operating decisions: `03 Implementation, QA & Decisions.md`
- repository execution contract: root `AGENTS.md`
- executable Codex configuration: `.codex/config.toml` and `.codex/agents/*.toml`

Do not duplicate the full TOML configuration in Obsidian.

## 1A. Decision record — Adaptive multi-agent Codex workflow

**Decision date:** 2026-07-22

### Confirmed capability

- Codex CLI `v0.145.0-alpha.27`
- multi-agent v2
- `spawn_agent` / `wait_agent`
- `features.multi_agent_v2`
- formal roles: researcher / implementer / qa / reviewer
- all roles fixed to `gpt-5.6-luna / low`
- strict config validation passed
- researcher subagent connectivity check passed without file changes

### Adopted workflow

```text
User
↕
Commander ChatGPT
↕
Codex Leader
├─ researcher
├─ implementer
├─ qa
└─ reviewer
↓
One integrated Leader report
```

- the user communicates only with Commander ChatGPT and Codex Leader
- subagents remain internal to the Leader workflow
- the Leader selects only the roles required by each Unit
- implementer is normally the only writer
- unresolved agent disagreement is reported explicitly rather than hidden
- infrastructure commit: `d7dead6 chore(codex): add adaptive multi-agent leader workflow`

## 2. Stop line

Do not implement when any of the following is unclear:

- canonical runtime field mapping
- data ownership / RLS
- destructive migration
- Journey boundary
- exact restore order
- current production API contract
- Session content data flow and logging boundary
- vendor contract / DPA / subprocessor suitability
- Account deletion and backup behavior
- legal operator / data controller identity before Cloud or paid release

For Guest local implementation, product decisions and Snapshot Schema v1 are complete. Cloud Session content work must not begin before the Global Privacy & Security Gate.

## 3. Decision record — In-progress Session Bookmark

**Decision date:** 2026-07-15

### Product

- large Result-only bookmark CTA is removed
- one shared header control appears on all canonical Session pages
- first save is manual; later updates are automatic
- Result is not Journey completion
- explicit completion is required
- Repeat stays in the same sessionId and receives a new cycleId

### Access

- Guest: local 1 active
- Free: cloud 1 active
- Pro: cloud active maximum 20
- Free can resume its one active Journey across devices after login
- Pro adds multiple active Journeys and completed archive

### Data

- Snapshot Schema v1
- no raw runtime navigation history
- maximum three resume back frames
- local-first
- revision optimistic locking
- corrupted snapshot is not auto-deleted or overwritten

### Legacy

- old theme bookmark is not migrated into Session snapshot
- old UI and write calls are retired after new flow is verified
- old DB remains temporarily


## 3A. Decision record — Global Privacy and Security

**Decision date:** 2026-07-16

### Scope

- Noetune remains a worldwide product target
- worldwide target does not require simultaneous worldwide Cloud content launch
- Guest local is the first continuity release stage
- Free cloud, Pro archive, cross-device resume, and paid Cloud features are gated

### Content classification

- all Session writing is High Confidentiality User Content
- classification applies regardless of whether the user actually writes health, family, sexuality, religion, or other sensitive content
- private content is not inspected to decide whether stronger protection applies

### Use and logging

- no advertising, sale, AI training, profiling, marketing, or A/B text analysis
- no private content in analytics, console, server logs, error monitoring, support tickets, or coding tools
- privacy-safe metadata only

### Architecture

- first save is explicit
- Login does not auto-upload Guest content
- local remains until Cloud success
- serializer / validator / local repository / cloud adapter / sync coordinator remain separate
- Session storage must be replaceable without changing Snapshot Schema
- Vercel remains static/content-free for the Session content path until vendor review approves otherwise

### User rights and honesty

- clear local vs Cloud explanation
- Journey deletion, Account deletion, and data request procedure
- no overclaim of anonymity or end-to-end encryption
- initial audience is 18+

### Gate

Before Cloud Session content or paid Cloud release:

- identify legal operator / data controller
- complete data inventory and flow map
- review vendors, DPA, subprocessors, transfer and region
- define retention and backup behavior
- pass RLS negative tests
- pass no-private-content logging tests
- pass deletion and restore tests
- prepare incident response
- review privacy notice, terms, and consent copy

## 4. Decision record — Official v17 line and new question flow

**Decision date:** 2026-07-20

### Development line

- v17 is the only official development line
- separate v18 development is discontinued
- v18-only Flow Engine / Versioned Cartridge / navigation rewrite is rejected
- existing v17 UI/UX/auth/billing/history/resume/bookmark/localization foundations remain
- only the new question flow is adopted incrementally

### Regular Unit 1

Implemented and accepted:

```text
453862f fix(v17): restore current session step
98931af feat(v17): add regular question variants
```

`98931af` includes only:

- Question 1 A/B UI
- initial `questionVariant: 'A'`
- A/B switching
- textarea draft preservation
- `spiritual-wisdom → ideals` prompt routing
- route/variant-specific Question 1
- Question 2 quoting Question 1
- three-language locale keys
- localized selector aria-label

It does not include Snapshot persistence, Deep, Back redesign, auth, billing, history, Bookmark, analytics, or v16 changes.

### Next unit

Unit 2 is limited to `questionVariant` Snapshot serialize / validate / migrate / restore. Deep implementation starts only after Unit 2 is accepted.

## 5. Completed investigation record

### Regular

Audited:

- canonical screens
- route-dependent first / second semantics
- Before / After null vs 0
- draft vs confirmed value
- Result Back and repeat globals

### Deep

Audited:

- route-specific phase order
- same-round Back
- previous-round restore
- `rounds.pop()` / pendingRound behavior
- No More Words
- `finished` / `incomplete`

### Breath / Final / Result

Audited:

- Breath Step 2 internal Back
- Final Back to Breath
- Result Back to Final
- Result re-entry analytics duplication risk
- current navigation snapshot limitations

### Resume conclusion

Current state alone cannot recreate the pre-Breath state exactly. A captured Response frame is required, especially after Deep No More Words.

## 6. Navigation decision

Persist:

```text
currentScreen
currentState
resumeBackFrames[]
```

Do not persist:

```text
raw navHistory
raw navPageStateHistory
```

Frame order is oldest to newest; runtime arrays are rebuilt in that order and Back pops the newest item.

```text
Result current:
[Response, Breath, Final]
→ Result → Final → Breath → Response
```

Internal same-screen Back behavior must not consume unrelated canonical frames. During restore implementation, normalize or explicitly handle Breath Step 2 and Deep phase internal Back before declaring exact resume complete.

## 7. Implementation decisions

### Serializer

- whitelist fields
- JSON-safe clone only
- no DOM / functions / timers / auth tokens
- no hidden Legacy state
- semantic Regular response fields

### Validator

- fail closed for unknown screen / phase
- return structured error codes without private values
- accept nearest safe fallback only when core theme/session context remains valid
- never overwrite a valid previous snapshot with invalid serialized output

### Migration

- explicit `snapshotSchemaVersion`
- migration functions are sequential, e.g. `v1 → v2 → v3`
- appVersion mismatch alone does not delete data
- old theme bookmark is not a Snapshot Schema migration source

### Local-first

- local write success determines immediate “saved on this device” state
- cloud failure does not block the Session
- pending sync remains until success or explicit resolution

## 8. Canonical save triggers

| Screen | Trigger |
|---|---|
| Session mode | mode selection |
| Before | slider debounce + Next flush |
| Regular response | input debounce + Next / Back |
| Deep response | input debounce + Next / Back / No More Words |
| Deep Feel100 | action + Next / Back |
| Breath Step 1 | arrival and Step transition |
| Breath Step 2 | transition / Back / Final |
| Final | slider debounce + confirm |
| Result | arrival, without completion |
| Repeat | start, mode selection, response, Result return |

Only a Session with an enabled bookmark is auto-updated.

## 9. Analytics decision

Allowed:

- event name
- irreversible session hash
- cycle index
- canonical screen
- locale
- mode
- score values / delta when policy permits
- save outcome / location
- conflict / fallback level

Forbidden:

- free input
- response text / draft
- Deep rounds text
- sourceQuote
- awareness text
- full snapshot / back frames

Events:

```text
v17_result_reached: once per cycle
v17_journey_completed: once per session
```

## 10. Privacy and security QA

### Guest local

- [ ] no persistent content before the user enables the bookmark
- [ ] no Cloud request from Guest local save or resume
- [ ] shared-device warning and local deletion behavior are accurate
- [ ] corrupt local record remains undeleted and unmodified

### Cloud ownership and access

- [ ] RLS allows only owner SELECT / INSERT / UPDATE / DELETE
- [ ] negative tests cover User A against User B for every operation
- [ ] client user_id is ignored in favor of authenticated identity
- [ ] no service role in browser
- [ ] admin and production access follow least privilege

### Content leakage

- [ ] no private writing in console or server logs
- [ ] no private writing in analytics or error monitoring
- [ ] automatic request / response / exception capture is redacted or disabled
- [ ] no private content reaches Vercel Functions / logs before vendor approval
- [ ] no production content is placed in support or AI coding tools
- [ ] payload maximum is enforced without silent truncation of user text

### User control and lifecycle

- [ ] Login does not auto-upload Guest local content
- [ ] Cloud failure never removes the local copy
- [ ] Journey deletion removes the selected record
- [ ] Account deletion removes active, completed, old bookmark, and authenticated cache
- [ ] Logout removes authenticated local cache but not unmigrated Guest data
- [ ] data copy / correction / deletion requests have an operational procedure
- [ ] retention and backup behavior match user-facing explanations

### Governance

- [ ] legal operator / data controller is identified
- [ ] vendor DPA / subprocessor / transfer / region review is complete
- [ ] incident response and breach notification runbook is tested
- [ ] user-facing security language does not overclaim encryption or anonymity
- [ ] initial 18+ scope and minor-handling policy are implemented

## 11. Snapshot QA matrix

### Regular

- [ ] Session mode
- [ ] Before unset
- [ ] Before score 0
- [ ] Before numerical value
- [ ] not-a-problem / skipped distinctions
- [ ] First response draft
- [ ] Second response draft
- [ ] problem route role order
- [ ] ideal / spiritual route role order
- [ ] Back and Next after resume

### Deep

- [ ] each route start phase
- [ ] each phase
- [ ] round 1
- [ ] round 2+
- [ ] previous-round Back
- [ ] pendingRound
- [ ] No More Words with empty input
- [ ] No More Words with partial input
- [ ] pre-Breath frame restoration

### Breath / Final / Result

- [ ] Breath Step 1 start
- [ ] Breath Step 2 start
- [ ] Step 2 → Step 1 → Response
- [ ] Final → Breath → Response
- [ ] Result → Final → Breath → Response
- [ ] Result re-entry does not duplicate event
- [ ] animation timestamp is not restored

### Repeat

- [ ] same sessionId
- [ ] new cycleId
- [ ] cycleIndex increment
- [ ] all six repeat globals restored
- [ ] original Result return

## 12. Storage and sync QA

- [ ] Guest local 1 active
- [ ] browser reload resume
- [ ] local quota error keeps runtime Session
- [ ] offline save
- [ ] online retry
- [ ] token expiry keeps local copy
- [ ] Free cloud 1 active replacement confirmation
- [ ] Pro 20 active limit without silent deletion
- [ ] same-session migration
- [ ] different-session Free choice
- [ ] revision conflict returns 409
- [ ] old client cannot silently overwrite new cloud state

## 13. Fallback QA

- [ ] Result → Final
- [ ] Final → Breath
- [ ] Breath → Response
- [ ] Response → Before
- [ ] Before → Session mode
- [ ] fully invalid snapshot remains undeleted
- [ ] fallback does not immediately overwrite cloud
- [ ] user receives calm nontechnical message
- [ ] error logs contain field names / codes only, not values

## 14. Localization QA

Required languages:

- Japanese
- English
- Traditional Chinese (`zh-TW`)

Required concepts:

- save on this device
- saved / syncing / synced
- cloud unavailable
- resume
- Journey completion
- replace Free active Journey
- conflict
- partial recovery
- corrupt snapshot
- delete bookmark

Copy must be quiet, clear, nonpromotional, and explicit around deletion and privacy.

## 15. Release blockers

Do not release when:

- exact Back chain fails after resume
- Deep round or pendingRound is lost or duplicated
- invalid snapshot overwrites a valid one
- Result automatically completes or removes an active Journey
- cross-user read/update/delete is possible
- Guest save triggers forced login
- cloud failure destroys local state
- Free / Pro count is enforced by silent deletion
- private writing appears in logs or analytics
- old and new bookmark UI are both active
- Cloud Session content is enabled before the Global Privacy & Security Gate
- data controller / legal operator is not identified for Cloud or paid release
- a Session-content vendor has not passed DPA / subprocessor / transfer review
- Login silently uploads Guest local writing
- Account deletion or Journey deletion is not verified end-to-end
- user-facing privacy or encryption claims exceed the implemented controls

## 16. Current status

Repository facts:

```text
branch: feature/v17-session-resume
HEAD: 98931af
tracked working tree: clean
push: not performed
```

| Work unit | Status |
|---|---|
| Snapshot serializer / validator / migration foundation | Complete |
| Guest local Regular runtime restore foundation | Complete |
| `currentStep` restore fix (`453862f`) | Complete |
| New Regular A/B flow Unit 1 (`98931af`) | Complete |
| Unit 2: `questionVariant` Snapshot persistence | Next |
| New Deep A/B alternating flow | Approved, not started |
| Breath / Final / Result / Repeat exact resume | Not started |
| Global Privacy & Security Gate | Policy fixed; implementation not started |
| Cloud / RLS | Blocked by privacy gate |
| Shared UI / list | Not started |
| Explicit completion | Not started |
| Full QA / release | Not started |

## 17. Next approved Codex scope

Unit 2 must remain narrow:

```text
branch: feature/v17-session-resume
base HEAD: 98931af
Regular only
questionVariant Snapshot serialize
questionVariant validator allowlist
missing-field migration/default behavior
questionVariant runtime restore
no visible UI change
no Deep
no Back redesign
no auth / billing / history / Bookmark / analytics
no push / deploy until reviewed
```

Required verification:

- A and B both round-trip through serializer → validator → restore
- invalid variant is rejected without overwriting a valid snapshot
- old snapshot without the field follows the documented migration/default rule
- currentStep two-line restore remains intact
- three locale JSON files remain valid
- JavaScript syntax and `git diff --check` pass
- backup files remain untracked and untouched

After Unit 2 acceptance, define the Deep state migration as a separate implementation unit.
