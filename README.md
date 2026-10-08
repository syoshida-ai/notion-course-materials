# デジライズAIスクール Notion講座 資料リスト

各回の投影資料（配布版スライド）・手順書・宿題・特典をまとめた一覧ページ。静的サイトで、Vercel に置く。

## 回を追加する手順

1. 配布版スライドを書き出す（投影版は手元の TalkSlides のまま。配布版は埋め込みブラウザ・声・発表者画面・台本を外したもの）
   ```
   python3 ~/03_dev/01_apps/talk-slides/tools/talkslides.py build <deck.json> --dist --out decks/0N
   ```
2. バナーを `assets/banners/notion0N.jpg` に置く
3. `sessions.js` のその回を `published: true` にして、`banner` と `items`（投影資料・手順書・宿題・特典）を書く
4. commit → push（Vercel が自動で公開）
