import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { accent } from '../lib/accents.js';
import { dayLabel, time } from '../lib/format.js';
import { routesBetween } from '../lib/travel.js';
import { partyStatus, travelIn } from '../lib/parties.js';
import { Chip, ErrorState, SectionHeader, Skeleton } from '../components/ui.jsx';
import { VenueRouteMap } from '../components/VenueRouteMap.jsx';
import { Icon } from '../components/Icon.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';

function PartyCard({ party }) {
  const { clock, venues, venueById, travel } = useConference();
  const status = partyStatus(party, clock);
  const venue = venueById[party.venue.id] ?? party.venue;
  const other = venues.find((v) => v.id !== party.venue.id);
  const inFrom = travelIn(travel, party);
  const back = venueById[party.lastShuttle.toVenueId];
  const a = accent(venue.accent);

  return (
    <section className="card overflow-hidden" data-testid={`party-${party.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-tight">{party.title}</h3>
          <p className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${a.text}`}>
            <Icon name="pin" className="size-3.5" />{venue.name} · {party.room?.name}
          </p>
          <p className="mt-0.5 text-xs text-muted">{time(party.startsAt)} – {time(party.endsAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status.twoForOneEndsAt && (
            <Chip accent="amber" data-testid="party-badge-two-for-one">
              2-for-1 on now · ends {time(status.twoForOneEndsAt)}
            </Chip>
          )}
          {status.nowPlaying && (
            <Chip accent="emerald" data-testid="party-badge-now-playing">On now: {status.nowPlaying.band}</Chip>
          )}
          {status.upNext && (
            <Chip accent="violet" data-testid="party-badge-up-next">Up next: {status.upNext.band}</Chip>
          )}
        </div>
      </div>

      {other && (
        <VenueRouteMap
          venues={[other, venue]}
          routes={routesBetween(travel, other.id, party.venue.id)}
          className="!rounded-none !border-x-0"
        />
      )}

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-faint">Line-up</h4>
          <ol className="mt-2 space-y-1.5 text-sm">
            {party.lineup.map((act) => (
              <li key={act.band} data-testid="party-act" className="flex justify-between gap-3">
                <span>{act.band}</span>
                <span className="text-muted">{time(act.startsAt)} – {time(act.endsAt)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-3 text-sm">
          <p data-testid="party-two-for-one-window">
            <span className="font-medium">2-for-1 drinks</span>{' '}
            <span className="text-muted">{time(party.twoForOne.startsAt)} – {time(party.twoForOne.endsAt)}</span>
          </p>
          <p data-testid="party-entry" className="text-muted">
            {party.entry.minAge}+ · {party.entry.badgeRequired ? 'Badge required' : 'No badge needed'} · {party.entry.plusOnes}
          </p>
          <p data-testid="party-shuttle" className="text-muted">
            {inFrom && <>From {other?.shortName}: {inFrom.minutes} min by {inFrom.mode.toLowerCase()}. </>}
            Last shuttle to {back?.shortName ?? 'the other site'}: {time(party.lastShuttle.time)}.
          </p>
          <a className="inline-flex items-center gap-1.5 font-medium text-violet-400 hover:underline"
            href={api.sessionCalendarUrl(party.id)}>
            <Icon name="calendar" className="size-4" />Add to calendar
          </a>
        </div>
      </div>
    </section>
  );
}

export function PartiesPage() {
  useDocumentTitle('Parties');
  const { data, loading, error, reload } = useFetch(() => api.getParties(), []);

  const days = [...new Set((data ?? []).map((p) => p.day))];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <SectionHeader
        eyebrow="After hours"
        title="Parties"
        description="Four evenings, two venues. Each shows who is playing, when the drinks are two-for-one, and how to get home."
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && <Skeleton className="h-64 w-full" />}
      {days.map((day) => (
        <div key={day} className="space-y-4">
          <h3 className="font-display text-lg text-muted">{dayLabel(day)}</h3>
          {data.filter((p) => p.day === day).map((p) => <PartyCard key={p.id} party={p} />)}
        </div>
      ))}
    </div>
  );
}
