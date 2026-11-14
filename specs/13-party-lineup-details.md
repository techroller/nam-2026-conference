# Seed and serve each party's line-up, 2-for-1 window and entry details

## What this changes
Nothing an attendee sees yet (no page). A caller of `GET /api/sessions/parties` now gets the four Social sessions, each with an ordered band line-up (fictional bands, set start/end), a 2-for-1 drinks window, entry notes (badge required, plus-ones policy, 21+) and the last shuttle to the other venue with its time. Parties stay info only: not bookable, no RSVP.

## Where
- `server/db.js` — add `party_acts` (session_id, position, band, starts_at, ends_at) and `party_details` (session_id PK, two_for_one_starts, two_for_one_ends, badge_required, plus_ones, min_age, last_shuttle_at, last_shuttle_to_venue_id) to the schema string beside `announcements`.
- `server/seed.js` — in the social-events block (~line 467), have `addSession` return/keep each party's id and, after the loop, insert acts and details from a per-party table of hand-written band names with set lengths; times are HH:MM strings inside each party's start/end (Foundry's last shuttle is 01:15, past its 23:30 end, as its abstract says). No `Math.random()`, no dates: times are time-of-day, the day comes from the session.
- `server/lib/query.js` — `toParty(sessionRow, details, acts)` mapper to camelCase (`lineup[{band,startsAt,endsAt}]`, `twoForOne{startsAt,endsAt}`, `entry{badgeRequired,plusOnes,minAge}`, `lastShuttle{time,toVenueId}`).
- `server/routes/sessions.js` — `sessionsRouter.get('/parties', …)` registered before `/:id`, returning the Social sessions (`SESSION_SELECT … WHERE s.format = 'Social' ORDER BY s.day`) with their party data.
- `src/lib/api.js` — `export const getParties = () => api('/sessions/parties');`
- `tests/api/parties.test.js` (new) — `startApi()` from `tests/api/harness.js` (throwaway seeded DB, no lane needed); `api.json('/sessions/parties')`.
- `context/engineering-context/data-model.md` and `seed.md` — document the two tables and the seed step; `schedule.md` — the new endpoint.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Each of four parties returns its line-up, ordered, non-overlapping, within party hours | `/sessions/parties` has 4 entries titled as seeded; each has a non-empty lineup; every act has start < end, start >= party start, end <= party end, and each act starts at or after the previous one's end. False today: the route 404s | API |
| 2-for-1 window within party hours | each party's `twoForOne.startsAt < endsAt` and both lie inside `[startsAt, endsAt]` of the session | API |
| Entry notes and last-shuttle time | each party has `entry.badgeRequired === true`, a non-empty `plusOnes`, `minAge === 21`, and `lastShuttle.time` matching `HH:MM` and not before the party's end minus nothing (at or after party end) | API |
| `npm test` green | the full run | Unit + API |

## Decisions
Open: the ticket names the route only as "the matching `server/routes/*.js`". This plan uses `GET /api/sessions/parties` (a list, since a page will want all four) rather than a field on `/sessions/:id`, and keeps parties out of `toSession` so the schedule payloads are unchanged.
Open: last shuttle is stored as an HH:MM time of day, and may fall after midnight (Foundry's 01:15); it is compared with the party's end only on that clock, so the Foundry test treats it as after midnight rather than before the end.

## Out of scope
Any page; seats, RSVP or waitlist for parties.
