import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { RouteGuard } from './components/RouteGuard'

// Pages
import { Login } from './pages/Login'
import { AcessoNegado } from './pages/AcessoNegado'
import { DashboardHome } from './pages/DashboardHome'
import { Relatorios } from './pages/Relatorios'
import { Usuarios } from './pages/Usuarios'
import { Empresas } from './pages/Empresas'
import { Promotores } from './pages/Promotores'
import { NotificacoesPage } from './pages/NotificacoesPage'
import { SolicitacaoBrindes } from './pages/SolicitacaoBrindes'


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
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
export default App
