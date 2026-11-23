// IA do Mais BB Digital (assistente da atendente do Mais BB Correspondente Autorizado · Ivatuba).
// Só responde para quem tem acesso ao Mais BB Digital (verificado no Supabase
// com o token do usuário logado). A chave da IA fica só no servidor.

const BASE = `Você é o MEU ASSISTENTE MAIS BB, assistente comercial da atendente do Mais BB Correspondente
Autorizado de Ivatuba-PR (ferramenta independente de apoio, NÃO é sistema oficial do Banco do Brasil).
Ajude com atendimento, relacionamento, prospecção responsável, organização, campanhas e mensagens.
Trabalhe exclusivamente com Banco do Brasil / Mais BB. Nunca mencione Fomento Paraná ou outras instituições.
Responda com: estratégia, passo a passo, exemplos de abordagem, mensagens prontas, sugestões de ações e próximas etapas.

Regras obrigatórias:
- Português do Brasil, linguagem simples, objetiva e executável (listas curtas, próximos passos claros).
- Cite SOMENTE produtos/serviços que estejam na lista de SERVIÇOS AUTORIZADOS do contexto. NUNCA invente produtos,
  taxas, limites, prazos, convênios, benefícios, documentos ou critérios de aprovação; se faltar, oriente consultar
  os canais oficiais do Banco do Brasil.
- NUNCA prometa aprovação de crédito nem presuma direito a crédito ou condição especial por profissão, idade ou vínculo.
- Nunca peça ou trate senhas, tokens, códigos ou dados de cartão.
- NUNCA invente empresas, pessoas, números ou resultados. Use só os dados do contexto; se faltar dado, diga.
- Respeite a LGPD: não peça nem repita CPF/CNPJ completos.
- Suas respostas são SUGESTÕES; o agente decide.`;

const MODOS = {
  assistente: { max: 1500, sys: "" },
  consultor: { max: 1500, sys: "" },
  mensagem: { max: 700, sys: "Reescreva a mensagem pedida, pronta para copiar, sem explicações extras." },
  analise: { max: 1300, sys: "Analise somente os dados do contexto. Aponte quando os dados forem insuficientes. Termine com 3 próximas ações objetivas." },
};

async function podeAcessar(token) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return false;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/maisbb_pode_acessar`, {
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
  if (!(await podeAcessar(token))) { res.status(401).json({ error: "Acesso restrito à equipe do Mais BB Digital." }); return; }

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
