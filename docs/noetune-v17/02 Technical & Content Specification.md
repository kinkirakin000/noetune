> [!info] Noetune v17 Canonical Documents
> [[00 Noetune v17 Master]] · [[01 Product, Monetization & Journey]] · [[02 Technical & Content Specification]] · [[03 Implementation, QA & Decisions]] · [[04 Theme Source Database]]

# Noetune v17 Technical & Content Specification

**Status:** Canonical technical and content specification
**Implementation baseline:** `app-v17(15).html`
**Updated:** 2026-07-25

## 1. Scope

このファイルは、現行v17の状態、保存、データ、JSON、ローカライズ、コンテンツ体系、Legacy境界を定義する。

製品哲学は[[00 Noetune v17 Master]]、体験と課金は[[01 Product, Monetization & Journey]]、本文データは[[04 Theme Source Database]]を正本とする。

## 2. Canonical Screens

現行正規v17画面：

```text
s-landing
s-v17-start-category
s-v17-session-mode
s-v17-entry-choice
s-v17-spiritual-wisdom
s-v17-before
s-v17-first-response
s-v17-second-response
s-v17-deep-response
s-v17-deep-feel-100
s-v17-breath
s-v17-final-measure
s-result
s-pricing
s-about
```

## 3. Legacy Boundary

`app-v17(15).html`には次が混在する。

- v16 flow
- v15 auth / billing / save modules
- v13 loop
- v12 entry
- old breath screens
- old door / ideal / nega
- old result
- trial / lock placeholder
- progress-save / resume logic
- Human Core Questions UI / loader remnants
- embedded legacy theme data

ルール：

- Legacyは現在実装されているが正規仕様ではない
- 新機能をLegacy画面へ追加しない
- 正規v17のdata sourceをLegacy埋め込みデータへ戻さない
- 互換性を確認しながら段階的に隔離・削除する
- Human Core Questionsは現行正規導線に含めない
- 大規模整理はPro基盤後に段階実施

## 4. Core State Model

概念state：

```text
locale
appearance
currentScreen
entryType
themeReference
sessionMode
v17Flow
currentSession
immediateRepeat
currentUser
currentProfile
planState
sessionBookmarks
activeJourneys
```

## 5. Session Mode

現行state：

```text
D.v17SessionMode
```

有効値：

```text
regular
deep
```

ルール：

- Session開始前に正規化
- `deep`以外は`regular`
- plan stateと混同しない
- save payloadへ含める

## 6. Entry Model

```json
{
  "entryType": "free_input | life_theme | spiritual_wisdom",
  "themeId": "stable-id-or-null",
  "themeLabel": "display label",
  "themeDescription": "optional",
  "categoryId": "optional",
  "track": "problems | ideals | neutral",
  "freeInputTheme": "optional"
}
```

## 7. Regular Flow State

現行runtimeの正式追加field：

```json
{
  "routeType": "problem | ideal | spiritual",
  "questionVariant": "A | B",
  "before": {},
  "firstResponse": "",
  "secondResponse": "",
  "currentState": "",
  "idealState": "",
  "breathCompleted": false,
  "after": {},
  "completed": false
}
```

ルール：

- 新規Regular sessionは`questionVariant = "A"`
- A/B切替はQuestion 1のpromptだけを変更する
- 切替時にtextarea draftを維持する
- Question 2ではselectorを非表示にする
- `spiritual` routeはprompt選択上`ideal`と同じ規則を使う
- Question 2は`step2Text`、すなわちQuestion 1の回答を引用する
- Breath遷移は現在のv17挙動を維持する

### 7.1 Prompt contract

```text
ideal / spiritual A: theme → opposite self
ideal / spiritual B: theme → previous self
problem A: theme → desired state
problem B: theme → self unrelated to the problem
Question 2: answer1 → route-specific opposite side
```

表示文言は`locales/ja.json`、`locales/en.json`、`locales/zh-TW.json`を唯一の正本とする。HTML / JavaScriptへ新しい表示文言を直書きしない。ただしselectorの可視文字`A` / `B`は識別子としてliteralを維持する。

### 7.2 Snapshot boundary

`questionVariant`はruntimeへ実装済みだが、Snapshot Schema v1への保存・validator・restoreはUnit 2で追加する。Unit 1完了時点では未実装であり、暗黙のdefaultだけに依存してresume完了とみなしてはならない。

## 8. Deep Flow State

新しいDeepの概念state：

```json
{
  "routeType": "problem | ideal | spiritual",
  "originalTheme": "",
  "round": 1,
  "questionVariant": "A | B",
  "phase": "question1 | question2",
  "rounds": [],
  "pendingRound": null,
  "finished": false
}
```

各round：

```json
{
  "round": 1,
  "questionVariant": "A | B",
  "originalTheme": "",
  "question1": { "text": "", "draft": "" },
  "question2": { "text": "", "draft": "" },
  "incomplete": false
}
```

ルール：

- Round 1はA、以後A/Bを交互にする
- Question 1は毎round`originalTheme`を引用する
- Question 2は同roundのQuestion 1回答を引用する
- 前round回答を次roundの原テーマとして連鎖させない
- 完了roundのみ`rounds`へ加える
- 作業中roundは`pendingRound`へ置く
- Back時にvariant、round順、originalTheme、draftを復元する
- No More Words後は`finished = true`としてBreathへ進む
- AI要約を生成しない

旧`current / ideal / feel100` phase設計は現行コードの履歴として残り得るが、新しいDeep実装の正本ではない。移行は独立Unitで行い、Unit 1と混ぜない。

## 9. Measurement Model

推奨：

```json
{
  "state": "scored | not_a_problem | skipped | unset",
  "value": 0,
  "touched": true
}
```

ルール：

- `0`は有効
- `null`を0として扱わない
- slider初期値を回答済みにしない
- `not_a_problem`は数値と共存させない
- `skipped`と`unset`を区別
- Before / After双方に同じmodelを使う

## 10. Immediate Repeat and cycle model

```text
1 Journey = 1 sessionId
1 cycle = 1 cycleId
```

- 初回cycleは`cycleIndex = 0`
- Repeat開始時は同じ`sessionId`、新しい`cycleId`、`cycleIndex + 1`
- Result analyticsはcycle単位
- Journey completionはsession単位

## 11. Snapshot Schema v1

authenticated Cloudしおりの正規保存形式は`SessionSnapshotV1`である。Guestはこのschemaを永続保存権利として持たない。

```ts
interface SessionSnapshotV1 {
  snapshotSchemaVersion: 1;
  appVersion: "v17";

  sessionId: string;
  status: "active" | "completed" | "discarded";

  createdAt: string;
  savedAt: string;
  updatedAt: string;
  completedAt: string | null;
  discardedAt: string | null;

  revision: number;
  currentScreen: CanonicalSessionScreen;
  summary: SessionSummaryV1;
  currentCycle: CurrentCycleV1;
  currentState: SessionFrameStateV1;
  repeatState: RepeatStateV1 | null;
  resumeBackFrames: ResumeBackFrameV1[];
}
```

### Timestamp

- UTC ISO 8601
- `createdAt`: Journey開始
- `savedAt`: 初めてCloudしおりを明示保存した時
- `updatedAt`: 内容の最終更新
- `completedAt`: 明示的完了
- `discardedAt`: 明示的破棄

### status整合

```text
active: completedAt = null, discardedAt = null
completed: completedAt != null, discardedAt = null
discarded: discardedAt != null
```

## 12. Canonical resume screens

```ts
type CanonicalSessionScreen =
  | "s-v17-session-mode"
  | "s-v17-before"
  | "s-v17-first-response"
  | "s-v17-second-response"
  | "s-v17-deep-response"
  | "s-v17-deep-feel-100"
  | "s-v17-breath"
  | "s-v17-final-measure"
  | "s-result";
```

Landing、theme未確定画面、Auth、Pricing、Membership、Settings、AboutはCloudしおり対象外。Guestは全画面で永続しおり対象外だが、対象Session画面の共通小CTAをCloud保存意図の入口として表示できる。このCTAはGuest local recordを作らない。

## 13. Summary and entry

```ts
interface SessionSummaryV1 {
  themeLabel: string;
  subthemeLabel: string | null;
  entryType: "free_input" | "life_theme" | "spiritual_wisdom";
  sessionMode: "regular" | "deep";
  locale: "ja" | "en" | "zh-TW";
}

interface EntryStateV1 {
  entryType: "free_input" | "life_theme" | "spiritual_wisdom";
  themeId: string | null;
  questionId: string | null;
  themeLabel: string;
  themeDescription: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  trackId: string | null;
  themeMeaning: string | null;
  freeInputTheme: string | null;
  questionTextAtTime: string | null;
  localeAtSelection: "ja" | "en" | "zh-TW";
}
```

保存時の表示文脈を保持し、将来JSONが変更されても元Journeyの意味を壊さない。

## 14. Measurement and response

```ts
type MeasurementState = "scored" | "not_a_problem" | "skipped" | "unset";
interface MeasurementV1 {
  state: MeasurementState;
  value: number | null;
  touched: boolean;
}

type ResponseState = "answered" | "skipped" | "unset";
interface ResponseValueV1 {
  state: ResponseState;
  text: string;
  draft: string;
}
```

- `0`は有効
- 未回答と0を混同しない
- `text`は確定値、`draft`は現在textarea値
- `text`と`draft`が異なることを許可

## 15. Frame state

```ts
interface SessionFrameStateV1 {
  currentStep: string;
  locale: "ja" | "en" | "zh-TW";
  sessionMode: "regular" | "deep";
  routeType: "problem" | "ideal" | "spiritual";
  entry: EntryStateV1;
  before: MeasurementV1;
  after: MeasurementV1;
  deltaScore: number | null;
  responses: {
    current: ResponseValueV1;
    ideal: ResponseValueV1;
  };
  regularFlow: RegularFlowV1 | null;
  deepFlow: DeepFlowV1 | null;
  breath: BreathStateV1;
  scoreTrail: ScoreTrailStateV1;
  awarenessTrail: AwarenessTrailStateV1;
  resultView: ResultViewStateV1;
}
```

runtimeの`D`全体は保存しない。serializerが必要fieldだけを正規化する。

## 16. Regular flow

```ts
interface RegularFlowV1 {
  activeScreen: "first" | "second" | "completed";
  questionVariant: "A" | "B";
  firstResponseRole: "current" | "ideal";
  secondResponseRole: "current" | "ideal";
}
```

- `questionVariant`をSnapshot保存・validator・restoreの対象にする
- unknown valueはfail closed
- old snapshot migrationでは欠落時のみ`A`へ補完する
- 回答は画面順とsemantic roleの両方を壊さず保持する

## 17. Deep flow

```ts
type DeepPhase = "current" | "ideal" | "feel100";

interface DeepFlowV1 {
  routeType: "problem" | "ideal" | "spiritual";
  round: number;
  phase: DeepPhase;
  rounds: DeepRoundV1[];
  pendingRound: DeepRoundV1 | null;
  sourceQuote: string;
  finished: boolean;
}

interface DeepRoundV1 {
  round: number;
  routeType: "problem" | "ideal" | "spiritual";
  sourceQuote: string;
  currentState: ResponseValueV1;
  idealState: ResponseValueV1;
  feltHappiness100: boolean;
  incomplete: boolean;
}
```

- 完了roundのみ`rounds`
- 作業中roundは`pendingRound`
- No More Words後も未完了roundは`pendingRound`
- `finished`はDeep終了でありJourney完了ではない

## 18. Breath

```ts
interface BreathStateV1 {
  step: 1 | 2;
  phase: "first" | "second";
  firstCompleted: boolean;
  secondCompleted: boolean;
}
```

保存しない：timer、animation経過時間、circle scale、event listener。

resume時は保存されたStepの開始状態から表示し、`isAnimating = false`で初期化する。

## 19. Current cycle and Result

```ts
interface CurrentCycleV1 {
  cycleId: string;
  cycleIndex: number;
  startedAt: string;
  resultReachedAt: string | null;
  resultEventSent: boolean;
}

interface ResultViewStateV1 {
  reached: boolean;
  scoreTrailExpanded: boolean;
  awarenessTrailExpanded: boolean;
}
```

`currentScreen = s-result`かつ`status = active`を正規状態として許可する。

## 20. Repeat state

```ts
interface RepeatStateV1 {
  active: boolean;
  resultState: SessionFrameStateV1 | null;
  cycleState: SessionFrameStateV1 | null;
  returnPending: boolean;
  modeSelectionPending: boolean;
  beforeScore: MeasurementV1 | null;
  cycleCount: number;
}
```

runtime対応：

- `v17RepeatResultState`
- `v17RepeatCycleState`
- `v17RepeatReturnPending`
- `v17RepeatModeSelectionPending`
- `v17RepeatBeforeScore`
- `v17RepeatCycleCount`

Repeat state内に別のrepeat stateやresume frameを入れない。

## 21. Resume Back Frames

```ts
interface ResumeBackFrameV1 {
  screenId: CanonicalSessionScreen;
  state: SessionFrameStateV1;
  repeatState: RepeatStateV1 | null;
}
```

- 古いframe → 新しいframeの順
- 最大3件
- raw `navHistory` / `navPageStateHistory`は保存しない
- current画面はrootの`currentScreen` / `currentState`

Result例：

```text
frames = [Response, Breath, Final]
currentScreen = Result
Back: Result → Final → Breath → Response
```

No More Words後のBreathでは、遷移直前のDeep Response frameが必須。現在stateから押下前の`deep.finished`や`pendingRound.incomplete`を完全には逆算できない。

## 22. Authenticated local cache envelope

Cloudしおりの信頼性向上のため、ログイン済みユーザーに限りwrite-through cache / offline queueを使うことができる。

```ts
interface LocalSessionRecordV1 {
  storageSchemaVersion: 1;
  snapshot: SessionSnapshotV1;
  sync: {
    ownerUserId: string;
    pendingSync: boolean;
    serverRevision: number;
    lastSyncedAt: string | null;
    lastErrorCode: string | null;
  };
}
```

- Guestは永続recordを作成しない
- Guest runtime本文をlocalStorageへ保存しない
- Login後のcacheはCloud正本の補助であり、Guest entitlementではない
- cacheは認証済みownerUserIdへ結び付ける
- cloud成功後も安全なcacheを即削除しない
- Logout時にauthenticated local cacheを削除する
- shared device warningとcache削除手段を提供する
- localStorageを秘密保管場所とはみなさない

## 23. Cloud boundary

```ts
interface CloudSessionSnapshotRecord {
  session_id: string;
  user_id: string;
  status: "active" | "completed" | "discarded";
  revision: number;
  snapshot_schema_version: number;
  app_version: string;
  theme_label: string;
  subtheme_label: string | null;
  current_screen: CanonicalSessionScreen;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  snapshot: SessionSnapshotV1;
}
```

Server正本：`user_id`、`revision`、`updated_at`。

- RLS必須
- clientの`user_id`を信用しない
- Guest runtime本文はcloudへ保存しない
- service roleをbrowserへ公開しない


### 23.1 High Confidentiality User Content

以下は内容にかかわらずHigh Confidentiality User Contentとして扱う。

```text
freeInputTheme
responses.*.text
responses.*.draft
deepFlow.rounds / pendingRoundの本人文章
sourceQuote
awareness trailの本人由来内容
snapshot内の本人文章
```

このcontentを自動分類して安全性を下げない。metadataと本文を分離し、本文はlogs、analytics、error payload、support tool、AI coding toolへ出さない。

### 23.2 Storage abstraction

Session保存は次の責務を分離する。

```text
serializer
validator
authenticated cache repository
cloud repository adapter
sync coordinator
```

- UI / Session stateを特定provider APIへ直接密結合しない
- cloud adapterはprovider変更時にSnapshot SchemaとSession flowを変更せず交換可能にする
- vendor固有IDやresponseをSnapshot Schemaへ混入しない
- 本文を通すAPI / serverless / database providerは事前のvendor・契約・data-flow reviewを必要とする
- review完了前はVercelをstatic HTML / JS / CSS配信と本文を含まない処理に限定し、Session本文をVercel Functions、Vercel logs、Vercel Analyticsへ送らない

### 23.3 Cloud opt-in boundary

- LoginはCloud本文保存への同意ではない
- Login時にGuest runtime本文を自動uploadしない
- Guestの小さなしおり押下はsave intentであり、record creationではない
- 押下後はCloud保存説明 → Google Login → 元のSession画面復帰 → 最終保存確認の順に進む
- OAuth / Login復帰時も、本人の最終確認前にGuest runtime本文をlocalStorage、Cloud、request bodyへ永続化しない
- Cloud保存開始時に保存先、目的、Free 1件、削除方法を表示する
- 本人の明示的な最終確認後に最初のCloud recordを作成する
- authenticated cacheがある場合もCloud成功前に削除しない
- sync failure / token expiry / vendor outageで認証済みユーザーのpending copyを失わない
- Guestに永続resumeを暗黙提供しない

### 23.4 Global privacy gate

Cloud本文保存、cross-device resume、Pro archive、世界向け有料Cloud機能を有効化する前に、次を完了する。

- data controller / operator identity
- data inventory and data-flow map
- vendor DPA / subprocessor / transfer review
- region and retention decision
- owner-only RLS and negative cross-user tests
- no-private-content logging tests
- Journey削除 / Account削除 / data request procedure
- backup / restore / backup deletion explanation
- incident response and breach notification runbook
- 18+ initial audience and minor handling policy
- privacy notice / terms / consent copy review

Gate未合格時、Cloud Session本文機能はfeature flagで無効のままにする。

## 24. Revision and conflict

- 未保存Guest runtimeには永続revisionを持たせない
- cloud insert後は1
- updateは`expectedRevision`一致時だけ`revision + 1`
- 古いrevisionは409 Conflict
- 自動上書き・自動text mergeをしない
- conflict解決までauthenticated cacheを保持
- `updatedAt`は補助比較であり、revisionが主

## 25. Validation and fallback

Validator最低条件：

- schema version
- UUID sessionId / cycleId
- canonical screen allowlist
- status / timestamp整合
- Measurement整合
- Regular / Deep排他
- Deep route / phase / round
- Breath step / phase
- frames 0〜3件
- recursionなし
- payload最大1 MiB

Fallback順：

```text
Result → Final → Breath → Response → Before → Session mode
```

- 復元不能snapshotを自動削除しない
- fallback直後にcloudへ自動上書きしない
- ユーザー操作後に正常stateとして再保存
- 本文値をerror logへ出さない

## 26. Save timing

最初の保存は、ログイン済みユーザーによる明示的なCloudしおり操作。

保存後：

- textarea: authenticated cache 800ms / cloud 1500ms
- slider: authenticated cache 500ms / cloud 1000ms
- Next / Back: 即時flush
- visibilitychange: authenticated cache即時、cloud best effort
- beforeunload: authenticated cacheのみ
- network失敗: pendingSyncを維持し再試行
- Guest runtimeにはこれらの永続save triggerを適用しない

## 27. Journey lifecycle

```text
Journey start: sessionId生成
Result reached: activeのまま
Repeat: 同sessionId、新cycleId
Explicit completion: status=completed
Discard: status=discarded
```

旧`trackEvent('v17_session_completed')`はResult到達から外し、`v17_result_reached`と`v17_journey_completed`へ分離する。

`clearPendingProgress()`は明示的完了・破棄・旧形式からの新Journey開始へ移す。

## 28. Entitlement and retention

- Guest persistent active 0件
- Free cloud active 1件
- Pro cloud active最大50件
- Guestはログインなしで完全Sessionを何度でも利用できる
- Guestのbrowser close後exact resumeは非保証
- Freeが別sessionIdを保存する時は既存activeの扱いを確認
- Proが50件目を超えて保存する時は本人に削除・完了・置換を選ばせる
- 上限超過を理由にsilent deletionしない
- Pro終了後は削除せずread-only保持
- active / archiveはユーザーの削除まで自動期限切れにしない
- Account削除時は全snapshot、旧bookmark、authenticated cacheを削除

## 29. Old bookmark boundary

旧theme bookmark：

```text
stable_theme_key
theme_snapshot
btn-save-result
toggleCurrentThemeBookmark()
public.bookmarks
/api/bookmarks
```

決定：

- 旧大CTAは削除
- 新UIから旧write APIを呼ばない
- 自動migrationしない
- 旧DBは新途中しおり安定まで保持
- 将来、テーマお気に入り・export・廃止のいずれかを別判断


## 30. Result Image

- 本人の端末で生成
- 画像に個人情報を過剰に含めない
- 保存失敗時にSession記録を壊さない
- dark/light双方で可読
- 自動評価文を入れない

## 31. Current Content Sources

人間向け正本：

- [[04 Theme Source Database]]

アプリ用データ：

- `ja(2).json`
- `en(1).json`
- `zh-TW(1).json`
- `spiritual-wisdom-ja.json`
- `spiritual-wisdom-en.json`
- `spiritual-wisdom-zh-TW.json`

現行JSONには次が入る。

### Locale JSON

- app
- appearance
- LP
- entry
- theme copy
- flow
- breath
- result
- bookmark
- buttons
- pricing
- errors
- status
- themeLibrary

### Spiritual Wisdom JSON

- label
- intro
- selectionNote
- defaultTrackId
- pageSize
- display
- 15 groups
- 170 themes

## 32. Life Theme Schema

```json
{
  "id": "self",
  "label": "自分",
  "emoji": "👤",
  "problems": [
    {
      "id": "self_problem_xxxxxxxx",
      "label": "自分が嫌い"
    }
  ],
  "ideals": [
    {
      "id": "self_ideal_xxxxxxxx",
      "label": "自分が好き"
    }
  ]
}
```

ルール：

- category IDは言語間で共通
- theme IDは言語間で共通
- labelのみ翻訳
- Problems / Idealsを混在させない
- JSON側と[[04 Theme Source Database]]の本文を一致させる

## 33. Spiritual Wisdom Schema

```json
{
  "id": "sw-001",
  "label": "現在意識",
  "description": "過去の後悔や未来の心配ではなく、今起きていることに意識を向けている。",
  "trackId": "ideals"
}
```

ルール：

- `sw-001`〜`sw-170`
- 3言語でID一致
- group ID一致
- order一致
- descriptionは補助説明
- 宗教的真理として断定しない
- 能力評価にしない

## 34. Localization

対応：

- English
- Japanese
- Traditional Chinese (`zh-TW`)

原則：

- 静か
- 非評価
- 非治療
- 非販促
- 自然な母語
- 保存、料金、削除、プライバシーは曖昧にしない
- Journey用語は意味の自然さを優先

## 35. Analytics

送信可：

- screen view
- Session started
- Session completed
- session mode
- entry type
- Bookmark save attempt / outcome
- Bookmark resume attempt / outcome
- upgrade view
- purchase outcome
- Journey reopen
- generic error code

送信しない：

- 本人の文章
- Free Input本文
- Spiritual response本文
- Session画像
- private result content

## 36. Security and Privacy Constraints

### Access and secrets

- HTMLへsecretを埋め込まない
- row-level securityを全Cloud Session tableへ適用する
- User AがUser BのSessionをSELECT / INSERT / UPDATE / DELETEできない
- client supplied `user_id`を信用せず、認証済みserver identityを使用する
- service roleとprovider admin credentialをbrowserへ公開しない
- production accessを最小権限・最小人数に制限する
- billing webhookを信頼境界として扱う

### Content handling

- Bookmark payloadの本人入力をbrowser console、server log、database log、analytics、error monitoringへ出さない
- errorはfield name / code / screen / revision等のprivacy-safe metadataだけを持つ
- request、response、exception、breadcrumbのautomatic captureを本文経路で無効化・redactする
- production Session本文をCodex、ChatGPT、support ticket、一般的なAI toolへ貼らない
- shareは本人の明示操作のみ
- 本文を広告、販売、AI学習、プロファイリングへ使用しない

### Storage and deletion

- Guest本文をlocalStorageへ永続保存しない
- authenticated local cacheを秘密保管場所とみなさない
- 共有端末への注意とauthenticated cache削除手段を提供する
- delete Journeyとdelete all account dataを実動作で検証する
- active、completed、旧bookmark、authenticated local cacheをAccount削除対象に含める
- backup保持期間と復旧範囲を文書化する
- corrupt / conflict / limit超過を理由に自動削除しない

### Security claims

- TLS、at-rest encryption、RLS、access controlをそれぞれ正確に説明する
- end-to-end encryption未実装時に「Noetune運営者も読めない」「完全暗号化」「完全匿名」と表示しない

### Global and vendor boundary

- 世界向けCloud公開前にGlobal Privacy & Security Gateを通す
- DPA、subprocessor、国際移転、data region、retentionが未確認のproviderへSession本文を送らない
- 初期版は18歳以上を対象とする

## 37. Deprecated State / Content

正規仕様から外す：

- Guest local persistent bookmark
- Guest local active 1件
- Guestに共通の小さなしおりCTAを見せることを、Guest永続保存権利と解釈すること
- Guestの小さなしおり押下だけでlocal record、Cloud record、Login-only uploadを開始すること
- Guest browser reload exact resumeを製品権利とすること
- Guest本文をlocalStorage正本とすること
- Human Core Questionsを現行入口にする
- HCQ Search / Random
- テーマidentityだけを保存するBookmarkを正規しおりとする
- Result画面だけに大きなBookmark CTAを置く
- Bookmarkから過去回答を捨てて新しいSessionを開始する
- Result到達や数値変化でJourneyを自動完了する
- Pro active最大20件
- `currentLoop`
- completionPercentage
- resolved
- healed
- improvement percentage
- distress rank
- average happiness
- AI summary
- Legacy v12/v13/v16 flow stateを新記録へ混入
- guest trial countをFree Session制限に使う

`currentScreen`、stableな`currentStepKey`、Deepの`phase / round`は、authenticated Cloudしおりの正確な復元に必要な正規stateとして扱う。Legacyの曖昧なstep番号やDOM依存位置をそのまま保存することは禁止する。

## 38. Billing State and Regional Price Specification

### 38.1 Responsibility Boundary

Noetune application:

- displays the current membership state
- displays the contracted amount, currency, and interval
- displays the next billing date or final access date
- converts Stripe billing state into clear human language
- creates a new Stripe Customer Portal Session when requested
- refreshes membership state after returning from Stripe

Stripe Customer Portal:

- payment method changes
- billing information
- invoice and receipt history
- period-end cancellation
- cancellation reversal or resumption when available
- other approved subscription actions

Stripe Portal must not be embedded in an iframe.

### 38.2 Contracted Price as Source of Truth

After purchase, price display must come from the user's actual Stripe subscription and Price.

Do not derive the contracted price from:

- locale JSON
- static HTML copy
- IP address
- browser language
- current geographic location
- the newest public pricing table

Required normalized billing fields:

- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_product_id`
- `stripe_price_id`
- `subscription_status`
- `membership_state`
- `entitlement_active`
- `price_amount`
- `currency`
- `billing_interval`
- `billing_interval_count`
- `pricing_region`
- `price_version`
- `tax_behavior`
- `country_at_purchase`
- `cancel_at_period_end`
- `cancel_at`
- `access_until`
- `next_billing_at`
- `latest_invoice_status`
- `next_payment_attempt`
- `last_stripe_sync_at`

Amounts must be stored in Stripe's minor-unit form and formatted by currency rules.

Do not assume every currency has decimal fractions.

### 38.3 Regional Price Selection

Checkout may select among approved regional Stripe Prices.

The decision must be server-controlled and limited to an allowlist of Price IDs.

Possible signals may include:

- explicitly selected storefront or billing region
- current Noetune pricing page
- supported currency
- billing country collected by Stripe
- existing subscription region

Browser language alone is insufficient because language and residence are not equivalent.

Before Checkout, the user must see the exact price, currency, and billing interval that will be sent to Stripe.

The Checkout Session must be created with the approved Price ID. The client must not be allowed to submit an arbitrary Price ID.

### 38.4 Membership State Normalization

Minimum normalized states:

- `free`
- `payment_incomplete`
- `active`
- `cancel_scheduled`
- `payment_attention`
- `access_stopped`
- `ended`
- `unknown`

Typical mapping:

- no subscription → `free`
- `incomplete` → `payment_incomplete`
- `active` without scheduled cancellation → `active`
- active or trialing with `cancel_at_period_end=true` or future `cancel_at` → `cancel_scheduled`
- `past_due` → `payment_attention`
- `unpaid` or policy-defined paused state → `access_stopped`
- `canceled` or `incomplete_expired` → `ended`
- API or synchronization failure → `unknown`

Access entitlement must be decided server-side.

`canceled_at` must not automatically be treated as the final access date. Use the applicable subscription period end or explicit cancellation date.

### 38.5 Portal Configuration

MVP Portal settings:

- payment methods: enabled
- billing information: enabled
- invoice history: enabled
- cancellation: enabled
- default cancellation timing: end of paid period
- cancellation reason: optional
- retention coupons: disabled
- return URL: Noetune membership page
- cross-currency or cross-region plan switching: disabled

A new short-lived Portal Session must be created for each management request.

### 38.6 Localization

Billing copy must support:

- English
- Japanese
- Traditional Chinese (`zh-TW`)

Billing strings use variables rather than hard-coded prices:

- `{amount}`
- `{currency}`
- `{interval}`
- `{nextBillingDate}`
- `{accessUntil}`
- `{nextPaymentAttempt}`

Examples:

- `NT$290／月`
- `¥1,480／月`
- `US$9.99 / month`

The formatter must distinguish `US$` and `NT$` where a plain `$` would be ambiguous.

### 38.7 Billing Security

- verify Stripe webhook signatures
- process webhook events idempotently
- tolerate out-of-order webhook delivery
- never trust a success redirect as the sole entitlement signal
- never expose Stripe secret keys
- never accept arbitrary Customer IDs or Price IDs from the client
- ensure User A cannot open User B's Portal
- prevent duplicate active subscriptions for one Noetune account
- separate test and live environments
- refresh state after Portal return
- retain the last safe entitlement briefly when Stripe status cannot be fetched, according to a documented policy
