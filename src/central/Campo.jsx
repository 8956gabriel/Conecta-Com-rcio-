import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ExternalLink, Users, Pencil, Save, CalendarPlus, UserPlus, MapPin, Navigation, Crosshair, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, FilePlus2, Route, LocateFixed } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { C, Titulo, Btn, Card, Aviso, Chip, Vazio, Selo, Modal, Campos, Campo as CampoF, inputCls, inputSty, Copiar, BtnWhats, Texto, chamarIA } from "./ui.jsx";
import { msgErro } from "./acoes.jsx";
import { ATIVIDADES, CATEGORIAS, SEGMENTOS, ESTRATEGIA_LINHAS, TIPOS_MENSAGEM, montarMensagem, STATUS_CLIENTE, PUBLICOS, atividadePorChave } from "./dados.js";
import { hojeISO, dataBR, isoData, moeda, analisarOportunidade, SEMANA, dataLocal, linhasSugeridas } from "./motor.js";

// ============================================================================= ESTRATÉGIAS POR LINHA
function fichaPadrao(linha) {
  const e = ESTRATEGIA_LINHAS[linha.slug] || {};
  const ativs = ATIVIDADES.filter((a) => a.l.includes(linha.slug) || (e.atividades || []).includes(a.k));
  return {
    perfil: e.perfil || linha.publico_alvo || "",
    atividades: ativs.map((a) => a.a).join(", "),
    necessidades: [...new Set(ativs.slice(0, 6).map((a) => a.n))].join(" "),
    segmentos: (e.segmentos || []).map((k) => SEGMENTOS.find((s) => s.k === k)?.nome).filter(Boolean).join(", "),
    exemplos: ativs.slice(0, 6).map((a) => `${a.i[0]} (${a.a.toLowerCase()})`).join("; "),
    perguntas: ["Qual investimento você está adiando?", "Quanto precisaria e para quê exatamente?", "Há quanto tempo o negócio funciona?", "Como comprova o faturamento?", "Já tem orçamento?"].join("\n"),
    argumentos: (e.argumentos || []).join("\n"),
    estrategias: ativs.slice(0, 3).map((a) => `${a.a}: ${a.e}`).join("\n"),
    proximas: "1) Diagnóstico com o empreendedor\n2) Conferir critérios oficiais vigentes\n3) Orçamentos e documentos\n4) Montar e encaminhar a proposta\n5) Acompanhar análise, contratação e liberação",
  };
}
const CAMPOS_FICHA = [["perfil", "Perfil ideal"], ["atividades", "Atividades econômicas compatíveis"], ["necessidades", "Necessidades que podem ser atendidas"], ["segmentos", "Segmentos para prospectar"], ["exemplos", "Exemplos de investimentos"], ["perguntas", "Perguntas para identificar oportunidades"], ["argumentos", "Argumentos comerciais"], ["estrategias", "Estratégias de abordagem"], ["proximas", "Próximas etapas"]];

export function AbaEstrategias({ K }) {
  const linhas = (K.linhas || []).filter((l) => l.ativo !== false);
  const [sel, setSel] = useState(linhas[0]?.id);
  const [editar, setEditar] = useState(false);
  const [encontrar, setEncontrar] = useState(false);
  const linha = linhas.find((l) => l.id === sel);
  if (!linha) return <Vazio>Nenhuma linha de crédito ativa cadastrada. Cadastre em Linhas de crédito.</Vazio>;
  const ficha = { ...fichaPadrao(linha), ...(linha.estrategia || {}) };
  const Of = ({ t, v }) => <div><p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{t}</p><p className="font-body text-sm whitespace-pre-line" style={{ color: v ? C.ink : C.soft }}>{v || "Não cadastrado — preencha em Linhas de crédito com a regra oficial vigente."}</p></div>;
  return (
    <div>
      <Titulo eyebrow="Linhas Fomento Paraná" title="Estratégias por linha de crédito" sub="Ficha estratégica de cada modalidade. As condições vêm do cadastro oficial das linhas; a parte comercial é sugestão editável." />
      <div className="flex gap-1.5 flex-wrap mb-4">{linhas.map((l) => <Chip key={l.id} ativo={sel === l.id} cor={l.cor || C.blueHex} onClick={() => setSel(l.id)}>{l.nome}</Chip>)}</div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex justify-between items-center gap-2 flex-wrap mb-3"><p className="font-display font-extrabold text-lg" style={{ color: C.ink }}>{linha.nome}</p><Selo tipo="oficial" /></div>
          <div className="space-y-3">
            <Of t="Público-alvo" v={linha.publico_alvo} />
            <Of t="Objetivos financiáveis" v={linha.finalidade || linha.descricao} />
            <Of t="Critérios de elegibilidade" v={linha.requisitos} />
            <div className="grid sm:grid-cols-3 gap-3"><Of t="Valores" v={linha.valores} /><Of t="Prazos" v={linha.prazos} /><Of t="Carência" v={linha.carencia} /></div>
            <Of t="Taxas" v={linha.taxas} />
            <Of t="Documentação" v={(linha.documentos || []).join("\n")} />
            <div className="flex gap-2 flex-wrap">
              {(linha.pdf_url || K.config?.link_oficial) && <a href={linha.pdf_url || K.config?.link_oficial} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-body text-xs font-bold px-2.5 py-1.5 rounded-xl" style={{ background: C.greenTint, color: C.green }}><ExternalLink size={13} /> Link oficial</a>}
              {K.podeGerir && <Btn small tipo="claro" onClick={() => K.setAba?.("linhas")}>Editar condições oficiais</Btn>}
            </div>
          </div>
        </Card>
        <Card style={{ borderColor: C.yellow }}>
          <div className="flex justify-between items-center gap-2 flex-wrap mb-3"><Selo tipo="sistema" />{K.podeGerir && <Btn small tipo="claro" icon={Pencil} onClick={() => setEditar(true)}>Editar ficha</Btn>}</div>
          <div className="space-y-3">{CAMPOS_FICHA.map(([k, t]) => <div key={k}><p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{t}</p><p className="font-body text-sm whitespace-pre-line" style={{ color: C.ink }}>{ficha[k] || "—"}</p></div>)}</div>
          <Btn tipo="amarelo" className="mt-4 w-full" icon={Users} onClick={() => setEncontrar(true)}>ENCONTRAR CLIENTES PARA ESTA LINHA</Btn>
        </Card>
      </div>
      {editar && <ModalFicha K={K} linha={linha} ficha={ficha} onFechar={() => setEditar(false)} />}
      {encontrar && <ModalEncontrar K={K} linha={linha} onFechar={() => setEncontrar(false)} />}
    </div>
  );
}
function ModalFicha({ K, linha, ficha, onFechar }) {
  const [v, setV] = useState(ficha);
  const salvar = async () => {
    try {
      if (supabaseConfigurado) { const { data, error } = await supabase.from("fomento_linhas").update({ estrategia: v }).eq("id", linha.id).select().single(); if (error) throw error; K.setLinhas((l) => l.map((x) => (x.id === data.id ? data : x))); }
      K.avisar("Ficha estratégica salva."); onFechar();
    } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  return <Modal aberto onFechar={onFechar} titulo={`Ficha estratégica · ${linha.nome}`}><Campos campos={CAMPOS_FICHA.map(([k, l]) => ({ k, l, t: "textarea", full: true }))} valores={v} set={setV} /><div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar}>Salvar</Btn></div></Modal>;
}
function ModalEncontrar({ K, linha, onFechar }) {
  const e = ESTRATEGIA_LINHAS[linha.slug] || {};
  const ativs = ATIVIDADES.filter((a) => a.l.includes(linha.slug) || (e.atividades || []).includes(a.k));
  const nomes = new Set(ativs.map((a) => a.a));
  const rural = /rural/.test(linha.slug), mulher = /mulher/.test(linha.slug);
  const comProposta = new Set((K.propostas || []).filter((p) => !["negado", "excluido"].includes(p.status)).map((p) => p.cliente_id));
  const cand = K.d.clientes.filter((c) => c.status !== "perdido" && !comProposta.has(c.id) && (c.linha_id === linha.id || nomes.has(c.atividade) || (rural && (c.categoria === "agro" || (c.publico || []).includes("rural"))) || (mulher && (c.publico || []).includes("mulher"))) && (!mulher || (c.publico || []).includes("mulher") || c.linha_id === linha.id) && (!rural || c.categoria === "agro" || (c.publico || []).some((p) => ["rural", "familiar"].includes(p)) || c.linha_id === linha.id));
  return (
    <Modal aberto onFechar={onFechar} titulo={`Encontrar clientes · ${linha.nome}`} largura="max-w-3xl">
      <Selo tipo="sistema" />
      <p className="font-display font-bold mt-3 mb-2" style={{ color: C.ink }}>Segmentos e perfis com necessidades compatíveis</p>
      <div className="grid sm:grid-cols-2 gap-2">{ativs.slice(0, 10).map((a) => <div key={a.k} className="rounded-xl border p-3" style={{ borderColor: C.line }}><p className="font-body text-sm font-bold" style={{ color: C.ink }}>{CATEGORIAS[a.c].emoji} {a.a}</p><p className="font-body text-xs" style={{ color: C.muted }}><b>Onde:</b> {a.o}</p><p className="font-body text-xs" style={{ color: C.muted }}><b>Perfil:</b> {a.p}</p></div>)}</div>
      {(e.segmentos || []).length > 0 && <p className="font-body text-xs mt-2" style={{ color: C.muted }}>Públicos: {(e.segmentos || []).map((k) => SEGMENTOS.find((s) => s.k === k)?.nome).join(", ")}</p>}
      <p className="font-display font-bold mt-5 mb-2" style={{ color: C.ink }}>Na sua carteira, sem proposta ainda ({cand.length})</p>
      {cand.length ? cand.slice(0, 30).map((c) => <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-b" style={{ borderColor: C.line }}><span className="font-body text-sm"><b>{c.nome}</b> <span style={{ color: C.soft }}>· {c.atividade || "—"} · {STATUS_CLIENTE[c.status]?.nome}</span></span><div className="flex gap-1.5">{c.whatsapp && <BtnWhats numero={c.whatsapp} rotulo="" texto={montarMensagem("linha", { nome: c.nome, categoria: c.categoria, linha: linha.nome, investimento: c.necessidade })} />}<Btn small tipo="claro" onClick={() => { onFechar(); K.abrir("cliente", c); }}>Abrir</Btn></div></div>)
        : <Vazio>Nenhum cliente compatível na carteira ainda. Use os segmentos acima para prospectar.</Vazio>}
    </Modal>
  );
}

// ============================================================================= PROSPECÇÃO POR SEGMENTO
export function AbaSegmentos({ K }) {
  const [sel, setSel] = useState(null);
  const s = SEGMENTOS.find((x) => x.k === sel);
  const cliDoSeg = (sg) => { const nomes = new Set(sg.ativ.map((k) => atividadePorChave[k].a)); const pub = { mei: "mei", micro: "microempresa", pequena: "pequena", mulher: "mulher", jovem: "jovem", autonomo: "autonomo", rural: "rural", familiar: "familiar", expansao: "expansao" }[sg.k]; return K.d.clientes.filter((c) => nomes.has(c.atividade) || (pub && (c.publico || []).includes(pub)) || (sg.k === "mei" && c.porte === "mei") || (sg.k === "micro" && c.porte === "me") || (sg.k === "pequena" && c.porte === "epp") || (sg.k === "varejo" && c.categoria === "comercio") || (sg.k === "servicos" && c.categoria === "servicos") || (sg.k === "industria" && c.categoria === "industria") || (sg.k === "rural" && c.categoria === "agro")); };
  if (!s) return (
    <div>
      <Titulo eyebrow="Segmentos" title="Prospecção por segmento" sub="Como encontrar, o que investigar, que investimentos aparecem e como começar a conversa com cada público." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{SEGMENTOS.map((sg) => { const cl = cliDoSeg(sg); return (
        <Card key={sg.k} onClick={() => setSel(sg.k)}><p className="text-2xl">{sg.emoji}</p><p className="font-display font-bold mt-1" style={{ color: C.ink }}>{sg.nome}</p><p className="font-body text-xs mt-1" style={{ color: C.muted }}>{sg.necessidades.join(" · ")}</p><p className="font-body text-xs mt-2 font-bold" style={{ color: C.blueHex }}>{cl.length} na carteira · {cl.filter((c) => !c.visitado).length} sem visita</p></Card>); })}</div>
    </div>
  );
  const lin = (K.linhas || []).filter((l) => (ESTRATEGIA_LINHAS[l.slug]?.segmentos || []).includes(s.k) && l.ativo !== false);
  const cl = cliDoSeg(s);
  const conversa = s.conversa.replace("{agente}", K.agente).replace("{nome}", "tudo bem");
  return (
    <div>
      <Btn small tipo="claro" icon={ChevronLeft} onClick={() => setSel(null)}>Todos os segmentos</Btn>
      <div className="mt-3"><Titulo eyebrow="Segmento" title={`${s.emoji} ${s.nome}`} direita={<Btn tipo="amarelo" icon={UserPlus} onClick={() => K.abrir("cliente", { origem: "visita", publico: [{ mei: "mei", micro: "microempresa", pequena: "pequena", mulher: "mulher", jovem: "jovem", autonomo: "autonomo", rural: "rural", familiar: "familiar", expansao: "expansao" }[s.k]].filter(Boolean) })}>Cadastrar cliente deste segmento</Btn>} /></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card><p className="font-display font-bold mb-2" style={{ color: C.ink }}>📍 Como encontrar esses clientes</p><ul className="list-disc ml-5 font-body text-sm space-y-1">{s.onde.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        <Card><p className="font-display font-bold mb-2" style={{ color: C.ink }}>🔎 Necessidades para investigar</p><ul className="list-disc ml-5 font-body text-sm space-y-1">{s.necessidades.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        <Card><p className="font-display font-bold mb-2" style={{ color: C.ink }}>🛠️ Investimentos que podem ser necessários</p><ul className="list-disc ml-5 font-body text-sm space-y-1">{s.investimentos.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        <Card><p className="font-display font-bold mb-2" style={{ color: C.ink }}>💳 Linhas possivelmente compatíveis</p>{lin.length ? lin.map((l) => <p key={l.id} className="font-body text-sm">• <b>{l.nome}</b> {l.valores && <span style={{ color: C.soft }}>({l.valores})</span>}</p>) : <p className="font-body text-sm" style={{ color: C.soft }}>Confira as linhas cadastradas.</p>}<p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Confirmar sempre os critérios oficiais vigentes.</p></Card>
        <Card className="lg:col-span-2" style={{ background: "#ECFDF3", borderColor: "#BBE5CC" }}><p className="font-display font-bold mb-2" style={{ color: "#166534" }}>💬 Como iniciar uma conversa</p><Texto>{conversa}</Texto><div className="flex gap-2 mt-2"><Copiar texto={conversa} /><BtnWhats texto={conversa} rotulo="Abrir WhatsApp" /></div></Card>
        <Card className="lg:col-span-2"><p className="font-display font-bold mb-2" style={{ color: C.ink }}>Atividades deste segmento</p><div className="grid sm:grid-cols-2 gap-2">{s.ativ.map((k) => { const a = atividadePorChave[k]; return <div key={k} className="rounded-xl border p-3" style={{ borderColor: C.line }}><p className="font-body text-sm font-bold">{a.a}</p><p className="font-body text-xs" style={{ color: C.muted }}>{a.i.slice(0, 5).join(" · ")}</p><p className="font-body text-xs mt-1" style={{ color: C.muted }}><b>Pergunte:</b> {a.q[0]}</p></div>; })}</div></Card>
        <Card className="lg:col-span-2"><p className="font-display font-bold mb-2" style={{ color: C.ink }}>Na carteira ({cl.length})</p>{cl.length ? cl.slice(0, 25).map((c) => <button key={c.id} onClick={() => K.abrir("cliente", c)} className="w-full text-left flex justify-between py-1.5 border-b font-body text-sm" style={{ borderColor: C.line }}><span>{c.nome} <span style={{ color: C.soft }}>· {c.atividade || "—"}</span></span><Chip cor={STATUS_CLIENTE[c.status]?.cor}>{STATUS_CLIENTE[c.status]?.nome}</Chip></button>) : <p className="font-body text-sm" style={{ color: C.soft }}>Ninguém deste segmento ainda.</p>}</Card>
      </div>
    </div>
  );
}

// ============================================================================= AGENDA E ROTEIRO
export function AbaAgenda({ K }) {
  const [vis, setVis] = useState("semana");
  const [ref, setRef] = useState(hojeISO());
  const base = dataLocal(ref);
  let de, ate;
  if (vis === "dia") { de = ate = ref; }
  else if (vis === "semana") { const i = new Date(base); i.setDate(base.getDate() - ((base.getDay() + 6) % 7)); de = isoData(i); ate = isoData(new Date(i.getTime() + 6 * 864e5)); }
  else { de = `${ref.slice(0, 7)}-01`; ate = isoData(new Date(base.getFullYear(), base.getMonth() + 1, 0)); }
  const mover = (n) => { const d = new Date(base); if (vis === "dia") d.setDate(d.getDate() + n); else if (vis === "semana") d.setDate(d.getDate() + 7 * n); else d.setMonth(d.getMonth() + n); setRef(isoData(d)); };
  const lista = K.d.visitas.filter((v) => { const d = isoData(v.data_hora); return d >= de && d <= ate; }).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  const porDia = lista.reduce((m, v) => { const d = isoData(v.data_hora); (m[d] = m[d] || []).push(v); return m; }, {});
  const cliPorId = Object.fromEntries(K.d.clientes.map((c) => [c.id, c]));
  const rota = (vs) => { const pts = vs.filter((v) => v.status === "agendada").map((v) => { const c = cliPorId[v.cliente_id]; return c?.lat ? `${c.lat},${c.lng}` : v.endereco ? `${v.endereco}, ${c?.cidade || "Ivatuba"} - PR` : null; }).filter(Boolean); if (!pts.length) return null; const dest = pts.pop(); return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${pts.length ? `&waypoints=${encodeURIComponent(pts.join("|"))}` : ""}&travelmode=driving`; };
  const realizar = async (v) => K.abrir("visita", { ...v, status: "realizada" });
  return (
    <div>
      <Titulo eyebrow="Campo" title="Agenda e roteiro de visitas" direita={<Btn icon={CalendarPlus} onClick={() => K.abrir("visita", { data: ref })}>Agendar visita</Btn>} />
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex gap-1.5">{[["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]].map(([k, l]) => <Chip key={k} ativo={vis === k} onClick={() => setVis(k)}>{l}</Chip>)}</div>
        <div className="flex items-center gap-2"><Btn small tipo="claro" icon={ChevronLeft} onClick={() => mover(-1)} /><span className="font-body text-sm font-bold" style={{ color: C.ink }}>{de === ate ? `${SEMANA[base.getDay()]}, ${dataBR(de)}` : `${dataBR(de)} – ${dataBR(ate)}`}</span><Btn small tipo="claro" icon={ChevronRight} onClick={() => mover(1)} /><Btn small tipo="fantasma" onClick={() => setRef(hojeISO())}>Hoje</Btn></div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">{[["Agendadas", lista.filter((v) => v.status === "agendada").length], ["Realizadas", lista.filter((v) => v.status === "realizada").length], ["Adiadas/canceladas", lista.filter((v) => ["adiada", "cancelada"].includes(v.status)).length]].map(([n, x]) => <Card key={n} className="!p-3 text-center"><p className="font-display font-extrabold text-xl" style={{ color: C.ink }}>{x}</p><p className="font-body text-[11px]" style={{ color: C.muted }}>{n}</p></Card>)}</div>
      {Object.keys(porDia).length ? Object.entries(porDia).map(([d, vs]) => { const r = rota(vs); return (
        <div key={d} className="mb-4">
          <div className="flex items-center justify-between mb-1.5"><p className="font-display font-bold" style={{ color: d === hojeISO() ? C.yellowInk : C.ink }}>{SEMANA[dataLocal(d).getDay()]}, {dataBR(d)}{d === hojeISO() ? " · hoje" : ""}</p>{r && <a href={r} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-body text-xs font-bold px-2.5 py-1.5 rounded-xl" style={{ background: C.yellowTint, color: C.yellowInk }}><Route size={13} /> Rota do dia</a>}</div>
          <div className="space-y-1.5">{vs.map((v) => { const c = cliPorId[v.cliente_id]; return (
            <Card key={v.id} className="!p-3 flex items-center gap-3 flex-wrap">
              <span className="font-display font-extrabold w-12" style={{ color: C.blueHex }}>{new Date(v.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              <div className="flex-1 min-w-[160px]"><p className="font-body text-sm font-bold" style={{ color: C.ink }}>{v.nome || c?.nome} <Chip cor={{ agendada: C.blueHex, realizada: C.green, adiada: C.yellowInk, cancelada: C.danger }[v.status]}>{v.status}</Chip></p><p className="font-body text-xs" style={{ color: C.muted }}>{[v.segmento, v.endereco, K.nomeLinha(v.linha_id, null)].filter(Boolean).join(" · ")}</p>{v.objetivo && <p className="font-body text-xs" style={{ color: C.muted }}>🎯 {v.objetivo}</p>}{v.resultado && <p className="font-body text-xs" style={{ color: C.green }}>✓ {v.resultado}{v.proxima_acao ? ` · ➜ ${v.proxima_acao}` : ""}</p>}</div>
              <div className="flex gap-1.5">{v.status === "agendada" && <Btn small tipo="verde" icon={CheckCircle2} onClick={() => realizar(v)}>Resultado</Btn>}{c?.whatsapp && <BtnWhats numero={c.whatsapp} rotulo="" texto={`Olá, ${c.nome.split(" ")[0]}! Confirmando nossa conversa ${isoData(v.data_hora) === hojeISO() ? "hoje" : `dia ${dataBR(isoData(v.data_hora))}`} às ${new Date(v.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Pode ser?`} />}<Btn small tipo="claro" onClick={() => K.abrir("visita", v)}>Editar</Btn></div>
            </Card>); })}</div>
        </div>); }) : <Vazio>Nenhuma visita neste período.</Vazio>}
    </div>
  );
}

// ============================================================================= MAPA DE PROSPECÇÃO
const IVATUBA = [-23.6186, -52.2203];
export function AbaMapa({ K }) {
  const ref = useRef(null); const mapa = useRef(null); const camada = useRef(null); const Lr = useRef(null);
  const [f, setF] = useState({ cat: "", vis: "todos", ativ: "" });
  const [sel, setSel] = useState(null);
  const [rota, setRota] = useState([]);
  const [modoAdd, setModoAdd] = useState(false);
  const [geo, setGeo] = useState({ rodando: false, msg: "" });
  const modoAddRef = useRef(false); modoAddRef.current = modoAdd;
  const comPonto = K.d.clientes.filter((c) => c.lat != null && c.lng != null);
  const semPonto = K.d.clientes.filter((c) => (c.lat == null || c.lng == null) && c.endereco);
  const filtrados = comPonto.filter((c) => (!f.cat || c.categoria === f.cat) && (!f.ativ || c.atividade === f.ativ) && (f.vis === "todos" || (f.vis === "visitados" ? c.visitado : !c.visitado)));

  useEffect(() => {
    let vivo = true;
    (async () => {
      const L = (await import("leaflet")).default; await import("leaflet/dist/leaflet.css");
      if (!vivo || !ref.current || mapa.current) return;
      Lr.current = L;
      mapa.current = L.map(ref.current).setView(IVATUBA, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapa.current);
      camada.current = L.layerGroup().addTo(mapa.current);
      mapa.current.on("click", (e) => { if (modoAddRef.current) { setModoAdd(false); K.abrir("cliente", { lat: e.latlng.lat, lng: e.latlng.lng, origem: "visita", status: "novo" }); } });
      desenhar();
    })();
    return () => { vivo = false; if (mapa.current) { mapa.current.remove(); mapa.current = null; } };
  }, []);
  const desenhar = () => {
    const L = Lr.current; if (!L || !camada.current) return;
    camada.current.clearLayers();
    for (const c of filtrados) {
      const cor = c.status === "perdido" ? "#B4462F" : ["aprovado", "contratado", "liberado"].includes(c.status) ? "#1E8E5A" : c.visitado ? "#0A5AA8" : "#F5B700";
      const m = L.circleMarker([c.lat, c.lng], { radius: rota.includes(c.id) ? 11 : 8, color: rota.includes(c.id) ? "#052A4D" : "#fff", weight: 2, fillColor: cor, fillOpacity: 0.95 }).addTo(camada.current);
      m.bindTooltip(c.nome); m.on("click", () => setSel(c.id));
    }
    if (rota.length > 1) { const pts = rota.map((id) => comPonto.find((c) => c.id === id)).filter(Boolean).map((c) => [c.lat, c.lng]); L.polyline(pts, { color: "#052A4D", weight: 3, dashArray: "6 6" }).addTo(camada.current); }
  };
  useEffect(desenhar, [K.d.clientes, f, rota]);

  const geocodificar = async () => {
    setGeo({ rodando: true, msg: "" }); let ok = 0;
    for (const c of semPonto.slice(0, 25)) {
      try {
        const q = encodeURIComponent(`${c.endereco}${c.bairro ? `, ${c.bairro}` : ""}, ${c.cidade || "Ivatuba"}, Paraná, Brasil`);
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${q}`, { headers: { "Accept-Language": "pt-BR" } });
        const j = await r.json();
        if (j[0]) { await K.salvar("clientes", c.id, { lat: Number(j[0].lat), lng: Number(j[0].lon) }); ok++; }
      } catch { /* segue */ }
      setGeo({ rodando: true, msg: `Localizando... ${ok} encontrado(s)` });
      await new Promise((r) => setTimeout(r, 1100));
    }
    setGeo({ rodando: false, msg: `${ok} de ${Math.min(25, semPonto.length)} endereço(s) localizado(s). Confira no mapa e ajuste se precisar.` });
  };
  const ordenarRota = () => { // vizinho mais próximo a partir do primeiro
    const pts = rota.map((id) => comPonto.find((c) => c.id === id)).filter(Boolean); if (pts.length < 3) return;
    const res = [pts.shift()]; while (pts.length) { const u = res[res.length - 1]; let bi = 0, bd = Infinity; pts.forEach((p, i) => { const dd = (p.lat - u.lat) ** 2 + (p.lng - u.lng) ** 2; if (dd < bd) { bd = dd; bi = i; } }); res.push(pts.splice(bi, 1)[0]); }
    setRota(res.map((c) => c.id));
  };
  const agendarRota = async (dia) => {
    let h = 8 * 60 + 30;
    try {
      for (const [i, id] of rota.entries()) { const c = comPonto.find((x) => x.id === id); const dt = new Date(`${dia}T${String(Math.floor(h / 60)).padStart(2, "0")}:${String(h % 60).padStart(2, "0")}`); await K.salvar("visitas", null, { cliente_id: id, nome: c.nome, data_hora: dt.toISOString(), endereco: c.endereco, segmento: c.atividade, linha_id: c.linha_id, objetivo: "Visita de prospecção (rota)", ordem_rota: i + 1, status: "agendada", lembrete: true }); h += 45; }
      K.avisar(`${rota.length} visita(s) agendada(s) para ${dataBR(dia)}.`); setRota([]);
    } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  const c = K.d.clientes.find((x) => x.id === sel);
  const urlRota = rota.length ? (() => { const p = rota.map((id) => comPonto.find((x) => x.id === id)).filter(Boolean).map((x) => `${x.lat},${x.lng}`); const dest = p.pop(); return `https://www.google.com/maps/dir/?api=1&destination=${dest}${p.length ? `&waypoints=${encodeURIComponent(p.join("|"))}` : ""}&travelmode=driving`; })() : null;
  return (
    <div>
      <Titulo eyebrow="Radar territorial" title="Mapa de prospecção de Ivatuba e região" sub="Só estabelecimentos reais: cadastrados por você, importados do Conecta Comércio ou de planilha. Amarelo = ainda não visitado, azul = visitado, verde = crédito aprovado, vermelho = perdido."
        direita={<><Btn tipo={modoAdd ? "amarelo" : "claro"} icon={Crosshair} onClick={() => setModoAdd(!modoAdd)}>{modoAdd ? "Clique no mapa..." : "Marcar estabelecimento"}</Btn>{semPonto.length > 0 && <Btn tipo="claro" icon={LocateFixed} disabled={geo.rodando} onClick={geocodificar}>Localizar endereços ({semPonto.length})</Btn>}</>} />
      {geo.msg && <div className="mb-3"><Aviso tipo={geo.rodando ? "info" : "ok"}>{geo.msg}</Aviso></div>}
      <div className="flex gap-2 flex-wrap mb-3">
        <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as categorias</option>{Object.entries(CATEGORIAS).map(([k, x]) => <option key={k} value={k}>{x.emoji} {x.nome}</option>)}</select>
        <select value={f.ativ} onChange={(e) => setF({ ...f, ativ: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todos os segmentos</option>{[...new Set(comPonto.map((x) => x.atividade).filter(Boolean))].sort().map((a) => <option key={a}>{a}</option>)}</select>
        {[["todos", "Todos"], ["nao", "Não prospectados"], ["visitados", "Visitados"]].map(([k, l]) => <Chip key={k} ativo={f.vis === k} onClick={() => setF({ ...f, vis: k })}>{l}</Chip>)}
        <span className="font-body text-xs self-center" style={{ color: C.soft }}>{filtrados.length} no mapa · {K.d.clientes.length - comPonto.length} sem localização</span>
      </div>
      <div className="grid lg:grid-cols-[1fr_300px] gap-3">
        <div ref={ref} className="rounded-2xl border overflow-hidden z-0" style={{ borderColor: C.line, height: 480, cursor: modoAdd ? "crosshair" : undefined }} />
        <div className="space-y-3">
          {c ? (
            <Card>
              <p className="font-display font-bold" style={{ color: C.ink }}>{c.nome}</p>
              <p className="font-body text-xs" style={{ color: C.muted }}>{c.atividade || "—"} · {c.endereco || ""}</p>
              <div className="mt-1"><Chip cor={STATUS_CLIENTE[c.status]?.cor}>{STATUS_CLIENTE[c.status]?.nome}</Chip> {c.visitado ? <Chip cor={C.blueHex}>visitado</Chip> : <Chip cor={C.yellowInk}>não visitado</Chip>}</div>
              <div className="flex gap-1.5 flex-wrap mt-3">
                <Btn small onClick={() => K.abrir("cliente", c)}>Abrir</Btn>
                <Btn small tipo="claro" onClick={() => K.abrir("atendimento", { cliente_id: c.id, tipo: "visita" })}>Registrar resultado</Btn>
                <Btn small tipo="amarelo" onClick={() => K.abrir("visita", { cliente_id: c.id, endereco: c.endereco, segmento: c.atividade })}>Agendar retorno</Btn>
                <Btn small tipo={rota.includes(c.id) ? "verde" : "claro"} icon={Route} onClick={() => setRota(rota.includes(c.id) ? rota.filter((x) => x !== c.id) : [...rota, c.id])}>{rota.includes(c.id) ? "Na rota" : "+ Rota"}</Btn>
              </div>
            </Card>
          ) : <Aviso>Clique num ponto para ver o estabelecimento. Use "+ Rota" para montar o roteiro de visitas.</Aviso>}
          <Card>
            <p className="font-display font-bold flex items-center gap-1.5" style={{ color: C.ink }}><Route size={15} /> Rota de visitas ({rota.length})</p>
            {rota.length ? <ol className="list-decimal ml-5 mt-2 font-body text-sm">{rota.map((id) => <li key={id}>{comPonto.find((x) => x.id === id)?.nome}</li>)}</ol> : <p className="font-body text-xs mt-1" style={{ color: C.soft }}>Adicione estabelecimentos à rota.</p>}
            {rota.length > 0 && <div className="flex gap-1.5 flex-wrap mt-3">
              {rota.length > 2 && <Btn small tipo="claro" onClick={ordenarRota}>Otimizar ordem</Btn>}
              <a href={urlRota} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-body text-xs font-bold px-2.5 py-1.5 rounded-xl" style={{ background: C.yellowTint, color: C.yellowInk }}><Navigation size={13} /> Abrir no Maps</a>
              <Btn small onClick={() => { const dd = window.prompt("Agendar a rota para qual dia? (AAAA-MM-DD)", isoData(new Date(Date.now() + 864e5))); if (dd && /^\d{4}-\d{2}-\d{2}$/.test(dd)) agendarRota(dd); }}>Agendar visitas</Btn>
              <Btn small tipo="perigo" onClick={() => setRota([])}>Limpar</Btn>
            </div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================= GERADOR DE ABORDAGENS
export function AbaAbordagens({ K }) {
  const [f, setF] = useState({ tipo: "primeiro", ativ: "saloes", cliente: "", perfil: "", obs: "" });
  const [ia, setIa] = useState({ txt: "", c: false, e: "" });
  const at = atividadePorChave[f.ativ];
  const cli = K.d.clientes.find((c) => c.id === f.cliente);
  const dados = { nome: cli?.nome || "", categoria: cli?.categoria || at.c, atividade: cli?.atividade || at.a, investimento: cli?.necessidade || at.i[0], agente: K.agente, linha: cli ? K.nomeLinha(cli.linha_id, null) : null };
  const txt = montarMensagem(f.tipo, dados);
  const adaptar = async () => {
    setIa({ txt: "", c: true, e: "" });
    try { setIa({ txt: await chamarIA({ modo: "abordagem", pedido: `Tipo: ${TIPOS_MENSAGEM.find((t) => t.k === f.tipo).nome}. Adapte para o segmento ${dados.atividade}${f.perfil ? `, perfil ${PUBLICOS[f.perfil]}` : ""}. ${f.obs}`, contexto: `Modelo base:\n${txt}\n\nCliente: ${dados.nome ? dados.nome.split(" ")[0] : "(sem nome)"} · necessidade: ${dados.investimento} · agente: ${K.agente}` }), c: false, e: "" }); }
    catch (e) { setIa({ txt: "", c: false, e: e.message }); }
  };
  return (
    <div>
      <Titulo eyebrow="Comunicação" title="Gerador de mensagens e abordagens" sub="12 tipos de mensagem, adaptadas ao segmento e ao perfil. A IA pode reescrever no tom certo." />
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Card className="space-y-3">
          <CampoF label="Tipo de mensagem"><select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={inputCls} style={inputSty}>{TIPOS_MENSAGEM.map((t) => <option key={t.k} value={t.k}>{t.nome}</option>)}</select></CampoF>
          <CampoF label="Cliente da carteira (opcional)"><select value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} className={inputCls} style={inputSty}><option value="">—</option>{K.d.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></CampoF>
          {!cli && <CampoF label="Segmento"><select value={f.ativ} onChange={(e) => setF({ ...f, ativ: e.target.value })} className={inputCls} style={inputSty}>{ATIVIDADES.map((a) => <option key={a.k} value={a.k}>{a.a}</option>)}</select></CampoF>}
          <CampoF label="Perfil do empreendedor"><select value={f.perfil} onChange={(e) => setF({ ...f, perfil: e.target.value })} className={inputCls} style={inputSty}><option value="">—</option>{Object.entries(PUBLICOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></CampoF>
          <CampoF label="Observação para a IA"><input value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} className={inputCls} style={inputSty} placeholder="Ex.: senhora de 60 anos, bem simples" /></CampoF>
        </Card>
        <div className="space-y-3">
          <Card><Selo tipo="sistema" /><Texto className="mt-2">{txt}</Texto><div className="flex gap-2 mt-3 flex-wrap"><Copiar texto={txt} />{<BtnWhats numero={cli?.whatsapp} texto={txt} rotulo="Enviar" />}<Btn small tipo="amarelo" icon={Sparkles} onClick={adaptar} disabled={ia.c}>{ia.c ? "Adaptando..." : "Adaptar com IA"}</Btn></div></Card>
          {ia.e && <Aviso tipo="amarelo">{ia.e}</Aviso>}
          {ia.txt && <Card style={{ borderColor: C.yellow }}><Selo tipo="ia" /><Texto className="mt-2">{ia.txt}</Texto><div className="flex gap-2 mt-3"><Copiar texto={ia.txt} /><BtnWhats numero={cli?.whatsapp} texto={ia.txt} rotulo="Enviar" /></div></Card>}
          <details className="rounded-2xl border bg-white p-4" style={{ borderColor: C.line }}><summary className="font-display font-bold cursor-pointer" style={{ color: C.ink }}>Ver a biblioteca completa para este segmento</summary>
            <div className="mt-3 space-y-3">{TIPOS_MENSAGEM.map((t) => { const x = montarMensagem(t.k, dados); return <div key={t.k}><p className="font-body text-xs font-bold" style={{ color: C.blueHex }}>{t.nome}</p><p className="font-body text-sm whitespace-pre-line">{x}</p><div className="mt-1"><Copiar texto={x} /></div></div>; })}</div>
          </details>
        </div>
      </div>
    </div>
  );
}

// ============================================================================= SIMULADOR DE OPORTUNIDADES
export function AbaSimulador({ K }) {
  const [f, setF] = useState({ negocio: "", categoria: "comercio", porte: "mei", cnpj: false, mulher: false, objetivo: "", valor: "", tempo: "", faturamento: "", capacidade: "", investimento: "", linhaId: "", observacao: "" });
  const [res, setRes] = useState(null);
  const [ia, setIa] = useState({ txt: "", c: false, e: "" });
  const analisar = () => { setRes(analisarOportunidade(f, K.linhas || [])); setIa({ txt: "", c: false, e: "" }); };
  const comIA = async () => {
    setIa({ txt: "", c: true, e: "" });
    const linhasCtx = (K.linhas || []).filter((l) => l.ativo !== false).map((l) => `- ${l.nome}: público ${l.publico_alvo || "—"}; valores ${l.valores || "não cadastrado"}; prazos ${l.prazos || "não cadastrado"}; requisitos ${l.requisitos || "não cadastrado"}; documentos ${(l.documentos || []).join(", ") || "não cadastrado"}`).join("\n");
    try { setIa({ txt: await chamarIA({ modo: "oportunidade", pedido: `Negócio: ${f.negocio} (${CATEGORIAS[f.categoria]?.nome}, porte ${f.porte}${f.cnpj ? ", tem CNPJ" : ""}${f.mulher ? ", empreendedora mulher" : ""}). Objetivo: ${f.objetivo}. Investimento: ${f.investimento}. Valor pretendido: ${moeda(f.valor)}. Tempo de atividade: ${f.tempo} meses. Faturamento informado: ${moeda(f.faturamento)}/mês. Capacidade de pagamento informada: ${moeda(f.capacidade)}/mês. ${f.observacao}`, contexto: `Linhas cadastradas (condições oficiais informadas pelo agente):\n${linhasCtx}` }), c: false, e: "" }); }
    catch (e) { setIa({ txt: "", c: false, e: e.message }); }
  };
  return (
    <div>
      <Titulo eyebrow="Diagnóstico" title="Simulador de oportunidades" sub="Organiza o caso e indica modalidades para avaliação. Não aprova nem garante concessão: tudo depende da análise de crédito da Fomento Paraná." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <Campos campos={[
            { k: "negocio", l: "Tipo de negócio", ph: "Ex.: salão de beleza, produtor de leite" }, { k: "categoria", l: "Categoria", t: "select", semVazio: true, op: Object.entries(CATEGORIAS).map(([k, c]) => [k, c.nome]) },
            { k: "porte", l: "Porte", t: "select", semVazio: true, op: [["informal", "Informal"], ["mei", "MEI"], ["me", "Microempresa"], ["epp", "Pequena empresa"]] },
            { k: "linhaId", l: "Linha considerada", t: "select", vazio: "(nenhuma)", op: (K.linhas || []).map((l) => [l.id, l.nome]) },
            { k: "cnpj", l: "Formalização", t: "checkbox", texto: "Tem CNPJ" }, { k: "mulher", l: "Perfil", t: "checkbox", texto: "Empreendedora mulher" },
            { k: "objetivo", l: "Objetivo", full: true, ph: "Ex.: comprar equipamento, capital de giro para estoque" }, { k: "investimento", l: "Investimento pretendido", full: true },
            { k: "valor", l: "Valor pretendido (R$)", t: "number" }, { k: "tempo", l: "Tempo de atividade (meses)", t: "number" },
            { k: "faturamento", l: "Faturamento mensal informado (R$)", t: "number" }, { k: "capacidade", l: "Capacidade de pagamento informada (R$/mês)", t: "number" },
            { k: "observacao", l: "Observações", t: "textarea", full: true },
          ]} valores={f} set={setF} />
          <div className="flex justify-end gap-2 mt-4"><Btn onClick={analisar}>Analisar oportunidade</Btn></div>
        </Card>
        <div className="space-y-3">
          {!res ? <Vazio>Preencha os dados e clique em Analisar.</Vazio> : (<>
            <Card><div className="flex justify-between items-center mb-2"><p className="font-display font-bold" style={{ color: C.ink }}>Modalidades para avaliação</p><Selo tipo="sistema" /></div>
              {res.resultado.map((r) => <div key={r.linha.id} className="rounded-xl border p-3 mb-2" style={{ borderColor: C.line }}><p className="font-body text-sm font-bold" style={{ color: C.blueHex }}>{r.linha.nome}</p><p className="font-body text-xs" style={{ color: C.muted }}>{r.motivos.join(" · ")}</p>{r.linha.valores && <p className="font-body text-xs mt-1"><Selo tipo="oficial" /> {r.linha.valores}{r.linha.prazos ? ` · ${r.linha.prazos}` : ""}</p>}{r.alertas.map((a) => <p key={a} className="font-body text-xs mt-1" style={{ color: C.yellowInk }}>⚠ {a}</p>)}</div>)}
            </Card>
            <Card><p className="font-display font-bold mb-1" style={{ color: C.ink }}>Pontos que precisam ser confirmados</p><ul className="list-disc ml-5 font-body text-sm">{res.confirmar.map((x) => <li key={x}>{x}</li>)}</ul></Card>
            <Card><p className="font-display font-bold mb-1" style={{ color: C.ink }}>Perguntas adicionais</p><ul className="list-disc ml-5 font-body text-sm">{res.perguntas.map((x) => <li key={x}>{x}</li>)}</ul></Card>
            <Card><p className="font-display font-bold mb-1" style={{ color: C.ink }}>Documentação necessária</p>{res.docs.length ? <><Selo tipo="oficial" /><ul className="list-disc ml-5 font-body text-sm mt-1">{res.docs.map((x) => <li key={x}>{x}</li>)}</ul></> : <p className="font-body text-sm" style={{ color: C.soft }}>A documentação oficial destas linhas ainda não foi cadastrada. Preencha em Linhas de crédito.</p>}</Card>
            <div className="flex gap-2 flex-wrap">
              <Btn tipo="amarelo" icon={Sparkles} onClick={comIA} disabled={ia.c}>{ia.c ? "Analisando..." : "Análise complementar com IA"}</Btn>
              <Btn tipo="claro" icon={UserPlus} onClick={() => K.abrir("cliente", { atividade: null, categoria: f.categoria, porte: f.porte, necessidade: [f.objetivo, f.investimento].filter(Boolean).join(" — "), valor_pretendido: f.valor || null, faturamento_mensal: f.faturamento || null, tempo_atividade_meses: f.tempo || null, linha_id: f.linhaId || res.resultado[0]?.linha.id, status: "qualificado", publico: f.mulher ? ["mulher"] : [], observacoes: f.negocio ? `Negócio: ${f.negocio}` : null })}>Salvar como cliente</Btn>
            </div>
            {ia.e && <Aviso tipo="amarelo">{ia.e}</Aviso>}
            {ia.txt && <Card style={{ borderColor: C.yellow }}><Selo tipo="ia" /><Texto className="mt-2">{ia.txt}</Texto></Card>}
            <Aviso>Este simulador não aprova crédito. Taxas, prazos, limites e aprovação dependem das regras oficiais vigentes e da análise da Fomento Paraná.</Aviso>
          </>)}
        </div>
      </div>
    </div>
  );
}
