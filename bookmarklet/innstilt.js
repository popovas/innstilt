/* Innstilt bookmarklet: finishes a prefilled Vy claim form in your own browser.

   The claim link fills in everything, but Vy's form only accepts the departure time once it has
   been changed by hand, and the train must be picked from a list that appears afterwards. This
   nudges the hour (arrow up, arrow down: a real change), sets hour/minute to the time in the link,
   then selects the train named in the link. It never presses "Send inn".
   After you send the claim yourself, it spots Vy's "Saksnummer: 123456" and offers a button that opens
   Innstilt with that case number and the trip (stations, date, time), so the app can store it.
   Nothing is sent anywhere by the bookmarklet itself.

   Only block comments in this file: build.py strips them and rejects line comments. */
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* Our logo, built with DOM calls (no innerHTML: works under Vy's Content Security Policy / Trusted Types). */
  const logo = () => {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    const svg = el('svg', { viewBox: '0 0 512 512', width: '30', height: '30', 'aria-hidden': 'true' });
    svg.style.cssText = 'flex:none;border-radius:7px';
    [
      ['rect', { width: 512, height: 512, rx: 112, fill: '#1c5a4a' }],
      ['rect', { x: 36, y: 430, width: 440, height: 22, rx: 11, fill: '#8fbfa8' }],
      ['path', { fill: '#e9f6ee', d: 'M40 210Q40 150 100 150H330Q410 150 440 236L452 290Q458 318 440 336L440 400Q414 380 388 400Q362 420 336 400Q310 380 284 400Q258 420 232 400Q206 380 180 400Q154 420 128 400Q102 380 76 400Q58 414 40 400Z' }],
      ['path', { fill: '#14473b', d: 'M64 196H336Q384 196 404 246L410 268H64Z' }],
      ['ellipse', { cx: 170, cy: 234, rx: 34, ry: 26, fill: '#e9f6ee' }],
      ['ellipse', { cx: 290, cy: 234, rx: 34, ry: 26, fill: '#e9f6ee' }],
      ['path', { fill: '#14473b', d: 'M134 234A36 30 0 0 1 206 234ZM254 234A36 30 0 0 1 326 234Z' }],
      ['circle', { cx: 178, cy: 244, r: 11, fill: '#0e3a30' }],
      ['circle', { cx: 298, cy: 244, r: 11, fill: '#0e3a30' }],
      ['rect', { x: 40, y: 340, width: 400, height: 26, fill: '#2fa36b' }],
      ['circle', { cx: 404, cy: 108, r: 84, fill: '#f5c400', stroke: '#0e3a30', 'stroke-width': 14 }],
      ['rect', { x: 390, y: 56, width: 28, height: 74, rx: 14, fill: '#0e3a30' }],
      ['circle', { cx: 404, cy: 158, r: 16, fill: '#0e3a30' }],
    ].forEach(([tag, attrs]) => svg.appendChild(el(tag, attrs)));
    return svg;
  };

  const APP = 'https://innstilt.app/';  /* build.py can point this elsewhere for testing */

  const toast = (msg, kind) => {
    let t = document.getElementById('innstilt-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'innstilt-toast';
      t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;z-index:2147483647;left:50%;top:16px;transform:translateX(-50%);'
        + 'display:flex;gap:10px;align-items:center;'
        + 'max-width:min(92vw,520px);padding:10px 16px 10px 10px;border-radius:12px;font:600 15px/1.35 system-ui,sans-serif;'
        + 'box-shadow:0 6px 24px rgba(0,0,0,.25);color:#0b0b0c;cursor:pointer';
      t.onclick = () => t.remove();
      t.appendChild(logo());
      t.appendChild(document.createElement('span'));
      document.body.appendChild(t);
    }
    t.style.background = kind === 'ok' || kind === 'case' ? '#d8f5e3' : kind === 'err' ? '#ffd9d6' : '#fff4c2';
    t.lastChild.textContent = 'Innstilt: ' + msg;
    const old = t.querySelector('a');
    if (old) old.remove();
    if (kind === 'ok') setTimeout(() => { if (!t.querySelector('a')) t.remove(); }, 9000);
    return t;
  };

  /* After "Send inn": Vy shows "Saksnummer: 123456" (the page address no longer has the trip by then). */
  const q0 = new URLSearchParams(location.search);
  const trip = {
    from: q0.get('manualJourneyInfo.departureStation.nsrCode') || '',
    to: q0.get('manualJourneyInfo.arrivalStation.nsrCode') || '',
    date: q0.get('manualJourneyInfo.date') || '',
    time: (q0.get('manualJourneyInfo.time') || '').slice(0, 5),
  };
  if (trip.from && trip.to && trip.date && trip.time && !window.innstiltCaseWatch) {
    const started = Date.now();
    window.innstiltCaseWatch = setInterval(() => {
      const m = (document.body.innerText || '').match(/Saksnummer:\s*(\d{4,12})/);
      if (!m && Date.now() - started < 3 * 3600000) return;
      clearInterval(window.innstiltCaseWatch);
      window.innstiltCaseWatch = null;
      if (!m) return;
      const t = toast('Saksnummer ' + m[1] + ' – ', 'case');
      const a = document.createElement('a');
      a.textContent = 'Lagre i Innstilt';
      a.href = APP + '#/case?' + new URLSearchParams({ n: m[1], ...trip });
      /* opened by script (not a plain link), so Innstilt's little tab may close itself when done */
      a.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        const w = window.open(a.href, '_blank');
        if (w) w.opener = null;  /* same isolation as noopener, but the tab stays closable by script */
        else location.assign(a.href);  /* pop-up blocked: go there in this tab instead */
        t.remove();
      };
      a.style.cssText = 'color:#fff;background:#0e3a30;padding:6px 12px;border-radius:8px;text-decoration:none;font-weight:700;white-space:nowrap';
      t.appendChild(a);
    }, 1000);
  }

  const q = new URLSearchParams(location.search);
  const time = (q.get('manualJourneyInfo.time') || '').match(/^(\d{1,2}):(\d{2})/);
  const wantDep = q.get('departureList') || '';
  if (!time) {
    toast('Fant ingen avgangstid i adressen. Åpne skjemaet via en Innstilt-lenke først.', 'err');
    return;
  }
  const wantH = Number(time[1]), wantM = Number(time[2]);
  const hhmm = time[1].padStart(2, '0') + ':' + time[2];

  /* Vy's time segments: hour has aria-valuemax 23, minute 59 (date segments use 31/12/9999). */
  const seg = max => [...document.querySelectorAll('[role=spinbutton]')]
    .find(e => e.getAttribute('aria-valuemax') === max);

  toast('Venter på skjemaet …');
  for (let i = 0; i < 80 && !(seg('23') && seg('59')); i++) await sleep(250);
  if (!seg('23') || !seg('59')) {
    toast('Fant ikke tidsfeltet. Har Vy hentet billetten? Trykk «Hent billetten» og prøv igjen.', 'err');
    return;
  }

  const press = (el, key) => {
    el.focus();
    for (const type of ['keydown', 'keyup']) {
      el.dispatchEvent(new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true }));
    }
  };

  /* Re-query the segment every step: the form may re-render it. Missing for a moment -> wait. */
  const value = max => { const e = seg(max); return e ? Number(e.getAttribute('aria-valuenow')) : undefined; };
  const pressOn = async (max, key) => {
    for (let i = 0; i < 20 && !seg(max); i++) await sleep(100);
    if (seg(max)) press(seg(max), key);
    await sleep(60);
  };

  const setSegment = async (max, target) => {
    await pressOn(max, 'ArrowUp');
    await pressOn(max, 'ArrowDown');
    const size = Number(max) + 1;
    for (let i = 0; i < size + 5; i++) {
      const now = value(max);
      if (now === undefined) return false;
      if (now === target) return true;
      const up = Number.isNaN(now) || (target - now + size) % size <= size / 2;
      await pressOn(max, up ? 'ArrowUp' : 'ArrowDown');
    }
    return value(max) === target;
  };

  const okH = await setSegment('23', wantH);
  const okM = await setSegment('59', wantM);
  if (document.activeElement) document.activeElement.blur();
  if (!okH || !okM) {
    toast('Klarte ikke å sette tiden til ' + hhmm + '. Skriv den inn selv.', 'err');
    return;
  }

  toast('Tid satt til ' + hhmm + ', venter på avgangslisten …');
  let radios = [];
  for (let i = 0; i < 60; i++) {
    radios = [...document.querySelectorAll('input[name=departureList]')];
    if (radios.length) break;
    await sleep(250);
  }
  if (!radios.length) {
    toast('Tiden er satt (' + hhmm + '), men ingen avgangsliste dukket opp. Velg toget selv.', 'err');
    return;
  }
  await sleep(300);
  radios = [...document.querySelectorAll('input[name=departureList]')];
  const labelOf = r => {
    const l = (r.id && document.querySelector('label[for="' + CSS.escape(r.id) + '"]')) || r.closest('label');
    return (l ? l.innerText : '').replace(/\s+/g, ' ').trim();
  };
  const line = (wantDep.split('-')[0] || '');
  const pick = radios.find(r => r.value === wantDep)
    || radios.find(r => labelOf(r).startsWith(hhmm) && (!line || labelOf(r).includes(line)))
    || radios.find(r => labelOf(r).startsWith(hhmm));
  if (!pick) {
    toast('Fant ikke avgangen ' + hhmm + ' i listen. Velg toget selv.', 'err');
    return;
  }
  pick.click();
  await sleep(200);
  if (!pick.checked) {
    toast('Klarte ikke å velge toget ' + hhmm + '. Velg det selv.', 'err');
    return;
  }
  pick.scrollIntoView({ block: 'center', behavior: 'smooth' });
  toast('Ferdig: ' + labelOf(pick) + '. Sjekk skjemaet og trykk «Send inn».', 'ok');
})();
