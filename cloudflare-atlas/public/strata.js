(() => {
  'use strict';

  const COLS = 10, ROWS = 20, HIDDEN = 2;
  const CELL = 8;
  const IW = 192, IH = 176;
  const FRAME = 1000 / 60;
  const BOARD_X = 52, BOARD_Y = 8;
  const STORE = 'atlasStrataV1';

  const COLORS = {
    I: { name: 'Azurite', ink: '#2B6CB0', dot: '#7EA6D6' },
    O: { name: 'Sulphur', ink: '#E2D44A', dot: '#F6F0A0' },
    T: { name: 'Malachite', ink: '#1C9B5A', dot: '#7ED9A4' },
    S: { name: 'Hematite', ink: '#C44536', dot: '#E0897C' },
    Z: { name: 'Chromite', ink: '#4A5C52', dot: '#8AA398' },
    J: { name: 'Galena', ink: '#8B919A', dot: '#D0D3D8' },
    L: { name: 'Quartz', ink: '#E8E6DE', dot: '#FFFFFF' },
    F: { name: 'Fault', ink: '#A8B0B8', dot: '#E8E6DE' }
  };

  const SHAPES = {
    I: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]]
    ],
    O: [
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]]
    ],
    T: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]]
    ],
    S: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]]
    ],
    Z: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]]
    ],
    J: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]]
    ],
    L: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]]
    ],
    F: [
      [[0, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1]],
      [[0, 0], [1, 0], [1, 1]],
      [[1, 0], [0, 1], [1, 1]]
    ]
  };

  const KICKS_JLSTZ = {
    '0-1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1-2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3-0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1-0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2-1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3-2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0-3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };
  const KICKS_I = {
    '0-1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1-2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2-3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3-0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '1-0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '2-1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '3-2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '0-3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const LINE_SCORE = [0, 100, 300, 500, 800];
  const GRAVITY = [48, 40, 32, 25, 20, 16, 12, 10, 8, 6, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1];
  const ERAS = [
    { name: 'Quaternary', from: 1, bg: '#181818' },
    { name: 'Neogene', from: 3, bg: '#181A18' },
    { name: 'Paleogene', from: 5, bg: '#181918' },
    { name: 'Cretaceous', from: 7, bg: '#171A1A' },
    { name: 'Jurassic', from: 9, bg: '#1A1917' },
    { name: 'Triassic', from: 11, bg: '#1A1818' },
    { name: 'Permian', from: 13, bg: '#1A1817' },
    { name: 'Carboniferous', from: 15, bg: '#161818' },
    { name: 'Devonian', from: 17, bg: '#16181A' },
    { name: 'Silurian', from: 19, bg: '#16191A' },
    { name: 'Ordovician', from: 21, bg: '#161918' },
    { name: 'Cambrian', from: 23, bg: '#181616' },
    { name: 'Precambrian', from: 25, bg: '#141414' }
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
  const ORE_COL = { Cu: '#1C9B5A', Au: '#E2D44A', U: '#2B6CB0', W: '#E8E6DE' };
  const ORE_BONUS = { Cu: 40, Au: 80, U: 60, W: 70 };

  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d', { alpha: false });
  const el = (id) => document.getElementById(id);

  let scale = 3, state, acc = 0, last = 0, raf = 0;
  let keys = Object.create(null);
  let das = { dir: 0, t: 0, started: false };
  let touch = null;
  let store = loadStore();

  function loadStore() {
    try {
      const o = (window.GameAudio ? GameAudio.readStore() : JSON.parse(localStorage.getItem(STORE) || '{}'));
      return {
        best: Number(o.best) || 0,
        daily: o.daily && typeof o.daily === 'object' ? o.daily : {},
        cards: o.cards && typeof o.cards === 'object' ? o.cards : {}
      };
    } catch (e) {
      return { best: 0, daily: {}, cards: {} };
    }
  }
  function saveStore() {
    if (window.GameAudio) {
      GameAudio.writeStore({ best: store.best, daily: store.daily, cards: store.cards });
    } else {
      try {
        const o = JSON.parse(localStorage.getItem(STORE) || '{}');
        o.best = store.best;
        o.daily = store.daily;
        o.cards = store.cards;
        localStorage.setItem(STORE, JSON.stringify(o));
      } catch (err) {}
    }
  }
  function todayKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }
  function todayBest() {
    const d = todayKey();
    return (store.daily && store.daily.date === d) ? (Number(store.daily.best) || 0) : 0;
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
  function hashDate(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function eraFor(level) {
    let e = ERAS[0], idx = 0;
    for (let i = 0; i < ERAS.length; i++) if (level >= ERAS[i].from) { e = ERAS[i]; idx = i; }
    return e;
  }
  function eraIndex(level) {
    let idx = 0;
    for (let i = 0; i < ERAS.length; i++) if (level >= ERAS[i].from) idx = i;
    return idx;
  }
  function syncAudio(st) {
    if (window.GameAudio && st) GameAudio.setStage(eraIndex(st.level || 1), st.level || 1);
  }
  function unlockAudio() { if (window.GameAudio) GameAudio.unlock(); }
  function gravFor(level) {
    return GRAVITY[Math.min(GRAVITY.length, level) - 1] || 1;
  }

  function emptyBoard() {
    const b = [];
    for (let y = 0; y < ROWS + HIDDEN; y++) {
      b[y] = [];
      for (let x = 0; x < COLS; x++) b[y][x] = null;
    }
    return b;
  }

  function cellsOf(piece) {
    const sh = SHAPES[piece.type][piece.rot];
    const out = [];
    for (let i = 0; i < sh.length; i++) {
      out.push({ x: piece.x + sh[i][0], y: piece.y + sh[i][1], ore: piece.ores[i] || null });
    }
    return out;
  }
  function hits(board, piece, dx, dy, rot) {
    const sh = SHAPES[piece.type][rot];
    for (let i = 0; i < sh.length; i++) {
      const x = piece.x + sh[i][0] + dx;
      const y = piece.y + sh[i][1] + dy;
      if (x < 0 || x >= COLS || y >= ROWS + HIDDEN) return true;
      if (y >= 0 && board[y][x]) return true;
    }
    return false;
  }

  function rollOres(type, rnd) {
    const n = SHAPES[type][0].length;
    const ores = [];
    for (let i = 0; i < n; i++) {
      const r = rnd();
      if (r < 0.04) ores[i] = r < 0.012 ? 'Au' : r < 0.024 ? 'U' : r < 0.032 ? 'W' : 'Cu';
      else if ((type === 'T' || type === 'I') && r < 0.1) ores[i] = 'Cu';
      else ores[i] = null;
    }
    return ores;
  }

  function makePiece(type, rnd) {
    return { type, x: type === 'I' || type === 'F' ? 3 : 3, y: type === 'I' ? 0 : 0, rot: 0, ores: rollOres(type, rnd) };
  }

  function fillBag(st) {
    const bag = TYPES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(st.rnd() * (i + 1));
      const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
    }
    if (st.rnd() < 0.1) {
      const at = 1 + Math.floor(st.rnd() * bag.length);
      bag.splice(at, 0, 'F');
    }
    st.queue.push.apply(st.queue, bag);
  }
  function takeNext(st) {
    if (st.queue.length < 8) fillBag(st);
    return makePiece(st.queue.shift(), st.rnd);
  }
  function spawnIn(st) {
    st.cur = takeNext(st);
    const cells = cellsOf(st.cur);
    if (cells.every((c) => c.y < HIDDEN) && !hits(st.board, st.cur, 0, 1, st.cur.rot)) st.cur.y += 1;
    if (hits(st.board, st.cur, 0, 0, st.cur.rot)) {
      st.phase = 'dead';
      sfx('over');
    }
  }

  function fresh(mode) {
    const daily = mode === 'daily';
    const seed = daily ? hashDate(todayKey()) : (Math.random() * 0xFFFFFFFF) >>> 0;
    const st = {
      phase: 'play',
      mode,
      seed,
      rnd: mulberry(seed),
      board: emptyBoard(),
      queue: [],
      hold: null,
      canHold: true,
      cur: null,
      score: 0,
      lines: 0,
      level: 1,
      combo: -1,
      b2b: false,
      fall: 0,
      lock: 0,
      lockResets: 0,
      soft: false,
      tick: 0,
      shake: 0,
      sx: 0, sy: 0,
      bursts: [],
      flash: 0,
      toast: ''
    };
    fillBag(st);
    spawnIn(st);
    return st;
  }

  function ghostY(st) {
    let d = 0;
    while (!hits(st.board, st.cur, 0, d + 1, st.cur.rot)) d += 1;
    return st.cur.y + d;
  }

  function addScore(st, n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    st.score += n;
    if (Number.isFinite(st.score) && st.score > store.best) {
      store.best = st.score;
      saveStore();
    }
    if (st.mode === 'daily') {
      const d = todayKey();
      if (store.daily.date !== d || st.score > (Number(store.daily.best) || 0)) {
        store.daily = { date: d, best: st.score };
        saveStore();
      }
    }
  }

  function unlock(id) {
    if (!id || store.cards[id]) return;
    store.cards[id] = true;
    saveStore();
  }

  function sfx(kind) {
    if (window.GameAudio) GameAudio.sfx(kind);
  }

  function burstAt(st, x, y, color) {
    const px = BOARD_X + x * CELL + 3;
    const py = BOARD_Y + (y - HIDDEN) * CELL + 3;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (st.tick % 3);
      st.bursts.push({
        x: px, y: py,
        vx: Math.round(Math.cos(a) * 2),
        vy: Math.round(Math.sin(a) * 2) - 1,
        life: 6 + (i % 3),
        color
      });
    }
  }

  function applyFault(st) {
    const dir = st.rnd() < 0.5 ? -1 : 1;
    const n = 1 + (st.rnd() < 0.4 ? 1 : 0);
    const used = {};
    for (let k = 0; k < n; k++) {
      let y = HIDDEN + Math.floor(st.rnd() * ROWS);
      let guard = 0;
      while ((used[y] || !st.board[y].some(Boolean)) && guard++ < 24) {
        y = HIDDEN + Math.floor(st.rnd() * ROWS);
      }
      used[y] = true;
      const row = st.board[y].slice();
      const next = [];
      for (let x = 0; x < COLS; x++) next[x] = row[(x - dir + COLS) % COLS];
      st.board[y] = next;
    }
    st.shake = 5;
    sfx('fault');
    unlock('F');
  }

  function clearLines(st) {
    const full = [];
    let ores = 0;
    let oreScore = 0;
    for (let y = 0; y < ROWS + HIDDEN; y++) {
      if (st.board[y].every(Boolean)) {
        full.push(y);
        for (let x = 0; x < COLS; x++) {
          const c = st.board[y][x];
          burstAt(st, x, y, (c && COLORS[c.type] && COLORS[c.type].ink) || '#E8E6DE');
          if (c && c.ore) {
            ores += 1;
            oreScore += ORE_BONUS[c.ore] || 40;
            unlock(c.ore === 'Cu' ? 'T' : c.ore);
          }
          if (c) unlock(c.type);
        }
      }
    }
    if (!full.length) {
      st.combo = -1;
      return 0;
    }
    const keep = st.board.filter((_, y) => full.indexOf(y) < 0);
    const add = [];
    for (let i = 0; i < full.length; i++) {
      const row = [];
      for (let x = 0; x < COLS; x++) row[x] = null;
      add.push(row);
    }
    st.board = add.concat(keep);
    const n = full.length;
    st.lines += n;
    const newLv = 1 + Math.floor(st.lines / 8);
    if (newLv !== st.level) { st.level = newLv; syncAudio(st); }
    st.combo += 1;
    const b2bNow = n >= 4;
    const base = n >= 4 ? 800 + (n - 4) * 400 : LINE_SCORE[n] || 0;
    let pts = base * st.level;
    if (b2bNow && st.b2b) pts = Math.floor(pts * 1.5);
    if (st.combo > 0) pts += 50 * st.combo * st.level;
    pts += oreScore * st.level;
    addScore(st, pts);
    st.b2b = b2bNow ? true : (n > 0 && n < 4 ? false : st.b2b);
    st.shake = n >= 4 ? 6 : n >= 2 || st.combo > 0 ? 4 : 3;
    st.flash = n >= 4 ? 3 : 2;
    sfx(n >= 4 ? 'tetris' : 'line');
    return n;
  }

  function lockPiece(st) {
    const cells = cellsOf(st.cur);
    let topOut = true;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.y < 0) continue;
      if (c.y < ROWS + HIDDEN && c.x >= 0 && c.x < COLS) {
        st.board[c.y][c.x] = { type: st.cur.type, ore: c.ore || null };
        if (c.y >= HIDDEN) topOut = false;
      }
      unlock(st.cur.type);
    }
    if (st.cur.type === 'F') applyFault(st);
    clearLines(st);
    st.canHold = true;
    st.lock = 0;
    st.lockResets = 0;
    if (topOut && cells.every((c) => c.y < HIDDEN)) {
      st.phase = 'dead';
      sfx('over');
      addScore(st, 0);
      return;
    }
    spawnIn(st);
    if (st.phase === 'dead') addScore(st, 0);
  }

  function tryMove(st, dx, dy) {
    if (hits(st.board, st.cur, dx, dy, st.cur.rot)) return false;
    st.cur.x += dx;
    st.cur.y += dy;
    if (dy === 0) {
      st.lock = 0;
      if (st.lockResets < 15) st.lockResets += 1;
    }
    return true;
  }
  function tryRot(st, dir) {
    const from = st.cur.rot;
    const to = (from + dir + 4) % 4;
    if (st.cur.type === 'O') {
      st.cur.rot = to;
      sfx('rot');
      return true;
    }
    const key = from + '-' + to;
    const table = st.cur.type === 'I' ? KICKS_I : KICKS_JLSTZ;
    const kicks = (st.cur.type === 'F' ? KICKS_JLSTZ[key] : table[key]) || [[0, 0]];
    for (let i = 0; i < kicks.length; i++) {
      const kx = kicks[i][0];
      const ky = -kicks[i][1];
      if (!hits(st.board, st.cur, kx, ky, to)) {
        st.cur.x += kx;
        st.cur.y += ky;
        st.cur.rot = to;
        st.lock = 0;
        if (st.lockResets < 15) st.lockResets += 1;
        sfx('rot');
        return true;
      }
    }
    return false;
  }
  function hardDrop(st) {
    let n = 0;
    while (tryMove(st, 0, 1)) n += 1;
    if (n) addScore(st, n * 2);
    sfx('drop');
    lockPiece(st);
  }
  function hold(st) {
    if (!st.canHold) return;
    const typ = st.cur.type;
    const ores = st.cur.ores;
    if (st.hold) {
      st.cur = makePiece(st.hold.type, st.rnd);
      const cells = cellsOf(st.cur);
      if (cells.every((c) => c.y < HIDDEN) && !hits(st.board, st.cur, 0, 1, st.cur.rot)) st.cur.y += 1;
    } else {
      st.cur = takeNext(st);
      const cells = cellsOf(st.cur);
      if (cells.every((c) => c.y < HIDDEN) && !hits(st.board, st.cur, 0, 1, st.cur.rot)) st.cur.y += 1;
    }
    st.hold = { type: typ, ores: ores };
    st.canHold = false;
    st.lock = 0;
    st.lockResets = 0;
    sfx('hold');
    if (hits(st.board, st.cur, 0, 0, st.cur.rot)) {
      st.phase = 'dead';
      sfx('over');
    }
  }

  function grounded(st) {
    return hits(st.board, st.cur, 0, 1, st.cur.rot);
  }

  function tick(st) {
    if (st.phase !== 'play') return;
    st.tick += 1;
    if (st.shake > 0) {
      st.shake -= 1;
      const mag = st.shake > 3 ? 3 : 2;
      st.sx = (st.tick % 2 ? mag : -mag);
      st.sy = (st.tick % 3 ? 1 : -1) * (st.shake > 2 ? 2 : 0);
    } else { st.sx = 0; st.sy = 0; }
    if (st.flash > 0) st.flash -= 1;
    for (let i = st.bursts.length - 1; i >= 0; i--) {
      const p = st.bursts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 1; p.life -= 1;
      if (p.life <= 0) st.bursts.splice(i, 1);
    }

    if (das.dir && keys[das.dir]) {
      das.t += 1;
      if (!das.started && das.t >= 10) { das.started = true; das.t = 0; }
      if (das.started && das.t >= 2) {
        das.t = 0;
        if (tryMove(st, das.dir === 'left' ? -1 : 1, 0)) sfx('move');
      }
    }

    if (grounded(st)) {
      st.lock += 1;
      const delay = 30;
      if (st.lock >= delay) {
        sfx('lock');
        lockPiece(st);
      }
    } else {
      const g = st.soft ? 2 : gravFor(st.level);
      st.fall += 1;
      if (st.fall >= g) {
        st.fall = 0;
        if (tryMove(st, 0, 1) && st.soft) addScore(st, 1);
      }
    }
  }

  /* ----- draw ----- */
  function patternDots(type, px, py) {
    const c = COLORS[type];
    if (!c) return;
    ctx.fillStyle = c.dot;
    const plot = (list, s) => {
      for (let i = 0; i < list.length; i++) ctx.fillRect(px + list[i][0], py + list[i][1], s || 1, s || 1);
    };
    if (type === 'I') { /* azurite regular grid */
      plot([[1, 1], [4, 1], [1, 4], [4, 4], [2, 2], [5, 5]], 1);
    } else if (type === 'O') { /* sulphur sparse */
      plot([[2, 1], [5, 2], [1, 5], [4, 4]], 1);
    } else if (type === 'T') { /* malachite bands */
      plot([[1, 1], [3, 1], [5, 1], [2, 3], [4, 3], [1, 5], [3, 5], [5, 5]], 1);
    } else if (type === 'S') { /* hematite clusters */
      plot([[1, 1], [2, 1], [1, 2], [5, 4], [4, 5], [5, 5]], 1);
    } else if (type === 'Z') { /* chromite dense */
      plot([[1, 1], [3, 1], [5, 1], [2, 2], [4, 2], [1, 3], [3, 3], [5, 3], [2, 5], [4, 5]], 1);
    } else if (type === 'J') { /* galena cubic */
      plot([[1, 1], [4, 1], [1, 4], [4, 4]], 2);
    } else if (type === 'L') { /* quartz sparse bright */
      plot([[2, 2], [5, 1], [1, 5]], 1);
    } else if (type === 'F') {
      ctx.fillStyle = '#C44536';
      plot([[0, 3], [1, 3], [2, 4], [3, 4], [4, 5], [5, 5], [6, 6]], 1);
      ctx.fillStyle = c.dot;
      plot([[2, 1], [5, 2]], 1);
    }
  }

  function drawCell(px, py, type, ore, ghost) {
    if (ghost) {
      ctx.fillStyle = COLORS[type] ? COLORS[type].ink : '#8B919A';
      ctx.fillRect(px, py, CELL, 1);
      ctx.fillRect(px, py, 1, CELL);
      ctx.fillRect(px + CELL - 1, py, 1, CELL);
      ctx.fillRect(px, py + CELL - 1, CELL, 1);
      return;
    }
    const c = COLORS[type] || COLORS.J;
    ctx.fillStyle = c.ink;
    ctx.fillRect(px, py, CELL, CELL);
    ctx.fillStyle = state ? eraFor(state.level).bg : '#181818';
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    patternDots(type, px, py);
    if (ore) {
      const on = !state || state.tick % 2 === 0;
      ctx.fillStyle = on ? (ORE_COL[ore] || '#E8E6DE') : c.ink;
      ctx.fillRect(px + 3, py + 3, 2, 2);
    }
  }

  function drawMini(px, py, type, ores, sc) {
    const sh = SHAPES[type][0];
    let minX = 9, minY = 9, maxX = 0, maxY = 0;
    for (let i = 0; i < sh.length; i++) {
      minX = Math.min(minX, sh[i][0]); minY = Math.min(minY, sh[i][1]);
      maxX = Math.max(maxX, sh[i][0]); maxY = Math.max(maxY, sh[i][1]);
    }
    const w = (maxX - minX + 1) * CELL;
    const h = (maxY - minY + 1) * CELL;
    const ox = px + Math.floor(((sc || 32) - w) / 2);
    const oy = py + Math.floor(((sc || 32) - h) / 2);
    for (let i = 0; i < sh.length; i++) {
      drawCell(ox + (sh[i][0] - minX) * CELL, oy + (sh[i][1] - minY) * CELL, type, ores && ores[i], false);
    }
  }

  function drawBox(x, y, w, h, color) {
    ctx.fillStyle = color || '#3A3A3A';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillRect(x, y + h - 1, w, 1);
  }

  function draw() {
    const era = state ? eraFor(state.level) : ERAS[0];
    const ox = (state && state.sx) || 0;
    const oy = (state && state.sy) || 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = era.bg;
    ctx.fillRect(0, 0, IW, IH);
    ctx.fillStyle = 'rgba(180,180,180,0.14)';
    for (let y = 0; y < IH; y += 2) {
      for (let x = 0; x < IW; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    if (!state || state.phase === 'title') return;

    ctx.save();
    ctx.translate(ox, oy);

    drawBox(BOARD_X - 1, BOARD_Y - 1, COLS * CELL + 2, ROWS * CELL + 2, '#8B919A');
    ctx.fillStyle = '#121212';
    ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    ctx.fillStyle = 'rgba(180,180,180,0.08)';
    for (let y = BOARD_Y; y < BOARD_Y + ROWS * CELL; y += 2) {
      for (let x = BOARD_X; x < BOARD_X + COLS * CELL; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    /* locked cells */
    for (let y = HIDDEN; y < ROWS + HIDDEN; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = state.board[y][x];
        if (!c) continue;
        drawCell(BOARD_X + x * CELL, BOARD_Y + (y - HIDDEN) * CELL, c.type, c.ore, false);
      }
    }
    if (state.phase === 'play' && state.cur) {
      const gy = ghostY(state);
      const sh = SHAPES[state.cur.type][state.cur.rot];
      if (gy !== state.cur.y) {
        for (let i = 0; i < sh.length; i++) {
          const x = state.cur.x + sh[i][0];
          const y = gy + sh[i][1];
          if (y >= HIDDEN) drawCell(BOARD_X + x * CELL, BOARD_Y + (y - HIDDEN) * CELL, state.cur.type, null, true);
        }
      }
      for (let i = 0; i < sh.length; i++) {
        const x = state.cur.x + sh[i][0];
        const y = state.cur.y + sh[i][1];
        if (y >= HIDDEN) drawCell(BOARD_X + x * CELL, BOARD_Y + (y - HIDDEN) * CELL, state.cur.type, state.cur.ores[i], false);
      }
    }
    if (state.flash > 0) {
      ctx.fillStyle = 'rgba(232,230,222,0.12)';
      ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    }
    for (let i = 0; i < state.bursts.length; i++) {
      const p = state.bursts[i];
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
    }

    /* hold / next */
    ctx.fillStyle = '#7A7F88';
    drawBox(12, 16, 36, 36, '#3A3A3A');
    if (state.hold) drawMini(14, 18, state.hold.type, null, 32);
    drawBox(140, 16, 36, 108, '#3A3A3A');
    for (let i = 0; i < 3; i++) {
      const t = state.queue[i];
      if (t) drawMini(142, 18 + i * 36, t, null, 32);
    }

    ctx.restore();
  }

  let layoutKey = '';
  function maybeResize() {
    const key = (el('hud').hidden ? '0' : '1') + ':' + (el('shop') && !el('shop').hidden ? '1' : '0') + ':' + document.documentElement.clientHeight + 'x' + document.documentElement.clientWidth;
    if (key === layoutKey) return;
    layoutKey = key;
    resize();
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

  function comboText(st) {
    const bits = [];
    if (st.combo > 0) bits.push('x' + (st.combo + 1));
    if (st.b2b) bits.push('B2B');
    return bits.join(' ');
  }

  function ui() {
    const playing = state && (state.phase === 'play' || state.phase === 'dead');
    const inGame = state && state.phase === 'play';
    el('hud').hidden = !inGame;
    el('cover').hidden = !(state && state.phase === 'title') && !(state && state.phase === 'menu');
    if (state && state.phase === 'title') el('cover').hidden = false;
    el('dead').hidden = !(state && state.phase === 'dead');
    el('btn-restart').hidden = !inGame;
    el('btn-menu').hidden = !inGame;
    el('best-title').textContent = String(store.best);
    el('today-title').textContent = String(todayBest());
    el('best').textContent = String(store.best);
    if (inGame) {
      el('score').textContent = String(state.score);
      el('level').textContent = String(state.level);
      el('lines').textContent = String(state.lines);
      el('era').textContent = eraFor(state.level).name;
      el('combo').textContent = comboText(state);
    }
    if (state && state.phase === 'dead') {
      const parts = ['Score ' + state.score + '. Best ' + store.best + '.'];
      if (state.mode === 'daily') parts.push('Today ' + todayBest() + '.');
      el('endscore').textContent = parts.join(' ');
    }
    const musicOn = window.GameAudio ? GameAudio.musicOn() : true;
    const sfxOn = window.GameAudio ? GameAudio.sfxOn() : true;
    el('btn-music').textContent = musicOn ? 'Music' : 'Music off';
    el('btn-sfx').textContent = sfxOn ? 'SFX' : 'SFX off';
    el('btn-music').setAttribute('aria-pressed', musicOn ? 'false' : 'true');
    el('btn-sfx').setAttribute('aria-pressed', sfxOn ? 'false' : 'true');
    maybeResize();
  }

  function showCover() {
    state = { phase: 'title', level: 1, sx: 0, sy: 0, bursts: [], tick: 0 };
    ui();
    draw();
  }

  function startRun(mode) {
    unlockAudio();
    state = fresh(mode || 'play');
    das = { dir: 0, t: 0, started: false };
    syncAudio(state);
    ui();
    draw();
  }

  function restart() {
    if (!state || (state.phase !== 'play' && state.phase !== 'dead')) return;
    startRun(state.mode || 'play');
  }

  /* ----- collection ----- */
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
    const saved = ctx;
    /* reuse pattern by temp draw via local */
    const ink = COLORS[type] ? COLORS[type].ink : (ORE_COL[type] || '#E8E6DE');
    g.fillStyle = ink;
    g.fillRect(2, 2, 8, 8);
    g.fillStyle = '#181818';
    g.fillRect(3, 3, 6, 6);
    if (COLORS[type]) {
      const oldFill = CanvasRenderingContext2D.prototype.fillRect;
      /* draw pattern at offset using our helper on a proxy: manual dots */
    }
    /* simple unique mini pattern */
    g.fillStyle = COLORS[type] ? COLORS[type].dot : ink;
    if (type === 'Au') { g.fillStyle = '#E2D44A'; g.fillRect(5, 5, 2, 2); }
    else if (type === 'U') { g.fillStyle = '#2B6CB0'; g.fillRect(5, 5, 2, 2); }
    else if (type === 'W') { g.fillStyle = '#E8E6DE'; g.fillRect(5, 5, 2, 2); }
    else if (type === 'I') { g.fillRect(3, 3, 1, 1); g.fillRect(6, 3, 1, 1); g.fillRect(3, 6, 1, 1); g.fillRect(6, 6, 1, 1); }
    else if (type === 'O') { g.fillRect(4, 3, 1, 1); g.fillRect(7, 5, 1, 1); }
    else if (type === 'T') { g.fillRect(3, 3, 1, 1); g.fillRect(5, 3, 1, 1); g.fillRect(7, 3, 1, 1); g.fillRect(5, 6, 1, 1); }
    else if (type === 'S') { g.fillRect(3, 3, 2, 1); g.fillRect(6, 6, 2, 1); }
    else if (type === 'Z') { for (let i = 3; i < 9; i += 2) g.fillRect(i, i - 1, 1, 1); }
    else if (type === 'J') { g.fillRect(3, 3, 2, 2); g.fillRect(7, 7, 2, 2); }
    else if (type === 'L') { g.fillRect(4, 4, 1, 1); g.fillRect(7, 3, 1, 1); }
    else if (type === 'F') { g.fillStyle = '#C44536'; g.fillRect(3, 5, 6, 1); }
    void saved;
  }

  function openCollection() {
    const grid = el('card-grid');
    grid.innerHTML = '';
    const found = CARDS.filter((c) => store.cards[c.id]).length;
    el('cards').querySelector('h2').textContent = 'Collection ' + found + '/' + CARDS.length;
    CARDS.forEach((card) => {
      const on = !!store.cards[card.id];
      const d = document.createElement('div');
      d.className = 'card' + (on ? ' on' : ' locked');
      const cv = document.createElement('canvas');
      const typ = (card.id === 'Au' || card.id === 'U' || card.id === 'W') ? card.id : card.id;
      paintCardIcon(cv, typ, !on);
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
    if (!state || state.phase === 'title' || state.phase === 'menu') showCover();
    else ui();
  }

  /* ----- input ----- */
  function bindDir(dir, down) {
    if (down) {
      if (state && state.phase === 'play') {
        if (tryMove(state, dir === 'left' ? -1 : 1, 0)) sfx('move');
      }
      das.dir = dir; das.t = 0; das.started = false;
      keys[dir] = true;
    } else {
      keys[dir] = false;
      if (das.dir === dir) das = { dir: 0, t: 0, started: false };
    }
  }

  function handleAction(act, down) {
    if (state && state.phase === 'dead' && down) { restart(); return; }
    if (state && state.phase === 'title' && down) {
      if (act === 'rot' || act === 'drop' || act === 'soft') startRun('play');
      return;
    }
    if (!state || state.phase !== 'play') return;
    if (act === 'left') bindDir('left', down);
    else if (act === 'right') bindDir('right', down);
    else if (act === 'soft') {
      state.soft = down;
      keys.soft = down;
    } else if (!down) return;
    else if (act === 'rot') tryRot(state, 1);
    else if (act === 'rotccw') tryRot(state, -1);
    else if (act === 'drop') hardDrop(state);
    else if (act === 'hold') hold(state);
    ui();
    draw();
  }

  document.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') e.preventDefault();
      return;
    }
    unlockAudio();
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
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); handleAction('left', true); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); handleAction('right', true); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); handleAction('soft', true); }
    else if (k === 'ArrowUp' || k === 'x' || k === 'X' || k === 'w' || k === 'W') { e.preventDefault(); handleAction('rot', true); }
    else if (k === 'z' || k === 'Z' || k === 'Control') { e.preventDefault(); handleAction('rotccw', true); }
    else if (k === ' ') { e.preventDefault(); handleAction('drop', true); }
    else if (k === 'c' || k === 'C' || k === 'Shift') { e.preventDefault(); handleAction('hold', true); }
    else if (k === 'r' || k === 'R') { e.preventDefault(); restart(); }
    else if (k === 'm' || k === 'M') { e.preventDefault(); if (window.GameAudio) GameAudio.toggleMusic(); ui(); }
    else if (k === 'Escape') { e.preventDefault(); showCover(); }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') handleAction('left', false);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') handleAction('right', false);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') handleAction('soft', false);
  });

  (function bindPad() {
    const pad = el('pad');
    let holdAct = null, holdDelay = null, holdRepeat = null;
    const repeatable = { left: true, right: true, soft: true };
    function clearHold() {
      if (holdDelay) { clearTimeout(holdDelay); holdDelay = null; }
      if (holdRepeat) { clearInterval(holdRepeat); holdRepeat = null; }
      if (holdAct) { handleAction(holdAct, false); holdAct = null; }
    }
    pad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      e.preventDefault();
      unlockAudio();
      const act = btn.getAttribute('data-act');
      clearHold();
      holdAct = act;
      handleAction(act, true);
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      if (repeatable[act]) {
        holdDelay = setTimeout(() => {
          holdDelay = null;
          holdRepeat = setInterval(() => { if (holdAct) handleAction(holdAct, true); }, 120);
        }, 180);
      }
    }, { passive: false });
    const endHold = (e) => { if (e && e.preventDefault) e.preventDefault(); clearHold(); };
    pad.addEventListener('pointerup', endHold, { passive: false });
    pad.addEventListener('pointercancel', endHold, { passive: false });
    pad.addEventListener('lostpointercapture', endHold);
    const opts = { passive: false };
    const stop = (ev) => { ev.preventDefault(); };
    [pad, canvas].forEach((node) => {
      ['touchstart', 'touchend', 'contextmenu', 'gesturestart', 'dblclick'].forEach((type) => {
        node.addEventListener(type, stop, opts);
      });
    });
    document.addEventListener('gesturestart', stop, opts);
  })();

  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio();
    if (!state || state.phase === 'title') { startRun('play'); return; }
    if (state.phase === 'dead') { restart(); return; }
    if (state.phase !== 'play') return;
    touch = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, lastX: e.clientX };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!touch || !state || state.phase !== 'play') return;
    const dx = e.clientX - touch.lastX;
    const step = 24;
    if (dx >= step || dx <= -step) {
      const dir = dx > 0 ? 1 : -1;
      if (tryMove(state, dir, 0)) sfx('move');
      touch.lastX = e.clientX;
      touch.moved += 1;
      ui(); draw();
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!touch || !state) { touch = null; return; }
    if (state.phase !== 'play') { touch = null; return; }
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    const dt = performance.now() - touch.t;
    const moved = touch.moved;
    touch = null;
    if (moved) return;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) { tryRot(state, 1); ui(); draw(); return; }
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0) {
        if (dy > 48 && dt < 280) hardDrop(state);
        else {
          if (tryMove(state, 0, 1)) addScore(state, 1);
        }
      } else {
        hold(state);
      }
      ui(); draw();
    }
  });

  function onMusic() { unlockAudio(); if (window.GameAudio) GameAudio.toggleMusic(); ui(); }
  function onSfx() { unlockAudio(); if (window.GameAudio) GameAudio.toggleSfx(); ui(); }

  el('btn-play').addEventListener('click', () => startRun('play'));
  el('btn-daily').addEventListener('click', () => startRun('daily'));
  el('btn-col').addEventListener('click', openCollection);
  el('btn-cards-back').addEventListener('click', closeCollection);
  el('btn-music').addEventListener('click', onMusic);
  el('btn-sfx').addEventListener('click', onSfx);
  el('btn-restart').addEventListener('click', restart);
  el('btn-menu').addEventListener('click', showCover);
  el('cover').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
  });
  el('dead').addEventListener('click', restart);

  function loop(ts) {
    if (!last) last = ts;
    acc += ts - last;
    last = ts;
    if (acc > 200) acc = 200;
    let stepped = false;
    while (acc >= FRAME) {
      acc -= FRAME;
      if (state && state.phase === 'play') { tick(state); stepped = true; }
      else if (state) { state.tick = (state.tick || 0) + 1; stepped = true; }
    }
    if (stepped) { ui(); draw(); }
    raf = requestAnimationFrame(loop);
  }

  showCover();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
})();
