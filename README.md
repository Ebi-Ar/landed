# CatchChain

Real-time price intelligence and verified provenance for Atlantic Canada's seafood supply chain. Hackathon build: everything runs on local sample data, with no backend, auth or payments.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build into dist/
npm run seed         # regenerate prices/catches/listings (deterministic)
```

## Live vs locked

| Live (fully interactive)                         | Locked (polished preview + pilot sign-up)           |
| ------------------------------------------------ | --------------------------------------------------- |
| `/app/market`: Market Pulse                       | `/app/sell`: Sell to buyer                          |
| `/app/catch/new`: Log a catch + QR tag            | `/app/vessel-watch`: Vessel Watch                   |
| `/app/catches`: My catches                        | `/app/logistics`: Logistics                         |
| `/app/buyer`: Buyer view + tag lookup / QR scan   | `/app/resilience`: Supply Resilience                |
| `/trace/:tagId`: public provenance page           |                                                     |
| `/`, `/app`: landing + home dashboard             |                                                     |

## Deploy (Vercel)

1. `vercel` (or import the repo in the Vercel dashboard). The framework preset is Vite; `vercel.json` adds the SPA rewrite so `/trace/*` survives a hard refresh.
2. Set **`VITE_PUBLIC_URL`** to the deployed URL (e.g. `https://catchchain.vercel.app`) and redeploy. QR codes point there, so a phone can open them. Without it, QR codes use the current origin.

## How the QR works across devices

A catch logged on the laptop lives in that browser's localStorage, so the QR link carries the catch itself:
`/trace/CC-25-0413-SHD?d=<base64url JSON>`. The provenance page resolves a tag in order: **URL data → localStorage → seeded `catches.json` → "Tag not found"**.

## Pitch deck

The six-slide pitch is built into the app at **`/pitch`** (e.g. `https://catch-chain.vercel.app/pitch`).
→ / ← or Space to move, **F** for fullscreen, **N** for speaker notes. Slide 4 has a **Launch demo** button (opens the app in a new tab) and a QR for the demo tag. `#3` in the URL opens slide 3.

## Demo script (~2 min)

1. Landing → keep **Demo mode** on → **Launch demo** (resets sample data, opens Market Pulse on lobster).
2. Best offer: Côte Acadienne Co-op, Cap-Pelé at **$8.10/lb** vs usual **$7.25** → **+$340 on 400 lb**.
3. **Log this catch** → Use sample location → **Generate tag** → QR for `CC-25-0413-SHD`.
4. Scan the QR with a phone → green **Verified local catch** provenance page.
5. Click **Vessel Watch** in the sidebar → "in development" banner → vision slide.

Seeded demo tag: `CC-25-0412-SHD` (always available, including at `/trace/CC-25-0412-SHD`).

## Data

`src/data/*.json`. Ports, species, buyers, vessels and fishing areas are hand-written. `scripts/seed.ts` generates 90 days of prices, 15 catches and 8 listings. Dates are re-anchored to "today" at runtime, so the data never goes stale. All figures are illustrative, and all buyer and fisher names are invented.

## Stack

React 18, Vite, TypeScript, Tailwind v4, React Router, Recharts, Leaflet (OpenStreetMap tiles), qrcode.react, html5-qrcode (lazy-loaded), lucide-react, Framer Motion. UI primitives in `src/components/ui` follow shadcn/ui conventions.
