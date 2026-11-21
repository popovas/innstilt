/* "Sporarbeid" – a track-laying puzzle. Tap tiles to turn the rails and connect the station on the left to the
   station on the right before the train leaves; tiles the train hasn't reached can still be turned. If the track
   ends: bus for train, game over. Each level: bigger board, less time, faster train, then rocks and crossings.
   Loaded only when opened, no network, high score in this browser only. */

const SIDES = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const MID = { n: [0, -0.5], e: [0.5, 0], s: [0, 0.5], w: [-0.5, 0] };   /* side midpoints, relative to the cell centre */
const CONNS = {            /* rotation 0 for each piece; every rotation turns it 90° clockwise */
  straight: [['n', 's'], ['e', 'w']],
  curve: [['n', 'e'], ['e', 's'], ['s', 'w'], ['w', 'n']],
};
const BEST_KEY = 'innstilt.game.best.spor';
const C = { bg: '#0e3a30', tile: '#174a3d', tileOk: '#1f6b50', used: '#2a5a4b', rail: '#dfe7e3', railOk: '#ffffff', sleeper: '#7a5a3a',
  rock: '#8a958f', rock2: '#6c7671', mint: '#f2faf5', stripe: '#2fa36b', win: '#0e3a30', ink: '#0b0b0c', yellow: '#f5c400', red: '#ff6b57' };

/* a season per level, round and round: board, tiles, rails and what lies on the ground */
const THEMES = [
  { key: 'summer', bg: '#1f5130', tile: '#2b6a3d', ok: '#3d8c55', used: '#4d6e55', rail: '#dfe7e3', railOk: '#ffffff', ballast: '#7d776a', specks: ['#f5c400', '#ffffff', '#e84a5f'] },
  { key: 'autumn', bg: '#4a3a22', tile: '#5d4a2b', ok: '#7d6634', used: '#6b5f48', rail: '#e3ddd2', railOk: '#ffffff', ballast: '#857b6a', specks: ['#d9822b', '#b5521b', '#e0b040'] },
  { key: 'winter', bg: '#9fbccb', tile: '#c3d9e3', ok: '#e6f3f8', used: '#adc2cc', rail: '#4b5560', railOk: '#18242d', ballast: '#8e9aa2', specks: ['#ffffff'] },
  { key: 'night', bg: '#0d1b2e', tile: '#172a42', ok: '#23466a', used: '#1e3249', rail: '#c9d3df', railOk: '#ffffff', ballast: '#3c4656', specks: ['#f5f2c0', '#ffffff'] },
];

const TXT = {
  no: {
    title: 'Sporarbeid', intro: 'Vri skinnene så toget kommer fram til stasjonen til høyre. Toget går når nedtellingen er ute – eller når du trykker «Kjør nå!».',
    start: 'Start', resume: 'Fortsett', again: 'Spill igjen', back: 'Tilbake til turene', other: 'Prøv det andre spillet',
    go: 'Kjør nå!', paused: 'Pause', wait: 'Avgang om {s} s', running: 'Toget går', level: 'Nivå {n}', points: 'Poeng',
    winTitle: 'Framme!', winText: '+{n} poeng.', next: 'Neste avgang',
    switches: 'Sporveksler!',
    seasons: { summer: 'Sommer', autumn: 'Høst', winter: 'Vinter', night: 'Natt' },
    loseTitle: 'Buss for tog!', loseText: 'Sporet tok slutt på nivå {lvl}.', result: '{n} poeng.', newBest: 'Ny rekord!', best: 'Rekord: {n}',
    help: 'Hvordan spiller jeg?', keys: 'Klikk på en rute for å vri den · Enter = kjør nå · P = pause',
    pad: { pause: 'Pause' },
    rules: ['🛤 Trykk på en rute for å vri skinnene. Lag et spor fra stasjonen til venstre til stasjonen til høyre.',
      '✨ Skinner som henger sammen fra start, lyser opp – da ser du hvor langt sporet rekker.',
      '⏱ Toget går når nedtellingen er ute. Er du klar før, trykk «Kjør nå!»: hvert sekund du sparer gir et poeng, og hver rute toget kjører gir ett til.',
      '🚆 Ruter toget ikke har kommet til ennå, kan du fortsatt vri.',
      '🚌 Tar sporet slutt, blir det buss for tog – og spillet er over.',
      '📈 Hvert nivå: større brett, kortere tid og raskere tog. Steiner kan ikke flyttes, og kryss står fast.',
      '🔀 Fra nivå 11: sporveksler. Trykk for å legge om – toget følger grenen som er tegnet tydelig (den gule spaken står på den siden).'],
  },
  en: {
    title: 'Sporarbeid', intro: 'Turn the rails so the train reaches the station on the right. The train leaves when the countdown runs out – or when you press "Go now!".',
    start: 'Start', resume: 'Resume', again: 'Play again', back: 'Back to trips', other: 'Try the other game',
    go: 'Go now!', paused: 'Paused', wait: 'Departs in {s} s', running: 'Train running', level: 'Level {n}', points: 'Points',
    winTitle: 'Arrived!', winText: '+{n} points.', next: 'Next departure',
    switches: 'Switches!',
    seasons: { summer: 'Summer', autumn: 'Autumn', winter: 'Winter', night: 'Night' },
    loseTitle: 'Bus for train!', loseText: 'The track ran out on level {lvl}.', result: '{n} points.', newBest: 'New record!', best: 'Record: {n}',
    help: 'How do I play?', keys: 'Click a tile to turn it · Enter = go now · P = pause',
    pad: { pause: 'Pause' },
    rules: ['🛤 Tap a tile to turn its rails. Build a track from the station on the left to the station on the right.',
      '✨ Rails connected from the start light up – so you see how far the track reaches.',
      '⏱ The train leaves when the countdown runs out. Ready earlier? Press "Go now!": every second saved is a point, and every tile the train runs is one more.',
      '🚆 Tiles the train hasn\'t reached yet can still be turned.',
      '🚌 If the track runs out, it\'s a bus for train – and the game is over.',
      '📈 Every level: a bigger board, less time and a faster train. Rocks can\'t be moved, and crossings are fixed.',
      '🔀 From level 11: switches. Tap to change them – the train follows the branch drawn bold (the yellow lever is on that side).'],
  },
};

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode */ } };
const rnd = n => Math.floor(Math.random() * n);

const ORDER = ['n', 'e', 's', 'w'];
const turn = (side, k) => ORDER[(ORDER.indexOf(side) + k) % 4];   /* a side turned k × 90° clockwise */
const SWITCH_FROM = 11;   /* switches appear from this level */

/** A switch: drawn with its stem at the bottom, straight branch up and the curve to the right (hand 'r') or left
   ('l'), then turned `rot` × 90°. Tapping flips `set` between the straight and the curved branch. */
function switchSides(tile) {
  return { stem: turn('s', tile.rot), straight: turn('n', tile.rot), curve: turn(tile.hand === 'r' ? 'e' : 'w', tile.rot) };
}

/** A switch that fits a route cell entered from `entry` and left through `exit`. */
function switchFor(entry, exit) {
  const k = ORDER.indexOf(entry) - ORDER.indexOf('s') + 4;
  const straight = OPP[entry];
  const curve = exit === straight ? (Math.random() < 0.5 ? turn(entry, 1) : turn(entry, 3)) : exit;
  const hand = turn('e', k % 4) === curve ? 'r' : 'l';
  return { kind: 'switch', rot: k % 4, hand, set: Math.random() < 0.5 ? 'straight' : 'curve' };
}

/** Where the train goes when it enters `tile` from side `entry` (null = the track ends). */
function exitOf(tile, entry) {
  if (tile.kind === 'cross') return OPP[entry];
  if (tile.kind === 'rock') return null;
  if (tile.kind === 'switch') {
    const sd = switchSides(tile);
    if (entry === sd.stem) return sd[tile.set];          /* from the stem: along the branch that is set */
    return entry === sd[tile.set] ? sd.stem : null;      /* from a branch: only the one that is set leads through */
  }
  const [a, b] = CONNS[tile.kind][tile.rot % CONNS[tile.kind].length];
  return a === entry ? b : b === entry ? a : null;
}

/** A random winding route from the left edge to the right edge (cells and the side each is entered from). */
function makeRoute(N) {
  const minLen = Math.round(N * 1.6), maxLen = Math.round(N * N * 0.55);
  for (let tries = 0; tries < 400; tries++) {
    const y0 = rnd(N), path = [{ x: 0, y: y0 }], seen = new Set([`0,${y0}`]);
    while (path.length < maxLen) {
      const p = path[path.length - 1];
      if (p.x === N - 1 && path.length >= minLen && Math.random() < 0.6) return path;
      const opts = [];
      for (const [side, w] of [['e', 2], ['n', 1.6], ['s', 1.6], ['w', 0.6]]) {
        const [dx, dy] = SIDES[side], x = p.x + dx, y = p.y + dy;
        if (x >= 0 && y >= 0 && x < N && y < N && !seen.has(`${x},${y}`)) opts.push([{ x, y }, w]);
      }
      if (!opts.length) break;
      let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), pick = opts[0][0];
      for (const [c, w] of opts) { if ((r -= w) <= 0) { pick = c; break; } }
      path.push(pick); seen.add(`${pick.x},${pick.y}`);
    }
  }
  return Array.from({ length: N }, (_, x) => ({ x, y: Math.floor(N / 2) }));   /* fallback: straight across */
}

function sideTo(a, b) { return b.x > a.x ? 'e' : b.x < a.x ? 'w' : b.y > a.y ? 's' : 'n'; }

/** Builds a level: the route's pieces with scrambled rotations, the rest random, rocks and crossings later on. */
function makeLevel(level) {
  const N = Math.min(8, 5 + Math.floor((level - 1) / 2));
  const route = makeRoute(N);
  const grid = Array.from({ length: N }, () => Array.from({ length: N }, () => null));
  route.forEach((p, i) => {
    const entry = i === 0 ? 'w' : OPP[sideTo(route[i - 1], p)];
    const exit = i === route.length - 1 ? 'e' : sideTo(p, route[i + 1]);
    const kind = OPP[entry] === exit ? 'straight' : 'curve';
    grid[p.y][p.x] = level >= SWITCH_FROM && Math.random() < 0.22 ? { ...switchFor(entry, exit), route: true } : { kind, rot: rnd(4), route: true };
  });
  const rocks = Math.min(0.14, Math.max(0, level - 2) * 0.03), crosses = level >= 4 ? 0.08 : 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (grid[y][x]) continue;
    const r = Math.random();
    const sw = level >= SWITCH_FROM ? 0.06 : 0;
    grid[y][x] = r < rocks ? { kind: 'rock', rot: 0 } : r < rocks + crosses ? { kind: 'cross', rot: 0 }
      : r < rocks + crosses + sw ? { kind: 'switch', rot: rnd(4), hand: Math.random() < 0.5 ? 'r' : 'l', set: 'straight' }
      : { kind: Math.random() < 0.6 ? 'curve' : 'straight', rot: rnd(4) };
  }
  const start = route[0].y, goal = route[route.length - 1].y;
  const theme = THEMES[(level - 1) % THEMES.length];
  const specks = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random(), a: Math.random() * Math.PI,
    col: theme.specks[rnd(theme.specks.length)] }));
  return { N, grid, start, goal, theme, specks, /* time to build: depends on how long the route is, a little less each level (never under 70 %) */
    countdown: (8 + route.length * 2.2) * Math.max(0.7, 1 - (level - 1) * 0.03) * 1000,
    cellMs: Math.max(550, 1100 - level * 50) };
}

/** Starts the game inside `root`. Returns a function that stops it and removes every listener. */
export function start(root, { lang = 'no', back = () => {}, other = null } = {}) {
  const T = TXT[lang === 'en' ? 'en' : 'no'];
  const touch = matchMedia('(pointer: coarse)').matches;
  root.innerHTML = `
    <div class="game">
      <div class="g-top">
        <span class="g-score" title="${T.points}">⭐ <b>0</b> <small class="g-lvl"></small></span>
        <span class="g-clock"><b></b><i class="g-bar"><i></i></i></span>
        <span class="g-spacer"></span>
      </div>
      <div class="g-board">
        <canvas aria-label="${T.title}"></canvas>
        <div class="g-toast" hidden></div>
        <div class="g-msg" hidden></div>
      </div>
      <div class="g-row">
        <button type="button" class="g-pp" data-act="pause" aria-label="${T.pad.pause}">⏸</button>
        <button type="button" class="primary g-go" data-act="go">${T.go}</button>
        <button type="button" class="helpbtn" data-act="help" aria-label="${T.help}">?</button>
      </div>
      ${touch ? '' : `<p class="muted small center">${T.keys}</p>`}
    </div>`;
  const q = s => root.querySelector(s);
  const cv = q('canvas'), ctx = cv.getContext('2d'), board = q('.g-board'), msg = q('.g-msg'), toastEl = q('.g-toast');
  const scoreEl = q('.g-score b'), lvlEl = q('.g-lvl'), clockB = q('.g-clock b'), barEl = q('.g-bar i'), goBtn = q('.g-go'), ppBtn = q('.g-pp');

  let best = readBest();
  let g = null;              /* the current game: level, score, board, train */
  let mode = 'intro';        /* intro | wait | run | pause | over | between */
  let paused = null;         /* the mode to go back to after a pause */
  let raf = 0, last = 0, toastTimer = 0;

  /* ------------------------------------------------------------ rules */

  function newGame() { g = { level: 1, score: 0 }; nextLevel(); }

  function nextLevel() {
    Object.assign(g, makeLevel(g.level), { left: 0, segs: [], t: 0.5, travelled: 0 });
    g.left = g.countdown;
    /* the train waits in the station, left of the board: virtual straight cells */
    g.segs = [-3, -2, -1].map(x => ({ x, y: g.start, entry: 'w', exit: 'e' }));
    hud();
    msg.hidden = true;
    setMode('wait');
    toast(`${fill(T.level, { n: g.level })} · ${T.seasons[g.theme.key]}${g.level === SWITCH_FROM ? ` · ${T.switches}` : ''}`);
  }

  function toast(text) {
    toastEl.textContent = text; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 1600);
  }

  function rotate(x, y) {
    if (!g || (mode !== 'wait' && mode !== 'run')) return;
    const tile = g.grid[y]?.[x];
    if (!tile || tile.kind === 'rock' || tile.kind === 'cross' || tile.locked) return;
    if (tile.kind === 'switch') { tile.set = tile.set === 'straight' ? 'curve' : 'straight'; return; }   /* switches flip */
    tile.rot = (tile.rot + 1) % 4;
    tile.spin = 1;
  }

  function depart() {
    if (mode !== 'wait') return;
    g.bonus = Math.ceil(g.left / 1000);
    setMode('run');
  }

  function advance(dt) {
    g.t += dt / g.cellMs;
    while (g.t >= 1 && mode === 'run') {
      g.t -= 1;
      const cur = g.segs[g.segs.length - 1], [dx, dy] = SIDES[cur.exit], x = cur.x + dx, y = cur.y + dy;
      if (x >= g.N || x < 0 && cur.x >= 0 || y < 0 || y >= g.N) {
        return x >= g.N && cur.exit === 'e' && y === g.goal ? win() : lose();
      }
      const entry = OPP[cur.exit], tile = g.grid[y][x], exit = exitOf(tile, entry);
      if (!exit) { g.segs.push({ x, y, entry, exit: OPP[entry], dead: true }); g.t = 0; return lose(); }
      tile.locked = true;
      g.segs.push({ x, y, entry, exit });
      g.travelled++;
    }
  }

  function win() {
    const pts = g.travelled + (g.bonus || 0);
    g.score += pts;
    hud();
    g.level++;
    show(T.winTitle, fill(T.winText, { n: pts }), [[T.next, nextLevel, true], [T.back, back]]);
    setMode('between');
  }

  function lose() {
    const record = g.score > best;
    if (record) { best = g.score; saveBest(best); }
    show(T.loseTitle, `${fill(T.loseText, { lvl: g.level })} ${fill(T.result, { n: g.score })}${record && g.score ? ` <b>${T.newBest}</b>` : ` ${fill(T.best, { n: best })}`}`,
      [[T.again, newGame, true], [T.back, back]]);
    setMode('over');
  }

  function update(dt) {
    if (mode === 'wait') {
      g.left -= dt;
      if (g.left <= 0) { g.left = 0; depart(); }
      hud();
    } else if (mode === 'run') advance(dt);
    if (g) for (const row of g.grid) for (const tile of row) if (tile.spin) tile.spin = Math.max(0, tile.spin - dt / 120);
  }

  /** Cells joined to the start station with the current rotations (they light up). */
  function connected() {
    const ok = new Set();
    let x = 0, y = g.start, entry = 'w';
    for (let i = 0; i < g.N * g.N; i++) {
      if (x < 0 || y < 0 || x >= g.N || y >= g.N) return { ok, done: x >= g.N && y === g.goal };
      const exit = exitOf(g.grid[y][x], entry);
      if (!exit || ok.has(`${x},${y},${entry}`)) break;
      ok.add(`${x},${y},${entry}`); ok.add(`${x},${y}`);
      const [dx, dy] = SIDES[exit];
      x += dx; y += dy; entry = OPP[exit];
    }
    return { ok, done: false };
  }

  /* ------------------------------------------------------------ screen */

  function hud() {
    if (!g) return;
    scoreEl.textContent = g.score;
    lvlEl.textContent = fill(T.level, { n: g.level });
    clockB.textContent = mode === 'run' ? T.running : fill(T.wait, { s: Math.ceil((g.left || 0) / 1000) });
    barEl.style.width = `${mode === 'wait' && g.countdown ? (g.left / g.countdown) * 100 : 0}%`;
    goBtn.disabled = mode !== 'wait';
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
    if (ppBtn) ppBtn.textContent = m === 'pause' ? '▶' : '⏸';
    hud();
  }

  function pause() {
    if (mode !== 'wait' && mode !== 'run') return;
    paused = mode;
    setMode('pause');
    show(T.paused, '', [[T.resume, resume, true], [T.back, back]]);
  }
  function resume() {
    if (mode !== 'pause') return;
    msg.hidden = true; last = performance.now();
    setMode(paused || 'wait');
  }

  function help() {
    if (helpOpen && !msg.hidden) {
      helpOpen = false;
      if (beforeHelp === 'wait' || beforeHelp === 'run') resume();
      else if (lastShow) show(...lastShow);
      else msg.hidden = true;
      return;
    }
    beforeHelp = mode;
    if (mode === 'wait' || mode === 'run') { paused = mode; setMode('pause'); }
    const rules = `</p><ul class="g-rules">${T.rules.map(r => `<li>${r}</li>`).join('')}</ul><p>`;
    if (mode === 'pause') show(T.help, rules, [[T.resume, resume, true], [T.back, back]], true);
    else show(T.help, rules, [[g ? T.again : T.start, newGame, true], [T.back, back]], true);
  }

  function resize() {
    const px = board.clientWidth, dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(px * dpr); cv.height = cv.width;
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* the board has one cell of margin all round, for the two stations and the waiting train */
  const geo = () => { const c = cv.width / (g.N + 2); return { c, o: c }; };

  /** Position and heading on a segment at progress t (0–1), in board pixels. */
  function along(seg, t, c, o) {
    const cx = o + (seg.x + 0.5) * c, cy = o + (seg.y + 0.5) * c;
    const a = MID[seg.entry], b = MID[seg.exit];
    if (OPP[seg.entry] === seg.exit) {
      return { x: cx + (a[0] + (b[0] - a[0]) * t) * c, y: cy + (a[1] + (b[1] - a[1]) * t) * c, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    const k = [a[0] + b[0], a[1] + b[1]];            /* the corner the curve bends around */
    const a0 = Math.atan2(a[1] - k[1], a[0] - k[0]);
    let a1 = Math.atan2(b[1] - k[1], b[0] - k[0]);
    if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI; else if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    const ang = a0 + (a1 - a0) * t, sgn = Math.sign(a1 - a0);
    return { x: cx + (k[0] + Math.cos(ang) * 0.5) * c, y: cy + (k[1] + Math.sin(ang) * 0.5) * c, ang: ang + sgn * Math.PI / 2 };
  }

  function trackPiece(kind, lit, c) {
    const railW = Math.max(1.5, c * 0.05), g2 = c * 0.17, th = g ? g.theme : THEMES[0];
    const rail = lit ? th.railOk : th.rail;
    /* gravel bed under the sleepers */
    ctx.fillStyle = th.ballast;
    if (kind === 'curve') {
      ctx.lineWidth = 0.56 * c; ctx.strokeStyle = th.ballast; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(0.5 * c, -0.5 * c, 0.5 * c, Math.PI / 2, Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.55; ctx.fillRect(-0.28 * c, -0.5 * c, 0.56 * c, c);
      if (kind === 'cross') ctx.fillRect(-0.5 * c, -0.28 * c, c, 0.56 * c);
      ctx.globalAlpha = 1;
    }
    if (kind === 'straight' || kind === 'cross') {
      const one = () => {
        ctx.fillStyle = C.sleeper;
        for (let i = 0; i < 4; i++) ctx.fillRect(-0.25 * c, (-0.5 + 0.125 + i * 0.25) * c - c * 0.035, 0.5 * c, c * 0.07);
        ctx.fillStyle = rail; ctx.fillRect(-g2 - railW / 2, -0.5 * c, railW, c); ctx.fillRect(g2 - railW / 2, -0.5 * c, railW, c);
      };
      one();
      if (kind === 'cross') { ctx.rotate(Math.PI / 2); one(); ctx.rotate(-Math.PI / 2); }
      return;
    }
    /* curve n–e: arcs around the top-right corner */
    ctx.fillStyle = C.sleeper;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 2 + (i + 0.5) * (Math.PI / 2) / 4;
      ctx.save(); ctx.translate(0.5 * c + Math.cos(a) * 0.5 * c, -0.5 * c + Math.sin(a) * 0.5 * c); ctx.rotate(a);
      ctx.fillRect(-0.24 * c, -c * 0.035, 0.48 * c, c * 0.07); ctx.restore();
    }
    ctx.strokeStyle = rail; ctx.lineWidth = railW;
    for (const r of [0.5 - 0.17, 0.5 + 0.17]) { ctx.beginPath(); ctx.arc(0.5 * c, -0.5 * c, r * c, Math.PI / 2, Math.PI); ctx.stroke(); }
  }

  function draw(now) {
    const W = cv.width;
    ctx.fillStyle = g ? g.theme.bg : C.bg; ctx.fillRect(0, 0, W, W);
    if (!g) return;
    const { c, o } = geo(), link = connected(), th = g.theme;
    /* what lies on the ground: flowers, leaves, snow or stars (seen around and between the tiles) */
    for (const sp of g.specks) {
      ctx.fillStyle = sp.col;
      ctx.beginPath();
      if (th.key === 'autumn') ctx.ellipse(sp.x * W, sp.y * W, c * 0.07 * sp.r, c * 0.035 * sp.r, sp.a, 0, Math.PI * 2);
      else ctx.arc(sp.x * W, sp.y * W, c * (th.key === 'summer' ? 0.035 : th.key === 'night' ? 0.02 : 0.04) * sp.r, 0, Math.PI * 2);
      ctx.fill();
    }
    /* stations: platforms on the left and right edge */
    station(o - 0.5 * c, o + (g.start + 0.5) * c, c, false);
    station(o + (g.N + 0.5) * c, o + (g.goal + 0.5) * c, c, link.done);
    /* rails into and out of the board */
    for (const [x, y] of [[-1, g.start], [g.N, g.goal]]) {
      ctx.save(); ctx.translate(o + (x + 0.5) * c, o + (y + 0.5) * c); ctx.rotate(Math.PI / 2); trackPiece('straight', false, c); ctx.restore();
    }
    for (let y = 0; y < g.N; y++) for (let x = 0; x < g.N; x++) {
      const tile = g.grid[y][x], px = o + x * c, py = o + y * c, lit = link.ok.has(`${x},${y}`);
      ctx.fillStyle = tile.locked ? th.used : lit ? th.ok : th.tile;
      rr(px + c * 0.03, py + c * 0.03, c * 0.94, c * 0.94, c * 0.12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.07)';   /* a little shine on the upper half */
      rr(px + c * 0.03, py + c * 0.03, c * 0.94, c * 0.42, c * 0.12); ctx.fill();
      if (tile.kind === 'switch') {   /* switches get a yellow frame so they stand out */
        ctx.strokeStyle = C.yellow; ctx.lineWidth = Math.max(2, c * 0.05);
        rr(px + c * 0.06, py + c * 0.06, c * 0.88, c * 0.88, c * 0.1); ctx.stroke();
      }
      ctx.save(); ctx.translate(px + c / 2, py + c / 2);
      if (tile.kind === 'rock') rock(c);
      else if (tile.kind === 'switch') switchPiece(tile, lit, c);
      else { ctx.rotate(((tile.rot - (tile.spin || 0)) * Math.PI) / 2); trackPiece(tile.kind, lit, c); }
      ctx.restore();
    }
    /* the train: head plus two wagons trailing along the track it has run */
    const P = g.segs.length - 1 + g.t;
    for (const k of [2, 1, 0]) {
      const p = P - k * 0.95, i = Math.floor(p), seg = g.segs[Math.max(0, i)];
      if (!seg) continue;
      const pos = along(seg, i < 0 ? 0 : p - i, c, o);
      car(pos, c, k === 0, now);
    }
  }

  /** A switch: both branches, the one not set drawn faint, and a yellow lever on the side of the set branch. */
  function switchPiece(tile, lit, c) {
    ctx.rotate((tile.rot * Math.PI) / 2);
    const curveTurn = tile.hand === 'r' ? 1 : 2;   /* the curve piece n–e turned to s–e (right) or s–w (left) */
    const branch = (which, on) => {
      ctx.globalAlpha = on ? 1 : 0.4;
      if (which === 'straight') trackPiece('straight', lit && on, c);
      else { ctx.save(); ctx.rotate((curveTurn * Math.PI) / 2); trackPiece('curve', lit && on, c); ctx.restore(); }
      ctx.globalAlpha = 1;
    };
    const other = tile.set === 'straight' ? 'curve' : 'straight';
    branch(other, false); branch(tile.set, true);
    ctx.fillStyle = C.yellow; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1, c * 0.02);
    const lx = (tile.set === 'curve' ? 1 : -1) * (tile.hand === 'r' ? 0.3 : -0.3) * c;
    ctx.beginPath(); ctx.arc(lx, 0.34 * c, 0.08 * c, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  function station(x, y, c, ready) {
    ctx.fillStyle = ready ? C.yellow : '#c9d6d0';
    rr(x - 0.42 * c, y - 0.48 * c, 0.84 * c, 0.2 * c, 0.05 * c); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(0.14 * c)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ready ? '✓' : '🚉', x, y - 0.38 * c);
  }

  function rock(c) {
    ctx.fillStyle = C.rock2; ctx.beginPath(); ctx.ellipse(0.08 * c, 0.1 * c, 0.3 * c, 0.2 * c, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.rock; ctx.beginPath(); ctx.ellipse(-0.08 * c, -0.04 * c, 0.26 * c, 0.2 * c, 0.3, 0, Math.PI * 2); ctx.fill();
  }

  function car(p, c, isHead) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.fillStyle = C.mint; rr(-0.42 * c, -0.3 * c, 0.84 * c, 0.6 * c, (isHead ? 0.2 : 0.1) * c); ctx.fill();
    ctx.fillStyle = C.stripe; ctx.fillRect(-0.42 * c, 0.14 * c, 0.84 * c, 0.07 * c);
    ctx.fillStyle = C.win;
    if (isHead) {
      rr(0.02 * c, -0.22 * c, 0.32 * c, 0.24 * c, 0.05 * c); ctx.fill();
      for (const ex of [0.11, 0.25]) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex * c, -0.1 * c, 0.05 * c, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc((ex + 0.015) * c, -0.1 * c, 0.024 * c, 0, Math.PI * 2); ctx.fill();
      }
    } else { rr(-0.26 * c, -0.2 * c, 0.52 * c, 0.2 * c, 0.04 * c); ctx.fill(); }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(100, now - (last || now));
    last = now;
    update(dt);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ input */

  function onTap(e) {
    if (!g) return;
    const r = cv.getBoundingClientRect(), { c, o } = geo(), k = cv.width / r.width;
    const x = Math.floor(((e.clientX - r.left) * k - o) / c), y = Math.floor(((e.clientY - r.top) * k - o) / c);
    if (x >= 0 && y >= 0 && x < g.N && y < g.N) rotate(x, y);
  }
  function onKey(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Enter' && mode === 'wait') { e.preventDefault(); depart(); }
    else if (k === 'p' || k === ' ' || k === 'Escape') {
      e.preventDefault();
      if (mode === 'wait' || mode === 'run') pause();
      else if (mode === 'pause' && k !== 'Escape') resume();
      else if ((mode === 'intro' || mode === 'over') && k === ' ') newGame();
    }
  }
  const onHide = () => { if (document.hidden) pause(); };

  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('blur', pause);
  cv.addEventListener('pointerdown', onTap);
  goBtn.addEventListener('click', depart);
  ppBtn.addEventListener('click', () => (mode === 'pause' ? resume() : pause()));
  q('[data-act="help"]').addEventListener('click', help);
  const ro = new ResizeObserver(resize);
  ro.observe(board);
  resize();

  const intro = [[T.start, newGame, true], [T.back, back]];
  if (other) intro.push([T.other, other]);
  show(T.title, `${T.intro}${best ? ` ${fill(T.best, { n: best })}` : ''}`, intro);
  setMode('intro');
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

/* for automated tests only */
export const _test = { exitOf, makeLevel, switchSides };
