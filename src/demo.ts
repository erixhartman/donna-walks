import { db, uid, type DogEvent, type TrackPoint, type Trigger, type Walk } from './db'
import { trackDistance } from './geo'
import { DISTANCES } from './format'

// Sample data for demos: ~12 weeks of walks around High Park, Toronto,
// with reactions trending down so the Insights screen has a story to tell.

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HOME = { lat: 43.6505, lng: -79.4608 }
const HOTSPOTS = [
  { lat: 43.6468, lng: -79.4636 }, // off-leash area entrance
  { lat: 43.6532, lng: -79.4652 }, // busy corner by the subway
  { lat: 43.6441, lng: -79.4601 }, // bike path
]

const M_LAT = 1 / 111_320
const mLng = (lat: number) => 1 / (111_320 * Math.cos((lat * Math.PI) / 180))

export async function seedDemo() {
  if ((await db.walks.count()) > 0) return
  const rand = rng(42)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  const walks: Walk[] = []
  const points: Omit<TrackPoint, 'id'>[] = []
  const events: DogEvent[] = []
  const DAYS = 84
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let d = DAYS; d >= 1; d--) {
    const day = today.getTime() - d * 86_400_000
    const progress = 1 - d / DAYS // 0 → 1 over the period
    const slots = rand() < 0.15 ? [7.5] : [7.25 + rand() * 0.75, 17.5 + rand() * 1.5]

    for (const hour of slots) {
      const start = day + hour * 3_600_000
      const walkId = uid()
      // A loop out from home: random ellipse with wobble.
      const rx = 350 + rand() * 450
      const ry = 300 + rand() * 400
      const rot = rand() * Math.PI * 2
      const n = 70 + Math.floor(rand() * 60)
      const stepMs = 20_000 + rand() * 6000
      const track: Omit<TrackPoint, 'id'>[] = []
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2
        const wob = 1 + 0.12 * Math.sin(a * 5 + rot)
        const x = (Math.cos(a) - 1) * rx * wob
        const y = Math.sin(a) * ry * wob
        const ex = x * Math.cos(rot) - y * Math.sin(rot) + (rand() - 0.5) * 6
        const ey = x * Math.sin(rot) + y * Math.cos(rot) + (rand() - 0.5) * 6
        track.push({ walkId, t: start + i * stepMs, lat: HOME.lat + ey * M_LAT, lng: HOME.lng + ex * mLng(HOME.lat), acc: 5 + rand() * 10 })
      }
      const end = track[track.length - 1].t
      walks.push({ id: walkId, startedAt: start, endedAt: end, gpsDistanceM: trackDistance(track as TrackPoint[]) })
      points.push(...track)

      // Reactions: fewer, smaller and at closer range as training progresses.
      const rate = 1.9 - 1.4 * progress + (rand() - 0.5) * 0.4
      const count = Math.max(0, Math.round(rate * (0.6 + rand() * 0.8)))
      for (let r = 0; r < count; r++) {
        const p = pick(track)
        const near = rand() < 0.55 ? pick(HOTSPOTS) : p
        const trigger: Trigger = (() => {
          const x = rand()
          return x < 0.5 ? 'dog' : x < 0.65 ? 'bike' : x < 0.8 ? 'person' : x < 0.9 ? 'scooter' : x < 0.95 ? 'car' : 'other'
        })()
        const intensity = Math.min(5, Math.max(1, Math.round(3.6 - 1.8 * progress + (rand() - 0.5) * 2.2))) as 1 | 2 | 3 | 4 | 5
        const distIdx = Math.min(4, Math.max(0, Math.round(3 - 2 * progress + (rand() - 0.5) * 2)))
        events.push({
          id: uid(),
          type: 'reaction',
          at: p.t,
          walkId,
          lat: near.lat + (rand() - 0.5) * 40 * M_LAT,
          lng: near.lng + (rand() - 0.5) * 40 * mLng(near.lat),
          trigger,
          intensity,
          triggerDistanceM: DISTANCES[distIdx].value,
          tookTreat: intensity <= 2 ? rand() < 0.85 : intensity === 3 ? rand() < 0.4 : rand() < 0.1,
        })
      }

      const pees = 1 + Math.floor(rand() * 3)
      for (let i = 0; i < pees; i++) {
        const p = track[Math.floor(rand() * track.length)]
        events.push({ id: uid(), type: 'pee', at: p.t, walkId, lat: p.lat, lng: p.lng })
      }
      if (hour < 12 || rand() < 0.4) {
        const p = track[Math.floor(track.length * (0.2 + rand() * 0.5))]
        const sick = d === 37 || d === 36
        const flagged = d === 37 && hour < 12
        const score = sick ? 5 + Math.floor(rand() * 2) : rand() < 0.75 ? 2 + Math.floor(rand() * 2) : pick([1, 4])
        events.push({
          id: uid(),
          type: 'poo',
          at: p.t,
          walkId,
          lat: p.lat,
          lng: p.lng,
          score,
          flags: flagged ? ['Mucus', 'Ate something odd'] : [],
          note: flagged ? 'Got into something at the park' : undefined,
        })
      }
    }

    // Backyard pee break most days.
    if (rand() < 0.8) events.push({ id: uid(), type: 'pee', at: day + 21.75 * 3_600_000 })
  }

  await db.transaction('rw', db.walks, db.points, db.events, async () => {
    await db.walks.bulkAdd(walks)
    await db.points.bulkAdd(points as TrackPoint[])
    await db.events.bulkAdd(events)
  })
}
