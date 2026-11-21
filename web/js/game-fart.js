/* "Full fart" – a retro top-down runner. The ghost train races up five parallel tracks while the world scrolls
   towards it; slide left/right (arrow keys on a computer) to change track. Avoid trees, rocks, moose and oncoming
   trains; drive over passengers for points; leaves are slippery; green signals give full speed and double points,
   red ones brake. Everything keeps accelerating. Loaded only when opened, no network, high score in this browser. */

const LANES = 5;
const BEST_KEY = 'innstilt.game.best.fart';
const MAX_LIVES = 5;               /* the train is its carriages (a multiple unit, no engine): 3 at the start, up to 5 */
const HEAD_Y = 0.56;               /* the front carriage's top, as a share of the board height */
const THEMES = [   /* a season per kilometre, as in Sporarbeid */
  { key: 'summer', bg: '#1f5130', bed: '#6f6a5c', rail: '#dfe7e3', specks: ['#f5c400', '#ffffff', '#e84a5f'] },
  { key: 'autumn', bg: '#4a3a22', bed: '#7a7060', rail: '#e3ddd2', specks: ['#d9822b', '#b5521b', '#e0b040'] },
  { key: 'winter', bg: '#9fbccb', bed: '#8e9aa2', rail: '#4b5560', specks: ['#ffffff'] },
  { key: 'night', bg: '#0d1b2e', bed: '#3c4656', rail: '#c9d3df', specks: ['#f5f2c0', '#ffffff'] },
];
const C = { mint: '#f2faf5', stripe: '#2fa36b', win: '#0e3a30', ink: '#0b0b0c', yellow: '#f5c400', sleeper: '#7a5a3a',
  tree: '#2b7a3d', tree2: '#1f5c2d', trunk: '#6b4a2a', rock: '#8a958f', rock2: '#6c7671', leaf: '#d9822b', leaf2: '#8a4512',
  moose: '#7a4a26', antler: '#e2c898', go: '#3fe08a', stop: '#ff3b2f', other: '#9aa5ad', red: '#ff6b57' };

const TXT = {
  no: {
    title: 'Full fart', intro: 'Bytt spor og kjør så langt du kan. Farten øker hele tiden – kjør utenom det som står i veien.',
    start: 'Start', resume: 'Fortsett', again: 'Spill igjen', back: 'Tilbake til turene', other: 'Prøv et annet spill',
    paused: 'Pause', help: 'Hvordan spiller jeg?', keys: 'Piltaster eller A/D · P eller mellomrom = pause', pad: { pause: 'Pause' },
    points: 'Poeng', lives: 'Togsett igjen', speed: '{v} km/t',
    tree: 'Tre over sporet!', rock: 'Stein på sporet!', moose: 'Elg på sporet!', train: 'Møtende tog!',
    green: 'Grønt signal – full fart!', red: 'Rødt signal – toget bremser', leaf: 'Løv på skinnene – glatt!', spare: 'Ekstra vogn! 🚆', station: '+{n} passasjerer',
    season: '{km} km · {s}', seasons: { summer: 'Sommer', autumn: 'Høst', winter: 'Vinter', night: 'Natt' },
    overTitle: 'Toget er innstilt', overText: 'Du kom {km} km.', result: '{n} poeng.', newBest: 'Ny rekord!', best: 'Rekord: {n}',
    rules: ['↔️ Sveip til venstre eller høyre for å bytte spor – jo lenger du sveiper, jo flere spor (piltaster eller A/D på datamaskin).',
      '🌲 Kjør utenom trær, steiner, elg (fra 1 km) og møtende tog (fra 2 km, varslet med ⚠). Treffer du dem, mister toget en vogn, og farten går litt ned. Toget starter med 3 vogner – når den siste er borte, er det slutt.',
      '🚉 Passasjerene venter på perronger mellom sporene. Kjør forbi på et spor ved siden av perrongen, så går de på: 10 poeng hver. Løv kan du kjøre over, men det er glatt: toget mister litt fart.',
      '🟢 Grønt signal: full fart i noen sekunder og dobbelt poeng. 🔴 Rødt signal: toget bremser en stund.',
      '📈 Farten øker hele tiden. Poeng: hver 10. meter, og 10 per passasjer. 🚆 Reservevogna med + gir en vogn til (opptil 5).'],
  },
  en: {
    title: 'Full fart', intro: 'Change tracks and get as far as you can. The speed keeps rising – steer around what\'s in the way.',
    start: 'Start', resume: 'Resume', again: 'Play again', back: 'Back to trips', other: 'Try another game',
    paused: 'Paused', help: 'How do I play?', keys: 'Arrow keys or A/D · P or Space = pause', pad: { pause: 'Pause' },
    points: 'Points', lives: 'Train sets left', speed: '{v} km/h',
    tree: 'Tree on the line!', rock: 'Rock on the line!', moose: 'Moose on the line!', train: 'Oncoming train!',
    green: 'Green signal – full speed!', red: 'Red signal – braking', leaf: 'Leaves on the line – slippery!', spare: 'Extra carriage! 🚆', station: '+{n} passengers',
    season: '{km} km · {s}', seasons: { summer: 'Summer', autumn: 'Autumn', winter: 'Winter', night: 'Night' },
    overTitle: 'Train cancelled', overText: 'You got {km} km.', result: '{n} points.', newBest: 'New record!', best: 'Record: {n}',
    rules: ['↔️ Swipe left or right to change track – the longer the swipe, the more tracks (arrow keys or A/D on a computer).',
      '🌲 Steer around trees, rocks, moose (from 1 km) and oncoming trains (from 2 km, warned with ⚠). Hit one and the train loses a carriage, and the speed drops a little. The train starts with 3 carriages – when the last one is gone, it\'s over.',
      '🚉 Passengers wait on platforms between the tracks. Drive past on a track next to the platform and they get on: 10 points each. You can drive over leaves, but they are slippery: the train loses some speed.',
      '🟢 Green signal: full speed for a few seconds and double points. 🔴 Red signal: the train brakes for a while.',
      '📈 The speed keeps rising. Points: every 10 metres, and 10 per passenger. 🚆 The spare carriage with + adds a carriage (up to 5).'],
  },
};

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode */ } };
const rnd = n => Math.floor(Math.random() * n);
const AVOID = new Set(['tree', 'rock', 'moose', 'train']);

/** Starts the game inside `root`. Returns a function that stops it and removes every listener. */
export function start(root, { lang = 'no', back = () => {}, other = null } = {}) {
  const T = TXT[lang === 'en' ? 'en' : 'no'];
  const touch = matchMedia('(pointer: coarse)').matches;
  root.innerHTML = `
    <div class="game">
      <div class="g-top">
        <span class="g-score" title="${T.points}">⭐ <b>0</b> <small class="g-lvl"></small></span>
        <span class="g-clock"><b>0 km</b><small class="g-speed"></small></span>
        <span class="g-spacer"></span>
      </div>
      <div class="g-board g-tall">
        <canvas aria-label="${T.title}"></canvas>
        <div class="g-toast" hidden></div>
        <div class="g-msg" hidden></div>
      </div>
      <div class="g-row">
        <button type="button" class="g-pp" data-act="pause" aria-label="${T.pad.pause}">⏸</button>
        ${touch ? '<span></span>' : `<span class="muted small">${T.keys}</span>`}
        <button type="button" class="helpbtn" data-act="help" aria-label="${T.help}">?</button>
      </div>
    </div>`;
  const q = s => root.querySelector(s);
  const cv = q('canvas'), ctx = cv.getContext('2d'), board = q('.g-board'), msg = q('.g-msg'), toastEl = q('.g-toast');
  const scoreEl = q('.g-score b'), distEl = q('.g-clock b'), speedEl = q('.g-speed'), ppBtn = q('.g-pp');

  let best = readBest();
  let g = null;              /* the current run */
  let mode = 'intro';        /* intro | run | pause | over */
  let raf = 0, last = 0, toastTimer = 0, toastAt = 0, flashUntil = 0;

  /* ------------------------------------------------------------ rules */

  function newGame() {
    g = { t: 0, dist: 0, pace: 1, score: 0, pax: 0, lives: 3, lane: 2, x: 2, objs: [], nextRow: 0.6, specks: [],
      boostUntil: 0, redUntil: 0, slipUntil: 0, safeUntil: 0, season: 0, nextSpare: 25000 };
    g.specks = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random(), a: Math.random() * 3 }));
    hud();
    msg.hidden = true;
    last = performance.now();
    setMode('run');
  }

  /** Base speed in board heights per second: starts at 0.25 (≈ 90 km/h), rises with time, capped at 3 ×. */
  const speed = () => {
    let v = 0.25 * g.pace;
    if (g.t < g.boostUntil) v *= 1.5;
    if (g.t < g.redUntil) v *= 0.55;
    if (g.t < g.slipUntil) v *= 0.8;
    return v;
  };
  const kmh = () => Math.round(speed() * 100 * 3.6);   /* one board height = 100 m */

  function steer(d) {
    if (mode !== 'run') return;
    g.lane = Math.max(0, Math.min(LANES - 1, g.lane + d));
  }

  /** A new row of things at the top: never more than three lanes blocked, so there is always a way through. */
  function spawnRow() {
    const lanes = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
    const blocked = 1 + rnd(Math.min(3, 1 + Math.floor(g.dist / 600)));
    const y = -0.12;
    const kinds = ['tree', 'rock', 'rock', 'tree'];
    for (let i = 0; i < blocked; i++) g.objs.push({ kind: kinds[rnd(kinds.length)], lane: lanes[i], y, h: 0.08 });
    const free = lanes.slice(blocked);
    const extra = Math.random();
    /* a platform between two tracks (edge 1–4), with people waiting; it blocks nothing */
    if (extra < 0.4) g.objs.push({ kind: 'station', edge: 1 + rnd(LANES - 1), lane: -9, y: y - 0.1, h: 0.2, n: 2 + rnd(4) });
    if (free.length && Math.random() < 0.25) g.objs.push({ kind: 'leaf', lane: free.pop(), y, h: 0.07 });
    if (free.length && Math.random() < 0.12) g.objs.push({ kind: Math.random() < 0.5 ? 'go' : 'stop', lane: free.pop(), y, h: 0.08 });
    if (free.length && g.lives < MAX_LIVES && g.t > g.nextSpare) {
      g.objs.push({ kind: 'spare', lane: free.pop(), y, h: 0.08 });
      g.nextSpare = g.t + 25000 + Math.random() * 15000;
    }
    if (g.dist > 1000 && Math.random() < 0.12) {   /* a moose wanders across */
      const from = Math.random() < 0.5 ? 0 : LANES - 1;
      g.objs.push({ kind: 'moose', lane: from, lf: from, dir: from === 0 ? 1 : -1, y: y - 0.15, h: 0.08 });
    }
    if (g.dist > 2000 && Math.random() < 0.1) {   /* an oncoming train, faster than everything else */
      g.objs.push({ kind: 'train', lane: rnd(LANES), y: -0.6, h: 0.28, warn: true });
    }
  }

  /* a crash costs a carriage; when the last one is gone, the run is over */
  function crash(kind) {
    toast(T[kind]);
    g.lives--;
    if (g.lives <= 0) { flashUntil = performance.now() + 350; hud(); return over(); }
    flashUntil = performance.now() + 350;
    g.safeUntil = g.t + 1500;                 /* a moment to recover (the train blinks) */
    g.pace = Math.max(1, g.pace * 0.8);      /* and a little slower again */
    hud();
  }

  function over() {
    const record = g.score > best;
    if (record) { best = g.score; saveBest(best); }
    const km = (g.dist / 1000).toFixed(1).replace('.', lang === 'en' ? '.' : ',');
    show(T.overTitle, `${fill(T.overText, { km })} ${fill(T.result, { n: g.score })}${record && g.score ? ` <b>${T.newBest}</b>` : ` ${fill(T.best, { n: best })}`}`,
      [[T.again, newGame, true], [T.back, back]]);
    setMode('over');
  }

  function update(dt) {
    if (mode !== 'run') return;
    g.t += dt;
    g.pace = Math.min(3, g.pace + dt / 1000 * 0.012);   /* everything keeps accelerating */
    const v = speed(), dy = v * dt / 1000;
    g.dist += dy * 100;
    g.score = Math.floor(g.dist / 10) + g.pax * 10;
    g.x += (g.lane - g.x) * Math.min(1, dt / 70);       /* slide smoothly to the chosen track */
    /* seasons per kilometre */
    const season = Math.floor(g.dist / 1000);
    if (season !== g.season) {
      g.season = season;
      toast(fill(T.season, { km: season, s: T.seasons[THEMES[season % THEMES.length].key] }));
    }
    g.nextRow -= dy;
    if (g.nextRow <= 0) { spawnRow(); g.nextRow = 0.18 + Math.random() * 0.14; }
    for (const o of g.objs) {
      o.y += o.kind === 'train' ? dy * 2.2 : dy;
      if (o.kind === 'moose') { o.lf += o.dir * dt / 1000 * 0.9; o.lane = Math.round(o.lf); if (o.lf < -0.6 || o.lf > LANES - 0.4) o.gone = true; }
      if (o.kind === 'train' && o.y > -0.2) o.warn = false;
    }
    g.objs = g.objs.filter(o => !o.gone && o.y < 1.1);
    /* collisions: the train's front half sits at 72–84 % of the board height */
    const lane = Math.round(g.x), top = HEAD_Y, bottom = HEAD_Y + 0.55 * (cv.width / LANES) / cv.height;   /* the front carriage */
    for (const o of g.objs) {
      if (o.kind === 'station' && !o.hit && (lane === o.edge - 1 || lane === o.edge) && o.y + o.h >= top && o.y <= bottom) {
        o.hit = true;                                         /* driving past: they get on (the platform stays) */
        const n = o.n * (g.t < g.boostUntil ? 2 : 1);
        g.pax += n; toast(fill(T.station, { n }));
        continue;
      }
      if (o.hit || o.lane !== lane || o.y + o.h < top || o.y > bottom) continue;
      if (AVOID.has(o.kind)) {
        if (g.t < g.safeUntil) continue;
        o.hit = true; o.gone = o.kind !== 'train';
        crash(o.kind);
        if (mode !== 'run') return;
      } else {
        o.hit = true; o.gone = true;
        const mult = g.t < g.boostUntil ? 2 : 1;
        if (o.kind === 'leaf') { g.slipUntil = g.t + 1500; toast(T.leaf); }
        else if (o.kind === 'go') { g.boostUntil = g.t + 3500; g.redUntil = 0; toast(T.green); }
        else if (o.kind === 'stop') { g.redUntil = g.t + 3000; g.boostUntil = 0; toast(T.red); }
        else if (o.kind === 'spare' && g.lives < MAX_LIVES) { g.lives++; toast(T.spare); }
      }
    }
    hud();
  }

  /* ------------------------------------------------------------ screen */

  function hud() {
    if (!g) return;
    scoreEl.textContent = g.score;
    distEl.textContent = `${(g.dist / 1000).toFixed(2).replace('.', lang === 'en' ? '.' : ',')} km`;
    speedEl.textContent = fill(T.speed, { v: kmh() });
    speedEl.classList.toggle('fast', g.t < g.boostUntil);
  }

  function toast(text) {
    const now = performance.now();
    toastEl.textContent = !toastEl.hidden && now - toastAt < 300 ? `${toastEl.textContent} · ${text}` : text;
    toastAt = now; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 1500);
  }

  let lastShow = null, helpOpen = false, beforeHelp = null;
  function show(title, html, buttons, isHelp = false) {
    if (!isHelp) lastShow = [title, html, buttons];
    helpOpen = isHelp;
    msg.innerHTML = `<h2>${title}</h2><p>${html}</p><div class="g-btns">${buttons.map(([label], i) =>
      `<button type="button" data-b="${i}" class="${buttons[i][2] ? 'primary' : ''}">${label}</button>`).join('')}</div>`;
    msg.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => buttons[Number(b.dataset.b)][1]()));
    msg.hidden = false;
    msg.scrollTop = 0;
    msg.querySelector('.primary')?.focus({ preventScroll: true });
  }

  function setMode(m) {
    mode = m;
    if (m === 'run') msg.hidden = true;
    if (ppBtn) ppBtn.textContent = m === 'pause' ? '▶' : '⏸';
  }

  function pause() {
    if (mode !== 'run') return;
    setMode('pause');
    show(T.paused, '', [[T.resume, resume, true], [T.back, back]]);
  }
  function resume() { if (mode === 'pause') { last = performance.now(); setMode('run'); } }

  function help() {
    if (helpOpen && !msg.hidden) {
      helpOpen = false;
      if (beforeHelp === 'run') resume();
      else if (lastShow) show(...lastShow);
      else msg.hidden = true;
      return;
    }
    beforeHelp = mode;
    if (mode === 'run') setMode('pause');
    const rules = `</p><ul class="g-rules">${T.rules.map(r => `<li>${r}</li>`).join('')}</ul><p>`;
    if (mode === 'pause') show(T.help, rules, [[T.resume, resume, true], [T.back, back]], true);
    else show(T.help, rules, [[g ? T.again : T.start, newGame, true], [T.back, back]], true);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(board.clientWidth * dpr); cv.height = Math.round(board.clientHeight * dpr);
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw(now) {
    const W = cv.width, H = cv.height, lw = W / LANES;
    const th = THEMES[(g ? g.season : 0) % THEMES.length];
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    const scroll = g ? (g.dist / 100) * H : 0;          /* how far the ground has moved, in pixels */
    /* specks on the ground, scrolling */
    if (g) for (const sp of g.specks) {
      ctx.fillStyle = th.specks[Math.floor(sp.a * 10) % th.specks.length];
      const y = ((sp.y * H + scroll) % H + H) % H;
      ctx.beginPath(); ctx.arc(sp.x * W, y, lw * 0.03 * sp.r, 0, Math.PI * 2); ctx.fill();
    }
    /* five tracks: gravel bed, sleepers moving down, two rails */
    for (let l = 0; l < LANES; l++) {
      const cx = (l + 0.5) * lw;
      ctx.fillStyle = th.bed; ctx.globalAlpha = 0.6; ctx.fillRect(cx - lw * 0.32, 0, lw * 0.64, H); ctx.globalAlpha = 1;
      ctx.fillStyle = C.sleeper;
      const gap = lw * 0.32, off = scroll % gap;
      for (let y = -gap + off; y < H; y += gap) ctx.fillRect(cx - lw * 0.28, y, lw * 0.56, lw * 0.07);
      ctx.fillStyle = th.rail;
      ctx.fillRect(cx - lw * 0.17 - 1.5, 0, 3, H); ctx.fillRect(cx + lw * 0.17 - 1.5, 0, 3, H);
    }
    if (!g) return;
    for (const o of g.objs) drawObj(o, lw, H, now);
    /* the train: one carriage per train set left; the front one has the face */
    if (!(g.t < g.safeUntil && Math.floor(now / 120) % 2)) {
      const cx = (g.x + 0.5) * lw;
      for (let i = Math.max(1, g.lives) - 1; i >= 0; i--) car(cx, H * HEAD_Y + i * lw * 0.6, lw, i === 0);
    }
    if (g.t < g.boostUntil) {   /* speed lines */
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const x = ((i * 137 + now / 3) % W); ctx.beginPath(); ctx.moveTo(x, (now / 2 + i * 90) % H); ctx.lineTo(x, (now / 2 + i * 90) % H + lw * 0.6); ctx.stroke(); }
    }
    if (now < flashUntil) { ctx.fillStyle = 'rgba(255,107,87,.35)'; ctx.fillRect(0, 0, W, H); }
  }

  function drawObj(o, lw, H, now) {
    if (o.kind === 'station') return platform(o, lw, H, now);
    const x = ((o.kind === 'moose' ? o.lf : o.lane) + 0.5) * lw, y = o.y * H + lw * 0.4;
    if (o.kind === 'train' && o.warn) {   /* ⚠ at the top of its track before it comes in */
      if (Math.floor(now / 200) % 2) return;
      ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(x, lw * 0.1); ctx.lineTo(x + lw * 0.25, lw * 0.52); ctx.lineTo(x - lw * 0.25, lw * 0.52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink; ctx.fillRect(x - lw * 0.025, lw * 0.22, lw * 0.05, lw * 0.16); ctx.fillRect(x - lw * 0.025, lw * 0.42, lw * 0.05, lw * 0.05);
      return;
    }
    ctx.save(); ctx.translate(x, y);
    const s = lw;
    switch (o.kind) {
      case 'tree':
        ctx.fillStyle = C.trunk; ctx.fillRect(-0.36 * s, -0.05 * s, 0.72 * s, 0.1 * s);   /* fallen across the track */
        ctx.fillStyle = C.tree2; ctx.beginPath(); ctx.arc(0.22 * s, -0.04 * s, 0.2 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.tree; ctx.beginPath(); ctx.arc(0.1 * s, 0.06 * s, 0.17 * s, 0, Math.PI * 2); ctx.fill();
        break;
      case 'rock':
        ctx.fillStyle = C.rock2; ctx.beginPath(); ctx.ellipse(0.06 * s, 0.06 * s, 0.28 * s, 0.18 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.rock; ctx.beginPath(); ctx.ellipse(-0.06 * s, -0.03 * s, 0.24 * s, 0.17 * s, 0.3, 0, Math.PI * 2); ctx.fill();
        break;
      case 'leaf':
        for (const [dx, dy, a] of [[-0.15, -0.05, 0.4], [0.12, 0.08, 1.8], [0.02, -0.12, 2.6]]) {
          ctx.fillStyle = C.leaf; ctx.beginPath(); ctx.ellipse(dx * s, dy * s, 0.13 * s, 0.07 * s, a, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'go': case 'stop': {
        const lit = Math.floor(now / 300) % 2 === 0;
        ctx.fillStyle = '#7d8f88'; ctx.fillRect(-0.03 * s, 0, 0.06 * s, 0.26 * s);
        ctx.fillStyle = C.ink; rr(-0.14 * s, -0.24 * s, 0.28 * s, 0.3 * s, 0.08 * s); ctx.fill();
        const col = o.kind === 'go' ? C.go : C.stop;
        if (lit) { ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, -0.09 * s, 0.22 * s, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = lit ? col : '#33413c'; ctx.beginPath(); ctx.arc(0, -0.09 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'spare':
        ctx.fillStyle = C.mint; rr(-0.22 * s, -0.2 * s, 0.44 * s, 0.4 * s, 0.08 * s); ctx.fill();
        ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(0.18 * s, -0.18 * s, 0.11 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ink; ctx.fillRect(0.13 * s, -0.195 * s, 0.1 * s, 0.03 * s); ctx.fillRect(0.165 * s, -0.23 * s, 0.03 * s, 0.1 * s);
        break;
      case 'moose':
        if (o.dir < 0) ctx.scale(-1, 1);
        ctx.fillStyle = C.moose;
        ctx.beginPath(); ctx.ellipse(-0.05 * s, 0.02 * s, 0.26 * s, 0.15 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-0.24 * s, 0.1 * s, 0.06 * s, 0.22 * s); ctx.fillRect(0.1 * s, 0.1 * s, 0.06 * s, 0.22 * s);
        ctx.beginPath(); ctx.ellipse(0.26 * s, -0.1 * s, 0.12 * s, 0.08 * s, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.antler; ctx.lineWidth = 0.05 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0.2 * s, -0.16 * s); ctx.lineTo(0.1 * s, -0.34 * s); ctx.moveTo(0.27 * s, -0.17 * s); ctx.lineTo(0.34 * s, -0.36 * s); ctx.stroke();
        break;
      case 'train':   /* an oncoming grey train, nose down */
        ctx.fillStyle = C.other;
        rr(-0.3 * s, -0.4 * s, 0.6 * s, o.h * H - 0.1 * s, 0.1 * s); ctx.fill();
        ctx.fillStyle = C.ink; rr(-0.2 * s, o.h * H - 0.85 * s, 0.4 * s, 0.18 * s, 0.05 * s); ctx.fill();
        ctx.fillStyle = C.yellow; ctx.fillRect(-0.3 * s, o.h * H - 0.6 * s, 0.6 * s, 0.08 * s);
        break;
    }
    ctx.restore();
  }

  /** A platform between two tracks: grey with yellow safety edges, people waiting (gone once picked up). */
  function platform(o, lw, H) {
    const x = o.edge * lw, y = o.y * H, h = o.h * H, w = lw * 0.28;
    ctx.fillStyle = '#b9c2bd'; rr(x - w / 2, y, w, h, lw * 0.04); ctx.fill();
    ctx.fillStyle = C.yellow; ctx.fillRect(x - w / 2, y, lw * 0.03, h); ctx.fillRect(x + w / 2 - lw * 0.03, y, lw * 0.03, h);
    ctx.fillStyle = '#5b6b64'; ctx.fillRect(x - w * 0.3, y + h * 0.06, w * 0.6, lw * 0.06);   /* the shelter roof */
    if (o.hit) return;
    const cols = ['#ff8a3d', '#e84a5f', '#4aa3ff', '#b07cff', '#ffffff'];
    for (let i = 0; i < o.n; i++) {
      const py = y + h * (0.25 + (i / Math.max(1, o.n - 1)) * 0.6), px = x + (i % 2 ? 0.035 : -0.035) * lw;
      ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.arc(px, py, lw * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b1d12'; ctx.beginPath(); ctx.arc(px, py, lw * 0.025, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** A carriage seen from above, nose up; the head has the window and eyes. */
  function car(cx, y, lw, isHead) {
    const w = lw * 0.6, h = lw * 0.55;
    ctx.fillStyle = C.mint; rr(cx - w / 2, y, w, h, (isHead ? 0.25 : 0.1) * lw); ctx.fill();
    ctx.fillStyle = C.stripe; ctx.fillRect(cx - w / 2, y + h * 0.7, w, h * 0.12);
    ctx.fillStyle = C.win;
    if (isHead) {
      rr(cx - w * 0.32, y + h * 0.14, w * 0.64, h * 0.34, lw * 0.05); ctx.fill();
      for (const ex of [-0.13, 0.13]) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + ex * lw, y + h * 0.31, lw * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx + ex * lw, y + h * 0.27, lw * 0.025, 0, Math.PI * 2); ctx.fill();
      }
    } else { rr(cx - w * 0.3, y + h * 0.18, w * 0.6, h * 0.36, lw * 0.04); ctx.fill(); }
  }

  function frame(now) {
    const dt = Math.min(100, now - (last || now));
    last = now;
    update(dt);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ input */

  /* sliding: every ~60 % of a track's width the finger moves changes one track, so a long slide crosses several */
  let anchor = null;
  const onDown = e => { anchor = e.clientX; };
  const onMove = e => {
    if (anchor === null || mode !== 'run') return;
    const step = board.clientWidth / LANES * 0.6, d = e.clientX - anchor;
    if (Math.abs(d) >= step) { steer(Math.sign(d)); anchor += Math.sign(d) * step; }
  };
  const onUp = () => { anchor = null; };
  function onKey(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ((k === 'ArrowLeft' || k === 'a') && mode === 'run') { e.preventDefault(); steer(-1); return; }
    if ((k === 'ArrowRight' || k === 'd') && mode === 'run') { e.preventDefault(); steer(1); return; }
    if (k.startsWith('Arrow')) e.preventDefault();
    if (k === ' ' || k === 'p' || k === 'Escape') {
      e.preventDefault();
      if (mode === 'run') pause();
      else if (mode === 'pause' && k !== 'Escape') resume();
      else if ((mode === 'intro' || mode === 'over') && k === ' ') newGame();
    }
  }
  const onHide = () => { if (document.hidden) pause(); };

  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('blur', pause);
  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointermove', onMove);
  board.addEventListener('pointerup', onUp);
  board.addEventListener('pointercancel', onUp);
  ppBtn.addEventListener('click', () => (mode === 'pause' ? resume() : pause()));
  q('[data-act="help"]').addEventListener('click', help);
  const ro = new ResizeObserver(resize);
  ro.observe(board);
  resize();

  const intro = [[T.start, newGame, true], [T.back, back]];
  if (other) intro.push([T.other, other]);
  show(T.title, `${T.intro}${best ? ` ${fill(T.best, { n: best })}` : ''}`, intro);
  raf = requestAnimationFrame(frame);

  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(toastTimer);
    ro.disconnect();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('blur', pause);
  };
  stop.peek = () => ({ mode, g });   /* for automated tests */
  return stop;
}
