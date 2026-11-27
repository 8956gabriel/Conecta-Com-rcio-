// Funções de apoio das rotas /api. Arquivos que começam com "_" não viram
// rotas na Vercel: este só é importado pelas outras funções.

// Confere no Supabase se o token enviado pelo navegador é de um usuário logado.
// Devolve o usuário ({ id, email, ... }) ou null.
export async function usuarioLogado(req) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!url || !anon || !token) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const usuario = await r.json();
    return usuario?.id ? usuario : null;
  } catch {
    return null;
  }
}

// Responde 401 e devolve false quando não há login válido.
export async function exigirLogin(req, res) {
  const usuario = await usuarioLogado(req);
  if (!usuario) {
    res.status(401).json({ error: "Faça login para usar este recurso." });
    return null;
  }
  return usuario;
}

// Aceita só chamadas feitas pelas páginas da própria plataforma (mesmo domínio,
// domínios oficiais, prévias da Vercel e o ambiente local). Não substitui login:
// impede que outros sites usem a rota pelo navegador do visitante.
const ORIGENS_OFICIAIS = ["conectacomercio.app.br", "www.conectacomercio.app.br", "fomento-ivatuba.vercel.app", "sala-ivatuba.vercel.app", "conecta-com-rcio.vercel.app"];
export function origemPermitida(req) {
  const origem = req.headers.origin;
  if (!origem) return false;
  let host;
  try { host = new URL(origem).host; } catch { return false; }
  if (host === req.headers.host) return true;
  if (ORIGENS_OFICIAIS.includes(host)) return true;
  if (/^conecta-com-rcio-[a-z0-9-]+\.vercel\.app$/.test(host)) return true;
  if (/^localhost(:\d+)?$/.test(host)) return true;
  return false;
}
