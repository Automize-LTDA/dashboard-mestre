// api/send-report.js
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  // Configuração de CORS para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { to_email, month_year, stats_avarias, stats_visitas, stats_empresas, stats_usuarios, stats_brindes } = req.body

    // Credenciais do Gmail
    const GMAIL_EMAIL = process.env.GMAIL_EMAIL || "relatoriosdomestre@gmail.com"
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "joulsmdjrfudofnz"

    const htmlContent = `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 10px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #eef2f6;">
    
    <!-- Barra Decorativa Superior -->
    <div style="height: 6px; background: linear-gradient(90deg, #E53935 0%, #1e293b 100%);"></div>
    
    <!-- Cabeçalho / Logo -->
    <div style="padding: 32px 30px 20px 30px; text-align: center;">
      <img src="https://raw.githubusercontent.com/Automize-LTDA/dashboard-mestre/main/src/assets/logo-preto.png" alt="Do Mestre Logo" style="height: 48px; max-width: 180px; margin-bottom: 20px; object-fit: contain;" onerror="this.src='https://images2.imgbox.com/a5/84/3F6Gv09v_o.png'">
      
      <h2 style="color: #1E2E5C; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Relatório Mensal Geral</h2>
      <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px; font-weight: 500;">Consolidado de Indicadores e Atividades</p>
    </div>
    <!-- Divisor -->
    <div style="height: 1px; background-color: #f1f5f9; margin: 0 30px;"></div>
    <!-- Conteúdo do E-mail -->
    <div style="padding: 24px 30px;">
      <p style="margin-top: 0; font-size: 15px; color: #334155; font-weight: 500;">Olá, O resumo consolidado das atividades do sistema correspondente ao período de 
        <strong style="color: #1E2E5C; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${month_year}</strong> 
        já está disponível. Confira abaixo os números consolidados deste mês:</p>
      </p>
      
      <!-- Seção de Indicadores em Grid (Cards) -->
      <div style="margin-bottom: 28px;">
        <h4 style="margin: 0 0 16px 0; color: #1E2E5C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Resumo Executivo:</h4>
        
        <!-- Linha 1: Principais Métricas (Cards Maiores) -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <tr>
            <td style="width: 50%; padding-right: 6px;">
              <div style="padding: 16px; background-color: #fff8f8; border: 1px solid #fee2e2; border-radius: 12px; text-align: center;">
                <span style="display: block; font-size: 9px; font-weight: bold; color: #e53935; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Novas Avarias</span>
                <strong style="font-size: 24px; color: #e53935; font-weight: 800;">${stats_avarias}</strong>
              </div>
            </td>
            <td style="width: 50%; padding-left: 6px;">
              <div style="padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                <span style="display: block; font-size: 9px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Visitas Comerciais</span>
                <strong style="font-size: 24px; color: #1E2E5C; font-weight: 800;">${stats_visitas}</strong>
              </div>
            </td>
          </tr>
        </table>
        <!-- Linha 2: Métricas Secundárias (3 Cards Menores) -->
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 33.33%; padding-right: 4px;">
              <div style="padding: 12px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                <span style="display: block; font-size: 8px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Parcerias</span>
                <strong style="font-size: 16px; color: #475569; font-weight: 700;">${stats_empresas}</strong>
              </div>
            </td>
            <td style="width: 33.33%; padding: 0 4px;">
              <div style="padding: 12px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                <span style="display: block; font-size: 8px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Usuários</span>
                <strong style="font-size: 16px; color: #475569; font-weight: 700;">${stats_usuarios}</strong>
              </div>
            </td>
            <td style="width: 33.33%; padding-left: 4px;">
              <div style="padding: 12px 8px; background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; text-align: center;">
                <span style="display: block; font-size: 8px; font-weight: bold; color: #16a34a; text-transform: uppercase; margin-bottom: 4px;">Brindes (Itens)</span>
                <strong style="font-size: 16px; color: #16a34a; font-weight: 700;">${stats_brindes}</strong>
              </div>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Botão de Ação -->
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="https://dashboard-mestre.vercel.app/" style="display: inline-block; padding: 12px 30px; background-color: #1E2E5C; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(30, 46, 92, 0.15);">
          Acessar Painel Executivo
        </a>
      </div>
    </div>
    
    <!-- Rodapé -->
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
      Este é um e-mail corporativo interno enviado automaticamente.<br>
      <strong>© 2026 Do Mestre. Todos os direitos reservados.</strong>
    </div>
  </div>
</div>
    `;

    // Configurando o Nodemailer com o SMTP do Gmail (Modo Explícito)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `"Do Mestre" <${GMAIL_EMAIL}>`, // Remetente
      to: to_email, // Destinatário
      subject: `Relatório Mensal Do Mestre - ${month_year}`,
      html: htmlContent, // O Corpo do Email (Template)
    });

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    // Retornamos os erros do Nodemailer formatados
    res.status(500).json({ error: error.message || 'Erro interno no servidor ao tentar enviar email com Nodemailer' })
  }
}
