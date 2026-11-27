/* ============================================================
   달빛 운세 · audio.js
   실제 음원(assets/audio/*.mp3) 재생 + 합성음
     · 배경음·목탁·싱잉볼은 실제 녹음 파일을 쓴다 (bgm.js · meditation.js)
     · 파일을 못 읽을 때를 위해 합성음(자연음·목탁·싱잉볼)도 남겨 둔다
   ============================================================ */
(function (global) {
  "use strict";

  const cache = new WeakMap();

  function store(ctx) {
    let s = cache.get(ctx);
    if (!s) { s = {}; cache.set(ctx, s); }
    return s;
  }

  /* ---------- 공용 버퍼(잡음 · 잔향) ---------- */
  function makeNoise(ctx, kind) {
    const s = store(ctx), key = "noise_" + kind;
    if (s[key]) return s[key];
    const sr = ctx.sampleRate, dur = 6, fade = Math.floor(sr * 0.05);
    const len = Math.floor(sr * dur);
    const tmp = new Float32Array(len + fade);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < tmp.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") {
        last = (last + 0.018 * w) / 1.018;
        tmp[i] = last * 3.2;
        if (tmp[i] > 1) tmp[i] = 1; else if (tmp[i] < -1) tmp[i] = -1;
      } else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        tmp[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.16;
        b6 = w * 0.115926;
      } else {
        tmp[i] = w * 0.6;
      }
    }
    // 잡음마다 RMS 를 같게 맞춰 둔다 — 게인 값이 곧 세기가 되도록
    let acc = 0;
    for (let i = 0; i < tmp.length; i++) acc += tmp[i] * tmp[i];
    const norm = 0.3 / (Math.sqrt(acc / tmp.length) || 1);
    for (let i = 0; i < tmp.length; i++) tmp[i] *= norm;

    // 이음새 클릭 방지: 끝부분을 앞부분에 크로스페이드해 고리로 이어 붙인다
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    d.set(tmp.subarray(0, len));
    for (let i = 0; i < fade; i++) {
      const a = i / fade;
      d[i] = tmp[i] * a + tmp[len + i] * (1 - a);
    }
    s[key] = buf;
    return buf;
  }

  function reverbBuffer(ctx, seconds, decay) {
    const key = "ir_" + seconds + "_" + decay;
    const s = store(ctx);
    if (s[key]) return s[key];
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // 앞부분을 살짝 눌러 딱딱한 초기 반사를 없앤다
        const env = Math.pow(1 - t, decay) * Math.min(1, i / (sr * 0.01));
        d[i] = (Math.random() * 2 - 1) * env * 0.6;
      }
    }
    s[key] = buf;
    return buf;
  }

  /* 소리 하나가 지나갈 출력단: 팬 + (선택) 잔향 */
  function channel(ctx, dest, pan, wet, revSec, revDecay) {
    const g = ctx.createGain();
    const extra = [];
    let tail = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      g.connect(p); tail = p; extra.push(p);
    }
    tail.connect(dest);
    if (wet > 0) {
      const conv = ctx.createConvolver();
      conv.buffer = reverbBuffer(ctx, revSec || 2.4, revDecay == null ? 2.6 : revDecay);
      const w = ctx.createGain();
      w.gain.value = wet;
      tail.connect(conv); conv.connect(w); w.connect(dest);
      extra.push(conv, w);
    }
    g._extra = extra;   // release() 가 함께 떼어 낼 노드들
    return g;
  }

  /* 지수 감쇠 엔벨로프 (끝에서 뚝 끊기지 않게) */
  function expEnv(param, t0, peak, tau, total, attack) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    const steps = 28;
    const span = Math.max(0.05, total - attack);
    for (let i = 1; i <= steps; i++) {
      const tt = t0 + attack + span * (i / steps);
      const v = peak * Math.exp(-(span * (i / steps)) / tau);
      param.exponentialRampToValueAtTime(Math.max(0.00008, v), tt);
    }
    param.linearRampToValueAtTime(0.0, t0 + total + 0.18);
  }

  /* 소리가 끝난 뒤 그래프에서 떼어 낸다 (오래 켜 두어도 쌓이지 않게) */
  function release(out, sec) {
    if (typeof setTimeout !== "function") return;
    setTimeout(() => {
      try { out.disconnect(); } catch (e) { }
      (out._extra || []).forEach((n) => { try { n.disconnect(); } catch (e) { } });
    }, Math.max(0.2, sec) * 1000);
  }

  function lfo(ctx, freq, depth, target) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = depth;
    o.connect(g); g.connect(target);
    o.start();
    return o;
  }

  /* ============================================================
     싱잉볼 — 펠트 채로 살짝 친 티베트 싱잉볼
     기본음 + 살짝 어긋난 쌍(맥놀이) + 2.76 · 5.4 배음 + 긴 여운
     ============================================================ */
  const BOWL_PARTS = [
    { mul: 1.00, amp: 0.52, tau: 2.30, beat: 0.00 },
    { mul: 1.00, amp: 0.24, tau: 2.30, beat: 0.55 },
    { mul: 2.76, amp: 0.20, tau: 1.45, beat: 0.00 },
    { mul: 2.76, amp: 0.08, tau: 1.45, beat: 1.10 },
    { mul: 5.40, amp: 0.075, tau: 0.95, beat: 0.00 },
    { mul: 8.93, amp: 0.028, tau: 0.50, beat: 0.00 }
  ];

  function bowl(ctx, dest, opts) {
    opts = opts || {};
    const t = ctx.currentTime + (opts.when || 0);
    const f0 = opts.freq || 196;
    const gain = opts.gain == null ? 0.5 : opts.gain;
    const out = channel(ctx, dest, opts.pan || 0, opts.wet == null ? 0.2 : opts.wet, 3.0, 2.4);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 3600; lp.Q.value = 0.4;
    lp.connect(out);

    BOWL_PARTS.forEach((p) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f0 * p.mul + p.beat, t);
      // 아주 느린 피치 흔들림 — 전자음이 아니라 살아 있는 울림으로
      const drift = ctx.createOscillator(), dg = ctx.createGain();
      drift.frequency.value = 0.11 + Math.random() * 0.09;
      dg.gain.value = f0 * p.mul * 0.0006;
      drift.connect(dg); dg.connect(o.frequency);
      expEnv(g.gain, t, p.amp * gain, p.tau, Math.min(7.2, p.tau * 3.0), 0.032);
      o.connect(g); g.connect(lp);
      o.start(t); drift.start(t);
      o.stop(t + Math.min(7.2, p.tau * 3.0) + 0.4);
      drift.stop(t + Math.min(7.2, p.tau * 3.0) + 0.4);
    });

    // 펠트 채가 닿는 부드러운 '툽' — 나무망치 클릭을 가려 준다
    const n = ctx.createBufferSource();
    n.buffer = makeNoise(ctx, "brown");
    const nlp = ctx.createBiquadFilter();
    nlp.type = "lowpass"; nlp.frequency.value = 260; nlp.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.06 * gain * 2, t + 0.012);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    n.connect(nlp); nlp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.2);
    release(out, (opts.when || 0) + 7.8);
  }

  /* ============================================================
     목탁 — 속이 빈 둥근 나무를 두드린 '똑'
     나무 타격 트랜지언트 + 450~550Hz 목재 공명 + 100~140ms 감쇠
     ============================================================ */
  const WOOD_MODES = [
    { mul: 1.00, amp: 0.50, tau: 0.052 },
    { mul: 1.53, amp: 0.26, tau: 0.038 },
    { mul: 2.31, amp: 0.14, tau: 0.026 },
    { mul: 3.12, amp: 0.055, tau: 0.016 }
  ];

  function moktak(ctx, dest, opts) {
    opts = opts || {};
    const t = ctx.currentTime + (opts.when || 0);
    const base = opts.freq || 500;
    const gain = opts.gain == null ? 0.6 : opts.gain;
    const out = channel(ctx, dest, opts.pan || 0, opts.wet == null ? 0.12 : opts.wet, 0.7, 3.2);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 3000; lp.Q.value = 0.5;
    lp.connect(out);

    // 나무 몸통 공명 (속이 빈 느낌의 낮은 모드 포함)
    const modes = WOOD_MODES.concat([{ mul: 0.50, amp: 0.17, tau: 0.060 }]);
    modes.forEach((m) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      // 두드린 직후 살짝 높은 음에서 내려앉는 나무 특유의 굴곡
      o.frequency.setValueAtTime(base * m.mul * 1.14, t);
      o.frequency.exponentialRampToValueAtTime(base * m.mul, t + 0.030);
      const total = m.tau * 3.2;
      expEnv(g.gain, t, m.amp * gain, m.tau, total, 0.0025);
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + total + 0.45);
    });

    // 딱딱한 '짹' 대신 나무결이 스치는 짧은 트랜지언트
    const n = ctx.createBufferSource();
    n.buffer = makeNoise(ctx, "white");
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.10 * gain, t + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.05);
    release(out, (opts.when || 0) + 1.2);
  }

  /* ============================================================
     자연음 — 잔잔한 시냇물 + 가끔 들리는 물방울 + 산새
     ============================================================ */
  function drop(ctx, dest, opts) {
    opts = opts || {};
    const t = ctx.currentTime + (opts.when || 0);
    const f = opts.freq || (520 + Math.random() * 260);
    const gain = opts.gain == null ? 0.05 : opts.gain;
    const out = channel(ctx, dest, opts.pan || 0, 0.28, 1.6, 3.0);
    const o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.85, t + 0.045);
    bp.type = "bandpass"; bp.frequency.value = f * 1.2; bp.Q.value = 1.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.010);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(bp); bp.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.22);
    release(out, (opts.when || 0) + 0.8);
  }

  function bird(ctx, dest, opts) {
    opts = opts || {};
    const t0 = ctx.currentTime + (opts.when || 0);
    const notes = opts.notes || (2 + Math.floor(Math.random() * 3)); // 2~4음
    const base = opts.freq || (1750 + Math.random() * 950);
    const gain = opts.gain == null ? 0.05 : opts.gain;
    const out = channel(ctx, dest, opts.pan || 0, 0.34, 2.2, 2.6);
    let at = t0;
    for (let i = 0; i < notes; i++) {
      const dur = 0.065 + Math.random() * 0.07;
      const f1 = base * (1 + (Math.random() - 0.5) * 0.12 + i * 0.025);
      const up = 1.10 + Math.random() * 0.10;
      // 부드러운 사인 글라이드 + 아주 약한 배음 → 날카롭지 않은 지저귐
      [[1, 1], [2, 0.12], [3, 0.04]].forEach(([mul, amp]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f1 * mul * 0.96, at);
        o.frequency.exponentialRampToValueAtTime(f1 * mul * up, at + dur * 0.45);
        o.frequency.exponentialRampToValueAtTime(f1 * mul * 0.93, at + dur);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(gain * amp, at + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.03);
        o.connect(g); g.connect(out);
        o.start(at); o.stop(at + dur + 0.06);
      });
      at += dur + 0.025 + Math.random() * 0.05;
    }
    release(out, (opts.when || 0) + (at - t0) + 1.0);
  }

  /* 연속되는 시냇물 바탕 + 새·물방울 예약. stop() 으로 페이드아웃 */
  function ambience(ctx, dest, opts) {
    opts = opts || {};
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(dest);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0003, opts.level == null ? 0.5 : opts.level), now + (opts.fade == null ? 2.4 : opts.fade));

    const live = [];

    // 1) 물줄기 몸통 — 갈색 잡음을 부드럽게 걸러 낸 낮은 물소리
    const bed = ctx.createBufferSource();
    bed.buffer = makeNoise(ctx, "brown"); bed.loop = true;
    const bedHp = ctx.createBiquadFilter(); bedHp.type = "highpass"; bedHp.frequency.value = 130; bedHp.Q.value = 0.6;
    const bedLp = ctx.createBiquadFilter(); bedLp.type = "lowpass"; bedLp.frequency.value = 780; bedLp.Q.value = 0.7;
    const bedG = ctx.createGain(); bedG.gain.value = 0.40;
    bed.connect(bedHp); bedHp.connect(bedLp); bedLp.connect(bedG); bedG.connect(out);
    bed.start(now); live.push(bed);
    live.push(lfo(ctx, 0.07, 0.085, bedG.gain));      // 느리게 부풀었다 잦아드는 물결
    live.push(lfo(ctx, 0.043, 180, bedLp.frequency)); // 필터가 천천히 움직이며 물결 느낌

    // 2) 잔물결 — 중역 대역의 사각거리는 흐름
    const rip = ctx.createBufferSource();
    rip.buffer = makeNoise(ctx, "pink"); rip.loop = true;
    const ripBp = ctx.createBiquadFilter(); ripBp.type = "bandpass"; ripBp.frequency.value = 1500; ripBp.Q.value = 0.75;
    const ripG = ctx.createGain(); ripG.gain.value = 0.23;
    rip.connect(ripBp); ripBp.connect(ripG); ripG.connect(out);
    rip.start(now); live.push(rip);
    live.push(lfo(ctx, 0.16, 0.07, ripG.gain));
    live.push(lfo(ctx, 2.3, 0.024, ripG.gain));

    // 2-1) 아주 옅은 반짝임 — 물이 돌에 부딪히는 고역
    const spk = ctx.createBufferSource();
    spk.buffer = makeNoise(ctx, "white"); spk.loop = true;
    const spkBp = ctx.createBiquadFilter(); spkBp.type = "bandpass"; spkBp.frequency.value = 4200; spkBp.Q.value = 0.7;
    const spkG = ctx.createGain(); spkG.gain.value = 0.0075;
    spk.connect(spkBp); spkBp.connect(spkG); spkG.connect(out);
    spk.start(now); live.push(spk);

    // 3) 물방울 · 새소리 예약
    let nextDrop = now + 0.5 + Math.random() * 1.2;
    let nextBird = now + 0.9 + Math.random() * 1.6;
    const tick = () => {
      const t = ctx.currentTime, horizon = t + 1.6;
      let guard = 0;
      while (nextDrop < horizon && guard++ < 12) {
        drop(ctx, out, { when: Math.max(0, nextDrop - t), gain: 0.07 + Math.random() * 0.05, pan: (Math.random() - 0.5) * 0.7 });
        nextDrop += 0.35 + Math.random() * 1.2;
      }
      guard = 0;
      while (nextBird < horizon && guard++ < 6) {
        bird(ctx, out, { when: Math.max(0, nextBird - t), gain: 0.16 + Math.random() * 0.07, pan: (Math.random() - 0.5) * 1.0 });
        nextBird += 2.4 + Math.random() * 3.6;
      }
    };
    tick();
    const iv = setInterval(tick, 600);

    return {
      stop(fadeSec) {
        clearInterval(iv);
        const f = fadeSec == null ? 1.4 : fadeSec;
        const t = ctx.currentTime;
        try {
          out.gain.cancelScheduledValues(t);
          out.gain.setValueAtTime(Math.max(0.0002, out.gain.value), t);
          out.gain.exponentialRampToValueAtTime(0.0001, t + f);
        } catch (e) { }
        setTimeout(() => {
          live.forEach((n) => { try { n.stop && n.stop(); } catch (e) { } });
          try { out.disconnect(); } catch (e) { }
        }, (f + 0.3) * 1000);
      },
      setLevel(v, sec) {
        const t = ctx.currentTime;
        try {
          out.gain.cancelScheduledValues(t);
          out.gain.setValueAtTime(Math.max(0.0002, out.gain.value), t);
          out.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + (sec || 1.2));
        } catch (e) { }
      }
    };
  }

  /* ============================================================
     실제 음원 파일 재생 (web/assets/audio/)
       birds_loop.mp3   — 실제 숲속 새소리, 이음매 없이 반복되는 루프
       moktak_deep.mp3  — 실제 목어 타격 1타 (큰 목탁음)
       singing_bowl.mp3 — 티베트 싱잉볼 1회 타종
     파일을 못 읽으면(오프라인·형식 오류) 호출한 쪽이 위의 합성음으로 넘어간다.
     ============================================================ */
  const FILES = {
    birds: "assets/audio/birds_loop.mp3",
    moktak: "assets/audio/moktak_deep.mp3",
    bowl: "assets/audio/singing_bowl.mp3"
  };

  // url → Promise<AudioBuffer|null>. 디코딩한 버퍼는 컨텍스트와 무관하게 쓸 수 있어
  // bgm·명상방이 각자 AudioContext 를 가져도 파일은 한 번만 받는다.
  const fileCache = {};

  function loadFile(ctx, url) {
    if (fileCache[url]) return fileCache[url];
    fileCache[url] = new Promise((resolve) => {
      if (typeof fetch !== "function" || !ctx || !ctx.decodeAudioData) { resolve(null); return; }
      fetch(url, { cache: "force-cache" })
        .then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.arrayBuffer();
        })
        .then((ab) => new Promise((res, rej) => {
          let settled = false;
          const ok = (b) => { if (!settled) { settled = true; res(b); } };
          const ng = (e) => { if (!settled) { settled = true; rej(e); } };
          try {
            const p = ctx.decodeAudioData(ab, ok, ng);
            if (p && p.then) p.then(ok, ng);
          } catch (e) { rej(e); }
        }))
        .then(resolve)
        .catch(() => resolve(null));
    });
    return fileCache[url];
  }

  /* 미리 받아 두기 — 첫 터치 직후 버튼을 눌러도 바로 소리가 나도록 */
  function preload(ctx, urls) {
    const list = urls || Object.keys(FILES).map((k) => FILES[k]);
    return Promise.all(list.map((u) => loadFile(ctx, u)));
  }

  /* 한 번 울리기 (목탁·싱잉볼 타격) */
  function playOnce(ctx, dest, url, opts) {
    opts = opts || {};
    const g = ctx.createGain();
    g.gain.value = opts.gain == null ? 0.6 : opts.gain;
    g.connect(dest);
    let src = null, cancelled = false;
    loadFile(ctx, url).then((buf) => {
      if (cancelled) return;
      if (!buf) { try { g.disconnect(); } catch (e) { } if (opts.onFail) opts.onFail(); return; }
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(g);
      src.onended = () => { try { g.disconnect(); } catch (e) { } };
      src.start(ctx.currentTime + (opts.when || 0));
    });
    return {
      stop(fade) {
        cancelled = true;
        const f = fade == null ? 0 : fade;
        try { if (src) src.stop(ctx.currentTime + f); } catch (e) { }
        setTimeout(() => { try { g.disconnect(); } catch (e) { } }, (f + 0.2) * 1000);
      }
    };
  }

  /* 파일을 이음매 없이 반복 재생 + 페이드 in/out (마을 배경음) */
  function loopFile(ctx, dest, url, opts) {
    opts = opts || {};
    const level = opts.level == null ? 0.5 : opts.level;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(dest);
    let src = null, stopped = false;

    function ramp(v, sec) {
      if (stopped && v > 0.0002) return;
      const t = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
        g.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + (sec == null ? 1.2 : sec));
      } catch (e) { }
    }

    loadFile(ctx, url).then((buf) => {
      if (stopped) { try { g.disconnect(); } catch (e) { } return; }
      if (!buf) { try { g.disconnect(); } catch (e) { } if (opts.onFail) opts.onFail(); return; }
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = buf.duration;
      src.connect(g);
      src.start();
      ramp(level, opts.fade == null ? 2.4 : opts.fade);
    });

    return {
      stop(fade) {
        stopped = true;
        const f = fade == null ? 1.4 : fade;
        ramp(0.0001, f);
        setTimeout(() => {
          try { if (src) src.stop(); } catch (e) { }
          try { g.disconnect(); } catch (e) { }
        }, (f + 0.3) * 1000);
      },
      setLevel(v, sec) { ramp(v, sec); },
      isLoaded() { return !!src; }
    };
  }

  global.DalbitAudio = { bowl, moktak, drop, bird, ambience, makeNoise, reverbBuffer, channel,
                         FILES, loadFile, preload, playOnce, loopFile };
})(typeof window !== "undefined" ? window : globalThis);
