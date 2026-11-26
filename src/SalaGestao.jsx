// =============================================================================
// SALA DO EMPREENDEDOR — GESTÃO
//   • AbaSelo           → checklist do Selo Sebrae de Referência em Atendimento
//   • AbaGestao         → checklists de rotina, metas, pendências, documentos
//   • AbaOrientacoes    → orientação empresarial (MEI, DAS, NF, crédito...)
//   • AbaEmpreendedores → histórico por empreendedor, CPF/CNPJ protegido (LGPD)
//   • AbaIndicadores    → painel do administrador
//   • PortalAcesso      → tela com as 3 grandes opções de acesso
//   • OrientacoesPublicas → dicas publicadas na página pública
// Tabelas: ver supabase-sala-gestao.sql.
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  Award, CheckCircle2, Circle, Clock, Copy, Download, ExternalLink, Eye, FileText, FolderOpen, Globe, Lock, Paperclip,
  Pencil, PlusCircle, Search, ShieldCheck, Store, Target, Trash2, Upload, Users, X, BookOpen, BarChart3, AlertTriangle,
} from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import { exportarPDF } from "./central/motor.js";

const G = {
  blue: "var(--cor-principal, #0A5AA8)", blueHex: "#0A5AA8", blueDeep: "var(--cor-principal-profunda, #052A4D)", blueTint: "#EAF2FB", blueTint2: "#F5F9FD",
  ink: "#0E2233", muted: "#5C7186", soft: "#8896A6", line: "#DCE7F2", danger: "#B4462F", green: "#1E8E5A", greenTint: "#E7F6EE", amber: "#E8A23D",
};
const inputCls = "font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white w-full";
const inputStyle = { borderColor: G.line };
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const dataBR = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const soDigitos = (v) => String(v || "").replace(/\D/g, "");
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function copiarTexto(t) { try { navigator.clipboard?.writeText(t); return true; } catch { return false; } }

function Bt({ children, onClick, cor = G.blue, contorno = false, type = "button", disabled, title }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
      style={contorno ? { border: `1px solid ${G.line}`, color: cor, background: "#fff" } : { background: cor, color: "#fff" }}>{children}</button>
  );
}
function Selo({ texto, cor }) { return <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${cor}1A`, color: cor }}>{texto}</span>; }
function Cab({ eyebrow, title, sub, direita }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
      <div>
        <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: G.blue }}>{eyebrow}</p>
        <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: G.ink }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1" style={{ color: G.muted }}>{sub}</p>}
      </div>
      {direita}
    </div>
  );
}
function KPI({ titulo, valor, sub, cor = G.blueHex, icon: Icon }) {
  return (
    <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}>
      <div className="flex items-center gap-2">
        {Icon && <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cor}14`, color: cor }}><Icon size={16} /></span>}
        <p className="font-body text-xs font-bold" style={{ color: G.muted }}>{titulo}</p>
      </div>
      <p className="font-display font-extrabold text-2xl mt-2" style={{ color: G.ink }}>{valor}</p>
      {sub && <p className="font-body text-[11px] mt-0.5" style={{ color: G.soft }}>{sub}</p>}
    </div>
  );
}
function Barras({ itens, cor = G.blueHex }) {
  const max = Math.max(1, ...itens.map(([, v]) => v));
  return (
    <div className="flex flex-col gap-2">
      {itens.map(([r, v]) => (
        <div key={r}>
          <div className="flex justify-between font-body text-xs mb-1" style={{ color: "#425A70" }}><span className="truncate pr-2">{r}</span><span className="font-bold">{v}</span></div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: G.blueTint }}><div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: cor }} /></div>
        </div>
      ))}
    </div>
  );
}

// Estado local para o modo demonstração (sobrevive à troca de aba)
const demo = { selo: null, checklist: null, marcas: [], documentos: [], orientacoes: [], acessos: [] };
const demoId = () => `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

async function enviarArquivo(pasta, arquivo) {
  if (!supabaseConfigurado) return { url: URL.createObjectURL(arquivo) };
  const caminho = `${pasta}/${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const { error } = await supabase.storage.from("uploads").upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) return { error };
  return { url: supabase.storage.from("uploads").getPublicUrl(caminho).data.publicUrl };
}

export async function registrarAcessoSala(acao, referencia, nome) {
  const reg = { acao, referencia: referencia || null, usuario_nome: nome || null };
  if (!supabaseConfigurado) { demo.acessos.unshift({ id: demoId(), criado_em: new Date().toISOString(), ...reg }); return; }
  const { data } = await supabase.auth.getUser();
  await supabase.from("sala_acessos").insert({ ...reg, usuario_id: data?.user?.id });
}

// =============================================================================
// SELO SEBRAE — critérios oficiais do ciclo 2026 (Regulamento do Selo Sebrae
// de Referência em Atendimento — Salas do Empreendedor, versão 15/07/2026).
// Fonte: sebrae.com.br/selosebraedereferencia. Ao sair um novo regulamento,
// a equipe pode editar os itens ou cadastrar o novo ciclo.
// =============================================================================
export const REGULAMENTO_SELO_URL = "https://sebrae.com.br/sites/PortalSebrae/selosebraedereferencia";
export const SELO_2026 = [
  { numero: 1, pilar: "1. Qualidade no atendimento remoto e digital", criterio: "Cliente oculto", pontos: 18, prazo: null,
    orientacao: "Empresa contratada faz 3 tentativas de contato pelos canais informados na inscrição, em dias e horários diferentes. Cada tentativa atendida vale até 6 pontos (receptividade, personalização, conhecimento técnico e entrega de soluções, finalização). Tentativa não atendida vale 0.",
    evidencia: "Inserida pela empresa contratada. A Sala deve manter os canais informados sempre ativos e atender bem em todas as tentativas." },
  { numero: 2, pilar: "1. Qualidade no atendimento remoto e digital", criterio: "Registro de atendimento", pontos: 10, prazo: "2026-06-30",
    orientacao: "Registro detalhado (4 pts): 5 registros com data e hora, nome do cliente, descrição da demanda e solução dada, em linguagem clara (5 conformes = 4 pts; 4 = 2 pts; 3 ou menos = 0). Número parcial de atendimentos (6 pts): 10% em relação à densidade do município OU média mínima de 400 atendimentos por atendente, de 1º/01 a 30/06.",
    evidencia: "Prints do sistema do Sebrae ou relatório com 5 registros; print da memória de cálculo com o total de atendimentos e a data da coleta." },
  { numero: 3, pilar: "1. Qualidade no atendimento remoto e digital", criterio: "Tempo de resposta por canais digitais", pontos: 3, prazo: null,
    orientacao: "Medido nas tentativas do Cliente oculto por WhatsApp: responder em até 1 dia útil (a partir das 8h do dia útil seguinte até as 18h, horário de Brasília).",
    evidencia: "Apurado pelo Cliente oculto. Manter alguém responsável por responder o WhatsApp todos os dias." },
  { numero: 4, pilar: "2. Gestão", criterio: "Planejamento e acompanhamento", pontos: 9, prazo: "2026-05-15",
    orientacao: "Plano de Ação assinado (4 pts) até 15/05. Atas de reuniões de acompanhamento distintas (5 pts): 2 atas = 2,5 pts; 3 ou mais = 5 pts; atas até 14/08.",
    evidencia: "Plano de Ação assinado (PDF) e no mínimo 3 atas de reuniões distintas, cada uma em um PDF separado." },
  { numero: 5, pilar: "2. Gestão", criterio: "Capacitação das equipes de Atendimento", pontos: 7, prazo: "2026-08-04",
    orientacao: "100% dos atendentes capacitados, com no mínimo 4 cursos distintos, incluindo os 2 cursos obrigatórios do Contrata+Brasil e os 3 temas obrigatórios. 60h ou mais = 7 pts; 35–59h = 5 pts; 30–34h = 3,5 pts; menos de 30h = 0. Só valem capacitações de 2026.",
    evidencia: "Certificados ou declarações reunidos em um único PDF. Mudança de equipe exige declaração assinada (até 04/08)." },
  { numero: 6, pilar: "3. Oferta e Realização de Soluções", criterio: "Oferta de soluções", pontos: 4, prazo: null,
    orientacao: "10 ou mais ofertas validadas = 1,5 pt; 20 ou mais = 2,5 pts; 30 ou mais = 4 pts. Usar apenas um tipo de evidência.",
    evidencia: "Registros no sistema de atendimento do Sebrae OU prints de posts/mensagens mostrando a solução, a data e o local." },
  { numero: 7, pilar: "3. Oferta e Realização de Soluções", criterio: "Realização de soluções", pontos: 6, prazo: null,
    orientacao: "Exige a capacitação obrigatória de Compras Governamentais (mínimo 2h e 15 participantes distintos). Com ela validada: 1 a 6 soluções = 2 pts; 7 ou mais = 6 pts. Sem ela, o máximo é 4 pts.",
    evidencia: "Lista de presença, print do sistema do Sebrae ou print do painel de monitoramento de cada solução realizada." },
  { numero: 8, pilar: "4. Ambiente de Negócios", criterio: "Divulgação de editais de compras governamentais", pontos: 3, prazo: null,
    orientacao: "Pelo menos 1 edital precisa ser chamada pública da agricultura familiar (senão, zero). Até 5 editais = 0; 6 a 9 = 1 pt; 10 ou mais = 3 pts. Publicar no mínimo 2 dias úteis antes da sessão.",
    evidencia: "Prints de editais distintos publicados em redes sociais institucionais ou grupos (não mensagens individuais), ou registros de atendimento com os dados do edital, em um PDF." },
  { numero: 9, pilar: "4. Ambiente de Negócios", criterio: "Orientações para participação em compras governamentais", pontos: 1, prazo: null,
    orientacao: "No mínimo 15 orientações individuais, a clientes distintos.",
    evidencia: "Prints de 15 registros de atendimento individuais com número do edital, objeto, documentos exigidos e data do certame, em um PDF." },
  { numero: 10, pilar: "4. Ambiente de Negócios", criterio: "Orientações sobre cadastro na plataforma Contrata+Brasil", pontos: 1.5, prazo: null,
    orientacao: "No mínimo 15 orientações individuais sobre como fazer o cadastro, para empresários e/ou agricultores familiares.",
    evidencia: "Prints de 15 registros de atendimento individuais mostrando a orientação e o link da plataforma, em um PDF." },
  { numero: 11, pilar: "4. Ambiente de Negócios", criterio: "Orientações sobre acesso a crédito", pontos: 1, prazo: null,
    orientacao: "15 orientações individuais de crédito OU um evento coletivo com lista de presença de pelo menos 15 pessoas.",
    evidencia: "Prints dos 15 registros OU lista de presença (nome, data, assinaturas e Sala organizadora), em um PDF." },
  { numero: 12, pilar: "4. Ambiente de Negócios", criterio: "Realização de parcerias pela Sala do Empreendedor", pontos: 2, prazo: null,
    orientacao: "2 parcerias com ações executadas = 1 pt; 3 parcerias = 2 pts. Parcerias com o Sebrae, a prefeitura ou MEIs não valem. Termo de no mínimo 3 meses; após 10/03/2026, assinatura digital.",
    evidencia: "Termo de parceria + relatório de execução com resultados e pelo menos 2 comprovações (foto com legenda, lista de presença ou notícia), em um PDF." },
  { numero: 13, pilar: "4. Ambiente de Negócios", criterio: "Dispensa de alvará, vedação de cobrança de taxas e emolumentos para o MEI", pontos: 1.5, prazo: null,
    orientacao: "Comprovar que, no município, o MEI tem dispensa de alvará e não paga taxas e emolumentos, com validade em 2026.",
    evidencia: "Print do sistema municipal, norma municipal vigente (lei, decreto ou instrução normativa) ou documento assinado pelo Prefeito." },
  { numero: 14, pilar: "5. Infraestrutura", criterio: "Estrutura física", pontos: 8, prazo: "2026-05-15",
    orientacao: "Fachada/área externa = 4 pts; área interna = 4 pts. Avaliados: comunicação visual, identificação do Sebrae, organização, espaço de espera e mobiliário. Inserção até 15/05 às 17h59.",
    evidencia: "1 foto externa da entrada, 2 fotos internas e 1 vídeo de até 20 segundos mostrando o caminho do cliente (sem ser selfie)." },
  { numero: 15, pilar: "5. Infraestrutura", criterio: "Número de contato próprio dedicado para atendimento ao Cliente", pontos: 5, prazo: "2026-06-15",
    orientacao: "Tudo ou nada: 5 pts só se todas as condições forem atendidas. Número institucional divulgado nos canais oficiais e comprovação de que pertence à instituição.",
    evidencia: "Print do número nos canais oficiais (inserido pela empresa contratada) + documento oficial, conta da operadora, declaração assinada ou contrato de telefonia (até 15/06)." },
  { numero: 16, pilar: "6. Presença Digital", criterio: "Validação de canais remotos e digitais de atendimento informados e disponibilizados em canais digitais", pontos: 6, prazo: null,
    orientacao: "Print do canal digital ativo, com publicações relevantes do ano (última há no máximo 2 meses) = 4 pts. Print do link informado na inscrição reunindo todos os canais em um só lugar = 2 pts. Os canais precisam ficar ativos o ciclo todo.",
    evidencia: "Verificado pela empresa contratada a qualquer momento do ciclo." },
  { numero: 17, pilar: "7. Cobertura ou Produtividade", criterio: "Cobertura ou Produtividade", pontos: 14, prazo: null,
    orientacao: "Cobertura: % de empresas (PJ) distintas atendidas sobre a base da Receita (31/12/2025): menos de 5% = 0; 5–9,99% = 2,5; 10–14,99% = 3,5; 15–19,99% = 5; 20–24,99% = 8; 25% ou mais = 14. Produtividade: média de atendimentos por atendente, mínimo de 20% de atendimentos a CNPJs únicos, limite de 720 por atendente — confira as faixas de pontos no regulamento.",
    evidencia: "Print do painel de monitoramento com as PJs distintas atendidas (inserido pela empresa contratada, conforme cronograma)." },
];
const STATUS_SELO = { nao_iniciado: { r: "Não iniciado", c: "#8896A6" }, em_andamento: { r: "Em andamento", c: "#E8A23D" }, concluido: { r: "Concluído", c: "#1E8E5A" } };

// Categorias do Selo (Regulamento 2026, Art. 23): estadual Bronze/Prata/Ouro; nacional Diamante = 100 pontos (só para quem foi Ouro)
export const FAIXAS_SELO = [
  { k: "diamante", r: "Diamante", emoji: "💎", min: 100, cor: "#0EA5C6", fundo: "#E6F8FC", txt: "100 pontos — etapa nacional (só para quem conquistou o Ouro)" },
  { k: "ouro", r: "Ouro", emoji: "🥇", min: 90, cor: "#C99700", fundo: "#FFF7D6", txt: "90 a 100 pontos" },
  { k: "prata", r: "Prata", emoji: "🥈", min: 81, cor: "#7C8A99", fundo: "#F0F3F6", txt: "81 a 89,99 pontos" },
  { k: "bronze", r: "Bronze", emoji: "🥉", min: 75, cor: "#B06A35", fundo: "#FBEFE6", txt: "75 a 80,99 pontos" },
];
export function faixaSelo(pontos) {
  return FAIXAS_SELO.find((f) => pontos >= f.min - 1e-9) || { k: "nenhum", r: "Não selado", emoji: "⏳", min: 0, cor: "#B4462F", fundo: "#FBEAE5", txt: "abaixo de 75 pontos" };
}
function TrofeuSelo({ itens, prontos, total }) {
  const pct = total ? (prontos / total) * 100 : 0;
  const pontos = total ? (prontos * 100) / total : 0;
  const atual = faixaSelo(pontos);
  const proxima = [...FAIXAS_SELO].reverse().find((f) => f.min > pontos + 1e-9);
  const pendentes = (itens || []).filter((i) => i.status !== "concluido").sort((a, b) => Number(b.pontos || 0) - Number(a.pontos || 0));
  const possivel = pontos + pendentes.reduce((s, i) => s + Number(i.pontos || 0), 0);
  const fmt = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return (
    <div className="rounded-2xl border p-4 md:p-5 mb-5" style={{ borderColor: atual.cor, background: atual.fundo }}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-5xl leading-none">{atual.emoji}</div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-body text-[11px] font-bold uppercase tracking-wider" style={{ color: G.muted }}>Troféu que a Sala ganharia hoje</p>
          <p className="font-display font-extrabold text-2xl" style={{ color: atual.cor }}>{atual.k === "nenhum" ? "Ainda não selaria" : `Selo ${atual.r}`}</p>
          <p className="font-body text-sm" style={{ color: G.ink }}><b>{fmt(pct)}%</b> · {fmt(pontos)} de 100 pontos com evidência pronta</p>
        </div>
        {proxima && (
          <div className="rounded-xl bg-white border px-3 py-2" style={{ borderColor: G.line }}>
            <p className="font-body text-[11px]" style={{ color: G.muted }}>Para o {proxima.emoji} {proxima.r}</p>
            <p className="font-display font-bold text-lg" style={{ color: proxima.cor }}>faltam {fmt(proxima.min - pontos)} pts</p>
          </div>
        )}
      </div>

      {/* régua com as faixas */}
      <div className="relative mt-5 mb-6">
        <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "#fff" }}>
          <div style={{ width: "75%", background: "#F6D9D2" }} />
          <div style={{ width: "6%", background: "#F2D2BC" }} />
          <div style={{ width: "9%", background: "#DCE2E8" }} />
          <div style={{ width: "10%", background: "#F7E7A6" }} />
        </div>
        <div className="absolute top-0 h-3 rounded-full" style={{ width: `${Math.min(100, pontos)}%`, background: atual.cor, opacity: 0.85 }} />
        {[[75, "🥉 75"], [81, "🥈 81"], [90, "🥇 90"], [100, "💎 100"]].map(([v, r]) => (
          <div key={v} className="absolute top-4 -translate-x-1/2 font-body text-[10px] font-bold whitespace-nowrap" style={{ left: `${v === 100 ? 97 : v}%`, color: G.muted }}>{r}</div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[...FAIXAS_SELO].reverse().map((f) => {
          const ok = pontos >= f.min - 1e-9;
          return (
            <div key={f.k} className="rounded-xl bg-white border px-3 py-2" style={{ borderColor: ok ? f.cor : G.line, opacity: ok ? 1 : 0.75 }}>
              <p className="font-display font-bold text-sm" style={{ color: f.cor }}>{f.emoji} {f.r} {ok ? "✓" : ""}</p>
              <p className="font-body text-[11px]" style={{ color: G.muted }}>{f.txt}</p>
            </div>
          );
        })}
      </div>

      {pendentes.length > 0 && (
        <div className="mt-3 rounded-xl bg-white border px-3 py-2.5" style={{ borderColor: G.line }}>
          <p className="font-display font-bold text-xs mb-1" style={{ color: G.ink }}>Para subir de categoria, conclua com evidência:</p>
          <ul className="font-body text-xs space-y-0.5" style={{ color: "#425A70" }}>
            {pendentes.map((i) => <li key={i.id}>• {i.numero}. {i.criterio} — <b>{fmt(i.pontos || 0)} pts</b> ({STATUS_SELO[i.status]?.r || i.status})</li>)}
          </ul>
          <p className="font-body text-[11px] mt-1.5" style={{ color: G.soft }}>Concluindo tudo, a Sala chegaria a {fmt(possivel)} pontos ({faixaSelo(possivel).emoji} {faixaSelo(possivel).r}).</p>
        </div>
      )}
      <p className="font-body text-[10px] mt-2" style={{ color: G.soft }}>Estimativa interna pelos critérios marcados como concluídos. A nota oficial é dada pelo Comitê do Sebrae (o Cliente oculto, por exemplo, depende das ligações e visitas de avaliação). Faixas: Regulamento do Selo 2026, Art. 23.</p>
    </div>
  );
}

export function AbaSelo({ ctx }) {
  const [ciclo, setCiclo] = useState(2026);
  const [itens, setItens] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [filtroPilar, setFiltroPilar] = useState("");

  const carregar = () => {
    if (!supabaseConfigurado) { setItens(demo.selo || []); return; }
    setItens(null);
    supabase.from("sala_selo_itens").select("*").eq("ciclo", ciclo).order("numero").then(({ data, error }) => {
      if (error) { ctx.avisar(/relation|schema cache/i.test(error.message) ? "Falta rodar o arquivo supabase-sala-gestao.sql no Supabase." : error.message, "erro"); setItens([]); return; }
      setItens(data || []);
    });
  };
  useEffect(carregar, [ciclo]);

  const carregarCriterios = async () => {
    const linhas = SELO_2026.map((c) => ({ ...c, ciclo, prazo: ciclo === 2026 ? c.prazo : null, status: "nao_iniciado", anexos: [] }));
    if (!supabaseConfigurado) { demo.selo = linhas.map((l) => ({ ...l, id: demoId() })); setItens(demo.selo); return; }
    const { data, error } = await supabase.from("sala_selo_itens").insert(linhas).select();
    if (error) { ctx.avisar("Não consegui carregar: " + error.message, "erro"); return; }
    setItens((data || []).sort((a, b) => a.numero - b.numero));
    ctx.avisar("Critérios do Selo carregados.");
  };
  const salvar = async (item, campos) => {
    const novo = { ...item, ...campos, atualizado_em: new Date().toISOString() };
    if (!supabaseConfigurado) { demo.selo = demo.selo.map((x) => (x.id === item.id ? novo : x)); setItens([...demo.selo]); return true; }
    const { error } = await supabase.from("sala_selo_itens").update({ ...campos, atualizado_em: novo.atualizado_em }).eq("id", item.id);
    if (error) { ctx.avisar("Não consegui salvar: " + error.message, "erro"); return false; }
    setItens((l) => l.map((x) => (x.id === item.id ? novo : x)));
    return true;
  };
  const anexar = async (item, e) => {
    const arq = e.target.files?.[0]; e.target.value = "";
    if (!arq) return;
    setEnviando(item.id);
    const { url, error } = await enviarArquivo(`sala-selo/${ciclo}`, arq);
    setEnviando(null);
    if (error) { ctx.avisar("Não consegui enviar: " + error.message, "erro"); return; }
    if (await salvar(item, { anexos: [...(item.anexos || []), { nome: arq.name, url, em: new Date().toISOString() }] })) ctx.avisar("Comprovante anexado.");
  };

  const lista = (itens || []).filter((i) => !filtroPilar || i.pilar === filtroPilar);
  const pilares = Array.from(new Set((itens || []).map((i) => i.pilar)));
  const total = (itens || []).reduce((s, i) => s + Number(i.pontos || 0), 0);
  const prontos = (itens || []).filter((i) => i.status === "concluido").reduce((s, i) => s + Number(i.pontos || 0), 0);
  const nConcl = (itens || []).filter((i) => i.status === "concluido").length;
  const atrasados = (itens || []).filter((i) => i.prazo && i.prazo < hojeISO() && i.status !== "concluido").length;

  const [gerandoDossie, setGerandoDossie] = useState(false);
  const dossie = async () => {
    setGerandoDossie(true);
    try {
      const { gerarDossieSelo } = await import("./SalaDossieSelo.js");
      await gerarDossieSelo({ ciclo, itens, statusRotulo: STATUS_SELO, faixa: faixaSelo });
    } catch (e) { ctx.avisar("Não consegui gerar o dossiê: " + (e?.message || e), "erro"); }
    setGerandoDossie(false);
  };

  const pdf = () => exportarPDF(`selo-sebrae-${ciclo}`, `Selo Sebrae de Referência em Atendimento — Ciclo ${ciclo}`, [{
    titulo: "Checklist de acompanhamento", cabecalho: ["Nº", "Critério", "Pts", "Evidência necessária", "Responsável", "Prazo", "Status", "Anexos"],
    linhas: (itens || []).map((i) => [i.numero ?? "", `${i.criterio}\n(${i.pilar || ""})`, i.pontos ?? "", i.evidencia || "", i.responsavel || "", dataBR(i.prazo), STATUS_SELO[i.status]?.r, (i.anexos || []).length]),
  }], `Estimativa interna: ${prontos.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} pontos (${faixaSelo(total ? (prontos * 100) / total : 0).r}). Faixas 2026: Bronze 75–80,99 · Prata 81–89,99 · Ouro 90–100 · Diamante 100 (nacional). Pontuação final definida pelo Sebrae.`, "Sala do Empreendedor · Ivatuba");

  return (
    <div>
      <Cab eyebrow="Qualidade" title="Selo Sebrae de Referência em Atendimento" sub="Checklist dos critérios do regulamento oficial: quem faz, até quando, qual evidência e os comprovantes anexados."
        direita={
          <div className="flex flex-wrap gap-2 items-center">
            <select value={ciclo} onChange={(e) => setCiclo(Number(e.target.value))} className="font-body text-sm border rounded-lg px-2 py-2 outline-none" style={inputStyle}>
              {[2026, 2027].map((a) => <option key={a} value={a}>Ciclo {a}</option>)}
            </select>
            {itens?.length > 0 && <Bt contorno onClick={pdf}><Download size={14} /> PDF do checklist</Bt>}
            {itens?.length > 0 && <Bt onClick={dossie} disabled={gerandoDossie}><Download size={14} /> {gerandoDossie ? "Gerando dossiê..." : "Dossiê de evidências"}</Bt>}
            <a href={REGULAMENTO_SELO_URL} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white" style={{ borderColor: G.line, color: G.blue }}>Regulamento oficial <ExternalLink size={12} /></a>
          </div>
        } />

      <div className="rounded-xl px-3.5 py-2.5 mb-4 font-body text-xs flex gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Os critérios abaixo foram transcritos do Regulamento do Selo para Salas do Empreendedor, ciclo 2026 (versão 15/07/2026). Antes de enviar evidências, confira sempre a versão mais recente no site do Sebrae. A pontuação mostrada aqui é só para acompanhamento interno — quem pontua é o Comitê do Sebrae.</span>
      </div>

      {itens === null ? <p className="font-body text-sm" style={{ color: G.muted }}>Carregando...</p> : itens.length === 0 ? (
        <div className="rounded-2xl border p-6 text-center bg-white" style={{ borderColor: G.line }}>
          <Award size={32} className="mx-auto" color={G.blueHex} />
          <p className="font-display font-bold mt-2" style={{ color: G.ink }}>Checklist do ciclo {ciclo} ainda não criado</p>
          <p className="font-body text-sm mt-1" style={{ color: G.muted }}>{ciclo === 2026 ? "Carregue os 17 critérios do regulamento oficial de 2026." : "Quando o regulamento deste ciclo sair, carregue a base de 2026 e ajuste os critérios que mudarem."}</p>
          <div className="mt-4"><Bt onClick={carregarCriterios}><PlusCircle size={14} /> Carregar critérios {ciclo === 2026 ? "do ciclo 2026" : "(base 2026)"}</Bt></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPI titulo="Critérios concluídos" valor={`${nConcl}/${itens.length}`} icon={CheckCircle2} cor={G.green} />
            <KPI titulo="Pontos com evidência pronta" valor={`${prontos.toLocaleString("pt-BR")} / ${total.toLocaleString("pt-BR")}`} sub="estimativa interna" icon={Award} />
            <KPI titulo="Em andamento" valor={itens.filter((i) => i.status === "em_andamento").length} icon={Clock} cor={G.amber} />
            <KPI titulo="Prazo vencido" valor={atrasados} sub="sem concluir" icon={AlertTriangle} cor={G.danger} />
          </div>
          <TrofeuSelo itens={itens} prontos={prontos} total={total} />
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button onClick={() => setFiltroPilar("")} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border" style={!filtroPilar ? { background: G.blueHex, color: "#fff", borderColor: G.blueHex } : { background: "#fff", color: "#425A70", borderColor: G.line }}>Todos</button>
            {pilares.map((p) => <button key={p} onClick={() => setFiltroPilar(p)} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border" style={filtroPilar === p ? { background: G.blueHex, color: "#fff", borderColor: G.blueHex } : { background: "#fff", color: "#425A70", borderColor: G.line }}>{p}</button>)}
          </div>
          <div className="flex flex-col gap-2">
            {lista.map((i) => {
              const st = STATUS_SELO[i.status] || STATUS_SELO.nao_iniciado;
              const vencido = i.prazo && i.prazo < hojeISO() && i.status !== "concluido";
              const ab = aberto === i.id;
              return (
                <div key={i.id} className="rounded-2xl border bg-white" style={{ borderColor: ab ? G.blueHex : G.line }}>
                  <button onClick={() => setAberto(ab ? null : i.id)} className="w-full text-left p-3.5 flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-extrabold text-sm shrink-0" style={{ background: `${st.c}1A`, color: st.c }}>{i.numero}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display font-bold text-sm" style={{ color: G.ink }}>{i.criterio}</span>
                      <span className="block font-body text-[11px]" style={{ color: G.soft }}>{i.pilar} · {Number(i.pontos || 0).toLocaleString("pt-BR")} pts{i.responsavel ? ` · ${i.responsavel}` : ""}{i.prazo ? ` · prazo ${dataBR(i.prazo)}` : ""}{(i.anexos || []).length ? ` · ${(i.anexos || []).length} anexo(s)` : ""}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Selo texto={st.r} cor={st.c} />
                      {vencido && <Selo texto="Prazo vencido" cor={G.danger} />}
                    </span>
                  </button>
                  {ab && (
                    <div className="px-3.5 pb-4 grid md:grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: G.line }}>
                      <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ background: G.blueTint2 }}>
                          <p className="font-body text-[10px] font-bold uppercase tracking-wide" style={{ color: G.blue }}>Orientação</p>
                          <p className="font-body text-xs mt-1" style={{ color: "#425A70" }}>{i.orientacao}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: G.greenTint }}>
                          <p className="font-body text-[10px] font-bold uppercase tracking-wide" style={{ color: G.green }}>Evidência necessária</p>
                          <p className="font-body text-xs mt-1" style={{ color: "#2F6B4E" }}>{i.evidencia}</p>
                        </div>
                      </div>
                      <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Responsável</span>
                        <input defaultValue={i.responsavel || ""} onBlur={(e) => e.target.value !== (i.responsavel || "") && salvar(i, { responsavel: e.target.value || null })} placeholder="Quem cuida deste critério" className={inputCls} style={inputStyle} /></label>
                      <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Prazo</span>
                        <input type="date" defaultValue={i.prazo || ""} onChange={(e) => salvar(i, { prazo: e.target.value || null })} className={inputCls} style={inputStyle} /></label>
                      <label className="md:col-span-2 flex flex-col gap-1"><span className="font-body text-xs font-bold">Observações / plano de melhoria</span>
                        <textarea rows={2} defaultValue={i.observacao || ""} onBlur={(e) => e.target.value !== (i.observacao || "") && salvar(i, { observacao: e.target.value || null })} className={inputCls} style={inputStyle} /></label>
                      <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                        <span className="font-body text-xs font-bold" style={{ color: G.ink }}>Status:</span>
                        {Object.entries(STATUS_SELO).map(([k, v]) => (
                          <button key={k} onClick={() => salvar(i, { status: k })} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={i.status === k ? { background: v.c, color: "#fff", borderColor: v.c } : { color: v.c, borderColor: G.line, background: "#fff" }}>{v.r}</button>
                        ))}
                      </div>
                      <div className="md:col-span-2">
                        <p className="font-body text-xs font-bold mb-1.5" style={{ color: G.ink }}>Documentos e comprovantes</p>
                        <div className="flex flex-col gap-1.5">
                          {(i.anexos || []).map((a, n) => (
                            <div key={n} className="flex items-center gap-2 font-body text-xs">
                              <Paperclip size={12} color={G.soft} />
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-semibold truncate" style={{ color: G.blue }}>{a.nome}</a>
                              <span style={{ color: G.soft }}>{dataBR(a.em)}</span>
                              <button onClick={() => salvar(i, { anexos: i.anexos.filter((_, j) => j !== n) })} style={{ color: G.danger }} title="Remover"><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                        <label className="mt-2 font-body text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer inline-flex items-center gap-1.5" style={{ borderColor: G.line, color: G.blue }}>
                          <Upload size={13} /> {enviando === i.id ? "Enviando..." : "Anexar comprovante (PDF, foto, vídeo)"}
                          <input type="file" className="hidden" accept="application/pdf,image/*,video/*,.doc,.docx,.xls,.xlsx" onChange={(e) => anexar(i, e)} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// GESTÃO DA SALA — checklists, metas/indicadores, pendências, documentos
// =============================================================================
const CHECKLIST_PADRAO = {
  diario: ["Abrir a Sala no horário divulgado", "Responder todas as mensagens do WhatsApp do dia", "Conferir a agenda e os pedidos novos do site", "Registrar todos os atendimentos do dia no sistema", "Conferir retornos e pendências com data para hoje"],
  semanal: ["Publicar conteúdo nas redes da Sala (presença digital)", "Divulgar editais de compras públicas abertos", "Retornar empreendedores com pendência ou encaminhamento", "Conferir organização, limpeza e comunicação visual da Sala", "Atualizar o calendário com cursos, mutirões e avisos"],
  mensal: ["Fechar o relatório de atendimentos do mês", "Publicar os números do mês no site", "Reunião de acompanhamento com ata (Selo — critério 4)", "Conferir o andamento do checklist do Selo Sebrae", "Planejar as estratégias do mês seguinte", "Conferir certificados de capacitação da equipe"],
};
const FREQ = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" };
function periodoAtual(freq, d = new Date()) {
  if (freq === "diario") return d.toLocaleDateString("sv-SE");
  if (freq === "mensal") return d.toLocaleDateString("sv-SE").slice(0, 7);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dia);
  const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-S${String(Math.ceil(((t - ini) / 864e5 + 1) / 7)).padStart(2, "0")}`;
}

export function AbaGestao({ ctx }) {
  const [sub, setSub] = useState("rotina");
  return (
    <div>
      <Cab eyebrow="Gestão da Sala" title="Rotina, metas e documentos" sub="Checklists, indicadores do mês, pendências de retorno e a biblioteca de modelos da equipe." />
      <div className="flex flex-wrap gap-1.5 mb-5">
        {[["rotina", "Checklists"], ["metas", "Metas e indicadores"], ["pendencias", "Pendências"], ["documentos", "Documentos e modelos"]].map(([k, r]) => (
          <button key={k} onClick={() => setSub(k)} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border" style={sub === k ? { background: G.blueHex, color: "#fff", borderColor: G.blueHex } : { background: "#fff", color: "#425A70", borderColor: G.line }}>{r}</button>
        ))}
      </div>
      {sub === "rotina" && <Checklists ctx={ctx} />}
      {sub === "metas" && <Metas ctx={ctx} />}
      {sub === "pendencias" && <Pendencias ctx={ctx} />}
      {sub === "documentos" && <Documentos ctx={ctx} />}
    </div>
  );
}

function Checklists({ ctx }) {
  const [itens, setItens] = useState(null);
  const [marcas, setMarcas] = useState([]);
  const [novo, setNovo] = useState({ frequencia: "diario", item: "" });
  const periodos = { diario: periodoAtual("diario"), semanal: periodoAtual("semanal"), mensal: periodoAtual("mensal") };

  useEffect(() => {
    if (!supabaseConfigurado) {
      if (!demo.checklist) demo.checklist = Object.entries(CHECKLIST_PADRAO).flatMap(([f, l]) => l.map((item, i) => ({ id: demoId(), frequencia: f, item, ordem: i, ativo: true })));
      setItens(demo.checklist); setMarcas(demo.marcas); return;
    }
    supabase.from("sala_checklist").select("*").eq("ativo", true).order("ordem").then(({ data, error }) => {
      if (error) { ctx.avisar("Falta rodar o arquivo supabase-sala-gestao.sql no Supabase.", "erro"); setItens([]); return; }
      setItens(data || []);
    });
    supabase.from("sala_checklist_marcas").select("*").in("periodo", Object.values(periodos)).then(({ data }) => setMarcas(data || []));
  }, []);

  const criarPadrao = async () => {
    const linhas = Object.entries(CHECKLIST_PADRAO).flatMap(([f, l]) => l.map((item, i) => ({ frequencia: f, item, ordem: i })));
    const { data, error } = await supabase.from("sala_checklist").insert(linhas).select();
    if (error) { ctx.avisar(ctx.gerir ? "Não consegui criar: " + error.message : "Só o gestor pode criar o checklist.", "erro"); return; }
    setItens(data);
  };
  const marcar = async (item) => {
    const periodo = periodos[item.frequencia];
    const ja = marcas.find((m) => m.item_id === item.id && m.periodo === periodo);
    if (!supabaseConfigurado) {
      demo.marcas = ja ? demo.marcas.filter((m) => m !== ja) : [...demo.marcas, { id: demoId(), item_id: item.id, periodo, feito_por: ctx.meuNome, feito_em: new Date().toISOString() }];
      setMarcas([...demo.marcas]); return;
    }
    if (ja) {
      const { error } = await supabase.from("sala_checklist_marcas").delete().eq("id", ja.id);
      if (!error) setMarcas((l) => l.filter((m) => m.id !== ja.id));
    } else {
      const { data, error } = await supabase.from("sala_checklist_marcas").insert({ item_id: item.id, periodo, feito_por: ctx.meuNome }).select().single();
      if (!error) setMarcas((l) => [...l, data]);
    }
  };
  const adicionar = async (e) => {
    e.preventDefault();
    if (!novo.item.trim()) return;
    const reg = { frequencia: novo.frequencia, item: novo.item.trim(), ordem: 99 };
    if (!supabaseConfigurado) { demo.checklist = [...demo.checklist, { id: demoId(), ativo: true, ...reg }]; setItens(demo.checklist); setNovo({ ...novo, item: "" }); return; }
    const { data, error } = await supabase.from("sala_checklist").insert(reg).select().single();
    if (error) { ctx.avisar("Só o gestor pode mudar o checklist.", "erro"); return; }
    setItens((l) => [...l, data]); setNovo({ ...novo, item: "" });
  };
  const remover = async (item) => {
    if (!supabaseConfigurado) { demo.checklist = demo.checklist.filter((x) => x.id !== item.id); setItens(demo.checklist); return; }
    const { error } = await supabase.from("sala_checklist").update({ ativo: false }).eq("id", item.id);
    if (error) { ctx.avisar("Só o gestor pode mudar o checklist.", "erro"); return; }
    setItens((l) => l.filter((x) => x.id !== item.id));
  };

  if (itens === null) return <p className="font-body text-sm" style={{ color: G.muted }}>Carregando...</p>;
  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border p-6 text-center bg-white" style={{ borderColor: G.line }}>
        <p className="font-display font-bold" style={{ color: G.ink }}>Checklist ainda não criado</p>
        <p className="font-body text-sm mt-1" style={{ color: G.muted }}>Crie com os itens sugeridos e ajuste depois.</p>
        <div className="mt-3"><Bt onClick={criarPadrao}><PlusCircle size={14} /> Criar checklist sugerido</Bt></div>
      </div>
    );
  }
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-4">
        {Object.keys(FREQ).map((f) => {
          const lista = itens.filter((i) => i.frequencia === f);
          const feitos = lista.filter((i) => marcas.some((m) => m.item_id === i.id && m.periodo === periodos[f])).length;
          return (
            <div key={f} className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}>
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-sm" style={{ color: G.ink }}>{FREQ[f]}</p>
                <Selo texto={`${feitos}/${lista.length}`} cor={feitos === lista.length && lista.length ? G.green : G.blueHex} />
              </div>
              <p className="font-body text-[10px] mb-2" style={{ color: G.soft }}>{f === "diario" ? dataBR(periodos.diario) : f === "semanal" ? `Semana ${periodos.semanal.slice(6)}` : `${MESES[Number(periodos.mensal.slice(5)) - 1]}/${periodos.mensal.slice(0, 4)}`}</p>
              <div className="flex flex-col gap-1.5">
                {lista.map((i) => {
                  const m = marcas.find((x) => x.item_id === i.id && x.periodo === periodos[f]);
                  return (
                    <div key={i.id} className="flex items-start gap-2 group">
                      <button onClick={() => marcar(i)} className="mt-0.5 shrink-0">{m ? <CheckCircle2 size={17} color={G.green} /> : <Circle size={17} color="#B8C7D6" />}</button>
                      <span className="flex-1 font-body text-xs" style={{ color: m ? G.soft : G.ink, textDecoration: m ? "line-through" : "none" }}>
                        {i.item}{m?.feito_por && <span className="block text-[10px] no-underline" style={{ color: G.soft }}>✓ {m.feito_por}</span>}
                      </span>
                      {ctx.gerir && <button onClick={() => remover(i)} className="opacity-0 group-hover:opacity-100" style={{ color: G.danger }} title="Tirar do checklist"><X size={12} /></button>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {ctx.gerir && (
        <form onSubmit={adicionar} className="flex flex-wrap gap-2 mt-4">
          <select value={novo.frequencia} onChange={(e) => setNovo({ ...novo, frequencia: e.target.value })} className="font-body text-sm border rounded-lg px-2 py-2 outline-none" style={inputStyle}>
            {Object.entries(FREQ).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
          </select>
          <input value={novo.item} onChange={(e) => setNovo({ ...novo, item: e.target.value })} placeholder="Novo item do checklist" className="flex-1 min-w-[200px] font-body text-sm border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
          <Bt type="submit"><PlusCircle size={14} /> Adicionar</Bt>
        </form>
      )}
    </div>
  );
}

function Metas({ ctx }) {
  const hoje = hojeISO();
  const mes = hoje.slice(0, 7);
  const meta = Number(ctx.config?.meta_mensal) || 100;
  const [novaMeta, setNovaMeta] = useState(meta);
  const atend = ctx.atendimentos || [];
  const doMes = atend.filter((a) => String(a.data).startsWith(mes));
  const diasMes = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();
  const ritmo = Math.round((doMes.length / Number(hoje.slice(8))) * diasMes);
  const porAtendente = {}; doMes.forEach((a) => { const n = a.atendente_nome || "Sem nome"; porAtendente[n] = (porAtendente[n] || 0) + 1; });
  const porCanal = {}; doMes.forEach((a) => { porCanal[a.canal] = (porCanal[a.canal] || 0) + 1; });
  const unicos = new Set(doMes.map((a) => soDigitos(a.documento) || a.nome.toLowerCase())).size;
  const cnpjs = new Set(doMes.map((a) => soDigitos(a.documento)).filter((d) => d.length === 14)).size;
  const ultimos6 = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); const k = d.toLocaleDateString("sv-SE").slice(0, 7); return [`${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, atend.filter((a) => String(a.data).startsWith(k)).length]; });

  const salvarMeta = async () => {
    const v = Math.max(1, Number(novaMeta) || 1);
    if (supabaseConfigurado) {
      const { error } = await supabase.from("sala_config").update({ meta_mensal: v }).eq("id", 1);
      if (error) { ctx.avisar(ctx.gerir ? "Não consegui salvar: " + error.message : "Só o gestor muda a meta.", "erro"); return; }
    }
    ctx.setConfig((c) => ({ ...c, meta_mensal: v }));
    ctx.avisar("Meta atualizada.");
  };
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI titulo="Atendimentos no mês" valor={doMes.length} sub={`meta: ${meta}`} icon={Target} />
        <KPI titulo="Meta atingida" valor={`${Math.round((doMes.length / meta) * 100)}%`} sub={`no ritmo atual: ${ritmo}`} icon={BarChart3} cor={doMes.length >= meta ? G.green : G.amber} />
        <KPI titulo="Pessoas diferentes" valor={unicos} sub={`${cnpjs} CNPJs distintos`} icon={Users} cor={G.green} />
        <KPI titulo="Pendências abertas" valor={atend.filter((a) => a.situacao !== "concluido").length} icon={Clock} cor={G.danger} />
      </div>
      <div className="h-3 rounded-full overflow-hidden mt-4" style={{ background: G.blueTint }}><div className="h-full" style={{ width: `${Math.min(100, (doMes.length / meta) * 100)}%`, background: doMes.length >= meta ? G.green : G.blueHex }} /></div>
      {ctx.gerir && (
        <div className="flex items-center gap-2 mt-3">
          <span className="font-body text-xs font-bold" style={{ color: G.ink }}>Meta mensal de atendimentos:</span>
          <input type="number" min="1" value={novaMeta} onChange={(e) => setNovaMeta(e.target.value)} className="font-body text-sm border rounded-lg px-2 py-1.5 w-24 outline-none" style={inputStyle} />
          <Bt contorno onClick={salvarMeta}>Salvar meta</Bt>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}><p className="font-display font-bold text-sm mb-3" style={{ color: G.ink }}>Últimos 6 meses</p><Barras itens={ultimos6} /></div>
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}><p className="font-display font-bold text-sm mb-3" style={{ color: G.ink }}>Por atendente (mês)</p>{Object.keys(porAtendente).length ? <Barras itens={Object.entries(porAtendente).sort((a, b) => b[1] - a[1])} cor={G.green} /> : <p className="font-body text-xs" style={{ color: G.muted }}>Sem atendimentos no mês.</p>}</div>
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}><p className="font-display font-bold text-sm mb-3" style={{ color: G.ink }}>Por canal (mês)</p>{Object.keys(porCanal).length ? <Barras itens={Object.entries(porCanal).sort((a, b) => b[1] - a[1])} cor={G.amber} /> : <p className="font-body text-xs" style={{ color: G.muted }}>Sem atendimentos no mês.</p>}</div>
      </div>
    </div>
  );
}

function Pendencias({ ctx }) {
  const lista = (ctx.atendimentos || []).filter((a) => a.situacao !== "concluido").sort((a, b) => (a.retorno_em || "9999").localeCompare(b.retorno_em || "9999"));
  const resolver = async (a) => {
    if (supabaseConfigurado && !String(a.id).startsWith("demo-")) {
      const { error } = await supabase.from("sala_atendimentos").update({ situacao: "concluido" }).eq("id", a.id);
      if (error) { ctx.avisar("Não consegui atualizar: " + error.message, "erro"); return; }
    }
    ctx.setAtendimentos((l) => l.map((x) => (x.id === a.id ? { ...x, situacao: "concluido" } : x)));
    ctx.avisar("Pendência resolvida.");
  };
  if (!lista.length) return <p className="font-body text-sm" style={{ color: G.muted }}>Nenhuma pendência. Atendimentos marcados como "Pendente" ou "Encaminhado" aparecem aqui.</p>;
  return (
    <div className="flex flex-col gap-2">
      {lista.map((a) => {
        const atrasado = a.retorno_em && a.retorno_em < hojeISO();
        return (
          <div key={a.id} className="rounded-xl border p-3 bg-white flex flex-wrap items-center gap-3" style={{ borderColor: atrasado ? G.danger : G.line }}>
            <div className="flex-1 min-w-[200px]">
              <p className="font-body text-sm font-bold" style={{ color: G.ink }}>{a.nome} <span className="font-normal text-xs" style={{ color: G.muted }}>· {a.categoria}</span></p>
              <p className="font-body text-[11px]" style={{ color: G.soft }}>
                Atendido em {dataBR(a.data)}{a.encaminhado_para ? ` · encaminhado para ${a.encaminhado_para}` : ""}{a.retorno_em ? ` · retorno em ${dataBR(a.retorno_em)}` : " · sem data de retorno"}{a.observacoes ? ` · ${a.observacoes}` : ""}
              </p>
            </div>
            <Selo texto={a.situacao === "encaminhado" ? "Encaminhado" : "Pendente"} cor={a.situacao === "encaminhado" ? "#7E5BEF" : G.amber} />
            {atrasado && <Selo texto="Retorno atrasado" cor={G.danger} />}
            <Bt contorno cor={G.green} onClick={() => resolver(a)}><CheckCircle2 size={13} /> Resolvido</Bt>
          </div>
        );
      })}
    </div>
  );
}

const CATEGORIAS_DOC = ["Modelos", "Formulários", "Atas e relatórios", "Selo Sebrae", "Legislação", "Capacitação", "Outros"];
function Documentos({ ctx }) {
  const [docs, setDocs] = useState(null);
  const [f, setF] = useState({ titulo: "", categoria: "Modelos", descricao: "" });
  const [enviando, setEnviando] = useState(false);
  const [busca, setBusca] = useState("");
  const [apagando, setApagando] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setDocs(demo.documentos); return; }
    supabase.from("sala_documentos").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => setDocs(error ? [] : data || []));
  }, []);
  const enviar = async (e) => {
    const arq = e.target.files?.[0]; e.target.value = "";
    if (!arq) return;
    if (!f.titulo.trim()) { ctx.avisar("Escreva o título antes de escolher o arquivo.", "erro"); return; }
    setEnviando(true);
    const { url, error } = await enviarArquivo("sala-documentos", arq);
    if (error) { setEnviando(false); ctx.avisar("Não consegui enviar: " + error.message, "erro"); return; }
    const reg = { titulo: f.titulo.trim(), categoria: f.categoria, descricao: f.descricao.trim() || null, url, enviado_por: ctx.meuNome };
    if (!supabaseConfigurado) { demo.documentos = [{ id: demoId(), criado_em: new Date().toISOString(), ...reg }, ...demo.documentos]; setDocs(demo.documentos); }
    else {
      const { data, error: e2 } = await supabase.from("sala_documentos").insert(reg).select().single();
      if (e2) { setEnviando(false); ctx.avisar("Não consegui salvar: " + e2.message, "erro"); return; }
      setDocs((l) => [data, ...(l || [])]);
    }
    setEnviando(false); setF({ titulo: "", categoria: f.categoria, descricao: "" });
    ctx.avisar("Documento adicionado à biblioteca.");
  };
  const apagar = async (d) => {
    setApagando(null);
    if (supabaseConfigurado && !String(d.id).startsWith("demo-")) {
      const { error } = await supabase.from("sala_documentos").delete().eq("id", d.id);
      if (error) { ctx.avisar("Não consegui excluir.", "erro"); return; }
    } else demo.documentos = demo.documentos.filter((x) => x.id !== d.id);
    setDocs((l) => l.filter((x) => x.id !== d.id));
  };
  const lista = (docs || []).filter((d) => !busca || `${d.titulo} ${d.categoria} ${d.descricao || ""}`.toLowerCase().includes(busca.toLowerCase()));
  return (
    <div>
      <div className="rounded-2xl border p-4 bg-white grid md:grid-cols-4 gap-2 mb-4" style={{ borderColor: G.line }}>
        <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Título do documento" className={`${inputCls} md:col-span-2`} style={inputStyle} />
        <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={inputCls} style={inputStyle}>{CATEGORIAS_DOC.map((c) => <option key={c}>{c}</option>)}</select>
        <label className="font-body text-xs font-bold px-3 py-2.5 rounded-lg cursor-pointer inline-flex items-center justify-center gap-1.5 text-white" style={{ background: G.blueHex }}>
          <Upload size={14} /> {enviando ? "Enviando..." : "Escolher arquivo"}<input type="file" className="hidden" onChange={enviar} />
        </label>
        <input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Descrição (opcional)" className={`${inputCls} md:col-span-4`} style={inputStyle} />
      </div>
      <div className="relative mb-3 max-w-xs"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color={G.soft} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar documento" className="font-body text-sm border rounded-lg pl-8 pr-3 py-2 outline-none w-full" style={inputStyle} /></div>
      {docs === null ? <p className="font-body text-sm" style={{ color: G.muted }}>Carregando...</p> : lista.length === 0 ? <p className="font-body text-sm" style={{ color: G.muted }}>Nenhum documento ainda. Suba modelos de atas, plano de ação, formulários e listas de presença.</p> : (
        <div className="grid md:grid-cols-2 gap-2">
          {lista.map((d) => (
            <div key={d.id} className="rounded-xl border p-3 bg-white flex items-start gap-3" style={{ borderColor: G.line }}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: G.blueTint, color: G.blueHex }}><FileText size={16} /></span>
              <div className="flex-1 min-w-0">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-body text-sm font-bold block truncate" style={{ color: G.ink }}>{d.titulo}</a>
                <p className="font-body text-[11px]" style={{ color: G.soft }}>{d.categoria} · {dataBR(d.criado_em)}{d.enviado_por ? ` · ${d.enviado_por}` : ""}</p>
                {d.descricao && <p className="font-body text-xs mt-0.5" style={{ color: G.muted }}>{d.descricao}</p>}
              </div>
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-1.5" style={{ color: G.blue }} title="Abrir"><Download size={15} /></a>
              {apagando === d.id ? <><Bt cor={G.danger} onClick={() => apagar(d)}>Excluir</Bt><Bt contorno onClick={() => setApagando(null)}>Não</Bt></> : <button onClick={() => setApagando(d.id)} className="p-1.5" style={{ color: G.danger }} title="Excluir"><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ORIENTAÇÃO EMPRESARIAL — temas prontos (com links oficiais) + da equipe
// =============================================================================
export const ORIENTACOES = [
  { tema: "Orientações para MEI", resumo: "O que é o MEI, quem pode ser e quais são as obrigações.",
    passos: ["Verificar se a atividade pode ser MEI (lista de ocupações permitidas no Portal do Empreendedor)", "Conferir o limite de faturamento anual e a regra de no máximo 1 empregado", "Explicar as obrigações: DAS todo mês, declaração anual e relatório mensal de receitas", "Mostrar os direitos: CNPJ, nota fiscal, INSS (aposentadoria, auxílio-doença, salário-maternidade)"],
    links: [["Portal do Empreendedor (gov.br)", "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor"]] },
  { tema: "Abertura e formalização de empresas", resumo: "Como abrir o MEI ou orientar quem precisa de outro porte de empresa.",
    passos: ["Conferir se a pessoa tem conta gov.br nível prata ou ouro", "Fazer a inscrição no Portal do Empreendedor (Quero ser MEI)", "Escolher ocupação principal e secundárias, informar endereço e forma de atuação", "Entregar o CCMEI e explicar o DAS mensal", "Se não couber no MEI: orientar a procurar um contador para abrir ME/EPP", "Cadastrar o novo negócio no Conecta Comércio"],
    links: [["Quero ser MEI", "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei"]] },
  { tema: "Alteração e baixa de MEI", resumo: "Atualizar dados cadastrais ou encerrar o MEI.",
    passos: ["Alteração: Portal do Empreendedor → Já sou MEI → Atualização cadastral (endereço, atividades, nome fantasia)", "Baixa: Portal do Empreendedor → Já sou MEI → Solicitar baixa", "Antes da baixa: entregar a declaração de extinção (DASN-SIMEI de extinção) e verificar débitos", "Explicar que débitos não somem com a baixa e passam para o CPF"],
    links: [["Já sou MEI", "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/ja-sou-mei"]] },
  { tema: "DAS e obrigações do MEI", resumo: "Guia mensal, vencimento e débitos.",
    passos: ["O DAS vence todo dia 20", "Emitir pelo PGMEI ou pelo app MEI", "Consultar débitos em atraso e emitir guias com juros", "Oferecer o débito automático quando disponível", "Lembrar do relatório mensal de receitas brutas"],
    links: [["PGMEI — emitir DAS", "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"]] },
  { tema: "Declaração anual do MEI (DASN-SIMEI)", resumo: "Declaração do faturamento do ano anterior, até 31 de maio.",
    passos: ["Somar o faturamento bruto do ano anterior (com e sem nota)", "Informar se teve empregado", "Entregar pelo sistema da DASN-SIMEI", "Guardar o recibo e emitir o DAS do mês"],
    links: [["DASN-SIMEI", "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao"]] },
  { tema: "Emissão de notas fiscais", resumo: "Nota de serviço pelo Emissor Nacional e nota de produto.",
    passos: ["Nota de serviço (NFS-e): usar o Emissor Nacional com a conta gov.br", "Fazer o primeiro acesso junto com o MEI e emitir uma nota de exemplo", "Nota de produto (NF-e): orientar sobre a inscrição estadual e o emissor da Secretaria da Fazenda do Paraná", "Explicar quando a nota é obrigatória (venda para empresas e órgãos públicos)"],
    links: [["Emissor Nacional NFS-e", "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional"]] },
  { tema: "Regularização de pendências", resumo: "DAS atrasado, parcelamento e dívida ativa.",
    passos: ["Consultar os débitos no PGMEI", "Simular e pedir o parcelamento quando possível", "Se a dívida já foi para a Dívida Ativa: usar o Regularize (PGFN)", "Explicar que o atraso suspende benefícios do INSS e pode levar ao cancelamento do CNPJ", "Registrar como Parcelamento e agendar retorno"],
    links: [["Regularize (PGFN)", "https://www.regularize.pgfn.gov.br/"], ["PGMEI", "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"]] },
  { tema: "Crédito e financiamento", resumo: "Orientar antes de pegar dinheiro emprestado.",
    passos: ["Entender a necessidade: para quê, quanto e em quanto tempo consegue pagar", "Ver se o negócio está regular (DAS em dia, CNPJ ativo)", "Apresentar as linhas da Fomento Paraná (página Fomento do Conecta Comércio)", "Encaminhar ao Agente de Crédito com os documentos separados", "Registrar como Crédito (conta para o critério 11 do Selo)"],
    links: [["Fomento Paraná no Conecta Comércio", "/fomento"]] },
  { tema: "Capacitação empresarial", resumo: "Cursos gratuitos para o empreendedor.",
    passos: ["Perguntar qual a maior dificuldade (vendas, finanças, redes sociais, gestão)", "Indicar cursos online gratuitos do Sebrae", "Divulgar os cursos e oficinas presenciais da Sala (calendário)", "Registrar a orientação e convidar para a próxima turma"],
    links: [["Cursos online do Sebrae", "https://sebrae.com.br/sites/PortalSebrae/cursosonline"]] },
  { tema: "Compras públicas e licitações", resumo: "Vender para prefeituras e órgãos públicos.",
    passos: ["Mostrar os editais abertos (aba Editais e Licitações do Conecta Comércio)", "Explicar o cadastro no Sicaf e a conta gov.br", "Orientar o cadastro na plataforma Contrata+Brasil e mostrar o link", "Listar documentos e certidões do edital e a data do certame", "Registrar com número do edital, objeto, documentos e data (critérios 9 e 10 do Selo)"],
    links: [["Contrata+Brasil (plataforma)", "https://contratamaisbrasil.sistema.gov.br/"], ["Contrata+Brasil (informações)", "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/contrata-brasil"]] },
  { tema: "Contratação e gestão", resumo: "Primeiro empregado, controle financeiro e organização.",
    passos: ["MEI pode ter 1 empregado: explicar o eSocial e os custos", "Separar as contas da empresa e da pessoa física", "Montar um controle simples de entradas e saídas", "Calcular preço de venda considerando custos e lucro", "Indicar capacitações de gestão financeira"],
    links: [["eSocial", "https://www.gov.br/esocial/pt-br"]] },
];

function textoOrientacao(o) {
  return [`📌 ${o.tema || o.titulo}`, o.resumo || "", ...(o.passos ? o.passos.map((p, i) => `${i + 1}. ${p}`) : [o.conteudo]), ...(o.links || []).map(([r, u]) => `${r}: ${u.startsWith("/") ? window.location.origin + u : u}`), "— Sala do Empreendedor · Ivatuba"].filter(Boolean).join("\n");
}

export function AbaOrientacoes({ ctx }) {
  const [aberto, setAberto] = useState(0);
  const [proprias, setProprias] = useState(null);
  const [f, setF] = useState(null);
  const [busca, setBusca] = useState("");
  useEffect(() => {
    if (!supabaseConfigurado) { setProprias(demo.orientacoes); return; }
    supabase.from("sala_orientacoes").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => setProprias(error ? [] : data || []));
  }, []);
  const salvar = async (e) => {
    e.preventDefault();
    if (!f.titulo.trim() || !f.conteudo.trim()) { ctx.avisar("Preencha título e conteúdo.", "erro"); return; }
    const reg = { tema: f.tema, titulo: f.titulo.trim(), conteudo: f.conteudo.trim(), link: f.link?.trim() || null, publicar: !!f.publicar };
    if (!supabaseConfigurado) { demo.orientacoes = f.id ? demo.orientacoes.map((x) => (x.id === f.id ? { ...x, ...reg } : x)) : [{ id: demoId(), ...reg }, ...demo.orientacoes]; setProprias(demo.orientacoes); setF(null); return; }
    const q = f.id ? supabase.from("sala_orientacoes").update(reg).eq("id", f.id) : supabase.from("sala_orientacoes").insert(reg);
    const { data, error } = await q.select().single();
    if (error) { ctx.avisar("Não consegui salvar: " + error.message, "erro"); return; }
    setProprias((l) => (f.id ? l.map((x) => (x.id === f.id ? data : x)) : [data, ...(l || [])]));
    setF(null); ctx.avisar("Orientação salva.");
  };
  const remover = async (o) => {
    if (supabaseConfigurado) { const { error } = await supabase.from("sala_orientacoes").delete().eq("id", o.id); if (error) return; }
    else demo.orientacoes = demo.orientacoes.filter((x) => x.id !== o.id);
    setProprias((l) => l.filter((x) => x.id !== o.id));
  };
  const pdf = () => exportarPDF("orientacoes-sala-do-empreendedor", "Orientação empresarial — Sala do Empreendedor", [{ titulo: "Temas", cabecalho: ["Tema", "Como orientar", "Links oficiais"], linhas: ORIENTACOES.map((o) => [`${o.tema}\n${o.resumo}`, o.passos.map((p, i) => `${i + 1}. ${p}`).join("\n"), o.links.map(([r, u]) => `${r}: ${u}`).join("\n")]) }], "Confira sempre as regras atualizadas nos sites oficiais.", "Sala do Empreendedor · Ivatuba");
  const lista = ORIENTACOES.filter((o) => !busca || `${o.tema} ${o.resumo} ${o.passos.join(" ")}`.toLowerCase().includes(busca.toLowerCase()));
  return (
    <div>
      <Cab eyebrow="Orientação empresarial" title="Como orientar o empreendedor" sub="Passo a passo e links oficiais de cada assunto. Copie o texto para mandar no WhatsApp."
        direita={<div className="flex gap-2"><Bt contorno onClick={pdf}><Download size={14} /> PDF de todas</Bt><Bt onClick={() => setF({ tema: ORIENTACOES[0].tema, titulo: "", conteudo: "", link: "", publicar: true })}><PlusCircle size={14} /> Nova orientação</Bt></div>} />
      {f && (
        <form onSubmit={salvar} className="rounded-2xl border p-4 bg-white grid md:grid-cols-2 gap-3 mb-5" style={{ borderColor: G.blueHex }}>
          <select value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} className={inputCls} style={inputStyle}>{[...ORIENTACOES.map((o) => o.tema), "Outros"].map((t) => <option key={t}>{t}</option>)}</select>
          <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Título" className={inputCls} style={inputStyle} />
          <textarea rows={4} value={f.conteudo} onChange={(e) => setF({ ...f, conteudo: e.target.value })} placeholder="Conteúdo da orientação" className={`${inputCls} md:col-span-2`} style={inputStyle} />
          <input value={f.link || ""} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="Link oficial (opcional)" className={inputCls} style={inputStyle} />
          <label className="flex items-center gap-2 font-body text-sm"><input type="checkbox" checked={!!f.publicar} onChange={(e) => setF({ ...f, publicar: e.target.checked })} /> Publicar como dica na página pública</label>
          <div className="md:col-span-2 flex gap-2"><Bt type="submit"><CheckCircle2 size={14} /> Salvar</Bt><Bt contorno onClick={() => setF(null)}>Cancelar</Bt></div>
        </form>
      )}
      {proprias?.length > 0 && (
        <div className="mb-5">
          <p className="font-display font-bold text-sm mb-2" style={{ color: G.ink }}>Da equipe</p>
          <div className="grid md:grid-cols-2 gap-2">
            {proprias.map((o) => (
              <div key={o.id} className="rounded-xl border p-3 bg-white" style={{ borderColor: G.line }}>
                <div className="flex items-start justify-between gap-2"><p className="font-body text-sm font-bold" style={{ color: G.ink }}>{o.titulo}</p>{o.publicar && <Selo texto="No site" cor={G.green} />}</div>
                <p className="font-body text-[11px]" style={{ color: G.soft }}>{o.tema}</p>
                <p className="font-body text-xs mt-1 whitespace-pre-line" style={{ color: "#425A70" }}>{o.conteudo}</p>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => { copiarTexto(textoOrientacao(o)); ctx.avisar("Texto copiado."); }} className="font-body text-[11px] font-bold" style={{ color: G.blue }}>copiar</button>
                  <button onClick={() => setF({ ...o })} className="font-body text-[11px] font-bold" style={{ color: G.blue }}>editar</button>
                  <button onClick={() => remover(o)} className="font-body text-[11px]" style={{ color: G.danger }}>excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="relative mb-3 max-w-xs"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color={G.soft} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar assunto" className="font-body text-sm border rounded-lg pl-8 pr-3 py-2 outline-none w-full" style={inputStyle} /></div>
      <div className="flex flex-col gap-2">
        {lista.map((o, i) => {
          const ab = aberto === i;
          return (
            <div key={o.tema} className="rounded-2xl border bg-white" style={{ borderColor: ab ? G.blueHex : G.line }}>
              <button onClick={() => setAberto(ab ? null : i)} className="w-full text-left p-3.5 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: G.blueTint, color: G.blueHex }}><BookOpen size={15} /></span>
                <span className="flex-1"><span className="block font-display font-bold text-sm" style={{ color: G.ink }}>{o.tema}</span><span className="block font-body text-xs" style={{ color: G.muted }}>{o.resumo}</span></span>
              </button>
              {ab && (
                <div className="px-4 pb-4">
                  <ol className="list-decimal pl-5 flex flex-col gap-1 font-body text-sm" style={{ color: "#425A70" }}>{o.passos.map((p) => <li key={p}>{p}</li>)}</ol>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {o.links.map(([r, u]) => <a key={u} href={u.startsWith("/") ? `#/${u.slice(1)}` : u} target={u.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="font-body text-xs font-bold px-3 py-2 rounded-lg border inline-flex items-center gap-1" style={{ borderColor: G.line, color: G.blue }}>{r} <ExternalLink size={11} /></a>)}
                    <Bt contorno onClick={() => { copiarTexto(textoOrientacao(o)); ctx.avisar("Orientação copiada. Cole no WhatsApp ou no site."); }}><Copy size={13} /> Copiar texto</Bt>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="font-body text-[11px] mt-3" style={{ color: G.soft }}>As regras do MEI mudam: confira sempre os valores, limites e prazos nos sites oficiais antes de orientar.</p>
    </div>
  );
}

export function OrientacoesPublicas() {
  const [proprias, setProprias] = useState([]);
  useEffect(() => {
    if (!supabaseConfigurado) { setProprias(demo.orientacoes.filter((o) => o.publicar)); return; }
    supabase.from("sala_orientacoes").select("*").eq("publicar", true).order("criado_em", { ascending: false }).limit(6).then(({ data, error }) => setProprias(error ? [] : data || []));
  }, []);
  const [aberto, setAberto] = useState(null);
  const temas = ORIENTACOES.slice(0, 7);
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 mt-10">
      <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: G.blue }}>Dicas e orientações</p>
      <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1 mb-4" style={{ color: G.ink }}>Tire suas dúvidas</h2>
      <div className="grid md:grid-cols-2 gap-2">
        {proprias.map((o) => (
          <div key={o.id} className="rounded-xl border p-4 bg-white" style={{ borderColor: G.line }}>
            <p className="font-body text-[10px] font-bold uppercase" style={{ color: G.green }}>{o.tema}</p>
            <p className="font-display font-bold text-sm" style={{ color: G.ink }}>{o.titulo}</p>
            <p className="font-body text-xs mt-1 whitespace-pre-line" style={{ color: "#425A70" }}>{o.conteudo}</p>
            {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold mt-2 inline-flex items-center gap-1" style={{ color: G.blue }}>Saiba mais <ExternalLink size={11} /></a>}
          </div>
        ))}
        {temas.map((o, i) => (
          <div key={o.tema} className="rounded-xl border bg-white" style={{ borderColor: G.line }}>
            <button onClick={() => setAberto(aberto === i ? null : i)} className="w-full text-left p-4">
              <p className="font-display font-bold text-sm" style={{ color: G.ink }}>{o.tema}</p>
              <p className="font-body text-xs" style={{ color: G.muted }}>{o.resumo}</p>
            </button>
            {aberto === i && (
              <div className="px-4 pb-4">
                <ol className="list-decimal pl-5 flex flex-col gap-1 font-body text-xs" style={{ color: "#425A70" }}>{o.passos.map((p) => <li key={p}>{p}</li>)}</ol>
                <div className="flex flex-wrap gap-2 mt-2">{o.links.map(([r, u]) => <a key={u} href={u.startsWith("/") ? `#/${u.slice(1)}` : u} target={u.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="font-body text-xs font-bold inline-flex items-center gap-1" style={{ color: G.blue }}>{r} <ExternalLink size={11} /></a>)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// EMPREENDEDORES — cadastro/histórico (derivado dos atendimentos) + LGPD
// =============================================================================
function mascarar(doc) {
  const d = soDigitos(doc);
  if (d.length === 11) return `***.${d.slice(3, 6)}.***-**`;
  if (d.length === 14) return `**.${d.slice(2, 5)}.***/****-**`;
  return d ? "•••••" : "";
}
function formatarDoc(doc) {
  const d = soDigitos(doc);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc || "";
}
export function DocProtegido({ doc, referencia, ctx }) {
  const [ver, setVer] = useState(false);
  if (!soDigitos(doc)) return null;
  return (
    <span className="inline-flex items-center gap-1 font-body text-[11px]" style={{ color: "#425A70" }}>
      <Lock size={11} color={G.soft} /> {ver ? formatarDoc(doc) : mascarar(doc)}
      {!ver && <button onClick={(e) => { e.stopPropagation(); setVer(true); registrarAcessoSala("viu_documento", referencia, ctx?.meuNome); }} className="font-bold underline" style={{ color: G.blue }} title="Mostrar (fica registrado)">mostrar</button>}
    </span>
  );
}

export function AbaEmpreendedores({ ctx }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(null);
  const pessoas = useMemo(() => {
    const mapa = {};
    (ctx.atendimentos || []).forEach((a) => {
      const chave = soDigitos(a.documento) || `${a.nome.trim().toLowerCase()}|${soDigitos(a.whatsapp)}`;
      if (!mapa[chave]) mapa[chave] = { chave, nome: a.nome, documento: a.documento, whatsapp: a.whatsapp, empresa: a.empresa, lista: [] };
      const p = mapa[chave];
      p.lista.push(a);
      if (!p.whatsapp && a.whatsapp) p.whatsapp = a.whatsapp;
      if (!p.empresa && a.empresa) p.empresa = a.empresa;
    });
    return Object.values(mapa).map((p) => ({ ...p, lista: p.lista.sort((x, y) => String(y.data).localeCompare(String(x.data))) })).sort((a, b) => String(b.lista[0].data).localeCompare(String(a.lista[0].data)));
  }, [ctx.atendimentos]);
  const lista = pessoas.filter((p) => !busca || `${p.nome} ${p.empresa || ""} ${soDigitos(p.documento)}`.toLowerCase().includes(busca.toLowerCase().replace(/[.\-/]/g, "")));
  return (
    <div>
      <Cab eyebrow="Cadastro" title="Empreendedores atendidos" sub="Histórico de cada pessoa: demandas, encaminhamentos e retornos. CPF/CNPJ fica escondido e cada visualização é registrada (LGPD)." />
      <div className="relative mb-3 max-w-sm"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color={G.soft} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, empresa ou CPF/CNPJ" className="font-body text-sm border rounded-lg pl-8 pr-3 py-2 outline-none w-full" style={inputStyle} /></div>
      <p className="font-body text-xs mb-3" style={{ color: G.muted }}>{lista.length} empreendedor(es) · últimos 13 meses</p>
      <div className="flex flex-col gap-2">
        {lista.map((p) => {
          const ab = aberto === p.chave;
          const ult = p.lista[0];
          const abertas = p.lista.filter((a) => a.situacao !== "concluido").length;
          return (
            <div key={p.chave} className="rounded-2xl border bg-white" style={{ borderColor: ab ? G.blueHex : G.line }}>
              <div role="button" tabIndex={0} onClick={() => setAberto(ab ? null : p.chave)} onKeyDown={(e) => e.key === "Enter" && setAberto(ab ? null : p.chave)} className="w-full text-left p-3.5 flex flex-wrap items-center gap-3 cursor-pointer">
                <span className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0" style={{ background: G.blueTint, color: G.blueHex }}>{p.nome.trim()[0]?.toUpperCase()}</span>
                <span className="flex-1 min-w-[180px]">
                  <span className="block font-display font-bold text-sm" style={{ color: G.ink }}>{p.nome}{p.empresa ? <span className="font-body font-normal text-xs" style={{ color: G.muted }}> · {p.empresa}</span> : null}</span>
                  <span className="block font-body text-[11px]" style={{ color: G.soft }}>{p.lista.length} atendimento(s) · último em {dataBR(ult.data)} · {ult.categoria}</span>
                </span>
                <DocProtegido doc={p.documento} referencia={p.nome} ctx={ctx} />
                {abertas > 0 && <Selo texto={`${abertas} pendente(s)`} cor={G.amber} />}
              </div>
              {ab && (
                <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: G.line }}>
                  <div className="flex flex-col gap-2">
                    {p.lista.map((a) => (
                      <div key={a.id} className="flex gap-3">
                        <span className="font-body text-[11px] font-bold w-20 shrink-0" style={{ color: G.soft }}>{dataBR(a.data)}</span>
                        <div className="flex-1">
                          <p className="font-body text-xs font-bold" style={{ color: G.ink }}>{a.categoria} <span className="font-normal" style={{ color: G.soft }}>· {a.atendente_nome || "—"}</span></p>
                          {(a.observacoes || a.encaminhado_para) && <p className="font-body text-xs" style={{ color: G.muted }}>{a.observacoes}{a.encaminhado_para ? ` → encaminhado para ${a.encaminhado_para}` : ""}</p>}
                        </div>
                        <Selo texto={a.situacao === "concluido" ? "Concluído" : a.situacao === "encaminhado" ? "Encaminhado" : "Pendente"} cor={a.situacao === "concluido" ? G.green : a.situacao === "encaminhado" ? "#7E5BEF" : G.amber} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3"><Bt onClick={() => ctx.abrirAtendimento({ nome: p.nome, documento: p.documento || "", whatsapp: p.whatsapp || "", empresa: p.empresa || "" })}><PlusCircle size={13} /> Novo atendimento para esta pessoa</Bt></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// INDICADORES (administração)
// =============================================================================
export function AbaIndicadores({ ctx }) {
  const [empresas, setEmpresas] = useState(null);
  const [acessos, setAcessos] = useState(null);
  const [selo, setSelo] = useState(null);
  const [votos, setVotos] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setEmpresas([]); setAcessos(demo.acessos); setSelo(demo.selo || []); setVotos(0); return; }
    supabase.rpc("sala_indicadores_empresas").then(({ data, error }) => setEmpresas(error ? [] : data || []));
    supabase.from("sala_acessos").select("*").order("criado_em", { ascending: false }).limit(50).then(({ data, error }) => setAcessos(error ? [] : data || []));
    supabase.from("sala_selo_itens").select("pontos,status").eq("ciclo", new Date().getFullYear()).then(({ data, error }) => setSelo(error ? [] : data || []));
    supabase.from("enquetes").select("opcoes").then(({ data, error }) => setVotos(error ? null : (data || []).reduce((s, e) => s + (e.opcoes || []).reduce((t, o) => t + (o.votos || 0), 0), 0)));
  }, []);
  const ano = String(new Date().getFullYear());
  const atend = ctx.atendimentos || [];
  const doAno = atend.filter((a) => String(a.data).startsWith(ano));
  // Fichas + totais lançados antes das fichas: por mês/tipo vale o maior dos dois
  const gradeAno = {};
  doAno.forEach((a) => { const k = `${Number(String(a.data).slice(5, 7))}|${a.categoria}`; gradeAno[k] = (gradeAno[k] || 0) + 1; });
  (ctx.totais || []).forEach((t) => { if (String(t.ano) !== ano) return; const k = `${Number(t.mes)}|${t.categoria}`; gradeAno[k] = Math.max(gradeAno[k] || 0, Number(t.total) || 0); });
  const porMes = MESES.map((m, i) => [m, Object.entries(gradeAno).filter(([k]) => k.startsWith(`${i + 1}|`)).reduce((s, [, v]) => s + v, 0)]);
  const totalAno = porMes.reduce((s, [, v]) => s + v, 0);
  const demandas = {}; Object.entries(gradeAno).forEach(([k, v]) => { if (!v) return; const c = k.split("|").slice(1).join("|"); demandas[c] = (demandas[c] || 0) + v; });
  const aprovadas = (empresas || []).filter((e) => e.status === "aprovada");
  const totEmp = aprovadas.reduce((s, e) => s + Number(e.total), 0);
  const porSeg = {}; aprovadas.forEach((e) => { porSeg[e.categoria] = (porSeg[e.categoria] || 0) + Number(e.total); });
  const seloTot = (selo || []).reduce((s, i) => s + Number(i.pontos || 0), 0);
  const seloOk = (selo || []).filter((i) => i.status === "concluido").reduce((s, i) => s + Number(i.pontos || 0), 0);
  const unicos = new Set(doAno.map((a) => soDigitos(a.documento) || a.nome.toLowerCase())).size;
  const pdf = () => {
    registrarAcessoSala("exportou_relatorio", `Indicadores ${ano}`, ctx.meuNome);
    exportarPDF(`indicadores-sala-${ano}`, `Indicadores — Sala do Empreendedor ${ano}`, [
      { titulo: "Resumo", cabecalho: ["Indicador", "Valor"], linhas: [["Empresas aprovadas no Conecta Comércio", totEmp], ["Atendimentos no ano", totalAno], ["Empreendedores distintos atendidos", unicos], ["Pedidos do site (em aberto)", (ctx.pedidos || []).filter((p) => p.status === "novo" || p.status === "agendado").length], ["Votos nas campanhas/votações", votos ?? "—"], ["Selo Sebrae: pontos com evidência pronta", `${seloOk} de ${seloTot}`]] },
      { titulo: "Atendimentos por mês", cabecalho: MESES, linhas: [porMes.map(([, v]) => v)] },
      { titulo: "Principais demandas", cabecalho: ["Demanda", "Atendimentos"], linhas: Object.entries(demandas).sort((a, b) => b[1] - a[1]) },
      { titulo: "Empresas por segmento", cabecalho: ["Segmento", "Empresas"], linhas: Object.entries(porSeg).sort((a, b) => b[1] - a[1]) },
    ], "Relatório gerencial para a gestão municipal.", "Sala do Empreendedor · Ivatuba");
  };
  return (
    <div>
      <Cab eyebrow="Administração" title={`Indicadores ${ano}`} sub="Comércio cadastrado, atendimentos, demandas, campanhas e Selo — num painel só." direita={<Bt contorno onClick={pdf}><Download size={14} /> Relatório gerencial (PDF)</Bt>} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI titulo="Empresas cadastradas" valor={empresas === null ? "…" : totEmp} sub="aprovadas" icon={Store} />
        <KPI titulo="Atendimentos no ano" valor={totalAno} icon={BarChart3} cor={G.green} />
        <KPI titulo="Empreendedores" valor={unicos} sub="distintos no ano" icon={Users} cor="#7E5BEF" />
        <KPI titulo="Votos em campanhas" valor={votos ?? "—"} icon={Target} cor={G.amber} />
        <KPI titulo="Selo Sebrae" valor={seloTot ? `${Math.round((seloOk / seloTot) * 100)}%` : "—"} sub={seloTot ? `${faixaSelo((seloOk * 100) / seloTot).emoji} ${faixaSelo((seloOk * 100) / seloTot).r} (estimativa)` : "pontos com evidência pronta"} icon={Award} cor="#0EA5A5" />
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}><p className="font-display font-bold text-sm mb-3" style={{ color: G.ink }}>Atendimentos por mês</p><Barras itens={porMes.filter(([, v], i) => i <= new Date().getMonth())} /></div>
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}><p className="font-display font-bold text-sm mb-3" style={{ color: G.ink }}>Principais demandas</p>{Object.keys(demandas).length ? <Barras itens={Object.entries(demandas).sort((a, b) => b[1] - a[1]).slice(0, 8)} cor={G.green} /> : <p className="font-body text-xs" style={{ color: G.muted }}>Sem atendimentos no ano.</p>}</div>
        <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: G.line }}><p className="font-display font-bold text-sm mb-3" style={{ color: G.ink }}>Empresas por segmento</p>{Object.keys(porSeg).length ? <Barras itens={Object.entries(porSeg).sort((a, b) => b[1] - a[1]).slice(0, 8)} cor={G.amber} /> : <p className="font-body text-xs" style={{ color: G.muted }}>{empresas === null ? "Carregando..." : "Sem dados (rode o SQL de gestão)."}</p>}</div>
      </div>
      <div className="rounded-2xl border p-4 bg-white mt-5" style={{ borderColor: G.line }}>
        <p className="font-display font-bold text-sm mb-1 flex items-center gap-1.5" style={{ color: G.ink }}><ShieldCheck size={15} color={G.blueHex} /> Registro de acessos a dados pessoais (LGPD)</p>
        <p className="font-body text-[11px] mb-3" style={{ color: G.soft }}>Cada vez que alguém da equipe mostra um CPF/CNPJ ou exporta relatório, fica registrado aqui. Ninguém consegue apagar.</p>
        {acessos === null ? <p className="font-body text-xs" style={{ color: G.muted }}>Carregando...</p> : acessos.length === 0 ? <p className="font-body text-xs" style={{ color: G.muted }}>Nenhum acesso registrado.</p> : (
          <div className="flex flex-col gap-1">
            {acessos.map((a) => (
              <p key={a.id} className="font-body text-xs" style={{ color: "#425A70" }}>
                <span style={{ color: G.soft }}>{new Date(a.criado_em).toLocaleString("pt-BR")}</span> · <b>{a.usuario_nome || "—"}</b> {a.acao === "viu_documento" ? "viu o CPF/CNPJ de" : a.acao === "exportou_relatorio" ? "exportou" : a.acao} {a.referencia}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PORTAL — as 3 grandes opções de acesso (/acesso)
// =============================================================================
export function PortalAcesso() {
  useEffect(() => { document.title = "Acesso — Sala do Empreendedor · Conecta Comércio"; }, []);
  const opcoes = [
    { href: "#/sala", icon: Globe, titulo: "Área pública", texto: "Serviços online, agendamento, calendário do comércio, dicas e orientações. Sem login.", cor: G.blueHex },
    { href: "#/sala-agente", icon: Users, titulo: "Área do atendente", texto: "Atendimentos, agenda, empreendedores, orientações, Selo Sebrae e gestão da Sala. Com login.", cor: G.green },
    { href: "#/sala-admin", icon: ShieldCheck, titulo: "Área do administrador", texto: "Indicadores, equipe e permissões, página pública, planejamento e relatórios gerenciais.", cor: "#7E5BEF" },
  ];
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <img src="/sala-do-empreendedor-logo.png" alt="Sala do Empreendedor" className="h-16 md:h-20 w-auto mx-auto object-contain mix-blend-multiply" />
        <h1 className="font-display font-extrabold text-3xl md:text-4xl mt-4" style={{ color: G.ink }}>Como você quer entrar?</h1>
        <p className="font-body text-sm mt-2" style={{ color: G.muted }}>Escolha a área de acordo com o seu perfil.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {opcoes.map((o) => (
          <a key={o.href} href={o.href} className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden flex flex-col min-h-[240px] hover:-translate-y-1 transition-transform" style={{ background: `linear-gradient(135deg, ${o.cor}, #052A4D)` }}>
            <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center relative" style={{ background: "rgba(255,255,255,0.16)" }}><o.icon size={26} /></span>
            <p className="font-display font-extrabold text-2xl mt-5 relative">{o.titulo}</p>
            <p className="font-body text-sm text-white/80 mt-2 relative flex-1">{o.texto}</p>
            <span className="font-body text-sm font-bold mt-4 relative">Entrar →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
