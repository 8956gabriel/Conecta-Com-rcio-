// =============================================================================
// VISITAS E CLIQUES — registro (sem dado pessoal)
// Grava em page_views (supabase-visitas-cliques.sql) o que o visitante viu e
// clicou: entrada no site, troca de página, perfil de empresa aberto e cliques
// em WhatsApp, Instagram, mapa, telefone, Facebook e sites.
// O "visitante" é um código aleatório do aparelho, só para contar visitantes
// únicos — não tem nome, e-mail nem conta. Acessos da equipe (admin, editor,
// visualizador) não entram, para não inflar os números.
// Se a tabela ainda não tiver as colunas novas, o registro falha em silêncio.
// =============================================================================
import { supabase, supabaseConfigurado } from "../supabaseClient";

let ignorar = false;
export function ignorarRastreio(sim) { ignorar = !!sim; }

// Empresa aberta no momento (perfil): os cliques dentro dele contam para ela
let alvoAtual = null;
export function definirAlvoAtual(a) { alvoAtual = a || null; }

function idVisitante() {
  try {
    let v = localStorage.getItem("cc_visitante");
    if (!v) { v = (crypto.randomUUID?.() || String(Math.random()).slice(2)) .slice(0, 36); localStorage.setItem("cc_visitante", v); }
    return v;
  } catch { return null; }
}

const corta = (t, n) => (t == null ? null : String(t).replace(/\s+/g, " ").trim().slice(0, n) || null);

export function registrar({ tipo = "pagina", ambiente = "conecta", pagina = null, alvo = null, alvoTipo = null, alvoId = null } = {}) {
  if (!supabaseConfigurado || ignorar) return;
  try {
    supabase.from("page_views").insert({
      tipo, ambiente, pagina: corta(pagina, 60), alvo: corta(alvo, 160), alvo_tipo: corta(alvoTipo, 30), alvo_id: corta(alvoId, 60), visitante: idVisitante(),
    }).then(() => {}, () => {});
  } catch { /* nunca atrapalha o site */ }
}

// Que tipo de link é este?
export function tipoDoLink(href) {
  const h = String(href || "").toLowerCase();
  if (h.includes("wa.me") || h.includes("api.whatsapp.com") || h.includes("chat.whatsapp.com")) return "whatsapp";
  if (h.includes("instagram.com")) return "instagram";
  if (h.includes("facebook.com")) return "facebook";
  if (h.startsWith("tel:")) return "telefone";
  if (h.includes("google.com/maps") || h.includes("maps.app.goo.gl") || h.includes("goo.gl/maps") || h.includes("waze.com")) return "mapa";
  if (h.startsWith("http") && !h.includes(window.location.hostname)) return "site";
  return null;
}

// O nome do que foi clicado: a mensagem pronta do WhatsApp já traz o nome
// ("...saber mais sobre a Padaria X.", "Vi o produto \"Pão\"..."); nos outros
// links, o título do cartão em volta do botão.
function nomeDoAlvo(a, href) {
  try {
    const texto = new URL(href).searchParams.get("text") || "";
    const aspas = texto.match(/[“"]([^"”]{2,120})[”"]/);
    if (aspas) return aspas[1];
    const sobre = texto.match(/sobre (?:a |o |os |as )?(?:serviço de )?(.{2,120}?)[.!]?$/i);
    if (sobre) return sobre[1];
  } catch { /* não é URL com texto */ }
  const card = a.closest("article, section, [role='dialog'], .rounded-2xl, .rounded-3xl");
  const titulo = card?.querySelector("h1, h2, h3, .font-display");
  return corta(titulo?.innerText || a.getAttribute("aria-label") || a.innerText, 120);
}

// Escuta os cliques da página inteira (uma vez por site)
export function instalarRastreioCliques(contexto) {
  const ouvir = (e) => {
    const a = e.target?.closest?.("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    const t = tipoDoLink(href);
    if (!t) return;
    const ctx = contexto?.() || {};
    const emp = a.closest("[role='dialog'], .fixed") && alvoAtual ? alvoAtual : null; // clique dentro do perfil aberto
    registrar({ tipo: "clique", ambiente: ctx.ambiente || "conecta", pagina: ctx.pagina, alvoTipo: t, alvo: emp?.nome || nomeDoAlvo(a, href), alvoId: emp?.id });
  };
  document.addEventListener("click", ouvir, true);
  return () => document.removeEventListener("click", ouvir, true);
}
