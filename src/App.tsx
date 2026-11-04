import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ScrollToTop } from './lib/useScrollTop'
import { Skeleton } from './components/ui/Skeleton'
const Landing = lazy(() => import('./pages/Landing'))
const Home = lazy(() => import('./pages/Home'))
const Market = lazy(() => import('./pages/Market'))
const CatchNew = lazy(() => import('./pages/CatchNew'))
const Catches = lazy(() => import('./pages/Catches'))
const Buyer = lazy(() => import('./pages/Buyer'))
const Trace = lazy(() => import('./pages/Trace'))
const Pitch = lazy(() => import('./pages/Pitch'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Sell = lazy(() => import('./pages/locked/Sell'))
const VesselWatch = lazy(() => import('./pages/locked/VesselWatch'))
const Logistics = lazy(() => import('./pages/locked/Logistics'))
const Resilience = lazy(() => import('./pages/locked/Resilience'))

function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pt-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[12px]" />
        ))}
      </div>
      <Skeleton className="mt-5 h-72 rounded-[12px]" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pitch" element={<Pitch />} />
        <Route path="/trace/:tagId" element={<Trace />} />
        <Route path="/trace" element={<Navigate to="/app/buyer" replace />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="market" element={<Market />} />
          <Route path="catch/new" element={<CatchNew />} />
          <Route path="catches" element={<Catches />} />
          <Route path="buyer" element={<Buyer />} />
          <Route path="sell" element={<Sell />} />
          <Route path="vessel-watch" element={<VesselWatch />} />
          <Route path="logistics" element={<Logistics />} />
          <Route path="resilience" element={<Resilience />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<NotFound standalone />} />
      </Routes>
      </Suspense>
    </>
  )
}
