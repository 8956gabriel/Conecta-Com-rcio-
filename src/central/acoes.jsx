import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Save, Trash2, CalendarPlus, MessageSquarePlus, FilePlus2, History, AlertTriangle } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { C, Modal, Campos, Btn, Aviso, Chip, BtnWhats, Copiar, Selo } from "./ui.jsx";
import { STATUS_CLIENTE, ORIGENS, PUBLICOS, CATEGORIAS, ATIVIDADES, MOTIVOS_PERDA, TIPOS_MENSAGEM, montarMensagem } from "./dados.js";
import { dataBR, moeda, zap, soDigitos, isoData, hojeISO } from "./motor.js";

const TABELAS = {
  clientes: ["fomento_cp_clientes", "criado_em", false],
  atendimentos: ["fomento_cp_atendimentos", "data", false],
  campanhas: ["fomento_cp_campanhas", "criado_em", false],
  visitas: ["fomento_cp_visitas", "data_hora", true],
  dias: ["fomento_cp_dias", "data", true],
  datas: ["fomento_cp_datas", "data", true],
  ideias: ["fomento_cp_ideias", "criado_em", false],
  ideiasUso: ["fomento_cp_ideias_uso", "chave", true],
  metas: ["fomento_cp_metas", "criado_em", true],
};
export const TAB = Object.fromEntries(Object.entries(TABELAS).map(([k, [t]]) => [k, t]));

// Carrega tudo da Central e oferece salvar/apagar que atualizam a tela
export function useCentralDados(ativo) {
  const [d, setD] = useState(null);
  const [erroBanco, setErroBanco] = useState(null);
  const carregar = async () => {
    if (!supabaseConfigurado) { setD(Object.fromEntries(Object.keys(TABELAS).map((k) => [k, []]))); return; }
    const res = await Promise.all(Object.entries(TABELAS).map(async ([k, [t, ord, asc]]) => {
      const todos = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase.from(t).select("*").order(ord, { ascending: asc }).range(de, de + 999);
        if (error) return [k, null, error];
        todos.push(...data);
        if (data.length < 1000) break;
      }
      return [k, todos];
    }));
    const falhou = res.find((r) => r[2]);
    setErroBanco(falhou ? falhou[2].message : null);
    setD(Object.fromEntries(res.map(([k, v]) => [k, v || []])));
  };
  useEffect(() => { if (ativo) carregar(); }, [ativo]);

  const chaveDe = (k) => (k === "dias" ? "data" : k === "ideiasUso" ? "chave" : "id");
  const salvar = async (k, id, dados) => {
    const t = TABELAS[k][0], pk = chaveDe(k);
    if (!supabaseConfigurado) { const row = { ...dados, [pk]: id || dados[pk] || `demo-${Date.now()}`, criado_em: new Date().toISOString() }; setD((x) => ({ ...x, [k]: [row, ...x[k].filter((r) => r[pk] !== row[pk])] })); return row; }
    let q;
    if (["dias", "ideiasUso"].includes(k)) q = supabase.from(t).upsert({ ...dados, [pk]: id || dados[pk] }).select().single();
    else if (id) q = supabase.from(t).update(dados).eq(pk, id).select().single();
    else q = supabase.from(t).insert(dados).select().single();
    const { data, error } = await q;
    if (error) throw error;
    setD((x) => ({ ...x, [k]: x[k].some((r) => r[pk] === data[pk]) ? x[k].map((r) => (r[pk] === data[pk] ? data : r)) : [data, ...x[k]] }));
    return data;
  };
  const apagar = async (k, id) => {
    const t = TABELAS[k][0], pk = chaveDe(k);
    if (supabaseConfigurado) { const { error } = await supabase.from(t).delete().eq(pk, id); if (error) throw error; }
    setD((x) => ({ ...x, [k]: x[k].filter((r) => r[pk] !== id) }));
  };
  // recarrega um cliente (triggers do banco mudam status/último contato)
  const recarregarCliente = async (id) => {
    if (!supabaseConfigurado || !id) return;
    const { data } = await supabase.from(TAB.clientes).select("*").eq("id", id).maybeSingle();
    if (data) setD((x) => ({ ...x, clientes: x.clientes.map((c) => (c.id === id ? data : c)) }));
  };
  return { d, setD, carregar, salvar, apagar, recarregarCliente, erroBanco };
}

export async function registrarAcesso(acao, referencia = null) {
  if (!supabaseConfigurado) return;
  try { await supabase.from("fomento_acessos").insert({ acao, referencia }); } catch { /* best-effort */ }
}

export function mascararDoc(doc) {
  const d = soDigitos(doc);
  if (d.length === 11) return `***.${d.slice(3, 6)}.***-**`;
  if (d.length === 14) return `**.${d.slice(2, 5)}.***/****-${d.slice(12)}`;
  return d ? "•••••" : "—";
}
export function DocProtegido({ valor, refId }) {
  const [ver, setVer] = useState(false);
  if (!valor) return <span style={{ color: C.soft }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1 font-body text-sm">
      {ver ? valor : mascararDoc(valor)}
      <button type="button" title={ver ? "Ocultar" : "Mostrar (acesso registrado — LGPD)"} onClick={() => { if (!ver) registrarAcesso("viu_cpf_cnpj_carteira", refId); setVer(!ver); }}>
        {ver ? <EyeOff size={13} color={C.soft} /> : <Eye size={13} color={C.soft} />}
      </button>
    </span>
  );
}

export const msgErro = (e) => {
  const m = e?.message || String(e);
  if (/fomento_cp_clientes_doc_uk|duplicate key/i.test(m)) return "Já existe um cliente com este CPF/CNPJ na carteira.";
  if (/relation .* does not exist|schema cache/i.test(m)) return "A Central ainda não foi instalada no banco (rode o arquivo supabase-fomento-central.sql).";
  return m;
};

// ----------------------------------------------------------------------------- CLIENTE
const opt = (o) => Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v : v.nome]);
export function camposCliente(linhas) {
  return [
    { k: "nome", l: "Nome do empreendedor", req: true },
    { k: "empresa", l: "Empresa / nome fantasia" },
    { k: "whatsapp", l: "WhatsApp", t: "tel", inputMode: "tel" },
    { k: "telefone", l: "Telefone", t: "tel" },
    { k: "cpf_cnpj", l: "CPF/CNPJ", dica: "Acesso restrito: aparece mascarado na tela." },
    { k: "categoria", l: "Categoria", t: "select", op: opt(CATEGORIAS) },
    { k: "atividade", l: "Atividade econômica", t: "select", op: [...ATIVIDADES.map((a) => [a.a, a.a]), ["Outra", "Outra"]] },
    { k: "cnae", l: "CNAE" },
    { k: "publico", l: "Perfil do empreendedor", t: "multi", full: true, op: Object.entries(PUBLICOS) },
    { k: "porte", l: "Porte", t: "select", op: [["informal", "Informal"], ["mei", "MEI"], ["me", "Microempresa"], ["epp", "Pequena empresa"], ["outro", "Outro"]] },
    { k: "tempo_atividade_meses", l: "Tempo de atividade (meses)", t: "number" },
    { k: "faturamento_mensal", l: "Faturamento mensal informado (R$)", t: "number" },
    { k: "valor_pretendido", l: "Valor pretendido (R$)", t: "number" },
    { k: "necessidade", l: "Necessidade de investimento", t: "textarea", full: true },
    { k: "linha_id", l: "Linha de crédito de interesse", t: "select", op: (linhas || []).filter((l) => l.ativo !== false).map((l) => [l.id, l.nome]) },
    { k: "origem", l: "Origem do contato", t: "select", op: opt(ORIGENS) },
    { k: "endereco", l: "Endereço", full: true },
    { k: "bairro", l: "Bairro" },
    { k: "cidade", l: "Cidade" },
    { k: "status", l: "Classificação", t: "select", op: opt(STATUS_CLIENTE), semVazio: true },
    { k: "proximo_contato", l: "Próximo contato", t: "date" },
    { k: "observacoes", l: "Observações", t: "textarea", full: true },
    { k: "consentimento_lgpd", l: "LGPD", t: "checkbox", texto: "O empreendedor autorizou o registro dos dados para atendimento de crédito.", full: true },
  ];
}
const NUM = ["tempo_atividade_meses", "faturamento_mensal", "valor_pretendido"];
function limpar(v, numeros = NUM) {
  const o = {};
  for (const [k, x] of Object.entries(v)) {
    if (["id", "criado_em", "atualizado_em", "doc_digitos", "zap_digitos", "criado_por"].includes(k) || k.startsWith("_")) continue;
    o[k] = x === "" ? null : numeros.includes(k) && x != null ? Number(x) : x;
  }
  return o;
}

export function ModalCliente({ K, cliente, inicial, onFechar }) {
  const novo = !cliente;
  const [v, setV] = useState(() => ({ status: "novo", cidade: "Ivatuba", origem: "visita", ...(inicial || {}), ...(cliente || {}) }));
  const [aba, setAba] = useState("dados");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const atual = cliente ? K.d.clientes.find((c) => c.id === cliente.id) || cliente : null;

  const duplicado = useMemo(() => {
    if (!novo) return null;
    const z = zap(v.whatsapp), doc = soDigitos(v.cpf_cnpj);
    return K.d.clientes.find((c) => (z && z.length >= 10 && c.zap_digitos === z) || (doc && c.doc_digitos === doc));
  }, [v.whatsapp, v.cpf_cnpj]);

  const salvar = async () => {
    if (!String(v.nome || "").trim()) { setErro("Informe o nome."); return; }
    if (v.status === "perdido" && !v.motivo_perda) { setErro("Informe o motivo da perda/desistência."); return; }
    setSalvando(true); setErro("");
    try {
      const dados = limpar(v);
      if (dados.categoria == null) { const at = ATIVIDADES.find((a) => a.a === dados.atividade); if (at) dados.categoria = at.c; }
      const row = await K.salvar("clientes", cliente?.id, dados);
      K.avisar(novo ? "Cliente cadastrado na carteira." : "Cliente atualizado.");
      if (novo && inicial?.interesse_id && supabaseConfigurado) {
        await supabase.from("fomento_interesses").update({ status: "contatado" }).eq("id", inicial.interesse_id);
        K.setInteresses?.((l) => (l || []).map((i) => (i.id === inicial.interesse_id ? { ...i, status: "contatado" } : i)));
      }
      onFechar(row);
    } catch (e) { setErro(msgErro(e)); } finally { setSalvando(false); }
  };

  const ats = atual ? K.d.atendimentos.filter((a) => a.cliente_id === atual.id) : [];
  const props = atual ? (K.propostas || []).filter((p) => p.cliente_id === atual.id) : [];
  const vis = atual ? K.d.visitas.filter((x) => x.cliente_id === atual.id) : [];
  const campos = camposCliente(K.linhas).map((c) => (c.k === "cpf_cnpj" && !novo ? { ...c, t: "password", dica: "Mascarado. Use o olho na aba Resumo para ver (acesso registrado)." } : c));

  return (
    <Modal aberto onFechar={() => onFechar()} titulo={novo ? "Novo cliente na carteira" : atual?.nome} largura="max-w-3xl">
      {!novo && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {[["resumo", "Resumo"], ["dados", "Dados"], ["historico", `Histórico (${ats.length + props.length + vis.length})`], ["mensagens", "Mensagens"]].map(([k, l]) => (
            <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>
          ))}
        </div>
      )}
      {!novo && aba === "resumo" && atual && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Chip cor={STATUS_CLIENTE[atual.status]?.cor}>{STATUS_CLIENTE[atual.status]?.nome}</Chip>
            {atual.atividade && <Chip cor={CATEGORIAS[atual.categoria]?.cor}>{atual.atividade}</Chip>}
            {atual.origem && <Chip cor={C.muted}>{ORIGENS[atual.origem]}</Chip>}
          </div>
          <div className="grid sm:grid-cols-2 gap-2 font-body text-sm">
            <p><b>Empresa:</b> {atual.empresa || "—"}</p>
            <p className="flex gap-1"><b>CPF/CNPJ:</b> <DocProtegido valor={atual.cpf_cnpj} refId={atual.id} /></p>
            <p><b>WhatsApp:</b> {atual.whatsapp || "—"}</p>
            <p><b>Endereço:</b> {[atual.endereco, atual.bairro, atual.cidade].filter(Boolean).join(", ") || "—"}</p>
            <p><b>Valor pretendido:</b> {moeda(atual.valor_pretendido)}</p>
            <p><b>Linha de interesse:</b> {K.nomeLinha(atual.linha_id, "—")}</p>
            <p><b>Último contato:</b> {atual.ultimo_contato ? new Date(atual.ultimo_contato).toLocaleDateString("pt-BR") : "nunca"}</p>
            <p><b>Próximo contato:</b> {dataBR(atual.proximo_contato)}</p>
          </div>
          {atual.necessidade && <Aviso>{atual.necessidade}</Aviso>}
          <div className="flex flex-wrap gap-2 pt-2">
            <Btn small icon={MessageSquarePlus} onClick={() => K.abrir("atendimento", { cliente_id: atual.id })}>Registrar atendimento</Btn>
            <Btn small tipo="amarelo" icon={CalendarPlus} onClick={() => K.abrir("visita", { cliente_id: atual.id, endereco: atual.endereco, segmento: atual.atividade, linha_id: atual.linha_id })}>Agendar visita</Btn>
            <Btn small tipo="verde" icon={FilePlus2} onClick={() => K.abrir("proposta", { cliente: atual })}>Criar proposta</Btn>
            {atual.whatsapp && <BtnWhats numero={atual.whatsapp} texto={montarMensagem(atual.ultimo_contato ? "recuperar" : "primeiro", { nome: atual.nome, categoria: atual.categoria, atividade: atual.atividade, investimento: atual.necessidade, agente: K.agente })} />}
          </div>
        </div>
      )}
      {(novo || aba === "dados") && (
        <div className="space-y-3">
          {duplicado && (
            <Aviso tipo="amarelo"><AlertTriangle size={12} className="inline mr-1" />Já existe na carteira: <b>{duplicado.nome}</b> ({STATUS_CLIENTE[duplicado.status]?.nome}).{" "}
              <button className="underline font-bold" onClick={() => { onFechar(); setTimeout(() => K.abrir("cliente", duplicado), 50); }}>Abrir o cadastro existente</button> para não duplicar.
              {duplicado.doc_digitos !== soDigitos(v.cpf_cnpj) && <label className="flex items-center gap-1.5 mt-1.5"><input type="checkbox" checked={!!v._forcar} onChange={(e) => setV({ ...v, _forcar: e.target.checked })} /> É outra pessoa com o mesmo telefone — cadastrar mesmo assim</label>}</Aviso>
          )}
          <Campos campos={campos} valores={v} set={setV} />
          {v.status === "perdido" && (
            <Campos campos={[{ k: "motivo_perda", l: "Motivo da perda/desistência", t: "select", op: MOTIVOS_PERDA.map((m) => [m, m]), req: true }]} valores={v} set={setV} />
          )}
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div className="flex justify-between gap-2 pt-2">
            {!novo ? <Btn tipo="perigo" small icon={Trash2} onClick={async () => { if (!window.confirm("Excluir este cliente da carteira? O histórico de atendimentos também será apagado. Propostas continuam salvas.")) return; try { await K.apagar("clientes", cliente.id); K.avisar("Cliente excluído."); onFechar(); } catch (e) { setErro(msgErro(e)); } }}>Excluir</Btn> : <span />}
            <Btn icon={Save} onClick={salvar} disabled={salvando || (novo && !!duplicado && !v._forcar)}>{salvando ? "Salvando..." : "Salvar"}</Btn>
          </div>
        </div>
      )}
      {!novo && aba === "historico" && (
        <div className="space-y-2">
          {[...ats.map((a) => ({ data: a.data, t: `${({ visita: "🚶 Visita", presencial: "🤝 Presencial", ligacao: "📞 Ligação", whatsapp: "💬 WhatsApp", diagnostico: "🩺 Diagnóstico", documentacao: "📄 Documentação", proposta: "📝 Proposta", pos_atendimento: "⭐ Pós-atendimento", outro: "• Outro" })[a.tipo]}`, txt: [a.resumo, a.resultado && `Resultado: ${a.resultado}`, a.proxima_acao && `Próxima ação: ${a.proxima_acao}`].filter(Boolean).join(" · ") })),
            ...vis.map((x) => ({ data: x.data_hora, t: `📅 Visita ${x.status}`, txt: [x.objetivo, x.resultado].filter(Boolean).join(" · ") })),
            ...props.map((p) => ({ data: p.criado_em, t: `📝 Proposta ${p.numero || ""}`, txt: `${K.nomeLinha(p.linha_id, p.linha_fomentonet)} · ${moeda(p.valor_solicitado)} · ${p.status}` })),
          ].sort((a, b) => new Date(b.data) - new Date(a.data)).map((h, i) => (
            <div key={i} className="rounded-xl border px-3 py-2" style={{ borderColor: C.line }}>
              <p className="font-body text-xs font-bold" style={{ color: C.blueHex }}>{new Date(h.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {h.t}</p>
              {h.txt && <p className="font-body text-sm mt-0.5" style={{ color: C.ink }}>{h.txt}</p>}
            </div>
          ))}
          {!ats.length && !props.length && !vis.length && <p className="font-body text-sm" style={{ color: C.muted }}><History size={13} className="inline" /> Nenhum atendimento registrado ainda.</p>}
        </div>
      )}
      {!novo && aba === "mensagens" && atual && (
        <div className="space-y-3">
          <Selo tipo="sistema" />
          {TIPOS_MENSAGEM.map((t) => {
            const txt = montarMensagem(t.k, { nome: atual.nome, categoria: atual.categoria, atividade: atual.atividade, investimento: atual.necessidade, agente: K.agente, linha: K.nomeLinha(atual.linha_id, null) });
            return (
              <div key={t.k} className="rounded-xl border p-3" style={{ borderColor: C.line }}>
                <p className="font-body text-xs font-bold mb-1" style={{ color: C.blueHex }}>{t.nome}</p>
                <p className="font-body text-sm whitespace-pre-line" style={{ color: C.ink }}>{txt}</p>
                <div className="flex gap-2 mt-2"><Copiar texto={txt} />{atual.whatsapp && <BtnWhats numero={atual.whatsapp} texto={txt} rotulo="Enviar" />}</div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ----------------------------------------------------------------------------- ATENDIMENTO
export function ModalAtendimento({ K, inicial, onFechar }) {
  const cli = K.d.clientes.find((c) => c.id === inicial?.cliente_id);
  const [v, setV] = useState({ tipo: "whatsapp", data: new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16), resultado: "positivo", novo_status: "", ...(inicial || {}) });
  const [erro, setErro] = useState(""); const [sal, setSal] = useState(false);
  const campos = [
    ...(cli ? [] : [{ k: "cliente_id", l: "Cliente", t: "select", req: true, op: K.d.clientes.map((c) => [c.id, c.nome]) }]),
    { k: "tipo", l: "Tipo", t: "select", semVazio: true, op: [["visita", "Visita"], ["presencial", "Atendimento presencial"], ["ligacao", "Ligação"], ["whatsapp", "WhatsApp"], ["diagnostico", "Diagnóstico de crédito"], ["documentacao", "Documentação"], ["proposta", "Proposta"], ["pos_atendimento", "Pós-atendimento"], ["outro", "Outro"]] },
    { k: "data", l: "Data e hora", t: "datetime-local" },
    { k: "resumo", l: "O que foi conversado", t: "textarea", full: true, ph: "Necessidade, valor, investimento, objeções..." },
    { k: "resultado", l: "Resultado", t: "select", semVazio: true, op: [["positivo", "Positivo"], ["neutro", "Neutro"], ["negativo", "Negativo"], ["sem_resposta", "Sem resposta"]] },
    { k: "novo_status", l: "Atualizar classificação", t: "select", vazio: "(manter)", op: Object.entries(STATUS_CLIENTE).map(([k, s]) => [k, s.nome]) },
    { k: "proxima_acao", l: "Próxima ação", full: true },
    { k: "proximo_contato", l: "Data do próximo contato", t: "date" },
    { k: "campanha_id", l: "Campanha", t: "select", op: K.d.campanhas.map((c) => [c.id, c.nome]) },
    { k: "linha_id", l: "Linha conversada", t: "select", op: (K.linhas || []).map((l) => [l.id, l.nome]) },
  ];
  const salvar = async () => {
    if (!v.cliente_id) { setErro("Escolha o cliente."); return; }
    setSal(true); setErro("");
    try {
      const { novo_status, ...r } = v;
      await K.salvar("atendimentos", null, { ...limpar(r, []), data: new Date(v.data).toISOString() });
      if (novo_status) await K.salvar("clientes", v.cliente_id, { status: novo_status });
      await K.recarregarCliente(v.cliente_id);
      K.avisar("Atendimento registrado.");
      onFechar(true);
    } catch (e) { setErro(msgErro(e)); } finally { setSal(false); }
  };
  return (
    <Modal aberto onFechar={() => onFechar()} titulo={`Registrar atendimento${cli ? ` · ${cli.nome}` : ""}`}>
      <Campos campos={campos} valores={v} set={setV} />
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar} disabled={sal}>{sal ? "Salvando..." : "Registrar"}</Btn></div>
    </Modal>
  );
}

// ----------------------------------------------------------------------------- VISITA
export function ModalVisita({ K, visita, inicial, onFechar }) {
  const local = (iso) => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const [v, setV] = useState(() => visita ? { ...visita, data_hora: local(visita.data_hora) } : { status: "agendada", lembrete: true, data_hora: `${inicial?.data || isoData(new Date(Date.now() + 864e5))}T09:00`, ...(inicial || {}) });
  const [erro, setErro] = useState(""); const [sal, setSal] = useState(false);
  const campos = [
    { k: "cliente_id", l: "Cliente da carteira", t: "select", vazio: "(ainda não cadastrado)", op: K.d.clientes.map((c) => [c.id, c.nome]) },
    ...(!v.cliente_id ? [{ k: "nome", l: "Nome do empreendedor", req: true }] : []),
    { k: "data_hora", l: "Data e horário", t: "datetime-local", req: true },
    { k: "endereco", l: "Endereço", full: true },
    { k: "segmento", l: "Segmento" },
    { k: "linha_id", l: "Linha potencial", t: "select", op: (K.linhas || []).map((l) => [l.id, l.nome]) },
    { k: "objetivo", l: "Objetivo da visita", t: "textarea", full: true },
    { k: "campanha_id", l: "Campanha", t: "select", op: K.d.campanhas.map((c) => [c.id, c.nome]) },
    { k: "status", l: "Situação", t: "select", semVazio: true, op: [["agendada", "Agendada"], ["realizada", "Realizada"], ["adiada", "Adiada"], ["cancelada", "Cancelada"]] },
    { k: "lembrete", l: "Lembrete", t: "checkbox", texto: "Mostrar nos alertas" },
    ...(v.status === "realizada" ? [{ k: "resultado", l: "Resultado", t: "textarea", full: true }, { k: "proxima_acao", l: "Próxima ação", full: true }] : []),
  ];
  const salvar = async () => {
    if (!v.cliente_id && !v.nome) { setErro("Escolha um cliente ou informe o nome."); return; }
    setSal(true); setErro("");
    try {
      const cli = K.d.clientes.find((c) => c.id === v.cliente_id);
      const dados = { ...limpar(v, []), data_hora: new Date(v.data_hora).toISOString(), nome: v.cliente_id ? cli?.nome : v.nome, endereco: v.endereco || cli?.endereco || null };
      const antes = visita?.status;
      await K.salvar("visitas", visita?.id, dados);
      if (v.status === "realizada" && antes !== "realizada" && v.cliente_id) {
        await K.salvar("atendimentos", null, { cliente_id: v.cliente_id, tipo: "visita", data: dados.data_hora, resumo: v.objetivo || null, resultado: v.resultado ? "positivo" : null, proxima_acao: v.proxima_acao || null, campanha_id: v.campanha_id || null, linha_id: v.linha_id || null });
        await K.recarregarCliente(v.cliente_id);
      }
      K.avisar(visita ? "Visita atualizada." : "Visita agendada.");
      onFechar(true);
    } catch (e) { setErro(msgErro(e)); } finally { setSal(false); }
  };
  return (
    <Modal aberto onFechar={() => onFechar()} titulo={visita ? "Visita" : "Agendar visita"}>
      <Campos campos={campos} valores={v} set={setV} />
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="flex justify-between mt-4">
        {visita ? <Btn tipo="perigo" small icon={Trash2} onClick={async () => { if (!window.confirm("Excluir esta visita?")) return; await K.apagar("visitas", visita.id); onFechar(true); }}>Excluir</Btn> : <span />}
        <Btn icon={Save} onClick={salvar} disabled={sal}>{sal ? "Salvando..." : "Salvar"}</Btn>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------------- PROPOSTA (tabela existente fomento_propostas)
export const SITUACAO_PROPOSTA = { novo: "Iniciada", em_contato: "Em contato", documentacao: "Documentação", em_analise: "Em análise", concedido: "Aprovada", negado: "Reprovada", excluido: "Excluída" };
export function ModalProposta({ K, proposta, inicial, onFechar }) {
  const cli = inicial?.cliente;
  const [v, setV] = useState(() => proposta ? { ...proposta } : {
    nome: cli?.nome || "", whatsapp: cli?.whatsapp || "", linha_id: cli?.linha_id || "", valor_solicitado: cli?.valor_pretendido || "",
    objetivo: cli?.necessidade || "", cliente_id: cli?.id || "", status: "novo", data_proposta: hojeISO(), campanha_id: cli?.campanha_id || "",
  });
  const [erro, setErro] = useState(""); const [sal, setSal] = useState(false);
  const campos = [
    { k: "cliente_id", l: "Cliente da carteira", t: "select", op: K.d.clientes.map((c) => [c.id, c.nome]) },
    { k: "nome", l: "Nome", req: true },
    { k: "whatsapp", l: "WhatsApp" },
    { k: "linha_id", l: "Linha de crédito", t: "select", op: (K.linhas || []).map((l) => [l.id, l.nome]) },
    { k: "valor_solicitado", l: "Valor solicitado (R$)", t: "number" },
    { k: "data_proposta", l: "Data da proposta", t: "date" },
    { k: "objetivo", l: "Objetivo do crédito", t: "textarea", full: true },
    { k: "orcamentos", l: "Orçamentos", t: "textarea", ph: "Fornecedor, valor, validade" },
    { k: "fornecedores", l: "Fornecedores", t: "textarea" },
    { k: "documentacao", l: "Documentação entregue", t: "textarea" },
    { k: "pendencias", l: "Pendências", t: "textarea", dica: "Deixe vazio quando não houver." },
    { k: "status", l: "Situação da análise", t: "select", semVazio: true, op: Object.entries(SITUACAO_PROPOSTA).filter(([k]) => k !== "excluido").map(([k, s]) => [k, s]) },
    { k: "data_encaminhamento", l: "Data de encaminhamento", t: "date" },
    ...(v.status === "concedido" ? [{ k: "valor_aprovado", l: "Valor aprovado (R$)", t: "number" }, { k: "data_decisao", l: "Data da aprovação", t: "date" }] : []),
    ...(v.status === "negado" ? [{ k: "motivo_recusa", l: "Motivo da reprovação", full: true }, { k: "data_decisao", l: "Data da decisão", t: "date" }] : []),
    { k: "valor_contratado", l: "Valor contratado (R$)", t: "number" },
    { k: "data_contratacao", l: "Data da contratação", t: "date" },
    { k: "valor_liberado", l: "Valor efetivamente liberado (R$)", t: "number" },
    { k: "data_liberacao", l: "Data da liberação", t: "date" },
    { k: "campanha_id", l: "Campanha de origem", t: "select", op: K.d.campanhas.map((c) => [c.id, c.nome]) },
    { k: "motivo_desistencia", l: "Motivo de desistência (se houver)", t: "select", op: MOTIVOS_PERDA.map((m) => [m, m]) },
    { k: "observacoes", l: "Observações", t: "textarea", full: true },
  ];
  const setCli = (nv) => {
    if (nv.cliente_id !== v.cliente_id) { const c = K.d.clientes.find((x) => x.id === nv.cliente_id); if (c) nv = { ...nv, nome: nv.nome || c.nome, whatsapp: nv.whatsapp || c.whatsapp, linha_id: nv.linha_id || c.linha_id || "" }; }
    setV(nv);
  };
  const salvar = async () => {
    if (!String(v.nome || "").trim()) { setErro("Informe o nome."); return; }
    if ((v.data_liberacao && !v.valor_liberado) || (v.data_contratacao && !v.valor_contratado)) { setErro("Informe o valor junto com a data de contratação/liberação."); return; }
    setSal(true); setErro("");
    const dados = limpar(v, ["valor_solicitado", "valor_aprovado", "valor_contratado", "valor_liberado"]);
    for (const k of ["numero", "importado_em", "etapa_fomentonet", "etapa_desde", "codigo_contrato", "linha_fomentonet", "municipio"]) if (!proposta) delete dados[k];
    if (dados.status === "concedido" && dados.valor_aprovado != null) dados.valor_concedido = dados.valor_aprovado;
    if (!proposta && cli?.cpf_cnpj) { const d = soDigitos(cli.cpf_cnpj); if (d.length === 11) dados.cpf = d; else if (d.length === 14) dados.cnpj = d; }
    try {
      if (!supabaseConfigurado) { K.setPropostas((l) => [{ ...dados, id: `demo-${Date.now()}`, criado_em: new Date().toISOString() }, ...(l || [])]); onFechar(true); return; }
      const q = proposta ? supabase.from("fomento_propostas").update(dados).eq("id", proposta.id).select().single() : supabase.from("fomento_propostas").insert(dados).select().single();
      const { data, error } = await q;
      if (error) throw error;
      K.setPropostas((l) => (proposta ? (l || []).map((p) => (p.id === data.id ? data : p)) : [data, ...(l || [])]));
      if (data.cliente_id) await K.recarregarCliente(data.cliente_id);
      K.avisar(proposta ? "Proposta atualizada." : `Proposta ${data.numero || ""} criada.`);
      onFechar(true);
    } catch (e) { setErro(msgErro(e)); } finally { setSal(false); }
  };
  return (
    <Modal aberto onFechar={() => onFechar()} titulo={proposta ? `Proposta ${proposta.numero || ""}` : "Nova proposta"} largura="max-w-3xl">
      <div className="mb-3"><Aviso>Propostas ficam na mesma base do painel do Fomento (não há cadastro duplicado). A aprovação depende sempre da análise de crédito da Fomento Paraná.</Aviso></div>
      <Campos campos={campos} valores={v} set={setCli} />
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar} disabled={sal}>{sal ? "Salvando..." : "Salvar proposta"}</Btn></div>
    </Modal>
  );
}
