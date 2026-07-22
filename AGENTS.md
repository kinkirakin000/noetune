# AGENTS.md — Noetune v17

Before implementing Noetune v17 tasks, read the project context files in:

- docs/noetune-v17/17 AI Context <<新スレッドでまずこれを渡す.md
- docs/noetune-v17/01 Constitution.md
- docs/noetune-v17/02 Product Philosophy.md
- docs/noetune-v17/06 Session Flow.md
- docs/noetune-v17/09 Codex Tasks.md
- docs/noetune-v17/11 JSON Specification.md
- docs/noetune-v17/18 Human Core Questions JSON Design.md
- docs/noetune-v17/19 Human Core Questions Database v1.2.md
- docs/noetune-v17/20 Monetization & Journey UX.md
- docs/noetune-v17/14 Development Rules.md
- docs/noetune-v17/15 Regression Checklist.md
- docs/noetune-v17/16 Release Checklist.md

Human Core Questions data file:

- v17/data/human-core-questions-v1.json

## Core product rules

Noetune is not a problem-solving app.

Noetune is not an AI advice app.

Noetune must not provide diagnosis, interpretation, analysis, coaching, or advice.

Do not add AI analysis.

Do not add a questionnaire-like experience.

Keep the experience quiet, minimal, and non-clinical.

## Human Core Questions rules

Use question ID as the stable key.

Do not use Japanese question text as an identifier.

The current Human Core Questions JSON contains Japanese source text.

The implementation must be locale-ready.

English, Traditional Chinese / Taiwanese Mandarin, and future languages must be addable later without changing question IDs or saved session structure.

The user should see only the question text.

Do not expose metadata such as category, domain, tags, risk level, source, or internal labels in the main user experience.

Normal library display rules:

- visibleInLibrary must be true
- riskLevel must be 2 or lower
- high-risk questions must remain hidden
- HCQ-0901 through HCQ-1000 must not appear in normal search, random selection, or theme selection

## Free / Pro rules

Free users can access all normal Human Core Questions.

Pro does not unlock questions.

No question paywall.

No session count limit.

No AI analysis.

Pro is only for journey continuation, history, review, comparison, and long-term observation.

## Saved session requirements

When a Human Core Question is used in a session, saved sessions should store:

- questionId
- questionTextAtTime
- localeAtTime

This prevents future localization changes from breaking old saved sessions.

## Implementation rule

If unsure, choose the quieter implementation.

## Codex multi-agent operating contract

### Commander authority

Commander ChatGPT is the sole strategic and decision-making authority. The Codex Leader
and subagents execute the Unit defined by Commander ChatGPT. Codex must not independently
change product contracts, UX, schema meaning, architecture, Phase order, Unit boundaries,
or acceptance criteria. When repository facts conflict with the instruction or canonical
decision, preserve the evidence and return it to Commander ChatGPT.

### Execution Feasibility Gate

Before implementation or browser QA, verify that required files, handlers, selectors, and
APIs exist; eligibility guards can be satisfied; required state can be created through the
production path; persistence and resume entrypoints are reachable; prerequisite implementation
is complete; and an acceptance record can be created without forbidden direct injection.
If any prerequisite is missing, do not start the Unit. Report `BLOCKED` with the missing
prerequisite and evidence. Codex must not independently start another Phase or Unit.

### Browser QA precondition

Before browser operations, confirm the entry file, URL, protocol, server, exact selectors,
visibility and eligibility guards, save/flush/resume triggers, persistence key, and required
production state. When an exact ID exists, do not use an ambiguous role locator or page-wide
`first()`.

### Repetition stop rule

If the same missing prerequisite blocks two attempts, stop repeating the same browser or
implementation attempt. Return sequencing evidence to Commander ChatGPT and do not start
another Phase independently.

### Verdict taxonomy

- `PASS`: executable contract verified
- `PASS WITH NOTE`: passed with a non-blocking out-of-scope note
- `FAIL`: executable contract produced an expected/actual mismatch
- `BLOCKED`: a missing prerequisite prevents execution
- `INCONCLUSIVE`: evidence remains genuinely unavailable or conflicting after investigation
- `STOP`: a Commander decision is required

The user-facing Codex agent is the leader. The leader owns preflight, unit boundaries,
agent selection, context allocation, result comparison, conflict resolution, final QA,
stop decisions, and the single integrated report returned to the user. Subagents do not
communicate with the user directly.

Use the minimum agent set needed for the unit. Do not duplicate an investigation or load
the whole repository without a scoped reason. The default Credit Mode is `NORMAL` when no
weekly-usage screenshot is supplied. A screenshot must be interpreted only when usage,
remaining credits, reset date, and reset interval are unambiguous. If the screenshot is
unclear, ask the user to confirm; do not guess or silently fall back to `NORMAL`.

Credit Modes:

- `CONSERVE`: leader-centered; add only one necessary writer.
- `NORMAL`: leader plus one necessary writer; add one researcher or reviewer only when justified.
- `QUALITY`: leader, researcher, implementer, reviewer; add QA only when risk requires it.
- `USE-IT`: near reset with spare credits; add independent read-only QA or next-unit research,
  never meaningless duplicate work.

All agents use the configured Luna/Low baseline. Never auto-escalate the model, reasoning,
service mode, or speed mode. If Low is insufficient for a high-risk area, stop that area,
state the missing capability, recommend a candidate, and wait for explicit approval.

Roles:

- `researcher`: read-only facts, canonical documents, dependencies, contracts, and impact scope.
- `implementer`: the default sole writer; edits only approved scope with minimal diff and runs checks.
- `qa`: read-only regression, boundaries, error paths, privacy, and unsupported-state checks.
- `reviewer`: independent read-only diff and contract audit; do not accept implementer self-assessment.

Do not assign multiple writers to one file or shared contract. Subagents must report concise
facts, evidence, conclusions, and unresolved items. The leader compares all results, records
conflicts, resolves them from repository facts or canonical documents, and reports unresolved
conflicts explicitly.

No subagent may commit, push, or deploy unless the user explicitly instructs it. Do not touch,
stage, rename, delete, overwrite, reset, stash, or clean existing backup files. Preserve
unrelated working-tree changes and stop if their contents would be affected. Do not change
product behavior, app code, public APIs, data contracts, or migrations when the unit is only
agent operations.

The integrated report must include preflight facts, selected roles and Credit Mode, evidence
from each role, conflicts and resolution, verification, unchanged protected files, residual
risk, and commit/push/deploy status. Do not forward raw subagent logs in bulk.
