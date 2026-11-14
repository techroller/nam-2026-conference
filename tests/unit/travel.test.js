import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { routesBetween, assessTravel, travelHops, showsTravelBlock, TRAVEL_BLOCK_MAX_GAP } from '../../src/lib/travel.js';

const AURORA = 1;
const FOUNDRY = 2;

/** The two-venue travel table, in the camelCase shape `toTravel` returns. */
const travel = [
  { fromVenueId: AURORA, toVenueId: FOUNDRY, mode: 'Shuttle', minutes: 25, costUsd: 0 },
  { fromVenueId: AURORA, toVenueId: FOUNDRY, mode: 'Rideshare', minutes: 16, costUsd: 18 },
  { fromVenueId: AURORA, toVenueId: FOUNDRY, mode: 'Transit', minutes: 34, costUsd: 3 },
  { fromVenueId: AURORA, toVenueId: FOUNDRY, mode: 'Walk', minutes: 118, costUsd: 0 },
  { fromVenueId: FOUNDRY, toVenueId: AURORA, mode: 'Shuttle', minutes: 27, costUsd: 0 },
];

const at = (venueId, walkMinutes = 0) => ({ venue: { id: venueId }, room: { walkMinutes } });

describe('Routes between the two sites', () => {
  test('only the legs going the way you are travelling come back', () => {
    const out = routesBetween(travel, AURORA, FOUNDRY);
    assert.equal(out.length, 4);
    assert.ok(out.every((t) => t.fromVenueId === AURORA && t.toVenueId === FOUNDRY));
  });

  test('the quickest mode is listed first', () => {
    assert.deepEqual(routesBetween(travel, AURORA, FOUNDRY).map((t) => t.mode),
      ['Rideshare', 'Shuttle', 'Transit', 'Walk']);
  });

  test('the return journey is its own route, and is not assumed symmetrical', () => {
    assert.deepEqual(routesBetween(travel, FOUNDRY, AURORA).map((t) => t.minutes), [27]);
  });

  test('a pair of venues with no leg between them gives nothing, not a crash', () => {
    assert.deepEqual(routesBetween(travel, AURORA, 99), []);
  });
});

describe('Whether you can make the next session', () => {
  test('two sessions in the same building need no travel advice at all', () => {
    assert.equal(assessTravel({ travel, from: at(AURORA), to: at(AURORA), gapMinutes: 15 }), null);
  });

  test('a missing session on either side gives nothing to assess', () => {
    assert.equal(assessTravel({ travel, from: null, to: at(FOUNDRY), gapMinutes: 60 }), null);
    assert.equal(assessTravel({ travel, from: at(AURORA), to: null, gapMinutes: 60 }), null);
  });

  test('walking across town is not offered as a mode between venues', () => {
    const out = assessTravel({ travel, from: at(AURORA), to: at(FOUNDRY), gapMinutes: 60 });
    assert.ok(!out.options.some((o) => o.mode === 'Walk'));
    assert.equal(out.options.length, 3);
  });

  test('the walk to the destination room is added to every mode', () => {
    const out = assessTravel({ travel, from: at(AURORA), to: at(FOUNDRY, 6), gapMinutes: 60 });
    assert.equal(out.walk, 6);
    assert.deepEqual(out.options.map((o) => [o.mode, o.total]),
      [['Rideshare', 22], ['Shuttle', 31], ['Transit', 40]]);
    assert.equal(out.fastest.mode, 'Rideshare');
  });

  test('a gap exactly as long as the journey fits — the door does not shut early', () => {
    const fits = (gapMinutes) => assessTravel({ travel, from: at(AURORA), to: at(FOUNDRY, 6), gapMinutes })
      .options.find((o) => o.mode === 'Rideshare').fits;
    assert.equal(fits(22), true);
    assert.equal(fits(21), false);
  });

  test('a gap too short for anything is impossible, and says so', () => {
    const out = assessTravel({ travel, from: at(AURORA), to: at(FOUNDRY, 6), gapMinutes: 10 });
    assert.equal(out.impossible, true);
    assert.equal(out.freeTooSlow, false);
    assert.ok(out.options.every((o) => !o.fits));
  });

  test('the free shuttle missing it while a paid ride makes it is the interesting answer', () => {
    const out = assessTravel({ travel, from: at(AURORA), to: at(FOUNDRY, 6), gapMinutes: 25 });
    assert.equal(out.free.mode, 'Shuttle');
    assert.equal(out.free.fits, false);
    assert.equal(out.freeTooSlow, true);
    assert.equal(out.impossible, false);
  });

  test('once the free shuttle fits there is nothing to warn about', () => {
    const out = assessTravel({ travel, from: at(AURORA), to: at(FOUNDRY, 6), gapMinutes: 45 });
    assert.equal(out.free.fits, true);
    assert.equal(out.freeTooSlow, false);
    assert.equal(out.impossible, false);
  });

  test('with no free mode at all there is no free option to report', () => {
    const paidOnly = travel.filter((t) => t.costUsd !== 0);
    const out = assessTravel({ travel: paidOnly, from: at(AURORA), to: at(FOUNDRY), gapMinutes: 45 });
    assert.equal(out.free, undefined);
    assert.equal(out.freeTooSlow, false);
  });

  test('a destination room with no walk time is treated as zero, not undefined', () => {
    const out = assessTravel({ travel, from: at(AURORA), to: { venue: { id: FOUNDRY }, room: {} }, gapMinutes: 30 });
    assert.equal(out.walk, 0);
    assert.equal(out.fastest.total, 16);
    assert.equal(out.gapMinutes, 30);
  });

  test('venues with only a walking leg between them offer no advice', () => {
    const walkOnly = travel.filter((t) => t.mode === 'Walk');
    assert.equal(assessTravel({ travel: walkOnly, from: at(AURORA), to: at(FOUNDRY), gapMinutes: 300 }), null);
  });
});

describe('Hops between consecutive confirmed seats', () => {
  const sess = (id, venueId, startsAt, endsAt, reservation = 'confirmed') =>
    ({ id, venue: { id: venueId }, room: { walkMinutes: 5 }, startsAt, endsAt, reservation });
  const a = sess(1, AURORA, '09:00', '10:00');

  test('a cross-venue pair too close together is flagged with the gap and the fastest total', () => {
    const b = sess(2, FOUNDRY, '10:15', '11:00');
    const [hop] = travelHops([b, a], travel);
    assert.equal(hop.from.id, 1);
    assert.equal(hop.to.id, 2);
    assert.equal(hop.assessment.impossible, true);
    assert.equal(hop.assessment.gapMinutes, 15);
    assert.equal(hop.assessment.fastest.total, 21);
  });

  test('a cross-venue pair with enough time is still a hop, but not impossible', () => {
    const b = sess(2, FOUNDRY, '11:00', '12:00');
    const hops = travelHops([a, b], travel);
    assert.equal(hops.length, 1);
    assert.equal(hops[0].assessment.impossible, false);
  });

  test('consecutive seats at the same venue give no hop', () => {
    assert.deepEqual(travelHops([a, sess(2, AURORA, '10:15', '11:00')], travel), []);
  });

  test('a waitlisted session is ignored, and the pair is the next confirmed seat', () => {
    const queued = sess(2, FOUNDRY, '10:15', '11:00', 'waitlisted');
    assert.deepEqual(travelHops([a, queued], travel), []);
    const c = sess(3, FOUNDRY, '12:00', '13:00');
    const hops = travelHops([a, queued, c], travel);
    assert.deepEqual(hops.map((h) => [h.from.id, h.to.id]), [[1, 3]]);
    assert.equal(hops[0].assessment.gapMinutes, 120);
  });
});

describe('Which hops earn a travel block', () => {
  const hop = (gapMinutes, walk = 0) => assessTravel({ travel, from: at(AURORA), to: at(FOUNDRY, walk), gapMinutes });

  test('the cut-off is 30 minutes', () => {
    assert.equal(TRAVEL_BLOCK_MAX_GAP, 30);
  });

  test('a hop that can be made with 30 minutes or less to spare is shown', () => {
    assert.equal(showsTravelBlock(hop(30)), true);
    assert.equal(showsTravelBlock(hop(15)), true);
  });

  test('a hop that can be made with more than 30 minutes to spare is hidden', () => {
    assert.equal(showsTravelBlock(hop(31)), false);
    assert.equal(showsTravelBlock(hop(90)), false);
  });

  test('a hop that cannot be made is shown whatever the gap', () => {
    const a = hop(31, 16); // quickest is rideshare 16 + walk 16 = 32
    assert.equal(a.impossible, true);
    assert.equal(showsTravelBlock(a), true);
  });
});
