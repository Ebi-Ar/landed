import { useEffect, useId, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'

/**
 * Camera QR scanner (html5-qrcode, loaded only when opened). Calls onResult
 * once with the decoded text, then stops the camera.
 */
export function QrScanner({ onResult, hint = 'Point your camera at the label…' }: { onResult: (text: string) => void; hint?: string }) {
  const id = 'qr-' + useId().replace(/[^a-z0-9]/gi, '')
  const [state, setState] = useState<'starting' | 'scanning' | 'error'>('starting')
  const done = useRef(false)
  const cb = useRef(onResult)
  cb.current = onResult

  useEffect(() => {
    let cancelled = false
    let scanner: { stop: () => Promise<void>; isScanning: boolean } | null = null
    ;(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        const s = new Html5Qrcode(id, { verbose: false })
        scanner = s as unknown as typeof scanner
        await s.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            if (done.current) return
            done.current = true
            s.stop()
              .catch(() => {})
              .finally(() => cb.current(text))
          },
          () => {},
        )
        if (cancelled) s.stop().catch(() => {})
        else setState('scanning')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
      if (scanner?.isScanning) scanner.stop().catch(() => {})
    }
  }, [id])

  return (
    <div className="flex flex-col gap-2">
      <div className="viewfinder relative aspect-square w-full">
        <div id={id} className="h-full w-full [&_video]:h-full! [&_video]:w-full! [&_video]:object-cover" />
        {state !== 'scanning' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-white/85">
            {state === 'starting' ? (
              <div className="flex flex-col items-center gap-2">
                <Camera className="size-7 animate-pulse" /> Starting the camera…
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <CameraOff className="size-7" />
                The camera isn’t available here. Allow camera access for Landed, or type the code instead.
              </div>
            )}
          </div>
        )}
        {state === 'scanning' && <div className="scanline pointer-events-none absolute right-[22%] left-[22%] h-0.5 bg-[#6CC797]" />}
      </div>
      <p className="sub text-center">{hint}</p>
    </div>
  )
}
