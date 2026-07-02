import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { detectSchemaFeatures } from '../utils/schemaDetect'
import { 
  Bell, 
  Check, 
  Trash2, 
  LoaderCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X
} from 'lucide-react'

interface NotificationItem {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'sucesso' | 'alerta' | 'erro'
  lida: boolean
  created_at: string
}

export const NotificacoesPage: React.FC = () => {
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasTable, setHasTable] = useState(false)
  const [filter, setFilter] = useState<'todos' | 'lidas' | 'nao-lidas'>('todos')

  async function loadNotifications() {
    setLoading(true)
    try {
      const schema = await detectSchemaFeatures()
      setHasTable(schema.hasNotificacoes)

      if (schema.hasNotificacoes) {
        const { data, error } = await supabase
          .from('notificacoes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setNotifications(data || [])
      } else {
        // Mock fallback
        setNotifications([
          {
            id: '1',
            titulo: 'Bem-vindo ao Dashboard de Gestão',
            mensagem: 'O painel administrativo e executivo Do Mestre foi inicializado.',
            tipo: 'sucesso',
            lida: true,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            titulo: 'Aviso de Migração de Banco',
            mensagem: 'Vimos que a estrutura do banco não está atualizada. Execute a migração SQL nas configurações.',
            tipo: 'alerta',
            lida: false,
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ])
      }
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao carregar notificações: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  async function handleMarkAsRead(id: string) {
    try {
      if (hasTable) {
        const { error } = await supabase
          .from('notificacoes')
          .update({ lida: true })
          .eq('id', id)
        if (error) throw error
      }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
      showToast('Notificação marcada como lida', 'success')
    } catch (e: any) {
      showToast('Erro ao marcar: ' + e.message, 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      if (hasTable) {
        const { error } = await supabase
          .from('notificacoes')
          .delete()
          .eq('id', id)
        if (error) throw error
      }
      setNotifications(prev => prev.filter(n => n.id !== id))
      showToast('Notificação excluída com sucesso', 'success')
    } catch (e: any) {
      showToast('Erro ao excluir: ' + e.message, 'error')
    }
  }

  async function handleMarkAllAsRead() {
    try {
      if (hasTable) {
        const { error } = await supabase
          .from('notificacoes')
          .update({ lida: true })
          .eq('lida', false)
        if (error) throw error
      }
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
      showToast('Todas as notificações marcadas como lidas', 'success')
    } catch (e: any) {
      showToast('Erro ao atualizar: ' + e.message, 'error')
    }
  }

  // Filter logic
  const filtered = notifications.filter(n => {
    if (filter === 'lidas') return n.lida
    if (filter === 'nao-lidas') return !n.lida
    return true
  })

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#E53935]">
              Alertas do Sistema
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#233A7A] flex items-center gap-2">
              <Bell className="text-[#233A7A]" /> Central de Notificações
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitore logs operacionais, cadastros de novos técnicos e avisos gerenciais da Do Mestre.
            </p>
          </div>
          {notifications.some(n => !n.lida) && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-2 h-11 rounded-xl bg-[#233A7A] hover:bg-[#1E2E5C] px-5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Check size={15} /> Marcar todas como lidas
            </button>
          )}
        </header>

        {/* ========================================================
            FILTER PILLS
            ======================================================== */}
        <div className="flex gap-2 text-xs no-print">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'nao-lidas', label: 'Não Lidas' },
            { id: 'lidas', label: 'Lidas' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id as any)}
              className={`px-4 py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                filter === p.id 
                  ? 'bg-[#233A7A] text-white border-transparent' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ========================================================
            ALERTS LIST
            ======================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] max-w-4xl">
          {loading ? (
            <div className="flex items-center justify-center p-16 text-xs font-semibold text-slate-400">
              <LoaderCircle className="animate-spin mr-2 text-[#E53935]" size={18} /> Carregando central...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 space-y-2">
              <Bell size={24} className="mx-auto text-slate-300" />
              <p className="font-bold">Nenhum alerta nesta categoria.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {filtered.map(item => {
                let Icon = Info
                let iconColor = 'text-blue-500 bg-blue-50'
                if (item.tipo === 'sucesso') { Icon = CheckCircle2; iconColor = 'text-emerald-500 bg-emerald-50' }
                if (item.tipo === 'alerta') { Icon = AlertTriangle; iconColor = 'text-amber-500 bg-amber-50' }
                if (item.tipo === 'erro') { Icon = X; iconColor = 'text-rose-500 bg-rose-50' }

                return (
                  <div key={item.id} className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-slate-50/50 ${!item.lida ? 'bg-slate-50/20' : ''}`}>
                    <div className="flex items-start gap-3.5">
                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl shrink-0 ${iconColor}`}>
                        <Icon size={16} />
                      </div>
                      
                      {/* Text */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-slate-800 ${!item.lida ? 'text-[#233A7A]' : ''}`}>
                            {item.titulo}
                          </p>
                          {!item.lida && (
                            <span className="text-[9px] font-extrabold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">Novo</span>
                          )}
                        </div>
                        <p className="text-slate-500 leading-relaxed max-w-2xl">{item.mensagem}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          {new Date(item.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="inline-flex gap-1.5 shrink-0 no-print">
                      {!item.lida && (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
                          title="Marcar como lida"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-[#E53935] hover:bg-rose-50 hover:border-rose-100 cursor-pointer"
                        title="Excluir Alerta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </Layout>
  )
}
export default NotificacoesPage
