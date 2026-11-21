/* "Forsinket?" – a small snake-style game for the platform. The ghost train picks up as many passengers as it can
   while the delay clock runs: +1 min every 3 s, faster with every passenger; at 31 minutes it's over (you'd be
   entitled to compensation).
   Leaves and ice pop up for a few seconds; the edge and your own wagons cost a train set (3 lives).
   Loaded only when opened (dynamic import), no network, high score in this browser only. */

const N = 15;                      /* board: N × N cells */
const LIMIT = 31;                  /* minutes late = game over */
const minuteMs = score => Math.max(1500, 3000 - score * 60);   /* real time per delay minute: 3 s, down to 1.5 s */
const BEST_KEY = 'innstilt.game.best';
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const C = { bg1: '#0e3a30', bg2: '#113f35', mint: '#f2faf5', mint2: '#cfeadb', stripe: '#2fa36b', ink: '#0b0b0c', win: '#0e3a30',
  yellow: '#f5c400', leaf: '#d9822b', leaf2: '#8a4512', ice: '#bfe6ff', red: '#ff6b57' };

const TXT = {
  no: {
    title: 'Forsinket?', intro: 'Plukk opp så mange passasjerer du rekker med spøkelsestoget. Forsinkelsen tikker hele tiden – ved 31 minutter er det slutt. Pass deg for løv og is, kanten og dine egne vogner.',
    start: 'Start', resume: 'Fortsett', again: 'Spill igjen', back: 'Tilbake til turene', claim: 'Krev erstatning 😉',
    paused: 'Pause', leaf: 'Løv på skinnene!', ice: 'Is i kontaktledningen!', self: 'Materiellmangel!', edge: 'Signalfeil!',
    lateTitle: '31 minutter forsinket!', lateText: 'Gratulerer – du har krav på erstatning.',
    livesTitle: 'Toget er innstilt', livesText: 'Ingen flere togsett i dag.',
    result: '{n} passasjerer kom fram.', newBest: 'Ny rekord!', best: 'Rekord: {n}',
    keys: 'Piltaster eller WASD · P eller mellomrom = pause', pad: { up: 'Opp', down: 'Ned', left: 'Venstre', right: 'Høyre', pause: 'Pause' },
    score: 'Passasjerer', late: 'Forsinkelse', lives: 'Togsett igjen', help: 'Hvordan spiller jeg?',
    rules: ['👤 Kjør inn i passasjerene for å plukke dem opp – toget blir én vogn lengre.',
      '⏱ Forsinkelsen tikker hele tiden: +1 minutt hvert 3. sekund, og fortere jo flere passasjerer du har (streken viser neste minutt). Ved 31 minutter er spillet over.',
      '🍂 ❄️ Løv og is dukker opp noen sekunder. Kjør inn i dem, i kanten eller i dine egne vogner, og du mister et togsett (3 i alt).',
      '🕹 Styr med pilene, eller sveip på brettet. ⏸ nede til venstre tar pause.'],
  },
  en: {
    title: 'Forsinket?', intro: 'Pick up as many passengers as you can with the ghost train. The delay keeps ticking – at 31 minutes it\'s over. Watch out for leaves and ice, the edge and your own wagons.',
    start: 'Start', resume: 'Resume', again: 'Play again', back: 'Back to trips', claim: 'Claim compensation 😉',
    paused: 'Paused', leaf: 'Leaves on the line!', ice: 'Ice on the overhead wire!', self: 'Rolling stock shortage!', edge: 'Signal failure!',
    lateTitle: '31 minutes late!', lateText: 'Congratulations – you are entitled to compensation.',
    livesTitle: 'Train cancelled', livesText: 'No more train sets today.',
    result: '{n} passengers got there.', newBest: 'New record!', best: 'Record: {n}',
    keys: 'Arrow keys or WASD · P or Space = pause', pad: { up: 'Up', down: 'Down', left: 'Left', right: 'Right', pause: 'Pause' },
    score: 'Passengers', late: 'Delay', lives: 'Train sets left', help: 'How do I play?',
    rules: ['👤 Drive into passengers to pick them up – the train gets one wagon longer.',
      '⏱ The delay keeps ticking: +1 minute every 3 seconds, faster the more passengers you have (the bar shows the next minute). At 31 minutes the game is over.',
      '🍂 ❄️ Leaves and ice show up for a few seconds. Hit them, the edge or your own wagons and you lose a train set (3 in all).',
      '🕹 Steer with the arrows, or swipe on the board. ⏸ bottom left pauses.'],
  },
};

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode: keep it for this game only */ } };

/** Starts the game inside `root`. Returns a function that stops it and removes every listener. */
export function start(root, { lang = 'no', back = () => {} } = {}) {
  const T = TXT[lang === 'en' ? 'en' : 'no'];
  const touch = matchMedia('(pointer: coarse)').matches;
  root.innerHTML = `
    <div class="game">
      <div class="g-top">
        <span class="g-score" title="${T.score}">👤 <b>0</b></span>
        <span class="g-clock" title="${T.late}">⏱ <b>+0 min</b><i class="g-bar"><i></i></i></span>
        <span class="g-lives" title="${T.lives}">${'<img src="icons/ghost-32.png" width="24" height="24" alt="">'.repeat(3)}</span>
      </div>
      <div class="g-board">
        <canvas aria-label="${T.title}"></canvas>
        <div class="g-toast" hidden></div>
        <div class="g-msg" hidden></div>
      </div>
      ${touch ? `<div class="g-pad">
        <button type="button" class="g-up" data-dir="up" aria-label="${T.pad.up}">▲</button>
        <button type="button" class="g-left" data-dir="left" aria-label="${T.pad.left}">◀</button>
        <button type="button" class="g-right" data-dir="right" aria-label="${T.pad.right}">▶</button>
        <button type="button" class="g-down" data-dir="down" aria-label="${T.pad.down}">▼</button>
        <button type="button" class="g-pp" data-act="pause" aria-label="${T.pad.pause}">⏸</button>
        <button type="button" class="g-help helpbtn" data-act="help" aria-label="${T.help}">?</button>
      </div>` : `<p class="g-keys muted small">${T.keys}<button type="button" class="helpbtn" data-act="help" aria-label="${T.help}">?</button></p>`}
    </div>`;
  const q = s => root.querySelector(s);
  const cv = q('canvas'), ctx = cv.getContext('2d'), board = q('.g-board'), msg = q('.g-msg'), toastEl = q('.g-toast');
  const scoreEl = q('.g-score b'), clockEl = q('.g-clock'), clockB = q('.g-clock b'), barEl = q('.g-bar i'), lifeImgs = [...root.querySelectorAll('.g-lives img')];
  const ppBtn = q('[data-act="pause"]');

  let best = readBest();
  let st = null;            /* the current game */
  let mode = 'intro';       /* intro | run | pause | crash | over */
  let raf = 0, last = 0, acc = 0, crashUntil = 0, toastTimer = 0, flashUntil = 0;

  const spawnSnake = () => { const y = Math.floor(N / 2); return [{ x: 4, y }, { x: 3, y }, { x: 2, y }]; };
  const fresh = () => ({ score: 0, lives: 3, delay: 0, slow: 0, snake: spawnSnake(), dir: 'right', queue: [], grow: 0,
    pax: null, hazards: [], nextHazard: 7000 });
  const on = (cells, x, y) => cells.some(c => c.x === x && c.y === y);
  const taken = (x, y) => on(st.snake, x, y) || (st.pax && st.pax.x === x && st.pax.y === y) || st.hazards.some(h => on(h.cells, x, y));

  function freeCell(minDist = 0) {
    const h = st.snake[0];
    for (let i = 0; i < 300; i++) {
      const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
      if (!taken(x, y) && Math.abs(x - h.x) + Math.abs(y - h.y) >= minDist) return { x, y };
    }
    return null;
  }

  function spawnHazard() {
    const a = freeCell(5);
    if (!a) return;
    const cells = [a];
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 1; i < n; i++) {
      const [dx, dy] = Object.values(DIRS)[Math.floor(Math.random() * 4)];
      const p = cells[cells.length - 1], c = { x: p.x + dx, y: p.y + dy };
      if (c.x >= 0 && c.y >= 0 && c.x < N && c.y < N && !taken(c.x, c.y) && !on(cells, c.x, c.y)) cells.push(c);
    }
    st.hazards.push({ kind: Math.random() < 0.5 ? 'leaf' : 'ice', cells, age: 0, life: 4000 + Math.random() * 2500 });
  }

  /* ------------------------------------------------------------ rules */

  function newGame() {
    st = fresh();
    st.pax = freeCell(3);
    acc = 0;
    hud();
    setMode('run');
  }

  function turn(d) {
    if (mode !== 'run' || !st) return;
    const lastDir = st.queue.length ? st.queue[st.queue.length - 1] : st.dir;
    if (d === lastDir || d === OPPOSITE[lastDir] || st.queue.length >= 2) return;
    st.queue.push(d);
  }

  function step() {
    if (st.queue.length) st.dir = st.queue.shift();
    const [dx, dy] = DIRS[st.dir], h = st.snake[0], x = h.x + dx, y = h.y + dy;
    if (x < 0 || y < 0 || x >= N || y >= N) return crash('edge');
    const body = st.grow ? st.snake : st.snake.slice(0, -1);   /* the tail moves away this step */
    if (on(body, x, y)) return crash('self');
    const hz = st.hazards.find(z => z.age >= 700 && on(z.cells, x, y));
    if (hz) return crash(hz.kind);
    st.snake.unshift({ x, y });
    if (st.grow) st.grow--; else st.snake.pop();
    if (st.pax && st.pax.x === x && st.pax.y === y) {
      st.score++; st.grow++;
      st.pax = freeCell(3);
      hud();
    }
  }

  function crash(kind) {
    st.lives--;
    toast(T[kind]);
    flashUntil = performance.now() + 350;
    crashUntil = performance.now() + 1400;
    hud();
    setMode('crash');
  }

  function afterCrash() {
    if (st.lives <= 0) return over('lives');
    st.snake = spawnSnake(); st.dir = 'right'; st.queue = []; st.grow = 0; st.hazards = [];
    if (!st.pax || on(st.snake, st.pax.x, st.pax.y)) st.pax = freeCell(3);
    st.nextHazard = 5000;
    setMode('run');
  }

  function over(why) {
    const record = st.score > best;
    if (record) { best = st.score; saveBest(best); }
    const late = why === 'late';
    show(late ? T.lateTitle : T.livesTitle,
      `${late ? T.lateText : T.livesText} ${fill(T.result, { n: st.score })}${record && st.score ? ` <b>${T.newBest}</b>` : ` ${fill(T.best, { n: best })}`}`,
      [[T.again, newGame, true], late ? [T.claim, back] : [T.back, back]]);
    setMode('over', false);
  }

  function update(dt, now) {
    if (mode === 'crash') { if (now >= crashUntil) afterCrash(); return; }
    if (mode !== 'run') return;
    st.slow += dt;
    if (st.slow >= minuteMs(st.score)) {
      st.slow -= minuteMs(st.score);
      st.delay++;
      hud();
      if (st.delay >= LIMIT) return over('late');
    }
    st.nextHazard -= dt;
    if (st.nextHazard <= 0) { spawnHazard(); st.nextHazard = 5000 + Math.random() * 5000; }
    st.hazards.forEach(z => { z.age += dt; });
    st.hazards = st.hazards.filter(z => z.age < z.life);
    const stepMs = Math.max(90, 170 - st.score * 3);
    acc += dt;
    while (acc >= stepMs && mode === 'run') { acc -= stepMs; step(); }
  }

  /* ------------------------------------------------------------ screen */

  function hud() {
    if (!st) return;
    scoreEl.textContent = st.score;
    clockB.textContent = `+${st.delay} min`;
    clockEl.classList.toggle('warn', st.delay >= 20);
    lifeImgs.forEach((im, i) => im.classList.toggle('lost', i >= st.lives));
  }

  function toast(text) {
    toastEl.textContent = text; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 1500);
  }

  /** Overlay with a title, text and buttons [[label, action, primary]]. */
  function show(title, html, buttons) {
    msg.innerHTML = `<h2>${title}</h2><p>${html}</p><div class="g-btns">${buttons.map(([label], i) =>
      `<button type="button" data-b="${i}" class="${buttons[i][2] ? 'primary' : ''}">${label}</button>`).join('')}</div>`;
    msg.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => buttons[Number(b.dataset.b)][1]()));
    msg.hidden = false;
    msg.querySelector('.primary')?.focus();
  }

  function setMode(m, hideMsg = true) {
    mode = m;
    if (hideMsg && (m === 'run' || m === 'crash')) msg.hidden = true;
    if (ppBtn) ppBtn.textContent = m === 'pause' ? '▶' : '⏸';
  }

  function pause() {
    if (mode !== 'run') return;
    setMode('pause');
    show(T.paused, '', [[T.resume, resume, true], [T.back, back]]);
  }
  function resume() { if (mode === 'pause') { last = performance.now(); setMode('run'); } }

  /** The game's own "?": pauses and explains the rules. */
  function help() {
    if (mode === 'run') setMode('pause');
    if (mode === 'crash') return;
    const rules = `</p><ul class="g-rules">${T.rules.map(r => `<li>${r}</li>`).join('')}</ul><p>`;
    if (mode === 'pause') show(T.help, rules, [[T.resume, resume, true], [T.back, back]]);
    else show(T.help, rules, [[st ? T.again : T.start, newGame, true], [T.back, back]]);
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

  function draw(now) {
    const W = cv.width, c = W / N;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = (x + y) % 2 ? C.bg2 : C.bg1;
      ctx.fillRect(x * c, y * c, c + 1, c + 1);
    }
    if (!st) return;
    /* hazards: fade in (harmless while appearing), blink before they go */
    for (const z of st.hazards) {
      const a = z.age < 700 ? 0.25 + z.age / 1000 : (z.life - z.age < 900 && Math.floor(now / 150) % 2 ? 0.35 : 1);
      ctx.globalAlpha = Math.min(1, a);
      z.cells.forEach(p => (z.kind === 'leaf' ? leaf : flake)((p.x + 0.5) * c, (p.y + 0.5) * c, c, p.x * 7 + p.y));
      ctx.globalAlpha = 1;
    }
    if (st.pax) passenger((st.pax.x + 0.5) * c, (st.pax.y + 0.5) * c + Math.sin(now / 180) * c * 0.04, c);
    for (let i = st.snake.length - 1; i > 0; i--) wagon(st.snake[i].x * c, st.snake[i].y * c, c);
    head(st.snake[0], c);
    if (now < flashUntil) { ctx.fillStyle = 'rgba(255,107,87,.35)'; ctx.fillRect(0, 0, W, W); }
    barEl.style.width = `${Math.min(100, (st.slow / minuteMs(st.score)) * 100)}%`;
  }

  function wagon(x, y, c) {
    const m = c * 0.08;
    ctx.fillStyle = C.mint; rr(x + m, y + m, c - 2 * m, c - 2 * m, c * 0.16); ctx.fill();
    ctx.fillStyle = C.stripe; ctx.fillRect(x + m, y + c * 0.62, c - 2 * m, c * 0.1);
    ctx.fillStyle = C.win; rr(x + c * 0.22, y + c * 0.24, c * 0.56, c * 0.24, c * 0.05); ctx.fill();
  }

  function head(p, c) {
    ctx.save();
    ctx.translate((p.x + 0.5) * c, (p.y + 0.5) * c);
    if (st.dir === 'left') ctx.scale(-1, 1);
    else if (st.dir === 'up') ctx.rotate(-Math.PI / 2);
    else if (st.dir === 'down') ctx.rotate(Math.PI / 2);
    ctx.fillStyle = C.mint; rr(-0.46 * c, -0.42 * c, 0.92 * c, 0.84 * c, 0.24 * c); ctx.fill();
    ctx.fillStyle = C.stripe; ctx.fillRect(-0.46 * c, 0.16 * c, 0.8 * c, 0.1 * c);
    ctx.fillStyle = C.win; rr(-0.14 * c, -0.3 * c, 0.52 * c, 0.3 * c, 0.07 * c); ctx.fill();
    const sleepy = st.delay >= 20;
    for (const ex of [0.04, 0.25]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex * c, -0.15 * c, 0.075 * c, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc((ex + 0.025) * c, -0.14 * c, 0.035 * c, 0, Math.PI * 2); ctx.fill();
      if (sleepy) { ctx.fillStyle = C.win; ctx.fillRect((ex - 0.09) * c, -0.24 * c, 0.18 * c, 0.09 * c); }
    }
    ctx.restore();
  }

  function passenger(x, y, c) {
    ctx.fillStyle = C.yellow;
    ctx.beginPath(); ctx.arc(x, y - 0.2 * c, 0.13 * c, 0, Math.PI * 2); ctx.fill();
    rr(x - 0.18 * c, y - 0.04 * c, 0.36 * c, 0.36 * c, 0.12 * c); ctx.fill();
  }

  function leaf(x, y, c, seed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((seed % 6) * 0.5);
    ctx.fillStyle = C.leaf;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.36 * c, 0.2 * c, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.leaf2; ctx.lineWidth = 0.05 * c;
    ctx.beginPath(); ctx.moveTo(-0.42 * c, 0); ctx.lineTo(0.3 * c, 0); ctx.stroke();
    ctx.restore();
  }

  function flake(x, y, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = C.ice; ctx.lineWidth = 0.07 * c; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(-0.36 * c, 0); ctx.lineTo(0.36 * c, 0);
      for (const s of [-1, 1]) { ctx.moveTo(s * 0.22 * c, 0); ctx.lineTo(s * 0.32 * c, -0.1 * c); ctx.moveTo(s * 0.22 * c, 0); ctx.lineTo(s * 0.32 * c, 0.1 * c); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(100, now - (last || now));   /* a long gap (tab switch) never jumps the game ahead */
    last = now;
    update(dt, now);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ input */

  function onKey(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYS[k] && mode === 'run') { e.preventDefault(); turn(KEYS[k]); return; }
    if (k.startsWith('Arrow')) e.preventDefault();
    if (k === ' ' || k === 'p' || k === 'Escape') {
      e.preventDefault();
      if (mode === 'run') pause();
      else if (mode === 'pause' && k !== 'Escape') resume();
      else if ((mode === 'intro' || mode === 'over') && k === ' ') newGame();
    }
  }
  const onHide = () => { if (document.hidden) pause(); };
  let sx = 0, sy = 0, swiping = false;
  const onDown = e => { sx = e.clientX; sy = e.clientY; swiping = true; };
  const onUp = e => {
    if (!swiping) return;
    swiping = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('blur', pause);
  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointerup', onUp);
  root.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); turn(b.dataset.dir); }));
  ppBtn?.addEventListener('click', () => (mode === 'pause' ? resume() : pause()));
  root.querySelectorAll('[data-act="help"]').forEach(b => b.addEventListener('click', help));
  const ro = new ResizeObserver(resize);
  ro.observe(board);
  resize();

  show(T.title, `${T.intro}${best ? ` ${fill(T.best, { n: best })}` : ''}`, [[T.start, newGame, true], [T.back, back]]);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(toastTimer);
    ro.disconnect();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('blur', pause);
  };
}
