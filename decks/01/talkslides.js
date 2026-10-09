/* TalkSlides エンジン：window.DECK（deck.json の中身）を描画し、キー・クリッカー・声で進める。
 * キー: → ↓ Space PageDown=次 / ← ↑ PageUp=前 / Home End / F=全画面 / V=声ON/OFF / P=発表者画面 / N=Notionを開閉 / 数字+Enter=ジャンプ */
(() => {
  "use strict";
  const deck = window.DECK;
  const DIST = !!deck.dist;  // 配布版：埋め込みブラウザ・Notion・声・発表者画面を使わない
  const W = 1920, H = 1080;
  const stage = document.getElementById("stage");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const md = (s) => esc(s).replace(/==(.+?)==/g, '<span class="mark">$1</span>').replace(/`(.+?)`/g, "<code>$1</code>").replace(/\\n|&lt;br&gt;/g, "<br>");  // ==強調== で下線マーカー
  let n = 0;  // アニメーションの順番カウンタ
  const a = (kind = "up") => `data-a="${kind}" style="--i:${n++}"`;

  // ---------- レイアウト ----------
  const foot = (s, i) => `<div class="foot"><span>${esc(deck.title)}</span><span>${i + 1} / ${deck.slides.length}</span>${deck.logo ? `<img src="${esc(deck.logo)}" alt="">` : ""}</div>`;
  const kicker = (s) => s.band ? `<div class="kicker" ${a("fade")}><span class="dot"></span>${esc(s.band)}</div>` : "";
  const icons = (s) => s.icons?.length ? `<div class="icons">${s.icons.map((x) => `<span class="ic" ${a("pop")}>${x.img ? `<img src="${esc(x.img)}" alt="">` : `<i>${x.emoji || ""}</i>`}${esc(x.t || "")}</span>`).join("")}</div>` : "";
  const notes = (s) => s.notes?.length ? `<div class="notes">${s.notes.map((x) => `<div class="note" ${a()}>${md(x)}</div>`).join("")}</div>` : "";

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
        `<div class="block${it.hl ? " hl" : ""}" ${a("pop")}>${it.emoji ? `<div class="emoji">${it.emoji}</div>` : ""}<div class="bt">${md(it.t)}</div><div class="bd">${md(it.d || "")}</div></div>`).join("")}</div></div>`,
    compare: (s) => L.parts({ ...s, items: [s.left, s.right].map((c, k) => ({ emoji: c.emoji, t: c.title, d: c.items.join("<br>"), hl: k === 0 })) })
      .replace(/&lt;br&gt;/g, "<br>"),
    track: (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()}>${md(s.message)}</div>
      <div class="track">${s.items.map((it) => `<div class="t${it.on ? " on" : ""}" data-a="up" style="--i:${n++};flex:${it.w || 1}"><div class="n">${esc(it.n)}</div><div class="l">${esc(it.l)}</div>${it.d ? `<ul class="d">${it.d.map((x) => `<li>${md(x)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div></div>`,
    step: (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:60px">${md(s.message)}</div>
      <div class="split"><div class="steps">${s.time ? `<div class="time" ${a("fade")}>目安 ${esc(s.time)}</div>` : ""}${s.actions.map((x, k) =>
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
      <div class="more" ${a("fade")}>つづく…</div>
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
      <div class="toc${s.items.length > 5 ? " two" : ""}${s.items.length > 10 ? " many" : ""}">${s.items.map((it, k) => `<div class="tc${it.on ? " on" : ""}" ${a("up")}><div class="tn">${String(k + 1).padStart(2, "0")}</div>
        <div><div class="tt">${md(it.t)}</div><div class="td">${md(it.d || "")}</div></div><div class="tm">${esc(it.m || "")}</div></div>`).join("")}</div></div>`;
  // QRコード（アンケート等）
  L.qr = (s) => `<div class="slide">${kicker(s)}<div class="live-l"><div class="msg" ${a()}>${md(s.message)}</div>${notes(s)}</div>
      <div class="qrcard" ${a("pop")}><img src="${esc(s.qr)}" alt=""><div class="qurl">${esc(s.url)}</div><div class="qcap">${md(s.cap || "スマホのカメラで読み取ってください")}</div></div></div>`;
  // スクショを並べる（キャプション・出典つき）
  L.gallery = (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:54px">${md(s.message)}</div>${icons(s)}
      <div class="gallery" style="grid-template-columns:${s.cols || `repeat(${s.shots.length},1fr)`}">${s.shots.map((g) =>
        `<figure ${a("pop")}><div class="frame">${g.img ? `<img src="${esc(g.img)}" style="object-fit:${g.fit || "contain"}" alt="">` : `<div class="ph">［画像］${esc(g.cap)}</div>`}</div>
        <figcaption><b>${md(g.cap || "")}</b>${g.src ? `<span>${esc(g.src)}</span>` : ""}</figcaption></figure>`).join("")}</div>
      ${s.note ? `<div class="gnote" ${a("fade")}>${md(s.note)}</div>` : ""}</div>`;
  // Notion風の表
  L.table = (s) => `<div class="slide mid">${kicker(s)}<div class="msg" ${a()} style="font-size:54px">${md(s.message)}</div>${icons(s)}
      <div class="ntable" ${a("pop")}><div class="nrow nhead">${s.cols.map((c) => `<div>${md(c)}</div>`).join("")}</div>
      ${s.rows.map((r, k) => `<div class="nrow${s.hl === k ? " hl" : ""}" ${a("up")}>${r.map((c) => `<div>${md(c)}</div>`).join("")}</div>`).join("")}</div>
      ${s.source ? `<div class="src">${esc(s.source)}</div>` : ""}</div>`;
  // カードを格子に並べる（4〜6枚）
  L.cards = (s) => `<div class="slide mid">${kicker(s)}<div class="msg" ${a()} style="font-size:54px">${md(s.message)}</div>${icons(s)}
      <div class="cards" style="grid-template-columns:repeat(${s.colsN || 3},1fr)">${s.items.map((it) =>
        `<div class="block${it.hl ? " hl" : ""}" ${a("pop")}>${it.img ? `<img class="cimg" src="${esc(it.img)}" alt="">` : ""}${it.emoji ? `<div class="emoji">${it.emoji}</div>` : ""}
        <div class="bt">${md(it.t)}</div><div class="bd">${md(it.d || "")}</div></div>`).join("")}</div></div>`;
  // 1枚のスクショを大きく見せる（左に文字、右に画像）
  L.showcase = (s) => `<div class="slide">${kicker(s)}<div class="live-l"><div class="msg" ${a()}>${md(s.message)}</div>${notes(s)}</div>
      <figure class="showcase" ${a("pop")}><div class="frame"><img src="${esc(s.shot.img)}" alt=""></div>
      <figcaption><b>${md(s.shot.cap || "")}</b>${s.shot.src ? `<span>${esc(s.shot.src)}</span>` : ""}</figcaption></figure></div>`;
  // 機能紹介：上に1行メッセージ、左に要点、右に大きなスクショ
  L.feature = (s) => `<div class="slide">${kicker(s)}<div class="msg" ${a()} style="font-size:56px">${md(s.message)}</div>
      <div class="feat${s.wide ? " wide" : ""}"><div class="fnotes">${(s.notes || []).map((x) => `<div class="fn" ${a()}>${md(x)}</div>`).join("")}
      ${s.qr ? `<div class="fqr" ${a("pop")}><img src="${esc(s.qr)}" alt=""><div><b>${esc(s.url || "")}</b><span>${md(s.cap || "スマホのカメラで読み取ってください")}</span></div></div>` : ""}</div>
      <figure ${a("pop")}><div class="frame"><img src="${esc(s.shot.img)}" alt=""></div>
      <figcaption><b>${md(s.shot.cap || "")}</b>${s.shot.src ? `<span>${esc(s.shot.src)}</span>` : ""}</figcaption></figure></div></div>`;
  L.live = (s) => `<div class="slide lv${s.full ? " full" : ""}">${kicker(s)}<div class="live-l"><div class="msg" ${a()}>${md(s.message)}</div>
      ${(s.actions || []).map((x, k) => `<div class="step" ${a()}><b>${k + 1}</b><span>${md(x)}</span></div>`).join("")}
      ${notes(s)}${s.shot ? `<figure class="lshot" ${a("pop")}><img src="${esc(s.shot.img)}" alt=""><figcaption>${md(s.shot.cap || "")}</figcaption></figure>` : ""}</div></div>`;
  const shot = (s) => `<div class="shot" ${a("pop")}>${s.image ? `<img src="${esc(s.image)}" alt="">` : `<div class="ph">［画像］${esc(s.visual || "スクリーンショット")}</div>`}</div>`;
  const doodle = (kind) => `<svg class="doodle" viewBox="0 0 560 560" aria-hidden="true">
    <rect class="draw" style="--len:1900" x="90" y="60" width="380" height="440" rx="22"/>
    <path class="draw" style="--len:300" d="M140 140 h220"/><path class="draw" style="--len:300" d="M140 200 h280"/>
    <rect class="draw" style="--len:120" x="140" y="252" width="26" height="26" rx="5"/><path class="draw" style="--len:300" d="M190 265 h200"/>
    <rect class="draw" style="--len:120" x="140" y="312" width="26" height="26" rx="5"/><path class="draw" style="--len:300" d="M190 325 h160"/>
    <path class="draw" style="--len:900" d="M140 400 h280 v60 h-280 z"/></svg>`;

  // ---------- 描画 ----------
  stage.innerHTML = deck.slides.map((s, i) => { n = 0; return (L[s.layout] || L.statement)(s).replace(/<\/div>$/, `${s.layout === "cover" ? "" : foot(s, i)}</div>`); }).join("");
  const slides = [...stage.children];
  const WEB_RECT = [470, 64, 1426, 910];  // live レイアウトの既定位置（1920x1080 座標）。画面の約3/4をブラウザに使う
  const FULL_RECT = [60, 300, 1800, 670];  // live の full：見出しの下を全部ブラウザにする
  const web = document.createElement("div");
  web.id = "web";
  web.innerHTML = `<div class="wbar"><i></i><i></i><i></i><button data-w="back" title="戻る">←</button><button data-w="reload" title="再読み込み">↻</button>
    <input id="wurl" spellcheck="false"><button data-w="max" title="大きく / 戻す（B）">⤢</button></div>
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
    cur = i; void slides[cur].offsetWidth; slides[cur].classList.add("on");  // reflow でアニメを毎回再生
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
    else if (k === "p" || k === "P") open(`presenter.html#${deck.id}`, "talkslides-presenter", "width=1100,height=760");
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
  if (!DIST) document.getElementById("btnPresenter").onclick = () => open(`presenter.html#${deck.id}`, "talkslides-presenter", "width=1100,height=760");

  addEventListener("hashchange", () => go((parseInt(location.hash.slice(1), 10) || 1) - 1));
  window.TalkSlides = { go, deck, act };
  go(Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
})();
