/* All user-facing text, Norwegian (bokmål) and English. t('key', {vars}) picks the current language. */

const STRINGS = {
  no: {
    tagline: 'Få pengene tilbake fra Vy for forsinkede og innstilte tog.',
    privacyTitle: 'Dine data blir hos deg',
    privacyBody: 'Billettkode, navn, e-post og kontonummer lagres bare i denne nettleseren på denne enheten, og brukes bare til å fylle ut Vy sitt refusjonsskjema. Ingenting sendes til oss eller andre.',
    notVy: 'Innstilt er ikke tilknyttet Vy.',
    start: 'Kom i gang',
    navTrips: 'Turer', navClaims: 'Krav', navSettings: 'Innstillinger',
    /* setup */
    setupTitle: 'Oppsett',
    secTicket: 'Billett', secYou: 'Deg', secRoute: 'Reisen din',
    ticketHelp: 'Finn referansekoden på kvitteringen i Vy-appen, og «Går ut» på billetten. En månedsbillett får ny kode hver måned.',
    refCode: 'Referansekode', refCodePh: 'XXX-XXX-XXX',
    validFrom: 'Gyldig fra', validTo: 'Gyldig til («Går ut»)', datePh: 'dd/mm/åååå', timePh: 'tt:mm',
    errDate: 'Skriv datoen som dd/mm/åååå og tiden som tt:mm.',
    name: 'Fullt navn', email: 'E-post', emailHelp: 'Vy sender saksnummeret hit.',
    account: 'Kontonummer for utbetaling', accountPh: '11 siffer',
    home: 'Hjemstasjon', work: 'Jobbstasjon', stationPh: 'Søk etter stasjon …',
    timesOut: 'Vanlige avganger hjemmefra', timesBack: 'Vanlige avganger hjem',
    timesHelp: 'F.eks. 07:15, 08:15. Vi viser bare tog ±2 timer rundt disse. Tomt = alle tider.',
    save: 'Lagre', saved: 'Lagret',
    errRef: 'Koden skal se slik ut: XXX-XXX-XXX', errAccount: 'Kontonummeret må ha 11 siffer – sjekk for skrivefeil.',
    errEmail: 'Sjekk e-postadressen.', errName: 'Skriv inn navnet ditt.', errStation: 'Velg en stasjon fra listen.',
    errTimes: 'Skriv tider som 07:15, 16:54.', errDates: '«Gyldig til» må være etter «Gyldig fra».',
    /* tickets */
    tickets: 'Billetter', addTicket: 'Legg til ny billett', remove: 'Fjern', validNow: 'gyldig nå',
    noticeNone: 'Ingen billett lagret ennå.', noticeUndated: 'Legg inn gyldighetsdatoer på billetten, så brukes riktig kode for hver tur.',
    noticeExpired: 'Billetten gikk ut {date}. Eldre turer kan fortsatt kreves – legg til den nye billetten for nyere turer.',
    noticeExpiring: 'Billetten går ut {date}. Husk å legge til den nye når du fornyer.',
    /* trips */
    tripsTitle: 'Turer du kan kreve refusjon for',
    tripsIntro: 'Forsinkelser over {min} min og innstilte tog på reisen din, de siste {days} dagene.',
    loading: 'Henter data for {date} …', noTrips: 'Ingen forsinkelser å kreve – eller så har du allerede krevd dem. 🎉',
    needSetup: 'Fyll ut oppsettet først.',
    cancelled: 'Innstilt', late: '{min} min forsinket', nextTrain: 'Neste tog {line} {time}: {min} min senere fram',
    claimBtn: 'Krev refusjon', dataFrom: 'Data: Entur (NLOD). Oppdateres hver natt.',
    noTicketDay: '{n} dager uten gyldig billett ble hoppet over.',
    /* claim dialog */
    claimTitle: 'Send kravet hos Vy',
    claimOpened: 'Vy sitt skjema er åpnet i en ny fane, ferdig utfylt.',
    claimStepsBookmark: 'Klikk bokmerket «👻 Innstilt: fyll ut» der, sjekk skjemaet og trykk «Send inn».',
    claimStepsManual: 'Der må du gjøre to ting selv, fordi Vy krever det:',
    claimStep1: 'Skriv avgangstiden på nytt:', claimStep2: 'Velg toget i listen:', claimStep3: 'Sjekk skjemaet og trykk «Send inn».',
    claimTip: 'Tips: med bokmerket «👻 Innstilt: fyll ut» blir dette ett klikk (se Innstillinger).',
    caseNo: 'Saksnummer fra Vy (valgfritt)', markSent: 'Jeg har sendt det', notSent: 'Ikke sendt',
    openAgain: 'Åpne skjemaet igjen',
    /* claims */
    claimsTitle: 'Dine krav', noClaims: 'Ingen krav sendt ennå.',
    pending: 'Venter', paid: 'Utbetalt', rejected: 'Avslått', amount: 'Beløp (kr)',
    totals: '{sent} sendt · {paid} utbetalt ({kr} kr) · {rejected} avslått',
    /* settings */
    settingsTitle: 'Innstillinger', language: 'Språk', bookmarkTitle: 'Bokmerket (PC/Mac)',
    bookmarkBody: 'Dra knappen til bokmerkelinjen. Den fyller ut tid og tog i Vy sitt skjema for deg.',
    bookmarkClick: 'Dra knappen til bokmerkelinjen i stedet for å klikke på den her.',
    yourData: 'Dine data', exportData: 'Last ned dataene mine', deleteData: 'Slett alt',
    deleteConfirm: 'Slette billett, profil og kravlogg fra denne enheten?',
    about: 'Om Innstilt', coffee: 'Spander en kaffe ☕',
    bmCardTitle: 'Spar tid: legg Innstilt i bokmerkelinjen',
    bmCardBody: 'Vy sitt skjema godtar bare avgangstiden når du skriver den inn selv. Med bokmerket gjøres det – og togvalget – med ett klikk. Vis bokmerkelinjen (⌘⇧B på Mac, Ctrl+Shift+B på Windows) og dra knappen opp dit.',
    bmDone: 'Ferdig, den ligger der', bmLater: 'Senere', bmHave: 'Jeg har lagt bokmerket i bokmerkelinjen',
  },
  en: {
    tagline: 'Get your money back from Vy for delayed and cancelled trains.',
    privacyTitle: 'Your data stays with you',
    privacyBody: 'Ticket code, name, e-mail and account number are stored only in this browser on this device, and used only to fill in Vy\'s refund form. Nothing is sent to us or anyone else.',
    notVy: 'Innstilt is not affiliated with Vy.',
    start: 'Get started',
    navTrips: 'Trips', navClaims: 'Claims', navSettings: 'Settings',
    setupTitle: 'Setup',
    secTicket: 'Ticket', secYou: 'You', secRoute: 'Your commute',
    ticketHelp: 'The reference code is on the receipt in the Vy app; the expiry ("Går ut") is on the ticket. A monthly pass gets a new code every month.',
    refCode: 'Reference code', refCodePh: 'XXX-XXX-XXX',
    validFrom: 'Valid from', validTo: 'Valid to ("Går ut")', datePh: 'dd/mm/yyyy', timePh: 'hh:mm',
    errDate: 'Write the date as dd/mm/yyyy and the time as hh:mm.',
    name: 'Full name', email: 'E-mail', emailHelp: 'Vy sends the case number here.',
    account: 'Bank account for the payout', accountPh: '11 digits',
    home: 'Home station', work: 'Work station', stationPh: 'Search for a station …',
    timesOut: 'Usual departures from home', timesBack: 'Usual departures home',
    timesHelp: 'E.g. 07:15, 08:15. Only trains ±2 hours around these are shown. Empty = all times.',
    save: 'Save', saved: 'Saved',
    errRef: 'The code looks like XXX-XXX-XXX', errAccount: 'The account number needs 11 digits – check for typos.',
    errEmail: 'Check the e-mail address.', errName: 'Enter your name.', errStation: 'Pick a station from the list.',
    errTimes: 'Write times like 07:15, 16:54.', errDates: '"Valid to" must be after "Valid from".',
    tickets: 'Tickets', addTicket: 'Add a new ticket', remove: 'Remove', validNow: 'valid now',
    noticeNone: 'No ticket saved yet.', noticeUndated: 'Add validity dates to your ticket so each trip uses the right code.',
    noticeExpired: 'Your ticket expired on {date}. Older trips can still be claimed – add the new ticket for newer ones.',
    noticeExpiring: 'Your ticket expires {date}. Remember to add the new one when you renew.',
    tripsTitle: 'Trips you can claim',
    tripsIntro: 'Delays over {min} min and cancelled trains on your commute, the last {days} days.',
    loading: 'Loading data for {date} …', noTrips: 'Nothing to claim – or you already have. 🎉',
    needSetup: 'Complete the setup first.',
    cancelled: 'Cancelled', late: '{min} min late', nextTrain: 'Next train {line} {time}: arrived {min} min later',
    claimBtn: 'Claim refund', dataFrom: 'Data: Entur (NLOD). Updated nightly.',
    noTicketDay: '{n} days without a valid ticket were skipped.',
    claimTitle: 'Send the claim at Vy',
    claimOpened: 'Vy\'s form opened in a new tab, already filled in.',
    claimStepsBookmark: 'Click the "👻 Innstilt: fyll ut" bookmark there, check the form and press "Send inn".',
    claimStepsManual: 'There you need to do two things yourself, because Vy requires it:',
    claimStep1: 'Type the departure time again:', claimStep2: 'Pick the train in the list:', claimStep3: 'Check the form and press "Send inn".',
    claimTip: 'Tip: with the "👻 Innstilt: fyll ut" bookmark this is one click (see Settings).',
    caseNo: 'Case number from Vy (optional)', markSent: 'I\'ve sent it', notSent: 'Not sent',
    openAgain: 'Open the form again',
    claimsTitle: 'Your claims', noClaims: 'No claims sent yet.',
    pending: 'Pending', paid: 'Paid', rejected: 'Rejected', amount: 'Amount (kr)',
    totals: '{sent} sent · {paid} paid ({kr} kr) · {rejected} rejected',
    settingsTitle: 'Settings', language: 'Language', bookmarkTitle: 'The bookmark (PC/Mac)',
    bookmarkBody: 'Drag the button to your bookmarks bar. It fills in the time and train in Vy\'s form for you.',
    bookmarkClick: 'Drag the button to your bookmarks bar instead of clicking it here.',
    yourData: 'Your data', exportData: 'Download my data', deleteData: 'Delete everything',
    deleteConfirm: 'Delete ticket, profile and claim log from this device?',
    about: 'About Innstilt', coffee: 'Buy me a coffee ☕',
    bmCardTitle: 'Save time: put Innstilt in your bookmarks bar',
    bmCardBody: 'Vy\'s form only accepts the departure time when you type it yourself. The bookmark does that – and picks the train – in one click. Show the bookmarks bar (⌘⇧B on Mac, Ctrl+Shift+B on Windows) and drag the button up there.',
    bmDone: 'Done, it\'s there', bmLater: 'Later', bmHave: 'I\'ve added the bookmark to my bookmarks bar',
  },
};

const KEY = 'innstilt.lang';
let lang = (() => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'no' || saved === 'en') return saved;
  } catch { /* storage blocked */ }
  return /^(nb|nn|no)\b/i.test(navigator.language || '') ? 'no' : 'en';
})();

export const getLang = () => lang;

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'no';
  try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang === 'no' ? 'nb' : 'en';
}

export function t(key, vars = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.no[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

export function fmtDate(ms, withTime = false) {
  return new Intl.DateTimeFormat(lang === 'no' ? 'nb-NO' : 'en-GB', {
    timeZone: 'Europe/Oslo', day: 'numeric', month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(ms));
}

export function fmtDay(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'no' ? 'nb-NO' : 'en-GB', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

setLang(lang);
