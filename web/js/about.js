/* The About page: version, why Innstilt exists, and how to get in touch.
   The text below is meant to be edited freely: one string per paragraph, Norwegian first, then English.
   Plain text only (it is escaped when shown). */

export const VERSION = '0.4.0';

/* Contact address for the "Contact us" button (Cloudflare Email Routing forwards it). Split, so it isn't sitting
   in the page as plain text for spam bots; it is put together only when someone taps the button. */
const CONTACT = ['perrong', 'innstilt.app'];
export const contactAddress = async () => CONTACT.join('@');

export const ABOUT = {
  no: [
    'Toget er innstilt. Igjen.',
    'Innstilt ble laget av en pendler som ble lei. På mange strekninger er innstilte og forsinkede tog blitt en del av hverdagen – samtidig som billettene blir dyrere.',
    'Du har rett på penger tilbake når toget er mer enn 30 minutter forsinket eller blir innstilt. Men skjemaet tar tid, du må huske hvilket tog det var og finne fram billettkoden, så de fleste lar det være. Pengene du ikke krever, blir værende hos Vy.',
    'Innstilt gjør jobben enklere: appen finner turene dine som var forsinket eller innstilt, ved hjelp av Entur sine åpne data, og åpner Vy sitt refusjonsskjema ferdig utfylt. Du sjekker og trykker «Send inn» selv – appen sender aldri noe på egen hånd.',
    'Hvert krav er kanskje ikke stort, men de blir mange. Og hvert krav er også et lite signal om hvor ofte toget svikter.',
    'Ingen innlogging, ingen konto, ingen sporing. Billettkoden, navnet, e-posten og kontonummeret ditt lagres bare på denne enheten og brukes bare til å fylle ut skjemaet.',
    'Hvis du vil, kan du dele anonym statistikk – bare hvor mange krav du har sendt og hvor mange kroner du har fått tilbake – så vi kan vise hvor mye Innstilt har hjulpet til sammen.',
    'Innstilt er et fritidsprosjekt og er ikke tilknyttet Vy eller Entur.',
  ],
  en: [
    'The train is cancelled. Again.',
    'Innstilt ("cancelled") was made by a commuter who had had enough. On many lines, cancelled and late trains have become part of everyday life – while tickets keep getting more expensive.',
    'You are entitled to money back when a train is more than 30 minutes late or cancelled. But the form takes time, you have to remember which train it was and dig out your ticket code, so most people don\'t bother. The money nobody claims stays with Vy.',
    'Innstilt makes it easy: it finds your trips that were late or cancelled, using Entur\'s open data, and opens Vy\'s refund form already filled in. You check it and press "Send inn" yourself – the app never sends anything on its own.',
    'Each refund may be small, but they add up. And every claim is also a small signal of how often the trains let us down.',
    'No login, no account, no tracking. Your ticket code, name, e-mail and account number are stored only on this device and used only to fill in the form.',
    'If you like, you can share anonymous statistics – just how many claims you sent and how many kroner you got back – so we can show how much Innstilt has helped in total.',
    'Innstilt is a spare-time project and is not affiliated with Vy or Entur.',
  ],
};

/* "Work in progress" on the About page: a heading, then one string per bullet. Edit freely. */
export const ROADMAP = {
  no: [
    'Under arbeid',
    'Apper for iPhone og Android, så Innstilt kan lastes ned fra App Store og Google Play.',
    'Flere selskaper enn Vy – som Ruter, SJ, Go-Ahead og Flytoget. Vi startet med Vy, fordi det er dem vi oftest blir stående på perrongen og vente på.',
  ],
  en: [
    'Work in progress',
    'Apps for iPhone and Android, so Innstilt can be downloaded from the App Store and Google Play.',
    'More companies than Vy – such as Ruter, SJ, Go-Ahead and Flytoget. We started with Vy because they are the ones we most often end up waiting for on the platform.',
  ],
};

/* Questions and answers on the About page (collapsed). [question, answer] pairs; edit or add freely. */
export const FAQ = {
  no: [
    ['Hvorfor må jeg trykke «Send inn» selv?',
      'Kravet sendes i ditt navn, og Vy sitt skjema er laget for mennesker – det har vern mot automatiske innsendinger. Innstilt fyller ut alt og finner riktig tog, så sjekker du og sender. Da har du alltid kontrollen, og Innstilt trenger verken innlogging eller tilgang til kontoen din hos Vy.'],
    ['Hvorfor åpner appen Vy sitt nettsted?',
      'Refusjon kan bare søkes gjennom Vy sitt eget skjema. Innstilt har ingen avtale med Vy og sender ingenting til dem selv – appen åpner skjemaet ferdig utfylt, og resten skjer mellom deg og Vy. I skjemaet kan du også legge til ekstra utgifter du fikk på grunn av toget, for eksempel taxi eller buss: svar «Ja» på spørsmålet om utgifter (Innstilt fyller inn «Nei») og legg ved kvitteringene.'],
    ['Hva får jeg ut av Innstilt?',
      'Du slipper å huske hvilke tog som var innstilt eller forsinket, finne billettkoden og fylle ut det samme skjemaet gang på gang. Innstilt sjekker turene dine de siste 90 dagene, viser hva du kan kreve, holder oversikt over krav og utbetalinger og sier fra før fristen går ut.'],
    ['Hva får dere ut av dette?',
      'Ingen penger fra kravene dine og ingen data om deg. Det vi får, er gleden av at innstilte tog ikke lenger er gratis for Vy: hvert krav er en liten regning for et tog som ikke kom. Krever nok folk, blir det kanskje billigere å kjøre togene i rute enn å betale tilbake. Ønsket vårt er enkelt – at kollektivtrafikken tar passasjerenes tid like alvorlig som den tar billettprisene.'],
    ['Hvor mye får jeg tilbake?',
      'Det er Vy som bestemmer beløpet, og det avhenger av billetten og hvor sent toget var. Se Vy sine vilkår for prisavslag og erstatning. Med månedsbillett er det et mindre beløp per tur – vår første utbetaling var 21 kr – men det blir fort noe når toget svikter ofte.'],
    ['Hvorfor vises ikke toget mitt?',
      'Innstilt viser tog som ble innstilt eller kom mer enn 30 minutter for sent, rundt de vanlige avgangstidene dine (±2 timer), på dager der billetten din var gyldig, de siste 90 dagene. Dagens tog vises bare de siste par timene; resten kommer med natten etter. Foreløpig er bare Vy sine tog med – bruk «En annen tur» for en tur utenom de faste.'],
    ['Er Innstilt laget av Vy?',
      'Nei. Innstilt er et uavhengig fritidsprosjekt laget av en lei pendler, og er ikke tilknyttet Vy eller Entur. Togdataene er åpne data fra Entur.'],
    ['Hva skjer med opplysningene mine?',
      'Billettkode, navn, e-post og kontonummer lagres bare på denne enheten og brukes bare til å fylle ut Vy sitt skjema. Vy sitt skjema tar imot opplysningene i nettadressen, så de blir også stående i nettleserens historikk. Togdata hentes fra Entur, som ser hvilke stasjoner appen spør om, men ikke hvem du er. Vil du, kan du dele anonym statistikk – bare antall krav og kroner per måned – til den felles telleren. Du kan laste ned eller slette alt i Innstillinger.'],
    ['Koster det noe?',
      'Nei. Innstilt er gratis og uten reklame. Vil du bidra til domene og app-butikker, kan du spandere en billett.'],
  ],
  en: [
    ['Why do I have to press "Send inn" myself?',
      'The claim is sent in your name, and Vy\'s form is made for people – it is protected against automated submissions. Innstilt fills in everything and picks the right train; you check it and send it. That way you are always in control, and Innstilt never needs a login or access to your Vy account.'],
    ['Why does the app open Vy\'s website?',
      'Refunds can only be claimed through Vy\'s own form. Innstilt has no agreement with Vy and sends nothing to them itself – it opens the form already filled in, and the rest is between you and Vy. In the form you can also add extra costs the train caused you, such as a taxi or bus: answer "Ja" to the question about expenses (Innstilt fills in "Nei") and attach the receipts.'],
    ['What do I get out of Innstilt?',
      'No more remembering which trains were cancelled or late, digging out the ticket code and filling in the same form again and again. Innstilt checks your trips for the last 90 days, shows what you can claim, keeps track of claims and payouts, and warns you before the deadline.'],
    ['What do you get out of this?',
      'No money from your claims and no data about you. What we get is the satisfaction that cancelled trains are no longer free for Vy: every claim is a small bill for a train that didn\'t come. If enough people claim, running the trains on time might become cheaper than paying back. Our wish is simple – that public transport takes passengers\' time as seriously as it takes ticket prices.'],
    ['How much do I get back?',
      'Vy decides the amount; it depends on your ticket and how late the train was. See Vy\'s terms for price reductions and compensation. With a monthly pass it is a smaller amount per trip – our first payout was 21 kr – but it adds up when the trains fail often.'],
    ['Why isn\'t my train shown?',
      'Innstilt shows trains that were cancelled or more than 30 minutes late, around your usual departure times (±2 hours), on days your ticket was valid, in the last 90 days. Today\'s trains only cover the last couple of hours; the rest arrive the night after. For now only Vy\'s trains are included – use "Another trip" for a journey outside your regular ones.'],
    ['Is Innstilt made by Vy?',
      'No. Innstilt is an independent spare-time project by a fed-up commuter and is not affiliated with Vy or Entur. The train data is open data from Entur.'],
    ['What happens to my details?',
      'Ticket code, name, e-mail and account number are stored only on this device and used only to fill in Vy\'s form. Vy\'s form takes the details in its web address, so they also stay in your browser history. Train data comes from Entur, which sees which stations the app asks about, but not who you are. If you like, you can share anonymous statistics – just numbers of claims and kroner per month – for the shared counter. You can download or delete everything in Settings.'],
    ['Does it cost anything?',
      'No. Innstilt is free and ad-free. If you want to help with the domain and app stores, you can buy us a ticket.'],
  ],
};
