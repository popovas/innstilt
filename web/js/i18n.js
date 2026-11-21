/* All user-facing text, Norwegian (bokmål) and English. t('key', {vars}) picks the current language. */

const STRINGS = {
  no: {
    tagline: 'Få pengene tilbake fra Vy for forsinkede og innstilte tog.',
    privacyTitle: 'Dine data blir hos deg',
    privacyBody: 'Billettkode, navn, e-post og kontonummer lagres bare i denne nettleseren på denne enheten, og brukes bare til å fylle ut Vy sitt refusjonsskjema. Ingenting av dette sendes til oss eller andre. Vil du, kan du dele anonym statistikk – bare antall krav og kroner.',
    notVy: 'Innstilt er ikke tilknyttet Vy.',
    start: 'Kom i gang',
    navTrips: 'Turer', navClaims: 'Krav', navSettings: 'Innstillinger',
    /* setup */
    setupTitle: 'Oppsett',
    secTicket: 'Billett', secYou: 'Deg', secRoute: 'Faste reiser',
    ticketHelp: 'Finn referansekoden på kvitteringen i Vy-appen, og «Går ut» på billetten. En månedsbillett får ny kode hver måned.',
    refCode: 'Referansekode', refCodePh: 'XXX-XXX-XXX',
    validFrom: 'Gyldig fra', validTo: 'Gyldig til («Går ut»)', datePh: 'dd/mm/åååå', timePh: 'tt:mm',
    errDate: 'Skriv datoen som dd/mm/åååå og tiden som tt:mm.',
    youWhy: 'Vy sitt skjema krever navn, e-post og kontonummer: Vy betaler refusjonen til kontoen din og sender saksnummeret på e-post. Innstilt lagrer opplysningene bare på denne enheten og fyller dem inn i skjemaet når du krever. Vi samler ikke inn noe, og ingenting av dette sendes til oss.',
    name: 'Fullt navn', email: 'E-post', emailHelp: 'Vy sender saksnummeret hit.',
    account: 'Kontonummer for utbetaling', accountPh: '11 siffer',
    from: 'Fra', to: 'Til', stationPh: 'Søk etter stasjon …',
    route: 'Reise', routesHelp: 'Strekninger du tar ofte, f.eks. hjem ↔ jobb. Vi sjekker begge retninger.',
    addRoute: 'Legg til en reise til', removeRoute: 'Fjern denne reisen',
    timesOut: 'Vanlige avganger dit', timesBack: 'Vanlige avganger tilbake',
    timesHelp: 'F.eks. 07:15, 08:15. Vi viser bare tog ±2 timer rundt disse. Tomt = alle tider.',
    errSame: '«Fra» og «Til» må være forskjellige stasjoner.',
    /* another trip */
    otherTrip: 'En annen tur', otherHelp: 'For en tur utenom de faste reisene dine.',
    date: 'Dato', approxTime: 'Omtrent når (±2 t)', findTrains: 'Finn tog',
    offline: 'Du er frakoblet. Turer som allerede er lastet, vises fortsatt.',
    offlineHint: 'Du ser ut til å være uten nett.', retry: 'Prøv igjen',
    dataFailed: 'Fikk ikke hentet togdataene.', daysFailed: 'Fikk ikke hentet togdata for {n} dager.',
    liveFailedShort: 'Fikk ikke hentet dagens tog fra Entur.', searchFailed: 'Stasjonssøket svarer ikke – sjekk nettet.',
    otherFuture: 'Den dagen har ikke kommet ennå.', liveFailed: 'Fikk ikke hentet dagens tog. Prøv igjen om litt.',
    live: 'direkte', loadingLive: 'Henter dagens tog …', planned: 'Ruteplan', dataTonight: 'Data kommer i natt',
    expLate: 'Ventet {min} min forsinket', expOnTime: 'Ventet i rute',
    notYet: 'Kan kreves etter avgang', whenArrived: 'Kan kreves når toget er framme',
    otherTooOld: 'Vy tar bare imot krav for de siste {days} dagene.',
    otherNoData: 'Vi har ikke data for denne dagen.', otherNone: 'Fant ingen tog mellom disse stasjonene da.',
    onTime: 'I rute', noData: 'Ikke målt', alreadySent: 'Sendt ✓', noTicket: 'Ingen gyldig billett',
    saveRoute: 'Lagre som fast reise', routeSaved: 'Lagret som fast reise',
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
    tripsIntro: 'Forsinkelser over {min} min og innstilte tog på de faste reisene dine, de siste {days} dagene.',
    loading: 'Henter data for {date} …', noTrips: 'Ingen forsinkelser å kreve – eller så har du allerede krevd dem. 🎉',
    needSetup: 'Fyll ut oppsettet først.',
    cancelled: 'Innstilt', late: '{min} min forsinket', nextTrain: 'Neste tog {line} {time}: {min} min senere fram',
    claimBtn: 'Krev refusjon', dataFrom: 'Data: Entur (NLOD). I dag: direkte; tidligere dager: oppdateres hver natt.',
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
    urgentTop: '{n} turer må kreves snart – de ligger nederst i listen.', daysLeft: '{n} dager igjen å kreve', lastDay: 'Siste dag å kreve er i dag',
    alreadyClaimed: 'Allerede krevd', claimedEarlier: 'krevd utenom Innstilt',
    removeClaim: 'Fjern kravet', removeClaimConfirm: 'Fjerne dette kravet fra listen? Turen dukker opp igjen under Turer.',
    /* claims */
    claimsTitle: 'Dine krav', noClaims: 'Ingen krav sendt ennå.',
    pending: 'Venter', paid: 'Utbetalt', rejected: 'Avslått', amount: 'Beløp (kr)',
    totals: '{sent} sendt · {paid} utbetalt ({kr} kr) · {rejected} avslått',
    /* settings */
    settingsTitle: 'Innstillinger', language: 'Språk', bookmarkTitle: 'Bokmerket (PC/Mac)',
    bookmarkBody: 'Dra knappen til bokmerkelinjen. Den fyller ut tid og tog i Vy sitt skjema for deg.',
    bookmarkClick: 'Dra knappen til bokmerkelinjen i stedet for å klikke på den her.',
    yourData: 'Dine data', exportData: 'Last ned dataene mine', importData: 'Last inn data fra fil',
    moveHelp: 'Bytte telefon eller bruke flere enheter? Last ned dataene her og last dem inn der.',
    importFirst: 'Har du allerede Innstilt på en annen enhet?',
    importConfirm: 'Laste inn data fra filen? Billett, profil og faste reiser på denne enheten erstattes. Krav slås sammen.',
    importDone: 'Lastet inn: {claims} nye krav, {tickets} billetter, {routes} faste reiser.',
    importBad: 'Filen ser ikke ut som en Innstilt-fil.', deleteData: 'Slett alt',
    deleteConfirm: 'Slette billett, profil og kravlogg fra denne enheten?',
    shareTitle: 'Vis hvor mye Innstilt hjelper?',
    shareBody: 'Del anonymt hvor mange krav du har sendt og hvor mye du har fått tilbake, så viser vi en felles teller. Ingen navn, billetter, kontonummer, stasjoner eller reiser – bare tallene under. Slår du det av i Innstillinger, slettes det du har delt.',
    sharePreview: 'Se nøyaktig hva som sendes', shareYes: 'Ja, del anonymt', shareNo: 'Nei takk',
    shareSetting: 'Del anonym statistikk (antall krav og kroner per måned)',
    counter: '{kr} kr hentet tilbake fra Vy så langt – penger som ellers ble stående igjen på perrongen.',
    counterNote: '{n} utbetalinger til Innstilt-brukere som deler anonymt.',
    counterNote1: '1 utbetaling til en Innstilt-bruker som deler anonymt.',
    jabShort: 'Månedens mest innstilte:', jabShortLast: 'Forrige måneds mest innstilte:',
    jabMonth: '🏆 Månedens mest innstilte linjer', jabLastMonth: '🏆 Forrige måneds mest innstilte linjer',
    jabNote: 'Andel planlagte stopp der toget aldri kom ({from}–{to}). Kilde: Entur.',
    about: 'Om Innstilt', coffee: 'Spander en kaffe ☕', version: 'Versjon {v}', back: 'Tilbake',
    contact: 'Kontakt oss', contactBody: 'Spørsmål, feil eller ideer? Skriv til oss – meldingen åpnes i din egen e-postapp.',
    bmCardTitle: 'Spar tid: legg Innstilt i bokmerkelinjen',
    bmCardBody: 'Vy sitt skjema godtar bare avgangstiden når du skriver den inn selv. Med bokmerket gjøres det – og togvalget – med ett klikk. Vis bokmerkelinjen (⌘⇧B på Mac, Ctrl+Shift+B på Windows) og dra knappen opp dit.',
    homeTitle: 'Legg Innstilt på Hjem-skjermen',
    homeIos: 'Trykk Del-knappen (firkanten med pil opp) i Safari og velg «Legg til på Hjem-skjerm». Da åpnes Innstilt som en egen app.',
    homeAndroid: 'Trykk menyen (⋮) i nettleseren og velg «Installer app» eller «Legg til på startsiden». Da åpnes Innstilt som en egen app.',
    homeIosNote: 'Gjør det før oppsettet: på iPhone har appen på Hjem-skjermen egne data, adskilt fra Safari.',
    homeInstall: 'Installer',
    bmDone: 'Ferdig, den ligger der', bmLater: 'Senere', bmHave: 'Jeg har lagt bokmerket i bokmerkelinjen',
  },
  en: {
    tagline: 'Get your money back from Vy for delayed and cancelled trains.',
    privacyTitle: 'Your data stays with you',
    privacyBody: 'Ticket code, name, e-mail and account number are stored only in this browser on this device, and used only to fill in Vy\'s refund form. None of it is sent to us or anyone else. If you like, you can share anonymous statistics – just numbers of claims and kroner.',
    notVy: 'Innstilt is not affiliated with Vy.',
    start: 'Get started',
    navTrips: 'Trips', navClaims: 'Claims', navSettings: 'Settings',
    setupTitle: 'Setup',
    secTicket: 'Ticket', secYou: 'You', secRoute: 'Regular trips',
    ticketHelp: 'The reference code is on the receipt in the Vy app; the expiry ("Går ut") is on the ticket. A monthly pass gets a new code every month.',
    refCode: 'Reference code', refCodePh: 'XXX-XXX-XXX',
    validFrom: 'Valid from', validTo: 'Valid to ("Går ut")', datePh: 'dd/mm/yyyy', timePh: 'hh:mm',
    errDate: 'Write the date as dd/mm/yyyy and the time as hh:mm.',
    youWhy: 'Vy\'s form needs your name, e-mail and account number: Vy pays the refund to your account and e-mails you the case number. Innstilt keeps them only on this device and fills them into the form when you claim. We don\'t collect anything, and none of it is sent to us.',
    name: 'Full name', email: 'E-mail', emailHelp: 'Vy sends the case number here.',
    account: 'Bank account for the payout', accountPh: '11 digits',
    from: 'From', to: 'To', stationPh: 'Search for a station …',
    route: 'Trip', routesHelp: 'Journeys you make often, e.g. home ↔ work. Both directions are checked.',
    addRoute: 'Add another trip', removeRoute: 'Remove this trip',
    timesOut: 'Usual departures there', timesBack: 'Usual departures back',
    timesHelp: 'E.g. 07:15, 08:15. Only trains ±2 hours around these are shown. Empty = all times.',
    errSame: '"From" and "To" must be different stations.',
    otherTrip: 'Another trip', otherHelp: 'For a journey outside your regular trips.',
    date: 'Date', approxTime: 'Around when (±2 h)', findTrains: 'Find trains',
    offline: 'You are offline. Trips already loaded are still shown.',
    offlineHint: 'You seem to be offline.', retry: 'Try again',
    dataFailed: 'Couldn\'t load the train data.', daysFailed: 'Couldn\'t load train data for {n} days.',
    liveFailedShort: 'Couldn\'t load today\'s trains from Entur.', searchFailed: 'Station search isn\'t answering – check your connection.',
    otherFuture: 'That day hasn\'t happened yet.', liveFailed: 'Couldn\'t load today\'s trains. Try again shortly.',
    live: 'live', loadingLive: 'Loading today\'s trains …', planned: 'Scheduled', dataTonight: 'Data arrives tonight',
    expLate: 'Expected {min} min late', expOnTime: 'Expected on time',
    notYet: 'Claimable after departure', whenArrived: 'Claimable once it arrives',
    otherTooOld: 'Vy only accepts claims for the last {days} days.',
    otherNoData: 'We don\'t have data for that day.', otherNone: 'No trains found between these stations then.',
    onTime: 'On time', noData: 'Not measured', alreadySent: 'Sent ✓', noTicket: 'No valid ticket',
    saveRoute: 'Save as a regular trip', routeSaved: 'Saved as a regular trip',
    save: 'Save', saved: 'Saved',
    errRef: 'The code looks like XXX-XXX-XXX', errAccount: 'The account number needs 11 digits – check for typos.',
    errEmail: 'Check the e-mail address.', errName: 'Enter your name.', errStation: 'Pick a station from the list.',
    errTimes: 'Write times like 07:15, 16:54.', errDates: '"Valid to" must be after "Valid from".',
    tickets: 'Tickets', addTicket: 'Add a new ticket', remove: 'Remove', validNow: 'valid now',
    noticeNone: 'No ticket saved yet.', noticeUndated: 'Add validity dates to your ticket so each trip uses the right code.',
    noticeExpired: 'Your ticket expired on {date}. Older trips can still be claimed – add the new ticket for newer ones.',
    noticeExpiring: 'Your ticket expires {date}. Remember to add the new one when you renew.',
    tripsTitle: 'Trips you can claim',
    tripsIntro: 'Delays over {min} min and cancelled trains on your regular trips, the last {days} days.',
    loading: 'Loading data for {date} …', noTrips: 'Nothing to claim – or you already have. 🎉',
    needSetup: 'Complete the setup first.',
    cancelled: 'Cancelled', late: '{min} min late', nextTrain: 'Next train {line} {time}: arrived {min} min later',
    claimBtn: 'Claim refund', dataFrom: 'Data: Entur (NLOD). Today: live; earlier days: updated nightly.',
    noTicketDay: '{n} days without a valid ticket were skipped.',
    claimTitle: 'Send the claim at Vy',
    claimOpened: 'Vy\'s form opened in a new tab, already filled in.',
    claimStepsBookmark: 'Click the "👻 Innstilt: fyll ut" bookmark there, check the form and press "Send inn".',
    claimStepsManual: 'There you need to do two things yourself, because Vy requires it:',
    claimStep1: 'Type the departure time again:', claimStep2: 'Pick the train in the list:', claimStep3: 'Check the form and press "Send inn".',
    claimTip: 'Tip: with the "👻 Innstilt: fyll ut" bookmark this is one click (see Settings).',
    caseNo: 'Case number from Vy (optional)', markSent: 'I\'ve sent it', notSent: 'Not sent',
    openAgain: 'Open the form again',
    urgentTop: '{n} trips must be claimed soon – they are at the bottom of the list.', daysLeft: '{n} days left to claim', lastDay: 'Today is the last day to claim',
    alreadyClaimed: 'Already claimed', claimedEarlier: 'claimed outside Innstilt',
    removeClaim: 'Remove claim', removeClaimConfirm: 'Remove this claim from the list? The trip shows up again under Trips.',
    claimsTitle: 'Your claims', noClaims: 'No claims sent yet.',
    pending: 'Pending', paid: 'Paid', rejected: 'Rejected', amount: 'Amount (kr)',
    totals: '{sent} sent · {paid} paid ({kr} kr) · {rejected} rejected',
    settingsTitle: 'Settings', language: 'Language', bookmarkTitle: 'The bookmark (PC/Mac)',
    bookmarkBody: 'Drag the button to your bookmarks bar. It fills in the time and train in Vy\'s form for you.',
    bookmarkClick: 'Drag the button to your bookmarks bar instead of clicking it here.',
    yourData: 'Your data', exportData: 'Download my data', importData: 'Load data from a file',
    moveHelp: 'New phone or several devices? Download your data here and load it there.',
    importFirst: 'Already using Innstilt on another device?',
    importConfirm: 'Load data from the file? Ticket, profile and regular trips on this device are replaced. Claims are merged.',
    importDone: 'Loaded: {claims} new claims, {tickets} tickets, {routes} regular trips.',
    importBad: 'That file doesn\'t look like an Innstilt file.', deleteData: 'Delete everything',
    deleteConfirm: 'Delete ticket, profile and claim log from this device?',
    shareTitle: 'Show how much Innstilt helps?',
    shareBody: 'Share, anonymously, how many claims you\'ve sent and how much you got back, and we\'ll show a shared counter. No names, tickets, account numbers, stations or trips – just the numbers below. Turn it off in Settings and what you shared is deleted.',
    sharePreview: 'See exactly what is sent', shareYes: 'Yes, share anonymously', shareNo: 'No thanks',
    shareSetting: 'Share anonymous statistics (number of claims and kroner per month)',
    counter: '{kr} kr recovered from Vy so far – money that would otherwise have been left on the platform.',
    counterNote: '{n} payouts to Innstilt users who share anonymously.',
    counterNote1: '1 payout to an Innstilt user who shares anonymously.',
    jabShort: 'Most cancelled this month:', jabShortLast: 'Most cancelled last month:',
    jabMonth: '🏆 Most cancelled lines of the month', jabLastMonth: '🏆 Most cancelled lines of last month',
    jabNote: 'Share of planned stops where the train never came ({from}–{to}). Source: Entur.',
    about: 'About Innstilt', coffee: 'Buy me a coffee ☕', version: 'Version {v}', back: 'Back',
    contact: 'Contact us', contactBody: 'Questions, bugs or ideas? Write to us – the message opens in your own e-mail app.',
    bmCardTitle: 'Save time: put Innstilt in your bookmarks bar',
    bmCardBody: 'Vy\'s form only accepts the departure time when you type it yourself. The bookmark does that – and picks the train – in one click. Show the bookmarks bar (⌘⇧B on Mac, Ctrl+Shift+B on Windows) and drag the button up there.',
    homeTitle: 'Put Innstilt on your home screen',
    homeIos: 'Tap the Share button (the square with an arrow) in Safari and choose "Add to Home Screen". Innstilt then opens like an app.',
    homeAndroid: 'Tap the browser menu (⋮) and choose "Install app" or "Add to Home screen". Innstilt then opens like an app.',
    homeIosNote: 'Do it before the setup: on iPhone, the home-screen app keeps its own data, separate from Safari.',
    homeInstall: 'Install',
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
