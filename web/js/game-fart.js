/* "Full fart" – a retro top-down runner. The ghost train races up five parallel tracks while the world scrolls
   towards it; slide left/right (arrow keys on a computer) to change track. Avoid trees, rocks, moose and oncoming
   trains; drive over passengers for points; leaves are slippery; green signals give full speed and double points,
   red ones brake. Everything keeps accelerating. Loaded only when opened, no network, high score in this browser. */

const LANES = 5;
const BEST_KEY = 'innstilt.game.best.fart';
const MAX_LIVES = 5;               /* the train is its carriages (a multiple unit, no engine): 3 at the start, up to 5 */
const HEAD_Y = 0.56;               /* the front carriage's front, in track units (0 = far end, 1 = near edge) */
const CAR = 0.085;                 /* one carriage's length in track units */
const SKY = 0.13;                  /* the sky strip at the top, share of the board height */
const THEMES = [   /* a season per kilometre, as in Sporarbeid */
  { key: 'summer', bg: '#2a6a3a', bed: '#77705f', rail: '#dfe7e3', specks: ['#f5c400', '#ffffff', '#e84a5f'],
    sky: ['#7cc4ea', '#d6f0fb'], hills: ['#4f7d6c', '#3c6a5a'], snow: false },
  { key: 'autumn', bg: '#5a4526', bed: '#7f7563', rail: '#e3ddd2', specks: ['#d9822b', '#b5521b', '#e0b040'],
    sky: ['#e9a96a', '#fbe2c0'], hills: ['#6b5a48', '#55473a'], snow: false },
  { key: 'winter', bg: '#b4cdd9', bed: '#8e9aa2', rail: '#4b5560', specks: ['#ffffff'],
    sky: ['#a9c6d8', '#eef6fb'], hills: ['#7d97a6', '#6a8292'], snow: true },
  { key: 'night', bg: '#10223a', bed: '#3c4656', rail: '#c9d3df', specks: ['#f5f2c0', '#ffffff'],
    sky: ['#060c18', '#1c2c48'], hills: ['#14233a', '#0e1a2c'], snow: true },
];
const C = { mint: '#f2faf5', stripe: '#2fa36b', win: '#0e3a30', ink: '#0b0b0c', yellow: '#f5c400', sleeper: '#7a5a3a',
  tree: '#2b7a3d', tree2: '#1f5c2d', trunk: '#6b4a2a', rock: '#8a958f', rock2: '#6c7671', leaf: '#d9822b', leaf2: '#8a4512',
  moose: '#7a4a26', antler: '#e2c898', go: '#3fe08a', stop: '#ff3b2f', red: '#ff6b57' };

const TXT = {
  no: {
    title: 'Full fart', intro: 'Bytt spor og kjør så langt du kan. Farten øker hele tiden – kjør utenom det som står i veien.',
    start: 'Start', resume: 'Fortsett', again: 'Spill igjen', back: 'Tilbake til turene', 
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
    start: 'Start', resume: 'Resume', again: 'Play again', back: 'Back to trips', 
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
export function start(root, { lang = 'no', back = () => {} } = {}) {
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
    g = { hist: [], vx: 0, t: 0, dist: 0, pace: 1, score: 0, pax: 0, lives: 3, lane: 2, x: 2, objs: [], nextRow: 0.6, specks: [],
      boostUntil: 0, redUntil: 0, slipUntil: 0, safeUntil: 0, season: 0, nextSpare: 25000 };
    g.specks = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random(), a: Math.random() * 3 }));
    g.gravel = Array.from({ length: 220 }, () => ({ l: rnd(LANES), o: Math.random() * 0.6 - 0.3, y: Math.random(), r: 0.4 + Math.random() * 0.8, c: rnd(3) }));
    g.peaks = Array.from({ length: 9 }, (_, i) => ({ x: i / 8 + (Math.random() - 0.5) * 0.08, h: 0.35 + Math.random() * 0.65 }));
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
    const px = g.x;
    g.x += (g.lane - g.x) * Math.min(1, dt / 90);       /* slide smoothly to the chosen track */
    g.vx = dt ? (g.x - px) / dt * 1000 : 0;             /* sideways speed, tracks per second (the tail swings with it) */
    g.hist.push({ d: g.dist, x: g.x });                 /* the path the front has taken: the carriages follow it */
    while (g.hist.length > 2 && g.hist[1].d < g.dist - 80) g.hist.shift();
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
    const lane = Math.round(g.x), top = HEAD_Y, bottom = HEAD_Y + CAR * 0.9;   /* the front carriage */
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

  /* ---- the 2.5D view: the camera sits above and behind the train, tilted forward. Track position u runs from
     0 (far end, just under the sky) to 1 (near edge); things far away are smaller and closer to the middle. */
  const P = u => Math.sign(u) * Math.abs(u) ** 1.35;                 /* far things are squeezed together */
  const Y = u => cv.height * (SKY + (1 - SKY) * P(u));
  const S = u => 0.42 + 0.58 * P(Math.max(0, u));                     /* size at that distance */
  const X = (lane, u) => cv.width / 2 + (lane - (LANES - 1) / 2) * (cv.width / LANES) * S(u);
  /** Where the front of the train was `back` metres ago (the carriages follow that path). */
  function xAt(back) {
    const d = g.dist - back, h = g.hist;
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].d <= d) { const a = h[i - 1], b = h[i]; return a.x + (b.x - a.x) * ((d - a.d) / ((b.d - a.d) || 1)); }
    }
    return h.length ? h[0].x : g.x;
  }

  function quad(pts, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }

  function draw(now) {
    const W = cv.width, H = cv.height, lw = W / LANES;
    const th = THEMES[(g ? g.season : 0) % THEMES.length];
    const scroll = g ? g.dist / 100 : 0;                    /* how far the ground has moved, in track units */
    /* sky and mountains */
    const sky = ctx.createLinearGradient(0, 0, 0, H * SKY);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * SKY + 2);
    if (th.key === 'night') { ctx.fillStyle = '#f5f2c0'; for (let i = 0; i < 18; i++) ctx.fillRect((i * 97) % W, (i * 53) % (H * SKY * 0.7), 2, 2); }
    const peaks = g ? g.peaks : [{ x: 0.2, h: 0.7 }, { x: 0.5, h: 1 }, { x: 0.8, h: 0.6 }];
    for (const [k, col] of [[1, th.hills[0]], [0.6, th.hills[1]]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H * SKY + 2);
      peaks.forEach((pk, i) => ctx.lineTo(((pk.x + (k < 1 ? 0.06 : 0)) % 1.1) * W, H * SKY * (1 - pk.h * 0.75 * k) + (i % 2) * 4));
      ctx.lineTo(W, H * SKY + 2); ctx.closePath(); ctx.fill();
      if (th.snow && k === 1) {   /* snow caps */
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (const pk of peaks) if (pk.h > 0.6) { const x = pk.x * W, y = H * SKY * (1 - pk.h * 0.75); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + W * 0.03, y + H * 0.02); ctx.lineTo(x - W * 0.03, y + H * 0.02); ctx.fill(); }
      }
    }
    /* the ground: base colour with soft bands that rush towards you */
    ctx.fillStyle = th.bg; ctx.fillRect(0, H * SKY, W, H);
    for (let k = -1; k < 24; k++) {
      const u0 = k * 0.05 + (scroll % 0.1);
      if (k % 2) continue;
      quad([[0, Y(u0)], [W, Y(u0)], [W, Y(u0 + 0.05)], [0, Y(u0 + 0.05)]], 'rgba(255,255,255,.045)');
    }
    if (g) for (const sp of g.specks) {   /* flowers, leaves, snow or stars on the ground */
      const u = (sp.y + scroll) % 1.1, lane = -1 + sp.x * (LANES + 1), sc = S(u);
      ctx.fillStyle = th.specks[Math.floor(sp.a * 10) % th.specks.length];
      ctx.beginPath(); ctx.arc(X(lane, u), Y(u), lw * 0.03 * sp.r * sc, 0, Math.PI * 2); ctx.fill();
    }
    /* five tracks: gravel bed, sleepers with tie plates, rails with a shine and a shadow */
    for (let l = 0; l < LANES; l++) {
      quad([[X(l - 0.34, 0), Y(0)], [X(l + 0.34, 0), Y(0)], [X(l + 0.34, 1.15), Y(1.15)], [X(l - 0.34, 1.15), Y(1.15)]], th.bed);
    }
    if (g) for (const gr of g.gravel) {
      const u = (gr.y + scroll) % 1.1;
      ctx.fillStyle = ['rgba(0,0,0,.18)', 'rgba(255,255,255,.16)', 'rgba(60,50,40,.22)'][gr.c];
      ctx.beginPath(); ctx.arc(X(gr.l + gr.o, u), Y(u), lw * 0.022 * gr.r * S(u), 0, Math.PI * 2); ctx.fill();
    }
    const gap = 0.032;
    for (let l = 0; l < LANES; l++) {
      for (let u = (scroll % gap) - gap; u < 1.15; u += gap) {
        const u1 = u + 0.011;
        quad([[X(l - 0.29, u), Y(u)], [X(l + 0.29, u), Y(u)], [X(l + 0.29, u1), Y(u1)], [X(l - 0.29, u1), Y(u1)]], C.sleeper);
        quad([[X(l - 0.29, u1 - 0.003), Y(u1 - 0.003)], [X(l + 0.29, u1 - 0.003), Y(u1 - 0.003)], [X(l + 0.29, u1), Y(u1)], [X(l - 0.29, u1), Y(u1)]], 'rgba(0,0,0,.25)');
      }
      for (const side of [-0.17, 0.17]) {
        const w = 0.028;
        quad([[X(l + side + w, 0), Y(0)], [X(l + side + w + 0.02, 0), Y(0)], [X(l + side + w + 0.02, 1.15), Y(1.15)], [X(l + side + w, 1.15), Y(1.15)]], 'rgba(0,0,0,.3)');
        quad([[X(l + side - w, 0), Y(0)], [X(l + side + w, 0), Y(0)], [X(l + side + w, 1.15), Y(1.15)], [X(l + side - w, 1.15), Y(1.15)]], th.rail);
        quad([[X(l + side - w, 0), Y(0)], [X(l + side - w * 0.2, 0), Y(0)], [X(l + side - w * 0.2, 1.15), Y(1.15)], [X(l + side - w, 1.15), Y(1.15)]], 'rgba(255,255,255,.55)');
      }
    }
    if (!g) return;
    /* things on and between the tracks, far ones first */
    for (const o of [...g.objs].sort((a, b) => a.y - b.y)) drawObj(o, lw, now);
    /* the train, rear carriage first so the front one is on top */
    if (!(g.t < g.safeUntil && Math.floor(now / 120) % 2)) drawTrain(lw, now);
    if (g.t < g.boostUntil) {   /* speed lines */
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const x = ((i * 137 + now / 3) % W); ctx.beginPath(); ctx.moveTo(x, (now / 2 + i * 90) % H); ctx.lineTo(x, (now / 2 + i * 90) % H + lw * 0.6); ctx.stroke(); }
    }
    if (now < flashUntil) { ctx.fillStyle = 'rgba(255,107,87,.35)'; ctx.fillRect(0, 0, W, H); }
  }

  function drawObj(o, lw, now) {
    if (o.kind === 'station') return platform(o, lw);
    if (o.kind === 'train') return oncoming(o, lw, now);
    const lane = o.kind === 'moose' ? o.lf : o.lane, u = o.y + o.h / 2;
    if (u < -0.02) return;
    ctx.save(); ctx.translate(X(lane, u), Y(u));
    const s = lw * S(u);
    /* a soft shadow under everything */
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0.03 * s, 0.1 * s, 0.3 * s, 0.09 * s, 0, 0, Math.PI * 2); ctx.fill();
    switch (o.kind) {
      case 'tree': {   /* a spruce fallen across the track */
        ctx.fillStyle = C.trunk; rr(-0.38 * s, -0.04 * s, 0.76 * s, 0.09 * s, 0.04 * s); ctx.fill();
        for (const [dx, r, col] of [[0.18, 0.2, C.tree2], [0.02, 0.17, C.tree], [-0.14, 0.13, C.tree2], [0.26, 0.12, C.tree]]) {
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo((dx - r) * s, 0.06 * s); ctx.lineTo(dx * s, -r * 1.3 * s); ctx.lineTo((dx + r) * s, 0.06 * s); ctx.fill();
        }
        break;
      }
      case 'rock':
        ctx.fillStyle = C.rock2; ctx.beginPath(); ctx.ellipse(0.06 * s, 0.03 * s, 0.28 * s, 0.17 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.rock; ctx.beginPath(); ctx.ellipse(-0.05 * s, -0.04 * s, 0.24 * s, 0.17 * s, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-0.1 * s, -0.1 * s, 0.09 * s, 0.05 * s, 0.3, 0, Math.PI * 2); ctx.fill();
        break;
      case 'leaf':
        for (const [dx, dy, a, col] of [[-0.15, -0.03, 0.4, C.leaf], [0.12, 0.06, 1.8, '#b5521b'], [0.02, -0.1, 2.6, '#e0b040'], [-0.02, 0.08, 1, C.leaf]]) {
          ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(dx * s, dy * s, 0.12 * s, 0.06 * s, a, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'go': case 'stop': {   /* a signal mast beside the track, lamp blinking */
        const lit = Math.floor(now / 300) % 2 === 0, col = o.kind === 'go' ? C.go : C.stop;
        ctx.fillStyle = '#7d8f88'; ctx.fillRect(-0.03 * s, -0.2 * s, 0.06 * s, 0.32 * s);
        ctx.fillStyle = C.ink; rr(-0.14 * s, -0.5 * s, 0.28 * s, 0.34 * s, 0.08 * s); ctx.fill();
        if (lit) { ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, -0.34 * s, 0.24 * s, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = lit ? col : '#33413c'; ctx.beginPath(); ctx.arc(0, -0.34 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'spare':
        carriage(0, 0, 0.5 * s, 0.42 * s, 0, false, false, now);
        ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(0.22 * s, -0.22 * s, 0.11 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ink; ctx.fillRect(0.17 * s, -0.235 * s, 0.1 * s, 0.03 * s); ctx.fillRect(0.205 * s, -0.27 * s, 0.03 * s, 0.1 * s);
        break;
      case 'moose':
        if (o.dir < 0) ctx.scale(-1, 1);
        ctx.fillStyle = C.moose;
        ctx.fillRect(-0.24 * s, 0.02 * s, 0.06 * s, 0.24 * s); ctx.fillRect(0.12 * s, 0.02 * s, 0.06 * s, 0.24 * s);
        ctx.beginPath(); ctx.ellipse(-0.04 * s, -0.04 * s, 0.27 * s, 0.15 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.27 * s, -0.16 * s, 0.12 * s, 0.08 * s, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.antler; ctx.lineWidth = 0.05 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0.21 * s, -0.22 * s); ctx.lineTo(0.1 * s, -0.4 * s); ctx.moveTo(0.28 * s, -0.23 * s); ctx.lineTo(0.36 * s, -0.42 * s); ctx.stroke();
        break;
    }
    ctx.restore();
  }

  /** An oncoming grey train: a warning ⚠ first, then a long body with its nose towards you. */
  function oncoming(o, lw, now) {
    const x0 = X(o.lane, 0);
    if (o.warn) {
      if (Math.floor(now / 200) % 2) return;
      const y = Y(0) + lw * 0.05, s = lw * 0.5;
      ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + s * 0.5, y + s * 0.85); ctx.lineTo(x0 - s * 0.5, y + s * 0.85); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink; ctx.fillRect(x0 - s * 0.05, y + s * 0.25, s * 0.1, s * 0.33); ctx.fillRect(x0 - s * 0.05, y + s * 0.64, s * 0.1, s * 0.1);
      return;
    }
    const a = Math.max(0, o.y), b = o.y + o.h;
    if (b < 0) return;
    const half = 0.3;
    quad([[X(o.lane - half, a), Y(a)], [X(o.lane + half, a), Y(a)], [X(o.lane + half, b), Y(b)], [X(o.lane - half, b), Y(b)]], C.other);
    quad([[X(o.lane - half, a), Y(a)], [X(o.lane - half + 0.1, a), Y(a)], [X(o.lane - half + 0.1, b), Y(b)], [X(o.lane - half, b), Y(b)]], 'rgba(0,0,0,.15)');
    const w0 = b - 0.05, w1 = b - 0.02;   /* windscreen and a yellow nose at the near end */
    quad([[X(o.lane - 0.22, w0), Y(w0)], [X(o.lane + 0.22, w0), Y(w0)], [X(o.lane + 0.22, w1), Y(w1)], [X(o.lane - 0.22, w1), Y(w1)]], C.ink);
    quad([[X(o.lane - half, w1), Y(w1)], [X(o.lane + half, w1), Y(w1)], [X(o.lane + half, b), Y(b)], [X(o.lane - half, b), Y(b)]], C.yellow);
  }

  /** A platform between two tracks: grey with yellow safety edges, a shelter, people waiting (gone once picked up). */
  function platform(o, lw) {
    const e = o.edge - 0.5, a = Math.max(0, o.y), b = o.y + o.h;
    if (b < 0) return;
    quad([[X(e - 0.15, a), Y(a)], [X(e + 0.15, a), Y(a)], [X(e + 0.15, b), Y(b)], [X(e - 0.15, b), Y(b)]], '#b9c2bd');
    for (const side of [-0.15, 0.12]) quad([[X(e + side, a), Y(a)], [X(e + side + 0.03, a), Y(a)], [X(e + side + 0.03, b), Y(b)], [X(e + side, b), Y(b)]], C.yellow);
    const r0 = a + (b - a) * 0.15, r1 = a + (b - a) * 0.35;
    if (r1 > 0) quad([[X(e - 0.1, r0), Y(r0)], [X(e + 0.1, r0), Y(r0)], [X(e + 0.1, r1), Y(r1)], [X(e - 0.1, r1), Y(r1)]], '#5b6b64');
    if (o.hit) return;
    const cols = ['#ff8a3d', '#e84a5f', '#4aa3ff', '#b07cff', '#ffffff'];
    for (let i = 0; i < o.n; i++) {
      const u = o.y + o.h * (0.45 + (i / Math.max(1, o.n - 1)) * 0.45);
      if (u < 0) continue;
      const px = X(e + (i % 2 ? 0.05 : -0.05), u), py = Y(u), s = lw * S(u);
      ctx.fillStyle = cols[i % cols.length]; rr(px - 0.045 * s, py - 0.08 * s, 0.09 * s, 0.1 * s, 0.03 * s); ctx.fill();
      ctx.fillStyle = '#e0ac85'; ctx.beginPath(); ctx.arc(px, py - 0.11 * s, 0.035 * s, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** The train: each carriage follows the path the front took, so a track change bends it like a snake; the rear
     carriage ends in the ghost's wavy hem, which swings with the sideways speed. */
  function drawTrain(lw, now) {
    const n = Math.max(1, g.lives);
    for (let i = n - 1; i >= 0; i--) {
      const uf = HEAD_Y + i * CAR, ub = uf + CAR * 0.92;
      const xf = xAt(i * CAR * 100), xb = xAt((i + 0.92) * CAR * 100);
      const fx = X(xf, uf), fy = Y(uf), bx = X(xb, ub), by = Y(ub);
      const len = Math.hypot(bx - fx, by - fy), ang = Math.atan2(fx - bx, by - fy), w = lw * 0.62 * S((uf + ub) / 2);
      ctx.save(); ctx.translate((fx + bx) / 2, (fy + by) / 2); ctx.rotate(-ang);
      carriage(0, 0, w, len, i, i === 0, i === n - 1, now);
      ctx.restore();
      if (i > 0) {   /* the gangway between carriages */
        ctx.fillStyle = '#5b6b64'; ctx.fillRect(fx - w * 0.18, fy - lw * 0.03, w * 0.36, lw * 0.05);
      }
    }
  }

  /** One carriage seen from above and behind, nose up, centred on (0,0): the logo's mint body with a soft shade,
     dark window strips, roof vents; the front one has the windscreen with the sleepy eyes and the "meh" mouth;
     the rear one ends in the ghost's hem. */
  function carriage(cx, cy, w, h, i, front, rear, now) {
    const x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx + w * 0.12, cy + h * 0.08, w * 0.55, h * 0.52, 0, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createLinearGradient(x, 0, x + w, 0);
    body.addColorStop(0, '#cfeadb'); body.addColorStop(0.35, '#f2faf5'); body.addColorStop(1, '#bcdccb');
    ctx.fillStyle = body;
    if (rear) {   /* the hem: a wavy, fading bottom edge that swings */
      const swing = Math.max(-1, Math.min(1, -(g ? g.vx : 0) * 0.35)) * w * 0.25, ph = (g ? g.dist : 0) / 6 + now / 260;
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.3); ctx.arcTo(x, y, x + w / 2, y, w * 0.25); ctx.arcTo(x + w, y, x + w, y + h * 0.3, w * 0.25);
      ctx.lineTo(x + w, y + h * 0.8);
      for (let k = 0; k <= 6; k++) {
        const t = 1 - k / 6, wx = x + w * t + swing * (1 - Math.abs(t - 0.5) * 2) * 0.3 + swing * 0.5;
        ctx.lineTo(wx, y + h * 0.88 + Math.sin(ph + k * 1.2) * h * 0.05 + (k % 2 ? h * 0.08 : 0));
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(207,234,219,.55)'; ctx.lineWidth = Math.max(1.5, w * 0.04); ctx.lineCap = 'round';   /* wisps */
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sd * w * 0.65 + swing, y + h * 0.75); ctx.quadraticCurveTo(cx + sd * w * 0.8 + swing, y + h * 0.95, cx + sd * w * 0.6 + swing * 1.4, y + h * 1.1); ctx.stroke(); }
    } else {
      rr(x, y, w, h, front ? w * 0.38 : w * 0.12); ctx.fill();
    }
    /* windows along both sides, a green livery line, roof vents */
    ctx.fillStyle = '#14473b';
    const wy0 = y + h * (front ? 0.42 : 0.12), wy1 = y + h * (rear ? 0.72 : 0.88);
    rr(x + w * 0.05, wy0, w * 0.12, wy1 - wy0, w * 0.04); ctx.fill();
    rr(x + w * 0.83, wy0, w * 0.12, wy1 - wy0, w * 0.04); ctx.fill();
    ctx.fillStyle = C.stripe; ctx.fillRect(x + w * 0.005, wy0, w * 0.035, wy1 - wy0); ctx.fillRect(x + w * 0.96, wy0, w * 0.035, wy1 - wy0);
    ctx.fillStyle = 'rgba(14,58,48,.18)';
    for (const vy of [0.35, 0.6]) if (!front || vy > 0.5) { rr(cx - w * 0.16, y + h * vy, w * 0.32, h * 0.1, w * 0.04); ctx.fill(); }
    if (front) {   /* windscreen with the logo's half-asleep eyes, and the flat mouth */
      ctx.fillStyle = '#14473b'; rr(x + w * 0.12, y + h * 0.08, w * 0.76, h * 0.28, w * 0.12); ctx.fill();
      for (const ex of [-0.18, 0.18]) {
        const ex0 = cx + ex * w, ey = y + h * 0.23;
        ctx.fillStyle = '#e9f6ee'; ctx.beginPath(); ctx.ellipse(ex0, ey, w * 0.11, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0e3a30'; ctx.beginPath(); ctx.arc(ex0 + w * 0.025, ey + h * 0.025, w * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#14473b'; ctx.beginPath(); ctx.ellipse(ex0, ey, w * 0.12, h * 0.1, 0, Math.PI, 0); ctx.fill();   /* heavy lid */
        ctx.strokeStyle = '#cfeadb'; ctx.lineWidth = Math.max(1, w * 0.02); ctx.beginPath(); ctx.moveTo(ex0 - w * 0.11, ey); ctx.lineTo(ex0 + w * 0.11, ey); ctx.stroke();
      }
      ctx.strokeStyle = '#14473b'; ctx.lineWidth = Math.max(1.5, w * 0.035); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - w * 0.12, y + h * 0.44); ctx.quadraticCurveTo(cx, y + h * 0.41, cx + w * 0.12, y + h * 0.45); ctx.stroke();
    }
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
