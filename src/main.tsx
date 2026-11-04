import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)

// The public label page (/l/LD-XXXXXX, the QR target) must open fast on a phone
// with weak signal, so it loads on its own: no router, map, charts or database
// client. Everything else loads the full app.
if (/^\/l\/[^/]+\/?$/i.test(window.location.pathname)) {
  import('./label/LabelStandalone').then(({ default: LabelStandalone }) =>
    root.render(
      <StrictMode>
        <LabelStandalone />
      </StrictMode>,
    ),
  )
} else {
  import('./AppRoot').then(({ default: AppRoot }) =>
    root.render(
      <StrictMode>
        <AppRoot />
      </StrictMode>,
    ),
  )
}
