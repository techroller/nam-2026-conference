import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

let api;
let close;
let slugs;

before(async () => {
  const started = await startApi();
  api = started.api;
  close = started.close;
  slugs = (await api.json('/bootstrap')).tracks.map((t) => t.slug);
});

after(async () => { await close(); });

const idsOf = (rows) => rows.map((s) => s.id).sort();

describe('GET /sessions?trackSlug=a,b', () => {
  test('lists the union of the tracks, and each track alone is unchanged', async () => {
    const [a, b] = slugs;
    const onlyA = await api.json(`/sessions?trackSlug=${a}`);
    const onlyB = await api.json(`/sessions?trackSlug=${b}`);
    const both = await api.json(`/sessions?trackSlug=${a},${b}`);
    assert.ok(onlyA.length > 0 && onlyB.length > 0);
    assert.deepEqual(idsOf(both), idsOf([...onlyA, ...onlyB]));
  });

  test('ignores spaces and empty entries, and still narrows other filters', async () => {
    const [a, b] = slugs;
    const clean = await api.json(`/sessions?trackSlug=${a},${b}`);
    const messy = await api.json(`/sessions?trackSlug=${encodeURIComponent(` ${a} ,,${b},`)}`);
    assert.deepEqual(idsOf(messy), idsOf(clean));

    const day = clean[0].day;
    const narrowed = await api.json(`/sessions?day=${day}&trackSlug=${a},${b}`);
    assert.ok(narrowed.length < clean.length);
    assert.ok(narrowed.every((s) => s.day === day));
  });
});
