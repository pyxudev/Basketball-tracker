# Basketball Tracker

## Overview
バスケの自己練・試合データを記録する Web アプリです。
- メイン機能：練習時間計測、練習メニュー登録、試合データ登録、グラフ化、AIコーチング、データエクスポート

## 使用方法
### Webからアクセス
https://basketball-tracker.lowlevelengineers.com/

### ローカル環境
本リポジトリをクローンし、フォルダ内で `pnpm run dev` を実行

## システム構成
- アプリ本体：React + Vite
- データの保存：localstorage
- AI：ClaudeChat、Ollama