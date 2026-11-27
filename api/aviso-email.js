// =============================================================================
// AVISOS POR E-MAIL (Projeto Master · seção 19)
// Chamado pelo próprio banco (gatilho do Supabase, ver supabase-avisos-email.sql)
// sempre que entra:
//   • um pedido de atendimento na Sala      → AVISO_EMAIL_SALA
//   • um interessado na Fomento Paraná      → AVISO_EMAIL_FOMENTO
//   • uma empresa aguardando aprovação      → AVISO_EMAIL_ADMIN
// Envia pelo Resend (plano gratuito: 3.000 e-mails/mês, 100/dia).
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY          chave do Resend (sem ela, nada é enviado)
//   AVISO_SEGREDO           o mesmo segredo gravado no banco (avisos_config)
//   AVISO_EMAIL_SALA / AVISO_EMAIL_FOMENTO / AVISO_EMAIL_ADMIN
//                           e-mails que recebem cada aviso (vários: separe por vírgula)
//   AVISO_EMAIL_REMETENTE   opcional; padrão "Conecta Comércio <avisos@conectacomercio.app.br>"
//
// Segurança: só aceita chamadas com o segredo certo; os destinatários são fixos
// (vêm da configuração, nunca da chamada); o texto do e-mail é montado aqui.
// O e-mail leva só o necessário para o atendimento (nome, contato, assunto) e
// o link do painel — CPF/CNPJ e históricos não vão.
// =============================================================================
import { timingSafeEqual } from "node:crypto";

const SITE = "https://conectacomercio.app.br";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lista = (v) => String(v || "").split(",").map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
const moeda = (v) => (v ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "");

function mesmoSegredo(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

// Para cada tabela: quem recebe, assunto e linhas do e-mail.
const AVISOS = {
  sala_pedidos: {
    para: () => lista(process.env.AVISO_EMAIL_SALA),
    cor: "#0B2474",
    titulo: "Sala do Empreendedor",
    assunto: (r) => `Novo pedido de atendimento: ${r.nome}`,
    linhas: (r) => [
      ["Nome", r.nome], ["WhatsApp", r.whatsapp], ["Serviço", r.servico],
      ["Data desejada", r.data_agendada ? `${String(r.data_agendada).split("-").reverse().join("/")} ${r.hora_agendada || ""}` : ""],
      ["Mensagem", r.mensagem],
    ],
    link: `${SITE}/sala/agente`, rotuloLink: "Abrir Pedidos do site",
  },
  fomento_interesses: {
    para: () => lista(process.env.AVISO_EMAIL_FOMENTO),
    cor: "#006DAB",
    titulo: "Fomento Paraná · Agente de Crédito",
    assunto: (r) => `Novo interessado em crédito: ${r.nome}`,
    linhas: (r) => [
      ["Nome", r.nome], ["WhatsApp", r.whatsapp], ["Cidade", r.cidade],
      ["Valor desejado", moeda(r.valor_desejado)], ["Prazo", r.prazo_meses ? `${r.prazo_meses} meses` : ""],
      ["Mensagem", r.mensagem],
    ],
    link: "https://fomento-ivatuba.vercel.app/agente", rotuloLink: "Abrir Pré-cadastros do site",
  },
  empresas: {
    para: () => lista(process.env.AVISO_EMAIL_ADMIN),
    cor: "#0A5AA8",
    titulo: "Conecta Comércio · Administração",
    assunto: (r) => `Empresa aguardando aprovação: ${r.nome}`,
    linhas: (r) => [["Empresa", r.nome], ["Categoria", r.categoria], ["WhatsApp", r.whatsapp]],
    link: `${SITE}/#/admin`, rotuloLink: "Abrir o Painel Admin",
    so: (r) => !r.status || r.status === "pendente",
  },
};

function montarHtml(cfg, r) {
  const linhas = cfg.linhas(r).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
  return `<!doctype html><html><body style="margin:0;background:#F3F6FA;font-family:Inter,Arial,sans-serif;color:#0E2233">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:${cfg.cor};color:#fff;border-radius:14px 14px 0 0;padding:16px 20px;font-weight:700">${esc(cfg.titulo)}</div>
    <div style="background:#fff;border:1px solid #DCE7F2;border-top:0;border-radius:0 0 14px 14px;padding:20px">
      <p style="margin:0 0 14px;font-size:16px;font-weight:700">${esc(cfg.assunto(r))}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${linhas.map(([k, v]) => `<tr><td style="padding:6px 0;color:#5C7186;width:130px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join("")}
      </table>
      <p style="margin:20px 0 0"><a href="${cfg.link}" style="background:${cfg.cor};color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block">${esc(cfg.rotuloLink)}</a></p>
    </div>
    <p style="font-size:11px;color:#8A9BAE;text-align:center;margin-top:14px">Aviso automático do Conecta Comércio · Ivatuba-PR. Desenvolvedor: Gabriel Oliveira</p>
  </div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido" }); return; }
  if (!mesmoSegredo(req.headers["x-aviso-segredo"], process.env.AVISO_SEGREDO)) { res.status(401).json({ error: "Não autorizado" }); return; }

  const { tabela, registro } = req.body || {};
  const cfg = AVISOS[tabela];
  if (!cfg || !registro || typeof registro !== "object") { res.status(400).json({ error: "Aviso desconhecido" }); return; }
  if (cfg.so && !cfg.so(registro)) { res.status(200).json({ enviado: false, motivo: "não precisa de aviso" }); return; }

  const para = cfg.para();
  const chave = process.env.RESEND_API_KEY;
  if (!chave || !para.length) { res.status(200).json({ enviado: false, motivo: "e-mail ainda não configurado" }); return; }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.AVISO_EMAIL_REMETENTE || "Conecta Comércio <avisos@conectacomercio.app.br>",
        to: para,
        subject: cfg.assunto(registro).slice(0, 150),
        html: montarHtml(cfg, registro),
      }),
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) { res.status(502).json({ enviado: false, error: dados?.message || `Resend respondeu ${r.status}` }); return; }
    res.status(200).json({ enviado: true, id: dados.id });
  } catch (e) {
    res.status(502).json({ enviado: false, error: String(e?.message || e) });
  }
}
