import { Logo } from '@/components/Logo'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LabelPage } from './LabelPage'

/** The QR target page, rendered without the rest of the app. */
export default function LabelStandalone({ code }: { code?: string }) {
  const fromPath = decodeURIComponent(window.location.pathname.replace(/^\/l\//i, '').replace(/\/$/, ''))
  const c = code ?? fromPath
  if (typeof document !== 'undefined') document.title = `${c} · Landed label`
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-[14px] pt-[calc(10px+env(safe-area-inset-top))] pb-[10px]">
        <a href="/" aria-label="Landed home">
          <Logo />
        </a>
        <a href="/verify" className="link text-[13px]!">
          Check another label
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-[14px] pt-[14px] pb-10">
        <ErrorBoundary>
          <LabelPage code={c} />
        </ErrorBoundary>
        <a href="/" className="small text-center underline">
          What is Landed? Local food from New Brunswick fishers and farmers.
        </a>
      </main>
    </div>
  )
}
