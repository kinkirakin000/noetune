# Noetune v17 Development Rules

## Purpose

These rules keep implementation aligned with the v17 Constitution.

Development should protect the product philosophy.

Do not add features simply because they are technically easy.

---

# 1. Philosophy First

Every implementation decision must support:

- complete Free session experience
- Journey continuation for Pro
- no AI analysis
- quiet UI
- minimal data storage

If a feature does not support these, do not add it.

---

# 2. Do Not Break Existing Versions

v17 development must not break:

- v15
- v16
- existing auth
- existing billing
- existing locale files

Create isolated v17 logic where needed.

Reuse stable existing logic where appropriate.

---

# 3. Free Must Be Complete

Do not block any core session step for Free users.

Do not add:

- session limits
- theme limits
- artificial usage limits
- partial-session paywalls

Free users must be able to complete the full v17 session.

---

# 4. Pro Means Continuity

Pro features must focus on:

- Continue Journey
- Active Journeys
- restoring current position
- multiple ongoing Journeys

Do not implement Pro as:

- history browsing
- archive management
- note storage
- AI insight access

---

# 5. No AI Analysis

Do not send user writing to AI for interpretation.

Do not generate:

- advice
- diagnosis
- coaching feedback
- psychological summaries
- hidden insights

The user’s own noticing is the product.

---

# 6. Store Only What Is Necessary

Data should support continuation only.

Store:

- theme
- scores
- current Journey position
- user-written steps
- timestamps needed for continuation

Avoid storing data for speculative future analytics.

---

# 7. Keep UI Quiet

Every screen should have one main action.

Avoid:

- excessive explanation
- motivational copy
- achievement language
- gamification
- busy layouts

When in doubt, remove.

---

# 8. Use Journey Language

Use:

- Journey
- Continue Journey
- Active Journeys
- Begin New Journey
- Continue

Avoid:

- Save
- History
- Archive
- Records

---

# 9. Localization Must Stay in Sync

Every v17 locale key must exist in:

- ja.json
- en.json
- zh-TW.json

After locale edits, validate JSON.

---

# 10. Test Before Moving On

After each major implementation step, test:

- Free flow
- Pro flow if affected
- locale switching
- mobile layout
- console errors

Do not stack many untested changes.

---

# 11. Prefer Simple State

Avoid complex state machines unless necessary.

The flow should remain readable.

If the implementation becomes difficult to understand, simplify the model.

---

# 12. Final Development Rule

When uncertain, choose the implementation that is:

- quieter
- simpler
- more faithful to Journey
- less like ordinary SaaS
