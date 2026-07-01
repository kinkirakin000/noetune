# Noetune v17 Information Architecture

## Purpose

The architecture should reflect the philosophy of Noetune.

It is not organized around data.

It is organized around relationships.

Every layer exists to support an ongoing Journey.

---

## Architecture

Home
- Select Theme
- Active Journeys (Pro)
- Settings
  - Language
  - Privacy
  - Subscription

---

## Journey Structure

A Journey is the highest-level user object.

Journey
- Theme
- Current Position
- Sessions
- Status

The user never manages sessions directly.

They continue a Journey.

---

## Session Structure

A Journey contains one or more Sessions.

Journey
- Session 1
- Session 2
- Session 3
- ...

Each Session represents one visit.

The Journey represents the relationship across time.

---

## Session Flow

Theme  
↓  
Before Measurement  
↓  
Feel 100%  
↓  
Current State  
↓  
Measure  
↓  
Rename  
↓  
Breathing  
↓  
Ideal State  
↓  
Breathing  
↓  
Repeat  
↓  
Re-measure  
↓  
Repeat if needed  
↓  
Final Theme Measurement

---

## Free

Free users always begin a new Journey.

Theme  
↓  
New Journey  
↓  
Session  
↓  
End

No continuation exists.

---

## Pro

Pro users continue existing Journeys.

Theme  
↓  
Existing Journey  
↓  
Continue  
↓  
Next Session  
↓  
Continue Again

The value is continuity.

---

## Navigation Principles

The product should expose only what is needed.

Primary navigation:

- Start New Journey
- Continue Journey
- Settings

Everything else remains secondary.

---

## Object Hierarchy

User
- Journey
  - Session
    - Loop
      - Step

This hierarchy reflects relationships rather than stored information.

---

## Philosophy

The architecture should never resemble:

- file management
- note taking
- database browsing

Instead, it should resemble a quiet place where ongoing relationships with life can continue naturally.
