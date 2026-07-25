> [!info] Noetune v17 Canonical Documents
> [[00 Noetune v17 Master]] · [[01 Product, Monetization & Journey]] · [[02 Technical & Content Specification]] · [[03 Implementation, QA & Decisions]] · [[04 Theme Source Database]]

# Noetune v17 Product, Monetization & Journey

**Status:** Canonical product and monetization specification
**Baseline:** `app-v17(15).html` and current locale JSON
**Updated:** 2026-07-25

## 1. Product Experience Overview

NoetuneのPrimary Experienceは、一つの完全なSessionである。

```text
Landing
→ Entrance
→ Theme
→ Session Mode
→ Complete Session
→ Result
```

JourneyやProは、最初の体験を支配しない。新しいSessionを始めることを常に最も明確な入口にする。

## 2. Canonical User Flow

```text
Landing
└── Start
    ├── 自由入力
    ├── 人生との関わり
    └── 霊的叡智
        ↓
    Theme selection
        ↓
    Session Mode
    ├── Regular Dive
    └── Deep Dive
        ↓
    Before
        ↓
    Session-specific flow
        ↓
    Breath
        ↓
    Final Measurement
        ↓
    Result
```

## 3. Landing

役割：

- Noetuneの空気を伝える
- 売り込みすぎず、体験開始を明確にする
- `静かにはじめる`をPrimary Actionにする
- `Noetuneとは`、Pricing、言語、Appearance、Accountへ到達できる
- アカウント作成を開始条件にしない
- Freeで最後まで使えることを明記する

## 4. Three Entrances

### 4.1 自由入力

ユーザーが今気になることを自分で書く。

- 最短の入口
- 正しい言い方を要求しない
- 空欄をテーマとして保存しない
- 入力内容はユーザーのテーマラベルとなる
- Regular / Deepの両方へ進める

### 4.2 人生との関わり

現行カテゴリ：

1. 自分
2. 人
3. 恋愛
4. 家族
5. 仕事
6. お金
7. 健康
8. 時間

各カテゴリは次の2trackを持つ。

- Problems
- Ideal States

元データは[[04 Theme Source Database]]を正本とする。

### 4.3 霊的叡智

現行構造：

- 15グループ
- 170テーマ
- 各テーマにlabelとdescription
- すべて`ideals` track

selection note：

> できているかを評価するものではありません。ただ、今気になるものを選んでください。

元データは[[04 Theme Source Database]]を正本とする。

## 5. Session Mode

### 5.1 Regular Dive

```text
Before
→ Question 1（A/B選択）
→ Question 2
→ Breath
→ Final Measurement
→ Result
```

日常的に一度ずつ静かに見るための完全Session。新規Regular sessionの`questionVariant`は`A`。

### 5.2 Deep Dive

```text
Before
→ A Question 1
→ Question 2
→ B Question 1
→ Question 2
→ A Question 1 ...
→ user chooses no more words
→ Breath
→ Final Measurement
→ Result
```

Deepは同じ原テーマを固定し、AとBを交互に選んでroundを続ける。

### 5.3 Plan Independence

Regular / DeepとFree / Proは別軸。Deepを「より良い有料Session」として扱わない。

## 6. Before Measurement

選んだテーマへ意識を向けた時の自然さを入力する。

- promptはlocale JSONを正本とする
- 0–100 slider、`数値化不可`、Nextを維持する
- slider初期位置を回答済みとしない
- 0、未回答、数値化不可、Skipを区別する
- AfterがBeforeより高いことを要求しない

## 7. Regular Session Flow

### 7.1 共通UI

- Question 1だけにA/B選択UIを表示する
- 新規SessionはAを選択した状態で開く
- A/B切替時に同じtextarea draftを維持する
- Question 2ではA/B UIを表示しない
- A/Bという表示文字はliteralのまま維持する
- accessibility labelと質問本文はlocale JSONを唯一の表示文言正本とする

### 7.2 Ideals / Spiritual Wisdom route

`spiritual-wisdom`は質問route上`ideals`として扱う。原テーマを`{theme}`、Question 1の回答を`{answer1}`とする。

**Question 1A**

> 「{theme}」それと正反対の状態の私は、どんな状態ですか？

**Question 1B**

> 「{theme}」その私と比べて、以前の私はどうでしたか？

**Question 2**

> 「{answer1}」そうである人は、どんな状態を望んでいますか？

### 7.3 Problems route

**Question 1A**

> 「{theme}」そうである人は、どんな状態を望んでいますか？

**Question 1B**

> 「{theme}」それに無縁の私は、どんな状態ですか？

**Question 2**

> 「{answer1}」それと正反対の状態の私は、どんな状態ですか？

### 7.4 Writing

- textareaは本人の言葉を受け取る
- AI補完・自動解釈をしない
- draftと確定値を区別する
- BackやA/B切替で不要に消さない
- Skip可能な箇所は失敗扱いしない

## 8. Deep Session Flow

### 8.1 正式な交互ルール

Deepは原テーマを各roundで固定して引用する。

```text
Round 1: A Question 1 → Question 2
Round 2: B Question 1 → Question 2
Round 3: A Question 1 → Question 2
Round 4: B Question 1 → Question 2
...
```

- 開始variantはA
- round完了ごとにA/Bを反転する
- Question 2はそのroundのQuestion 1回答を引用する
- 次roundのQuestion 1は、前回答ではなく常に原テーマを引用する
- ユーザーが`これ以上、言葉が出ない`を選んだ時だけBreathへ進む
- Noetuneが十分な深さを自動判定しない

### 8.2 Back

- 同round内ではQuestion 2からQuestion 1へ戻る
- round先頭では前roundを復元する
- variant、原テーマ、回答、draft、round順を壊さない
- 旧Deepのroute-specific phase連鎖へ戻さない

### 8.3 実装状態

このDeep仕様は承認済みだが未実装。現在の実装完了範囲はRegular Unit 1までである。

## 9. Breath

現行コピーは2段階。

### Step 1

- 感じてください。
- 今のその感覚に拮抗するエネルギー。
- 一呼吸。

### Step 2

- 感じてください。
- 拮抗エネルギー以外のすべて。
- 一呼吸。

ルール：

- 自動で繰り返さない
- 画面表示直後に勝手に進めない
- ユーザーの操作で進む
- reduced motionを尊重する
- Legacy breath画面と分ける

## 10. Final Measurement

同じテーマへ再び意識を向け、Afterを入力する。

Beforeより高くなることを要求しない。低下、変化なし、`数値化不可`も有効。

## 11. Result Screen

表示候補：

- Theme
- Subtheme
- Spiritual description
- Before / After
- score trail
- awareness trail
- Result Card
- Result Image Save
- Restart subtheme
- Restart theme
- Choose another theme

結果に自動評価を付けない。

結果画面は自動的なJourney終了地点ではない。ユーザーがまだ続けたい場合、その状態も進行中として保持できる。

現在の結果画面内にある大きな`しおりを挟む`CTAは廃止する。途中しおりは、他のSession画面と同じ共通ヘッダー位置に表示する。

## 12. Immediate Repeat

同じ利用中に同じテーマを繰り返す。

- 前回Afterを次の開始値として継承可能
- score trailを継続
- awareness trailを継続
- Freeで利用可能
- Pro Journeyではない

## 13. Back Behavior

- Backは現在stateを壊さない
- 入力済み内容を必要なく消さない
- Regularでは一つ前の正規画面へ戻る
- Deepではroute / phase / roundに基づき復元する
- Legacy画面へ誤って戻らない

## 14. Skip Behavior

- Primaryより目立たせない
- 失敗扱いしない
- 注意・励ましを自動表示しない
- 未回答と意図的Skipを区別する
- Deepのphaseを壊さず進める

## 15. Copywriting Rules

### Tone

- 静か
- 短い
- 自然
- 非評価
- 非治療的
- 非販促的
- ユーザーの言葉を優先

### Avoid

- Unlock healing
- Improve faster
- Fix yourself
- Track your progress
- Success rate
- Do not lose this change
- Upgrade now
- Limited time
- あなたの問題を解決
- 効果があります
- 治ります

### Prefer

- 始める
- 今の状態
- なんとなくで
- 書けるだけ
- 感じてください
- 一呼吸
- 次へ
- このテーマへ戻る
- 前のSessionを見る
- このテーマの続きを残す

## 16. Guest and Free

Guestは、苦しい瞬間の完全なSessionをログインや回数制限で妨げない。

### Guestに含まれるもの

- All current themes
- 自由入力
- 人生との関わり
- 霊的叡智
- Regular / Deep
- Unlimited complete Sessions
- Before / After
- Breath
- Result Card / Result Image Save
- ログイン不要
- 広告なし
- AI解釈なし

### Guestに含まれないもの

- Guest local / Guest-ownedの永続Bookmark entitlement
- 永続的なSession本文保存
- ブラウザやタブを閉じた後のresume保証
- 別端末resume
- 完了Session全文履歴
- 長期archive

Free loginはGuestの全機能に加えて、**現在進行中のCloud Journey 1件を失わずに続ける権利**を持つ。

### Free loginに追加されるもの

- Googleログイン
- Cloud active Journey 1件
- 同じアカウントでの別端末resume
- accountからの削除
- Cloud保存失敗時の安全な再試行

Loginしただけでは本人の文章をCloudへ保存しない。Cloud保存は本人の明示的なしおり操作から始める。

## 17. Pro

Proの役割：

> 複数のJourneyと完了した文脈を、時間と端末を越えて静かに残す。

### Core value

- Cloud active Journey最大50件
- exact resume
- completed Journey archive
- theme history
- cross-device access
- cloud backup / account recovery
- delete all account data
- 将来のexport / privacy lock

ProはSessionの深さ、呼吸の効果、テーマへのアクセスを販売しない。

## 18. Guest / Free / Pro entitlement

| 機能 | Guest | Free login | Pro |
|---|---:|---:|---:|
| 完全Session | 可・無制限 | 可・無制限 | 可・無制限 |
| 永続Bookmark | なし | Cloud 1件 | Cloud最大50件 |
| 別端末resume | 不可 | active 1件 | active最大50件 |
| completed全文履歴 | 不可 | 不可 | 可 |
| テーマ別履歴 | 不可 | 不可 | 可 |
| export | Result画像 | Result画像 | 将来の保存データexport |

Sessionの利用自体は誰に対しても制限しない。継続保存は、Free loginから始まるauthenticated Cloud機能である。

## 19. Session Bookmark

意味：

> ログイン済みユーザーが、現在のSessionをその位置と内部状態ごとCloudへ残し、あとで同じ位置から続ける。

### 保存開始

- Guestは永続Bookmark entitlementを持たないが、対象Session画面には共通の小さなしおりCTAを表示する
- 小さなしおりはGuest local保存ではなく、authenticated Cloud保存への入口である
- Session中にLoginやAuth modalを勝手に割り込ませない
- Guest本人が小さなしおりを押した時だけ、Cloud保存の説明とGoogle Loginへ進む
- Google Loginだけでは本人の文章をCloudへ保存しない
- Login成功後は元のSessionと画面へ戻し、本人へ最終保存確認を行う
- Cloud保存開始時に保存先、目的、Free 1件、削除方法を示す
- 本人の明示的な最終確認後に最初のCloud recordを作成する
- 保存後は同じ`sessionId`を自動更新する

通常Session開始時のLogin強制は行わない。Cloud保存機能がPrivacy / Security Gate前または未実装の段階では、production feature flagをOFFにして未完の導線を公開しない。

### 対象

- Session mode
- Before
- Regular response pages
- Deep response / Feel100 / rounds
- Breath Step 1 / Step 2
- Final Measurement
- Result
- Immediate Repeat

### 対象外

- Landing上の未確定Session
- theme未確定の入口
- Auth
- Pricing
- Membership / Settings
- About

### UI

- Backを左、共通の小さなしおりを右に置く
- Session Mode、Before、Regular / Deep、Breath、Final Measurement、Result、Repeatの対象画面で同じDOM責務と位置を使う
- Result画面の旧大CTA`しおりを挟む`は廃止し、Resultも同じ小さなしおりだけを使う
- Guest、Free、Proで同じ入口を使い、押下後の状態だけをentitlementと認証状態で分岐する
- Guest押下時は保存せず、Cloud説明 → Google Login → 元画面復帰 → 最終保存確認の順に進む
- Primary CTAより弱い階層
- 保存後も現在画面に留まる
- 未保存、Login必要、保存確認、保存中、Cloud同期、errorを静かに表示
- Cloud feature flagが無効な地域・段階ではproductionでBookmarkを公開しない

## 20. 保存更新

本人がCloudしおりを明示的に有効にしたSessionだけを更新する。

- textarea: authenticated cache 800ms / cloud 1500ms debounce
- slider: authenticated cache 500ms / cloud 1000ms debounce
- Next / Back: state変更後に即時flush
- visibilitychange: authenticated cache即時、cloud best effort
- beforeunload: authenticated cacheのみ
- Breath animation秒数は保存しない
- Guest runtimeには永続writeを行わない

## 21. Resume

Cloudしおりを持つFree / Proだけが永続resumeを利用する。

- 同じ`sessionId`を復元する
- 入力済み値とdraftを復元する
- Regular / Deepの意味順を維持する
- Deepのround、phase、rounds、pendingRound、sourceQuote、finishedを復元する
- ResultからFinal、Breath、Responseへ戻れる
- 復元不能時は最も近い安全なcanonical screenへ戻す
- 壊れたsnapshotを自動削除・自動上書きしない
- Guestのブラウザ再起動resumeは製品保証しない

一覧主表示：

```text
テーマ｜サブテーマ
```

## 22. Journey completion

Result到達はJourney完了ではない。

Result下部に静かな副次操作を置く。

```text
このJourneyを終える
```

押下時：

1. runtime上でJourneyを完了状態にする
2. `v17_journey_completed`をsessionIdごとに1回送信する
3. Guestは永続recordを作らず、そのSessionを終了する
4. FreeのCloudしおり利用中Journeyは、最終stateを安全にflushした後、active全文を削除する
5. ProのCloudしおり利用中Journeyは、最終stateを安全にflushし、`status = completed`、`completedAt`を記録してcompleted archiveへ移す
6. active一覧から外す

## 23. Result analytics

```text
Result到達: v17_result_reached
明示的完了: v17_journey_completed
```

- Result eventはcycleごとに1回
- Journey completed eventはsessionIdごとに1回
- Backして再Resultへ到達しても同cycleでは重複送信しない
- 本文をanalyticsへ送らない

## 24. Immediate Repeat

Repeatは同じJourney内の新しいcycleである。

```text
sessionId: 維持
cycleId: 新規UUID
cycleIndex: +1
```

同じテーマ／同じサブテーマでもう一度も、明示的に新Journeyを選ばない限り同じJourneyの派生cycleとして扱う。

## 25. 新しいJourney

- 新しいテーマで新しく始める時は新しい`sessionId`と`cycleId`
- Resultからは「このJourneyを終えて、新しいテーマへ」と明示する
- Guestは永続active recordを持たないため、そのまま新しいJourneyを開始できる
- Freeで既存Cloud active 1件がある場合、警告なく上書きしない
- Proは最大50件まで旧activeを残して新Journeyを開始できる
- Landingへ戻る、タブを閉じる、LogoutはJourney完了ではない
- Guestのタブ終了は永続保存を伴わない

## 26. Login and Cloud save boundary

### Guest

- runtime memoryだけでSessionを進める
- 永続Bookmark recordを作成しない
- ブラウザやタブを閉じた後のexact resumeを保証しない

### Login後

- Loginだけを理由にGuest runtime本文を自動uploadしない
- Cloud保存を本人が選ぶ時に、保存先、目的、削除方法を明示する
- 本人の明示確認後、新しいCloud recordとして保存を開始する
- authenticated cacheを使う場合も、Guest entitlementやGuest正本とは分離する
- 同じsessionIdのCloud recordは`revision`、次に`updatedAt`で新しい方を採用
- Proは最大50件まで複数activeを保持
- Freeは新しいsessionIdを保存する前に既存1件の扱いを本人へ確認
- cloud成功前にauthenticated pending copyを削除しない

## 27. Pro終了後

- 保存データを自動削除しない
- activeは更新可能な1件を選び、残り最大49件はread-only
- completed archiveはread-onlyで保持
- 再契約後に通常アクセスを回復
- 削除はいつでも可能

## 28. Upgrade timing

表示可能：

- ユーザーがcloud同期を選んだ時
- 複数activeを保存しようとした時
- Journey Historyを開いた時
- 保存上限を超えた時

表示禁止：

- Writing中の自動割り込み
- Breath中
- Result表示完了前
- Themeを選んだだけ
- Session回数を理由にした制限

## 29. Pricing principle

```text
Guest = unlimited experience without persistence
Free  = one authenticated Cloud continuity
Pro   = up to 50 active continuities + archive
```

価格は市場検証で決める。契約後の価格・通貨・期間はStripe subscription / Priceを正本とし、言語や現在地から再計算しない。

## 30. Global Privacy and User Control

### 30.1 Content classification

自由入力、回答、draft、Deep round、sourceQuote、awareness、本人由来のResult内容、snapshot全文をHigh Confidentiality User Contentとして扱う。

### 30.2 Use restrictions

- Guest本文を永続保存しない
- Cloud保存開始を本人の明示操作に限定
- LoginだけではCloud recordを作成しない
- 本人の文章を広告、販売、AI学習、プロファイリング、marketing、A/B本文分析、一般analyticsへ使用しない
- 本人の文章をconsole、server log、error monitoringへ送らない
- 本文をNoetuneの改善目的で人手閲覧することを標準運用にしない
- 将来、別目的で利用する場合はPrivacy Policy変更だけで済ませず、独立した明示的opt-inを必要とする

### 30.3 User control

- Cloud保存の有無、保存先、削除方法を明確に説明する
- Journey単位削除とAccount全データ削除を提供する
- authenticated local cacheがある場合はCloud recordとの違いと削除方法を説明する
- データの閲覧、コピー、訂正、処理停止、削除の問い合わせ経路を持つ
- Account削除時に全Session data、旧bookmark、authenticated cacheを削除する
- backupから即時消去できない場合は保持期間とアクセス制限を説明する

### 30.4 Global rollout

Noetuneの製品対象は全世界。ただしCloud機能は段階的に公開する。

```text
Stage 1: worldwide Guest — 完全Session、永続保存なし
Stage 2: Privacy / vendor / RLS gate合格地域でFree cloud active 1件
Stage 3: Pro cloud active最大50件 / completed archive
Stage 4: supported regions expansion
```

初期版は18歳以上を対象とし、未成年者・学校向けとして宣伝しない。Cloud本文保存、Pro archive、cross-device resume、世界向け有料Cloud機能はGlobal Privacy & Security Gate合格前に公開しない。

### 30.5 Honest security language

実装済みの通信暗号化、保存時暗号化、RLS、access controlだけを説明する。end-to-end encryptionを実装していない状態で「誰にも読めない」「運営者も読めない」「完全匿名」と表示しない。

## 31. Initial continuity MVP

### Stage 1 — Guest no-save release

1. Guestはログインなしで完全Sessionを何度でも利用可能
2. Guest local Bookmark、Landing Resume、Result旧大Bookmark CTAを表示しない
3. Guest本文をlocalStorageやCloudへ永続保存しない
4. ブラウザやタブを閉じた後のresumeを保証しない
5. 共通の小さなCloud保存CTAは開発可能だが、Cloud onboardingと明示保存経路が完成しGateを通るまではproduction feature flagをOFFにする
6. 旧テーマbookmark UIと共通の小さなCloud保存CTAを混在させない
7. Result画像保存は端末機能として維持

### Stage 2以降 — Gate後

1. Free cloud active 1件
2. Pro cloud active最大50件
3. Guestにも見える共通の小さなauthenticated Cloud bookmark entry UI
4. active一覧
5. cross-device resume
6. Pro completed archiveの基礎
7. Account全データ削除
8. Free / Pro上限超過時の本人選択

Stage 2以降はGlobal Privacy & Security Gate、RLS、vendor review、削除・incident対応が合格した後にのみ公開する。

後回し：

- 高度な履歴検索
- graph / review / streak
- AI summary
- text auto merge
- client-side encryption
- privacy PIN
- full export

## 32. Validation metrics

1. Save intent → Login completion rate
2. Login completion → explicit Cloud save rate
3. Cloud save success rate
4. Cross-device Resume success rate
5. Resumed Journey continuation rate
6. Explicit Journey completion rate
7. Conflict / fallback / data-loss rate
8. Free 1件上限到達率
9. Pro conversion after an explicit continuity action
10. Pro active件数分布と50件上限到達率
