# Warn attendees about back-to-back sessions at different venues they can't reach in time

Stacked on #3: this builds on `issue-3-my-agenda-sessions`, where `/my-agenda` lists booked sessions by day. Merge #3 first.

## What this changes
On My Agenda, between two consecutive **confirmed** seats on one day at different venues, a travel block appears. It shows how to get there: each option's mode, minutes, cost and note, the walk to the room, and a link to `/venues`. When no option fits the gap, the block is a warning instead: you can't reach the next session in time, with the gap and the fastest option's total time (travel plus walk). Same-venue pairs show nothing, waitlisted places are ignored (the pair is the next *confirmed* seat), and removing a session of a flagged pair clears the block with no reload. No external map links.

## Where
- `src/lib/travel.js` — add `travelHops(sessions, travel)`: confirmed sessions only (`reservation === 'confirmed'`), sorted by `startsAt`, each paired with the next confirmed one; `gapMinutes` = next start minus this end; returns `[{ from, to, assessment }]` for pairs where `assessTravel(...)` is non-null. Pure; test in `tests/unit/travel.test.js`.
- `src/pages/MyAgendaPage.jsx` (from #3) — per day, run `travelHops` over the sessions already filtered through `reservationFor` (so a removal re-renders), `travel` from `useConference()`. Render a `TravelHop` (`data-testid="travel-hop"`, `data-impossible` true/false) after the `from` row; a warning uses the existing amber/alert styling with the gap and fastest total; options list mode, minutes, cost, note, `+N min walk`; `Link to="/venues"`. Colocate `TravelHop` in the page unless it grows.
- `tests/agenda.spec.js` (from #3) — new describe for travel, pinned with `?at=` via `momentOn`, own attendee and day through a new `agenda.travel` entry in `LANES` (`tests/helpers.js`; clean day), booking through the API and releasing it; sessions found via `/api/sessions` and `bookableFor`, picking an adjacent cross-venue pair by gap, with a waitlisted-neighbour case built from a full session.
- `context/engineering-context/venues.md` and `agenda.md` — replace "No UI calls it yet" for `assessTravel` with the agenda travel block.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Tight cross-venue confirmed pair is flagged with gap and fastest total | `travelHops` returns an `impossible` assessment with `gapMinutes` and `fastest.total`; spec: `travel-hop[data-impossible=true]` text has both numbers | unit + spec |
| Cross-venue hop that fits shows options and `/venues` link, no warning | spec: `travel-hop[data-impossible=false]` lists options, link `href` `/venues`, no warning text | spec |
| Same-venue consecutive seats show nothing | unit: `travelHops` is empty for same-venue pair; spec: no `travel-hop` between them | unit + spec |
| Waitlisted neighbour is not flagged | unit: a waitlisted session between or beside confirmed ones yields no hop for it; spec: no `travel-hop` for it | unit + spec |
| Removing one of a flagged pair clears the warning without reload | spec: remove a session, `travel-hop` count drops to 0, no navigation | spec |
| Spec pins clock, own attendee and day | `agenda.travel` lane and `?at=` in every test | spec |

## Decisions
- Is "the next confirmed seat that day" (skipping waitlisted ones between) the right pairing, rather than only adjacent rows?
- Is the block shown for every cross-venue pair regardless of gap size, as the ticket's "warned or not" reads?
- Is it OK to add the pure `travelHops` helper to `travel.js` so the pairing rule is unit-tested without a browser?

## Out of scope
Directions from outside the conference, maps or external route links, booking-time warnings on the session page.
