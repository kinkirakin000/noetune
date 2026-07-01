# Noetune v17 JSON Specification

## Purpose

This document defines the JSON requirements for Noetune v17.

JSON exists to support:

- localized UI
- theme definitions
- Journey-centered session flow
- minimal implementation clarity

JSON should not become a hidden product engine.

---

# Core Principles

## 1. No AI Analysis

JSON must not include prompts for AI analysis.

Do not add keys for:

- interpretation
- advice
- diagnosis
- coaching feedback
- AI insight

---

## 2. Journey Language

All user-facing v17 JSON should use Journey-centered language.

Prefer:

- Journey
- Continue Journey
- Active Journeys
- Continue
- Begin New Journey

Avoid:

- Save
- History
- Archive
- Records

---

## 3. Free Is Complete

JSON must not imply that Free is incomplete.

Avoid language such as:

- unlock full session
- continue after limit
- trial session
- limited experience

Free copy should communicate full session access.

---

# Locale Files

Required locale files:

- locales/ja.json
- locales/en.json
- locales/zh-TW.json

All v17 keys must exist in all three locale files.

Key sets must match exactly.

---

# Recommended Namespace

All v17 keys should live under:

v17

Recommended structure:

v17
- common
- home
- theme
- measurement
- session
- breath
- loop
- result
- journey
- pro
- privacy
- errors

---

# Theme JSON

Themes should be defined as entrances into life.

Each theme should include:

- id
- label
- group
- question
- enabled

Example fields:

- money
- love
- family
- work
- health
- future
- business
- sns
- originalSelf
- freedom
- abundance
- loveability

Theme labels should be localized.

Theme IDs should remain stable across locales.

---

# Measurement JSON

Measurement copy should be neutral.

Required copy types:

- initialThemeMeasurement
- currentStateMeasurement
- remeasurement
- finalThemeMeasurement

Measurement should never imply success or failure.

---

# Session Step JSON

Required steps:

- theme
- initialThemeMeasurement
- feelHundred
- currentState
- currentStateMeasurement
- rename
- breath
- idealState
- secondBreath
- remeasure
- finalThemeMeasurement
- result

---

# Loop JSON

Required loop controls:

- continue
- nothingMore
- repeat
- moveOn

Loop copy should feel gentle and non-forcing.

---

# Journey JSON

Required Journey UI copy:

- journey
- activeJourneys
- continueJourney
- beginNewJourney
- journeyCompleteForNow
- noActiveJourneys
- returnToJourney

Journey copy should focus on continuation, not storage.

---

# Pro JSON

Pro copy should explain continuity.

It should not say:

- save your history
- unlock archives
- store unlimited records

It should say:

- continue your Journeys
- keep multiple Journeys alive
- return to where you left off

---

# Privacy JSON

Privacy copy should clearly say:

- No AI analysis
- User writing is not interpreted by AI
- Stored data exists only to support continuation

---

# Error JSON

Errors should be calm and simple.

Examples:

- Something did not load.
- Please try again.
- This Journey could not be continued.
- Please begin again.

Avoid technical explanations unless needed for debugging.

---

# Validation

Before committing:

Run:

python3 -m json.tool locales/ja.json > /dev/null
python3 -m json.tool locales/en.json > /dev/null
python3 -m json.tool locales/zh-TW.json > /dev/null

Then confirm key parity across all locale files.

---

# Final Rule

If a JSON key does not support the session experience, Journey continuation, localization, privacy, or errors, do not add it.
