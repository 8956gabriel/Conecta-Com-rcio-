// Gera uma imagem ILUSTRATIVA opcional para o produto, usando a API de
// imagens da OpenAI (a Anthropic/Claude não gera imagens). Esta imagem NUNCA
// deve ser apresentada como a foto real do produto — o frontend sempre marca
// com o selo "Imagem ilustrativa gerada por IA".

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "A chave de geração de imagem ainda não foi configurada no servidor (OPENAI_API_KEY)." });
    return;
  }

  const { nome, categoria, descricao } = req.body || {};
  if (!nome) {
    res.status(400).json({ error: "Informe ao menos o nome do produto." });
    return;
  }

  const prompt = `Fotografia de produto em estilo comercial, realista, bem iluminada, fundo neutro,
mostrando de forma genérica: ${nome}${categoria ? `, categoria ${categoria}` : ""}.
${descricao ? `Contexto: ${descricao}.` : ""}
Sem texto, sem logotipos, sem marcas, sem pessoas.`;

  try {
    const resposta = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      res.status(resposta.status).json({ error: dados.error?.message || "Erro ao gerar a imagem." });
      return;
    }

    const b64 = dados.data?.[0]?.b64_json;
    if (!b64) {
      res.status(500).json({ error: "A IA não retornou uma imagem." });
      return;
    }

    res.status(200).json({ imagemBase64: b64 });
  } catch (err) {
    res.status(500).json({ error: "Erro de conexão ao gerar a imagem. Tente novamente." });
  }
}
