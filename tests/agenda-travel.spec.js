import { test, expect } from '@playwright/test';
import { API, visit, laneFor, bookableFor, momentOn, shotForPR, failOnPageErrors } from './helpers.js';
import { travelHops } from '../src/lib/travel.js';

const combos = (items, k, from = 0) => {
  if (k === 0) return [[]];
  const out = [];
  for (let i = from; i < items.length; i++) {
    for (const rest of combos(items, k - 1, i + 1)) out.push([items[i], ...rest]);
  }
  return out;
};

test.describe('My Agenda travel between venues', () => {
  test('flags a hop that cannot be made, shows one that can, shows nothing within a site, and clears on removal', async ({ page, request }, testInfo) => {
    const errors = failOnPageErrors(page);
    const lane = await laneFor('agenda.travel', testInfo);
    const { travel } = await (await request.get(`${API}/bootstrap`)).json();
    const plan = await (await request.get(`${API}/users/${lane.user}/schedule`)).json();
    const held = (plan.days.find((x) => x.date === lane.day)?.sessions ?? []).filter((s) => s.reservation === 'confirmed');
    const open = (await bookableFor(request, lane.user, lane.day)).filter((s) => !s.isFull && s.seatsLeft > 3);

    // What the page must show for a set of confirmed seats: the unit-tested pairing rule.
    const hopsFor = (mine) => travelHops([...held, ...mine.map((s) => ({ ...s, reservation: 'confirmed' }))], travel);
    const flags = (hops) => hops.map((h) => [h.from.title, String(h.assessment.impossible)]);

    // Free sessions that make at least one warning and one hop that fits, preferring four
    // so two of them can sit at the same site.
    const mine = [4, 3].flatMap((k) => combos(open, k)).find((set) => {
      if (set.some((x, i) => i && x.startsAt < set[i - 1].endsAt)) return false;
      const hops = hopsFor(set);
      return hops.some((h) => h.assessment.impossible) && hops.some((h) => !h.assessment.impossible);
    });
    expect(mine, 'the seed leaves free sessions that make a tight hop and a roomy one on this day').toBeTruthy();

    try {
      for (const s of mine) {
        const res = await request.put(`${API}/users/${lane.user}/reservations/${s.id}`, { data: {} });
        expect(res.ok()).toBeTruthy();
      }

      await visit(page, '/my-agenda', { as: lane.user, at: await momentOn(1, '08:00') });
      const day = page.getByTestId(`agenda-day-${lane.day}`);
      await expect(day).toBeVisible();
      const hopEls = day.getByTestId('travel-hop');
      const shown = () => hopEls.evaluateAll((els) => els.map((e) => [
        e.parentElement.querySelector('h3').textContent, e.getAttribute('data-impossible')]));

      // one hop per cross-venue pair of confirmed seats, after its first row; same-venue pairs have none
      const expected = hopsFor(mine);
      await expect.poll(shown).toEqual(flags(expected));

      const bad = expected.find((h) => h.assessment.impossible);
      const good = expected.find((h) => !h.assessment.impossible);
      const badEl = day.locator('[data-testid=travel-hop][data-impossible=true]').first();
      await expect(badEl).toContainText(`${bad.assessment.gapMinutes} min`);
      await expect(badEl).toContainText(`${bad.assessment.fastest.total} min`);
      await expect(badEl).toContainText(/can't reach/i);

      const goodEl = day.locator('[data-testid=travel-hop][data-impossible=false]').first();
      await expect(goodEl.getByTestId('travel-option')).toHaveCount(good.assessment.options.length);
      await expect(goodEl.getByRole('link', { name: /route map/i })).toHaveAttribute('href', '/venues');
      await expect(goodEl).not.toContainText(/can't reach/i);

      await shotForPR(page, 'My Agenda travel warning');

      // removing one session of the flagged pair clears its warning, in place
      await page.evaluate(() => { window.__noReload = true; });
      await day.getByTestId('session-card').filter({ hasText: bad.from.title })
        .getByRole('button', { name: 'Remove from my agenda' }).click();
      const rest = mine.filter((s) => s.id !== bad.from.id);
      await expect.poll(shown).toEqual(flags(hopsFor(rest)));
      expect(await page.evaluate(() => window.__noReload)).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      for (const s of mine) await request.delete(`${API}/users/${lane.user}/reservations/${s.id}`);
    }
  });
});
