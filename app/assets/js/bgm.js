/* ============================================================
   달빛 운세 · bgm.js
   화면별 배경음(Web Audio 합성 · 음원 파일 없음)
     · village   : 칼림바·가야금풍 5음계 + 산새/바람
     · consult   : 잔잔한 오르골
     · meditation: 처마 풍경 + 깊은 싱잉볼
   브라우저 자동재생 정책상 첫 터치/토글에서 시작한다.
   ============================================================ */
(function (global) {
  "use strict";

  const MUTE_KEY = "dalbit_bgm_muted";
  const LEVEL = { village: 0.075, consult: 0.055, meditation: 0.045 };

  let ac = null;
  let master = null;
  let mode = null;         // "village" | "consult" | "meditation" | null
  let muted = false;
  let loopTimer = null;
  let started = false;     // 사용자 제스처 이후 오디오가 열렸는지
  let step = 0;

  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { }

  function audio() {
    if (!ac) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0;
      master.connect(ac.destination);
    }
    if (ac.state === "suspended") { ac.resume().catch(() => { }); }
    return ac;
  }

  function gainTo(v, sec) {
    if (!master) return;
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(v, t + (sec || 0.8));
  }

  /* ---------- 악기 ---------- */
  function pluck(freq, when, dur, gain, type) {
    const t = ac.currentTime + (when || 0);
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = type || "triangle";
    o.frequency.setValueAtTime(freq, t);
    lp.type = "lowpass"; lp.frequency.setValueAtTime(3200, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // 오르골: 사인 + 약한 배음, 긴 감쇠
  function orgel(freq, when, gain) {
    const t = ac.currentTime + (when || 0);
    [1, 2, 3.01].forEach((mul, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq * mul, t);
      const amp = gain / (i + 1.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8 + i * 0.2);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 2.2);
    });
  }

  // 풍경(작은 종): 높은 사인, 긴 여운 + 살짝 흔들리는 피치
  function chime(freq, when, gain) {
    const t = ac.currentTime + (when || 0);
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    lfo.frequency.setValueAtTime(4.5, t);
    lg.gain.setValueAtTime(freq * 0.006, t);
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    o.connect(g); g.connect(master);
    o.start(t); lfo.start(t);
    o.stop(t + 3.6); lfo.stop(t + 3.6);
  }

  function bowlDeep(freq, when, gain) {
    const t = ac.currentTime + (when || 0);
    [1, 2.01, 2.98].forEach((mul, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq * mul, t);
      const amp = gain / (i + 1.3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 6.8);
    });
  }

  // 산새 지저귐
  function bird(when) {
    const t = ac.currentTime + (when || 0);
    const base = 1900 + Math.random() * 900;
    for (let i = 0; i < 3; i++) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine";
      const at = t + i * 0.09;
      o.frequency.setValueAtTime(base + i * 120, at);
      o.frequency.exponentialRampToValueAtTime(base - 260, at + 0.07);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.028, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      o.connect(g); g.connect(master);
      o.start(at); o.stop(at + 0.1);
    }
  }

  // 바람: 필터드 노이즈 스웰
  function wind() {
    const t = ac.currentTime;
    const dur = 3.4;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.35;
    const src = ac.createBufferSource(); src.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }

  /* ---------- 화면별 진행 ---------- */
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.5]; // C D E G A C
  const ORGEL = [523.25, 659.25, 783.99, 880.00, 1046.5, 1318.5];

  function villageStep() {
    // 통통 튀는 칼림바 선율 (5음계 random walk)
    const i = Math.max(0, Math.min(PENTA.length - 1, 2 + Math.round(Math.sin(step * 0.7) * 2) + (Math.random() < 0.35 ? (Math.random() < 0.5 ? 1 : -1) : 0)));
    pluck(PENTA[i], 0, 1.1, 0.13, "triangle");
    if (Math.random() < 0.45) pluck(PENTA[(i + 2) % PENTA.length] / 2, 0.28, 1.4, 0.07, "sine");
    if (step % 8 === 3) bird(0.5);
    if (step % 16 === 11) wind();
    step++;
  }

  function consultStep() {
    const i = (step * 3) % ORGEL.length;
    orgel(ORGEL[i], 0, 0.06);
    if (Math.random() < 0.5) orgel(ORGEL[(i + 2) % ORGEL.length] / 2, 0.42, 0.035);
    step++;
  }

  function meditationStep() {
    chime(1318.5 * (Math.random() < 0.5 ? 1 : 1.5), 0, 0.05);
    if (step % 3 === 0) bowlDeep(132, 0.6, 0.05);
    step++;
  }

  const STEP_MS = { village: 620, consult: 1150, meditation: 3600 };

  function stopLoop() {
    if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  }

  function startLoop() {
    stopLoop();
    if (!mode) return;
    if (!audio()) return;
    started = true;
    gainTo(muted ? 0 : LEVEL[mode], 1.2);
    const fn = { village: villageStep, consult: consultStep, meditation: meditationStep }[mode];
    loopTimer = setInterval(() => { if (!muted) fn(); }, STEP_MS[mode]);
    if (!muted) fn();
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (!mode) { gainTo(0, 0.5); stopLoop(); return; }
    if (!started) return;      // 첫 터치 전에는 대기
    startLoop();
    if (master) gainTo(muted ? 0 : LEVEL[mode], 1.0);
  }

  /* 첫 사용자 제스처에서 오디오 열기 */
  function unlock() {
    if (started) return;
    if (!audio()) return;
    started = true;
    if (mode) startLoop();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("touchstart", unlock);
    document.removeEventListener("keydown", unlock);
  }
  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("touchstart", unlock, { passive: true });
  document.addEventListener("keydown", unlock);

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) { }
    if (!audio()) return muted;
    if (!muted && !started) { started = true; if (mode) startLoop(); }
    gainTo(muted ? 0 : (mode ? LEVEL[mode] : 0), 0.5);
    return muted;
  }

  function isMuted() { return muted; }
  function isOn() { return started && !!mode; }
  function currentMode() { return mode; }

  global.DalbitBGM = { setMode, toggleMute, isMuted, isOn, currentMode };
})(typeof window !== "undefined" ? window : globalThis);
