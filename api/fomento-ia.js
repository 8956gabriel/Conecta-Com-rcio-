// IA da Central de Prospecção do Agente de Crédito (Fomento Paraná · Ivatuba).
// Só responde para quem tem acesso ao painel do Fomento (verificado no Supabase
// com o token do usuário logado). A chave da IA fica só no servidor.

const BASE = `Você é o CONSULTOR INTELIGENTE DO AGENTE DE CRÉDITO da Fomento Paraná em Ivatuba-PR,
dentro da plataforma Conecta Comércio. Ajude o agente a prospectar empreendedores, organizar a carteira,
abordar clientes, identificar necessidades de investimento e transformar oportunidades em propostas.

Regras obrigatórias:
- Português do Brasil, linguagem simples, objetiva e executável (listas curtas, próximos passos claros).
- NUNCA invente taxas, prazos, limites, carência, documentos ou critérios das linhas. Use apenas as condições
  oficiais que vierem no contexto; se não vierem, diga que o agente deve conferir as regras oficiais vigentes.
- NUNCA prometa ou sugira aprovação garantida: a concessão depende da análise de crédito da Fomento Paraná.
- NUNCA invente empresas, pessoas, números ou resultados. Use só os dados do contexto; se faltar dado, diga.
- Respeite a LGPD: não peça nem repita CPF/CNPJ completos.
- Suas respostas são SUGESTÕES; o agente decide.`;

const MODOS = {
  consultor: { max: 1400, sys: "" },
  campanha: { max: 2500, sys: `Monte UMA campanha comercial. Responda SOMENTE com um JSON válido, sem texto fora dele, com as chaves:
nome, objetivo, publico, segmento, estrategia, plano_visitas, roteiro, mensagens_whatsapp, textos_redes, ideias_artes, calendario, metas,
meta_clientes (número), meta_propostas (número). Textos em português; use \\n para quebras de linha.` },
  abordagem: { max: 900, sys: "Escreva a mensagem/abordagem pedida, pronta para usar, adaptada ao segmento e ao perfil informados. Sem explicações extras." },
  oportunidade: { max: 1200, sys: "Analise a oportunidade informada: modalidades para AVALIAÇÃO (entre as linhas do contexto), pontos a confirmar, perguntas adicionais e documentação (só a oficial do contexto). Não aprove nem reprove." },
  radar: { max: 1200, sys: "Com base na lista de oportunidades do radar, escolha as até 7 mais importantes para HOJE, explique o motivo de cada uma em uma linha e a próxima ação recomendada." },
};

async function podeAcessar(token) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return false;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/fomento_pode_acessar`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    });
    return r.ok && (await r.json()) === true;
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido" }); return; }
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!(await podeAcessar(token))) { res.status(401).json({ error: "Acesso restrito à equipe do Fomento Paraná." }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "IA ainda não configurada (falta a chave ANTHROPIC_API_KEY na Vercel). Os modelos automáticos continuam funcionando.", semChave: true }); return; }

  const { modo = "consultor", messages, pedido, contexto } = req.body || {};
  const cfg = MODOS[modo] || MODOS.consultor;
  const ctx = contexto ? `\n\nDADOS AUTORIZADOS DO SISTEMA (data de hoje: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}):\n${String(typeof contexto === "string" ? contexto : JSON.stringify(contexto)).slice(0, 24000)}` : "";
  const msgs = Array.isArray(messages) && messages.length ? messages.slice(-16) : [{ role: "user", content: String(pedido || "Ajude-me.") }];

  const chamar = async (model) => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: cfg.max, system: `${BASE}\n\n${cfg.sys}${ctx}`, messages: msgs }),
  });

  try {
    let r = await chamar("claude-sonnet-4-5");
    if (!r.ok && [400, 404].includes(r.status)) r = await chamar("claude-haiku-4-5-20251001");
    const dados = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: dados.error?.message || "Erro ao falar com a IA." }); return; }
    const texto = (dados.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    res.status(200).json({ texto });
  } catch {
    res.status(500).json({ error: "Erro de conexão com a IA. Tente novamente." });
  }
}
