# Travel block only for tight gaps

- **Title:** Showing travel between venues only when the gap between sessions is tight
- **Date:** 2026-11-14
- **Participants:** Unknown (one unnamed person, in a Claude Code chat)
- **Source:** inline — a one-line request passed to `/winnow`
- **Tickets raised:**
  - [#11 Only show the My Agenda travel block when the gap between venues is tight](https://github.com/techroller/nam-2026-conference/issues/11)
- **Context updated:** None yet. `engineering-context/agenda.md` and
  `venues.md` will describe the 30-minute rule once it is built, since the
  context records how the app works now. Updating them is part of #11's done
  state, so the docs and the code change together.
- **Set aside:**
  - "Show travel time between venues and recommended ways to get there": #4
    already built this. My Agenda shows each cross-venue hop's gap, every way
    to get there, the walk to the room and a link to the route map.
  - Recommending one option over the others, and warning at booking time on
    the session page: offered, not chosen.
- **Q&A:**
  - *My Agenda already shows a travel block for every cross-venue hop (#4). What
    is new?* Show the block only when the gap is 30 minutes or less.
  - *How should a gap just over 30 minutes that still can't be made be treated?
    The fastest route is an 18-minute rideshare, and the farthest Foundry room
    is a 15-minute walk.* The "can't reach in time" warning always shows,
    whatever the gap. The options block shows only for gaps of 30 minutes or
    less, and 30 counts.
