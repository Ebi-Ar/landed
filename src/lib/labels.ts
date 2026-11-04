/** Label codes: LD- plus 6 characters. */
export const CODE_RE = /^LD-[A-Z0-9]{6}$/

export function normalizeCode(input: string) {
  let s = input.trim().toUpperCase().replace(/\s+/g, '')
  // A scanned QR is a full URL: https://<domain>/l/LD-XXXXXX
  const m = /\/L\/(LD-[A-Z0-9]{6})/.exec(s)
  if (m) s = m[1]
  if (/^LD[A-Z0-9]{6}$/.test(s)) s = 'LD-' + s.slice(2)
  return s
}

export function publicBase() {
  const env = import.meta.env.VITE_PUBLIC_URL as string | undefined
  return (env || window.location.origin).replace(/\/$/, '')
}

/** What a QR label points to: the public label page, nothing else. */
export const labelUrl = (code: string) => `${publicBase()}/l/${code}`

/** A random id kept on this phone, so the server can tell scans from different phones apart. */
export function deviceId() {
  const key = 'landed.device'
  try {
    const have = localStorage.getItem(key)
    if (have) return have
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    return 'session-' + Math.random().toString(36).slice(2)
  }
}
