import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const Ctx = createContext<(text: string) => void>(() => {})

/** Small status message above the tab bar, like the mockup's toasts. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((t: string) => {
    setText(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setText(null), 3000)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[200] flex justify-center px-4 lg:bottom-6">
        {text && (
          <div role="status" className="max-w-md rounded-xl bg-ink px-4 py-3 text-[14px] font-semibold text-surface shadow-lg">
            {text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
