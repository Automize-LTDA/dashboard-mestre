import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../supabaseClient'
import { detectSchemaFeatures } from '../utils/schemaDetect'
import { 
  Home, 
  FileText, 
  Users, 
  Building2, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Clock, 
  ShieldCheck,
  TrendingUp,
  Gift,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Check
} from 'lucide-react'
import logoUrl from '../assets/logo.png'

interface LayoutProps {
  children: React.ReactNode
}





interface DbNotification {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'sucesso' | 'alerta' | 'erro'
  lida: boolean
  created_at: string
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, cargo, fullName, signOut } = useAuth()
  
  const filteredNavItems = React.useMemo(() => {
    if (cargo === 'vendedor') {
      return [
        { path: '/brindes', label: 'Brindes', icon: Gift }
      ]
    }
    return [
      { path: '/', label: 'Dashboard', icon: Home },
      { path: '/relatorios', label: 'Relatórios', icon: FileText },
      { path: '/promotores', label: 'Promotores', icon: TrendingUp },
      { path: '/brindes', label: 'Brindes', icon: Gift },
      { path: '/usuarios', label: 'Usuários', icon: Users },
      { path: '/empresas', label: 'Empresas', icon: Building2 },
      { path: '/notificacoes', label: 'Notificações', icon: Bell }
    ]
  }, [cargo])
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [hasNotifTable, setHasNotifTable] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<DbNotification | null>(null)

  // Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const schema = await detectSchemaFeatures()
        setHasNotifTable(schema.hasNotificacoes)

        if (schema.hasNotificacoes) {
          const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
          
          if (!error && data) {
            setNotifications(data as DbNotification[])
          }
        } else {
          // Mock initial notifications if table doesn't exist
          setNotifications([
            {
              id: '1',
              titulo: 'Bem-vindo ao Dashboard',
              mensagem: 'O painel executivo da Do Mestre está ativo e operacional.',
              tipo: 'sucesso',
              lida: false,
              created_at: new Date().toISOString()
            },
            {
              id: '2',
              titulo: 'Estrutura pendente',
              mensagem: 'Execute a migração SQL para habilitar colunas adicionais de CNPJ e contatos.',
              tipo: 'alerta',
              lida: false,
              created_at: new Date(Date.now() - 3600000).toISOString()
            }
          ])
        }
      } catch (e) {
        console.error('Falha ao carregar notificações', e)
      }
    }

    loadNotifications()
    // Poll notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleMarkAllAsRead() {
    try {
      if (hasNotifTable) {
        await supabase
          .from('notificacoes')
          .update({ lida: true })
          .eq('lida', false)
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
      showToast('Todas as notificações foram marcadas como lidas', 'success')
    } catch (e) {
      console.error(e)
    }
  }

  async function handleClearAll() {
    try {
      if (hasNotifTable) {
        await supabase.from('notificacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
      setNotifications([])
      showToast('Todas as notificações foram removidas', 'success')
    } catch (e) {
      console.error(e)
    }
  }

  async function handleViewDetail(notif: DbNotification) {
    setSelectedNotif(notif)
    setNotifDropdownOpen(false)
    // Auto-mark as read when opened
    if (!notif.lida) {
      try {
        if (hasNotifTable) {
          await supabase.from('notificacoes').update({ lida: true }).eq('id', notif.id)
        }
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n))
      } catch (e) { console.error(e) }
    }
  }

  async function handleLogout() {
    await signOut()
    showToast('Sessão encerrada com sucesso', 'info')
    navigate('/login')
  }

  // Format date: "Segunda, 11 Jun 2026"
  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  // Format time: "14:17:48"
  const formattedTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  const unreadCount = notifications.filter(n => !n.lida).length

  // Avatar initials
  const initials = fullName 
    ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'DM'

  // Cargo label translation
  const getCargoLabel = (c: string | null) => {
    switch (c) {
      case 'admin': return 'Administrador'
      case 'gestor': return 'Gestor Geral'
      case 'sup_tecnico': return 'Sup. Técnico'
      case 'vendedor': return 'Vendedor'
      default: return 'Gestor'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 antialiased font-sans overflow-x-hidden w-full max-w-full">
      
      {/* ========================================================
          SIDEBAR (Desktop)
          ======================================================== */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1E2E5C] text-white shrink-0 shadow-[var(--shadow-elegant)] fixed top-0 left-0 bottom-0 z-20 border-r border-slate-700/30">
        
        {/* Sidebar Header: Logo */}
        <div className="h-20 flex items-center justify-center px-6 border-b border-slate-700/40 bg-[#172449]">
          <img src={logoUrl} alt="Logo Do Mestre" className="h-10 w-auto object-contain" />
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map(item => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#E53935] to-[#ef5350] text-white shadow-lg shadow-red-600/20 translate-x-1.5 pl-5'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06] hover:translate-x-1.5'
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-md" />
                )}
                
                <Icon 
                  size={16} 
                  className={`transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`} 
                />
                <span>{item.label}</span>
                {item.label === 'Notificações' && unreadCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer: Sair */}
        <div className="p-4 border-t border-slate-700/40 bg-[#172449] flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold text-rose-200 hover:text-white hover:bg-rose-600/20 transition-all cursor-pointer"
          >
            <LogOut size={16} className="text-rose-300" />
            <span>Sair do Sistema</span>
          </button>
          <div className="text-[9px] text-center text-slate-500 font-mono tracking-wider pt-1">
            Versão v1.01
          </div>
        </div>
      </aside>

      {/* ========================================================
          MAIN WORKSPACE CONTAINER
          ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64">
        
        {/* ========================================================
            TOP BAR
            ======================================================== */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-[var(--shadow-soft)] no-print">
          
          {/* Left: Mobile Menu Button & Time */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#233A7A] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>

            {/* Time Clock (Desktop Only) */}
            <div className="hidden sm:flex items-center gap-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-3.5 py-1.75 rounded-xl">
              <Clock size={14} className="text-[#E53935]" />
              <span className="capitalize">{formattedDate}</span>
              <span className="text-slate-300 font-light">|</span>
              <span className="font-mono text-slate-700 font-bold">{formattedTime}</span>
            </div>
          </div>

          {/* Right: Notification bell + Profile avatar */}
          <div className="flex items-center gap-4">
            
            {/* Notifications Dropdown trigger */}
            {cargo !== 'vendedor' && (
              <div className="relative">
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className={`p-2.5 rounded-xl border transition-all relative cursor-pointer ${
                    notifDropdownOpen 
                      ? 'border-[#233A7A] bg-[#233A7A]/5 text-[#233A7A]' 
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#E53935] text-white text-[9px] font-extrabold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {notifDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-84 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in-up" style={{ width: '22rem' }}>

                      {/* Header */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Bell size={14} className="text-[#E53935]" />
                          Notificações
                          {unreadCount > 0 && (
                            <span className="ml-1 bg-[#E53935] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              title="Marcar todas como lidas"
                              className="h-7 px-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Check size={11} /> Lidas
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleClearAll}
                              title="Limpar todas as notificações"
                              className="h-7 px-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={11} /> Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* List */}
                      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center text-xs text-slate-400 space-y-2">
                            <Bell size={20} className="mx-auto text-slate-200" />
                            <p className="font-semibold">Nenhuma notificação.</p>
                          </div>
                        ) : (
                          notifications.map(n => {
                            const isUnread = !n.lida
                            let dotColor = 'bg-blue-400'
                            if (n.tipo === 'sucesso') dotColor = 'bg-emerald-500'
                            if (n.tipo === 'alerta') dotColor = 'bg-amber-500'
                            if (n.tipo === 'erro') dotColor = 'bg-rose-500'

                            return (
                              <button
                                key={n.id}
                                onClick={() => handleViewDetail(n)}
                                className={`w-full text-left p-3.5 text-xs transition-colors hover:bg-blue-50/60 flex gap-2.5 cursor-pointer ${
                                  isUnread ? 'bg-blue-50/30' : ''
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0 mt-1.5`} />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <p className={`font-bold truncate ${isUnread ? 'text-[#233A7A]' : 'text-slate-700'}`}>
                                    {n.titulo}
                                  </p>
                                  <p className="text-slate-500 leading-normal line-clamp-2">{n.mensagem}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold pt-0.5">
                                    {new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {isUnread && <span className="h-2 w-2 rounded-full bg-[#E53935] shrink-0 mt-1.5 animate-pulse" />}
                              </button>
                            )
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <Link
                        to="/notificacoes"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="block p-3 text-center text-[10px] font-bold text-[#233A7A] hover:bg-slate-50 border-t border-slate-100"
                      >
                        Ver central completa de alertas →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Profile Avatar / Dropdown */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="text-right leading-tight hidden sm:block">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                  <ShieldCheck size={13} className="text-[#E53935]" />
                  {fullName}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold pt-0.5">
                  {getCargoLabel(cargo)}
                </div>
              </div>

              {/* Colored Avatar */}
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#233A7A] to-[#1E2E5C] text-white flex items-center justify-center font-bold text-xs shadow-inner">
                {initials}
              </div>
            </div>

          </div>
        </header>

        {/* ========================================================
            PAGE CONTENT VIEW
            ======================================================== */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ========================================================
          MOBILE MENU OVERLAY
          ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          
          {/* Drawer menu */}
          <div className="relative flex flex-col w-72 max-w-xs bg-[#1E2E5C] text-white h-full shadow-2xl z-20 animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700/40 bg-[#172449]">
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-700 text-white cursor-pointer"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {filteredNavItems.map(item => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#E53935] to-[#ef5350] text-white shadow-lg translate-x-1.5 pl-5'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06] hover:translate-x-1.5'
                    }`}
                  >
                    {/* Active Indicator Line */}
                    {isActive && (
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-md" />
                    )}
                    
                    <Icon 
                      size={16} 
                      className={`transition-transform duration-300 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`} 
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* User Profile Info Footer */}
            <div className="p-4 border-t border-slate-700/40 bg-[#172449] space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold text-rose-200 hover:text-white hover:bg-rose-600/20 transition-all cursor-pointer"
              >
                <LogOut size={16} />
                <span>Sair do Sistema</span>
              </button>
              <div className="text-[9px] text-center text-slate-500 font-mono tracking-wider pt-1">
                Versão v1.01
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          NOTIFICATION DETAIL MODAL
          ======================================================== */}
      {selectedNotif && (() => {
        let Icon = Info
        let iconBg = 'bg-blue-50'
        let iconColor = 'text-blue-500'
        let badgeBg = 'bg-blue-100 text-blue-700'
        let badgeLabel = 'Informação'
        let borderTop = 'border-blue-400'

        if (selectedNotif.tipo === 'sucesso') {
          Icon = CheckCircle2; iconBg = 'bg-emerald-50'; iconColor = 'text-emerald-500'
          badgeBg = 'bg-emerald-100 text-emerald-700'; badgeLabel = 'Sucesso'; borderTop = 'border-emerald-400'
        }
        if (selectedNotif.tipo === 'alerta') {
          Icon = AlertTriangle; iconBg = 'bg-amber-50'; iconColor = 'text-amber-500'
          badgeBg = 'bg-amber-100 text-amber-700'; badgeLabel = 'Alerta'; borderTop = 'border-amber-400'
        }
        if (selectedNotif.tipo === 'erro') {
          Icon = XCircle; iconBg = 'bg-rose-50'; iconColor = 'text-rose-500'
          badgeBg = 'bg-rose-100 text-rose-700'; badgeLabel = 'Erro'; borderTop = 'border-rose-500'
        }

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setSelectedNotif(null)}
            />

            {/* Modal Card */}
            <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md border-t-4 ${borderTop} animate-fade-in-up`}>
              {/* Close button */}
              <button
                onClick={() => setSelectedNotif(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="p-6 pb-4 flex items-start gap-4">
                <div className={`p-3 rounded-xl ${iconBg} shrink-0`}>
                  <Icon size={22} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                    {!selectedNotif.lida && (
                      <span className="text-[9px] font-extrabold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                        Não lida
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 leading-snug">
                    {selectedNotif.titulo}
                  </h3>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 pb-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedNotif.mensagem}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-semibold">
                  {new Date(selectedNotif.created_at).toLocaleString('pt-BR', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="h-8 px-4 rounded-xl bg-[#233A7A] text-white text-xs font-bold hover:bg-[#1E2E5C] transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
export default Layout
