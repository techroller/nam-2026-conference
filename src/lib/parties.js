import { toMinutes } from './clock.js';

/**
 * What is happening at a party right now, on the conference clock. Everything
 * is null unless the clock is on the party's own day. A set, or the 2-for-1
 * window, is on from its start minute and off at its end minute.
 */
export function partyStatus(party, clock) {
  const off = { twoForOneEndsAt: null, nowPlaying: null, upNext: null };
  if (clock.day !== party.day) return off;
  const now = toMinutes(clock.time);
  const { startsAt, endsAt } = party.twoForOne;
  return {
    twoForOneEndsAt: now >= toMinutes(startsAt) && now < toMinutes(endsAt) ? endsAt : null,
    nowPlaying: party.lineup.find((a) => now >= toMinutes(a.startsAt) && now < toMinutes(a.endsAt)) ?? null,
    upNext: party.lineup.find((a) => toMinutes(a.startsAt) > now) ?? null,
  };
}

/** The fastest non-Walk way into the party's venue (from the other site), or null. */
export function travelIn(travel, party) {
  return travel
    .filter((t) => t.toVenueId === party.venue.id && t.mode !== 'Walk')
    .sort((a, b) => a.minutes - b.minutes)[0] ?? null;
}
