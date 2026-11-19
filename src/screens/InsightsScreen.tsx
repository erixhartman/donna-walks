import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, walkDistance, type PooEvent, type ReactionEvent } from '../db'
import { fmtDay, fmtTime, intensityLabel, stoolLabel, triggerLabel, TRIGGERS, distanceLabel } from '../format'
import { startOfWeek, useScrolled } from '../hooks'
import { BarChart, DotTimeline, HBars, LineChart, TableView, type Point } from '../components/Charts'
import { MapView, cssVar } from '../components/MapView'

const WEEK = 7 * 24 * 3600 * 1000
type Range = 4 | 12 | 0

const weekLabel = (t: number) => new Date(t).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

function pctChange(now: number, prev: number) {
  if (!prev) return null
  return Math.round(((now - prev) / prev) * 100)
}

export function InsightsScreen() {
  const scrolled = useScrolled()
  const [range, setRange] = useState<Range>(12)
  const all = useLiveQuery(async () => {
    const [walks, events] = await Promise.all([db.walks.toArray(), db.events.toArray()])
    return { walks: walks.filter((w) => w.endedAt !== undefined), events }
  }, [])

  if (!all) return <div className="screen" />

  const now = Date.now()
  const firstData = Math.min(...all.walks.map((w) => w.startedAt), ...all.events.map((e) => e.at), now)
  const thisWeek = startOfWeek(now)
  const firstWeek = range ? thisWeek - (range - 1) * WEEK : startOfWeek(firstData)
  const weeks: number[] = []
  for (let t = firstWeek; t <= thisWeek; t += WEEK) weeks.push(t)
  const from = firstWeek
  const span = now - from

  const inRange = (t: number, a = from, b = now) => t >= a && t < b
  const walks = all.walks.filter((w) => inRange(w.startedAt))
  const reactions = all.events.filter((e): e is ReactionEvent => e.type === 'reaction' && inRange(e.at))
  const poos = all.events.filter((e): e is PooEvent => e.type === 'poo' && inRange(e.at))

  const km = walks.reduce((s, w) => s + walkDistance(w), 0) / 1000
  const rpk = km ? reactions.length / km : 0
  const avgIntensity = reactions.length ? reactions.reduce((s, r) => s + r.intensity, 0) / reactions.length : 0

  // Same-length period immediately before, for comparison.
  const prevWalks = all.walks.filter((w) => inRange(w.startedAt, from - span, from))
  const prevKm = prevWalks.reduce((s, w) => s + walkDistance(w), 0) / 1000
  const prevReactions = all.events.filter((e) => e.type === 'reaction' && inRange(e.at, from - span, from)).length
  const prevRpk = prevKm ? prevReactions / prevKm : 0
  const rpkDelta = range ? pctChange(rpk, prevRpk) : null

  const weekly = weeks.map((start) => {
    const end = start + WEEK
    const wk = walks.filter((w) => inRange(w.startedAt, start, end))
    const wkKm = wk.reduce((s, w) => s + walkDistance(w), 0) / 1000
    const wr = reactions.filter((r) => inRange(r.at, start, end))
    return {
      start,
      km: wkKm,
      walks: wk.length,
      reactions: wr.length,
      rpk: wkKm ? wr.length / wkKm : null,
      intensity: wr.length ? wr.reduce((s, r) => s + r.intensity, 0) / wr.length : null,
    }
  })

  const rpkData: Point[] = weekly.map((w) => ({
    x: w.start,
    y: w.rpk,
    xLabel: weekLabel(w.start),
    tip: w.rpk === null
      ? `Week of ${weekLabel(w.start)}: no walks logged`
      : `Week of ${weekLabel(w.start)}: ${w.reactions} reactions over ${w.km.toFixed(1)} km (${w.rpk.toFixed(2)}/km)`,
  }))
  const intensityData: Point[] = weekly.map((w) => ({
    x: w.start,
    y: w.intensity,
    xLabel: weekLabel(w.start),
    tip: w.intensity === null
      ? `Week of ${weekLabel(w.start)}: no reactions`
      : `Week of ${weekLabel(w.start)}: average ${w.intensity.toFixed(1)} (${intensityLabel(Math.round(w.intensity))}) across ${w.reactions} reactions`,
  }))

  const triggerRows = TRIGGERS.map((t) => ({ label: t.label, value: reactions.filter((r) => r.trigger === t.id).length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)

  const errorColor = cssVar('--md-error')
  const hotspots = reactions
    .filter((r) => r.lat !== undefined)
    .map((r) => ({
      lat: r.lat!,
      lng: r.lng!,
      color: errorColor,
      radius: 4 + r.intensity * 1.6,
      label: `${fmtDay(r.at)} ${fmtTime(r.at)} · ${triggerLabel(r.trigger)} · ${intensityLabel(r.intensity)}`,
    }))

  const goodPoos = poos.filter((p) => p.score >= 2 && p.score <= 3).length
  const flagged = poos.filter((p) => p.flags.length)

  const empty = !walks.length && !reactions.length && !poos.length

  return (
    <div className="screen">
      <header className={`top-bar ${scrolled ? 'scrolled' : ''}`}>
        <h1 className="title-l">Insights</h1>
      </header>

      <div className="segmented">
        {([4, 12, 0] as Range[]).map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
            {r ? `${r} weeks` : 'All time'}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="empty">
          <p className="title-m">Nothing to show yet</p>
          <p className="body-m muted">Log a few walks and the trends will appear here.</p>
        </div>
      ) : (
        <>
          <div className="stats two" style={{ marginTop: 16 }}>
            <div className="stat">
              <div className="value num">{rpk.toFixed(2)}</div>
              <div className="body-s muted">reactions per km</div>
              {rpkDelta !== null && (
                <div className="body-s" style={{ marginTop: 4 }}>
                  {rpkDelta <= 0 ? '↓' : '↑'} {Math.abs(rpkDelta)}% vs previous {range} wks
                </div>
              )}
            </div>
            <div className="stat">
              <div className="value num">{avgIntensity ? avgIntensity.toFixed(1) : '–'}<small>/ 5</small></div>
              <div className="body-s muted">average intensity</div>
            </div>
            <div className="stat">
              <div className="value num">{walks.length}</div>
              <div className="body-s muted">walks · {km.toFixed(1)} km</div>
            </div>
            <div className="stat">
              <div className="value num">{poos.length ? `${Math.round((goodPoos / poos.length) * 100)}%` : '–'}</div>
              <div className="body-s muted">poos in the healthy range</div>
            </div>
          </div>

          <div className="section chart-card">
            <h3 className="title-m">Reactions per km</h3>
            <p className="sub body-s muted">Weekly. Lower is better, and it accounts for longer walks.</p>
            <BarChart data={rpkData} fmt={(v) => v.toFixed(v < 1 && v > 0 ? 1 : 0)} />
            <TableView
              head={['Week of', 'Walks', 'km', 'Reactions', 'Per km']}
              rows={weekly.map((w) => [weekLabel(w.start), w.walks, w.km.toFixed(1), w.reactions, w.rpk === null ? '–' : w.rpk.toFixed(2)])}
            />
          </div>

          <div className="section chart-card">
            <h3 className="title-m">How big the reactions are</h3>
            <p className="sub body-s muted">Weekly average, from 1 (noticed) to 5 (over threshold).</p>
            <LineChart data={intensityData} min={1} max={5} fmt={(v) => String(v)} />
          </div>

          <div className="section chart-card">
            <h3 className="title-m">Hotspots</h3>
            <p className="sub body-s muted">Where reactions happened. Bigger circles were bigger reactions.</p>
            {hotspots.length ? <MapView tall markers={hotspots} /> : <p className="body-m muted">No reactions with a location yet.</p>}
          </div>

          {!!triggerRows.length && (
            <div className="section chart-card">
              <h3 className="title-m">Triggers</h3>
              <p className="sub body-s muted">Number of reactions by what set her off.</p>
              <HBars rows={triggerRows} />
              <TableView
                head={['Trigger', 'Reactions', 'Typical distance']}
                rows={TRIGGERS.map((t) => {
                  const rs = reactions.filter((r) => r.trigger === t.id)
                  if (!rs.length) return null
                  const median = [...rs].sort((a, b) => a.triggerDistanceM - b.triggerDistanceM)[Math.floor(rs.length / 2)]
                  return [t.label, rs.length, distanceLabel(median.triggerDistanceM)]
                }).filter((r): r is (string | number)[] => r !== null)}
              />
            </div>
          )}

          <div className="section chart-card">
            <h3 className="title-m">Poo quality</h3>
            <p className="sub body-s muted">Each dot is one poo. The shaded band (2–3) is the healthy range.</p>
            {poos.length ? (
              <DotTimeline
                dots={poos.map((p) => ({
                  t: p.at,
                  y: p.score,
                  tip: `${fmtDay(p.at)} ${fmtTime(p.at)} · ${p.score} (${stoolLabel(p.score)})${p.flags.length ? ` · ${p.flags.join(', ')}` : ''}`,
                }))}
                from={from}
                to={now}
                band={[2, 3]}
                yMin={1}
                yMax={7}
                yLabel={(v) => (v === 1 ? '1 hard' : v === 7 ? '7 watery' : String(v))}
              />
            ) : (
              <p className="body-m muted">No poos logged in this period.</p>
            )}
            {!!flagged.length && (
              <div className="callout body-m" style={{ marginTop: 8 }}>
                {flagged.length} flagged: {flagged.slice(-3).map((p) => `${fmtDay(p.at)} (${p.flags.join(', ')})`).join('; ')}
                {flagged.length > 3 ? '…' : ''}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
