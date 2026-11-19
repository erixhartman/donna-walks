import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isDemo, setDemoMode, setSetting } from '../db'
import { exportCsv, exportJson, importJson } from '../backup'
import { useScrolled } from '../hooks'
import { Icon } from '../components/Icon'
import type { Toast } from '../App'

export function SettingsScreen({ dogName, toast }: { dogName: string; toast: Toast }) {
  const scrolled = useScrolled()
  const [name, setName] = useState(dogName)
  const fileRef = useRef<HTMLInputElement>(null)
  const counts = useLiveQuery(async () => ({ walks: await db.walks.count(), events: await db.events.count() }), [])

  const onImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const r = await importJson(f)
      toast(`Imported ${r.walks} walks and ${r.events} entries`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="screen">
      <header className={`top-bar ${scrolled ? 'scrolled' : ''}`}>
        <h1 className="title-l">Settings</h1>
      </header>

      <div className="stack">
        <div>
          <label className="title-s" htmlFor="dog-name" style={{ display: 'block', margin: '0 0 8px 4px' }}>Dog's name</label>
          <input
            id="dog-name"
            className="text-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && setSetting('dogName', name.trim())}
          />
        </div>

        <div className="section">
          <h2 className="title-m" style={{ margin: '0 0 4px 4px' }}>Your data</h2>
          <p className="body-m muted" style={{ margin: '0 4px 12px' }}>
            Everything is stored on this phone only{counts ? ` (${counts.walks} walks, ${counts.events} entries)` : ''}. Export a backup now and then, because clearing Chrome's site data deletes it.
          </p>
          <div className="list">
            <button className="list-item" onClick={exportJson}>
              <span className="lead walk"><Icon name="download" size={20} /></span>
              <span className="content"><span className="body-l">Back up</span><span className="body-m muted">Everything, including routes (JSON)</span></span>
            </button>
            <button className="list-item" onClick={() => fileRef.current?.click()}>
              <span className="lead walk"><Icon name="upload" size={20} /></span>
              <span className="content"><span className="body-l">Restore from backup</span><span className="body-m muted">Merges with what's already here</span></span>
            </button>
            <button className="list-item" onClick={exportCsv}>
              <span className="lead walk"><Icon name="download" size={20} /></span>
              <span className="content"><span className="body-l">Export log for the vet or trainer</span><span className="body-m muted">One row per entry (CSV, opens in Sheets)</span></span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        </div>

        <div className="section">
          <h2 className="title-m" style={{ margin: '0 0 4px 4px' }}>Demo mode</h2>
          <p className="body-m muted" style={{ margin: '0 4px 12px' }}>
            Shows 12 weeks of sample walks in a separate space. Your real data isn't touched. Share a link ending in <code>?demo</code> to open it straight in demo mode.
          </p>
          <button className={`btn ${isDemo ? 'filled' : 'tonal'} icon-lead`} onClick={() => setDemoMode(!isDemo)}>
            <Icon name="science" size={18} /> {isDemo ? 'Leave demo mode' : 'Try demo mode'}
          </button>
        </div>

        <div className="section body-s muted" style={{ padding: '0 4px' }}>
          Distance uses your phone's GPS while the app is open. Map data © OpenStreetMap contributors.
        </div>
      </div>
    </div>
  )
}
