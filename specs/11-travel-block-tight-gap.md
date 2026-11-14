# Only show the My Agenda travel block when the gap between venues is tight

## What this changes
On My Agenda, a cross-venue pair of confirmed seats shows its travel block only when the gap is 30 minutes or less (30 counts). A pair whose hop cannot be made always shows the "can't reach in time" warning, whatever the gap. A hop that can be made with more than 30 minutes to spare shows nothing. Waitlist and same-venue pairs still show nothing.

## Where
- `src/lib/travel.js` — export a named constant `TRAVEL_BLOCK_MAX_GAP = 30` and a pure `showsTravelBlock(assessment)` returning `assessment.impossible || assessment.gapMinutes <= TRAVEL_BLOCK_MAX_GAP`. `travelHops` is unchanged (it still returns every cross-venue pair), so its callers and tests keep working.
- `src/pages/MyAgendaPage.jsx` — build `hops` from `travelHops(...).filter((h) => showsTravelBlock(h.assessment))`. The `TravelHop` component is unchanged; removal still re-derives from the store, so a block clears without a reload.
- `tests/unit/travel.test.js` — new `describe` for `showsTravelBlock`, using the existing `travel` table and `at()` helper (a room with `walkMinutes: 16` makes a 31 min gap impossible: rideshare 16 + 16 = 32).
- `tests/agenda-travel.spec.js` — lane `agenda.travel` (`laneFor`, `bookableFor`, `momentOn(1, '08:00')` pins the clock). Expected hops become `travelHops(...).filter(showsTravelBlock)`; the set search must also include a hop that can be made with a gap over 30 (hidden). Assert the hidden hop has no block and a shown one has options and the `/venues` link.
- `context/engineering-context/agenda.md` and `venues.md` — describe the 30-minute rule and why the warning ignores it.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Pair with gap <= 30 that can be made shows options and route link, no warning | `showsTravelBlock` true at gaps 30 and 15 when not impossible; spec shows `travel-option` rows and the route-map link with no "can't reach" text | unit + spec |
| Pair with gap > 30 that can be made shows no block | `showsTravelBlock` false at gap 31+ when fits (false on main: no such function; the page rendered every hop); spec's hidden hop has no `travel-hop` | unit + spec |
| Pair with gap > 30 that can't be made still warns with gap and fastest total | `showsTravelBlock` true at gap 31 with walk 16; spec checks the warning text where the seed allows | unit + spec |
| Waitlisted and same-venue pairs show nothing; removal clears without reload | existing `travelHops` unit tests, and the spec's `__noReload` removal step against the filtered expectation | unit + spec |
| Threshold rule proved in `tests/unit/travel.test.js`; spec pins clock, own lane | as above | unit |
| Docs describe the rule and why the warning ignores it | `node scripts/context.mjs for` the changed files names agenda.md and venues.md; both updated | docs |

## Decisions
- The spec set search may not find an impossible hop with a gap over 30 in the seed; is it fine for the e2e to prove that case at the unit layer only, and the page to prove the shown/hidden split? 
- Should the "Getting to X" copy stay unchanged now that blocks only appear on tight gaps?

## Out of scope
Recommending a single option; warnings at booking time on the session page; external map links.
