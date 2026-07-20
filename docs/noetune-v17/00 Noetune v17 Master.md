> [!info] Noetune v17 Canonical Documents
> [[00 Noetune v17 Master]] · [[01 Product, Monetization & Journey]] · [[02 Technical & Content Specification]] · [[03 Implementation, QA & Decisions]] · [[04 Theme Source Database]]

# Noetune v17 Master

**Status:** Canonical product constitution
**Updated:** 2026-07-20
**Scope:** Noetune v17の哲学、最上位原則、優先順位。詳細な画面・schema・実装手順は他の正本へ委ねる。

## 1. Noetuneとは

Noetuneは、問題を解決するアプリではない。

AIが答えを教えるアプリでも、幸福度を管理するアプリでもない。

Noetuneは、短い問いと一呼吸を通して、**人生との関係を少し軽くするための状態復帰ツール**である。

目指すのは「正解」や「改善率」ではない。

最終的には、ユーザーが自然に次の状態へ近づくことを目指す。

> 何が問題だったのだろう。


## 2. Official Development Line

Noetune v17を唯一の正式な開発・公開ラインとする。

- v18を別製品・別runtimeとして完成させる方針は中止する
- Flow Engine、Versioned Flow Cartridge、独立navigation再設計などのv18専用Architectureは採用しない
- v17で完成しているUI、UX、認証、課金、履歴、Session Resume、Bookmark、Localization、Result、Appearanceを維持する
- v18検討から採用するのは、問いの新しいフロー設計だけである
- 新フローはv17へ小さなUnit単位で導入し、既存基盤を無断で再設計しない

この決定より古い「v18を正式ラインとする」記録は履歴であり、現在の仕様ではない。

## 3. Primary Experience

中心は一つの完全なSessionである。

```text
Landing
→ Entrance
→ Theme
→ Session Mode
→ Before
→ Regular / Deep question flow
→ Breath
→ Final Measurement
→ Result
```

- Guestでも最後まで使える
- RegularとDeepはFree / Proと別軸
- Resultへ到達してもJourneyは自動完了しない
- ユーザーの明示的操作だけがJourneyを完了させる

### 3.1 新しい問いの基本構造

RegularはQuestion 1とQuestion 2からなる。Question 1にはA/Bの選択があり、新規SessionはAから始まる。

- ideals / spiritual-wisdom：Aは理想と正反対、Bは以前の自分
- problems：Aは望む状態、Bは悩みと無縁の自分
- Question 2はQuestion 1の回答を引用し、routeに応じた反対側を問う
- A/Bを切り替えてもtextarea draftを失わない
- A/B選択UIはQuestion 1だけに表示する
- spiritual-wisdomは質問route上`ideals`として扱う

Deepは同じテーマを固定してA → Question 2 → B → Question 2を交互に繰り返す。前roundの回答を次roundのテーマへ置き換える旧連鎖方式は採用しない。

現在のBreath、Final Measurement、Resultへの遷移は維持する。呼吸工程の削除はUnit 1の範囲ではなく、別の正式決定なしに変更しない。

## 4. UX原則

- 静かである
- 短く、自然である
- 非評価・非治療・非診断である
- 本人の言葉をAIで補完・解釈しない
- BeforeよりAfterが高くなることを要求しない
- `0`、未回答、数値化不可、Skipを区別する
- 苦しい瞬間にLoginやUpgradeを割り込ませない
- データ保存はユーザーの意思から始める

## 5. JourneyとSession

```text
1 Journey = 1 sessionId
1 Journey内のRepeat = 複数cycleId
```

- Journey開始時に`sessionId`を生成する
- Repeatは同じ`sessionId`内の派生cycle
- 新しいテーマで新しく始める時は新しい`sessionId`
- Result到達は`result reached`であり、Journey完了ではない
- 明示的完了時だけactive一覧から外す

## 6. 途中しおり

途中しおりはテーマのお気に入りではない。

> 現在のSessionを、入力、位置、Deep round、Breath、Result、Back文脈ごと残し、同じSessionとして再開する機能。

原則：

- 共通Sessionヘッダー右側に置く
- Theme context確定後から明示的終了まで表示
- 最初は手動でしおりを挟む
- 一度保存したSessionは以後自動更新
- 保存後も現在画面に留まる
- raw navigation履歴を保存しない
- 最大3件の`resumeBackFrames`で必要なBack文脈だけを保持
- Breathはアニメーション途中秒数ではなく、そのStepの開始状態から再開

## 7. Free / Pro

NoetuneはSessionへのアクセスを課金しない。

```text
Free = 今日の完全な体験 + 現在のJourney 1件の継続
Pro  = 複数Journey、履歴、時間と端末を越えた個人アーカイブ
```

### Free

- 全テーマ
- 自由入力
- Regular / Deep
- 無制限の完全Session
- Guest local途中しおり1件
- ログイン後cloud active Journey 1件
- その1件の別端末resume
- 完了済み全文履歴は残さない

### Pro

- active Journey最大20件
- 完了Journey archive
- テーマ別履歴
- 複数端末
- 将来のexport / privacy lock

Proは「より深いSession」ではない。継続と文脈保持に対する課金である。

## 8. Data, Privacy and Global Trust

Noetuneは世界を対象とする。ただし、世界向けであることを、全地域へ同時にCloud本文保存と課金を公開することと混同しない。

### 7.1 High Confidentiality User Content

次を一律に**High Confidentiality User Content**として扱う。

- 自由入力テーマ
- Regular / Deepの回答、確定値、draft
- sourceQuote、awareness、本人由来のResult内容
- Session snapshot内の本人文章

内容を解析して機密性を分類するのではなく、最初から高機密として扱う。

### 7.2 不変原則

- しおりを押すまで本人の文章を永続保存しない
- 保存開始と保存先は本人の明示的な意思から始める
- Loginだけを理由にGuest local本文をCloudへ自動送信しない
- 本人の文章を広告、販売、AI学習、プロファイリング、marketing、A/B本文分析へ使用しない
- 本人の文章をanalytics、console、server log、error monitoringへ出さない
- GuestはlocalStorage 1件を正本とする
- localStorageを秘密保管場所とはみなさず、共有端末の注意と削除手段を示す
- CloudはRLSと認証済みidentityで本人所有を強制し、client supplied `user_id`を信用しない
- 壊れたsnapshot、競合データ、上限超過データを自動削除・自動上書きしない
- Cloud失敗前後でlocal copyを失わない
- Account削除時はactive、completed、旧bookmarkを削除する
- 実装していないend-to-end encryptionや「運営者も読めない」を約束しない
- Session保存層は特定vendorへ密結合せず、交換可能なadapter境界を持つ

### 7.3 Global release principle

```text
Stage 1: worldwide Guest local
Stage 2: approved regions / contractsでFree cloud 1件
Stage 3: Pro multiple active / completed archive
Stage 4: region expansion
```

Cloud本文保存、cross-device resume、Pro archive、世界向け有料Cloud機能は、Global Privacy & Security Gate合格後にのみ公開する。

初期公開対象は18歳以上とし、子ども・学校向けとして販売しない。必要以上の生年月日は取得しない。

## 9. 完了と保存

- Result到達時はactive snapshotを維持する
- `v17_result_reached`はcycleごとに1回
- `v17_journey_completed`はsessionIdごとに1回
- 明示的完了時にGuest / Freeはactive全文を削除
- Proはcompleted archiveへ移す
- しおりを外すこととJourneyを完了することを混同しない

## 10. 明確な非目標

- Happiness graph
- Improvement percentage
- Streak / badge / ranking
- AI advice / AI interpretation
- Automatic diagnosis
- Healing guarantee
- Session回数制限
- Deepの有料化
- Legacy flowの大規模整理を現在機能より先に行うこと

## 11. 現在の最優先

1. 新しい問いのフローをv17基盤上で完成させる
2. v17基本フローと既存UXを壊さない
3. Guest local途中しおりの正確な保存・復元
4. Global Privacy & Security GateをCloudより先に通す
5. 認証・課金・RLSの安全性
6. 3言語とmobile QA
7. 段階的な公開・販売・外部検証

将来機能は、公開と外部検証を遅らせない。

## 12. 正本の責務

| ファイル | 正本の責務 |
|---|---|
| [[00 Noetune v17 Master]] | 哲学・最上位原則 |
| [[01 Product, Monetization & Journey]] | UX、Free / Pro、Journey境界 |
| [[02 Technical & Content Specification]] | state、schema、API境界、content |
| [[03 Implementation, QA & Decisions]] | 決定記録、実装規則、QA |
| [[04 Theme Source Database]] | 日本語テーマ本文 |
| [[05 Release Implementation Plan]] | 一時的な実行順 |
| [[06 Current Billing & Auth Snapshot]] | 移行前の事実記録 |
| [[07 追加予定機能]] | 未実装の将来候補 |

ローカルの最新repositoryを実装上の正本とし、仕様判断は本Obsidian setを正本とする。
