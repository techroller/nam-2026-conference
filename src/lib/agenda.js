/**
 * What My Agenda shows, from the schedule payload and the store.
 *
 * The store owns the attendee's own reservations (CLAUDE.md, "There is exactly
 * one action"), so each day is re-filtered through `reservationFor` — a session
 * removed anywhere in the app drops off at once — and both totals are
 * recomputed. Hours are hours you hold a chair for: confirmed minutes are
 * `totalMinutes`, queued minutes are `waitlistedMinutes`, never folded together.
 */
export function agendaDays(days, reservationFor) {
  return days
    .map((d) => {
      const sessions = d.sessions
        .map((s) => ({ ...s, reservation: reservationFor(s.id) }))
        .filter((s) => s.reservation)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id - b.id);
      const minutes = (status) => sessions
        .filter((s) => s.reservation === status)
        .reduce((n, s) => n + s.durationMins, 0);
      return { ...d, sessions, totalMinutes: minutes('confirmed'), waitlistedMinutes: minutes('waitlisted') };
    })
    .filter((d) => d.sessions.length > 0);
}

/** 90 → "1h 30m", 60 → "1h", 45 → "45m". */
export function hoursLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0 && m > 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
