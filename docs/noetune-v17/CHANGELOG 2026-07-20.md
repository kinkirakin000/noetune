# 2026-07-20 Update Summary

Updated files:

- `README.md`
- `00 Noetune v17 Master.md`
- `01 Product, Monetization & Journey.md`
- `02 Technical & Content Specification.md`
- `03 Implementation, QA & Decisions.md`
- `05 Release Implementation Plan.md`

Copied unchanged:

- `04 Theme Source Database.md`
- `06 Current Billing & Auth Snapshot.md`
- `07 追加予定機能.md`

## Decisions fixed

- v17 is the only official development and release line
- separate v18 development and v18-only architecture are discontinued
- existing v17 UI/UX/auth/billing/history/resume/bookmark/localization foundations remain
- only the new question flow is adopted
- Regular Question 1 supports A/B; new sessions start with A
- A/B switching preserves the textarea draft
- spiritual-wisdom follows the ideals question route
- Question 2 quotes Question 1
- Deep alternates A → Q2 → B → Q2 while always quoting the original theme at Question 1
- Breath transition remains unchanged until a separate formal decision

## Repository facts recorded

```text
branch: feature/v17-session-resume
HEAD: 98931af
tracked working tree: clean
push: not performed
```

```text
98931af feat(v17): add regular question variants
453862f fix(v17): restore current session step
83530d8 feat(v17): add safe guest regular session resume foundation
```

## Current execution point

Regular Unit 1 is complete. Unit 2 is `questionVariant` Snapshot serialize / validate / migrate / restore. Deep implementation follows as an independent unit after Unit 2 acceptance.
