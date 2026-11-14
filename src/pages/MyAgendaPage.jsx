import { Link } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { agendaDays, hoursLabel } from '../lib/agenda.js';
import { hasEnded } from '../lib/clock.js';
import { dayLabel } from '../lib/format.js';
import { travelHops } from '../lib/travel.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Button, ErrorState, SectionHeader, Skeleton } from '../components/ui.jsx';
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
  const { currentUserId, reservationFor, reservationsReady, clock, travel } = useConference();
  const { data, loading, error, reload } = useFetch(() => api.getSchedule(currentUserId), [currentUserId]);

  const days = data && reservationsReady ? agendaDays(data.days, reservationFor) : [];

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Your conference" title="My Agenda" />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading || !reservationsReady ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : days.length === 0 ? (
        <section
          className="grid place-items-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-20 text-center"
          data-testid="agenda-empty"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-violet-500/12 text-violet-300">
            <Icon name="ticket" className="size-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl">Nothing on your agenda yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Add a session and it takes your seat, or a place in the queue when the room is full.
          </p>
          <Button to="/schedule" size="sm" className="mt-6">Browse the schedule</Button>
        </section>
      ) : (
        days.map((d) => {
          const hops = new Map(travelHops(d.sessions, travel).map((h) => [h.from.id, h]));
          return (
          <section key={d.date} data-testid={`agenda-day-${d.date}`} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-display text-xl">{dayLabel(d.date)}</h3>
              <div className="text-sm text-muted">
                <span data-testid="agenda-day-hours">{hoursLabel(d.totalMinutes)}</span>
                {d.waitlistedMinutes > 0 && (
                  <span className="ml-2 font-medium text-amber-300" data-testid="agenda-day-waitlisted">
                    +{hoursLabel(d.waitlistedMinutes)} waitlisted
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2.5">
              {d.sessions.map((s) => (
                <div key={s.id} className="space-y-2.5">
                  <SessionCard
                    session={s}
                    variant="row"
                    attendance={s.reservation === 'confirmed'
                      ? { ended: hasEnded(s, clock), checkedIn: s.checkedIn, myStars: s.myStars }
                      : null}
                  />
                  {hops.has(s.id) && <TravelHop hop={hops.get(s.id)} />}
                </div>
              ))}
            </div>
          </section>
          );
        })
      )}
    </div>
  );
}
