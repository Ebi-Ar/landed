import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Bottom sheet on phones, centred dialog on laptops. Closes on Escape, the
 * backdrop, or the Close button. Focus moves into the sheet when it opens.
 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => ref.current?.focus(), 30)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      window.clearTimeout(t)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-[rgba(10,23,28,0.55)] lg:items-center lg:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="flex max-h-[86dvh] w-full max-w-[560px] flex-col gap-3 overflow-y-auto rounded-t-[22px] bg-surface px-4 pt-[18px] pb-[calc(18px+env(safe-area-inset-bottom))] outline-none lg:rounded-[22px]"
      >
        <div className="grab lg:hidden" />
        {children}
        <button className="btn alt" onClick={onClose}>
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
