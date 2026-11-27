/* ============================================================
   달빛 운세 · meditation.js
   기도 · 명상방 — 싱잉볼 / 목탁 / 빗소리 + 호흡 가이드 타이머 + 소원 촛불
   (모든 소리는 Web Audio 로 즉석 합성 · 음원 파일 없음)
   ============================================================ */
(function (global) {
  "use strict";

  let ac = null;
  let master = null;
  const loops = { bowl: null, moktak: null, rain: null };
  let timer = null;
  let remain = 0;
  let total = 180;
  let breathTimer = null;
  let breathStep = 0;
  let running = false;

  function audio() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  function ping(freq, dur, gain, type, delay) {
    const a = audio();
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  /* ---------- 싱잉볼 ---------- */
  function bowlOnce() {
    // 배음이 살짝 어긋나며 길게 울리는 종소리
    ping(528, 7.0, 0.16, "sine", 0);
    ping(528 * 2.01, 5.0, 0.055, "sine", 0.02);
    ping(528 * 2.98, 3.6, 0.028, "sine", 0.05);
    ping(264, 6.0, 0.04, "sine", 0);
  }
  function startBowl() {
    audio();
    bowlOnce();
    loops.bowl = setInterval(bowlOnce, 11000);
    // 은은한 지속 울림
    const a = audio();
    const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    o.type = "sine"; o.frequency.value = 132;
    g.gain.value = 0.016;
    lfo.frequency.value = 0.12; lg.gain.value = 0.008;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); g.connect(master);
    o.start(); lfo.start();
    loops.bowlDrone = { o, lfo, g };
  }
  function stopBowl() {
    clearInterval(loops.bowl); loops.bowl = null;
    if (loops.bowlDrone) {
      try {
        loops.bowlDrone.g.gain.setTargetAtTime(0, audio().currentTime, 0.4);
        loops.bowlDrone.o.stop(audio().currentTime + 1.2);
        loops.bowlDrone.lfo.stop(audio().currentTime + 1.2);
      } catch (e) { }
      loops.bowlDrone = null;
    }
  }

  /* ---------- 목탁 ---------- */
  function moktakOnce() {
    ping(430, 0.11, 0.2, "triangle", 0);
    ping(310, 0.1, 0.09, "sine", 0.015);
  }
  function startMoktak() { audio(); moktakOnce(); loops.moktak = setInterval(moktakOnce, 1700); }
  function stopMoktak() { clearInterval(loops.moktak); loops.moktak = null; }

  /* ---------- 빗소리 ---------- */
  function startRain() {
    const a = audio();
    const len = 4 * a.sampleRate;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;   // 갈색 잡음 → 부드러운 빗소리
      data[i] = last * 3.2 + white * 0.25;
    }
    const src = a.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    const hp = a.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 320;
    const g = a.createGain(); g.gain.value = 0.0;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
    src.start();
    g.gain.setTargetAtTime(0.11, a.currentTime, 1.2);
    loops.rain = { src, g };
  }
  function stopRain() {
    if (!loops.rain) return;
    const a = audio();
    try {
      loops.rain.g.gain.setTargetAtTime(0, a.currentTime, 0.5);
      loops.rain.src.stop(a.currentTime + 1.6);
    } catch (e) { }
    loops.rain = null;
  }

  const SOUNDS = {
    bowl: { start: startBowl, stop: stopBowl },
    moktak: { start: startMoktak, stop: stopMoktak },
    rain: { start: startRain, stop: stopRain }
  };
  const on = { bowl: false, moktak: false, rain: false };

  function toggleSound(kind) {
    on[kind] = !on[kind];
    if (on[kind]) SOUNDS[kind].start(); else SOUNDS[kind].stop();
    return on[kind];
  }

  function stopAll() {
    Object.keys(on).forEach(k => {
      if (on[k]) { on[k] = false; SOUNDS[k].stop(); }
    });
  }

  /* ---------- 호흡 가이드 ---------- */
  const BREATH = [
    { text: "숨을 깊게 들이마시고…", ms: 4000 },
    { text: "잠시 멈추고…", ms: 2000 },
    { text: "천천히 내쉬세요…", ms: 6000 }
  ];
  function breathLoop(render) {
    let i = 0;
    const step = () => {
      render(BREATH[i].text);
      breathTimer = setTimeout(() => { i = (i + 1) % BREATH.length; step(); }, BREATH[i].ms);
    };
    step();
  }

  /* ---------- 타이머 ---------- */
  function fmt(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function startTimer(opts) {
    const el = opts.timeEl, breathEl = opts.breathEl, btn = opts.btn, onEnd = opts.onEnd;
    if (running) { stopTimer(opts); return; }
    running = true;
    remain = total;
    if (btn) { btn.textContent = "명상을 마칠게요"; btn.classList.add("soft"); }
    const render = (t) => {
      if (breathEl) breathEl.innerHTML = `<span class="breath-dot"></span>${t}`;
    };
    breathLoop(render);
    const tick = () => {
      if (el) el.innerHTML = `${fmt(remain)}<small> / ${fmt(total)}</small>`;
      if (remain <= 0) {
        stopTimer(opts, true);
        if (onEnd) onEnd();
        return;
      }
      remain -= 1;
    };
    if (el) el.innerHTML = `${fmt(remain)}<small> / ${fmt(total)}</small>`;
    timer = setInterval(tick, 1000);
  }

  function stopTimer(opts, finished) {
    clearInterval(timer); timer = null;
    clearTimeout(breathTimer); breathTimer = null;
    running = false;
    const btn = opts && opts.btn;
    if (btn) { btn.textContent = "명상 시작"; btn.classList.remove("soft"); }
    if (!finished && opts && opts.breathEl) opts.breathEl.innerHTML = `<span class="breath-dot"></span>준비되면 명상을 시작해 보세요`;
  }

  function setLength(min) { total = min * 60; if (!running) return total; remain = Math.min(remain, total); return total; }

  function isRunning() { return running; }
  function currentTotal() { return total; }

  /* ---------- 화면 연결 ---------- */
  let mountedOpts = null;
  function mount(opts) {
    mountedOpts = opts;
    const root = opts.root;
    const soundBtns = root.querySelectorAll(".snd-btn");
    soundBtns.forEach(b => {
      b.addEventListener("click", () => {
        const k = b.dataset.sound;
        const state = toggleSound(k);
        b.classList.toggle("on", state);
        if (opts.toast) {
          const label = { bowl: "싱잉볼", moktak: "목탁", rain: "빗소리" }[k];
          opts.toast(state ? `${label} 소리를 켰습니다` : `${label} 소리를 껐습니다`);
        }
      });
    });
    root.querySelectorAll(".med-len button").forEach(b => {
      b.addEventListener("click", () => {
        if (running) return;
        root.querySelectorAll(".med-len button").forEach(x => x.classList.remove("on"));
        b.classList.add("on");
        setLength(+b.dataset.min);
        const t = root.querySelector("#medTime");
        if (t) t.innerHTML = `${fmt(total)}<small> / ${fmt(total)}</small>`;
      });
    });
    const candle = root.querySelector("#medCandle");
    if (candle) candle.addEventListener("click", () => {
      candle.classList.toggle("lit");
      if (candle.classList.contains("lit")) {
        ping(660, 1.6, 0.1, "sine", 0);
        if (opts.toast) opts.toast("소원 촛불을 밝혔습니다 🕯️");
      } else if (opts.toast) opts.toast("촛불을 껐습니다");
    });
    const startBtn = root.querySelector("#medStart");
    if (startBtn) startBtn.addEventListener("click", () => {
      startTimer({
        timeEl: root.querySelector("#medTime"),
        breathEl: root.querySelector("#medBreath"),
        btn: startBtn,
        onEnd: () => {
          bowlOnce(); setTimeout(bowlOnce, 900); setTimeout(bowlOnce, 1800);
          if (opts.toast) opts.toast("명상을 마쳤습니다 · 마음이 조금 가벼워지길");
          if (opts.onFinish) opts.onFinish();
        }
      });
    });
  }

  function unmount(root) {
    stopTimer({ btn: root && root.querySelector("#medStart"), breathEl: root && root.querySelector("#medBreath") });
    stopAll();
    if (root) root.querySelectorAll(".snd-btn.on").forEach(b => b.classList.remove("on"));
    mountedOpts = null;
  }

  global.DalbitMeditation = { mount, unmount, toggleSound, stopAll, isRunning, setLength, currentTotal, fmt };
})(typeof window !== "undefined" ? window : globalThis);
