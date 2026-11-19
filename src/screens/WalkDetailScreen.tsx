import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, walkDistance } from '../db'
import { deleteWalk } from '../walk'
import { fmtDay, fmtKm, fmtMinutes, fmtTime } from '../format'
import { Icon } from '../components/Icon'
import { MapView, cssVar, type MapMarker } from '../components/MapView'
import { EventRow, eventTitle } from '../components/EventRow'
import { Sheet } from '../components/Sheet'

export function WalkDetailScreen({ id, back }: { id: string; back: () => void }) {
  const data = useLiveQuery(async () => {
    const [walk, points, events] = await Promise.all([
      db.walks.get(id),
      db.points.where('walkId').equals(id).sortBy('t'),
      db.events.where('walkId').equals(id).sortBy('at'),
    ])
    return { walk, points, events }
  }, [id])
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [km, setKm] = useState('')

  if (!data) return <div className="screen" />
  const { walk, points, events } = data
  if (!walk) {
    return (
      <div className="screen">
        <header className="top-bar with-back">
          <button className="icon-btn" aria-label="Back" onClick={back}><Icon name="back" /></button>
          <h1 className="title-l">Walk not found</h1>
        </header>
      </div>
    )
  }

  const colors = { reaction: cssVar('--md-error'), pee: cssVar('--md-tertiary'), poo: cssVar('--md-secondary') }
  const markers: MapMarker[] = events
    .filter((e) => e.lat !== undefined && e.lng !== undefined)
    .map((e) => ({
      lat: e.lat!,
      lng: e.lng!,
      color: colors[e.type],
      radius: e.type === 'reaction' ? 6 + e.intensity * 1.5 : 7,
      label: `${fmtTime(e.at)} · ${eventTitle(e)}`,
    }))
  const reactions = events.filter((e) => e.type === 'reaction')
  const duration = (walk.endedAt ?? Date.now()) - walk.startedAt

  const saveDistance = async () => {
    const m = parseFloat(km) * 1000
    if (!Number.isFinite(m) || m < 0) return
    await db.walks.update(id, { manualDistanceM: m })
    setEditing(false)
  }

  return (
    <div className="screen">
      <header className="top-bar with-back">
        <button className="icon-btn" aria-label="Back" onClick={back}><Icon name="back" /></button>
        <h1 className="title-l">{fmtDay(walk.startedAt)}, {fmtTime(walk.startedAt)}</h1>
        <button className="icon-btn" aria-label="Delete walk" onClick={() => setConfirmDelete(true)}><Icon name="delete" /></button>
      </header>

      <MapView tall track={points.map((p) => [p.lat, p.lng])} markers={markers} />

      <div className="stats" style={{ marginTop: 12 }}>
        <button className="stat" style={{ border: 0, textAlign: 'left' }} onClick={() => { setKm((walkDistance(walk) / 1000).toFixed(2)); setEditing(true) }}>
          <div className="value num">{fmtKm(walkDistance(walk))}</div>
          <div className="body-s muted row" style={{ gap: 4 }}>
            {walk.manualDistanceM !== undefined ? 'edited' : 'distance'} <Icon name="edit" size={12} />
          </div>
        </button>
        <div className="stat"><div className="value">{fmtMinutes(duration)}</div><div className="body-s muted">duration</div></div>
        <div className="stat"><div className="value">{reactions.length}</div><div className="body-s muted">reactions</div></div>
      </div>

      <div className="section">
        <h2 className="title-m">Log</h2>
        {events.length ? (
          <div className="list" style={{ marginTop: 8 }}>
            {events.map((e) => <EventRow key={e.id} e={e} onDelete={() => db.events.delete(e.id)} />)}
          </div>
        ) : (
          <p className="body-m muted">Nothing logged on this walk.</p>
        )}
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit distance">
        <p className="body-m muted">
          GPS measured {fmtKm(walk.gpsDistanceM)}. If the screen turned off mid-walk, the real distance may be longer.
        </p>
        <div className="field">
          <input className="text-field" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} aria-label="Distance in km" />
          <span className="body-s muted">Kilometres</span>
        </div>
        <div className="actions">
          {walk.manualDistanceM !== undefined && (
            <button className="btn text" onClick={async () => { await db.walks.update(id, { manualDistanceM: undefined }); setEditing(false) }}>
              Use GPS
            </button>
          )}
          <span className="spacer" />
          <button className="btn text" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn filled" onClick={saveDistance}>Save</button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this walk?">
        <p className="body-m muted">The route and everything logged on it will be removed. This can't be undone.</p>
        <div className="actions">
          <button className="btn text" onClick={() => setConfirmDelete(false)}>Cancel</button>
          <button className="btn filled" style={{ background: 'var(--md-error)', color: 'var(--md-on-error)' }} onClick={async () => { await deleteWalk(id); back() }}>
            Delete
          </button>
        </div>
      </Sheet>
    </div>
  )
}
