# Let attendees filter the schedule by several tracks at once

## What this changes
The track pills in the `/schedule` filter rail toggle independently. Picking two tracks lists the sessions in either one; the other filters still narrow the result. **All** clears the picked tracks, and turning off the last one returns to All. Each pill exposes `aria-pressed` (All too). `?track=a,b` is the URL; `?track=a` behaves as before.

## Where
- `server/routes/sessions.js` — `trackSlug` handler (line ~38): split on `,`, trim, drop empties, emit `t.slug IN (?, ?)`; one value gives the same query as today. Test in `tests/api/endpoints.test.js` (or a sibling API test) with real slugs from `/bootstrap`.
- `src/pages/SchedulePage.jsx` — `filters.track` stays the raw comma string (so `api.getSessions`, `useFetch` deps, `activeKeys` and the `BLOCKERS` entry for `track` keep working unchanged); derive `pickedTracks = filters.track === ALL ? [] : filters.track.split(',')`. Pills (~line 165): `aria-pressed`, onClick toggles the slug in the list and calls `set('track', list.join(',') )`, an empty list deletes the key via the existing `set`. All is active when the list is empty.
- `src/lib/api.js` — no change; `qs()` passes the string through.
- Spec test in `tests/schedule.spec.js` using `visit`, `waitForResults`, `API` from `tests/helpers.js`; read-only, so no data lane is needed. Open the Filters rail first on mobile.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Picking two tracks lists both; `result-count` matches the API for those two | click two pills, compare `result-count` to `/sessions?day=&trackSlug=a,b` length; API test that `trackSlug=a,b` returns the union of `a` and `b` (false today: matches nothing) | spec + API |
| Turning one off narrows to the remaining track and matches the API | click one pill off, `result-count` equals `/sessions?trackSlug=a`; `aria-pressed` flips | spec |
| All clears picked tracks and shows every track | click two pills, click All, URL has no `track=`, count equals unfiltered API count | spec |
| Single-track link unchanged; `endpoints.test.js` passes | `/schedule?track=<slug>` count equals API count for that slug; existing endpoints test stays green | spec + API |

## Decisions
- Should the All pill also expose `aria-pressed` (true when no track is picked), as well as the track pills?
- Should picking a track while the grid view is active still drop to the list with the existing "Show whole day" notice (track stays a grid blocker)?

## Out of scope
Level, format and topic multi-select; the speakers page track filter.
