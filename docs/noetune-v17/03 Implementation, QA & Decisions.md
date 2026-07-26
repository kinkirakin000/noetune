> [!info] Noetune v17 Canonical Documents
> [[00 Noetune v17 Master]] · [[01 Product, Monetization & Journey]] · [[02 Technical & Content Specification]] · [[03 Implementation, QA & Decisions]] · [[04 Theme Source Database]]

# Noetune v17 Implementation, QA & Decisions

**Status:** Canonical implementation decisions and QA record
**Updated:** 2026-07-26
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

## 1C. Decision record — Centralized reasoning and bounded Codex execution reasoning

**Decision date:** 2026-07-26

Noetune開発における戦略的思考、設計判断、契約解釈、優先順位、受入判断は、Commander ChatGPTへ一元化する。

これはCodexを思考なしで動作させる決定ではない。Codex Leaderおよびsubagentには、Commanderが確定したUnitをrepositoryへ安全に適合させるための、限定された局所的な実装思考を許可する。

### Role boundary

- Commander ChatGPT decides.
- Codex Leader coordinates and checks compliance.
- Researcher investigates repository facts.
- Implementer implements the approved contract with the smallest safe diff.
- QA and Reviewer verify the specified acceptance criteria.

### Commander-exclusive decisions

Commanderのみが次を決定する。

- product direction and UX meaning
- architecture
- schema meaning and canonical ownership
- privacy and security boundaries
- Phase order and Unit scope
- priorities
- acceptance criteria
- residual-risk acceptance
- final PASS / FAIL / BLOCKED interpretation
- commit, push, deploy, and release authorization
- selection of the next Unit

### Bounded Codex reasoning

Codexは次の目的に限って局所的な思考を使用できる。

- repository facts and dependenciesの確認
- approved contractを既存コードへ適合させる最小方式の選択
- syntax、fixture、test harness等の局所的修正
- specified testsの実行
- evidenceの整理
- Commander契約との機械的照合

Codexの局所的思考は、scope、architecture、schema、Phase順序、acceptance criteria、risk acceptance、release authorityを変更してはならない。

Commander契約とrepository factsが両立しない場合、Codexは独自に契約を再設計しない。差分を安全に保持し、具体的証拠を添えてSTOPまたはBLOCKEDとしてCommanderへ判断を返す。

この決定は既存のCommander authorityを変更するものではなく、その思考権限と実行権限の境界を明確化するものである。

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

Guest local bookmark is no longer a target product entitlement. Existing Snapshot Schema and restore code are historical foundations that may be reused for authenticated Cloud continuity. Cloud Session content work must not begin before the Global Privacy & Security Gate.

A blocked prerequisite is reported as `BLOCKED`, not `FAIL`. A product or contract decision is reported as `STOP`. Commander ChatGPT decides the next Unit.

## 3. Decision record — In-progress Session Bookmark

**Decision date:** 2026-07-15

**Status:** Partially superseded on 2026-07-25. The shared snapshot model remains useful; Guest local 1 and Pro 20 are no longer current entitlements.

### Product

- large Result-only bookmark CTA is removed
- one shared header control appears on all canonical Session pages
- first save is manual; later updates are automatic
- Result is not Journey completion
- explicit completion is required
- Repeat stays in the same sessionId and receives a new cycleId

### Access

- Historical entitlement: Guest local 1 active — **superseded**
- Current entitlement: Free cloud 1 active
- Historical entitlement: Pro cloud active maximum 20 — **superseded by maximum 50**
- Free can resume its one active Journey across devices after login
- Pro adds multiple active Journeys and completed archive

### Data

- Snapshot Schema v1
- no raw runtime navigation history
- maximum three resume back frames
- historical local-first implementation foundation — Guest entitlement superseded; authenticated cache only
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
- Historical Guest-local continuity stage is **superseded**
- Worldwide Guest release provides complete Sessions without persistence
- Free cloud, Pro archive, cross-device resume, and paid Cloud features remain gated

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

## 3B. Decision record — Guest local bookmark retirement and Cloud entitlement revision

**Decision date:** 2026-07-25

### Decision

- Guest local bookmark is formally retired as a product entitlement
- Guest can use complete Regular / Deep Sessions without login and without usage limits
- Guest persistent bookmark count is 0
- Guest writing is not persisted to localStorage or Cloud
- Guest browser or tab close does not guarantee exact resume
- Free login receives one active Cloud bookmark
- Pro receives up to 50 active Cloud bookmarks
- Pro completed archive and theme history remain unchanged
- Login alone does not create or upload a Cloud record
- the first Cloud save requires an explicit user action and clear save / deletion explanation
- Cloud functionality remains disabled until the Global Privacy & Security Gate passes

### Superseded decisions

The following are historical and no longer define the target product:

- Guest local active 1
- Guest localStorage as the canonical bookmark source
- Guest browser-restart exact resume as a release right
- Pro active maximum 20
- Guest local Phase 4B completion as a release prerequisite
- worldwide Guest-local continuity as Stage 1

### Phase 4B disposition

- the Guest local serializer, validator, restore, navigation-frame, and test foundation remains in repository history
- Human QA confirmed Before value persistence and First Response screen / variant restoration
- Human QA also observed that the unconfirmed First Response draft was not restored
- no additional Guest-local draft fix or Human QA is authorized because the entire Guest-local bookmark entitlement has been retired
- Phase 4B is neither accepted as PASS nor left as an active FAIL-fix track
- final verdict: `SUPERSEDED BY PRODUCT DECISION`
- a later code Unit must disable or remove Guest bookmark UI, Guest resume entry, and Guest persistent writes from the target release
- Snapshot Schema and restore logic may be reused only for authenticated Cloud bookmarks under the new entitlement and privacy contracts

### Current product boundary

```text
Guest = unlimited complete Sessions, no persistent bookmark
Free  = one active Cloud bookmark
Pro   = up to 50 active Cloud bookmarks + completed archive / history
```

## 3C. Decision record — Guest-visible Cloud save intent CTA

**Decision date:** 2026-07-25

### Decision

- Guest local bookmark entitlement remains retired
- Guest persistent active count remains 0
- the large legacy Result CTA `しおりを挟む` is retired
- one common small bookmark CTA is the target UI on Session Mode, Before, Regular / Deep response pages, Breath, Final Measurement, Result, and Repeat
- the same small CTA is visible to Guest, Free, and Pro when the authenticated Cloud Bookmark feature is enabled
- for Guest, the CTA is a save-intent entry and does not itself create a local or Cloud record
- Guest click flow is: Cloud save explanation → Google Login → return to the same Session screen → explicit final save confirmation
- Google Login alone does not upload or persist Guest runtime writing
- only the final explicit save confirmation may create the first owner-bound Cloud record
- Free receives one active Cloud bookmark and Pro receives up to 50
- ordinary Session use never forces Login
- production exposure remains feature-flagged off until the Cloud onboarding path, Global Privacy & Security Gate, and required ownership / deletion controls are ready

### Implementation sequencing

- commit `048ce45290d9594a9f2bd1f125d813b59ad13906` disabled Guest local Bookmark / Resume / persistent writes and removed the legacy Result CTA
- the next Bookmark UI work is a separate Unit for the common small CTA and save-intent / Login boundary
- that Unit must not restore Guest local persistence or call legacy theme Bookmark APIs
- authentication return-to-session feasibility and no-upload-before-confirmation must be verified before implementation acceptance

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

**Status:** Complete and pushed by current repository HEAD `df1cefa0007a477a6d0cf3869ed781bf553c44d4`.

Accepted repository facts reported through the current implementation line:

- `questionVariant` is included in Regular Snapshot serialization
- validator accepts only canonical A / B values
- older valid records without the field follow the documented default / migration behavior
- restore re-establishes the exact variant before rendering the Regular prompt
- existing `currentStep` restoration remains intact
- characterization and validator coverage pass 9/9
- local and remote branch heads match

### Phase 4B acceptance sequencing decision

**Decision date:** 2026-07-23
**Final status amended:** 2026-07-25 — `SUPERSEDED BY PRODUCT DECISION`

Historical runtime evidence:

- Guest production navigation reached the canonical Regular resume screens
- a production first-save path was later exposed and Human QA proceeded
- Before persistence and First Response screen / variant restore were observed
- First Response unconfirmed draft restore did not match the expected Guest-local contract

Final Commander interpretation:

- do not continue Guest-local bug fixing or acceptance
- do not classify Phase 4B as release PASS
- do not keep it as an active release-blocking FAIL
- preserve the implementation and test history for possible authenticated Cloud reuse
- the target release must remove or disable Guest bookmark UI, Guest resume entry, and Guest persistent writes
- the next code sequence is a separate Commander decision after canonical documentation is aligned

## 5. Completed investigation record

### Regular

Audited:

- canonical screens
- route-dependent first / second semantics
- Before / After null vs 0
- draft vs confirmed value
- Result Back and repeat globals

### Deep

### New Flow Unit 3A acceptance

**Status:** Complete in commit `c48e0e77a6f0970e620acfc5da3451291120c9da` (`feat(v17): add alternating deep flow`).

- changed: `app-v17.html`, `tests/v17/deep-alternating-flow.test.js`
- Deep test: 6/6 PASS
- Snapshot regression: 17/17 PASS
- inline JavaScript syntax: PASS
- `git diff --check`: PASS
- scope: live Deep A/B runtime, completed / pending round boundary, Deep Back, No More Words → Breath, Result adapter, Regular / Deep state isolation
- Snapshot persistence remains unsupported; Breath exact resume and Cloud continuity remain future scope
- an intermediate Result adapter failure was fixed before final acceptance; final validation passed

### New Flow Unit 3B-1 acceptance

**Status:** Complete; commit `88340e5b5e478505ff918c6b7a59215c96e9f49c` (`feat(v17): define deep snapshot schema foundation`).

- changed: `js/v17/session-snapshot.js`, `tests/v17/session-snapshot.compat.test.js`
- Snapshot Schema v1を維持し、DeepFlowV1 / DeepRoundV1 / ResponseValueV1のexact shapeを定義
- normalizerはallowlist抽出、validatorはunknown / old Deep shapeをfail closed
- `answered` / `unset`、A/B parity、round連番、originalTheme、Question 1 Back、`nextPendingRound`を検証
- Snapshot test: 21/21 PASS
- Deep runtime test: 6/6 PASS
- syntax checks / `git diff --check`: PASS
- production Deep serializer / restoreはunsupportedのまま、restore不能recordを生成しない
- 当時の次UnitはNew Flow Unit 3B-2（Deep serializer and restore activation）とした。現在は3B-2 acceptance済みである。

### Phase 5B-1 acceptance

**Status:** Complete; commit `bc6fee1b0b387788b22e84bea49596d8113cdc67` (`feat(v17): enable breath snapshot resume`).

- changed: `js/v17/session-snapshot.js`, `app-v17.html`, `tests/v17/session-snapshot.compat.test.js`, `tests/v17/deep-alternating-flow.test.js`
- 初回FAIL: unsafe Breath gate、Regular Breathの`RUNTIME_SCREEN_INVALID`
- 修正: gate一時閉鎖、typed Regular frameをcanonical sourceとして採用、runtime producer、restore、production resume、R1 / R2、Deep回帰、raw-history-free Backを完成
- Snapshot: 34/34 PASS、runtime/navigation: 19/19 PASS
- Breath Step 1 / Step 2のみsupported。Final / Result / Repeat、2件以上のproduction Back frame、Cloud、Guest persistent resumeはunsupported
- syntax checks / `git diff --check`: PASS

### Phase 5B-2a acceptance

- implementation commit: `1dbca2af5b799f24a6e941a6ee2b1dde6036daab` (`feat(v17): define final measurement snapshot foundation`)
- Snapshot Schema v1を維持し、Final measurementのcanonical ownerを`measurement.after`へ固定した
- `finalMeasurementState`はtyped projectionとし、normalized `state` / `value` / `touched`の完全一致を要求する。不一致は`FINAL_MEASUREMENT_MISMATCH`でfail closedする
- Final candidateのRegular / Deep response → Breath固定2段frame stackを検証し、production Breathは1 frame契約を維持する
- 旧migration、Final serializer / restore activation、Result / Repeat、Cloud、Guest persistent resumeは未実装
- Snapshot 50/50、Deep runtime 19/19、syntax、diff checkをPASS

### New Flow Unit 3B-2 acceptance

**Status:** Complete; commit `2f793f42407433db898145bc25e8744e3d08ddfb` (`feat(v17): enable deep response snapshot resume`).

- changed: `app-v17.html`, `js/v17/session-snapshot.js`, `tests/v17/session-snapshot.compat.test.js`, `tests/v17/deep-alternating-flow.test.js`
- supported: Deep response Question 1 / Question 2、draft、restore-before-render、Deep内Back、`nextPendingRound`、Result adapter derived state
- Regular root `questionVariant`汚染を修正し、Regular / Deep isolationをproduction Case 1を含めて検証
- 初回QA FAIL（Regular variant上書き）を修正し、Q1 / Q2 render、same-round / cross-round Back、forward、No More Words境界を追加検証
- Snapshot: 23/23 PASS、Deep runtime: 11/11 PASS
- syntax checks / `git diff --check`: PASS
- Breath / Final / Result、finished Deep、Repeat、raw navigation history、Deep Cloud、Guest persistent resumeはunsupported

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

### Authenticated cache and Cloud-first entitlement

- Guest runtime is memory-only and has no persistent bookmark entitlement
- first Cloud save is explicit
- authenticated local cache may support offline queue and failure recovery
- authenticated cache is not a Guest feature or source of entitlement
- no Cloud success path may delete the only safe pending copy
- Cloud adapter remains replaceable

## 8. Canonical save triggers

Manual first Cloud save is initiated by an authenticated Session Bookmark action. The trigger table below defines automatic update / flush behavior after Cloud bookmark enablement. Guest runtime must not execute persistent save triggers.

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

Only an authenticated Session with an explicitly enabled Cloud bookmark is auto-updated. Guest Sessions are never persistently auto-updated.

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

### Guest no-persistence

- [ ] Guest can complete Regular / Deep Sessions without login
- [ ] Guest has no persistent bookmark control or resume entitlement
- [ ] Guest writing is not written to localStorage, IndexedDB, Cloud, logs, analytics, or error payloads
- [ ] closing and reopening the browser does not expose a Noetune-saved Guest resume record
- [ ] ordinary Session navigation never forces Login
- [ ] explicit save intent is the only allowed path toward Login / Cloud bookmark onboarding

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

- [ ] Login does not auto-upload Guest runtime content
- [ ] explicit Cloud save is required before record creation
- [ ] Cloud failure never removes the authenticated pending copy
- [ ] Journey deletion removes the selected record
- [ ] Account deletion removes active, completed, old bookmark, and authenticated cache
- [ ] Logout removes authenticated local cache; Guest has no persistent data to migrate
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

- [ ] Guest persistent active count is 0
- [ ] Guest writing does not survive through a Noetune persistent record
- [ ] ordinary Guest browser reload does not expose a resume entitlement
- [ ] Login alone creates no Cloud record
- [ ] explicit first Cloud save creates one owner-bound record
- [ ] authenticated cache quota error keeps the runtime Session
- [ ] offline Cloud save keeps a pending authenticated copy
- [ ] online retry preserves revision safety
- [ ] token expiry keeps the authenticated pending copy
- [ ] Free cloud 1 active replacement confirmation
- [ ] Pro 50 active limit without silent deletion
- [ ] same-session authenticated cache / Cloud reconciliation
- [ ] different-session Free choice
- [ ] revision conflict returns 409
- [ ] old client cannot silently overwrite new cloud state
- [ ] cross-device resume restores the exact saved state

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

- save to your account
- saved / syncing / synced
- Cloud unavailable
- resume
- Journey completion
- replace Free active Journey
- Pro 50-item limit
- conflict
- partial recovery
- corrupt snapshot
- delete bookmark
- Login alone does not save
- Guest Sessions are not saved

Copy must be quiet, clear, nonpromotional, and explicit around Login, Cloud save, deletion, and privacy.

## 15. Release blockers

Do not release when:

- Guest writing is persistently stored by Noetune
- Guest bookmark or resume entitlement remains active
- ordinary Session flow forces Login
- Login alone creates or uploads a Cloud Session record
- exact Back chain fails after authenticated Cloud resume
- Deep round or pendingRound is lost or duplicated
- invalid snapshot overwrites a valid one
- Result automatically completes or removes an active Journey
- cross-user read/update/delete is possible
- Cloud failure destroys the authenticated pending state
- Free 1 / Pro 50 count is enforced by silent deletion
- Pro 20 remains in target entitlement enforcement
- private writing appears in logs or analytics
- old and new bookmark UI are both active
- Cloud Session content is enabled before the Global Privacy & Security Gate
- data controller / legal operator is not identified for Cloud or paid release
- a Session-content vendor has not passed DPA / subprocessor / transfer review
- Account deletion or Journey deletion is not verified end-to-end
- user-facing privacy or encryption claims exceed the implemented controls

## 16. Current status

Latest Commander-known repository facts before this documentation revision:

```text
branch: feature/v17-session-resume
HEAD: c48e0e77a6f0970e620acfc5da3451291120c9da
tracked working tree: clean
staged changes: none
snapshot regression tests: 17/17 PASS
Human QA: PASS for Guest no-persistence, no Resume, no legacy Result CTA, and complete Guest Regular Session
push: not performed
deploy: not performed
untracked backup files: 5, preserved and untouched
```

| Work unit | Status |
|---|---|
| Snapshot serializer / validator / migration foundation | Complete; historical foundation retained |
| Guest local Regular runtime restore foundation | Implemented; target entitlement retired |
| `currentStep` restore fix | Complete |
| New Regular A/B flow | Complete |
| `questionVariant` Snapshot persistence | Complete |
| Snapshot / navigation regression suite | 17/17 PASS at latest reported checkpoint |
| Safari top-control stabilization | Complete |
| Guest local Phase 4B Human QA | `SUPERSEDED BY PRODUCT DECISION` |
| First Response Guest-local draft mismatch | Historical observation; superseded and no longer a target path |
| Guest local Bookmark UI / Resume / persistent write disablement | Complete; commit `048ce452`; Human QA PASS |
| New Deep A/B alternating flow | Complete; commit `c48e0e77a6f0970e620acfc5da3451291120c9da`; tests 6/6 PASS |
| Common small Cloud save-intent CTA / authenticated Bookmark onboarding | UX decision fixed; implementation boundary audit not started |
| Free cloud active 1 / Pro cloud active 50 | Canonical decision fixed; implementation not started |
| Global Privacy & Security Gate | Policy fixed; implementation not started |
| Cloud / RLS | Blocked by privacy gate |
| Explicit completion / Pro archive | Not started |
| Full QA / release | Not started |

Repository facts must be re-verified at the start of the next Codex Unit. This section records the latest accepted conversation checkpoint, not permission to modify Git state.

## 17. Current Commander gate and next authorized work

### Current gate

Do not continue Guest-local bookmark bug fixing, Guest-local resume Human QA, or Guest-local release acceptance.

Do not independently:

- preserve Guest bookmark UI as a release entitlement
- create a new Guest persistent storage mechanism
- upload Guest runtime content on Login
- enable Cloud before the Global Privacy & Security Gate
- change Free 1 / Pro 50 limits
- remove Pro completed archive or theme history
- begin Cloud DB / API / RLS implementation without a separate Commander Unit
- commit, push, or deploy based only on this documentation decision

### Next product-code sequencing decision

Commander ChatGPT must separately define the smallest safe code sequence for:

1. auditing the common small Bookmark CTA, Google Login return-to-session path, and no-upload-before-confirmation boundary
2. implementing the common small CTA on canonical Session pages without restoring Guest local persistence
3. preserving ordinary Guest Session access without Login
4. implementing explicit save-intent → Cloud explanation → Google Login → original-screen return → final save confirmation
5. implementing Global Privacy & Security Gate prerequisites
6. implementing authenticated Free 1 / Pro 50 Cloud continuity

Existing Guest-local code may remain temporarily as unreachable historical foundation, but it must not define public entitlement or silently persist Guest content.

### Acceptance direction

The next release-oriented QA must establish:

- Guest has no Noetune persistent record
- Guest can still use complete Sessions without Login
- the common small Bookmark CTA does not call Guest local or legacy theme Bookmark writes
- Guest click may open the explicit Cloud save / Login path, but Login alone does not save
- explicit Cloud save is required
- Free enforces 1 active record
- Pro enforces 50 active records
- cross-device resume and owner-only RLS pass after the privacy gate

### Phase 5B-2b acceptance

- implementation commit: `a76336497f3c674fc2c627b558cade6638cdde21` (`feat(v17): enable final measurement snapshot resume`)
- changed: `app-v17.html`, `js/v17/session-snapshot.js`, `tests/v17/session-snapshot.compat.test.js`, `tests/v17/deep-alternating-flow.test.js`
- Final production serializer / validator / restoreを`step5`、Regular / Deep、response → Breathの2-frame stackに限定して有効化
- canonical `measurement.after`、projection consistency、restore-before-render、controls復元、exact Back、side-effect isolation、Regular / Deep isolationを受入
- 初回QA note（Snapshot 50、runtime 20）の後、Final全measurement state、production round-trip、two-stage Back、analytics、render-before-restore、step6 / Result rejectionの独立testを追加
- 実testで発見した最小修正：Deep Final一時unfinished restore、step6 rejection、Final Breath frame eligibility
- 最終検証：Snapshot 58/58、runtime/navigation 25/25、syntax、diff check PASS
- Human browser QA未実施。push / deploy未実施

### Phase 5B-3a acceptance

- Status: Complete
- implementation commit: `6c7209f0e6e3d0416fc2a758fce44fb56081f376` (`feat(v17): define result snapshot foundation`)
- changed: `js/v17/session-snapshot.js`, `tests/v17/session-snapshot.compat.test.js`
- Snapshot Schema v1を維持し、Snapshot v2、Result旧shape migration、missing stateの推測補完は追加していない
- structural candidateは`s-result`、`step6`、Regular / Deepに限定し、stable candidateには`currentState.resultView.reached = true`、valid non-null `currentCycle.resultReachedAt`、`currentCycle.resultEventSent = true`、Repeat未開始、new cycle transition未開始を要求する
- 新しいpersisted `resultState`は追加せず、既存`currentState.resultView`（`reached`、`scoreTrailExpanded`、`awarenessTrailExpanded`）をcanonical shapeとして使用する。RepeatStateV1の既存`resultState`とは別概念であり、意味を変更していない
- typed Final frame（`frameType`、`sessionMode`、`screen`、`currentStep`、`measurementAfter`、`finalMeasurementState`）とRegular / Deepのresponse → Breath → final-measurement 3-frame foundationを追加した
- frame順序、mode、Breath Step 2、Final step5、measurement consistency、unknown / recursive / missing / reverse / duplicateをfail closedで検証する
- Result production serializer / restore、Result → Final Back、Result analytics idempotent restore、Repeat serializer / restore、Cloud persistence、Guest persistent resumeは未実装。Final 2-frameとBreath 1-frame production契約は維持する
- Snapshot 70/70、runtime/navigation 25/25、syntax、diff check PASS。private Session本文、score、timestamp、Snapshot全文をerrorへ出さず、payload 1 MiB capを維持する
- 次の正式UnitはPhase 5B-3b（Result serializer / restore、side-effect-free render、analytics / cycle idempotency、Result → Final exact Back activation）である

### Phase 5B-3b-1 acceptance

- Status: Complete
- implementation commit: `ad5f034679fc8bcbd92dc8adc81e14967adaa8ed` (`feat(v17): stabilize result runtime lifecycle`)
- changed: `app-v17.html`, `tests/v17/deep-alternating-flow.test.js`
- Final submitからResultへのlive transition、cycle markerの一度だけのcommit、`v17_result_reached`のcycle単位idempotency、旧completion event除去、Result経路からの`clearPendingProgress()`除去を受入した
- typed Final frameをproduction runtimeで生成し、Regular / Deepの`response → breath → final-measurement` 3-frame stackとResult → Final → Breath → Response live Backを有効化した
- Result renderをdeterministic render-only責務へ分離し、arrival副作用、analytics、cycle markers、trails、Back frameの重複を防止した
- Result production serializer / restore、persisted Result → Final Back、Repeat Snapshot / restore、Cloud persistence、Guest persistent resumeは未実装。Final 2-frameとBreath 1-frame production契約は維持する
- runtime/navigation 46/46、Snapshot 70/70、inline JavaScript 25 script blocks、syntax、diff check PASS
- Human browser QA未実施。次の正式UnitはPhase 5B-3b-2（Result serializer / restore、side-effect-free Result restore、persisted Result → Final exact Back、restore analytics / cycle idempotency）である
