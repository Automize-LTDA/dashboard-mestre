import React, { useState, useEffect, useMemo } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { detectSchemaFeatures } from '../utils/schemaDetect'
import { generateBrindesReportPDF } from '../utils/pdfGenerator'
import { 
  Gift, 
  Plus, 
  LoaderCircle, 
  Check, 
  X, 
  Clock, 
  Building2, 
  User, 
  Info,
  Search,
  Inbox,
  Calendar
} from 'lucide-react'

import canetaImg from '../assets/caneta-mestre.png'
import boneImg from '../assets/bone-mestre.png'
import camisetaImg from '../assets/camiseta-mestre.png'
import cadernoImg from '../assets/caderno-mestre.png'
import copoImg from '../assets/copo-mestre.png'

export const BRINDES_DETAILS: Record<string, { image: string, desc: string }> = {
  'Caneta Ecológica': {
    image: canetaImg,
    desc: 'Caneta ecológica de bambu de alta qualidade com escrita macia e gravação a laser da marca Do Mestre.'
  },
  'Boné Bordado': {
    image: boneImg,
    desc: 'Boné premium estilo trucker preto com bordado de alta definição em relevo da marca Do Mestre.'
  },
  'Camiseta Do Mestre': {
    image: camisetaImg,
    desc: 'Camisa polo dry-fit azul marinho com alta durabilidade e caimento impecável, ideal para visitas comerciais.'
  },
  'Caderno de Anotações': {
    image: cadernoImg,
    desc: 'Caderno de anotações luxo com capa de couro marinho/marrom gravado em baixo relevo.'
  },
  'Copo Térmico': {
    image: copoImg,
    desc: 'Copo térmico de inox com isolamento a vácuo de dupla parede, tampa antivazamento e acabamento preto fosco.'
  },
  'Chaveiro Abridor': {
    image: canetaImg,
    desc: 'Chaveiro abridor de garrafas robusto com acabamento em metal escovado e logotipo gravado.'
  },
  'Sacola Ecológica (Tote Bag)': {
    image: cadernoImg,
    desc: 'Sacola ecológica tipo ecobag em algodão cru reforçado com estampa silk da marca.'
  }
}

// Types
interface SolicitacaoItem {
  id: string
  user_id: string
  requester_name: string
  empresa_id: string | null
  empresa_nome: string | null
  brinde_tipo: string
  quantidade: number
  justificativa: string | null
  status: 'pendente' | 'enviado' | 'recusado' | 'aprovado' | 'entregue'
  observacao_admin: string | null
  created_at: string
  updated_at: string
}

interface CompanyItem {
  id: string
  name: string
  status?: 'ativo' | 'inativo'
}

const BRINDES_PADROES = [
  'Caneta Ecológica',
  'Boné Bordado',
  'Camiseta Do Mestre',
  'Caderno de Anotações',
  'Copo Térmico',
  'Chaveiro Abridor',
  'Sacola Ecológica (Tote Bag)',
  'Outro (especificar)'
]

export const SolicitacaoBrindes: React.FC = () => {
  const { user, cargo, fullName } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDbMode, setIsDbMode] = useState(true)
  
  // Data lists
  const [requests, setRequests] = useState<SolicitacaoItem[]>([])
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  
  // Filters
  const [activeFilter, setActiveFilter] = useState<'todos' | 'pendente' | 'enviado' | 'recusado'>('todos')
  const [selectedVendedorFilter, setSelectedVendedorFilter] = useState<string>('')
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<SolicitacaoItem | null>(null)
  const [actionObservation, setActionObservation] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Report States
  const [reportVendedor, setReportVendedor] = useState('')
  const [reportCompany, setReportCompany] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')

  // Form states
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formBrindeTipo, setFormBrindeTipo] = useState(BRINDES_PADROES[0])
  const [formCustomBrindeTipo, setFormCustomBrindeTipo] = useState('')
  const [formQuantidade, setFormQuantidade] = useState(1)
  const [formJustificativa, setFormJustificativa] = useState('')

  // Scroll lock disabled per user request

  const isVendedor = cargo === 'vendedor'

  // Load companies and requests
  async function loadData() {
    setLoading(true)
    try {
      // 1. Detect if table exists in Supabase
      const schema = await detectSchemaFeatures()
      setIsDbMode(schema.hasSolicitacoesBrindes)

      // 2. Load companies from Supabase
      const { data: companiesData, error: compErr } = await supabase
        .from('empresas')
        .select('id, name, status')
        .order('name', { ascending: true })
      
      if (!compErr && companiesData) {
        // Filter out inactives
        setCompanies(companiesData.filter(c => c.status !== 'inativo'))
      } else {
        // Mock companies fallback
        setCompanies([
          { id: 'c1', name: 'Distribuidora Silva' },
          { id: 'c2', name: 'Supermercados BH' },
          { id: 'c3', name: 'Atacadão Leste' },
          { id: 'c4', name: 'Comercial Souza' }
        ])
      }

      // 3. Load requests
      if (schema.hasSolicitacoesBrindes) {
        let query = supabase.from('solicitacoes_brindes').select('*')
        
        // If vendedor, fetch only their own
        if (cargo === 'vendedor') {
          query = query.eq('user_id', user?.id)
        }
        
        const { data, error } = await query.order('created_at', { ascending: false })
        
        if (error) throw error
        setRequests(data || [])
      } else {
        // LocalStorage fallback mode
        const localData = localStorage.getItem('domestre.solicitacoes_brindes')
        let items: SolicitacaoItem[] = localData ? JSON.parse(localData) : []
        
        // If seller, filter by seller user_id
        if (cargo === 'vendedor') {
          items = items.filter(i => i.user_id === user?.id)
        }
        
        // Sort by date descending
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setRequests(items)
      }
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao carregar dados: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [cargo, user])

  // Create Request
  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!formEmpresaId) {
      showToast('Por favor, selecione uma empresa.', 'error')
      return
    }

    const brinde = formBrindeTipo === 'Outro (especificar)' ? formCustomBrindeTipo.trim() : formBrindeTipo
    if (!brinde) {
      showToast('Por favor, informe o tipo de brinde.', 'error')
      return
    }

    if (formQuantidade <= 0) {
      showToast('A quantidade deve ser maior que zero.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const selectedCompanyObj = companies.find(c => c.id === formEmpresaId)
      const empresaNome = selectedCompanyObj ? selectedCompanyObj.name : 'Outra Empresa'
      
      const newRequest: Partial<SolicitacaoItem> = {
        user_id: user?.id || 'mock-user-id',
        requester_name: fullName || user?.email?.split('@')[0] || 'Vendedor',
        empresa_id: formEmpresaId,
        empresa_nome: empresaNome,
        brinde_tipo: brinde,
        quantidade: formQuantidade,
        justificativa: formJustificativa.trim() || null,
        status: 'pendente',
        observacao_admin: null
      }

      if (isDbMode) {
        const { error } = await supabase
          .from('solicitacoes_brindes')
          .insert(newRequest)
        
        if (error) throw error
      } else {
        // Local storage insertion
        const localData = localStorage.getItem('domestre.solicitacoes_brindes')
        const items: SolicitacaoItem[] = localData ? JSON.parse(localData) : []
        
        const fullNewRequest: SolicitacaoItem = {
          ...newRequest,
          id: Math.random().toString(36).substring(2, 11),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as SolicitacaoItem

        items.unshift(fullNewRequest)
        localStorage.setItem('domestre.solicitacoes_brindes', JSON.stringify(items))
      }

      showToast('Solicitação de brindes enviada com sucesso!', 'success')
      
      // Reset form
      setFormEmpresaId('')
      setFormBrindeTipo(BRINDES_PADROES[0])
      setFormCustomBrindeTipo('')
      setFormQuantidade(1)
      setFormJustificativa('')
      setShowNewRequestModal(false)
      
      // Reload
      await loadData()
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao criar solicitação: ' + e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel own request
  // @ts-ignore
  async function handleCancelRequest(id: string) {
    if (!window.confirm('Tem certeza de que deseja cancelar esta solicitação?')) return

    try {
      if (isDbMode) {
        const { error } = await supabase
          .from('solicitacoes_brindes')
          .delete()
          .eq('id', id)
          .eq('status', 'pendente') // safety check
        
        if (error) throw error
      } else {
        const localData = localStorage.getItem('domestre.solicitacoes_brindes')
        let items: SolicitacaoItem[] = localData ? JSON.parse(localData) : []
        items = items.filter(i => i.id !== id)
        localStorage.setItem('domestre.solicitacoes_brindes', JSON.stringify(items))
      }

      showToast('Solicitação cancelada com sucesso.', 'success')
      await loadData()
    } catch (e: any) {
      console.error(e)
      showToast('Falha ao cancelar solicitação: ' + e.message, 'error')
    }
  }

  // Admin action handler
  async function handleAdminAction(action: 'enviado' | 'recusado') {
    if (!selectedRequestForAction) return

    // Map UI label to DB-valid status value
    const dbStatus = action === 'enviado' ? 'aprovado' : 'recusado'

    setActionLoading(true)
    try {
      if (isDbMode) {
        const { error } = await supabase
          .from('solicitacoes_brindes')
          .update({
            status: dbStatus,
            observacao_admin: actionObservation.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRequestForAction.id)
        
        if (error) throw error

        // Enviar notificação direcionada ao promotor/vendedor solicitante
        try {
          await supabase
            .from('notificacoes')
            .insert({
              user_id: selectedRequestForAction.user_id,
              titulo: dbStatus === 'aprovado' ? 'Solicitação de Brinde Aprovada! 🎁' : 'Solicitação de Brinde Recusada ❌',
              mensagem: `Sua solicitação de ${selectedRequestForAction.quantidade}x "${selectedRequestForAction.brinde_tipo}" foi ${dbStatus === 'aprovado' ? 'aprovada' : 'recusada'}. ${actionObservation.trim() ? `Obs: ${actionObservation.trim()}` : ''}`,
              tipo: dbStatus === 'aprovado' ? 'sucesso' : 'erro',
              lida: false
            })
        } catch (notifErr) {
          console.warn('Erro ao criar registro de notificação:', notifErr)
        }
      } else {
        const localData = localStorage.getItem('domestre.solicitacoes_brindes')
        const items: SolicitacaoItem[] = localData ? JSON.parse(localData) : []
        const index = items.findIndex(i => i.id === selectedRequestForAction.id)
        if (index !== -1) {
          items[index].status = dbStatus as SolicitacaoItem['status']
          items[index].observacao_admin = actionObservation.trim() || null
          items[index].updated_at = new Date().toISOString()
          localStorage.setItem('domestre.solicitacoes_brindes', JSON.stringify(items))
        }
      }

      showToast(
        action === 'enviado' ? 'Solicitação aprovada e liberada com sucesso!' : 'Solicitação recusada.',
        action === 'enviado' ? 'success' : 'info'
      )
      setShowActionModal(false)
      setSelectedRequestForAction(null)
      setActionObservation('')
      await loadData()
    } catch (e: any) {
      console.error(e)
      showToast('Falha ao atualizar solicitação: ' + e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const openActionModal = (request: SolicitacaoItem) => {
    setSelectedRequestForAction(request)
    setActionObservation(request.observacao_admin || '')
    setShowActionModal(true)
  }

  const handleGeneratePDF = () => {
    const filtered = requests.filter(r => {
      if (reportVendedor && r.requester_name !== reportVendedor) return false
      if (reportCompany && r.empresa_id !== reportCompany) return false
      if (reportStatus) {
        if (reportStatus === 'enviado') {
          if (r.status !== 'enviado' && r.status !== 'aprovado' && r.status !== 'entregue') return false
        } else if (r.status !== reportStatus) {
          return false
        }
      }
      if (reportStartDate) {
        const start = new Date(reportStartDate)
        start.setHours(0, 0, 0, 0)
        if (new Date(r.created_at) < start) return false
      }
      if (reportEndDate) {
        const end = new Date(reportEndDate)
        end.setHours(23, 59, 59, 999)
        if (new Date(r.created_at) > end) return false
      }
      return true
    })

    const periodText = reportStartDate || reportEndDate
      ? `${reportStartDate ? new Date(reportStartDate).toLocaleDateString('pt-BR') : 'Início'} até ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('pt-BR') : 'Fim'}`
      : 'Todo o histórico'

    const filterVendedorText = reportVendedor || 'Todos Vendedores'
    const filterCompanyText = reportCompany 
      ? (companies.find(c => c.id === reportCompany)?.name || 'Empresa Filtrada') 
      : 'Todas Empresas'
    const filterStatusText = reportStatus 
      ? (reportStatus === 'pendente' ? 'Pendente' : reportStatus === 'enviado' ? 'Enviado' : 'Recusado')
      : 'Todos Status'

    try {
      generateBrindesReportPDF(
        filtered,
        filterVendedorText,
        filterCompanyText,
        filterStatusText,
        periodText
      )
      showToast('Relatório de brindes exportado com sucesso!', 'success')
      setShowReportModal(false)
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao exportar PDF: ' + e.message, 'error')
    }
  }

  // Memoized lists of sellers and companies who requested (for admin filtering)
  const sellersList = useMemo(() => {
    const list = new Set<string>()
    requests.forEach(r => list.add(r.requester_name))
    return Array.from(list)
  }, [requests])

  const companiesList = useMemo(() => {
    const list = new Map<string, string>()
    requests.forEach(r => {
      if (r.empresa_id && r.empresa_nome) {
        list.set(r.empresa_id, r.empresa_nome)
      }
    })
    return Array.from(list.entries()).map(([id, name]) => ({ id, name }))
  }, [requests])

  // Filtered requests logic
  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
      // 1. Status Filter
      if (activeFilter !== 'todos') {
        const isMatch = 
          (activeFilter === 'enviado' && (item.status === 'enviado' || item.status === 'aprovado' || item.status === 'entregue')) ||
          (item.status === activeFilter)
        if (!isMatch) return false
      }
      // 2. Vendedor Filter (Admins only)
      if (!isVendedor && selectedVendedorFilter && item.requester_name !== selectedVendedorFilter) {
        return false
      }
      // 3. Company Filter (Admins only)
      if (!isVendedor && selectedCompanyFilter && item.empresa_id !== selectedCompanyFilter) {
        return false
      }
      // 4. Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchBrinde = item.brinde_tipo.toLowerCase().includes(query)
        const matchCompany = (item.empresa_nome || '').toLowerCase().includes(query)
        const matchRequester = item.requester_name.toLowerCase().includes(query)
        return matchBrinde || matchCompany || matchRequester
      }
      return true
    })
  }, [requests, activeFilter, selectedVendedorFilter, selectedCompanyFilter, searchTerm, isVendedor])

  // Metric Stats Calculations
  const stats = useMemo(() => {
    const total = requests.length
    const pendente = requests.filter(r => r.status === 'pendente').length
    const enviado = requests.filter(r => r.status === 'enviado' || r.status === 'aprovado' || r.status === 'entregue').length
    const recusado = requests.filter(r => r.status === 'recusado').length

    return { total, pendente, enviado, recusado }
  }, [requests])

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in-up">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#E53935]">
              Operação Comercial
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#233A7A] flex items-center gap-2">
              <Gift className="text-[#233A7A]" /> Solicitação de Brindes
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isVendedor 
                ? 'Solicite brindes promocionais e institucionais para entrega aos clientes em visitas comerciais.'
                : 'Acompanhe, gerencie e aprove as solicitações de brindes dos vendedores.'}
            </p>
          </div>

          <div className="flex gap-3">
            {!isVendedor && (
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl font-bold text-[#233A7A] bg-white border border-[#233A7A]/25 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Calendar size={16} /> Gerar Relatório PDF
              </button>
            )}
            {isVendedor && (
              <button
                onClick={() => setShowNewRequestModal(true)}
                style={{ backgroundImage: 'var(--gradient-accent)' }}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <Plus size={16} /> Nova Solicitação
              </button>
            )}
          </div>
        </header>

        {/* Fallback storage warning banner */}
        {!isDbMode && !loading && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-start gap-3">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Modo de Armazenamento Local Ativo</p>
              <p className="text-slate-500">
                A tabela <code className="font-mono bg-amber-100/60 px-1 py-0.5 rounded text-amber-800">solicitacoes_brindes</code> não foi encontrada no Supabase. Os dados estão sendo salvos no <code className="font-mono bg-amber-100/60 px-1 py-0.5 rounded text-amber-800">localStorage</code> do navegador. Para persistência de banco de dados, execute o script SQL de migração fornecido.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================
            METRICS GRID
            ======================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
            <div className="h-10 w-10 bg-blue-50 text-[#233A7A] rounded-xl flex items-center justify-center font-bold">
              <Inbox size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Solicitado</p>
              <h3 className="text-xl font-bold text-[#233A7A] mt-0.5">{stats.total}</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
            <div className="h-10 w-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Aguardando Aprovação</p>
              <h3 className="text-xl font-bold text-[#233A7A] mt-0.5">{stats.pendente}</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center font-bold">
              <Gift size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Enviados</p>
              <h3 className="text-xl font-bold text-[#233A7A] mt-0.5">{stats.enviado}</h3>
            </div>
          </div>

        </section>

        {/* ========================================================
            FILTER BAR
            ======================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-[var(--shadow-soft)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex overflow-x-auto whitespace-nowrap bg-slate-100 p-1 rounded-xl w-full lg:w-fit text-[11px] font-bold text-slate-500 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1">
            {(['todos', 'pendente', 'enviado', 'recusado'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer shrink-0 ${
                  activeFilter === tab 
                    ? 'bg-white text-[#233A7A] shadow-sm' 
                    : 'hover:text-slate-700'
                }`}
              >
                {tab === 'todos' ? 'Todos' : tab === 'pendente' ? 'Pendentes' : tab === 'enviado' ? 'Enviados' : 'Recusados'}
              </button>
            ))}
          </div>

          {/* Search and Dropdowns */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs font-semibold text-slate-500 w-full lg:w-auto">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar..."
                className="input pl-9 font-medium text-slate-700 h-9 w-full"
              />
            </div>

            {/* Admin filters */}
            {!isVendedor && (
              <>
                <div className="w-full sm:w-44">
                  <select
                    value={selectedVendedorFilter}
                    onChange={e => setSelectedVendedorFilter(e.target.value)}
                    className="input font-medium text-slate-700 h-9 pr-8 py-0 cursor-pointer w-full"
                  >
                    <option value="">Filtrar Vendedor</option>
                    {sellersList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-44">
                  <select
                    value={selectedCompanyFilter}
                    onChange={e => setSelectedCompanyFilter(e.target.value)}
                    className="input font-medium text-slate-700 h-9 pr-8 py-0 cursor-pointer w-full"
                  >
                    <option value="">Filtrar Empresa</option>
                    {companiesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

          </div>

        </section>

        {/* ========================================================
            HISTORIC REQUESTS LIST/TABLE
            ======================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
          {loading ? (
            <div className="flex items-center justify-center p-16 text-xs font-semibold text-slate-400">
              <LoaderCircle className="animate-spin mr-2 text-[#E53935]" size={18} /> Carregando solicitações...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Gift size={28} className="text-slate-300" />
              <span>Nenhuma solicitação encontrada para o filtro selecionado.</span>
            </div>
          ) : (
            <div>
              {/* DESKTOP VIEW */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                      <th className="p-4">Data</th>
                      {!isVendedor && <th className="p-4">Vendedor</th>}
                      <th className="p-4">Empresa</th>
                      <th className="p-4">Brinde</th>
                      <th className="p-4">Quantidade</th>
                      <th className="p-4">Justificativa</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Obs. Adm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRequests.map(item => {
                      const isPending = item.status === 'pendente'
                      const isSent = item.status === 'enviado' || item.status === 'aprovado' || item.status === 'entregue'
                      
                      let statusColor = 'bg-slate-100 border-slate-200 text-slate-600'
                      if (item.status === 'pendente') statusColor = 'bg-amber-50 border-amber-100 text-amber-600'
                      if (isSent) statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      if (item.status === 'recusado') statusColor = 'bg-rose-50 border-rose-100 text-rose-600'

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => {
                            if (!isVendedor && isPending) {
                              openActionModal(item)
                            }
                          }}
                          className={`transition-colors group ${
                            (!isVendedor && isPending) 
                              ? 'hover:bg-amber-50/20 cursor-pointer' 
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          
                          {/* Created At Date */}
                          <td className="p-4 text-slate-400 select-none font-mono text-[10px]">
                            {new Date(item.created_at).toLocaleDateString('pt-BR')} <br />
                            {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          {/* Requester Name (Admins only) */}
                          {!isVendedor && (
                            <td className="p-4 font-bold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                {item.requester_name}
                              </div>
                            </td>
                          )}

                          {/* Company Name */}
                          <td className="p-4 font-bold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Building2 size={13} className="text-slate-400" />
                              {item.empresa_nome || '—'}
                            </div>
                          </td>

                          {/* Brinde Tipo */}
                          <td className="p-4 font-bold text-slate-700">
                            <div className="flex items-center gap-2">
                              {BRINDES_DETAILS[item.brinde_tipo] ? (
                                <div className="h-8 w-8 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-0.5 shrink-0 shadow-sm">
                                  <img 
                                    src={BRINDES_DETAILS[item.brinde_tipo].image} 
                                    alt={item.brinde_tipo} 
                                    className="h-full w-full object-contain" 
                                  />
                                </div>
                              ) : (
                                <div className="h-8 w-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                                  <Gift size={14} />
                                </div>
                              )}
                              <span>{item.brinde_tipo}</span>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="p-4 text-center font-mono font-bold text-slate-800 text-[13px]">{item.quantidade}</td>

                          {/* Justificativa */}
                          <td className="p-4 text-slate-500 max-w-[200px] truncate" title={item.justificativa || ''}>
                            {item.justificativa || <span className="italic text-slate-300">Nenhuma</span>}
                          </td>

                          {/* Status badge */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold text-[9px] uppercase border ${statusColor}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                item.status === 'pendente' ? 'bg-amber-500' :
                                isSent ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} />
                              {item.status === 'pendente' ? 'Pendente' : 
                               isSent ? 'Enviado' : 'Recusado'}
                            </span>
                          </td>

                          {/* Admin Observation */}
                          <td className="p-4 text-slate-500 max-w-[150px] truncate" title={item.observacao_admin || ''}>
                            {item.observacao_admin || <span className="italic text-slate-300">—</span>}
                          </td>

                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="block lg:hidden p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredRequests.map(item => {
                    const isPending = item.status === 'pendente'
                    const isSent = item.status === 'enviado' || item.status === 'aprovado' || item.status === 'entregue'
                    
                    let statusColor = 'bg-slate-100 border-slate-200 text-slate-600'
                    let dotColor = 'bg-slate-500'
                    if (item.status === 'pendente') {
                      statusColor = 'bg-amber-50 border-amber-100 text-amber-600'
                      dotColor = 'bg-amber-500'
                    }
                    if (isSent) {
                      statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      dotColor = 'bg-emerald-500'
                    }
                    if (item.status === 'recusado') {
                      statusColor = 'bg-rose-50 border-rose-100 text-rose-600'
                      dotColor = 'bg-rose-500'
                    }

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          if (!isVendedor && isPending) {
                            openActionModal(item)
                          }
                        }}
                        className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 ${
                          (!isVendedor && isPending) ? 'cursor-pointer hover:border-amber-250 bg-amber-50/5' : ''
                        }`}
                      >
                        {/* Header: Date & Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            {new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold text-[9px] uppercase border ${statusColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                            {item.status === 'pendente' ? 'Pendente' : 
                             isSent ? 'Enviado' : 'Recusado'}
                          </span>
                        </div>

                        {/* Gift Image + Info */}
                        <div className="flex gap-3">
                          {BRINDES_DETAILS[item.brinde_tipo] ? (
                            <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
                              <img 
                                src={BRINDES_DETAILS[item.brinde_tipo].image} 
                                alt={item.brinde_tipo} 
                                className="h-full w-full object-contain" 
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                              <Gift size={16} />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">{item.brinde_tipo}</div>
                            
                            {!isVendedor && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                <User size={12} className="opacity-60 shrink-0" />
                                <span>{item.requester_name}</span>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                              <Building2 size={12} className="opacity-60 shrink-0" />
                              <span>{item.empresa_nome || '—'}</span>
                            </div>

                            <div className="text-[10px] text-slate-800 font-semibold">
                              Quantidade: <span className="font-mono font-bold text-xs">{item.quantidade}</span>
                            </div>
                          </div>
                        </div>

                        {/* Justification & Admin Obs */}
                        {(item.justificativa || item.observacao_admin) && (
                          <div className="space-y-1.5 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {item.justificativa && (
                              <div>
                                <span className="text-slate-400 font-bold">Justificativa: </span>
                                <span className="text-slate-700">{item.justificativa}</span>
                              </div>
                            )}
                            {item.observacao_admin && (
                              <div className={item.justificativa ? "pt-1 border-t border-slate-200/60 mt-1" : ""}>
                                <span className="text-slate-500 font-bold">Obs. Admin: </span>
                                <span className="text-slate-700 font-medium italic">"{item.observacao_admin}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================
            MODAL: NEW REQUEST
            ======================================================== */}
        {showNewRequestModal && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Comercial</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Nova Solicitação de Brinde
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewRequestModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-4 text-xs font-semibold text-slate-500">
                
                {/* Select Empresa */}
                <label className="block">
                  <span className="block mb-1.5">Empresa / Cliente Comercial *</span>
                  <select
                    value={formEmpresaId}
                    onChange={e => setFormEmpresaId(e.target.value)}
                    className="input cursor-pointer font-medium text-slate-700 w-full"
                    required
                  >
                    <option value="">Selecione uma empresa...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                {/* Brinde Tipo */}
                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="block mb-1.5">Brinde Promocional *</span>
                    <select
                      value={formBrindeTipo}
                      onChange={e => setFormBrindeTipo(e.target.value)}
                      className="input cursor-pointer font-medium text-slate-700 w-full"
                    >
                      {BRINDES_PADROES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>

                  {formBrindeTipo === 'Outro (especificar)' && (
                    <label className="block animate-slide-in">
                      <span className="block mb-1.5">Descreva o Brinde *</span>
                      <input
                        value={formCustomBrindeTipo}
                        onChange={e => setFormCustomBrindeTipo(e.target.value)}
                        placeholder="Ex: Agenda de Couro Luxo"
                        className="input font-medium text-slate-700 w-full"
                        required
                      />
                    </label>
                  )}
                </div>

                {/* Quantity */}
                <label className="block">
                  <span className="block mb-1.5">Quantidade Necessária *</span>
                  <input
                    type="number"
                    value={formQuantidade}
                    onChange={e => setFormQuantidade(parseInt(e.target.value) || 0)}
                    min={1}
                    className="input font-medium text-slate-700 w-full"
                    required
                  />
                </label>

                {/* Justification */}
                <label className="block">
                  <span className="block mb-1.5">Justificativa da Solicitação</span>
                  <textarea
                    value={formJustificativa}
                    onChange={e => setFormJustificativa(e.target.value)}
                    placeholder="Ex: Brindes de relacionamento para nova parceria comercial..."
                    rows={3}
                    className="input font-medium text-slate-700 py-2 resize-none w-full"
                  />
                </label>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewRequestModal(false)}
                    disabled={submitting}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ backgroundImage: 'var(--gradient-accent)' }}
                    className="h-10 px-6 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle className="animate-spin" size={14} /> Enviando...
                      </>
                    ) : (
                      'Enviar Solicitação'
                    )}
                  </button>
                </div>
              </form>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: ADMIN ACTIONS (APPROVE/REJECT)
            ======================================================== */}
        {showActionModal && selectedRequestForAction && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Gestão de Estoque</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Liberar Brinde
                  </h3>
                </div>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-500">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5 text-slate-500">
                  <p><strong>Vendedor:</strong> {selectedRequestForAction.requester_name}</p>
                  <p><strong>Empresa:</strong> {selectedRequestForAction.empresa_nome}</p>
                  <p><strong>Item Solicitado:</strong> {selectedRequestForAction.brinde_tipo} (x{selectedRequestForAction.quantidade})</p>
                  {selectedRequestForAction.justificativa && (
                    <p><strong>Justificativa:</strong> <span className="italic">"{selectedRequestForAction.justificativa}"</span></p>
                  )}
                </div>

                <label className="block">
                  <span className="block mb-1.5">Observação ou Instrução de Entrega (Opcional)</span>
                  <textarea
                    value={actionObservation}
                    onChange={e => setActionObservation(e.target.value)}
                    placeholder="Ex: Retirar no setor de Marketing com Maria..."
                    rows={3}
                    className="input font-medium text-slate-700 py-2 resize-none w-full"
                  />
                </label>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowActionModal(false)}
                    disabled={actionLoading}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 font-bold cursor-pointer order-last sm:order-first"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleAdminAction('recusado')}
                    disabled={actionLoading}
                    className="h-10 px-5 rounded-xl font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <LoaderCircle className="animate-spin" size={14} />
                    ) : (
                      <><X size={14} /> Recusar</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminAction('enviado')}
                    disabled={actionLoading}
                    className="h-10 px-5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <LoaderCircle className="animate-spin" size={14} />
                    ) : (
                      <><Check size={14} /> Liberar e Enviar</>
                    )}
                  </button>
                </div>
              </div>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: REPORT GENERATION
            ======================================================== */}
        {showReportModal && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Relatórios</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Gerar Relatório de Brindes
                  </h3>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-500">
                {/* Vendedor Filter */}
                <label className="block">
                  <span className="block mb-1.5">Vendedor</span>
                  <select
                    value={reportVendedor}
                    onChange={e => setReportVendedor(e.target.value)}
                    className="input cursor-pointer font-medium text-slate-700 w-full"
                  >
                    <option value="">Todos os Vendedores</option>
                    {sellersList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>

                {/* Company Filter */}
                <label className="block">
                  <span className="block mb-1.5">Empresa / Cliente</span>
                  <select
                    value={reportCompany}
                    onChange={e => setReportCompany(e.target.value)}
                    className="input cursor-pointer font-medium text-slate-700 w-full"
                  >
                    <option value="">Todas as Empresas</option>
                    {companiesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                {/* Status Filter */}
                <label className="block">
                  <span className="block mb-1.5">Status da Solicitação</span>
                  <select
                    value={reportStatus}
                    onChange={e => setReportStatus(e.target.value)}
                    className="input cursor-pointer font-medium text-slate-700 w-full"
                  >
                    <option value="">Todos os Status</option>
                    <option value="pendente">Pendente</option>
                    <option value="enviado">Enviado</option>
                    <option value="recusado">Recusado</option>
                  </select>
                </label>

                {/* Date range filters */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block mb-1.5">Data Início</span>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={e => setReportStartDate(e.target.value)}
                      className="input font-medium text-slate-700 w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="block mb-1.5">Data Fim</span>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={e => setReportEndDate(e.target.value)}
                      className="input font-medium text-slate-700 w-full"
                    />
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGeneratePDF}
                    style={{ backgroundImage: 'var(--gradient-accent)' }}
                    className="h-10 px-6 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    Gerar PDF
                  </button>
                </div>
              </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
export default SolicitacaoBrindes
