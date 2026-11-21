import * as core from './core.js';
import * as store from './store.js';
import * as data from './data.js';
import { t, getLang, setLang, fmtDate, fmtDay } from './i18n.js';
import { BOOKMARKLET } from './bookmarklet-href.js';
import { VERSION, ABOUT, ROADMAP, contactAddress } from './about.js';
import * as stats from './stats.js';

const DONATE_URL = 'https://ko-fi.com/innstilt_team';  /* tips via Ko-fi (no phone number exposed, no requests); empty = hidden */
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isTouch = () => matchMedia('(pointer: coarse)').matches;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const wantsHomeScreen = () => isTouch() && !isStandalone();

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
  $('#foot').innerHTML = `<a href="#/about">${esc(t('about'))}</a> · ${esc(t('notVy'))} ${esc(t('dataFrom'))}`
    + (DONATE_URL ? ` · <a href="${esc(DONATE_URL)}" target="_blank" rel="noopener">${esc(t('coffee'))}</a>` : '');
}

function render() {
  shell();
  offlineBanner();
  syncStats();
  const s = store.get();
  const route = location.hash.slice(2) || 'trips';
  if (route === 'about') return viewAbout();  /* readable before setup too */
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

function viewWelcome() {
  $('#main').innerHTML = `
    <section class="hero">
      <img src="icons/ghost-192.png" width="120" height="120" alt="">
      <h1>Innstilt</h1>
      <p class="lead">${esc(t('tagline'))}</p>
      <p class="counter" data-counter hidden></p>
      <p class="jab" data-jab hidden></p>
    </section>
    <section class="card privacy">
      <h2>🔒 ${esc(t('privacyTitle'))}</h2>
      <p>${esc(t('privacyBody'))}</p>
      <p class="muted">${esc(t('notVy'))}</p>
    </section>
    ${wantsHomeScreen() ? `<section class="card homecard">${homeHtml(true)}</section>` : ''}
    <button class="primary big" id="start">${esc(t('start'))}</button>`;
  $('#start').onclick = () => { store.update(s => { s.welcomed = true; }); go('trips'); };
  wireInstall();
  fillCounter();
  fillJab();
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
    <section class="card about">
      <h2>🚧 ${esc(roadmap[0])}</h2>
      <ul class="roadmap">${roadmap.slice(1).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </section>
    ${address ? `<section class="card center">
      <p>${esc(t('contactBody'))}</p>
      <button type="button" class="primary" id="contact">✉️ ${esc(t('contact'))}</button>
    </section>` : ''}
    <p class="center"><button type="button" class="link" id="back">← ${esc(t('back'))}</button></p>`;
  $('#back').onclick = () => (history.length > 1 ? history.back() : go('trips'));
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
    ${noticeHtml()}
    <form id="setup" class="card" novalidate>
      <h2>${esc(t('secTicket'))}</h2>
      <p class="help">${esc(t('ticketHelp'))}</p>
      ${s.tickets.length > 1 ? ticketListHtml() : ''}
      <label>${esc(t('refCode'))}<input name="code" value="${esc(tk.code)}" placeholder="${esc(t('refCodePh'))}" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="11"></label>
      <div class="row">
        ${dateFields('validFrom', tk.validFrom)}
        ${dateFields('validTo', tk.validTo)}
      </div>
      ${s.tickets.length ? `<button type="button" class="link" id="newTicket">＋ ${esc(t('addTicket'))}</button>` : ''}

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
  const sf = $('#setup');
  wireFormat(sf.code, core.formatRef);
  for (const n of ['validFrom', 'validTo']) {
    wireFormat(sf[`${n}Date`], core.formatDateInput);
    wireFormat(sf[`${n}Time`], core.formatTimeInput);
  }
  wireRoutes();
  $('#newTicket')?.addEventListener('click', () => {
    const f = $('#setup');
    f.code.value = '';
    for (const n of ['validFromDate', 'validFromTime', 'validToDate', 'validToTime']) f[n].value = '';
    f.code.dataset.isNew = '1';
    f.code.focus();
  });
  document.querySelectorAll('[data-remove-ticket]').forEach(b => b.addEventListener('click', () => {
    store.update(st => { st.tickets.splice(Number(b.dataset.removeTicket), 1); });
    render();
  }));
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

function ticketListHtml() {
  const now = Date.now();
  return `<ul class="tickets">${store.get().tickets.map((tk, i) => `
    <li><code>${esc(tk.code)}</code> ${tk.validFrom ? esc(fmtDate(tk.validFrom)) : '?'} – ${tk.validTo ? esc(fmtDate(tk.validTo)) : '?'}
      ${core.ticketFor([tk], now) ? `<span class="pill">${esc(t('validNow'))}</span>` : ''}
      <button type="button" class="link" data-remove-ticket="${i}">${esc(t('remove'))}</button></li>`).join('')}</ul>`;
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
  const code = core.validRef(f.code.value);
  if (!code) return err(t('errRef'));
  const validFrom = core.parseEuDateTime(f.validFromDate.value, f.validFromTime.value);
  const validTo = core.parseEuDateTime(f.validToDate.value, f.validToTime.value);
  if (Number.isNaN(validFrom) || Number.isNaN(validTo)) return err(t('errDate'));
  if (validFrom && validTo && validTo <= validFrom) return err(t('errDates'));
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
    const ticket = { code, validFrom, validTo };
    const isNew = f.code.dataset.isNew === '1';
    s.tickets = s.tickets.filter(x => x.code !== code);
    if (!isNew && s.tickets.length && !s.tickets.some(x => x.code === code)) {
      /* editing the last ticket in place (its code may have been corrected) */
      s.tickets.pop();
    }
    s.tickets.push(ticket);
    s.tickets.sort((a, b) => (a.validFrom || 0) - (b.validFrom || 0));
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
    ${wantsHomeScreen() && !s.homeDone ? `<section class="card homecard">${homeHtml(false)}
      <div class="actions"><button type="button" id="homeLater">${esc(t('bmLater'))}</button>
        <button type="button" class="primary" id="homeDone">${esc(t('bmDone'))}</button></div></section>` : ''}
    <details class="card fold jabfold" data-jab-fold hidden><summary></summary><div class="jab-body"></div></details>
    ${otherTripHtml()}
    <p class="muted">${esc(t('tripsIntro', { min: core.DEFAULT_THRESHOLD, days: core.CLAIM_DEADLINE_DAYS }))}</p>
    <div id="trips"></div>
    <p class="muted" id="progress"></p>`;
  $('#bm')?.addEventListener('click', e => { e.preventDefault(); alert(t('bookmarkClick')); });
  $('#bmDone')?.addEventListener('click', () => { store.update(st => { st.bookmarkDone = true; }); $('.bmcard').remove(); });
  $('#bmLater')?.addEventListener('click', () => $('.bmcard').remove());
  $('#homeLater')?.addEventListener('click', () => $('.homecard').remove());
  $('#homeDone')?.addEventListener('click', () => { store.update(st => { st.homeDone = true; }); $('.homecard').remove(); });
  wireInstall();
  wireOtherTrip();
  fillJab();
  const index = await data.loadIndex();
  const today = core.todayOslo();
  const oldest = core.addDays(today, -core.CLAIM_DEADLINE_DAYS);
  const days = (index?.days || []).filter(d => d >= oldest && d < today).sort().reverse();
  let failedDays = index ? 0 : -1, liveFailed = false;  /* -1 = the list of days itself failed */
  const done = new Set(s.claims.map(c => c.key));
  const pairs = p.routes.flatMap(r => [[r.a, r.b, r.timesOut], [r.b, r.a, r.timesBack]]);
  let shown = 0, urgent = 0, skipped = new Set();

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
    } else {
      let dayData;
      try { dayData = await data.loadDay(day); } catch { failedDays += 1; continue; }
      routeJourneys = async (from, to) => core.journeysForRoute(dayData, from.id, to.id);
    }
    const items = [], seen = new Set();  /* two routes may share a leg */
    for (const [from, to, times] of pairs) {
      const js = await routeJourneys(from, to);
      for (const j of js) {
        if (!core.claimable(j, now) || !core.nearUsual(j, times)) continue;
        const key = store.claimKey(from.id, to.id, j.depMs);
        if (done.has(key) || seen.has(key)) continue;
        seen.add(key);
        if (!core.ticketFor(s.tickets, j.depMs)) { skipped.add(day); continue; }
        items.push({ from, to, j, next: j.cancelled ? core.nextTrain(js, j) : null });
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
}

function statusHtml(j) {
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
  return `<article class="trip">
    <div class="when"><strong>${esc(j.dep)}</strong><span>${esc(j.line)}</span></div>
    <div class="what">${esc(from.name.replace(/ stasjon$/, ''))} → ${esc(to.name.replace(/ stasjon$/, ''))} ${statusHtml(j)}${nx}</div>
    ${action === null && core.daysLeft(j.date) <= core.DEADLINE_WARN_DAYS ? `<small class="deadline">⏳ ${esc(
      core.daysLeft(j.date) <= 0 ? t('lastDay') : t('daysLeft', { n: core.daysLeft(j.date) }))}</small>` : ''}
    ${action === null ? `<div class="acts"><button class="primary" data-claim="${id}">${esc(t('claimBtn'))}</button>
      <button type="button" class="link small" data-done="${id}">${esc(t('alreadyClaimed'))}</button></div>`
    : `<span class="muted">${esc(action)}</span>`}
  </article>`;
}

/** Wires the claim and "already claimed" buttons of rendered trips; `items` are indexed by the id's last part. */
function wireTrips(root, items) {
  const pick = b => items[Number((b.dataset.claim ?? b.dataset.done).split('-').pop())];
  root.querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => startClaim(pick(b))));
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

function startClaim({ from, to, j }) {
  const s = store.get();
  const ticket = core.ticketFor(s.tickets, j.depMs);
  const link = core.claimLink(s.profile, ticket, from, to, j);
  window.open(link, '_blank', 'noopener');  /* in the click handler, so pop-up blockers allow it */
  const dlg = $('#dlg');
  const train = `${j.line} ${j.dep}`;
  dlg.innerHTML = `<form method="dialog">
      <h2>${esc(t('claimTitle'))}</h2>
      <p>${esc(t('claimOpened'))}</p>
      ${!isTouch() && s.bookmarkDone ? `<p>${esc(t('claimStepsBookmark'))}</p>` : `
      <p>${esc(t('claimStepsManual'))}</p>
      <ol class="steps">
        <li>${esc(t('claimStep1'))} <span class="big">${esc(j.dep)}</span></li>
        <li>${esc(t('claimStep2'))} <span class="big">${esc(train)}</span></li>
        <li>${esc(t('claimStep3'))}</li>
      </ol>
      ${isTouch() ? '' : `<p class="muted small">${esc(t('claimTip'))}</p>`}`}
      <p><a href="${esc(link)}" target="_blank" rel="noopener">${esc(t('openAgain'))}</a></p>
      <label>${esc(t('caseNo'))}<input name="case" inputmode="numeric" autocomplete="off"></label>
      <div class="actions">
        <button value="cancel">${esc(t('notSent'))}</button>
        <button class="primary" value="sent">${esc(t('markSent'))}</button>
      </div></form>`;
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
      <div class="muted">${esc(c.fromName.replace(/ stasjon$/, ''))} → ${esc(c.toName.replace(/ stasjon$/, ''))}${c.case ? ` · #${esc(c.case)}` : ''}${c.earlier ? ` · ${esc(t('claimedEarlier'))}` : ''}</div></div>
    <select aria-label="status">${['pending', 'paid', 'rejected'].map(s =>
      `<option value="${s}" ${s === c.status ? 'selected' : ''}>${esc(t(s))}</option>`).join('')}</select>
    <input aria-label="${esc(t('amount'))}" placeholder="kr" inputmode="decimal" value="${c.amount ?? ''}" ${c.status === 'paid' ? '' : 'hidden'}>
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

render();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
