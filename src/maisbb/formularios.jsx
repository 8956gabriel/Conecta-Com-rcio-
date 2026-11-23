import React, { useMemo, useState } from "react";
import { Save, Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Modal, Campos, Btn, Aviso, C } from "../central/ui.jsx";
import { CATEGORIAS_ATENDIMENTO, RESULTADOS, OPORTUNIDADE, ORIGENS, TIPOS_PROSPECCAO, CATEGORIAS_LOCAL } from "./conteudo.js";
import { listaPublicos, msgErro, zap, soDigitos, hojeISO } from "./base.js";

export function limpar(v, numeros = []) {
  const o = {};
  for (const [k, x] of Object.entries(v)) {
    if (["id", "criado_em", "atualizado_em", "cpf_digitos", "zap_digitos", "numero"].includes(k) || k.startsWith("_")) continue;
    o[k] = x === "" ? null : numeros.includes(k) && x != null ? Number(x) : x;
  }
  return o;
}
const opts = (o) => Object.entries(o);
const pubOps = (K) => listaPublicos(K.d).map((p) => [p.nome, p.nome]);
const usuOps = (K) => K.d.usuarios.filter((u) => u.ativo).map((u) => [u.id, u.nome]);

function FormModal({ titulo, campos, inicial, onSalvar, onExcluir, onFechar, aviso, largura }) {
  const [v, setV] = useState(inicial);
  const [erro, setErro] = useState(""); const [sal, setSal] = useState(false);
  const ok = async () => {
    const falta = campos.find((c) => c.req && (v[c.k] == null || String(v[c.k]).trim() === ""));
    if (falta) { setErro(`Preencha: ${falta.l}`); return; }
    setSal(true); setErro("");
    try { await onSalvar(v); onFechar(true); } catch (e) { setErro(msgErro(e)); } finally { setSal(false); }
  };
  return (
    <Modal aberto onFechar={() => onFechar()} titulo={titulo} largura={largura}>
      {aviso && <div className="mb-3">{typeof aviso === "function" ? aviso(v, setV) : aviso}</div>}
      <Campos campos={typeof campos === "function" ? campos(v) : campos} valores={v} set={setV} />
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="flex justify-between gap-2 mt-4">
        {onExcluir ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (!window.confirm("Excluir este registro?")) return; try { await onExcluir(); onFechar(true); } catch (e) { setErro(msgErro(e)); } }}>Excluir</Btn> : <span />}
        <Btn icon={Save} onClick={ok} disabled={sal}>{sal ? "Salvando..." : "Salvar"}</Btn>
      </div>
    </Modal>
  );
}
export { FormModal };

// ------------------------------------------------------------------ CLIENTE (CRM)
export function ModalCliente({ K, cliente, inicial, onFechar }) {
  const novo = !cliente?.id;
  const [verCpf, setVerCpf] = useState(false);
  const base = cliente?.id ? cliente : { oportunidade: "nova", origem: "balcao", responsavel: K.eu?.id, consentimento: false, ...(inicial || {}) };
  const campos = [
    { k: "nome", l: "Nome", req: true }, { k: "whatsapp", l: "WhatsApp", t: "tel" }, { k: "telefone", l: "Telefone", t: "tel" }, { k: "email", l: "E-mail", t: "email" },
    { k: "cpf", l: "CPF (somente quando necessário)", t: novo || verCpf ? "text" : "password", dica: "Não cadastre CPF sem necessidade. Nunca registre senhas, tokens ou dados de cartão." },
    { k: "endereco", l: "Endereço" }, { k: "categoria", l: "Categoria (público)", t: "select", op: pubOps(K) },
    { k: "origem", l: "Origem do contato", t: "select", op: opts(ORIGENS) }, { k: "responsavel", l: "Responsável", t: "select", op: usuOps(K) },
    { k: "oportunidade", l: "Classificação da oportunidade", t: "select", semVazio: true, op: opts(OPORTUNIDADE) },
    { k: "proximo_contato", l: "Próximo contato", t: "date" },
    { k: "interesses", l: "Interesses (serviços)", t: "multi", full: true, op: K.d.servicos.filter((s) => s.ativo).map((s) => [s.nome, s.nome]) },
    { k: "observacoes", l: "Observações", t: "textarea", full: true },
    { k: "consentimento", l: "LGPD", t: "checkbox", texto: "Cliente autorizou contato para relacionamento e divulgação", full: true },
    { k: "nao_contatar", l: "Não contatar", t: "checkbox", texto: "Cliente pediu para não ser contatado (respeitar)", full: true },
  ];
  const aviso = (v, setV) => {
    if (!novo) return <button className="font-body text-xs font-bold flex items-center gap-1" style={{ color: C.blueHex }} onClick={() => { if (!verCpf) K.registrarAcesso?.("viu_cpf", cliente.id); setVerCpf(!verCpf); }}>{verCpf ? <EyeOff size={12} /> : <Eye size={12} />} {verCpf ? "Ocultar CPF" : "Mostrar CPF (acesso registrado)"}</button>;
    const z = zap(v.whatsapp || v.telefone), c = soDigitos(v.cpf);
    const dup = K.d.clientes.find((x) => (z && z.length >= 10 && x.zap_digitos === z) || (c && x.cpf_digitos === c));
    return dup ? <Aviso tipo="amarelo"><AlertTriangle size={12} className="inline mr-1" />Possível duplicidade: <b>{dup.nome}</b> já está cadastrado(a). <button className="underline font-bold" onClick={() => { onFechar(); setTimeout(() => K.abrir("cliente", dup), 50); }}>Abrir cadastro existente</button></Aviso> : null;
  };
  return <FormModal titulo={novo ? "Cadastrar cliente" : cliente.nome} campos={campos} inicial={base} aviso={aviso} largura="max-w-3xl" onFechar={onFechar}
    onSalvar={async (v) => { await K.salvar("clientes", cliente?.id, limpar(v)); K.avisar(novo ? "Cliente cadastrado." : "Cliente atualizado."); }}
    onExcluir={!novo && K.admin ? () => K.apagar("clientes", cliente.id) : null} />;
}

// ------------------------------------------------------------------ ATENDIMENTO
export function ModalAtendimento({ K, atendimento, inicial, onFechar }) {
  const novo = !atendimento?.id;
  const agora = new Date();
  const base = atendimento?.id ? atendimento : { data: hojeISO(), hora: `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`, atendente: K.eu?.id, categoria: "orientacao", resultado: "concluido", status: "fechado", ...(inicial || {}) };
  const campos = (v) => [
    { k: "data", l: "Data", t: "date", req: true }, { k: "hora", l: "Horário", t: "time" },
    { k: "atendente", l: "Atendente", t: "select", op: usuOps(K) },
    { k: "cliente_id", l: "Cliente (cadastro)", t: "select", vazio: "(não cadastrado)", op: K.d.clientes.map((c) => [c.id, c.nome]) },
    ...(!v.cliente_id ? [{ k: "cliente_nome", l: "Nome do cliente (opcional)" }] : []),
    { k: "categoria", l: "Categoria", t: "select", semVazio: true, op: opts(CATEGORIAS_ATENDIMENTO) },
    { k: "servico_id", l: "Serviço procurado (biblioteca)", t: "select", op: K.d.servicos.filter((s) => s.ativo).map((s) => [s.id, s.nome]) },
    ...(!v.servico_id ? [{ k: "servico", l: "Serviço procurado (texto)" }] : []),
    { k: "descricao", l: "Descrição", t: "textarea", full: true, ph: "Não registre senhas, tokens, códigos nem dados de cartão." },
    { k: "resultado", l: "Resultado", t: "select", semVazio: true, op: opts(RESULTADOS) },
    { k: "status", l: "Status", t: "select", semVazio: true, op: [["fechado", "Fechado"], ["aberto", "Aberto (pendente)"]] },
    { k: "observacoes", l: "Observações", t: "textarea", full: true },
    ...(novo ? [{ k: "_retorno", l: "Agendar retorno", t: "date", dica: "Cria uma tarefa de retorno na agenda" }] : []),
  ];
  return <FormModal titulo={novo ? "+ Novo atendimento" : `Atendimento nº ${atendimento.numero}`} campos={campos} inicial={base} largura="max-w-3xl" onFechar={onFechar}
    onSalvar={async (v) => {
      const dados = limpar(v);
      if (dados.servico_id) dados.servico = K.d.servicos.find((s) => s.id === dados.servico_id)?.nome || dados.servico;
      if (dados.cliente_id) dados.cliente_nome = K.d.clientes.find((c) => c.id === dados.cliente_id)?.nome;
      if (v.resultado === "aguardando") dados.status = "aberto";
      const r = await K.salvar("atendimentos", atendimento?.id, dados);
      if (v._retorno) await K.salvar("tarefas", null, { titulo: `Retorno: ${dados.cliente_nome || "cliente"} (atendimento nº ${r.numero})`, tipo: "retorno", prioridade: "alta", data: v._retorno, cliente_id: dados.cliente_id || null, responsavel: K.eu?.id || null });
      if (dados.cliente_id && novo) { const c = K.d.clientes.find((x) => x.id === dados.cliente_id); if (c && c.oportunidade === "nova") await K.salvar("clientes", c.id, { oportunidade: "em_atendimento" }); }
      K.avisar(novo ? `Atendimento nº ${r.numero} registrado.` : "Atendimento atualizado.");
    }}
    onExcluir={!novo && K.admin ? () => K.apagar("atendimentos", atendimento.id) : null} />;
}

// ------------------------------------------------------------------ PROSPECÇÃO
export function ModalProspeccao({ K, item, inicial, onFechar }) {
  const novo = !item?.id;
  const base = item?.id ? item : { data: hojeISO(), tipo: "presencial", responsavel: K.eu?.id, status: "planejada", contatos: 0, interessados: 0, ...(inicial || {}) };
  const campos = [
    { k: "data", l: "Data", t: "date", req: true }, { k: "publico", l: "Público", t: "select", op: pubOps(K) },
    { k: "objetivo", l: "Objetivo", full: true }, { k: "servico", l: "Serviço a divulgar", t: "select", op: K.d.servicos.filter((s) => s.ativo).map((s) => [s.nome, s.nome]) },
    { k: "local", l: "Local ou segmento" }, { k: "local_id", l: "Estabelecimento (Radar de Ivatuba)", t: "select", op: K.d.locais.map((l) => [l.id, l.nome]) },
    { k: "tipo", l: "Tipo de abordagem", t: "select", semVazio: true, op: opts(TIPOS_PROSPECCAO) }, { k: "responsavel", l: "Responsável", t: "select", op: usuOps(K) },
    { k: "meta", l: "Meta de contatos", t: "number" }, { k: "contatos", l: "Contatos realizados", t: "number" }, { k: "interessados", l: "Interessados", t: "number" },
    { k: "cliente_id", l: "Cliente (se for uma pessoa)", t: "select", op: K.d.clientes.map((c) => [c.id, c.nome]) },
    { k: "campanha_id", l: "Campanha", t: "select", op: K.d.campanhas.map((c) => [c.id, c.nome]) },
    { k: "status", l: "Situação", t: "select", semVazio: true, op: [["planejada", "Planejada"], ["realizada", "Realizada"], ["retorno", "Aguardando retorno"], ["encerrada", "Encerrada"]] },
    { k: "resultado", l: "Resultado", t: "textarea", full: true }, { k: "proximo_passo", l: "Próximo passo", full: true }, { k: "proximo_contato", l: "Data do retorno", t: "date", dica: "Cria tarefa de retorno" },
  ];
  return <FormModal titulo={novo ? "Registrar prospecção" : "Prospecção"} campos={campos} inicial={base} largura="max-w-3xl" onFechar={onFechar}
    onSalvar={async (v) => {
      await K.salvar("prospeccoes", item?.id, limpar(v, ["meta", "contatos", "interessados"]));
      if (v.proximo_contato && v.proximo_contato !== item?.proximo_contato) await K.salvar("tarefas", null, { titulo: `Retorno da prospecção: ${v.publico || v.local || ""}`.trim(), tipo: "retorno", data: v.proximo_contato, cliente_id: v.cliente_id || null, local_id: v.local_id || null, responsavel: v.responsavel || null });
      K.avisar("Prospecção registrada.");
    }}
    onExcluir={!novo ? () => K.apagar("prospeccoes", item.id) : null} />;
}

// ------------------------------------------------------------------ TAREFA
export function ModalTarefa({ K, item, inicial, onFechar }) {
  const novo = !item?.id;
  const base = item?.id ? item : { data: hojeISO(), tipo: "pendencia", prioridade: "media", responsavel: K.eu?.id, ...(inicial || {}) };
  const campos = [
    { k: "titulo", l: "Tarefa", req: true, full: true },
    { k: "tipo", l: "Tipo", t: "select", semVazio: true, op: [["retorno", "Retorno"], ["visita", "Visita"], ["prospeccao", "Prospecção"], ["pendencia", "Pendência"], ["lembrete", "Lembrete"]] },
    { k: "prioridade", l: "Prioridade", t: "select", semVazio: true, op: [["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]] },
    { k: "data", l: "Data", t: "date", req: true }, { k: "hora", l: "Hora", t: "time" },
    { k: "cliente_id", l: "Cliente", t: "select", op: K.d.clientes.map((c) => [c.id, c.nome]) },
    { k: "local_id", l: "Local (Radar de Ivatuba)", t: "select", op: K.d.locais.map((l) => [l.id, l.nome]) },
    { k: "responsavel", l: "Responsável", t: "select", op: usuOps(K) },
    { k: "observacao", l: "Observação", t: "textarea", full: true },
  ];
  return <FormModal titulo={novo ? "Nova tarefa" : "Tarefa"} campos={campos} inicial={base} onFechar={onFechar}
    onSalvar={async (v) => { await K.salvar("tarefas", item?.id, limpar(v)); K.avisar("Tarefa salva."); }}
    onExcluir={!novo ? () => K.apagar("tarefas", item.id) : null} />;
}

// ------------------------------------------------------------------ LOCAL (Radar de Ivatuba)
export function ModalLocal({ K, item, inicial, onFechar }) {
  const novo = !item?.id;
  const base = item?.id ? item : { categoria: CATEGORIAS_LOCAL[0], status: "a_visitar", ...(inicial || {}) };
  const campos = [
    { k: "nome", l: "Nome do estabelecimento ou organização", req: true, full: true }, { k: "categoria", l: "Categoria", t: "select", semVazio: true, op: CATEGORIAS_LOCAL.map((c) => [c, c]) },
    { k: "endereco", l: "Endereço comercial" }, { k: "contato", l: "Responsável pelo contato", dica: "Só com autorização da pessoa." }, { k: "telefone_comercial", l: "Telefone comercial", t: "tel" },
    { k: "data_visita", l: "Data da visita", t: "date" }, { k: "status", l: "Situação", t: "select", semVazio: true, op: [["a_visitar", "A visitar"], ["visitado", "Visitado"], ["parceiro", "Parceiro"], ["sem_interesse", "Sem interesse"]] },
    { k: "objetivo", l: "Objetivo", full: true }, { k: "resultado", l: "Resultado", t: "textarea", full: true },
    { k: "proxima_acao", l: "Próxima ação" }, { k: "proxima_data", l: "Data da próxima ação", t: "date", dica: "Cria tarefa de visita" },
  ];
  return <FormModal titulo={novo ? "Cadastrar estabelecimento/organização" : item.nome} campos={campos} inicial={base} onFechar={onFechar}
    onSalvar={async (v) => {
      const r = await K.salvar("locais", item?.id, limpar(v));
      if (v.proxima_data && v.proxima_data !== item?.proxima_data) await K.salvar("tarefas", null, { titulo: `${v.proxima_acao || "Visita"}: ${v.nome}`, tipo: "visita", data: v.proxima_data, local_id: r.id, responsavel: K.eu?.id || null });
      K.avisar("Salvo no Radar de Ivatuba.");
    }}
    onExcluir={!novo ? () => K.apagar("locais", item.id) : null} />;
}
