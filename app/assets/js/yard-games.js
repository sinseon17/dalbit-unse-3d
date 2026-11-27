/* ============================================================
   달빛 운세 · yard-games.js  (v1 · 마당 놀이 게임화)
   ─ 이 파일 하나로 마당 놀이 세 가지를 게임처럼 바꾼다.
     1) 🎁 복주머니  : 흔들기 애니메이션 → 짠! 복 아이템 그림 + 오늘의 복 카드
     2) 🏮 소원등    : (world2d.js) 쓴 소원 글씨가 등불에 새겨진 채 하늘로 상승
     3) 🪙 연못 동전 : 연못 가운데 연잎 분수대 + 힘 조절 파워 게이지 미니게임
   ─ app.js 를 고치지 않는다. app.js 가 부르는 공개 함수
     (DalbitVillage.playBag / playPond, DalbitWorld.tossCoin)를 감싸서 갈아 끼우므로
     다른 작업이 app.js 를 동시에 고쳐도 충돌하지 않는다.
   ============================================================ */
(function (global) {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s)
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const tone = (f, d, g, t) => { try { global.DalbitSound && global.DalbitSound.tone(f, d, g, t); } catch (e) { } };
  const device = () => document.getElementById("device");
  const world = () => global.DalbitWorld;
  const village = () => global.DalbitVillage;

  const LS_STATS = "dalbit_yard_games";
  let stats = { bag: 0, hit: 0, toss: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(LS_STATS) || "{}")); } catch (e) { }
  const saveStats = () => { try { localStorage.setItem(LS_STATS, JSON.stringify(stats)); } catch (e) { } };

  /* ============================================================
     1. 복주머니 — 복 아이템 그림 8종
     ============================================================ */
  const ITEMS = [
    {
      key: "key", name: "황금 열쇠", tag: "막힌 일이 열림", tone: "#f6c85a",
      line: "꽁꽁 잠겨 있던 일이 열쇠처럼 스르르 풀리는 날입니다.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="ygGkey" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff8d2"/><stop offset=".42" stop-color="#f9ce55"/>
          <stop offset="1" stop-color="#cf8b19"/></linearGradient></defs>
        <ellipse cx="60" cy="106" rx="30" ry="6" fill="#7a4a10" opacity=".14"/>
        <g transform="rotate(-40 60 60)">
          <path d="M52 46h16v54H52z" fill="url(#ygGkey)"/>
          <path d="M52 76h19v8H52z" fill="url(#ygGkey)"/>
          <path d="M52 90h15v8H52z" fill="url(#ygGkey)"/>
          <circle cx="60" cy="36" r="17" fill="none" stroke="url(#ygGkey)" stroke-width="10"/>
          <circle cx="60" cy="36" r="5.5" fill="#fff6cf"/>
        </g>
        <g fill="#fff8d2" opacity=".95">
          <circle cx="28" cy="28" r="3.4"/><circle cx="95" cy="44" r="2.6"/><circle cx="88" cy="20" r="2"/>
        </g>
      </svg>`
    },
    {
      key: "coin", name: "금화 꾸러미", tag: "재물운", tone: "#f3c14e",
      line: "작은 씀씀이가 큰 이익으로 돌아옵니다. 오늘은 곳간이 웃는 날이에요.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="ygGcoin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff3b8"/><stop offset=".5" stop-color="#f8c94c"/>
          <stop offset="1" stop-color="#cd8a1a"/></linearGradient></defs>
        <ellipse cx="60" cy="106" rx="32" ry="6" fill="#7a4a10" opacity=".14"/>
        <ellipse cx="33" cy="86" rx="19" ry="9" fill="url(#ygGcoin)" stroke="#e2a72c" stroke-width="1.6" transform="rotate(-16 33 86)"/>
        <ellipse cx="88" cy="88" rx="19" ry="9" fill="url(#ygGcoin)" stroke="#e2a72c" stroke-width="1.6" transform="rotate(14 88 88)"/>
        <circle cx="60" cy="56" r="27" fill="url(#ygGcoin)" stroke="#e2a72c" stroke-width="2"/>
        <circle cx="60" cy="56" r="20" fill="none" stroke="#b97c14" stroke-width="1.4" opacity=".5"/>
        <text x="60" y="66" text-anchor="middle" font-size="25" font-family="Jua,serif" fill="#a86c10">福</text>
        <ellipse cx="50" cy="43" rx="7" ry="5" fill="#fff" opacity=".55"/>
      </svg>`
    },
    {
      key: "clover", name: "네잎클로버", tag: "뜻밖의 행운", tone: "#5fbf5f",
      line: "찾지 않아도 행운이 먼저 다가와 인사를 건넵니다.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="ygGclo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#b7e88f"/><stop offset=".55" stop-color="#5fbf5f"/>
          <stop offset="1" stop-color="#2f8f43"/></linearGradient></defs>
        <ellipse cx="60" cy="108" rx="24" ry="5" fill="#2f6b2a" opacity=".16"/>
        <path d="M60 62c-4 14-4 26 0 40" stroke="#3f9a4a" stroke-width="5" fill="none" stroke-linecap="round"/>
        <g transform="translate(60 58)" fill="url(#ygGclo)" stroke="#2f8f43" stroke-width="1.2">
          <path d="M0 -2 C -15 -4 -24 -18 -15 -27 C -7 -34 -1 -27 0 -21 C 1 -27 7 -34 15 -27 C 24 -18 15 -4 0 -2 Z" transform="rotate(0)"/>
          <path d="M0 -2 C -15 -4 -24 -18 -15 -27 C -7 -34 -1 -27 0 -21 C 1 -27 7 -34 15 -27 C 24 -18 15 -4 0 -2 Z" transform="rotate(90)"/>
          <path d="M0 -2 C -15 -4 -24 -18 -15 -27 C -7 -34 -1 -27 0 -21 C 1 -27 7 -34 15 -27 C 24 -18 15 -4 0 -2 Z" transform="rotate(180)"/>
          <path d="M0 -2 C -15 -4 -24 -18 -15 -27 C -7 -34 -1 -27 0 -21 C 1 -27 7 -34 15 -27 C 24 -18 15 -4 0 -2 Z" transform="rotate(270)"/>
        </g>
        <circle cx="60" cy="58" r="4" fill="#eaffd4"/>
        <g fill="#eaffd4" opacity=".9"><circle cx="34" cy="30" r="2.6"/><circle cx="92" cy="36" r="2"/></g>
      </svg>`
    },
    {
      key: "peach", name: "천도복숭아", tag: "건강과 장수", tone: "#ff9aa8",
      line: "몸과 마음이 복숭아처럼 말랑하게 풀립니다. 오늘은 잘 쉬어도 좋아요.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><radialGradient id="ygGpec" cx=".36" cy=".3" r=".82">
          <stop offset="0" stop-color="#fff4f2"/><stop offset=".34" stop-color="#ffd3d2"/>
          <stop offset=".72" stop-color="#ff9aa8"/><stop offset="1" stop-color="#e8637f"/></radialGradient></defs>
        <ellipse cx="60" cy="106" rx="28" ry="6" fill="#7a2b3a" opacity=".14"/>
        <path d="M60 40c18-14 44-6 44 22 0 26-20 42-44 42S16 88 16 62c0-28 26-36 44-22z" fill="url(#ygGpec)"/>
        <path d="M60 40c-3 16-2 36 2 54" stroke="#e8637f" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>
        <path d="M60 40c2-9 2-16 8-22" stroke="#8a6a3a" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M62 34c8-13 22-19 34-16-6 12-19 20-30 20z" fill="#6fbf5a"/>
        <ellipse cx="42" cy="60" rx="10" ry="14" fill="#fff" opacity=".35"/>
      </svg>`
    },
    {
      key: "pearl", name: "행운 여의주", tag: "소원성취", tone: "#8fd0f2",
      line: "마음속에 그린 일이 모양을 갖추어 다가옵니다. 소원을 또렷이 그려 보세요.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><radialGradient id="ygGpearl" cx=".34" cy=".26" r=".8">
          <stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#e2f4ff"/>
          <stop offset=".72" stop-color="#9fd8ff"/><stop offset="1" stop-color="#4f9ed6"/></radialGradient>
          <linearGradient id="ygGgold2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff0b8"/><stop offset="1" stop-color="#dc9c22"/></linearGradient></defs>
        <circle cx="60" cy="56" r="40" fill="#bfe6ff" opacity=".22"/>
        <ellipse cx="60" cy="100" rx="26" ry="6" fill="#2b5b7a" opacity=".14"/>
        <g fill="url(#ygGgold2)" stroke="#d9a02a" stroke-width="1">
          <ellipse cx="60" cy="88" rx="11" ry="7"/>
          <ellipse cx="40" cy="86" rx="10" ry="6.5" transform="rotate(-18 40 86)"/>
          <ellipse cx="80" cy="86" rx="10" ry="6.5" transform="rotate(18 80 86)"/>
          <ellipse cx="28" cy="80" rx="8" ry="5.5" transform="rotate(-32 28 80)"/>
          <ellipse cx="92" cy="80" rx="8" ry="5.5" transform="rotate(32 92 80)"/>
        </g>
        <circle cx="60" cy="56" r="25" fill="url(#ygGpearl)"/>
        <ellipse cx="51" cy="46" rx="8" ry="6" fill="#fff" opacity=".92"/>
        <g fill="#fff" opacity=".9"><circle cx="24" cy="34" r="2.6"/><circle cx="98" cy="30" r="2"/><circle cx="94" cy="66" r="2.4"/></g>
      </svg>`
    },
    {
      key: "knot", name: "붉은 복 매듭", tag: "액운 막이", tone: "#e8455d",
      line: "들어오는 복은 묶어 두고, 오는 액은 밖으로 돌려 보냅니다.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="ygGknot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff8b93"/><stop offset=".5" stop-color="#e63950"/>
          <stop offset="1" stop-color="#a81c38"/></linearGradient>
          <linearGradient id="ygGknotGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff5cb"/><stop offset="1" stop-color="#d99a26"/></linearGradient></defs>
        <ellipse cx="60" cy="110" rx="22" ry="5" fill="#5a1020" opacity=".16"/>
        <path d="M60 44C42 32 16 34 14 48c2 14 28 16 46 4z" fill="url(#ygGknot)"/>
        <path d="M60 44c18-12 44-10 46 4-2 14-28 16-46 4z" fill="url(#ygGknot)"/>
        <path d="M34 41c-6 2-10 5-10 7" stroke="#ffb4bb" stroke-width="2.4" fill="none" opacity=".7" stroke-linecap="round"/>
        <path d="M86 41c6 2 10 5 10 7" stroke="#ffb4bb" stroke-width="2.4" fill="none" opacity=".7" stroke-linecap="round"/>
        <path d="M52 44h16v10H52z" fill="url(#ygGknot)"/>
        <circle cx="60" cy="50" r="9.5" fill="url(#ygGknotGold)" stroke="#c98f1e" stroke-width="1.2"/>
        <circle cx="60" cy="50" r="3.4" fill="#fff8d6"/>
        <path d="M57 60h6v9h-6z" fill="url(#ygGknot)"/>
        <path d="M60 69v8" stroke="#d99a26" stroke-width="3.6" stroke-linecap="round"/>
        <g stroke="#e63950" stroke-width="3.2" stroke-linecap="round">
          <path d="M60 77v18"/><path d="M60 77c-6 6-9 11-10 18"/><path d="M60 77c6 6 9 11 10 18"/>
        </g>
      </svg>`
    },
    {
      key: "koi", name: "황금 잉어", tag: "출세와 성취", tone: "#f0a93c",
      line: "물을 거슬러 오르듯, 한 단계 더 올라서는 날입니다.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="ygGkoi" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff4c4"/><stop offset=".45" stop-color="#f8c94c"/>
          <stop offset="1" stop-color="#d98c1a"/></linearGradient></defs>
        <ellipse cx="60" cy="102" rx="34" ry="6" fill="#6b3f0c" opacity=".14"/>
        <path d="M96 58c10-8 18-8 22-6-4 6-4 16 0 22-6 2-14 0-22-8z" fill="url(#ygGkoi)" opacity=".95"/>
        <path d="M24 58c14-18 42-24 62-14 8 4 12 9 14 14-2 5-6 10-14 14-20 10-48 4-62-14z" fill="url(#ygGkoi)"/>
        <path d="M58 44c6 4 6 24 0 28-6-4-6-24 0-28z" fill="#e9a52b" opacity=".5"/>
        <path d="M52 72c8 8 14 12 12 18-8-2-14-6-18-12z" fill="#f3b93f"/>
        <circle cx="42" cy="55" r="3.4" fill="#5a3208"/>
        <path d="M28 62c4 2 6 5 6 8" stroke="#b9761a" stroke-width="2" fill="none" stroke-linecap="round"/>
        <g fill="#fff8d2" opacity=".9"><circle cx="26" cy="30" r="3"/><circle cx="96" cy="26" r="2.2"/></g>
      </svg>`
    },
    {
      key: "lotus", name: "연꽃 등불", tag: "마음의 평안", tone: "#ffc4d8",
      line: "마음이 고요해지면 답도 고요히 떠오릅니다. 오늘은 한 박자 쉬어 가요.",
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="ygGlot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fffafd"/><stop offset=".5" stop-color="#ffd7e6"/>
          <stop offset="1" stop-color="#f19ab8"/></linearGradient>
          <radialGradient id="ygGflame" cx=".5" cy=".3" r=".8">
            <stop offset="0" stop-color="#fffdf0"/><stop offset=".5" stop-color="#ffe08a"/>
            <stop offset="1" stop-color="#f5a63a"/></radialGradient></defs>
        <ellipse cx="60" cy="104" rx="30" ry="6" fill="#7a3550" opacity=".14"/>
        <circle cx="60" cy="66" r="34" fill="#ffe6b0" opacity=".22"/>
        <g fill="url(#ygGlot)" stroke="#f0a8c2" stroke-width="1">
          <path d="M60 96c-22-2-34-14-34-28 12-2 24 4 34 14z"/>
          <path d="M60 96c22-2 34-14 34-28-12-2-24 4-34 14z"/>
          <path d="M60 98C48 88 44 72 52 58c8 6 12 22 8 40z"/>
          <path d="M60 98C72 88 76 72 68 58c-8 6-12 22-8 40z"/>
          <path d="M60 100c-6-10-6-24 0-34 6 10 6 24 0 34z"/>
        </g>
        <path d="M60 22c9 12 13 20 13 28 0 9-6 15-13 15s-13-6-13-15c0-8 4-16 13-28z" fill="url(#ygGflame)"/>
        <path d="M60 38c4 6 6 10 6 14 0 4-3 7-6 7s-6-3-6-7c0-4 2-8 6-14z" fill="#fffbe8"/>
      </svg>`
    }
  ];

  const LUCK_EXTRA = [
    "오늘은 작은 인연이 큰 복으로 돌아옵니다.",
    "미뤄 둔 연락 하나가 좋은 소식을 데려옵니다.",
    "웃는 얼굴에 오늘의 귀인이 따라옵니다.",
    "따뜻한 말 한마디가 오늘의 부적이 됩니다.",
    "서두르지 않으면 오히려 빨리 풀립니다.",
    "고마운 마음을 소리 내어 전해 보세요."
  ];
  function luckLine() {
    const V = village();
    const pool = (V && V.DAMDDAM && V.DAMDDAM.length ? V.DAMDDAM : []).concat(LUCK_EXTRA);
    return pick(pool);
  }

  /* 마을 복주머니 SVG — 위를 조아모은 붉은 보자기 주머니 */
  const BAG_SVG = `<svg class="yg-bagsvg" viewBox="0 0 150 170" aria-hidden="true">
    <defs>
      <radialGradient id="ygBagBody" cx=".34" cy=".22" r=".92">
        <stop offset="0" stop-color="#ffa9b0"/><stop offset=".38" stop-color="#ef5063"/>
        <stop offset=".78" stop-color="#c62a45"/><stop offset="1" stop-color="#98132e"/></radialGradient>
      <linearGradient id="ygBagGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff8d8"/><stop offset=".45" stop-color="#f8cd5f"/>
        <stop offset="1" stop-color="#cf8f1c"/></linearGradient>
    </defs>
    <ellipse cx="75" cy="167" rx="46" ry="8" fill="#5a1020" opacity=".18"/>
    <g stroke="url(#ygBagGold)" stroke-width="4" stroke-linecap="round">
      <path d="M69 152v13"/><path d="M75 154v13"/><path d="M81 152v13"/>
    </g>
    <path d="M63 144h24l-2 9H65z" fill="url(#ygBagGold)"/>
    <path d="M75 60c25 0 46 19 46 44 0 24-20 40-46 40S29 128 29 104c0-25 21-44 46-44z" fill="url(#ygBagBody)"/>
    <path d="M59 62c4 8 28 8 32 0l-4-14c-6 7-18 7-24 0z" fill="url(#ygBagBody)"/>
    <path d="M59 62c4 8 28 8 32 0l-1.6-5.5c-7 6-22 6-29 0z" fill="#8f1128" opacity=".38"/>
    <path d="M55 48c7 11 33 11 40 0l-3-9c-9 9-25 9-34 0z" fill="url(#ygBagGold)"/>
    <path d="M55 48c7 11 33 11 40 0l-1.5-4c-10 8-27 8-37 0z" fill="#fff6cb" opacity=".55"/>
    <path d="M63 40c0-12 5-18 12-18s12 6 12 18" fill="none" stroke="url(#ygBagGold)" stroke-width="6" stroke-linecap="round"/>
    <circle cx="75" cy="24" r="7" fill="url(#ygBagGold)"/>
    <ellipse cx="55" cy="86" rx="12" ry="17" fill="#fff" opacity=".22" transform="rotate(-16 55 86)"/>
    <text x="75" y="124" text-anchor="middle" font-size="42" font-family="Jua,serif" fill="url(#ygBagGold)">福</text>
  </svg>`;

  /* ============================================================
     공용 — 모달 뼈대
     ============================================================ */
  let prevAutoStroll = null;
  function pauseStroll() {
    const W = world();
    if (!W) return;
    if (prevAutoStroll === null) prevAutoStroll = (W.autoStroll === undefined) ? true : W.autoStroll;
    W.autoStroll = false;
    /* 혼자 거닐던 중이면 그 자리에 서 있게 한다 (앱이 시킨 걷기(onDone 이 있는 길)는 그대로 둔다) */
    const me = W.me;
    if (me && me.walking && !me.onDone) {
      me.path = [];
      me.walking = false;
      me.restT = 3;
      if (W.layoutActor) W.layoutActor(me);
    }
  }
  function resumeStroll() {
    const W = world();
    if (!W) return;
    if (prevAutoStroll !== null) W.autoStroll = prevAutoStroll;
    prevAutoStroll = null;
  }

  /* ============================================================
     2. 복주머니 게임
     ============================================================ */
  const Bag = {
    el: null,
    item: null,
    fortune: null,
    last: "",
    timer: 0,

    open(fortune) {
      this.fortune = fortune || null;
      if (!this.el) this.build();
      pauseStroll();
      this.el.hidden = false;
      this.el.classList.add("on");
      device().classList.add("yg-bag-open");
      this.shake();
      stats.bag = (stats.bag || 0) + 1;
      saveStats();
    },

    build() {
      const host = device();
      const wrap = document.createElement("div");
      wrap.className = "yg-scrim";
      wrap.id = "ygBagScrim";
      wrap.hidden = true;
      wrap.innerHTML = `
        <div class="yg-card yg-bagcard" role="dialog" aria-modal="true" aria-label="복주머니 열기">
          <button class="yg-x" id="ygBagX" type="button" aria-label="닫기">✕</button>
          <div class="yg-stage">
            <span class="yg-rays"></span>
            <span class="yg-spark k1">✨</span>
            <span class="yg-spark k2">✨</span>
            <span class="yg-spark k3">💫</span>
            <span class="yg-spark k4">✨</span>
            <div class="yg-bagwrap">${BAG_SVG}</div>
            <div class="yg-itemwrap" id="ygItem">
              <span class="yg-itemring"></span>
              <span class="yg-itemsvg" id="ygItemSvg"></span>
            </div>
            <span class="yg-jjan" id="ygJjan">짠!</span>
          </div>
          <div class="yg-info">
            <div class="yg-kicker" id="ygKicker">복주머니를 흔드는 중…</div>
            <div class="yg-name" id="ygName">오늘의 복</div>
            <div class="yg-tagline" id="ygTag"></div>
            <p class="yg-line" id="ygLine"></p>
            <div class="yg-chips" id="ygChips"></div>
            <div class="yg-btns">
              <button class="yg-btn" id="ygAgain" type="button">🎁 한 번 더 흔들기</button>
              <button class="yg-btn ghost" id="ygBagClose" type="button">닫기</button>
            </div>
          </div>
        </div>`;
      host.appendChild(wrap);
      this.el = wrap;

      $("#ygBagX", wrap).onclick = () => this.close();
      $("#ygBagClose", wrap).onclick = () => this.close();
      $("#ygAgain", wrap).onclick = () => this.shake();
      wrap.addEventListener("click", (e) => { if (e.target === wrap) this.close(); });
    },

    /* 흔들기 → 열림 → 짠! */
    shake() {
      const el = this.el;
      const card = $(".yg-bagcard", el);
      this.clearTimers();
      card.classList.remove("open");
      this.item = null;
      $("#ygKicker", el).textContent = "복주머니를 흔드는 중…";
      $("#ygName", el).textContent = "오늘의 복";
      $("#ygTag", el).textContent = "";
      $("#ygLine", el).textContent = "";
      $("#ygChips", el).innerHTML = "";
      $(".yg-bagwrap", el).classList.remove("gone");
      $(".yg-bagwrap", el).classList.remove("shake");
      void el.offsetWidth;
      $(".yg-bagwrap", el).classList.add("shake");
      tone(520, 0.12, 0.06, "triangle");
      this.later(() => tone(660, 0.14, 0.07, "triangle"), 340);
      this.later(() => tone(780, 0.14, 0.07, "triangle"), 640);
      this.later(() => this.reveal(), 1180);
    },

    timers: [],
    later(fn, ms) { this.timers.push(setTimeout(fn, ms)); },
    clearTimers() { this.timers.forEach((t) => clearTimeout(t)); this.timers = []; },

    reveal() {
      const el = this.el;
      const card = $(".yg-bagcard", el);
      let item = pick(ITEMS);
      let guard = 0;
      while (item.key === this.last && guard++ < 12) item = pick(ITEMS);
      this.last = item.key;
      this.item = item;

      $("#ygItemSvg", el).innerHTML = item.svg;
      card.classList.add("open");
      $(".yg-bagwrap", el).classList.add("gone");
      tone(880, 0.5, 0.09, "sine");
      this.later(() => tone(1180, 0.55, 0.06, "sine"), 130);
      this.later(() => tone(1480, 0.4, 0.04, "sine"), 260);

      const f = this.fortune || {};
      const lucky = f.lucky || {};
      const chips = [];
      if (lucky.color) chips.push("🎨 행운의 색 · " + lucky.color);
      if (lucky.number) chips.push("🔢 행운의 숫자 · " + lucky.number);
      if (lucky.food) chips.push("🍚 복이 붙는 음식 · " + lucky.food);

      this.later(() => {
        $("#ygKicker", el).textContent = "짠! 복주머니가 열렸어요";
        $("#ygName", el).textContent = item.name;
        $("#ygTag", el).textContent = item.tag;
        $("#ygLine", el).textContent = "“" + item.line + "”";
        $("#ygChips", el).innerHTML = chips.map((c) => `<span class="yg-chip">${esc(c)}</span>`).join("") +
          `<span class="yg-chip wide">“${esc(luckLine())}”</span>`;
      }, 320);
    },

    close() {
      if (!this.el) return;
      this.el.classList.remove("on");
      this.el.hidden = true;
      device().classList.remove("yg-bag-open");
      this.clearTimers();
      resumeStroll();
    }
  };

  /* ============================================================
     3. 연못 동전 던지기 (힘 조절 미니게임)
     ============================================================ */
  const POND_LUCK_SPECIAL = [
    "던진 동전이 연꽃 위에 딱 앉았습니다. 오늘은 바라는 일이 그대로 이루어지는 날이에요.",
    "물빛이 금빛으로 번집니다. 오늘 결정하는 일은 좋은 쪽으로 흘러갑니다.",
    "연못이 답을 해 주었습니다. 미뤄 둔 그 일, 오늘 시작해도 좋습니다.",
    "한 번의 명중이 한 달의 운을 바꿉니다. 오늘은 자신을 믿어도 좋은 날이에요.",
    "동전이 물 위에서 세 번 돌았습니다. 오늘은 사람의 말이 복이 되어 돌아옵니다.",
    "분수대가 반짝이며 길을 밝힙니다. 오늘 만나는 사람이 곧 귀인입니다.",
    "물결이 곧게 뻗었습니다. 하던 일이 막힘없이 이어집니다.",
    "연못의 여의주가 빛났습니다. 오늘은 재물과 인연이 함께 따르는 날입니다."
  ];
  const POND_LUCK_MISS = [
    "퐁당, 동전은 물속에 잠겼지만 마음은 이미 물결을 탔습니다.",
    "던진 동전만큼 작은 행운이 오늘 안에 찾아옵니다.",
    "물걸이 둥글게 번집니다. 서두르지 않으면 일이 풀립니다.",
    "동전은 놓쳤지만 복은 놓치지 않았어요. 오늘은 작은 친절이 기쁨으로 돌아옵니다.",
    "따뜻한 말 한마디가 오늘의 복을 데려옵니다.",
    "한 번 더 던지면 물빛이 다르게 답합니다. 오늘은 두 번의 기회가 있는 날이에요.",
    "물소리가 마음을 씻어 줍니다. 지친 마음에 잔잔한 숨이 돌아옵니다.",
    "작은 결정 하나가 좋은 씨앗이 됩니다."
  ];

  const Pond = {
    active: false,
    locked: false,
    power: 0,
    dir: 1,
    raf: 0,
    el: null,
    cb: null,
    cbDone: false,
    T: 0,
    tol: 8,
    ideal: 50,
    zone: [44, 56],
    lastHit: false,
    from: [0, 0],
    aim: [0, 0],

    /* app.js 가 동전을 던질 때 부른다 (걷기 → 여기서 힘 조절 게임) */
    launch(cb) {
      this.cb = cb || null;
      this.cbDone = false;
      const W = world();
      if (!W || !W.ready || !W.stage) { this.finish(false, true); return; }
      if (!this.el) this.build();
      pauseStroll();
      device().classList.add("yg-playing");
      this.el.hidden = false;
      this.el.classList.remove("done");
      this.el.classList.add("on");
      W.zoomWant = 2.0;
      /* 목표 분수대가 화면 가운데 오도록 카메라 중심을 연못 쪽에 맞춘다 */
      W.focusBooth = null;
      W.focusPoi = { id: "pond", x: 792, focusX: 792 };
      const f = W.fountainEl;
      if (f) f.classList.add("play");
      this.measure();
      this.startGauge();
    },

    measure() {
      const W = world();
      const F = (W.POND && W.POND.fountain) ? W.POND.fountain : [846, 616];
      const FT = (W.POND && W.POND.fountainTop) ? W.POND.fountainTop : [F[0], F[1] - 58];
      const me = W.me || { x: 700, y: 700, facing: 1 };
      const hx = me.x + (me.facing < 0 ? -10 : 10);
      const hy = me.y - 38;
      this.from = [hx, hy];
      this.aim = [F[0], F[1]];
      this.aimTop = [FT[0], FT[1]];
      const T = Math.max(60, Math.hypot(F[0] - hx, F[1] - hy));
      this.T = T;
      /* 힘 0~100 → 던진 거리 0.72T ~ 1.22T (목표 T 를 사이에 둔다) */
      const pOf = (ratio) => ((ratio - 0.72) / 0.5) * 100;
      const lo = pOf(1 - this.tol / T);
      const hi = pOf(1 + this.tol / T);
      this.zone = [Math.max(0, lo), Math.min(100, hi)];
      this.ideal = (this.zone[0] + this.zone[1]) / 2;
    },

    build() {
      const host = device();
      const el = document.createElement("div");
      el.className = "yg-pond";
      el.id = "ygPond";
      el.hidden = true;
      el.innerHTML = `
        <button class="yg-x" id="ygPondX" type="button" aria-label="닫기">✕</button>
        <div class="yg-pane yg-pg">
        <div class="yg-phead">
          <span class="yg-pico">⛲</span>
          <div class="yg-ptitle"><b>연못 동전 던지기</b><span>힘을 모아 연꽃 분수대에 맞춰 보세요</span></div>
        </div>
        <div class="yg-gauge" id="ygGauge">
          <span class="yg-gtrack"></span>
          <span class="yg-gzone" id="ygZone"></span>
          <span class="yg-gneedle" id="ygNeedle"></span>
          <i class="yg-gmark" id="ygMark"></i>
        </div>
        <div class="yg-glabels"><span>약하게</span><span class="yg-gmid">🎯 명중 구간</span><span>세게</span></div>
        <button class="yg-hold" id="ygHold" type="button">
          <b>꾹 눌러 힘을 모으세요</b><span>초록 구간에서 손을 떼면 던집니다</span>
        </button>
        <div class="yg-pfoot">
          <span id="ygScore">명중 0 · 시도 0</span>
          <span class="yg-pgoal">🎯 목표 · 연잎 분수대</span>
        </div>
        <div class="yg-ptip" id="ygTip">동전이 연못에 잠기면 ‘물결 행운’, 분수대에 맞으면 ‘대길’ 카드가 열려요.</div>
        </div>
        <div class="yg-pane yg-pr" id="ygRes"></div>`;
      host.appendChild(el);
      this.el = el;

      const hold = $("#ygHold", el);
      $("#ygPondX", el).onclick = () => this.close(true);
      hold.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.beginHold();
      });
      hold.addEventListener("contextmenu", (e) => e.preventDefault());
      this.paintScore();
    },

    paintScore() {
      const el = this.el;
      if (!el) return;
      const s = $("#ygScore", el);
      if (s) s.textContent = "명중 " + (stats.hit || 0) + " · 시도 " + (stats.toss || 0);
    },

    startGauge() {
      const el = this.el;
      this.active = true;
      this.locked = false;
      this.power = 0;
      this.dir = 1;
      this.holding = false;
      const z = $("#ygZone", el);
      if (z) {
        z.style.left = this.zone[0].toFixed(1) + "%";
        z.style.width = Math.max(2, this.zone[1] - this.zone[0]).toFixed(1) + "%";
      }
      this.paint(0);
      this.setHoldText("꾹 눌러 힘을 모으세요", "초록 구간에서 손을 떼면 던집니다");
      const hold = $("#ygHold", el);
      if (hold) hold.classList.remove("armed", "go");
      this.paintScore();
      const tip = $("#ygTip", el);
      if (tip) tip.hidden = false;
    },

    setHoldText(main, sub) {
      const h = this.el && $("#ygHold", this.el);
      if (!h) return;
      h.innerHTML = "<b></b><span></span>";
      h.querySelector("b").textContent = main;
      h.querySelector("span").textContent = sub;
    },

    beginHold() {
      if (!this.active || this.locked) return;
      this.holding = true;
      const h = $("#ygHold", this.el);
      if (h) h.classList.add("armed");
      this.holdStart = performance.now();
      this.setHoldText("놓으면 던집니다!", "힘을 보며 초록 구간을 노려 보세요");
      tone(300, 0.08, 0.05, "square");
      cancelAnimationFrame(this.raf);
      const step = (now) => {
        if (!this.holding) return;
        const t = (now - this.holdStart) / 1250;    // 1.25초에 0 → 100 → 0
        const ph = t % 2;
        this.power = ph <= 1 ? ph * 100 : (2 - ph) * 100;
        this.paint(this.power);
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    },

    releaseHold() {
      if (!this.active || this.locked) return;
      this.holding = false;
      cancelAnimationFrame(this.raf);
      const p = this.power;
      const h = $("#ygHold", this.el);
      if (h) h.classList.remove("armed");
      const hit = Math.abs(p - this.ideal) <= (this.zone[1] - this.zone[0]) / 2;
      this.throwCoin(p, hit);
    },

    throwCoin(p, hit) {
      this.locked = true;
      const k = 0.72 + 0.5 * (p / 100);
      let lx = this.from[0] + (this.aim[0] - this.from[0]) * k;
      let ly = this.from[1] + (this.aim[1] - this.from[1]) * k;
      if (hit) {
        lx = this.aimTop[0];
        ly = this.aimTop[1];          // 금빛 연꽃 봉오리에 딱
      }
      this.land = [lx, ly];
      const W = world();
      this.paint(p);
      this.setHoldText(hit ? "맞았다!" : "휘익—", hit ? "동전이 분수대 위로 날아갑니다" : "동전이 연못으로 날아갑니다");
      tone(hit ? 720 : 460, 0.16, 0.07, "square");
      if (W && W.tossCoinTo) {
        W.tossCoinTo(lx, ly, {
          duration: 760,
          onLand: () => {
            stats.toss = (stats.toss || 0) + 1;
            if (hit) stats.hit = (stats.hit || 0) + 1;
            saveStats();
            this.lastHit = hit;
            this.finish(hit);
          }
        });
      } else {
        this.finish(hit);
      }
    },

    finish(hit, silent) {
      this.active = false;
      this.locked = true;
      const W = world();
      if (!silent) {
        const lp = this.land || [this.aim[0], this.aim[1] - 40];
        if (hit && W && W.fountainHit) W.fountainHit();
        else if (W && W.fountainSplash) W.fountainSplash(lp[0], lp[1]);
      }
      this.showResult(hit);
      if (this.cb && !this.cbDone) {
        this.cbDone = true;
        const cb = this.cb;
        this.cb = null;
        setTimeout(() => cb(), 240);
      }
    },

    showResult(hit) {
      const el = this.el;
      if (!el) return;
      el.classList.add("done");
      const line = pick(hit ? POND_LUCK_SPECIAL : POND_LUCK_MISS);
      const stamp = hit ? "大吉" : "福";
      const box = $("#ygRes", el);
      if (box) box.innerHTML = `
          <div class="yg-res ${hit ? "hit" : "miss"}">
            <div class="yg-resstamp">${stamp}</div>
            <div class="yg-restitle">${hit ? "🎉 대길 명중!" : "💦 퐁당! 물결 행운"}</div>
            <p class="yg-resline">“${esc(line)}”</p>
            <div class="yg-resmeta">
              <span>명중 ${stats.hit || 0} · 시도 ${stats.toss || 0}</span>
              <span>${hit ? "연꽃 분수대 적중" : "연못 물결에 잠김"}</span>
            </div>
            <div class="yg-btns">
              <button class="yg-btn" id="ygPondAgain" type="button">🪙 한 번 더 던지기</button>
              <button class="yg-btn ghost" id="ygPondDone" type="button">닫기</button>
            </div>
          </div>`;
      const again = $("#ygPondAgain", el);
      const done = $("#ygPondDone", el);
      if (again) again.onclick = () => { el.classList.remove("done"); this.startGauge(); };
      if (done) done.onclick = () => this.close(false);
      if (hit) {
        tone(880, 0.5, 0.1, "sine");
        setTimeout(() => tone(1180, 0.6, 0.07, "sine"), 130);
      } else {
        tone(340, 0.28, 0.09, "sine");
      }
    },

    paint(p) {
      const el = this.el;
      if (!el) return;
      const n = $("#ygNeedle", el);
      if (n) n.style.left = Math.max(0, Math.min(100, p)).toFixed(1) + "%";
      const gauge = $("#ygGauge", el);
      if (gauge) gauge.style.setProperty("--p", Math.max(0, Math.min(100, p)).toFixed(1));
    },

    close(noCount) {
      const el = this.el;
      this.active = false;
      this.holding = false;
      this.locked = false;
      cancelAnimationFrame(this.raf);
      if (el) {
        el.classList.remove("on", "done");
        el.hidden = true;
        this.el = null;
        el.remove();
      }
      device().classList.remove("yg-playing");
      const W = world();
      if (W) {
        W.zoomWant = null;
        if (W.fountainEl) W.fountainEl.classList.remove("play");
      }
      resumeStroll();
      if (noCount && this.cb && !this.cbDone) { this.cb = null; }
    }
  };

  /* ============================================================
     4. app.js · world2d.js 연결 (감싸기)
     ============================================================ */
  let patched = false;
  function patchWorld(tries) {
    const W = world();
    const V = village();
    if (!W || !W.ready || !V) {
      if ((tries || 0) < 40) setTimeout(() => patchWorld((tries || 0) + 1), 150);
      return;
    }
    if (patched) return;
    patched = true;

    /* 복주머니 — app.js 가 복 채널·행운색·숫자를 계산해 넘겨 준다 */
    if (typeof V.playBag === "function" && !V.playBag.__yg) {
      const origBag = V.playBag;
      const wrapped = function (fortune) { Bag.open(fortune); };
      wrapped.__yg = true;
      V.playBag = wrapped;
    }

    /* 연못 동전 — 걷기가 끝나면 tossCoin 이 불린다. 그 자리에서 힘 조절 게임을 연다 */
    if (typeof W.tossCoin === "function" && !W.tossCoin.__yg) {
      const wrapped = function (cb) { Pond.launch(cb); };
      wrapped.__yg = true;
      W.tossCoin = wrapped;
    }

    /* 연못 행운 카드 — 게임 결과 카드가 떠 있으면 그대로 두고,
       (마을 밖에서 바로 던진 경우처럼) 게임 없이 불리면 기존 행운 카드를 띄운다 */
    if (typeof V.playPond === "function" && !V.playPond.__yg) {
      const wrapped = function () {
        if (Pond.el) { Pond.paintScore(); return; }
        const line = pick(POND_LUCK_MISS);
        V.open('<div class="vp-head"><span class="vp-ico">🪙</span>' +
          '<div><b>연못에 동전을 던졌어요</b><span>동심원이 번지며 작은 행운이 왔습니다</span></div></div>' +
          '<p class="vp-line">“' + line + '”</p>');
      };
      wrapped.__yg = true;
      V.playPond = wrapped;
    }

    /* 소원등 — app.js 가 부르는 wishLanterns 앞에서 방금 쓴 소원 글씨를 확실히 넘긴다 */
    if (typeof W.wishLanterns === "function" && !W.wishLanterns.__yg) {
      const origWish = W.wishLanterns;
      const wrapped = function (n, text) {
        const t = (text != null && String(text).trim()) ? text : ((W.pendingWish || "").trim());
        if (t) W.pendingWish = t;
        return origWish.call(W, n, t || undefined);
      };
      wrapped.__yg = true;
      W.wishLanterns = wrapped;
    }
  }

  /* 소원등 '새겨서 띄우기' 를 누르는 순간의 글씨를 붙잡아 둔다
     (app.js 가 창을 닫기 전에 값을 읽으므로 capture 단계에서 먼저 받는다) */
  function hookWishText() {
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("#btnWish") : null;
      if (!btn) return;
      const ta = document.getElementById("wishText");
      const W = world();
      if (ta && W) W.pendingWish = (ta.value || "").trim().slice(0, 60);
    }, true);
  }

  function init() {
    hookWishText();
    patchWorld(0);
    /* 힘 모으다가 버튼 밖에서 손을 떼도 그때 던진다 (한 번만 등록) */
    global.addEventListener("pointerup", () => { if (Pond.holding) Pond.releaseHold(); });
    /* 게임 중에 다른 부스·설정을 누르면 게임 판을 닫고 그쪽으로 넘긴다 */
    document.addEventListener("click", (e) => {
      if (!Pond.el || Pond.el.hidden || !e.target || !e.target.closest) return;
      if (e.target.closest(".booth, .dock button, #btnSettings, #btnDonate, .spot-wish")) Pond.close(true);
    }, true);
    global.addEventListener("pointercancel", () => { if (Pond.holding) Pond.releaseHold(); });
    global.addEventListener("blur", () => { if (Pond.holding) Pond.releaseHold(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  global.DalbitYard = { Bag: Bag, Pond: Pond, ITEMS: ITEMS, BAG_SVG: BAG_SVG, stats: stats };
})(typeof window !== "undefined" ? window : globalThis);
