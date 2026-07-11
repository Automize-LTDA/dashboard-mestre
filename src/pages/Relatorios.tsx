import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Layout } from '../components/Layout'
import { useToast } from '../context/ToastContext'
import { 
  Search, 
  Filter, 
  Eye, 
  Pencil, 
  FileDown, 
  Share2, 
  Building2, 
  User, 
  Users, 
  X, 
  Download,
  Info,
  FileText,
  LoaderCircle,
  Mail,
  Send
} from 'lucide-react'
import { generateReportPDF, generateVisitPDF, generateConsolidatedReportsPDF, generateMonthlySystemPDF } from '../utils/pdfGenerator'

interface ReportItem {
  id: string
  numero: string
  empresa: string
  responsavel: string
  data: string
  tipo: 'avaria' | 'visita'
  status: string
  atividades?: string
  motivo?: string
  observacoes: string
  total_itens?: number
  created_at: string
}

interface DetailAvariaItem {
  id: string
  material: string
  quantidade: number
  tipo_avaria: string
}

export const Relatorios: React.FC = () => {
  const { showToast } = { ...useToast() }
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter States
  const [search, setSearch] = useState(searchParams.get('search') || '')

  useEffect(() => {
    const q = searchParams.get('search')
    if (q !== null) {
      setSearch(q)
    }
  }, [searchParams])
  const [selectedEmpresa, setSelectedEmpresa] = useState('')
  const [selectedResponsavel, setSelectedResponsavel] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedTipo, setSelectedTipo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals States
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null)
  const [avariaItems, setAvariaItems] = useState<DetailAvariaItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  
  const [editingReport, setEditingReport] = useState<ReportItem | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')

  const [activeTab, setActiveTab] = useState<'operacionais' | 'mensal'>('operacionais')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [emailRecipient, setEmailRecipient] = useState<string>('')
  const [emailSendingStatus, setEmailSendingStatus] = useState<'idle' | 'consolidating' | 'compiling' | 'sending' | 'success' | 'error'>('idle')
  const [sendingProgress, setSendingProgress] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState<string>('')

  // Query Monthly System Report
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['monthly-system-report', selectedMonth, selectedYear],
    queryFn: async () => {
      // Start and end of the selected month
      const startOfMonth = new Date(selectedYear, selectedMonth, 1)
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999)

      const startIso = startOfMonth.toISOString()
      const endIso = endOfMonth.toISOString()

      // Fetch in parallel
      const [avariasRes, visitasRes, empresasRes, profilesRes, brindesRes, usuariosRes] = await Promise.all([
        supabase.from('relatorios_avarias')
          .select('id, numero, empresa, responsavel, data, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase.from('relatorios_visitas')
          .select('id, numero, empresa, responsavel, data, status, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase.from('empresas')
          .select('id, nome, responsavel, cnpj, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase.from('profiles')
          .select('id, full_name, email, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase.from('solicitacoes_brindes')
          .select('id, requester_name, brinde_tipo, quantidade, status, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase.from('usuarios').select('*')
      ])

      const avarias = avariasRes.data || []
      const visitas = visitasRes.data || []
      const empresasList = empresasRes.data || []
      const profilesList = profilesRes.data || []
      const brindesList = brindesRes.data || []
      const usuariosList = usuariosRes.data || []

      // Link profiles to users to get cargo
      const newUsers = profilesList.map(p => {
        const u = usuariosList.find(usr => usr.id === p.id)
        return {
          full_name: p.full_name || 'Sem nome',
          email: p.email || '',
          cargo: u?.cargo || 'funcionario'
        }
      })

      // Combine reports
      const combinedReports = [
        ...avarias.map(r => ({ ...r, tipo: 'avaria', status: 'Finalizado' })),
        ...visitas.map(r => ({ ...r, tipo: 'visita', status: r.status || 'Realizada' }))
      ]

      const totalAvarias = avarias.length
      const totalVisitas = visitas.length
      const totalEmpresas = empresasList.length
      const totalUsuarios = profilesList.length
      const totalBrindes = brindesList.length
      const totalBrindesItens = brindesList.reduce((acc, b) => acc + (b.quantidade || 0), 0)

      return {
        stats: {
          totalAvarias,
          totalVisitas,
          totalEmpresas,
          totalUsuarios,
          totalBrindes,
          totalBrindesItens
        },
        details: {
          recentCompanies: empresasList.map(e => ({ name: e.nome, responsavel: e.responsavel || '', created_at: e.created_at })),
          recentUsers: newUsers,
          recentReports: combinedReports.map(r => ({ numero: r.numero, empresa: r.empresa, responsavel: r.responsavel, tipo: r.tipo, status: r.status })),
          recentBrindes: brindesList.map(b => ({ requester_name: b.requester_name, brinde_tipo: b.brinde_tipo, quantidade: b.quantidade, status: b.status }))
        }
      }
    },
    enabled: activeTab === 'mensal'
  })

  // Months name array
  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  // Years array
  const years = Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => 2024 + i)

  // PDF download trigger helper
  const downloadMonthlyPDF = () => {
    if (!monthlyData) return
    generateMonthlySystemPDF({
      monthYear: `${monthsNames[selectedMonth]} / ${selectedYear}`,
      emailRecipient: emailRecipient || undefined,
      stats: monthlyData.stats,
      details: monthlyData.details
    })
  }

  // Simulated & Real Email Sending with EmailJS
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailRecipient.trim()) {
      showToast('Por favor, informe o e-mail do destinatário.', 'error')
      return
    }
    if (!monthlyData) return

    // Removemos os requisitos de chave do client-side pois isso roda no servidor
    setEmailSendingStatus('consolidating')
    setSendingProgress(10)
    setStatusMessage('Consolidando métricas do banco de dados...')

    await new Promise(resolve => setTimeout(resolve, 800))
    setEmailSendingStatus('compiling')
    setSendingProgress(40)
    setStatusMessage('Preparando dados para envio via Resend...')

    // No PDF generation needed for free tier (avoids 50KB payload limit)

    await new Promise(resolve => setTimeout(resolve, 800))
    setEmailSendingStatus('sending')
    setSendingProgress(75)
    setStatusMessage(`Enviando resumo via Resend para ${emailRecipient}...`)

    try {
      const templateParams = {
        to_email: emailRecipient,
        month_year: `${monthsNames[selectedMonth]} / ${selectedYear}`,
        stats_avarias: monthlyData.stats.totalAvarias,
        stats_visitas: monthlyData.stats.totalVisitas,
        stats_empresas: monthlyData.stats.totalEmpresas,
        stats_usuarios: monthlyData.stats.totalUsuarios,
        stats_brindes: `${monthlyData.stats.totalBrindes} (${monthlyData.stats.totalBrindesItens})`
      }

      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateParams)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar email')
      }

      setSendingProgress(100)

      const monthYearText = `${monthsNames[selectedMonth]} de ${selectedYear}`
      await supabase.from('notificacoes').insert({
        titulo: 'Relatório Mensal Enviado',
        mensagem: `O relatório geral do sistema referente a ${monthYearText} foi gerado e enviado para ${emailRecipient}.`,
        tipo: 'sucesso',
        lida: false
      })

      setEmailSendingStatus('success')
      setStatusMessage('E-mail enviado com sucesso!')
      showToast(`Relatório mensal enviado com sucesso para ${emailRecipient}!`, 'success')
      setEmailRecipient('') // Clear email input on success
    } catch (err: any) {
      console.error(err)
      setEmailSendingStatus('error')
      setStatusMessage('Erro ao disparar e-mail.')
      showToast('Erro ao concluir envio: ' + (err.text || err.message || err), 'error')
    }
  }

  // Query reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports-list'],
    queryFn: async () => {
      const [avariasRes, visitasRes] = await Promise.all([
        supabase.from('relatorios_avarias').select('*').order('created_at', { ascending: false }),
        supabase.from('relatorios_visitas').select('*').order('created_at', { ascending: false })
      ])

      const avarias = (avariasRes.data || []).map(r => ({
        ...r,
        tipo: 'avaria' as const,
        status: r.situacao || 'Finalizado' // Avarias mapping
      }))

      const visitas = (visitasRes.data || []).map(r => ({
        ...r,
        tipo: 'visita' as const,
        status: r.status || 'Realizada' // Visitas mapping
      }))

      // Combine and sort by date descending
      const combined: ReportItem[] = [...avarias, ...visitas].sort(
        (a, b) => new Date(b.created_at || b.data).getTime() - new Date(a.created_at || a.data).getTime()
      )

      return combined
    },
    refetchInterval: 10000 // Poll every 10 seconds for real-time live data updates
  })

  // Mutate Report Update
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; tipo: 'avaria' | 'visita'; status: string; observacoes: string }) => {
      if (payload.tipo === 'avaria') {
        const { error } = await supabase
          .from('relatorios_avarias')
          .update({ situacao: payload.status, observacoes: payload.observacoes })
          .eq('id', payload.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('relatorios_visitas')
          .update({ status: payload.status, observacoes: payload.observacoes })
          .eq('id', payload.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      showToast('Relatório atualizado com sucesso!', 'success')
      setEditingReport(null)
      queryClient.invalidateQueries({ queryKey: ['reports-list'] })
    },
    onError: (err: any) => {
      showToast('Erro ao atualizar: ' + err.message, 'error')
    }
  })

  // Fetch sub-items of an avaria report
  async function loadAvariaItems(reportId: string) {
    setLoadingItems(true)
    try {
      const { data, error } = await supabase
        .from('itens_relatorio_avaria')
        .select('*')
        .eq('relatorio_id', reportId)
      if (error) throw error
      setAvariaItems(data || [])
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao carregar itens de avarias: ' + e.message, 'error')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleOpenDetails = (report: ReportItem) => {
    setSelectedReport(report)
    if (report.tipo === 'avaria') {
      loadAvariaItems(report.id)
    } else {
      setAvariaItems([])
    }
  }

  const handleOpenEdit = (report: ReportItem) => {
    setEditingReport(report)
    setEditStatus(report.status)
    setEditObservacoes(report.observacoes || '')
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReport) return
    updateMutation.mutate({
      id: editingReport.id,
      tipo: editingReport.tipo,
      status: editStatus,
      observacoes: editObservacoes
    })
  }

  // Export PDF with shared generator
  const handleExportPDF = async (report: ReportItem) => {
    try {
      if (report.tipo === 'avaria') {
        let itemsToUse = []
        
        // If the items in state are not for this report or state is empty, fetch them directly
        if (!selectedReport || selectedReport.id !== report.id) {
          const { data, error } = await supabase
            .from('itens_relatorio_avaria')
            .select('material, quantidade, tipo_avaria')
            .eq('relatorio_id', report.id)
          
          if (error) throw error
          itemsToUse = (data || []).map(item => ({
            material: item.material,
            quantidade: item.quantidade,
            tipoAvaria: item.tipo_avaria
          }))
        } else {
          // Map state items to match PDFReportItem format
          itemsToUse = avariaItems.map(item => ({
            material: item.material,
            quantidade: item.quantidade,
            tipoAvaria: item.tipo_avaria
          }))
        }

        const totalItensCount = itemsToUse.reduce((acc, curr) => acc + curr.quantidade, 0)

        generateReportPDF({
          numero: report.numero,
          empresa: report.empresa,
          responsavel: report.responsavel,
          data: report.data,
          situacao: report.status,
          observacoes: report.observacoes || '',
          totalItens: totalItensCount,
          itens: itemsToUse as any
        })
      } else {
        generateVisitPDF({
          numero: report.numero,
          empresa: report.empresa,
          responsavel: report.responsavel,
          data: report.data,
          motivo: report.motivo || '',
          atividades: report.atividades || '',
          observacoes: report.observacoes || '',
          status: report.status
        })
      }
      showToast(`PDF do Relatório ${report.numero} exportado com sucesso!`, 'success')
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao exportar PDF: ' + e.message, 'error')
    }
  }

  // Share report link
  const handleShare = (report: ReportItem) => {
    const shareText = `*Do Mestre - Relatório ${report.numero}*\nEmpresa: ${report.empresa}\nResponsável: ${report.responsavel}\nTipo: ${report.tipo === 'avaria' ? 'Avaria' : 'Visita'}\nStatus: ${report.status}\nVisualizar detalhes no painel.`
    
    // Copy link
    const dummyUrl = `http://localhost:5174/relatorios?num=${report.numero}`
    navigator.clipboard.writeText(dummyUrl).then(() => {
      showToast('Link de acesso rápido copiado para a área de transferência!', 'success')
      // Open Whatsapp Web as option
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
      window.open(waUrl, '_blank')
    })
  }



  // Unique lists for Filter Options
  const empresasList = Array.from(new Set(reports.map(r => r.empresa)))
  const responsaveisList = Array.from(new Set(reports.map(r => r.responsavel)))

  // Filtering Logic
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.numero.toLowerCase().includes(search.toLowerCase()) ||
                          r.empresa.toLowerCase().includes(search.toLowerCase()) ||
                          r.responsavel.toLowerCase().includes(search.toLowerCase())
    
    const matchesEmpresa = selectedEmpresa === '' || r.empresa === selectedEmpresa
    const matchesResponsavel = selectedResponsavel === '' || r.responsavel === selectedResponsavel
    const matchesStatus = selectedStatus === '' || r.status.toLowerCase() === selectedStatus.toLowerCase()
    const matchesTipo = selectedTipo === '' || r.tipo === selectedTipo

    let matchesDate = true
    if (startDate) {
      matchesDate = matchesDate && new Date(r.created_at || r.data).getTime() >= new Date(startDate).getTime()
    }
    if (endDate) {
      // Set end date to end of day
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      matchesDate = matchesDate && new Date(r.created_at || r.data).getTime() <= endDateTime.getTime()
    }

    return matchesSearch && matchesEmpresa && matchesResponsavel && matchesStatus && matchesTipo && matchesDate
  })

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#E53935]">
              Operações
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#233A7A] flex items-center gap-2">
              <FileText className="text-[#233A7A]" /> 
              {activeTab === 'operacionais' ? 'Relatórios Operacionais' : 'Relatório Mensal Geral'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'operacionais' 
                ? 'Gerencie, filtre, exporte e edite os relatórios de avarias de sacarias e visitas comerciais.'
                : 'Monitore novos cadastros, consolide dados e envie resumos gerais do sistema diretamente para e-mails.'}
            </p>
          </div>
          {activeTab === 'operacionais' && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  if (filteredReports.length === 0) {
                    showToast('Não há relatórios para exportar.', 'info')
                    return
                  }
                  try {
                    generateConsolidatedReportsPDF(filteredReports.map(r => ({
                      numero: r.numero,
                      empresa: r.empresa,
                      tipo: r.tipo,
                      data: r.data,
                      responsavel: r.responsavel,
                      status: r.status
                    })))
                    showToast('Relatório consolidado exportado com sucesso!', 'success')
                  } catch (e: any) {
                    showToast('Erro ao exportar PDF: ' + e.message, 'error')
                  }
                }}
                style={{ backgroundImage: 'var(--gradient-accent)' }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl font-bold text-xs text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <Download size={14} />
                <span>Exportar PDF Consolidado</span>
              </button>
            </div>
          )}
        </header>

        {/* TABS BAR */}
        <div className="flex border-b border-slate-200 no-print">
          <button
            onClick={() => setActiveTab('operacionais')}
            className={`py-3 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'operacionais'
                ? 'border-[#E53935] text-[#233A7A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Relatórios Operacionais
          </button>
          <button
            onClick={() => setActiveTab('mensal')}
            className={`py-3 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'mensal'
                ? 'border-[#E53935] text-[#233A7A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Relatório Mensal Geral
          </button>
        </div>


        {activeTab === 'operacionais' && (
          <>
            {/* ========================================================
                FILTERS PANEL
                ======================================================== */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[var(--shadow-soft)] space-y-4 no-print">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-[#233A7A] flex items-center gap-1.5">
                  <Filter size={14} className="text-[#E53935]" /> Painel de Filtros Avançados
                </span>
                <button
                  onClick={() => {
                    setSearch('')
                    setSelectedEmpresa('')
                    setSelectedResponsavel('')
                    setSelectedStatus('')
                    setSelectedTipo('')
                    setStartDate('')
                    setEndDate('')
                    setSearchParams({})
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-[#E53935]"
                >
                  Limpar Filtros
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Search Input */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Busca Rápida
                  </span>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Número, empresa ou emissor"
                      className="input !pl-9"
                    />
                  </div>
                </label>

                {/* Filter Company */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Empresa
                  </span>
                  <select
                    value={selectedEmpresa}
                    onChange={e => setSelectedEmpresa(e.target.value)}
                    className="input cursor-pointer"
                  >
                    <option value="">Todas as Empresas</option>
                    {empresasList.map((emp, idx) => (
                      <option key={idx} value={emp}>{emp}</option>
                    ))}
                  </select>
                </label>

                {/* Filter Responsible */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Responsável Emissor
                  </span>
                  <select
                    value={selectedResponsavel}
                    onChange={e => setSelectedResponsavel(e.target.value)}
                    className="input cursor-pointer"
                  >
                    <option value="">Todos os Responsáveis</option>
                    {responsaveisList.map((resp, idx) => (
                      <option key={idx} value={resp}>{resp}</option>
                    ))}
                  </select>
                </label>

                {/* Filter Tipo */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tipo do Relatório
                  </span>
                  <select
                    value={selectedTipo}
                    onChange={e => setSelectedTipo(e.target.value)}
                    className="input cursor-pointer"
                  >
                    <option value="">Todos os Tipos</option>
                    <option value="avaria">Inspeção de Avarias</option>
                    <option value="visita">Visita a Filiais</option>
                  </select>
                </label>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                
                {/* Filter Start Date */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Data Inicial
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="input"
                  />
                </label>

                {/* Filter End Date */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Data Final
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="input"
                  />
                </label>

                {/* Filter Status */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Status / Situação
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="input cursor-pointer"
                  >
                    <option value="">Todos os Status</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Agendada">Agendada</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Finalizado">Finalizado / Em Aberto</option>
                  </select>
                </label>

              </div>

            </section>

            {/* ========================================================
                REPORTS TABLE
                ======================================================== */}
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
              {isLoading ? (
                <div className="flex items-center justify-center p-16 text-xs font-semibold text-slate-400">
                  <LoaderCircle className="animate-spin mr-2 text-[#E53935]" size={18} /> Carregando relatórios...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-16 text-center text-xs text-slate-400 space-y-2">
                  <Info size={24} className="mx-auto text-slate-300" />
                  <p className="font-bold">Nenhum relatório encontrado.</p>
                  <p>Tente redefinir os parâmetros de busca ou filtros.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                        <th className="p-4">Número</th>
                        <th className="p-4">Empresa</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Emissor</th>
                        <th className="p-4">Situação</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredReports.map(report => {
                        const isVisita = report.tipo === 'visita'
                        let statusColor = 'bg-blue-50 border-blue-100 text-blue-600'
                        if (report.status === 'Agendada') statusColor = 'bg-amber-50 border-amber-100 text-amber-600'
                        if (report.status === 'Realizada' || report.status === 'Finalizado') statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        if (report.status === 'Cancelada') statusColor = 'bg-rose-50 border-rose-100 text-rose-600'

                        return (
                          <tr key={`${report.tipo}-${report.id}`} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4 font-bold text-slate-800">
                              {report.numero}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <Building2 size={12} className="text-slate-400" />
                                {report.empresa}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider border ${
                                isVisita 
                                  ? 'bg-purple-50 border-purple-100 text-purple-600'
                                  : 'bg-rose-50 border-rose-100 text-[#E53935]'
                              }`}>
                                {isVisita ? 'Visita' : 'Avaria'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500">
                              {new Date(report.data).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <User size={12} className="text-slate-400" />
                                {report.responsavel}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 font-extrabold text-[9px] uppercase border ${statusColor}`}>
                                {report.status}
                              </span>
                            </td>
                            <td className="p-4 text-right no-print">
                              <div className="inline-flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenDetails(report)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                                  title="Visualizar Detalhes"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(report)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                                  title="Editar Status"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleExportPDF(report)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                                  title="Exportar PDF"
                                >
                                  <FileDown size={14} />
                                </button>
                                <button
                                  onClick={() => handleShare(report)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-[#E53935] hover:bg-rose-50 hover:border-rose-100 transition-colors cursor-pointer"
                                  title="Compartilhar WhatsApp"
                                >
                                  <Share2 size={14} />
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
          </>
        )}

        {/* ========================================================
            TAB: MONTHLY GENERAL REPORT
            ======================================================== */}
        {activeTab === 'mensal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* CONFIGURATION CARD */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[var(--shadow-soft)] no-print">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
                <Mail size={16} className="text-[#E53935]" />
                <span className="text-xs font-bold text-[#233A7A]">Configuração de Envio e Exportação</span>
              </div>

              <form onSubmit={handleSendEmail} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Month Dropdown */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Mês de Referência
                  </span>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="input cursor-pointer"
                  >
                    {monthsNames.map((name, idx) => (
                      <option key={idx} value={idx}>{name}</option>
                    ))}
                  </select>
                </label>

                {/* Year Dropdown */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Ano
                  </span>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="input cursor-pointer"
                  >
                    {years.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </label>

                {/* Email Recipient Input */}
                <label className="block md:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    E-mail do Destinatário
                  </span>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={emailRecipient}
                      onChange={e => setEmailRecipient(e.target.value)}
                      placeholder="exemplo@domestre.com"
                      className="input !pl-9"
                    />
                  </div>
                </label>

                {/* Action Buttons */}
                <div className="md:col-span-4 flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    style={{ backgroundImage: 'var(--gradient-accent)' }}
                    className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl font-bold text-xs text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Enviar Relatório por E-mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadMonthlyPDF}
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Visualizar / Baixar PDF</span>
                  </button>
                </div>
              </form>
            </section>

            {/* METRICS DASHBOARD SCOPED */}
            {isLoadingMonthly ? (
              <div className="flex items-center justify-center p-16 text-xs font-semibold text-slate-400">
                <LoaderCircle className="animate-spin mr-2 text-[#E53935]" size={18} /> Buscando dados do período...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card: Avarias */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-[#E53935] rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avarias</p>
                      <h3 className="text-xl font-extrabold text-[#233A7A] mt-0.5">{monthlyData?.stats.totalAvarias}</h3>
                    </div>
                  </div>

                  {/* Card: Visitas */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visitas</p>
                      <h3 className="text-xl font-extrabold text-[#233A7A] mt-0.5">{monthlyData?.stats.totalVisitas}</h3>
                    </div>
                  </div>

                  {/* Card: Novas Empresas */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Novas Empresas</p>
                      <h3 className="text-xl font-extrabold text-[#233A7A] mt-0.5">{monthlyData?.stats.totalEmpresas}</h3>
                    </div>
                  </div>

                  {/* Card: Novos Usuários */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Novos Usuários</p>
                      <h3 className="text-xl font-extrabold text-[#233A7A] mt-0.5">{monthlyData?.stats.totalUsuarios}</h3>
                    </div>
                  </div>

                  {/* Card: Brindes */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[var(--shadow-soft)] col-span-2 lg:col-span-1 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Download size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brindes (Itens)</p>
                      <h3 className="text-xl font-extrabold text-[#233A7A] mt-0.5">
                        {monthlyData?.stats.totalBrindes} ({monthlyData?.stats.totalBrindesItens})
                      </h3>
                    </div>
                  </div>
                </div>

                {/* PREVIEW DETAILS ACCORDION/LISTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Box 1: Novas Empresas */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] p-5 space-y-4">
                    <h3 className="text-xs font-bold text-[#233A7A] border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span>Novas Empresas Cadastradas</span>
                      <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {monthlyData?.details.recentCompanies.length}
                      </span>
                    </h3>
                    {monthlyData?.details.recentCompanies.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">Nenhuma nova empresa cadastrada.</p>
                    ) : (
                      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-50 text-xs">
                        {monthlyData?.details.recentCompanies.map((c, i) => (
                          <div key={i} className="py-2.5 flex justify-between items-center hover:bg-slate-50/50 px-1 rounded-lg">
                            <span className="font-semibold text-slate-700">{c.name}</span>
                            <span className="text-slate-400 text-[10px]">Resp: {c.responsavel || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Box 2: Novos Usuários */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] p-5 space-y-4">
                    <h3 className="text-xs font-bold text-[#233A7A] border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span>Novos Usuários Registrados</span>
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {monthlyData?.details.recentUsers.length}
                      </span>
                    </h3>
                    {monthlyData?.details.recentUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum novo usuário cadastrado.</p>
                    ) : (
                      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-50 text-xs">
                        {monthlyData?.details.recentUsers.map((u, i) => (
                          <div key={i} className="py-2.5 flex justify-between items-center hover:bg-slate-50/50 px-1 rounded-lg">
                            <div>
                              <p className="font-semibold text-slate-700">{u.full_name}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md">
                              {u.cargo}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Box 3: Relatórios Operacionais */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] p-5 space-y-4">
                    <h3 className="text-xs font-bold text-[#233A7A] border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span>Relatórios de Atividades</span>
                      <span className="bg-purple-50 text-purple-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {monthlyData?.details.recentReports.length}
                      </span>
                    </h3>
                    {monthlyData?.details.recentReports.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum relatório cadastrado.</p>
                    ) : (
                      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-50 text-xs">
                        {monthlyData?.details.recentReports.map((r, i) => (
                          <div key={i} className="py-2.5 flex justify-between items-center hover:bg-slate-50/50 px-1 rounded-lg">
                            <div>
                              <p className="font-semibold text-slate-700">{r.numero} - {r.empresa}</p>
                              <p className="text-[10px] text-slate-400">Emissor: {r.responsavel}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                              r.tipo === 'avaria'
                                ? 'bg-red-50 border-red-100 text-[#E53935]'
                                : 'bg-purple-50 border-purple-100 text-purple-600'
                            }`}>
                              {r.tipo === 'avaria' ? 'Avaria' : 'Visita'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Box 4: Solicitações de Brindes */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] p-5 space-y-4">
                    <h3 className="text-xs font-bold text-[#233A7A] border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span>Solicitações de Brindes</span>
                      <span className="bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {monthlyData?.details.recentBrindes.length}
                      </span>
                    </h3>
                    {monthlyData?.details.recentBrindes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">Nenhuma solicitação de brinde.</p>
                    ) : (
                      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-50 text-xs">
                        {monthlyData?.details.recentBrindes.map((b, i) => (
                          <div key={i} className="py-2.5 flex justify-between items-center hover:bg-slate-50/50 px-1 rounded-lg">
                            <div>
                              <p className="font-semibold text-slate-700">{b.brinde_tipo}</p>
                              <p className="text-[10px] text-slate-400">Por: {b.requester_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#233A7A]">{b.quantidade} un.</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{b.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================
            MODAL: EMAIL SENDING SIMULATOR
            ======================================================== */}
        {emailSendingStatus !== 'idle' && (
          <div className="fixed inset-0 z-[250] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
                
                {/* Header */}
                <div className="text-center">
                  <Mail size={32} className="mx-auto text-[#233A7A] animate-bounce" />
                  <h3 className="mt-3 text-base font-bold text-[#233A7A]">
                    Enviando Relatório Mensal Geral
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Preparando e-mail para processamento no servidor...
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-extrabold text-slate-500 uppercase">
                    <span>Progresso</span>
                    <span>{sendingProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E53935] to-[#ef5350] transition-all duration-300"
                      style={{ width: `${sendingProgress}%` }}
                    />
                  </div>
                </div>

                {/* Simulated steps */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 text-xs font-semibold text-slate-600">
                  
                  {/* Step 1 */}
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center border text-[9px] shrink-0 font-bold border-slate-200">
                      {sendingProgress > 10 ? (
                        <span className="text-emerald-500 font-extrabold">✓</span>
                      ) : emailSendingStatus === 'consolidating' ? (
                        <LoaderCircle className="animate-spin text-slate-400" size={10} />
                      ) : (
                        <span>1</span>
                      )}
                    </div>
                    <span className={sendingProgress > 10 ? 'text-slate-400 line-through' : ''}>
                      Consolidando métricas do banco de dados
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center border text-[9px] shrink-0 font-bold border-slate-200">
                      {sendingProgress > 40 ? (
                        <span className="text-emerald-500 font-extrabold">✓</span>
                      ) : emailSendingStatus === 'compiling' ? (
                        <LoaderCircle className="animate-spin text-slate-400" size={10} />
                      ) : (
                        <span>2</span>
                      )}
                    </div>
                    <span className={sendingProgress > 40 ? 'text-slate-400 line-through' : ''}>
                      Formatando relatório e gerando anexo PDF
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center border text-[9px] shrink-0 font-bold border-slate-200">
                      {sendingProgress > 75 ? (
                        <span className="text-emerald-500 font-extrabold">✓</span>
                      ) : emailSendingStatus === 'sending' ? (
                        <LoaderCircle className="animate-spin text-slate-400" size={10} />
                      ) : (
                        <span>3</span>
                      )}
                    </div>
                    <span className={sendingProgress > 75 ? 'text-slate-400 line-through' : ''}>
                      Disparando e-mail para gateway smtp
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center border text-[9px] shrink-0 font-bold border-slate-200">
                      {sendingProgress === 100 ? (
                        <span className="text-emerald-500 font-extrabold">✓</span>
                      ) : (
                        <span>4</span>
                      )}
                    </div>
                    <span className={sendingProgress === 100 ? 'text-slate-800' : 'text-slate-400'}>
                      Envio concluído e registrado no sistema
                    </span>
                  </div>

                </div>

                {/* Status Message Text */}
                <p className="text-[11px] font-bold text-center text-[#233A7A]">
                  {statusMessage}
                </p>

                {/* Close button */}
                {emailSendingStatus === 'success' && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setEmailSendingStatus('idle')}
                      style={{ backgroundImage: 'var(--gradient-accent)' }}
                      className="w-full h-10 rounded-xl font-bold text-xs text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                      Fechar Janela
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: DETAILS VIEW
            ======================================================== */}
        {selectedReport && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 shrink-0">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Detalhes do Registro</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Relatório {selectedReport.numero}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-4 space-y-5 text-slate-600 text-xs">
                
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Empresa Atendida</span>
                    <span className="font-bold text-slate-800">{selectedReport.empresa}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Responsável</span>
                    <span className="font-bold text-slate-800">{selectedReport.responsavel}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Data do Registro</span>
                    <span>{new Date(selectedReport.data).toLocaleString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Tipo do Relatório</span>
                    <span className="capitalize font-bold text-[#233A7A]">{selectedReport.tipo}</span>
                  </div>
                </div>

                {/* Specific details for VISITA */}
                {selectedReport.tipo === 'visita' && (
                  <>
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Motivo / Assunto</span>
                      <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-semibold text-slate-700">
                        {selectedReport.motivo || 'Nenhum motivo registrado.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Atividades Realizadas</span>
                      <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-line text-slate-700">
                        {selectedReport.atividades || 'Nenhuma atividade registrada.'}
                      </p>
                    </div>
                  </>
                )}

                {/* Specific details for AVARIA */}
                {selectedReport.tipo === 'avaria' && (
                  <div className="space-y-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Materiais Avariados Detectados</span>
                    {loadingItems ? (
                      <div className="flex justify-center py-6 text-slate-400">
                        <LoaderCircle className="animate-spin mr-2" size={14} /> Carregando itens...
                      </div>
                    ) : avariaItems.length === 0 ? (
                      <p className="text-slate-400 italic">Nenhum item registrado para esta avaria.</p>
                    ) : (
                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400">
                              <th className="p-2.5">Material</th>
                              <th className="p-2.5">Quantidade</th>
                              <th className="p-2.5">Tipo de Avaria</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                            {avariaItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/20">
                                <td className="p-2.5">{item.material}</td>
                                <td className="p-2.5 font-bold text-[#233A7A]">{item.quantidade}</td>
                                <td className="p-2.5 text-slate-500">{item.tipo_avaria || 'Umidificação / Sacaria Rasgada'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Observations */}
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Observações Administrativas</span>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed text-slate-700">
                    {selectedReport.observacoes || 'Nenhuma observação cadastrada.'}
                  </p>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end shrink-0">
                <button
                  onClick={() => handleExportPDF(selectedReport)}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 font-bold cursor-pointer"
                >
                  <Download size={14} /> Exportar PDF
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{ backgroundImage: 'var(--gradient-accent)' }}
                  className="h-10 px-6 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: EDIT STATUS
            ======================================================== */}
        {editingReport && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E53935]">Alterar Situação</span>
                  <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                    Editar Relatório {editingReport.numero}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingReport(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                
                {/* Status selection */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Situação Atual
                  </span>
                  {editingReport.tipo === 'avaria' ? (
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="input cursor-pointer"
                    >
                      <option value="Finalizado">Finalizado / Resolvido</option>
                      <option value="Em Aberto">Em Aberto / Análise</option>
                    </select>
                  ) : (
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="input cursor-pointer"
                    >
                      <option value="Realizada">Realizada</option>
                      <option value="Agendada">Agendada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  )}
                </label>

                {/* Observations */}
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Observações e Notas
                  </span>
                  <textarea
                    value={editObservacoes}
                    onChange={e => setEditObservacoes(e.target.value)}
                    rows={4}
                    placeholder="Adicione observações administrativas..."
                    className="input h-auto py-2.5"
                  />
                </label>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingReport(null)}
                    disabled={updateMutation.isPending}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    style={{ backgroundImage: 'var(--gradient-accent)' }}
                    className="h-10 px-5 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {updateMutation.isPending ? (
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

      </div>
    </Layout>
  )
}
export default Relatorios
