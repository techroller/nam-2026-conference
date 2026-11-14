# Show every party's venue, bands and 2-for-1 times on a Parties page

## What this changes
A new **Parties** page at `/parties`, linked from the nav, lists the four parties by conference day. Each party card shows its venue on the venue map with the travel time in from the other site and the last shuttle back, the band running order with set times, the 2-for-1 window, entry notes (badge, plus-ones, 21+) and an "Add to calendar" link to `/api/sessions/:id.ics`. On the party's own day the clock drives three badges: "2-for-1 on now · ends HH:MM", the band on now, and who is up next. Parties stay info only: no seat or agenda control. Built on #13's `GET /api/sessions/parties` (stacked on `issue-13-party-lineup-details`).

## Where
- `src/lib/parties.js` (new) — pure `partyStatus(party, clock)` returning `{ twoForOneEndsAt, nowPlaying, upNext }` (all `null` unless `clock.day === party.day`; windows are start inclusive, end exclusive; `upNext` is the first act starting after `clock.time`), and `travelIn(travel, party)` returning the fastest non-Walk row from the other venue (`routesBetween` from `src/lib/travel.js`). Test in `tests/unit/parties.test.js` with hand-built party objects in #13's camelCase shape (`lineup[{band,startsAt,endsAt}]`, `twoForOne{startsAt,endsAt}`, `entry{badgeRequired,plusOnes,minAge}`, `lastShuttle{time,toVenueId}`).
- `src/pages/PartiesPage.jsx` (new) — `useFetch` on `api.getParties` (from #13), `useConference()` for `clock`, `days`, `venues`, `travel`, `venueById`; one `<section data-testid="party-<id>">` per party, grouped under `dayLabel(party.day)` headings (dates derived from the data, never written). Each card renders `VenueRouteMap` (`src/components/VenueRouteMap.jsx`) with `routesBetween(travel, otherVenueId, party.venue.id)`, a lineup list, the drinks window, entry notes, `sessionCalendarUrl(party.id)` from `src/lib/api.js` as a link, and badges with `data-testid` `party-badge-two-for-one`, `party-badge-now-playing`, `party-badge-up-next`. Band names are plain text; no seat button. Sets `useDocumentTitle`.
- `src/App.jsx` — `<Route path="parties" element={<PartiesPage />} />` beside `venues`.
- `src/components/Layout.jsx` — `NAV` entry `{ to: '/parties', label: 'Parties', icon: 'sparkle' }` after Venues (icon reused; none new).
- `tests/smoke.spec.js` — add `/parties` to `ROUTES` (renders cleanly, no horizontal overflow, desktop and mobile).
- `tests/parties.spec.js` (new) — read-only, so no data lane. Fetch `${API}/sessions/parties` in the test, derive pin times from the returned acts and 2-for-1 window (never hard-code), build clocks with `momentOn(dayIndex, time)` and open with `visit(page, '/parties', { at })` from `tests/helpers.js`; runs on both projects.
- Docs — `context/engineering-context/ui.md` (nav, page) and `architecture.md` (route table).

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Page lists all four parties with their details, desktop and mobile | `/parties` shows 4 `party-<id>` sections titled as the API returns, each with its band names in order, the 2-for-1 window, "21+"/badge/plus-ones text, an `.ics` link whose href is `/api/sessions/<id>.ics`, a venue map, the shuttle-in minutes and last-shuttle time, no seat button, no `a[href]` on band names. False today: the route renders the not-found page | Playwright `tests/parties.spec.js` |
| Badges appear and disappear at the right times | pin mid-set of act 1: now-playing names act 1, up-next names act 2, 2-for-1 badge present only when inside the window and showing `ends <window end>`; pin one minute before the window opens and at its end minute: badge absent; pin before the first act: no now-playing, up-next is act 1; pin after the last act: neither; pin on a different day: none. False today: no badge exists | Playwright `tests/parties.spec.js` |
| The same boundaries, cheaply | `partyStatus` at set start (on), set end (off, next on or none), the day before and after, and the drinks window edges; `travelIn` picks the fastest non-Walk row for each direction | Unit `tests/unit/parties.test.js` |
| `/parties` renders cleanly | smoke route entry | Playwright `tests/smoke.spec.js` |
| `npm run verify` is green | the full gate | verify |

## Decisions
- Show a card's badges only when `clock.day` equals the party's day, and nothing on other days (no "finished" or "tomorrow" state) — OK?
- Window edges: a set or the 2-for-1 window is on from its start minute and off at its end minute; between sets "now" is empty and "up next" names the following act — OK?
- Use `/parties`, link it in the nav after Venues, and reuse the `sparkle` icon rather than add one — OK?
- One `VenueRouteMap` per party card (four small maps), with the party venue named in text; the map component itself is unchanged — OK?
- This plan assumes #13 returns each party with the session fields (`id`, `title`, `day`, `startsAt`, `endsAt`, `room`, `venue`) beside `lineup`, `twoForOne`, `entry` and `lastShuttle`, as its spec describes; if #13 lands differently this run follows its merged shape — OK?

## Out of scope
RSVP, seats or any add-to-agenda control for a party; a "finished" state; any change to the seeded data or the endpoint (#13).
