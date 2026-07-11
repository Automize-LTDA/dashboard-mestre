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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #233A7A;">Relatório Mensal - ${month_year}</h2>
        <p>Olá,</p>
        <p>Segue o resumo das métricas consolidadas do sistema Do Mestre deste mês:</p>
        <ul style="background-color: #f8fafc; padding: 20px; border-radius: 8px; list-style-type: none;">
          <li style="margin-bottom: 10px;"><strong>Visitas a Filiais:</strong> ${stats_visitas}</li>
          <li style="margin-bottom: 10px;"><strong>Avarias Registradas:</strong> ${stats_avarias}</li>
          <li style="margin-bottom: 10px;"><strong>Novas Empresas:</strong> ${stats_empresas}</li>
          <li style="margin-bottom: 10px;"><strong>Novos Usuários:</strong> ${stats_usuarios}</li>
          <li><strong>Solicitações de Brindes:</strong> ${stats_brindes}</li>
        </ul>
        <p>Acesse o Dashboard para visualizar o relatório completo e exportar os dados em PDF.</p>
        <br/>
        <p style="color: #64748b; font-size: 12px;">Este é um email automático enviado pelo sistema Do Mestre.</p>
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

    const data = await response.json();

    if (response.ok) {
      res.status(200).json(data)
    } else {
      res.status(400).json(data)
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
