# notion-course-materials

デジライズAIスクール Notion講座の資料リスト（静的サイト）。GitHub `syoshida-ai/notion-course-materials`（public）→ Vercel。

- 構成: `index.html`（一覧）・`sessions.js`（各回のデータ）・`decks/0N/`（配布版スライド。TalkSlides の `build --dist` の出力。手で編集しない）・`assets/`
- 回の追加手順は README.md
- 公開リポジトリなので、台本・参加者の個人情報・社内情報を入れない。配布版スライドは `build --dist` で台本（talk）・合図（cues）を外してから置く
- push は repo ローカルの credential.helper で syoshida-ai を使う（`~/.claude/projects/-Users-soma/memory/github-two-accounts-digirise.md`）
- 確認: `python3 -m http.server 8792`（~/.claude/launch.json の notion-course-materials）
