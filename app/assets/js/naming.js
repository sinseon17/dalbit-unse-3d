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

  // 실제 이름에 쓰이는 음절 풀 (사전에 있는 글자만 사용)
  const FIRST_POOL = ["서","지","하","민","예","수","유","주","은","도","현","준","윤","시","아","연",
    "태","영","재","성","승","혜","미","나","다","소","채","건","규","동","보","상","석","선","완",
    "우","원","인","정","진","찬","초","한","해","호","화","환","효","훈","휘","희","율","온","담"];
  const SECOND_POOL = ["준","서","윤","현","우","진","민","호","성","아","연","은","주","원","영","희",
    "수","율","빈","찬","규","혁","훈","석","태","재","완","용","한","해","효","안","정","채","인","온","나","다"];
  const BAD_NAMES = ["가래","가애","소리","다리","미리","시리","자라","바라","더미","구리","머리","허리",
    "조리","고리","도리","마리","사리","오이","이리","아이","우이","나이","다이","하리","거리","노리"];

  function recommend(opts) {
    // opts: {surname, surnameHanja, gender, mood, count}
    const sur = (opts.surname || "").trim();
    const surHanja = opts.surnameHanja || (SURNAMES[sur] ? SURNAMES[sur][0][0] : null);
    if (!sur || !surHanja) return { error: "성씨를 확인해 주세요." };
    const surSt = STROKE[surHanja];
    const mood = MOODS[opts.mood] || MOODS.bright;
    const out = [];
    const firsts = FIRST_POOL.filter(s => (H[s] || []).length);
    const seconds = SECOND_POOL.filter(s => (H[s] || []).length);
    for (const s1 of firsts) {
      for (const h1 of H[s1]) {
        const st1 = h1[1];
        const hyung = surSt + st1;
        const gHyung = suri(hyung).grade;
        if (gHyung !== "대길" && gHyung !== "길") continue;
        for (const s2 of seconds) {
          if (s2 === s1) continue;
          if (BAD_NAMES.includes(s1 + s2)) continue;
          for (const h2 of H[s2]) {
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
            // 분위기 적합도
            let moodHit = 0;
            if (h1[2] === mood.prefer[0] || h1[2] === mood.prefer[1]) moodHit++;
            if (h2[2] === mood.prefer[0] || h2[2] === mood.prefer[1]) moodHit++;
            bonus += moodHit * 4;
            let score = Math.round(
              (GRADE_SCORE[gHyung] + GRADE_SCORE[gWon] + GRADE_SCORE[gI] + GRADE_SCORE[gJeong]) / 4 * 0.66 + 26 + bonus
            );
            score = Math.min(97, score);
            if (score < 74) continue;
            out.push({
              ko: sur + s1 + s2, hanja: surHanja + h1[0] + h2[0],
              givenKo: s1 + s2, givenHanja: h1[0] + h2[0],
              strokes: [surSt, st1, st2],
              meaning: `${s1}(${h1[0]}) ${h1[3]} · ${s2}(${h2[0]}) ${h2[3]}`,
              score: score,
              sagyeok: { won: { v: won, s: suri(won) }, hyung: { v: hyung, s: suri(hyung) }, i: { v: surSt + st2, s: suri(surSt + st2) }, jeong: { v: jeong, s: suri(jeong) } },
              elemFlow: `${e0}→${e1}→${e2}`,
              moodHit
            });
          }
        }
      }
    }
    // 점수·다양성 정렬
    out.sort((a, b) => b.score - a.score || b.moodHit - a.moodHit);
    const picked = [];
    const seen = new Set();
    const usedFirst = {};
    const usedSecond = {};
    // 1차: 첫 글자가 겹치지 않게 골라 다양성 확보
    for (const c of out) {
      const key = c.givenKo;
      if (seen.has(key)) continue;
      const f = key[0], g = key[1];
      if ((usedFirst[f] || 0) >= 1) continue;
      if ((usedSecond[g] || 0) >= 1) continue;
      seen.add(key); usedFirst[f] = 1; usedSecond[g] = 1; picked.push(c);
      if (picked.length >= (opts.count || 8)) break;
    }
    // 2차: 부족하면 첫 글자 2회까지 허용
    if (picked.length < (opts.count || 8)) {
      for (const c of out) {
        const key = c.givenKo;
        if (seen.has(key)) continue;
        const f = key[0];
        if ((usedFirst[f] || 0) >= 2) continue;
        seen.add(key); usedFirst[f] = (usedFirst[f] || 0) + 1; picked.push(c);
        if (picked.length >= (opts.count || 8)) break;
      }
    }
    return { list: picked, mood: mood.label, total: out.length };
  }

  global.Naming = { analyze, recommend, suri, STROKE, ELEM_OF, MEANING, MOODS, eumryeong, rel };
})(typeof window !== "undefined" ? window : globalThis);
