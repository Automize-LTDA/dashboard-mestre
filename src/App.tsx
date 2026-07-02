import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { RouteGuard } from './components/RouteGuard'
import { LoaderCircle } from 'lucide-react'

// Lazy load named exports
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const AcessoNegado = lazy(() => import('./pages/AcessoNegado').then(m => ({ default: m.AcessoNegado })))
const DashboardHome = lazy(() => import('./pages/DashboardHome').then(m => ({ default: m.DashboardHome })))
const Relatorios = lazy(() => import('./pages/Relatorios').then(m => ({ default: m.Relatorios })))
const Usuarios = lazy(() => import('./pages/Usuarios').then(m => ({ default: m.Usuarios })))
const Empresas = lazy(() => import('./pages/Empresas').then(m => ({ default: m.Empresas })))
const Promotores = lazy(() => import('./pages/Promotores').then(m => ({ default: m.Promotores })))
const NotificacoesPage = lazy(() => import('./pages/NotificacoesPage').then(m => ({ default: m.NotificacoesPage })))
const SolicitacaoBrindes = lazy(() => import('./pages/SolicitacaoBrindes').then(m => ({ default: m.SolicitacaoBrindes })))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 antialiased">
    <div className="flex flex-col items-center gap-3">
      <LoaderCircle className="h-10 w-10 animate-spin text-[#E53935]" />
      <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
        Carregando Do Mestre...
      </p>
    </div>
  </div>
)

// Create React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false
    }
  }
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/acesso-negado" element={<AcessoNegado />} />

                {/* Private Routes (Protected by RouteGuard) */}
                <Route path="/" element={
                  <RouteGuard>
                    <DashboardHome />
                  </RouteGuard>
                } />
                
                <Route path="/relatorios" element={
                  <RouteGuard allowedRoles={['admin', 'gestor', 'sup_tecnico']}>
                    <Relatorios />
                  </RouteGuard>
                } />
                
                <Route path="/usuarios" element={
                  <RouteGuard allowedRoles={['admin', 'gestor', 'sup_tecnico']}>
                    <Usuarios />
                  </RouteGuard>
                } />
                
                <Route path="/empresas" element={
                  <RouteGuard allowedRoles={['admin', 'gestor', 'sup_tecnico']}>
                    <Empresas />
                  </RouteGuard>
                } />
                
                <Route path="/promotores" element={
                  <RouteGuard allowedRoles={['admin', 'gestor', 'sup_tecnico']}>
                    <Promotores />
                  </RouteGuard>
                } />
                
                <Route path="/brindes" element={
                  <RouteGuard allowedRoles={['admin', 'gestor', 'sup_tecnico']}>
                    <SolicitacaoBrindes />
                  </RouteGuard>
                } />
                
                <Route path="/notificacoes" element={
                  <RouteGuard allowedRoles={['admin', 'gestor', 'sup_tecnico']}>
                    <NotificacoesPage />
                  </RouteGuard>
                } />

                {/* Redirect any other path to Dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />

              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
export default App
