(() => {
  'use strict';
  const STORE = 'atlasStrataV1';
  const roots = [65.41, 73.42, 87.31, 98.00]; /* C2 D2 F2 G2 */
  let actx = null;
  let musicGain = null;
  let sfxGain = null;
  let master = null;
  let musicOn = true;
  let sfxOn = true;
  let unlocked = false;
  let timer = 0;
  let nextTime = 0;
  let step = 0;
  let bpm = 118;
  let variant = 0;
  let noiseBuf = null;
  let eraIdx = 0;
  let level = 1;

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; }
  }
  function writeStore(patch) {
    const o = readStore();
    for (const k in patch) o[k] = patch[k];
    localStorage.setItem(STORE, JSON.stringify(o));
    return o;
  }
  function loadFlags() {
    const o = readStore();
    if (typeof o.music === 'boolean' || typeof o.sfx === 'boolean') {
      musicOn = o.music !== false;
      sfxOn = o.sfx !== false;
    } else if (o.mute) {
      musicOn = false;
      sfxOn = false;
    } else {
      musicOn = true;
      sfxOn = true;
    }
  }
  function saveFlags() { writeStore({ music: musicOn, sfx: sfxOn }); }

  function ctx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.7;
      master.connect(actx.destination);
      musicGain = actx.createGain();
      musicGain.gain.value = musicOn ? 0.055 : 0;
      musicGain.connect(master);
      sfxGain = actx.createGain();
      sfxGain.gain.value = sfxOn ? 0.8 : 0;
      sfxGain.connect(master);
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.25, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return actx;
  }

  function osc(time, freq, dur, type, vol, dest, slide) {
    if (!actx || vol <= 0) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(Math.max(20, freq), time);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), time + dur);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0007, time + dur);
    o.connect(g).connect(dest || sfxGain);
    o.start(time);
    o.stop(time + dur + 0.03);
  }

  function noise(time, dur, vol, freq, dest) {
    if (!actx || !noiseBuf) return;
    const src = actx.createBufferSource();
    src.buffer = noiseBuf;
    const f = actx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq || 2000, time);
    f.Q.value = 0.8;
    const g = actx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
    src.connect(f); f.connect(g); g.connect(dest || musicGain);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  function beatTime() { return 60 / bpm / 4; } /* one 16th */

  /* original 2-bar bass (16th grid, 0 = rest), three era variants */
  const BASS = [
    [1, 0, 0, 0, 1, 0, 5, 0, 1, 0, 0, 3, 0, 0, 4, 5, 1, 0, 0, 0, 1, 0, 3, 0, 4, 0, 0, 5, 0, 0, 4, 3],
    [1, 0, 1, 0, 0, 5, 0, 0, 3, 0, 0, 0, 4, 0, 5, 0, 1, 0, 0, 5, 0, 0, 3, 0, 4, 4, 0, 5, 0, 3, 0, 1],
    [1, 0, 0, 5, 1, 0, 0, 3, 0, 0, 4, 0, 5, 0, 0, 1, 3, 0, 0, 0, 5, 0, 1, 0, 4, 0, 0, 3, 0, 5, 0, 0]
  ];
  const ARP = [
    [1, 3, 5, 8, 5, 3, 1, 3, 5, 8, 10, 8, 5, 3, 1, 5],
    [1, 3, 5, 3, 8, 5, 3, 1, 4, 6, 8, 6, 4, 3, 1, 3],
    [1, 5, 8, 5, 1, 5, 10, 8, 3, 5, 8, 5, 3, 1, 5, 3]
  ];
  const DEG = [0, 0, 2, 3, 5, 7, 8, 10, 12, 14, 15]; /* index by pattern values */

  function degree(n, oct) {
    const root = roots[variant % roots.length];
    const semi = DEG[n] || 0;
    return root * Math.pow(2, (semi / 12) + (oct || 0));
  }

  function schedule(stepN, time) {
    const s = stepN % 32;
    const bar = (stepN % 64) < 32;
    const bassPat = BASS[variant % 3];
    const arpPat = ARP[variant % 3];
    const b = bassPat[s];
    if (b) osc(time, degree(b, 0), 0.14, 'triangle', 0.11, musicGain);
    /* arpeggio every 16th, quieter on offbeats */
    const a = arpPat[s % 16];
    if (a) osc(time, degree(a, 2), 0.07, 'square', s % 2 ? 0.018 : 0.028, musicGain);
    /* light drums */
    if (s % 8 === 0) {
      osc(time, 90, 0.09, 'sine', 0.08, musicGain, 45);
    } else if (s % 8 === 4) {
      noise(time, 0.06, 0.05, 1800);
    }
    const hatEvery = eraIdx > 6 ? 2 : 4;
    if (s % hatEvery === 2) noise(time, 0.025, 0.03, eraIdx > 8 ? 5000 : 3500);
    /* late-era extra upbeat blip */
    if (eraIdx >= 9 && s % 16 === 10) osc(time, degree(5, 3), 0.05, 'square', 0.02, musicGain);
    void bar;
  }

  function tick() {
    if (!actx || !musicOn || !unlocked) return;
    const look = 0.12;
    while (nextTime < actx.currentTime + look) {
      schedule(step, nextTime);
      nextTime += beatTime();
      step += 1;
    }
  }

  function startMusic() {
    if (!ctx() || !musicOn || !unlocked) return;
    if (actx.state === 'suspended') actx.resume();
    musicGain.gain.cancelScheduledValues(actx.currentTime);
    musicGain.gain.setTargetAtTime(0.055, actx.currentTime, 0.05);
    nextTime = actx.currentTime + 0.05;
    if (!timer) timer = setInterval(tick, 25);
    tick();
  }
  function stopMusic(fade) {
    if (timer) { clearInterval(timer); timer = 0; }
    if (musicGain && actx) {
      musicGain.gain.cancelScheduledValues(actx.currentTime);
      musicGain.gain.setTargetAtTime(0.0001, actx.currentTime, fade ? 0.08 : 0.02);
    }
  }

  function applyBpm() {
    bpm = 116 + Math.min(18, eraIdx * 1.6) + Math.min(12, (level - 1) * 1.2);
  }
  function setStage(nextEra, nextLevel) {
    const e = Math.max(0, nextEra | 0);
    const lv = Math.max(1, nextLevel | 0);
    if (e === eraIdx && lv === level) return;
    eraIdx = e;
    level = lv;
    variant = e % 3;
    applyBpm();
  }

  function unlock() {
    loadFlags();
    if (!ctx()) return;
    if (actx.state === 'suspended') actx.resume();
    unlocked = true;
    if (sfxGain) sfxGain.gain.setTargetAtTime(sfxOn ? 0.8 : 0, actx.currentTime, 0.02);
    if (musicOn) startMusic();
  }

  function setMusic(on) {
    musicOn = !!on;
    saveFlags();
    if (!unlocked) return;
    if (musicOn) startMusic(); else stopMusic(true);
  }
  function setSfx(on) {
    sfxOn = !!on;
    saveFlags();
    if (sfxGain && actx) sfxGain.gain.setTargetAtTime(sfxOn ? 0.8 : 0, actx.currentTime, 0.02);
  }

  function beep(freq, dur, type, vol, slide) {
    if (!sfxOn || !unlocked || !ctx()) return;
    osc(actx.currentTime, freq, dur, type, vol || 0.035, sfxGain, slide);
  }
  function sfx(kind) {
    if (!sfxOn || !unlocked) return;
    if (kind === 'move') beep(220, 0.03, 'square', 0.02);
    else if (kind === 'rot') beep(340, 0.04, 'square', 0.025);
    else if (kind === 'lock') beep(140, 0.06, 'square', 0.03);
    else if (kind === 'drop') beep(180, 0.05, 'square', 0.03, 90);
    else if (kind === 'line') { beep(330, 0.08, 'square', 0.04); beep(490, 0.1, 'square', 0.03); }
    else if (kind === 'tetris') { beep(260, 0.12, 'square', 0.05, 520); beep(390, 0.16, 'square', 0.04, 780); }
    else if (kind === 'fault') beep(90, 0.18, 'sawtooth', 0.04, 60);
    else if (kind === 'hold') beep(260, 0.05, 'triangle', 0.025);
    else if (kind === 'over' || kind === 'end') { beep(220, 0.2, 'square', 0.04, 80); beep(140, 0.28, 'square', 0.035, 50); }
    else if (kind === 'collect') beep(520, 0.07, 'square', 0.035, 780);
    else if (kind === 'fuel') { beep(520, 0.08, 'triangle', 0.045, 840); beep(780, 0.1, 'triangle', 0.035); }
    else if (kind === 'warn') { beep(880, 0.08, 'square', 0.05); beep(440, 0.12, 'square', 0.045, 220); }
    else if (kind === 'hit' || kind === 'danger') {
      beep(80, 0.3, 'sawtooth', 0.07, 36);
      beep(170, 0.2, 'square', 0.05, 50);
      if (actx) noise(actx.currentTime, 0.22, 0.09, 350, sfxGain);
    }
    else if (kind === 'combo') { beep(400, 0.07, 'square', 0.04, 640); beep(560, 0.1, 'square', 0.03); }
    else if (kind === 'upgrade') { beep(330, 0.1, 'square', 0.04, 520); beep(660, 0.14, 'square', 0.03); }
    else if (kind === 'start') beep(200, 0.08, 'triangle', 0.03, 400);
  }

  document.addEventListener('visibilitychange', () => {
    if (!unlocked || !actx) return;
    if (document.hidden) { if (timer) { clearInterval(timer); timer = 0; } }
    else if (musicOn) startMusic();
  });

  loadFlags();
  window.GameAudio = {
    STORE,
    readStore,
    writeStore,
    unlock,
    setStage,
    setMusic,
    setSfx,
    toggleMusic() { setMusic(!musicOn); return musicOn; },
    toggleSfx() { setSfx(!sfxOn); return sfxOn; },
    musicOn() { return musicOn; },
    sfxOn() { return sfxOn; },
    beep,
    sfx
  };
})();
