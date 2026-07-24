> [!info] Noetune v17 Canonical Documents
> [[00 Noetune v17 Master]] · [[01 Product, Monetization & Journey]] · [[02 Technical & Content Specification]] · [[03 Implementation, QA & Decisions]] · [[04 Theme Source Database]]

# Noetune v17 Implementation, QA & Decisions

**Status:** Canonical implementation decisions and QA record
**Updated:** 2026-07-23
**Implementation baseline:** Local repository is the runtime source of truth. Obsidian is the decision source of truth.

## 1. Operating model

### Sole command authority — Commander ChatGPT

Commander ChatGPT in the current project thread is the sole strategic and decision-making authority for Noetune development.

The Commander performs as much reasoning and judgment as possible before delegating work. Its responsibilities include:

- product, UX, data, privacy, security, and architecture decisions
- canonical contract interpretation
- conflict resolution between repository facts, Obsidian decisions, and older plans
- implementation priority, Phase order, Unit boundaries, and dependency decisions
- acceptance criteria, stop conditions, and verdict interpretation
- Codex Leader instruction creation
- integrated evidence review
- PASS / BLOCKED / STOP judgment
- commit / push / deploy / release authorization

No Codex agent is a second commander.

### Codex Leader — execution coordinator

The Codex Leader receives a Unit contract already defined by Commander ChatGPT and coordinates its execution.

Its responsibilities are limited to:

- run preflight and report exact repository facts
- confirm that the commanded Unit can be executed from the current repository state
- start only the minimum necessary subagents within the approved Unit
- divide investigation, implementation, QA, and review work without expanding scope
- integrate subagent evidence into one concise report
- preserve the working tree, backup files, private-content boundary, and forbidden-change list
- run the required tests and diff checks
- report contradictions, missing prerequisites, or ambiguous repository facts to Commander ChatGPT

The Codex Leader must not independently:

- change product contracts, UX decisions, schema meaning, architecture, or Phase order
- redefine the Unit, acceptance criteria, or release gate
- select a different strategic direction
- resolve a contradiction that requires product or architecture judgment
- upgrade model or reasoning level without Commander approval
- continue repeated execution after the same prerequisite has been proven missing

When instructions conflict with repository facts or canonical decisions, the Leader stops the affected execution, preserves evidence, and returns the conflict to Commander ChatGPT. It may identify factual options, but Commander ChatGPT chooses among them.

### Formal subagent roles

All subagents are execution agents. They do not make product, architecture, Phase-order, or release decisions.

#### researcher

- read-only
- investigates repository facts, canonical documents, dependencies, and affected scope
- returns evidence, not strategic decisions

#### implementer

- workspace-write
- normally the only writer
- changes only the Commander-approved scope and keeps the diff minimal
- does not redesign adjacent code or contracts

#### qa

- read-only
- checks regression, boundaries, error paths, privacy, and required verification
- distinguishes product failure from blocked prerequisites or test-harness failure

#### reviewer

- read-only
- independently audits the diff, scope, contracts, and safety rules
- reports contradictions without silently reconciling them

### Execution Feasibility Gate

Before implementation or browser acceptance begins, the Codex Leader must verify the factual prerequisites of the commanded Unit:

- required files, UI, handlers, APIs, and selectors exist
- required state can be created through the permitted production path
- persistence and resume entrypoints are reachable when the Unit depends on them
- prerequisite implementation has already landed
- required test data can be produced without forbidden direct injection
- the requested browser path is not blocked by hidden, disabled, or unimplemented controls

This Gate does not authorize the Leader to choose a new Phase or Unit. If a prerequisite is missing, it reports `BLOCKED` with evidence and returns control to Commander ChatGPT.

### Browser QA precondition

Before browser QA, statically confirm:

- exact entry file, URL, protocol, and local-server requirements
- exact selector or active-screen-scoped selector
- visibility and eligibility guards
- save / flush / resume trigger
- required runtime state
- persistence key and read/write path
- whether the production UI can generate the acceptance record

Do not use a broad role locator or page-wide `first()` when an exact ID or active-screen-scoped selector exists.

### Repetition stop rule

If two attempts are blocked by the same missing prerequisite, stop repeating the browser or implementation attempt. Return the evidence to Commander ChatGPT for a sequencing decision.

### Verdict taxonomy

- `PASS`: the executable approved contract was verified
- `PASS WITH NOTE`: the contract passed and only non-blocking, out-of-scope notes remain
- `FAIL`: the contract was executable and observed product behavior contradicted the expected behavior
- `BLOCKED`: a required prerequisite, path, Phase, environment, or control is missing, so the contract cannot yet be executed
- `INCONCLUSIVE`: sufficient investigation was performed but evidence remains genuinely conflicting or unobtainable
- `STOP`: a product, schema, architecture, privacy, security, legal, billing, or release decision must return to Commander ChatGPT

`FAIL` must not be used for a Unit that could not begin because a prerequisite was absent.

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
- commit / push / deploy occur only after explicit Commander approval
- never include private Session content in subagent prompts, logs, reports, screenshots, analytics, or network diagnostics
- Codex agents may report implementation facts; they may not silently convert them into new product decisions

### Credit Mode

Commander ChatGPT may specify the Credit Mode for a Unit.

- `CONSERVE`: Leader-centered; start a subagent only when necessary
- `NORMAL`: default; use the minimum writer and read-only support required by the Unit
- `QUALITY`: use independent research, implementation, and review; add QA only when justified
- `USE-IT`: near weekly reset, spend remaining capacity on useful independent QA or read-only preparation, never on redundant agents

If Commander does not specify a mode, the Leader uses `NORMAL`. Credit Mode may change execution depth and agent count inside the approved Unit, but never product scope, Phase order, model level, or acceptance criteria.

If a usage screenshot is unclear, do not guess. Report the ambiguity to Commander ChatGPT.

### Evidence and source hierarchy

- local repository runtime facts: implementation source of truth
- canonical Obsidian documents: product and decision source of truth
- commit history: evidence of state changes
- `05 Release Implementation Plan`: temporary execution order, subordinate to current Commander decisions and repository facts
- older chat summaries and superseded plans: historical context only

Repository facts do not independently redefine product intent. When repository implementation and canonical decisions conflict, Codex reports the conflict; Commander ChatGPT decides the resolution.

### Source of truth files

- permanent operating decisions: `03 Implementation, QA & Decisions.md`
- repository execution contract: root `AGENTS.md`
- executable Codex configuration: `.codex/config.toml` and `.codex/agents/*.toml`

Do not duplicate the full TOML configuration in Obsidian.

## 1A. Decision record — Adaptive multi-agent Codex workflow

**Decision date:** 2026-07-22
**Authority boundary amended:** 2026-07-23

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
Commander ChatGPT — sole command, reasoning, and decision authority
↓ approved Unit contract
Codex Leader — execution coordinator
├─ researcher
├─ implementer
├─ qa
└─ reviewer
↓ one integrated evidence report
Commander ChatGPT — interpretation and next decision
```

- the user conducts strategic development through Commander ChatGPT
- Commander ChatGPT completes product reasoning, priority, sequencing, and contract decisions before delegation
- Codex Leader and subagents act as the execution layer
- subagents remain internal to the Leader workflow
- the Leader selects only the minimum roles needed to execute the already-approved Unit
- implementer is normally the only writer
- unresolved evidence conflicts are reported explicitly, not hidden or strategically resolved by Codex
- infrastructure commit: `d7dead6 chore(codex): add adaptive multi-agent leader workflow`

## 1B. Decision record — Single Commander and execution-only Codex boundary

**Decision date:** 2026-07-23

### Decision

Commander ChatGPT in this project thread is the only commander.

Codex Leader and all subagents are hands of the Commander. Their purpose is to inspect, implement, test, and report within the scope already fixed by the Commander.

### Required behavior

- Codex does not determine the product direction or next Phase
- Codex does not reinterpret a canonical contract to make a requested test pass
- Codex does not change acceptance criteria after execution begins
- Codex does not independently resolve product, schema, architecture, privacy, security, billing, or release contradictions
- Codex returns exact repository facts and evidence when a contradiction is found
- Commander ChatGPT decides whether to continue, change sequence, split the Unit, modify a contract, or stop

### Practical consequence

A Codex report may say:

```text
BLOCKED: the production first-save control is not reachable in the current runtime.
Evidence: ...
```

It must not independently conclude:

```text
Therefore Phase 7 must be implemented before Phase 4B.
```

Phase-order decisions belong to Commander ChatGPT.

## 2. Stop line

Codex must stop the affected Unit and return evidence to Commander ChatGPT when any of the following is unclear or requires judgment:

- canonical runtime field mapping
- product contract or Phase-order conflict
- missing prerequisite implementation
- data ownership / RLS
- destructive migration
- Journey boundary
- exact restore order
- current production API contract
- Session content data flow and logging boundary
- vendor contract / DPA / subprocessor suitability
- Account deletion and backup behavior
- legal operator / data controller identity before Cloud or paid release
- acceptance criteria that cannot be executed through the permitted production path

For Guest local implementation, product decisions and Snapshot Schema v1 are complete. Cloud Session content work must not begin before the Global Privacy & Security Gate.

A blocked prerequisite is reported as `BLOCKED`, not `FAIL`. A product or contract decision is reported as `STOP`. Commander ChatGPT decides the next Unit.

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

### Regular Unit 1 — Question 1 A/B flow

Implemented and accepted:

```text
453862f fix(v17): restore current session step
98931af feat(v17): add regular question variants
```

Accepted scope:

- Question 1 A/B UI
- initial `questionVariant: 'A'`
- A/B switching
- textarea draft preservation
- `spiritual-wisdom → ideals` prompt routing
- route/variant-specific Question 1
- Question 2 quoting Question 1
- three-language locale keys
- localized selector aria-label

It does not include Deep, Back redesign, auth, billing, history, Bookmark, analytics, or v16 changes.

### Regular Unit 2 — `questionVariant` Snapshot persistence

**Status:** Complete (historical Unit 2 checkpoint).

The following facts describe the Unit 2 acceptance checkpoint at `df1cefa0007a477a6d0cf3869ed781bf553c44d4`; they are not the current repository HEAD or current test-count report:

- `questionVariant` is included in Regular Snapshot serialization
- validator accepts only canonical A / B values
- older valid records without the field follow the documented default / migration behavior
- restore re-establishes the exact variant before rendering the Regular prompt
- existing `currentStep` restoration remains intact
- characterization and validator coverage passed 9/9 at that checkpoint
- local and remote branch heads matched at that checkpoint

The following Before-only facts are a historical checkpoint, superseded by the current Phase 4B acceptance record below: repository HEAD was `f2bee8207f466b2bfbdad16fa7ed4517fa77d245`, the accepted implementation was `de3a2df6e8dbfe5921c80939862325131f46322d`, and snapshot tests passed 10/10.

### Phase 4B acceptance record

**Decision date:** 2026-07-23

#### Historical blocker — resolved

The earlier Before first-save `BLOCKED` record was based on a runtime where a reachable production first-save control was unavailable. It is retained as historical evidence only; it is not the current state.

#### Historical Before-only implementation

Accepted implementation commit: `de3a2df6e8dbfe5921c80939862325131f46322d` (`de3a2df feat(v17): enable guest before bookmark resume`). Snapshot tests: **10/10 PASS**.

Root causes resolved by the accepted Unit:

1. Before unconditionally performed Regular Flow metadata validation even though Before has no in-progress Regular Flow.
2. The Resume control had no record-eligibility-linked visibility handling.

Human real-browser QA accepted the following Before-only Guest-local path:

- Bookmark is shown at Guest Regular Before; no localStorage record exists before the manual Bookmark action.
- Without Bookmark, reload shows no Resume; Bookmark performs the manual first save and remains on Before.
- After reload, the Guest local record remains; Landing displays Resume only for a valid eligible record and hides it for no record, invalid, unsupported, or corrupt records.
- There is no Auto Resume. The existing `#btn-resume-progress` route explicitly resumes the saved session, preserving theme, session identity, currentStep, `s-v17-before`, and the saved Bookmark state.
- Private Session content is absent from console, analytics, and error output.

This completed the narrow **Before manual first-save prerequisite Unit**. It is retained as the historical checkpoint that preceded the wider production acceptance below.

#### Current accepted Bookmark / Resume implementation

Accepted implementation commit: `67ea52d7e1b83ffbf78972d527191e2b17d060da` (`feat(v17): resume guest sessions from regular screens`). Snapshot tests: **13/13 PASS**; syntax and ja / en / zh-TW JSON parsing passed.

Safari Human real-browser QA accepted Session Mode (including its unselected state), Before, First Response, and Second Response production save / reload / explicit-Resume paths. The first save is manual; after it, automatic updates correctly maintain the same Guest-local `sessionId` / `cycleId` record so explicit Resume returns to the newest valid canonical screen. Auto Resume remains absent.

The accepted automatic-update write path is `submitV17BeforeScore()` → pending saved-snapshot update reason → canonical navigation → `updateBackBtn()` → `updateV17SavedSessionSnapshot()` → `writeCurrentV17SessionSnapshot()` → serializer → Guest Local Repository write. This is the accepted continuation behavior after first save, not an implicit first save.

The Bookmark UI is in the body action flow, with in-flow save status, and locale JSON is the sole source for Bookmark, Resume, and status copy. Human QA found missing First / Second Bookmark hosts; the placement was corrected, with no duplicate control IDs. First-answer quotation and context were retained through Second exact Resume. Private Session content was not exposed in console, analytics, or generic errors.

Phase 4B remains **In Progress**. Only minimal Regular Back after resume and the final Phase 4B Gate remain. The next Unit and acceptance authority remain with Commander ChatGPT.

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

Manual first save is initiated by the shared Session Bookmark control. The trigger table below defines automatic update / flush behavior after the bookmark has been enabled; it does not replace the requirement for a reachable manual first-save path.

| Screen | Trigger after bookmark enablement |
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

Only a Session with an enabled bookmark is auto-updated. Automatic updates after the manual first save are accepted for the currently supported Regular production positions; Deep and later-screen behavior remains outside this accepted scope.

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

Repository facts reported at the current accepted checkpoint:

```text
branch: feature/v17-session-resume
HEAD: 67ea52d7e1b83ffbf78972d527191e2b17d060da
tracked working tree: clean
staged changes: none
latest accepted implementation: 67ea52d7e1b83ffbf78972d527191e2b17d060da
push: not performed
deploy: not performed
untracked backup files: 5, preserved and untouched
```

| Work unit | Status |
|---|---|
| Snapshot serializer / validator / migration foundation | Complete |
| Guest local Regular runtime restore foundation | Complete |
| `currentStep` restore fix (`453862f`) | Complete |
| New Regular A/B flow Unit 1 (`98931af`) | Complete |
| Unit 2: `questionVariant` Snapshot persistence | Complete and pushed |
| Snapshot validator / characterization suite | 13/13 PASS |
| Guest production navigation to Session mode / Before | Confirmed |
| Session Mode / Before / First / Second production save and Resume | Complete — Safari Human real-browser QA accepted |
| Manual first save / automatic update flow | Complete — manual first save, then accepted automatic updates for supported Regular positions |
| Landing Resume control eligibility | Complete — valid Guest-local record only; fail closed otherwise |
| Phase 4B | In Progress — Regular production save / resume accepted; minimal Back and final Gate pending |
| minimal Regular Back after resume | Not started |
| New Deep A/B alternating flow | Approved, not started |
| Breath / Final / Result / Repeat exact resume | Not started |
| Bookmark / Resume three-language in-flow UX | Complete — accepted at the four supported production screens |
| Global Privacy & Security Gate | Policy fixed; implementation not started |
| Cloud / RLS | Blocked by privacy gate |
| Active Journey list | Not started |
| Explicit completion | Not started |
| Full QA / release | Not started |

## 17. Current Commander gate and next authorized work

### Current gate

Phase 4B remains in progress. Its Session Mode, Before, First, and Second production save / resume scope is accepted; minimal Regular Back after resume and the final Phase 4B Gate remain. Phase 7, Phase 8, Deep, Cloud, auth, and billing are not complete or implicitly advanced. Commander ChatGPT chooses the next Unit and grants its acceptance authority.

Codex must not independently change Snapshot Schema v1, reorder phases, count direct serializer/localStorage/restore calls as production acceptance, or start remaining acceptance without a Commander-approved Unit.
