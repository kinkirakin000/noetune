
# Noetune v17 Regression Checklist

## Purpose

This checklist confirms that v17 works without breaking the core product.

Regression testing should protect:

- Free complete session
- Pro Journey continuation
- existing auth
- existing billing
- locale stability
- quiet user experience

---

# 1. Basic Load

- [ ] app-v17.html opens
- [ ] no blank screen
- [ ] no critical console errors
- [ ] CSS loads correctly
- [ ] JavaScript loads correctly
- [ ] locale text appears

---

# 2. Existing Versions

- [ ] v15 still opens
- [ ] v16 still opens
- [ ] v17 changes do not break older files
- [ ] shared auth logic still works
- [ ] shared billing logic still works

---

# 3. Locale

- [ ] Japanese loads
- [ ] English loads
- [ ] Traditional Chinese loads
- [ ] switching language updates v17 UI
- [ ] no missing locale keys appear
- [ ] all locale JSON files are valid

Validation:

python3 -m json.tool locales/ja.json > /dev/null  
python3 -m json.tool locales/en.json > /dev/null  
python3 -m json.tool locales/zh-TW.json > /dev/null

---

# 4. Theme Entry

- [ ] predefined themes appear
- [ ] direct question themes appear
- [ ] free input theme works
- [ ] selected theme appears in measurement screen
- [ ] custom theme is carried through the session
- [ ] theme selection feels like an entrance, not a category menu

---

# 5. Free Full Session

- [ ] Free user can start v17 session
- [ ] Free user can complete Initial Theme Measurement
- [ ] Free user can complete Feel 100%
- [ ] Free user can complete Current State
- [ ] Free user can complete Measure Current State
- [ ] Free user can complete Rename
- [ ] Free user can complete Breath
- [ ] Free user can complete Ideal State
- [ ] Free user can complete second Breath
- [ ] Free user can complete Re-measure
- [ ] Free user can complete Final Theme Measurement
- [ ] Free user can reach Result
- [ ] no core step is blocked
- [ ] no Pro wall appears during the core session

---

# 6. Inner Loop

- [ ] Continue repeats Rename
- [ ] Breath appears after Rename
- [ ] Ideal State appears after Breath
- [ ] second Breath appears after Ideal State
- [ ] Nothing More exits inner loop
- [ ] inner loop index updates correctly
- [ ] repeated inputs are not lost

---

# 7. Outer Loop

- [ ] after Re-measure, user can continue deeper
- [ ] user returns to Feel 100%
- [ ] new Current State can be entered
- [ ] outer loop index updates correctly
- [ ] user can exit to Final Theme Measurement
- [ ] multiple outer loops do not break flow

---

# 8. Measurement

- [ ] 0 can be selected
- [ ] 100 can be selected
- [ ] middle values work
- [ ] initial theme score is stored
- [ ] current state score is stored
- [ ] re-measure score is stored
- [ ] final theme score is stored
- [ ] delta score is calculated correctly
- [ ] score copy is non-judgmental

---

# 9. Result Screen

- [ ] initial theme score appears
- [ ] final theme score appears
- [ ] delta score appears
- [ ] Begin New Journey works
- [ ] Continue Journey path appears appropriately
- [ ] no AI analysis appears
- [ ] no advice appears
- [ ] no psychological interpretation appears

---

# 10. Pro Journey Continuation

- [ ] Pro status is detected
- [ ] Journey object is created
- [ ] current Journey position is stored
- [ ] Active Journeys view appears
- [ ] multiple Journeys can exist
- [ ] Continue Journey restores correct theme
- [ ] Continue Journey restores correct step
- [ ] continuing does not duplicate broken sessions

---

# 11. Free Behavior

- [ ] Free can complete full session
- [ ] Free has no theme limit
- [ ] Free has no session limit
- [ ] Free has no artificial usage limit
- [ ] Free Journey does not become history browsing
- [ ] Pro offer is framed as continuation

---

# 12. Privacy

- [ ] user writing is not sent to AI analysis
- [ ] no AI interpretation is generated
- [ ] no hidden coaching text appears
- [ ] stored data supports continuation only
- [ ] no archive/history browsing UI exists

---

# 13. Browser Behavior

- [ ] refresh does not cause fatal break
- [ ] back button does not corrupt session
- [ ] accidental reload is handled reasonably
- [ ] mobile Safari works
- [ ] desktop Chrome works
- [ ] desktop Safari works

---

# 14. Mobile Layout

- [ ] theme screen is readable
- [ ] measurement screen is usable
- [ ] text input is comfortable
- [ ] breath screen has enough space
- [ ] result screen is readable
- [ ] buttons are reachable
- [ ] no horizontal overflow

---

# 15. Final Regression Rule

v17 passes regression only if:

- Free feels complete
- Pro feels like continuity
- no AI analysis exists
- Journey language is consistent
- the experience remains quiet



---

# **Human Core Questions v1.2 Regression Checklist**

## **Data integrity**

- human-core-questions-v1.json exists.
- JSON parses successfully.
- Total question count is 1200.
- All IDs are unique.
- All IDs follow HCQ-0001 format.
- All records have question text.
- All records have category.
- All records have domain.
- All records have tags.
- All records have riskLevel.
- All records have visibleInLibrary.
- All records have sessionUse.
- No question text is empty.
- No duplicate IDs exist.
- No duplicate question records exist unless intentionally retained.
- Japanese text displays correctly.
- No mojibake appears.

## **Normal library**

- Normal question library excludes high-risk questions.
- Normal question library only shows visibleInLibrary true records.
- Normal question library only shows riskLevel 2 or lower.
- User sees only the question text.
- User does not see metadata.
- User does not see category.
- User does not see domain.
- User does not see tags.
- User does not see risk level.
- User does not see source.
- User does not see psychological or clinical labels.
- Question selection screen remains quiet and minimal.

## **High-risk handling**

- HCQ-0901〜HCQ-1000 are not visible in the normal library.
- High-risk questions have visibleInLibrary false.
- High-risk questions have sessionUse false.
- High-risk questions are not selectable as normal session themes.
- High-risk questions do not appear in random question selection.
- High-risk questions do not appear in search suggestions.
- High-risk questions do not appear in public UI.
- High-risk records remain available only for internal safety design.
- No high-risk question is accidentally treated as a normal theme.

## **Free / Pro behavior**

- Free users can access all normal Human Core Questions.
- Pro is not required to unlock Human Core Questions.
- No question paywall is introduced.
- No theme paywall is introduced.
- No session count limit is introduced.
- No AI analysis is introduced.
- Saving behavior follows existing Free / Pro save rules.
- Free users can complete a full session with any normal question.
- Pro remains for Journey continuation, history, review, comparison, and long-term observation.

## **Session flow**

- Selected question becomes the session theme.
- Question text is used as the theme label.
- Before score works.
- Ideal 100% state step works.
- Current state writing step works.
- After score works.
- Rewording step works.
- Breath flow works.
- Result screen works.
- Save works according to existing v17 rules.
- Saved session includes question ID if available.
- Saved session includes question text.
- Saved session includes appVersion v17.
- Existing save / auth / billing behavior is not broken.

## **Search and selection**

- Questions can be searched by text.
- Questions can be filtered internally by category.
- Questions can be filtered internally by domain.
- Questions can be filtered internally by tags.
- Search results only show normal visible questions.
- Search does not expose high-risk questions.
- Search does not expose metadata to the user.
- Empty search state feels quiet.
- Long questions wrap cleanly on mobile.
- Selecting a question feels like choosing an entry point, not taking a test.

## **Localization**

- Japanese question text displays correctly.
- No mojibake.
- Long Japanese questions wrap cleanly.
- Mobile display remains readable.
- UI labels remain consistent with existing locale files.
- No untranslated developer metadata appears in the UI.
- Existing ja / en / zh-TW locale JSON validity is not broken.

## **Product philosophy**

- Human Core Questions are not presented as advice.
- Human Core Questions are not presented as diagnosis.
- Human Core Questions are not presented as therapy.
- Human Core Questions are not presented as AI prompts.
- Human Core Questions are presented as quiet life entry points.
- The implementation does not make Noetune feel like a questionnaire app.
- The implementation does not make Noetune feel like a mental health diagnostic tool.
- The implementation preserves the sacred, quiet feeling of the v17 session.

## **Final regression rule**

- If the implementation creates noise, complexity, diagnosis, advice, interpretation, or AI-like analysis, simplify it.
- If uncertain, choose the quieter implementation.
- The user should feel invited, not analyzed.

---

