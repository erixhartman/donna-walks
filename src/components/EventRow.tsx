import type { DogEvent } from '../db'
import { distanceLabel, fmtTime, intensityLabel, stoolLabel, triggerLabel } from '../format'
import { Icon } from './Icon'

export function eventTitle(e: DogEvent) {
  if (e.type === 'reaction') return `${triggerLabel(e.trigger)} · ${intensityLabel(e.intensity)}`
  if (e.type === 'poo') return `Poo · ${stoolLabel(e.score)}`
  return 'Pee'
}

export function eventDetail(e: DogEvent) {
  const parts: string[] = []
  if (e.type === 'reaction') {
    parts.push(distanceLabel(e.triggerDistanceM))
    if (e.tookTreat !== undefined) parts.push(e.tookTreat ? 'took a treat' : 'refused treat')
  }
  if (e.type === 'poo') {
    parts.push(`Score ${e.score}`)
    if (e.flags.length) parts.push(e.flags.join(', '))
  }
  if (!e.walkId) parts.push('not on a walk')
  if (e.note) parts.push(e.note)
  return parts.join(' · ')
}

export function EventRow({ e, onDelete }: { e: DogEvent; onDelete?: () => void }) {
  const icon = e.type === 'reaction' ? 'warning' : e.type === 'pee' ? 'drop' : 'poo'
  return (
    <div className="list-item">
      <span className={`lead ${e.type}`}><Icon name={icon} size={20} /></span>
      <span className="content">
        <span className="body-l">{eventTitle(e)}</span>
        <span className="body-m muted">{[fmtTime(e.at), eventDetail(e)].filter(Boolean).join(' · ')}</span>
      </span>
      {onDelete && (
        <button className="icon-btn" aria-label="Delete" onClick={onDelete}>
          <Icon name="delete" size={20} />
        </button>
      )}
    </div>
  )
}
