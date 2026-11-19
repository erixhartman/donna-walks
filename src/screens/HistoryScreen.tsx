import { useLiveQuery } from 'dexie-react-hooks'
import { db, walkDistance, type DogEvent, type Walk } from '../db'
import { fmtDay, fmtKm, fmtMinutes, fmtTime } from '../format'
import { startOfDay, useScrolled } from '../hooks'
import { Icon } from '../components/Icon'
import { EventRow } from '../components/EventRow'

type Item = { kind: 'walk'; at: number; walk: Walk; events: DogEvent[] } | { kind: 'event'; at: number; event: DogEvent }

export function HistoryScreen({ navigate }: { navigate: (h: string) => void }) {
  const scrolled = useScrolled()
  const days = useLiveQuery(async () => {
    const [walks, events] = await Promise.all([db.walks.toArray(), db.events.toArray()])
    const byWalk = new Map<string, DogEvent[]>()
    const items: Item[] = []
    for (const e of events) {
      if (e.walkId) byWalk.set(e.walkId, [...(byWalk.get(e.walkId) ?? []), e])
      else items.push({ kind: 'event', at: e.at, event: e })
    }
    for (const w of walks) {
      if (w.endedAt === undefined) continue
      items.push({ kind: 'walk', at: w.startedAt, walk: w, events: byWalk.get(w.id) ?? [] })
    }
    items.sort((a, b) => b.at - a.at)
    const groups = new Map<number, Item[]>()
    for (const it of items) {
      const k = startOfDay(it.at)
      groups.set(k, [...(groups.get(k) ?? []), it])
    }
    return [...groups.entries()]
  }, [])

  return (
    <div className="screen">
      <header className={`top-bar ${scrolled ? 'scrolled' : ''}`}>
        <h1 className="title-l">History</h1>
      </header>
      {days && !days.length && (
        <div className="empty">
          <p className="title-m">No walks yet</p>
          <p className="body-m muted">Start a walk from the Walk tab and it'll show up here.</p>
        </div>
      )}
      {days?.map(([day, items]) => (
        <section key={day}>
          <div className="day-header title-s muted">{fmtDay(day)}</div>
          <div className="list">
            {items.map((it) =>
              it.kind === 'walk' ? (
                <WalkRow key={it.walk.id} walk={it.walk} events={it.events} onClick={() => navigate(`#/walk/${it.walk.id}`)} />
              ) : (
                <EventRow key={it.event.id} e={it.event} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

function WalkRow({ walk, events, onClick }: { walk: Walk; events: DogEvent[]; onClick: () => void }) {
  const reactions = events.filter((e) => e.type === 'reaction').length
  const pees = events.filter((e) => e.type === 'pee').length
  const poos = events.filter((e) => e.type === 'poo').length
  const extras = [
    reactions ? `${reactions} reaction${reactions > 1 ? 's' : ''}` : 'No reactions',
    pees ? `${pees} pee${pees > 1 ? 's' : ''}` : '',
    poos ? `${poos} poo` : '',
  ].filter(Boolean)
  return (
    <button className="list-item" onClick={onClick}>
      <span className="lead walk"><Icon name="walk" size={20} /></span>
      <span className="content">
        <span className="body-l num">
          {fmtKm(walkDistance(walk))} · {fmtMinutes((walk.endedAt ?? walk.startedAt) - walk.startedAt)}
        </span>
        <span className="body-m muted">{fmtTime(walk.startedAt)} · {extras.join(' · ')}</span>
      </span>
      <span className="trail"><Icon name="chevron" /></span>
    </button>
  )
}
