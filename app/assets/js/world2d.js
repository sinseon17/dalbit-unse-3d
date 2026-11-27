/* ============================================================
   달빛 운세 · world2d.js  (v4 · 3D 클레이 마을 무대)
   ─ 배경: 첨부해 주신 3D 클레이 마을 그림(assets/img/village-bg-clay.jpg)
     화면 전체(100dvh)를 채우고, 좌우로 드래그해 둘러본다.
   ─ 캐릭터: 3D 클레이 스타일 여자/남자 2종(assets/img/char-girl.webp, char-boy.webp)
     언덕 위로 올라가면 작아지고(원근 스케일) 아래로 오면 커진다.
     뚜벅뚜벅 바운스 + 좌우 방향 전환 + 발밑 그림자.
   ─ 부스를 누르면 카메라가 그 건물로 부드럽게 패닝/줌인하고,
     캐릭터가 길을 따라 걸어가 문 앞에 도착하면 상담실이 열린다.
   ============================================================ */
(function (global) {
  "use strict";

  const IMG_W = 1400, IMG_H = 787;

  /* 부스: 마을 그림 속 실제 기와집 일곱 채에 이름을 붙인다.
     (건물은 그림 안에 이미 있으므로 위에 이미지를 덧대지 않는다 — 투명한 클릭 영역 + 지붕 위 현판만)
     x,y = 건물이 서는 바닥 중심(지도 좌표), w,h = 클릭 영역 크기, signY = 현판이 얹히는 지붕 마루 높이,
     door = 건물 문 앞 좌표(도착 지점은 이 자리에서 가장 가까운 길 노드) */
  const BOOTHS = [
    { id: "today", name: "오늘의 운세 마당", short: "오늘", icon: "☀️", x: 277, y: 752, w: 360, h: 356, signY: 432, door: [296, 712] },
    { id: "saju", name: "사주팔자 전각", short: "사주", icon: "☯️", x: 645, y: 306, w: 300, h: 214, signY: 180, door: [742, 360] },
    { id: "tarot", name: "타로 천막", short: "타로", icon: "🔮", x: 405, y: 430, w: 220, h: 180, signY: 254, door: [434, 404] },
    { id: "naming", name: "작명소 · 이름풀이", short: "작명", icon: "✏️", x: 563, y: 500, w: 240, h: 186, signY: 342, door: [604, 466] },
    { id: "dream", name: "꿈풀이 찻집", short: "꿈풀이", icon: "🍵", x: 1000, y: 500, w: 290, h: 220, signY: 311, door: [1014, 470] },
    { id: "meditation", name: "기도·명상방", short: "명상", icon: "🔔", x: 1103, y: 716, w: 200, h: 234, signY: 528, door: [1102, 700] },
    { id: "gungap", name: "궁합 정원", short: "궁합", icon: "💗", x: 1258, y: 526, w: 210, h: 86, signY: 444, door: [1258, 520] }
  ];
  const BY_ID = {};
  BOOTHS.forEach((b) => { BY_ID[b.id] = b; });

  /* ── 마을 오솔길 그래프 ────────────────────────────────────────
     village-bg-clay.jpg 의 황토색 길만 색으로 뽑아(tools/path_graph.py) 만든
     격자 그래프(assets/js/path_graph.js). 모든 캐릭터 이동은 이 길 위로만 한다. */
  const PG = (global.DALBIT_PATH && global.DALBIT_PATH.nodes && global.DALBIT_PATH.nodes.length)
    ? global.DALBIT_PATH
    : { nodes: [[510, 590]], edges: [], stops: {} };
  const N = PG.nodes;                                // [[x,y], ...]
  const ADJ = N.map(() => []);
  PG.edges.forEach(([u, v]) => { ADJ[u].push(v); ADJ[v].push(u); });

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const nodePt = (i) => ({ x: N[i][0], y: N[i][1] });

  function nearestNode(x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < N.length; i++) {
      const dx = N[i][0] - x, dy = N[i][1] - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /* ── 연못가 소원등 터 ──────────────────────────────────────────
     그림 속 황토길은 연못 남쪽 잔디밭까지 이어지지 않는다(path_graph.py 는 길 색만 뽑았다).
     길 끝 노드(625,705)에서 연못가 빈터까지 디딤돌 길 노드를 덧붙여, 캐릭터가
     실제로 걸어갈 수 있는 '유효한 길'로 만든다. 좌표는 village-bg-clay.jpg 기준. */
  const WISH_SPOT = {
    id: "wish", name: "연못가 소원등 터", short: "소원등", icon: "🏮",
    x: 772, y: 706,            // 등대(표지)가 서는 자리
    focusX: 792,               // 이 자리에 섰을 때 카메라 중심(연못·나무다리가 함께 보이게)
    stand: [700, 700],         // 캐릭터가 도착해 서는 자리 = 디딤돌 길 끝 노드
    node: -1
  };
  (function extendToPond() {
    const trail = [[664, 703], [688, 701], [WISH_SPOT.stand[0], WISH_SPOT.stand[1]]];
    let prev = nearestNode(625, 705);        // 황토길 끝 노드
    trail.forEach((p) => {
      N.push(p); ADJ.push([]);
      const i = N.length - 1;
      ADJ[prev].push(i); ADJ[i].push(prev);
      prev = i;
    });
    WISH_SPOT.node = N.length - 1;
  })();

  /* ── 연못 동전 던지기 포인트 ─────────────────────────────────────
     소원등 터와 같은 연못가 빈터에 서서, 연못 남쪽 수면으로 동전을 던진다.
     aim = 동전이 잠기는 수면 좌표, hit = 연못을 눌렀다고 볼 물결 범위(타원). */
  const POND = {
    id: "pond", name: "연못 동전", icon: "🪙",
    stand: [700, 700],                 // 걸어가 서는 자리(소원등 터 앞)
    aim: [800, 652],                   // 동전이 떨어지는 수면
    focusX: 780,
    hit: { cx: 845, cy: 600, rx: 168, ry: 104 },
    /* 연못 한가운데 연잎 행운 분수대 = 동전 던지기 목표 지점 */
    fountain: [846, 616],
    fountainTop: [846, 546]
  };

  /* 길을 따라 걷는 경로(다익스트라) — 격자 계단이 보이지 않게 살짝 둥글린다 */
  function smoothPath(pts, iter) {
    let p = pts;
    for (let k = 0; k < (iter || 2); k++) {
      if (p.length < 3) break;
      const out = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
        out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
      }
      out.push(p[p.length - 1]);
      p = out;
    }
    return p;
  }

  function pathBetween(fromPt, toIdx) {
    const start = nearestNode(fromPt.x, fromPt.y);
    const n = N.length;
    const D = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const seen = new Uint8Array(n);
    D[start] = 0;
    for (;;) {
      let u = -1, ud = Infinity;
      for (let i = 0; i < n; i++) if (!seen[i] && D[i] < ud) { ud = D[i]; u = i; }
      if (u < 0 || u === toIdx) break;
      seen[u] = 1;
      for (let k = 0; k < ADJ[u].length; k++) {
        const v = ADJ[u][k];
        const w = dist(N[u], N[v]);
        if (D[u] + w < D[v]) { D[v] = D[u] + w; prev[v] = u; }
      }
    }
    const chain = [];
    let cur = toIdx;
    while (cur >= 0) { chain.unshift(cur); cur = prev[cur]; }
    const pts = [{ x: fromPt.x, y: fromPt.y }];
    chain.forEach((i) => pts.push(nodePt(i)));
    return smoothPath(pts, 2);
  }

  /* 부스 도착 지점 = 건물 문 앞에서 가장 가까운 '길 위' 노드 (tools/path_graph.py 가 계산한 stops) */
  BOOTHS.forEach((b) => {
    const s = (PG.stops && PG.stops[b.id]) || null;
    b.nodeIdx = s ? nearestNode(s[0], s[1]) : nearestNode(b.door[0], b.door[1]);
    b.stop = nodePt(b.nodeIdx);
    b.doorDist = Math.round(Math.hypot(b.stop.x - b.door[0], b.stop.y - b.door[1]));
  });

  /* ── 건물 문 앞까지 이어지는 보행 연결 ──────────────────────
     길 그래프는 황토색 길만 뽑은 것이라, 타로 천막·꿈풀이 잔집·기도·명상방 정자·궁합 정원은
     길 끝에서 꽤 멀었다. 잔디 가장자리·나무다리를 따라 노드를 이어 붙여 캐릭터가
     실제로 각 건물 문 앞(b.door)까지 걸어가게 한다. (물·지붕은 건너지 않는다) */
  const DOOR_WALK = {
    today: [[280, 726], [290, 718], [296, 713]],
    tarot: [[545, 470], [515, 462], [485, 448], [455, 430], [434, 408]],
    dream: [[865, 478], [905, 486], [950, 492], [990, 486], [1014, 473]],
    meditation: [[745, 706], [790, 706], [835, 690], [875, 684], [915, 690],
                 [945, 672], [980, 665], [1015, 672], [1055, 690], [1090, 700], [1102, 700]],
    gungap: [[1050, 484], [1090, 494], [1125, 502], [1155, 508], [1190, 510], [1225, 516], [1258, 520]]
  };
  (function linkDoors() {
    ["today", "tarot", "dream", "meditation", "gungap"].forEach((id) => {
      const b = BY_ID[id];
      // 연못 건너 정자는 연못가 디딤돌 길 끝에서, 궁합 정원은 잔집 문 앞에서 이어진다
      let prev = (id === "meditation") ? WISH_SPOT.node
               : (id === "gungap") ? BY_ID.dream.nodeIdx
               : b.nodeIdx;
      DOOR_WALK[id].forEach((p) => {
        N.push(p); ADJ.push([]);
        const i = N.length - 1;
        ADJ[prev].push(i); ADJ[i].push(prev);
        prev = i;
      });
      b.nodeIdx = prev;
      b.stop = nodePt(prev);
      b.doorDist = 0;
      b.walkPts = DOOR_WALK[id].slice();
    });
  })();

  function ageGroup(birth) {
    if (!birth || !birth.y) return 30;
    const now = new Date();
    let age = now.getFullYear() - birth.y;
    if (now.getMonth() + 1 < birth.m || (now.getMonth() + 1 === birth.m && now.getDate() < birth.d)) age--;
    if (age < 10) return 10;
    const g = Math.floor(age / 10) * 10;
    return Math.max(10, Math.min(60, g));
  }
  /* 마을 캐릭터는 처음 보여준 귀여운 3D 클레이 어린이 2종(여자/남자)을 쓴다.
     두 팔을 자연스럽게 내린 단일 이미지에, 걸을 때 뚜벅뚜벅 바운스 + 살짝 좌우 흔들림을 얹는다. */
  const CHARS = { f: "assets/img/char-girl.webp", m: "assets/img/char-boy.webp" };
  function charFor(age, gender) {
    return (gender === "male" || gender === "m") ? CHARS.m : CHARS.f;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* 실제 접속자가 아닌 연출용 이웃 (정적 웹) — at 은 오솔길 위의 시작 지점 */
  const VISITORS = [
    { key: "boyeong", name: "보영", age: 50, gender: "f", at: [452, 662], dir: 1, speed: 32, lines: ["궁합 정원 꽃이 참 곱네요", "50대 운세도 잘 나오더라고요"] },
    { key: "doyun", name: "도윤", age: 50, gender: "m", at: [612, 700], dir: 1, speed: 30, lines: ["명상방에서 한숨 돌리고 왔어요", "목탁 소리 좋더라고요"] },
    { key: "seoyeon", name: "서연", age: 20, gender: "f", at: [656, 522], dir: 1, speed: 42, lines: ["오늘 총운 88점! 기분 좋아요 ✨", "타로 보러 가는 중~"] },
    { key: "jiwoo", name: "지우", age: 30, gender: "m", at: [700, 462], dir: 1, speed: 34, lines: ["카드 세 장, 뽑을까 말까", "전각 앞에서 고민 중…"] },
    { key: "minjun", name: "민준", age: 10, gender: "m", at: [740, 372], dir: 1, speed: 46, lines: ["사주 보러 가는 길이에요", "오늘은 좋은 일이 생길 것 같아요"] },
    { key: "haneul", name: "하늘", age: 30, gender: "f", at: [835, 446], dir: -1, speed: 40, lines: ["연못 다리 건너왔어요 🏮", "여기 걷기만 해도 마음이 편해져요"] }
  ];
  const INSIDE = [
    { name: "유진", where: "사주 전각에서 풀이 보는 중" },
    { name: "태현", where: "타로 천막 앞에서 카드 뽑는 중" },
    { name: "소연", where: "꿈풀이 찻집에서 차 한 잔" },
    { name: "준호", where: "작명소에서 이름 고르는 중" },
    { name: "보라", where: "명상방에서 쉬는 중" }
  ];

  const World = {
    mounted: false,
    ready: false,
    BOOTHS: BOOTHS,
    WISH_SPOT: WISH_SPOT,
    POND: POND,
    myName: "",
    camX: 430,
    camTarget: 430,
    zoom: 0,
    zoomWant: null,
    focusBooth: null,
    visitors: [],
    labels: [],
    fixedDt: null,
    elapsed: 0,

    /* ---------- 마운트 ---------- */
    mount(host, opts) {
      if (this.mounted) return this;
      this.host = host;
      this.opts = opts || {};
      this.W = host.clientWidth || 390;
      this.H = host.clientHeight || 844;
      this.stage = host.querySelector("#stage");
      this.bg = host.querySelector(".vbg");
      this.actorLayer = host.querySelector("#actors");
      this.fxLayer = host.querySelector("#fx");
      this.labelLayer = document.getElementById("worldLabels");
      this.boothLayer = host.querySelector("#booths");
      if (!this.stage) return this;

      this.s0 = this.baseScale();
      this.buildBooths();
      this.buildSpots();
      this.buildPondTarget();
      this.sizeLanterns();      this.buildMe();
      this.buildVisitors();
      this.buildNpc();
      this.buildLabels();
      this.bindInput();
      this.bindResize();
      this.mounted = true;
      this.ready = true;
      this.camX = this.me.x;
      this.camTarget = this.me.x;
      this.applyCamera(true);
      if (this.opts.onReady) this.opts.onReady();
      this.loop = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.loop);
      return this;
    },

    baseScale() {
      // 세로를 꽉 채워(아래 빈 띠 없이) 화면 전체를 무대로 쓴다
      return Math.max(this.H / IMG_H, this.W / IMG_W);
    },

    /* ---------- 3D 클레이 부스 건물 ---------- */
    buildBooths() {
      if (!this.boothLayer) return;
      this.boothLayer.innerHTML = "";
      BOOTHS.forEach((b) => {
        const el = document.createElement("button");
        el.className = "booth";
        el.type = "button";
        el.setAttribute("aria-label", b.name + " 열기");
        el.style.width = b.w.toFixed(1) + "px";
        el.style.height = b.h.toFixed(1) + "px";
        el.style.left = b.x.toFixed(1) + "px";
        el.style.top = (b.y - b.h).toFixed(1) + "px";
        el.style.zIndex = String(Math.round(b.y));
        const signTop = b.signY - (b.y - b.h) - 4;     // 지붕 마루 위에 현판
        el.innerHTML = '<span class="b-sign" style="top:' + signTop.toFixed(1) + 'px">' +
          '<i>' + b.icon + "</i>" + b.name + "</span>";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.opts.onEnter) this.opts.onEnter(b.id);
        });
        this.boothLayer.appendChild(el);
      });
      this.spots = null;
    },

    /* ---------- 연못가 소원등 터 (등대 + 현판 + 바닥 은은한 빛) ---------- */
    buildSpots() {
      if (!this.boothLayer) return;
      const s = WISH_SPOT;
      let el = this.boothLayer.querySelector(".spot-wish");
      if (el) el.remove();
      el = document.createElement("button");
      el.className = "spot spot-wish";
      el.type = "button";
      el.setAttribute("aria-label", s.name + " — 소원등 띄우러 가기");
      el.style.left = s.x.toFixed(1) + "px";
      el.style.top = (s.y - 100).toFixed(1) + "px";
      el.style.zIndex = String(Math.round(s.y) + 1);
      el.innerHTML =
        '<span class="sp-glow"></span>' +
        '<span class="sp-post"><i class="sp-base"></i><i class="sp-lamp"></i></span>' +
        '<span class="sp-sign"><i>🏮</i>' + s.short + ' 터</span>';
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.opts.onWish) this.opts.onWish();
      });
      this.boothLayer.appendChild(el);
      this.wishEl = el;
    },

    /* ---------- 연못 한가운데 연잎 행운 분수대 (동전 던지기 목표) ----------
       물 위에 놓이므로 배경 그림에 그려 넣지 않고 무대 안에 얹는다(카메라를 따라간다).
       .pf-* 스타일은 assets/css/yard-games.css 에 있다. */
    buildPondTarget() {
      if (!this.boothLayer) return;
      const old = this.boothLayer.querySelector(".pond-fountain");
      if (old) old.remove();
      const F = POND.fountain;
      const el = document.createElement("div");
      el.className = "pond-fountain";
      el.setAttribute("aria-hidden", "true");
      el.style.left = F[0].toFixed(1) + "px";
      el.style.top = F[1].toFixed(1) + "px";
      el.style.zIndex = String(Math.round(F[1]) - 4);
      el.innerHTML =
        '<span class="pf-glow"></span>' +
        '<span class="pf-ring"></span>' +
        '<span class="pf-burst"></span>' +
        '<span class="pf-body">' +
          '<i class="pf-petal p1"></i><i class="pf-petal p2"></i><i class="pf-petal p3"></i>' +
          '<i class="pf-petal p4"></i><i class="pf-petal p5"></i>' +
          '<i class="pf-base"></i><i class="pf-base-water"></i>' +
          '<i class="pf-stem"></i>' +
          '<i class="pf-cup"></i><i class="pf-cup-water"></i>' +
          '<i class="pf-drop d1"></i><i class="pf-drop d2"></i>' +
          '<i class="pf-bud"><b></b></i>' +
        '</span>' +
        '<span class="pf-tag">🎯 행운 분수대</span>';
      this.boothLayer.appendChild(el);
      this.fountainEl = el;
    },

    /* 배경 풍등이 화면 높이만큼 떠오르도록 --rise 를 px 로 맞춘다 */
    sizeLanterns() {
      const l = this.host && this.host.querySelector("#skyLanterns");
      if (l) l.style.setProperty("--rise", Math.round(this.H * 0.95) + "px");
    },

    /* ---------- 캐릭터 ---------- */
    makeActor(cfg) {
      const el = document.createElement("div");
      el.className = "actor";
      const img = document.createElement("img");
      img.src = cfg.src || charFor(cfg.age, cfg.gender);
      img.alt = cfg.name || "";
      img.draggable = false;
      const shadow = document.createElement("span");
      shadow.className = "ac-shadow";
      el.appendChild(shadow);
      el.appendChild(img);
      this.actorLayer.appendChild(el);
      return { el: el, img: img, shadow: shadow };
    },

    buildMe() {
      const a = this.makeActor({ gender: "f", age: 40, name: "나" });
      const start = nearestNode(524, 690);   // 아래 왼쪽 기와 대문 앞 오솔길에서 시작
      this.me = {
        isMe: true, xOff: 0,
        x: N[start][0], y: N[start][1], node: start, h: 0,
        el: a.el, img: a.img, shadow: a.shadow,
        path: [], onDone: null, walking: false, speed: 86,
        facing: 1, phase: 0, visible: true, restT: rnd(0.8, 1.6)
      };
      this.layoutActor(this.me);
      a.el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.sayMe();
      });
    },

    buildVisitors() {
      this.visitors = VISITORS.map((v) => {
        const a = this.makeActor({ gender: v.gender, age: v.age, name: v.name });
        const node = nearestNode(v.at[0], v.at[1]);
        const o = {
          key: v.key, name: v.name, gender: v.gender, age: v.age, lines: v.lines,
          xOff: (Math.random() < 0.5 ? -1 : 1) * rnd(6, 13),
          x: N[node][0], y: N[node][1], node: node,
          el: a.el, img: a.img, shadow: a.shadow,
          path: [], walking: false, speed: v.speed, wait: rnd(0.4, 1.4),
          facing: 1, phase: rnd(0, 6)
        };
        this.layoutActor(o);
        a.el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.sayVisitor(v.key);
        });
        return o;
      });
    },

    buildNpc() {
      // 부스 앞 도사님 · 동자승은 그림 분위기를 해치지 않게 아주 작게 한 명만
      this.npcs = [];
    },

    actorHeight(y) { return 50 + (y / IMG_H) * 24; },

    layoutActor(o) {
      const h = this.actorHeight(o.y);
      o.h = h;
      o.el.style.height = h.toFixed(1) + "px";
      o.el.style.left = (o.x + (o.xOff || 0)).toFixed(1) + "px";
      o.el.style.top = (o.y - h + (o.yOff || 0)).toFixed(1) + "px";
      o.el.style.zIndex = String(Math.round(o.y) + (o.isMe ? 60 : 0));
      o.el.classList.toggle("walking", !!o.walking);
      o.el.classList.toggle("flip", o.facing < 0);
    },

    /* ---------- 이름표 ---------- */
    buildLabels() {
      if (!this.labelLayer) return;
      this.labelLayer.innerHTML = "";
      const meWrap = document.createElement("div");
      meWrap.className = "wlabel-wrap me";
      meWrap.id = "wlabelMe";
      meWrap.innerHTML = '<span class="wbubble"></span><span class="wlabel me"><i class="dot"></i><span class="nm">나</span></span>';
      this.labelLayer.appendChild(meWrap);
      this.meLabel = meWrap;
      this.meNameEl = meWrap.querySelector(".nm");

      this.visitors.forEach((v) => {
        const wrap = document.createElement("div");
        wrap.className = "wlabel-wrap guest";
        wrap.innerHTML = '<span class="wbubble"></span><button class="wlabel guest" type="button"><i class="dot"></i><span class="nm">' + v.name + "</span></button>";
        this.labelLayer.appendChild(wrap);
        v.wrap = wrap;
        v.bubbleEl = wrap.querySelector(".wbubble");
        wrap.querySelector(".wlabel").addEventListener("click", (e) => {
          e.stopPropagation();
          this.sayVisitor(v.key);
        });
      });
    },

    setMe(name) {
      this.myName = (name || "").trim();
      if (this.meNameEl) this.meNameEl.textContent = this.myName ? "나 · " + this.myName : "나";
    },

    /* 이름·생년월일·성별로 내 캐릭터(나이대)를 고른다 */
    setProfile(p) {
      if (!p) return;
      this.setMe(p.name || "");
      const src = charFor(0, p.gender === "male" ? "m" : "f");
      if (this.me.img.getAttribute("src") !== src) {
        this.me.img.src = src;
        this.layoutActor(this.me);
      }
    },

    /* ---------- 입력 ---------- */
    bindInput() {
      const host = this.host;
      let down = null;
      host.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".spot") || e.target.closest(".booth") || e.target.closest(".wlabel") || e.target.closest(".actor")) return;
        down = { x: e.clientX, t: performance.now(), moved: false, cam: this.camTarget };
      });
      host.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - down.x;
        if (Math.abs(dx) > 6) down.moved = true;
        if (down.moved) {
          this.camTarget = clamp(down.cam - dx / (this.s0 * 1.0), this.minCamX(), this.maxCamX());
          this.camX = this.camTarget;
          this.manualT = 2.5;
          this.applyCamera(true);
        }
      });
      const up = (e) => {
        if (!down) return;
        const wasMoved = down.moved;
        down = null;
        if (wasMoved) return;
        // 빈 곳을 탭하면 그 자리로 걸어간다 (연못 물결을 탭하면 동전 던지기)
        const r = host.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        const pt = this.screenToImage(px, py);
        if (pt && this.inPond(pt.x, pt.y)) { if (this.opts.onPond) this.opts.onPond(); return; }
        if (pt) this.walkFree(pt.x, pt.y);
      };
      host.addEventListener("pointerup", up);
      host.addEventListener("pointercancel", () => { down = null; });
    },

    minCamX() { const s = this.curScale(); return this.W / (2 * s) + 10; },
    maxCamX() { const s = this.curScale(); return IMG_W - this.W / (2 * s) - 10; },
    curScale() { return this.s0 * (1 + 0.1 * this.zoom); },

    screenToImage(px, py) {
      const s = this.curScale();
      const tx = this.W / 2 - this.camX * s;
      const ty = this.stageBottom() - IMG_H * s;
      return { x: (px - tx) / s, y: (py - ty) / s };
    },

    stageBottom() { return this.H; },

    applyCamera(immediate) {
      const s = this.curScale();
      const tx = this.W / 2 - this.camX * s;
      const ty = this.stageBottom() - IMG_H * s;
      this.tx = tx; this.ty = ty; this.s = s;
      this.stage.style.transform = "translate3d(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px,0) scale(" + s.toFixed(4) + ")";
    },

    bindResize() {
      const onResize = () => {
        const w = this.host.clientWidth, h = this.host.clientHeight;
        if (!w || !h) return;
        this.W = w; this.H = h;
        this.s0 = this.baseScale();
        this.sizeLanterns();
        this.applyCamera(true);
      };
      global.addEventListener("resize", onResize);
      if (global.ResizeObserver) new ResizeObserver(onResize).observe(this.host);
    },

    /* ---------- 걷기 (길 그래프 위로만) ---------- */
    walkTo(id, cb) {
      const b = BY_ID[id];
      if (!b) { cb && cb(); return; }
      this.focusBooth = b;
      this.focusPoi = null;
      this.me.path = pathBetween({ x: this.me.x, y: this.me.y }, b.nodeIdx);
      this.me.walking = true;
      this.me.onDone = () => {
        this.me.onDone = null;
        this.me.walking = false;
        this.layoutActor(this.me);
        // 문 앞에 반짝임 — 집 안으로 들어가는 연출(집이 길에서 먼 경우에도 도착이 보이게)
        this.sparkleAt(b.door[0], b.door[1] - 16);
        // 문 앞에서 잠깐 안으로 사라지는 연출
        this.me.entering = 0;
        setTimeout(() => {
          this.me.el.style.opacity = "0";
          cb && cb();
        }, 260);
      };
    },

    /* 연못가 소원등 터까지 오솔길·디딤돌로 걸어간 뒤 소원등 창을 연다.
       이미 가까이 서 있으면 걷지 않고 바로 연다. */
    walkToWish(cb) {
      const s = WISH_SPOT;
      const st = nearestNode(s.stand[0], s.stand[1]);
      return this.goTo(st, s.x, s.y - 26, "wish", cb);
    },

    /* 연못 동전 — 연못가 빈터까지 걸어간 뒤 동전을 던진다 */
    walkToPond(cb) {
      const p = POND;
      const st = nearestNode(p.stand[0], p.stand[1]);
      return this.goTo(st, p.aim[0], p.aim[1], "pond", cb);
    },

    /* 같은 자리(연못가)로 걸어가는 공통부 — 가까우면 바로 cb */
    goTo(nodeIdx, sparkX, sparkY, poi, cb) {
      const s = (poi === "pond") ? POND : WISH_SPOT;
      this.focusBooth = null;
      this.focusPoi = { id: poi, x: s.x || s.stand[0], focusX: s.focusX };
      const arrive = (delay) => {
        this.me.onDone = null;
        this.me.walking = false;
        this.me.restT = 3;          // 도착 직후 잠시 그 자리에 서 있게(게임·창이 열리는 동안 거닐지 않게)
        this.layoutActor(this.me);
        this.sparkleAt(sparkX, sparkY, poi === "pond" ? 4 : 6);
        if (delay) setTimeout(() => { cb && cb(); }, delay);
        else cb && cb();
      };
      if (dist([this.me.x, this.me.y], N[nodeIdx]) < 78) {
        arrive(0);
        return "near";
      }
      this.me.path = pathBetween({ x: this.me.x, y: this.me.y }, nodeIdx);
      this.me.walking = true;
      this.layoutActor(this.me);
      this.me.onDone = () => arrive(240);
      return "walk";
    },

    /* 연못 물걸을 탭했는지 (그림 좌표 타원) */
    inPond(x, y) {
      const h = POND.hit;
      const dx = (x - h.cx) / h.rx, dy = (y - h.cy) / h.ry;
      return (dx * dx + dy * dy) <= 1;
    },

    /* 동전이 주먹에서 수면까지 포물선으로 날아가고, 물걸이 번진다 */
    tossCoin(cb) {
      const a = POND.aim;
      this.tossCoinTo(a[0], a[1], {
        onLand: () => {
          this.rippleAt(a[0], a[1]);
          cb && cb();
        }
      });
    },

    /* 지정한 지점까지 동전을 포물선으로 던진다 — 연못 동전 미니게임이 쓴다.
       opts: { duration, peak, onLand } */
    tossCoinTo(tx, ty, opts) {
      if (!this.stage || !this.me) { if (opts && opts.onLand) opts.onLand(); return; }
      opts = opts || {};
      const me = this.me;
      me.facing = (tx >= me.x) ? 1 : -1;
      this.layoutActor(me);
      const from = { x: me.x + (me.facing < 0 ? -10 : 10), y: me.y - 38 };
      const dx = tx - from.x, dy = ty - from.y;
      const coin = document.createElement("span");
      coin.className = "fx-coin fx-coin-big";
      coin.style.left = from.x.toFixed(1) + "px";
      coin.style.top = from.y.toFixed(1) + "px";
      coin.style.zIndex = "900";
      this.stage.appendChild(coin);
      const dur = opts.duration || 760;
      const peak = opts.peak || Math.max(54, Math.abs(dx) * 0.44);
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const x = from.x + dx * t;
        const y = from.y + dy * t - peak * 4 * t * (1 - t);
        coin.style.left = x.toFixed(1) + "px";
        coin.style.top = y.toFixed(1) + "px";
        coin.style.transform = "rotate(" + (t * 520).toFixed(0) + "deg)";
        if (t < 1) requestAnimationFrame(tick);
        else {
          coin.remove();
          if (opts.onLand) opts.onLand();
        }
      };
      requestAnimationFrame(tick);
    },

    /* 분수대에 명중 — 금빛 파열 + 반짝임 + ‘대길 명중!’ 글씨 */
    fountainHit() {
      const F = POND.fountain;
      const el = this.fountainEl;
      if (el) {
        el.classList.remove("hit");
        void el.offsetWidth;
        el.classList.add("hit");
        setTimeout(() => el.classList.remove("hit"), 1200);
      }
      if (!this.stage) return;
      for (let i = 0; i < 12; i++) {
        const s = document.createElement("span");
        s.className = "fx-spark";
        s.textContent = ["✨", "💫", "🌟", "✨"][i % 4];
        s.style.left = (F[0] + rnd(-40, 40)).toFixed(1) + "px";
        s.style.top = ((F[1] - 62) + rnd(-26, 18)).toFixed(1) + "px";
        s.style.animationDelay = (i * 0.05).toFixed(2) + "s";
        s.style.fontSize = rnd(13, 20).toFixed(0) + "px";
        this.stage.appendChild(s);
        setTimeout(() => s.remove(), 1600);
      }
      this.floatLabel(F[0], F[1] - 150, "🎉 대길 명중!");
      this.rippleAt(F[0], F[1]);
    },

    /* 연못에 퐁당 — 물걸 + 물방울 */
    fountainSplash(x, y) {
      if (!this.stage) return;
      this.rippleAt(x, y);
      for (let i = 0; i < 7; i++) {
        const s = document.createElement("span");
        s.className = "fx-spark";
        s.textContent = ["🫧", "🌊"][i % 2];
        s.style.left = (x + rnd(-22, 22)).toFixed(1) + "px";
        s.style.top = (y + rnd(-12, 8)).toFixed(1) + "px";
        s.style.animationDelay = (i * 0.06).toFixed(2) + "s";
        s.style.fontSize = rnd(12, 17).toFixed(0) + "px";
        this.stage.appendChild(s);
        setTimeout(() => s.remove(), 1600);
      }
      this.floatLabel(x, y + 30, "🌊 퐁당!");
    },

    floatLabel(x, y, text) {
      if (!this.stage) return;
      const el = document.createElement("span");
      el.className = "fx-float";
      el.textContent = text;
      el.style.left = x.toFixed(1) + "px";
      el.style.top = y.toFixed(1) + "px";
      this.stage.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    },

    rippleAt(x, y) {
      if (!this.stage) return;
      for (let i = 0; i < 3; i++) {
        const r = document.createElement("span");
        r.className = "fx-ripple";
        r.style.left = x.toFixed(1) + "px";
        r.style.top = y.toFixed(1) + "px";
        r.style.animationDelay = (i * 0.24).toFixed(2) + "s";
        this.stage.appendChild(r);
        setTimeout(() => r.remove(), 2600);
      }
      this.sparkleAt(x, y, 4);
    },

    walkFree(x, y) {
      // 길 밖을 탭해도 길에서 가장 가까운 지점으로만 걸어간다
      this.focusBooth = null;
      this.focusPoi = null;
      const idx = nearestNode(x, y);
      this.me.path = pathBetween({ x: this.me.x, y: this.me.y }, idx);
      this.me.walking = true;
      this.me.onDone = () => { this.me.onDone = null; this.me.walking = false; this.layoutActor(this.me); };
    },

    leave(cb) {
      this.me.el.style.opacity = "1";
      this.focusBooth = null;
      this.focusPoi = null;
      const homeIdx = nearestNode(540, 688);
      this.me.path = pathBetween({ x: this.me.x, y: this.me.y }, homeIdx);
      this.me.walking = true;
      this.me.onDone = () => {
        this.me.onDone = null;
        this.me.walking = false;
        this.layoutActor(this.me);
        cb && cb();
      };
    },

    toggleOverview() { return false; },
    skipIntro() { this.intro = 1; },

    /* ---------- 이웃 ---------- */
    sayVisitor(key) {
      const v = this.visitors.find((x) => x.key === key);
      if (!v) return;
      this.bubble(v.wrap, v.bubbleEl, pick(v.lines));
      v.hopT = 0.45;
    },
    sayMe() {
      const lines = ["저는 오늘도 마을을 산책 중이에요 ☀️", "부스를 눌러 걸어가 보세요!", "오늘 기분 좋은 하루예요"];
      this.bubble(this.meLabel, this.meLabel.querySelector(".wbubble"), pick(lines));
    },
    sayRandomVisitor() {
      const v = pick(this.visitors);
      if (v) this.bubble(v.wrap, v.bubbleEl, pick(v.lines));
    },
    bubble(wrap, el, text) {
      if (!wrap || !el) return;
      el.textContent = text;
      wrap.classList.add("on");
      clearTimeout(el._t);
      el._t = setTimeout(() => wrap.classList.remove("on"), 3400);
    },

    petHearts() {
      const v = pick(this.visitors);
      if (!v) return null;
      for (let i = 0; i < 5; i++) {
        const h = document.createElement("span");
        h.className = "fx-heart";
        h.textContent = ["💗", "💛", "💚", "💖"][i % 4];
        h.style.left = (this.tx + v.x * this.s + rnd(-16, 16)) + "px";
        h.style.top = (this.ty + (v.y - v.h) * this.s - rnd(0, 20)) + "px";
        h.style.animationDelay = (i * 0.08) + "s";
        this.fxLayer.appendChild(h);
        setTimeout(() => h.remove(), 1600);
      }
      this.bubble(v.wrap, v.bubbleEl, v.lines[0]);
      v.hopT = 0.5;
      return v.name;
    },

    /* 건물 문 앞 반짝임 — 무대(.stage) 안에 넣어 카메라가 움직여도 문 앞에 붙어 있게 */
    sparkleAt(x, y, n) {
      if (!this.stage) return;
      for (let i = 0; i < (n || 7); i++) {
        const el = document.createElement("span");
        el.className = "fx-spark";
        el.textContent = ["✨", "💫", "🌟", "✨"][i % 4];
        el.style.left = (x + rnd(-16, 16)).toFixed(1) + "px";
        el.style.top = (y + rnd(-10, 14)).toFixed(1) + "px";
        el.style.animationDelay = (i * 0.06).toFixed(2) + "s";
        this.stage.appendChild(el);
        setTimeout(() => el.remove(), 1500);
      }
    },

    /* ---------- 소원등 : 사용자가 쓴 소원 글씨가 등불 몸통에 새겨진 채 하늘로 오른다 ----------
       지금 서 있는 자리(연못가 소원등 터)의 머리 위에서 출발해 화면 위 끝까지 천천히 떠오르고,
       작은 등불 두 개가 뒤따라 오른다. (화면 좌표 · #fx 레이어 — 카메라 이동과 무관하게 보인다) */
    wishLanterns(n, text) {
      if (!this.stage || !this.me) return;
      const said = String(text != null ? text : (this.pendingWish || this.latestWish() || "")).trim();
      if (said) this.pendingWish = said;
      const me = this.me;
      const x0 = this.tx + me.x * this.s;
      /* 등불이 캐릭터를 덮지 않게 머리 위에서 떠오르기 시작한다 */
      const y0 = this.ty + (me.y - me.h) * this.s - 150;
      const rise = (this.H || 844) + 220;
      const len = said.replace(/\s+/g, " ").length;
      const size = len <= 12 ? "s1" : len <= 22 ? "s2" : len <= 36 ? "s3" : "s4";

      const big = document.createElement("span");
      big.className = "fx-wish-lantern " + size;
      big.style.left = x0.toFixed(1) + "px";
      big.style.top = y0.toFixed(1) + "px";
      big.style.setProperty("--rise", rise.toFixed(0) + "px");
      big.innerHTML =
        '<i class="fwl-halo"></i>' +
        '<i class="fwl-tail"></i>' +
        '<i class="fwl-rim top"></i>' +
        '<i class="fwl-body"><b class="fwl-text">' + this.esc(said || "소원") + '</b></i>' +
        '<i class="fwl-rim bot"></i>' +
        '<i class="fwl-flame"></i>';
      this.fxLayer.appendChild(big);
      setTimeout(() => big.remove(), 11600);

      /* 뒤따라 오르는 작은 등불 */
      const nMini = Math.max(0, (n || 1) - 1);
      for (let i = 0; i < Math.min(3, nMini + 1); i++) {
        const m = document.createElement("span");
        m.className = "fx-wish-lantern mini";
        m.style.left = (x0 + rnd(-78, 78)).toFixed(1) + "px";
        m.style.top = (y0 + rnd(-6, 56)).toFixed(1) + "px";
        m.style.setProperty("--rise", rise.toFixed(0) + "px");
        m.style.animationDelay = (0.5 + i * 0.55).toFixed(2) + "s";
        m.innerHTML = '<i class="fwl-halo"></i><i class="fwl-tail"></i><i class="fwl-body"></i><i class="fwl-flame"></i>';
        this.fxLayer.appendChild(m);
        setTimeout(() => m.remove(), 12800);
      }
    },

    /* 마지막으로 적은 소원 — app.js 가 저장한 상태에서 읽어 온다 */
    latestWish() {
      try {
        const s = JSON.parse(global.localStorage ? localStorage.getItem("dalbit_fortune_v2") || "{}" : "{}");
        const w = s && s.mini && s.mini.wishes && s.mini.wishes[0];
        return w && w.text ? String(w.text) : "";
      } catch (e) { return ""; }
    },

    esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    },

    visitorsInfo() {
      return {
        count: VISITORS.length + INSIDE.length + 1,
        walking: VISITORS.map((v) => ({
          name: v.name,
          where: "오솔길을 걷는 중",
          gender: v.gender
        })),
        inside: INSIDE.slice()
      };
    },

    /* ---------- 매 프레임 ---------- */
    loop() {
      this.raf = requestAnimationFrame(this.loop);
      if (!this.ready) return;
      const dt = (this.fixedDt != null) ? this.fixedDt : Math.min(this._last ? (performance.now() - this._last) / 1000 : 0.016, 0.05);
      this._last = performance.now();
      this.step(dt);
    },

    step(dt) {
      this.elapsed += dt;
      this.updateMe(dt);
      this.updateVisitors(dt);
      this.updateCamera(dt);
      this.updateLabels();
      this._ambient = Math.max(0, (this._ambient == null ? 9 : this._ambient) - dt);
      if (this._ambient <= 0) { this.sayRandomVisitor(); this._ambient = rnd(12, 22); }
    },

    advance(o, dt) {
      if (!o.path || !o.path.length) return false;
      let budget = o.speed * dt;                 // 이번 프레임에 걸을 수 있는 거리(px)
      while (budget > 0 && o.path.length) {
        const t = o.path[0];
        const dx = t.x - o.x, dy = t.y - o.y;
        const d = Math.hypot(dx, dy);
        if (d <= budget) {                        // 다음 길 노드에 닿으면 그대로 넘어간다
          o.x = t.x; o.y = t.y;
          o.path.shift();
          budget -= d;
        } else {
          o.x += (dx / d) * budget;
          o.y += (dy / d) * budget;
          if (Math.abs(dx) > 0.4) o.facing = dx < 0 ? -1 : 1;
          budget = 0;
        }
      }
      return o.path.length > 0;
    },

    updateMe(dt) {
      const me = this.me;
      if (me.walking) {
        const moving = this.advance(me, dt);
        this.layoutActor(me);
        if (!moving) {
          const done = me.onDone;
          me.onDone = null;
          if (done) done();
          else { me.walking = false; this.layoutActor(me); me.restT = rnd(0.6, 1.2); }
        }
      } else if (me.hopT > 0) {
        me.hopT -= dt;
        this.layoutActor(me);
      } else {
        // 가만히 서 있지 않고 짧게 쉬었다가 다시 마을을 산책한다
        if (me.restT == null) me.restT = rnd(0.6, 1.2);
        me.restT -= dt;
        if (me.restT <= 0) this.strollMe();
      }
    },

    /* 내 캐릭터가 길 위를 스스로 거닐게 한다 (창이 열려 있으면 쉼) */
    canStroll() {
      if (this.autoStroll === false) return false;
      const ov = document.getElementById("overlay");
      if (ov && ov.classList.contains("on")) return false;
      const room = document.getElementById("room");
      if (room && room.classList.contains("on")) return false;
      const panel = document.getElementById("yardPanel");
      if (panel && !panel.hidden) return false;
      if (this.me.el.style.opacity === "0") return false;
      return true;
    },

    strollMe() {
      const me = this.me;
      me.restT = rnd(0.6, 1.2);
      if (!this.canStroll()) return;
      this.focusBooth = null;
      this.focusPoi = null;
      const from = nearestNode(me.x, me.y);
      const to = this.roamTarget(from, me);
      if (to === from) return;
      const pts = pathBetween({ x: me.x, y: me.y }, to);
      if (!pts || pts.length < 2) return;
      me.path = pts.slice(1);
      me.walking = true;
      me.onDone = null;
      me.speed = rnd(62, 84);
      this.layoutActor(me);
    },

    updateVisitors(dt) {
      this.visitors.forEach((v) => {
        if (v.wait > 0) { v.wait -= dt; return; }
        if (!v.walking) {
          if (!ADJ[v.node] || !ADJ[v.node].length) { v.wait = 2; return; }
          v.target = this.roamTarget(v.node, v);
          v.path = pathBetween({ x: v.x, y: v.y }, v.target).slice(1);
          v.node = v.target;
          v.walking = true;
          v.speed = rnd(26, 46);
        }
        const moving = this.advance(v, dt);
        this.layoutActor(v);
        if (!moving) { v.walking = false; v.wait = rnd(0.5, 1.5); }
      });
    },

    /* 이웃이 길을 따라 70~320px 떨어진 곳을 목적지로 고른다.
       다른 이웃이 서 있는 자리(45px 안)는 피해 한 줄로 겹치지 않게 한다. */
    roamTarget(fromIdx, self) {
      let fallback = fromIdx;
      for (let i = 0; i < 26; i++) {
        const j = Math.floor(Math.random() * N.length);
        const d = dist(N[fromIdx], N[j]);
        if (d < 70 || d > 320) continue;
        fallback = j;
        let clear = true;
        for (let k = 0; k < this.visitors.length; k++) {
          const v = this.visitors[k];
          if (v === self) continue;
          if (Math.hypot(N[j][0] - v.x, N[j][1] - v.y) < 45) { clear = false; break; }
        }
        if (clear) return j;
      }
      return fallback;
    },

    updateCamera(dt) {
      const me = this.me;
      if (this.manualT > 0) this.manualT -= dt;
      let target = me.x;
      const focus = this.focusBooth || this.focusPoi;
      if (focus && !me.walking) target = (focus.focusX || focus.x);
      else if (me.walking) target = lerp(me.x, me.x + (me.facing * 30), 0.35);
      this.camTarget = this.manualT > 0 ? this.camTarget : clamp(target, this.minCamX(), this.maxCamX());
      this.camX = lerp(this.camX, this.camTarget, 1 - Math.exp(-dt * 3.4));

      const wantZoom = (this.zoomWant != null) ? this.zoomWant : (focus ? 1 : 0);
      this.zoom = lerp(this.zoom, wantZoom, 1 - Math.exp(-dt * 2.2));
      this.applyCamera();
    },

    updateLabels() {
      if (!this.labelLayer) return;
      const s = this.s, tx = this.tx, ty = this.ty;
      const W = this.W, H = this.H;
      const place = (wrap, o, maxDist) => {
        if (!wrap) return;
        const x = tx + (o.x + (o.xOff || 0)) * s;
        const y = ty + (o.y - o.h) * s;
        if (x < -40 || x > W + 40 || y < 40 || y > H - 130) { wrap.style.display = "none"; return; }
        wrap.style.display = "";
        wrap.style.transform = "translate(-50%,-100%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
        wrap.style.opacity = "1";
      };
      if (this.me.el.style.opacity === "0") this.meLabel.style.display = "none";
      else place(this.meLabel, this.me);
      this.visitors.forEach((v) => place(v.wrap, v));
    },

    pause() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; },
    resume() { if (!this.raf && this.ready) { this._last = performance.now(); this.loop(); } }
  };

  global.DalbitWorld = World;
})(typeof window !== "undefined" ? window : globalThis);
