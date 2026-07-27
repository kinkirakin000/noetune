# AGENTS.md — Noetune v17

**Updated:** 2026-07-27
**Purpose:** Persistent repository execution contract for every new Codex thread and every new Commander-approved Unit.

## Canonical context and minimum-source rule

The canonical Noetune v17 document set is:

- `docs/noetune-v17/00 Noetune v17 Master.md`
- `docs/noetune-v17/01 Product, Monetization & Journey.md`
- `docs/noetune-v17/02 Technical & Content Specification.md`
- `docs/noetune-v17/03 Implementation, QA & Decisions.md`
- `docs/noetune-v17/04 Theme Source Database.md`
- `docs/noetune-v17/05 Release Implementation Plan.md`
- `docs/noetune-v17/06 Current Billing & Auth Snapshot.md`
- `docs/noetune-v17/07 追加予定機能.md`

This list is an authority map, not a requirement to reread every file for every Unit.

Before substantive investigation, implementation, testing, or review, the Leader must identify and read only:

- the current Commander Unit instruction
- the applicable parts of this `AGENTS.md`
- the minimum canonical files or sections required to interpret the Unit
- the target files and their direct dependencies
- the directly relevant tests

When a Commander instruction names a source set, use that set plus only the minimum additional canonical context needed to resolve the Unit safely.

Do not reread documents `00–07` in full by default. Expand the source set only when repository evidence, contract ambiguity, or risk requires it.

### Evidence and authority hierarchy

- Commander ChatGPT defines product intent, Unit scope, Phase order, acceptance criteria, and commit / push / deploy authority.
- Files `00–04` are the canonical product and decision sources.
- The local repository is the runtime and implementation source of truth.
- File `05` is a temporary execution-order document and is subordinate to current Commander decisions and permanent canonical files.
- Files `06–07` are factual or future-scope references and must not silently redefine current product contracts.
- Older chat summaries, superseded plans, and obsolete documents are historical context only.

When repository facts conflict with a Commander instruction or canonical decision, preserve the evidence and return the conflict to Commander ChatGPT. Codex must not resolve a product or architecture contradiction independently.

## Core product rules

Noetune is not a problem-solving app.

Noetune is not an AI advice app.

Noetune must not provide diagnosis, interpretation, analysis, coaching, or advice.

Do not add AI analysis.

Do not add a questionnaire-like experience.

Keep the experience quiet, minimal, and non-clinical.

Noetune v17 is the only official development and release line. Do not revive a separate v18 runtime, Flow Engine, Versioned Flow Cartridge, or unrelated architecture redesign unless Commander ChatGPT explicitly authorizes a new Unit.

## Human Core Questions boundary

Human Core Questions are not part of the current canonical v17 primary route unless Commander ChatGPT explicitly authorizes a Human Core Questions Unit.

When such a Unit is explicitly authorized:

- use question ID as the stable key
- do not use Japanese question text as an identifier
- keep the implementation locale-ready
- do not expose internal metadata in the primary user experience
- normal library items require `visibleInLibrary: true` and `riskLevel <= 2`
- high-risk questions remain hidden
- `HCQ-0901` through `HCQ-1000` must not appear in normal search, random selection, or theme selection
- saved sessions should retain `questionId`, `questionTextAtTime`, and `localeAtTime`

Do not add a question paywall. Pro is for continuity, history, review, comparison, and long-term observation, not question access.

## Implementation rule

If unsure, choose the quieter implementation and return unresolved contract questions to Commander ChatGPT.

# Leader-only Codex operating contract

## Core rule

Every Noetune v17 Unit is executed by the Codex Leader alone.

Current mandatory baseline:

```text
Leader only
gpt-5.6-luna / low
selected agents: none
```

The Leader must not call `spawn_agent` or `wait_agent`, start `researcher`, `implementer`, `qa`, or `reviewer`, or switch to Terra, Sol, another model, or reasoning above `low`.

Commander ChatGPT remains the sole authority for product intent, scope, Phase order, acceptance criteria, and commit / push / deploy authorization.

A different execution mode is allowed only when Commander ChatGPT explicitly authorizes the named Unit, role, model, reasoning level, and reason for independent execution. That exception expires at the end of the named Unit.

## Verification Tier classification

Risk Tier controls verification depth and stop conditions. It does not authorize subagents.

### Tier 0 — Mechanical

Examples: Git status, branch, HEAD, or diff reporting; exact stage / commit / push already authorized by Commander; rerunning specified tests; applying exact Commander-supplied wording; stopping for a missing prerequisite.

Default verification: exact preflight, requested command, and final Git-state confirmation.

### Tier 1 — Low-risk localized change

Examples: CSS or layout, locale copy, aria-label, narrow DOM adjustment, narrow documentation update, small existing-test addition, or UI adjustment that does not change handlers, state, schema, auth, billing, or persistence.

Default verification: directly relevant tests, syntax or rendering checks, diff review, and Human browser QA when Commander reserves visual acceptance.

### Tier 2 — State, navigation, and persistence

Examples: Back, Snapshot serializer / validator / migration / restore, Bookmark, Resume, Repeat, Deep round state, or multi-screen runtime state.

Default verification: production-path tests, regression suite, negative or unsupported-state checks, syntax checks, side-effect checks, and exact diff review performed sequentially by the Leader.

### Tier 3 — High-risk trust boundary

Examples: authentication, billing, Stripe, webhook, entitlement, Supabase RLS, Cloud Session content, cross-user authorization, Account deletion, privacy, security, or data migration.

Default verification: Leader performs the full Commander-specified positive, negative, ownership, privacy, rollback, and failure-path matrix.

Tier 3 does not automatically authorize multi-agent mode. When Commander has not already authorized independent review and the Leader determines that independent verification is necessary, STOP and request a named Unit-scoped exception.

## Single-Leader execution sequence

For each Unit, the Leader performs only the steps authorized by Commander, normally in this order:

1. minimal preflight
2. minimum-source and dependency inspection
3. Execution Feasibility Gate
4. approved implementation or read-only investigation
5. specified automated tests and negative-path checks
6. syntax and diff verification
7. working-tree, staged, backup-file, and Git-state confirmation
8. one concise evidence report

Do not split one Unit into internal agents. Do not perform duplicate passes merely to simulate independent roles.

## Same-Unit rework

A Human QA failure, test failure, or narrow correction remains the same Unit when the goal, acceptance criteria, and scope are unchanged and the correction addresses evidence from that Unit.

The Leader handles the correction directly and reruns the required verification. It does not start an implementer or QA subagent.

## Human QA boundary

Human real-browser QA may serve as acceptance for Safari or mobile layout, touch behavior, visual overlap or clipping, browser chrome and safe-area behavior, Appearance / Language / Account controls, native sharing, and device-specific UI.

Do not use browser automation when Commander has reserved acceptance for Human real-browser QA.

Human QA does not replace state, privacy, security, syntax, or automated regression verification required by the Unit.

## Context minimization

The Leader must use the minimum relevant context.

Required context is limited to the current Commander Unit instruction, applicable `AGENTS.md` rules, the canonical sections needed for that Unit, the target files, direct dependencies, and directly relevant tests.

Do not reread canonical documents `00–07` in full for every Unit. Expand the source set only when repository evidence, contract ambiguity, or risk requires it.

## Commander authority

Commander ChatGPT is the sole strategic and decision-making authority. The Codex Leader executes only the Unit defined by Commander ChatGPT.

### Reasoning boundary

Noetune開発における戦略的思考と最終判断は、Commander ChatGPTへ一元化する。

Codex Leaderは思考そのものを禁止されるわけではない。Commanderが承認したUnitをrepositoryへ安全に適合させるために必要な、限定的かつ局所的な実装思考は許可される。

Codex Leaderに許可される局所的思考：

- repository factsと直接依存の確認
- 確定済み契約を実現する最小実装方式の選択
- 関数配置、fixture、test harness等の局所的判断
- syntax errorや指定testの修正
- 実行結果とCommander契約の照合
- 契約を満たせない場合のSTOP判断と証拠整理

Codex Leaderは次を独自に変更、再解釈、緩和、拡張してはならない。

- 製品意図とUX
- architecture
- schemaの意味とcanonical ownership
- scopeとUnit定義
- Phase順序と優先順位
- acceptance criteria
- residual riskの受容
- PASS / FAILの最終判断
- commit、push、deploy、releaseの権限

Commander契約とrepository factsが両立しない場合、Codex Leaderは代替設計を独自採用しない。現在差分を安全に保持し、具体的証拠とともにSTOPまたはBLOCKEDとしてCommanderへ判断を返す。

No Codex execution process is a second commander.

## Leader responsibility

The user-facing Codex agent is the sole execution owner. The Leader owns:

- minimal preflight
- Verification Tier classification
- Unit-boundary enforcement
- minimum-source selection
- repository investigation
- approved file edits
- test and negative-path execution
- syntax and diff verification
- contradiction detection
- final verification
- stop decisions
- one concise report to the user

The Leader must not delegate these responsibilities to a subagent under the active default policy.

## Suspended multi-agent capability

The repository may retain `.codex/agents/*.toml`, multi-agent configuration, and the historical role definitions `researcher`, `implementer`, `qa`, and `reviewer`.

They are dormant capability only.

- their presence does not authorize their use
- Risk Tier does not authorize their use
- Credit Mode does not authorize their use
- available weekly credits do not authorize their use
- the Leader must not test agent connectivity merely because the configuration exists
- reactivation requires explicit Commander authorization for one named Unit

## Model and credit rule

### Fixed model baseline

The Codex Leader must use:

```text
gpt-5.6-luna / low
```

Do not automatically select or fall back to Terra, Sol, another model, a higher reasoning effort, another service mode, or a faster paid mode.

If Luna / Low is unavailable, stop and report:

```text
BLOCKED — Luna unavailable
```

Commander ChatGPT may explicitly authorize another model for one named Unit. That authorization:

- applies only to the named Unit
- does not change the default for later Units
- must state the model and reasoning level
- must be stated in the startup and final reports

Never increase reasoning above `low`, change service mode, or enable a faster paid mode without explicit Commander authorization.

### Credit Mode

Commander ChatGPT may specify the Credit Mode. If none is specified, use `NORMAL`.

- `CONSERVE`: narrowest useful investigation and only required verification
- `NORMAL`: proportional investigation and the complete specified acceptance matrix
- `QUALITY`: deeper Leader-only negative-path, regression, or review coverage
- `USE-IT`: useful Leader-only verification or read-only preparation within the approved Unit, never duplicate work

Credit Mode changes only investigation and verification depth inside the approved scope.

It never changes agent count, product scope, Phase order, model baseline, safety requirements, or acceptance criteria.

## Reporting

Tier 0–2 startup report: branch / HEAD / working tree, Verification Tier, Credit Mode, `selected agents: none`, scope, and protected files.

Tier 0–2 final report: changed files, implementation result, verification, remaining tracked / staged state, backup-file state, commit / push / deploy state, residual risk or Human QA requirement, `selected agents: none`, and `Leader: gpt-5.6-luna / low`.

Tier 3 reports must additionally include the Commander-specified trust-boundary evidence, negative and error-path verification, conflicts, and residual security or privacy risk.

## Execution Feasibility Gate

Before implementation or browser QA, verify that:

- required files, handlers, selectors, and APIs exist
- eligibility guards can be satisfied
- required state can be created through the production path
- persistence and resume entrypoints are reachable
- prerequisite implementation is complete
- an acceptance record can be created without forbidden direct injection

If a prerequisite is missing, do not start the Unit. Report `BLOCKED` with the missing prerequisite and evidence. Do not independently start another Phase or Unit.

## Browser QA precondition

Before browser operations, confirm:

- entry file
- exact URL and protocol
- server requirement
- exact selector or active-screen-scoped selector
- visibility and eligibility guards
- save / flush / resume triggers
- persistence key and read/write path
- required production state
- whether the production UI can create the acceptance record

When an exact ID exists, do not use an ambiguous role locator or page-wide `first()`.

Do not use browser automation when Commander has reserved acceptance for Human real-browser QA.

## Repetition stop rule

If the same missing prerequisite blocks two attempts, stop repeating the same browser or implementation attempt. Return sequencing evidence to Commander ChatGPT and do not start another Phase independently.

## Verdict taxonomy

- `PASS`: executable contract verified
- `PASS WITH NOTE`: passed with a non-blocking out-of-scope note
- `FAIL`: executable contract produced an expected / actual mismatch
- `BLOCKED`: a missing prerequisite prevents execution
- `INCONCLUSIVE`: evidence remains genuinely unavailable or conflicting after investigation
- `STOP`: a Commander decision is required

Do not use `FAIL` when the Unit could not begin because a prerequisite was absent.

## Fixed safety and repository rules

- keep one narrow work Unit per execution
- no unrelated refactor
- no automatic scope expansion
- no private Session content in Codex prompts, logs, reports, screenshots, analytics, error output, or network diagnostics
- no commit, push, merge, or deploy unless the user explicitly authorizes that exact action
- do not touch, stage, rename, delete, overwrite, reset, stash, clean, or include existing backup files
- preserve unrelated working-tree changes
- stop if the approved Unit would affect protected or unrelated changes
- do not change product behavior, public APIs, data contracts, or migrations when the Unit is only execution-operations work
- do not start subagents or change models to resolve an execution problem

## Conflict handling

The Leader records contradictions between Commander instructions, canonical documents, repository facts, tests, and observed runtime behavior.

Resolve factual conflicts only from repository evidence or canonical documents. Return unresolved product, UX, schema, architecture, privacy, security, billing, legal, Phase-order, or release conflicts to Commander ChatGPT.

Do not silently reconcile contradictory evidence merely to continue the Unit.

## Final report

Use the Verification Tier reporting rules above.

For Tier 0–2, report only the required concise facts:

- changed files or read-only result
- implementation or investigation outcome
- verification performed
- remaining tracked and staged state
- backup-file state
- commit / push / deploy state
- residual risk or Human QA requirement
- `selected agents: none`
- `Leader: gpt-5.6-luna / low`

Tier 3 reports must additionally include the Commander-specified trust-boundary evidence, negative or error-path verification, conflicts, and residual security or privacy risk.

Do not call or inspect the agent tree solely to prove that no subagent was used.
