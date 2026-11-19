import { db, walkDistance, type DogEvent, type TrackPoint, type Walk } from './db'
import { distanceLabel, intensityLabel, stoolLabel, triggerLabel } from './format'

interface Backup {
  app: 'donna-walks'
  version: 1
  exportedAt: string
  walks: Walk[]
  points: TrackPoint[]
  events: DogEvent[]
}

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export async function exportJson() {
  const [walks, points, events] = await Promise.all([db.walks.toArray(), db.points.toArray(), db.events.toArray()])
  const data: Backup = { app: 'donna-walks', version: 1, exportedAt: new Date().toISOString(), walks, points, events }
  download(`donna-walks-backup-${stamp()}.json`, JSON.stringify(data), 'application/json')
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** One row per logged event, with its walk — easy to hand to a vet or trainer. */
export async function exportCsv() {
  const [walks, events] = await Promise.all([db.walks.toArray(), db.events.orderBy('at').toArray()])
  const walkById = new Map(walks.map((w) => [w.id, w]))
  const header = ['date', 'time', 'type', 'detail', 'trigger_distance', 'intensity', 'took_treat', 'stool_score', 'flags', 'note', 'walk_km', 'lat', 'lng']
  const rows = events.map((e) => {
    const d = new Date(e.at)
    const w = e.walkId ? walkById.get(e.walkId) : undefined
    return [
      d.toLocaleDateString('en-CA'),
      d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }),
      e.type,
      e.type === 'reaction' ? triggerLabel(e.trigger) : e.type === 'poo' ? stoolLabel(e.score) : '',
      e.type === 'reaction' ? distanceLabel(e.triggerDistanceM) : '',
      e.type === 'reaction' ? `${e.intensity} ${intensityLabel(e.intensity)}` : '',
      e.type === 'reaction' && e.tookTreat !== undefined ? (e.tookTreat ? 'yes' : 'no') : '',
      e.type === 'poo' ? e.score : '',
      e.type === 'poo' ? e.flags.join('; ') : '',
      e.note,
      w ? (walkDistance(w) / 1000).toFixed(2) : '',
      e.lat?.toFixed(5),
      e.lng?.toFixed(5),
    ].map(csvCell).join(',')
  })
  download(`donna-walks-log-${stamp()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv')
}

export async function importJson(file: File) {
  const data = JSON.parse(await file.text()) as Backup
  if (data.app !== 'donna-walks' || !Array.isArray(data.walks)) throw new Error("That file isn't a Donna Walks backup.")
  await db.transaction('rw', db.walks, db.points, db.events, async () => {
    await db.walks.bulkPut(data.walks)
    // Replace the routes of imported walks. Points have auto-increment ids, so drop them to avoid collisions.
    await db.points.where('walkId').anyOf(data.walks.map((w) => w.id)).delete()
    await db.points.bulkAdd(data.points.map((p) => ({ walkId: p.walkId, t: p.t, lat: p.lat, lng: p.lng, acc: p.acc })))
    await db.events.bulkPut(data.events)
  })
  return { walks: data.walks.length, events: data.events.length }
}
