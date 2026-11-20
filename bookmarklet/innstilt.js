/* Innstilt bookmarklet: finishes a prefilled Vy claim form in your own browser.

   The claim link fills in everything, but Vy's form only accepts the departure time once it has
   been changed by hand, and the train must be picked from a list that appears afterwards. This
   nudges the hour (arrow up, arrow down: a real change), sets hour/minute to the time in the link,
   then selects the train named in the link. It never presses "Send inn".

   Only block comments in this file: build.py strips them and rejects line comments. */
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const toast = (msg, kind) => {
    let t = document.getElementById('innstilt-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'innstilt-toast';
      t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;z-index:2147483647;left:50%;top:16px;transform:translateX(-50%);'
        + 'max-width:min(92vw,520px);padding:12px 16px;border-radius:12px;font:600 15px/1.35 system-ui,sans-serif;'
        + 'box-shadow:0 6px 24px rgba(0,0,0,.25);color:#0b0b0c;cursor:pointer';
      t.onclick = () => t.remove();
      document.body.appendChild(t);
    }
    t.style.background = kind === 'ok' ? '#d8f5e3' : kind === 'err' ? '#ffd9d6' : '#fff4c2';
    t.textContent = '👻 Innstilt: ' + msg;
    if (kind === 'ok') setTimeout(() => t.remove(), 9000);
  };

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

  const setSegment = async (max, target) => {
    press(seg(max), 'ArrowUp'); await sleep(80);
    press(seg(max), 'ArrowDown'); await sleep(80);
    const size = Number(max) + 1;
    for (let i = 0; i < size + 5; i++) {
      const el = seg(max);
      const now = Number(el.getAttribute('aria-valuenow'));
      if (now === target) return true;
      const up = Number.isNaN(now) || (target - now + size) % size <= size / 2;
      press(el, up ? 'ArrowUp' : 'ArrowDown');
      await sleep(40);
    }
    return Number(seg(max).getAttribute('aria-valuenow')) === target;
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
