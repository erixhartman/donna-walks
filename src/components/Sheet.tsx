import { useEffect, useRef, type ReactNode } from 'react'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    // Let the Android back gesture close the sheet instead of leaving the app.
    history.pushState({ sheet: true }, '')
    const onPop = () => closeRef.current()
    window.addEventListener('popstate', onPop)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('popstate', onPop)
      document.body.style.overflow = ''
      if (history.state?.sheet) history.back()
    }
  }, [open])

  if (!open) return null
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="handle" />
        <h2 className="headline-s" style={{ marginTop: 8 }}>{title}</h2>
        {children}
      </div>
    </>
  )
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}
