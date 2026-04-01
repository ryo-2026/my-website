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

### コーチ向け
- 全選手の本日の日報状況を一覧表示
- メンタル・体調が低下している選手のアラート通知
- 本日未提出の選手を一覧表示
- 選手ごとの詳細履歴・トレンドグラフ閲覧

---

## デモアカウント

ログイン画面の「DEMO QUICK LOGIN」からワンタップでログインできます。

| ユーザーID | パスワード | ロール | 名前 |
|---|---|---|---|
| coach1 | coach123 | コーチ | 鈴木 コーチ |
| a1 | pass1 | 選手 | 田中 翼（陸上） |
| a2 | pass2 | 選手 | 山本 海斗（水泳） |
| a3 | pass3 | 選手 | 佐藤 凛（体操） |

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | React 18 |
| ビルドツール | Vite 5 |
| スタイリング | CSS-in-JS（インラインスタイル） |
| データ保存 | localStorage |
| PWA | Web App Manifest / Service Worker |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |

---

## ローカル開発環境のセットアップ

### 必要なもの
- Node.js 20 以上

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/ryo-2026/my-website.git
cd my-website

# 依存関係をインストール
npm install

# 開発サーバーを起動
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

`main` ブランチに push すると GitHub Actions が自動でビルド＆デプロイします。

```bash
git add .
git commit -m "変更内容"
git push
```

数分後に https://ryo-2026.github.io/my-website/ へ反映されます。
