# Noetune v17 Data Structure

## Purpose

The data model exists to support Journeys.

Data is never the product.

The product is the ongoing relationship between the user and a theme.

The structure should therefore prioritize continuity over storage.

---

## Hierarchy

User
└── Journey
    └── Session
        └── Loop
            └── Step

---

## User

A User owns zero or more Journeys.

Suggested fields:

- userId
- locale
- isPro
- createdAt

---

## Journey

A Journey is the primary object.

Suggested fields:

- journeyId
- userId
- themeId
- themeLabel
- customTheme
- status (active / completed)
- currentSession
- currentLoop
- currentStep
- createdAt
- updatedAt

The Journey represents an ongoing relationship with one theme.

---

## Session

A Session represents one visit.

Suggested fields:

- sessionId
- journeyId
- startedAt
- finishedAt
- beforeThemeScore
- afterThemeScore

---

## Loop

Each Session contains one or more loops.

Suggested fields:

- loopIndex
- beforeStateScore
- afterStateScore

---

## Step

A Step stores the user's responses.

Suggested fields:

- stepType
- text
- createdAt

Examples of stepType:

- currentState
- renamedState
- idealState

No AI interpretation is stored.

---

## Free

Free users may complete a full Session.

When the Session ends, the Journey is not kept.

A future session begins as a new Journey.

---

## Pro

Pro users keep Journeys.

The system stores:

- currentSession
- currentLoop
- currentStep

The user can continue from that position.

---

## Privacy

No AI-generated interpretation is stored.

Only the user's own inputs and progress are stored.

---

## Principle

Store only what is necessary to continue the Journey.

Do not collect data simply because it may be useful later.

The purpose of data is continuity, not accumulation.
