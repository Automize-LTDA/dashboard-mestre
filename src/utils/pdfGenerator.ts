import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '../assets/logo.png'

// Type definitions for the pdf generator
interface PDFReportItem {
  material: string
  quantidade: number
  tipoAvaria: string
}

interface PDFReportData {
  numero: string
  empresa: string
  responsavel: string
  data: string
  situacao: string
  observacoes: string
  totalItens: number
  itens: PDFReportItem[]
}

interface PDFVisitData {
  numero: string
  empresa: string
  responsavel: string
  data: string
  motivo: string
  atividades: string
  observacoes: string
  status: string
}

export interface PDFPromoterReportItem {
  id: string
  numero: string
  empresa: string
  data: string
  tipo: 'avaria' | 'visita'
  status: string
  observacoes: string
}

export interface PDFPromoterStatItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  avariasCount: number
  visitasCount: number
  totalCount: number
  currentMonthCount: number
  lastActivity: string | null
  reports: PDFPromoterReportItem[]
}

// 1. Generate PDF for Avarias
export function generateReportPDF(data: PDFReportData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO DE CONTROLE DE AVARIAS', width - margin, 50, { align: 'right' })

  // Report Number
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Nº ${data.numero}`, width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // Report details metadata
  let y = 120
  doc.setTextColor(20)
  doc.setFontSize(11)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Empresa atendida:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.empresa || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Responsável:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.responsavel || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Data:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), margin + 130, y)

  y += 24

  // Items table
  autoTable(doc, {
    startY: y,
    head: [['Material', 'Quantidade', 'Tipo de Avaria']],
    body: data.itens.map(item => [item.material, String(item.quantidade), item.tipoAvaria || '—']),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 8 },
    margin: { left: margin, right: margin }
  })

  // Table summary info - Styled Dashboard-like Cards
  let finalY = (doc as any).lastAutoTable.finalY + 20
  const printableWidth = width - margin * 2

  // Summary Container Box
  doc.setFillColor(245, 246, 248)
  doc.roundedRect(margin, finalY, printableWidth, 45, 4, 4, 'F')

  // Total de itens card column
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('TOTAL DE ITENS', margin + 15, finalY + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99)
  doc.text(String(data.itens.length), margin + 15, finalY + 36)

  // Divider line
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(1)
  doc.line(margin + printableWidth / 2, finalY + 10, margin + printableWidth / 2, finalY + 35)

  // Soma das quantidades card column
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('SOMA DAS QUANTIDADES', margin + printableWidth / 2 + 20, finalY + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99)
  doc.text(String(data.totalItens), margin + printableWidth / 2 + 20, finalY + 36)

  finalY += 65

  // Observations block - Styled Premium Callout Box
  const obsText = data.observacoes ? data.observacoes.trim() : 'Nenhuma observação registrada.'
  const obsLines = doc.splitTextToSize(obsText, printableWidth - 30)
  const boxHeight = 25 + obsLines.length * 14 + 15

  // Draw background
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(margin, finalY, printableWidth, boxHeight, 4, 4, 'F')

  // Left red accent bar
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(3)
  doc.line(margin, finalY, margin, finalY + boxHeight)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(180, 30, 30)
  doc.text('OBSERVAÇÕES', margin + 15, finalY + 18)

  // Text content
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  doc.text(obsLines, margin + 15, finalY + 32)

  // Signature Block
  const sigY = height - 100
  const sigWidth = 240
  const sigStartX = (width - sigWidth) / 2
  doc.setDrawColor(120)
  doc.setLineWidth(0.5)
  doc.line(sigStartX, sigY, sigStartX + sigWidth, sigY)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Assinatura do Responsável', width / 2, sigY + 14, { align: 'center' })

  // Footer metadata
  doc.setFontSize(8)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF file
  doc.save(`Relatorio-${data.numero}.pdf`)
}

// 2. Generate PDF for Visitas
export function generateVisitPDF(data: PDFVisitData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO DE VISITA TÉCNICA / COMERCIAL', width - margin, 50, { align: 'right' })

  // Report Number
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Nº ${data.numero}`, width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // Report details metadata
  let y = 120
  doc.setTextColor(20)
  doc.setFontSize(11)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Cliente / Empresa:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.empresa || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Responsável:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.responsavel || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Data da Visita:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), margin + 130, y)

  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.status || '-', margin + 130, y)

  // Parse structured JSON if available
  let structured: any = null
  if (data.observacoes) {
    try {
      const parsed = JSON.parse(data.observacoes)
      if (parsed && typeof parsed === 'object' && ('horarioChegada' in parsed || 'pontoExtra' in parsed)) {
        structured = parsed
      }
    } catch (e) {}
  }

  if (structured) {
    // Render local/city info
    y += 18
    doc.setFont('helvetica', 'bold')
    doc.text('Cidade / Bairro:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(data.motivo || '-', margin + 130, y)

    y += 35

    // Checklist table
    const tableBody = [
      ['Horário de Chegada', structured.horarioChegada || '-'],
      ['Horário de Saída', structured.horarioSaida || '-'],
      ['Ponto Extra', structured.pontoExtra || '-'],
      ['Tipo de Ponto Extra', Array.isArray(structured.tipoPontoExtra) ? structured.tipoPontoExtra.join(', ') + (structured.tipoPontoExtraOutro ? ` (${structured.tipoPontoExtraOutro})` : '') : (structured.tipoPontoExtra || '-')],
      ['Materiais Positivados (Merchan)', Array.isArray(structured.materiaisPositivados) ? structured.materiaisPositivados.join(', ') + (structured.materiaisPositivadosOutro ? ` (${structured.materiaisPositivadosOutro})` : '') : (structured.materiaisPositivados || '-')],
      ['Preço', Array.isArray(structured.preco) ? structured.preco.join(', ') : (structured.preco || '-')],
      ['Situação do Estoque', structured.situacaoEstoque || '-'],
      ['Ruptura', structured.ruptura || '-']
    ]

    autoTable(doc, {
      startY: y,
      head: [['Campo de Verificação', 'Resposta']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 8 },
      margin: { left: margin, right: margin }
    })
  } else {
    y += 35

    // Reason
    doc.setFont('helvetica', 'bold')
    doc.text('Motivo / Assunto Principal:', margin, y)
    doc.setFont('helvetica', 'normal')
    const motivoLines = doc.splitTextToSize(data.motivo || '-', width - margin * 2)
    doc.text(motivoLines, margin, y + 16)

    y += 16 + motivoLines.length * 14 + 20

    // Activities
    doc.setFont('helvetica', 'bold')
    doc.text('Atividades Realizadas:', margin, y)
    doc.setFont('helvetica', 'normal')
    const atividadesLines = doc.splitTextToSize(data.atividades || '-', width - margin * 2)
    doc.text(atividadesLines, margin, y + 16)

    y += 16 + atividadesLines.length * 14 + 20

    // Observations block - Styled Premium Callout Box
    const printableWidth = width - margin * 2
    const obsText = data.observacoes ? data.observacoes.trim() : 'Nenhuma observação ou próximo passo registrado.'
    const obsLines = doc.splitTextToSize(obsText, printableWidth - 30)
    const boxHeight = 25 + obsLines.length * 14 + 15

    // Draw background
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(margin, y, printableWidth, boxHeight, 4, 4, 'F')

    // Left red accent bar
    doc.setDrawColor(180, 30, 30)
    doc.setLineWidth(3)
    doc.line(margin, y, margin, y + boxHeight)

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(180, 30, 30)
    doc.text('OBSERVAÇÕES / PRÓXIMOS PASSOS', margin + 15, y + 18)

    // Text content
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    doc.text(obsLines, margin + 15, y + 32)
  }

  // Signature Block
  const sigY = height - 100
  const sigWidth = 240
  const sigStartX = (width - sigWidth) / 2
  doc.setDrawColor(120)
  doc.setLineWidth(0.5)
  doc.line(sigStartX, sigY, sigStartX + sigWidth, sigY)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Assinatura do Responsável', width / 2, sigY + 14, { align: 'center' })

  // Footer metadata
  doc.setFontSize(8)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF file
  doc.save(`Visita-${data.numero}.pdf`)
}

// 3. Generate PDF for Promoters General Performance
export function generatePromotersReportPDF(promoters: PDFPromoterStatItem[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO DE DESEMPENHO DOS PROMOTORES', width - margin, 50, { align: 'right' })

  // Report details
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // Table using autoTable
  const tableBody = promoters.map(p => [
    p.name,
    p.avariasCount.toString(),
    p.visitasCount.toString(),
    p.totalCount.toString(),
    p.lastActivity || 'Sem registros'
  ])

  autoTable(doc, {
    startY: 120,
    head: [['Promotor', 'Avarias', 'Visitas', 'Total Geral', 'Última Atividade']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 8 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  })

  // Footer metadata
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF
  doc.save('Relatorio_Geral_Promotores.pdf')
}

// 4. Generate PDF for Single Promoter Performance
export function generateSinglePromoterReportPDF(promoter: PDFPromoterStatItem) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO INDIVIDUAL DE PROMOTOR', width - margin, 50, { align: 'right' })

  // Subtitle
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Promotor: ${promoter.name}`, width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // Metadata Section
  let y = 120
  doc.setTextColor(20)
  doc.setFontSize(11)

  doc.setFont('helvetica', 'bold')
  doc.text('E-mail de Acesso:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(promoter.email || '—', margin + 130, y)

  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Última Atividade:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(promoter.lastActivity || 'Sem registros', margin + 130, y)

  y += 30

  // Cards summary block
  const printableWidth = width - margin * 2
  doc.setFillColor(245, 246, 248)
  doc.roundedRect(margin, y, printableWidth, 55, 4, 4, 'F')

  const cardWidth = printableWidth / 3

  // Col 1: Avarias
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('AVARIAS REGISTRADAS', margin + 15, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(180, 30, 30) // Red for avarias
  doc.text(String(promoter.avariasCount), margin + 15, y + 40)

  // Divider 1
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(1)
  doc.line(margin + cardWidth, y + 10, margin + cardWidth, y + 45)

  // Col 2: Visitas
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('VISITAS REALIZADAS', margin + cardWidth + 15, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy
  doc.text(String(promoter.visitasCount), margin + cardWidth + 15, y + 40)

  // Divider 2
  doc.line(margin + cardWidth * 2, y + 10, margin + cardWidth * 2, y + 45)

  // Col 3: Total Geral
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('TOTAL DE RELATÓRIOS', margin + cardWidth * 2 + 15, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(16, 185, 129) // Emerald for success
  doc.text(String(promoter.totalCount), margin + cardWidth * 2 + 15, y + 40)

  y += 75

  // Recent reports table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 99)
  doc.text('HISTÓRICO RECENTE DE EMISSÕES', margin, y)
  doc.line(margin, y + 3, width - margin, y + 3)

  y += 15

  const tableBody = promoter.reports.map(r => [
    r.numero,
    r.tipo === 'avaria' ? 'Avaria' : 'Visita',
    r.empresa,
    new Date(r.data).toLocaleDateString('pt-BR'),
    r.status
  ])

  autoTable(doc, {
    startY: y,
    head: [['Nº Relatório', 'Tipo', 'Empresa Cliente', 'Data Emissão', 'Situação / Status']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 6 },
    margin: { left: margin, right: margin }
  })

  // Footer metadata
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF
  doc.save(`Relatorio_Promotor_${promoter.name.replace(/\s+/g, '_')}.pdf`)
}

// 5. Generate PDF for Consolidated Reports List
export interface PDFConsolidatedReportItem {
  numero: string
  empresa: string
  tipo: 'avaria' | 'visita'
  data: string
  responsavel: string
  status: string
}

export function generateConsolidatedReportsPDF(reports: PDFConsolidatedReportItem[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO CONSOLIDADO DE EMISSÕES', width - margin, 50, { align: 'right' })

  // Subtitle
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // Calculate Metrics
  const totalReports = reports.length
  const totalAvarias = reports.filter(r => r.tipo === 'avaria').length
  const totalVisitas = reports.filter(r => r.tipo === 'visita').length

  // Stats Card Box
  let y = 120
  const printableWidth = width - margin * 2
  doc.setFillColor(245, 246, 248)
  doc.roundedRect(margin, y, printableWidth, 55, 4, 4, 'F')

  const cardWidth = printableWidth / 3

  // Col 1: Total Geral
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('TOTAL DE RELATÓRIOS', margin + 15, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99)
  doc.text(String(totalReports), margin + 15, y + 40)

  // Divider 1
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(1)
  doc.line(margin + cardWidth, y + 10, margin + cardWidth, y + 45)

  // Col 2: Total Avarias
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('INSPEÇÕES DE AVARIAS', margin + cardWidth + 15, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(180, 30, 30) // Red
  doc.text(String(totalAvarias), margin + cardWidth + 15, y + 40)

  // Divider 2
  doc.line(margin + cardWidth * 2, y + 10, margin + cardWidth * 2, y + 45)

  // Col 3: Total Visitas
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('VISITAS COMERCIAIS', margin + cardWidth * 2 + 15, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(107, 33, 168) // Purple
  doc.text(String(totalVisitas), margin + cardWidth * 2 + 15, y + 40)

  y += 80

  // Table using autoTable
  const tableBody = reports.map(r => [
    r.numero,
    r.empresa,
    r.tipo === 'avaria' ? 'Avaria' : 'Visita',
    new Date(r.data).toLocaleDateString('pt-BR'),
    r.responsavel,
    r.status
  ])

  autoTable(doc, {
    startY: y,
    head: [['Número', 'Empresa', 'Tipo', 'Data', 'Emissor', 'Situação']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 8 },
    margin: { left: margin, right: margin }
  })

  // Footer metadata
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF
  doc.save('Relatorio_Consolidado_Emissoes.pdf')
}

export function generateBrindesReportPDF(
  filteredRequests: any[],
  filterVendedorText: string,
  filterCompanyText: string,
  filterStatusText: string,
  periodText: string
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO DE SOLICITAÇÃO DE BRINDES', width - margin, 50, { align: 'right' })

  // Subtitle — clean, no redundant date (shown in filter card below)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140)
  doc.text('Produtos Do Mestre — Gestão Comercial', width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // ── FILTROS APLICADOS — Styled Info Card ─────────────────────
  let y = 112
  const printableWidthFilters = width - margin * 2

  // Card background
  doc.setFillColor(240, 244, 255) // soft blue-tinted white
  doc.roundedRect(margin, y, printableWidthFilters, 72, 5, 5, 'F')

  // Left navy accent bar
  doc.setFillColor(30, 41, 99)
  doc.roundedRect(margin, y, 4, 72, 2, 2, 'F')

  // Title row
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(30, 41, 99)
  doc.text('PARÂMETROS DO RELATÓRIO', margin + 14, y + 13)

  // Separator line
  doc.setDrawColor(200, 210, 235)
  doc.setLineWidth(0.5)
  doc.line(margin + 14, y + 17, margin + printableWidthFilters - 8, y + 17)

  // Label column width
  const labelX = margin + 14
  const valueX = margin + 80
  const col2LabelX = margin + (printableWidthFilters / 2) + 8
  const col2ValueX = margin + (printableWidthFilters / 2) + 58

  // Row 1: Vendedor | Status
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 110, 130)
  doc.text('Vendedor:', labelX, y + 29)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 40)
  doc.text(filterVendedorText, valueX, y + 29)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 110, 130)
  doc.text('Status:', col2LabelX, y + 29)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 40)
  doc.text(filterStatusText, col2ValueX, y + 29)

  // Row 2: Empresa | Período
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 110, 130)
  doc.text('Empresa:', labelX, y + 45)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 40)
  // Truncate long company name if needed
  const empTrunc = doc.splitTextToSize(filterCompanyText, col2LabelX - valueX - 10)
  doc.text(empTrunc[0] || filterCompanyText, valueX, y + 45)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 110, 130)
  doc.text('Período:', col2LabelX, y + 45)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 40)
  doc.text(periodText, col2ValueX, y + 45)

  // Bottom generation date row
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(150, 160, 180)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin + printableWidthFilters - 8, y + 62, { align: 'right' })

  y += 88

  // Calculate stats
  const totalRequests = filteredRequests.length
  const totalItems = filteredRequests.reduce((acc, curr) => acc + curr.quantidade, 0)
  
  const statusCounts = filteredRequests.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const itemCounts = filteredRequests.reduce((acc, curr) => {
    acc[curr.brinde_tipo] = (acc[curr.brinde_tipo] || 0) + curr.quantidade
    return acc
  }, {} as Record<string, number>)

  // Stats Grid Container Box
  const printableWidth = width - margin * 2
  doc.setFillColor(245, 246, 248)
  doc.roundedRect(margin, y, printableWidth, 50, 4, 4, 'F')

  const cardWidth = printableWidth / 4

  // Col 1: Total Pedidos
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('TOTAL SOLICITAÇÕES', margin + 15, y + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 99)
  doc.text(String(totalRequests), margin + 15, y + 36)

  // Divider 1
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(1)
  doc.line(margin + cardWidth, y + 10, margin + cardWidth, y + 40)

  // Col 2: Total Brindes
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('TOTAL ITENS', margin + cardWidth + 15, y + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 99)
  doc.text(String(totalItems), margin + cardWidth + 15, y + 36)

  // Divider 2
  doc.line(margin + cardWidth * 2, y + 10, margin + cardWidth * 2, y + 40)

  // Col 3: Enviados
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('ENVIADOS', margin + cardWidth * 2 + 15, y + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(16, 185, 129) // Emerald
  const totalEnviados = (statusCounts['enviado'] || 0) + (statusCounts['aprovado'] || 0) + (statusCounts['entregue'] || 0)
  doc.text(String(totalEnviados), margin + cardWidth * 2 + 15, y + 36)

  // Divider 3
  doc.line(margin + cardWidth * 3, y + 10, margin + cardWidth * 3, y + 40)

  // Col 4: Pendentes / Recusados
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text('PENDENTES / RECUSADOS', margin + cardWidth * 3 + 15, y + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(245, 158, 11) // Amber
  doc.text(`${statusCounts['pendente'] || 0} / ${statusCounts['recusado'] || 0}`, margin + cardWidth * 3 + 15, y + 36)

  y += 70

  // Summary list by brinde type
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 99)
  doc.text('Resumo por Tipo de Brinde', margin, y)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(1)
  doc.line(margin, y + 4, width - margin, y + 4)

  y += 15

  const summaryRows = Object.entries(itemCounts).map(([tipo, qty]) => [tipo, `${qty} unidade(s)`])
  autoTable(doc, {
    startY: y,
    head: [['Tipo de Brinde', 'Quantidade Consolidada']],
    body: summaryRows.length > 0 ? summaryRows : [['Nenhum brinde no período', '—']],
    theme: 'plain',
    headStyles: { fontStyle: 'bold', fontSize: 9, textColor: [71, 85, 105] },
    styles: { fontSize: 9, cellPadding: 4 },
    margin: { left: margin, right: margin }
  })

  y = (doc as any).lastAutoTable.finalY + 25

  // Detailed Table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 99)
  doc.text('Detalhamento das Solicitações', margin, y)
  doc.line(margin, y + 4, width - margin, y + 4)

  y += 15

  const tableBody = filteredRequests.map(item => [
    new Date(item.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    item.requester_name,
    item.empresa_nome || '—',
    item.brinde_tipo,
    String(item.quantidade),
    item.status === 'pendente' ? 'Pendente' : 
    (item.status === 'enviado' || item.status === 'aprovado' || item.status === 'entregue') ? 'Enviado' : 'Recusado'
  ])

  autoTable(doc, {
    startY: y,
    head: [['Data/Hora', 'Vendedor', 'Empresa Cliente', 'Brinde', 'Qtd', 'Situação']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 6 },
    columnStyles: {
      4: { halign: 'center' }
    },
    margin: { left: margin, right: margin }
  })

  // Signature Block
  const sigY = height - 100
  const sigWidth = 240
  const sigStartX = (width - sigWidth) / 2
  doc.setDrawColor(120)
  doc.setLineWidth(0.5)
  doc.line(sigStartX, sigY, sigStartX + sigWidth, sigY)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Assinatura do Responsável', width / 2, sigY + 14, { align: 'center' })

  // Footer metadata
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF
  doc.save('Relatorio_Solicitacao_Brindes.pdf')
}

export interface PDFMonthlySystemData {
  monthYear: string
  emailRecipient?: string
  stats: {
    totalAvarias: number
    totalVisitas: number
    totalEmpresas: number
    totalUsuarios: number
    totalBrindes: number
    totalBrindesItens: number
  }
  details: {
    recentCompanies: { name: string; created_at: string; responsavel?: string }[]
    recentUsers: { full_name: string; email: string; cargo: string }[]
    recentReports: { numero: string; empresa: string; responsavel: string; tipo: string; status: string }[]
    recentBrindes: { requester_name: string; brinde_tipo: string; quantidade: number; status: string }[]
  }
}

export function generateMonthlySystemPDF(data: PDFMonthlySystemData, save: boolean = true) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40
  const printableWidth = width - margin * 2

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO MENSAL GERAL DO SISTEMA', width - margin, 50, { align: 'right' })

  // Report Period
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Período: ${data.monthYear}`, width - margin, 68, { align: 'right' })

  if (data.emailRecipient) {
    doc.setFontSize(8)
    doc.text(`Destinatário: ${data.emailRecipient}`, width - margin, 80, { align: 'right' })
  }

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  let y = 120

  // Stats Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 99)
  doc.text('Indicadores de Cadastros e Atividades no Período', margin, y)
  
  y += 15

  // Stats Grid Container Box
  doc.setFillColor(245, 246, 248)
  doc.roundedRect(margin, y, printableWidth, 55, 4, 4, 'F')

  const cardWidth = printableWidth / 5

  // Col 1: Avarias
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(110, 110, 110)
  doc.text('AVARIAS', margin + 10, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 99)
  doc.text(String(data.stats.totalAvarias), margin + 10, y + 38)

  // Divider 1
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(1)
  doc.line(margin + cardWidth, y + 10, margin + cardWidth, y + 45)

  // Col 2: Visitas
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(110, 110, 110)
  doc.text('VISITAS', margin + cardWidth + 10, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 99)
  doc.text(String(data.stats.totalVisitas), margin + cardWidth + 10, y + 38)

  // Divider 2
  doc.line(margin + cardWidth * 2, y + 10, margin + cardWidth * 2, y + 45)

  // Col 3: Empresas
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(110, 110, 110)
  doc.text('NOVAS EMPRESAS', margin + cardWidth * 2 + 10, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 99)
  doc.text(String(data.stats.totalEmpresas), margin + cardWidth * 2 + 10, y + 38)

  // Divider 3
  doc.line(margin + cardWidth * 3, y + 10, margin + cardWidth * 3, y + 45)

  // Col 4: Usuários
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(110, 110, 110)
  doc.text('NOVOS USUÁRIOS', margin + cardWidth * 3 + 10, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 99)
  doc.text(String(data.stats.totalUsuarios), margin + cardWidth * 3 + 10, y + 38)

  // Divider 4
  doc.line(margin + cardWidth * 4, y + 10, margin + cardWidth * 4, y + 45)

  // Col 5: Brindes
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(110, 110, 110)
  doc.text('BRINDES (ITENS)', margin + cardWidth * 4 + 10, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 99)
  doc.text(`${data.stats.totalBrindes} (${data.stats.totalBrindesItens})`, margin + cardWidth * 4 + 10, y + 38)

  y += 75

  // Now, render sections. We want tables for each of the categories if they have any entries
  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > height - 60) {
      doc.addPage()
      y = margin + 20
      return true
    }
    return false
  }

  // 1. Section: Novas Empresas
  if (data.details.recentCompanies.length > 0) {
    checkPageOverflow(80)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 99)
    doc.text('Novas Empresas Cadastradas', margin, y)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(1)
    doc.line(margin, y + 4, width - margin, y + 4)
    y += 12

    const compRows = data.details.recentCompanies.map(c => [
      c.name,
      c.responsavel || '—',
      c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'
    ])

    autoTable(doc, {
      startY: y,
      head: [['Nome da Empresa', 'Responsável', 'Data de Cadastro']],
      body: compRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 4 },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 20
  }

  // 2. Section: Novos Usuários
  if (data.details.recentUsers.length > 0) {
    checkPageOverflow(80)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 99)
    doc.text('Novos Usuários Registrados', margin, y)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(1)
    doc.line(margin, y + 4, width - margin, y + 4)
    y += 12

    const userRows = data.details.recentUsers.map(u => {
      const getRoleLabel = (c: string) => {
        switch (c) {
          case 'admin': return 'Administrador'
          case 'gestor': return 'Gestor Geral'
          case 'sup_tecnico': return 'Sup. Técnico'
          case 'vendedor': return 'Vendedor'
          default: return c
        }
      }
      return [
        u.full_name || '—',
        u.email || '—',
        getRoleLabel(u.cargo)
      ]
    })

    autoTable(doc, {
      startY: y,
      head: [['Nome Completo', 'E-mail', 'Cargo / Nível']],
      body: userRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 4 },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 20
  }

  // 3. Section: Relatórios Operacionais (Visitas e Avarias)
  if (data.details.recentReports.length > 0) {
    checkPageOverflow(100)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 99)
    doc.text('Relatórios de Atividades Registrados', margin, y)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(1)
    doc.line(margin, y + 4, width - margin, y + 4)
    y += 12

    const reportRows = data.details.recentReports.map(r => [
      r.numero,
      r.empresa,
      r.responsavel,
      r.tipo === 'avaria' ? 'Avaria' : 'Visita',
      r.status
    ])

    autoTable(doc, {
      startY: y,
      head: [['Número', 'Empresa', 'Emissor', 'Tipo', 'Status']],
      body: reportRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 4 },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 20
  }

  // 4. Section: Solicitações de Brindes
  if (data.details.recentBrindes.length > 0) {
    checkPageOverflow(80)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 99)
    doc.text('Solicitações de Brindes no Período', margin, y)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(1)
    doc.line(margin, y + 4, width - margin, y + 4)
    y += 12

    const brindeRows = data.details.recentBrindes.map(b => [
      b.requester_name,
      b.brinde_tipo,
      String(b.quantidade),
      b.status.toUpperCase()
    ])

    autoTable(doc, {
      startY: y,
      head: [['Solicitante', 'Tipo de Brinde', 'Qtd', 'Situação']],
      body: brindeRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 4 },
      margin: { left: margin, right: margin }
    })

    y = (doc as any).lastAutoTable.finalY + 20
  }

  // Signature Block
  const sigY = height - 100
  const sigWidth = 240
  const sigStartX = (width - sigWidth) / 2
  doc.setDrawColor(120)
  doc.setLineWidth(0.5)
  doc.line(sigStartX, sigY, sigStartX + sigWidth, sigY)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Assinatura do Administrador', width / 2, sigY + 14, { align: 'center' })

  // Footer metadata
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Relatório Mensal Geral • Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF
  if (save) {
    doc.save(`Relatorio_Mensal_${data.monthYear.replace(/[\s/]/g, '_')}.pdf`)
  }
  return doc
}

