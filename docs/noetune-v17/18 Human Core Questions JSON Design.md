# Noetune v17 Human Core Questions JSON Design

## Purpose

The goal is not to store 1000 questions as a flat array.

The goal is to create a structure that can support:

- search
- recommendation
- Pro Journey continuation
- safety detection
- localization
- theme grouping
- future analysis without AI interpretation

User sees:

- question text only

Internal system keeps:

- id
- riskLevel
- depthLevel
- intensityLevel
- tags
- domain
- tone
- visibility
- safety

---

## File Name

Recommended:

v17/data/human-core-questions-v1.json

Alternative:

data/human-core-questions-v1.json

---

## Root Structure

{
  "version": "v1.0",
  "appVersion": "v17",
  "locale": "ja",
  "type": "human_core_questions",
  "updatedAt": "2026-07-01",
  "questions": []
}

---

## Question Structure

{
  "id": "hcq_0001",
  "text": "私はこのままでいいのか。",
  "visibleInLibrary": true,
  "riskLevel": 0,
  "depthLevel": 2,
  "intensityLevel": 2,
  "tone": "quiet",
  "lifeDomainTags": ["self", "life_direction", "existence"],
  "corePatternTags": ["self_doubt", "life_review"],
  "suitableForFree": true,
  "suitableForPro": true,
  "requiresSafetyGuard": false
}

---

## Field Definitions

### id

Format:

hcq_0001  
hcq_0002  
hcq_1000

hcq means Human Core Question.

---

### text

The question shown to the user.

Rules:

- show only the question
- no category name
- no explanation
- no diagnosis

---

### visibleInLibrary

Controls whether the question appears in the normal library.

true:

- normal display allowed

false:

- hidden from normal library
- used only for safety, search, or special flows

---

### riskLevel

0 = normal  
1 = slightly heavy but displayable  
2 = deep but displayable with care  
3 = hidden from normal library  
4 = safety guard required

Recommended:

- hcq_0001 to hcq_0900: riskLevel 0–2
- hcq_0901 to hcq_1000: riskLevel 3–4

---

### depthLevel

1 = daily reflection  
2 = life direction  
3 = attachment / self-worth / deep psychology  
4 = existence / death / soul / suffering  
5 = high-risk / crisis / trauma

---

### intensityLevel

1 = gentle  
2 = normal  
3 = direct  
4 = strong  
5 = very strong / careful display

Recommended:

- first-time users: 1–3
- continuing users: 1–4
- high-risk questions: hidden by default

---

### tone

Allowed values:

- quiet
- gentle
- direct
- deep
- shadow
- spiritual
- existential
- relational
- practical
- safety

Noetune default tone:

quiet

---

## Tag Lists v1

### lifeDomainTags

- self
- life_direction
- existence
- happiness
- future
- love
- relationship
- family
- parent
- child
- friendship
- work
- career
- business
- money
- creativity
- body
- health
- aging
- death
- grief
- emotion
- anxiety
- anger
- loneliness
- identity
- freedom
- choice
- meaning
- spirituality
- society
- sns
- rest
- trauma
- safety
- crisis
- healing

### corePatternTags

- self_doubt
- life_review
- hope_doubt
- meaning_search
- existential_anxiety
- unworthiness
- fear_of_rejection
- fear_of_abandonment
- need_for_approval
- perfectionism
- over_responsibility
- self_sacrifice
- fear_of_visibility
- fear_of_failure
- fear_of_success
- comparison
- control
- avoidance
- emotional_suppression
- shame
- guilt
- anger_suppression
- grief_attachment
- money_anxiety
- receiving_block
- love_hunger
- boundary_issue
- identity_diffusion
- identity_attachment
- suffering_identity
- self_redefinition
- spiritual_longing
- body_disconnection
- burnout
- inner_child_pain
- family_burden
- survival_mode
- hopelessness
- self_protection
- urgent_grounding

### tones

- quiet
- gentle
- direct
- deep
- shadow
- spiritual
- existential
- relational
- practical
- safety

---

## Display Logic

Never show tags or categories to the user.

Normal library:

visibleInLibrary === true  
riskLevel <= 2

First-time users:

visibleInLibrary === true  
riskLevel <= 1  
intensityLevel <= 3

Deep questions:

visibleInLibrary === true  
riskLevel <= 2  
depthLevel >= 3

High-risk questions:

visibleInLibrary === false  
requiresSafetyGuard === true

Do not show high-risk questions in the normal library.

---

## User Experience Rule

On the question selection screen, show only text.

Example:

私はこのままでいいのか。  
私は本当に愛されるのか。  
私は安心して休んでもいいのか。  
私は本当に変われるのか。

Do not show:

- categories
- tags
- psychological terms
- risk levels
- explanations

---

## Safety Guard

If requiresSafetyGuard is true, show a gentle safety confirmation before entering the normal session flow.

Example copy:

この問いは、少し重い状態に触れる可能性があります。

今すぐ自分や誰かを傷つける危険がある場合は、このセッションを続けるよりも、近くの人・地域の緊急窓口・専門機関につながってください。

今は安全な場所にいますか？

Buttons:

- 安全な場所にいる
- 今は続けない

Noetune is not a medical app.

Safety guard is required for high-risk questions.

---

## Free / Pro Rule

Questions must not be used as a paywall.

Free users can access all normal questions.

High-risk questions are hidden for safety, not monetization.

Default:

suitableForFree: true  
suitableForPro: true

---

## Data Saved With Journey

When a question is selected, save:

- questionId
- questionText
- riskLevel
- depthLevel
- intensityLevel
- lifeDomainTags
- corePatternTags

This supports Journey continuation and future grouping.

Do not show these fields to the user.

---

## Implementation Prompt for Codex

Noetune v17 に Human Core Questions Database を追加してください。

前提：

- Noetune v17 は問題解決アプリではなく、人生との関係を軽くするプロダクトです。
- Human Core Questions は、ユーザーが選ぶ「人生への入口」です。
- ユーザー画面にはカテゴリやタグを表示しません。
- 表示するのは問いの text だけです。

追加するファイル：

v17/data/human-core-questions-v1.json

JSON構造：

{
  "version": "v1.0",
  "appVersion": "v17",
  "locale": "ja",
  "type": "human_core_questions",
  "updatedAt": "2026-07-01",
  "questions": []
}

各 question は以下の形式：

{
  "id": "hcq_0001",
  "text": "私はこのままでいいのか。",
  "visibleInLibrary": true,
  "riskLevel": 0,
  "depthLevel": 2,
  "intensityLevel": 2,
  "tone": "quiet",
  "lifeDomainTags": ["self", "life_direction", "existence"],
  "corePatternTags": ["self_doubt", "life_review"],
  "suitableForFree": true,
  "suitableForPro": true,
  "requiresSafetyGuard": false
}

実装要件：

1. v17 のテーマ選択画面に Human Core Questions を読み込めるようにする。
2. ユーザーには question.text のみ表示する。
3. visibleInLibrary === true かつ riskLevel <= 2 の問いだけ通常表示する。
4. 初回表示では intensityLevel <= 3 を優先する。
5. requiresSafetyGuard === true の問いは通常ライブラリに表示しない。
6. 自由入力や検索で高リスク問いに近い内容が検出された場合のみ、safety guard を表示できる設計にする。
7. Free / Pro の課金境界には使わない。全問いは Free でも使用可能。
8. 保存時には questionId / questionText / riskLevel / depthLevel / intensityLevel / lifeDomainTags / corePatternTags を保存する。
9. 既存の v17 保存設計がある場合はそれに統合する。
10. UI上にカテゴリ名・タグ名・心理学用語を表示しない。

注意：

- Noetune は診断アプリではありません。
- 問いはユーザーを分析するためではなく、意識を向ける入口です。
- 高リスク問いには医療的な深掘りをしないでください。

---

## Practical Build Phases

Phase 1:

1000 questions with only:

- id
- text

Phase 2:

Add:

- riskLevel
- visibleInLibrary
- requiresSafetyGuard

Phase 3:

Add:

- depthLevel
- intensityLevel
- tone

Phase 4:

Add:

- lifeDomainTags
- corePatternTags

Phase 5:

Connect to:

- search
- recommendation
- Journey continuation
- localization
- safety guard

---

## Final Decision

Proceed with this JSON design.

Human Core Questions are the primary entrance into Noetune.

Themes and categories are secondary internal structures.

The user sees only the question.

---
# Human Core Questions Localization Policy

Human Core Questions must be designed as locale-ready data.

The stable identifier is the question ID, not the Japanese question text.

Japanese is the current source language.

English, Traditional Chinese / Taiwanese Mandarin, and future languages will use the same IDs.

The app must never use question text as a stable key.

Question metadata such as category, domain, tags, riskLevel, visibleInLibrary, and sessionUse must remain language-independent.

Only the user-facing question text should be localized.

If a localized question is missing, fallback order should be:

1. Current locale question text
2. Japanese source question text
3. Question ID for development-only fallback

Human Core Questions require transcreation, not literal translation.

The localized question must preserve the function of the original question:

- It should feel natural in the target language.
- It should feel quiet.
- It should not sound clinical.
- It should not sound like advice.
- It should not sound like a diagnostic question.
- It should preserve the “図星” feeling.
- It should remain suitable as an entry point into a Noetune session.

Future JSON structure should support:

- ja
- en
- zh-TW
- additional locales

without changing question IDs.