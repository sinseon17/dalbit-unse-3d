/* ============================================================
   달빛 운세 · engine.js
   음양력 변환, 24절기(태양황경), 사주팔자(4주 8자), 오행/십성, 대운 계산
   ============================================================ */
(function (global) {
  "use strict";

  const CHEONGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const CHEONGAN_KR = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const GANJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const GANJI_KR = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const GANJI_ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

  const STEM_ELEM = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  const STEM_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  const BRANCH_ELEM = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  const BRANCH_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];

  const ELEMS = ["木", "火", "土", "金", "水"];
  const ELEM_KR = { 木: "목", 火: "화", 土: "토", 金: "금", 水: "수" };
  const ELEM_COLOR = { 木: "#7ec9a0", 火: "#e8816f", 土: "#d8b06a", 金: "#cfd6e6", 水: "#7aa7d9" };

  /* ---------- 날짜 유틸 (KST 기준, 시각은 UTC+9 고정) ---------- */
  const KST_OFFSET_DAYS = 9 / 24;

  function jdnFromYMD(y, m, d) {
    // 그레고리력 → 율리우스일 번호(정수, 정오 기준)
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) -
      Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  function ymdFromJDN(jdn) {
    let a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor(146097 * b / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = 100 * b + d - 4800 + Math.floor(m / 10);
    return { y: year, m: month, d: day };
  }

  /* ---------- 음력 변환 ---------- */
  const LT = global.LUNAR_TABLE;

  function leapOf(y) { return LT.packed[y - LT.startYear] & 0xF; }
  function monthLen(y, m, isLeap) {
    const v = LT.packed[y - LT.startYear];
    if (isLeap) return (v >> 16) & 1 ? 30 : 29;
    return (v >> (3 + m)) & 1 ? 30 : 29; // bit4=1월 ... bit15=12월
  }
  function yearLen(y) {
    let sum = 0;
    for (let m = 1; m <= 12; m++) sum += monthLen(y, m, false);
    const l = leapOf(y);
    if (l) sum += monthLen(y, l, true);
    return sum;
  }

  const BASE_JDN = jdnFromYMD(1930, 1, 30); // 음력 1930-01-01

  function solarToLunar(y, m, d) {
    let days = jdnFromYMD(y, m, d) - BASE_JDN;
    if (days < 0) return null;
    let ly = LT.startYear;
    while (ly < LT.startYear + LT.count - 1 && days >= yearLen(ly)) {
      days -= yearLen(ly);
      ly++;
    }
    const leap = leapOf(ly);
    for (let mm = 1; mm <= 12; mm++) {
      const L = monthLen(ly, mm, false);
      if (days < L) return { y: ly, m: mm, d: days + 1, leap: false };
      days -= L;
      if (leap === mm) {
        const LL = monthLen(ly, mm, true);
        if (days < LL) return { y: ly, m: mm, d: days + 1, leap: true };
        days -= LL;
      }
    }
    return null;
  }

  function lunarToSolar(ly, lm, ld, isLeap) {
    if (ly < LT.startYear || ly >= LT.startYear + LT.count) return null;
    let days = 0;
    for (let y = LT.startYear; y < ly; y++) days += yearLen(y);
    const leap = leapOf(ly);
    for (let mm = 1; mm <= 12; mm++) {
      if (mm < lm) {
        days += monthLen(ly, mm, false);
        if (leap === mm) days += monthLen(ly, mm, true);
      } else if (mm === lm) {
        if (isLeap) days += monthLen(ly, mm, false);
      }
    }
    days += ld - 1;
    return ymdFromJDN(BASE_JDN + days);
  }

  function isLeapMonth(ly, lm) { return leapOf(ly) === lm; }

  /* ---------- 태양 황경 & 24절기 ---------- */
  function toJD(dateObj) { // JS Date(UTC 밀리초) → JD
    return dateObj.getTime() / 86400000 + 2440587.5;
  }
  function jdToDate(jd) { return new Date((jd - 2440587.5) * 86400000); }

  function sunLongitude(jd) {
    const T = (jd - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const Mr = (M * Math.PI) / 180;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
    const trueLong = L0 + C;
    const omega = 125.04 - 1934.136 * T;
    const lambda = trueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);
    return ((lambda % 360) + 360) % 360;
  }

  // 절기 이름(12절) 과 월지 인덱스
  const JEOLGI = [
    { name: "입춘", deg: 315, branch: 2 }, { name: "경칩", deg: 345, branch: 3 },
    { name: "청명", deg: 15, branch: 4 }, { name: "입하", deg: 45, branch: 5 },
    { name: "망종", deg: 75, branch: 6 }, { name: "소서", deg: 105, branch: 7 },
    { name: "입추", deg: 135, branch: 8 }, { name: "백로", deg: 165, branch: 9 },
    { name: "한로", deg: 195, branch: 10 }, { name: "입동", deg: 225, branch: 11 },
    { name: "대설", deg: 255, branch: 0 }, { name: "소한", deg: 285, branch: 1 }
  ];

  // 절대 시각(UTC Date) → 월령 인덱스(0=인월 … 11=축월)
  function monthIndexBySun(instant) {
    const lam = sunLongitude(toJD(instant));
    const diff = ((lam - 315) % 360 + 360) % 360;
    return Math.floor(diff / 30);
  }

  // 해당 연도 입춘 시각(KST Date) — 2월 1~10일 사이 이분탐색
  function ipchunDate(year) {
    let lo = toJD(new Date(Date.UTC(year, 1, 1, 0, 0)));
    let hi = toJD(new Date(Date.UTC(year, 1, 10, 0, 0)));
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const lam = sunLongitude(mid);
      const d = ((lam - 315) % 360 + 360) % 360; // 0 직후면 입춘 지남
      if (d < 180) hi = mid; else lo = mid;
    }
    return jdToDate((lo + hi) / 2);
  }

  // 사주 년도(입춘 기준). instant: 절대 시각(UTC Date)
  function sajuYear(year, instant) {
    const ip = ipchunDate(year);
    return instant.getTime() < ip.getTime() ? year - 1 : year;
  }

  /* ---------- 사주 계산 ---------- */
  function ganjiOfIndex(idx) {
    const i = ((idx % 60) + 60) % 60;
    return { s: i % 10, b: i % 12, idx: i };
  }

  function dayIndex(y, m, d) {
    // 1900-01-01 = 甲戌(10) 기준 (검증: 2026-11-27 = 乙巳 41)
    const base = jdnFromYMD(1900, 1, 1);
    const diff = jdnFromYMD(y, m, d) - base;
    return (((10 + diff) % 60) + 60) % 60;
  }

  function computeSaju(opt) {
    // opt: {y,m,d,hour,minute,isLunar,leap,gender,unknownTime,jojasi}
    let sy = opt.y, sm = opt.m, sd = opt.d;
    let lunarInfo = null;
    if (opt.isLunar) {
      const sol = lunarToSolar(opt.y, opt.m, opt.d, !!opt.leap);
      if (!sol) return { error: "음력 날짜를 확인해 주세요 (1930~2049년 지원)" };
      sy = sol.y; sm = sol.m; sd = sol.d;
      lunarInfo = { y: opt.y, m: opt.m, d: opt.d, leap: !!opt.leap };
    } else {
      lunarInfo = solarToLunar(sy, sm, sd);
    }
    if (!lunarInfo) return { error: "1930~2049년 사이의 날짜만 계산할 수 있어요" };

    const unknownTime = !!opt.unknownTime;
    const hour = unknownTime ? 12 : (opt.hour == null ? 12 : opt.hour);
    const minute = unknownTime ? 0 : (opt.minute || 0);

    // 자시(23시 이후)는 다음 날 일주로 계산하는 것이 일반적(조자시). 끄면 당일 유지.
    const jojasi = opt.jojasi !== false;
    let dayY = sy, dayM = sm, dayD = sd;
    if (!unknownTime && jojasi && hour >= 23) {
      const nx = ymdFromJDN(jdnFromYMD(sy, sm, sd) + 1);
      dayY = nx.y; dayM = nx.m; dayD = nx.d;
    }

    const instant = new Date(Date.UTC(sy, sm - 1, sd, hour - 9, minute));
    const sYear = sajuYear(sy, instant);
    const yStem = ((sYear - 4) % 10 + 10) % 10;
    const yBranch = ((sYear - 4) % 12 + 12) % 12;

    const mIdx = monthIndexBySun(instant); // 0=인월
    const mBranch = (2 + mIdx) % 12;
    const mStem = ((yStem % 5) * 2 + 2 + mIdx) % 10;

    const dIdx = dayIndex(dayY, dayM, dayD);
    const dStem = dIdx % 10;
    const dBranch = dIdx % 12;

    let hBranch = null, hStem = null;
    if (!unknownTime) {
      hBranch = Math.floor(((hour + 1) % 24) / 2) % 12; // 23~01 자시
      hStem = ((dStem % 5) * 2 + hBranch) % 10;
    }

    const pillars = {
      year: { s: yStem, b: yBranch },
      month: { s: mStem, b: mBranch },
      day: { s: dStem, b: dBranch },
      hour: hStem == null ? null : { s: hStem, b: hBranch }
    };

    const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const chars = [];
    const addPillar = (p, label) => {
      if (!p) return;
      chars.push({ pos: label, char: p.s, type: "stem", elem: STEM_ELEM[p.s] });
      chars.push({ pos: label, char: p.b, type: "branch", elem: BRANCH_ELEM[p.b] });
      counts[STEM_ELEM[p.s]]++;
      counts[BRANCH_ELEM[p.b]]++;
    };
    addPillar(pillars.year, "년주");
    addPillar(pillars.month, "월주");
    addPillar(pillars.day, "일주");
    addPillar(pillars.hour, "시주");

    // 지장간(본기) 기준 십성
    const tenGod = (otherStem, dayStem) => {
      const oe = STEM_ELEM[otherStem], de = STEM_ELEM[dayStem];
      const same = STEM_YANG[otherStem] === STEM_YANG[dayStem];
      if (oe === de) return same ? "비견" : "겁재";
      if (ELEMS[(ELEMS.indexOf(de) + 1) % 5] === oe) return same ? "식신" : "상관";
      if (ELEMS[(ELEMS.indexOf(de) + 2) % 5] === oe) return same ? "편재" : "정재";
      if (ELEMS[(ELEMS.indexOf(de) + 3) % 5] === oe) return same ? "편관" : "정관";
      return same ? "편인" : "정인";
    };

    const dayMasterElem = STEM_ELEM[dStem];
    const support = counts[dayMasterElem] + counts[ELEMS[(ELEMS.indexOf(dayMasterElem) + 4) % 5]];
    const drain = counts[ELEMS[(ELEMS.indexOf(dayMasterElem) + 1) % 5]] +
      counts[ELEMS[(ELEMS.indexOf(dayMasterElem) + 2) % 5]] +
      counts[ELEMS[(ELEMS.indexOf(dayMasterElem) + 3) % 5]];
    const strength = support > drain + 1 ? "신강" : support + 1 < drain ? "신약" : "중화";

    // 절기까지의 거리 → 대운 시작 나이
    const lam = sunLongitude(toJD(instant));
    const frac = (((lam - 315) % 30) + 30) % 30;
    const forward = (STEM_YANG[yStem] === 1) === (opt.gender !== "female");
    const daysToBoundary = forward ? (30 - frac) / 0.98565 : frac / 0.98565;
    const startAge = Math.max(1, Math.round(daysToBoundary / 3));

    const daewoon = [];
    for (let i = 1; i <= 8; i++) {
      const idx = forward ? (mIdx + i) : (mIdx - i);
      const g = ((mStem + (forward ? i : -i)) % 10 + 10) % 10;
      const b = ((mBranch + (forward ? i : -i)) % 12 + 12) % 12;
      daewoon.push({
        startAge: startAge + (i - 1) * 10,
        stem: g, branch: b,
        elem: STEM_ELEM[g], branchElem: BRANCH_ELEM[b]
      });
    }

    const today = new Date();
    const seunYear = sajuYear(today.getFullYear(),
      new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 3)));
    const seun = {
      year: seunYear,
      stem: ((seunYear - 4) % 10 + 10) % 10,
      branch: ((seunYear - 4) % 12 + 12) % 12
    };

    return {
      solar: { y: sy, m: sm, d: sd },
      lunar: lunarInfo,
      pillars,
      counts,
      chars,
      dayMaster: { stem: dStem, elem: dayMasterElem, yang: STEM_YANG[dStem] === 1 },
      dayMasterTenGod: tenGod(dStem, dStem),
      strength,
      tenGods: chars.filter(c => c.type === "stem").map(c => tenGod(c.char, dStem)),
      daewoon,
      startAge,
      forward,
      seun,
      jeolgi: JEOLGI[mIdx],
      unknownTime,
      gender: opt.gender || "female",
      name: opt.name || "",
      jojasi
    };
  }

  /* ---------- 오늘의 일진 ---------- */
  function todayGanji(date) {
    const d = date || new Date();
    const idx = dayIndex(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { s: idx % 10, b: idx % 12, idx, date: d };
  }

  function pillarText(p) {
    if (!p) return "??";
    return CHEONGAN[p.s] + GANJI[p.b];
  }

  global.DalbitEngine = {
    CHEONGAN, CHEONGAN_KR, GANJI, GANJI_KR, GANJI_ANIMAL, ELEMS, ELEM_KR, ELEM_COLOR,
    STEM_ELEM, BRANCH_ELEM, STEM_YANG, BRANCH_YANG, JEOLGI,
    solarToLunar, lunarToSolar, isLeapMonth, computeSaju, todayGanji, pillarText,
    sunLongitude, ipchunDate, jdnFromYMD, ymdFromJDN
  };
})(typeof window !== "undefined" ? window : globalThis);
