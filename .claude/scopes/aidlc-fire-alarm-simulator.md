---
name: fire-alarm-simulator
depth: Standard
keywords: []
description: ブラウザ完結の自動火災報知設備シミュレーターを軽量な標準ワークフローで構築する
skeleton: off
---

# fire-alarm-simulator scope

Web で動作する自動火災報知設備のシミュレーター（3ペイン: 左=感知器/発信器の
階数別一覧、中央=P型受信機、右=非常放送設備）を対象とした custom スコープ。
ARS 44（Standard 帯）だが、コンポーネントが中程度に集中し、チーム・サービス・
デプロイ先といった広がりが無いため、標準帯の軽量側に寄せた 9 実ステージ構成。

ブラウザ完結・単一利用者・バックエンドなし・課金/コンプライアンス/セキュリティ
非該当の教育用ツールであり、影響範囲は低い。既存コードは create-vue の素の
スキャフォールドのみでドメインコードが無いため、`detect` の Brownfield 判定に
かかわらず greenfield として扱う。

## なぜこのステージ、なぜあれを SKIP するか

**EXECUTE（実ステージ 9 + 初期化 3）**

- `intent-capture` / `scope-definition` — レイアウトはタスク文で確定済みだが、
  各サブシステムの再現度・音声の扱い・階数構成が未確定（IAE=0.50 / UA=0.50）。
  ステークホルダー・成功指標・スコープ境界と優先バックログを低コストで確定。
- `rough-mockups` — UI そのものが成果物。3ペイン配置・受信機の操作盤/灯火・
  放送盤表示を実装前に 1 回の設計パスで固定（高精細の `refined-mockups` は過剰）。
- `approval-handoff` — ideation→inception のフェーズゲート。
- `practices-discovery` — テスト方針・カバレッジ基準・CI が皆無（VE=0.62）。
  新規ツールチェーン（vitest 等）を一から選定・確認。
- `requirements-analysis` — 本案件の中核。連動シーケンス（感知器発報→地区音響
  →蓄積時間→第二報/発信器→一斉鳴動→非常放送起動）、P型受信機の挙動、非常放送
  ロジック、エンティティ/状態遷移表を機能仕様として確定。`domain-design` /
  `functional-design` を SKIP する代わりにドメインモデルの深さをここで担保。
- `code-generation` / `build-and-test` — スパイン。テストスイート
  （vitest + @vue/test-utils）とカバレッジ基準を新設し、連動シーケンス
  （二信号・発信器即時・復旧・音響停止）を仕様として固定（VE=0.62 の主要な低減）。
- `ci-pipeline` — CI が皆無。trunk ベース開発で main への push 時に
  型チェック/lint/test を回す 1 ワークフローを新設。

**SKIP**

- `market-research` / `team-formation` — 個人の教育用ツールで市場も
  build-vs-buy 判断も無く、単独/小規模開発でチーム編成も不要。
- `feasibility` — 標準的な Vue SPA + クライアント状態機械で統合制約・規制なし
  （R=0.20）。検証すべき実現性の問いがない。
- `reverse-engineering` — 素のスキャフォールドのみでドメインコードなし。
  greenfield 扱いでステージ条件が非該当。
- `user-stories` — 利用者ペルソナは実質 1 種類で対立ジャーニーがなく、受入基準は
  `requirements-analysis` のシナリオが担保。
- `refined-mockups` — 配置はタスク文で確定済み。`rough-mockups` の 1 パスで十分。
- `domain-design` / `units-generation` / `contract-design` / `delivery-planning`
  / `functional-design` — 単一パッケージ greenfield（CSU=0.35）で実質 1 ユニット
  の密結合フロントエンド。新規コンポーネント構成・ユニット間契約・Bolt
  シーケンスの対象がない。ウォーキングスケルトンも対象外（`skeleton: off`）。
- `nfr-requirements` / `nfr-design` — クライアント完結でセキュリティ/
  スケーラビリティ/信頼性の対象面がない。唯一の品質目標（蓄積時間・音声同期の
  タイミング精度）は `requirements-analysis` の制約 + `practices-discovery` の
  テスト方針に集約。
- `infrastructure-design` および operation フェーズ全ステージ
  （`deployment-pipeline` / `environment-provisioning` / `deployment-execution`
  / `observability-setup` / `incident-response` / `performance-validation` /
  `feedback-optimization`）— 静的ブラウザアプリでデプロイ先・稼働サービス・
  負荷・本番監視がない（R=0.20）。

## Membership

キーワード推論は無効（`keywords: []`）。このスコープは `/aidlc --scope
fire-alarm-simulator` で明示的に選択したときのみ解決される。初期化 3 ステージ、
縮小した ideation セット（`intent-capture` / `scope-definition` /
`rough-mockups` / `approval-handoff`）、inception の `practices-discovery` /
`requirements-analysis`、construction のビルド経路（`code-generation` /
`build-and-test` / `ci-pipeline`）が実行され、それ以外は SKIP。
