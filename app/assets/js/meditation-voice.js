/* ============================================================
   달빛 운세 · meditation-voice.js
   명상방 호흡 안내를 차분한 목소리로 읽어 준다.

     · 명상방에 들어가기만 해서는 아무 말도 하지 않는다 (기본 무음)
     · '명상 시작'을 누른 뒤 들숨 · 멈춤 · 날숨이 바뀔 때만 말한다
     · 기기 안의 음성 합성(window.speechSynthesis)만 쓴다
       — 목소리가 서버로 나가지 않고, 이 기기에서만 들린다
     · 상단 음소거(🔇)와 명상방 [호흡 음성 안내] 토글을 함께 따른다
     · 명상을 멈추거나 방을 닫으면 하던 말을 바로 끊는다
   ============================================================ */
(function (global) {
  "use strict";

  const KEY = "dalbit_med_voice";     // '0' 이면 꺼짐 (기본 켜짐)
  const RATE = 0.84;                  // 차분하게
  const PITCH = 0.95;                 // 조금 낮게
  const doc = global.document || null;

  let enabled = true;
  try {
    const v = global.localStorage && global.localStorage.getItem(KEY);
    if (v === "0") enabled = false;
  } catch (e) { }

  let utterance = null;               // 지금 말하고 있는 것
  let pending = null;                 // cancel 뒤에 걸어 둔 speak 예약
  let voiceCache = null;
  let bound = false;

  function synth() { return global.speechSynthesis || null; }

  function supported() {
    return !!(synth() && typeof global.SpeechSynthesisUtterance === "function");
  }

  /* 상단 음소거와 설정의 배경음 끄기가 켜져 있으면 말하지 않는다 */
  function muted() {
    try {
      const B = global.DalbitBGM;
      return !!(B && typeof B.isMuted === "function" && B.isMuted());
    } catch (e) { return false; }
  }

  /* ---------- 목소리 고르기 (한국어 · 되도록 기기 안 목소리) ---------- */
  function listVoices() {
    const s = synth();
    if (!s || typeof s.getVoices !== "function") return [];
    try { return s.getVoices() || []; } catch (e) { return []; }
  }

  function pickVoice() {
    const all = listVoices();
    if (voiceCache && all.indexOf(voiceCache) !== -1) return voiceCache;
    const ko = all.filter(v => /^ko([-_]|$)/i.test(v.lang || ""));
    if (!ko.length) return null;
    const local = ko.filter(v => v.localService);
    const pool = local.length ? local : ko;
    const v = pool.find(x => x.default) || pool[0] || null;
    voiceCache = v;
    return v;
  }

  /* ---------- 말하기 ---------- */
  function speak(text) {
    const body = String(text == null ? "" : text).trim();
    if (!body) return false;
    if (!enabled) return false;
    if (muted()) return false;
    if (!supported()) return false;

    const s = synth();
    const u = new global.SpeechSynthesisUtterance(body);
    u.lang = "ko-KR";
    u.rate = RATE;
    u.pitch = PITCH;
    u.volume = 1;
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang || "ko-KR"; }
    utterance = u;

    const fire = () => {
      pending = null;
      try {
        if (s.paused) s.resume();
        s.speak(u);
      } catch (e) { }
    };

    // 앞의 말이 아직 남아 있으면 먼저 끊는다.
    // cancel() 직후 곧바로 speak() 하면 일부 크롬에서 새 말이 먹통이 되므로 한 박자 뒤에 건다.
    if (s.speaking || s.pending) {
      try { s.cancel(); } catch (e) { }
      clearTimeout(pending);
      pending = setTimeout(fire, 90);
    } else {
      fire();
    }
    return true;
  }

  /* 지금 하는 말 · 예약된 말을 모두 끊는다 */
  function stop() {
    clearTimeout(pending); pending = null;
    utterance = null;
    const s = synth();
    if (!s || typeof s.cancel !== "function") return;
    try { s.cancel(); } catch (e) { }
  }

  /* ---------- 켜기 / 끄기 ---------- */
  function setEnabled(on) {
    enabled = !!on;
    try { global.localStorage && global.localStorage.setItem(KEY, enabled ? "1" : "0"); } catch (e) { }
    if (!enabled) stop();
    syncToggle();
    return enabled;
  }
  function toggle() { return setEnabled(!enabled); }
  function isEnabled() { return enabled; }

  /* ---------- 명상방 토글 표시 ---------- */
  function syncToggle() {
    if (!doc) return;
    const b = doc.getElementById("medVoiceToggle");
    if (!b) return;
    if (!supported()) { b.hidden = true; return; }
    if (b.hidden) b.hidden = false;
    const on = enabled ? "true" : "false";
    if (b.classList.contains("on") !== !!enabled) b.classList.toggle("on", !!enabled);
    if (b.getAttribute("aria-pressed") !== on) b.setAttribute("aria-pressed", on);
    const label = enabled ? "호흡 음성 안내 끄기" : "호흡 음성 안내 켜기";
    if (b.getAttribute("aria-label") !== label) b.setAttribute("aria-label", label);
    const st = b.querySelector(".st");
    const word = enabled ? "켜짐" : "꺼짐";
    if (st && st.textContent !== word) st.textContent = word;   // 같으면 건드리지 않는다 (관찰자 되돌림 방지)
  }

  /* 화면이 다시 그려질 때 여러 번 불려도 한 번만 맞춘다 */
  let syncQueued = false;
  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    setTimeout(() => { syncQueued = false; syncToggle(); }, 0);
  }

  /* ---------- 화면 연결 ---------- */
  function bind() {
    if (bound || !doc) return;
    bound = true;

    doc.addEventListener("click", (e) => {
      const t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      const vb = t.closest("#medVoiceToggle");
      if (vb) { toggle(); return; }
      // 상단 음소거 · 설정의 배경음 끄기를 누르면 하던 말도 멈춘다
      if (t.closest("#btnSound, #lnkSound")) {
        setTimeout(() => { if (muted()) stop(); }, 0);
      }
    }, true);

    // 목소리 목록은 크롬에서 늦게 도착한다
    const s = synth();
    if (s && typeof s.addEventListener === "function") {
      s.addEventListener("voiceschanged", () => { voiceCache = null; });
    }

    // 명상방 화면이 다시 그려질 때 토글 상태를 맞춘다
    const root = doc.getElementById("screen-meditation");
    if (root && typeof global.MutationObserver === "function") {
      new global.MutationObserver(queueSync).observe(root, { childList: true, subtree: true });
    }
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", queueSync);
    else queueSync();
  }

  if (doc) bind();

  global.DalbitBreathVoice = {
    supported, speak, say: speak, stop, setEnabled, toggle, isEnabled, muted, syncToggle
  };
})(typeof window !== "undefined" ? window : globalThis);
