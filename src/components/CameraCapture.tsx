import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'

export interface CapturedPhoto {
  blob: Blob
  url: string
  takenAt: string
  lat: number | null
  lng: number | null
}

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    ),
  )
}

/** Re-encode through a canvas: drops all camera metadata (EXIF, GPS) and shrinks the file. */
function toJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const max = 1280
  const scale = Math.min(1, max / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * scale)
  c.height = Math.round(h * scale)
  c.getContext('2d')!.drawImage(source, 0, 0, c.width, c.height)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not save the photo'))), 'image/jpeg', 0.82))
}

/** Dev-only stand-in when there's no camera (laptops in development). Never in production builds. */
async function testPhoto(): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 480
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 640, 480)
  g.addColorStop(0, '#2B7A92')
  g.addColorStop(1, '#0F3E4E')
  x.fillStyle = g
  x.fillRect(0, 0, 640, 480)
  x.fillStyle = '#fff'
  x.font = '600 28px system-ui'
  x.fillText('Test photo (development only)', 40, 250)
  return new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/jpeg', 0.8))
}

/**
 * In-app camera only (no gallery upload), so the time and place are stamped
 * by the app when the photo is taken.
 */
export function CameraCapture({ onCapture }: { onCapture: (p: CapturedPhoto) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'starting' | 'live' | 'error' | 'saving'>('starting')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
        setState('live')
      })
      .catch(() => !cancelled && setState('error'))
    if (!navigator.mediaDevices) setState('error')
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function shoot() {
    const v = video.current
    if (!v || !v.videoWidth) return
    setState('saving')
    const takenAt = new Date().toISOString()
    const [blob, pos] = await Promise.all([toJpeg(v, v.videoWidth, v.videoHeight), getPosition()])
    onCapture({ blob, url: URL.createObjectURL(blob), takenAt, lat: pos?.lat ?? null, lng: pos?.lng ?? null })
  }

  async function useTest() {
    setState('saving')
    const takenAt = new Date().toISOString()
    const [blob, pos] = await Promise.all([testPhoto(), getPosition()])
    onCapture({ blob, url: URL.createObjectURL(blob), takenAt, lat: pos?.lat ?? null, lng: pos?.lng ?? null })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="viewfinder relative aspect-[4/3] w-full">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        {state !== 'live' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-white/85">
            {state === 'error' ? (
              <div className="flex flex-col items-center gap-2">
                <CameraOff className="size-7" />
                The camera isn’t available. Allow camera access for Landed in your browser settings, then try again.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Camera className="size-7 animate-pulse" /> {state === 'saving' ? 'Saving the photo and location…' : 'Starting the camera…'}
              </div>
            )}
          </div>
        )}
      </div>
      <button type="button" className="btn buoy" disabled={state !== 'live'} onClick={shoot}>
        <Camera /> Take photo
      </button>
      {import.meta.env.DEV && state === 'error' && (
        <button type="button" className="btn alt" onClick={useTest}>
          Use a test photo (development only)
        </button>
      )}
      <p className="small m-0">Allow location too: the time and place are checked against your wharf, farm or pickup spot.</p>
    </div>
  )
}
