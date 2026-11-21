/* The About page: version, why Innstilt exists, and how to get in touch.
   The text below is meant to be edited freely: one string per paragraph, Norwegian first, then English.
   Plain text only (it is escaped when shown). */

export const VERSION = '0.3.0';

/* Contact address for the "Contact us" button, split so it isn't sitting in the page as plain text
   for spam bots; it's put together only when someone taps the button. Empty = button hidden. */
const CONTACT = ['', ''];  /* e.g. ['post', 'innstilt.app'] */
export const contactAddress = () => (CONTACT[0] && CONTACT[1] ? `${CONTACT[0]}@${CONTACT[1]}` : '');

export const ABOUT = {
  no: [
    'Toget er innstilt. Igjen.',
    'Innstilt ble laget av en pendler som ble lei. På mange strekninger er innstilte og forsinkede tog blitt en del av hverdagen – samtidig som billettene blir dyrere.',
    'Du har rett på penger tilbake når toget er mer enn 30 minutter forsinket eller blir innstilt. Men skjemaet tar tid, du må huske hvilket tog det var og finne fram billettkoden, så de fleste lar det være. Pengene du ikke krever, blir værende hos Vy.',
    'Innstilt gjør jobben enklere: appen finner turene dine som var forsinket eller innstilt, ved hjelp av Entur sine åpne data, og åpner Vy sitt refusjonsskjema ferdig utfylt. Du sjekker og trykker «Send inn» selv – appen sender aldri noe på egen hånd.',
    'Hvert krav er kanskje ikke stort, men de blir mange. Og hvert krav er også et lite signal om hvor ofte toget svikter.',
    'Ingen innlogging, ingen konto, ingen sporing. Billettkoden, navnet, e-posten og kontonummeret ditt lagres bare på denne enheten og brukes bare til å fylle ut skjemaet.',
    'Innstilt er et fritidsprosjekt og er ikke tilknyttet Vy eller Entur.',
  ],
  en: [
    'The train is cancelled. Again.',
    'Innstilt ("cancelled") was made by a commuter who had had enough. On many lines, cancelled and late trains have become part of everyday life – while tickets keep getting more expensive.',
    'You are entitled to money back when a train is more than 30 minutes late or cancelled. But the form takes time, you have to remember which train it was and dig out your ticket code, so most people don\'t bother. The money nobody claims stays with Vy.',
    'Innstilt makes it easy: it finds your trips that were late or cancelled, using Entur\'s open data, and opens Vy\'s refund form already filled in. You check it and press "Send inn" yourself – the app never sends anything on its own.',
    'Each refund may be small, but they add up. And every claim is also a small signal of how often the trains let us down.',
    'No login, no account, no tracking. Your ticket code, name, e-mail and account number are stored only on this device and used only to fill in the form.',
    'Innstilt is a spare-time project and is not affiliated with Vy or Entur.',
  ],
};
