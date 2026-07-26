> [!info] Noetune v17 Canonical Documents
> [[00 Noetune v17 Master]] · [[01 Product, Monetization & Journey]] · [[02 Technical & Content Specification]] · [[03 Implementation, QA & Decisions]] · [[04 Theme Source Database]]

# Noetune v17 Master

**Status:** Canonical product constitution
**Updated:** 2026-07-25
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
- v17で完成しているUI、UX、認証、課金、履歴、Session Resume、Localization、Result、Appearanceを維持する
- Session Snapshot、Resume、Bookmarkの既存技術基盤は、authenticated Cloudしおりへ再利用できる資産として保持する
- Guest localしおりは製品権利として廃止し、公開対象から外す
- v18検討から採用するのは、問いの新しいフロー設計だけである
- 新フローはv17へ小さなUnit単位で導入し、既存基盤を無断で再設計しない

この決定より古い「v18を正式ラインとする」記録、およびGuest localしおりを正式公開対象とする記録は履歴であり、現在の仕様ではない。

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

New Flow Unit 3Aとして、Deep A/B交互runtimeを実装済み。Round 1はAで開始し、original theme固定、completed rounds / pendingRound、Deep内Back、No More WordsからBreath、既存Resultへの最小mappingを含む。Deep Snapshot保存、Breath exact resume、Cloud continuityは未実装で、別Unitに残る。

New Flow Unit 3B-1として、Deep Snapshot Schema v1のfoundationを確定した。DeepFlowV1、DeepRoundV1、ResponseValueV1のexact shape、A/B parity、round連番、originalTheme整合、`nextPendingRound`、normalizer / validator、unknown keyのfail-closedを実装・受入済み（commit `88340e5b5e478505ff918c6b7a59215c96e9f49c`）。Deep serializer / restoreは引き続きunsupportedであり、次はNew Flow Unit 3B-2である。

New Flow Unit 3B-2として、Deep response（Question 1 / Question 2）のSnapshot Schema v1 serializer、restore-before-render、draft、Deep内Back、`nextPendingRound` round-trip、Result adapter derived stateを実装・受入した（commit `2f793f42407433db898145bc25e8744e3d08ddfb`）。Breath以降、No More Words後exact resume、Cloud、Guest persistent resumeは未完成である。

Phase 5B-1として、Regular / DeepのBreath Step 1 / Step 2 Snapshot、typed pre-Breath frameによるexact Back、restore-before-render、transient timer除外を実装・受入した（commit `bc6fee1b0b387788b22e84bea49596d8113cdc67`）。Final / Result / Repeat、Cloud、Guest persistent resumeは未完成である。

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

> ログイン済みユーザーが、現在のSessionを入力、位置、Deep round、Breath、Result、Back文脈ごとCloudへ残し、同じSessionとして端末を越えて再開する機能。

原則：

- Guestは永続Bookmark entitlementを持たず、本人の文章をlocalStorageやCloudへ永続保存しない
- 対象Session画面には、Cloud保存の意思を示す共通の小さなしおりCTAをGuestにも表示できる
- GuestがそのCTAを押しただけでは保存せず、まずCloud保存の説明とGoogle Loginへ進む
- Google LoginだけではGuest runtime本文を送信せず、Login後に本人が改めて保存を確認した時だけ最初のCloud recordを作る
- Guestはブラウザやタブを閉じた後のresumeを保証しない
- Free loginはCloud active Journey 1件
- ProはCloud active Journey最大50件
- 最初のCloud保存は本人の明示操作から始める
- LoginしただけではGuest runtime本文をCloudへ送信しない
- 一度保存したSessionは同じ`sessionId`で以後自動更新する
- 保存後も現在画面に留まる
- raw navigation履歴を保存しない
- 最大3件の`resumeBackFrames`で必要なBack文脈だけを保持
- Breathはアニメーション途中秒数ではなく、そのStepの開始状態から再開
- Cloud公開前にGlobal Privacy & Security Gateを通す

## 7. Guest / Free / Pro

NoetuneはSessionへのアクセスを課金しない。

```text
Guest = ログインなしで、完全なSessionを何度でも使える。保存はしない
Free  = Guestの全体験 + Cloud active Journey 1件
Pro   = Cloud active Journey最大50件 + 完了履歴と個人アーカイブ
```

### Guest

- ログイン不要
- 全テーマ
- 自由入力
- Regular / Deep
- 無制限の完全Session
- しおりなし
- 本人の文章を永続保存しない
- ブラウザやタブを閉じた後のresumeを保証しない

### Free login

- Guestの全機能
- Googleログイン
- Cloud active Journey 1件
- その1件を同じアカウントの別端末からresume
- 完了済み全文履歴は残さない
- LoginだけではCloud本文保存を開始しない

### Pro

- Cloud active Journey最大50件
- 完了Journey archive
- テーマ別履歴
- 複数端末
- 将来のexport / privacy lock

Proは「より深いSession」ではない。継続と文脈保持に対する課金である。

## 8. Data, Privacy and Global Trust

Noetuneは世界を対象とする。ただし、世界向けであることを、全地域へ同時にCloud本文保存と課金を公開することと混同しない。

### 8.1 High Confidentiality User Content

次を一律に**High Confidentiality User Content**として扱う。

- 自由入力テーマ
- Regular / Deepの回答、確定値、draft
- sourceQuote、awareness、本人由来のResult内容
- Session snapshot内の本人文章

内容を解析して機密性を分類するのではなく、最初から高機密として扱う。

### 8.2 不変原則

- Guestの本人文章を永続保存しない
- Cloud保存開始と保存先は本人の明示的な意思から始める
- Loginだけを理由にGuest runtime本文をCloudへ自動送信しない
- 本人の文章を広告、販売、AI学習、プロファイリング、marketing、A/B本文分析へ使用しない
- 本人の文章をanalytics、console、server log、error monitoringへ出さない
- authenticated local cacheを使う場合もGuest entitlementや永続正本として扱わない
- localStorageを秘密保管場所とはみなさず、authenticated cacheには共有端末の注意と削除手段を示す
- CloudはRLSと認証済みidentityで本人所有を強制し、client supplied `user_id`を信用しない
- 壊れたsnapshot、競合データ、上限超過データを自動削除・自動上書きしない
- Cloud失敗前後で認証済みユーザーの安全なpending copyを失わない
- Account削除時はactive、completed、旧bookmark、authenticated cacheを削除する
- 実装していないend-to-end encryptionや「運営者も読めない」を約束しない
- Session保存層は特定vendorへ密結合せず、交換可能なadapter境界を持つ

### 8.3 Global release principle

```text
Stage 1: worldwide Guest — 完全Session、永続保存なし
Stage 2: approved regions / contractsでFree cloud active 1件
Stage 3: Pro cloud active最大50件 / completed archive
Stage 4: region expansion
```

Cloud本文保存、cross-device resume、Pro archive、世界向け有料Cloud機能は、Global Privacy & Security Gate合格後にのみ公開する。

初期公開対象は18歳以上とし、子ども・学校向けとして販売しない。必要以上の生年月日は取得しない。

## 9. 完了と保存

- Guestはruntime memory上でSessionを進め、明示的完了または離脱後に永続記録を残さない
- Cloudしおり利用中はResult到達時もactive snapshotを維持する
- `v17_result_reached`はcycleごとに1回
- `v17_journey_completed`はsessionIdごとに1回
- 明示的完了時にFreeはactive全文を削除
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
3. Guest localしおり、Guest Resume、旧Result大Bookmark CTAを公開対象から無効化した状態を維持する
4. Resultを含む対象Session画面へ共通の小さなCloud保存CTAを導入し、Guestの明示的保存意図からGoogle Loginへ進む静かな導線を完成させる
5. Global Privacy & Security GateをCloud本文保存の有効化より先に通す
6. Free cloud 1件 / Pro cloud 50件の認証・RLS・削除・上限契約を実装する
7. 3言語とmobile QA
8. 段階的な公開・販売・外部検証

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
