import type { Trigger } from './db'

export const fmtKm = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`)

export const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export const fmtMinutes = (ms: number) => {
  const m = Math.round(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
}

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })

export const fmtDay = (t: number) => {
  const d = new Date(t)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

export const fmtAgo = (t: number, now = Date.now()) => {
  const m = Math.round((now - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ${m % 60 ? `${m % 60} min ` : ''}ago`
  const d = Math.floor(h / 24)
  return `${d} day${d > 1 ? 's' : ''} ago`
}

export const TRIGGERS: { id: Trigger; label: string }[] = [
  { id: 'dog', label: 'Dog' },
  { id: 'person', label: 'Person' },
  { id: 'bike', label: 'Bike' },
  { id: 'car', label: 'Car' },
  { id: 'scooter', label: 'Scooter / board' },
  { id: 'other', label: 'Other' },
]

export const triggerLabel = (t: Trigger) => TRIGGERS.find((x) => x.id === t)?.label ?? t

export const DISTANCES = [
  { value: 1, label: 'Under 2 m' },
  { value: 3.5, label: '2–5 m' },
  { value: 7.5, label: '5–10 m' },
  { value: 15, label: '10–20 m' },
  { value: 25, label: '20 m+' },
]

export const distanceLabel = (m: number) => DISTANCES.find((d) => d.value === m)?.label ?? `${m} m`

export const INTENSITY = [
  { value: 1, label: 'Noticed', hint: 'Stiff, staring, ears up' },
  { value: 2, label: 'Pulling', hint: 'Whining or pulling toward it' },
  { value: 3, label: 'Barking', hint: 'Barked but could still redirect' },
  { value: 4, label: 'Lunging', hint: 'Lunging and barking' },
  { value: 5, label: 'Over threshold', hint: "Couldn't get her attention back" },
] as const

export const intensityLabel = (n: number) => INTENSITY.find((i) => i.value === n)?.label ?? String(n)

export const STOOL = [
  { value: 1, label: 'Hard pellets', hint: 'Dry, crumbly, takes effort' },
  { value: 2, label: 'Ideal', hint: 'Firm, segmented, easy pickup' },
  { value: 3, label: 'Good', hint: 'Log shaped, moist, leaves a little' },
  { value: 4, label: 'Soft', hint: 'Soggy, loses shape when picked up' },
  { value: 5, label: 'Very soft', hint: 'Piles, no real shape' },
  { value: 6, label: 'Mushy', hint: 'Texture but no shape' },
  { value: 7, label: 'Watery', hint: 'Liquid, no texture' },
]

export const stoolLabel = (n: number) => STOOL.find((s) => s.value === n)?.label ?? String(n)

export const STOOL_FLAGS = ['Mucus', 'Blood', 'Straining', 'Ate something odd']
