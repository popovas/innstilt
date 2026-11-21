# Google Play – listing and forms (copy-paste)

Files in this folder: `icon-512.png` (store icon), `feature-graphic-no.png` / `-en.png` (1024×500),
`screenshots/` (1080×2160, made from demo data by `tools/screenshots.py --play`; NO and EN).
App bundle: `cd app && npm run bundle` → `app/android/app/build/outputs/bundle/release/app-release.aab`.

## Store settings

| Field | Value |
|---|---|
| App name | **Innstilt – togerstatning** (24/30) · EN: **Innstilt – train compensation** (29/30) |
| Default language | Norsk bokmål (nb-NO), with English (en-GB) as a translation |
| App or game | App |
| Free or paid | Free |
| Category | Travel & Local |
| Contact e-mail | perrong@innstilt.app |
| Website | https://innstilt.app |
| Privacy policy | https://innstilt.app/personvern.html |
| Ads | No ads |

## Short description (max 80)

- **NO:** Krev erstatning for innstilte og forsinkede Vy-tog – skjemaet fylles ut for deg. (79)
- **EN:** Claim compensation for cancelled and late Vy trains – the form fills itself in. (79)

## Full description – Norsk

```
Toget innstilt igjen? Over 30 minutter forsinket? Etter Vy sine egne vilkår har du rett på erstatning – men skjemaet er tungvint, så de fleste lar det være.

Innstilt gjør jobben for deg:
• Finner turene du kan kreve: innstilte og over 30 min forsinkede tog på de faste reisene dine, 90 dager tilbake (Entur sine åpne data).
• Ett trykk på «Krev refusjon» åpner Vy sitt skjema ferdig utfylt – avgangstid og tog settes inn for deg.
• Du sjekker og trykker «Send inn» selv. Saksnummeret lagres automatisk.
• Holder oversikt over kravene dine: sendt, utbetalt, avslått – og hvor mye du har fått tilbake.
• «Nå»-tavle: dine avganger akkurat nå, med spor, forsinkelser og innstillinger.
• Varsel (hvis du vil) når et av de vanlige togene dine er innstilt eller over 30 min forsinket.
• Støtter billetter fra Vy, og fra Ruter-appen og Entur.

Dine opplysninger blir på telefonen
Vy sitt skjema trenger navn, e-post, kontonummer og billett. Innstilt lagrer dem kryptert på telefonen og sender dem bare til Vy, når du selv sender et krav. Ingen innlogging, ingen konto, ingen reklame, ingen sporing. Appen ber ikke om tilgang til kamera, posisjon eller kontakter.

Laget av en lei pendler på Gjøvikbanen. Innstilt er ikke tilknyttet Vy.
Spørsmål eller ideer: perrong@innstilt.app
```

## Full description – English

```
Train cancelled again? More than 30 minutes late? Under Vy's own terms you are entitled to compensation – but the form is a hassle, so most people don't bother.

Innstilt does the work for you:
• Finds the trips you can claim: cancelled and over-30-minute-late trains on your regular journeys, 90 days back (Entur's open data).
• One tap on "Claim refund" opens Vy's form already filled in – departure time and train are set for you.
• You check it and press "Send inn" yourself. The case number is saved automatically.
• Keeps track of your claims: sent, paid, rejected – and how much you got back.
• "Now" board: your departures right now, with platforms, delays and cancellations.
• A notification (if you like) when one of your usual trains is cancelled or more than 30 min late.
• Works with tickets from Vy, and from the Ruter app and Entur.

Your details stay on your phone
Vy's form needs your name, e-mail, bank account and ticket. Innstilt stores them encrypted on your phone and sends them only to Vy, when you send a claim yourself. No login, no account, no ads, no tracking. The app doesn't ask for access to your camera, location or contacts.

Made by a fed-up commuter on the Gjøvik line. Innstilt is not affiliated with Vy.
Questions or ideas: perrong@innstilt.app
```

## App content declarations

| Question | Answer | Why |
|---|---|---|
| Privacy policy | https://innstilt.app/personvern.html | |
| App access | **All functionality is available without special access** | No login. For reviewers: any ticket code in the format XXX-XXX-XXX can be typed to explore; "Claim refund" opens Vy's public form, and nothing is sent unless "Send inn" is pressed on Vy's page. |
| Ads | No | |
| Content rating | see below | |
| Target audience | **18 and over** | Commuters with their own ticket and bank account; not designed for children. |
| News app | No | |
| Government app | No | Not affiliated with Vy, Entur or the state. |
| Financial features | **None** | It doesn't move money; it fills in Vy's own form. |
| Health | No | |
| Data safety | see below | |

## Content rating questionnaire (IARC)

Category: **All other app types** (utility). Answers: violence **No**, sexual content **No**, language **No**,
controlled substances **No**, gambling **No**, users interact or share content **No**, shares user location **No**,
digital purchases **No**, unrestricted internet browser **No** (the in-app window opens only Vy's form).
Expected rating: **PEGI 3 / Everyone**.

## Data safety form

Google counts data as "collected" when the app sends it off the phone – including to a third party's website.
Innstilt does that only when the user opens Vy's form, so declare it honestly:

**Does your app collect or share any of the required user data types?** Yes.
**Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS only).
**Do you provide a way for users to request that their data be deleted?** Yes – Settings → "Delete everything"
deletes it on the phone; turning statistics off deletes what was shared.

| Data type | Collected? | Shared? | Purpose | Optional? | Note |
|---|---|---|---|---|---|
| Personal info → Name | Yes | No* | App functionality | Required for claims | sent to Vy's form when the user claims |
| Personal info → Email address | Yes | No* | App functionality | Required for claims | as above |
| Financial info → Other financial info (bank account number) | Yes | No* | App functionality | Required for claims | as above |
| Photos and videos → Photos | Yes | No* | App functionality | **Optional** | picture of a Ruter/Entur ticket receipt, only if the user chooses to store it |
| App activity → Other actions (number of claims and kroner per month) | Yes | No | Analytics | **Optional** (opt-in) | anonymous counter; random id, no personal data |

\* Google does not count a transfer as "sharing" when the user initiates it and expects it (the user opens Vy's form
and presses "Send inn" there). Data is not processed ephemerally and is stored encrypted on the device.

Not collected: location, contacts, device IDs, crash logs, purchase history, messages, web browsing.
(The optional train notifications send only station ids and times to Entur's public timetable service.)

## Release notes (first test)

- **NO:** Første testversjon. Takk for at du tester! Tilbakemeldinger til perrong@innstilt.app.
- **EN:** First test version. Thanks for testing! Feedback to perrong@innstilt.app.
