/* "Forsinket?" – a small snake-style game for the platform. The ghost train picks up as many passengers as it can
   while the delay clock runs: +1 min every 3 s; at 31 minutes it's over (you'd be entitled to compensation).
   Signals blink up now and then: green takes 3 minutes off, red adds 3.
   Leaves and ice pop up for a few seconds; the edge and your own wagons cost a train set (3 lives).
   Loaded only when opened (dynamic import), no network, high score in this browser only. */

const N = 15;                      /* board: N × N cells */
const LIMIT = 31;                  /* minutes late = game over */
const minuteMs = () => 3000;       /* real time per delay minute (steady; the train itself speeds up) */
const SIGNAL_MIN = 3;              /* minutes a green signal takes off / a red one adds */
const AHEAD_MAX = 9;               /* green signals can put you up to 9 min ahead of schedule */
const PER_LEVEL = 4;               /* passengers per level; 5 levels, each adds one thing */
const MAX_LIVES = 5, STREAK = 10;  /* extra train sets: the spare pickup, or 10 passengers without a mishap */
const TREES = [3, 11].flatMap(y => [4, 5, 6, 7, 8, 9, 10].map(x => ({ x, y })));   /* level 4: two rows of trees */
const BEST_KEY = 'innstilt.game.best';
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const INWARD = { left: 'right', right: 'left', top: 'down', bottom: 'up' };   /* direction when coming out of a tunnel side */
const PAIRS = [['left', 'right'], ['top', 'bottom'], ['left', 'top'], ['top', 'right'], ['right', 'bottom'], ['bottom', 'left']];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const C = { bg1: '#0e3a30', bg2: '#113f35', mint: '#f2faf5', mint2: '#cfeadb', stripe: '#2fa36b', ink: '#0b0b0c', win: '#0e3a30',
  tree: '#2b7a3d', tree2: '#1f5c2d', trunk: '#6b4a2a', moose: '#7a4a26', antler: '#e2c898',
  yellow: '#f5c400', leaf: '#d9822b', leaf2: '#8a4512', ice: '#bfe6ff', red: '#ff6b57', go: '#3fe08a', stop: '#ff3b2f' };

const TXT = {
  no: {
    title: 'Forsinket?', intro: 'Plukk opp så mange passasjerer du rekker med spøkelsestoget. Forsinkelsen tikker hele tiden – ved 31 minutter er det slutt. Grønt signal hjelper, rødt signal koster. Pass deg for kanten og dine egne vogner – og for mer etter hvert.',
    start: 'Start', resume: 'Fortsett', again: 'Spill igjen', back: 'Tilbake til turene', claim: 'Krev erstatning 😉',
    ahead: 'Foran rute! 😎', spare: 'Ekstra togsett! 🚆', streak: '10 på rad uten uhell – ekstra togsett!',
    green: 'Grønt signal! −3 min', redSig: 'Venter på signal… +3 min', lvl: 'Nivå {n}',
    levels: { 2: 'Nivå 2: løv og is!', 3: 'Nivå 3: tunneler!', 4: 'Nivå 4: trær over sporet!', 5: 'Nivå 5: elg!' }, levelMore: 'Nivå {n}: litt mer av alt!',
    slowSign: 'Saktekjøring i 5 sekunder 🚧',
    tunnel: 'Tunnel: {a} ⟷ {b}', sides: { left: 'venstre', right: 'høyre', top: 'topp', bottom: 'bunn' }, tree: 'Trær over sporet!', moose: 'Elg på sporet!',
    paused: 'Pause', leaf: 'Løv på skinnene!', ice: 'Is i kontaktledningen!', self: 'Materiellmangel!', edge: 'Signalfeil!',
    lateTitle: '31 minutter forsinket!', lateText: 'Gratulerer – du har krav på erstatning.',
    livesTitle: 'Toget er innstilt', livesText: 'Ingen flere togsett i dag.',
    result: '{n} passasjerer kom fram.', newBest: 'Ny rekord!', best: 'Rekord: {n}',
    keys: 'Piltaster eller WASD · P eller mellomrom = pause', pad: { up: 'Opp', down: 'Ned', left: 'Venstre', right: 'Høyre', pause: 'Pause' },
    score: 'Passasjerer', late: 'Forsinkelse', lives: 'Togsett igjen', help: 'Hvordan spiller jeg?',
    rules: ['👤 Kjør inn i passasjerene for å plukke dem opp – toget blir én vogn lengre.',
      '⏱ Forsinkelsen tikker hele tiden: +1 minutt hvert 3. sekund (streken viser neste minutt). Ved 31 minutter er spillet over.',
      '🟢 Grønt signal tar 3 minutter av forsinkelsen – under null er du foran rute. 🔴 Rødt signal legger til 3 – kjør rundt det.',
      '🚆 Ekstra togsett: plukk opp reservetoget med + når det dukker opp, eller ta 10 passasjerer på rad uten uhell (opptil 5 togsett).',
      '📈 Nytt nivå hver 4. passasjer. 2: løv og is 🍂❄️ dukker opp noen sekunder. 3: tunneler – to kanter (gule og svarte) åpnes en stund: kjør ut på den ene og kom inn fra den andre, også fra siden. 4: trær over sporet 🌲 (de blinker først). 5: elg som rusler over brettet. Fra nivå 6 kommer hindringene litt oftere.',
      '🚧 Saktekjøring (skilt med 40, fra nivå 3): toget kjører halvt så fort i 5 sekunder – lettere å styre, men klokka går.',
      '💥 Kjører du inn i løv, is, trær, elg, en lukket kant eller dine egne vogner, mister du et togsett (3 i alt), og farten starter rolig igjen.',
      '🕹 Styr med pilene, eller sveip på brettet. ⏸ nede til venstre tar pause.'],
  },
  en: {
    title: 'Forsinket?', intro: 'Pick up as many passengers as you can with the ghost train. The delay keeps ticking – at 31 minutes it\'s over. Green signals help, red ones cost. Watch out for the edge and your own wagons – and for more as you go.',
    start: 'Start', resume: 'Resume', again: 'Play again', back: 'Back to trips', claim: 'Claim compensation 😉',
    ahead: 'Ahead of schedule! 😎', spare: 'Spare train set! 🚆', streak: '10 in a row without a mishap – extra train set!',
    green: 'Green signal! −3 min', redSig: 'Waiting for a signal… +3 min', lvl: 'Level {n}',
    levels: { 2: 'Level 2: leaves and ice!', 3: 'Level 3: tunnels!', 4: 'Level 4: trees on the line!', 5: 'Level 5: moose!' }, levelMore: 'Level {n}: a bit more of everything!',
    slowSign: 'Slow running for 5 seconds 🚧',
    tunnel: 'Tunnel: {a} ⟷ {b}', sides: { left: 'left', right: 'right', top: 'top', bottom: 'bottom' }, tree: 'Trees on the line!', moose: 'Moose on the line!',
    paused: 'Paused', leaf: 'Leaves on the line!', ice: 'Ice on the overhead wire!', self: 'Rolling stock shortage!', edge: 'Signal failure!',
    lateTitle: '31 minutes late!', lateText: 'Congratulations – you are entitled to compensation.',
    livesTitle: 'Train cancelled', livesText: 'No more train sets today.',
    result: '{n} passengers got there.', newBest: 'New record!', best: 'Record: {n}',
    keys: 'Arrow keys or WASD · P or Space = pause', pad: { up: 'Up', down: 'Down', left: 'Left', right: 'Right', pause: 'Pause' },
    score: 'Passengers', late: 'Delay', lives: 'Train sets left', help: 'How do I play?',
    rules: ['👤 Drive into passengers to pick them up – the train gets one wagon longer.',
      '⏱ The delay keeps ticking: +1 minute every 3 seconds (the bar shows the next minute). At 31 minutes the game is over.',
      '🟢 A green signal takes 3 minutes off the delay – below zero you are ahead of schedule. 🔴 A red signal adds 3 – drive around it.',
      '🚆 Extra train sets: pick up the spare train with + when it shows up, or take 10 passengers in a row without a mishap (up to 5 train sets).',
      '📈 A new level every 4 passengers. 2: leaves and ice 🍂❄️ show up for a few seconds. 3: tunnels – two edges (yellow and black) open for a while: drive out of one and come in from the other, sometimes from the side. 4: trees on the line 🌲 (they blink first). 5: a moose wandering across. From level 6, obstacles come a little more often.',
      '🚧 Slow running (a 40 sign, from level 3): the train runs at half speed for 5 seconds – easier to steer, but the clock keeps going.',
      '💥 Hit leaves, ice, trees, a moose, a closed edge or your own wagons and you lose a train set (3 in all), and the speed starts calm again.',
      '🕹 Steer with the arrows, or swipe on the board. ⏸ bottom left pauses.'],
  },
};

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode: keep it for this game only */ } };

/** Starts the game inside `root`. Returns a function that stops it and removes every listener. */
export function start(root, { lang = 'no', back = () => {}, testScore = 0 } = {}) {
  const T = TXT[lang === 'en' ? 'en' : 'no'];
  const touch = matchMedia('(pointer: coarse)').matches;
  root.innerHTML = `
    <div class="game">
      <div class="g-top">
        <span class="g-score" title="${T.score}">👤 <b>0</b> <small class="g-lvl"></small></span>
        <span class="g-clock" title="${T.late}">⏱ <b>+0 min</b><i class="g-bar"><i></i></i></span>
        <span class="g-lives" title="${T.lives}"></span>
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
  const lvlEl = q('.g-lvl'), scoreEl = q('.g-score b'), clockEl = q('.g-clock'), clockB = q('.g-clock b'), barEl = q('.g-bar i'), livesEl = q('.g-lives');
  const ppBtn = q('[data-act="pause"]');

  let best = readBest();
  let st = null;            /* the current game */
  let mode = 'intro';       /* intro | run | pause | crash | over */
  let raf = 0, last = 0, acc = 0, crashUntil = 0, toastTimer = 0, flashUntil = 0;

  const spawnSnake = () => { const y = Math.floor(N / 2); return [{ x: 4, y }, { x: 3, y }, { x: 2, y }]; };
  const fresh = () => ({ score: 0, run: 0, lives: 3, delay: 0, slow: 0, snake: spawnSnake(), dir: 'right', queue: [], grow: 0,
    pax: null, hazards: [], nextHazard: 3000, signals: [], nextSignal: 4000,
    trees: [], tunnel: null, nextTunnel: 4000, moose: null, nextMoose: 3000, spare: null, nextSpare: 15000,
    t: 0, treesAge: 0, sign: null, nextSign: 6000, slowUntil: 0 });
  const level = () => 1 + Math.floor(st.score / PER_LEVEL);   /* 1–5 add one thing each; from 6, obstacles come more often */
  const on = (cells, x, y) => cells.some(c => c.x === x && c.y === y);
  const taken = (x, y) => on(st.snake, x, y) || (st.pax && st.pax.x === x && st.pax.y === y) || st.hazards.some(h => on(h.cells, x, y))
    || st.signals.some(g => g.x === x && g.y === y) || on(st.trees, x, y) || (st.spare && st.spare.x === x && st.spare.y === y)
    || (st.sign && st.sign.x === x && st.sign.y === y);
  /* passengers look different: coat, skin, hair, and sometimes something in hand */
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const newPax = () => {
    const p = freeCell(3);
    return p && { ...p, look: { coat: pick(['#ff8a3d', '#e84a5f', '#4aa3ff', '#b07cff', '#ffffff', '#f5c400', '#3fbf7f']),
      skin: pick(['#f1c7a5', '#e0ac85', '#b57b52', '#7a5032']), hair: pick(['#2b1d12', '#6b4423', '#d8b25a', '#a7a7a7', '#c0502d']),
      item: pick(['none', 'none', 'bag', 'backpack', 'umbrella', 'coffee']) } };
  };
  /* obstacles come a little more often with every passenger from level 6 (down to 45 % of the wait) */
  const busier = () => Math.max(0.45, 1 - Math.max(0, st.score - 5 * PER_LEVEL) * 0.025);

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
    if (testScore) { st.score = testScore; for (let n = 2; n <= level(); n++) levelUp(n); }   /* tests only */
    st.pax = newPax();
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
    const [dx, dy] = DIRS[st.dir], h = st.snake[0];
    let x = h.x + dx, y = h.y + dy;
    const out = x < 0 ? 'left' : x >= N ? 'right' : y < 0 ? 'top' : y >= N ? 'bottom' : null;
    const tn = st.tunnel;
    if (out && tn && tn.sides.includes(out)) {
      /* through the tunnel: come out of the other side at the same row/column, heading into the board */
      const k = out === 'left' || out === 'right' ? y : x;
      const to = tn.sides[0] === out ? tn.sides[1] : tn.sides[0];
      x = to === 'left' ? 0 : to === 'right' ? N - 1 : k;
      y = to === 'top' ? 0 : to === 'bottom' ? N - 1 : k;
      st.dir = INWARD[to]; st.queue = [];
    }
    if (x < 0 || y < 0 || x >= N || y >= N) return crash('edge');
    if (st.treesAge >= 1500 && on(st.trees, x, y)) return crash('tree');
    if (st.moose && st.moose.x === x && st.moose.y === y) return crash('moose');
    const body = st.grow ? st.snake : st.snake.slice(0, -1);   /* the tail moves away this step */
    if (on(body, x, y)) return crash('self');
    const hz = st.hazards.find(z => z.age >= 700 && on(z.cells, x, y));
    if (hz) return crash(hz.kind);
    st.snake.unshift({ x, y });
    if (st.grow) st.grow--; else st.snake.pop();
    if (st.pax && st.pax.x === x && st.pax.y === y) {
      const before = level();
      st.score++; st.run++; st.grow++;
      st.pax = newPax();
      if (st.run % STREAK === 0) extraLife(T.streak);
      if (level() > before) levelUp(level());
      hud();
    }
    const sig = st.signals.find(g => g.x === x && g.y === y);
    if (sig) {
      st.signals = st.signals.filter(g => g !== sig);
      const was = st.delay;
      st.delay = Math.max(-AHEAD_MAX, st.delay + (sig.kind === 'go' ? -SIGNAL_MIN : SIGNAL_MIN));
      toast(sig.kind === 'go' ? (st.delay < 0 && was >= 0 ? T.ahead : T.green) : T.redSig);
      hud();
      if (st.delay >= LIMIT) over('late');
    }
    if (st.spare && st.spare.x === x && st.spare.y === y) { st.spare = null; extraLife(T.spare); }
    if (st.sign && st.sign.x === x && st.sign.y === y) { st.sign = null; st.slowUntil = st.t + 5000; toast(T.slowSign); }
  }

  function extraLife(text) {
    if (st.lives >= MAX_LIVES) return;
    st.lives++;
    toast(text);
    hud();
  }

  function levelUp(n) {
    toast(T.levels[n] || fill(T.levelMore, { n }));
    if (n >= 4 && !st.trees.length) {
      st.trees = TREES; st.treesAge = 0;
      if (st.pax && on(st.trees, st.pax.x, st.pax.y)) st.pax = newPax();
      st.signals = st.signals.filter(g => !on(st.trees, g.x, g.y));
      st.hazards = st.hazards.filter(z => !z.cells.some(c => on(st.trees, c.x, c.y)));
    }
  }

  /* level 5: a moose walks in from an edge, straight across, slowly; it waits if a wagon is in the way */
  function spawnMoose() {
    const horiz = Math.random() < 0.5, from = Math.random() < 0.5, k = 1 + Math.floor(Math.random() * (N - 2));
    const h = st.snake[0];
    if (horiz ? Math.abs(k - h.y) < 2 : Math.abs(k - h.x) < 2) return;   /* never right in front of the train */
    st.moose = horiz ? { x: from ? 0 : N - 1, y: k, dx: from ? 1 : -1, dy: 0, acc: 0 }
      : { x: k, y: from ? 0 : N - 1, dx: 0, dy: from ? 1 : -1, acc: 0 };
  }

  function moveMoose(dt) {
    const m = st.moose;
    m.acc += dt;
    if (m.acc < 650) return;
    m.acc = 0;
    const x = m.x + m.dx, y = m.y + m.dy;
    if (x < 0 || y < 0 || x >= N || y >= N) { st.moose = null; return; }
    const h = st.snake[0];
    if (h.x === x && h.y === y) { m.x = x; m.y = y; crash('moose'); return; }
    if (on(st.snake, x, y)) return;                     /* waits for the train to pass */
    m.x = x; m.y = y;
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
    st.snake = spawnSnake(); st.dir = 'right'; st.queue = []; st.grow = 0; st.hazards = []; st.signals = [];
    st.run = 0; st.moose = null; st.nextMoose = 4000; st.slowUntil = 0;   /* a new train set starts calm */
    if (!st.pax || on(st.snake, st.pax.x, st.pax.y)) st.pax = newPax();
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
    const L = level();
    if (L >= 2) {
      st.nextHazard -= dt;
      if (st.nextHazard <= 0) { spawnHazard(); st.nextHazard = (5000 + Math.random() * 5000) * busier(); }
    }
    if (L >= 3) {
      if (st.tunnel) {
        st.tunnel.age += dt;
        if (st.tunnel.age >= st.tunnel.life) { st.tunnel = null; st.nextTunnel = 5000 + Math.random() * 6000; }
      } else if ((st.nextTunnel -= dt) <= 0) {
        /* a third opposite sides, the rest adjacent sides (more confusing) */
        const sides = PAIRS[Math.random() < 1 / 3 ? Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4)];
        st.tunnel = { sides, age: 0, life: 8000 + Math.random() * 5000 };
        toast(fill(T.tunnel, { a: T.sides[sides[0]], b: T.sides[sides[1]] }));
      }
    }
    if (st.spare) {
      st.spare.age += dt;
      if (st.spare.age >= st.spare.life) st.spare = null;
    } else if (st.lives < 3 && (st.nextSpare -= dt) <= 0) {   /* rare, and only after losing a train set */
      const at = freeCell(4);
      if (at) st.spare = { ...at, age: 0, life: 6000 };
      st.nextSpare = 20000 + Math.random() * 10000;
    }
    if (L >= 5) {
      if (st.moose) moveMoose(dt);
      else if ((st.nextMoose -= dt) <= 0) { spawnMoose(); st.nextMoose = (6000 + Math.random() * 6000) * busier(); }
      if (mode !== 'run') return;
    }
    st.nextSignal -= dt;
    if (st.nextSignal <= 0) {
      const at = freeCell(3);
      /* red a bit more often than green, as on a real commute */
      if (at) st.signals.push({ ...at, kind: Math.random() < 0.45 ? 'go' : 'stop', age: 0, life: 3500 + Math.random() * 2500 });
      st.nextSignal = 4000 + Math.random() * 5000;
    }
    st.signals.forEach(g => { g.age += dt; });
    st.signals = st.signals.filter(g => g.age < g.life);
    st.hazards.forEach(z => { z.age += dt; });
    st.hazards = st.hazards.filter(z => z.age < z.life);
    st.t += dt;
    st.treesAge += dt;
    if (L >= 3) {
      if (st.sign) { st.sign.age += dt; if (st.sign.age >= st.sign.life) st.sign = null; }
      else if ((st.nextSign -= dt) <= 0) {
        const at = freeCell(4);
        if (at) st.sign = { ...at, age: 0, life: 6000 };
        st.nextSign = 12000 + Math.random() * 8000;
      }
    }
    const slow = st.t < st.slowUntil ? 2 : 1;   /* slow running: half speed */
    const stepMs = Math.max(90, 170 - st.run * 3) * slow;   /* faster with each passenger since the last crash */
    acc += dt;
    while (acc >= stepMs && mode === 'run') { acc -= stepMs; step(); }
  }

  /* ------------------------------------------------------------ screen */

  function hud() {
    if (!st) return;
    scoreEl.textContent = st.score;
    lvlEl.textContent = fill(T.lvl, { n: level() });
    clockB.textContent = `${st.delay < 0 ? '−' : '+'}${Math.abs(st.delay)} min`;
    clockEl.classList.toggle('ahead', st.delay < 0);
    clockEl.classList.toggle('warn', st.delay >= 20);
    livesEl.innerHTML = Array.from({ length: Math.max(3, st.lives) }, (_, i) =>
      `<img src="icons/ghost-32.png" width="24" height="24" alt=""${i >= st.lives ? ' class="lost"' : ''}>`).join('');
  }

  let toastAt = 0;
  function toast(text) {
    const now = performance.now();   /* two things at the same moment (new level + bonus): show both */
    toastEl.textContent = !toastEl.hidden && now - toastAt < 300 ? `${toastEl.textContent} · ${text}` : text;
    toastAt = now; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 1500);
  }

  /** Overlay with a title, text and buttons [[label, action, primary]]. */
  function show(title, html, buttons) {
    msg.innerHTML = `<h2>${title}</h2><p>${html}</p><div class="g-btns">${buttons.map(([label], i) =>
      `<button type="button" data-b="${i}" class="${buttons[i][2] ? 'primary' : ''}">${label}</button>`).join('')}</div>`;
    msg.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => buttons[Number(b.dataset.b)][1]()));
    msg.hidden = false;
    msg.scrollTop = 0;
    msg.querySelector('.primary')?.focus({ preventScroll: true });   /* Enter/Space works, but the text starts at the top */
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
    if (st.tunnel) tunnel(st.tunnel, W, c, now);
    if (st.moose) moose(st.moose, c);
    if (st.treesAge >= 1500 || Math.floor(now / 150) % 2) st.trees.forEach(p => tree((p.x + 0.5) * c, (p.y + 0.5) * c, c));
    /* hazards: fade in (harmless while appearing), blink before they go */
    for (const z of st.hazards) {
      const a = z.age < 700 ? 0.25 + z.age / 1000 : (z.life - z.age < 900 && Math.floor(now / 150) % 2 ? 0.35 : 1);
      ctx.globalAlpha = Math.min(1, a);
      z.cells.forEach(p => (z.kind === 'leaf' ? leaf : flake)((p.x + 0.5) * c, (p.y + 0.5) * c, c, p.x * 7 + p.y));
      ctx.globalAlpha = 1;
    }
    for (const g of st.signals) {
      const fading = g.life - g.age < 900;
      signal((g.x + 0.5) * c, (g.y + 0.5) * c, c, g.kind, fading ? Math.floor(now / 150) % 2 === 0 : Math.floor(now / 400) % 2 === 0);
    }
    if (st.spare && !(st.spare.life - st.spare.age < 1500 && Math.floor(now / 150) % 2)) {
      const sx = st.spare.x * c, sy = st.spare.y * c;
      wagon(sx, sy, c);
      ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(sx + 0.8 * c, sy + 0.2 * c, 0.2 * c, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; ctx.fillRect(sx + 0.72 * c, sy + 0.18 * c, 0.16 * c, 0.04 * c); ctx.fillRect(sx + 0.78 * c, sy + 0.12 * c, 0.04 * c, 0.16 * c);
    }
    if (st.sign && !(st.sign.life - st.sign.age < 1500 && Math.floor(now / 150) % 2)) slowSign((st.sign.x + 0.5) * c, (st.sign.y + 0.5) * c, c);
    if (st.pax) passenger((st.pax.x + 0.5) * c, (st.pax.y + 0.5) * c + Math.sin(now / 180) * c * 0.03, c, st.pax.look);
    for (let i = st.snake.length - 1; i > 0; i--) wagon(st.snake[i].x * c, st.snake[i].y * c, c);
    head(st.snake[0], c);
    /* the message moves to the bottom while the train is near the top, so it never hides the train */
    if (!toastEl.hidden) toastEl.classList.toggle('low', st.snake[0].y < 4);
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

  /** Open edges: yellow-black portal stripes on both sides; they blink before the tunnel closes. */
  function tunnel(tn, W, c, now) {
    if (tn.life - tn.age < 1500 && Math.floor(now / 200) % 2) return;
    const w = c * 0.22;
    const band = (x, y, bw, bh) => {
      ctx.fillStyle = C.yellow; ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = C.ink;
      const long = Math.max(bw, bh);
      for (let i = 0; i < long; i += c * 0.5) bw > bh ? ctx.fillRect(x + i, y, c * 0.25, bh) : ctx.fillRect(x, y + i, bw, c * 0.25);
    };
    for (const side of tn.sides) {
      if (side === 'left') band(0, 0, w, W);
      else if (side === 'right') band(W - w, 0, w, W);
      else if (side === 'top') band(0, 0, W, w);
      else band(0, W - w, W, w);
    }
  }

  function tree(x, y, c) {
    ctx.fillStyle = C.trunk; ctx.fillRect(x - 0.06 * c, y + 0.12 * c, 0.12 * c, 0.3 * c);
    ctx.fillStyle = C.tree2; ctx.beginPath(); ctx.moveTo(x, y - 0.44 * c); ctx.lineTo(x + 0.36 * c, y + 0.2 * c); ctx.lineTo(x - 0.36 * c, y + 0.2 * c); ctx.fill();
    ctx.fillStyle = C.tree; ctx.beginPath(); ctx.moveTo(x, y - 0.44 * c); ctx.lineTo(x + 0.24 * c, y); ctx.lineTo(x - 0.24 * c, y); ctx.fill();
  }

  function moose(m, c) {
    ctx.save();
    ctx.translate((m.x + 0.5) * c, (m.y + 0.5) * c);
    if (m.dx < 0 || m.dy < 0) ctx.scale(-1, 1);
    ctx.fillStyle = C.moose;
    ctx.beginPath(); ctx.ellipse(-0.06 * c, 0.04 * c, 0.3 * c, 0.18 * c, 0, 0, Math.PI * 2); ctx.fill();   /* body */
    ctx.fillRect(-0.28 * c, 0.12 * c, 0.07 * c, 0.3 * c); ctx.fillRect(0.12 * c, 0.12 * c, 0.07 * c, 0.3 * c);   /* legs */
    ctx.beginPath(); ctx.ellipse(0.3 * c, -0.1 * c, 0.14 * c, 0.1 * c, 0.5, 0, Math.PI * 2); ctx.fill();   /* head */
    ctx.strokeStyle = C.antler; ctx.lineWidth = 0.06 * c; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.24 * c, -0.18 * c); ctx.lineTo(0.12 * c, -0.4 * c); ctx.moveTo(0.18 * c, -0.28 * c); ctx.lineTo(0.02 * c, -0.32 * c);
    ctx.moveTo(0.3 * c, -0.2 * c); ctx.lineTo(0.38 * c, -0.42 * c); ctx.stroke();
    ctx.restore();
  }

  /** A small light signal: dark head on a post, one lamp that blinks. */
  function signal(x, y, c, kind, lit) {
    const col = kind === 'go' ? C.go : C.stop;
    ctx.fillStyle = '#7d8f88'; ctx.fillRect(x - 0.04 * c, y + 0.05 * c, 0.08 * c, 0.4 * c);
    ctx.fillStyle = C.ink; rr(x - 0.2 * c, y - 0.42 * c, 0.4 * c, 0.52 * c, 0.12 * c); ctx.fill();
    if (lit) { ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(x, y - 0.16 * c, 0.3 * c, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = lit ? col : '#33413c';
    ctx.beginPath(); ctx.arc(x, y - 0.16 * c, 0.13 * c, 0, Math.PI * 2); ctx.fill();
  }

  /** A waiting passenger: yellow glow (so it's the obvious target), legs, coat, head, hair and maybe a thing. */
  function passenger(x, y, c, look) {
    const L = look || { coat: C.yellow, skin: '#e0ac85', hair: '#2b1d12', item: 'none' };
    ctx.fillStyle = 'rgba(245,196,0,.28)'; ctx.beginPath(); ctx.arc(x, y + 0.02 * c, 0.46 * c, 0, Math.PI * 2); ctx.fill();
    if (L.item === 'backpack') { ctx.fillStyle = '#3a4a44'; rr(x - 0.24 * c, y - 0.06 * c, 0.14 * c, 0.22 * c, 0.04 * c); ctx.fill(); }
    ctx.fillStyle = C.ink; ctx.fillRect(x - 0.09 * c, y + 0.14 * c, 0.07 * c, 0.24 * c); ctx.fillRect(x + 0.02 * c, y + 0.14 * c, 0.07 * c, 0.24 * c);
    ctx.fillStyle = L.coat; rr(x - 0.15 * c, y - 0.09 * c, 0.3 * c, 0.28 * c, 0.08 * c); ctx.fill();
    ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(x, y - 0.21 * c, 0.1 * c, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(x, y - 0.23 * c, 0.105 * c, Math.PI, 0); ctx.fill();
    if (L.item === 'bag') { ctx.fillStyle = '#8a5a2b'; rr(x + 0.15 * c, y + 0.04 * c, 0.14 * c, 0.12 * c, 0.03 * c); ctx.fill(); }
    if (L.item === 'coffee') { ctx.fillStyle = '#fff'; ctx.fillRect(x + 0.16 * c, y - 0.02 * c, 0.08 * c, 0.11 * c); ctx.fillStyle = '#6b4423'; ctx.fillRect(x + 0.16 * c, y + 0.02 * c, 0.08 * c, 0.03 * c); }
    if (L.item === 'umbrella') {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03 * c; ctx.beginPath(); ctx.moveTo(x + 0.2 * c, y + 0.1 * c); ctx.lineTo(x + 0.2 * c, y - 0.3 * c); ctx.stroke();
      ctx.fillStyle = '#e84a5f'; ctx.beginPath(); ctx.arc(x + 0.2 * c, y - 0.28 * c, 0.16 * c, Math.PI, 0); ctx.fill();
    }
  }

  /** Slow-running sign: a round speed sign with 40. */
  function slowSign(x, y, c) {
    ctx.fillStyle = '#7d8f88'; ctx.fillRect(x - 0.03 * c, y + 0.1 * c, 0.06 * c, 0.34 * c);
    ctx.fillStyle = '#d8262c'; ctx.beginPath(); ctx.arc(x, y - 0.08 * c, 0.34 * c, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 0.08 * c, 0.25 * c, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(0.26 * c)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('40', x, y - 0.07 * c);
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

  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(toastTimer);
    ro.disconnect();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('blur', pause);
  };
  stop.peek = () => ({ mode, st });   /* for automated tests */
  return stop;
}
