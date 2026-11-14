# Show attendees the sessions they have booked on My Agenda

## What this changes
`/my-agenda` stops being a "Coming soon" panel. It lists the signed-in attendee's sessions by day, in time order. Confirmed seats and waitlist places both appear, and a waitlist place carries a visible "Waitlisted" label. Each day header shows booked hours (confirmed seats only) with queued time apart (`+1h waitlisted`). Removing a session anywhere takes it off the page at once, and a day with nothing left disappears. An attendee with nothing booked sees an empty state linking to `/schedule`.

## Where
- `src/pages/MyAgendaPage.jsx` — fetch `api.getSchedule(currentUser.id)` keyed on the user. Re-filter each day's `sessions` through `reservationFor(s.id)` from `useConference()`, drop empty days, and recompute `totalMinutes` (confirmed only) and `waitlistedMinutes` client-side. Rows use `SessionCard variant="row"`, plus a `reservation-waitlisted` style label for queued ones. Empty state uses `Button to="/schedule"`. Day dates come from the payload, never hard-coded.
- `tests/agenda.spec.js` (new) — specs for the four criteria. Lane: a new `agenda.page` entry in `LANES` in `tests/helpers.js` (clean days for its attendee), booking through the API, with the waitlist taken on a full session found via `/api/sessions`, and releasing what it books.
- `tests/home.spec.js` — delete the "My Agenda is a blank canvas" describe; keep a nav + `/my-plan` redirect check in the new spec.
- `CLAUDE.md` (Deliberately unbuilt list, and the "placeholder for now" line) and `context/engineering-context/agenda.md` (placeholder paragraph, "no UI calls it yet" for `getSchedule`, "Where to change") — reworded to say the page exists.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Confirmed and waitlisted sessions on two days show both days in time order, waitlisted labelled | agenda.spec: two day sections, rows ordered by start, waitlisted row has the label and confirmed rows do not | spec |
| Booked hours count confirmed only, waitlisted apart | agenda.spec: day total text equals confirmed minutes and `+Nh waitlisted` equals queued minutes | spec |
| Removing a session removes it without reload; last one removes the day | agenda.spec: remove via the app, row and then day section vanish, no navigation | spec |
| No sessions shows empty state linking to `/schedule` | agenda.spec: empty-state link `href` is `/schedule` on a clean lane | spec |
| Blank-canvas test replaced | `tests/home.spec.js` no longer holds it; `agenda-coming-soon` is gone from `src/` (grep excluding `specs/`) | spec / grep |

## Decisions
- Is it OK to prove "removed without reload" by removing from the page itself (a remove button on each row) rather than only from another page?
- Is it OK to add a remove control to each row, since the ticket says "Removing a session from the page"?
- Is it OK to add one new `agenda.page` lane in `tests/helpers.js` rather than reuse an existing lane?

## Out of scope
Travel warnings and directions, today/next-up views, suggestions, calendar export buttons.
