import { Link } from 'react-router-dom';
import * as api from '../lib/api.js';
import { useConference, useFetch } from '../lib/store.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { travelHops } from '../lib/travel.js';
import { dayLabel } from '../lib/format.js';
import { Button, SectionHeader, Skeleton } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { SessionCard } from '../components/SessionCard.jsx';

/**
 * The way from one booked session to the next across town. A warning when
 * nothing fits the gap, otherwise the options with a link to the route map.
 */
function TravelHop({ hop }) {
  const { assessment: a, to } = hop;
  const bad = a.impossible;
  return (
    <div
      data-testid="travel-hop"
      data-impossible={bad ? 'true' : 'false'}
      className={bad
        ? 'rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4'
        : 'rounded-2xl border border-hairline bg-surface p-4'}
    >
      <div className="flex items-start gap-2.5">
        <Icon name="car" className={bad ? 'mt-0.5 size-4 shrink-0 text-amber-300' : 'mt-0.5 size-4 shrink-0 text-muted'} />
        <div className="min-w-0">
          <h3 className={bad ? 'text-sm font-semibold text-amber-200' : 'text-sm font-semibold'}>
            {bad ? `You can't reach ${to.venue.shortName} in time` : `Getting to ${to.venue.shortName}`}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted" data-testid="travel-hop-gap">
            {bad
              ? `You have ${a.gapMinutes} min between sessions. The fastest way, ${a.fastest.mode}, takes ${a.fastest.total} min including the walk to the room.`
              : `You have ${a.gapMinutes} min between sessions.`}
          </p>
          <ul className="mt-3 space-y-1.5">
            {a.options.map((o) => (
              <li key={o.mode} data-testid="travel-option" className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
                <span className="w-20 shrink-0 font-medium text-ink">{o.mode}</span>
                <span className="font-mono text-amber-200">{o.minutes} min</span>
                <span className="text-faint">{o.costUsd ? `≈ $${o.costUsd.toFixed(2)}` : 'free'}</span>
                {o.note && <span className="text-faint">{o.note}</span>}
                <span className="text-faint">+{a.walk} min walk</span>
              </li>
            ))}
          </ul>
          <Link to="/venues" className="mt-3 inline-block text-[12px] font-semibold text-violet-300 hover:text-violet-200">
            See the route map
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MyAgendaPage() {
  useDocumentTitle('My Agenda');
  const { currentUserId, reservationFor, travel } = useConference();
  const { data: plan, loading } = useFetch(() => api.getSchedule(currentUserId), [currentUserId]);

  // The store, not the fetched payload, says what you still hold.
  const days = (plan?.days ?? [])
    .map((d) => ({
      ...d,
      sessions: d.sessions
        .map((s) => ({ ...s, reservation: reservationFor(s.id) }))
        .filter((s) => s.reservation)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id - b.id),
    }))
    .filter((d) => d.sessions.length);

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Your conference" title="My Agenda" />
      {loading && !plan && <Skeleton className="h-48" />}
      {!loading && days.length === 0 && (
        <section className="rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center" data-testid="agenda-empty">
          <p className="text-sm text-muted">Nothing booked yet.</p>
          <Button to="/schedule" size="sm" className="mt-4">Browse the schedule</Button>
        </section>
      )}
      {days.map((d) => {
        const hops = new Map(travelHops(d.sessions, travel).map((h) => [h.from.id, h]));
        return (
          <section key={d.date} data-testid={`agenda-day-${d.date}`} className="space-y-3">
            <h2 className="font-display text-xl">{dayLabel(d.date)}</h2>
            {d.sessions.map((s) => (
              <div key={s.id} className="space-y-3">
                <SessionCard session={s} variant="row" />
                {hops.has(s.id) && <TravelHop hop={hops.get(s.id)} />}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
