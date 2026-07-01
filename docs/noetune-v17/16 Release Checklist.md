# Noetune v17 Release Checklist

## Purpose

This checklist confirms that v17 is ready for founder testing or release.

Release does not mean adding more.

Release means the experience is stable, quiet, and faithful to the Constitution.

---

# 1. Constitution Alignment

- [ ] v17 follows the Constitution
- [ ] Noetune is not presented as a problem-solving app
- [ ] Noetune is not presented as an AI answer app
- [ ] the experience supports “What was the problem?”
- [ ] Journey is the central concept
- [ ] Free is complete
- [ ] Pro is continuity

---

# 2. Core Experience

- [ ] full session flow works
- [ ] inner loop works
- [ ] outer loop works
- [ ] final theme measurement works
- [ ] result screen works
- [ ] experience feels quiet
- [ ] no screen feels rushed
- [ ] no screen feels like a test

---

# 3. Free

- [ ] Free can complete the full session
- [ ] no core step is paywalled
- [ ] no theme limit exists
- [ ] no session limit exists
- [ ] no artificial usage limit exists
- [ ] Free does not feel like a teaser

---

# 4. Pro

- [ ] Pro allows Journey continuation
- [ ] Active Journeys works
- [ ] Continue Journey works
- [ ] multiple Journeys work
- [ ] Pro is not described as saving history
- [ ] Pro is clearly about continuing the Journey

---

# 5. Language

- [ ] UI uses Journey language
- [ ] Continue Journey appears where appropriate
- [ ] Active Journeys appears where appropriate
- [ ] Begin New Journey appears where appropriate
- [ ] Save is avoided in v17 UI
- [ ] History is avoided in v17 UI
- [ ] Archive is avoided in v17 UI
- [ ] copy is quiet and non-judgmental

---

# 6. AI and Privacy

- [ ] no AI analysis appears
- [ ] no AI advice appears
- [ ] no AI interpretation appears
- [ ] user writing is not sent to AI analysis
- [ ] privacy copy is clear
- [ ] stored data exists for continuation only

---

# 7. Data

- [ ] Journey object works
- [ ] Session object works
- [ ] Loop data works
- [ ] Step data works
- [ ] current Journey position restores correctly
- [ ] unnecessary data is not stored
- [ ] no ordinary archive/history browsing UI exists

---

# 8. Localization

- [ ] Japanese copy is complete
- [ ] English copy is complete
- [ ] Traditional Chinese copy is complete
- [ ] locale JSON files are valid
- [ ] locale keys match across languages
- [ ] translations preserve the same experience

Validation:

python3 -m json.tool locales/ja.json > /dev/null  
python3 -m json.tool locales/en.json > /dev/null  
python3 -m json.tool locales/zh-TW.json > /dev/null

---

# 9. Technical

- [ ] app-v17.html loads
- [ ] no critical console errors
- [ ] auth still works
- [ ] billing still works
- [ ] locale switching works
- [ ] mobile layout works
- [ ] desktop layout works
- [ ] browser refresh does not break critical state
- [ ] browser back behavior is acceptable

---

# 10. Cleanup

- [ ] debug text removed
- [ ] unused UI removed
- [ ] unused experimental features removed
- [ ] obsolete Baseline-centered language removed
- [ ] ordinary SaaS wording removed
- [ ] comments are clear where needed

---

# 11. Founder Review

- [ ] one full Free session tested by founder
- [ ] one Pro Journey continuation tested by founder
- [ ] Journey language feels natural
- [ ] the experience does not feel like journaling
- [ ] the experience does not feel like AI coaching
- [ ] the experience feels like Noetune

---

# Final Release Rule

Do not release v17 because it has many features.

Release v17 only when the core Journey experience feels inevitable.


---

# Human Core Questions v1.2 Release Checklist

## **Pre-release**

- Confirm 24 Human Core Questions Database v1.2.md is the official Obsidian source.
- Confirm v1.0 and v1.1 are archived.
- Confirm human-core-questions-v1.json is the implementation source.
- Confirm total count: 1200.
- Confirm normal library count: 1100.
- Confirm high-risk managed count: 100.
- Confirm JSON parses successfully.
- Confirm all Human Core Question IDs are unique.
- Confirm all normal questions are available to Free users.
- Confirm Pro is not required to unlock any normal Human Core Question.

## **Product philosophy**

- Human Core Questions are presented as life entry points.
- They are not presented as advice.
- They are not presented as diagnosis.
- They are not presented as therapy.
- They are not presented as psychological analysis.
- They are not used for AI analysis.
- They do not create a paywall.
- They do not create a session limit.
- Free users can use all normal questions.
- Pro remains for Journey continuation, history, review, comparison, and long-term observation.

## **UX**

- The question selection screen feels quiet.
- The user is not overwhelmed by too many categories.
- Metadata is hidden from the user.
- Category is hidden from the user unless intentionally used as a simple browsing aid.
- Domain is hidden from the user.
- Tags are hidden from the user.
- Risk level is hidden from the user.
- Source is hidden from the user.
- High-risk questions do not appear.
- The selected question naturally flows into the v17 session.
- The user feels invited, not analyzed.
- The user sees only the question text in the main experience.

## **High-risk release safety**

- HCQ-0901〜HCQ-1000 do not appear in the normal library.
- HCQ-0901〜HCQ-1000 are not selectable as normal session themes.
- HCQ-0901〜HCQ-1000 do not appear in search suggestions.
- HCQ-0901〜HCQ-1000 do not appear in random selection.
- High-risk questions remain internal only.
- No high-risk wording appears accidentally in the public UI.

## **Session behavior**

- Selecting a Human Core Question starts the normal v17 session flow.
- The selected question becomes the theme label.
- Before score appears correctly.
- Ideal 100% state step appears correctly.
- Current state writing step appears correctly.
- After score appears correctly.
- Rewording step appears correctly.
- Breath flow appears correctly.
- Result screen appears correctly.
- Save behavior follows existing Free / Pro rules.
- Existing auth, billing, save, and result flows are not broken.

## **Localization**

- Japanese question text displays correctly.
- No mojibake.
- Long Japanese questions wrap cleanly.
- Mobile display remains readable.
- Existing ja / en / zh-TW locale JSON files remain valid.
- No developer-only metadata appears in localized UI.

## **Final release rule**

If implementation creates noise, complexity, diagnosis, advice, interpretation, or AI-like analysis, simplify.

Noetune should remain quiet.

When uncertain, choose the quieter implementation.