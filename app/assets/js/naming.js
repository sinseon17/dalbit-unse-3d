/* ============================================================
   달빛 운세 · naming.js
   성명학(수리 사격 · 음령오행 · 자원오행) 계산과 이름 추천
   ============================================================ */
(function (global) {
  "use strict";
  const H = global.NAME_HANJA;
  const SURNAMES = global.SURNAMES;
  const SUR = global.SURI81;

  const STROKE = {};
  const ELEM_OF = {};
  const MEANING = {};
  Object.keys(H).forEach(syl => {
    H[syl].forEach(([ch, st, el, mn]) => {
      if (STROKE[ch] == null) STROKE[ch] = st;
      if (!ELEM_OF[ch]) ELEM_OF[ch] = el;
      if (!MEANING[ch]) MEANING[ch] = mn;
    });
  });
  Object.keys(SURNAMES).forEach(sur => {
    SURNAMES[sur].forEach(([ch, st, el, mn]) => {
      if (STROKE[ch] == null) STROKE[ch] = st;
      if (!ELEM_OF[ch]) ELEM_OF[ch] = el;
      if (!MEANING[ch]) MEANING[ch] = mn;
    });
  });

  function suri(n) {
    const idx = ((n - 1) % 81 + 81) % 81;
    const s = SUR[idx];
    return { n: s[0], name: s[1], grade: s[2], mean: s[3] };
  }
  const GRADE_SCORE = { "대길": 100, "길": 88, "반길": 72, "흉": 48, "대흉": 30 };

  const INIT_ELEM = { "ㄱ": "木", "ㅋ": "木", "ㄴ": "火", "ㄷ": "火", "ㄹ": "火", "ㅌ": "火", "ㅁ": "土", "ㅂ": "土", "ㅍ": "土", "ㅅ": "金", "ㅈ": "金", "ㅊ": "金", "ㅇ": "水", "ㅎ": "水" };
  const INIT_LIST = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  function eumryeong(ch) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return "土";
    return INIT_ELEM[INIT_LIST[Math.floor(code / 588)]] || "土";
  }
  const GEN = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const CLASH = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  function rel(a, b) {
    if (a === b) return "same";
    if (GEN[a] === b) return "gen";
    if (GEN[b] === a) return "gen2";
    if (CLASH[a] === b || CLASH[b] === a) return "clash";
    return "etc";
  }

  // 순우리말 이름: 한글 자모 획수(훈민정음 획수법)
  const JAMO_STROKE = {
    "ㄱ":1,"ㄲ":2,"ㄴ":1,"ㄷ":2,"ㄸ":4,"ㄹ":3,"ㅁ":3,"ㅂ":4,"ㅃ":8,"ㅅ":2,"ㅆ":4,"ㅇ":1,
    "ㅈ":3,"ㅉ":6,"ㅊ":3,"ㅋ":2,"ㅌ":3,"ㅍ":4,"ㅎ":3,
    "ㅏ":2,"ㅐ":3,"ㅑ":3,"ㅒ":4,"ㅓ":2,"ㅔ":3,"ㅕ":3,"ㅖ":4,"ㅗ":2,"ㅘ":4,"ㅙ":5,"ㅚ":3,
    "ㅛ":3,"ㅜ":2,"ㅝ":4,"ㅞ":5,"ㅟ":3,"ㅠ":3,"ㅡ":1,"ㅢ":2,"ㅣ":1
  };
  const JUNG_LIST = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
  const JONG_LIST = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  function hangulStrokes(ch) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return 8;
    const init = Math.floor(code / 588);
    const jung = Math.floor((code % 588) / 28);
    const jong = code % 28;
    const I = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let n = (JAMO_STROKE[I[init]] || 2) + (JAMO_STROKE[JUNG_LIST[jung]] || 2);
    if (jong) n += (JAMO_STROKE[JONG_LIST[jong]] || 2);
    return n;
  }

  function defaultHanjaFor(ko) {
    const list = H[ko];
    return list && list.length ? list[0] : null;
  }

  /* 이름 하나 풀이 */
  function analyze(opts) {
    // opts: {surname, given:[{ko, hanja|null}], birth{...}, gender}
    const sur = (opts.surname || "").trim();
    const given = opts.given || [];
    const surHanja = opts.surnameHanja || (SURNAMES[sur] ? SURNAMES[sur][0][0] : null);
    if (!sur || !surHanja) return { error: "성씨를 확인해 주세요. (예: 김, 이, 박)" };
    if (!given.length || given.some(g => !g.ko)) return { error: "이름을 입력해 주세요." };

    const chars = given.map(g => {
      let hj = g.hanja;
      if (!hj) {
        const list = H[g.ko];
        hj = list && list.length ? list[0][0] : null;
      }
      if (hj && STROKE[hj] != null) return { ko: g.ko, hanja: hj, auto: !g.hanja, pure: false };
      if (g.hanja) return { ko: g.ko, hanja: null, auto: true, pure: true, invalid: true };
      return { ko: g.ko, hanja: null, auto: true, pure: true };
    });
    if (chars.some(c => c.invalid)) {
      return { error: "선택한 한자를 찾을 수 없습니다. '한자 자동'으로 다시 시도해 주세요." };
    }

    const st = chars.map(c => (c.hanja ? STROKE[c.hanja] : hangulStrokes(c.ko)));
    const surSt = STROKE[surHanja];
    let won, hyung, i, jeong;
    if (st.length === 1) {
      won = st[0] + 1;
      hyung = surSt + st[0];
      i = surSt + st[0] + 1;
      jeong = surSt + st[0];
    } else {
      won = st[0] + st[1];
      hyung = surSt + st[0];
      i = surSt + st[1];
      jeong = surSt + st[0] + st[1];
    }
    const sagyeok = [
      { key: "원격", name: "元格 · 초년운", v: won, s: suri(won) },
      { key: "형격", name: "亨格 · 청년운", v: hyung, s: suri(hyung) },
      { key: "이격", name: "利格 · 중년운", v: i, s: suri(i) },
      { key: "정격", name: "貞格 · 말년운", v: jeong, s: suri(jeong) }
    ];

    const eum = [sur, ...chars.map(c => c.ko)].map(eumryeong);
    const eumPairs = [];
    for (let k = 0; k < eum.length - 1; k++) eumPairs.push(rel(eum[k], eum[k + 1]));
    const eumGood = eumPairs.filter(p => p === "gen" || p === "gen2").length;
    const eumBad = eumPairs.filter(p => p === "clash").length;

    const jaywon = [ELEM_OF[surHanja], ...chars.map(c => (c.hanja ? ELEM_OF[c.hanja] : eumryeong(c.ko)))];
    const jwPairs = [];
    for (let k = 0; k < jaywon.length - 1; k++) jwPairs.push(rel(jaywon[k], jaywon[k + 1]));
    const jwGood = jwPairs.filter(p => p === "gen" || p === "gen2").length;
    const jwBad = jwPairs.filter(p => p === "clash").length;

    const suriAvg = sagyeok.reduce((a, s) => a + GRADE_SCORE[s.s.grade], 0) / sagyeok.length;
    let score = Math.round(suriAvg * 0.62 + (50 + eumGood * 18 - eumBad * 14) * 0.2 + (50 + jwGood * 18 - jwBad * 14) * 0.18);
    score = Math.min(98, Math.max(38, score));

    const badCount = sagyeok.filter(s => s.s.grade === "흉" || s.s.grade === "대흉").length;
    const grade = score >= 88 ? "매우 좋은 이름" : score >= 76 ? "좋은 이름" : score >= 64 ? "무난한 이름" : "아쉬운 이름";
    const gradeClass = score >= 88 ? "badge-good" : score >= 70 ? "badge-mid" : "badge-bad";

    const comments = [];
    const best = sagyeok.slice().sort((a, b) => GRADE_SCORE[b.s.grade] - GRADE_SCORE[a.s.grade])[0];
    const worst = sagyeok.slice().sort((a, b) => GRADE_SCORE[a.s.grade] - GRADE_SCORE[b.s.grade])[0];
    if (best && (best.s.grade === "대길" || best.s.grade === "길")) {
      comments.push(`${best.key}(${best.v}수)이 ${best.s.name}으로 ${best.s.grade}하여 ${best.s.mean}의 기운이 있습니다.`);
    }
    if (worst && (worst.s.grade === "흉" || worst.s.grade === "대흉")) {
      comments.push(`${worst.key}(${worst.v}수)은 ${worst.s.name}으로 ${worst.s.mean}의 결이 있어, 이 부분은 이름의 다른 요소로 보완하는 편이 좋습니다.`);
    } else if (badCount === 0) {
      comments.push(`네 격(원·형·이·정) 모두 흉한 수가 없어 전체적인 흐름이 안정적입니다.`);
    }
    comments.push(eumBad ? `발음의 기운이 서로 누르는 자리가 ${eumBad}곳 있어, 부를 때의 리듬을 부드럽게 다듬으면 좋습니다.` : `발음(음령)의 기운이 서로 살리는 방향으로 흘러 부르기 좋은 이름입니다.`);
    comments.push(jwBad ? `한자의 자원오행이 상극인 자리가 있어 의미의 균형을 한 번 더 살펴보세요.` : `한자의 자원오행이 자연스럽게 이어져 뜻과 소리가 함께 살아납니다.`);

    return {
      surname: sur, surnameHanja: surHanja, chars, st, surSt,
      sagyeok, eum, eumGood, eumBad, jaywon, jwGood, jwBad,
      score, grade, gradeClass, comments, badCount,
      korean: sur + chars.map(c => c.ko).join(""),
      hanjaFull: chars.some(c => !c.hanja) ? sur + chars.map(c => c.ko).join("") : surHanja + chars.map(c => c.hanja).join(""),
      pure: chars.some(c => !c.hanja),
      meaning: chars.map(c => c.hanja ? `${c.ko}(${c.hanja}) — ${MEANING[c.hanja] || ""}` : `${c.ko} — 순우리말 이름`)
    };
  }

  /* 이름 추천 */
  const MOODS = {
    bright: { label: "맑고 밝은", prefer: ["火", "木"], words: ["밝", "맑", "빛", "해", "별", "꽃", "봄"] },
    neat: { label: "단정하고 품위 있는", prefer: ["金", "土"], words: ["바를", "곧", "맑", "예", "품", "선"] },
    strong: { label: "강하고 힘찬", prefer: ["金", "火"], words: ["굳셀", "클", "날랠", "용", "높", "빛날"] },
    warm: { label: "따뜻하고 포근한", prefer: ["土", "水"], words: ["따뜻", "편안", "온", "은혜", "사랑", "복"] },
    wise: { label: "지혜롭고 총명한", prefer: ["水", "木"], words: ["슬기", "알", "지혜", "배울", "글", "생각"] }
  };

  /* 성별 이름 후보 — 여자 이름과 남자 이름을 처음부터 완전히 분리해 둔다.
     [이름, 분위기 태그...] · 두 글자 모두 한자 사전(window.NAME_HANJA)에 있는 이름만 쓴다.
     여기서는 서로 겹치는 이름을 하나도 두지 않았으므로, 성별을 바꿔도 이름이 섞이지 않는다. */
  const GIVEN_NAMES = {
    female: [
      ["서연","bright","neat"], ["서아","bright"], ["서윤","neat"], ["서현","wise","neat"], ["서영","bright"],
      ["서은","warm"], ["서하","bright"], ["하윤","bright"], ["하은","warm"], ["하영","bright"],
      ["하연","warm"], ["지안","wise"], ["지아","bright"], ["지유","warm"], ["지은","warm"],
      ["지현","wise"], ["지혜","wise"], ["지영","bright"], ["지수","wise"], ["지민","wise"],
      ["지연","warm"], ["지윤","neat"], ["수아","bright"], ["수빈","neat"], ["수연","warm"],
      ["수민","wise"], ["수영","bright"], ["수진","wise"], ["수현","wise"], ["민서","neat"],
      ["민지","bright"], ["민아","bright"], ["민영","bright"], ["민정","neat"], ["민주","neat"],
      ["민채","bright"], ["예은","warm"], ["예원","neat"], ["예진","wise"], ["예서","neat"],
      ["예나","bright"], ["예지","wise"], ["예영","bright"], ["예주","neat"], ["예희","bright"],
      ["채원","neat"], ["채영","bright"], ["채은","warm"], ["채민","wise"], ["채현","wise"],
      ["채희","bright"], ["유진","wise"], ["유나","bright"], ["유주","warm"], ["유빈","neat"],
      ["유영","bright"], ["유선","neat"], ["유미","bright"], ["은서","warm"], ["은채","bright"],
      ["은지","warm"], ["은영","bright"], ["은주","warm"], ["은혜","warm"], ["은정","neat"],
      ["은아","warm"], ["다은","warm"], ["다인","wise"], ["다연","warm"], ["다현","wise"],
      ["다영","bright"], ["다혜","wise"], ["다희","bright"], ["소율","bright"], ["소연","warm"],
      ["소민","wise"], ["소영","bright"], ["소현","wise"], ["소정","neat"], ["소이","bright"],
      ["소희","bright"], ["소하","bright"], ["아영","bright"], ["아연","warm"], ["아윤","neat"],
      ["아진","wise"], ["아현","wise"], ["나연","warm"], ["나윤","neat"], ["나은","warm"],
      ["나영","bright"], ["나희","bright"], ["나현","wise"], ["가은","warm"], ["가연","warm"],
      ["가영","bright"], ["가윤","neat"], ["가현","wise"], ["가희","bright"], ["가인","wise"],
      ["미소","bright"], ["미주","bright"], ["미영","bright"], ["미연","warm"], ["미정","neat"],
      ["미나","bright"], ["미현","wise"], ["혜원","wise"], ["혜진","wise"], ["혜영","bright"],
      ["혜민","wise"], ["혜정","neat"], ["혜수","wise"], ["혜인","warm"], ["혜윤","neat"],
      ["효주","warm"], ["효연","warm"], ["효정","neat"], ["효은","warm"], ["효진","wise"],
      ["효선","neat"], ["효원","wise"], ["효민","wise"], ["희연","warm"], ["희영","bright"],
      ["희진","wise"], ["보라","bright"], ["보영","bright"], ["보미","bright"], ["보경","neat"],
      ["보은","warm"], ["초아","bright"], ["세아","bright"], ["세연","warm"], ["세은","warm"],
      ["세희","bright"], ["주아","bright"], ["주연","warm"], ["주은","warm"], ["주희","bright"],
      ["주영","bright"], ["윤서","neat"], ["윤아","bright"], ["윤지","wise"], ["윤영","bright"],
      ["윤하","bright"], ["시은","warm"], ["시연","warm"], ["시아","bright"], ["연서","neat"],
      ["연아","warm"], ["이서","neat"], ["이연","warm"], ["태희","bright"], ["태연","warm"],
      ["설아","bright"]
    ],
    male: [
      ["도윤","bright"], ["도현","wise"], ["도하","neat"], ["도훈","strong"], ["도진","strong"],
      ["시우","bright"], ["시윤","neat"], ["시현","wise"], ["시후","bright"], ["시준","neat"],
      ["시한","wise"], ["하준","strong"], ["하민","wise"], ["하성","neat"], ["민준","strong"],
      ["민재","wise"], ["민성","neat"], ["민혁","strong"], ["민규","neat"], ["민호","bright"],
      ["민수","wise"], ["민석","neat"], ["민우","strong"], ["민찬","bright"], ["민기","bright"],
      ["준서","neat"], ["준호","strong"], ["준영","bright"], ["준혁","strong"], ["준수","wise"],
      ["준우","strong"], ["준희","bright"], ["준기","bright"], ["건우","strong"], ["건희","bright"],
      ["건호","strong"], ["건율","neat"], ["현우","strong"], ["현준","strong"], ["현수","wise"],
      ["현민","wise"], ["현성","neat"], ["현호","bright"], ["현진","wise"], ["태윤","strong"],
      ["태민","wise"], ["태현","wise"], ["태준","strong"], ["태오","bright"], ["태호","strong"],
      ["태성","neat"], ["승우","strong"], ["승현","wise"], ["승민","wise"], ["승준","strong"],
      ["승호","strong"], ["승재","neat"], ["승원","neat"], ["승윤","neat"], ["지호","bright"],
      ["지훈","wise"], ["지환","bright"], ["지성","wise"], ["지후","bright"], ["지한","wise"],
      ["주원","neat"], ["주안","warm"], ["유준","neat"], ["유찬","bright"], ["유건","strong"],
      ["정우","strong"], ["정민","wise"], ["정현","wise"], ["정훈","strong"], ["정호","bright"],
      ["정환","bright"], ["성민","wise"], ["성현","wise"], ["성훈","strong"], ["성준","strong"],
      ["성재","neat"], ["성윤","neat"], ["성호","bright"], ["성진","strong"], ["성우","strong"],
      ["예준","neat"], ["예성","neat"], ["예찬","bright"], ["은성","neat"], ["은호","bright"],
      ["서준","neat"], ["서율","neat"], ["재윤","neat"], ["재민","wise"], ["재현","wise"],
      ["재훈","strong"], ["재원","neat"], ["재성","neat"], ["동현","wise"], ["동윤","neat"],
      ["동건","strong"], ["동휘","bright"], ["상우","strong"], ["상현","wise"], ["상민","wise"],
      ["상훈","strong"], ["상윤","neat"], ["규민","wise"], ["규현","wise"], ["규성","neat"],
      ["찬우","bright"], ["찬호","bright"], ["호준","strong"], ["호진","strong"], ["우진","strong"],
      ["우성","neat"], ["원준","neat"], ["혁준","strong"], ["혁민","wise"], ["우빈","neat"],
      ["강민","strong"], ["강현","strong"], ["강우","strong"], ["강준","strong"], ["인수","wise"],
      ["인호","bright"], ["인성","neat"], ["진우","strong"], ["진호","bright"], ["진혁","strong"]
    ]
  };

  /* 그 성별에만 어울리는 한자 — 반대 성별 이름에는 이 글자를 쓰지 않는다 */
  const FEMALE_HANJA = ["娜", "娥", "姸", "娟", "姬", "美", "蓮", "蘭", "花", "淑", "婉", "媛", "珠", "柔", "蕙", "愛", "麗", "桃", "映"];
  const MALE_HANJA = ["武", "剛", "勇", "雄", "龍", "虎", "柱", "晉", "鎭", "建"];

  /* 그 성별 이름에 잘 어울리는 한자 — 점수를 조금 더 준다 (막지는 않는다) */
  const FEMALE_PREFER = ["惠", "慧", "蕙", "恩", "玟", "珉", "旻", "美", "娜", "娥", "姸", "娟", "姬", "珠", "蓮", "蘭", "花", "華", "淑", "婉", "媛", "柔", "雅", "秀", "珍", "貞", "靜", "晶", "彩", "春", "雪", "晴", "瑞", "藝", "禮", "玉", "瑛", "韶", "素", "笑", "愛", "慈", "姿", "苑", "月", "溫", "初", "荷", "桃", "佳", "嘉", "純", "怡", "燕"];
  const MALE_PREFER = ["俊", "浩", "昊", "鉉", "建", "健", "泰", "煥", "剛", "勇", "雄", "龍", "武", "鎭", "晉", "柱", "成", "星", "聖", "漢", "翰", "大", "哲", "徹", "學", "鶴", "益", "翊", "翼"];

  /* 사람 이름에 잘 쓰지 않는 한자 — 추천에서는 건너뛴다 (사전에는 남겨 둔다) */
  const NOT_NAME_HANJA = ["可", "那", "茶", "島", "洞", "樓", "名", "鳴", "米", "百", "白", "凡", "汎", "丙", "甫", "普", "賓", "士", "師", "商", "序", "石", "勢", "細", "叔", "岸", "涯", "夜", "野", "余", "汝", "泳", "沃", "運", "越", "伊", "印", "一", "日", "材", "主", "之", "地", "椿", "閑", "解", "侯", "聿", "五", "岱", "殷", "寅", "兌", "台", "宙", "圓", "持"];

  const BAD_NAMES = ["가래","가애","소리","다리","미리","시리","자라","바라","더미","구리","머리","허리",
    "조리","고리","도리","마리","사리","오이","이리","아이","우이","나이","다이","하리","거리","노리"];

  function recommend(opts) {
    // opts: {surname, surnameHanja, gender, mood, count}
    const sur = (opts.surname || "").trim();
    const surHanja = opts.surnameHanja || (SURNAMES[sur] ? SURNAMES[sur][0][0] : null);
    if (!sur || !surHanja) return { error: "성씨를 확인해 주세요." };
    const surSt = STROKE[surHanja];
    const moodKey = MOODS[opts.mood] ? opts.mood : "bright";
    const mood = MOODS[moodKey];
    const gender = opts.gender === "male" ? "male" : "female";
    const wanted = opts.count || 8;
    const pool = GIVEN_NAMES[gender];
    // 반대 성별에만 어울리는 한자는 쓰지 않는다 (여자 이름엔 武·剛…, 남자 이름엔 美·娜…) 
    const wrongHanja = gender === "male" ? FEMALE_HANJA : MALE_HANJA;
    const goodHanja = gender === "male" ? MALE_PREFER : FEMALE_PREFER;
    const skipHanja = h => wrongHanja.indexOf(h) >= 0 || NOT_NAME_HANJA.indexOf(h) >= 0;
    const out = [];
    for (const entry of pool) {
      const given = entry[0];
      const tags = entry.slice(1);
      if (!given || given.length !== 2) continue;
      const s1 = given[0], s2 = given[1];
      if (s1 === s2) continue;
      if (BAD_NAMES.includes(given)) continue;
      const L1 = H[s1], L2 = H[s2];
      if (!L1 || !L2 || !L1.length || !L2.length) continue;
      const moodName = tags.indexOf(moodKey) >= 0;
      for (const h1 of L1) {
        if (skipHanja(h1[0])) continue;
        const st1 = h1[1];
        const hyung = surSt + st1;
        const gHyung = suri(hyung).grade;
        for (const h2 of L2) {
          if (skipHanja(h2[0])) continue;
          const st2 = h2[1];
          const won = st1 + st2;
          const jeong = surSt + st1 + st2;
          const gWon = suri(won).grade, gJeong = suri(jeong).grade, gI = suri(surSt + st2).grade;
          if (gWon === "흉" || gWon === "대흉") continue;
          if (gJeong === "흉" || gJeong === "대흉") continue;
          if (gI === "흉" || gI === "대흉") continue;
          // 오행 흐름
          const e0 = ELEM_OF[surHanja], e1 = h1[2], e2 = h2[2];
          const f1 = rel(e0, e1), f2 = rel(e1, e2), f3 = rel(e0, e2);
          let bonus = 0;
          if (f1 === "gen" || f1 === "gen2") bonus += 8;
          if (f2 === "gen" || f2 === "gen2") bonus += 10;
          if (f1 === "clash" || f2 === "clash") bonus -= 14;
          if (f3 === "clash") bonus -= 6;
          // 발음 오행
          const p1 = rel(eumryeong(sur), eumryeong(s1)), p2 = rel(eumryeong(s1), eumryeong(s2));
          if (p1 === "gen" || p1 === "gen2") bonus += 5;
          if (p2 === "gen" || p2 === "gen2") bonus += 6;
          if (p1 === "clash" || p2 === "clash") bonus -= 10;
          // 분위기 적합도 — 한자 오행과 이름 자체의 결을 함께 본다
          let moodHit = 0;
          if (h1[2] === mood.prefer[0] || h1[2] === mood.prefer[1]) moodHit++;
          if (h2[2] === mood.prefer[0] || h2[2] === mood.prefer[1]) moodHit++;
          bonus += moodHit * 4;
          if (moodName) bonus += 6;
          // 성별에 어울리는 한자면 살짝 더
          if (goodHanja.indexOf(h1[0]) >= 0) bonus += 5;
          if (goodHanja.indexOf(h2[0]) >= 0) bonus += 5;
          let score = Math.round(
            (GRADE_SCORE[gHyung] + GRADE_SCORE[gWon] + GRADE_SCORE[gI] + GRADE_SCORE[gJeong]) / 4 * 0.66 + 26 + bonus
          );
          const raw = score;
          score = Math.min(97, score);
          out.push({
            ko: sur + s1 + s2, hanja: surHanja + h1[0] + h2[0],
            givenKo: s1 + s2, givenHanja: h1[0] + h2[0],
            strokes: [surSt, st1, st2],
            meaning: `${s1}(${h1[0]}) ${h1[3]} · ${s2}(${h2[0]}) ${h2[3]}`,
            score: score,
            sagyeok: { won: { v: won, s: suri(won) }, hyung: { v: hyung, s: suri(hyung) }, i: { v: surSt + st2, s: suri(surSt + st2) }, jeong: { v: jeong, s: suri(jeong) } },
            elemFlow: `${e0}→${e1}→${e2}`,
            moodHit, moodName, raw
          });
        }
      }
    }
    // 점수·다양성 정렬 (표시 점수는 97에서 멈추므로, 숨은 원점수로 순위를 가른다)
    out.sort((a, b) => (b.raw - a.raw) || (b.score - a.score) || (b.moodHit - a.moodHit) || ((b.moodName ? 1 : 0) - (a.moodName ? 1 : 0)));
    const picked = [];
    const seen = new Set();
    const usedFirst = {};
    const usedSecond = {};
    const isBad = g => g === "흉" || g === "대흉";
    // 수리 4격이 모두 나쁘지 않은 이름만 남기고, 기준을 단계적으로 낮춰 count만큼 채운다.
    // (첫 글자·둘째 글자가 겹치지 않게 골라 8개가 서로 다른 결을 갖도록 한다)
    const pick = (minScore, hyungGood, maxFirst) => {
      for (const c of out) {
        if (picked.length >= wanted) return;
        if (seen.has(c.givenKo)) continue;
        if (c.score < minScore) continue;
        const gH = c.sagyeok.hyung.s.grade;
        if (isBad(gH)) continue;
        if (hyungGood && gH !== "대길" && gH !== "길") continue;
        if (isBad(c.sagyeok.won.s.grade) || isBad(c.sagyeok.i.s.grade) || isBad(c.sagyeok.jeong.s.grade)) continue;
        const f = c.givenKo[0], g = c.givenKo[1];
        if ((usedFirst[f] || 0) >= maxFirst) continue;
        if ((usedSecond[g] || 0) >= 1) continue;
        seen.add(c.givenKo);
        usedFirst[f] = (usedFirst[f] || 0) + 1;
        usedSecond[g] = 1;
        picked.push(c);
      }
    };
    pick(78, true, 1);
    pick(72, true, 1);
    pick(68, false, 1);
    pick(62, false, 2);
    pick(58, false, 9);
    return {
      list: picked, mood: mood.label, gender: gender,
      genderLabel: gender === "male" ? "남자아이" : "여자아이",
      total: out.length
    };
  }

  global.Naming = { analyze, recommend, suri, STROKE, ELEM_OF, MEANING, MOODS, GIVEN_NAMES, eumryeong, rel };
})(typeof window !== "undefined" ? window : globalThis);
