# Multi-track filter on the schedule

- **Title:** Filtering the schedule by more than one track
- **Date:** 2026-11-14
- **Participants:** Unknown (one unnamed speaker)
- **Source:** `context/winnow-transcripts/demo-transcript.txt`
- **Tickets raised:**
  - [#1 Let attendees filter the schedule by several tracks at once](https://github.com/techroller/nam-2026-conference/issues/1)
- **Context updated:** None. The multi-value filter pattern (`?track=a,b`, `IN (…)`, `aria-pressed`) is already documented in `engineering-context/schedule.md`.
- **Set aside:**
  - The opening "let's take a look at the website": filler, with no content.
  - Making level, format or topic multi-select: never asked for, so left for a later ticket if someone needs it.
- **Q&A:**
  - *Does "the search function" mean the `/schedule` filter rail?* Yes.
  - *When several tracks are picked, which sessions show?* Those in any selected track, with the other filters still narrowing the list.
  - *How does the All pill behave?* It clears the picks, and turning off the last track goes back to All.
  - *Tracks only, or the other filters too?* Tracks only.
