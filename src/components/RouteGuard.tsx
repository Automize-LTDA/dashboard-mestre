import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoaderCircle } from 'lucide-react'

interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, allowedRoles }) => {
  const { user, loading, isAuthorized, cargo } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-10 w-10 animate-spin text-[#E53935]" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            Carregando Do Mestre...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to login but save where they were going
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAuthorized) {
    // Redirect to access denied page
    return <Navigate to="/acesso-negado" replace />
  }

  if (allowedRoles && cargo && !allowedRoles.includes(cargo)) {
    // Redirect to access denied page if the cargo is not allowed
    return <Navigate to="/acesso-negado" replace />
  }

  return <>{children}</>
}
export default RouteGuard
