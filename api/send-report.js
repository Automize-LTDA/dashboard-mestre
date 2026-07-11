// api/send-report.js
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

    // Utilizando a API Key do Resend solicitada
    const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_AeSM4Wxb_HcBCwkCoMokYDAGsu37yMadD"

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        <div style="background-color: #233A7A; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Relatório Mensal</h1>
          <p style="color: #cbd5e1; margin: 8px 0 0 0; font-size: 14px;">Métricas consolidadas do sistema Do Mestre</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Olá,</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">Segue abaixo o resumo consolidado das atividades referente a <strong>\${month_year}</strong>.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 500;">Visitas a Filiais</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: bold;">\${stats_visitas}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 500;">Avarias Registradas</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #e11d48; font-weight: bold;">\${stats_avarias}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 500;">Novas Empresas</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: bold;">\${stats_empresas}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 500;">Novos Usuários</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: bold;">\${stats_usuarios}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #475569; font-weight: 500;">Solicitações de Brindes</td>
                <td style="padding: 12px 0; text-align: right; color: #16a34a; font-weight: bold;">\${stats_brindes}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">Para uma análise mais detalhada e exportação dos dados em formato PDF, por favor, acesse a plataforma administrativa.</p>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">Este é um e-mail automático gerado pelo sistema Do Mestre. Por favor, não responda.</p>
        </div>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Do Mestre <onboarding@resend.dev>",
        to: [to_email],
        subject: `Relatório Mensal Do Mestre - ${month_year}`,
        html: htmlContent,
      }),
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("Failed to parse Resend response:", text);
    }

    if (response.ok) {
      res.status(200).json(data)
    } else {
      res.status(400).json({ error: data.message || text || 'Erro desconhecido na API do Resend' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro interno no servidor' })
  }
}
