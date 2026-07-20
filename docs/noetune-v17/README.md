# Noetune v17 Obsidian Set

**Updated:** 2026-07-20


This directory is the canonical documentation for Noetune v17.

Priority:

1. 00 Noetune v17 Master
2. 01 Product, Monetization & Journey
3. 02 Technical & Content Specification
4. 03 Implementation, QA & Decisions
5. Runtime repository

Codex must follow these documents when implementing features.

## Official development direction

- Noetune v17 is the only official development and release line.
- The separate v18 project direction is discontinued.
- The v18-only architecture—Flow Engine, Versioned Flow Cartridge, navigation redesign, and a separate runtime rewrite—is not adopted.
- The proven v17 foundations remain: UI/UX, localization, authentication, billing, history, Bookmark/Journey design, Session Resume, Result, appearance, and mobile behavior.
- Only the question flow is replaced incrementally inside v17.

## Canonical files

1. `00 Noetune v17 Master.md` — product constitution, official line, highest-level rules
2. `01 Product, Monetization & Journey.md` — UX, question flow, Journey boundaries, Free / Pro
3. `02 Technical & Content Specification.md` — state, questionVariant, Snapshot Schema v1, billing/content contracts
4. `03 Implementation, QA & Decisions.md` — decisions, implementation units, commit record, QA matrix
5. `04 Theme Source Database.md` — canonical Japanese theme content

## Temporary / supporting files

6. `05 Release Implementation Plan.md` — current execution order; archive after release
7. `06 Current Billing & Auth Snapshot.md` — current factual migration snapshot; retire after v17 billing cutover
8. `07 追加予定機能.md` — future ideas; not scheduled and must not delay release
9. `CHANGELOG 2026-07-20.md` — this documentation update and current repository facts

## Current repository facts

```text
repository: /Users/koichitoyama/Desktop/noetune
branch: feature/v17-session-resume
HEAD: 98931af
working tree: no tracked changes
push: not performed
```

Recent commits:

```text
98931af feat(v17): add regular question variants
453862f fix(v17): restore current session step
83530d8 feat(v17): add safe guest regular session resume foundation
```

## Current implementation status

- Guest local Regular serializer / validator / migration foundation: complete
- Current-step restore fix: complete (`453862f`)
- New Regular question flow Unit 1: complete (`98931af`)
- Unit 1 includes A/B selection, draft preservation, route-specific prompts, three-language locale copy, and localized accessibility label
- `questionVariant` Snapshot save / validate / restore: not implemented; this is Unit 2
- New Deep alternating flow: approved specification, not implemented
- Breath transition and the existing v17 foundations remain unchanged unless a separate decision explicitly changes them
- Cloud Session content remains blocked by the Global Privacy & Security Gate

## Source of truth

- Product and architecture decisions: files `00–03`
- Theme text: file `04`
- Runtime behavior and current code: latest local repository
- Repository documentation mirror: `docs/noetune-v17/`
- ChatGPT Project Sources: upload this same set after replacing the previous files

When documents and repository facts conflict, the latest verified repository facts control implementation status; files `00–03` control product decisions.

Human Core Questions are not part of the current canonical product.
