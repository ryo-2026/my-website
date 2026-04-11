# Athlete Management

アスリートのトレーニング日報管理・コーチダッシュボードPWAアプリ

**公開URL:** https://ryo-2026.github.io/my-website/

---

## 概要

選手が毎日のトレーニング内容・メンタル・体調を記録し、コーチがリアルタイムで状態を把握できるフィットネス管理アプリです。スマートフォンのホーム画面にインストールして使用できるPWA（Progressive Web App）として動作します。

---

## 機能

### 選手向け
- 今日の日報入力（トレーニング内容・メンタル・体調・気になること・コーチへのメッセージ）
- 過去の日報履歴の閲覧
- 14日間のメンタル／体調トレンドグラフ表示
- プロフィール編集（ロック機能付き）

### コーチ向け
- 全選手の本日の日報状況を一覧表示・絞り込み
- メンタル・体調が低下している選手のアラート通知
- 本日未提出の選手を一覧表示
- 選手ごとの詳細履歴・トレンドグラフ閲覧
- チームPIN管理・学年一括進級

### マスター向け（管理者）
- ユーザーのロール管理（選手 / コーチ / マスター）
- メンバーの追加・削除

---

## 認証フロー

1. Googleアカウントでログイン
2. 新規選手はチームPINを入力して登録完了
3. コーチ・マスターはFirestoreで権限付与

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | React 18 |
| ビルドツール | Vite 5 |
| スタイリング | CSS-in-JS（インラインスタイル） |
| 認証 | Firebase Authentication（Google）|
| データベース | Cloud Firestore |
| PWA | Web App Manifest / Service Worker |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |

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
git add .
git commit -m "変更内容"
git push
```

数分後に https://ryo-2026.github.io/my-website/ へ反映されます。
