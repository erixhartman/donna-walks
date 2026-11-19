import { useEffect, useState } from 'react'

export function useNow(intervalMs: number, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
  return now
}

export function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return scrolled
}

export function startOfDay(t = Date.now()) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Monday 00:00 of the week containing t. */
export function startOfWeek(t: number) {
  const d = new Date(startOfDay(t))
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d.getTime()
}
