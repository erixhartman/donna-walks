import Dexie, { type EntityTable } from 'dexie'

export type Trigger = 'dog' | 'person' | 'bike' | 'car' | 'scooter' | 'other'

export interface Walk {
  id: string
  startedAt: number
  endedAt?: number
  /** Distance measured from GPS, in metres. */
  gpsDistanceM: number
  /** Set when the user corrects the distance by hand. Wins over GPS. */
  manualDistanceM?: number
  note?: string
}

export interface TrackPoint {
  id?: number
  walkId: string
  t: number
  lat: number
  lng: number
  acc: number
}

interface BaseEvent {
  id: string
  at: number
  walkId?: string
  lat?: number
  lng?: number
  note?: string
}

export interface ReactionEvent extends BaseEvent {
  type: 'reaction'
  trigger: Trigger
  /** Approximate distance to the trigger, in metres (midpoint of the chosen bucket). */
  triggerDistanceM: number
  intensity: 1 | 2 | 3 | 4 | 5
  tookTreat?: boolean
}

export interface PeeEvent extends BaseEvent {
  type: 'pee'
}

export interface PooEvent extends BaseEvent {
  type: 'poo'
  /** 1–7 fecal score; 2–3 is the healthy range. */
  score: number
  flags: string[]
}

export type DogEvent = ReactionEvent | PeeEvent | PooEvent

export interface Setting {
  key: string
  value: unknown
}

export const isDemo = (() => {
  const params = new URLSearchParams(location.search)
  if (params.has('demo')) localStorage.setItem('demo', params.get('demo') === '0' ? '0' : '1')
  return localStorage.getItem('demo') === '1'
})()

export const db = new Dexie(isDemo ? 'donna-walks-demo' : 'donna-walks') as Dexie & {
  walks: EntityTable<Walk, 'id'>
  points: EntityTable<TrackPoint, 'id'>
  events: EntityTable<DogEvent, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  walks: 'id, startedAt, endedAt',
  points: '++id, walkId, t',
  events: 'id, at, walkId, type',
  settings: 'key',
})

export const uid = () => crypto.randomUUID()

export const walkDistance = (w: Walk) => w.manualDistanceM ?? w.gpsDistanceM

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return (row?.value as T) ?? fallback
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

export function setDemoMode(on: boolean) {
  localStorage.setItem('demo', on ? '1' : '0')
  const url = new URL(location.href)
  url.searchParams.delete('demo')
  url.hash = ''
  location.replace(url.toString())
}
