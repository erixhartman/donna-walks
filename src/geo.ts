import type { TrackPoint } from './db'

const R = 6371000

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Points worse than this are ignored (phone GPS indoors or under trees). */
export const MAX_ACCURACY_M = 30
/** Anything faster than a jog is a GPS jump, not Donna. */
const MAX_SPEED_MS = 4
/** Ignore jitter while standing still. */
const MIN_STEP_M = 4

/**
 * Decides whether a new fix should extend the track, and by how much.
 * Returns null if the point should be dropped.
 */
export function stepFrom(last: TrackPoint | undefined, next: Omit<TrackPoint, 'id'>): number | null {
  if (next.acc > MAX_ACCURACY_M) return null
  if (!last) return 0
  const d = haversine(last, next)
  if (d < Math.max(MIN_STEP_M, next.acc / 3)) return null
  const dt = (next.t - last.t) / 1000
  if (dt > 0 && d / dt > MAX_SPEED_MS) return null
  return d
}

export function trackDistance(points: TrackPoint[]) {
  let total = 0
  let last: TrackPoint | undefined
  for (const p of points) {
    const step = stepFrom(last, p)
    if (step === null) continue
    total += step
    last = p
  }
  return total
}
