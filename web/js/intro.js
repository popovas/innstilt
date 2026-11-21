/* The introduction (first start) and the "?" help: a walk through the app's own screens. The screenshots in
   img/tutorial/ are made from demo data by tools/screenshots.py, so they can be regenerated after changes. */

const Y = '#f5c400', INK = '#0b0b0c', G2 = '#0e3a30', MINT = '#f2faf5', MINT2 = '#cfeadb', STRIPE = '#2fa36b';

/* Slide 3 has no screen to show (it all happens inside Vy's form), so it is drawn: what Innstilt does, step by step. */
const steps = lang => {
  const s = lang === 'en'
    ? ['Opens Vy\'s form, already filled in', 'Sets the departure time, picks the train', 'Attaches the ticket picture (app)', 'You check it and press "Send inn"', 'Saves the case number with the claim']
    : ['Åpner Vy sitt skjema, ferdig utfylt', 'Setter avgangstid og velger toget', 'Legger ved bildet av billetten (appen)', 'Du sjekker og trykker «Send inn»', 'Lagrer saksnummeret hos kravet'];
  return `<svg viewBox="0 0 300 236" role="img" aria-hidden="true">
    <rect width="300" height="236" rx="16" fill="${G2}"/>
    ${s.map((txt, i) => `<g transform="translate(14 ${14 + i * 43})">
      <circle cx="16" cy="16" r="15" fill="${i === 3 ? Y : STRIPE}"/>
      <text x="16" y="21" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="800" fill="${i === 3 ? INK : '#fff'}">${i + 1}</text>
      <text x="40" y="21" font-family="system-ui" font-size="13" font-weight="${i === 3 ? 800 : 600}" fill="${i === 3 ? Y : MINT}">${txt}</text>
      ${i < 4 ? `<path d="M16 33 v8" stroke="${MINT2}" stroke-width="2" opacity=".6"/>` : ''}</g>`).join('')}
  </svg>`;
};

/* [key, image (or null for the drawn steps), title, text] per language. */
const SLIDES = {
  no: [
    ['setup', 'setup', 'Legg inn billetten og deg selv', 'Vy sitt skjema trenger billettkode, navn, e-post og kontonummer. Det lagres bare på telefonen din.'],
    ['trips', 'trips', 'Turer du kan kreve', 'Innstilte og over 30 min forsinkede tog på de faste reisene dine, 90 dager tilbake. Trykk «Krev refusjon».'],
    ['fill', null, 'Det som skjer når du krever', 'Innstilt gjør det kjedelige – du bestemmer og trykker «Send inn» selv.'],
    ['claims', 'claims', 'Kravene dine', 'Se status, legg inn beløpet når Vy betaler, og se hvor mye du har fått tilbake.'],
    ['settings', 'settings', 'Flere billetter og reiser', 'I Innstillinger legger du til nye billetter (for eksempel neste måned) og flere faste reiser.'],
  ],
  en: [
    ['setup', 'setup', 'Add your ticket and yourself', 'Vy\'s form needs your ticket code, name, e-mail and account number. It is stored only on your phone.'],
    ['trips', 'trips', 'Trips you can claim', 'Cancelled and over 30 min late trains on your regular trips, 90 days back. Tap "Claim refund".'],
    ['fill', null, 'What happens when you claim', 'Innstilt does the boring part – you decide and press "Send inn" yourself.'],
    ['claims', 'claims', 'Your claims', 'See the status, add the amount when Vy pays, and see how much you got back.'],
    ['settings', 'settings', 'More tickets and trips', 'In Settings you add new tickets (next month\'s, for example) and more regular trips.'],
  ],
};

export const slides = lang => SLIDES[lang] || SLIDES.no;

/** Picture for a slide: a screenshot of the app, or the drawn steps. */
export const picture = (slide, lang) => (slide[1]
  ? `<img src="img/tutorial/${slide[1]}-${lang === 'en' ? 'en' : 'no'}.png" alt="" loading="lazy">`
  : steps(lang));

/** Which slides the "?" shows on each screen. */
export const HELP = { trips: ['trips', 'fill'], claims: ['claims'], settings: ['settings', 'setup'], setup: ['setup'] };
