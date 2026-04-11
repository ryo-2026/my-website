# Athlete Management

選手とコーチをつなぐ、トレーニング日報管理PWAアプリ

**公開URL:** https://ryo-2026.github.io/my-website/

---

## 概要

選手が毎日のトレーニング内容・メンタル・体調を記録し、コーチがリアルタイムで状態を把握できるチーム管理アプリです。スマートフォンのホーム画面にインストールして使えるPWA（Progressive Web App）として動作し、ネイティブアプリに近い体験を提供します。

---

## 主な機能

### 選手向け
- 今日の日報入力（トレーニング内容・メンタル・体調・気になること・コーチへのメッセージ）
- 過去の日報履歴の閲覧
- 14日間のメンタル／体調トレンドグラフ（SVGで自前実装）
- プロフィール編集（ロック機能・変更申請フロー付き）

### コーチ向け
- 全選手の本日の日報状況を一覧表示・絞り込み
- メンタル・体調スコアが低下している選手のアラート通知
- 本日未提出の選手を一覧表示
- 選手ごとの詳細履歴・トレンドグラフ閲覧
- チームPIN管理・学年一括繰り上げ

### マスター（管理者）向け
- ユーザーロール管理（選手 / コーチ / マスター）
- メンバーの追加・除名・コーチ任命／解任

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | React 18 |
| ビルドツール | Vite 5 |
| スタイリング | CSS-in-JS（インラインスタイル） |
| 認証 | Firebase Authentication（Googleログイン）|
| データベース | Cloud Firestore（リアルタイム同期）|
| セキュリティ | Web Crypto API（SHA-256 + ソルトによるPINハッシュ化）|
| PWA | Web App Manifest / Service Worker |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |

---

## 設計上のポイント

### リアルタイム同期
Firestoreの `onSnapshot` を使い、選手の日報提出・プロフィール更新がコーチ画面へ即座に反映されます。コーチ画面では全選手のデータを `Promise.all` で並列取得することでパフォーマンスを確保しています。

### ロールベースのアクセス制御
`athlete` / `coach` / `master` の3段階ロールをFirestoreのユーザードキュメントで管理し、Reactのルーティング層でロールに応じた画面を出し分けています。新規ユーザーはチームPINを入力することで選手として登録されます。

### PINのセキュアな保存
チーム参加PINは平文でなく、ブラウザ標準の **Web Crypto API**（`crypto.subtle`）を用いてSHA-256＋ランダムソルトでハッシュ化した上でFirestoreに保存しています。平文PINはいかなるタイミングでも保存されません。

### プルトゥリフレッシュ（カスタム実装）
ネイティブアプリ的な操作感を実現するため、`touchstart` / `touchmove` / `touchend` イベントをゼロから実装。引っ張り量に応じたスピナーのアニメーションとスクロール干渉の制御を行っています。

### SVGトレンドグラフ
外部グラフライブラリを使わず、SVGを直接描画する `TrendGraph` コンポーネントを実装。14日分のメンタル・体調スコアを折れ線グラフで可視化しています。

---

## 認証フロー

```
Googleログイン
  └─ Firestoreにユーザー情報あり → ロールに応じた画面へ
  └─ 情報なし（新規）          → チームPIN入力 → 選手として登録
```

コーチ・マスターはFirestoreで直接ロールを付与します。

---

## ローカル開発環境のセットアップ

### 必要なもの
- Node.js 20 以上
- Firebase プロジェクト（[Firebase Console](https://console.firebase.google.com/)）

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/ryo-2026/my-website.git
cd my-website

# 依存関係をインストール
npm install
```

### 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、Firebase の認証情報を入力します。

```bash
cp .env.example .env.local
```

`.env.local` を編集：

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173/my-website/` を開きます。

### その他のコマンド

```bash
# 本番ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

---

## デプロイ

### GitHub Secrets の設定

リポジトリの **Settings → Secrets and variables → Actions** に以下のシークレットを登録してください。

| シークレット名 | 内容 |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API キー |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth ドメイン |
| `VITE_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage バケット |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

### 自動デプロイ

`main` ブランチに push すると GitHub Actions が自動でビルド＆デプロイします。

```bash
git push origin main
```

数分後に https://ryo-2026.github.io/my-website/ へ反映されます。
