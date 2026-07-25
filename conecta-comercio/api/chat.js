// Função serverless (Vercel detecta automaticamente qualquer arquivo em /api).
// Ela roda no servidor, então a chave da IA (ANTHROPIC_API_KEY) nunca fica
// visível para quem acessa o site.

const SYSTEM_PROMPT = `Você é o assistente virtual do Conecta Comércio, uma plataforma
independente para fortalecer o comércio local de Ivatuba - PR.

Você ajuda visitantes a:
- Encontrar empresas, produtos e serviços cadastrados na plataforma
- Encontrar vagas de emprego publicadas por empresas locais
- Saber sobre cursos e eventos da Sala do Empreendedor
- Entender como funciona o Cartão do Servidor nos comércios parceiros
- Tirar dúvidas sobre como cadastrar uma empresa ou publicar produtos/vagas
- Orientar sobre a Sala do Empreendedor e o Sebrae em geral

Responda sempre em português, de forma curta, simpática e direta (2-4 frases
normalmente). Se não souber uma informação específica e atual (endereço exato,
telefone, se uma vaga ainda está aberta), oriente a pessoa a checar diretamente
na plataforma ou a entrar em contato pelo WhatsApp da empresa, em vez de inventar
dados. Nunca invente nomes de empresas, produtos, vagas ou preços que não foram
te informados na conversa.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "A chave da IA ainda não foi configurada no servidor (ANTHROPIC_API_KEY).",
    });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Nenhuma mensagem recebida." });
    return;
  }

  try {
    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      res.status(resposta.status).json({ error: dados.error?.message || "Erro ao falar com a IA." });
      return;
    }

    const texto = dados.content?.find((b) => b.type === "text")?.text || "";
    res.status(200).json({ texto });
  } catch (err) {
    res.status(500).json({ error: "Erro de conexão com a IA. Tente novamente." });
  }
}
