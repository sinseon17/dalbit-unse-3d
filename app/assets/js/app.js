/* ============================================================
   달빛 운세 · app.js  (v2)
   100% 무료 · 자율 복채(카카오페이) · 3D 상담실 · 기도/명상방
   ============================================================ */
(function () {
  "use strict";
  const E = window.DalbitEngine;
  const C = window.Content;
  const N = window.Naming;
  const V = window.DalbitVillage;
  const M = window.DalbitMeditation;
  const BGM = window.DalbitBGM;
  const CFG = window.DALBIT_CONFIG || {};

  const LS_KEY = "dalbit_fortune_v2";
  const IMG = "assets/img/";

  const defaultState = () => ({
    profile: null,
    usage: {},
    lastSaju: null,
    lastGungap: null,
    mini: { moktak: 0, beads: 0, wishes: [] },
    bokchae: []
  });
  let S = defaultState();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) S = Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { }
  S.usage = S.usage || {};
  S.mini = Object.assign({ moktak: 0, beads: 0, wishes: [] }, S.mini || {});
  if (typeof S.mini.lanterns !== "number") S.mini.lanterns = (S.mini.wishes || []).length || 0;
  S.bokchae = S.bokchae || [];

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { }
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nf = (n) => (n || 0).toLocaleString("ko-KR");

  function toast(msg, ms) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("on"), ms || 2600);
  }

  function ring(score, size, stroke) {
    size = size || 132; stroke = stroke || 10;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - score / 100);
    const gid = "gg" + Math.random().toString(36).slice(2, 7);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#f6ecdd" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffd27a"/><stop offset="100%" stop-color="#f0a93c"/>
      </linearGradient></defs></svg>`;
  }

  /* ============================================================
     복채 (자율 복채 · 카카오페이)
     ============================================================ */
  const BOKCHAE_CTX = {
    saju: {
      label: "사주 복채", btn: "🧧 사주 복채 보내기", title: "사주 복채",
      sub: "사주팔자 전각에 마음을 보태 주세요",
      msg: "사주의 8개 챕터와 대운을 함께 봐 드렸어요. 마음이 닿으셨다면 사주 복채로 전해 주세요."
    },
    tarot: {
      label: "타로 팁", btn: "✨ 타로 팁 보내기", title: "타로 팁(응원)",
      sub: "타로 천막의 카드값을 보태 주세요",
      msg: "카드 세 장이 건넨 이야기, 마음에 남으셨다면 응원의 팁으로 전해 주세요."
    },
    dream: {
      label: "해몽 찻값", btn: "🍵 해몽 찻값 보태기", title: "해몽 찻값",
      sub: "꿈풀이 찻집의 찻값을 보태 주세요",
      msg: "간밤의 꿈을 함께 읽었어요. 찻집에 앉아 차 한 잔 나눈 마음으로 찻값을 보태 주세요."
    },
    naming: {
      label: "작명 정성", btn: "✍️ 작명 정성 보태기", title: "작명 정성",
      sub: "좋은 이름을 고른 정성을 보태 주세요",
      msg: "이름에 담긴 뜻을 함께 골랐어요. 작명 선생님께 정성을 보태 주세요."
    },
    gungap: {
      label: "인연 복채", btn: "💕 인연 복채 나누기", title: "인연 복채",
      sub: "두 사람의 인연에 복을 나눠 주세요",
      msg: "두 사람의 기운을 맞춰 보았어요. 좋은 인연에 복채를 나눠 주세요."
    },
    meditation: {
      label: "명상방 차 한 잔", btn: "☕ 명상방 차 한 잔 보태기", title: "명상방 차 한 잔",
      sub: "명상방의 차 한 잔과 등불을 보태 주세요",
      msg: "잠시 마음을 쉬어 가셨다면, 차 한 잔 나눈 마음으로 명상방을 밝혀 주세요."
    },
    wish: {
      label: "소원등 기름값", btn: "🏮 소원등 기름값 보태기", title: "소원등 기름값",
      sub: "하늘로 띄운 등불의 기름을 보태 주세요",
      msg: "소원등을 하늘로 띄웠어요. 등불이 오래 타도록 기름값을 보태 주세요."
    },
    village: {
      label: "자율 후원", btn: "🧧 자율 후원(복채)", title: "자율 후원(복채)",
      sub: "달빛 운세 마을을 가꿔 주세요",
      msg: "달빛 운세 마을이 마음에 드셨다면, 자율 후원으로 응원해 주세요."
    }
  };

  function bokchaeURL(ctx) {
    const per = (CFG.KAKAOPAY_DONATION_URLS || {})[ctx];
    const u = (per && per.trim()) || (CFG.KAKAOPAY_DONATION_URL || "").trim();
    return u || "";
  }

  const Bokchae = {
    ctx: "village",
    open(ctx) {
      this.ctx = (ctx && BOKCHAE_CTX[ctx]) ? ctx : "village";
      this.render();
    },
    render() {
      const cur = BOKCHAE_CTX[this.ctx];
      const hasURL = !!bokchaeURL(this.ctx);
      openSheet(`
        <div class="grabber"></div>
        <div class="bc-mini">
          <img src="${IMG}bowl-bokchae.webp" alt="">
          <div class="h-title">${cur.title}</div>
        </div>
        <button class="btn bc-send" id="bcSend" style="margin-top:14px">${cur.btn}</button>
        <button class="btn ghost sm" id="bcClose" style="margin-top:8px">닫기</button>
        ${hasURL ? "" : `<p class="bc-note" id="bcSetupNote" style="margin-top:10px">카카오페이 송금 링크를 준비하고 있어요.</p>`}
      `);
      $("#bcClose").onclick = closeSheet;
      $("#bcSend").onclick = () => this.send();
    },
    send() {
      const url = bokchaeURL(this.ctx);
      if (!url) {
        toast("카카오페이 송금 링크를 준비 중이에요. 곧 열어 드릴게요!", 3200);
        const note = $("#bcSetupNote");
        if (note) {
          note.innerHTML = "운영자가 카카오페이 송금 링크를 등록하면 이 버튼으로 바로 보내실 수 있어요.<br>그동안 마음을 담아 주셔서 감사합니다 🙏";
          note.style.color = "#b5772a";
        }
        return;
      }
      S.bokchae.unshift({ ctx: this.ctx, at: new Date().toISOString() });
      S.bokchae = S.bokchae.slice(0, 30);
      save();
      try {
        const w = window.open(url, "_blank", "noopener");
        if (!w) window.location.href = url;
      } catch (e) {
        window.location.href = url;
      }
      closeSheet();
      toast("카카오페이 창을 열었어요 · 마음 감사합니다 🙏", 3400);
    }
  };

  /* ============================================================
     공통 UI
     ============================================================ */
  let wishMic = null;          // 소원등 '말로 쓰기' 인식기 (창을 닫으면 멈춘다)

  /* ---------- 말로 쓰기 (Web Speech) — 꿈풀이·궁합 공용 ----------
     칸에 말한 내용을 받아 적는다. 다른 방으로 옮기거나 화면을 다시 그리면 바로 멈춘다. */
  const STT = {
    cur: null,                 // { rec, btn, input, scope, idle, live, aria, max }
    ok() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
    active(scope) { return !!this.cur && (!scope || this.cur.scope === scope); },
    ui(s, on) {
      const b = s.btn;
      if (!b) return;
      b.classList.toggle("on", !!on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", on ? "말로 쓰기 그만두기" : s.aria);
      b.textContent = on ? s.live : s.idle;
    },
    stop(scope, msg) {
      const s = this.cur;
      if (!s || (scope && s.scope !== scope)) return;
      this.cur = null;
      try { s.rec.stop(); } catch (e) { }   // 마지막으로 한 말까지 확정되도록 차분히 멈춘다
      this.ui(s, false);
      if (msg) toast(msg);
    },
    start(cfg) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const input = $(cfg.input), btn = $(cfg.btn);
      if (!SR || !input || !btn) return;
      let rec;
      try { rec = new SR(); } catch (e) { toast("이 기기에서는 말로 쓰기를 쓸 수 없어요"); return; }
      const s = {
        rec, btn, input, scope: cfg.scope, max: cfg.max || 0,
        idle: cfg.idle || "🎙️ 말로 쓰기", live: cfg.live || "🎙️ 듣는 중…",
        aria: cfg.aria || "말로 쓰기"
      };
      this.cur = s;
      rec.lang = "ko-KR";
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;
      let done = (input.value || "").trim();   // 이미 적힌 글 뒤에 이어 붙인다
      let said = "";                            // 듣고 있는 중인 말
      const paint = () => {
        let v = (done + (said ? " " + said : "")).trim();
        if (s.max && v.length > s.max) v = v.slice(0, s.max);
        input.value = v;
        input.dispatchEvent(new Event("input"));
      };
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            const t = String(r[0].transcript || "").trim();
            if (t) done = (done ? done + " " : "") + t;
          } else {
            interim += r[0].transcript;
          }
        }
        said = interim.trim();
        paint();
      };
      rec.onerror = (e) => {
        const err = e && e.error;
        const map = {
          "not-allowed": "마이크 사용을 허락해 주세요",
          "service-not-allowed": "이 브라우저에서는 말로 쓰기를 쓸 수 없어요",
          "no-speech": "잘 알아듣지 못했어요 · 다시 말씀해 주세요",
          "audio-capture": "마이크를 찾지 못했어요 · 기기 마이크를 확인해 주세요",
          "network": "음성 인식에 닿지 못했어요 · 잠시 뒤 다시 시도해 주세요"
        };
        if (err !== "aborted") toast(map[err] || "음성 입력이 멈췄어요 · 다시 눌러 주세요");
      };
      rec.onend = () => {
        if (this.cur !== s) return;
        this.cur = null;
        this.ui(s, false);
      };
      try { rec.start(); } catch (e) { this.cur = null; this.ui(s, false); toast("말로 쓰기를 시작하지 못했어요"); return; }
      this.ui(s, true);
      toast(cfg.tip || "🎙️ 말씀하시면 그 칸에 받아 적어요", 3000);
    }
  };

  /* 마이크 버튼을 칸에 붙인다 — 미지원 브라우저에서는 버튼을 숨긴다 */
  function setupMic(cfg) {
    const btn = $(cfg.btn), input = $(cfg.input);
    if (!btn || !input) return;
    if (!STT.ok()) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.onclick = () => {
      if (STT.active(cfg.scope)) { STT.stop(cfg.scope); return; }
      STT.stop();                                   // 다른 칸에서 듣던 것은 멈춘다
      STT.start(cfg);
    };
  }
  function openSheet(html) {
    const ov = $("#overlay");
    $("#sheetBody").innerHTML = html;
    ov.classList.add("on");
  }

  function closeSheet() {
    if (wishMic) { try { wishMic.abort(); } catch (e) { } wishMic = null; }
    $("#overlay").classList.remove("on");
  }

  function setTab(tab) {
    $$("#dock button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    $$(".room .screen").forEach(s => s.classList.add("hidden"));
    const el = $("#screen-" + tab);
    if (el) { el.classList.remove("hidden"); el.scrollTop = 0; }
    App.current = tab;
  }

  /* 방(바텀시트) 열기 · 닫기 — 3D 마을은 뒤에 그대로 */
  function openRoom(tab) {
    const room = $("#room");
    if (room) { room.classList.add("on"); room.setAttribute("aria-hidden", "false"); }
    const back = $("#hudBack"); if (back) back.hidden = false;
    const card = $("#hudCard"); if (card) card.hidden = true;
    const bottom = $("#hudBottom"); if (bottom) bottom.classList.add("hide");
    const mapBtn = $("#btnMap"); if (mapBtn) mapBtn.hidden = true;
    if (window.DalbitVillage) window.DalbitVillage.close();
  }
  function closeRoom() {
    const room = $("#room");
    if (room) { room.classList.remove("on"); room.setAttribute("aria-hidden", "true"); }
    const back = $("#hudBack"); if (back) back.hidden = true;
    const card = $("#hudCard"); if (card) card.hidden = false;
    const bottom = $("#hudBottom"); if (bottom) bottom.classList.remove("hide");
    const mapBtn = $("#btnMap"); if (mapBtn) mapBtn.hidden = false;
  }

  /* 걸어가는 안내 */
  function showWalkHint(text) {
    const h = $("#walkHint"), t = $("#walkHintText");
    if (!h) return;
    if (t) t.textContent = text;
    h.hidden = false;
  }
  /* 받침이 있으면 '으로', 없으면 '로' — "작명소 · 이름풀이로 걸어가는 중" */
  function josaRo(word) {
    const ch = String(word || "").trim().slice(-1);
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return ((code - 0xAC00) % 28) ? "으로" : "로";
    return "로";
  }
  function hideWalkHint() {
    const h = $("#walkHint");
    if (h) h.hidden = true;
  }

  function showLoading(title, sub) {
    const v = $("#loading");
    v.querySelector(".t").textContent = title;
    v.querySelector(".s").textContent = sub || "";
    v.classList.add("on");
  }
  function hideLoading() { $("#loading").classList.remove("on"); }

  /* ============================================================
     상담실 (도사님 · 손님)
     ============================================================ */
  const HOSTS = {
    today: { img: "char-dongja.webp", name: "동자승", greet: "어서 오세요~ 오늘의 기운을 함께 볼까요?" },
    saju: { img: "sage-saju.webp", name: "사주 도사님", greet: "어서 오세요~ 이름과 생년월일을 써 주세요!" },
    tarot: { img: "sage-tarot.webp", name: "타로 술사", greet: "마음을 가다듬고 카드 3장을 골라 보세요~" },
    dream: { img: "sage-dream.webp", name: "찻집 주인", greet: "오늘 어떤 꿈을 꾸셨나요?" },
    naming: { img: "sage-naming.webp", name: "작명 선생님", greet: "어떤 이름을 지어 드릴까요?" },
    gungap: { img: "sage-gungap.webp", name: "궁합 선생님", greet: "두 사람의 이야기를 들려주세요~" }
  };
  const NOD_LINE = {
    saju: "음~ 8자를 세워 보았습니다. 잠시만 기다려 주세요!",
    tarot: "카드가 이야기를 시작했어요. 조금만 기다려 주세요~",
    dream: "꿈의 상징을 읽어 보았습니다. 이제 풀어 드릴게요!",
    naming: "획수와 오행을 맞춰 보았어요. 좋은 이름을 골라 드릴게요!",
    gungap: "두 사람의 기운을 맞춰 보았습니다. 이제 알려 드릴게요!"
  };

  function consult(hostKey, bubble, opts) {
    const h = HOSTS[hostKey];
    const o = opts || {};
    return `
      <div class="consult ${o.compact ? "compact" : "enter"}" id="consult">
        <div class="c-floor"></div>
        <div class="consult-bubble">${esc(bubble || h.greet)}</div>
        <div class="consult-role">
          <img src="${IMG}${h.img}" alt="${esc(h.name)}">
          <span class="role-name">${esc(h.name)}</span>
        </div>
        ${""}
      </div>`;
  }

  function talk(hostKey, line) {
    const el = $("#consult");
    if (!el) return;
    el.classList.add("enter");
    el.classList.remove("nod");
    void el.offsetWidth;
    el.classList.add("nod");
    const b = el.querySelector(".consult-bubble");
    if (b) b.textContent = line;
  }

  /* ============================================================
     0) 달빛 운세 마을 (홈)
     ============================================================ */
  function renderVillageHome() {
    const f = C.todayFortune(S.profile, new Date());
    const p = S.profile;

    // 3D 마을: 내 캐릭터 머리 위 이름표 (나 · 김효정)
    if (window.DalbitWorld && window.DalbitWorld.ready) {
      if (p) window.DalbitWorld.setProfile(p);
      else window.DalbitWorld.setMe("");
    }

    // 하단 독의 오늘 점수 배지
    const sc = $("#dockScore");
    if (sc) sc.textContent = f.score;

    // 마을 인원 배지
    updateHudCount();

    // 인사말 (5초 뒤 사라짐)
    const greet = $("#worldGreet");
    if (greet) {
      greet.innerHTML = `<div class="g-date">${f.dateText} · ${f.lunarText} · ${f.ganji}</div>
        <div class="g-hi">${p && p.name ? esc(p.name) + "님, " : ""}오늘도 반가워요 ☀️</div>`;
      greet.classList.remove("on");
      void greet.offsetWidth;
      greet.classList.add("on");
    }

    // 내 캐릭터 머리 위에 오늘의 한마디를 살짝
    setTimeout(() => {
      if (window.DalbitWorld && window.DalbitWorld.ready) window.DalbitWorld.sayMe();
    }, 4200);
  }

  /* 방문객 목록 (정적 웹 시연용) ------------------------------------------------ */
  function visitorSheet() {
    const info = (window.DalbitWorld && window.DalbitWorld.visitorsInfo)
      ? window.DalbitWorld.visitorsInfo()
      : { count: 1, walking: [], inside: [] };
    const myName = (S.profile && S.profile.name) || "나";
    const myGender = (S.profile && S.profile.gender) || "female";
    const rows = [
      `<div class="visitor-row"><span class="av ${myGender === "male" ? "m" : "f"}">🙂</span>
        <div><div class="nm">${esc(myName)} <span class="me-tag pill gold" style="font-size:10px;padding:1px 7px">나</span></div>
        <div class="wh">지금 마을을 걷는 중</div></div></div>`
    ].concat(info.walking.map(w =>
      `<div class="visitor-row"><span class="av ${w.gender === "m" ? "m" : "f"}">${w.gender === "m" ? "🧑" : "👩"}</span>
        <div><div class="nm">${esc(w.name)}</div><div class="wh">${esc(w.where)}</div></div></div>`
    )).concat(info.inside.map(w =>
      `<div class="visitor-row"><span class="av">🏮</span>
        <div><div class="nm">${esc(w.name)}</div><div class="wh">${esc(w.where)}</div></div></div>`
    ));
    openSheet(`
      <div class="grabber"></div>
      <div class="eyebrow" style="text-align:center">마을 사람들</div>
      <div class="h-title" style="font-size:22px;margin-top:4px;text-align:center">지금 마을에 <span class="gold">${info.count}명</span></div>
      <p class="small center" style="margin:6px 0 2px">같이 걷는 이웃에게 말을 걸어 보세요.</p>
      <div class="visitor-list">${rows.join("")}</div>
      <button class="btn ghost sm" id="btnVisitorClose" style="margin-top:14px">닫기</button>
    `);
    const btn = $("#btnVisitorClose");
    if (btn) btn.onclick = closeSheet;
  }

  function updateHudCount() {
    const n = $("#hudCountNum");
    if (!n) return;
    const info = (window.DalbitWorld && window.DalbitWorld.visitorsInfo) ? window.DalbitWorld.visitorsInfo() : null;
    n.textContent = info ? info.count : 12;
  }

  /* ============================================================
     1) 오늘의 운세
     ============================================================ */
  function fmtBirth(b) {
    if (!b) return "";
    const lunar = b.isLunar ? "음력 " : "";
    const t = b.unknownTime ? "시간 모름" : `${String(b.hour).padStart(2, "0")}:${String(b.minute || 0).padStart(2, "0")}`;
    return `${lunar}${b.y}년 ${b.m}월 ${b.d}일 · ${t}`;
  }

  function renderToday() {
    const f = C.todayFortune(S.profile, new Date());
    const p = S.profile;
    const nameLine = p && p.name ? `${esc(p.name)}님, ` : "";
    const stars = "★".repeat(Math.round(f.score / 20)) + "☆".repeat(5 - Math.round(f.score / 20));

    const profCard = p ? "" : `
      <div class="card gold-edge" style="margin-top:13px">
        <div class="eyebrow">한 번만 등록하면</div>
        <div class="h-title" style="font-size:19px;margin-top:5px">생년월일을 등록하면 오늘의 운세가 정확해져요</div>
        <p class="small" style="margin:6px 0 14px">사주·궁합·타로 해석이 모두 이 정보를 기준으로 계산됩니다. 이름과 생년월일만 있으면 됩니다.</p>
        <button class="btn" id="btnProfile">내 생년월일 등록하기</button>
      </div>`;

    $("#screen-today").innerHTML = `
      <button class="chip plain" id="btnBackVillage">← 달빛 운세 마을</button>
      <div class="hello" style="padding-top:12px">
        <div class="line">${f.dateText} · ${f.lunarText} · ${f.ganji}</div>
        <h1>${nameLine}${f.greeting}</h1>
      </div>

      <div class="card today-brief-card gold-edge" style="margin-top:13px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <div class="eyebrow">오늘의 총운</div>
            <div style="display:flex;align-items:flex-end;gap:8px;margin-top:2px">
              <div class="score-big">${f.score}<small>/100</small></div>
              <div class="stars-line" style="padding-bottom:8px">${stars}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div class="tiny">오늘의 일진</div>
            <div class="gold" style="font-family:var(--font-title);font-size:19px">${f.ganjiHan}</div>
          </div>
        </div>
        <p class="small" style="margin:11px 0 0">${f.total}</p>
        <div class="free-note" style="margin-top:11px">☀️ 매일 자정에 새 운세가 열립니다</div>
      </div>

      ${profCard}

      <div class="card" style="margin-top:13px">
        <div class="eyebrow">오늘의 영역별 운세</div>
        <div class="elem-bars" style="margin-top:13px">
          ${f.cats.map(c => `
            <div class="elem-bar">
              <div class="e-name" style="font-size:14.5px;width:44px">${c.name}</div>
              <div class="track"><div class="fill" style="width:${c.v}%;background:linear-gradient(90deg,#ffca7a,#f5a83c)"></div></div>
              <div class="e-num">${c.v}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0">달빛이 전하는 말</div>
        <p class="small" style="margin:0 0 9px">${f.moneyLine}</p>
        <p class="small" style="margin:0 0 9px">${f.loveLine}</p>
        <p class="small" style="margin:0 0 9px">${f.workLine}</p>
        <p class="small" style="margin:0">${f.healthLine}</p>
        <p class="advice-quote" style="margin-top:14px">“${f.advice}”</p>
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0">오늘의 행운</div>
        <div class="lucky-grid">
          <div class="lucky"><div class="k">행운의 색</div><div class="v">${f.lucky.color}</div></div>
          <div class="lucky"><div class="k">행운의 숫자</div><div class="v">${f.lucky.number}</div></div>
          <div class="lucky"><div class="k">좋은 시간</div><div class="v">${f.lucky.time}</div></div>
          <div class="lucky"><div class="k">좋은 방향</div><div class="v">${f.lucky.direction}</div></div>
        </div>
        <div class="lucky" style="margin-top:9px"><div class="k">오늘 어울리는 음식</div><div class="v">${f.lucky.food}</div></div>
      </div>

      <p class="disclaimer">달빛 운세의 모든 풀이는 전통 명리·성명학 이론을 바탕으로 한 참고용 콘텐츠입니다.<br>의료·투자·법률 판단의 근거로 사용할 수 없습니다.</p>
    `;
    const btn = $("#btnProfile", $("#screen-today"));
    if (btn) btn.onclick = profileSheet;
    const back = $("#btnBackVillage", $("#screen-today"));
    if (back) back.onclick = () => App.leaveRoom();
    bindBokchaeButtons($("#screen-today"));
  }

  /* ============================================================
     2) 사주팔자
     ============================================================ */
  function birthForm(idPrefix, prefill, opt) {
    const b = prefill || null;
    const o = opt || {};
    const optional = !!o.optional;      // 궁합: 생년월일을 몰라도(이름만으로도) 볼 수 있게
    const now = new Date();
    const years = [];
    for (let y = now.getFullYear(); y >= 1930; y--) years.push(y);
    const sel = (v, cur) => (cur !== null && cur !== undefined && cur !== "" && +cur === +v ? " selected" : "");
    const by = b ? b.y : null, bm = b ? b.m : null, bd = b ? b.d : null;
    const bh = b ? b.hour : null, bmi = b ? b.minute : null;
    const female = !b || b.gender !== "male";
    const lunar = !!(b && b.isLunar);
    const unk = !!(b && b.unknownTime);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    return `
      <div class="field">
        <label class="label">이름</label>
        <input class="input" id="${idPrefix}-name" placeholder="예: 김하늘" value="${b && b.name ? esc(b.name) : ""}">
      </div>
      <div class="field">
        <label class="label">성별</label>
        <div class="seg" id="${idPrefix}-gender">
          <button type="button" data-v="female" class="${female ? "on" : ""}">여성</button>
          <button type="button" data-v="male" class="${female ? "" : "on"}">남성</button>
        </div>
      </div>
      <div class="field">
        <label class="label">양력 / 음력</label>
        <div class="seg" id="${idPrefix}-cal">
          <button type="button" data-v="solar" class="${lunar ? "" : "on"}">양력</button>
          <button type="button" data-v="lunar" class="${lunar ? "on" : ""}">음력</button>
        </div>
      </div>
      <div class="field">
        <label class="label">생년월일${optional ? ` <span class="tiny" style="font-weight:400">(몰라도 괜찮아요)</span>` : ""}</label>
        <div class="row-3">
          <select class="select" id="${idPrefix}-y" aria-label="태어난 해">${optional ? `<option value="">연도</option>` : ""}${years.map(y => `<option value="${y}"${sel(y, by)}>${y}년</option>`).join("")}</select>
          <select class="select" id="${idPrefix}-m" aria-label="태어난 달">${optional ? `<option value="">월</option>` : ""}${months.map(m => `<option value="${m}"${sel(m, bm)}>${m}월</option>`).join("")}</select>
          <select class="select" id="${idPrefix}-d" aria-label="태어난 날">${optional ? `<option value="">일</option>` : ""}${days.map(d => `<option value="${d}"${sel(d, bd)}>${d}일</option>`).join("")}</select>
        </div>
      </div>
      <div class="field">
        <label class="label">태어난 시간 <span class="tiny">(모르면 아래를 체크)</span></label>
        <div class="row-2">
          <select class="select" id="${idPrefix}-h">${Array.from({ length: 24 }, (_, i) => `<option value="${i}"${sel(i, bh)}>${String(i).padStart(2, "0")}시</option>`).join("")}</select>
          <select class="select" id="${idPrefix}-mi">${[0, 10, 20, 30, 40, 50].map(m => `<option value="${m}"${sel(m, bmi)}>${String(m).padStart(2, "0")}분</option>`).join("")}</select>
        </div>
        <label style="display:flex;align-items:center;gap:10px;margin-top:11px;font-size:14px;color:var(--ink-soft)">
          <input type="checkbox" id="${idPrefix}-unknown" style="width:20px;height:20px;accent-color:#f0a93c"${unk ? " checked" : ""}> 시간을 모릅니다 (시주 제외)
        </label>
      </div>`;
  }

  function bindBirthForm(prefix) {
    $$(`#${prefix}-gender button`).forEach(b => b.onclick = () => {
      $$(`#${prefix}-gender button`).forEach(x => x.classList.remove("on"));
      b.classList.add("on");
    });
    $$(`#${prefix}-cal button`).forEach(b => b.onclick = () => {
      $$(`#${prefix}-cal button`).forEach(x => x.classList.remove("on"));
      b.classList.add("on");
    });
  }
  function readBirthForm(prefix) {
    const name = ($(`#${prefix}-name`) || {}).value || "";
    const gender = ($(`#${prefix}-gender .on`) || {}).dataset ? $(`#${prefix}-gender .on`).dataset.v : "female";
    const isLunar = $(`#${prefix}-cal .on`) && $(`#${prefix}-cal .on`).dataset.v === "lunar";
    const unknownTime = $(`#${prefix}-unknown`) ? $(`#${prefix}-unknown`).checked : false;
    const y = +($(`#${prefix}-y`) || {}).value || 0;
    const m = +($(`#${prefix}-m`) || {}).value || 0;
    const d = +($(`#${prefix}-d`) || {}).value || 0;
    return {
      name: name.trim(), gender, isLunar, unknownTime,
      y, m, d, hasBirth: !!(y && m && d),
      hour: +$(`#${prefix}-h`).value, minute: +$(`#${prefix}-mi`).value
    };
  }

  function sajuResultHTML(s, deep) {
    const basic = C.sajuBasic(s);
    const pillars = [["년주", s.pillars.year], ["월주", s.pillars.month], ["일주", s.pillars.day], ["시주", s.pillars.hour]];
    const godOf = (p, isDay) => {
      if (!p) return "";
      if (isDay) return "일간";
      return C.tenGodOf(p.s, s.pillars.day.s);
    };
    return `
      <div class="card gold-edge">
        <div class="eyebrow">${esc(s.gender === "female" ? "여성" : "남성")} · ${s.unknownTime ? "시간 모름" : E.CHEONGAN_KR[s.pillars.hour.s] + E.GANJI_KR[s.pillars.hour.b] + "시"}</div>
        <div class="h-title" style="font-size:23px;margin-top:5px">${basic.profileTitle}</div>
        <div class="h-sub">${s.solar.y}년 ${s.solar.m}월 ${s.solar.d}일${s.lunar ? ` (음력 ${s.lunar.m}월 ${s.lunar.d}일${s.lunar.leap ? " 윤달" : ""})` : ""}</div>

        <div class="pillar-table" style="margin-top:14px">
          ${pillars.map(([label, p], i) => `
            <div class="pillar">
              <div class="p-label">${label}</div>
              <div class="p-char ${i === 2 ? "big" : ""}">${p ? E.CHEONGAN[p.s] : "—"}</div>
              <div class="p-char ${i === 2 ? "big" : ""}" style="font-size:${i === 2 ? 27 : 24}px">${p ? E.GANJI[p.b] : "—"}</div>
              <div class="p-kr">${p ? E.CHEONGAN_KR[p.s] + E.GANJI_KR[p.b] : "시주 없음"}</div>
              <div class="p-god">${godOf(p, i === 2)}</div>
            </div>`).join("")}
        </div>
        <div class="tiny center" style="margin-top:10px">${s.jeolgi.name} 이후 출생 · ${s.strength} · 대운 ${s.startAge}세 ${s.forward ? "순행" : "역행"}</div>
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0">오행의 균형</div>
        <div class="elem-bars">
          ${E.ELEMS.map(el => `
            <div class="elem-bar">
              <div class="e-name" style="color:${E.ELEM_COLOR[el]}">${el}</div>
              <div class="track"><div class="fill" style="width:${(s.counts[el] / 8) * 100}%;background:${E.ELEM_COLOR[el]}"></div></div>
              <div class="e-num">${s.counts[el]}</div>
            </div>`).join("")}
        </div>
        <p class="small" style="margin-top:12px">${basic.elemLine} ${C.ELEM_TEXT[basic.minElem].lack}</p>
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0">일간이 말해주는 나</div>
        <div class="chips" style="margin-bottom:11px">
          ${basic.keywords.map(k => `<span class="pill gold">${k}</span>`).join("")}
        </div>
        <p class="small" style="margin:0">${basic.profileDesc}</p>
        <p class="small" style="margin:9px 0 0">${basic.strengthText}</p>
      </div>

      ${deep ? deepHTML(s) : ""}
    `;
  }

  function deepHTML(s) {
    const d = C.sajuDeep(s);
    return `
      <div class="card" style="margin-top:13px">
        <div class="eyebrow">심층 풀이 · 8개 챕터</div>
        ${d.sections.map(sec => `
          <div style="margin-top:16px">
            <div class="section-title" style="margin:0 0 6px">${sec.icon} ${sec.title}</div>
            ${sec.body.map(p => `<p class="small" style="margin:0 0 8px">${p}</p>`).join("")}
          </div>`).join("")}
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0">대운의 흐름</div>
        ${d.daewoonText.map(x => `
          <div class="list-row">
            <div>
              <div style="font-family:var(--font-title);font-size:15px">${x.age} <span class="gold">${x.ganji}</span></div>
              <div class="r" style="margin-top:2px">${x.text}</div>
            </div>
            <div class="pill gold">${x.elem}</div>
          </div>`).join("")}
      </div>

      <div class="card tint-mint">
        <div class="eyebrow">달빛의 한마디</div>
        <p class="advice-quote" style="margin-top:8px">${d.advice}</p>
      </div>`;
  }

  function renderSaju() {
    const p = S.profile;
    const el = $("#screen-saju");
    if (!S.sajuShown || !S.lastSaju) {
      el.innerHTML = `
        ${consult("saju", HOSTS.saju.greet)}
        <div style="margin-top:14px">
          <div class="eyebrow">四柱八字</div>
          <div class="h-title" style="margin-top:4px">사주팔자</div>
          <p class="h-sub">생년월일과 태어난 시간으로 4주 8자를 세우고,<br>타고난 기질과 흐름을 8개 챕터로 풀어 드립니다.</p>
          
        </div>
        <div class="card" style="margin-top:13px">
          ${birthForm("sj", p ? { ...p.birth, name: p.name } : null)}
          <button class="btn" id="btnSaju" style="margin-top:18px">사주 보기</button>
        </div>
        <p class="tiny center" style="margin-top:12px">음력·윤달·시간 모름까지 지원합니다 · 1930~2049년</p>
        <p class="disclaimer">사주 풀이는 전통 명리학에 기반한 참고 콘텐츠이며, 미래를 단정하지 않습니다.</p>
      `;
      bindBirthForm("sj");
      if (p) {
        $("#sj-name").value = p.name || "";
        $("#sj-y").value = p.birth.y; $("#sj-m").value = p.birth.m; $("#sj-d").value = p.birth.d;
        $("#sj-h").value = p.birth.hour; $("#sj-mi").value = p.birth.minute || 0;
        if (p.birth.isLunar) $$("#sj-cal button").forEach(b => b.classList.toggle("on", b.dataset.v === "lunar"));
        if (p.gender === "male") $$("#sj-gender button").forEach(b => b.classList.toggle("on", b.dataset.v === "male"));
        if (p.birth.unknownTime) $("#sj-unknown").checked = true;
      }
      $("#btnSaju").onclick = () => {
        const b = readBirthForm("sj");
        const s = E.computeSaju(b);
        if (s.error) { toast(s.error); return; }
        talk("saju", NOD_LINE.saju);
        showLoading("만세력을 펴는 중", "절기와 오행을 계산하고 있어요");
        setTimeout(() => {
          hideLoading();
          S.lastSaju = s;
          S.profile = {
            name: b.name || (S.profile && S.profile.name) || "", gender: b.gender,
            birth: { y: b.y, m: b.m, d: b.d, hour: b.hour, minute: b.minute, isLunar: b.isLunar, unknownTime: b.unknownTime }
          };
          save();
          S.sajuShown = true;
          renderSaju();
          toast("사주 풀이가 열렸습니다");
        }, 1300);
      };
      bindBokchaeButtons(el);
      return;
    }

    const s = S.lastSaju;
    el.innerHTML = `
      ${consult("saju", "음~ 8자를 세워 보았습니다. 천천히 읽어 보세요.", { compact: true })}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
        <div>
          <div class="eyebrow">四柱八字</div>
          <div class="h-title" style="font-size:22px">${esc((s.name || "나") + "의 사주")}</div>
        </div>
        <button class="chip plain" id="btnSajuAgain">다시 보기</button>
      </div>
      <div style="margin-top:12px">${sajuResultHTML(s, true)}</div>
      <p class="disclaimer">사주 풀이는 전통 명리학에 기반한 참고 콘텐츠이며, 미래를 단정하지 않습니다.</p>
    `;
    $("#btnSajuAgain").onclick = () => { S.sajuShown = false; renderSaju(); };
    bindBokchaeButtons(el);
  }

  /* ============================================================
     3) 타로 — 펼쳐진 카드 중에서 사용자가 직접 골라 뒤집는다
     ============================================================ */
  const T = { drawn: [], topic: null, deep: false, spread: [], busy: false };
  const cardArt = (n) => `assets/img/tarot/tarot-${String(n).padStart(2, "0")}.webp`;
  const TAROT_SPREAD_N = 7;

  // 덱에서 서로 다른 카드 n장을 뽑아 섞는다 (역방향 약 3할)
  function makeSpread(n) {
    const pool = window.TAROT_DECK.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n).map(card => ({ card, reversed: Math.random() > 0.68 }));
  }

  // 뒷면만 보이는 카드
  function tarotBackHTML() {
    return `<div class="tcard"><div class="inner"><div class="face back"></div><div class="face front"></div></div></div>`;
  }

  // 앞면(생성한 타로 일러스트)까지 그린 카드
  function tarotCardHTML(pick, extra) {
    return `<div class="tcard flipped ${extra || ""}">
      <div class="inner">
        <div class="face back"></div>
        <div class="face front"><img class="${pick.reversed ? "rev" : ""}" src="${cardArt(pick.card.n)}" alt="${esc(pick.card.ko)} 타로 카드" draggable="false"></div>
      </div>
    </div>`;
  }

  // 3장 자리 — 아직 비었으면 점선 자리, 고르면 그 카드
  function pickSlotHTML(pick, i) {
    const pos = T.topic.positions[i];
    if (!pick) {
      return `<div class="pick-slot empty" data-k="${i}">
        <div class="ph"><div><b>✧</b>${pos}</div></div>
        <div class="slot-label">${i + 1}번째 자리</div>
      </div>`;
    }
    return `<div class="pick-slot" data-k="${i}">
      ${tarotCardHTML(pick)}
      <div class="slot-label">${pos}</div>
    </div>`;
  }

  // 카드를 뒤집는 소리 (짧은 종이 마찰음)
  let tarotAc = null;
  function tarotFlipSfx() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      tarotAc = tarotAc || new AC();
      if (tarotAc.state === "suspended") tarotAc.resume();
      const ctx = tarotAc, dur = 0.26;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const p = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - p, 2.6) * Math.min(1, p * 14);
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2100; bp.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = 0.09;
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(ctx.currentTime);
    } catch (e) { }
  }

  function renderTarot() {
    const el = $("#screen-tarot");

    /* ---- 1. 고민 분야 고르기 ---- */
    if (!T.topic) {
      el.innerHTML = `
        ${consult("tarot", HOSTS.tarot.greet)}
        <div style="margin-top:14px">
          <div class="eyebrow">Tarot · 메이저 아르카나</div>
          <div class="h-title" style="margin-top:4px">타로 카드</div>
          <p class="h-sub">지금 가장 궁금한 분야를 고르고,<br>펼쳐진 카드 중에서 세 장을 직접 골라 보세요.</p>
        </div>
        <div class="section-title">고민 분야</div>
        <div class="chips">
          ${window.TAROT_TOPICS.map(t => `<button class="chip" data-topic="${t.id}">${t.icon} ${t.label}</button>`).join("")}
        </div>
        <div class="tarot-stage">
          <div class="tarot-deck">${[0, 1, 2].map(() => tarotBackHTML()).join("")}</div>
        </div>
        <p class="tiny center">분야를 고르면 카드가 펼쳐집니다</p>
      `;
      $$("#screen-tarot .chip[data-topic]").forEach(b => b.onclick = () => {
        T.topic = window.TAROT_TOPICS.find(t => t.id === b.dataset.topic);
        T.drawn = []; T.deep = false; T.spread = makeSpread(TAROT_SPREAD_N); T.busy = false;
        renderTarot();
      });
      bindBokchaeButtons(el);
      return;
    }

    /* ---- 2. 직접 카드 고르기 ---- */
    if (T.drawn.length < 3) {
      if (!T.spread.length) T.spread = makeSpread(TAROT_SPREAD_N);
      const pos = T.topic.positions;
      el.innerHTML = `
        <button class="chip plain" id="btnTarotBack">← 분야 다시 고르기</button>
        <div class="eyebrow" style="margin-top:14px">${T.topic.icon} ${T.topic.label}</div>
        <div class="h-title" style="margin-top:4px;font-size:23px">카드를 직접 골라 주세요</div>
        <p class="h-sub">뒷면 카드 ${T.spread.length}장이 펼쳐져 있어요.<br>마음이 끌리는 카드를 한 장씩 눌러 뒤집어 보세요.</p>

        <div class="tarot-picks" id="picks">
          ${pos.map((p, i) => pickSlotHTML(T.drawn[i], i)).join("")}
        </div>

        <div class="tarot-fan-wrap">
          <div class="tarot-fan" id="deck">
            ${T.spread.map((s, i) => {
              const d = i - (TAROT_SPREAD_N - 1) / 2;
              const used = T.drawn.some(d => d.si === i);
              return `<div class="tcard ${used ? "flipped used" : "pickable"}" data-i="${i}" role="button" tabindex="0" aria-label="${i + 1}번째 카드 뒤집기"
                style="--dx:${d * 42}px;--rot:${d * 3.4}deg;--dy:${d * d * 2.6}px;z-index:${10 - Math.abs(d)}">
                <div class="inner">
                  <div class="face back"></div>
                  <div class="face front"><img class="${s.reversed ? "rev" : ""}" src="${cardArt(s.card.n)}" alt="" draggable="false"></div>
                </div>
              </div>`;
            }).join("")}
          </div>
          <div class="tarot-table"></div>
        </div>

        <p class="tiny center" id="pickHint" style="margin-top:6px">${T.drawn.length ? (3 - T.drawn.length) + "장 더 골라 주세요" : "세 장을 골라 주세요"}</p>
        <button class="chip plain" id="btnShuffle" style="display:block;margin:10px auto 0">카드 섞기</button>
      `;
      $$("#deck .tcard").forEach(c => {
        c.onclick = () => pickFromFan(c);
        c.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickFromFan(c); } };
      });
      $("#btnTarotBack").onclick = () => { T.topic = null; T.drawn = []; T.spread = []; renderTarot(); };
      $("#btnShuffle").onclick = () => {
        if (T.busy) return;
        T.drawn = []; T.spread = makeSpread(TAROT_SPREAD_N); renderTarot();
        toast("카드를 다시 섞었어요");
      };
      bindBokchaeButtons(el);
      return;
    }

    /* ---- 3. 결과 — 고른 카드의 일러스트와 해석 ---- */
    const picks = T.drawn;
    el.innerHTML = `
      <button class="chip plain" id="btnTarotBack">← 분야 다시 고르기</button>
      <div class="eyebrow" style="margin-top:14px">${T.topic.icon} ${T.topic.label} · ${picks.length}장 배열</div>
      <div class="h-title" style="margin-top:4px;font-size:22px">${esc(S.profile && S.profile.name ? S.profile.name + "님이 고른 카드" : "고른 카드")}</div>
      <div class="tarot-slots" style="margin-top:14px">
        ${picks.map((p, i) => `
          <figure>
            ${tarotCardHTML(p, "lg")}
            <div class="slot-pos">${T.topic.positions[i]}</div>
            <div class="slot-name">${p.card.ko}</div>
            <div class="slot-dir">${p.card.roman} · ${p.reversed ? "역방향" : "정방향"}</div>
          </figure>`).join("")}
      </div>

      <div class="card" style="margin-top:16px">
        <div class="eyebrow">1차 해석</div>
        ${picks.map((p, i) => {
          const o = p.reversed ? p.card.rev : p.card.up;
          return `<div class="card-read">
            <div class="cr-head">
              <div class="cr-name">${T.topic.positions[i]} · ${p.card.ko}</div>
              <span class="cr-dir">${p.reversed ? "역방향" : "정방향"}</span>
            </div>
            <p>${o.kw.join(" · ")}</p>
          </div>`;
        }).join("")}
      </div>

      ${deepTarotHTML(picks)}

      <div class="btn-row">
        <button class="btn dark" id="btnTarotAgain">다시 뽑기</button>
        <button class="btn ghost" id="btnTarotShare">보관하기</button>
      </div>
      <p class="disclaimer">타로는 참고용 오락 콘텐츠입니다. 중요한 결정은 스스로 판단해 주세요.</p>
    `;
    $("#btnTarotBack").onclick = () => { T.topic = null; T.drawn = []; T.spread = []; renderTarot(); };
    $("#btnTarotAgain").onclick = () => { T.drawn = []; T.deep = false; T.spread = makeSpread(TAROT_SPREAD_N); renderTarot(); };
    $("#btnTarotShare").onclick = () => toast("이 기기에 결과를 보관했습니다");
    bindBokchaeButtons(el);
  }

  // 팬에서 카드 한 장을 눌렀을 때 — 뒤집고, 자리로 옮긴다
  function pickFromFan(el) {
    const i = +el.dataset.i;
    if (T.busy || !T.spread[i] || T.drawn.some(d => d.si === i)) return;
    T.busy = true;
    const pick = Object.assign({ si: i }, T.spread[i]);
    el.classList.add("flipped");
    el.classList.remove("pickable");
    tarotFlipSfx();
    setTimeout(() => {
      T.drawn.push(pick);
      const k = T.drawn.length - 1;
      const slot = $(`#picks .pick-slot[data-k="${k}"]`);
      if (slot) {
        slot.classList.remove("empty");
        slot.innerHTML = tarotCardHTML(pick) + `<div class="slot-label">${T.topic.positions[k]}</div>`;
        slot.classList.add("just");
      }
      el.classList.add("used");
      const hint = $("#pickHint");
      if (hint) hint.textContent = T.drawn.length >= 3 ? "세 장을 모두 골랐어요 · 카드를 펼치는 중" : `${3 - T.drawn.length}장 더 골라 주세요`;
      T.busy = false;
      if (T.drawn.length >= 3) {
        S.usage.tarotDraws = (S.usage.tarotDraws || 0) + 1;
        save();
        setTimeout(() => {
          showLoading("카드를 펼치는 중", "달빛이 카드의 의미를 읽고 있어요");
          setTimeout(() => { hideLoading(); T.spread = []; renderTarot(); }, 1100);
        }, 700);
      }
    }, 700);
  }

  function deepTarotHTML(picks) {
    return `
      <div class="card" style="margin-top:13px">
        <div class="eyebrow">심층 해석</div>
        ${picks.map((p, i) => {
          const o = p.reversed ? p.card.rev : p.card.up;
          return `<div style="margin-top:14px">
            <div class="section-title" style="margin:0 0 5px">${T.topic.positions[i]} · ${p.card.ko} ${p.reversed ? "역방향" : "정방향"}</div>
            <p class="small" style="margin:0">${o.text}</p>
          </div>`;
        }).join("")}
        <div class="divider"></div>
        <div class="section-title" style="margin:0 0 6px">세 장이 말하는 것</div>
        <p class="small" style="margin:0 0 9px">${picks[0].card.ko}에서 시작해 ${picks[1].card.ko}를 지나 ${picks[2].card.ko}로 향하는 흐름입니다. ${picks[2].reversed ? "마지막 카드가 역방향이라 결과를 서두르면 어긋날 수 있습니다. 한 걸음씩 확인하며 가세요." : "마지막 카드가 정방향이라 지금의 방향을 밀고 나가도 좋습니다."}</p>
        <p class="advice-quote" style="margin-top:9px">“${picks[0].card.advice}”</p>
      </div>`;
  }

  /* ============================================================
     4) 궁합
     ============================================================ */
  const G = { step: 1 };
  function renderGungap() {
    const el = $("#screen-gungap");
    if (G.step === 1) {
      const last = S.lastGungap || null;
      /* 지난번에 적은 이름·생년월일은 그대로 채워 둔다 (다시 입력이 편하게) */
      const preA = last && last.a ? { ...last.a }
        : (S.profile ? { ...S.profile.birth, name: S.profile.name, gender: S.profile.gender } : null);
      const preB = last && last.b ? { ...last.b } : null;
      const relVal = last && last.rel ? last.rel : "";
      const REL_CHIPS = ["연인", "부부", "부모와 자녀", "친구", "직장 동료"];
      el.innerHTML = `
        ${consult("gungap", HOSTS.gungap.greet)}
        <div style="margin-top:14px">
          <div class="eyebrow">宮合</div>
          <div class="h-title" style="margin-top:4px">궁합</div>
          <p class="h-sub">이름만 적어도, 생년월일까지 넣으면 더 깊이.<br>연인·부부·가족·동업 상대까지.</p>
          
        </div>
        <div class="card" style="margin-top:13px">
          <div class="eyebrow">첫 번째 사람</div>
          <div style="margin-top:9px">${birthForm("ga", preA, { optional: true })}</div>
        </div>
        <div class="card">
          <div class="eyebrow">두 번째 사람</div>
          <div style="margin-top:9px">${birthForm("gb", preB, { optional: true })}</div>
        </div>
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px">
            <label class="label" for="gg-rel" style="margin-bottom:0">두 사람의 관계 <span class="tiny" style="font-weight:400">(선택)</span></label>
            <button class="chip plain" id="btnGungapMic" type="button" hidden
              aria-label="말로 두 사람의 관계 쓰기" aria-pressed="false">🎙️ 말로 쓰기</button>
          </div>
          <input class="input" id="gg-rel" maxlength="20" value="${esc(relVal)}"
            placeholder="예) 연인 · 부부 · 친구">
          <div class="chips" style="margin-top:9px">
            ${REL_CHIPS.map(t => `<button class="chip plain" type="button" data-rel="${t}">${t}</button>`).join("")}
          </div>
          <p class="tiny" style="margin:8px 0 0">비워 두어도 괜찮아요. 적어 주시면 그 관계에 맞춰 풀이를 다듬어 드립니다.</p>
        </div>
        <button class="btn" id="btnGungap" style="margin-top:16px">궁합 보기</button>
        <p class="tiny center" style="margin-top:10px">이름만 적으면 이름 궁합, 생년월일을 고르면 사주 궁합까지 함께 봅니다.</p>
        <p class="disclaimer">궁합은 두 사람의 기질과 흐름을 비교한 참고 콘텐츠입니다. 관계를 단정하지 않습니다.</p>
      `;
      bindBirthForm("ga"); bindBirthForm("gb");

      /* 말로 쓰기 — 마이크로 말해 관계 칸에 받아 적는다 (미지원 브라우저는 버튼 숨김) */
      setupMic({
        scope: "gungap", btn: "#btnGungapMic", input: "#gg-rel", max: 20,
        aria: "말로 두 사람의 관계 쓰기", tip: "🎙️ 말씀하시면 관계 칸에 받아 적어요"
      });

      const relIn = $("#gg-rel");
      const relChips = $$("#screen-gungap .chip[data-rel]");
      const syncRelChips = () => relChips.forEach(c => c.classList.toggle("on", c.dataset.rel === relIn.value.trim()));
      relChips.forEach(c => c.onclick = () => {
        const t = c.dataset.rel;
        relIn.value = relIn.value.trim() === t ? "" : t;
        relIn.dispatchEvent(new Event("input"));
        syncRelChips();
      });
      relIn.addEventListener("input", syncRelChips);
      syncRelChips();

      $("#btnGungap").onclick = () => {
        if (STT.active("gungap")) STT.stop("gungap");     // 말하다 만 내용까지 칸에 남긴 뒤 읽는다
        const a = readBirthForm("ga"), b = readBirthForm("gb");
        const relText = (relIn.value || "").trim();
        const canName = !!(a.name && b.name);
        const canBirth = a.hasBirth && b.hasBirth;
        if (!canName && !canBirth) {
          toast(a.name || b.name
            ? "두 사람의 이름을 모두 적거나, 생년월일을 모두 골라 주세요"
            : "두 사람의 이름이나 생년월일을 적어 주세요");
          return;
        }
        talk("gungap", NOD_LINE.gungap);
        showLoading("두 사람의 기운을 맞춰 보는 중", canBirth ? "사주와 이름을 함께 살펴보고 있어요" : "이름의 소리와 획수를 살펴보고 있어요");
        setTimeout(() => {
          hideLoading();
          const res = C.gungap(a, b, { rel: relText });
          if (res.error) { toast(res.error); return; }
          S.lastGungap = { a, b, res, rel: relText };
          S.usage.gungapRuns = (S.usage.gungapRuns || 0) + 1;
          save();
          G.step = 2;
          renderGungap();
        }, canBirth ? 1300 : 900);
      };
      bindBokchaeButtons(el);
      return;
    }

    const { res } = S.lastGungap;
    const mode = res.mode || "both";
    const tag = mode === "both" ? "사주 + 이름" : mode === "saju" ? "사주" : "이름";
    const nmA = res.a.name || "첫 번째 사람", nmB = res.b.name || "두 번째 사람";
    const dayOf = (p) => (p && p.sa && p.sa.pillars && p.sa.pillars.day)
      ? `${E.CHEONGAN_KR[p.sa.pillars.day.s]}${E.GANJI_KR[p.sa.pillars.day.b]}일간` : "이름으로 봄";
    el.innerHTML = `
      <button class="chip plain" id="btnGungapBack">← 다시 입력</button>
      <div class="eyebrow" style="margin-top:14px">宮合 · ${tag}</div>
      ${res.relTitle ? `<div class="chips" style="margin-top:8px"><span class="pill gold">${esc(res.relTitle)}</span></div>` : ""}
      <div class="card gold-edge" style="margin-top:12px">
        <div class="compat-head">
          <div class="compat-person">
            <div class="avatar">${esc((res.a.name || "①").slice(0, 1))}</div>
            <div class="nm">${esc(nmA)}</div>
            <div class="sc">${dayOf(res.a)}</div>
          </div>
          <div class="heart">♥</div>
          <div class="compat-person">
            <div class="avatar">${esc((res.b.name || "②").slice(0, 1))}</div>
            <div class="nm">${esc(nmB)}</div>
            <div class="sc">${dayOf(res.b)}</div>
          </div>
        </div>
        <div class="gauge-ring" style="margin-top:16px">
          ${ring(res.score, 132, 10)}
          <div class="val"><span>${res.score}<small>점</small></span></div>
        </div>
        ${res.elemNote ? `<p class="center small" style="margin:9px 0 0">${esc(res.elemNote)}</p>` : ""}
      </div>

      ${res.parts ? `
      <div class="card">
        <div class="section-title" style="margin-top:0">영역별 궁합</div>
        ${res.parts.map(p => `
          <div class="stat-line" style="margin-top:9px">
            <div style="color:var(--ink-soft);font-size:13.5px">${esc(p.name)}</div>
            <div class="track"><div class="fill" style="width:${p.v}%"></div></div>
            <div style="text-align:right;font-size:13.5px">${p.v}</div>
          </div>`).join("")}
      </div>` : ""}

      ${mode !== "name" ? `
      <div class="card">
        <div class="section-title" style="margin-top:0">사주로 보는 궁합</div>
        <p class="small" style="margin:0 0 9px">${esc(res.branchNote)}</p>
        <p class="small" style="margin:0 0 9px">${esc(res.yearNote)}</p>
        <p class="small" style="margin:0">${esc(res.goodText)}</p>
      </div>` : ""}

      ${res.nameG ? `
      <div class="card">
        <div class="section-title" style="margin-top:0">이름 궁합</div>
        <div class="name-card">
          <div class="name-hanja" style="font-size:22px">${esc(res.a.name)}</div>
          <div class="name-meaning">끝소리 기운 ${E.ELEM_KR[N.eumryeong(res.a.name[res.a.name.length - 1])]}</div>
          <div class="name-hanja" style="font-size:22px">${esc(res.b.name)}</div>
        </div>
        <p class="small" style="margin:9px 0 0">${esc(res.nameG.text)}</p>
      </div>` : ""}

      ${res.nameParts ? `
      <div class="card">
        <div class="section-title" style="margin-top:0">이름으로 보는 두 사람</div>
        ${res.nameParts.map((p, i) => `
          <div style="margin-top:${i ? 12 : 4}px">
            <div class="eyebrow" style="font-size:11px">${esc(p.label)}</div>
            <p class="small" style="margin:4px 0 0">${esc(p.text)}</p>
          </div>`).join("")}
      </div>` : ""}

      <div class="card tint-mint">
        <div class="eyebrow">달빛의 조언</div>
        <p class="advice-quote" style="margin-top:8px">${esc(res.advice)}</p>
        ${res.warnText ? `<p class="small" style="margin:10px 0 0">${esc(res.warnText)}</p>` : ""}
        ${res.relNote ? `<p class="small" style="margin:10px 0 0">${esc(res.relNote)}</p>` : ""}
      </div>

      ${mode === "name" && res.nudge ? `
      <div class="card">
        <div class="eyebrow">한 걸음 더</div>
        <p class="small" style="margin:6px 0 0">${esc(res.nudge)}</p>
        <button class="btn ghost sm" id="btnGungapMore" style="margin-top:12px">생년월일 넣고 더 깊이 보기</button>
      </div>` : ""}
      <p class="disclaimer">궁합은 두 사람의 기질과 흐름을 비교한 참고 콘텐츠입니다. 관계를 단정하지 않습니다.</p>
    `;
    $("#btnGungapBack").onclick = () => { G.step = 1; renderGungap(); };
    const more = $("#btnGungapMore");
    if (more) more.onclick = () => { G.step = 1; renderGungap(); };
    bindBokchaeButtons(el);
  }

  /* ============================================================
     5) 작명 · 이름 풀이
     ============================================================ */
  const NM = { tab: "make", result: null, rec: null };
  function renderNaming() {
    const el = $("#screen-naming");
    el.innerHTML = `
      ${consult("naming", HOSTS.naming.greet)}
      <div style="margin-top:14px">
        <div class="eyebrow">作名 · 姓名學</div>
        <div class="h-title" style="margin-top:4px">작명 · 이름 풀이</div>
        
      </div>
      <div class="tabs">
        <button class="tab ${NM.tab === "make" ? "on" : ""}" data-tab="make">이름 작명</button>
        <button class="tab ${NM.tab === "check" ? "on" : ""}" data-tab="check">이름 풀이</button>
      </div>
      ${NM.tab === "make" ? namingMakeHTML() : namingCheckHTML()}
      <p class="disclaimer">작명·이름 풀이는 전통 성명학 이론에 따른 참고안입니다. 유파에 따라 달라질 수 있습니다.</p>
    `;
    $$("#screen-naming .tab").forEach(b => b.onclick = () => { NM.tab = b.dataset.tab; renderNaming(); });
    if (NM.tab === "make") bindMake(); else bindCheck();
    bindBokchaeButtons(el);
  }

  function namingMakeHTML() {
    const moods = Object.keys(N.MOODS).map(k => `<button class="chip" data-mood="${k}">${N.MOODS[k].label}</button>`).join("");
    if (!NM.rec) {
      return `
        <p class="h-sub" style="margin-top:12px">성씨와 원하는 분위기를 고르면<br>수리 4격과 오행을 통과한 이름을 골라 드립니다.</p>
        <div class="card" style="margin-top:12px">
          <div class="field">
            <label class="label">성씨</label>
            <div class="row-2">
              <input class="input" id="nm-sur" placeholder="예: 김" maxlength="2" value="${S.profile && S.profile.surname ? esc(S.profile.surname) : ""}">
              <select class="select" id="nm-surhanja"></select>
            </div>
          </div>
          <div class="field">
            <label class="label">성별</label>
            <div class="seg" id="nm-gender"><button data-v="female" class="on">여성</button><button data-v="male">남성</button></div>
          </div>
          <div class="field">
            <label class="label">원하는 분위기</label>
            <div class="chips" id="nm-mood">${moods}</div>
          </div>
          <button class="btn" id="btnMake" style="margin-top:18px">이름 8개 추천받기</button>
        </div>
        <p class="tiny center" style="margin-top:10px">획수는 원획 기준이며, 실제 감정은 유파에 따라 다를 수 있습니다.</p>`;
    }
    return `
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <div>
          <div class="eyebrow">${esc(NM.rec.mood)} ${esc(NM.rec.genderLabel || "")} 이름</div>
          <div class="h-title" style="font-size:20px;margin-top:2px">${esc(NM.rec.sur)}씨에게</div>
        </div>
        <button class="chip plain" id="btnMakeReset">다시</button>
      </div>
      <div class="free-note" style="margin-top:8px">추천 ${NM.rec.list.length}개</div>
      ${NM.rec.list.map((c, i) => `
        <div class="card" style="margin-top:11px">
          <div class="name-card">
            <div>
              <div class="name-hanja">${c.hanja}</div>
              <div class="name-kr">${esc(c.ko)}</div>
            </div>
            <div class="name-meaning">${esc(c.meaning)}</div>
            <div style="text-align:right">
              <div class="pill ${c.score >= 88 ? "badge-good" : "badge-mid"}">${c.score}점</div>
            </div>
          </div>
          <div class="grid4">
            <div class="g-item"><div class="k">원격</div><div class="v">${c.sagyeok.won.v}수 · ${c.sagyeok.won.s.grade}</div></div>
            <div class="g-item"><div class="k">형격</div><div class="v">${c.sagyeok.hyung.v}수 · ${c.sagyeok.hyung.s.grade}</div></div>
            <div class="g-item"><div class="k">이격</div><div class="v">${c.sagyeok.i.v}수 · ${c.sagyeok.i.s.grade}</div></div>
            <div class="g-item"><div class="k">정격</div><div class="v">${c.sagyeok.jeong.v}수 · ${c.sagyeok.jeong.s.grade}</div></div>
          </div>
          <div class="tiny" style="margin-top:8px">오행 흐름 ${c.elemFlow}${i === 0 ? " · 가장 추천하는 이름" : ""}</div>
        </div>`).join("")}`;
  }

  function namingCheckHTML() {
    if (!NM.result) {
      return `
        <p class="h-sub" style="margin-top:12px">지금 쓰는 이름이 성명학으로 어떤지<br>수리 4격과 오행으로 풀어 드립니다.</p>
        <div class="card" style="margin-top:12px">
          <div class="field">
            <label class="label">성씨</label>
            <input class="input" id="nc-sur" placeholder="예: 김" maxlength="2">
          </div>
          <div class="field">
            <label class="label">이름 (두 글자)</label>
            <div class="row-2">
              <input class="input" id="nc-g1" placeholder="첫 글자" maxlength="1">
              <input class="input" id="nc-g2" placeholder="둘째 글자" maxlength="1">
            </div>
          </div>
          <div class="field">
            <label class="label">한자 선택 <span class="tiny">(모르면 비워두세요)</span></label>
            <div class="row-2">
              <select class="select" id="nc-h1"><option value="">첫 글자 한자</option></select>
              <select class="select" id="nc-h2"><option value="">둘째 글자 한자</option></select>
            </div>
          </div>
          <button class="btn" id="btnCheck" style="margin-top:18px">이름 풀이 보기</button>
        </div>
        <p class="tiny center" style="margin-top:10px">한자를 고르지 않으면 가장 널리 쓰이는 한자로 풀이합니다.</p>`;
    }
    const r = NM.result;
    return `
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <div>
          <div class="eyebrow">이름 풀이</div>
          <div class="h-title" style="font-size:20px;margin-top:2px">${esc(r.hanjaFull)} ${r.pure ? "" : `<span class="gold" style="font-size:17px">${esc(r.korean)}</span>`}</div>
          <div class="tiny" style="margin-top:1px">${r.pure ? "순우리말 이름 · 한글 자모 획수로 계산" : "한자 이름"}</div>
        </div>
        <button class="chip plain" id="btnCheckReset">다시</button>
      </div>
      <div class="card gold-edge" style="margin-top:12px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="eyebrow">종합 평가</div>
            <div class="h-title" style="font-size:23px;margin-top:2px">${r.grade}</div>
          </div>
          <div class="gauge-ring" style="width:92px;height:92px;margin:0">
            ${ring(r.score, 92, 8)}
            <div class="val" style="font-size:22px"><span>${r.score}</span></div>
          </div>
        </div>
        <p class="small" style="margin:9px 0 0">${r.comments.join(" ")}</p>
      </div>
      <div class="card">
        <div class="section-title" style="margin-top:0">수리 4격</div>
        <div class="grid4">
          ${r.sagyeok.map(s => `<div class="g-item">
            <div class="k">${s.key}</div>
            <div class="v">${s.v}수 · ${s.s.name}</div>
            <div class="pill ${["대길", "길"].includes(s.s.grade) ? "badge-good" : s.s.grade === "반길" ? "badge-mid" : "badge-bad"}" style="margin-top:5px;display:inline-block">${s.s.grade}</div>
          </div>`).join("")}
        </div>
        <p class="tiny" style="margin-top:9px">${r.sagyeok.map(s => `${s.key} ${s.v}수 — ${s.s.mean}`).join(" / ")}</p>
      </div>
      <div class="card">
        <div class="section-title" style="margin-top:0">소리와 뜻의 오행</div>
        <p class="small" style="margin:0 0 7px">발음 오행(음령) — ${r.eum.map((e, i) => `${["성", "이름1", "이름2"][i] || ""} ${E.ELEM_KR[e]}(${e})`).join(" · ")}</p>
        <p class="small" style="margin:0 0 7px">한자 자원오행 — ${r.jaywon.map((e) => `${E.ELEM_KR[e]}(${e})`).join(" → ")}</p>
        <p class="small" style="margin:0">${r.meaning.join(" / ")}</p>
      </div>`;
  }

  function bindMake() {
    if (NM.rec) {
      $("#btnMakeReset").onclick = () => { NM.rec = null; renderNaming(); };
      return;
    }
    $$("#nm-mood .chip").forEach(c => c.onclick = () => {
      $$("#nm-mood .chip").forEach(x => x.classList.remove("on"));
      c.classList.add("on");
    });
    $$("#nm-gender button").forEach(b => b.onclick = () => {
      $$("#nm-gender button").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
    });
    const surEl = $("#nm-sur");
    const fill = () => {
      const s = surEl.value.trim();
      const list = window.SURNAMES[s] || [];
      $("#nm-surhanja").innerHTML = list.length
        ? list.map(([h, st]) => `<option value="${h}">${h} (${st}획)</option>`).join("")
        : `<option value="">한자 자동</option>`;
    };
    surEl.addEventListener("input", fill); fill();
    $("#btnMake").onclick = () => {
      const sur = surEl.value.trim();
      const mood = ($("#nm-mood .on") || {}).dataset ? $("#nm-mood .on").dataset.mood : "bright";
      const gender = ($("#nm-gender .on") || {}).dataset ? $("#nm-gender .on").dataset.v : "female";
      if (!sur) { toast("성씨를 적어 주세요"); return; }
      if (!window.SURNAMES[sur]) { toast("성씨를 확인해 주세요 (예: 김, 이, 박)"); return; }
      talk("naming", NOD_LINE.naming);
      showLoading("이름을 짓는 중", "획수와 오행을 맞춰 보고 있어요");
      setTimeout(() => {
        hideLoading();
        const rec = N.recommend({ surname: sur, surnameHanja: $("#nm-surhanja").value, gender, mood, count: 8 });
        if (rec.error) { toast(rec.error); return; }
        if (!rec.list.length) { toast("조건에 맞는 이름을 찾지 못했어요. 분위기를 바꿔 보세요."); return; }
        rec.sur = sur;
        NM.rec = rec;
        S.usage.namingRuns = (S.usage.namingRuns || 0) + 1;
        S.profile = Object.assign({}, S.profile || {}, { surname: sur });
        save();
        renderNaming();
        toast("이름 8개를 골라 드렸어요");
      }, 1200);
    };
  }

  function bindCheck() {
    if (NM.result) {
      $("#btnCheckReset").onclick = () => { NM.result = null; renderNaming(); };
      return;
    }
    const g1 = $("#nc-g1"), g2 = $("#nc-g2");
    const h1 = $("#nc-h1"), h2 = $("#nc-h2");
    const fillH = (input, sel) => {
      const ch = input.value.trim();
      const list = window.NAME_HANJA[ch] || [];
      sel.innerHTML = `<option value="">한자 자동</option>` + list.map(([h, st, el, mn]) => `<option value="${h}">${h} (${st}획 · ${mn})</option>`).join("");
    };
    g1.addEventListener("input", () => fillH(g1, h1));
    g2.addEventListener("input", () => fillH(g2, h2));
    $("#btnCheck").onclick = () => {
      const sur = $("#nc-sur").value.trim();
      const a = g1.value.trim(), b = g2.value.trim();
      if (!sur || !a) { toast("성씨와 이름을 적어 주세요"); return; }
      const res = N.analyze({
        surname: sur,
        given: [{ ko: a, hanja: h1.value || null }, ...(b ? [{ ko: b, hanja: h2.value || null }] : [])]
      });
      if (res.error) { toast(res.error); return; }
      NM.result = res;
      S.usage.nameChecks = (S.usage.nameChecks || 0) + 1;
      save();
      renderNaming();
    };
  }

  /* ============================================================
     6) 꿈풀이
     ============================================================ */
  const DR = { result: null, text: "" };
  function stopDreamMic(msg) { STT.stop("dream", msg); }   // 방을 나가거나 화면을 다시 그리면 멈춘다

  function renderDream() {
    stopDreamMic();            // 화면을 다시 그리면 듣던 것은 멈춘다
    const el = $("#screen-dream");
    if (!DR.result) {
      el.innerHTML = `
        ${consult("dream", HOSTS.dream.greet)}
        <div style="margin-top:14px">
          <div class="eyebrow">解夢</div>
          <div class="h-title" style="margin-top:4px">꿈풀이</div>
          <p class="h-sub">간밤에 꾼 꿈을 적어 주세요.<br>상징을 읽어 명쾌하게 풀어 드립니다.</p>
          
        </div>
        <div class="card" style="margin-top:13px">
          <div class="field">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px">
              <label class="label" for="dr-text" style="margin-bottom:0">꿈 내용</label>
              <button class="chip plain" id="btnDreamMic" type="button" hidden
                aria-label="말로 꿈 내용 쓰기" aria-pressed="false">🎙️ 말로 쓰기</button>
            </div>
            <textarea class="input" id="dr-text" rows="5" style="min-height:128px;line-height:1.7"
              placeholder="예) 커다란 돼지가 집 안으로 들어와서 안았어요. 기분은 좋았습니다."></textarea>
          </div>
          <div class="chips" style="margin-top:11px">
            ${["돼지 꿈", "이빨 빠지는 꿈", "물에 빠지는 꿈", "뱀 꿈", "하늘을 나는 꿈"].map(t => `<button class="chip plain" data-ex="${t}">${t}</button>`).join("")}
          </div>
          <button class="btn" id="btnDream" style="margin-top:16px">꿈 풀이 보기</button>
        </div>
        <p class="tiny center" style="margin-top:10px">꿈은 미래를 단정하지 않습니다. 마음을 비추는 거울로 읽어 주세요.</p>
        <p class="disclaimer">꿈풀이는 전통 해몽 이론에 기반한 참고 콘텐츠입니다.</p>
      `;
      /* 말로 쓰기 — 마이크로 말하면 꿈 내용 칸에 받아 적는다 (미지원 브라우저는 버튼 숨김) */
      setupMic({
        scope: "dream", btn: "#btnDreamMic", input: "#dr-text",
        aria: "말로 꿈 내용 쓰기", tip: "🎙️ 말씀하시면 꿈 내용 칸에 받아 적어요"
      });
      $$("#screen-dream .chip[data-ex]").forEach(b => b.onclick = () => {
        if (STT.active("dream")) stopDreamMic();
        $("#dr-text").value = b.dataset.ex.replace(" 꿈", "") + " 꿈을 꿨습니다.";
        $$("#screen-dream .chip[data-ex]").forEach(x => x.classList.remove("on"));
        b.classList.add("on");
      });
      $("#btnDream").onclick = () => {
        const text = $("#dr-text").value.trim();
        if (text.length < 2) { toast("꿈 내용을 조금 더 적어 주세요"); return; }
        talk("dream", NOD_LINE.dream);
        showLoading("꿈의 상징을 읽는 중", "달빛 아래에서 해몽하고 있어요");
        setTimeout(() => {
          hideLoading();
          DR.result = C.interpretDream(text);
          DR.text = text;
          S.usage.dreamCount = (S.usage.dreamCount || 0) + 1;
          save();
          renderDream();
        }, 1100);
      };
      bindBokchaeButtons(el);
      return;
    }

    const r = DR.result;
    const tagCls = ["길", "대길"].includes(r.tag) ? "badge-good" : r.tag === "주의" ? "badge-bad" : "badge-mid";
    el.innerHTML = `
      <button class="chip plain" id="btnDreamBack">← 다른 꿈 풀기</button>
      ${consult("dream", "꿈이 들려준 이야기예요. 천천히 읽어 보세요.", { compact: true })}
      <div class="card gold-edge" style="margin-top:12px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="eyebrow">꿈풀이 결과</div>
          <span class="pill ${tagCls}">${r.tag}</span>
        </div>
        <div class="h-title" style="font-size:22px;margin-top:6px">${esc(r.title)}</div>
        <p class="small" style="margin:10px 0 0">${esc(r.text)}</p>
        ${r.text2 ? `<p class="small" style="margin:9px 0 0">${esc(r.text2)}</p>` : ""}
        <div class="chips" style="margin-top:12px">${r.matched.map(m => `<span class="pill gold">${esc(m)}</span>`).join("")}</div>
      </div>
      <div class="card tint-mint">
        <div class="eyebrow">달빛의 조언</div>
        <p class="advice-quote" style="margin-top:8px">${esc(r.advice)}</p>
      </div>
      <div class="card">
        <div class="list-row"><div>내가 적은 꿈</div><div class="r" style="max-width:60%">${esc(DR.text)}</div></div>
        <div class="list-row"><div>오늘 푼 꿈</div><div class="r">${S.usage.dreamCount || 1}번째</div></div>
      </div>
      <button class="btn ghost" id="btnDreamAgain" style="margin-top:12px">다른 꿈 풀기</button>
      <p class="disclaimer">꿈풀이는 전통 해몽 이론에 기반한 참고 콘텐츠입니다.</p>
    `;
    $("#btnDreamBack").onclick = () => { DR.result = null; renderDream(); };
    $("#btnDreamAgain").onclick = () => { DR.result = null; renderDream(); };
    bindBokchaeButtons(el);
  }

  /* ============================================================
     7) 기도 · 명상방
     ============================================================ */
  function renderMeditation() {
    const el = $("#screen-meditation");
    el.innerHTML = `
      <button class="chip plain" id="btnMedBack">← 마을로</button>
      <div class="hello" style="padding-top:10px">
        <div class="eyebrow">기도실 · 명상방</div>
        <h1 style="font-size:23px">잠시 마음을 쉬어 가세요</h1>
      </div>

      <div class="med-room" id="medRoom">
        <div class="med-moon"></div>
        <div class="med-monk"><img src="${IMG}sage-monk.webp" alt="명상하는 스님"></div>
        <div class="med-candle" id="medCandle">
          <div class="flame"></div>
          <div class="body"></div>
          <span class="med-candle-tip" id="medCandleTip">🕯️ 여기 촛불</span>
        </div>
        <div class="med-timer-wrap">
          <div class="med-timer" id="medTime">3:00<small> / 3:00</small></div>
          <div class="breath-text" id="medBreath"><span class="breath-dot"></span>준비되면 명상을 시작해 보세요</div>
        </div>
      </div>

      <button class="med-candle-btn" id="medCandleBtn" type="button" aria-pressed="false" aria-label="소원 촛불 켜기">
        <span class="ico">🕯️</span><b>촛불 켜기</b><i class="spark">✨</i>
      </button>

      <div class="sound-row">
        <button class="snd-btn" data-sound="bowl"><span class="ico">🔔</span>싱잉볼</button>
        <button class="snd-btn" data-sound="moktak"><span class="ico">🥁</span>목탁</button>
        <button class="snd-btn" data-sound="rain"><span class="ico">🌧️</span>빗소리</button>
      </div>

      <div class="voice-row">
        <button class="voice-toggle on" id="medVoiceToggle" type="button" aria-pressed="true" aria-label="호흡 음성 안내 끄기">
          <span class="ico">🗣️</span><span class="lb">호흡 음성 안내</span><i class="sw" aria-hidden="true"></i><span class="st">켜짐</span>
        </button>
      </div>

      <div class="med-len">
        <button data-min="1">1분</button>
        <button data-min="3" class="on">3분</button>
        <button data-min="5">5분</button>
      </div>
      <button class="btn" id="medStart" style="margin-top:12px">명상 시작</button>
      <p class="med-caption">왼쪽 촛불을 눌러도 켜져요 · 소리는 이 기기에서만 들립니다</p>
      <p class="disclaimer">명상은 마음을 가다듬기 위한 참고 콘텐츠이며, 의료적 치료를 대신하지 않습니다.</p>
    `;
    $("#btnMedBack").onclick = () => App.go("village");
    M.mount({
      root: el,
      toast,
      onFinish: () => { }
    });
    bindBokchaeButtons(el);
  }

  /* ============================================================
     시트 (프로필 · 소원등 · 설정)
     ============================================================ */
  function profileSheet() {
    const p = S.profile;
    openSheet(`
      <div class="grabber"></div>
      <div class="eyebrow">내 정보</div>
      <div class="h-title" style="font-size:21px;margin-top:4px">생년월일 등록</div>
      <p class="tiny" style="margin-top:5px">한 번만 등록하면 오늘의 운세·사주·궁합이 자동으로 채워집니다.</p>
      <div style="margin-top:13px">${birthForm("pf", p ? { ...p.birth, name: p.name } : null)}</div>
      <button class="btn" id="btnProfileSave" style="margin-top:16px">저장하기</button>
      <button class="btn ghost sm" id="btnProfileClose" style="margin-top:8px">닫기</button>
    `);
    bindBirthForm("pf");
    if (p) {
      $("#pf-name").value = p.name || "";
      $("#pf-y").value = p.birth.y; $("#pf-m").value = p.birth.m; $("#pf-d").value = p.birth.d;
      $("#pf-h").value = p.birth.hour;
      if (p.gender === "male") $$("#pf-gender button").forEach(b => b.classList.toggle("on", b.dataset.v === "male"));
      if (p.birth.isLunar) $$("#pf-cal button").forEach(b => b.classList.toggle("on", b.dataset.v === "lunar"));
      if (p.birth.unknownTime) $("#pf-unknown").checked = true;
    }
    $("#btnProfileClose").onclick = closeSheet;
    $("#btnProfileSave").onclick = () => {
      const b = readBirthForm("pf");
      S.profile = Object.assign({}, S.profile || {}, {
        name: b.name, gender: b.gender,
        birth: { y: b.y, m: b.m, d: b.d, hour: b.hour, minute: b.minute, isLunar: b.isLunar, unknownTime: b.unknownTime }
      });
      save(); closeSheet();
      if (window.DalbitWorld && window.DalbitWorld.ready) window.DalbitWorld.setProfile(S.profile);
      if (App.current === "today") renderToday();
      if (App.current === "village") renderVillageHome();
      toast("저장했습니다");
    };
  }

  function spawnLantern(text) {
    // 3D 마을 위로 소원등이 떠오른다
    if (window.DalbitWorld && window.DalbitWorld.ready) window.DalbitWorld.wishLanterns(3);
  }

  /* 소원등은 연못가 '소원등 터'에서 띄운다.
     마을에 있으면 캐릭터가 그 자리까지 걸어간 뒤 창이 열리고(가까우면 바로),
     다른 화면에서는 곧바로 창을 연다. */
  let wishGoing = false;
  function openWishSpot() {
    const W = window.DalbitWorld;
    if (App.current !== "village" || !W || !W.ready) { wishSheet(); return; }
    if (wishGoing) return;
    let walked = false;
    const go = W.walkToWish(() => {
      wishGoing = false;
      hideWalkHint();
      wishSheet();
    });
    walked = (go === "walk");
    if (walked) {
      wishGoing = true;
      showWalkHint("🏮 연못가 소원등 터로 걸어가는 중…");
    }
  }

  /* 사람들이 가장 많이 비는 소원 — 한 번 누르면 소원 칸에 바로 들어간다
     l = 단추에 보이는 짧은 말, t = 소원 칸에 들어가는 문장 */
  const WISH_PRESETS = [
    { l: "🌿 가족 모두 건강", t: "🌿 가족 모두 건강하게 해 주세요" },
    { l: "💰 재물운 상승", t: "💰 재물운이 활짝 열리게 해 주세요" },
    { l: "🍀 하는 일 술술", t: "🍀 하는 일이 술술 풀리게 해 주세요" },
    { l: "💕 좋은 인연", t: "💕 좋은 인연을 만나게 해 주세요" },
    { l: "🎓 시험·합격 기원", t: "🎓 시험·합격의 기쁨을 누리게 해 주세요" },
    { l: "🧘 마음의 평안", t: "🧘 마음이 늘 평안하기를" }
  ];

  /* 연못 동전 — 연못가로 걸어가서 동전을 던지고, 물걸이 번진 뒤 오늘의 행운 카드가 뜬다 */
  let pondGoing = false;
  function openPondSpot() {
    const W = window.DalbitWorld;
    const V = window.DalbitVillage;
    const luck = () => {
      S.mini.pond = (S.mini.pond || 0) + 1;
      save();
      if (window.DalbitSound) window.DalbitSound.tone(560, 0.5, 0.09, "triangle");
      if (V && V.playPond) V.playPond();
    };
    if (App.current !== "village" || !W || !W.ready) { luck(); return; }
    if (pondGoing) return;
    const go = W.walkToPond(() => {
      pondGoing = false;
      hideWalkHint();
      if (window.DalbitSound) window.DalbitSound.tone(520, 0.18, 0.07, "square");
      W.tossCoin(() => setTimeout(luck, 240));
    });
    if (go === "walk") {
      pondGoing = true;
      showWalkHint("🪙 연못가로 걸어가는 중…");
    }
  }

  function wishSheet() {
    openSheet(`
      <div class="grabber"></div>
      <div class="eyebrow" style="text-align:center">소원등</div>
      <div class="h-title" style="font-size:21px;margin-top:4px;text-align:center">소원을 등불에 새겨 보세요</div>

      <div class="wish-preview">
        <div class="wl">
          <div class="wl-body"><span class="wl-text empty" id="wlText">소원을 적으면 여기에 새겨져요</span></div>
          <div class="wl-bottom"></div>
        </div>
      </div>

      <div class="eyebrow" style="margin-top:2px">자주 비는 소원 · 누르면 바로 들어가요</div>
      <div class="wish-chips" id="wishChips">
        ${WISH_PRESETS.map((w, i) => `<button class="wish-chip" type="button" data-i="${i}">${w.l}</button>`).join("")}
      </div>

      <div class="field" style="margin-top:10px">
        <div class="wish-input-wrap">
          <textarea class="input" id="wishText" rows="3" maxlength="60" style="min-height:88px;line-height:1.7;padding-right:54px"
            placeholder="예) 가족 모두 건강하고, 아이들이 하는 일이 잘 되게 해 주세요."></textarea>
          <button class="wish-mic" id="btnWishMic" type="button" aria-label="말로 소원 쓰기">🎙️</button>
        </div>
      </div>
      <button class="btn" id="btnWish" style="margin-top:12px">등불에 새겨 띄우기</button>
      <button class="btn ghost sm" id="btnWishOil" style="margin-top:8px">🏮 소원등 기름값 보태기</button>
      <button class="btn ghost sm" id="btnWishClose" style="margin-top:8px">닫기</button>
      ${S.mini.wishes.length ? `<div class="divider"></div><div class="eyebrow">지난 소원</div>` +
        S.mini.wishes.slice(0, 3).map(w => `<div class="list-row"><div style="font-size:13.5px">${esc(w.text)}</div><div class="r">${w.at}</div></div>`).join("") : ""}
    `);

    const ta = $("#wishText");
    const label = $("#wlText");
    const chips = $$("#wishChips .wish-chip");
    ta.addEventListener("input", () => {
      const v = ta.value.trim();
      label.textContent = v || "소원을 적으면 여기에 새겨져요";
      label.classList.toggle("empty", !v);
      chips.forEach(c => c.classList.toggle("on", WISH_PRESETS[+c.dataset.i].t === v));
    });

    /* 인기 소원 원터치 — 소원 칸과 등불 미리보기에 바로 들어간다 */
    chips.forEach(ch => {
      ch.onclick = () => {
        const t = WISH_PRESETS[+ch.dataset.i].t;
        ta.value = (ta.value.trim() === t) ? "" : t;
        ta.dispatchEvent(new Event("input"));
        if (window.DalbitSound) window.DalbitSound.tone(720, 0.16, 0.06, "sine");
      };
    });

    /* 말로 쓰기 — 마이크로 말하면 소원 칸에 받아 적는다 */
    const mic = $("#btnWishMic");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (mic) mic.hidden = true;
    } else if (mic) {
      mic.onclick = () => {
        if (wishMic) { try { wishMic.stop(); } catch (e) { } return; }
        let rec;
        try { rec = new SR(); } catch (e) { toast("이 기기에서는 말로 쓰기를 쓸 수 없어요"); return; }
        wishMic = rec;
        rec.lang = "ko-KR";
        rec.interimResults = false;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        mic.classList.add("on");
        mic.textContent = "⏹";
        mic.setAttribute("aria-label", "말로 쓰기 그만두기");
        toast("🎙️ 말씀하시면 소원 칸에 받아 적어요");
        rec.onresult = (e) => {
          let said = "";
          for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript + " ";
          said = said.trim();
          if (!said) return;
          const cur = ta.value.trim();
          ta.value = (cur ? cur + " " : "") + said;
          if (ta.value.length > 60) ta.value = ta.value.slice(0, 60);
          ta.dispatchEvent(new Event("input"));
        };
        rec.onerror = (e) => {
          const err = e && e.error;
          if (err === "not-allowed" || err === "service-not-allowed") toast("마이크 사용을 허락해 주세요");
          else if (err !== "aborted" && err !== "no-speech") toast("잘 알아듣지 못했어요 · 다시 말씀해 주세요");
        };
        rec.onend = () => {
          wishMic = null;
          mic.classList.remove("on");
          mic.textContent = "🎙️";
          mic.setAttribute("aria-label", "말로 소원 쓰기");
        };
        try { rec.start(); } catch (e) { rec.onend(); toast("말로 쓰기를 시작하지 못했어요"); }
      };
    }

    $("#btnWishClose").onclick = closeSheet;
    $("#btnWishOil").onclick = () => Bokchae.open("wish");
    $("#btnWish").onclick = () => {
      const text = ta.value.trim();
      if (text.length < 2) { toast("소원을 조금 더 적어 주세요"); return; }
      S.mini.wishes.unshift({ text: text.slice(0, 60), at: new Date().toLocaleDateString("ko-KR") });
      S.mini.wishes = S.mini.wishes.slice(0, 20);
      S.mini.lanterns = (S.mini.lanterns || 0) + 1;   // 하늘로 띄운 소원등 수
      save();
      closeSheet();
      spawnLantern(text.slice(0, 60));
      if (window.DalbitSound) {
        window.DalbitSound.tone(660, 1.2, 0.09, "sine");
        setTimeout(() => window.DalbitSound.tone(880, 1.6, 0.05, "sine"), 260);
      }
      toast("소원등을 하늘로 띄웠습니다 · 소원이 이루어지길");
    };
  }

  /* 첫 입장 온보딩 — 이름·생년월일·성별을 받아 나이대 캐릭터를 정한다 */
  function welcomeSheet() {
    openSheet(`
      <div class="grabber"></div>
      <div class="wl-hero">🌙</div>
      <div class="eyebrow" style="text-align:center">달빛 운세 마을</div>
      <div class="h-title" style="text-align:center;font-size:23px;margin-top:4px">마을에 오신 걸 환영해요</div>
      <p class="small center" style="margin:7px 0 0">이름과 생년월일을 알려 주시면<br>나이대에 맞는 3D 클레이 캐릭터가 마을을 함께 걸어요.</p>
      <div class="welcome-form" style="margin-top:14px">${birthForm("ob", null)}</div>
      <button class="btn" id="btnWelcomeGo" style="margin-top:16px">마을로 들어가기</button>
      <button class="btn ghost sm" id="btnWelcomeLater" style="margin-top:8px">나중에 할게요</button>
      <p class="fine center">입력한 정보는 이 기기에만 저장되며, 오늘의 운세·사주·궁합의 기본값으로 쓰입니다.</p>
    `);
    bindBirthForm("ob");
    const go = $("#btnWelcomeGo");
    const later = $("#btnWelcomeLater");
    if (later) later.onclick = () => { closeSheet(); toast("언제든 설정에서 이름과 생년월일을 넣을 수 있어요"); };
    if (go) go.onclick = () => {
      const b = readBirthForm("ob");
      if (!b.name) { toast("이름을 적어 주세요"); return; }
      if (!b.y || !b.m || !b.d) { toast("생년월일을 골라 주세요"); return; }
      S.profile = {
        name: b.name, gender: b.gender,
        birth: { y: b.y, m: b.m, d: b.d, hour: 12, minute: 0, isLunar: b.isLunar, unknownTime: true }
      };
      save();
      closeSheet();
      if (window.DalbitWorld && window.DalbitWorld.ready) window.DalbitWorld.setProfile(S.profile);
      renderVillageHome();
      toast(`${b.name}님, 환영합니다! 마을에서 만나요`, 3200);
    };
  }

  function ageWord(b) {
    const now = new Date();
    let age = now.getFullYear() - b.y;
    if (now.getMonth() + 1 < b.m || (now.getMonth() + 1 === b.m && now.getDate() < b.d)) age--;
    const g = Math.max(10, Math.min(60, Math.floor(Math.max(age, 10) / 10) * 10));
    return g + "대";
  }

  function settingsSheet() {
    openSheet(`
      <div class="grabber"></div>
      <div class="eyebrow">설정</div>
      <div class="h-title" style="font-size:21px;margin-top:4px">내 이용 정보</div>
      <div class="card" style="margin-top:12px">
        <div class="list-row"><div>이름</div><div class="r">${S.profile ? esc(S.profile.name || "미등록") : "미등록"}</div></div>
        <div class="list-row"><div>생년월일</div><div class="r">${S.profile ? esc(fmtBirth(S.profile.birth)) : "미등록"}</div></div>
        <div class="list-row"><div>타로 뽑기</div><div class="r">${S.usage.tarotDraws || 0}회</div></div>
        <div class="list-row"><div>궁합</div><div class="r">${S.usage.gungapRuns || 0}회</div></div>
        <div class="list-row"><div>꿈풀이</div><div class="r">${S.usage.dreamCount || 0}회</div></div>
        <div class="list-row"><div>마당 놀이</div><div class="r">복주머니 ${S.mini.bag || 0} · 엽전 점 ${S.mini.coin || 0} · 소원등 ${S.mini.lanterns || 0} · 연못 동전 ${S.mini.pond || 0}</div></div>
      </div>
      <div class="card">
        <div class="list-row"><div>배경음</div><div class="r link" id="lnkSound">${BGM && BGM.isMuted() ? "꺼짐 · 켜기" : "켜짐 · 끄기"}</div></div>
        <div class="list-row"><div>자율 후원(복채)</div><div class="r link" id="lnkBokchae">보내기</div></div>
        
        <div class="list-row"><div>개인정보처리방침</div><div class="r link" id="lnkPrivacy">보기</div></div>
        <div class="list-row"><div>버전</div><div class="r">${CFG.APP_VERSION || "2.0.0"}</div></div>
        <div class="list-row"><div>만든 곳</div><div class="r">달빛 스튜디오</div></div>
      </div>
      <button class="btn ghost sm" id="btnSetClose" style="margin-top:12px">닫기</button>
      <p class="fine">모든 풀이는 참고용 콘텐츠이며, 의료·투자·법률 판단의 근거가 될 수 없습니다.</p>
    `);
    $("#btnSetClose").onclick = closeSheet;
    $("#lnkPrivacy").onclick = () => { window.location.href = "privacy_policy.html"; };
    $("#lnkBokchae").onclick = () => Bokchae.open("village");
    $("#lnkSound").onclick = () => {
      const m = BGM.toggleMute();
      syncSoundBtn();
      $("#lnkSound").textContent = m ? "꺼짐 · 켜기" : "켜짐 · 끄기";
      toast(m ? "배경음을 껐습니다 🔇" : "배경음을 켰습니다 🔊");
    };
  }

  function bindBokchaeButtons(root) {
    $$("[data-bokchae]", root).forEach(b => b.onclick = (e) => {
      e.preventDefault();
      Bokchae.open(b.dataset.bokchae);
    });
  }

  /* ============================================================
     라우팅
     ============================================================ */
  /* 배경음은 마을에서만 — 방(오늘의 운세·사주·타로·궁합·작명·꿈풀이·명상방)에
     들어가면 새소리를 포함한 자동 배경음이 모두 멈추고, 방 안에서는
     사용자가 직접 누른 효과음·음성만 울린다. */
  function bgmFor(tab) {
    return tab === "village" ? "village" : null;
  }

  const DONATE_BTN = {
    village: { label: "🧧 후원", ctx: "village" },
    today: { label: "🧧 후원", ctx: "village" },
    saju: { label: "🧧 사주 복채", ctx: "saju" },
    tarot: { label: "✨ 타로 팁", ctx: "tarot" },
    dream: { label: "🍵 해몽 찻값", ctx: "dream" },
    naming: { label: "✍️ 작명 정성", ctx: "naming" },
    gungap: { label: "💕 인연 복채", ctx: "gungap" },
    meditation: { label: "☕ 명상방 차", ctx: "meditation" }
  };

  function syncDonateBtn(tab) {
    const b = $("#btnDonate");
    if (!b) return;
    const cur = DONATE_BTN[tab] || DONATE_BTN.village;
    b.textContent = cur.label;
    b.dataset.ctx = cur.ctx;
  }

  function syncSoundBtn() {
    const b = $("#btnSound");
    if (!b) return;
    const m = BGM.isMuted();
    b.textContent = m ? "🔇" : "🔊";
    b.classList.toggle("off", m);
    b.setAttribute("aria-label", m ? "배경음 켜기" : "배경음 끄기");
  }

  let walking = false;

  const App = {
    current: "village",
    /* 마을에서 부스를 고르면, 내 캐릭터가 3D 오솔길을 걸어 그 건물 앞까지 간 뒤 방이 열린다 */
    walkGo(tab) {
      const W = window.DalbitWorld;
      if (this.current !== "village" || walking || !W || !W.ready || !HOSTS_TAB.has(tab)) {
        this.go(tab);
        return;
      }
      const b = (W.BOOTHS || []).find(x => x.id === tab);
      if (!b) { this.go(tab); return; }
      if (W.overview) { W.toggleOverview(false); syncMapBtn(); }
      walking = true;
      showWalkHint(`${b.icon} ${b.name}${josaRo(b.name)} 걸어가는 중…`);
      W.walkTo(tab, () => {
        walking = false;
        hideWalkHint();
        this.go(tab);
      });
    },
    /* 방에서 마을로 — 캐릭터가 건물에서 나와 광장으로 걸어온다 */
    leaveRoom() {
      if (this.current === "village") return;
      this.go("village");
      const W = window.DalbitWorld;
      if (W && W.ready) W.leave();
    },
    go(tab) {
      STT.stop();                            // 방을 옮기면 듣던 마이크는 바로 멈춘다
      if (tab === "naming-check") { NM.tab = "check"; NM.result = null; tab = "naming"; }
      const leavingMed = $("#screen-meditation") && !$("#screen-meditation").classList.contains("hidden");
      if (leavingMed && tab !== "meditation") M.unmount($("#screen-meditation"));

      if (tab === "village") {
        $$(".room .screen").forEach(s => s.classList.add("hidden"));
        $$("#dock button").forEach(b => b.classList.toggle("on", false));
        App.current = "village";
        closeRoom();
        renderVillageHome();
        syncDonateBtn("village");
        if (BGM) BGM.setMode("village");
        return;
      }

      setTab(tab);
      openRoom(tab);
      syncDonateBtn(tab);
      if (BGM) BGM.setMode(bgmFor(tab));
      if (tab === "today") renderToday();
      if (tab === "saju") renderSaju();
      if (tab === "tarot") renderTarot();
      if (tab === "gungap") { G.step = 1; renderGungap(); }
      if (tab === "naming") renderNaming();
      if (tab === "dream") { DR.result = null; renderDream(); }
      if (tab === "meditation") renderMeditation();
    },
    profileSheet,
    welcomeSheet,
    settingsSheet,
    wishSheet,
    visitorSheet,
    bokchae: (ctx) => Bokchae.open(ctx)
  };
  const HOSTS_TAB = new Set(["today", "saju", "tarot", "gungap", "naming", "dream", "meditation"]);
  window.DalbitApp = App;

  document.addEventListener("click", (e) => {
    const goEl = e.target.closest("[data-go]");
    if (goEl) {
      const t = goEl.dataset.go;
      if (t === "naming-check") { NM.tab = "check"; NM.result = null; App.go("naming"); return; }
      App.go(t);
      return;
    }
    const tabBtn = e.target.closest("#dock button");
    if (tabBtn) {
      const t = tabBtn.dataset.tab;
      if (t === "naming") NM.tab = "make";
      App.walkGo(t);
    }
  });

  /* ---------- 마을 보기(전체 카메라) ---------- */
  function syncMapBtn() {
    const b = $("#btnMap");
    if (!b) return;
    const on = !!(window.DalbitWorld && window.DalbitWorld.overview);
    b.classList.toggle("on", on);
    b.innerHTML = on ? "<span>🧍</span>따라가기" : "<span>🗺</span>마을 보기";
  }

  /* ---------- 마당 놀이 4종 ---------- */
  function bindYard() {
    const f = () => C.todayFortune(S.profile, new Date());
    $$(".yard-btn").forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.play;
        btn.animate([{ transform: "scale(1)" }, { transform: "scale(.9)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
        if (act === "bag") {
          S.mini.bag = (S.mini.bag || 0) + 1; save();
          if (window.DalbitSound) window.DalbitSound.tone(660, 0.5, 0.1, "triangle");
          V.playBag(f());
        }
        if (act === "coin") {
          S.mini.coin = (S.mini.coin || 0) + 1; save();
          if (window.DalbitSound) window.DalbitSound.tone(520, 0.25, 0.1, "square");
          V.playCoin();
        }
        if (act === "wish") {
          openWishSpot();
        }
        if (act === "pond") {
          openPondSpot();
        }
      };
    });
  }

  const settingsBtn = $("#btnSettings");
  if (settingsBtn) settingsBtn.onclick = settingsSheet;

  const donateBtn = $("#btnDonate");
  if (donateBtn) donateBtn.onclick = () => Bokchae.open(donateBtn.dataset.ctx || "village");

  const soundBtn = $("#btnSound");
  if (soundBtn) soundBtn.onclick = () => {
    const m = BGM.toggleMute();
    syncSoundBtn();
    toast(m ? "배경음을 껐습니다 🔇" : "배경음을 켰습니다 🔊");
  };
  syncSoundBtn();

  const backBtn = $("#hudBack");
  if (backBtn) backBtn.onclick = () => App.leaveRoom();

  const countBtn = $("#hudCount");
  if (countBtn) countBtn.onclick = visitorSheet;

  const mapBtn = $("#btnMap");
  if (mapBtn) mapBtn.onclick = () => {
    const W = window.DalbitWorld;
    if (!W || !W.ready) { toast("3D 마을을 불러오는 중이에요"); return; }
    const on = W.toggleOverview();
    syncMapBtn();
    toast(on ? "마을을 한눈에 보고 있어요 · 부스를 눌러 보세요" : "내 캐릭터를 따라갑니다");
  };

  $("#overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closeSheet(); });

  /* ---------- 3D 마을 시작 ---------- */
  function bootWorld() {
    const W = window.DalbitWorld;
    if (!W) {
      toast("3D 마을을 불러오지 못했어요 · 아래 메뉴로 이용해 주세요", 3200);
      return;
    }
    W.mount($("#world"), {
      onEnter: (id) => App.walkGo(id),
      onWish: () => openWishSpot(),
      onPond: () => openPondSpot(),
      onFail: () => toast("이 기기에서는 3D 마을을 켤 수 없어요 · 아래 메뉴로 이용해 주세요", 3600)
    });
    if (W.ready) {
      renderVillageHome();
      syncMapBtn();
    }
    document.addEventListener("visibilitychange", () => {
      if (!W.ready) return;
      if (document.hidden) W.pause(); else W.resume();
    });
  }

  $$(".room .screen").forEach(s => s.classList.add("hidden"));
  closeRoom();
  syncDonateBtn("village");
  syncSoundBtn();
  if (BGM) BGM.setMode("village");
  bindYard();
  renderVillageHome();
  bootWorld();
})();
