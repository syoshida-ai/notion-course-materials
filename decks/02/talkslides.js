/* TalkSlides エンジン：window.DECK（deck.json の中身）を描画し、キー・クリッカー・声で進める。
 * キー: → ↓ Space PageDown=次 / ← ↑ PageUp=前 / Home End / F=全画面 / V=声ON/OFF / P=発表者画面 / N=Notionを開閉 / 数字+Enter=ジャンプ */
(() => {
  "use strict";
  const deck = window.DECK;
  Object.entries(deck.theme || {}).forEach(([k, v]) => document.documentElement.style.setProperty(`--${k}`, v));  // 例 {"accent": "#7A4BFF"}
  const DIST = !!deck.dist;  // 配布版：埋め込みブラウザ・Notion・声・発表者画面を使わない
  const W = 1920, H = 1080;
  const stage = document.getElementById("stage");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const md = (s) => esc(s).replace(/==(.+?)==/g, '<span class="mark">$1</span>').replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>").replace(/\\n|&lt;br&gt;/g, "<br>");  // ==強調== で下線マーカー
  let n = 0;  // アニメーションの順番カウンタ
  const a = (kind = "up") => `data-a="${kind}" style="--i:${n++}"`;

  // ---------- レイアウト ----------
  const foot = (s, i) => `<div class="foot"><span>${esc(deck.title)}</span><span>${i + 1} / ${deck.slides.length}</span>${deck.logo ? `<img src="${esc(deck.logo)}" alt="">` : ""}</div>`;
  const kicker = (s) => s.band ? `<div class="kicker" ${a("fade")}><span class="dot"></span>${esc(s.band)}</div>` : "";
  const icons = (s) => s.icons?.length ? `<div class="icons">${s.icons.map((x) => `<span class="ic" ${a("pop")}>${x.img ? `<img src="${esc(x.img)}" alt="">` : `<i>${x.emoji || ""}</i>`}${esc(x.t || "")}</span>`).join("")}</div>` : "";
  const notes = (s) => s.notes?.length ? `<div class="notes">${s.notes.map((x) => `<div class="note" ${a()}>${md(x)}</div>`).join("")}</div>` : "";
  // 画像か動画（.mp4/.webm は音なし・繰り返しで流す。スライドを開くたびに頭から）
  const media = (src, attr = "") => /\.(mp4|webm)$/i.test(src || "") ? `<video src="${esc(src)}" muted loop playsinline preload="auto" ${attr}></video>` : `<img src="${esc(src)}" ${attr} alt="">`;
  // 線のアイコン（Lucide 由来・ISC）。items の icon: "名前" で使う。線を描きながら出る
  const ICON = {
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    click: '<path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/>',
    heading: '<path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/>',
    grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
    swap: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    toggle: '<path d="m3 8 4 4-4 4"/><path d="M11 6h10M11 12h10M11 18h10"/>', columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
    color: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    divider: '<path d="M3 12h18"/><path d="M8 6h8M8 18h8"/>', at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', back: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    page: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8M8 17h8M8 9h2"/>',
    block: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>', slash: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m15 7-6 10"/>',
    home: '<path d="M3 10 12 3l9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>', chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>', todo: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    widen: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>', image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    left: '<path d="M21 6H3M15 12H3M17 18H3"/>', search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    empty: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    money: '<circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2.2 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5"/>',
    play: '<path d="M6 3l14 9-14 9z"/>', target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  };
  const ico = (name, cls = "ico") => ICON[name] ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name].replace(/<(path|circle|rect)\b/g, '<$1 pathLength="1"')}</svg>` : "";
  const mark = (it) => it.icon ? ico(it.icon) : it.emoji ? `<div class="emoji">${it.emoji}</div>` : "";  // アイコン優先、無ければ絵文字

  const L = {
    cover: (s) => `<div class="slide cover">${deck.logo ? `<img class="logo" src="${esc(deck.logo)}" ${a("fade")} alt="">` : ""}
      <div class="series" ${a("fade")}>${esc(s.kicker || "")}</div>
      <div class="title" ${a()}>${md(s.title)}</div><div class="sub" ${a()}>${md(s.sub || "")}</div>
      <div class="meta" ${a("fade")}><span>${esc(s.date || "")}</span><span>${esc(s.place || "")}</span></div>
      ${doodle(s.doodle || "page")}</div>`,
    statement: (s) => `<div class="slide mid">${kicker(s)}<div class="msg" ${a()}>${md(s.message)}</div>${notes(s)}</div>`,
    question: (s) => `<div class="slide mid">${kicker(s)}<div class="msg center" ${a()}>${md(s.message)}</div>${icons(s)}
      ${s.sub ? `<div class="ask" ${a("pop")} style="margin-top:70px">${md(s.sub)}</div>` : ""}</div>`,
    parts: (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()}>${md(s.message)}</div>
      <div class="blocks" style="grid-template-columns:repeat(${s.items.length},1fr)">${s.items.map((it, k) =>
        `<div class="block${it.hl ? " hl" : ""}" ${a("pop")}>${it.img ? media(it.img, 'class="cimg"') : ""}${mark(it)}<div class="bt">${md(it.t)}</div><div class="bd">${md(it.d || "")}</div></div>`).join("")}</div></div>`,
    compare: (s) => L.parts({ ...s, items: [s.left, s.right].map((c, k) => ({ emoji: c.emoji, icon: c.icon, img: c.img, t: c.title, d: c.items.join("<br>"), hl: k === 0 })) })
      .replace(/&lt;br&gt;/g, "<br>"),
    track: (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()}>${md(s.message)}</div>
      <div class="track">${s.items.map((it) => `<div class="t${it.on ? " on" : ""}" data-a="up" style="--i:${n++};flex:${it.w || 1}"><i class="bar"></i>${it.icon ? ico(it.icon) : ""}<div class="n">${esc(it.n)}</div><div class="l">${esc(it.l)}</div>${it.d ? `<ul class="d">${it.d.map((x) => `<li>${md(x)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div></div>`,
    step: (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:60px">${md(s.message)}</div>
      <div class="split${s.stack ? " stack" : ""}"><div class="steps" ${s.stack ? `style="grid-template-columns:repeat(${s.actions.length},1fr)"` : ""}>${s.time ? `<div class="time" ${a("fade")}>目安 ${esc(s.time)}</div>` : ""}${s.actions.map((x, k) =>
        `<div class="step" ${a()}><b>${k + 1}</b><span>${md(x)}</span></div>`).join("")}</div>${shot(s)}</div></div>`,
    screenshot: (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:56px">${md(s.message)}</div>
      <div class="split" style="grid-template-columns:1fr">${shot(s)}</div>${s.source ? `<div class="src">${esc(s.source)}</div>` : ""}</div>`,
    notion: (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:56px">${md(s.message)}</div>
      <div class="browser" ${a("pop")}><div class="bar"><i></i><i></i><i></i><span class="url">${esc(s.notion?.url || "notion.so")}</span></div>
      <div class="body">ここでNotionを開いて実演します<span class="key">N キー／合図の言葉で開く・閉じる</span></div></div></div>`,
  };
  // 連続講座の地図：バナー付きカードを1本の線でつなぐ（今の回を強調、済んだ回は✓）
  L.series = (s) => {
    // 3枚×2段。上段も下段も左→右（1→2→3、4→5→6）。右端から左下へ折り返し、6の先は「つづく」
    const on = s.items.findIndex((x) => x.on);
    const P = "M240 95 H1320 C1520 95 1520 220 1240 220 H380 C100 220 100 345 240 345 H1500";
    return `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:58px">${md(s.message)}</div>
      <div class="snake"><svg class="rail" viewBox="0 0 1620 500" preserveAspectRatio="none" aria-hidden="true">
        <path class="base" d="${P}"/><path class="done" pathLength="100" style="--p:${on < 0 ? 0 : [4, 13, 22, 62, 72, 82][on]}" d="${P}"/>
        <path class="base" d="M1500 345 l-26 -16 M1500 345 l-26 16"/></svg>
      ${s.more === "" ? "" : `<div class="more" ${a("fade")}>${esc(s.more ?? "つづく…")}</div>`}
      ${s.items.map((it, k) => `<div class="ep${it.on ? " on" : ""}${it.done ? " done" : ""}" ${a("pop")} style="--i:${n++};grid-column:${k % 3 + 1};grid-row:${Math.floor(k / 3) + 1}">
        ${it.img ? `<img src="${esc(it.img)}" alt="">` : ""}<div class="node">${it.done ? "✓" : esc(it.n)}</div>
        <div class="et"><div class="ed">${esc(it.date || "")}</div>${md(it.t)}${it.tag ? `<div class="tag">${esc(it.tag)}</div>` : ""}</div></div>`).join("")}</div></div>`;
  };
  // クイズ：1回目の「次へ」で正解を表示、2回目で次のスライド
  L.quiz = (s) => `<div class="slide quiz">${kicker(s)}<div class="msg" ${a()} style="font-size:58px">${md(s.message)}</div>
      <div class="opts" style="grid-template-columns:repeat(${s.options.length},1fr)">${s.options.map((o, k) =>
        `<div class="opt${o.ok ? " ok" : ""}" ${a("pop")}><b>${"ABCD"[k]}</b><span>${md(o.t)}</span></div>`).join("")}</div>
      <div class="qrow"><div class="hint" ${a("fade")}>${md(s.ask || "チャットに A・B・C で答えてください")}</div><button class="reveal-btn" ${a("fade")}>答えを見る →</button></div>
      ${s.explain ? `<div class="explain">${md(s.explain)}</div>` : ""}</div>`;
  // 場面の区切り（「次は〇〇について話します」）
  L.section = (s) => `<div class="slide section"><div class="secno" ${a("fade")}>PART ${String(s.no).padStart(2, "0")} / ${String(s.total).padStart(2, "0")}</div>
      <div class="sectitle" ${a()}>${md(s.title)}</div><div class="secsub" ${a("fade")}>${md(s.sub || "")}</div>
      <div class="secbar">${Array.from({ length: s.total }, (_, k) => `<i class="${k + 1 < s.no ? "done" : k + 1 === s.no ? "on" : ""}"></i>`).join("")}</div></div>`;
  // 自己紹介
  L.profile = (s) => `<div class="slide">${kicker(s)}<div class="prof">
      <img class="face" src="${esc(s.photo)}" ${a("pop")} alt="">
      <div class="pinfo"><div class="role" ${a("fade")}>${md(s.role || "")}</div><div class="pname" ${a()}>${md(s.name)}</div>
      <div class="facts">${s.facts.map((f) => `<div class="block" ${a("pop")}>${f.emoji ? `<div class="emoji">${f.emoji}</div>` : ""}<div class="bt">${md(f.t)}</div><div class="bd">${md(f.d || "")}</div></div>`).join("")}</div></div></div></div>`;
  // 目次
  L.toc = (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:58px">${md(s.message)}</div>
      <div class="toc${s.list ? " list" : s.items.length > 5 ? " two" : ""}${s.items.length > 10 ? " many" : ""}">${s.items.map((it, k) => `<div class="tc${it.on ? " on" : ""}" ${a("up")}><div class="tn">${String(k + 1).padStart(2, "0")}</div>${it.icon ? ico(it.icon) : ""}
        <div><div class="tt">${md(it.t)}</div><div class="td">${md(it.d || "")}</div></div><div class="tm">${esc(it.m || "")}</div></div>`).join("")}</div></div>`;
  // QRコード（アンケート等）
  L.qr = (s) => `<div class="slide">${kicker(s)}<div class="live-l"><div class="msg" ${a()}>${md(s.message)}</div>${notes(s)}</div>
      <div class="qrcard" ${a("pop")}><img src="${esc(s.qr)}" alt=""><div class="qurl">${esc(s.url)}</div><div class="qcap">${md(s.cap || "スマホのカメラで読み取ってください")}</div></div></div>`;
  // スクショを並べる（キャプション・出典つき）
  L.gallery = (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:54px">${md(s.message)}</div>${icons(s)}
      <div class="gallery" style="grid-template-columns:${s.cols || `repeat(${s.shots.length},1fr)`}">${s.shots.map((g) =>
        `<figure ${a("pop")}><div class="frame">${g.img ? media(g.img, `style="object-fit:${g.fit || "contain"}"`) : `<div class="ph">［画像］${esc(g.cap)}</div>`}</div>
        <figcaption><b>${md(g.cap || "")}</b>${g.src ? `<span>${esc(g.src)}</span>` : ""}</figcaption></figure>`).join("")}</div>
      ${s.note ? `<div class="gnote" ${a("fade")}>${md(s.note)}</div>` : ""}</div>`;
  // Notion風の表
  L.table = (s) => `<div class="slide mid">${kicker(s)}<div class="msg" ${a()} style="font-size:54px">${md(s.message)}</div>${icons(s)}
      <div class="ntable" ${a("pop")}><div class="nrow nhead">${s.cols.map((c) => `<div>${md(c)}</div>`).join("")}</div>
      ${s.rows.map((r, k) => `<div class="nrow${s.hl === k ? " hl" : ""}" ${a("up")}>${r.map((c) => `<div>${cell(c)}</div>`).join("")}</div>`).join("")}</div>
      ${s.source ? `<div class="src">${esc(s.source)}</div>` : ""}</div>`;
  // 表の評価記号（◎○△✕）を色つきの記号＋言葉にする（パッと見で分かるように）
  const MARK = { "◎": ["best", "とても得意"], "○": ["good", "できる"], "△": ["fair", "苦手"], "✕": ["none", "できない"], "×": ["none", "できない"] };
  const cell = (c) => {
    const m = MARK[String(c).trim()[0]];
    if (!m) return md(c);
    const rest = String(c).trim().slice(1).trim();
    return `<span class="mk ${m[0]}"><i></i><b>${m[1]}</b></span>${rest ? `<span class="mk-note">${md(rest)}</span>` : ""}`;
  };
  // カードを格子に並べる（4〜6枚）
  L.cards = (s) => `<div class="slide mid">${kicker(s)}<div class="msg" ${a()} style="font-size:54px">${md(s.message)}</div>${icons(s)}
      <div class="cards${s.tallImg ? " tall" : ""}" style="grid-template-columns:repeat(${s.colsN || 3},1fr)">${s.items.map((it) =>
        `<div class="block${it.hl ? " hl" : ""}" ${a("pop")}>${it.img ? media(it.img, 'class="cimg"') : ""}${it.keys ? `<div class="kbd">${it.keys.map((k) => `<div class="krow">${k.slice(0, -1).map((x) => `<kbd>${esc(x)}</kbd>`).join("<em>＋</em>")}<span>${esc(k[k.length - 1])}</span></div>`).join("")}</div>` : ""}${mark(it)}
        <div class="bt">${md(it.t)}</div><div class="bd">${md(it.d || "")}</div></div>`).join("")}</div></div>`;
  // 1枚のスクショを大きく見せる（左に文字、右に画像）
  L.showcase = (s) => `<div class="slide${s.tall ? " sc-tall" : ""}">${kicker(s)}<div class="live-l"><div class="msg" ${a()}>${md(s.message)}</div>${notes(s)}</div>
      <figure class="showcase${s.tall ? " tall" : ""}" ${a("pop")}><div class="frame">${media(s.shot.img)}</div>
      <figcaption><b>${md(s.shot.cap || "")}</b>${s.shot.src ? `<span>${esc(s.shot.src)}</span>` : ""}</figcaption></figure></div>`;
  // 機能紹介：上に1行メッセージ、左に要点、右に大きなスクショ
  L.feature = (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:56px">${md(s.message)}</div>
      <div class="feat${s.wide ? " wide" : ""}"><div class="fnotes">${(s.notes || []).map((x) => `<div class="fn" ${a()}>${md(x)}</div>`).join("")}
      ${s.qr ? `<div class="fqr" ${a("pop")}><img src="${esc(s.qr)}" alt=""><div><b>${esc(s.url || "")}</b><span>${md(s.cap || "スマホのカメラで読み取ってください")}</span></div></div>` : ""}</div>
      <figure ${a("pop")}><div class="frame">${media(s.shot.img)}</div>
      <figcaption><b>${md(s.shot.cap || "")}</b>${s.shot.src ? `<span>${esc(s.shot.src)}</span>` : ""}</figcaption></figure></div></div>`;
  // 区切り：ここまでできたら OK（チェック一覧）＋「次は」。右に完成画面を置ける
  const CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
  L.checkpoint = (s) => `<div class="slide ckp${s.image ? " img" : ""}">${kicker(s)}<div class="ck-l">
      <div class="ck-badge" ${a("pop")}>${CHECK}<span>${esc(s.badge || "CHECK POINT")}</span></div>
      <div class="msg" ${a()}>${md(s.message)}</div>
      <ul class="ck-list">${(s.done || []).map((x) => `<li ${a()}><i>${CHECK}</i><span>${md(x)}</span></li>`).join("")}</ul></div>
      ${s.image ? `<figure class="ck-img" ${a("pop")}>${media(s.image)}</figure>` : ""}
      ${s.next ? `<div class="ck-next" ${a()}><span>次は</span><b>${md(s.next)}</b><em>→</em></div>` : ""}</div>`;
  L.live = (s) => `<div class="slide lv${s.full ? " full" : ""}">${kicker(s)}<div class="live-l"><div class="msg" ${a()}>${md(s.message)}</div>
      ${(s.actions || []).map((x, k) => `<div class="step" ${a()}><b>${k + 1}</b><span>${md(x.replace(/（[^）]*赤枠[^）]*）/g, ""))}</span></div>`).join("")}
      ${notes(s)}${s.shot ? `<figure class="lshot" ${a("pop")}><img src="${esc(s.shot.img)}" alt=""><figcaption>${md(s.shot.cap || "")}</figcaption></figure>` : ""}</div></div>`;
  const shot = (s) => `<div class="shot" ${a("pop")}>${s.image ? media(s.image) : `<div class="ph">［画像］${esc(s.visual || "スクリーンショット")}</div>`}</div>`;
  const doodle = (kind) => `<svg class="doodle" viewBox="0 0 560 560" aria-hidden="true">
    <rect class="draw" style="--len:1900" x="90" y="60" width="380" height="440" rx="22"/>
    <path class="draw" style="--len:300" d="M140 140 h220"/><path class="draw" style="--len:300" d="M140 200 h280"/>
    <rect class="draw" style="--len:120" x="140" y="252" width="26" height="26" rx="5"/><path class="draw" style="--len:300" d="M190 265 h200"/>
    <rect class="draw" style="--len:120" x="140" y="312" width="26" height="26" rx="5"/><path class="draw" style="--len:300" d="M190 325 h160"/>
    <path class="draw" style="--len:900" d="M140 400 h280 v60 h-280 z"/></svg>`;

  // ---------- 描画 ----------
  stage.innerHTML = deck.slides.map((s, i) => { n = 0; return (L[s.layout] || L.statement)(s).replace(/<\/div>$/, `${s.layout === "cover" ? "" : foot(s, i)}</div>`); }).join("");
  const slides = [...stage.children];
  const WEB_RECT = [560, 64, 1336, 910];  // live レイアウトの既定位置（1920x1080 座標）。画面の約3/4をブラウザに使う
  const FULL_RECT = [60, 300, 1800, 670];  // live の full：見出しの下を全部ブラウザにする
  const web = document.createElement("div");
  web.id = "web";
  web.innerHTML = `<div class="wbar"><i></i><i></i><i></i><button data-w="back" title="戻る">←</button><button data-w="reload" title="再読み込み">↻</button>
    <span class="wname">Notion（実際の画面）</span><input id="wurl" spellcheck="false" hidden><button data-w="max" title="大きく / 戻す（B）">⤢</button></div>
    <div class="whint">埋め込みブラウザを表示できません。<br>Chrome の拡張「TalkSlides Embed」を chrome://extensions で有効化（または ↻ 再読み込み）してから、このページを再読み込みしてください。<br>N キーで Notion を別ウィンドウで開けます。</div>
    <iframe id="wframe" allow="clipboard-read; clipboard-write; fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  if (!DIST) document.body.appendChild(web);  // 拡大縮小される stage の外に置く（iframe を等倍で描画し、文字のにじみと操作のずれを防ぐ）
  const wframe = web.querySelector("#wframe"), wurl = web.querySelector("#wurl");
  let webMax = false, webRect = WEB_RECT;
  const loadWeb = (url) => { if (url && wframe.dataset.src !== url) { wframe.dataset.src = url; wframe.src = url; wurl.value = url; } };
  const placeWeb = () => {  // スライド座標 → 画面座標に変換して置く
    const r = webMax ? [40, 40, W - 80, H - 80] : webRect, b = stage.getBoundingClientRect(), k = b.width / W;
    Object.assign(web.style, { left: `${b.left + r[0] * k}px`, top: `${b.top + r[1] * k}px`, width: `${r[2] * k}px`, height: `${r[3] * k}px` });
  };
  const showWeb = (spec) => {
    if (!spec || DIST) {
      web.classList.remove("on");
      // 埋め込みNotionにフォーカスが残るとキー（⌘←/→）を吸われるので、スライドに戻す
      if (document.activeElement === wframe) { wframe.blur(); window.focus(); }
      return;
    }
    webRect = spec.rect || (deck.slides[cur]?.full ? FULL_RECT : WEB_RECT); placeWeb();
    loadWeb(spec.url || wframe.dataset.src || deck.web?.home);
    web.classList.toggle("noext", !document.documentElement.dataset.tsEmbed);  // 拡張が無いと Notion 等は真っ白（ブロック表示）になる
    web.classList.add("on");
  };
  web.addEventListener("click", (e) => e.stopPropagation());
  web.querySelector(".wbar").addEventListener("click", (e) => {
    const w = e.target.dataset.w;
    if (w === "reload") wframe.src = wframe.dataset.src;
    if (w === "back") history.back();  // iframe 内の遷移も同じ履歴に積まれる
    if (w === "max") { webMax = !webMax; placeWeb(); }
  });
  wurl.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { const u = /^https?:/.test(wurl.value) ? wurl.value : `https://${wurl.value}`; wframe.dataset.src = ""; loadWeb(u); } });
  addEventListener("message", (e) => { if (e.data?.talkslides === "next") next(); if (e.data?.talkslides === "prev") go(cur - 1); });
  const fit = () => { const k = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `translate(-50%,-50%) scale(${k})`; placeWeb(); };
  addEventListener("resize", fit); fit();
  // 最初の live スライドを待たずに先読みしておく（開いた瞬間に白い画面が出ないように）
  if (!DIST && deck.slides.some((x) => x.layout === "live" || x.web)) loadWeb(deck.web?.home || deck.notionHome);

  // ---------- 進行 ----------
  const bc = new BroadcastChannel(`talkslides:${deck.id}`);
  const progress = document.getElementById("progress");
  let cur = -1;
  const go = (i, from = "local") => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    slides[cur]?.classList.remove("on");
    slides[i].classList.remove("revealed");  // クイズは戻ってきたら答えを伏せ直す（何度でも出題できる）
    slides[cur]?.querySelectorAll("video").forEach((v) => v.pause());
    cur = i; void slides[cur].offsetWidth; slides[cur].classList.add("on");
    slides[cur].querySelectorAll("video").forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });  // reflow でアニメを毎回再生
    progress.style.width = `${(cur + 1) / slides.length * 100}%`;
    history.replaceState(null, "", `#${cur + 1}`);
    if (from !== "remote") bc.postMessage({ type: "go", i: cur });
    showWeb(deck.slides[cur].web || (deck.slides[cur].layout === "live" ? {} : null));
    if (!DIST && deck.slides[cur].notion?.auto) openNotion();
  };
  function next() {
    const el = slides[cur];
    if (el.classList.contains("quiz") && !el.classList.contains("revealed")) { el.classList.add("revealed"); bc.postMessage({ type: "reveal" }); return; }
    go(cur + 1);
  }
  bc.onmessage = (e) => { if (e.data.type === "go") go(e.data.i, "remote"); if (e.data.type === "hello") bc.postMessage({ type: "go", i: cur }); };

  // ---------- 全画面 ----------
  const fullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();

  // ---------- Notion（別ウィンドウをスライドの位置に重ねて開く。Notionは埋め込み不可のため） ----------
  let notionWin = null;
  const openNotion = () => {
    const url = deck.slides[cur].notion?.url || deck.notionHome;
    if (!url) return;
    const k = Math.min(innerWidth / W, innerHeight / H), w = Math.round(W * k * .92), h = Math.round(H * k * .86);
    const left = Math.round(screenX + (outerWidth - w) / 2), top = Math.round(screenY + (outerHeight - h) / 2 + 20);
    notionWin = open(url, "talkslides-notion", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
  };
  const closeNotion = () => { notionWin?.close(); notionWin = null; focus(); };
  const toggleNotion = () => (notionWin && !notionWin.closed ? closeNotion() : openNotion());

  // ---------- 声（Web Speech API・Chrome） ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micDot = document.getElementById("mic"), heard = document.getElementById("heard");
  const norm = (s) => s.toLowerCase().normalize("NFKC").replace(/[\s、。，．,.!?！？「」『』・ー〜~]/g, "")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));  // カタカナ→ひらがなで表記ゆれを吸収
  const GLOBAL = deck.voiceCommands || [{ text: "次のスライド", action: "next" }, { text: "前のスライド", action: "prev" }];
  let rec = null, listening = false, buf = "", lastFire = 0;
  const act = (action) => ({ next: () => next(), prev: () => go(cur - 1), openNotion, closeNotion }[action] || (() => {}))();
  const log = (t, fired) => {
    try {
      const k = `talkslides.log.${deck.id}`, arr = JSON.parse(localStorage.getItem(k) || "[]");
      arr.push({ at: new Date().toISOString(), slide: deck.slides[cur].id, transcript: t, fired }); localStorage.setItem(k, JSON.stringify(arr.slice(-500)));
    } catch { /* localStorage 不可でも発表は止めない */ }
  };
  const onText = (text, final) => {
    heard.textContent = text;
    bc.postMessage({ type: "heard", text });
    buf = (buf + norm(text)).slice(-60);
    if (Date.now() - lastFire < 1500) return;  // 連続発火の防止
    const cues = [...(deck.slides[cur].cues || []), ...GLOBAL];
    const hit = cues.find((c) => buf.includes(norm(c.text)));
    if (hit) { lastFire = Date.now(); buf = ""; log(text, hit.action); act(hit.action || "next"); }
    else if (final) log(text, null);
  };
  const startVoice = () => {
    if (!SR) { heard.textContent = "このブラウザは音声認識に未対応（Chromeで開いてください）"; return; }
    rec = new SR(); rec.lang = deck.lang || "ja-JP"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => { for (let k = e.resultIndex; k < e.results.length; k++) onText(e.results[k][0].transcript, e.results[k].isFinal); };
    rec.onend = () => { if (listening) setTimeout(() => { try { rec.start(); } catch { } }, 250); };  // 無音で切れても再開
    rec.onerror = (e) => { heard.textContent = `音声認識: ${e.error}`; if (e.error === "not-allowed") stopVoice(); };
    listening = true; micDot.classList.add("live"); rec.start();
  };
  const stopVoice = () => { listening = false; micDot.classList.remove("live"); rec?.stop(); };
  const toggleVoice = () => (listening ? stopVoice() : startVoice());

  // ---------- 入力 ----------
  let jump = "";
  addEventListener("keydown", (e) => {
    // ⌘（Windows は Ctrl）＋←/→ でページ送り。Chrome の「戻る」より先に止める
    if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault(); if (e.key === "ArrowRight") next(); else go(cur - 1); return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { jump += k; return; }
    if (k === "Enter" && jump) { go(+jump - 1); jump = ""; return; }
    jump = "";
    if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(k)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(k)) { e.preventDefault(); go(cur - 1); }
    else if (k === "Home") go(0); else if (k === "End") go(slides.length - 1);
    else if (k === "f" || k === "F") fullscreen();
    else if (DIST) return;
    else if (k === "v" || k === "V") toggleVoice();
    else if (k === "n" || k === "N") toggleNotion();
    else if ((k === "b" || k === "B") && web.classList.contains("on")) { webMax = !webMax; placeWeb(); }
    else if (k === "p" || k === "P") openPresenter();
    else if (k === "a" || k === "A") assist.toggleAttribute("hidden");
    else if (k === "Escape") assist.hidden = true;
  });
  // クリックではページを送らない（誤操作防止）。クイズの「答えを見る」ボタンだけクリックで動く
  stage.addEventListener("click", (e) => { if (e.target.closest(".reveal-btn")) next(); });
  document.getElementById("btnFull").onclick = fullscreen;
  // 資料リスト（ハブ）へのボタン。投影版は別タブで開く（発表中のスライド位置を失わないため）、配布版は同じタブで移る
  if (deck.hub) {
    const hubBtn = document.createElement("button");
    hubBtn.id = "btnHub"; hubBtn.textContent = "資料リスト"; hubBtn.title = "資料リストを開く（L）";
    hubBtn.onclick = () => (DIST ? location.assign(deck.hub) : open(deck.hub, "_blank", "noopener"));
    document.getElementById("hud").prepend(hubBtn);
    addEventListener("keydown", (e) => { if ((e.key === "l" || e.key === "L") && !e.metaKey && !e.ctrlKey && !e.altKey) hubBtn.click(); });
  }
  if (DIST) document.querySelectorAll("#btnVoice, #btnPresenter, #mic, #heard").forEach((el) => el.remove());
  else document.getElementById("btnVoice").onclick = toggleVoice;
  if (!DIST) document.getElementById("btnPresenter").onclick = () => openPresenter();

  // ---------- 当日アシスト（A キー・?assist）：本番前の確認と2画面の起動 ----------
  // 発表者画面はもう1枚の画面に開く（Window Management API。許可がなければ普通の別ウィンドウ）
  async function openPresenter() {
    let feat = "width=1200,height=800";
    try {
      const sd = await window.getScreenDetails?.();
      const other = sd?.screens.find((x) => x !== sd.currentScreen);
      if (other) feat = `left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
    } catch { /* 許可されなければ同じ画面に開く */ }
    open(`presenter.html#${deck.id}`, "talkslides-presenter", feat);
  }
  const assist = document.createElement("div");
  assist.id = "assist"; assist.hidden = true;
  const extOk = () => !!document.documentElement.dataset.tsEmbed;
  const drawAssist = () => {
    assist.innerHTML = `<div class="as-box"><div class="as-h">当日アシスト<button data-as="close" title="閉じる（Esc）">閉じる</button></div>
      <ol>
        <li class="${extOk() ? "ok" : "ng"}"><b>埋め込みブラウザ</b><span>${extOk() ? "拡張「TalkSlides Embed」が有効です" : "拡張が無効です。chrome://extensions で再読み込み → このページを再読み込み"}</span></li>
        <li><b>Notion にログイン</b><span>普通のタブでログインしておくと、埋め込みにも反映されます</span><button data-as="notion">Notion を開く</button></li>
        <li><b>2画面で開始</b><span>発表者画面（カンペ・時間）をもう1枚の画面に開き、このスライドを全画面にします。タイマーも0から始まります</span><button data-as="start" class="pri">2画面で開始</button></li>
        <li><b>Zoom で画面共有</b><span>共有するのは、全画面にしたスライドの画面（発表者画面は共有しない）</span></li>
        <li><b>最初のスライドへ</b><span>表紙から始める</span><button data-as="top">1枚目へ</button></li>
      </ol><div class="as-k">A：このパネル ／ P：発表者画面 ／ F：全画面 ／ B：ブラウザ拡大 ／ N：Notion 別ウィンドウ</div></div>`;
  };
  assist.addEventListener("click", (e) => {
    const k = e.target.dataset.as;
    if (k === "close") assist.hidden = true;
    if (k === "notion") open(deck.web?.home || deck.notionHome || "https://app.notion.com/", "_blank");
    if (k === "top") go(0);
    if (k === "start") { assist.hidden = true; bc.postMessage({ type: "start" }); openPresenter().then(() => document.fullscreenElement || document.documentElement.requestFullscreen()); }
  });
  new MutationObserver(() => { if (!assist.hidden) drawAssist(); }).observe(assist, { attributes: true, attributeFilter: ["hidden"] });
  if (!DIST) {
    document.body.appendChild(assist);
    const asBtn = document.createElement("button");
    asBtn.textContent = "当日アシスト"; asBtn.title = "本番前の確認と2画面の起動（A）";
    asBtn.onclick = () => assist.toggleAttribute("hidden");
    document.getElementById("hud").prepend(asBtn);
    if (new URLSearchParams(location.search).has("assist")) assist.hidden = false;
  }

  addEventListener("hashchange", () => go((parseInt(location.hash.slice(1), 10) || 1) - 1));
  window.TalkSlides = { go, deck, act };
  go(Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
})();
