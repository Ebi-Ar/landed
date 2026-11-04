import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './lib/auth'
import { LocationProvider } from './lib/location'
import { ToastProvider } from './lib/toast'
import { RealtimeBridge } from './lib/realtime'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 10_000 },
  },
})

export default function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <LocationProvider>
            <ToastProvider>
              <RealtimeBridge />
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </ToastProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
