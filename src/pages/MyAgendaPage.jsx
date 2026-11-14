import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { agendaDays, hoursLabel } from '../lib/agenda.js';
import { hasEnded } from '../lib/clock.js';
import { dayLabel } from '../lib/format.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { SessionCard } from '../components/SessionCard.jsx';
import { Button, ErrorState, SectionHeader, Skeleton } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

/**
 * The sessions you hold a seat or a waitlist place on, by day. The fetched
 * schedule says which sessions you have ever reserved; the store says which you
 * still hold, so a removal anywhere takes the row off without a reload.
 */
export function MyAgendaPage() {
  useDocumentTitle('My Agenda');
  const { currentUserId, reservationFor, reservationsReady, clock } = useConference();
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
        days.map((d) => (
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
                <SessionCard
                  key={s.id}
                  session={s}
                  variant="row"
                  attendance={s.reservation === 'confirmed'
                    ? { ended: hasEnded(s, clock), checkedIn: s.checkedIn, myStars: s.myStars }
                    : null}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
