import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaDays, hoursLabel } from '../../src/lib/agenda.js';

const s = (id, day, startsAt, durationMins) => ({ id, day, startsAt, durationMins });
const day = (date, sessions) => ({ date, sessions });
const held = (map) => (id) => map[id] ?? null;

describe('My Agenda days', () => {
  const payload = [
    day('2026-09-01', [s(1, '2026-09-01', '14:00', 60), s(2, '2026-09-01', '09:00', 45), s(3, '2026-09-01', '11:00', 90)]),
    day('2026-09-02', [s(4, '2026-09-02', '10:00', 30)]),
  ];

  test('each day lists its sessions in time order, with the status the store holds', () => {
    const out = agendaDays(payload, held({ 1: 'confirmed', 2: 'confirmed', 3: 'waitlisted', 4: 'confirmed' }));
    assert.deepEqual(out.map((d) => d.date), ['2026-09-01', '2026-09-02']);
    assert.deepEqual(out[0].sessions.map((x) => [x.id, x.reservation]),
      [[2, 'confirmed'], [3, 'waitlisted'], [1, 'confirmed']]);
  });

  test('booked minutes count confirmed seats only; queued minutes are totalled apart', () => {
    const [d] = agendaDays(payload, held({ 1: 'confirmed', 2: 'confirmed', 3: 'waitlisted' }));
    assert.equal(d.totalMinutes, 105);
    assert.equal(d.waitlistedMinutes, 90);
  });

  test('a session the store no longer holds drops off, and a day with none left disappears', () => {
    const out = agendaDays(payload, held({ 1: 'confirmed' }));
    assert.deepEqual(out.map((d) => [d.date, d.sessions.map((x) => x.id), d.totalMinutes, d.waitlistedMinutes]),
      [['2026-09-01', [1], 60, 0]]);
    assert.deepEqual(agendaDays(payload, held({})), []);
  });

  test('hours read as "1h 30m", with the minutes left off when there are none', () => {
    assert.equal(hoursLabel(0), '0h');
    assert.equal(hoursLabel(60), '1h');
    assert.equal(hoursLabel(90), '1h 30m');
    assert.equal(hoursLabel(45), '45m');
  });
});
