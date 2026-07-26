# AGENTS.md — Noetune v17

**Updated:** 2026-07-26
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

# Risk-based agent operating contract

## Core rule

Multi-Agent Mode is not mandatory for every substantive Unit. The Leader must classify each Unit by risk and use only the agents that provide meaningful independent value. Do not spawn an agent merely to satisfy process.

Commander ChatGPT remains the sole authority for product intent, scope, Phase order, acceptance criteria, and commit / push / deploy authorization.

## Risk Tier classification

### Tier 0 — Mechanical

Examples: Git status, branch, HEAD, or diff reporting; exact stage / commit / push already authorized by Commander; rerunning specified tests; applying exact Commander-supplied wording; stopping for a missing prerequisite.

Default: Leader only; no subagent required.

### Tier 1 — Low-risk localized change

Examples: CSS or layout, locale copy, aria-label, narrow DOM adjustment, narrow documentation update, small existing-test addition, or UI adjustment that does not change handlers, state, schema, auth, billing, or persistence.

Default: Leader only or one implementer. No researcher, reviewer, or QA unless a concrete risk requires one. Human real-browser QA may serve as independent acceptance for visual or device-specific behavior.

### Tier 2 — State, navigation, and persistence

Examples: Back, Snapshot serializer / validator / migration / restore, Bookmark, Resume, Repeat, Deep round state, or multi-screen runtime state.

Default: one implementer; add one QA or reviewer only when automated tests and Human QA cannot cover a concrete boundary. Use researcher only when the implementation boundary is genuinely unclear. Do not automatically start both QA and reviewer.

### Tier 3 — High-risk trust boundary

Examples: authentication, billing, Stripe, webhook, entitlement, Supabase RLS, Cloud Session content, cross-user authorization, Account deletion, privacy, security, or data migration.

Default: use the necessary independent roles. Researcher, implementer, QA, or reviewer may be combined as justified. Do not reduce required independent verification merely to save credits.

## Agent selection

- Tier 0: zero subagents.
- Tier 1: zero or one subagent.
- Tier 2: normally one subagent; at most two when a concrete independent boundary exists.
- Tier 3: minimum roles justified by risk.

No-subagent execution for Tier 0 or Tier 1 is normal operation and does not require a Leader-only exception. Do not create duplicate agents that read the same files and perform the same checks.

## Same-Unit rework

A Human QA failure, test failure, or narrow correction remains the same Unit when the goal, acceptance criteria, and scope are unchanged and the correction addresses evidence from that Unit. Reuse an active appropriate agent; when the prior agent has ended, start only the role required for the correction.

## Human QA substitution

Human real-browser QA may serve as independent acceptance for Safari or mobile layout, touch behavior, visual overlap or clipping, browser chrome and safe-area behavior, Appearance / Language / Account controls, native sharing, and device-specific UI. Do not duplicate Human QA with QA subagent unless a separate code, state, privacy, or regression boundary requires it.

## Context minimization

The Leader and every started agent must use the minimum relevant context.

Required context is limited to the current Commander Unit instruction, applicable `AGENTS.md` rules, the canonical sections needed for that Unit, the target files, direct dependencies, and directly relevant tests.

Do not require the Leader or agents to reread canonical documents `00–07` for every Unit. The Leader must identify the minimum source set before substantive work and expand it only when evidence or risk requires it.

## Commander authority

Commander ChatGPT is the sole strategic and decision-making authority. The Codex Leader and subagents execute only the Unit defined by Commander ChatGPT.

### Reasoning boundary

Noetune開発における戦略的思考と最終判断は、Commander ChatGPTへ一元化する。

Codexは思考そのものを禁止されるわけではない。Commanderが承認したUnitをrepositoryへ安全に適合させるために必要な、限定的かつ局所的な実装思考は許可される。

Codexに許可される局所的思考：

- repository factsと直接依存の確認
- 確定済み契約を実現する最小実装方式の選択
- 関数配置、fixture、test harness等の局所的判断
- syntax errorや指定testの修正
- 実行結果とCommander契約の照合
- 契約を満たせない場合のSTOP判断と証拠整理

Codexは次を独自に変更、再解釈、緩和、拡張してはならない。

- 製品意図とUX
- architecture
- schemaの意味とcanonical ownership
- scopeとUnit定義
- Phase順序と優先順位
- acceptance criteria
- residual riskの受容
- PASS / FAILの最終判断
- commit、push、deploy、releaseの権限

Commander契約とrepository factsが両立しない場合、Codexは代替設計を独自採用しない。現在差分を安全に保持し、具体的証拠とともにSTOPまたはBLOCKEDとしてCommanderへ判断を返す。

Codex must not independently change:

- product contracts
- UX meaning or visible behavior outside scope
- schema meaning
- architecture
- Phase order
- Unit boundaries
- acceptance criteria
- commit / push / deploy authorization

No Codex agent is a second commander.

## Leader responsibility

The user-facing Codex agent is the Leader. The Leader owns:

- minimal preflight
- Risk Tier classification
- Unit-boundary enforcement
- minimum-source selection
- agent selection and context allocation
- `spawn_agent` and `wait_agent` only when subagents are actually used
- result comparison and conflict detection when multiple results exist
- integration of evidence
- final verification
- stop decisions
- one concise report to the user

Subagents do not communicate with the user directly.

The Leader should coordinate rather than duplicate subagent work. When a file edit is required, the `implementer` is normally the sole writer. The Leader must not assign multiple writers to the same file or shared contract.

## Formal roles

### `researcher`

- read-only
- investigates repository facts, canonical documents, dependencies, contracts, and impact scope
- returns evidence, not strategic decisions

### `implementer`

- workspace-write
- normally the only writer
- edits only Commander-approved scope
- keeps the diff minimal
- runs approved checks
- does not redesign adjacent code or contracts

### `qa`

- read-only
- verifies regressions, boundaries, error paths, privacy, unsupported states, and required checks
- distinguishes product failure from missing prerequisites or test-harness failure

### `reviewer`

- read-only
- independently audits diff, scope, contracts, and safety rules
- does not accept implementer self-assessment without evidence
- reports contradictions without silently reconciling them

Subagents must return concise facts, evidence, conclusions, and unresolved items. Do not forward raw subagent logs in bulk.

## Model and credit rule

### Fixed model baseline

The Codex Leader and every subagent must use:

```text
gpt-5.6-luna / low
```

Do not automatically select or fall back to Terra, Sol, another model, a higher reasoning effort, another service mode, or a faster paid mode.

Before substantive work, confirm that the required Leader and subagent roles can use `gpt-5.6-luna / low`.

If Luna / Low is unavailable for a role required by the Unit, stop that work and report:

```text
BLOCKED — Luna unavailable
```

Do not silently continue with Terra or Sol.

Commander ChatGPT may explicitly authorize `gpt-5.6-terra / low`, `gpt-5.6-sol / low`, or another model for one named Unit. That authorization:

- applies only to the named Unit and role
- does not change the default for later Units
- does not authorize a higher reasoning effort
- must be stated in the startup and final reports

Never increase reasoning above `low`, change service mode, or enable a faster paid mode without explicit Commander authorization.

### Credit Mode

Commander ChatGPT may specify the Credit Mode. If none is specified, use `NORMAL`.

- `CONSERVE`: use the fewest agents and the narrowest useful investigation permitted by the Risk Tier.
- `NORMAL`: apply the default agent count defined by the Risk Tier.
- `QUALITY`: add independent work only when Commander requests it or a concrete Tier 3 safety boundary requires it.
- `USE-IT`: may increase useful independent coverage only within the approved Unit; it must not create duplicate work.

Credit Mode changes depth and agent count inside the approved scope. It never changes product scope, Phase order, model baseline, safety requirements, or acceptance criteria.

## Reporting

Tier 0–2 startup report: branch / HEAD / working tree, Risk Tier, Credit Mode, selected agents, scope, and protected files.

Tier 0–2 final report: changed files, implementation result, verification, remaining tracked / staged state, backup-file state, commit / push / deploy state, and residual risk or Human QA requirement. Tier 3 retains detailed reporting appropriate to its risk.

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
- no private Session content in subagent prompts, logs, reports, screenshots, analytics, error output, or network diagnostics
- no subagent may commit, push, merge, or deploy unless the user explicitly authorizes that exact action
- do not touch, stage, rename, delete, overwrite, reset, stash, clean, or include existing backup files
- preserve unrelated working-tree changes
- stop if the approved Unit would affect protected or unrelated changes
- do not change product behavior, public APIs, data contracts, or migrations when the Unit is only agent operations

## Conflict handling

The Leader compares all role results and records conflicts.

Resolve factual conflicts only from repository evidence or canonical documents. Return unresolved product, UX, schema, architecture, privacy, security, billing, legal, Phase-order, or release conflicts to Commander ChatGPT.

Do not hide disagreement between researcher, implementer, QA, or reviewer.

## Final report and agent-state check

Use the Risk Tier reporting rules above. Do not add a separate mandatory multi-agent report when no subagent was used.

For Tier 0–2, report only the required concise facts:

- changed files or read-only result
- implementation or investigation outcome
- verification performed
- remaining tracked and staged state
- backup-file state
- commit / push / deploy state
- residual risk or Human QA requirement
- selected agents, including `none`
- model / reasoning used for every started agent

Tier 3 reports must additionally include the independent roles used, trust-boundary evidence, negative or error-path verification, conflicts, and residual security or privacy risk.

If subagents were started, wait for or stop unnecessary agents and confirm the final running-agent count is `0`.

If no subagent was started, do not call or inspect the agent tree solely to prove that fact; report `selected agents: none`.
