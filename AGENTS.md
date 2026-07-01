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
