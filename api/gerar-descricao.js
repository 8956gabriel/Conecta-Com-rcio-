// Gera uma descrição de vendas curta e persuasiva para um produto, a partir
// do nome, categoria e algumas palavras-chave que o comerciante já sabe.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "A chave da IA ainda não foi configurada no servidor (ANTHROPIC_API_KEY)." });
    return;
  }

  const { nome, categoria, palavrasChave } = req.body || {};
  if (!nome) {
    res.status(400).json({ error: "Informe ao menos o nome do produto." });
    return;
  }

  const prompt = `Escreva uma descrição de vendas curta (2 a 3 frases, no máximo 280 caracteres)
para o seguinte produto de um pequeno comércio local em Ivatuba - PR:

Nome: ${nome}
Categoria: ${categoria || "não informada"}
Palavras-chave do comerciante: ${palavrasChave || "nenhuma"}

Regras:
- Português do Brasil, tom caloroso e direto, como um comerciante local falaria
- Destaque o que torna o produto atraente (sabor, qualidade, uso, ocasião)
- Não invente características específicas que não foram informadas (ingredientes exatos,
  certificações, prêmios). Fique no campo do apelo genérico e verdadeiro.
- Não use emojis em excesso (no máximo 1)
- Responda só com o texto da descrição, sem aspas, sem explicações antes ou depois`;

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
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      res.status(resposta.status).json({ error: dados.error?.message || "Erro ao falar com a IA." });
      return;
    }

    const texto = dados.content?.find((b) => b.type === "text")?.text?.trim() || "";
    res.status(200).json({ descricao: texto });
  } catch (err) {
    res.status(500).json({ error: "Erro de conexão com a IA. Tente novamente." });
  }
}
