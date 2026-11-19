import { useState, type ReactNode } from 'react'

const W = 340
const PAD = { l: 30, r: 8, t: 8, b: 22 }

export interface Point {
  x: number
  /** null = no data for this bucket (drawn as a gap) */
  y: number | null
  xLabel: string
  tip: string
}

function niceTicks(max: number, count = 3) {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(+v.toFixed(6))
  if (ticks[ticks.length - 1] < max) ticks.push(+(ticks[ticks.length - 1] + step).toFixed(6))
  return ticks
}

/** Top-rounded bar anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

function Frame({ ticks, yOf, fmt, xLabels, children, H }: {
  ticks: number[]
  yOf: (v: number) => number
  fmt: (v: number) => string
  xLabels: { x: number; label: string }[]
  children: ReactNode
  H: number
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line className={t === ticks[0] ? 'baseline' : 'grid'} x1={PAD.l} x2={W - PAD.r} y1={yOf(t)} y2={yOf(t)} />
          <text x={PAD.l - 6} y={yOf(t)} dy="0.32em" textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 6} textAnchor="middle">{l.label}</text>
      ))}
      {children}
    </svg>
  )
}

function thinLabels<T>(items: T[], max = 6) {
  const every = Math.max(1, Math.ceil(items.length / max))
  // Anchor on the latest week so the most recent label is always shown.
  return (i: number) => (items.length - 1 - i) % every === 0
}

export function BarChart({ data, fmt = (v) => String(v), H = 150 }: { data: Point[]; fmt?: (v: number) => string; H?: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.y ?? 0), 0)
  const ticks = niceTicks(max || 1)
  const top = ticks[ticks.length - 1]
  const yOf = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / top)
  const slot = (W - PAD.l - PAD.r) / data.length
  const gap = Math.max(2, slot * 0.25)
  const bw = slot - gap
  const show = thinLabels(data)
  const current = sel !== null ? data[sel] : null

  return (
    <div className="chart">
      <Frame
        H={H}
        ticks={ticks}
        yOf={yOf}
        fmt={fmt}
        xLabels={data.map((d, i) => ({ x: PAD.l + slot * i + slot / 2, label: show(i) ? d.xLabel : '' }))}
      >
        {data.map((d, i) => {
          const x = PAD.l + slot * i + gap / 2
          const y = yOf(d.y ?? 0)
          const h = yOf(0) - y
          return (
            <g key={i}>
              {d.y !== null && h > 0 && <path className={`mark ${sel !== null && sel !== i ? 'dim' : ''}`} d={barPath(x, y, bw, h)} />}
              <rect className="hit" x={PAD.l + slot * i} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} onClick={() => setSel(sel === i ? null : i)} />
            </g>
          )
        })}
      </Frame>
      <div className="tooltip body-m">{current ? current.tip : <span className="muted body-s">Tap a bar for details</span>}</div>
    </div>
  )
}

export function LineChart({ data, min, max, fmt = (v) => String(v), H = 150 }: { data: Point[]; min: number; max: number; fmt?: (v: number) => string; H?: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const ticks: number[] = []
  const step = (max - min) / 2
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(4))
  const yOf = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - min) / (max - min))
  const slot = (W - PAD.l - PAD.r) / data.length
  const xOf = (i: number) => PAD.l + slot * i + slot / 2
  const show = thinLabels(data)

  // Break the line where a week has no data.
  const segments: string[] = []
  let cur = ''
  data.forEach((d, i) => {
    if (d.y === null) {
      if (cur) segments.push(cur)
      cur = ''
      return
    }
    cur += `${cur ? 'L' : 'M'}${xOf(i)},${yOf(d.y)}`
  })
  if (cur) segments.push(cur)
  const current = sel !== null ? data[sel] : null

  return (
    <div className="chart">
      <Frame H={H} ticks={ticks} yOf={yOf} fmt={fmt} xLabels={data.map((d, i) => ({ x: xOf(i), label: show(i) ? d.xLabel : '' }))}>
        {segments.map((s, i) => <path key={i} className="line" d={s} />)}
        {data.map((d, i) =>
          d.y === null ? null : (
            <circle key={i} className="mark ring" cx={xOf(i)} cy={yOf(d.y)} r={sel === i ? 5 : data.length > 16 ? 0 : 3} />
          ),
        )}
        {sel !== null && <line className="focus-line" x1={xOf(sel)} x2={xOf(sel)} y1={PAD.t} y2={H - PAD.b} />}
        {data.map((_, i) => (
          <rect key={i} className="hit" x={PAD.l + slot * i} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} onClick={() => setSel(sel === i ? null : i)} />
        ))}
      </Frame>
      <div className="tooltip body-m">{current ? current.tip : <span className="muted body-s">Tap a week for details</span>}</div>
    </div>
  )
}

export interface Dot {
  t: number
  y: number
  tip: string
}

/** Scatter over time with a shaded "good range" band. y axis runs top→bottom (1 at top). */
export function DotTimeline({ dots, from, to, band, yMin, yMax, yLabel, H = 170 }: {
  dots: Dot[]
  from: number
  to: number
  band: [number, number]
  yMin: number
  yMax: number
  yLabel: (v: number) => string
  H?: number
}) {
  const [sel, setSel] = useState<number | null>(null)
  const xOf = (t: number) => PAD.l + (W - PAD.l - PAD.r) * ((t - from) / Math.max(1, to - from))
  const yOf = (v: number) => PAD.t + 4 + (H - PAD.t - PAD.b - 8) * ((v - yMin) / (yMax - yMin))
  const ticks = [yMin, band[0], band[1], yMax].filter((v, i, a) => a.indexOf(v) === i)
  const months: { x: number; label: string }[] = []
  const d = new Date(from)
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  while (d.getTime() < to) {
    months.push({ x: xOf(d.getTime()), label: d.toLocaleDateString('en-CA', { month: 'short' }) })
    d.setMonth(d.getMonth() + 1)
  }
  const current = sel !== null ? dots[sel] : null

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        <rect className="band" x={PAD.l} width={W - PAD.l - PAD.r} y={yOf(band[0]) - 6} height={yOf(band[1]) - yOf(band[0]) + 12} rx={4} />
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={yOf(t)} y2={yOf(t)} />
            <text x={PAD.l - 6} y={yOf(t)} dy="0.32em" textAnchor="end">{yLabel(t)}</text>
          </g>
        ))}
        {months.map((m, i) => <text key={i} x={m.x} y={H - 6} textAnchor="middle">{m.label}</text>)}
        {dots.map((p, i) => (
          <g key={i} onClick={() => setSel(sel === i ? null : i)}>
            <circle className="hit" cx={xOf(p.t)} cy={yOf(p.y)} r={12} />
            <circle className={`mark ring ${sel !== null && sel !== i ? 'dim' : ''}`} cx={xOf(p.t)} cy={yOf(p.y)} r={sel === i ? 6 : 4} />
          </g>
        ))}
      </svg>
      <div className="tooltip body-m">{current ? current.tip : <span className="muted body-s">Tap a dot for details</span>}</div>
    </div>
  )
}

export function HBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div>
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span className="body-m">{r.label}</span>
          <span className="track"><span className="fill" style={{ display: 'block', width: `${(r.value / max) * 100}%` }} /></span>
          <span className="val body-m num">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="table-view">
      <summary>Show as table</summary>
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </details>
  )
}
