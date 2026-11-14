import { test, expect } from '@playwright/test';
import { API, momentOn, visit, shotForPR } from './helpers.js';

/** Read-only: no seats are touched, so no data lane. Pin times derive from the API, never hard-coded. */

const mins = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const clock12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

async function load() {
  const parties = await (await fetch(`${API}/sessions/parties`)).json();
  const boot = await (await fetch(`${API}/bootstrap`)).json();
  const dayIndex = (p) => boot.days.findIndex((d) => d.date === p.day);
  return { parties, boot, dayIndex };
}

test('the Parties page lists every party with its details', async ({ page }) => {
  const { parties, boot, dayIndex } = await load();
  expect(parties).toHaveLength(4);
  await visit(page, '/parties', { at: await momentOn(0, '08:00') });
  await expect(page.getByRole('heading', { name: 'Parties', exact: true })).toBeVisible();

  for (const p of parties) {
    const card = page.getByTestId(`party-${p.id}`);
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { name: p.title })).toBeVisible();
    await expect(card.getByTestId('party-act')).toHaveText(
      p.lineup.map((a) => new RegExp(a.band)),
    );
    await expect(card.getByTestId('party-two-for-one-window')).toContainText(
      `${clock12(p.twoForOne.startsAt)} – ${clock12(p.twoForOne.endsAt)}`);
    const entry = card.getByTestId('party-entry');
    await expect(entry).toContainText('21+');
    await expect(entry).toContainText(/badge/i);
    await expect(entry).toContainText(p.entry.plusOnes);
    await expect(card.getByRole('link', { name: /add to calendar/i }))
      .toHaveAttribute('href', `/api/sessions/${p.id}.ics`);
    await expect(card.locator('svg[role="img"]')).toBeVisible();

    const other = boot.venues.find((v) => v.id !== p.venue.id);
    const fastest = boot.travel
      .filter((t) => t.fromVenueId === other.id && t.toVenueId === p.venue.id && t.mode !== 'Walk')
      .sort((a, b) => a.minutes - b.minutes)[0];
    const shuttle = card.getByTestId('party-shuttle');
    await expect(shuttle).toContainText(`${fastest.minutes} min`);
    await expect(shuttle).toContainText(clock12(p.lastShuttle.time));

    await expect(card.getByRole('button')).toHaveCount(0);
    await expect(card.getByTestId('party-act').locator('a')).toHaveCount(0);
    await expect(card).toContainText(p.venue.name);
    expect(dayIndex(p)).toBeGreaterThanOrEqual(0);
  }
  await shotForPR(page, 'the four parties with line-ups, drinks windows and shuttles');
});

test('the on-now, up-next and 2-for-1 badges follow the clock', async ({ page }) => {
  const { parties, dayIndex } = await load();
  const p = parties[0];
  const card = page.getByTestId(`party-${p.id}`);
  const [a1, a2] = p.lineup;
  const d = dayIndex(p);
  const open = async (time, day = d) => visit(page, '/parties', { at: await momentOn(day, time) });
  const none = async () => {
    await expect(card).toBeVisible();
    await expect(card.getByTestId('party-badge-two-for-one')).toHaveCount(0);
    await expect(card.getByTestId('party-badge-now-playing')).toHaveCount(0);
    await expect(card.getByTestId('party-badge-up-next')).toHaveCount(0);
  };

  // mid first set, inside the drinks window if it overlaps
  const mid = hhmm(Math.floor((mins(a1.startsAt) + mins(a1.endsAt)) / 2));
  await open(mid);
  await expect(card.getByTestId('party-badge-now-playing')).toContainText(a1.band);
  await expect(card.getByTestId('party-badge-up-next')).toContainText(a2.band);
  const inWindow = mins(mid) >= mins(p.twoForOne.startsAt) && mins(mid) < mins(p.twoForOne.endsAt);
  if (inWindow) {
    await expect(card.getByTestId('party-badge-two-for-one'))
      .toContainText(`ends ${clock12(p.twoForOne.endsAt)}`);
  } else {
    await expect(card.getByTestId('party-badge-two-for-one')).toHaveCount(0);
  }

  // drinks window edges
  await open(p.twoForOne.startsAt);
  await expect(card.getByTestId('party-badge-two-for-one')).toContainText(`ends ${clock12(p.twoForOne.endsAt)}`);
  await open(hhmm(mins(p.twoForOne.startsAt) - 1));
  await expect(card.getByTestId('party-badge-two-for-one')).toHaveCount(0);
  await open(p.twoForOne.endsAt);
  await expect(card.getByTestId('party-badge-two-for-one')).toHaveCount(0);

  // before the first act: nobody on, first act up next
  await open(hhmm(mins(a1.startsAt) - 1));
  await expect(card.getByTestId('party-badge-now-playing')).toHaveCount(0);
  await expect(card.getByTestId('party-badge-up-next')).toContainText(a1.band);

  // after the last act: neither
  await open(p.lineup.at(-1).endsAt);
  await expect(card.getByTestId('party-badge-now-playing')).toHaveCount(0);
  await expect(card.getByTestId('party-badge-up-next')).toHaveCount(0);

  // a different day: none
  await open(mid, d === 0 ? 1 : 0);
  await none();

  await open(mid);
  await expect(card.getByTestId('party-badge-now-playing')).toBeVisible();
  await shotForPR(page, 'on-now and up-next badges on the party day');
});
