/* ============================================================
   달빛 운세 · bgm.js
   화면별 배경음 — 실제 음원 파일 + (파일이 없을 때) 합성음
     · village   : 실제 숲속 새소리 루프 (assets/audio/birds_loop.mp3)
     · consult   : 낮게 깔리는 물소리 + 가끔 울리는 은은한 싱잉볼
     · meditation: 자동 배경음 없음 — 버튼(싱잉볼·목탁·빗소리)을 눌러야만 소리 난다
   브라우저 자동재생 정책상 첫 터치/토글에서 시작한다.
   ============================================================ */
(function (global) {
  "use strict";

  const A = global.DalbitAudio;
  const MUTE_KEY = "dalbit_bgm_muted";
  const LEVEL = { village: 0.62, consult: 0.34, meditation: 0 };
  const SILENT = { meditation: true };   // 명상방은 조용히 — 사용자가 고른 소리만

  let ac = null;
  let master = null;
  let mode = null;         // "village" | "consult" | "meditation" | null
  let muted = false;
  let scene = null;        // 자연음 바탕
  let beatTimer = null;    // 상담실의 느린 싱잉볼
  let started = false;     // 사용자 제스처 이후 오디오가 열렸는지

  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { }

  function audio() {
    if (!ac) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0;
      master.connect(ac.destination);
      if (A && A.preload) A.preload(ac);   // 음원을 미리 받아 둔다
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

  /* ---------- 화면별 바탕 ---------- */
  const SCENE = {
    village: { level: 0.55 },
    consult: { level: 0.30 }
  };
  const BOWL_EVERY = { consult: 17000 };

  function stopScene(fade) {
    if (scene) { try { scene.stop(fade); } catch (e) { } scene = null; }
    if (beatTimer) { clearInterval(beatTimer); beatTimer = null; }
  }

  function startScene() {
    stopScene(0.8);
    if (!mode || !ac || !A || SILENT[mode]) return;
    const s = SCENE[mode] || SCENE.village;
    const startSynth = () => { scene = A.ambience(ac, master, { level: s.level, fade: 2.6 }); };
    if (mode === "village" && A.loopFile && A.FILES && A.FILES.birds) {
      // 실제 숲속 새소리 — 이음매 없이 반복되는 17.4초 루프
      scene = A.loopFile(ac, master, A.FILES.birds, {
        level: s.level, fade: 2.6,
        onFail: () => { if (mode === "village" && ac) startSynth(); }
      });
    } else {
      startSynth();
    }
    if (BOWL_EVERY[mode]) {
      const every = BOWL_EVERY[mode];
      const strike = () => {
        if (muted || !ac) return;
        const synth = () => A.bowl(ac, master, { freq: 174, gain: 0.22, wet: 0.28 });
        if (A.playOnce && A.FILES && A.FILES.bowl) A.playOnce(ac, master, A.FILES.bowl, { gain: 0.22, onFail: synth });
        else synth();
      };
      setTimeout(() => { if (mode === "consult" && !muted) strike(); }, 4200);
      beatTimer = setInterval(strike, every);
    }
  }

  function startLoop() {
    if (!mode) return;
    if (!audio()) return;
    started = true;
    gainTo(SILENT[mode] || muted ? 0 : LEVEL[mode], SILENT[mode] ? 0.4 : 1.2);
    startScene();
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (!mode) { gainTo(0, 0.5); stopScene(1.2); return; }
    if (!started) return;      // 첫 터치 전에는 대기
    startLoop();
    if (master) gainTo(SILENT[mode] || muted ? 0 : LEVEL[mode], SILENT[mode] ? 0.4 : 1.0);
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
