(() => {
  'use strict';

  const TILE = 8;
  const IW = 192, IH = 176;
  const COLS = 16;
  const BOARD_X = (IW - COLS * TILE) / 2;
  const STORE = 'atlasStrataV1';
  const FRAME = 1000 / 60;
  const INK = {
    mala: '#1C9B5A', azur: '#2B6CB0', hema: '#C44536', sulph: '#E2D44A',
    quartz: '#E8E6DE', galena: '#8B919A', chrom: '#4A5C52',
    malaDot: '#7ED9A4', azurDot: '#7EA6D6',
    fuel: '#7CFF2A', fuelGlow: '#00F0D8', fuelDark: '#148A2C'
  };
  const ERAS = [
    { name: 'Quaternary', from: 0, bg: '#181818' },
    { name: 'Neogene', from: 30, bg: '#181A18' },
    { name: 'Paleogene', from: 60, bg: '#181918' },
    { name: 'Cretaceous', from: 100, bg: '#171A1A' },
    { name: 'Jurassic', from: 150, bg: '#1A1917' },
    { name: 'Triassic', from: 210, bg: '#1A1818' },
    { name: 'Permian', from: 280, bg: '#1A1817' },
    { name: 'Carboniferous', from: 360, bg: '#161818' },
    { name: 'Devonian', from: 450, bg: '#16181A' },
    { name: 'Silurian', from: 550, bg: '#16191A' },
    { name: 'Ordovician', from: 660, bg: '#161918' },
    { name: 'Cambrian', from: 780, bg: '#181616' },
    { name: 'Precambrian', from: 920, bg: '#141414' }
  ];
  const LAYERS = [
    { name: 'soil', until: 20, card: null },
    { name: 'sandstone', until: 80, card: 'L' },
    { name: 'limestone', until: 160, card: 'L' },
    { name: 'shale', until: 280, card: 'S' },
    { name: 'granite', until: 480, card: 'J' },
    { name: 'basalt', until: 99999, card: 'Z' }
  ];
  const CARDS = [
    { id: 'T', title: 'Malachite', fact: 'Zhezkazgan copper, sandstone hosted.' },
    { id: 'I', title: 'Azurite', fact: 'Copper carbonate, often beside malachite.' },
    { id: 'S', title: 'Hematite', fact: 'Iron oxide, metallic to earthy lustre.' },
    { id: 'O', title: 'Sulphur', fact: 'Native sulphur in volcanic and evaporite beds.' },
    { id: 'L', title: 'Quartz', fact: 'Common vein mineral in the Kazakh uplands.' },
    { id: 'J', title: 'Galena', fact: 'Lead sulphide, Ridder-Sokolny type.' },
    { id: 'Z', title: 'Chromite', fact: 'Kempirsai chromite in ultramafic rock.' },
    { id: 'Au', title: 'Gold', fact: 'Bakyrchik-type gold in sulphide shale.' },
    { id: 'U', title: 'Uranium', fact: 'Roll-front uranium, Chu-Sarysu.' },
    { id: 'W', title: 'Tungsten', fact: 'Akchatau-type tungsten in greisen.' },
    { id: 'F', title: 'Fault', fact: 'A break that offsets the beds.' }
  ];
  const ORE = {
    Cu: { card: 'T', val: 8, ink: INK.mala },
    Au: { card: 'Au', val: 28, ink: INK.sulph },
    U: { card: 'U', val: 18, ink: INK.azur },
    W: { card: 'W', val: 22, ink: INK.quartz },
    I: { card: 'I', val: 10, ink: INK.azur },
    S: { card: 'S', val: 9, ink: INK.hema },
    O: { card: 'O', val: 8, ink: INK.sulph },
    J: { card: 'J', val: 10, ink: INK.galena },
    Z: { card: 'Z', val: 12, ink: INK.chrom },
    L: { card: 'L', val: 6, ink: INK.quartz }
  };
  const UPGRADES = [
    { id: 'tank', name: 'Bigger tank', desc: 'More fuel for a longer dive.' },
    { id: 'drill', name: 'Faster drill', desc: 'You sink faster.' },
    { id: 'magnet', name: 'Magnet', desc: 'Nearby ore pulls toward you.' },
    { id: 'siphon', name: 'Siphon', desc: 'Fuel cells give more.' },
    { id: 'warn', name: 'Early warning', desc: 'Hazards flash sooner.' },
    { id: 'pump', name: 'Deep pump', desc: 'Fuel burns a little slower.' }
  ];

  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d', { alpha: false });
  const el = (id) => document.getElementById(id);
  let scale = 3, acc = 0, last = 0, state, layoutKey = '';
  let holdDir = 0;

  function todayKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }
  function hashDate(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function readAll() { return (window.GameAudio && GameAudio.readStore()) || {}; }
  function loadMeta() {
    const o = readAll();
    const d = o.driller && typeof o.driller === 'object' ? o.driller : {};
    const today = todayKey();
    return {
      bestDepth: Number(d.bestDepth) || 0,
      bestScore: Number(d.bestScore) || 0,
      upgrades: Math.max(0, Math.min(UPGRADES.length, Number(d.upgrades) || 0)),
      daily: (d.daily && d.daily.date === today) ? d.daily : { date: today, depth: 0, score: 0 },
      cards: o.cards && typeof o.cards === 'object' ? o.cards : {}
    };
  }
  function saveMeta(meta) {
    if (window.GameAudio) {
      const o = GameAudio.readStore();
      o.cards = meta.cards;
      o.driller = {
        bestDepth: meta.bestDepth,
        bestScore: meta.bestScore,
        upgrades: meta.upgrades,
        daily: meta.daily
      };
      GameAudio.writeStore({ cards: o.cards, driller: o.driller });
    }
  }

  let meta = loadMeta();

  function hasUp(id) {
    const i = UPGRADES.findIndex((u) => u.id === id);
    return i >= 0 && meta.upgrades > i;
  }
  function maxFuel() {
    let f = 100;
    if (hasUp('tank')) f += 30;
    if (hasUp('pump')) f += 20;
    return f;
  }
  function drillSpeed() { /* tiles per second */
    let s = 1.7;
    if (hasUp('drill')) s += 0.45;
    return s;
  }
  function drainRate() {
    let d = maxFuel() / 58;
    if (hasUp('pump')) d *= 0.88;
    if (hasUp('drill')) d *= 1.08;
    return d;
  }
  function fuelPickup() { return hasUp('siphon') ? 24 : 16; }
  function warnLead() { return hasUp('warn') ? 1.15 : 0.7; } /* seconds */

  function eraAt(depth) {
    let e = ERAS[0], i = 0;
    for (let k = 0; k < ERAS.length; k++) if (depth >= ERAS[k].from) { e = ERAS[k]; i = k; }
    return { era: e, index: i };
  }
  function layerAt(depth) {
    for (let i = 0; i < LAYERS.length; i++) if (depth < LAYERS[i].until) return LAYERS[i];
    return LAYERS[LAYERS.length - 1];
  }

  function rawCell(x, y, rnd) {
    if (y < 0) return { t: 'air' };
    const depth = y * 2;
    const layer = layerAt(depth);
    const r = rnd(x, y, 1);
    const dens = Math.min(0.22, 0.06 + depth / 2500);
    let kind = 'rock';
    let ore = null;
    let hazard = null;
    if (r < 0.012) kind = 'fuel';
    else if (r < 0.012 + dens) {
      kind = 'ore';
      if (layer.name === 'sandstone' && rnd(x, y, 2) < 0.45) ore = 'Cu';
      else if (layer.name === 'shale' && rnd(x, y, 2) < 0.35) ore = 'Au';
      else if (layer.name === 'sandstone' && rnd(x, y, 3) < 0.2) ore = 'U';
      else if (layer.name === 'granite' && rnd(x, y, 2) < 0.3) ore = 'W';
      else {
        const bag = ['I', 'S', 'O', 'J', 'L', 'Z'];
        ore = bag[Math.floor(rnd(x, y, 4) * bag.length)];
      }
    } else if (r < 0.012 + dens + 0.016 + depth / 12000) {
      hazard = rnd(x, y, 5) < 0.55 ? 'water' : 'cave';
      kind = 'hazard';
    }
    if (x <= 0 || x >= COLS - 1) { kind = 'rock'; ore = null; hazard = null; }
    return { t: kind, layer: layer.name, ore, hazard, card: layer.card };
  }

  function cellKey(x, y) { return x + ',' + y; }

  function fresh(mode) {
    const daily = mode === 'daily';
    const seed = daily ? hashDate(todayKey() + ':drill') : ((Math.random() * 0xFFFFFFFF) >>> 0);
    const base = mulberry(seed);
    const rnd = (x, y, salt) => {
      const n = base() * 0; /* keep base advancing only in row gen */
      void n;
      /* deterministic from seed + coords */
      let h = seed ^ (x * 374761393) ^ (y * 668265263) ^ ((salt || 0) * 1274126177);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    return {
      phase: 'play',
      mode,
      seed,
      rnd,
      x: (COLS / 2 - 0.5),
      y: 2,
      carved: {},
      vy: 0,
      fuel: maxFuel(),
      maxFuel: maxFuel(),
      score: 0,
      combo: 0,
      comboT: 0,
      depth: 0,
      maxDepth: 0,
      taken: {},
      wet: {},
      fallen: {},
      warned: {},
      bursts: [],
      pops: [],
      shake: 0, sx: 0, sy: 0, flash: 0, flashC: null, barFlash: 0,
      tick: 0,
      fact: '',
      found: [],
      toast: null,
      slow: 0,
      wetT: 0
    };
  }

  function toast(st, text, life) {
    st.toast = { text, life: life == null ? 16 : life };
    el('toast').textContent = text;
    el('toast').hidden = false;
  }
  function unlockCard(st, id) {
    if (!id) return;
    if (!meta.cards[id]) {
      meta.cards[id] = true;
      saveMeta(meta);
      const card = CARDS.find((c) => c.id === id);
      if (card) {
        st.found.push(card);
        st.fact = card.fact;
        toast(st, card.title + '. ' + card.fact, 18);
      }
    } else if (!st.fact) {
      const card = CARDS.find((c) => c.id === id);
      if (card) st.fact = card.fact;
    }
  }

  function burst(st, sx, sy, color, n, speed, life, size) {
    const count = n == null ? 5 : n;
    const sp = speed == null ? 2 : speed;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + st.tick * 0.2;
      st.bursts.push({
        x: sx, y: sy,
        vx: Math.round(Math.cos(a) * sp),
        vy: Math.round(Math.sin(a) * sp) - 1,
        life: (life == null ? 7 : life) + (i % 3),
        color,
        size: size || 2
      });
    }
  }
  function pop(st, x, y, text, color) {
    if (!st.pops) st.pops = [];
    st.pops.push({ x: x, y: y, text: text, color: color, life: 40, vy: -1 });
  }
  const GLYPH = {
    '+': ['010','111','010','000','000'],
    '-': ['00000','00000','11111','00000','00000'],
    '!': ['1','1','1','0','1'],
    'A': ['010','101','111','101','101'],
    'D': ['110','101','101','101','110'],
    'E': ['111','100','110','100','111'],
    'F': ['111','100','110','100','100'],
    'G': ['011','100','101','101','011'],
    'L': ['100','100','100','100','111'],
    'N': ['101','111','111','101','101'],
    'R': ['110','101','110','101','101'],
    'U': ['101','101','101','101','111']
  };
  function drawGlyphs(x, y, text, color) {
    let ox = Math.round(x);
    const oy = Math.round(y);
    for (let pass = 0; pass < 2; pass++) {
      let px = ox;
      ctx.fillStyle = pass === 0 ? '#181818' : color;
      const d = pass === 0 ? 1 : 0;
      for (let i = 0; i < text.length; i++) {
        const rows = GLYPH[text[i]] || GLYPH['!'];
        const w = rows[0].length;
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < w; c++) {
            if (rows[r][c] === '1') {
              if (pass === 0) {
                ctx.fillRect(px + c - d, oy + r, 1 + d * 2, 1);
                ctx.fillRect(px + c, oy + r - d, 1, 1 + d * 2);
              } else ctx.fillRect(px + c, oy + r, 1, 1);
            }
          }
        }
        px += w + 1;
      }
    }
  }

  function audio(kind) { if (window.GameAudio) GameAudio.sfx(kind); }

  function collectOre(st, ore, px, py) {
    const spec = ORE[ore];
    if (!spec) return;
    st.comboT = 110;
    st.combo += 1;
    const mul = Math.max(1, st.combo);
    st.score += spec.val * mul;
    unlockCard(st, spec.card);
    burst(st, px, py, spec.ink, 5, 2, 7, 2);
    if (mul >= 3 && st.shake < 3) st.shake = 3;
    audio(mul >= 3 ? 'combo' : 'collect');
  }

  function hitHazard(st, kind, px, py) {
    const penalty = kind === 'water' ? 16 : 26;
    st.fuel = Math.max(0, st.fuel - penalty);
    if (kind === 'water') { st.wetT = 90; st.slow = 50; }
    else st.slow = 35;
    st.flash = 16;
    st.flashC = INK.hema;
    if (st.shake < 14) st.shake = 14;
    st.barFlash = 32;
    audio('danger');
    burst(st, px, py, INK.hema, 16, 4, 14, 3);
    burst(st, px, py, '#7A2A22', 8, 3, 12, 2);
    pop(st, px - 14, py - 18, 'DANGER', INK.hema);
    pop(st, px - 10, py - 10, '-FUEL', '#E0897C');
  }

  function maybeUpgrade(st) {
    if (st.maxDepth <= meta.bestDepth) return;
    const prevBest = meta.bestDepth;
    meta.bestDepth = st.maxDepth;
    if (st.mode === 'daily') {
      const d = todayKey();
      if (meta.daily.date !== d || st.maxDepth > (meta.daily.depth || 0)) {
        meta.daily = { date: d, depth: st.maxDepth, score: Math.max(st.score, meta.daily.score || 0) };
      }
    }
    if (st.score > meta.bestScore) meta.bestScore = st.score;
    if (prevBest >= 0 && meta.upgrades < UPGRADES.length && st.maxDepth > prevBest && prevBest > 0) {
      const u = UPGRADES[meta.upgrades];
      meta.upgrades += 1;
      saveMeta(meta);
      toast(st, 'New depth record. ' + u.name + '.', 20);
      audio('upgrade');
    } else {
      saveMeta(meta);
    }
    /* first ever run also unlocks first upgrade if they beat 0 with a real dive */
    if (prevBest === 0 && st.maxDepth >= 20 && meta.upgrades === 0) {
      const u = UPGRADES[0];
      meta.upgrades = 1;
      saveMeta(meta);
      toast(st, 'New depth record. ' + u.name + '.', 20);
      audio('upgrade');
    }
  }

  function endRun(st) {
    if (st.phase !== 'play') return;
    st.phase = 'dead';
    holdDir = 0;
    if (st.score > meta.bestScore) meta.bestScore = st.score;
    if (st.maxDepth > meta.bestDepth) maybeUpgrade(st);
    else saveMeta(meta);
    if (st.mode === 'daily') {
      const d = todayKey();
      if (meta.daily.date !== d) meta.daily = { date: d, depth: 0, score: 0 };
      if (st.maxDepth > (meta.daily.depth || 0)) meta.daily.depth = st.maxDepth;
      if (st.score > (meta.daily.score || 0)) meta.daily.score = st.score;
      saveMeta(meta);
    }
    if (!st.fact) {
      const known = CARDS.filter((c) => meta.cards[c.id]);
      st.fact = known.length ? known[st.found.length % known.length].fact : 'Deeper beds wait below.';
    }
    audio('end');
  }

  function worldCell(st, x, y) {
    const k = cellKey(x, y);
    if (st.fallen[k]) return { t: 'cave', hazard: 'cave', born: st.fallen[k] };
    if (st.wet[k]) return { t: 'water', hazard: 'water', born: st.wet[k] };
    if (st.taken[k] || (st.carved && st.carved[k])) return { t: 'empty' };
    return rawCell(x, y, st.rnd);
  }
  function carveAround(st) {
    if (!st.carved) st.carved = {};
    const cx = Math.round(st.x);
    const cy = Math.floor(st.y);
    for (let dy = -2; dy <= 0; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (y < 0 || x < 0 || x >= COLS) continue;
        const k = cellKey(x, y);
        if (st.taken[k] || st.fallen[k] || st.wet[k]) { st.carved[k] = true; continue; }
        const c = rawCell(x, y, st.rnd);
        /* leave uncollected pickups and live hazards; cut rock only */
        if (c.t === 'ore' || c.t === 'fuel' || c.t === 'hazard') continue;
        st.carved[k] = true;
      }
    }
  }

  function approaching(st, x, y, leadTiles) {
    return y > st.y && y <= st.y + leadTiles;
  }

  function tick(st, dt) {
    if (st.phase !== 'play') {
      st.tick += 1;
      if (st.toast) { st.toast.life -= 1; if (st.toast.life <= 0) st.toast = null; }
      return;
    }
    st.tick += 1;
    const lead = warnLead();
    const speed = drillSpeed() * (st.slow > 0 ? 0.55 : 1);
    st.y += speed * dt;
    const depth = Math.floor(st.y * 2);
    if (depth > st.maxDepth) st.maxDepth = depth;
    st.depth = depth;
    if (holdDir) {
      st.x += holdDir * 9 * dt;
    }
    if (st.x < 1.15) st.x = 1.15;
    if (st.x > COLS - 2.15) st.x = COLS - 2.15;
    let drain = drainRate();
    if (st.wetT > 0) drain *= 1.8;
    st.fuel -= drain * dt;
    if (st.slow > 0) st.slow -= 1;
    if (st.wetT > 0) st.wetT -= 1;
    if (st.comboT > 0) { st.comboT -= 1; if (st.comboT <= 0) st.combo = 0; }
    if (st.shake > 0) {
      st.shake -= 1;
      const mag = st.shake > 8 ? 6 : st.shake > 3 ? 3 : 2;
      st.sx = (st.tick % 2 ? mag : -mag);
      st.sy = (st.tick % 3 ? 2 : -2);
    } else { st.sx = 0; st.sy = 0; }
    if (st.flash > 0) st.flash -= 1;
    if (st.barFlash > 0) st.barFlash -= 1;
    for (let i = st.bursts.length - 1; i >= 0; i--) {
      const p = st.bursts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 1; p.life -= 1;
      if (p.life <= 0) st.bursts.splice(i, 1);
    }
    if (st.pops) {
      for (let i = st.pops.length - 1; i >= 0; i--) {
        const p = st.pops[i];
        p.y += p.vy;
        p.life -= 1;
        if (p.life <= 0) st.pops.splice(i, 1);
      }
    }

    const px = Math.round(st.x);
    const py = Math.floor(st.y + 0.6);
    const leadTiles = Math.max(2, Math.round(lead * drillSpeed()));
    /* warnings + activate hazards */
    let warnKind = null;
    for (let y = py; y <= py + leadTiles + 3; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        const c = worldCell(st, x, y);
        const k = cellKey(x, y);
        if (c.t === 'hazard' && c.hazard && !st.warned[k] && approaching(st, x, y, leadTiles)) {
          st.warned[k] = c.hazard;
          warnKind = c.hazard;
        }
        if (c.t === 'hazard' && c.hazard && y <= py) {
          if (c.hazard === 'water') { if (!st.wet[k]) st.wet[k] = st.tick; }
          else if (!st.fallen[k]) st.fallen[k] = st.tick;
        }
      }
    }
    if (warnKind) audio('warn');

    /* magnet */
    if (hasUp('magnet')) {
      for (let y = py - 1; y <= py + 3; y++) {
        for (let x = px - 3; x <= px + 3; x++) {
          const c = worldCell(st, x, y);
          if (c.t === 'ore' && Math.abs(x - st.x) <= 2.6 && Math.abs(y - st.y) <= 2.6) {
            const k = cellKey(x, y);
            st.taken[k] = true;
            const sx = BOARD_X + x * TILE + 4;
            const sy = TILE * 6;
            collectOre(st, c.ore, sx, sy);
          }
        }
      }
    }

    /* collide current tile */
    for (const [dx, dy] of [[0, 0], [0, 1], [-1, 0], [1, 0]]) {
      const cx = Math.round(st.x + dx * 0.35);
      const cy = Math.floor(st.y + 0.45 + dy * 0.4);
      const c = worldCell(st, cx, cy);
      const k = cellKey(cx, cy);
      if (st.taken[k]) continue;
      if (c.t === 'ore') {
        st.taken[k] = true;
        collectOre(st, c.ore, BOARD_X + cx * TILE + 4, worldToScreen(st, cy) + 4);
      } else if (c.t === 'fuel') {
        st.taken[k] = true;
        st.fuel = Math.min(st.maxFuel, st.fuel + fuelPickup());
        audio('fuel');
        const fx = BOARD_X + cx * TILE + 4, fy = worldToScreen(st, cy) + 2;
        burst(st, fx, fy, INK.fuel, 8, 2, 9, 2);
        burst(st, fx, fy, INK.fuelGlow, 4, 2, 8, 2);
        pop(st, fx + 6, fy - 12, '+FUEL', INK.fuel);
      } else if ((c.t === 'hazard' && cy <= py) || c.t === 'water' || c.t === 'cave') {
        if (!st.taken[k]) {
          st.taken[k] = true;
          hitHazard(st, c.hazard || (c.t === 'water' ? 'water' : 'cave'), BOARD_X + cx * TILE + 4, worldToScreen(st, cy) + 4);
        }
      }
      if (c.card) unlockCard(st, c.card);
    }

    carveAround(st);
    const er = eraAt(st.depth);
    if (window.GameAudio) GameAudio.setStage(er.index, 1 + Math.floor(st.depth / 40));

    if (st.fuel <= 0) {
      st.fuel = 0;
      maybeUpgrade(st);
      endRun(st);
    }
    if (st.toast) { st.toast.life -= 1; if (st.toast.life <= 0) st.toast = null; }
  }

  function worldToScreen(st, y) {
    const py = st.y;
    /* player sits at row 7 of the view */
    const anchor = 7;
    return Math.round((y - py) * TILE + anchor * TILE);
  }


  function drawCan(sx, sy, tick) {
    const pulse = (tick % 16) < 8;
    const ox = sx - 2, oy = sy - 2;
    ctx.fillStyle = pulse ? INK.fuelGlow : INK.fuel;
    ctx.fillRect(ox - 1, oy - 1, 14, 1);
    ctx.fillRect(ox - 1, oy + 12, 14, 1);
    ctx.fillRect(ox - 1, oy - 1, 1, 14);
    ctx.fillRect(ox + 12, oy - 1, 1, 14);
    if (pulse) {
      ctx.fillRect(ox - 2, oy + 2, 1, 8);
      ctx.fillRect(ox + 13, oy + 2, 1, 8);
    }
    ctx.fillStyle = INK.fuel;
    ctx.fillRect(ox + 1, oy + 3, 10, 9);
    ctx.fillStyle = INK.fuelDark;
    ctx.fillRect(ox + 3, oy + 5, 3, 5);
    ctx.fillStyle = INK.fuelGlow;
    ctx.fillRect(ox + 4, oy + 1, 4, 2);
    ctx.fillRect(ox + 8, oy + 0, 3, 1);
    ctx.fillRect(ox + 10, oy + 1, 1, 2);
    ctx.fillStyle = '#08240C';
    ctx.fillRect(ox + 8, oy + 6, 2, 2);
  }
  function drawBang(sx, sy, on) {
    ctx.fillStyle = on ? INK.hema : '#7A2A22';
    ctx.fillRect(sx, sy, 8, 8);
    ctx.fillStyle = on ? INK.quartz : '#B0A89A';
    ctx.fillRect(sx + 3, sy + 1, 2, 4);
    ctx.fillRect(sx + 3, sy + 6, 2, 1);
  }
  function drawWaterTile(sx, sy, tick, heavy) {
    const phase = Math.floor(tick / 3) % 4;
    ctx.fillStyle = heavy ? INK.azur : '#1A4A86';
    ctx.fillRect(sx, sy + (heavy ? 0 : 2), TILE, TILE - (heavy ? 0 : 2));
    ctx.fillStyle = (tick % 2) ? INK.azurDot : '#4A8ED0';
    for (let i = 0; i < 4; i++) {
      const wx = (i * 3 + phase) % 7;
      const wy = 1 + ((i * 2 + phase) % 6);
      ctx.fillRect(sx + wx, sy + wy, 3, 1);
    }
  }
  function drawCaveTile(sx, sy, age, tick) {
    const t = Math.max(0, tick - (typeof age === 'number' ? age : tick));
    ctx.fillStyle = '#140806';
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#5A2A20';
    ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillRect(sx, sy, 1, TILE);
    ctx.fillStyle = INK.hema;
    ctx.fillRect(sx, sy + 3, 6, 1);
    ctx.fillRect(sx + 3, sy, 1, 6);
    void t;
  }
  function drawCaveRubble(sx, sy, age, tick) {
    const t = Math.max(0, tick - (typeof age === 'number' ? age : tick));
    const bits = [
      [-1, 0, 7, 6, '#C44536', 0.45],
      [2, 1, 6, 5, '#E0897C', 0.65],
      [-3, 2, 6, 5, '#A84830', 0.35],
      [1, 0, 5, 5, '#8A3A28', 0.75],
      [4, 2, 5, 4, '#C44536', 0.55]
    ];
    for (let i = 0; i < bits.length; i++) {
      const b = bits[i];
      const fy = sy + b[1] + Math.min(24, Math.floor(t * b[5]));
      const fx = sx + b[0] + ((Math.floor(t / 4) + i) % 2);
      ctx.fillStyle = b[4];
      ctx.fillRect(fx, fy, b[2], b[3]);
    }
  }
  function drawWarnFrame(sx, sy, on, color) {
    if (!on) return;
    ctx.fillStyle = color;
    ctx.fillRect(sx - 1, sy - 1, TILE + 2, 2);
    ctx.fillRect(sx - 1, sy - 1, 2, TILE + 2);
    ctx.fillRect(sx + TILE - 1, sy - 1, 2, TILE + 2);
    ctx.fillRect(sx - 1, sy + TILE - 1, TILE + 2, 2);
  }
  function floodHere(st, x, y) {
    if (st.wet[cellKey(x, y)]) return { on: true, heavy: true, age: st.tick - (st.wet[cellKey(x, y)] || st.tick) };
    let best = 99;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        const t0 = st.wet[cellKey(x + dx, y + dy)];
        if (!t0) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const age = st.tick - t0;
        if (age >= dist * 3 && age < dist * 3 + 36 && dist < best) best = dist;
      }
    }
    return best < 99 ? { on: true, heavy: false, age: best } : { on: false };
  }

  function patternRock(layer, x, y, px, py) {
    const bases = {
      soil: '#2A261F',
      sandstone: '#2E2A22',
      limestone: '#272824',
      shale: '#20241F',
      granite: '#262628',
      basalt: '#1C2020'
    };
    ctx.fillStyle = bases[layer] || '#24221E';
    ctx.fillRect(px, py, TILE, TILE);
    const plot = (pts, color) => {
      ctx.fillStyle = color;
      for (let i = 0; i < pts.length; i++) ctx.fillRect(px + pts[i][0], py + pts[i][1], 1, 1);
    };
    const v = Math.floor((x * 13 + y * 7) % 4);
    if (layer === 'soil') plot([[1, 2], [4, 1], [6, 4], [2, 6], [5, 6], [3, 3], [7, 2], [0, 5]], '#3A3428');
    else if (layer === 'sandstone') plot([[2, 1], [5, 3], [1, 6], [6, 5], [3, 4], [7, 2], [0, 3], [4, 7]], '#4A4334');
    else if (layer === 'shale') {
      const pts = [];
      for (let row = v % 2; row < 8; row += 2) for (let col = (row + v) % 2; col < 8; col += 3) pts.push([col, row]);
      plot(pts, INK.chrom);
    } else if (layer === 'limestone') plot([[1, 1], [5, 1], [1, 5], [5, 5], [3, 3], [7, 6], [2, 7], [6, 3]], '#3A3C36');
    else if (layer === 'granite') plot([[1, 1], [2, 1], [1, 2], [5, 4], [4, 5], [5, 5], [7, 2], [3, 6]], INK.quartz);
    else plot([[1, 1], [3, 2], [5, 1], [2, 4], [4, 5], [6, 4], [0, 6], [7, 7]], INK.chrom);
    if (x <= 0 || x >= COLS - 1) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(px, py, TILE, TILE);
      plot([[2, 2], [5, 5], [3, 7]], '#2A2A2A');
    }
  }

  function drawBot(sx, sy, frame) {
    /* original squat drill-bot, mineral palette, bit always down */
    const body = INK.mala, eye = INK.quartz, bit = INK.sulph, trim = INK.azur;
    ctx.fillStyle = body;
    ctx.fillRect(sx + 4, sy, 8, 2);
    ctx.fillRect(sx + 2, sy + 2, 12, 6);
    ctx.fillRect(sx + 4, sy + 8, 8, 2);
    ctx.fillStyle = trim;
    ctx.fillRect(sx + 2, sy + 2, 2, 6);
    ctx.fillRect(sx + 12, sy + 2, 2, 6);
    ctx.fillStyle = eye;
    ctx.fillRect(sx + 4, sy + 4, 2, 2);
    ctx.fillRect(sx + 10, sy + 4, 2, 2);
    ctx.fillStyle = bit;
    ctx.fillRect(sx + 6, sy + 10, 4, 2);
    ctx.fillRect(sx + 7, sy + 12 + (frame ? 2 : 0), 2, 2);
  }

  function draw() {
    const st = state;
    const depth = st && st.phase !== 'title' ? st.depth : 0;
    const er = eraAt(depth);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = er.era.bg;
    ctx.fillRect(0, 0, IW, IH);
    ctx.fillStyle = 'rgba(180,180,180,0.14)';
    for (let y = 0; y < IH; y += 2) {
      for (let x = 0; x < IW; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    if (!st || st.phase === 'title') return;

    ctx.save();
    ctx.translate(st.sx || 0, st.sy || 0);

    const py = st.y;
    const y0 = Math.floor(py) - 2;
    const y1 = y0 + Math.ceil(IH / TILE) + 4;
    for (let y = y0; y <= y1; y++) {
      const sy = worldToScreen(st, y);
      if (sy <= -TILE || sy >= IH) continue;
      for (let x = 0; x < COLS; x++) {
        const sx = BOARD_X + x * TILE;
        const c = worldCell(st, x, y);
        const k = cellKey(x, y);
        const warn = st.warned[k];
        const warnOn = warn && (st.tick % 6 < 3) && !st.taken[k] && (c.t === 'hazard' || warn);
        if (c.t === 'air' || c.t === 'empty') continue;
        if (c.t === 'rock' || c.t === 'hazard' || c.t === 'ore' || c.t === 'fuel') {
          patternRock(c.layer || 'sandstone', x, y, sx, sy);
        }
        if (c.t === 'ore' && c.ore && ORE[c.ore]) {
          ctx.fillStyle = ORE[c.ore].ink;
          ctx.fillRect(sx + 2, sy + 2, 4, 4);
          if (st.tick % 2 === 0) { ctx.fillStyle = INK.quartz; ctx.fillRect(sx + 5, sy + 1, 1, 1); }
        }
        if (c.t === 'fuel') {
          /* drawn in a second pass so the can can overflow the tile */
        } else if (c.t === 'water' || (c.t === 'hazard' && c.hazard === 'water' && st.wet[k])) {
          const born = typeof st.wet[k] === 'number' ? st.wet[k] : st.tick;
          drawWaterTile(sx, sy, st.tick, true);
          void born;
        } else if (c.t === 'cave' || (c.t === 'hazard' && c.hazard === 'cave' && st.fallen[k])) {
          drawCaveTile(sx, sy, st.fallen[k], st.tick);
        } else if (c.t === 'hazard') {
          /* latent hazard: cracked or damp rock so it already looks unsafe */
          if (c.hazard === 'cave') {
            ctx.fillStyle = '#3A1C18';
            ctx.fillRect(sx + 1, sy + 2, 6, 1);
            ctx.fillRect(sx + 2, sy + 5, 4, 1);
            ctx.fillStyle = INK.hema;
            ctx.fillRect(sx + 3, sy + 3, 2, 1);
          } else {
            ctx.fillStyle = '#1A3A62';
            ctx.fillRect(sx + 1, sy + 4, 6, 3);
          }
        }
        const fl = floodHere(st, x, y);
        if (fl.on && c.t !== 'water' && !(c.t === 'hazard' && c.hazard === 'water' && st.wet[k])) {
          drawWaterTile(sx, sy, st.tick, fl.heavy);
        }
      }
    }

    /* fuel cans and danger signs sit on top of rock */
    for (let y = y0; y <= y1; y++) {
      const sy = worldToScreen(st, y);
      if (sy <= -16 || sy >= IH + 8) continue;
      for (let x = 0; x < COLS; x++) {
        const sx = BOARD_X + x * TILE;
        const c = worldCell(st, x, y);
        const k = cellKey(x, y);
        if (c.t === 'fuel') drawCan(sx, sy, st.tick);
        if (c.t === 'cave' || (c.t === 'hazard' && c.hazard === 'cave' && st.fallen[k])) {
          drawCaveRubble(sx, sy, st.fallen[k], st.tick);
        }
        const warned = st.warned[k];
        if (warned && c.t === 'hazard' && !st.taken[k] && !st.fallen[k] && !st.wet[k]) {
          const on = (st.tick % 8) < 4;
          drawWarnFrame(sx, sy, true, warned === 'cave' ? INK.hema : INK.azur);
          drawBang(sx, sy - 8, on);
        }
      }
    }

    const botY = worldToScreen(st, st.y);
    const botX = Math.round(BOARD_X + st.x * TILE - 8);
    drawBot(botX, botY, st.tick % 2);

    if (st.flash > 0 && st.flashC) {
      ctx.fillStyle = st.flashC;
      ctx.globalAlpha = st.flash > 8 ? 0.5 : 0.28;
      ctx.fillRect(0, 0, IW, IH);
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < st.bursts.length; i++) {
      const p = st.bursts[i];
      ctx.fillStyle = p.color;
      const sz = p.size || 2;
      ctx.fillRect(p.x, p.y, sz, sz);
    }
    if (st.pops) {
      for (let i = 0; i < st.pops.length; i++) {
        const p = st.pops[i];
        if (p.life < 8 && (st.tick % 2)) continue;
        drawGlyphs(p.x, p.y, p.text, p.color);
      }
    }
    ctx.restore();
  }

  function bars() {
    const st = state;
    const frac = st.maxFuel > 0 ? Math.max(0, Math.min(1, st.fuel / st.maxFuel)) : 0;
    const bar = el('fuel');
    const fill = el('fuel-fill');
    const inner = bar.clientWidth;
    const step = inner >= 120 ? 4 : 2;
    let px = Math.round((frac * inner) / step) * step;
    if (frac > 0 && px < step) px = step;
    if (px > inner) px = inner;
    if (frac <= 0) px = 0;
    fill.style.width = px + 'px';
    bar.classList.toggle('hit', st.barFlash > 0);
    bar.classList.toggle('low', st.barFlash <= 0 && frac > 0 && frac < 0.25);
    bar.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
    el('depth').textContent = st.maxDepth + 'm';
    el('score').textContent = String(st.score);
    el('best').textContent = meta.bestDepth + 'm';
    el('era').textContent = eraAt(st.depth).era.name;
    el('combo').textContent = st.combo > 1 ? 'x' + st.combo : '';
  }

  function ui() {
    const playing = state && state.phase === 'play';
    el('hud').hidden = !playing;
    el('cover').hidden = !(state && state.phase === 'title');
    el('dead').hidden = !(state && state.phase === 'dead');
    el('best-title').textContent = meta.bestDepth + 'm';
    el('today-title').textContent = (meta.daily.depth || 0) + 'm';
    if (playing) bars();
    if (state && state.phase === 'dead') {
      const bits = ['Depth ' + state.maxDepth + 'm. Score ' + state.score + '.'];
      if (state.mode === 'daily') bits.push('Today ' + (meta.daily.depth || 0) + 'm.');
      el('endscore').textContent = bits.join(' ');
      el('endfact').textContent = state.fact || '';
    }
    if (state && state.toast && state.phase === 'play') {
      el('toast').hidden = false;
      el('toast').textContent = state.toast.text;
    } else el('toast').hidden = true;
    const mu = el('btn-music'), sx = el('btn-sfx');
    const musicOn = window.GameAudio ? GameAudio.musicOn() : true;
    const sfxOn = window.GameAudio ? GameAudio.sfxOn() : true;
    mu.textContent = musicOn ? 'Music' : 'Music off';
    sx.textContent = sfxOn ? 'SFX' : 'SFX off';
    mu.setAttribute('aria-pressed', musicOn ? 'false' : 'true');
    sx.setAttribute('aria-pressed', sfxOn ? 'false' : 'true');
    maybeResize();
  }

  function paintLegend() {
    const fuelC = el('leg-fuel'), dangC = el('leg-danger'), oreC = el('leg-ore');
    if (fuelC) {
      const g = fuelC.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#181818';
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = INK.fuelGlow;
      g.fillRect(1, 1, 14, 1); g.fillRect(1, 14, 14, 1); g.fillRect(1, 1, 1, 14); g.fillRect(14, 1, 1, 14);
      g.fillStyle = INK.fuel;
      g.fillRect(3, 5, 10, 9);
      g.fillStyle = INK.fuelDark;
      g.fillRect(5, 7, 3, 5);
      g.fillStyle = INK.fuelGlow;
      g.fillRect(6, 3, 4, 2); g.fillRect(10, 2, 3, 1);
    }
    if (dangC) {
      const g = dangC.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#181818';
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = INK.hema;
      g.fillRect(3, 3, 10, 2); g.fillRect(3, 3, 2, 10); g.fillRect(11, 3, 2, 10); g.fillRect(3, 11, 10, 2);
      g.fillRect(4, 4, 8, 8);
      g.fillStyle = INK.quartz;
      g.fillRect(7, 5, 2, 4); g.fillRect(7, 10, 2, 1);
    }
    if (oreC) {
      const g = oreC.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#181818';
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = INK.mala; g.fillRect(2, 6, 4, 4);
      g.fillStyle = INK.azur; g.fillRect(6, 6, 4, 4);
      g.fillStyle = INK.hema; g.fillRect(10, 6, 4, 4);
    }
  }
  function showCover() {
    holdDir = 0;
    state = { phase: 'title', depth: 0, sx: 0, sy: 0, bursts: [], tick: 0 };
    meta = loadMeta();
    paintLegend();
    ui();
    draw();
  }
  function startRun(mode) {
    if (window.GameAudio) GameAudio.unlock();
    meta = loadMeta();
    state = fresh(mode || 'play');
    holdDir = 0;
    audio('start');
    if (window.GameAudio) GameAudio.setStage(0, 1);
    ui();
    draw();
  }
  function restart() {
    startRun(state && state.mode ? state.mode : 'play');
  }

  function paintCardIcon(c, type, locked) {
    const dpr = 4;
    c.width = 12 * dpr; c.height = 12 * dpr;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#181818';
    g.fillRect(0, 0, 12, 12);
    if (locked) {
      g.fillStyle = '#2A2A2A';
      g.fillRect(5, 3, 2, 2);
      g.fillRect(5, 7, 2, 2);
      return;
    }
    const ink = (ORE[type] && ORE[type].ink) || INK.mala;
    g.fillStyle = ink;
    g.fillRect(2, 2, 8, 8);
    g.fillStyle = '#181818';
    g.fillRect(3, 3, 6, 6);
    g.fillStyle = ink;
    if (type === 'T') { g.fillRect(3, 3, 1, 1); g.fillRect(5, 3, 1, 1); g.fillRect(7, 3, 1, 1); g.fillRect(5, 6, 1, 1); }
    else if (type === 'I') { g.fillRect(3, 3, 1, 1); g.fillRect(6, 3, 1, 1); g.fillRect(3, 6, 1, 1); g.fillRect(6, 6, 1, 1); }
    else if (type === 'S') { g.fillRect(3, 3, 2, 1); g.fillRect(6, 6, 2, 1); }
    else if (type === 'O') { g.fillRect(4, 3, 1, 1); g.fillRect(7, 5, 1, 1); }
    else if (type === 'L') { g.fillRect(4, 4, 1, 1); g.fillRect(7, 3, 1, 1); }
    else if (type === 'J') { g.fillRect(3, 3, 2, 2); g.fillRect(7, 7, 2, 2); }
    else if (type === 'Z') { for (let i = 3; i < 9; i += 2) g.fillRect(i, i - 1, 1, 1); }
    else if (type === 'Au') { g.fillStyle = INK.sulph; g.fillRect(5, 5, 2, 2); }
    else if (type === 'U') { g.fillStyle = INK.azur; g.fillRect(5, 5, 2, 2); }
    else if (type === 'W') { g.fillStyle = INK.quartz; g.fillRect(5, 5, 2, 2); }
    else if (type === 'F') { g.fillStyle = INK.hema; g.fillRect(3, 5, 6, 1); }
  }
  function openCollection() {
    meta = loadMeta();
    const grid = el('card-grid');
    grid.innerHTML = '';
    const found = CARDS.filter((c) => meta.cards[c.id]).length;
    el('cards').querySelector('h2').textContent = 'Collection ' + found + '/' + CARDS.length;
    CARDS.forEach((card) => {
      const on = !!meta.cards[card.id];
      const d = document.createElement('div');
      d.className = 'card' + (on ? ' on' : ' locked');
      const cv = document.createElement('canvas');
      paintCardIcon(cv, card.id, !on);
      const h = document.createElement('h3');
      h.textContent = on ? card.title : '????';
      const p = document.createElement('p');
      p.textContent = on ? card.fact : 'Not found yet.';
      d.appendChild(cv); d.appendChild(h); d.appendChild(p);
      grid.appendChild(d);
    });
    el('cards').hidden = false;
    el('cover').hidden = true;
    el('dead').hidden = true;
  }
  function closeCollection() {
    el('cards').hidden = true;
    showCover();
  }

  function resize() {
    const stage = el('stage');
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const phone = window.matchMedia('(max-width:700px)').matches;
    const fit = Math.max(1, Math.floor(Math.min(w / IW, h / IH)));
    scale = phone ? Math.max(2, Math.min(fit, 4)) : Math.max(fit, 1);
    canvas.width = IW * scale;
    canvas.height = IH * scale;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    ctx.imageSmoothingEnabled = false;
    draw();
  }
  function maybeResize() {
    const key = (el('hud').hidden ? '0' : '1') + ':' + document.documentElement.clientHeight + 'x' + document.documentElement.clientWidth;
    if (key === layoutKey) return;
    layoutKey = key;
    resize();
  }

  /* ----- input: left/right only, hold repeats ----- */
  function setHold(dir) { holdDir = dir; }
  function clearHold(dir) { if (!dir || holdDir === dir) holdDir = 0; }

  document.addEventListener('keydown', (e) => {
    if (window.GameAudio) GameAudio.unlock();
    if (el('cards').hidden === false) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeCollection(); }
      return;
    }
    if (!state || state.phase === 'title') {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); startRun('play'); }
      return;
    }
    if (state.phase === 'dead') {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); setHold(-1); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); setHold(1); }
    else if (e.key === 'Escape') { e.preventDefault(); showCover(); }
    else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); if (window.GameAudio) GameAudio.toggleMusic(); ui(); }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') clearHold(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') clearHold(1);
  });

  function pointerDir(e) {
    const r = canvas.getBoundingClientRect();
    return (e.clientX < r.left + r.width / 2) ? -1 : 1;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (window.GameAudio) GameAudio.unlock();
    if (!state || state.phase === 'title') { startRun('play'); return; }
    if (state.phase === 'dead') { restart(); return; }
    if (state.phase !== 'play') return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    setHold(pointerDir(e));
  }, { passive: false });
  canvas.addEventListener('pointermove', (e) => {
    if (!state || state.phase !== 'play' || !holdDir) return;
    setHold(pointerDir(e));
  });
  const endPtr = (e) => { if (e && e.preventDefault) e.preventDefault(); clearHold(); };
  canvas.addEventListener('pointerup', endPtr, { passive: false });
  canvas.addEventListener('pointercancel', endPtr, { passive: false });
  canvas.addEventListener('lostpointercapture', endPtr);

  const stop = (ev) => { ev.preventDefault(); };
  const opts = { passive: false };
  ['touchstart', 'touchend', 'contextmenu', 'gesturestart', 'dblclick'].forEach((type) => {
    canvas.addEventListener(type, stop, opts);
  });
  document.addEventListener('gesturestart', stop, opts);

  el('btn-play').addEventListener('click', () => startRun('play'));
  el('btn-daily').addEventListener('click', () => startRun('daily'));
  el('btn-col').addEventListener('click', openCollection);
  el('btn-cards-back').addEventListener('click', closeCollection);
  el('btn-music').addEventListener('click', () => { if (window.GameAudio) { GameAudio.unlock(); GameAudio.toggleMusic(); } ui(); });
  el('btn-sfx').addEventListener('click', () => { if (window.GameAudio) { GameAudio.unlock(); GameAudio.toggleSfx(); } ui(); });
  el('cover').addEventListener('click', (e) => { if (e.target.closest('button')) return; });
  el('dead').addEventListener('click', restart);

  function loop(ts) {
    if (!last) last = ts;
    acc += ts - last;
    last = ts;
    if (acc > 200) acc = 200;
    let stepped = false;
    while (acc >= FRAME) {
      acc -= FRAME;
      if (state && state.phase === 'play') { tick(state, FRAME / 1000); stepped = true; }
      else if (state) { state.tick = (state.tick || 0) + 1; stepped = true; }
    }
    if (stepped) { ui(); draw(); }
    requestAnimationFrame(loop);
  }

  showCover();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
})();
