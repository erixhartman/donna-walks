import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid, type DogEvent, type TrackPoint, type Walk } from './db'
import { stepFrom, MAX_ACCURACY_M } from './geo'

export type GpsStatus = 'idle' | 'waiting' | 'ok' | 'weak' | 'denied' | 'unsupported'

interface Fix {
  lat: number
  lng: number
  acc: number
  t: number
}

/** Most recent GPS fix from any source, used to tag logged events with a location. */
let lastFix: Fix | null = null

export async function startWalk() {
  const existing = await getActiveWalk()
  if (existing) return existing.id
  const walk: Walk = { id: uid(), startedAt: Date.now(), gpsDistanceM: 0 }
  await db.walks.add(walk)
  return walk.id
}

export async function endWalk(id: string) {
  await db.walks.update(id, { endedAt: Date.now() })
}

export async function getActiveWalk() {
  return db.walks.filter((w) => w.endedAt === undefined).first()
}

export function useActiveWalk() {
  return useLiveQuery(() => getActiveWalk(), [], null)
}

/**
 * Tracks GPS while a walk is active. Keeps the screen awake, because Chrome on
 * Android suspends location updates when the screen turns off.
 */
export function useWalkTracker(walk: Walk | undefined | null) {
  const [status, setStatus] = useState<GpsStatus>('idle')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [wakeLock, setWakeLock] = useState<'on' | 'off' | 'unsupported'>('off')
  const lastPoint = useRef<TrackPoint | undefined>(undefined)
  const walkId = walk?.id

  // GPS
  useEffect(() => {
    if (!walkId) {
      setStatus('idle')
      return
    }
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      return
    }
    let cancelled = false
    setStatus('waiting')

    // Resume from the last stored point if the app was reloaded mid-walk.
    db.points.where('walkId').equals(walkId).last().then((p) => {
      if (!cancelled) lastPoint.current = p
    })

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, t: pos.timestamp }
        lastFix = fix
        setAccuracy(fix.acc)
        setStatus(fix.acc <= MAX_ACCURACY_M ? 'ok' : 'weak')
        const point = { walkId, ...fix }
        const step = stepFrom(lastPoint.current, point)
        if (step === null) return
        const id = await db.points.add(point)
        lastPoint.current = { ...point, id }
        if (step > 0) {
          await db.walks.where('id').equals(walkId).modify((w) => {
            w.gpsDistanceM += step
          })
        }
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'weak'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [walkId])

  // Screen wake lock
  useEffect(() => {
    if (!walkId) return
    if (!('wakeLock' in navigator)) {
      setWakeLock('unsupported')
      return
    }
    let sentinel: WakeLockSentinel | null = null
    let released = false
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        setWakeLock('on')
        sentinel.addEventListener('release', () => setWakeLock('off'))
      } catch {
        setWakeLock('off')
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      sentinel?.release()
    }
  }, [walkId])

  return { status, accuracy, wakeLock }
}

type NewEvent = DogEvent extends infer E ? (E extends DogEvent ? Omit<E, 'id' | 'at' | 'walkId' | 'lat' | 'lng'> : never) : never

/** Saves an event right away, then attaches a location when one is available. */
export async function logEvent(e: NewEvent) {
  const active = await getActiveWalk()
  const id = uid()
  const fresh = lastFix && Date.now() - lastFix.t < 60_000 ? lastFix : null
  await db.events.add({
    ...e,
    id,
    at: Date.now(),
    walkId: active?.id,
    lat: fresh?.lat,
    lng: fresh?.lng,
  } as DogEvent)
  if (!fresh && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastFix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, t: pos.timestamp }
        db.events.update(id, { lat: lastFix.lat, lng: lastFix.lng })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120_000 },
    )
  }
  return id
}

export async function deleteWalk(id: string) {
  await db.transaction('rw', db.walks, db.points, db.events, async () => {
    await db.points.where('walkId').equals(id).delete()
    await db.events.where('walkId').equals(id).delete()
    await db.walks.delete(id)
  })
}
