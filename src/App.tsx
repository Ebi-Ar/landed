import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Loading } from './components/ui'
import { useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'

const Landing = lazy(() => import('./pages/Landing'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const MapPage = lazy(() => import('./pages/MapPage'))
const Fresh = lazy(() => import('./pages/Fresh'))
const Prices = lazy(() => import('./pages/Prices'))
const PriceDetail = lazy(() => import('./pages/PriceDetail'))
const BatchPage = lazy(() => import('./pages/BatchPage'))
const Orders = lazy(() => import('./pages/Orders'))
const Verify = lazy(() => import('./pages/Verify'))
const LabelRoute = lazy(() => import('./label/LabelRoute'))
const Soon = lazy(() => import('./pages/Soon'))
const Account = lazy(() => import('./pages/Account'))
const Today = lazy(() => import('./pages/sell/Today'))
const AddBatch = lazy(() => import('./pages/sell/AddBatch'))
const SellerOrders = lazy(() => import('./pages/sell/SellerOrders'))
const SellerPrices = lazy(() => import('./pages/sell/SellerPrices'))
const Profile = lazy(() => import('./pages/sell/Profile'))
const Join = lazy(() => import('./pages/sell/Join'))
const Admin = lazy(() => import('./pages/admin/Admin'))
const PrintRoll = lazy(() => import('./pages/admin/PrintRoll'))
const NotFound = lazy(() => import('./pages/NotFound'))
const NotConnected = lazy(() => import('./pages/NotConnected'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Signed-in only. Sends people to sign in and back. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, userId } = useAuth()
  const { pathname, search } = useLocation()
  if (!ready) return <Loading />
  if (!userId) return <Navigate to={`/signin?next=${encodeURIComponent(pathname + search)}`} replace />
  return <>{children}</>
}

/** Seller screens. People without a seller account go to onboarding. */
function RequireSeller({ children }: { children: ReactNode }) {
  const { ready, userId, seller, meLoading } = useAuth()
  const { pathname } = useLocation()
  if (!ready || meLoading) return <Loading />
  if (!userId) return <Navigate to={`/signin?next=${encodeURIComponent(pathname)}`} replace />
  if (!seller) return <Navigate to="/sell/join" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { ready, userId, isAdmin, meLoading } = useAuth()
  if (!ready || meLoading) return <Loading />
  if (!userId) return <Navigate to="/signin?next=/admin" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  if (!isConfigured)
    return (
      <Suspense fallback={null}>
        <NotConnected />
      </Suspense>
    )
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="mx-auto max-w-[680px] p-4"><Loading /></div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/l/:code" element={<LabelRoute />} />
          <Route path="/admin/rolls/:rollId/print" element={<RequireAdmin><PrintRoll /></RequireAdmin>} />
          <Route element={<AppShell />}>
            <Route path="/map" element={<MapPage />} />
            <Route path="/fresh" element={<Fresh />} />
            <Route path="/prices" element={<Prices />} />
            <Route path="/prices/:product" element={<PriceDetail />} />
            <Route path="/b/:batchId" element={<BatchPage />} />
            <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/soon/:module" element={<Soon />} />
            <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="/sell" element={<RequireSeller><Today /></RequireSeller>} />
            <Route path="/sell/add" element={<RequireSeller><AddBatch /></RequireSeller>} />
            <Route path="/sell/orders" element={<RequireSeller><SellerOrders /></RequireSeller>} />
            <Route path="/sell/prices" element={<RequireSeller><SellerPrices /></RequireSeller>} />
            <Route path="/sell/prices/:product" element={<RequireSeller><PriceDetail /></RequireSeller>} />
            <Route path="/sell/profile" element={<RequireSeller><Profile /></RequireSeller>} />
            <Route path="/sell/join" element={<RequireAuth><Join /></RequireAuth>} />
            <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="/trace/:tag" element={<Navigate to="/verify" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
