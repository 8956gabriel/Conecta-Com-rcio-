// =============================================================================
// LOGIN ÚNICO CONECTA → FOMENTO (Projeto Master · seção 15)
//
// Quem já está logado no Conecta Comércio pede aqui um CÓDIGO DE USO ÚNICO
// para entrar no site da Fomento Paraná (fomento-ivatuba.vercel.app) sem
// digitar a senha de novo. A Fomento troca esse código por um login PRÓPRIO
// e independente (não divide a sessão do Conecta — assim um site não derruba
// o login do outro).
//
// Segurança:
//   • confere o login de quem pediu (token do Conecta);
//   • só libera para admin geral ou para quem está ativo na equipe da Fomento;
//   • o código vale uma vez só e expira em poucos minutos (regra do Supabase);
//   • usa a chave de serviço (SUPABASE_SERVICE_ROLE_KEY), que fica só aqui no
//     servidor — nunca no navegador. Não manda e-mail nenhum.
// =============================================================================
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    res.status(500).json({ error: "O Supabase ainda não foi configurado no servidor (SUPABASE_SERVICE_ROLE_KEY)." });
    return;
  }
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Faça login no Conecta Comércio para continuar." });
    return;
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: dadosUsuario, error: erroUsuario } = await admin.auth.getUser(token);
    const usuario = dadosUsuario?.user;
    if (erroUsuario || !usuario?.email) {
      res.status(401).json({ error: "Sessão inválida. Entre de novo no Conecta Comércio." });
      return;
    }

    // Só quem tem o que fazer na Fomento: admin geral ou equipe ativa da Fomento
    const [{ data: perfil }, { data: agente }] = await Promise.all([
      admin.from("perfis").select("tipo").eq("id", usuario.id).maybeSingle(),
      admin.from("fomento_agentes").select("ativo").eq("user_id", usuario.id).maybeSingle(),
    ]);
    if (perfil?.tipo !== "admin" && !agente?.ativo) {
      res.status(403).json({ error: "Sua conta não faz parte da equipe da Fomento Paraná. Peça acesso ao administrador." });
      return;
    }

    // Código de uso único (não envia e-mail): a Fomento troca por um login próprio
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: usuario.email });
    if (error || !data?.properties?.hashed_token) {
      res.status(500).json({ error: "Não consegui gerar o acesso agora. Tente de novo em instantes." });
      return;
    }
    res.status(200).json({ codigo: data.properties.hashed_token, tipo: data.properties.verification_type || "magiclink" });
  } catch (e) {
    res.status(500).json({ error: "Falha ao gerar o acesso: " + (e?.message || "erro desconhecido") });
  }
}
