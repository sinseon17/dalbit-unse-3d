/* ============================================================
   달빛 운세 · meditation.js
   기도 · 명상방 — 싱잉볼 / 목탁 / 빗소리 + 호흡 가이드 타이머 + 소원 촛불
   싱잉볼·목탁은 실제 녹음 파일(assets/audio/), 빗소리는 합성음
   ============================================================ */
(function (global) {
  "use strict";

  const A = global.DalbitAudio;
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
      if (A && A.preload && A.FILES) A.preload(ac, [A.FILES.bowl, A.FILES.moktak].filter(Boolean));
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
  function bowlOnce(when) {
    audio();
    const synth = () => {
      if (A && A.bowl) A.bowl(ac, master, { freq: 196, gain: 0.20, wet: 0.30, when: when || 0 });
      else ping(528, 7.0, 0.12, "sine", when || 0);
    };
    if (A && A.playOnce && A.FILES && A.FILES.bowl) {
      A.playOnce(ac, master, A.FILES.bowl, { gain: 0.34, when: when || 0, onFail: synth });
    } else {
      synth();
    }
  }
  function startBowl() {
    audio();
    bowlOnce();
    loops.bowl = setInterval(bowlOnce, 9500);   // 여운이 긴 만큼 조금 띄워서
  }
  function stopBowl() {
    clearInterval(loops.bowl); loops.bowl = null;
  }

  /* ---------- 목탁 ---------- */
  function moktakOnce() {
    audio();
    const synth = () => {
      if (A && A.moktak) A.moktak(ac, master, { freq: 500, gain: 0.30, wet: 0.14 });
      else ping(430, 0.11, 0.14, "triangle", 0);
    };
    if (A && A.playOnce && A.FILES && A.FILES.moktak) {
      A.playOnce(ac, master, A.FILES.moktak, { gain: 0.55, onFail: synth });
    } else {
      synth();
    }
  }
  function startMoktak() { audio(); moktakOnce(); loops.moktak = setInterval(moktakOnce, 1800); }
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
  /* 화면에 보이는 문구(text)와 귀로 들려주는 문구(say)를 따로 둔다.
     화면은 "…로 이어지는" 호흡의 흐름을 보여 주고, 말은 완결된 문장으로 또박또박 읽는다. */
  const BREATH = [
    { text: "숨을 천천히 들이쉬세요…", say: "숨을 천천히 들이쉬세요", ms: 4000 },
    { text: "잠시 멈추세요…", say: "잠시 멈추세요", ms: 2000 },
    { text: "천천히 내쉬세요…", say: "천천히 내쉬세요", ms: 6000 }
  ];
  /* 음성 안내는 meditation-voice.js 가 맡는다 (없으면 조용히 넘어간다) */
  function voice() { return global.DalbitBreathVoice || null; }
  function voiceSay(t) { const v = voice(); if (v) { try { v.speak(t); } catch (e) { } } }
  function voiceStop() { const v = voice(); if (v) { try { v.stop(); } catch (e) { } } }

  function breathLoop(render) {
    let i = 0;
    const step = () => {
      render(BREATH[i].text);
      voiceSay(BREATH[i].say || BREATH[i].text);
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
    voiceStop();   // 하던 호흡 안내를 바로 끊는다
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
    const candleBtn = root.querySelector("#medCandleBtn");
    const candleTip = root.querySelector("#medCandleTip");
    const syncCandle = () => {
      const lit = !!(candle && candle.classList.contains("lit"));
      if (candleTip) candleTip.hidden = lit;
      if (candleBtn) {
        candleBtn.classList.toggle("lit", lit);
        candleBtn.setAttribute("aria-pressed", lit ? "true" : "false");
        candleBtn.setAttribute("aria-label", lit ? "촛불 끄기" : "소원 촛불 켜기");
        const b = candleBtn.querySelector("b");
        if (b) b.textContent = lit ? "촛불 끄기" : "촛불 켜기";
      }
    };
    const toggleCandle = () => {
      if (!candle) return;
      candle.classList.toggle("lit");
      const lit = candle.classList.contains("lit");
      syncCandle();
      if (lit) {
        ping(660, 1.6, 0.1, "sine", 0);
        if (opts.toast) opts.toast("소원 촛불을 밝혔습니다 🕯️");
      } else if (opts.toast) opts.toast("촛불을 껐습니다");
    };
    if (candle) candle.addEventListener("click", toggleCandle);
    if (candleBtn) candleBtn.addEventListener("click", toggleCandle);
    syncCandle();
    const startBtn = root.querySelector("#medStart");
    if (startBtn) startBtn.addEventListener("click", () => {
      startTimer({
        timeEl: root.querySelector("#medTime"),
        breathEl: root.querySelector("#medBreath"),
        btn: startBtn,
        onEnd: () => {
          bowlOnce(); setTimeout(() => bowlOnce(), 2300); setTimeout(() => bowlOnce(), 4600);
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
