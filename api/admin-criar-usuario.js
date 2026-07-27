// Permite que um administrador crie contas de usuário (cliente, empresário,
// prestador de serviço ou admin) direto pelo painel, sem passar pelo
// auto-cadastro público. Usa a chave de serviço do Supabase
// (SUPABASE_SERVICE_ROLE_KEY), que nunca pode ficar no navegador - por isso
// essa conta é criada aqui, no servidor.

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
      res.status(403).json({ error: "Só administradores podem cadastrar usuários por aqui." });
      return;
    }

    const {
      nome, email, senha, tipo,
      empresaNome, empresaCategoria, empresaWhatsapp, empresaInstagram, empresaEndereco, empresaGoogleMaps,
      prestadorServico, prestadorWhatsapp, prestadorInstagram, prestadorEndereco, prestadorGoogleMaps,
    } = req.body || {};
    if (!nome || !email || !senha) {
      res.status(400).json({ error: "Preencha nome, e-mail e senha." });
      return;
    }
    if (!["cliente", "empresario", "prestador", "admin"].includes(tipo)) {
      res.status(400).json({ error: "Tipo de conta inválido." });
      return;
    }
    if (tipo === "prestador" && !prestadorServico) {
      res.status(400).json({ error: "Informe o serviço prestado." });
      return;
    }
    if (String(senha).length < 6) {
      res.status(400).json({ error: "A senha deve ter ao menos 6 caracteres." });
      return;
    }

    const { data: novoUsuario, error: erroCriacao } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (erroCriacao) {
      res.status(400).json({ error: erroCriacao.message || "Não foi possível criar o usuário." });
      return;
    }

    const { error: erroInsercaoPerfil } = await admin.from("perfis").insert({
      id: novoUsuario.user.id,
      nome,
      tipo,
    });

    if (erroInsercaoPerfil) {
      res.status(500).json({ error: "Usuário criado, mas houve um erro ao salvar o perfil: " + erroInsercaoPerfil.message });
      return;
    }

    if (tipo === "empresario" && empresaNome) {
      const { error: erroEmpresa } = await admin.from("empresas").insert({
        dono_id: novoUsuario.user.id,
        nome: empresaNome,
        categoria: empresaCategoria || "Outros",
        whatsapp: empresaWhatsapp || null,
        instagram: empresaInstagram || null,
        endereco: empresaEndereco || null,
        google_maps_url: empresaGoogleMaps || null,
        status: "aprovada",
      });
      if (erroEmpresa) {
        res.status(200).json({ ok: true, id: novoUsuario.user.id, avisoEmpresa: "Usuário criado, mas a empresa não pôde ser cadastrada: " + erroEmpresa.message });
        return;
      }
    }

    if (tipo === "prestador") {
      const { error: erroPrestador } = await admin.from("prestadores").insert({
        dono_id: novoUsuario.user.id,
        nome,
        servico: prestadorServico,
        whatsapp: prestadorWhatsapp || null,
        instagram: prestadorInstagram || null,
        endereco: prestadorEndereco || null,
        google_maps_url: prestadorGoogleMaps || null,
        status: "aprovado",
      });
      if (erroPrestador) {
        res.status(200).json({ ok: true, id: novoUsuario.user.id, avisoEmpresa: "Usuário criado, mas o prestador não pôde ser cadastrado: " + erroPrestador.message });
        return;
      }
    }

    res.status(200).json({ ok: true, id: novoUsuario.user.id });
  } catch (err) {
    res.status(500).json({ error: "Erro de conexão com o servidor. Tente novamente." });
  }
}
