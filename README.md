# 平面図エディター

住宅平面図をアップロードし、点検箇所や施工内容を示すマーカーを配置して、JPEG画像としてエクスポートできるウェブアプリケーションです。

## 主な機能

- **平面図のアップロード:** 画像ファイルを読み込み、編集のベースとして使用
- **マーカー配置:** 事前に定義された複数のマーカー（撮影箇所、基礎線、通気口など）をドラッグ＆ドロップで簡単配置
- **マーカー編集:** 配置したマーカーの移動、回転、サイズ変更が可能
- **JPEGエクスポート:** 作成した平面図を高品質なJPEG画像としてダウンロード
- **JSONバックアップ:** 編集状態を JSON で保存し、あとから復元可能
- **写真確認:** 配置済み写真を図面と対応づけて一覧確認可能

## 技術スタック

- **フロントエンド:** React, TypeScript
- **バックエンド:** なし（Vite 開発サーバー）
- **スタイリング:** Tailwind CSS (CDN)
- **画像エクスポート:** html2canvas (CDN)
- **配布形態:** ローカル利用 / 任意の静的ホスティング

## セットアップと実行

### ローカルでの実行

1.  **Node.jsのインストール:** Node.js (バージョン18以降推奨) がインストールされていることを確認してください。
2.  **依存関係のインストール:** プロジェクトのルートディレクトリで以下のコマンドを実行します。
    ```bash
    npm install
    ```
3.  **起動:** 以下のコマンドで開発サーバーを起動します。
    ```bash
    npm start
    ```
4.  ブラウザで `http://localhost:3000` を開きます。

## 補助コマンド

```bash
npm run typecheck
npm run build
npm run preview
npm run apk:debug
```

## Android APK 配布

- ローカルで APK を作るには `npm run apk:debug` を実行します。
- 生成物は `android/app/build/outputs/apk/debug/app-debug.apk` に出力されます。
- GitHub Releases 配布は `.github/workflows/android-release.yml` で自動化しています。
- `v1.1.1` のようなタグを push すると、GitHub Actions が APK を生成し、Release に `floor-plan-editor-v1.1.1.apk` を添付します。
- 現状は debug 署名 APK を配布します。Android 端末には通常どおりダウンロードしてインストールできます。

## 実運用メモ

- カメラ・マイクを使う場合は `localhost` か HTTPS で開いてください。
- 右側の `稲妻` ボタンで JPEG 出力、`下向き矢印` ボタンで JSON バックアップを保存できます。
- `写真` ボタンの横に未配置数が出ます。配置済み写真は `レポート` の下の写真ボタンから確認できます。
- 旧版 JSON に `blob:` URL が入っている場合、画像は復元できません。今回以降に保存した JSON は持ち運べます。

## GitHub Release 作成

1. `git push origin codex/apk-release`
2. `git tag v1.1.1`
3. `git push origin v1.1.1`
4. GitHub の Release 一覧に APK 添付済みの公開リリースが自動作成されます。
