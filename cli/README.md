# Innstilt – command-line version

Claim your money back from Vy for delayed or cancelled trains with as little effort as possible.
*Innstilt is not affiliated with Vy.*

- **No login, no server.** Your ticket code, name, e-mail and payout account stay in
  `~/.config/innstilt/` on your own machine (file mode 600).
- **Nothing is sent automatically.** Innstilt opens Vy's own claim form with everything already filled
  in. Vy's form only accepts the departure time once it has been changed by hand, so finish it with the
  **👻 Innstilt: fyll ut** bookmark (`innstilt bookmarklet` installs it). The bookmark sets the time and
  picks the train in your own browser. You check the form and press *Send inn*. Alternatively,
  `--assistant` lets Innstilt drive its own browser window, but Vy shows a CAPTCHA there.
- **Evidence comes from Entur's open data.** For today it uses the live API. For past days (up to
  Vy's 3-month deadline) it uses Entur's public SIRI-ET archive
  ([siri-data-exporter.entur.no](https://siri-data-exporter.entur.no/), NLOD licence), which records
  actual arrival times and cancellations per stop. That data is usually available the next day.

## Rules (vy.no, checked 2026-11-20)
- 50 % of the ticket price back if you arrive **more than 30 min** late (60 min on Oslo–Bergen and Flåm–Myrdal).
- Monthly or season tickets: 50 % of the ticket's *daily value* per delay, at most 50 % of the ticket price in total.
- Claim within **3 months**.

## Install
```sh
sh cli/install.sh    # creates .venv, installs the `innstilt` command, then runs setup
```
Setup asks for your ticket (reference code plus validity dates: a monthly pass gets a new code every
month), name, e-mail, payout account, stations and usual travel times, then offers the bookmark.

## Use
```sh
innstilt bookmarklet               # once: install the bookmark (recommended)
innstilt ticket add                # each month: add the new pass (code + validity)
innstilt scan --since 2026-11-03   # walk through past days, pick the trips you took, claim them
                                   #   (trains within ±2 h of your usual times; --window 60, --all-times)
innstilt check                     # delays on your commute today (both directions)
innstilt check --date 2026-11-12   # a past day, from Entur's archive
innstilt claim --time 16:44        # Vy's form prefilled for today's 16:44 home -> work
innstilt claim --time 16:44 --reverse --date 2026-11-19
innstilt status                    # sent claims; record payouts: innstilt status 123456 paid 25
```

## Get notified the same day (optional, macOS / Linux cron)
`crontab -e`, then add (weekdays, every 10 min, 06:00–23:59):
```
*/10 6-23 * * 1-5 cd /path/to/innstilt && .venv/bin/innstilt check --quiet --notify
```
You get a desktop notification when one of your trains goes over the limit. Then run `innstilt claim`.
