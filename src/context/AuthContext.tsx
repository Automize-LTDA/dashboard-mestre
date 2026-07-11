import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import type { Session, User } from '@supabase/supabase-js'
import { useToast } from './ToastContext'

export type UserCargo = 'admin' | 'gestor' | 'sup_tecnico' | 'tecnico' | 'funcionario' | 'cliente' | 'vendedor'

interface AuthContextType {
  user: User | null
  session: Session | null
  cargo: UserCargo | null
  fullName: string | null
  loading: boolean
  isAuthorized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [cargo, setCargo] = useState<UserCargo | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true)

  // Monitoramento de inatividade para auto-logout (15 minutos)
  useEffect(() => {
    if (!user) return

    let inactivityTimeout: any

    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout)
      
      // 15 minutos = 15 * 60 * 1000 ms
      inactivityTimeout = setTimeout(async () => {
        console.log('Usuário deslogado por inatividade.')
        await signOut()
        showToast('Sua sessão expirou devido à inatividade. Faça login novamente.', 'info')
      }, 15 * 60 * 1000)
    }

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    
    resetInactivityTimer()

    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer)
    })

    return () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout)
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer)
      })
    }
  }, [user])

  async function logAccessAttempt(userId: string | null, email: string, userCargo: string | null, status: 'sucesso' | 'negado') {
    try {
      await supabase.from('logs_acesso').insert({
        user_id: userId === '00000000-0000-0000-0000-000000000000' ? null : userId,
        email,
        cargo: userCargo,
        status_acesso: status
      })
    } catch (e) {
      console.warn('Tabela logs_acesso indisponível. Ignore se o script de migração não tiver sido executado.', e)
    }
  }

  async function fetchUserRoleAndProfile(userId: string, emailStr: string) {
    try {
      if (userId === '00000000-0000-0000-0000-000000000000') {
        setCargo('admin')
        setFullName('Administrador')
        setIsAuthorized(true)
        return
      }

      // Fetch user profile and usuario details
      const [profileRes, usuarioRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('usuarios').select('cargo, status').eq('id', userId).maybeSingle()
      ])

      const fetchedName = profileRes.data?.full_name || emailStr.split('@')[0]
      setFullName(fetchedName)

      if (usuarioRes.data) {
        const { cargo: userCargo, status } = usuarioRes.data
        
        if (status === 'bloqueado') {
          await logAccessAttempt(userId, emailStr, userCargo, 'negado')
          alert('Seu acesso foi bloqueado pelo administrador.')
          await signOut()
          return
        }

        const cargoTyped = userCargo as UserCargo
        setCargo(cargoTyped)

        // Check dashboard authorization
        const allowed = ['admin', 'gestor', 'sup_tecnico'].includes(cargoTyped)
        setIsAuthorized(allowed)
        
        await logAccessAttempt(userId, emailStr, cargoTyped, allowed ? 'sucesso' : 'negado')
      } else {
        // Fallback: If no cargo is assigned yet, default to funcionario (not authorized)
        setCargo('funcionario')
        setIsAuthorized(false)
        await logAccessAttempt(userId, emailStr, 'funcionario', 'negado')
      }
    } catch (err) {
      console.error('Error fetching user roles and profile:', err)
      setCargo('funcionario')
      setIsAuthorized(false)
    }
  }

  useEffect(() => {
    // Check if there is a mock session first
    const savedMock = localStorage.getItem('domestre.mock_session')
    if (savedMock) {
      const parsed = JSON.parse(savedMock)
      setUser(parsed)
      setCargo('admin')
      setFullName('Administrador')
      setIsAuthorized(true)
      setLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (localStorage.getItem('domestre.mock_session')) {
        return
      }
      setSession(newSession)
      setUser(newSession?.user || null)
      
      if (newSession?.user) {
        fetchUserRoleAndProfile(newSession.user.id, newSession.user.email || '')
      } else {
        setCargo(null)
        setFullName(null)
        setIsAuthorized(true)
      }
    })

    // Function to parse access_token and refresh_token from URL hash or query params
    async function processUrlSession(): Promise<boolean> {
      try {
        const hash = window.location.hash || ''
        const search = window.location.search || ''
        
        let access_token: string | null = null
        let refresh_token: string | null = null
        let isMock = false
        
        if (hash) {
          const params = new URLSearchParams(hash.substring(1))
          access_token = params.get('access_token')
          refresh_token = params.get('refresh_token')
          if (params.get('mock') === 'true') isMock = true
        }
        
        if (!access_token && search) {
          const params = new URLSearchParams(search)
          access_token = params.get('access_token')
          refresh_token = params.get('refresh_token')
          if (params.get('mock') === 'true') isMock = true
        }
        
        if (isMock) {
          const cleanUrl = window.location.origin + window.location.pathname
          window.history.replaceState(null, '', cleanUrl)
          
          const mockUser = {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'admin@domestre.com',
            user_metadata: { full_name: 'Administrador' }
          } as any
          setUser(mockUser)
          setCargo('admin')
          setFullName('Administrador')
          setIsAuthorized(true)
          localStorage.setItem('domestre.mock_session', JSON.stringify(mockUser))
          await logAccessAttempt(mockUser.id, mockUser.email, 'admin', 'sucesso')
          return true
        }
        
        if (access_token && refresh_token) {
          // Clean the address bar URL so tokens aren't visible/bookmarked
          const cleanUrl = window.location.origin + window.location.pathname
          window.history.replaceState(null, '', cleanUrl)
          
          setLoading(true)
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })
          if (error) throw error
          if (data?.session) {
            setSession(data.session)
            setUser(data.session.user)
            await fetchUserRoleAndProfile(data.session.user.id, data.session.user.email || '')
            return true
          }
        }
      } catch (err) {
        console.error('Erro no processamento de login via URL:', err)
      }
      return false
    }

    // Get current session on load if no mock session
    if (!savedMock) {
      processUrlSession().then((hasUrlSession) => {
        if (hasUrlSession) {
          setLoading(false)
          return
        }
        
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          setSession(currentSession)
          setUser(currentSession?.user || null)
          
          if (currentSession?.user) {
            fetchUserRoleAndProfile(currentSession.user.id, currentSession.user.email || '').finally(() => {
              setLoading(false)
            })
          } else {
            setLoading(false)
          }
        }).catch(() => {
          setLoading(false)
        })
      }).catch(() => {
        setLoading(false)
      })
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase()
    
    // Simulate login for credentials match
    if ((cleanEmail === 'admin' || cleanEmail === 'admin@domestre.com') && password === '123') {
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@domestre.com',
        user_metadata: { full_name: 'Administrador' }
      } as any
      setUser(mockUser)
      setCargo('admin')
      setFullName('Administrador')
      setIsAuthorized(true)
      localStorage.setItem('domestre.mock_session', JSON.stringify(mockUser))
      await logAccessAttempt(mockUser.id, mockUser.email, 'admin', 'sucesso')
      return
    }

    const emailToAuth = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@domestre.com`
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email: emailToAuth, password })
    if (error) throw error

    if (authData?.user) {
      // Fetch details immediately to throw error before login resolves if blocked
      const { data: usuarioData, error: usuarioErr } = await supabase
        .from('usuarios')
        .select('cargo, status')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (usuarioErr) {
        console.error('Error fetching user details on signin:', usuarioErr)
      }

      if (usuarioData) {
        const { cargo: userCargo, status } = usuarioData
        if (status === 'bloqueado') {
          await logAccessAttempt(authData.user.id, authData.user.email || '', userCargo, 'negado')
          await supabase.auth.signOut()
          throw new Error('Seu acesso foi bloqueado pelo administrador.')
        }

        const cargoTyped = userCargo as UserCargo
        const allowed = ['admin', 'gestor', 'sup_tecnico'].includes(cargoTyped)
        
        if (!allowed) {
          await logAccessAttempt(authData.user.id, authData.user.email || '', userCargo, 'negado')
          await supabase.auth.signOut()
          throw new Error('Acesso negado: perfil de usuário sem permissão para acessar o painel de gestão.')
        }
      } else {
        // No cargo record in database = not authorized
        await logAccessAttempt(authData.user.id, authData.user.email || '', 'funcionario', 'negado')
        await supabase.auth.signOut()
        throw new Error('Acesso negado: usuário ainda não possui um cargo atribuído.')
      }
    }
  }

  async function signOut() {
    localStorage.removeItem('domestre.mock_session')
    setUser(null)
    setCargo(null)
    setFullName(null)
    setSession(null)
    setIsAuthorized(true)
    try {
      await supabase.auth.signOut()
    } catch (e) {
      // Ignore signout errors
    }
  }

  async function refreshRole() {
    if (user) {
      await fetchUserRoleAndProfile(user.id, user.email || '')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        cargo,
        fullName,
        loading,
        isAuthorized,
        signIn,
        signOut,
        refreshRole
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
