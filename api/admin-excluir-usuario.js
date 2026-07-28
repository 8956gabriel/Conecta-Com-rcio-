// Permite que um administrador exclua a conta de login de um usuário
// (junto com o perfil dele). Usa a chave de serviço do Supabase
// (SUPABASE_SERVICE_ROLE_KEY), que nunca pode ficar no navegador - por isso
// essa exclusão acontece aqui, no servidor.

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
    res.status(401).json({ error: "Faça login como administrador para continuar." });
    return;
  }

  const admin = createClient(url, serviceKey);

  try {
    const { data: dadosUsuario, error: erroUsuario } = await admin.auth.getUser(token);
    if (erroUsuario || !dadosUsuario?.user) {
      res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
      return;
    }

    const { data: perfilSolicitante, error: erroPerfil } = await admin
      .from("perfis")
      .select("tipo")
      .eq("id", dadosUsuario.user.id)
      .single();

    if (erroPerfil || perfilSolicitante?.tipo !== "admin") {
      res.status(403).json({ error: "Só administradores podem excluir usuários por aqui." });
      return;
    }

    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ error: "Informe o usuário a excluir." });
      return;
    }

    if (id === dadosUsuario.user.id) {
      res.status(400).json({ error: "Você não pode excluir a própria conta de administrador por aqui." });
      return;
    }

    // Apaga primeiro o perfil (evita ficar um perfil "órfão" se a exclusão
    // do login falhar por algum motivo) e depois a conta de login.
    const { error: erroPerfilDelete } = await admin.from("perfis").delete().eq("id", id);
    if (erroPerfilDelete) {
      res.status(500).json({ error: "Não foi possível apagar o perfil: " + erroPerfilDelete.message });
      return;
    }

    const { error: erroAuthDelete } = await admin.auth.admin.deleteUser(id);
    if (erroAuthDelete) {
      res.status(500).json({ error: "Perfil apagado, mas houve um erro ao excluir o login: " + erroAuthDelete.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro de conexão com o servidor. Tente novamente." });
  }
}
