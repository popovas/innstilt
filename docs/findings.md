# How Vy's claim form and Entur's data work

These findings come from investigating the services in November 2026. They explain why Innstilt is built
the way it is. Re-check them if something breaks, because both services can change without notice.

## Vy's claim form

Form: <https://www.vy.no/kundeservice/skjema/prisavslag-og-erstatning>

**The whole form state is in the URL query string.** A link can open the form at step 4 with
everything filled in:

| Parameter | Example | Notes |
|---|---|---|
| `step` | `4` | |
| `ticketInputType` | `REFERENCE_CODE` | The "Jeg har referansekode" path: no login needed |
| `referenceCode` | `XXX-XXX-XXX` | From the ticket or receipt in the Vy app |
| `manualJourneyInfo.departureStation.stationName` / `.nsrCode` | `Oslo S` / `NSR:StopPlace:59872` | Station-level (parent) NSR id |
| `manualJourneyInfo.arrivalStation.stationName` / `.nsrCode` | | |
| `manualJourneyInfo.date` / `.time` | `2026-11-19` / `16:44` | Local time; planned departure from your station |
| `departureList` | `R31-2026-11-19T15:44Z-Jaren` | `<line>-<planned departure, UTC>-<final stop>` |
| `complaintType` | `DELAY_OR_CANCELLATION` | |
| `arrivedAtDestination`, `hadExpenses` | `YES`, `NO` | |
| `manualJourneyInfo.returnJourney.hasReturn` | `false` | |
| `contactInfo.name`, `contactInfo.email` | | |
| `bankDetails.accountType`, `bankDetails.norwegianAccountNumber` | `NORWEGIAN`, 11 digits | |

**The time field quirk.** The departure time is a react-aria `TimeField`. Its segments are
`[role=spinbutton]` with `aria-label="Velg time"` / `"Velg minutt"` and `aria-valuemax` 23 / 59.
It shows the time from the URL, but the form only treats it as filled in after a user change.
Typing the same digits over it is *not* a change. Until it changes, the form says "Tidspunkt må fylles
ut" and no departure list (`input[name=departureList]`) appears. Fixes:
- In a real browser (the bookmarklet), press ArrowUp then ArrowDown on the hour segment. React-aria
  accepts these synthetic key events. Then step hour and minute to the target and click the departure radio.
- With Playwright, clear each segment (Backspace) and then type.

**A misleading error.** `#REFUND_OR_COMPENSATION-form-referenceCode-error` contains "Beklager, vi fant
ingen reise med denne koden" from the start, even when the ticket lookup succeeds. Don't use it as a
signal. The time segments only render after a successful lookup.

**Bot protection.** The ticket lookup (`GET /api/form/order?orderId=…`) sits behind an AWS WAF.
Automated browsers get a CAPTCHA, or are blocked when headless, while normal browsers usually aren't
challenged. Innstilt never tries to get around it: claims are finished and sent by a person in their
own browser. The lookup response includes the ticket's validity (`startTime`/`endTime`), but Innstilt
can't call it, so users enter the validity dates themselves.

**Outcome observed.** A claim for a fully cancelled train was refunded within about an hour, although
the next train arrived only 19 min late by the timetable. The ticket was a Ruter zone monthly pass
bought in the Vy app.

## Entur's open data

**Live (today).** Journey Planner v3, GraphQL at `https://api.entur.io/journey-planner/v3/graphql`.
Send the `ET-Client-Name` header. It allows cross-origin requests (`Access-Control-Allow-Origin: *`).
`stopPlace(id).estimatedCalls` gives `aimed*` / `expected*` / `actual*` times per call. Calls use
child stop places; map them with `quay.stopPlace.parent.id`. **Real-time data disappears about an hour
after the train arrives.**

**Archive (past days).** The SIRI-ET "last recorded" data is exported by
<https://siri-data-exporter.entur.no/> (a Streamlit app, NLOD licence). It writes a public, listable bucket:

```
https://storage.googleapis.com/query-results-siri-et-last-bucket/query_result_export_{from}_{to}_{SRC}.csv.gzip
```

- Vy's trains are source **"Vy-group" = `VYG`**. `BNR`, `NSB`, `VYT` and `GJB` are empty or hold
  other operators (since May 2024).
- A file exists only after someone has exported that day. Innstilt drives the exporter with Playwright
  when needed. A file with only the header (~216 bytes) means no data (yet).
- One day of VYG is about 320 KB gzipped (~16k rows). Yesterday's data is usually there; history goes
  back at least 3 months.
- **The schedule columns (`aimed*`, `arrivalTime`, `departureTime`) are Oslo local time despite the
  `+00:00` suffix.** `recordedAtTime` is real UTC.
- `stopPointRef` is a Quay. Map it with Journey Planner `stopPlace(id){ quays{ id } }`.
  `estimated=False` means a recorded actual time.
- Cancellations: `journeyCancellation`, `stopCancellation`. Replacement buses appear as
  `extraJourney=True` with empty stop names.
- **The bucket does not allow cross-origin requests**, so a web app can't read it directly. A web
  version needs the data republished somewhere it can read, e.g. a nightly job.
