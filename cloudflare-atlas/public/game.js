(() => {
  'use strict';

  const BG = '#181818';
  const GRID = 'rgba(180,180,180,0.16)';
  const INK = {
    mala: '#1C9B5A',
    azur: '#2B6CB0',
    hema: '#C44536',
    sulph: '#E2D44A',
    quartz: '#E8E6DE',
    galena: '#8B919A',
    chrom: '#4A5C52',
  };

  function prep(c) {
    const ctx = c.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  function grid(ctx, w, h) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = GRID;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) ctx.fillRect(x, y, 1, 1);
    }
  }

  function cell(ctx, x, y, ink, dots, s) {
    s = s || 6;
    ctx.fillStyle = ink;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = BG;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = ink;
    for (let i = 0; i < dots.length; i++) {
      ctx.fillRect(x + dots[i][0], y + dots[i][1], 1, 1);
    }
  }

  function drawStrata(ctx, frame) {
    const W = 96, H = 64;
    grid(ctx, W, H);
    /* well */
    ctx.fillStyle = '#121212';
    ctx.fillRect(28, 6, 40, 52);
    ctx.fillStyle = '#8B919A';
    ctx.fillRect(27, 5, 42, 1);
    ctx.fillRect(27, 5, 1, 54);
    ctx.fillRect(68, 5, 1, 54);
    ctx.fillRect(27, 58, 42, 1);
    const stack = [
      [0, 6, INK.mala, [[1, 1], [3, 1], [2, 3]]],
      [1, 6, INK.azur, [[1, 1], [3, 3]]],
      [2, 6, INK.sulph, [[2, 1], [4, 3]]],
      [3, 6, INK.hema, [[1, 1], [2, 1], [4, 4]]],
      [4, 6, INK.quartz, [[2, 2]]],
      [5, 6, INK.galena, [[1, 1], [3, 3]]],
      [0, 5, INK.chrom, [[1, 2], [3, 1], [4, 3]]],
      [1, 5, INK.hema, [[1, 1], [3, 4]]],
      [3, 5, INK.mala, [[1, 1], [3, 1], [2, 3]]],
      [4, 5, INK.azur, [[1, 1], [3, 3]]],
      [5, 5, INK.sulph, [[2, 2]]]
    ];
    for (let i = 0; i < stack.length; i++) {
      const b = stack[i];
      cell(ctx, 28 + b[0] * 6, 10 + b[1] * 6, b[2], b[3]);
    }
    /* falling T, 2-frame step */
    const fy = 16 + (frame ? 4 : 0);
    const fx = 40;
    cell(ctx, fx + 6, fy, INK.mala, [[1, 1], [3, 1], [2, 3]]);
    cell(ctx, fx, fy + 6, INK.mala, [[1, 1], [3, 1], [2, 3]]);
    cell(ctx, fx + 6, fy + 6, INK.mala, [[1, 1], [3, 1], [2, 3]]);
    cell(ctx, fx + 12, fy + 6, INK.mala, [[1, 1], [3, 1], [2, 3]]);
    /* ghost outline */
    const gy = 40;
    ctx.fillStyle = INK.mala;
    const outline = (x, y) => {
      ctx.fillRect(x, y, 6, 1);
      ctx.fillRect(x, y, 1, 6);
      ctx.fillRect(x + 5, y, 1, 6);
      ctx.fillRect(x, y + 5, 6, 1);
    };
    outline(fx + 6, gy);
    outline(fx, gy + 6);
    outline(fx + 6, gy + 6);
    outline(fx + 12, gy + 6);
  }

  function drawDriller(ctx, frame) {
    const W = 96, H = 64;
    grid(ctx, W, H);
    /* rock layers with mineral-ish greys and a copper fleck */
    function dots(x0, y0, w, h, step, color, ox, oy) {
      ctx.fillStyle = color;
      for (let y = y0 + (oy || 0); y < y0 + h; y += step) {
        for (let x = x0 + (ox || 0); x < x0 + w; x += step) ctx.fillRect(x, y, 1, 1);
      }
    }
    /* soil / sandstone / shale bands */
    dots(0, 0, W, 16, 4, '#7a7a7a', 1, 1);
    dots(0, 16, W, 16, 6, '#8B919A', 2, 2);
    dots(0, 32, W, 16, 3, '#6e6e6e', 0, 0);
    /* tighter shale lines */
    ctx.fillStyle = '#9a9a9a';
    for (let y = 34; y < 48; y += 4) {
      for (let x = (y % 8); x < W; x += 4) ctx.fillRect(x, y, 1, 1);
    }
    dots(0, 48, W, 16, 2, '#4a4a4a', 1, 0);
    /* shaft */
    ctx.fillStyle = BG;
    ctx.fillRect(44, 0, 8, 40);
    ctx.fillStyle = GRID;
    for (let y = 0; y < 40; y += 2) {
      for (let x = 44; x < 52; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    /* ore flecks */
    ctx.fillStyle = INK.sulph;
    ctx.fillRect(20, 22, 2, 2);
    ctx.fillRect(70, 28, 2, 2);
    ctx.fillStyle = INK.mala;
    ctx.fillRect(28, 40, 2, 2);
    if (frame === 0) {
      ctx.fillStyle = INK.quartz;
      ctx.fillRect(22, 20, 1, 1);
    }
    /* malachite drill-bot, sulphur bit, 2-frame (matches the game) */
    const sx = 42, sy = 28 + (frame ? 1 : 0);
    ctx.fillStyle = INK.mala;
    ctx.fillRect(sx + 4, sy, 8, 2);
    ctx.fillRect(sx + 2, sy + 2, 12, 6);
    ctx.fillRect(sx + 4, sy + 8, 8, 2);
    ctx.fillStyle = INK.azur;
    ctx.fillRect(sx + 2, sy + 2, 2, 6);
    ctx.fillRect(sx + 12, sy + 2, 2, 6);
    ctx.fillStyle = INK.quartz;
    ctx.fillRect(sx + 4, sy + 4, 2, 2);
    ctx.fillRect(sx + 10, sy + 4, 2, 2);
    ctx.fillStyle = INK.sulph;
    ctx.fillRect(sx + 6, sy + 10, 4, 2);
    ctx.fillRect(sx + 8, sy + 12 + (frame ? 2 : 0), 2, 2);
  }

  const cs = document.getElementById('prev-strata');
  const cd = document.getElementById('prev-driller');
  const xs = prep(cs);
  const xd = prep(cd);
  let frame = 0;
  function layout() {
    const stage = document.getElementById('stage');
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const phone = window.matchMedia('(max-width:700px)').matches;
    const picks = document.querySelector('.picks');
    const card = document.querySelector('.pick');
    const ps = getComputedStyle(picks);
    const csx = getComputedStyle(card);
    const padX = parseFloat(ps.paddingLeft) + parseFloat(ps.paddingRight);
    const gap = parseFloat(ps.columnGap || ps.gap) || 16;
    const cPad = parseFloat(csx.paddingLeft) + parseFloat(csx.paddingRight);
    const cBor = parseFloat(csx.borderLeftWidth) + parseFloat(csx.borderRightWidth);
    const nameH = 64;
    let s;
    if (phone) {
      const cardH = Math.floor((h - 24) / 2);
      s = Math.max(2, Math.min(3, Math.floor((w - padX - cPad - cBor) / 96), Math.floor((cardH - nameH) / 64)));
    } else {
      const inner = w - padX - gap;
      const per = Math.floor(inner / 2) - cPad - cBor;
      s = Math.max(3, Math.min(Math.floor(per / 96), Math.floor((h - nameH) / 64)));
    }
    [cs, cd].forEach((c) => {
      c.style.width = (96 * s) + 'px';
      c.style.height = (64 * s) + 'px';
    });
  }
  function tick() {
    drawStrata(xs, frame);
    drawDriller(xd, frame);
    frame = frame ? 0 : 1;
  }
  layout();
  tick();
  window.addEventListener('resize', layout);
  (function guardPicker() {
    const opts = { passive: false };
    const stop = (e) => { e.preventDefault(); };
    const root = document.getElementById('stage');
    ['touchstart', 'contextmenu', 'gesturestart', 'dblclick'].forEach((type) => {
      root.addEventListener(type, (e) => {
        if (type === 'touchstart') return; /* allow tap navigation */
        e.preventDefault();
      }, opts);
    });
    document.addEventListener('gesturestart', stop, opts);
    document.addEventListener('dblclick', stop, opts);
  })();
  document.fonts.ready.then(layout);
  setInterval(tick, 240);
})();
