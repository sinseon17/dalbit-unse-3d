/* ============================================================
   달빛 운세 · bgm.js
   배경음 — 마을(village)에서만 숲속 새소리가 흐른다
     · village : 실제 숲속 새소리 루프 (assets/audio/birds_loop.mp3)
                 파일을 못 읽으면 합성 자연음으로 넘어간다
     · 그 밖의 모든 방(오늘의 운세·사주·타로·궁합·작명·꿈풀이·명상방…) :
                 자동 배경음 없음. 방에 들어가는 즉시 무음이 되고,
                 사용자가 직접 누른 소리(타로 뒤집기·사주 읽기·명상방
                 싱잉볼/목탁/빗소리/호흡 안내)만 울린다.
   마을로 다시 나오면 음소거가 아닌 한 새소리가 자연스럽게 이어진다.
   브라우저 자동재생 정책상 첫 터치/토글에서 시작한다.
   ============================================================ */
(function (global) {
  "use strict";

  const A = global.DalbitAudio;
  const MUTE_KEY = "dalbit_bgm_muted";
  const LEVEL = { village: 0.62 };

  let ac = null;
  let master = null;
  let mode = null;         // "village" 이거나 null(무음) — 방 안은 언제나 무음
  let muted = false;
  let scene = null;        // 새소리 바탕
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

  /* ---------- 마을 바탕 (새소리) ---------- */
  function stopScene(fade) {
    if (scene) { try { scene.stop(fade); } catch (e) { } scene = null; }
  }

  function startScene() {
    stopScene(0.6);
    if (mode !== "village" || !ac || !A) return;
    const level = LEVEL.village;
    const startSynth = () => {
      if (mode !== "village" || !ac) return;
      scene = A.ambience(ac, master, { level: 0.5, fade: 2.6 });
    };
    if (A.loopFile && A.FILES && A.FILES.birds) {
      // 실제 숲속 새소리 — 이음매 없이 반복되는 17.4초 루프
      scene = A.loopFile(ac, master, A.FILES.birds, {
        level: level, fade: 2.6,
        onFail: startSynth
      });
    } else {
      startSynth();
    }
  }

  function startLoop() {
    if (!mode) return;
    if (!audio()) return;
    started = true;
    startScene();
    gainTo(muted ? 0 : LEVEL[mode], 1.2);
  }

  /* 화면 전환 — 마을이 아니면(m 이 무엇이든) 곧바로 무음 */
  function setMode(m) {
    const next = m === "village" ? "village" : null;
    if (next === mode) return;
    mode = next;
    if (!mode) {
      // 방으로 들어감 — 새소리를 곧바로 끊는다 (딱 끊기는 느낌이 없도록 아주 짧게)
      gainTo(0, 0.15);
      stopScene(0.3);
      return;
    }
    if (!started) return;      // 첫 터치 전에는 대기
    startLoop();
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
