import { test, expect } from '@playwright/test';
import { API, visit, laneFor, bookableFor, shotForPR, failOnPageErrors, ATTENDEES } from './helpers.js';

const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const hours = (mins) => (mins % 60 === 0 ? `${mins / 60}h` : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`);

/** The user's lane day as the API reports it — the numbers the page must agree with. */
async function dayOf(request, userId, date) {
  const plan = await (await request.get(`${API}/users/${userId}/schedule`)).json();
  return plan.days.find((d) => d.date === date);
}

test.describe('My Agenda', () => {
  test('lists booked sessions by day in time order, keeps hours honest, follows removals, and has an empty state', async ({ page, request }, testInfo) => {
    const errors = failOnPageErrors(page);
    const lane = await laneFor('agenda.page', testInfo);
    const free = await bookableFor(request, lane.user, lane.day);

    // A queue to join, then one session before it and one after, so booking
    // order differs from time order.
    const fixture = free.filter((s) => s.isFull).map((queued) => {
      const open = free.filter((s) => !s.isFull && s.seatsLeft > 3);
      return {
        queued,
        earlier: open.find((s) => s.endsAt <= queued.startsAt),
        later: [...open].reverse().find((s) => s.startsAt >= queued.endsAt),
      };
    }).find((f) => f.earlier && f.later);
    expect(fixture, 'a sold-out session with a free one either side of it').toBeTruthy();
    const { queued, earlier, later } = fixture;
    const mine = [earlier, queued, later];

    try {
      for (const s of [later, queued, earlier]) {
        const res = await request.put(`${API}/users/${lane.user}/reservations/${s.id}`, { data: {} });
        expect(res.ok()).toBeTruthy();
      }
      const seeded = (await dayOf(request, lane.user, lane.day)).sessions.length - mine.length;

      await visit(page, '/my-agenda', { as: lane.user });
      const section = page.getByTestId(`agenda-day-${lane.day}`);
      await expect(section).toBeVisible();
      // more than one day on the page (the seeded plan is on other days)
      await expect(page.getByTestId(/^agenda-day-/)).not.toHaveCount(1);

      // time order, waitlisted labelled and confirmed not
      const rows = section.getByTestId('session-card');
      const titles = await rows.locator('h3').allTextContents();
      const ordered = (await dayOf(request, lane.user, lane.day)).sessions
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((s) => s.title);
      expect(titles).toEqual(ordered);
      const queuedRow = rows.filter({ hasText: queued.title });
      await expect(queuedRow).toContainText('Waitlisted');
      await expect(rows.filter({ hasText: earlier.title })).not.toContainText('Waitlisted');
      await expect(rows.filter({ hasText: later.title })).not.toContainText('Waitlisted');

      // hours: confirmed only, queued apart
      const planDay = await dayOf(request, lane.user, lane.day);
      expect(planDay.waitlistedMinutes).toBeGreaterThanOrEqual(minutes(queued.endsAt) - minutes(queued.startsAt));
      await expect(section.getByTestId('agenda-day-hours')).toHaveText(hours(planDay.totalMinutes));
      await expect(section.getByTestId('agenda-day-waitlisted')).toHaveText(`+${hours(planDay.waitlistedMinutes)} waitlisted`);
      await shotForPR(page, 'My Agenda with a waitlisted session');

      // remove from the page: the row goes, the totals follow, no reload
      const before = await page.evaluate(() => performance.timeOrigin);
      await queuedRow.getByRole('button', { name: 'Leave the waitlist' }).click();
      await expect(rows.filter({ hasText: queued.title })).toHaveCount(0);
      const queuedLeft = planDay.waitlistedMinutes - (minutes(queued.endsAt) - minutes(queued.startsAt));
      if (queuedLeft > 0) await expect(section.getByTestId('agenda-day-waitlisted')).toHaveText(`+${hours(queuedLeft)} waitlisted`);
      else await expect(section.getByTestId('agenda-day-waitlisted')).toHaveCount(0);
      await rows.filter({ hasText: later.title }).getByRole('button', { name: 'Remove from my agenda' }).click();
      await rows.filter({ hasText: earlier.title }).getByRole('button', { name: 'Remove from my agenda' }).click();
      await expect(rows).toHaveCount(seeded);
      if (seeded === 0) await expect(section).toHaveCount(0);
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(before);
    } finally {
      for (const s of mine) await request.delete(`${API}/users/${lane.user}/reservations/${s.id}`);
    }

    // nothing booked: the empty state, linking to the schedule
    await page.route('**/api/users/*/schedule', (route) => route.fulfill({
      json: { user: { id: lane.user }, days: [] },
    }));
    await page.goto('/my-agenda');
    await expect(page.getByTestId('agenda-empty').getByRole('link', { name: /schedule/i })).toHaveAttribute('href', '/schedule');
    await expect(page.getByTestId(/^agenda-day-/)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('is still in the nav, and /my-plan redirects to it', async ({ page }, testInfo) => {
    await visit(page, '/', { as: ATTENDEES.jonas });
    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: /My Agenda/ }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /My Agenda/ }).click();
    }
    await expect(page).toHaveURL(/\/my-agenda$/);
    await visit(page, '/my-plan');
    await expect(page).toHaveURL(/\/my-agenda$/);
  });
});
