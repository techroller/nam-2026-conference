import { test, expect } from '@playwright/test';
import { API, visit, momentOn, conferenceDays, ATTENDEES, shotForPR } from './helpers.js';


test.describe('Home welcomes you, and is not a feed', () => {
  test('it welcomes you to the conference and its venues', async ({ page, request }) => {
    const boot = await (await request.get(`${API}/bootstrap`)).json();
    const { conference, venues, travel } = boot;
    const clock12 = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

    await visit(page, '/');

    // No quick-link tiles: nothing in the page body links to /food.
    await expect(page.getByTestId('quick-links')).toHaveCount(0);
    await expect(page.locator('main a[href="/food"]')).toHaveCount(0);

    // The hero shows the generated venue images.
    const imgs = page.getByTestId('hero-media').locator('img');
    await expect(imgs).toHaveCount(2);
    await expect(imgs.first()).toHaveAttribute('src', /\/images\/hero-\d\.jpg$/);

    // The blurb is drawn from the data.
    const about = page.getByTestId('about');
    await expect(about).toContainText(conference.name);
    await expect(about).toContainText(conference.dates);
    await expect(about).toContainText(conference.city);
    await expect(about).toContainText('6.2 miles');

    // Getting there: each venue's address and hours, each travel option, a link to /venues.
    const gt = page.getByTestId('getting-there');
    for (const v of venues) {
      await expect(gt).toContainText(v.address);
      await expect(gt).toContainText(`${clock12(v.opensAt)} – ${clock12(v.closesAt)}`);
    }
    const rows = travel.filter((t) => t.mode !== 'Walk');
    expect(rows.length).toBeGreaterThan(0);
    for (const t of rows) {
      const row = gt.getByTestId(`travel-${t.fromVenueId}-${t.toVenueId}-${t.mode}`);
      await expect(row).toContainText(t.mode);
      await expect(row).toContainText(`${t.minutes} min`);
      await expect(row).toContainText(t.costUsd === 0 ? 'Free' : `$${t.costUsd}`);
    }
    await expect(gt.locator('[data-testid^="travel-"][data-testid$="-Walk"]')).toHaveCount(0);
    await expect(gt.getByRole('link', { name: /venues/i })).toHaveAttribute('href', '/venues');
    expect(await gt.locator('a[href^="http"]').count()).toBe(0);

    // The sponsors are still there.
    await expect(page.getByTestId('sponsor-marquee')).toBeVisible();
    await shotForPR(page, 'Home welcomes you to the conference and its venues');

    // The hero still renders, as a gradient, when the images fail to load.
    await page.route('**/images/**', (r) => r.abort());
    await page.reload();
    await expect(page.getByTestId('hero')).toBeVisible();
    await expect(page.getByTestId('hero-media')).toHaveCount(0);
  });

  test('nothing on it is personal or live', async ({ page }) => {
    // A speaker, mid-morning, with sessions booked: the case that used to fill the page.
    await visit(page, '/', { as: ATTENDEES.andy, at: await momentOn(0, '10:30') });
    await expect(page.getByTestId('about')).toBeVisible();
    for (const id of ['today-panel', 'live-now', 'speaking-strip', 'followed-sessions', 'next-up']) {
      await expect(page.getByTestId(id), `${id} should not be on home`).toHaveCount(0);
    }
  });

  test('no announcement appears before it was posted', async ({ page, request }) => {
    const days = await conferenceDays();
    const all = await (await request.get(`${API}/announcements`)).json();
    const cutoff = `${days[0]}T09:00:00Z`;
    const posted = all.filter((a) => a.postedAt <= cutoff);
    const future = all.filter((a) => a.postedAt > cutoff);
    expect(posted.length, 'nothing is posted before 09:00 on day 1').toBeGreaterThan(0);
    expect(future.length, 'nothing is posted after 09:00 on day 1').toBeGreaterThan(0);

    await visit(page, '/', { at: await momentOn(0, '09:00') });
    const strip = page.getByTestId('announcements');
    await expect(strip).toBeVisible();

    const shown = await strip.innerText();
    for (const a of future) {
      expect(shown, `"${a.title}" was posted later than the clock`).not.toContain(a.title);
    }
  });

  test('things to do nearby: real places, one line each, nothing that goes stale', async ({ page }) => {
    await visit(page, '/');
    const section = page.getByTestId('nearby');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Things to do nearby' })).toBeVisible();

    const items = section.getByTestId('nearby-item');
    expect(await items.count()).toBeGreaterThanOrEqual(4);
    for (const text of await items.allInnerTexts()) {
      const [name, line] = text.split('\n').map((t) => t.trim()).filter(Boolean);
      expect(name, 'a name').toBeTruthy();
      expect(line, `a line under ${name}`).toBeTruthy();
    }

    await expect(section.locator('a')).toHaveCount(0);
    const text = await section.innerText();
    for (const re of [/\$\d/, /\d\s?(am|pm)/i, /\d{1,2}:\d{2}/, /open|daily/i]) {
      expect(text, `${re} would go stale`).not.toMatch(re);
    }

    expect(await section.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await section.scrollIntoViewIfNeeded();
    await shotForPR(page, 'Things to do nearby on Home');
  });
});
