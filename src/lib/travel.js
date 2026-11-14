import { toMinutes } from './clock.js';

/**
 * Travel-time helpers for a conference spread across two sites.
 *
 * The Foundry is 6.2 miles from Aurora. Getting between them is a real
 * cost in minutes, and any feature that reasons about an attendee's day
 * should account for it.
 */

/** All modes between two venues, cheapest-in-time first. */
export function routesBetween(travel, fromVenueId, toVenueId) {
  return travel
    .filter((t) => t.fromVenueId === fromVenueId && t.toVenueId === toVenueId)
    .sort((a, b) => a.minutes - b.minutes);
}

/**
 * Can you get from one session to the next in the gap between them?
 *
 * Returns every mode that fits and every mode that does not, because the
 * interesting answer is rarely yes or no — it is usually "not on the free
 * shuttle, but a rideshare just about does it".
 */
export function assessTravel({ travel, from, to, gapMinutes }) {
  if (!from || !to || from.venue.id === to.venue.id) return null;

  const walk = to.room.walkMinutes ?? 0;
  const options = travel
    .filter((t) => t.fromVenueId === from.venue.id && t.toVenueId === to.venue.id && t.mode !== 'Walk')
    .map((t) => ({ ...t, total: t.minutes + walk, fits: gapMinutes >= t.minutes + walk }))
    .sort((a, b) => a.total - b.total);

  if (!options.length) return null;
  const free = options.find((o) => o.costUsd === 0);

  return {
    gapMinutes,
    walk,
    options,
    fastest: options[0],
    free,
    // nothing fits at all, or only something you have to pay for
    impossible: options.every((o) => !o.fits),
    freeTooSlow: Boolean(free && !free.fits && options.some((o) => o.fits)),
  };
}

/**
 * The cross-venue hops in one day's sessions: each confirmed seat paired with
 * the next confirmed seat (waitlist places are not a promise, so they are
 * skipped), kept when the two sit at different venues. `assessment` is
 * `assessTravel`'s answer for the gap between them.
 */
export function travelHops(sessions, travel) {
  const held = sessions
    .filter((s) => s.reservation === 'confirmed')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id - b.id);
  const hops = [];
  for (let i = 0; i < held.length - 1; i++) {
    const from = held[i];
    const to = held[i + 1];
    const gapMinutes = toMinutes(to.startsAt) - toMinutes(from.endsAt);
    const assessment = assessTravel({ travel, from, to, gapMinutes });
    if (assessment) hops.push({ from, to, assessment });
  }
  return hops;
}

/** A can-be-made hop only earns a block on My Agenda when the gap is this tight. */
export const TRAVEL_BLOCK_MAX_GAP = 30;

/**
 * Whether My Agenda shows a hop's travel block. A hop that cannot be made
 * always warns, whatever the gap; one that can be made is only worth a block
 * when there is little slack.
 */
export function showsTravelBlock(assessment) {
  return assessment.impossible || assessment.gapMinutes <= TRAVEL_BLOCK_MAX_GAP;
}
