import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/** Each party's line-up, 2-for-1 window and entry details (GET /api/sessions/parties). */

let parties;
let close;
let venues;

const mins = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

before(async () => {
  const started = await startApi();
  close = started.close;
  parties = await started.api.json('/sessions/parties');
  venues = (await started.api.json('/bootstrap')).venues;
});
after(() => close());

describe('parties', () => {
  test('four parties, each with a line-up', () => {
    assert.deepEqual(
      parties.map((p) => p.title),
      ['Opening Night Reception', 'Speakers & First-Timers Mixer', 'The Foundry Block Party', 'Closing Party'],
    );
    for (const p of parties) assert.ok(p.lineup.length > 0, p.title);
  });

  test('line-up is ordered, non-overlapping and within the party hours', () => {
    for (const p of parties) {
      let prevEnd = mins(p.startsAt);
      for (const act of p.lineup) {
        assert.ok(mins(act.startsAt) < mins(act.endsAt), `${p.title} ${act.band}`);
        assert.ok(mins(act.startsAt) >= prevEnd, `${p.title} ${act.band} starts before the previous act ends`);
        assert.ok(mins(act.endsAt) <= mins(p.endsAt), `${p.title} ${act.band} runs past the end`);
        prevEnd = mins(act.endsAt);
      }
    }
  });

  test('the 2-for-1 window sits inside the party hours', () => {
    for (const p of parties) {
      const { startsAt, endsAt } = p.twoForOne;
      assert.ok(mins(startsAt) < mins(endsAt), p.title);
      assert.ok(mins(startsAt) >= mins(p.startsAt), p.title);
      assert.ok(mins(endsAt) <= mins(p.endsAt), p.title);
    }
  });

  test('entry notes and the last shuttle to the other venue', () => {
    for (const p of parties) {
      assert.equal(p.entry.badgeRequired, true, p.title);
      assert.ok(p.entry.plusOnes.length > 0, p.title);
      assert.equal(p.entry.minAge, 21, p.title);
      assert.match(p.lastShuttle.time, /^\d\d:\d\d$/, p.title);
      assert.ok(venues.some((v) => v.id === p.lastShuttle.toVenueId), p.title);
      assert.notEqual(p.lastShuttle.toVenueId, p.venueId, p.title);
    }
    // the Foundry's abstract promises 01:15, which is after midnight
    assert.equal(parties[2].lastShuttle.time, '01:15');
    // the others leave at or after the party ends
    for (const i of [0, 1, 3]) assert.ok(mins(parties[i].lastShuttle.time) >= mins(parties[i].endsAt));
  });
});
