import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, walkDistance } from '../db'
import { endWalk, logEvent, startWalk, useActiveWalk, useWalkTracker, type GpsStatus } from '../walk'
import { fmtAgo, fmtDuration, fmtKm } from '../format'
import { startOfDay, useNow, useScrolled } from '../hooks'
import { Icon } from '../components/Icon'
import { MapView } from '../components/MapView'
import { ReactionSheet, PooSheet } from '../components/LogSheets'
import { EventRow } from '../components/EventRow'
import type { Toast } from '../App'

const gpsText: Record<GpsStatus, string> = {
  idle: '',
  waiting: 'Finding GPS…',
  ok: 'GPS good',
  weak: 'Weak GPS signal',
  denied: 'Location blocked: allow it in Chrome settings',
  unsupported: 'No GPS on this device',
}

export function WalkScreen({ dogName, toast, navigate }: { dogName: string; toast: Toast; navigate: (h: string) => void }) {
  const walk = useActiveWalk()
  const { status, accuracy, wakeLock } = useWalkTracker(walk)
  const now = useNow(1000, !!walk)
  const scrolled = useScrolled()
  const [sheet, setSheet] = useState<'reaction' | 'poo' | null>(null)

  const track = useLiveQuery(
    async () => (walk ? (await db.points.where('walkId').equals(walk.id).sortBy('t')).map((p) => [p.lat, p.lng] as [number, number]) : []),
    [walk?.id, walk?.gpsDistanceM],
    [],
  )

  const today = useLiveQuery(async () => {
    const from = startOfDay()
    const [events, walks, lastPee, lastPoo] = await Promise.all([
      db.events.where('at').aboveOrEqual(from).reverse().sortBy('at'),
      db.walks.where('startedAt').aboveOrEqual(from).toArray(),
      db.events.where('type').equals('pee').reverse().sortBy('at').then((a) => a[0]),
      db.events.where('type').equals('poo').reverse().sortBy('at').then((a) => a[0]),
    ])
    return { events, walks, lastPee, lastPoo }
  }, [])

  const undoable = (id: string, msg: string) => toast(msg, { label: 'Undo', run: () => db.events.delete(id) })

  const pee = async () => {
    navigator.vibrate?.(30)
    undoable(await logEvent({ type: 'pee' }), 'Pee logged')
  }

  const finish = async () => {
    if (!walk) return
    await endWalk(walk.id)
    navigate(`#/walk/${walk.id}`)
  }

  const todayKm = today?.walks.reduce((s, w) => s + walkDistance(w), 0) ?? 0
  const todayReactions = today?.events.filter((e) => e.type === 'reaction').length ?? 0

  return (
    <div className="screen">
      <header className={`top-bar ${scrolled ? 'scrolled' : ''}`}>
        <h1 className="title-l">{dogName}</h1>
      </header>

      {walk ? (
        <div className="live">
          <div className="row">
            <span className="label-l">On a walk</span>
            <span className="spacer" />
            <span className="gps body-s">
              <span className={`dot ${status === 'ok' ? 'ok' : ''}`} />
              {gpsText[status]}
              {status === 'weak' && accuracy ? ` (±${Math.round(accuracy)} m)` : ''}
            </span>
          </div>
          <div className="numbers">
            <span className="display-m">{fmtDuration(now - walk.startedAt)}</span>
            <span className="title-l num">{fmtKm(walkDistance(walk))}</span>
          </div>
          <MapView track={track} follow />
          <div className="row" style={{ marginTop: 12 }}>
            <span className="body-s" style={{ flex: 1, opacity: 0.85 }}>
              {wakeLock === 'on' ? 'Screen stays on so GPS keeps tracking' : 'Keep the screen on for accurate distance'}
            </span>
            <button className="btn end icon-lead" onClick={finish}>
              <Icon name="stop" size={18} /> End walk
            </button>
          </div>
        </div>
      ) : (
        <button className="start-fab" onClick={() => { navigator.vibrate?.(20); startWalk() }}>
          <Icon name="walk" size={32} /> Start walk
        </button>
      )}

      <div className="section">
        <div className="log-grid">
          <button className="log-btn reaction" onClick={() => setSheet('reaction')}>
            <Icon name="warning" size={28} />
            <span>
              <span className="title-l" style={{ display: 'block' }}>Reaction</span>
              <span className="body-m">Trigger, distance, intensity</span>
            </span>
          </button>
          <button className="log-btn pee" onClick={pee}>
            <Icon name="drop" size={28} />
            <span>
              <span className="title-l" style={{ display: 'block' }}>Pee</span>
              <span className="body-s">{today?.lastPee ? fmtAgo(today.lastPee.at) : 'One tap'}</span>
            </span>
          </button>
          <button className="log-btn poo" onClick={() => setSheet('poo')}>
            <Icon name="poo" size={28} />
            <span>
              <span className="title-l" style={{ display: 'block' }}>Poo</span>
              <span className="body-s">{today?.lastPoo ? fmtAgo(today.lastPoo.at) : 'Log quality'}</span>
            </span>
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="title-m">Today</h2>
        <div className="stats" style={{ marginTop: 8 }}>
          <div className="stat"><div className="value">{today?.walks.length ?? 0}</div><div className="body-s muted">walks</div></div>
          <div className="stat"><div className="value">{(todayKm / 1000).toFixed(1)}<small>km</small></div><div className="body-s muted">walked</div></div>
          <div className="stat"><div className="value">{todayReactions}</div><div className="body-s muted">reactions</div></div>
        </div>
        {!!today?.events.length && (
          <div className="list" style={{ marginTop: 12 }}>
            {today.events.map((e) => (
              <EventRow key={e.id} e={e} onDelete={() => db.events.delete(e.id)} />
            ))}
          </div>
        )}
      </div>

      <ReactionSheet
        open={sheet === 'reaction'}
        onClose={() => setSheet(null)}
        onSaved={(id) => { setSheet(null); undoable(id, 'Reaction logged') }}
      />
      <PooSheet
        open={sheet === 'poo'}
        onClose={() => setSheet(null)}
        onSaved={(id) => { setSheet(null); undoable(id, 'Poo logged') }}
      />
    </div>
  )
}
