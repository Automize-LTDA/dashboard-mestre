import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Layout } from '../components/Layout'
import { useToast } from '../context/ToastContext'
import { generatePromotersReportPDF, generateSinglePromoterReportPDF } from '../utils/pdfGenerator'
import { 
  Users, 
  Search, 
  TrendingUp, 
  FileText, 
  Building2, 
  Calendar, 
  Eye, 
  ArrowRight, 
  X, 
  Award,
  ChevronRight,
  LoaderCircle
} from 'lucide-react'

interface PromoterStatItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  avariasCount: number
  visitasCount: number
  totalCount: number
  currentMonthCount: number
  lastActivity: string | null
  reports: Array<{
    id: string
    numero: string
    empresa: string
    data: string
    tipo: 'avaria' | 'visita'
    status: string
    observacoes: string
  }>
}

const MONTHLY_GOAL = 20

export const Promotores: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPromoterId, setSelectedPromoterId] = useState<string | null>(null)
  const [viewingReport, setViewingReport] = useState<any | null>(null)
  const [viewingReportItems, setViewingReportItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Fetch promoter performance and activity list
  const { data: promotersData = [], isLoading } = useQuery({
    queryKey: ['promoters-management-stats'],
    queryFn: async () => {
      // 1. Fetch tables in parallel
      const [profilesRes, rolesRes, avariasRes, visitasRes, usuariosRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('relatorios_avarias').select('*').order('created_at', { ascending: false }),
        supabase.from('relatorios_visitas').select('*').order('created_at', { ascending: false }),
        supabase.from('usuarios').select('id, telefone, empresa')
      ])

      const profiles = profilesRes.data || []
      const roles = rolesRes.data || []
      const avariasList = avariasRes.data || []
      const visitasList = visitasRes.data || []
      const usuariosList = usuariosRes.data || []

      const roleMap = new Map<string, string>()
      roles.forEach(r => roleMap.set(r.user_id, r.role))

      const userMap = new Map<string, any>()
      usuariosList.forEach(u => userMap.set(u.id, u))

      // 2. Filter profiles with role === 'promotor' and map their stats
      const mapped: PromoterStatItem[] = profiles
        .filter(p => roleMap.get(p.id) === 'promotor')
        .map(p => {
          const u = userMap.get(p.id) || {}
          
          // Filter avarias and visitas for this user (created_by or name match)
          const userAvarias = avariasList.filter(av => 
            av.created_by === p.id || 
            (av.responsavel && p.full_name && av.responsavel.toLowerCase() === p.full_name.toLowerCase())
          )

          const userVisitas = visitasList.filter(vis => 
            vis.created_by === p.id || 
            (vis.responsavel && p.full_name && vis.responsavel.toLowerCase() === p.full_name.toLowerCase())
          )

          // Compile reports list
          const combinedReports = [
            ...userAvarias.map(r => ({
              id: r.id,
              numero: r.numero,
              empresa: r.empresa,
              data: r.data,
              tipo: 'avaria' as const,
              status: r.situacao || 'Finalizado',
              observacoes: r.observacoes || ''
            })),
            ...userVisitas.map(r => ({
              id: r.id,
              numero: r.numero,
              empresa: r.empresa,
              data: r.data,
              tipo: 'visita' as const,
              status: r.status || 'Realizada',
              observacoes: r.observacoes || ''
            }))
          ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

          // Calculate current month reports count for the goal
          const currentMonth = new Date().getMonth()
          const currentYear = new Date().getFullYear()
          const currentMonthCount = combinedReports.filter(r => {
            const reportDate = new Date(r.data)
            return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear
          }).length

          let lastActivity: string | null = null
          if (combinedReports.length > 0) {
            lastActivity = new Date(combinedReports[0].data).toLocaleDateString('pt-BR')
          }

          return {
            id: p.id,
            name: p.full_name || p.email?.split('@')[0] || 'Sem nome',
            email: p.email,
            phone: u.telefone || null,
            avariasCount: userAvarias.length,
            visitasCount: userVisitas.length,
            totalCount: userAvarias.length + userVisitas.length,
            currentMonthCount,
            lastActivity,
            reports: combinedReports
          }
        })
        .sort((a, b) => b.totalCount - a.totalCount)

      return mapped
    },
    refetchInterval: 10000 // Realtime sync every 10s
  })

  // Load items if viewing report details of type Avaria
  async function loadReportAvariaItems(reportId: string) {
    setViewingReportItems([])
    setLoadingItems(true)
    try {
      const { data, error } = await supabase
        .from('itens_relatorio_avaria')
        .select('*')
        .eq('relatorio_id', reportId)
      if (error) throw error
      setViewingReportItems(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingItems(false)
    }
  }

  const handleOpenReportDetails = (report: any) => {
    setViewingReport(report)
    if (report.tipo === 'avaria') {
      loadReportAvariaItems(report.id)
    } else {
      setViewingReportItems([])
    }
  }

  const handleExportPromotersPDF = () => {
    try {
      generatePromotersReportPDF(filteredPromoters as any)
      showToast('PDF dos Promotores exportado com sucesso!', 'success')
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao exportar PDF: ' + e.message, 'error')
    }
  }

  const handleExportSinglePromoterPDF = (promoter: PromoterStatItem) => {
    try {
      generateSinglePromoterReportPDF(promoter as any)
      showToast(`PDF do promotor ${promoter.name} exportado com sucesso!`, 'success')
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao exportar PDF: ' + e.message, 'error')
    }
  }

  // Filter promoters list
  const filteredPromoters = promotersData.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const selectedPromoter = promotersData.find(p => p.id === selectedPromoterId)

  // Compute metrics totals
  const totalPromoters = promotersData.length
  const totalAvarias = promotersData.reduce((acc, p) => acc + p.avariasCount, 0)
  const totalVisitas = promotersData.reduce((acc, p) => acc + p.visitasCount, 0)
  const totalReports = totalAvarias + totalVisitas

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#E53935]">
              Operacional
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#233A7A] flex items-center gap-2">
              <Users className="text-[#233A7A]" /> Controle de Promotores
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitore o desempenho, a quantidade de relatórios gerados e a atividade em tempo real de cada promotor.
            </p>
          </div>
          <button
            onClick={handleExportPromotersPDF}
            className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:shadow"
          >
            <FileText size={15} className="text-[#E53935]" /> Exportar PDF Geral
          </button>
        </header>

        {/* METRICS CARDS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-extrabold">Total Promotores</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{isLoading ? '...' : totalPromoters}</div>
            </div>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
            <div className="h-10 w-10 bg-rose-50 text-[#E53935] rounded-xl flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-extrabold">Relatórios Avaria</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{isLoading ? '...' : totalAvarias}</div>
            </div>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
            <div className="h-10 w-10 bg-blue-50 text-[#233A7A] rounded-xl flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-extrabold">Visitas Realizadas</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{isLoading ? '...' : totalVisitas}</div>
            </div>
          </div>

          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-[var(--shadow-soft)] flex items-center gap-4">
            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-extrabold">Soma Geral</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{isLoading ? '...' : totalReports}</div>
            </div>
          </div>
        </section>

        {/* MAIN SPLIT VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT: PROMOTERS LIST */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-[var(--shadow-soft)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-[#233A7A] uppercase tracking-wider font-display">
                Listagem de Promotores
              </h2>
              
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar promotor..."
                  className="input h-9 !pl-9 text-xs"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-xs font-semibold text-slate-400">
                <LoaderCircle className="animate-spin mr-2 text-[#E53935]" size={16} /> Carregando promotores...
              </div>
            ) : filteredPromoters.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 font-semibold">
                Nenhum promotor encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                      <th className="p-3">Promotor</th>
                      <th className="p-3 text-center">Avarias</th>
                      <th className="p-3 text-center">Visitas</th>
                      <th className="p-3 text-center font-bold text-slate-500">Total</th>
                      <th className="p-3 text-center">Meta do Mês</th>
                      <th className="p-3">Última Atividade</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredPromoters.map(item => {
                      const isSelected = item.id === selectedPromoterId
                      return (
                        <tr 
                          key={item.id} 
                          className={`transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-50/40 hover:bg-blue-50/60 font-semibold' 
                              : 'hover:bg-slate-50/50'
                          }`}
                          onClick={() => setSelectedPromoterId(item.id)}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{item.name}</div>
                            <div className="text-[9px] text-slate-400 font-normal">{item.email}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="bg-rose-50 text-[#E53935] px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {item.avariasCount}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="bg-blue-50 text-[#233A7A] px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {item.visitasCount}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">{item.totalCount}</td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-700">
                                {item.currentMonthCount} / {MONTHLY_GOAL}
                              </span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    item.currentMonthCount >= MONTHLY_GOAL ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`} 
                                  style={{ width: `${Math.min(100, (item.currentMonthCount / MONTHLY_GOAL) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[10px]">{item.lastActivity || 'Sem registros'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedPromoterId(item.id)
                              }}
                              className={`h-7 w-7 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#233A7A] border-[#233A7A] text-white'
                                  : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT: PROMOTER ACTIVITY LIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[var(--shadow-soft)] min-h-[350px]">
            {!selectedPromoter ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                <div className="h-12 w-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center border border-slate-100">
                  <Eye size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-600">Nenhum promotor selecionado</p>
                  <p className="text-[10px] max-w-[200px]">Clique em um promotor na lista ao lado para verificar seu histórico de emissão de relatórios.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-md">
                      Histórico Técnico
                    </span>
                    <h3 className="text-base font-bold text-[#233A7A] font-display mt-1.5">
                      {selectedPromoter.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {selectedPromoter.phone ? `Contato: ${selectedPromoter.phone}` : 'Sem telefone cadastrado'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportSinglePromoterPDF(selectedPromoter)}
                    title="Exportar PDF do Promotor"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <FileText size={12} className="text-[#E53935]" /> PDF
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-slate-400">Avarias</span>
                    <span className="text-sm font-extrabold text-[#E53935]">{selectedPromoter.avariasCount}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-slate-400">Visitas</span>
                    <span className="text-sm font-extrabold text-[#233A7A]">{selectedPromoter.visitasCount}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-slate-400">Total</span>
                    <span className="text-sm font-extrabold text-slate-800">{selectedPromoter.totalCount}</span>
                  </div>
                </div>

                {/* META MENSAL */}
                <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#233A7A]">Meta Mensal (Mês Atual)</span>
                    <span className={`font-bold text-[9px] uppercase px-1.5 py-0.5 rounded ${
                      selectedPromoter.currentMonthCount >= MONTHLY_GOAL 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {selectedPromoter.currentMonthCount >= MONTHLY_GOAL ? 'Atingida 🎉' : 'Pendente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progresso: {selectedPromoter.currentMonthCount} de {MONTHLY_GOAL} relatórios</span>
                    <span className="font-mono font-bold">{Math.round((selectedPromoter.currentMonthCount / MONTHLY_GOAL) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300/30">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedPromoter.currentMonthCount >= MONTHLY_GOAL ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} 
                      style={{ width: `${Math.min(100, (selectedPromoter.currentMonthCount / MONTHLY_GOAL) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Relatórios Recentes</h4>
                  
                  {selectedPromoter.reports.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-medium italic text-center py-4">Este promotor ainda não gerou nenhum relatório.</p>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {selectedPromoter.reports.map(report => {
                        const isAvaria = report.tipo === 'avaria'
                        return (
                          <div 
                            key={report.id}
                            onClick={() => handleOpenReportDetails(report)}
                            className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all cursor-pointer flex justify-between items-center group"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold font-mono ${isAvaria ? 'text-[#E53935]' : 'text-[#233A7A]'}`}>
                                  {report.numero}
                                </span>
                                <span className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded border ${
                                  isAvaria 
                                    ? 'bg-rose-50 border-rose-100 text-[#E53935]' 
                                    : 'bg-blue-50 border-blue-100 text-[#233A7A]'
                                }`}>
                                  {isAvaria ? 'Avaria' : 'Visita'}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-700 truncate">{report.empresa}</p>
                              <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                                <span className="flex items-center gap-0.5"><Calendar size={10} /> {new Date(report.data).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                            <ChevronRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================
            MODAL: REPORT QUICK DETAILS VIEW
            ======================================================== */}
        {viewingReport && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                
                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${viewingReport.tipo === 'avaria' ? 'text-[#E53935]' : 'text-[#233A7A]'}`}>
                      Detalhes Rápidos · {viewingReport.tipo === 'avaria' ? 'Relatório de Avaria' : 'Relatório de Visita'}
                    </span>
                    <h3 className="text-lg font-bold text-[#233A7A] font-display flex items-center gap-2 mt-1">
                      Nº {viewingReport.numero}
                    </h3>
                  </div>
                  <button
                    onClick={() => setViewingReport(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-xs font-semibold text-slate-500">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 border border-slate-200/60 rounded-xl">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400 font-bold">Empresa Atendida</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1 mt-0.5">
                        <Building2 size={13} className="text-[#233A7A]" /> {viewingReport.empresa}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400 font-bold">Data de Emissão</span>
                      <span className="text-slate-800 font-medium flex items-center gap-1 mt-0.5">
                        <Calendar size={13} className="text-[#E53935]" /> {new Date(viewingReport.data).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] uppercase text-slate-400 font-bold">Status do Relatório</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[9px] uppercase border mt-1 ${
                          viewingReport.status === 'Realizada' || viewingReport.status === 'Finalizado'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                            : 'bg-amber-50 border-amber-100 text-amber-600'
                        }`}>
                          {viewingReport.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {viewingReport.tipo === 'avaria' && (
                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase text-slate-400 font-extrabold">Itens Avariados Registrados</span>
                      {loadingItems ? (
                        <div className="text-center py-4 text-slate-400">
                          <LoaderCircle className="animate-spin inline mr-1" size={12} /> Carregando itens...
                        </div>
                      ) : viewingReportItems.length === 0 ? (
                        <p className="italic text-slate-400">Nenhum item listado.</p>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                                <th className="p-2.5">Material</th>
                                <th className="p-2.5 text-center w-20">Qtd</th>
                                <th className="p-2.5">Tipo de Avaria</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {viewingReportItems.map(item => (
                                <tr key={item.id}>
                                  <td className="p-2.5 font-bold">{item.material}</td>
                                  <td className="p-2.5 text-center font-mono font-bold text-slate-900">{item.quantidade}</td>
                                  <td className="p-2.5 text-slate-500">{item.tipo_avaria || 'Não especificado'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {viewingReport.observacoes && (
                    <div className="space-y-1 bg-slate-50 p-3 border border-slate-200/60 rounded-xl">
                      <span className="block text-[10px] uppercase text-slate-400 font-bold">Observações / Atividades</span>
                      <p className="text-slate-600 font-medium leading-normal whitespace-pre-line text-[11px]">
                        {viewingReport.observacoes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setViewingReport(null)}
                      className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 font-bold cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={() => {
                        setViewingReport(null)
                        navigate(`/relatorios?search=${viewingReport.numero}`)
                      }}
                      style={{ backgroundImage: 'var(--gradient-accent)' }}
                      className="h-10 px-5 rounded-xl font-bold text-white shadow-md hover:scale-[1.02] transition-transform inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Ver no Módulo de Relatórios <ArrowRight size={14} />
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
export default Promotores
