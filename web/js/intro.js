/* The first-start introduction: four short slides, each with one drawing and very little text.
   Drawings are inline SVG with presentation attributes only (the page's security policy allows no inline styles). */

const G1 = '#1c5a4a', G2 = '#0e3a30', MINT = '#f2faf5', MINT2 = '#cfeadb', STRIPE = '#2fa36b', Y = '#f5c400', INK = '#0b0b0c';

/* the sleepy ghost-train head, facing right, in a 100x100 box */
const train = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">
  <path d="M4 18 Q4 4 22 4 H62 Q92 4 98 50 Q92 96 62 96 H22 Q4 96 4 82 Z" fill="${MINT}"/>
  <path d="M10 22 H60 Q80 22 86 50 H10 Z" fill="${G2}"/>
  <ellipse cx="34" cy="38" rx="9" ry="6" fill="${MINT}"/><ellipse cx="58" cy="38" rx="9" ry="6" fill="${MINT}"/>
  <path d="M24 37 H44 M48 37 H68" stroke="${G2}" stroke-width="4.5"/>
  <path d="M38 66 Q46 61 54 66" stroke="${G2}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="4" y="74" width="84" height="8" fill="${STRIPE}"/><circle cx="92" cy="62" r="5" fill="${Y}"/></g>`;

const board = (x, y, w, text, sub, color = Y) => `<g transform="translate(${x} ${y})">
  <rect width="${w}" height="54" rx="8" fill="${INK}"/>
  <circle cx="22" cy="27" r="10" fill="${Y}"/><rect x="20" y="19" width="4" height="10" rx="2" fill="${INK}"/><circle cx="22" cy="33" r="2.3" fill="${INK}"/>
  <text x="42" y="24" font-family="ui-monospace,Menlo,monospace" font-size="17" font-weight="800" fill="${color}" letter-spacing="1.5">${text}</text>
  <text x="42" y="44" font-family="ui-monospace,Menlo,monospace" font-size="11" fill="#e8e8e8">${sub}</text></g>`;

const PICS = [
  /* 1: cancelled */
  `<svg viewBox="0 0 280 190" role="img" aria-hidden="true">
    <rect x="0" y="150" width="280" height="6" rx="3" fill="#8fbfa8" opacity=".5"/>
    ${board(40, 8, 200, 'INNSTILT', 'Gjøvik  16:54  R31')}
    ${train(70, 72, .8)}
    <text x="160" y="92" font-family="system-ui" font-size="22" font-weight="800" fill="${MINT2}">z</text>
    <text x="176" y="78" font-family="system-ui" font-size="16" font-weight="800" fill="${MINT2}">z</text>
  </svg>`,
  /* 2: Innstilt finds your trips */
  `<svg viewBox="0 0 280 190" role="img" aria-hidden="true">
    ${[['07:15', 'Innstilt', INK, Y], ['16:54', '+35 min', Y, INK], ['08:15', 'Innstilt', INK, Y]].map(([tm, b, bg, fg], i) => `
    <g transform="translate(22 ${14 + i * 56})">
      <rect width="236" height="46" rx="10" fill="${MINT}"/>
      <text x="14" y="29" font-family="system-ui" font-size="16" font-weight="800" fill="${INK}">${tm}</text>
      <rect x="70" y="13" width="${b.length * 8.4 + 12}" height="20" rx="5" fill="${bg}"/>
      <text x="76" y="28" font-family="system-ui" font-size="12" font-weight="800" fill="${fg}">${b}</text>
      <rect x="168" y="10" width="58" height="26" rx="7" fill="${G2}"/>
      <text x="197" y="28" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#fff">Krev</text>
    </g>`).join('')}
  </svg>`,
  /* 3: one tap, the form is filled in */
  `<svg viewBox="0 0 280 190" role="img" aria-hidden="true">
    <rect x="80" y="4" width="120" height="182" rx="18" fill="${G2}" stroke="${MINT2}" stroke-width="3"/>
    ${[0, 1, 2, 3].map(i => `<rect x="94" y="${22 + i * 30}" width="70" height="18" rx="5" fill="${MINT}"/>
      <circle cx="176" cy="${31 + i * 30}" r="8" fill="${STRIPE}"/><path d="M172 ${31 + i * 30} l3 3 l6 -6" stroke="#fff" stroke-width="2.2" fill="none"/>`).join('')}
    <rect x="94" y="146" width="92" height="26" rx="8" fill="${Y}"/>
    <text x="140" y="164" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="800" fill="${INK}">Send inn</text>
    <circle cx="196" cy="176" r="10" fill="${MINT2}" opacity=".9"/><path d="M196 170 v-26" stroke="${MINT2}" stroke-width="6" stroke-linecap="round" opacity=".9"/>
  </svg>`,
  /* 4: your details stay on the phone */
  `<svg viewBox="0 0 280 190" role="img" aria-hidden="true">
    <rect x="90" y="8" width="100" height="170" rx="16" fill="${G2}" stroke="${MINT2}" stroke-width="3"/>
    <rect x="114" y="74" width="52" height="44" rx="8" fill="${Y}"/>
    <path d="M122 76 v-12 a18 18 0 0 1 36 0 v12" stroke="${Y}" stroke-width="7" fill="none"/>
    <circle cx="140" cy="94" r="6" fill="${INK}"/><rect x="138" y="96" width="4" height="12" rx="2" fill="${INK}"/>
    ${['Navn', 'E-post', 'Konto', 'Billett'].map((l, i) => `<text x="${i % 2 ? 214 : 66}" y="${50 + Math.floor(i / 2) * 70}" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="700" fill="${MINT2}">${l}</text>
      <path d="M${i % 2 ? 200 : 80} ${56 + Math.floor(i / 2) * 70} q${i % 2 ? -14 : 14} 10 ${i % 2 ? -26 : 26} 14" stroke="${MINT2}" stroke-width="2" fill="none" opacity=".7"/>`).join('')}
  </svg>`,
];

export const INTRO = {
  no: [
    ['Toget innstilt eller over 30 min forsinket?', 'Da har du rett på erstatning etter Vy sine egne vilkår.'],
    ['Innstilt finner turene dine', 'Vi sjekker de faste reisene dine mot Entur sine data, 90 dager tilbake.'],
    ['Ett trykk – skjemaet er fylt ut', 'Du sjekker det og trykker «Send inn» selv.'],
    ['Opplysningene dine blir på telefonen', 'Vy sitt skjema trenger navn, e-post, kontonummer og billett. De lagres bare her.'],
  ],
  en: [
    ['Train cancelled or more than 30 min late?', 'Then you\'re entitled to compensation under Vy\'s own terms.'],
    ['Innstilt finds your trips', 'We check your regular trips against Entur\'s data, 90 days back.'],
    ['One tap – the form is filled in', 'You check it and press "Send inn" yourself.'],
    ['Your details stay on your phone', 'Vy\'s form needs your name, e-mail, account number and ticket. They are stored only here.'],
  ],
};

export const picture = i => PICS[i];
