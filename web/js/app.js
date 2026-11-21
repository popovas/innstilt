import * as core from './core.js';
import * as store from './store.js';
import * as data from './data.js';
import { t, getLang, setLang, fmtDate, fmtDay } from './i18n.js';
import { BOOKMARKLET } from './bookmarklet-href.js';

const DONATE_URL = '';  /* e.g. a Vipps or Buy Me a Coffee link; the footer button stays hidden while empty */
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isTouch = () => matchMedia('(pointer: coarse)').matches;

/* ------------------------------------------------------------------ shell */

function shell() {
  const lang = getLang();
  $('#lang').innerHTML = ['no', 'en'].map(l =>
    `<button type="button" data-lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join('');
  const route = location.hash.slice(2) || 'trips';
  $('#nav').innerHTML = [['trips', t('navTrips')], ['claims', t('navClaims')], ['settings', t('navSettings')]]
    .map(([r, label]) => `<a href="#/${r}" ${r === route ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  $('#nav').hidden = !store.get().welcomed;
  $('#foot').innerHTML = `${esc(t('notVy'))} ${esc(t('dataFrom'))}`
    + (DONATE_URL ? ` · <a href="${esc(DONATE_URL)}" target="_blank" rel="noopener">${esc(t('coffee'))}</a>` : '');
}

function render() {
  shell();
  const s = store.get();
  const route = location.hash.slice(2) || 'trips';
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

/* ------------------------------------------------------------------ welcome */

function viewWelcome() {
  $('#main').innerHTML = `
    <section class="hero">
      <img src="icons/ghost-192.png" width="120" height="120" alt="">
      <h1>Innstilt</h1>
      <p class="lead">${esc(t('tagline'))}</p>
    </section>
    <section class="card privacy">
      <h2>🔒 ${esc(t('privacyTitle'))}</h2>
      <p>${esc(t('privacyBody'))}</p>
      <p class="muted">${esc(t('notVy'))}</p>
    </section>
    <button class="primary big" id="start">${esc(t('start'))}</button>`;
  $('#start').onclick = () => { store.update(s => { s.welcomed = true; }); go('trips'); };
}

/* ------------------------------------------------------------------ setup / settings */

function dateFields(name, ms) {
  const [d, tm] = core.formatEu(ms);
  return `<label>${esc(t(name))}<span class="dt">
      <input name="${name}Date" value="${esc(d)}" placeholder="${esc(t('datePh'))}" inputmode="numeric" autocomplete="off" aria-label="${esc(t(name))} – ${esc(t('datePh'))}">
      <input name="${name}Time" value="${esc(tm)}" placeholder="${esc(t('timePh'))}" inputmode="numeric" autocomplete="off" aria-label="${esc(t(name))} – ${esc(t('timePh'))}">
    </span></label>`;
}

function viewSetup(first) {
  const s = store.get();
  const p = s.profile;
  const tk = s.tickets.length ? s.tickets[s.tickets.length - 1] : { code: '', validFrom: null, validTo: null };
  $('#main').innerHTML = `
    <h1>${esc(first ? t('setupTitle') : t('settingsTitle'))}</h1>
    ${noticeHtml()}
    <form id="setup" class="card" novalidate>
      <h2>${esc(t('secTicket'))}</h2>
      <p class="help">${esc(t('ticketHelp'))}</p>
      ${s.tickets.length > 1 ? ticketListHtml() : ''}
      <label>${esc(t('refCode'))}<input name="code" value="${esc(tk.code)}" placeholder="${esc(t('refCodePh'))}" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>
      <div class="row">
        ${dateFields('validFrom', tk.validFrom)}
        ${dateFields('validTo', tk.validTo)}
      </div>
      ${s.tickets.length ? `<button type="button" class="link" id="newTicket">＋ ${esc(t('addTicket'))}</button>` : ''}

      <h2>${esc(t('secYou'))}</h2>
      <label>${esc(t('name'))}<input name="name" value="${esc(p.name)}" autocomplete="name"></label>
      <label>${esc(t('email'))}<input type="email" name="email" value="${esc(p.email)}" autocomplete="email"><small>${esc(t('emailHelp'))}</small></label>
      <label>${esc(t('account'))}<input name="account" value="${esc(p.account)}" inputmode="numeric" placeholder="${esc(t('accountPh'))}" autocomplete="off"></label>

      <h2>${esc(t('secRoute'))}</h2>
      ${stationField('home', p.home)}
      ${stationField('work', p.work)}
      <label>${esc(t('timesOut'))}<input name="timesOut" value="${esc(p.timesOut.join(', '))}" inputmode="numeric" placeholder="07:15"></label>
      <label>${esc(t('timesBack'))}<input name="timesBack" value="${esc(p.timesBack.join(', '))}" inputmode="numeric" placeholder="16:30"><small>${esc(t('timesHelp'))}</small></label>

      <p class="error" id="err" role="alert"></p>
      <button class="primary" type="submit">${esc(t('save'))}</button>
      <span class="ok" id="ok" hidden>✓ ${esc(t('saved'))}</span>
    </form>
    ${first ? '' : settingsExtrasHtml()}`;
  wireStations();
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
  if (!first) wireSettingsExtras();
}

function ticketListHtml() {
  const now = Date.now();
  return `<ul class="tickets">${store.get().tickets.map((tk, i) => `
    <li><code>${esc(tk.code)}</code> ${tk.validFrom ? esc(fmtDate(tk.validFrom)) : '?'} – ${tk.validTo ? esc(fmtDate(tk.validTo)) : '?'}
      ${core.ticketFor([tk], now) ? `<span class="pill">${esc(t('validNow'))}</span>` : ''}
      <button type="button" class="link" data-remove-ticket="${i}">${esc(t('remove'))}</button></li>`).join('')}</ul>`;
}

function stationField(key, value) {
  return `<label class="station">${esc(t(key))}
    <input name="${key}" value="${esc(value?.name || '')}" data-id="${esc(value?.id || '')}" placeholder="${esc(t('stationPh'))}" autocomplete="off" role="combobox" aria-expanded="false">
    <ul class="suggest" hidden></ul></label>`;
}

function wireStations() {
  document.querySelectorAll('label.station').forEach(label => {
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
        } catch { list.hidden = true; }
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
  const home = f.home.dataset.id ? { id: f.home.dataset.id, name: f.home.value } : null;
  const work = f.work.dataset.id ? { id: f.work.dataset.id, name: f.work.value } : null;
  if (!home || !work) return err(t('errStation'));
  const timesOut = core.parseTimes(f.timesOut.value), timesBack = core.parseTimes(f.timesBack.value);
  if (!timesOut || !timesBack) return err(t('errTimes'));
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
    Object.assign(s.profile, { name, email, account, home, work, timesOut, timesBack });
  });
  $('#err').textContent = '';
  if (first) { go('trips'); return true; }
  render();
  $('#ok').hidden = false;
  return true;
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
      <button type="button" id="export">${esc(t('exportData'))}</button>
      <button type="button" class="danger" id="wipe">${esc(t('deleteData'))}</button>
    </section>`;
}

function wireSettingsExtras() {
  $('#bm').addEventListener('click', e => { e.preventDefault(); alert(t('bookmarkClick')); });
  $('#bmHave').addEventListener('change', e => store.update(st => { st.bookmarkDone = e.target.checked; }));
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

function noticeHtml() {
  const n = core.ticketNotice(store.get().tickets);
  if (!n) return '';
  const key = { none: 'noticeNone', undated: 'noticeUndated', expired: 'noticeExpired', expiring: 'noticeExpiring' }[n.kind];
  return `<p class="notice">ℹ️ ${esc(t(key, { date: n.date ? fmtDate(n.date, true) : '' }))}</p>`;
}

/* ------------------------------------------------------------------ trips */

let tripsRun = 0;

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
    <p class="muted">${esc(t('tripsIntro', { min: core.DEFAULT_THRESHOLD, days: core.CLAIM_DEADLINE_DAYS }))}</p>
    <div id="trips"></div>
    <p class="muted" id="progress"></p>`;
  $('#bm')?.addEventListener('click', e => { e.preventDefault(); alert(t('bookmarkClick')); });
  $('#bmDone')?.addEventListener('click', () => { store.update(st => { st.bookmarkDone = true; }); $('.bmcard').remove(); });
  $('#bmLater')?.addEventListener('click', () => $('.bmcard').remove());
  const index = await data.loadIndex();
  const today = core.todayOslo();
  const oldest = core.addDays(today, -core.CLAIM_DEADLINE_DAYS);
  const days = index.days.filter(d => d >= oldest && d < today).sort().reverse();
  const done = new Set(s.claims.map(c => c.key));
  const pairs = [[p.home, p.work, p.timesOut], [p.work, p.home, p.timesBack]];
  let shown = 0, skipped = new Set();

  for (const day of days) {
    if (run !== tripsRun) return;  /* user navigated away */
    $('#progress').textContent = t('loading', { date: fmtDay(day) });
    let dayData;
    try { dayData = await data.loadDay(day); } catch { continue; }
    const items = [];
    for (const [from, to, times] of pairs) {
      const js = core.journeysForRoute(dayData, from.id, to.id);
      for (const j of js) {
        if (!core.eligible(j) || !core.nearUsual(j, times)) continue;
        if (done.has(store.claimKey(from.id, to.id, j.depMs))) continue;
        if (!core.ticketFor(s.tickets, j.depMs)) { skipped.add(day); continue; }
        items.push({ from, to, j, next: j.cancelled ? core.nextTrain(js, j) : null });
      }
    }
    if (!items.length || run !== tripsRun) continue;
    items.sort((a, b) => a.j.depMs - b.j.depMs);
    shown += items.length;
    const sec = document.createElement('section');
    sec.className = 'day';
    sec.innerHTML = `<h2>${esc(fmtDay(day))}</h2>` + items.map((it, i) => tripHtml(it, `${day}-${i}`)).join('');
    $('#trips').appendChild(sec);
    sec.querySelectorAll('[data-claim]').forEach(b => {
      const it = items[Number(b.dataset.claim.split('-').pop())];
      b.addEventListener('click', () => startClaim(it));
    });
  }
  if (run !== tripsRun) return;
  $('#progress').textContent = (skipped.size ? t('noTicketDay', { n: skipped.size }) + ' ' : '');
  if (!shown) $('#trips').innerHTML = `<p class="empty">${esc(t('noTrips'))}</p>`;
}

function tripHtml({ from, to, j, next }, id) {
  const status = j.cancelled
    ? `<span class="badge bad">${esc(t('cancelled'))}</span>`
    : `<span class="badge warn">${esc(t('late', { min: j.delayMin }))}</span>`;
  const nx = next ? `<small>${esc(t('nextTrain', {
    line: next.line, time: next.dep, min: core.effectiveDelay(j, next) }))}</small>` : '';
  return `<article class="trip">
    <div class="when"><strong>${esc(j.dep)}</strong><span>${esc(j.line)}</span></div>
    <div class="what">${esc(from.name.replace(/ stasjon$/, ''))} → ${esc(to.name.replace(/ stasjon$/, ''))} ${status}${nx}</div>
    <button class="primary" data-claim="${id}">${esc(t('claimBtn'))}</button>
  </article>`;
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
    store.update(st => st.claims.push({
      key: store.claimKey(from.id, to.id, j.depMs), fromId: from.id, toId: to.id,
      fromName: from.name, toName: to.name, date: j.date, dep: j.dep, line: j.line, depMs: j.depMs,
      case: caseNo, status: 'pending', amount: null, sentAt: Date.now(),
    }));
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
    ${claims.length ? `<p class="totals">${esc(t('totals', {
      sent: claims.length, paid: paid.length, kr: kr.toLocaleString(getLang() === 'no' ? 'nb-NO' : 'en-GB'),
      rejected: claims.filter(c => c.status === 'rejected').length }))}</p>` : ''}
    <div id="claims">${claims.length ? claims.map(claimRowHtml).join('') : `<p class="empty">${esc(t('noClaims'))}</p>`}</div>`;
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
  });
}

function claimRowHtml(c) {
  return `<article class="claim" data-key="${esc(c.key)}">
    <div><strong>${esc(fmtDay(c.date))} ${esc(c.dep)}</strong> ${esc(c.line)}
      <div class="muted">${esc(c.fromName.replace(/ stasjon$/, ''))} → ${esc(c.toName.replace(/ stasjon$/, ''))}${c.case ? ` · #${esc(c.case)}` : ''}</div></div>
    <select aria-label="status">${['pending', 'paid', 'rejected'].map(s =>
      `<option value="${s}" ${s === c.status ? 'selected' : ''}>${esc(t(s))}</option>`).join('')}</select>
    <input aria-label="${esc(t('amount'))}" placeholder="kr" inputmode="decimal" value="${c.amount ?? ''}" ${c.status === 'paid' ? '' : 'hidden'}>
  </article>`;
}

/* ------------------------------------------------------------------ start */

render();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
