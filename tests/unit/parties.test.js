import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { partyStatus, travelIn } from '../../src/lib/parties.js';

const party = {
  id: 9,
  day: '2026-10-13',
  venue: { id: 2 },
  startsAt: '19:00',
  endsAt: '23:30',
  lineup: [
    { band: 'First Act', startsAt: '19:30', endsAt: '20:15' },
    { band: 'Second Act', startsAt: '20:30', endsAt: '21:15' },
  ],
  twoForOne: { startsAt: '19:00', endsAt: '20:00' },
};
const at = (time, day = party.day) => ({ day, time });

describe('partyStatus', () => {
  test('mid first set: it is on, the second act is up next, the drinks are on', () => {
    const s = partyStatus(party, at('19:45'));
    assert.equal(s.nowPlaying.band, 'First Act');
    assert.equal(s.upNext.band, 'Second Act');
    assert.equal(s.twoForOneEndsAt, '20:00');
  });

  test('a set is on from its start minute and off at its end minute', () => {
    assert.equal(partyStatus(party, at('19:30')).nowPlaying.band, 'First Act');
    const end = partyStatus(party, at('20:15'));
    assert.equal(end.nowPlaying, null);
    assert.equal(end.upNext.band, 'Second Act');
  });

  test('before the first act nobody is on and the first act is up next', () => {
    const s = partyStatus(party, at('19:10'));
    assert.equal(s.nowPlaying, null);
    assert.equal(s.upNext.band, 'First Act');
  });

  test('while an act is on, up next is the one after, and none after the last', () => {
    assert.equal(partyStatus(party, at('20:45')).nowPlaying.band, 'Second Act');
    assert.equal(partyStatus(party, at('20:45')).upNext, null);
    const after = partyStatus(party, at('21:15'));
    assert.equal(after.nowPlaying, null);
    assert.equal(after.upNext, null);
  });

  test('the 2-for-1 window is on at its start minute and off at its end minute', () => {
    assert.equal(partyStatus(party, at('19:00')).twoForOneEndsAt, '20:00');
    assert.equal(partyStatus(party, at('18:59')).twoForOneEndsAt, null);
    assert.equal(partyStatus(party, at('19:59')).twoForOneEndsAt, '20:00');
    assert.equal(partyStatus(party, at('20:00')).twoForOneEndsAt, null);
  });

  test('on any other day everything is off', () => {
    for (const day of ['2026-10-12', '2026-10-14']) {
      assert.deepEqual(partyStatus(party, at('19:45', day)), { twoForOneEndsAt: null, nowPlaying: null, upNext: null });
    }
  });
});

describe('travelIn', () => {
  const travel = [
    { fromVenueId: 1, toVenueId: 2, mode: 'Walk', minutes: 10, costUsd: 0 },
    { fromVenueId: 1, toVenueId: 2, mode: 'Shuttle', minutes: 25, costUsd: 0 },
    { fromVenueId: 1, toVenueId: 2, mode: 'Rideshare', minutes: 16, costUsd: 18 },
    { fromVenueId: 2, toVenueId: 1, mode: 'Shuttle', minutes: 27, costUsd: 0 },
  ];

  test('the fastest non-Walk row from the other venue', () => {
    assert.equal(travelIn(travel, { venue: { id: 2 } }).mode, 'Rideshare');
    assert.equal(travelIn(travel, { venue: { id: 1 } }).minutes, 27);
  });

  test('null when there is no route', () => {
    assert.equal(travelIn([], { venue: { id: 2 } }, 1), null);
  });
});
