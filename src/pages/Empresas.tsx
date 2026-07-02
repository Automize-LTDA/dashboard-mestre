import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { detectSchemaFeatures } from '../utils/schemaDetect'
import { 
  Building2, 
  Plus, 
  Trash2, 
  Pencil, 
  LoaderCircle, 
  Info, 
  X,
  AlertCircle,
  Phone,
  User
} from 'lucide-react'

interface CompanyItem {
  id: string
  name: string
  cnpj?: string | null
  responsavel?: string | null
  telefone?: string | null
  endereco?: string | null
  status?: 'ativo' | 'inativo'
  codigo?: string | null
  created_at: string
}

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

const formatTelefone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export const Empresas: React.FC = () => {
  const { showToast } = useToast()
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCnpj, setNewCnpj] = useState('')
  const [newResponsavel, setNewResponsavel] = useState('')
  const [newTelefone, setNewTelefone] = useState('')
  const [newEndereco, setNewEndereco] = useState('')
  const [hasExtendedCols, setHasExtendedCols] = useState(false)
  const [hasCodigoCol, setHasCodigoCol] = useState(false)

  // Edit states
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editCnpj, setEditCnpj] = useState('')
  const [editResponsavel, setEditResponsavel] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [editEndereco, setEditEndereco] = useState('')
  const [editStatus, setEditStatus] = useState<'ativo' | 'inativo'>('ativo')

  const [deletingCompany, setDeletingCompany] = useState<CompanyItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function loadCompanies() {
    setLoading(true)
    try {
      // 1. Detect dynamic columns first
      const schema = await detectSchemaFeatures()
      setHasExtendedCols(schema.hasCnpj)
      setHasCodigoCol(schema.hasCodigo)

      // 2. Fetch companies from Supabase
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCompanies(data || [])
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao carregar empresas: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  // Create Company
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      showToast('Por favor, informe o nome da empresa.', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Calculate next numeric code sequentially
      let maxNum = 0
      companies.forEach(c => {
        const match = c.name.match(/^\[(\d+)\]/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      })
      const nextNum = maxNum + 1
      const generatedCode = nextNum < 10 ? `0${nextNum}` : `${nextNum}`
      const nameWithCode = `[${generatedCode}] ${newName.trim()}`
      const payload: any = { name: nameWithCode }
      
      if (hasExtendedCols) {
        payload.cnpj = newCnpj.trim() || null
        payload.responsavel = newResponsavel.trim() || null
        payload.telefone = newTelefone.trim() || null
        payload.endereco = newEndereco.trim() || null
        payload.status = 'ativo'
      }

      if (hasCodigoCol) {
        payload.codigo = generatedCode
      }

      const { error } = await supabase
        .from('empresas')
        .insert(payload)

      if (error) throw error

      showToast('Empresa cadastrada com sucesso!', 'success')
      setNewName('')
      setNewCnpj('')
      setNewResponsavel('')
      setNewTelefone('')
      setNewEndereco('')
      await loadCompanies()
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao cadastrar empresa: ' + e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Company
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCompany) return

    if (!editName.trim()) {
      showToast('O nome da empresa é obrigatório.', 'error')
      return
    }

    setActionLoading(true)
    try {
      const match = editingCompany.name.match(/^\[([^\]]+)\]\s*(.*)$/)
      let finalCode = editingCompany.codigo || (match ? match[1] : null)
      if (!finalCode) {
        let maxNum = 0
        companies.forEach(c => {
          const m = c.name.match(/^\[(\d+)\]/)
          if (m) {
            const num = parseInt(m[1], 10)
            if (!isNaN(num) && num > maxNum) {
              maxNum = num
            }
          }
        })
        const nextNum = maxNum + 1
        finalCode = nextNum < 10 ? `0${nextNum}` : `${nextNum}`
      }

      const cleanName = editName.trim().replace(/^\[[^\]]+\]\s*/, '')
      const nameWithCode = `[${finalCode}] ${cleanName}`

      const payload: any = { name: nameWithCode }

      if (hasExtendedCols) {
        payload.cnpj = editCnpj.trim() || null
        payload.responsavel = editResponsavel.trim() || null
        payload.telefone = editTelefone.trim() || null
        payload.endereco = editEndereco.trim() || null
        payload.status = editStatus
      }

      if (hasCodigoCol) {
        payload.codigo = finalCode
      }

      const { error } = await supabase
        .from('empresas')
        .update(payload)
        .eq('id', editingCompany.id)

      if (error) throw error

      showToast('Empresa atualizada com sucesso!', 'success')
      setEditingCompany(null)
      await loadCompanies()
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao atualizar empresa: ' + e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Company
  async function handleDelete(target: CompanyItem) {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', target.id)

      if (error) throw error

      showToast(`Empresa ${target.name} removida com sucesso!`, 'success')
      setDeletingCompany(null)
      await loadCompanies()
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao excluir empresa: ' + e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const startEdit = (target: CompanyItem) => {
    setEditingCompany(target)
    const cleanName = target.name.replace(/^\[[^\]]+\]\s*/, '')
    setEditName(cleanName)
    setEditCnpj(target.cnpj || '')
    setEditResponsavel(target.responsavel || '')
    setEditTelefone(target.telefone || '')
    setEditEndereco(target.endereco || '')
    setEditStatus(target.status || 'ativo')
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
            <Building2 className="text-[#233A7A]" /> Empresas Atendidas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre as empresas e filiais atendidas pelo sistema Do Mestre.
          </p>
        </header>

        {/* Warning Banner if Migration not applied */}
        {!hasExtendedCols && !loading && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-start gap-3 no-print">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Colunas Adicionais Desativadas</p>
              <p className="text-slate-500">Para cadastrar CNPJ, Telefone, Endereço e Responsável da empresa, execute o script de migração no painel do Supabase. O formulário abaixo está exibindo apenas o campo Nome temporariamente.</p>
            </div>
          </div>
        )}

        {/* ========================================================
            FORM: ADD NEW COMPANY
            ======================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[var(--shadow-soft)] space-y-4 no-print">
          <h2 className="text-xs font-bold text-[#233A7A] flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-100 pb-3">
            <Building2 size={16} className="text-[#E53935]" /> Cadastrar Nova Empresa
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
            <label className="block md:col-span-2">
              <span className="block mb-1.5">Razão Social / Nome Fantasia *</span>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Comercial Souza Ltda"
                className="input font-medium text-slate-700"
                required
              />
            </label>

            {hasExtendedCols && (
              <>
                <label className="block">
                  <span className="block mb-1.5">CNPJ</span>
                  <input
                    value={newCnpj}
                    onChange={e => setNewCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    placeholder="Ex: 00.000.000/0001-00"
                    className="input font-medium text-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="block mb-1.5">Responsável Comercial</span>
                  <input
                    value={newResponsavel}
                    onChange={e => setNewResponsavel(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="input font-medium text-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="block mb-1.5">Telefone de Contato</span>
                  <input
                    value={newTelefone}
                    onChange={e => setNewTelefone(formatTelefone(e.target.value))}
                    maxLength={15}
                    placeholder="Ex: (31) 98888-8888"
                    className="input font-medium text-slate-700"
                  />
                </label>
                <label className="block md:col-span-3">
                  <span className="block mb-1.5">Endereço Completo</span>
                  <input
                    value={newEndereco}
                    onChange={e => setNewEndereco(e.target.value)}
                    placeholder="Ex: Av. Principal, 123 - Centro"
                    className="input font-medium text-slate-700"
                  />
                </label>
              </>
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
                    <Plus size={15} /> Cadastrar Empresa
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ========================================================
            TABLE: LIST COMPANIES
            ======================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
          {loading ? (
            <div className="flex items-center justify-center p-16 text-xs font-semibold text-slate-400">
              <LoaderCircle className="animate-spin mr-2 text-[#E53935]" size={18} /> Carregando empresas...
            </div>
          ) : companies.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              Nenhuma empresa cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                    <th className="p-4">Razão Social / Nome</th>
                    {hasExtendedCols && <th className="p-4">CNPJ</th>}
                    {hasExtendedCols && <th className="p-4">Responsável</th>}
                    {hasExtendedCols && <th className="p-4">Contato</th>}
                    {hasExtendedCols && <th className="p-4">Situação</th>}
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {companies.map(item => {
                    const isActive = item.status === 'ativo'

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-slate-400" />
                            {item.name}
                          </div>
                        </td>
                        {hasExtendedCols && (
                          <td className="p-4 text-slate-500">{item.cnpj || '—'}</td>
                        )}
                        {hasExtendedCols && (
                          <td className="p-4 text-slate-500">
                            {item.responsavel ? (
                              <div className="flex items-center gap-1.5">
                                <User size={12} className="text-slate-400" />
                                {item.responsavel}
                              </div>
                            ) : '—'}
                          </td>
                        )}
                        {hasExtendedCols && (
                          <td className="p-4 text-slate-500">
                            {item.telefone ? (
                              <div className="flex items-center gap-1.5">
                                <Phone size={12} className="text-slate-400" />
                                {item.telefone}
                              </div>
                            ) : '—'}
                          </td>
                        )}
                        {hasExtendedCols && (
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold text-[9px] uppercase border ${
                              isActive 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {item.status}
                            </span>
                          </td>
                        )}
                        <td className="p-4 text-right">
                          <div className="inline-flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(item)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeletingCompany(item)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-rose-200 text-[#E53935] hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir"
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
            MODAL: EDIT COMPANY
            ======================================================== */}
        {editingCompany && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Administrativo</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Editar Empresa {editingCompany.codigo || editingCompany.name.match(/^\[([^\]]+)\]/)?.[1] ? `· ${editingCompany.codigo || editingCompany.name.match(/^\[([^\]]+)\]/)?.[1]}` : ''}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingCompany(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4 text-xs font-semibold text-slate-500">
                <label className="block">
                  <span className="block mb-1.5">Razão Social / Nome *</span>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nome da empresa"
                    className="input font-medium text-slate-700"
                    required
                  />
                </label>

                {hasExtendedCols && (
                  <>
                    <label className="block">
                      <span className="block mb-1.5">CNPJ</span>
                      <input
                        value={editCnpj}
                        onChange={e => setEditCnpj(formatCNPJ(e.target.value))}
                        maxLength={18}
                        placeholder="CNPJ"
                        className="input font-medium text-slate-700"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block mb-1.5">Responsável</span>
                        <input
                          value={editResponsavel}
                          onChange={e => setEditResponsavel(e.target.value)}
                          placeholder="Responsável"
                          className="input font-medium text-slate-700"
                        />
                      </label>
                      <label className="block">
                        <span className="block mb-1.5">Telefone</span>
                        <input
                          value={editTelefone}
                          onChange={e => setEditTelefone(formatTelefone(e.target.value))}
                          maxLength={15}
                          placeholder="Telefone de contato"
                          className="input font-medium text-slate-700"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="block mb-1.5">Endereço</span>
                      <input
                        value={editEndereco}
                        onChange={e => setEditEndereco(e.target.value)}
                        placeholder="Endereço"
                        className="input font-medium text-slate-700"
                      />
                    </label>

                    <label className="block">
                      <span className="block mb-1.5">Situação / Status *</span>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as 'ativo' | 'inativo')}
                        className="input cursor-pointer font-medium text-slate-700"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </label>
                  </>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCompany(null)}
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
            MODAL: DELETE CONFIRMATION
            ======================================================== */}
        {deletingCompany && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-[#E53935] animate-bounce">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Excluir Empresa?
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Você está prestes a excluir a empresa <span className="font-bold text-slate-700">{deletingCompany.name}</span>. Esta ação é irreversível e removerá o vínculo em relatórios futuros.
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setDeletingCompany(null)}
                  disabled={actionLoading}
                  className="flex-1 h-10 border border-slate-200 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deletingCompany)}
                  disabled={actionLoading}
                  style={{ backgroundImage: 'var(--gradient-accent)' }}
                  className="flex-1 h-10 text-xs font-bold rounded-xl text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <LoaderCircle className="animate-spin" size={14} />
                  ) : (
                    'Excluir'
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
export default Empresas
