import * as core from './core.js';
import * as store from './store.js';
import * as data from './data.js';
import { t, getLang, setLang, fmtDate, fmtDay } from './i18n.js';
import { BOOKMARKLET } from './bookmarklet-href.js';
import { VERSION, ABOUT, ROADMAP, FAQ, contactAddress } from './about.js';
import * as stats from './stats.js';
import { slides as introSlides, picture as introPicture, HELP } from './intro.js';

/* Android app test (Google Play closed test). Empty group link = the tester card stays hidden. */
const TESTER_GROUP_URL = '';  /* e.g. 'https://groups.google.com/g/innstilt-testere' */
const TESTER_PLAY_URL = 'https://play.google.com/apps/testing/app.innstilt';
const DONATE_URL = 'https://ko-fi.com/innstilt_team';  /* tips via Ko-fi (no phone number exposed, no requests); empty = hidden */
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isTouch = () => matchMedia('(pointer: coarse)').matches;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(navigator.userAgent);
const wantsTester = () => Boolean(TESTER_GROUP_URL) && isAndroid() && !data.NATIVE;
const wantsHomeScreen = () => isTouch() && !isStandalone() && !data.NATIVE;  /* not inside the Android app */

/* Android/Chrome offers a real install dialog; keep its event so our own "Install" button can open it. */
let installPrompt = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  document.querySelectorAll('[data-install]').forEach(b => { b.hidden = false; });
});
addEventListener('appinstalled', () => store.update(s => { s.homeDone = true; }));

/* ------------------------------------------------------------------ shell */

function shell() {
  const lang = getLang();
  $('#lang').innerHTML = ['no', 'en'].map(l =>
    `<button type="button" data-lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join('');
  const route = location.hash.slice(2) || 'trips';
  $('#nav').innerHTML = [['trips', t('navTrips')], ['claims', t('navClaims')], ['settings', t('navSettings')]]
    .map(([r, label]) => `<a href="#/${r}" ${r === route ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  $('#nav').hidden = !store.get().welcomed;
  const help = $('#helpBtn');
  help.hidden = !store.get().welcomed || route === 'intro';
  help.setAttribute('aria-label', t('help')); help.title = t('help');
  $('#foot').innerHTML = `<a href="#/about">${esc(t('about'))}</a> · <a href="${data.NATIVE ? 'https://innstilt.app/' : ''}personvern.html${getLang() === 'en' ? '#en' : ''}">${esc(t('privacy'))}</a> · ${esc(t('notVy'))} ${esc(t('dataFrom'))}`
    + (DONATE_URL ? ` · <a href="${esc(DONATE_URL)}" target="_blank" rel="noopener">${esc(t('coffee'))}</a>` : '');
}

function render() {
  /* Never run inside another site's frame (GitHub Pages can't send the header that forbids it), so nobody
     can overlay Innstilt with invisible buttons (clickjacking). */
  if (window.top !== window.self) {
    $('#main').innerHTML = `<p class="notice">${esc(t('framed'))} <a href="https://innstilt.app/" target="_blank" rel="noopener">innstilt.app</a></p>`;
    return;
  }
  shell();
  offlineBanner();
  syncStats();
  const s = store.get();
  const route = location.hash.slice(2) || 'trips';
  if (route === 'about') return viewAbout();  /* readable before setup too */
  if (route === 'intro') return viewWelcome(true);
  if (route.startsWith('case?')) return viewCase(new URLSearchParams(route.slice(5)));
  if (!s.welcomed) return viewWelcome();
  if (!store.isReady()) return viewSetup(true);  /* first-run setup until profile + ticket are complete */
  ({ trips: viewTrips, claims: viewClaims, settings: () => viewSetup(false) }[route] || viewTrips)();
}

/** Navigate: changing the hash renders via 'hashchange'; same hash -> render directly (never both). */
function go(route) {
  const target = `#/${route}`;
  if (location.hash === target) render(); else location.hash = target;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-lang]');
  if (b) { setLang(b.dataset.lang); render(); }
});
addEventListener('hashchange', render);

/* A small banner while the device is offline (no re-render, so nothing being typed is lost). */
function offlineBanner() {
  const el = $('#offline');
  el.textContent = `📡 ${t('offline')}`;
  el.hidden = navigator.onLine;
}
addEventListener('online', offlineBanner);
addEventListener('offline', offlineBanner);

/* ------------------------------------------------------------------ welcome */

/* First start: a walk through the app's own screens (one screenshot or drawing, a line or two each). "Skip" is
   always there; the first slide links the privacy page; the last starts setup. Re-openable from About (#/intro). */
let introIdx = 0;
const privacyHref = () => `${data.NATIVE ? 'https://innstilt.app/' : ''}personvern.html${getLang() === 'en' ? '#en' : ''}`;

function slideHtml(sl) {
  return `<div class="intro-pic">${introPicture(sl, getLang())}</div>
    <h1>${esc(sl[2])}</h1>
    <p class="lead">${esc(sl[3])}</p>
    ${sl[0] === 'setup' ? `<p><a href="${esc(privacyHref())}">${esc(t('readPrivacy'))}</a></p>` : ''}`;
}

function viewWelcome(again = false) {
  const all = introSlides(getLang());
  const i = Math.min(introIdx, all.length - 1), last = i === all.length - 1;
  $('#main').innerHTML = `
    <section class="intro">
      <div class="intro-top"><button type="button" class="link" id="start">${esc(t(again ? 'introClose' : 'introSkip'))}</button></div>
      <div class="intro-slide" id="slide">${slideHtml(all[i])}</div>
      <div class="dots">${all.map((_, k) => `<button type="button" class="dot" data-go="${k}" aria-label="${k + 1}" ${k === i ? 'aria-current="step"' : ''}></button>`).join('')}</div>
      ${last ? `<button class="primary big" id="startEnd">${esc(t(again ? 'introClose' : 'start'))}</button>`
        : `<button class="primary big" id="next">${esc(t('introNext'))}</button>`}
      ${last && !again ? (wantsTester() ? testerHtml() : wantsHomeScreen() ? `<section class="card homecard">${homeHtml(true)}</section>` : '') : ''}
    </section>`;
  const goTo = k => { introIdx = Math.max(0, Math.min(all.length - 1, k)); viewWelcome(again); };
  const done = () => {
    introIdx = 0;
    if (again) { go('about'); return; }
    store.update(st => { st.welcomed = true; });
    go('trips');
  };
  $('#start').onclick = done;
  $('#startEnd')?.addEventListener('click', done);
  $('#next')?.addEventListener('click', () => goTo(i + 1));
  document.querySelectorAll('.dot').forEach(d => d.addEventListener('click', () => goTo(Number(d.dataset.go))));
  swipe($('#slide'), dir => goTo(i + dir));
  wireInstall();
}

/** Calls back with +1 (swipe left) or -1 (swipe right). */
function swipe(el, cb) {
  let x0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) cb(dx < 0 ? 1 : -1);
  });
}

/* The "?" in the header: the introduction's slides for the screen you are on. */
function openHelp() {
  const route = location.hash.slice(2) || 'trips';
  const key = !store.isReady() ? 'setup' : (route.split('?')[0] in HELP ? route.split('?')[0] : 'trips');
  const all = introSlides(getLang());
  const mine = HELP[key].map(k => all.find(sl => sl[0] === k));
  const dlg = $('#helpDlg');
  let i = 0;
  const draw = () => {
    dlg.innerHTML = `<div class="intro">${slideHtml(mine[i])}
      ${mine.length > 1 ? `<div class="dots">${mine.map((_, k) => `<span class="dot" ${k === i ? 'aria-current="step"' : ''}></span>`).join('')}</div>` : ''}
      <div class="actions">${i < mine.length - 1 ? `<button type="button" id="helpNext">${esc(t('introNext'))}</button>` : ''}
        <button type="button" class="primary" id="helpClose">${esc(t('introClose'))}</button></div></div>`;
    $('#helpNext')?.addEventListener('click', () => { i += 1; draw(); });
    $('#helpClose').onclick = () => dlg.close();
    swipe(dlg.querySelector('.intro'), dir => { const k = i + dir; if (k >= 0 && k < mine.length) { i = k; draw(); } });
  };
  draw();
  dlg.showModal();
}
$('#helpBtn').addEventListener('click', openHelp);

/* ------------------------------------------------------------------ case number from the bookmarklet */

/* #/case?n=123456&from=NSR:StopPlace:1&to=NSR:StopPlace:2&date=2026-11-21&time=16:54, opened by the
   bookmarklet's "Lagre i Innstilt" on Vy's confirmation page. Attaches the case number to that trip's claim,
   or keeps it until the claim is marked as sent. Everything is checked; a bad link changes nothing. */
/** Stores a case number caught on Vy's confirmation page (bookmarklet or in-app browser). Returns a message. */
function applyCase({ n, from, to, date, time }) {
  const key = store.claimKey(from, to, core.osloToMs(date, time));
  const claim = store.get().claims.find(c => c.key === key);
  store.update(s => {
    const c = s.claims.find(x => x.key === key);
    if (c) c.case = n;
    else (s.pendingCases ??= {})[key] = n;
  });
  dispatchEvent(new CustomEvent('innstilt-case'));  /* fills an open "I've sent it" dialog in this tab */
  return t(claim ? 'caseSaved' : 'casePending', { n, date: fmtDay(date), time });
}

const validCase = d => d && /^\d{4,12}$/.test(d.n) && /^NSR:StopPlace:\d+$/.test(d.from) && /^NSR:StopPlace:\d+$/.test(d.to)
  && /^\d{4}-\d\d-\d\d$/.test(d.date) && /^\d\d:\d\d$/.test(d.time);

/* Android app: Vy's form opens in Innstilt's own in-app browser. On every page load it runs the bookmarklet's
   code (sets the time, picks the train, never presses "Send inn"); when Vy shows the case number, the page
   sends it back here. Vy's page gets no access to the app's data: only that one message comes back, and it is
   validated like any link. */
const IAB = () => (data.NATIVE ? globalThis.Capacitor?.Plugins?.InAppBrowser : null);
let iabWired = false;
let attachImage = null;  /* data URL of the ticket picture for the claim being opened (Ruter/Entur tickets) */

/* Runs in Vy's page: waits for the form's upload field and gives it the ticket picture, as if chosen by hand.
   Once per page; touches nothing else. */
const attachCode = img => `if (!window.__innstiltAttached) { window.__innstiltAttached = true; (async () => {
  const pic = ${JSON.stringify(img)};
  /* Vy's page doesn't allow fetch() of a data: URL, so decode it by hand. Vy's upload widget listens on its hidden
     drop-zone input (the one with an accept list), which then stores the file in the form. */
  const [head, b64] = pic.split(',');
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const file = new File([bytes], 'billett.jpg', { type: head.slice(5, head.indexOf(';')) || 'image/jpeg' });
  for (let i = 0; i < 80; i++) {
    const inputs = [...document.querySelectorAll('main input[type=file]')];
    const zone = inputs.find(x => x.accept) || inputs[0];
    if (zone) {
      const dt = new DataTransfer();
      dt.items.add(file);
      zone.files = dt.files;
      zone.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    await new Promise(r => setTimeout(r, 250));
  }
})(); }`;

async function openVy(link, image = null) {
  attachImage = image;
  const iab = IAB();
  if (!iab) { window.open(link, '_blank', 'noopener'); return; }
  if (!iabWired) {
    iabWired = true;
    /* Vy's form rewrites its address on every change, and each rewrite is reported as a page load: run the
       filling code only once per real page (a reload clears the flag), or it keeps re-reading the time it
       just changed and drifts. */
    const code = `if (!window.__innstiltFilled) { window.__innstiltFilled = true; ${decodeURIComponent(BOOKMARKLET.slice('javascript:'.length))} }`;
    iab.addListener('browserPageLoaded', () => {
      iab.executeScript({ code }).catch(() => {});
      if (attachImage) iab.executeScript({ code: attachCode(attachImage) }).catch(() => {});
    });
    iab.addListener('messageFromWebview', e => {
      const d = e?.detail;
      if (d?.innstilt === 'case' && validCase(d)) applyCase(d);
    });
  }
  try {
    await iab.openWebView({ url: link, title: 'Vy', toolbarType: 'navigation', showReloadButton: true, isAnimated: true });
  } catch { window.open(link, '_blank', 'noopener'); }
}

function viewCase(q) {
  const n = q.get('n') || '', from = q.get('from') || '', to = q.get('to') || '';
  const date = q.get('date') || '', time = q.get('time') || '';
  const okInput = validCase({ n, from, to, date, time });
  const msg = okInput ? applyCase({ n, from, to, date, time }) : t('caseBad');
  history.replaceState(null, '', '#/claims');  /* a reload shouldn't apply it again */
  $('#main').innerHTML = `<section class="card center casecard">
      <h1>${okInput ? '✓' : '⚠️'} ${esc(t('caseTitle'))}</h1><p>${esc(msg)}</p>
      ${okInput ? `<p class="muted small">${esc(t('caseClose'))}</p>` : ''}
      <button type="button" class="primary" id="toClaims">${esc(t('caseToClaims'))}</button></section>`;
  $('#toClaims').onclick = () => go('claims');
  if (okInput) setTimeout(() => window.close(), 2500);  /* works when the bookmarklet opened this tab */
}

/* ------------------------------------------------------------------ about */

async function viewAbout() {
  const address = await contactAddress();
  const paras = ABOUT[getLang()] || ABOUT.no;
  const roadmap = ROADMAP[getLang()] || ROADMAP.no;
  $('#main').innerHTML = `
    <section class="hero small-hero">
      <img src="icons/ghost-192.png" width="88" height="88" alt="">
      <h1>${esc(t('about'))}</h1>
      <p class="muted">${esc(t('version', { v: VERSION }))}</p>
    </section>
    <p class="counter center" data-counter hidden></p>
    <section class="card about">
      <p class="lead"><strong>${esc(paras[0])}</strong></p>
      ${paras.slice(1).map(x => `<p>${esc(x)}</p>`).join('')}
    </section>
    <details class="card fold faq">
      <summary>${esc(t('faqTitle'))}</summary>
      <div class="faq-body">${(FAQ[getLang()] || FAQ.no).map(([q, a]) =>
        `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    </details>
    <section class="card about">
      <h2>🚧 ${esc(roadmap[0])}</h2>
      <ul class="roadmap">${roadmap.slice(1).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </section>
    ${address ? `<section class="card center">
      <p>${esc(t('contactBody'))}</p>
      <button type="button" class="primary" id="contact">✉️ ${esc(t('contact'))}</button>
    </section>` : ''}
    <p class="center"><button type="button" class="link" id="showIntro">${esc(t('introAgain'))}</button></p>
    <p class="center"><button type="button" class="link" id="back">← ${esc(t('back'))}</button></p>`;
  $('#back').onclick = () => (history.length > 1 ? history.back() : go('trips'));
  $('#showIntro').onclick = () => { introIdx = 0; go('intro'); };
  fillCounter();
  $('#contact')?.addEventListener('click', () => {
    /* Opens the visitor's own mail app; only the version and language are filled in, nothing personal. */
    const q = new URLSearchParams({ subject: `Innstilt ${VERSION}`, body: `\n\n— Innstilt ${VERSION} (${getLang()})` });
    location.href = `mailto:${address}?${q.toString().replace(/\+/g, '%20')}`;
  });
}

/* ------------------------------------------------------------------ setup / settings */

function dateFields(name, ms) {
  const [d, tm] = core.formatEu(ms);
  return `<label>${esc(t(name))}<span class="dt">
      <input name="${name}Date" value="${esc(d)}" placeholder="${esc(t('datePh'))}" inputmode="numeric" maxlength="10" autocomplete="off" aria-label="${esc(t(name))} – ${esc(t('datePh'))}">
      <input name="${name}Time" value="${esc(tm)}" placeholder="${esc(t('timePh'))}" inputmode="numeric" maxlength="5" autocomplete="off" aria-label="${esc(t(name))} – ${esc(t('timePh'))}">
    </span></label>`;
}

function viewSetup(first) {
  const s = store.get();
  const p = s.profile;
  const tk = s.tickets.length ? s.tickets[s.tickets.length - 1] : { code: '', validFrom: null, validTo: null };
  $('#main').innerHTML = `
    <h1>${esc(first ? t('setupTitle') : t('settingsTitle'))}</h1>
    ${first ? `<p class="help">${esc(t('importFirst'))} ${importHtml()}</p>` : ''}
    <div id="noticeBox">${noticeHtml()}</div>
    <form id="setup" class="card" novalidate>
      <h2>${esc(t('secTicket'))}</h2>
      <p class="help">${esc(t('ticketHelp'))}</p>
      ${first ? ticketFieldsHtml(tk) : '<div id="tickets"></div>'}

      <h2>${esc(t('secYou'))}</h2>
      <p class="reassure">🔒 ${esc(t('youWhy'))}</p>
      <label>${esc(t('name'))}<input name="name" value="${esc(p.name)}" autocomplete="name"></label>
      <label>${esc(t('email'))}<input type="email" name="email" value="${esc(p.email)}" autocomplete="email"><small>${esc(t('emailHelp'))}</small></label>
      <label>${esc(t('account'))}<input name="account" value="${esc(p.account)}" inputmode="numeric" placeholder="${esc(t('accountPh'))}" autocomplete="off"></label>

      <h2>${esc(t('secRoute'))}</h2>
      <p class="help">${esc(t('routesHelp'))}</p>
      <div id="routes">${(p.routes.length ? p.routes : [null]).map(routeHtml).join('')}</div>
      <button type="button" class="link" id="addRoute">＋ ${esc(t('addRoute'))}</button>

      ${first && stats.enabled() ? `<label class="check share-setup"><input type="checkbox" name="share">
        <span>${esc(t('shareSetup'))}<small>${esc(t('shareSetupHelp'))}</small></span></label>` : ''}
      <p class="error" id="err" role="alert"></p>
      <button class="primary" type="submit">${esc(t('save'))}</button>
      <span class="ok" id="ok" hidden>✓ ${esc(t('saved'))}</span>
    </form>
    ${first ? '' : settingsExtrasHtml()}`;
  wireStations($('#setup'));
  if (first) wireTicketFields($('#setup'), tk); else renderTickets();
  wireRoutes();
  $('#setup').addEventListener('submit', e => { e.preventDefault(); saveSetup(first); });
  wireImport();
  if (!first) wireSettingsExtras();
}

/* Formats a field while typing (reference code XXX-XXX-XXX, dd/mm/yyyy, hh:mm) and keeps the cursor next to
   the same character. Backspace right after a separator also removes the character before it; otherwise the
   formatter would put the separator straight back and Backspace would seem stuck. */
const isSig = ch => /[A-Za-z0-9]/.test(ch);
function wireFormat(input, format) {
  if (!input) return;
  let prev = null;
  input.addEventListener('beforeinput', () => {
    prev = { v: input.value, s: input.selectionStart, e: input.selectionEnd };
  });
  input.addEventListener('input', e => {
    let raw = input.value, pos = input.selectionStart ?? raw.length;
    if (e.inputType === 'deleteContentBackward' && prev && prev.s === prev.e && prev.s > 1 && !isSig(prev.v[prev.s - 1])) {
      raw = prev.v.slice(0, prev.s - 2) + prev.v.slice(prev.s);
      pos = prev.s - 2;
    }
    const atEnd = pos >= raw.length;
    const sig = [...raw.slice(0, pos)].filter(isSig).length;
    const v = format(raw);
    if (v !== input.value) input.value = v;
    let p = v.length;
    if (!atEnd) {
      p = 0;
      for (let seen = 0; p < v.length && seen < sig; p += 1) if (isSig(v[p])) seen += 1;
    }
    input.setSelectionRange(p, p);
  });
}

function ticketFieldsHtml(tk) {
  const other = core.isOtherTicket(tk);
  return `<fieldset class="tkkind"><legend>${esc(t('ticketFrom'))}</legend>
      <label class="check"><input type="radio" name="kind" value="vy" ${other ? '' : 'checked'}> ${esc(t('kindVy'))}</label>
      <label class="check"><input type="radio" name="kind" value="other" ${other ? 'checked' : ''}> ${esc(t('kindOther'))}</label>
    </fieldset>
    <label data-kind="vy" ${other ? 'hidden' : ''}>${esc(t('refCode'))}<input name="code" value="${esc(tk.code || '')}" placeholder="${esc(t('refCodePh'))}" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="11"></label>
    ${IAB() ? `<fieldset data-kind="other" class="tkkind tkimg" ${other ? '' : 'hidden'}><legend>${esc(t('ticketImage'))}</legend>
      <label class="check"><input type="radio" name="imgMode" value="self" ${tk.image ? '' : 'checked'}> ${esc(t('imgSelf'))}</label>
      <label class="check"><input type="radio" name="imgMode" value="store" ${tk.image ? 'checked' : ''}> ${esc(t('imgStore'))}</label>
      <div data-img-store ${tk.image ? '' : 'hidden'}>
        <label><input type="file" name="ticketImage" accept="image/*"><small>${esc(t('ticketImageHelp'))}</small></label>
        <div class="tkimg-preview"></div>
      </div>
    </fieldset>` : ''}
    <label data-kind="other" ${other ? '' : 'hidden'}>${esc(t('ticketNumber'))}<input name="number" value="${esc(tk.number || '')}" inputmode="numeric" maxlength="20" autocomplete="off" placeholder="1234567890"><small>${esc(t('ticketNumberHelp'))}</small></label>
    <div class="row">${dateFields('validFrom', tk.validFrom)}${dateFields('validTo', tk.validTo)}</div>
    <label class="tkperiod" hidden>${esc(t('ticketPeriod'))}<select name="period">
      <option value="">${esc(t('periodPick'))}</option>
      ${['single', 'day', 'week', 'month', 'year'].map(k => `<option value="${k}">${esc(t(`period_${k}`))}</option>`).join('')}
    </select><small>${esc(t('ticketPeriodHelp'))}</small></label>`;
}

/** Reads and checks the ticket fields: {ticket} or {error}. Tickets from Ruter/Entur need their dates, so each
    trip uses the right one. */
function readTicket(root, requireDates) {
  const val = n => root.querySelector(`[name=${n}]`)?.value || '';
  const kind = root.querySelector('[name=kind]:checked')?.value === 'other' ? 'other' : 'vy';
  let validFrom = core.parseEuDateTime(val('validFromDate'), val('validFromTime'));
  let validTo = core.parseEuDateTime(val('validToDate'), val('validToTime'));
  if (Number.isNaN(validFrom) || Number.isNaN(validTo)) return { error: t('errDate') };
  /* only one date known (a receipt shows either the purchase or the expiry): the chosen period gives the other */
  if (Boolean(validFrom) !== Boolean(validTo)) {
    const period = val('period');
    if (!period) return { error: t('errPeriod') };
    if (validFrom) validTo = core.shiftByPeriod(validFrom, period, 1);
    else validFrom = core.shiftByPeriod(validTo, period, -1);
  }
  if ((requireDates || kind === 'other') && (!validFrom || !validTo)) return { error: t('errTicketDates') };
  if (validFrom && validTo && validTo <= validFrom) return { error: t('errDates') };
  if (kind === 'vy') {
    const code = core.validRef(val('code'));
    return code ? { ticket: { kind, code, validFrom, validTo } } : { error: t('errRef') };
  }
  const number = val('number').replace(/\D/g, '');
  if (number && !/^\d{4,20}$/.test(number)) return { error: t('errTicketNumber') };
  /* The picture choice exists only in the Android app; on the website an existing picture is simply kept. */
  const mode = root.querySelector('[name=imgMode]:checked')?.value;
  const image = mode === 'self' ? null : ticketImages.get(root) || null;  /* "I'll upload it myself": nothing stored */
  return { ticket: { kind, code: '', number, validFrom, validTo, ...(image ? { image } : {}) } };
}

const ticketLabel = tk => (core.isOtherTicket(tk) ? `${t('kindOtherShort')}${tk.number ? ` ${tk.number}` : ''}` : tk.code);

/* Shrinks a photo/screenshot of the ticket to at most 1600 px (JPEG) so it fits in the device's storage. */
async function ticketImageData(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

/* The chosen ticket picture per ticket form (kept beside the element: a <form> can't take extra properties named
   like its own fields). */
const ticketImages = new WeakMap();

function wireTicketFields(root, existing = null) {
  ticketImages.set(root, existing?.image || null);
  /* show "how long is the ticket valid?" when exactly one of the two dates is filled in */
  const periodBox = root.querySelector('.tkperiod');
  const syncPeriod = () => {
    const from = root.querySelector('[name=validFromDate]').value.trim(), to = root.querySelector('[name=validToDate]').value.trim();
    periodBox.hidden = Boolean(from) === Boolean(to);
  };
  ['validFromDate', 'validToDate'].forEach(n => root.querySelector(`[name=${n}]`).addEventListener('input', syncPeriod));
  syncPeriod();
  const preview = root.querySelector('.tkimg-preview');
  root.querySelectorAll('[name=imgMode]').forEach(r => r.addEventListener('change', () => {
    root.querySelector('[data-img-store]').hidden = root.querySelector('[name=imgMode]:checked').value !== 'store';
  }));
  const showPreview = () => {
    if (!preview) return;
    const img = ticketImages.get(root);
    preview.innerHTML = img ? `<img src="${esc(img)}" alt=""> <button type="button" class="link danger-link" data-drop-image>${esc(t('remove'))}</button>` : '';
    preview.querySelector('[data-drop-image]')?.addEventListener('click', () => { ticketImages.set(root, null); showPreview(); });
  };
  showPreview();
  root.querySelector('[name=ticketImage]')?.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { ticketImages.set(root, await ticketImageData(f)); showPreview(); } catch { alert(t('ticketImageBad')); }
    e.target.value = '';
  });
  root.querySelectorAll('[name=kind]').forEach(r => r.addEventListener('change', () => {
    const kind = root.querySelector('[name=kind]:checked').value;
    root.querySelectorAll('[data-kind]').forEach(el => { el.hidden = el.dataset.kind !== kind; });
  }));
  wireFormat(root.querySelector('[name=code]'), core.formatRef);
  for (const n of ['validFrom', 'validTo']) {
    wireFormat(root.querySelector(`[name=${n}Date]`), core.formatDateInput);
    wireFormat(root.querySelector(`[name=${n}Time]`), core.formatTimeInput);
  }
}

/* Settings: the tickets as a list (edit / remove), and a small form with its own Save for adding or editing one.
   Tickets are saved on their own, never by the page's main Save. mode: null | 'new' | {idx}. */
function renderTickets(mode = null, saved = false) {
  const box = $('#tickets');
  const tickets = store.get().tickets;
  const now = Date.now();
  const editing = mode === 'new' ? { kind: 'vy', code: '', validFrom: null, validTo: null } : mode ? tickets[mode.idx] : null;
  box.innerHTML = `
    ${tickets.length ? `<ul class="tickets">${tickets.map((tk, i) => `
      <li><div><code>${esc(ticketLabel(tk))}</code> ${core.ticketFor([tk], now) ? `<span class="pill">${esc(t('validNow'))}</span>` : ''}
        <small>${tk.validFrom ? esc(fmtDate(tk.validFrom, true)) : '?'} – ${tk.validTo ? esc(fmtDate(tk.validTo, true)) : '?'}</small></div>
        <span class="tk-acts"><button type="button" class="link" data-edit-ticket="${i}">${esc(t('editTicket'))}</button>
        <button type="button" class="link danger-link" data-remove-ticket="${i}">${esc(t('remove'))}</button></span></li>`).join('')}</ul>`
    : `<p class="muted">${esc(t('noticeNone'))}</p>`}
    ${editing ? `<div class="ticketform">
        <h3>${esc(mode === 'new' ? t('addTicket') : t('editTicket'))}</h3>
        ${ticketFieldsHtml(editing)}
        <p class="error" id="tkErr" role="alert"></p>
        <div class="actions"><button type="button" id="tkCancel">${esc(t('cancel'))}</button>
          <button type="button" class="primary" id="tkSave">${esc(t('saveTicket'))}</button></div>
      </div>`
    : `<button type="button" class="link" id="newTicket">＋ ${esc(t('addTicket'))}</button>`}
    ${saved ? `<p class="ok">✓ ${esc(t('ticketSaved'))}</p>` : ''}`;
  $('#noticeBox').innerHTML = noticeHtml();
  $('#newTicket')?.addEventListener('click', () => { renderTickets('new'); box.querySelector('[name=code]').focus(); });
  box.querySelectorAll('[data-edit-ticket]').forEach(b => b.addEventListener('click', () => renderTickets({ idx: Number(b.dataset.editTicket) })));
  box.querySelectorAll('[data-remove-ticket]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('removeTicketConfirm'))) return;
    store.update(st => { st.tickets.splice(Number(b.dataset.removeTicket), 1); });
    if (store.get().tickets.length) renderTickets(); else render();  /* no ticket left: back to setup */
  }));
  if (!editing) return;
  const form = box.querySelector('.ticketform');
  wireTicketFields(form, editing);
  $('#tkCancel').onclick = () => renderTickets();
  $('#tkSave').onclick = () => {
    const res = readTicket(form, true);  /* a dated ticket is only used for its own trips */
    if (res.error) { $('#tkErr').textContent = res.error; return; }
    const tk = res.ticket;
    const ok = store.update(st => {
      if (mode !== 'new') st.tickets.splice(mode.idx, 1);
      st.tickets = st.tickets.filter(x => core.ticketId(x) !== core.ticketId(tk));  /* same ticket again: replaces it */
      st.tickets.push(tk);
      st.tickets.sort((a, b) => (a.validFrom || 0) - (b.validFrom || 0));
    });
    if (!ok) { $('#tkErr').textContent = t('storageFull'); return; }
    renderTickets(null, true);
  };
}

/** One regular trip: two stations and the usual departure times each way. */
function routeHtml(r) {
  return `<fieldset class="route" data-route>
      <legend>${esc(t('route'))}</legend>
      <div class="row">${stationField('from', r?.a)}${stationField('to', r?.b)}</div>
      <div class="row">
        <label>${esc(t('timesOut'))}<input name="timesOut" value="${esc((r?.timesOut || []).join(', '))}" placeholder="07:15, 08:15" autocomplete="off"></label>
        <label>${esc(t('timesBack'))}<input name="timesBack" value="${esc((r?.timesBack || []).join(', '))}" placeholder="16:30" autocomplete="off"></label>
      </div>
      <small>${esc(t('timesHelp'))}</small>
      <button type="button" class="link danger-link" data-remove-route>${esc(t('removeRoute'))}</button>
    </fieldset>`;
}

/* The remove link only shows when there is more than one trip; removal takes effect on Save. */
function wireRoutes() {
  const box = $('#routes');
  const sync = () => box.querySelectorAll('[data-remove-route]').forEach(b => { b.hidden = box.children.length < 2; });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-remove-route]');
    if (b) { b.closest('[data-route]').remove(); sync(); }
  });
  $('#addRoute').addEventListener('click', () => {
    box.insertAdjacentHTML('beforeend', routeHtml(null));
    const added = box.lastElementChild;
    wireStations(added);
    sync();
    added.querySelector('input').focus();
  });
  sync();
}

function stationField(key, value) {
  return `<label class="station">${esc(t(key))}
    <input name="${key}" value="${esc(value?.name || '')}" data-id="${esc(value?.id || '')}" placeholder="${esc(t('stationPh'))}" autocomplete="off" role="combobox" aria-expanded="false">
    <ul class="suggest" hidden></ul></label>`;
}

function wireStations(root) {
  root.querySelectorAll('label.station').forEach(label => {
    const input = label.querySelector('input');
    const list = label.querySelector('.suggest');
    let timer;
    input.addEventListener('input', () => {
      input.dataset.id = '';
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const hits = await data.searchStations(input.value);
          list.innerHTML = hits.map(h => `<li><button type="button" data-id="${esc(h.id)}">${esc(h.name)}</button></li>`).join('');
          list.hidden = !hits.length;
          input.setAttribute('aria-expanded', String(!!hits.length));
        } catch {
          list.innerHTML = `<li class="muted small">${esc(t('searchFailed'))}</li>`;
          list.hidden = false;
        }
      }, 250);
    });
    list.addEventListener('click', e => {
      const b = e.target.closest('button[data-id]');
      if (!b) return;
      input.value = b.textContent;
      input.dataset.id = b.dataset.id;
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    });
  });
}

function saveSetup(first) {
  const f = $('#setup');
  const err = msg => { $('#err').textContent = msg; return false; };
  let ticket = null;  /* only the first-time setup has ticket fields; Settings saves tickets on their own */
  if (first) {
    const res = readTicket(f, false);
    if (res.error) return err(res.error);
    ticket = res.ticket;
  }
  const name = f.name.value.trim();
  if (!name) return err(t('errName'));
  const email = core.validEmail(f.email.value);
  if (!email) return err(t('errEmail'));
  const account = core.validAccount(f.account.value);
  if (!account) return err(t('errAccount'));
  const routes = [];
  for (const fs of f.querySelectorAll('[data-route]')) {
    const field = n => fs.querySelector(`[name=${n}]`);
    if (!['from', 'to', 'timesOut', 'timesBack'].some(n => field(n).value.trim())) continue;  /* empty extra block */
    const a = pickedStation(field('from')), b = pickedStation(field('to'));
    if (!a || !b) return err(t('errStation'));
    if (a.id === b.id) return err(t('errSame'));
    const timesOut = core.parseTimes(field('timesOut').value), timesBack = core.parseTimes(field('timesBack').value);
    if (!timesOut || !timesBack) return err(t('errTimes'));
    routes.push({ a, b, timesOut, timesBack });
  }
  if (!routes.length) return err(t('errStation'));
  store.update(s => {
    if (ticket) {
      s.tickets = s.tickets.filter(x => core.ticketId(x) !== core.ticketId(ticket));
      s.tickets.push(ticket);
      s.tickets.sort((a, b) => (a.validFrom || 0) - (b.validFrom || 0));
    }
    Object.assign(s.profile, { name, email, account, routes });
  });
  $('#err').textContent = '';
  if (first && f.share?.checked) setShare(true);  /* unticked: the Claims page asks once later, with real numbers */
  if (first) { go('trips'); return true; }
  render();
  $('#ok').hidden = false;
  return true;
}

/** {id, name} if a station was picked from the suggestions, else null. */
function pickedStation(input) {
  return input.dataset.id ? { id: input.dataset.id, name: input.value } : null;
}

function settingsExtrasHtml() {
  return `
    <section class="card">
      <h2>${esc(t('bookmarkTitle'))}</h2>
      <p>${esc(t('bookmarkBody'))}</p>
      <p class="center"><a class="bookmarklet" href="${esc(BOOKMARKLET)}" id="bm"><img src="icons/ghost-32.png" width="22" height="22" alt=""><span class="vh">👻 </span>Innstilt: fyll ut</a></p>
      <label class="check"><input type="checkbox" id="bmHave" ${store.get().bookmarkDone ? 'checked' : ''}> ${esc(t('bmHave'))}</label>
    </section>
    <section class="card">
      <h2>${esc(t('yourData'))}</h2>
      <p class="muted">${esc(t('privacyBody'))}</p>
      ${stats.enabled() ? `<label class="check"><input type="checkbox" id="share" ${store.get().stats.share ? 'checked' : ''}> ${esc(t('shareSetting'))}</label>` : ''}
      <p class="help">${esc(t('moveHelp'))}</p>
      <button type="button" id="export">${esc(t('exportData'))}</button>
      ${importHtml(true)}
      <button type="button" class="danger" id="wipe">${esc(t('deleteData'))}</button>
    </section>`;
}

function wireSettingsExtras() {
  $('#bm').addEventListener('click', e => { e.preventDefault(); alert(t('bookmarkClick')); });
  $('#bmHave').addEventListener('change', e => store.update(st => { st.bookmarkDone = e.target.checked; }));
  $('#share')?.addEventListener('change', e => setShare(e.target.checked));
  $('#export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.exportJson()], { type: 'application/json' }));
    a.download = `innstilt-${core.todayOslo()}.json`;
    a.click();
  };
  $('#wipe').onclick = () => {
    if (confirm(t('deleteConfirm'))) { store.wipe(); go('trips'); }
  };
}

/** "Support us" at the bottom of Trips (hidden while DONATE_URL is empty). */
function supportHtml() {
  if (!DONATE_URL) return '';
  return `<aside class="support">
    <p><strong>${esc(t('supportTitle'))}</strong> ${esc(t('supportBody'))}</p>
    <a class="support-btn" href="${esc(DONATE_URL)}" target="_blank" rel="noopener noreferrer">
      <img src="icons/ghost-32.png" width="22" height="22" alt=""> ${esc(t('supportBtn'))}</a>
  </aside>`;
}

/** Invitation to the Android app's closed test: join the Google Group, then opt in and install via Play. */
function testerHtml(dismissable = false) {
  return `<section class="card testercard">
    <h2>📱 ${esc(t('testerTitle'))}</h2>
    <p>${esc(t('testerBody'))}</p>
    <ol class="steps">
      <li><a href="${esc(TESTER_GROUP_URL)}" target="_blank" rel="noopener noreferrer">${esc(t('testerStep1'))}</a></li>
      <li><a href="${esc(TESTER_PLAY_URL)}" target="_blank" rel="noopener noreferrer">${esc(t('testerStep2'))}</a></li>
    </ol>
    <p class="muted small">${esc(t('testerNote'))}</p>
    ${dismissable ? `<div class="actions"><button type="button" id="testerLater">${esc(t('testerNo'))}</button></div>` : ''}
  </section>`;
}

/** How to put Innstilt on the home screen; `beforeSetup` adds the iPhone note about separate storage. */
function homeHtml(beforeSetup) {
  return `<h2>📲 ${esc(t('homeTitle'))}</h2>
    <p>${esc(isIos() ? t('homeIos') : t('homeAndroid'))}</p>
    ${isIos() && beforeSetup ? `<p class="muted small">${esc(t('homeIosNote'))}</p>` : ''}
    <button type="button" class="primary" data-install ${installPrompt ? '' : 'hidden'}>${esc(t('homeInstall'))}</button>`;
}

function wireInstall() {
  document.querySelectorAll('[data-install]').forEach(b => b.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null;
    if (outcome === 'accepted') { store.update(s => { s.homeDone = true; }); document.querySelectorAll('.homecard').forEach(c => c.remove()); }
  }));
}

function importHtml(asButton = false) {
  return `<button type="button" class="${asButton ? '' : 'link'}" id="importBtn">${esc(t('importData'))}</button>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
    <span class="ok" id="importMsg" role="status" hidden></span>`;
}

function wireImport() {
  const file = $('#importFile');
  if (!file) return;
  $('#importBtn').onclick = () => file.click();
  file.onchange = async () => {
    const f = file.files[0];
    file.value = '';
    if (!f) return;
    const msg = $('#importMsg');
    if (f.size > 5_000_000) { msg.textContent = t('importBad'); msg.className = 'error'; msg.hidden = false; return; }
    if (store.isReady() && !confirm(t('importConfirm'))) return;
    let res;
    try { res = store.importJson(await f.text()); } catch {
      msg.textContent = t('importBad'); msg.className = 'error'; msg.hidden = false; return;
    }
    if (res.dropId && stats.enabled()) stats.send({ id: res.dropId, months: {} }).catch(() => {});  /* old id: deleted */
    render();
    const after = $('#importMsg');
    if (after) {
      after.textContent = `✓ ${t('importDone', res)}${res.sharing ? ` ${t('importSharing')}` : ''}`;
      after.className = 'ok';
      after.hidden = false;
    }
  };
}

function noticeHtml() {
  const n = core.ticketNotice(store.get().tickets);
  if (!n) return '';
  const key = { none: 'noticeNone', undated: 'noticeUndated', expired: 'noticeExpired', expiring: 'noticeExpiring' }[n.kind];
  return `<p class="notice">ℹ️ ${esc(t(key, { date: n.date ? fmtDate(n.date, true) : '' }))}</p>`;
}

/* ------------------------------------------------------------------ trips */

let tripsRun = 0;
const HOUR = 3600000;
const LIVE_LOOKBACK = 3 * HOUR;

/** Today's trains from `from` to `to`, departing between two instants, from Entur's live data. */
async function liveForRoute(from, to, startMs, endMs) {
  const calls = await data.liveCalls(from.id, startMs, endMs);
  return calls.map(c => core.liveJourney(c, from.id, to.id)).filter(Boolean).sort((a, b) => a.depMs - b.depMs);
}

async function viewTrips() {
  const run = ++tripsRun;
  const s = store.get();
  const p = s.profile;
  $('#main').innerHTML = `
    <h1>${esc(t('tripsTitle'))}</h1>
    ${noticeHtml()}
    ${!isTouch() && !s.bookmarkDone ? `<section class="card bmcard">
      <h2>${esc(t('bmCardTitle'))}</h2><p>${esc(t('bmCardBody'))}</p>
      <p class="center"><a class="bookmarklet" href="${esc(BOOKMARKLET)}" id="bm"><img src="icons/ghost-32.png" width="22" height="22" alt=""><span class="vh">👻 </span>Innstilt: fyll ut</a></p>
      <div class="actions"><button type="button" id="bmLater">${esc(t('bmLater'))}</button>
        <button type="button" class="primary" id="bmDone">${esc(t('bmDone'))}</button></div></section>` : ''}
    ${wantsTester() && !s.testerDone ? testerHtml(true) : ''}
    ${wantsHomeScreen() && !wantsTester() && !s.homeDone ? `<section class="card homecard">${homeHtml(false)}
      <div class="actions"><button type="button" id="homeLater">${esc(t('bmLater'))}</button>
        <button type="button" class="primary" id="homeDone">${esc(t('bmDone'))}</button></div></section>` : ''}
    <details class="card fold now" id="now" hidden><summary></summary><div class="now-body"></div></details>
    <details class="card fold jabfold" data-jab-fold hidden><summary></summary><div class="jab-body"></div></details>
    ${otherTripHtml()}
    <p class="muted">${esc(t('tripsIntro', { min: core.DEFAULT_THRESHOLD, days: core.CLAIM_DEADLINE_DAYS }))}</p>
    <div id="trips"></div>
    <p class="muted" id="progress"></p>
    ${supportHtml()}`;
  $('#bm')?.addEventListener('click', e => { e.preventDefault(); alert(t('bookmarkClick')); });
  $('#bmDone')?.addEventListener('click', () => { store.update(st => { st.bookmarkDone = true; }); $('.bmcard').remove(); });
  $('#bmLater')?.addEventListener('click', () => $('.bmcard').remove());
  $('#homeLater')?.addEventListener('click', () => $('.homecard').remove());
  $('#testerLater')?.addEventListener('click', () => { store.update(st => { st.testerDone = true; }); $('.testercard').remove(); });
  $('#homeDone')?.addEventListener('click', () => { store.update(st => { st.homeDone = true; }); $('.homecard').remove(); });
  wireInstall();
  wireOtherTrip();
  fillJab();
  startNowBoard(run);
  const [index, slim] = await Promise.all([data.loadIndex(), data.loadClaimsIndex()]);
  const today = core.todayOslo();
  const oldest = core.addDays(today, -core.CLAIM_DEADLINE_DAYS);
  const days = (index?.days || []).filter(d => d >= oldest && d < today).sort().reverse();
  let failedDays = index ? 0 : -1, liveFailed = false;  /* -1 = the list of days itself failed */
  const done = new Set(s.claims.map(c => c.key));
  const pairs = p.routes.flatMap(r => [[r.a, r.b, r.timesOut], [r.b, r.a, r.timesBack]]);
  let shown = 0, urgent = 0, skipped = new Set();
  const sections = [];  /* {sec, day, items}: days whose "next train" lines are filled in afterwards */

  /* Today comes live from Entur (real-time info only lasts until about an hour after a train arrives, so
     the last few hours); earlier days come from the nightly archive files. */
  const now = Date.now();
  for (const day of [today, ...days]) {
    if (run !== tripsRun) return;  /* user navigated away */
    const isToday = day === today;
    $('#progress').textContent = isToday ? t('loadingLive') : t('loading', { date: fmtDay(day) });
    let routeJourneys;
    if (isToday) {
      routeJourneys = (from, to) => liveForRoute(from, to, now - LIVE_LOOKBACK, now + HOUR)
        .catch(() => { liveFailed = true; return []; });
    } else if (slim?.days?.[day]) {
      /* fast path: only the possibly-claimable trains of the day */
      const dayData = { date: day, stops: slim.stops, journeys: slim.days[day] };
      routeJourneys = async (from, to) => core.journeysForRoute(dayData, from.id, to.id);
    } else {
      let dayData;
      try { dayData = await data.loadDay(day); } catch { failedDays += 1; continue; }
      routeJourneys = async (from, to) => core.journeysForRoute(dayData, from.id, to.id);
    }
    const partial = !isToday && Boolean(slim?.days?.[day]);  /* no "next train" from the slim list */
    const items = [], seen = new Set();  /* two routes may share a leg */
    for (const [from, to, times] of pairs) {
      const js = await routeJourneys(from, to);
      for (const j of js) {
        if (!core.claimable(j, now) || !core.nearUsual(j, times)) continue;
        const key = store.claimKey(from.id, to.id, j.depMs);
        if (done.has(key) || seen.has(key)) continue;
        seen.add(key);
        if (!core.ticketFor(s.tickets, j.depMs)) { skipped.add(day); continue; }
        items.push({ from, to, j, next: j.cancelled && !partial ? core.nextTrain(js, j) : null });
      }
    }
    if (!items.length || run !== tripsRun) continue;
    items.sort((a, b) => a.j.depMs - b.j.depMs);
    shown += items.length;
    if (core.daysLeft(day) <= core.DEADLINE_WARN_DAYS) urgent += items.length;
    const sec = document.createElement('section');
    sec.className = 'day';
    sec.innerHTML = `<h2>${esc(fmtDay(day))}${isToday ? ` <span class="pill live">${esc(t('live'))}</span>` : ''}</h2>` + items.map((it, i) => tripHtml(it, `${day}-${i}`)).join('');
    $('#trips').appendChild(sec);
    wireTrips(sec, items);
    if (partial && items.some(it => it.j.cancelled)) sections.push({ sec, day, items });
  }
  if (run !== tripsRun) return;
  $('#progress').textContent = (skipped.size ? t('noTicketDay', { n: skipped.size }) + ' ' : '');
  const problems = [failedDays < 0 ? t('dataFailed') : failedDays ? t('daysFailed', { n: failedDays }) : '',
    liveFailed ? t('liveFailedShort') : ''].filter(Boolean);
  if (!shown && !problems.length) $('#trips').innerHTML = `<p class="empty">${esc(t('noTrips'))}</p>`;
  if (problems.length) {
    $('#trips').insertAdjacentHTML('afterbegin', `<div class="notice problem" role="alert">⚠️ ${esc(problems.join(' '))}
      ${navigator.onLine ? '' : esc(t('offlineHint'))} <button type="button" class="link" id="retry">${esc(t('retry'))}</button></div>`);
    $('#retry').onclick = () => render();
  }
  /* the list is newest first, so trips about to expire are at the bottom: say so at the top */
  if (urgent) $('#trips').insertAdjacentHTML('afterbegin', `<p class="notice urgent">⏳ ${esc(t('urgentTop', { n: urgent }))}</p>`);
  fillNextTrains(sections, run);
}

/* For cancelled trips listed from the slim file: the "next train … N min later" line needs all trains of the
   day, so that day's full file is loaded, but only once its section is scrolled into view. Days nobody
   looks at are never downloaded. */
function fillNextTrains(sections, run) {
  if (!sections.length) return;
  const byEl = new Map(sections.map(s => [s.sec, s]));
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      if (run === tripsRun) fillNextTrainsDay(byEl.get(e.target), run);
      else io.disconnect();
    }
  }, { rootMargin: '400px 0px' });
  sections.forEach(s => io.observe(s.sec));
}

async function fillNextTrainsDay({ sec, day, items }, run) {
  let full;
  try { full = await data.loadDay(day); } catch { return; }
  if (run !== tripsRun || !sec.isConnected) return;
  const done = new Set(store.get().claims.map(c => c.key));
  const left = items.filter(it => !done.has(store.claimKey(it.from.id, it.to.id, it.j.depMs)));
  for (const it of left) {
    if (!it.j.cancelled) continue;
    const js = core.journeysForRoute(full, it.from.id, it.to.id);
    const same = js.find(x => x.depMs === it.j.depMs && x.line === it.j.line);
    it.next = same ? core.nextTrain(js, same) : null;
  }
  sec.innerHTML = `<h2>${esc(fmtDay(day))}</h2>` + left.map((it, i) => tripHtml(it, `${day}-${i}`)).join('');
  wireTrips(sec, left);
}

function statusHtml(j) {
  if (j.notRun) return `<span class="badge bad">${esc(t('notRun'))}</span><small class="notrun">${esc(t('notRunHelp'))}</small>`;
  if (j.cancelled) return `<span class="badge bad">${esc(t('cancelled'))}</span>`;
  if (j.delayMin === null && j.expectedMin != null) {
    const cls = j.expectedMin > core.DEFAULT_THRESHOLD ? 'warn' : 'quiet';
    return `<span class="badge ${cls}">${esc(j.expectedMin > 1 ? t('expLate', { min: j.expectedMin }) : t('expOnTime'))}</span>`;
  }
  if (j.delayMin === null && j.live) {
    return `<span class="badge quiet">${esc(j.depMs > Date.now() ? t('planned') : t('dataTonight'))}</span>`;
  }
  if (j.delayMin === null) return `<span class="badge quiet">${esc(t('noData'))}</span>`;
  if (core.eligible(j)) return `<span class="badge warn">${esc(t('late', { min: j.delayMin }))}</span>`;
  return `<span class="badge quiet">${esc(j.delayMin <= 1 ? t('onTime') : t('late', { min: j.delayMin }))}</span>`;
}

/** `action` replaces the claim button (e.g. "sent ✓") when the trip can't be claimed. */
function tripHtml({ from, to, j, next }, id, action = null) {
  const nx = next ? `<small>${esc(t('nextTrain', {
    line: next.line, time: next.dep, min: core.effectiveDelay(j, next) }))}</small>` : '';
  /* With several tickets, show which one the claim uses; if more than one was valid then, let the user pick. */
  const all = store.get().tickets;
  const valid = action === null && all.length > 1 ? core.ticketsFor(all, j.depMs) : [];
  const tk = valid.length > 1
    ? `<label class="tk-pick">🎫 <select data-ticket="${esc(id)}" aria-label="${esc(t('whichTicket'))}">${valid.map(v =>
        `<option value="${esc(core.ticketId(v))}">${esc(ticketLabel(v))}</option>`).join('')}</select></label>`
    : valid.length ? `<small class="tk">🎫 ${esc(ticketLabel(valid[0]))}</small>` : '';
  return `<article class="trip">
    <div class="when"><strong>${esc(j.dep)}</strong><span>${esc(j.line)}</span></div>
    <div class="what">${esc(from.name.replace(/ stasjon$/, ''))} → ${esc(to.name.replace(/ stasjon$/, ''))} ${statusHtml(j)}${nx}${tk}</div>
    ${action === null && core.daysLeft(j.date) <= core.DEADLINE_WARN_DAYS ? `<small class="deadline">⏳ ${esc(
      core.daysLeft(j.date) <= 0 ? t('lastDay') : t('daysLeft', { n: core.daysLeft(j.date) }))}</small>` : ''}
    ${action === null ? `<div class="acts"><button class="primary" data-claim="${esc(id)}">${esc(t('claimBtn'))}</button>
      <button type="button" class="link small" data-done="${esc(id)}">${esc(t('alreadyClaimed'))}</button></div>`
    : `<span class="muted">${esc(action)}</span>`}
  </article>`;
}

/** Wires the claim and "already claimed" buttons of rendered trips; `items` are indexed by the id's last part. */
function wireTrips(root, items) {
  const pick = b => items[Number((b.dataset.claim ?? b.dataset.done).split('-').pop())];
  root.querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => {
    const chosen = b.closest('.trip').querySelector('select[data-ticket]')?.value;  /* several valid tickets */
    startClaim({ ...pick(b), ticketCode: chosen });
  }));
  root.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', () => {
    const { from, to, j } = pick(b);
    recordClaim(from, to, j, '', true);  /* claimed before, outside Innstilt */
    const row = b.closest('.trip');
    const day = row.closest('.day');
    row.remove();
    if (day && !day.querySelector('.trip')) day.remove();
    if (!root.closest('#otherResult') && !$('#trips .trip')) $('#trips').innerHTML = `<p class="empty">${esc(t('noTrips'))}</p>`;
    if (root.closest('#otherResult')) findOther(otherQuery);
  }));
}

function recordClaim(from, to, j, caseNo, earlier = false) {
  const key = store.claimKey(from.id, to.id, j.depMs);
  if (!caseNo && store.get().pendingCases?.[key]) caseNo = store.get().pendingCases[key];  /* caught by the bookmarklet */
  store.update(st => { if (st.pendingCases) delete st.pendingCases[key]; });
  store.update(st => st.claims.push({
    key: store.claimKey(from.id, to.id, j.depMs), fromId: from.id, toId: to.id,
    fromName: from.name, toName: to.name, date: j.date, dep: j.dep, line: j.line, depMs: j.depMs,
    case: caseNo, status: 'pending', amount: null, sentAt: Date.now(), ...(earlier ? { earlier: true } : {}),
  }));
}

/* ------------------------------------------------------------------ another trip (one-off search) */

let otherQuery = null;  /* the last search, so the panel survives the re-render after a claim */

function otherTripHtml() {
  const q = otherQuery;
  const [d, tm] = q ? [q.rawDate, q.rawTime] : ['', ''];
  const [today, now] = core.formatEu(Date.now());  /* grey placeholders = what a blank box means */
  return `<details class="card fold other" id="other" ${q ? 'open' : ''}>
    <summary>${esc(t('otherTrip'))}</summary>
    <form id="otherForm" novalidate>
      <p class="help">${esc(t('otherHelp'))}</p>
      <div class="row">${stationField('from', q?.from)}${stationField('to', q?.to)}</div>
      <div class="row">
        <label>${esc(t('date'))}<input name="date" value="${esc(d)}" placeholder="${esc(today)}" inputmode="numeric" maxlength="10" autocomplete="off"></label>
        <label>${esc(t('approxTime'))}<input name="time" value="${esc(tm)}" placeholder="${esc(now)}" inputmode="numeric" maxlength="5" autocomplete="off"></label>
      </div>
      <p class="error" id="otherErr" role="alert"></p>
      <button class="primary" type="submit">${esc(t('findTrains'))}</button>
    </form>
    <div id="otherResult" aria-live="polite"></div>
  </details>`;
}

function wireOtherTrip() {
  const f = $('#otherForm');
  wireStations(f);
  wireFormat(f.date, core.formatDateInput);
  wireFormat(f.time, core.formatTimeInput);
  f.addEventListener('submit', e => {
    e.preventDefault();
    const err = msg => { $('#otherErr').textContent = msg; };
    const from = pickedStation(f.from), to = pickedStation(f.to);
    if (!from || !to) return err(t('errStation'));
    if (from.id === to.id) return err(t('errSame'));
    /* a blank box means the grey suggestion in it (today / now) */
    const rawDate = f.date.value.trim(), rawTime = f.time.value.trim();
    const ms = core.parseEuDateTime(rawDate || f.date.placeholder, '12:00');
    if (!ms) return err(t('errDate'));
    const times = core.parseTimes(rawTime || f.time.placeholder);
    if (!times || times.length !== 1) return err(t('errTimes'));
    err('');
    otherQuery = { from, to, date: core.todayOslo(ms), rawDate, rawTime, time: times[0] };
    findOther(otherQuery);
  });
  if (otherQuery) findOther(otherQuery);
}

async function findOther(q) {
  const box = $('#otherResult');
  const say = msg => { box.innerHTML = `<p class="muted">${esc(msg)}</p>`; };
  const today = core.todayOslo();
  if (q.date > today) return say(t('otherFuture'));
  if (q.date < core.addDays(today, -core.CLAIM_DEADLINE_DAYS)) return say(t('otherTooOld', { days: core.CLAIM_DEADLINE_DAYS }));
  let all;
  if (q.date === today) {
    say(t('loadingLive'));
    const at = core.osloToMs(q.date, q.time);  /* ±2 h, plus an hour after for "next train" */
    try { all = await liveForRoute(q.from, q.to, at - 2 * HOUR, at + 3 * HOUR); } catch { return say(t('liveFailed')); }
  } else {
    say(t('loading', { date: fmtDay(q.date) }));
    const index = await data.loadIndex();
    if (!index) return say(t('dataFailed'));
    if (!index.days.includes(q.date)) return say(t('otherNoData'));
    let day;
    try { day = await data.loadDay(q.date); } catch { return say(t('dataFailed')); }
    all = core.journeysForRoute(day, q.from.id, q.to.id);
  }
  if (otherQuery !== q) return;  /* a newer search started meanwhile */
  const js = q.time ? all.filter(j => core.nearUsual(j, [q.time])) : all;
  if (!js.length) return say(t('otherNone'));
  const s = store.get();
  const done = new Set(s.claims.map(c => c.key));
  const items = js.map(j => ({ from: q.from, to: q.to, j, next: j.cancelled ? core.nextTrain(all, j) : null }));
  const action = ({ j }) => {
    if (done.has(store.claimKey(q.from.id, q.to.id, j.depMs))) return t('alreadySent');
    if (j.cancelled && j.depMs > Date.now()) return t('notYet');
    if (j.delayMin === null && j.expectedMin > core.DEFAULT_THRESHOLD) return t('whenArrived');
    if (!core.eligible(j)) return '';
    if (!core.ticketFor(s.tickets, j.depMs)) return t('noTicket');
    return null;
  };
  const known = s.profile.routes.some(r =>
    (r.a.id === q.from.id && r.b.id === q.to.id) || (r.a.id === q.to.id && r.b.id === q.from.id));
  box.innerHTML = `<h3>${esc(fmtDay(q.date))}${q.date === today ? ` <span class="pill live">${esc(t('live'))}</span>` : ''}</h3>`
    + items.map((it, i) => tripHtml(it, `other-${i}`, action(it))).join('')
    + (known ? '' : `<button type="button" class="link" id="saveRoute">＋ ${esc(t('saveRoute'))}</button>`);
  wireTrips(box, items);
  $('#saveRoute')?.addEventListener('click', e => {
    store.update(st => st.profile.routes.push({ a: q.from, b: q.to, timesOut: q.time ? [q.time] : [], timesBack: [] }));
    e.target.replaceWith(Object.assign(document.createElement('p'), { className: 'ok', textContent: `✓ ${t('routeSaved')}` }));
  });
}

/* ------------------------------------------------------------------ claim dialog */

function startClaim({ from, to, j, ticketCode }) {
  const s = store.get();
  const ticket = (ticketCode && s.tickets.find(x => core.ticketId(x) === ticketCode)) || core.ticketFor(s.tickets, j.depMs);
  const link = core.claimLink(s.profile, ticket, from, to, j);
  const picture = IAB() && core.isOtherTicket(ticket) ? ticket.image || null : null;  /* only the app attaches it */
  openVy(link, picture);  /* in the click handler, so pop-up blockers allow it */
  const dlg = $('#dlg');
  const train = `${j.line} ${j.dep}`;
  dlg.innerHTML = `<form method="dialog">
      <h2>${esc(t('claimTitle'))}</h2>
      <p>${esc(t(IAB() ? 'claimOpenedApp' : 'claimOpened'))}</p>
      ${IAB() ? `<p>${esc(t('claimStepsApp'))}</p>` : !isTouch() && s.bookmarkDone ? `<p>${esc(t('claimStepsBookmark'))}</p>` : `
      <p>${esc(t('claimStepsManual'))}</p>
      <ol class="steps">
        <li>${esc(t('claimStep1'))} <span class="big">${esc(j.dep)}</span></li>
        <li>${esc(t('claimStep2'))} <span class="big">${esc(train)}</span></li>
        <li>${esc(t('claimStep3'))}</li>
      </ol>
      ${isTouch() ? '' : `<p class="muted small">${esc(t('claimTip'))}</p>`}`}
      ${core.isOtherTicket(ticket) ? `<p class="notice">📎 ${esc(t(IAB() && ticket.image ? 'uploadAuto' : 'uploadTicket'))}</p>` : ''}
      <p><a href="${esc(link)}" target="_blank" rel="noopener" id="openAgain">${esc(t('openAgain'))}</a></p>
      <label>${esc(t('caseNo'))}<input name="case" inputmode="numeric" autocomplete="off"></label>
      <div class="actions">
        <button value="cancel">${esc(t('notSent'))}</button>
        <button class="primary" value="sent">${esc(t('markSent'))}</button>
      </div></form>`;
  /* The bookmarklet's "Lagre i Innstilt" (another tab) can deliver the case number while this is open. */
  const myKey = store.claimKey(from.id, to.id, j.depMs);
  const fillCase = () => {
    const n = store.get().pendingCases?.[myKey];
    const input = dlg.querySelector('[name=case]');
    if (n && input && !input.value) { input.value = n; input.classList.add('caught'); }
  };
  store.onExternalChange(() => { if (dlg.open) fillCase(); });
  addEventListener('innstilt-case', () => { if (dlg.open) fillCase(); });
  dlg.querySelector('#openAgain').addEventListener('click', e => { if (IAB()) { e.preventDefault(); openVy(link, picture); } });

  fillCase();
  dlg.onclose = () => {
    if (dlg.returnValue !== 'sent') return;
    const caseNo = (dlg.querySelector('[name=case]').value.match(/\d+/) || [''])[0];
    recordClaim(from, to, j, caseNo);
    render();
  };
  dlg.showModal();
}

/* ------------------------------------------------------------------ claims */

function viewClaims() {
  const claims = [...store.get().claims].sort((a, b) => b.depMs - a.depMs);
  const paid = claims.filter(c => c.status === 'paid');
  const kr = paid.reduce((sum, c) => sum + (c.amount || 0), 0);
  $('#main').innerHTML = `
    <h1>${esc(t('claimsTitle'))}</h1>
    ${shareCardHtml(claims)}
    ${claims.length ? `<p class="totals">${esc(t('totals', {
      sent: claims.length, paid: paid.length, kr: kr.toLocaleString(getLang() === 'no' ? 'nb-NO' : 'en-GB'),
      rejected: claims.filter(c => c.status === 'rejected').length }))}</p>` : ''}
    <div id="claims">${claims.length ? claims.map(claimRowHtml).join('') : `<p class="empty">${esc(t('noClaims'))}</p>`}</div>
    <p class="counter center" data-counter hidden></p>`;
  fillCounter();
  syncStats();
  $('#shareYes')?.addEventListener('click', () => { setShare(true); viewClaims(); });
  $('#shareNo')?.addEventListener('click', () => { setShare(false); viewClaims(); });
  document.querySelectorAll('.claim').forEach(row => {
    const key = row.dataset.key;
    const change = () => {
      store.update(s => {
        const c = s.claims.find(x => x.key === key);
        c.status = row.querySelector('select').value;
        const a = row.querySelector('input').value.replace(',', '.');
        c.amount = a === '' ? null : Number(a);
      });
      viewClaims();
    };
    row.querySelector('select').addEventListener('change', change);
    row.querySelector('input').addEventListener('change', change);
    row.querySelector('[data-case]').addEventListener('click', () => {
      const cur = store.get().claims.find(x => x.key === key)?.case || '';
      const v = prompt(t('casePrompt'), cur);
      if (v === null) return;
      const n = v.replace(/\D/g, '');
      if (n && !/^\d{4,12}$/.test(n)) { alert(t('caseInvalid')); return; }
      store.update(s => { const c = s.claims.find(x => x.key === key); if (c) c.case = n; });
      viewClaims();
    });
    row.querySelector('[data-remove]').addEventListener('click', () => {
      if (!confirm(t('removeClaimConfirm'))) return;
      store.update(s => { s.claims = s.claims.filter(x => x.key !== key); });
      viewClaims();
    });
  });
}

function claimRowHtml(c) {
  return `<article class="claim" data-key="${esc(c.key)}">
    <div><strong>${esc(fmtDay(c.date))} ${esc(c.dep)}</strong> ${esc(c.line)}
      <div class="muted">${esc(c.fromName.replace(/ stasjon$/, ''))} → ${esc(c.toName.replace(/ stasjon$/, ''))} · <button type="button" class="link small" data-case>${c.case ? `#${esc(c.case)}` : `＋ ${esc(t('addCase'))}`}</button>${c.earlier ? ` · ${esc(t('claimedEarlier'))}` : ''}</div></div>
    <select aria-label="status">${['pending', 'paid', 'rejected'].map(s =>
      `<option value="${s}" ${s === c.status ? 'selected' : ''}>${esc(t(s))}</option>`).join('')}</select>
    <input aria-label="${esc(t('amount'))}" placeholder="kr" inputmode="decimal" value="${esc(c.amount ?? '')}" ${c.status === 'paid' ? '' : 'hidden'}>
    <button type="button" class="link remove" data-remove aria-label="${esc(t('removeClaim'))}" title="${esc(t('removeClaim'))}">✕</button>
  </article>`;
}

/* ------------------------------------------------------------------ anonymous statistics (opt-in) */

/** Asked once, on the Claims page, after the first claim; shows exactly what would be sent. */
function shareCardHtml(claims) {
  const s = store.get();
  if (!stats.enabled() || s.stats.share !== null || !claims.length) return '';
  const preview = JSON.stringify(stats.report('…', s.claims).months, null, 1);
  return `<section class="card sharecard">
    <h2>${esc(t('shareTitle'))}</h2>
    <p>${esc(t('shareBody'))}</p>
    <details><summary>${esc(t('sharePreview'))}</summary><pre>${esc(preview)}</pre></details>
    <div class="actions"><button type="button" id="shareNo">${esc(t('shareNo'))}</button>
      <button type="button" class="primary" id="shareYes">${esc(t('shareYes'))}</button></div>
  </section>`;
}

function setShare(on) {
  const before = store.get().stats;
  if (!on && before.share && before.id) {
    stats.send({ id: before.id, months: {} }).catch(() => {});  /* deletes what was shared */
  }
  store.update(s => {
    s.stats = on ? { share: true, id: s.stats.id || stats.newId(), lastSent: '' } : { share: false, id: '', lastSent: '' };
  });
  syncStats();
}

/* Sends the current totals when they changed since the last successful report (idempotent on the server). */
let syncing = false;
async function syncStats() {
  const s = store.get();
  if (!stats.enabled() || s.stats.share !== true || syncing) return;
  const body = stats.report(s.stats.id, s.claims);
  const text = JSON.stringify(body);
  if (text === s.stats.lastSent) return;
  syncing = true;
  try {
    await stats.send(body);
    store.update(st => { st.stats.lastSent = text; });
  } catch { /* offline or server down: try again next time */ } finally { syncing = false; }
}

/* ------------------------------------------------------------------ "Nå": departures right now */

/* A small departure board for the regular trips (both directions), 20 min back to 90 min ahead, from Entur's
   live data, the same source as the station screens. Refreshes every minute while Trips is open. Claimable
   rows get the claim button: cancelled once the planned departure has passed, late once it actually arrived
   more than 30 min late (Vy pays on the real arrival, not a forecast). */
const NOW_BACK = 20 * 60000, NOW_AHEAD = 90 * 60000, NOW_MAX = 8;

function startNowBoard(run) {
  const tick = async () => {
    if (run !== tripsRun) return;
    if (document.visibilityState === 'visible') await renderNowBoard(run).catch(() => {});
    if (run === tripsRun) setTimeout(tick, 60000);
  };
  tick();
}

async function renderNowBoard(run) {
  const box = $('#now');
  const s = store.get();
  if (!box || !s.profile.routes.length) return;
  const now = Date.now();
  const pairs = [];
  const seenPair = new Set();
  for (const r of s.profile.routes) for (const [a, b] of [[r.a, r.b], [r.b, r.a]]) {
    if (!seenPair.has(a.id + b.id)) { seenPair.add(a.id + b.id); pairs.push([a, b]); }
  }
  let rows = [], failed = false;
  for (const [from, to] of pairs) {
    let js;
    try { js = await liveForRoute(from, to, now - NOW_BACK, now + NOW_AHEAD); } catch { failed = true; continue; }
    rows.push(...js.filter(j => j.depMs >= now - NOW_BACK && j.depMs <= now + NOW_AHEAD).map(j => ({ from, to, j })));
  }
  if (run !== tripsRun) return;
  /* in the order trains actually leave (a late train moves down), the last few gone ones first */
  const when = r => r.j.depActualMs ?? r.j.depExpectedMs ?? r.j.depMs;
  rows.sort((x, y) => when(x) - when(y));
  const upcoming = rows.filter(r => when(r) >= now && r.j.depActualMs === null);
  const gone = rows.filter(r => !upcoming.includes(r));
  rows = [...gone.slice(-3), ...upcoming].slice(0, NOW_MAX);
  if (!rows.length && !failed) { box.hidden = true; return; }
  const done = new Set(s.claims.map(c => c.key));
  const items = [];
  const html = rows.map(({ from, to, j }) => {
    const key = store.claimKey(from.id, to.id, j.depMs);
    const departed = j.depActualMs !== null || (j.depExpectedMs ?? j.depMs) < now;
    let status;
    if (j.cancelled) status = `<span class="badge bad">${esc(t('cancelled'))}</span>`;
    else if (!j.realtime) status = `<span class="badge quiet">${esc(t('planned'))}</span>`;
    else if (!departed) status = j.depDelayMin > 1
      ? `<span class="badge ${j.depDelayMin > core.DEFAULT_THRESHOLD ? 'warn' : 'quiet'}">${esc(t('depLate', { min: j.depDelayMin }))}</span>`
      : `<span class="badge quiet">${esc(t('onTime'))}</span>`;
    else status = statusHtml(j);
    let act = '';
    if (done.has(key)) act = `<span class="muted small">${esc(t('alreadySent'))}</span>`;
    else if (core.claimable(j, now) && core.ticketFor(s.tickets, j.depMs)) {
      items.push({ from, to, j });
      act = `<button class="primary small-btn" data-now="${items.length - 1}">${esc(t('claimBtn'))}</button>`;
    }
    const time = j.depActualMs ?? j.depExpectedMs;
    const shown = time && Math.abs(time - j.depMs) > 60000 ? ` <s>${esc(j.dep)}</s> ${esc(core.formatEu(time)[1])}` : esc(j.dep);
    return `<li><span class="nt">${shown}</span>
      <span class="nw"><strong>${esc(j.line)}</strong> ${esc(from.name.replace(/ stasjon$/, ''))} → ${esc(to.name.replace(/ stasjon$/, ''))}
        ${j.platform ? `<span class="muted"> · ${esc(t('platform', { n: j.platform }))}</span>` : ''}<br>${status}</span>
      <span class="na">${act}</span></li>`;
  }).join('');
  /* folded with a summary; opens by itself only when something is wrong, unless the user chose otherwise */
  const nCanc = rows.filter(r => r.j.cancelled).length;
  const nLate = rows.filter(r => !r.j.cancelled && ((r.j.depDelayMin || 0) >= 5 || (r.j.expectedMin || 0) >= 5 || (r.j.delayMin || 0) >= 5)).length;
  const parts = [t('nowCount', { n: rows.length }), nCanc ? t('nowCancelled', { n: nCanc }) : '', nLate ? t('nowLate', { n: nLate }) : ''].filter(Boolean);
  box.querySelector('summary').innerHTML = `<span>🚉 <strong>${esc(t('nowTitle'))}:</strong> ${esc(parts.join(' · '))}
    <small>${esc(t('nowUpdated', { time: core.formatEu(now)[1] }))}</small></span>`;
  box.querySelector('.now-body').innerHTML = `${rows.length ? `<ul class="nowlist">${html}</ul>` : ''}
    ${failed ? `<p class="muted small">${esc(t('liveFailedShort'))}</p>` : ''}`;
  if (!box.dataset.userSet) box.open = Boolean(nCanc || nLate || items.length);
  if (!box.dataset.wired) {
    box.dataset.wired = '1';
    box.querySelector('summary').addEventListener('click', () => { box.dataset.userSet = '1'; });
  }
  box.classList.toggle('alert', Boolean(nCanc || items.length));
  box.hidden = false;
  box.querySelectorAll('[data-now]').forEach(b => b.addEventListener('click', () => startClaim(items[Number(b.dataset.now)])));
}

/** "Most cancelled lines of the month" podium, from public data. */
async function fillJab() {
  const w = core.worstLines(await data.loadStats());
  if (!w) return;
  const loc = getLang() === 'no' ? 'nb-NO' : 'en-GB';
  const pct = x => x.toLocaleString(loc, { maximumFractionDigits: x < 10 ? 1 : 0 });
  const items = w.lines.map((l, i) => `<li><span class="medal">${['🥇', '🥈', '🥉'][i]}</span>
      <strong>${esc(l.line)}</strong> <span class="muted">${esc(l.ends.join(' – '))}</span>
      <span class="pct">${esc(pct(l.pct))} %</span></li>`).join('');
  const podium = `<ol class="podium">${items}</ol>
    <small>${esc(t('jabNote', { from: fmtDate(core.osloToMs(w.first, '12:00')), to: fmtDate(core.osloToMs(w.last, '12:00')) }))}</small>`;
  /* welcome page: the whole podium */
  document.querySelectorAll('[data-jab]').forEach(el => {
    el.innerHTML = `<strong>${esc(t(w.current ? 'jabMonth' : 'jabLastMonth'))}</strong>${podium}`;
    el.hidden = false;
  });
  /* Trips: one line with the winner, the podium folded away so the claimable trips stay near the top */
  const top = w.lines[0];
  document.querySelectorAll('[data-jab-fold]').forEach(el => {
    el.querySelector('summary').innerHTML = `<span>🏆 ${esc(t(w.current ? 'jabShort' : 'jabShortLast'))}
      <strong>${esc(top.line)}</strong> <span class="pct">${esc(pct(top.pct))} %</span></span>`;
    el.querySelector('.jab-body').innerHTML = podium;
    el.hidden = false;
  });
}

async function fillCounter() {
  const total = await stats.fetchTotal();
  if (!total || !(total.kr >= 1)) return;
  const paid = Number(total.paid) || 0;
  const fmt = n => n.toLocaleString(getLang() === 'no' ? 'nb-NO' : 'en-GB');
  document.querySelectorAll('[data-counter]').forEach(el => {
    el.innerHTML = `💸 ${esc(t('counter', { kr: fmt(total.kr) }))}<small>${esc(t(paid === 1 ? 'counterNote1' : 'counterNote', { n: fmt(paid) }))}</small>`;
    el.hidden = false;
  });
}

/* ------------------------------------------------------------------ start */

await store.init();  /* Android app: read the encrypted store first */
render();
/* Android app: the back button steps back through the app's pages; at the start page it leaves the app. */
const AppPlugin = globalThis.Capacitor?.Plugins?.App;
AppPlugin?.addListener?.('backButton', ({ canGoBack }) => {
  if (canGoBack && location.hash && location.hash !== '#/trips') history.back();
  else AppPlugin.exitApp();
});

/* The service worker is for the website (offline, updates); the Android app has its files built in. */
if ('serviceWorker' in navigator && location.protocol === 'https:' && !data.NATIVE) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
