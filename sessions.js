// 資料リストのデータ。回を追加するときはここに1件足す（並び順は画面側で日付順にする）。
// published: false の回は「これからの予定」に日付とテーマだけ出す。
window.SESSIONS = [
  {
    no: 1, date: "2026-10-30", title: "Notionの始め方", sub: "初期設定から「自分のホーム」づくりまで",
    banner: "assets/banners/notion01.jpg", published: true,
    items: [
      { kind: "投影資料", label: "第1回 投影資料（スライド86枚）", url: "decks/01/", note: "→キーまたはクリックで進みます" },
      { kind: "手順書", label: "自分のホームを作る手順書", url: "https://digirise.notion.site/Notion-1-3f21fda80e768107bb73e320082171aa", note: "5ステップ・スクショつき（約15分）" },
      { kind: "宿題", label: "自分のホームを作る", note: "締め切りは第2回 11/12（木）20:00まで。できたらDiscordでシェア" },
      { kind: "特典", label: "ブロック図鑑とショートカット", url: "https://digirise.notion.site/Notion-1-3f21fda80e76815fa4abe732584b9e83", note: "「/」で出せるブロック10個を、機能と活用事例で" },
    ],
  },
  { no: 2, date: "2026-11-12", title: "ページを使いこなす", published: false },
  { no: 3, date: "2026-11-26", title: "はじめてのデータベース", published: false },
  { no: 4, date: "2026-12-10", title: "ビューで見せ方を変える", published: false },
  { no: 5, date: "2026-12-17", title: "データベースをつなげる", published: false },
  { no: 6, date: "2027-01-07", title: "自分だけのワークスペースを設計する", published: false },
];
