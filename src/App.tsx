import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isDemo, setDemoMode } from './db'
import { seedDemo } from './demo'
import { Icon, type IconName } from './components/Icon'
import { WalkScreen } from './screens/WalkScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { WalkDetailScreen } from './screens/WalkDetailScreen'
import { InsightsScreen } from './screens/InsightsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export type Toast = (msg: string, action?: { label: string; run: () => void }) => void

const TABS: { hash: string; label: string; icon: IconName }[] = [
  { hash: '#/', label: 'Walk', icon: 'walk' },
  { hash: '#/history', label: 'History', icon: 'history' },
  { hash: '#/insights', label: 'Insights', icon: 'insights' },
  { hash: '#/settings', label: 'Settings', icon: 'tune' },
]

function useHash() {
  const [hash, setHash] = useState(() => location.hash || '#/')
  useEffect(() => {
    const on = () => setHash(location.hash || '#/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const hash = useHash()
  const [snack, setSnack] = useState<{ msg: string; action?: { label: string; run: () => void } } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [ready, setReady] = useState(!isDemo)
  const dogName = useLiveQuery(async () => ((await db.settings.get('dogName'))?.value as string) ?? 'Donna', [], 'Donna')

  useEffect(() => {
    if (isDemo) seedDemo().then(() => setReady(true))
  }, [])

  const toast: Toast = useCallback((msg, action) => {
    window.clearTimeout(timer.current)
    setSnack({ msg, action })
    timer.current = window.setTimeout(() => setSnack(null), 4000)
  }, [])

  const navigate = (h: string) => {
    location.hash = h
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [hash])

  const walkMatch = hash.match(/^#\/walk\/(.+)$/)
  const tab = walkMatch ? '#/history' : TABS.find((t) => t.hash === hash)?.hash ?? '#/'

  let screen
  if (!ready) screen = <div className="screen empty body-m muted">Loading sample walks…</div>
  else if (walkMatch) screen = <WalkDetailScreen id={walkMatch[1]} back={() => (history.length > 1 ? history.back() : navigate('#/history'))} />
  else if (tab === '#/history') screen = <HistoryScreen navigate={navigate} />
  else if (tab === '#/insights') screen = <InsightsScreen />
  else if (tab === '#/settings') screen = <SettingsScreen dogName={dogName} toast={toast} />
  else screen = <WalkScreen dogName={dogName} toast={toast} navigate={navigate} />

  return (
    <div className="app">
      {isDemo && (
        <div className="demo-banner body-m">
          <Icon name="science" size={18} />
          <span>Demo mode: sample data</span>
          <button className="btn text" style={{ color: 'inherit', height: 32 }} onClick={() => setDemoMode(false)}>Exit</button>
        </div>
      )}
      {screen}
      <nav className="nav-bar">
        <div className="inner">
          {TABS.map((t) => (
            <button key={t.hash} className="nav-item" aria-current={tab === t.hash ? 'page' : undefined} onClick={() => navigate(t.hash)}>
              <span className="pill"><Icon name={t.icon} /></span>
              <span className="label-m">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {snack && (
        <div className="snackbar body-m" role="status">
          <span>{snack.msg}</span>
          {snack.action && (
            <button onClick={() => { snack.action!.run(); setSnack(null) }}>{snack.action.label}</button>
          )}
        </div>
      )}
    </div>
  )
}
