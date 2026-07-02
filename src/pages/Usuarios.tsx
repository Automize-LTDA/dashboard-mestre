import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { detectSchemaFeatures } from '../utils/schemaDetect'
import { 
  UserPlus, 
  Users, 
  Plus, 
  Trash2, 
  LoaderCircle,
  Pencil,
  Lock,
  Ban,
  Unlock,
  AlertCircle,
  X,
  Info
} from 'lucide-react'

interface CombinedUser {
  id: string
  full_name: string | null
  email: string | null
  cargo: string
  status: 'ativo' | 'bloqueado'
  telefone?: string | null
  empresa?: string | null
  role: 'admin' | 'member' | 'promotor' | 'vendedor'
  avariasCount: number
  visitasCount: number
  created_at: string
}

const formatTelefone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export const Usuarios: React.FC = () => {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [usersList, setUsersList] = useState<CombinedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasPhoneCompanyCol, setHasPhoneCompanyCol] = useState(false)

  // Form states
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newCargo, setNewCargo] = useState('funcionario')
  const [newTelefone, setNewTelefone] = useState('')
  const [newRole, setNewRole] = useState<'member' | 'promotor' | 'admin' | 'vendedor'>('member')

  // Edit / Action states
  const [editingUser, setEditingUser] = useState<CombinedUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editCargo, setEditCargo] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [editRole, setEditRole] = useState<'member' | 'promotor' | 'admin' | 'vendedor'>('member')
  const [actionLoading, setActionLoading] = useState(false)
  const [deletingUser, setDeletingUser] = useState<CombinedUser | null>(null)
  const [resettingUser, setResettingUser] = useState<CombinedUser | null>(null)
  const [newResetPassword, setNewResetPassword] = useState('')

  async function loadUsers() {
    setLoading(true)
    try {
      // 1. Detect dynamic columns
      const schema = await detectSchemaFeatures()
      setHasPhoneCompanyCol(schema.hasCnpj)

      // 2. Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (pErr) throw pErr

      // 3. Fetch usuarios (cargos/status)
      let query = supabase.from('usuarios').select('*')
      const { data: usuarios, error: uErr } = await query
      if (uErr) throw uErr

      // 4. Fetch user_roles
      const { data: userRoles, error: rErr } = await supabase
        .from('user_roles')
        .select('*')
      if (rErr) throw rErr

      // 5. Fetch reports to calculate stats per promoter
      const [avariasRes, visitasRes] = await Promise.all([
        supabase.from('relatorios_avarias').select('id, responsavel, created_by'),
        supabase.from('relatorios_visitas').select('id, responsavel, created_by')
      ])

      const avariasList = avariasRes.data || []
      const visitasList = visitasRes.data || []

      const usuarioMap = new Map<string, any>()
      usuarios?.forEach(u => usuarioMap.set(u.id, u))

      const roleMap = new Map<string, string>()
      userRoles?.forEach(r => roleMap.set(r.user_id, r.role))

      // 6. Combine data
      const combined: CombinedUser[] = (profiles || []).map(p => {
        const u = usuarioMap.get(p.id) || {}
        const userRole = (roleMap.get(p.id) || 'member') as 'admin' | 'member' | 'promotor' | 'vendedor'

        // Calculate counts
        const avCount = avariasList.filter(av => 
          av.created_by === p.id || 
          (av.responsavel && p.full_name && av.responsavel.toLowerCase() === p.full_name.toLowerCase())
        ).length

        const visCount = visitasList.filter(vis => 
          vis.created_by === p.id || 
          (vis.responsavel && p.full_name && vis.responsavel.toLowerCase() === p.full_name.toLowerCase())
        ).length

        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          cargo: u.cargo || 'funcionario',
          status: u.status || 'ativo',
          telefone: u.telefone || null,
          empresa: u.empresa || null,
          role: userRole,
          avariasCount: avCount,
          visitasCount: visCount,
          created_at: p.created_at
        }
      })

      setUsersList(combined)
    } catch (err: any) {
      console.error(err)
      showToast('Falha ao carregar usuários: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Create User
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newUsername.trim() || newPassword.length < 8) {
      showToast('Por favor, preencha todos os campos corretamente. Senha mínima de 8 caracteres.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const cleanUsername = newUsername.trim()
      const emailToAuth = cleanUsername.includes('@') 
        ? cleanUsername 
        : `${cleanUsername}@domestre.com`

      // 1. Call secure RPC in Supabase auth.users (pass newRole directly)
      const { data: newUserId, error: createErr } = await supabase.rpc('admin_create_user', {
        _new_email: emailToAuth,
        _new_password: newPassword,
        _new_full_name: newName.trim(),
        _new_role: newRole
      })

      if (createErr) throw createErr
      if (!newUserId) throw new Error('Não foi possível registrar as credenciais de login.')

      // 2. Update the public.usuarios table with cargo, status and phone/company if applicable
      const updateData: any = {
        cargo: newCargo,
        status: 'ativo'
      }
      if (hasPhoneCompanyCol) {
        updateData.telefone = newTelefone.trim() || null
      }

      const { error: updateErr } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', newUserId)

      if (updateErr) throw updateErr

      // 3. Set role in user_roles table (delete first to prevent duplicates)
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', newUserId)

      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: newRole })

      if (roleErr) throw roleErr

      showToast('Novo usuário cadastrado com sucesso!', 'success')
      setNewName('')
      setNewUsername('')
      setNewPassword('')
      setNewCargo('funcionario')
      setNewTelefone('')
      setNewRole('member')
      await loadUsers()
    } catch (err: any) {
      console.error(err)
      let msg = err.message
      if (msg.includes('user_roles_role_check')) {
        msg = 'Erro no Banco: A constraint de cargos precisa ser atualizada. Cole e execute a Seção 0 do arquivo migration_brindes.sql no editor SQL do Supabase.'
      }
      showToast('Erro ao criar usuário: ' + msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Update User
  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    if (!editName.trim() || !editUsername.trim()) {
      showToast('Preencha os campos obrigatórios.', 'error')
      return
    }

    setActionLoading(true)
    try {
      const cleanUsername = editUsername.trim()
      const targetEmail = cleanUsername.includes('@') 
        ? cleanUsername 
        : `${cleanUsername}@domestre.com`

      const emailChanged = targetEmail !== editingUser.email

      // 1. Update Auth credentials if changed
      if (emailChanged) {
        const { error: rpcErr } = await supabase.rpc('admin_update_user_credentials', {
          _user_id: editingUser.id,
          _new_email: targetEmail,
          _new_password: null
        })
        if (rpcErr) throw rpcErr
      }

      // 2. Update profiles
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ full_name: editName.trim(), email: targetEmail })
        .eq('id', editingUser.id)
      if (profileErr) throw profileErr

      // 3. Update public.usuarios
      const updateData: any = { cargo: editCargo }
      if (hasPhoneCompanyCol) {
        updateData.telefone = editTelefone.trim() || null
      }
      const { error: uErr } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', editingUser.id)
      if (uErr) throw uErr

      // 4. Update user_roles table (delete first to prevent duplicates)
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.id)

      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: editingUser.id, role: editRole })

      if (roleErr) throw roleErr

      showToast('Usuário atualizado com sucesso!', 'success')
      setEditingUser(null)
      await loadUsers()
    } catch (err: any) {
      console.error(err)
      let msg = err.message
      if (msg.includes('user_roles_role_check')) {
        msg = 'Erro no Banco: A constraint de cargos precisa ser atualizada. Cole e execute a Seção 0 do arquivo migration_brindes.sql no editor SQL do Supabase.'
      }
      showToast('Erro ao salvar edições: ' + msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Toggle user block status
  async function handleToggleBlock(target: CombinedUser) {
    if (target.id === currentUser?.id) {
      showToast('Você não pode bloquear a sua própria conta de gestor.', 'warning')
      return
    }

    const nextStatus = target.status === 'ativo' ? 'bloqueado' : 'ativo'
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ status: nextStatus })
        .eq('id', target.id)

      if (error) throw error
      showToast(`Usuário ${nextStatus === 'bloqueado' ? 'bloqueado' : 'desbloqueado'} com sucesso!`, 'success')
      await loadUsers()
    } catch (e: any) {
      console.error(e)
      showToast('Falha ao alterar status de bloqueio: ' + e.message, 'error')
    }
  }

  // Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resettingUser || newResetPassword.length < 8) {
      showToast('Senha mínima de 8 caracteres.', 'error')
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('admin_update_user_credentials', {
        _user_id: resettingUser.id,
        _new_email: null,
        _new_password: newResetPassword
      })

      if (error) throw error
      showToast(`Senha de ${resettingUser.full_name} redefinida com sucesso!`, 'success')
      setResettingUser(null)
      setNewResetPassword('')
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao redefinir senha: ' + e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete User
  async function handleDeleteUser(target: CombinedUser) {
    if (target.id === currentUser?.id) {
      showToast('Você não pode excluir a si mesmo.', 'warning')
      return
    }

    setActionLoading(true)
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_user', {
        _user_id: target.id
      })
      if (rpcErr) throw rpcErr

      showToast(`Usuário ${target.full_name || 'excluído'} removido com sucesso!`, 'success')
      setDeletingUser(null)
      await loadUsers()
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao excluir usuário: ' + e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const startEdit = (target: CombinedUser) => {
    setEditingUser(target)
    setEditName(target.full_name || '')
    const userLogin = target.email?.endsWith('@domestre.com') 
      ? target.email.split('@')[0] 
      : target.email || ''
    setEditUsername(userLogin)
    setEditCargo(target.cargo)
    setEditTelefone(target.telefone || '')
    setEditRole(target.role)
  }

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <header className="no-print">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#E53935]">
            Administração
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#233A7A] flex items-center gap-2">
            <Users className="text-[#233A7A]" /> Gestão de Usuários
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre novos perfis operacionais, defina promotores do app de relatórios, redefina senhas e controle bloqueios administrativos.
          </p>
        </header>

        {/* ========================================================
            FORM: ADD NEW USER
            ======================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[var(--shadow-soft)] space-y-4 no-print">
          <h2 className="text-xs font-bold text-[#233A7A] flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-100 pb-3">
            <UserPlus size={16} className="text-[#E53935]" /> Adicionar Novo Usuário
          </h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
            <label className="block">
              <span className="block mb-1.5">Nome Completo *</span>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="input font-medium text-slate-700"
                required
              />
            </label>

            <label className="block">
              <span className="block mb-1.5">Login / Usuário *</span>
              <input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Ex: joao.silva"
                className="input font-medium text-slate-700"
                required
              />
            </label>

            <label className="block">
              <span className="block mb-1.5">Senha de Acesso (Mín. 8) *</span>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Defina uma senha padrão"
                className="input font-medium text-slate-700"
                required
              />
            </label>

            <label className="block">
              <span className="block mb-1.5">Função no App (Relatórios) *</span>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as any)}
                className="input cursor-pointer font-medium text-slate-700"
              >
                <option value="member">Membro / Técnico Comum (Sem relatórios em campo)</option>
                <option value="promotor">Promotor (Gera relatórios de visita/avaria)</option>
                <option value="vendedor">Vendedor (Apenas solicitar brindes)</option>
                <option value="admin">Administrador (Acesso total)</option>
              </select>
            </label>

            <label className="block">
              <span className="block mb-1.5">Cargo no Dashboard *</span>
              <select
                value={newCargo}
                onChange={e => setNewCargo(e.target.value)}
                className="input cursor-pointer font-medium text-slate-700"
              >
                <option value="funcionario">Funcionário / Técnico (Sem Acesso Dashboard)</option>
                <option value="tecnico">Técnico de Campo (Sem Acesso Dashboard)</option>
                <option value="cliente">Cliente Externo (Sem Acesso Dashboard)</option>
                <option value="vendedor">Vendedor (Sem Acesso Dashboard)</option>
                <option value="sup_tecnico">Supervisor Técnico (Acesso Liberado)</option>
                <option value="gestor">Gestor Comercial (Acesso Liberado)</option>
                <option value="admin">Administrador (Acesso Liberado)</option>
              </select>
            </label>

            {hasPhoneCompanyCol ? (
              <label className="block">
                <span className="block mb-1.5">Telefone de Contato</span>
                <input
                  value={newTelefone}
                  onChange={e => setNewTelefone(formatTelefone(e.target.value))}
                  maxLength={15}
                  placeholder="Ex: (31) 99999-9999"
                  className="input font-medium text-slate-700"
                />
              </label>
            ) : (
              <div className="md:col-span-2 flex items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] text-slate-400 gap-2">
                <Info size={14} className="text-blue-400 shrink-0" />
                <span>O campo de Telefone está desativado temporariamente. Para ativá-lo, execute a migração SQL nas configurações.</span>
              </div>
            )}

            <div className="md:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundImage: 'var(--gradient-accent)' }}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin" size={15} /> Salvando...
                  </>
                ) : (
                  <>
                    <Plus size={15} /> Cadastrar Usuário
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ========================================================
            TABLE: REGISTERED USERS
            ======================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
          {loading ? (
            <div className="flex items-center justify-center p-16 text-xs font-semibold text-slate-400">
              <LoaderCircle className="animate-spin mr-2 text-[#E53935]" size={18} /> Carregando lista de usuários...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                    <th className="p-4">Nome completo</th>
                    <th className="p-4">Usuário / Login</th>
                    {hasPhoneCompanyCol && <th className="p-4">Telefone</th>}
                    <th className="p-4">Função App (Relatórios)</th>
                    <th className="p-4">Cargo Dashboard</th>
                    <th className="p-4">Relatórios (Av / Vis)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {usersList.map(item => {
                    const isSelf = item.id === currentUser?.id
                    let roleColor = 'bg-slate-100 text-slate-600 border-slate-200'
                    if (item.cargo === 'admin') roleColor = 'bg-rose-50 border-rose-100 text-[#E53935]'
                    if (item.cargo === 'gestor') roleColor = 'bg-blue-50 border-blue-100 text-[#233A7A]'
                    if (item.cargo === 'sup_tecnico') roleColor = 'bg-amber-50 border-amber-100 text-amber-600'
                    if (item.cargo === 'tecnico') roleColor = 'bg-purple-50 border-purple-100 text-purple-600'
                    if (item.cargo === 'vendedor') roleColor = 'bg-emerald-50 border-emerald-100 text-emerald-600'

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 font-bold text-slate-800">
                          {item.full_name || '—'}
                          {isSelf && (
                            <span className="ml-2 text-[9px] font-extrabold uppercase bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-200">Você</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500">
                          {item.email ? (item.email.endsWith('@domestre.com') ? item.email.split('@')[0] : item.email) : '—'}
                        </td>
                        {hasPhoneCompanyCol && (
                          <td className="p-4 text-slate-500">{item.telefone || '—'}</td>
                        )}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 font-bold text-[9px] uppercase border ${
                            item.role === 'vendedor' || item.cargo === 'vendedor'
                              ? 'bg-sky-50 border-sky-100 text-sky-600'
                              : item.role === 'admin' 
                              ? 'bg-rose-50 border-rose-100 text-[#E53935]'
                              : item.role === 'promotor'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            {item.role === 'vendedor' || item.cargo === 'vendedor' ? 'Vendedor' : item.role === 'admin' ? 'Administrador' : item.role === 'promotor' ? 'Promotor' : 'Comum'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 font-bold text-[9px] uppercase border ${roleColor}`}>
                            {item.cargo}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[10px]">
                          <span className="text-[#E53935] font-bold">{item.avariasCount} Av</span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span className="text-[#233A7A] font-bold">{item.visitasCount} Vis</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[9px] uppercase border ${
                            item.status === 'ativo' 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                              : 'bg-rose-50 border-rose-100 text-rose-600'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'ativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(item)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Editar Informações"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setResettingUser(item)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Resetar Senha"
                            >
                              <Lock size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleBlock(item)}
                              disabled={isSelf}
                              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                item.status === 'ativo' 
                                  ? 'border-amber-200 text-amber-600 hover:bg-amber-50' 
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              } disabled:opacity-40`}
                              title={item.status === 'ativo' ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                            >
                              {item.status === 'ativo' ? <Ban size={13} /> : <Unlock size={13} />}
                            </button>
                            <button
                              onClick={() => setDeletingUser(item)}
                              disabled={isSelf}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-rose-200 text-[#E53935] hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ========================================================
            MODAL: EDIT USER
            ======================================================== */}
        {editingUser && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Alteração Cadastral</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Editar Cadastro
                  </h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4 text-xs font-semibold text-slate-500">
                <label className="block">
                  <span className="block mb-1.5">Nome Completo *</span>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nome completo do usuário"
                    className="input font-medium text-slate-700"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block mb-1.5">Login / Usuário *</span>
                  <input
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    placeholder="Ex: joao"
                    className="input font-medium text-slate-700"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block mb-1.5">Função no App (Relatórios) *</span>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="input cursor-pointer font-medium text-slate-700"
                  >
                    <option value="member">Membro / Técnico Comum (Sem relatórios)</option>
                    <option value="promotor">Promotor (Gera relatórios em campo)</option>
                    <option value="vendedor">Vendedor (Apenas solicitar brindes)</option>
                    <option value="admin">Administrador (Acesso total)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block mb-1.5">Cargo no Dashboard *</span>
                  <select
                    value={editCargo}
                    onChange={e => setEditCargo(e.target.value)}
                    className="input cursor-pointer font-medium text-slate-700"
                    disabled={editingUser.id === currentUser?.id}
                  >
                    <option value="funcionario">Funcionário / Técnico (Sem Acesso Dashboard)</option>
                    <option value="tecnico">Técnico de Campo (Sem Acesso Dashboard)</option>
                    <option value="cliente">Cliente Externo (Sem Acesso Dashboard)</option>
                    <option value="vendedor">Vendedor (Sem Acesso Dashboard)</option>
                    <option value="sup_tecnico">Supervisor Técnico (Acesso Liberado)</option>
                    <option value="gestor">Gestor Comercial (Acesso Liberado)</option>
                    <option value="admin">Administrador (Acesso Liberado)</option>
                  </select>
                  {editingUser.id === currentUser?.id && (
                    <span className="text-[9px] text-[#E53935] mt-1 block">* Você não pode alterar o seu próprio cargo de administrador principal.</span>
                  )}
                </label>

                {hasPhoneCompanyCol && (
                  <label className="block">
                    <span className="block mb-1.5">Telefone</span>
                    <input
                      value={editTelefone}
                      onChange={e => setEditTelefone(formatTelefone(e.target.value))}
                      maxLength={15}
                      placeholder="Telefone"
                      className="input font-medium text-slate-700"
                    />
                  </label>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={actionLoading}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ backgroundImage: 'var(--gradient-accent)' }}
                    className="h-10 px-6 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <LoaderCircle className="animate-spin" size={14} /> Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </form>

              </div>
            </div>
          </div>
        )}


        {/* ========================================================
            MODAL: RESET PASSWORD
            ======================================================== */}
        {resettingUser && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Segurança</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Redefinir Senha
                  </h3>
                </div>
                <button
                  onClick={() => setResettingUser(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-semibold text-slate-500">
                <p className="text-slate-400">
                  Defina uma nova senha de login para o usuário <span className="font-bold text-slate-600">{resettingUser.full_name}</span>.
                </p>
                <label className="block">
                  <span className="block mb-1.5">Nova Senha (Mín. 8) *</span>
                  <input
                    type="password"
                    value={newResetPassword}
                    onChange={e => setNewResetPassword(e.target.value)}
                    placeholder="Digite a nova senha de segurança"
                    className="input font-medium text-slate-700"
                    required
                  />
                </label>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResettingUser(null)
                      setNewResetPassword('')
                    }}
                    disabled={actionLoading}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ backgroundImage: 'var(--gradient-accent)' }}
                    className="h-10 px-6 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <LoaderCircle className="animate-spin" size={14} /> Salvando...
                      </>
                    ) : (
                      'Redefinir Senha'
                    )}
                  </button>
                </div>
              </form>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: DELETE CONFIRMATION
            ======================================================== */}
        {deletingUser && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-[#E53935] animate-bounce">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Deseja excluir este usuário?
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Confirmar a exclusão permanente de <span className="font-bold text-slate-700">{deletingUser.full_name}</span>. Todo o histórico de acessos e permissão de login serão revogados.
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setDeletingUser(null)}
                  disabled={actionLoading}
                  className="flex-1 h-10 border border-slate-200 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteUser(deletingUser)}
                  disabled={actionLoading}
                  style={{ backgroundImage: 'var(--gradient-accent)' }}
                  className="flex-1 h-10 text-xs font-bold rounded-xl text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <LoaderCircle className="animate-spin" size={14} />
                  ) : (
                    'Confirmar'
                  )}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
export default Usuarios
