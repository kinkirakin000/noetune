# Noetune v17 Codex Tasks

## Goal

Implement Noetune v17 based on the Journey-centered design.

Do not add AI analysis.

Do not add ordinary history, archive, or journaling features.

The purpose of implementation is to support:

- full Free session experience
- Pro Journey continuation
- quiet session flow
- minimal data needed for continuity

---

## Existing Assets

Reuse existing v15 implementations as much as possible:

- auth
- billing
- result-save
- progress-save
- result-image-save if useful

Do not rebuild existing authentication or billing logic unless necessary.

---

## Core Requirements

### 1. Implement v17 Session Flow

Implement the following flow:

Theme  
↓  
Initial Theme Measurement  
↓  
Feel 100%  
↓  
Current State  
↓  
Measure Current State  
↓  
Rename  
↓  
Breath  
↓  
Ideal State  
↓  
Breath  
↓  
Inner Loop  
↓  
Re-measure  
↓  
Outer Loop  
↓  
Final Theme Measurement  
↓  
Result

---

### 2. Theme Selection

Support:

- predefined themes
- direct question themes
- free input theme

A theme is the entrance into a Journey.

---

### 3. Measurements

Store:

- initialThemeScore
- currentStateScore
- remeasureScore
- finalThemeScore
- deltaScore

Do not interpret scores.

Do not judge improvement.

---

### 4. Inner Loop

Repeat:

Rename  
↓  
Breath  
↓  
Ideal State  
↓  
Breath

Until the user chooses:

Nothing more

---

### 5. Outer Loop

After re-measurement, allow the user to return to:

Feel 100%  
↓  
Current State

Continue until no more ideal states arise.

---

### 6. Result Screen

Show only:

- initial theme score
- final theme score
- delta score
- Continue Journey option
- Begin New Journey option

Do not show AI analysis.

Do not show advice.

Do not show psychological interpretation.

---

## Free Behavior

Free users can complete the full session.

No core step is blocked.

At the end of the session:

- Journey is not continued
- user can begin a new Journey from the start
- user may upgrade to Pro to continue Journey later

Free is complete.

Do not create usage limits.

Do not limit themes.

Do not limit session completion.

---

## Pro Behavior

Pro users can keep Journeys.

Pro must support:

- Active Journeys
- Continue Journey
- current step restore
- multiple active Journeys
- theme-based Journey continuation

The user should continue from where they left off.

---

## Data Model

Implement or adapt data structure around:

User  
- Journey  
  - Session  
    - Loop  
      - Step

Store only what is necessary to continue.

---

## Suggested Journey Fields

- journeyId
- userId
- themeId
- themeLabel
- customTheme
- status
- currentSession
- currentLoop
- currentStep
- createdAt
- updatedAt

---

## Suggested Session Fields

- sessionId
- journeyId
- startedAt
- finishedAt
- initialThemeScore
- finalThemeScore
- deltaScore

---

## Suggested Step Fields

- stepType
- text
- score if applicable
- loopIndex
- createdAt

---

## Language Rules

Avoid UI labels:

- Save
- History
- Archive
- Records
- AI Analysis

Use:

- Journey
- Continue Journey
- Active Journeys
- Continue
- Begin New Journey

---

## Privacy Requirements

Do not send user writing to AI analysis.

Do not generate interpretations.

Do not add hidden coaching logic.

The user's writing exists only to support their own Journey.

---

## Implementation Priority

1. Create or update v17 app file
2. Implement theme selection
3. Implement full session flow
4. Implement inner loop
5. Implement outer loop
6. Implement result screen
7. Implement Free behavior
8. Implement Pro Journey continuation
9. Connect to existing auth and billing
10. Test locale JSON validity
11. Test full Free session
12. Test Pro continue Journey behavior

---

## Acceptance Criteria

The implementation is complete when:

- Free users can complete a full v17 session
- no AI analysis appears anywhere
- no core step is paywalled
- Pro users can continue an unfinished Journey
- multiple active Journeys can exist for Pro
- UI uses Journey language instead of save/history/archive
- data stored is only what is necessary for continuation
- existing auth and billing still work
- locale JSON files are valid

---

## Final Instruction for Codex

Do not optimize Noetune as an ordinary SaaS.

Implement only what supports the Journey-centered philosophy.

When uncertain, choose the quieter implementation.



---
# **Human Core Questions v1.2 Implementation Task**

## **Objective**

Implement Human Core Questions v1.2 into Noetune v17.

This database is not an AI analysis feature.  
It is the question library used as the entry point into a Noetune session.

## **Source files**

- 24 Human Core Questions Database v1.2.md
- human-core-questions-v1.json

## **Implementation file path**

Place the JSON file at:

v17/data/human-core-questions-v1.json

## **Core rules**

- Do not add AI analysis.
- Do not generate advice, interpretation, diagnosis, or summaries.
- The user should see only the question text.
- Do not show category, domain, tags, risk level, source, or metadata to the user.
- Free users can access all normal questions.
- Pro does not unlock questions.
- Pro is only for Journey continuation, history, review, comparison, and long-term observation.

## **Display rules**

Normal library must show only questions where:

visibleInLibrary is true  
riskLevel is 2 or lower

High-risk questions must remain hidden from the normal library.

High-risk questions are for safety design and internal handling only.

## **Session use**

A selected Human Core Question becomes the session theme.

The question text should be used as the theme label.

The session flow remains:

1. Theme / question selection
2. Before score
3. Ideal 100% state
4. Current state writing
5. After score
6. Rewording
7. Breath flow
8. Result / save

## **Important**

Human Core Questions are not categories.  
They are not diagnostic labels.  
They are not advice prompts.

They are quiet entry points into the user’s relationship with life.

When uncertain, choose the quieter implementation.

---

# **Human Core Questions Locale-Ready Implementation Rule**

Human Core Questions must be implemented as locale-ready.

Use question ID as the stable key.

Do not use Japanese question text as an identifier.

The current JSON contains Japanese source text.

Design the implementation so English, Traditional Chinese / Taiwanese Mandarin, and future languages can be added later without changing IDs or session save structure.

Saved sessions should store:

- questionId
- questionTextAtTime
- localeAtTime

This allows future localization without breaking old saved sessions.