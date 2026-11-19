import { useState } from 'react'
import { Chips, Sheet } from './Sheet'
import { DISTANCES, INTENSITY, STOOL, STOOL_FLAGS, TRIGGERS } from '../format'
import type { ReactionEvent, Trigger } from '../db'
import { logEvent } from '../walk'

export function ReactionSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
  const [trigger, setTrigger] = useState<Trigger>()
  const [distance, setDistance] = useState<number>()
  const [intensity, setIntensity] = useState<number>()
  const [treat, setTreat] = useState<'yes' | 'no'>()
  const [note, setNote] = useState('')

  const reset = () => {
    setTrigger(undefined)
    setDistance(undefined)
    setIntensity(undefined)
    setTreat(undefined)
    setNote('')
  }

  const save = async () => {
    if (!trigger || !distance || !intensity) return
    const id = await logEvent({
      type: 'reaction',
      trigger,
      triggerDistanceM: distance,
      intensity: intensity as ReactionEvent['intensity'],
      tookTreat: treat === undefined ? undefined : treat === 'yes',
      note: note.trim() || undefined,
    })
    reset()
    onSaved(id)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Log a reaction">
      <div className="field">
        <span className="title-s">What set her off?</span>
        <Chips options={TRIGGERS.map((t) => ({ value: t.id, label: t.label }))} value={trigger} onChange={setTrigger} />
      </div>
      <div className="field">
        <span className="title-s">How far away was it?</span>
        <Chips options={DISTANCES} value={distance} onChange={setDistance} />
      </div>
      <div className="field">
        <span className="title-s">How big was it?</span>
        <div className="options">
          {INTENSITY.map((i) => (
            <button key={i.value} type="button" className="option" aria-pressed={intensity === i.value} onClick={() => setIntensity(i.value)}>
              <span className="badge">{i.value}</span>
              <span>
                <span className="label-l" style={{ display: 'block' }}>{i.label}</span>
                <span className="body-s muted">{i.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="title-s">Did she take a treat after? <span className="muted body-s">(optional)</span></span>
        <div className="segmented" style={{ maxWidth: 240 }}>
          <button type="button" aria-pressed={treat === 'yes'} onClick={() => setTreat(treat === 'yes' ? undefined : 'yes')}>Yes</button>
          <button type="button" aria-pressed={treat === 'no'} onClick={() => setTreat(treat === 'no' ? undefined : 'no')}>No</button>
        </div>
      </div>
      <div className="field">
        <textarea className="text-field" rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="actions">
        <button className="btn text" onClick={() => { reset(); onClose() }}>Cancel</button>
        <button className="btn filled" disabled={!trigger || !distance || !intensity} onClick={save}>Save</button>
      </div>
    </Sheet>
  )
}

export function PooSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
  const [score, setScore] = useState<number>()
  const [flags, setFlags] = useState<string[]>([])
  const [note, setNote] = useState('')

  const reset = () => {
    setScore(undefined)
    setFlags([])
    setNote('')
  }

  const save = async () => {
    if (!score) return
    const id = await logEvent({ type: 'poo', score, flags, note: note.trim() || undefined })
    reset()
    onSaved(id)
  }

  const toggle = (f: string) => setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))

  return (
    <Sheet open={open} onClose={onClose} title="Log a poo">
      <div className="field">
        <span className="title-s">Quality</span>
        <div className="options">
          {STOOL.map((s) => (
            <button key={s.value} type="button" className="option" aria-pressed={score === s.value} onClick={() => setScore(s.value)}>
              <span className="badge">{s.value}</span>
              <span>
                <span className="label-l" style={{ display: 'block' }}>{s.label}</span>
                <span className="body-s muted">{s.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="title-s">Anything off? <span className="muted body-s">(optional)</span></span>
        <div className="chips">
          {STOOL_FLAGS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={flags.includes(f)} onClick={() => toggle(f)}>
              {flags.includes(f) && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <textarea className="text-field" rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="actions">
        <button className="btn text" onClick={() => { reset(); onClose() }}>Cancel</button>
        <button className="btn filled" disabled={!score} onClick={save}>Save</button>
      </div>
    </Sheet>
  )
}
