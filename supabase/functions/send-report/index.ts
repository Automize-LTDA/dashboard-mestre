import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to_email, month_year, stats_avarias, stats_visitas, stats_empresas, stats_usuarios, stats_brindes } = await req.json();

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set.");
    }

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

    // Note: Em produção, substitua "noreply@seu-dominio.com" pelo domínio validado no Resend
    // Por padrão o Resend permite testes com onboarding@resend.dev para o próprio email da conta se o domínio não estiver verificado
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Do Mestre <onboarding@resend.dev>",
        to: [to_email],
        subject: `Relatório Mensal Do Mestre - ${month_year}`,
        html: htmlContent,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.ok ? 200 : 400,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
