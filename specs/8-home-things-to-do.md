# Suggest things to do around Las Vegas on the Home page

## What this changes
Home gains a "Things to do nearby" section below the venue information (#7's "Getting there"), above the latest announcement. It is a short static list of six real Las Vegas places, each a name and one line saying what it is: the Strip, Fremont Street, Red Rock Canyon, the Neon Museum, the Bellagio Fountains and Hoover Dam. No links, prices, hours or distances; nothing about the attendee.

## Where
- `src/pages/HomePage.jsx` — add a module-level `NEARBY` array of `{ name, blurb }` and a `ThingsToDoNearby` component (a `<section data-testid="nearby">` with an `<h2>` and a `<ul>` of `<li data-testid="nearby-item">`, name in bold and the line beneath, one column on a phone and two from `sm`), rendered in `HomePage` inside `<Reveal>` straight after `GettingThere`. No `Link`, no `href`. Stacks on #7: it lands in the layout that branch builds.
- `tests/home.spec.js` — new test in the existing describe, using `visit(page, '/')` from `tests/helpers.js`; read-only, so no data lane.
- `context/engineering-context/ui.md` — the `HomePage` section (line ~158) lists the new section.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Home shows a "Things to do nearby" section of real places, each with a name and one line | `nearby` visible with heading "Things to do nearby"; `nearby-item` count is at least 4 and every item has a non-empty name and one-line text (false today: no section) | spec `tests/home.spec.js` |
| No item has a link, price or opening hours | inside `nearby`: `a` count 0, and text matches none of `/\$\d/`, `/\d\s?(am|pm)/i`, `/\d{1,2}:\d{2}/`, `/open|daily/i` | spec |
| Reads well at desktop and mobile, verify green | spec runs on both projects under `npm run verify`; the test also asserts no horizontal overflow of the section (`scrollWidth <= clientWidth`); builder checks with `npm run shot` | verify |

## Decisions
- Use these six places (Strip, Fremont Street, Red Rock Canyon, Neon Museum, Bellagio Fountains, Hoover Dam) — OK?
- Say nothing about distance or travel time from the venues, since the ticket bars anything that could go stale, even for Red Rock Canyon near The Foundry — OK?
- Place the section after "Getting there" and before the latest announcement — OK?

## Out of scope
Maps, directions, bookings, links, tailored recommendations; the rest of the #7 layout.
