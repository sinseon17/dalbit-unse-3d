/* ============================================================
   달빛 운세 · village.js  (v3 · 마당 놀이 & 효과음)
   마을 홈이 3D 월드(world3d.js)로 바뀌면서, 이 파일은
   - 가벼운 효과음(Web Audio 합성)
   - 하단 '마당 놀이' 4종(복주머니 · 엽전 점 · 소원등 · 연못 동전)의
     결과 카드만 담당한다. (소원등 입력은 app.js의 wishSheet)
   ============================================================ */
(function (global) {
  "use strict";

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const DAMDDAM = [
    "오늘은 작은 인연이 큰 복으로 돌아옵니다.",
    "미뤄 둔 연락 하나가 좋은 소식을 데려옵니다.",
    "지갑을 여는 순간보다 닫는 순간에 복이 붙습니다.",
    "웃는 얼굴에 오늘의 귀인이 따라옵니다.",
    "한 번 쉬어 가면 두 걸음이 가벼워집니다.",
    "따뜻한 말 한마디가 오늘의 부적이 됩니다.",
    "좋아하는 사람에게 먼저 인사해 보세요.",
    "서두르지 않으면 오히려 빨리 풀립니다.",
    "오늘 마신 물 한 잔이 기운을 맑게 합니다.",
    "고마운 마음을 소리 내어 전해 보세요."
  ];

  /* 연못에 동전을 던졌을 때 — 오늘의 작은 행운 한마디 */
  const POND_LUCK = [
    "던진 동전만큼 작은 행운이 오늘 안에 찾아옵니다.",
    "마음속 소원이 물걸을 타고 퍼지고 있어요.",
    "오늘은 누군가의 작은 친절이 기쁨으로 돌아오는 날입니다.",
    "미뤄 둔 일 하나가 술술 풀리며 웃음이 붙습니다.",
    "따뜻한 말 한마디가 오늘의 복을 데려옵니다.",
    "고마운 마음을 먼저 전하면 두 배로 들어옵니다.",
    "서두르지 않으면 오히려 빨리 풀리는 날이에요.",
    "작은 결정 하나가 좋은 씨앗이 됩니다.",
    "오늘의 인연이 먼 훗날의 귀인으로 남습니다.",
    "지친 마음에 잔잔한 숨이 돌아오면 흐름이 바뀝니다."
  ];

  function playPond() {
    const line = pick(POND_LUCK);
    open(head("🪙", "연못에 동전을 던졌어요",
      "동심원이 번지며 작은 행운이 왔습니다", "shake") +
      '<p class="vp-line">“' + line + '”</p>', { mid: true });
    return line;
  }

  const COIN = {
    gil: [
      "지금 가는 방향이 좋아요. 한 걸음 더 내디뎌 보세요.",
      "마음먹은 일을 오늘 시작하면 흐름이 붙습니다.",
      "망설이던 그 연락, 오늘은 해도 좋아요.",
      "작은 결정이 좋은 씨앗이 됩니다."
    ],
    sinjung: [
      "한 번 더 살펴보세요. 급하지 않아도 괜찮아요.",
      "오늘은 결정보다 정리에 어울리는 날이에요.",
      "말보다 듣는 쪽이 유리합니다.",
      "하루만 묵혀 두면 답이 더 선명해집니다."
    ]
  };

  /* ---------- 가벼운 효과음 ---------- */
  let ac = null;
  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, gain, type) {
    try {
      const a = ctx();
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(gain || 0.16, a.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur + 0.03);
    } catch (e) { }
  }

  /* ---------- 마당 놀이 패널 ---------- */
  function panelEl() { return document.getElementById("yardPanel"); }

  function open(html, opts) {
    const el = panelEl();
    if (!el) return;
    el.className = "v-play yard-panel" + ((opts && opts.mid) ? " vp-mid" : "");
    el.innerHTML = '<button class="yp-close" type="button" aria-label="닫기">✕</button>' + html;
    el.hidden = false;
    el.scrollTop = 0;
    const btn = el.querySelector(".yp-close");
    if (btn) btn.onclick = close;
  }
  function close() {
    const el = panelEl();
    if (el) { el.hidden = true; el.innerHTML = ""; }
  }

  function head(ico, title, sub, extra) {
    return '<div class="vp-head"><span class="vp-ico ' + (extra || "") + '">' + ico + "</span>" +
      "<div><b>" + title + "</b><span>" + sub + "</span></div></div>";
  }

  function playBag(f) {
    const t = f && f.lucky ? f.lucky : { color: "따뜻한 살구색", number: 7 };
    const line = pick(DAMDDAM);
    open(
      head("🎁", "복주머니를 흔들었어요", "오늘의 복이 가득 담겨 나왔습니다", "shake") +
      '<div class="vp-rows">' +
      '<div class="vp-row"><i>🎨</i><span>행운의 색</span><b>' + t.color + "</b></div>" +
      '<div class="vp-row"><i>🔢</i><span>행운의 숫자</span><b>' + t.number + "</b></div>" +
      "</div>" +
      '<p class="vp-line">“' + line + '”</p>'
    );
  }

  function playCoin() {
    open(head("🪙", "엽전을 던져 보세요", "잠시 뒤 앞뒷면이 갈립니다") +
      '<div class="coin-stage"><div class="coin">福</div></div>');
    setTimeout(() => {
      const gil = Math.random() < 0.55;
      const label = gil ? "길 · 좋아요" : "신중 · 한 번 더";
      const line = pick(gil ? COIN.gil : COIN.sinjung);
      open(
        head(gil ? "🌞" : "🌙", label, gil ? "오늘은 앞으로 나가도 좋은 날" : "오늘은 한 걸음 쉬어 가는 날") +
        '<p class="vp-line">“' + line + '”</p>'
      );
    }, 1150);
  }

  function playPet(name, line) {
    open(
      head("🦊", (name || "마을 친구") + "이(가) 좋아해요", "마음을 쓰다듬어 주셨네요") +
      '<p class="vp-line">“' + (line || "오늘도 같이 걸어서 즐거워요!") + '”</p>'
    );
  }

  global.DalbitSound = { ctx, tone };
  global.DalbitVillage = {
    tone, open, close, playBag, playCoin, playPet, playPond,
    DAMDDAM, COIN, POND_LUCK, pick
  };
})(typeof window !== "undefined" ? window : globalThis);
