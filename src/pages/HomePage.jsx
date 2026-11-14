import { Link } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import * as api from '../lib/api.js';
import { routesBetween } from '../lib/travel.js';
import { relativeDate, time as fmtTime } from '../lib/format.js';
import { SponsorMarquee } from '../components/SponsorMarquee.jsx';
import { Reveal } from '../components/Reveal.jsx';
import { HeroMedia } from '../components/HeroMedia.jsx';
import { Button, Chip, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

/**
 * A banner over generated art of the two venues (a gradient if the images do
 * not load). It names the conference; the welcome and the way between the
 * venues sit under it. Nothing in it is about the signed-in attendee.
 */
function HeroBar({ conference }) {
  const { clock, days } = useConference();
  const today = days.find((d) => d.date === clock.day);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-hairline" data-testid="hero">
      <HeroMedia />
      <div className="absolute inset-0 bg-[radial-gradient(30rem_14rem_at_12%_0%,rgba(139,92,246,0.22),transparent_65%)]" />

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 content-end min-h-[16rem] px-5 py-6 sm:min-h-[22rem] sm:px-8 sm:py-8">
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-none tracking-tight sm:text-6xl">
            {conference.name} <span className="text-muted">{conference.edition}</span>
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            {conference.dates} · {conference.city}
          </p>
        </div>

        {today && (
          <Chip accent="cyan" className="!py-1.5">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-cyan-400" />
            {today.label} · {fmtTime(clock.time)}
          </Chip>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button to={`/schedule?day=${clock.day}`} variant="primary" size="sm">
            Browse today <Icon name="arrowRight" className="size-3.5" />
          </Button>
          <Button to="/speakers" size="sm">Speakers</Button>
        </div>
      </div>
    </section>
  );
}

/** What the conference is, in a sentence or two — all of it from the data. */
function About({ conference }) {
  const { venues } = useConference();
  return (
    <section data-testid="about" className="max-w-3xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">About</p>
      <h2 className="mt-1 font-display text-xl sm:text-2xl">
        Welcome to {conference.name} {conference.edition}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {conference.name} {conference.edition} runs {conference.dates} in {conference.city}. The programme
        is split across {venues.length === 2 ? 'two venues' : `${venues.length} venues`} 6.2 miles apart,
        so plan the journey between them as well as your day.
      </p>
    </section>
  );
}

const cost = (usd) => (usd === 0 ? 'Free' : `$${usd}`);

/** Each venue's address and hours, how to get between them, and where the rest lives. */
function GettingThere() {
  const { venues, travel } = useConference();
  if (!venues.length) return null;
  const pairs = venues.length === 2 ? [[venues[0], venues[1]], [venues[1], venues[0]]] : [];

  return (
    <section data-testid="getting-there" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl sm:text-2xl">Getting there</h2>
        <Link to="/venues" className="text-sm font-semibold text-violet-300 hover:text-violet-200">
          Venues and rooms <Icon name="arrowRight" className="inline size-3.5" />
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {venues.map((v) => (
          <li key={v.id} className="card p-4">
            <h3 className="font-semibold">{v.name}</h3>
            <p className="mt-1 text-[13px] text-muted">{v.address}</p>
            <p className="mt-0.5 text-[13px] text-faint">Open {fmtTime(v.opensAt)} – {fmtTime(v.closesAt)}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        {pairs.map(([from, to]) => (
          <div key={`${from.id}-${to.id}`} className="card p-4">
            <h3 className="text-sm font-semibold">{from.shortName} to {to.shortName}</h3>
            <ul className="mt-2 divide-y divide-hairline text-[13px]">
              {routesBetween(travel, from.id, to.id).filter((t) => t.mode !== 'Walk').map((t) => (
                <li key={t.mode} data-testid={`travel-${from.id}-${to.id}-${t.mode}`}
                  className="flex items-center justify-between gap-3 py-1.5">
                  <span>{t.mode}</span>
                  <span className="text-muted">{t.minutes} min · {cost(t.costUsd)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * One announcement, and only one that has actually been posted.
 *
 * This used to render the first two pinned rows regardless of `postedAt`, so a
 * warning about day 3 appeared on day 2 — before it was written.
 */
function LatestAnnouncement() {
  const { clock, venueById } = useConference();
  const { data } = useFetch(api.getAnnouncements, []);

  const nowIso = `${clock.day}T${clock.time}:00Z`;
  const live = (data ?? [])
    .filter((a) => a.postedAt <= nowIso)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedAt.localeCompare(a.postedAt));

  const item = live[0];
  if (!item) return null;

  const tone = {
    warning: 'border-amber-500/25 bg-amber-500/[0.07] text-amber-200',
    success: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-200',
    info: 'border-sky-500/25 bg-sky-500/[0.07] text-sky-200',
  }[item.kind] ?? 'border-sky-500/25 bg-sky-500/[0.07] text-sky-200';

  return (
    <section className={cx('flex gap-3 rounded-2xl border p-4', tone)} data-testid="announcements">
      <Icon name={item.kind === 'warning' ? 'alert' : 'info'} className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-semibold">{item.title}</h2>
          <span className="text-[11px] text-faint">
            {relativeDate(item.postedAt, clock)}
            {item.venueId && ` · ${venueById[item.venueId]?.shortName}`}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.body}</p>
      </div>
    </section>
  );
}

export function HomePage() {
  const { conference } = useConference();
  useDocumentTitle("ORBIT '26");

  return (
    // Sections hide themselves when empty; hide their Reveal wrapper too, or
    // each one leaves a blank gap in the stack.
    <div className="space-y-8 [&>:empty]:hidden">
      <HeroBar conference={conference} />
      <Reveal><About conference={conference} /></Reveal>
      <Reveal><GettingThere /></Reveal>
      <Reveal><LatestAnnouncement /></Reveal>
      <SponsorMarquee />
    </div>
  );
}
