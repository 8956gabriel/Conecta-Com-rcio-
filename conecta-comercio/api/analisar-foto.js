// Analisa uma FOTO REAL do produto (enviada pelo comerciante) e devolve dicas
// rápidas para deixá-la mais atraente. A IA nunca gera ou substitui a foto —
// só dá feedback sobre a foto real, pra manter a confiança de quem compra.

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

  const { imagemBase64, mediaType } = req.body || {};
  if (!imagemBase64) {
    res.status(400).json({ error: "Nenhuma foto recebida." });
    return;
  }

  const prompt = `Você está olhando a foto real de um produto que um pequeno comerciante vai
publicar na vitrine online da cidade dele. Dê no máximo 3 dicas curtas e práticas (uma frase
cada) para deixar ESSA MESMA foto mais atraente para o cliente — por exemplo sobre luz, fundo,
ângulo ou enquadramento. Não invente nada sobre o produto em si. Se a foto já estiver boa, diga
isso em vez de forçar uma crítica. Responda em português do Brasil, em uma lista simples, sem
introdução.`;

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
        max_tokens: 250,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imagemBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      res.status(resposta.status).json({ error: dados.error?.message || "Erro ao falar com a IA." });
      return;
    }

    const texto = dados.content?.find((b) => b.type === "text")?.text?.trim() || "";
    res.status(200).json({ dicas: texto });
  } catch (err) {
    res.status(500).json({ error: "Erro de conexão com a IA. Tente novamente." });
  }
}
