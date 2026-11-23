// =============================================================================
// 📄 GERADOR DE FORMULÁRIOS EM PDF
// PRIVACIDADE: os dados digitados ficam SOMENTE na memória desta página
// (estado do React). Nada é salvo no banco, no navegador (localStorage /
// sessionStorage), em logs ou enviado a servidores/IA. O PDF é montado aqui
// mesmo, no navegador, e baixado direto no aparelho. Ao sair ou atualizar a
// página, tudo some.
// =============================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Eraser, ShieldCheck, Plus, Save, Trash2, ArrowUp, ArrowDown, FileText, Copy, PenLine } from "lucide-react";
import { C, Titulo, Btn, Card, Aviso, Chip, Vazio, Modal, Campos, Campo, inp, inpS, msgErro } from "./base.jsx";
import { MODELOS_SUGERIDOS, TIPOS_CAMPO } from "./aneps-conteudo.js";
import { carregarModelos, gravar, excluir, faltaBanco } from "./ampliacao-dados.js";
import { SEM_BANCO } from "./aneps.jsx";

const dig = (s) => String(s || "").replace(/\D/g, "");
const MASCARA = {
  cpf: (v) => dig(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  telefone: (v) => { const d = dig(v).slice(0, 11); return d.length <= 10 ? d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2") : d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2"); },
  moeda: (v) => { const d = dig(v).slice(0, 13); if (!d) return ""; return (Number(d) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); },
};
export function cpfValido(v) {
  const d = dig(v); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
const brData = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

// ============================================================================= PÁGINA DO AGENTE
export function GeradorFormularios({ K }) {
  const [modelos, setModelos] = useState(null);
  const [erro, setErro] = useState(null);
  const [selId, setSelId] = useState("");
  const [v, setV] = useState({});            // ← dados do cliente: só aqui, na memória
  const [gerando, setGerando] = useState(false);
  const [gerado, setGerado] = useState(false);
  const [chave, setChave] = useState(0);     // força recriar os campos (limpa assinaturas)

  useEffect(() => {
    carregarModelos().then((l) => setModelos(l.filter((m) => m.ativo))).catch((e) => { setErro(e); setModelos([]); });
  }, []);                                    // ao sair da página o estado é descartado junto com o componente
  const lista = useMemo(() => (modelos && modelos.length ? modelos : MODELOS_SUGERIDOS.map((m, i) => ({ ...m, id: `sug-${i}` }))), [modelos]);
  const modelo = lista.find((m) => m.id === selId) || lista[0];
  const limpar = () => { setV({}); setGerado(false); setChave((x) => x + 1); };
  const trocar = (id) => { if (Object.keys(v).length && !confirm("Trocar de modelo apaga o que foi preenchido. Continuar?")) return; setSelId(id); limpar(); };

  const gerar = async () => {
    const falta = (modelo.campos || []).filter((c) => c.req && c.t !== "secao" && !String(v[c.k] ?? "").trim());
    if (falta.length) return K.avisar(`Preencha: ${falta.map((c) => c.l).join(", ")}`, "erro");
    const cpfRuim = (modelo.campos || []).find((c) => c.t === "cpf" && v[c.k] && !cpfValido(v[c.k]));
    if (cpfRuim && !confirm(`O ${cpfRuim.l} informado parece inválido. Gerar o PDF mesmo assim?`)) return;
    setGerando(true);
    try { await gerarPDF(modelo, v, K.D?.config); setGerado(true); }
    catch { K.avisar("Não foi possível gerar o PDF. Tente novamente.", "erro"); }   // a mensagem não inclui dados do formulário
    finally { setGerando(false); }
  };

  if (!modelos) return <p className="font-body text-sm">Carregando modelos...</p>;
  return (
    <div>
      <Titulo eyebrow="Documentos" title="📄 Gerador de Formulários" sub="Preencha os dados do cliente e gere um PDF A4 pronto para imprimir." />
      <div className="mb-4"><Aviso tipo="ok"><ShieldCheck size={13} className="inline mr-1" /><b>Privacidade:</b> nada do que você digitar aqui é salvo no sistema, enviado a servidores ou visto por outros agentes. O PDF é gerado no seu próprio aparelho. Ao sair ou atualizar a página, os dados são apagados.</Aviso></div>
      {erro && !faltaBanco(erro) && <div className="mb-4"><Aviso tipo="erro">{msgErro(erro)}</Aviso></div>}
      {!modelos.length && <div className="mb-4"><Aviso tipo="amarelo">Usando os modelos sugeridos do sistema. {K.admin ? "Crie os modelos do correspondente no Painel do administrador › Modelos de formulário." : "O administrador pode cadastrar modelos próprios."}</Aviso></div>}
      <div className="flex gap-1.5 flex-wrap mb-4">{lista.map((m) => <Chip key={m.id} ativo={m.id === modelo.id} onClick={() => m.id !== modelo.id && trocar(m.id)}><FileText size={12} /> {m.nome}</Chip>)}</div>
      <Card>
        <p className="font-display font-bold" style={{ color: C.navy }}>{modelo.nome}</p>
        {modelo.descricao && <p className="font-body text-xs mb-3" style={{ color: C.muted }}>{modelo.descricao}</p>}
        <form key={chave} autoComplete="off" onSubmit={(e) => e.preventDefault()} className="grid sm:grid-cols-2 gap-3 mt-2">
          {(modelo.campos || []).map((c) => <CampoForm key={c.k} c={c} valor={v[c.k]} set={(x) => { setGerado(false); setV((o) => ({ ...o, [c.k]: x })); }} />)}
        </form>
        <div className="flex flex-wrap gap-2 justify-end mt-5 pt-4 border-t" style={{ borderColor: C.line }}>
          <Btn tipo="claro" icon={Eraser} onClick={() => { if (!Object.keys(v).length || confirm("Apagar todos os campos?")) limpar(); }}>LIMPAR FORMULÁRIO</Btn>
          <Btn tipo="amarelo" big icon={FileDown} disabled={gerando} onClick={gerar}>{gerando ? "Gerando..." : "GERAR E BAIXAR PDF"}</Btn>
        </div>
        {gerado && <div className="mt-3 flex items-center gap-3 flex-wrap rounded-xl px-3.5 py-2.5" style={{ background: C.greenTint }}><p className="font-body text-sm flex-1" style={{ color: C.green }}>PDF baixado no seu aparelho. Recomendado: limpe o formulário antes de atender o próximo cliente.</p><Btn small tipo="verde" icon={Eraser} onClick={limpar}>Limpar agora</Btn></div>}
      </Card>
    </div>
  );
}

function CampoForm({ c, valor, set }) {
  const full = c.largura === "inteira" || ["textarea", "endereco", "assinatura", "secao"].includes(c.t);
  const props = { autoComplete: "off", autoCorrect: "off", spellCheck: false, name: `f-${Math.random().toString(36).slice(2)}`, className: inp, style: inpS, value: valor ?? "" };
  if (c.t === "secao") return <p className="sm:col-span-2 font-display font-bold text-sm mt-2 pb-1 border-b" style={{ color: C.navy, borderColor: C.yellow }}>{c.l}</p>;
  let el;
  if (c.t === "textarea") el = <textarea {...props} rows={3} onChange={(e) => set(e.target.value)} />;
  else if (c.t === "endereco") el = <textarea {...props} rows={2} onChange={(e) => set(e.target.value)} placeholder="Rua, número, bairro, cidade-UF, CEP" />;
  else if (c.t === "data") el = <input {...props} type="date" onChange={(e) => set(e.target.value)} />;
  else if (c.t === "opcoes") el = <select {...props} onChange={(e) => set(e.target.value)}><option value="">—</option>{String(c.opcoes || "").split(";").map((o) => o.trim()).filter(Boolean).map((o) => <option key={o}>{o}</option>)}</select>;
  else if (c.t === "assinatura") el = <Assinatura valor={valor} set={set} />;
  else if (MASCARA[c.t]) el = <input {...props} inputMode="numeric" onChange={(e) => set(MASCARA[c.t](e.target.value))} placeholder={c.t === "cpf" ? "000.000.000-00" : c.t === "moeda" ? "R$ 0,00" : "(44) 99999-9999"} />;
  else el = <input {...props} type={c.t === "email" ? "email" : c.t === "numero" ? "number" : "text"} inputMode={c.t === "rg" ? "text" : undefined} onChange={(e) => set(e.target.value)} />;
  const aviso = c.t === "cpf" && dig(valor).length === 11 && !cpfValido(valor) ? "CPF parece inválido" : null;
  return <Campo label={`${c.l}${c.req ? " *" : ""}`} className={full ? "sm:col-span-2" : ""} dica={aviso}>{el}</Campo>;
}

// Assinatura desenhada na tela (fica só na memória; vai para o PDF como imagem)
function Assinatura({ valor, set }) {
  const ref = useRef(null); const desenhando = useRef(false); const [aberta, setAberta] = useState(false);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [(p.clientX - r.left) * (ref.current.width / r.width), (p.clientY - r.top) * (ref.current.height / r.height)]; };
  const ini = (e) => { e.preventDefault(); desenhando.current = true; const ctx = ref.current.getContext("2d"); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.strokeStyle = "#0B1F44"; ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const mov = (e) => { if (!desenhando.current) return; e.preventDefault(); const ctx = ref.current.getContext("2d"); ctx.lineTo(...pos(e)); ctx.stroke(); };
  const fim = () => { desenhando.current = false; };
  if (!aberta && !valor) return <div className="flex gap-2 items-center flex-wrap"><Btn small tipo="fantasma" icon={PenLine} onClick={() => setAberta(true)}>Assinar na tela</Btn><span className="font-body text-[11px]" style={{ color: C.soft }}>ou deixe em branco para assinar no papel</span></div>;
  if (valor) return <div className="flex items-center gap-3"><img src={valor} alt="Assinatura" className="h-16 border rounded-lg bg-white" style={{ borderColor: C.line }} /><Btn small tipo="perigo" onClick={() => { set(""); setAberta(false); }}>Refazer</Btn></div>;
  return (
    <div>
      <canvas ref={ref} width={600} height={160} className="w-full h-32 rounded-xl border bg-white touch-none" style={{ borderColor: C.line }} onMouseDown={ini} onMouseMove={mov} onMouseUp={fim} onMouseLeave={fim} onTouchStart={ini} onTouchMove={mov} onTouchEnd={fim} />
      <div className="flex gap-2 mt-1.5"><Btn small tipo="claro" onClick={() => ref.current.getContext("2d").clearRect(0, 0, 600, 160)}>Limpar</Btn><Btn small tipo="verde" onClick={() => set(ref.current.toDataURL("image/png"))}>Usar assinatura</Btn><Btn small tipo="claro" onClick={() => setAberta(false)}>Cancelar</Btn></div>
    </div>
  );
}

// ----------------------------------------------------------------- PDF (gerado 100% no navegador)
async function imagemDataURL(url) {
  try { const r = await fetch(url, { mode: "cors", credentials: "omit" }); const b = await r.blob(); return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(b); }); } catch { return null; }
}
export async function gerarPDF(modelo, v, cfg = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210, H = 297, M = 14, G = 6, colW = (W - 2 * M - G) / 2;
  const logo = cfg?.logo_url ? await imagemDataURL(cfg.logo_url) : null;   // só baixa a logo; nenhum dado do cliente sai daqui
  const cabecalho = () => {
    doc.setFillColor(11, 31, 68); doc.rect(0, 0, W, 26, "F"); doc.setFillColor(249, 209, 11); doc.rect(0, 26, W, 1.6, "F");
    let x = M; if (logo) { try { doc.setFillColor(255, 255, 255); doc.roundedRect(M, 4, 18, 18, 2, 2, "F"); doc.addImage(logo, M + 1, 5, 16, 16); x = M + 22; } catch { /* sem logo */ } }
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(modelo.nome.toUpperCase(), x, 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(249, 209, 11);
    doc.text(`${cfg?.nome_correspondente || "Mais BB Correspondente Autorizado"} · ${cfg?.cidade || "Ivatuba-PR"}`, x, 19);
  };
  cabecalho();
  let y = 36;
  const novaPagina = (alt) => { if (y + alt > H - 22) { doc.addPage(); cabecalho(); y = 36; } };
  const valorTexto = (c) => { const x = v[c.k]; if (x == null || x === "") return ""; return c.t === "data" ? brData(x) : String(x); };
  const caixa = (c, x0, w) => {
    const txt = valorTexto(c);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const linhas = doc.splitTextToSize(txt || " ", w - 5);
    const alt = Math.max(c.t === "textarea" ? 18 : c.t === "endereco" ? 13 : 11, 7 + linhas.length * 4.6);
    const obj = { alt, desenhar: (yy) => {
      doc.setDrawColor(210, 217, 228); doc.setLineWidth(0.3); doc.roundedRect(x0, yy, w, obj.alt, 1.5, 1.5, "S");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(91, 107, 128); doc.text(c.l.toUpperCase(), x0 + 2.5, yy + 4);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(16, 26, 43); doc.text(linhas, x0 + 2.5, yy + 9);
    } };
    return obj;
  };
  const campos = modelo.campos || [];
  const assinaturas = campos.filter((c) => c.t === "assinatura");
  let pendente = null;   // meia coluna aguardando par
  const fecharLinha = () => { if (pendente) { novaPagina(pendente.alt); pendente.desenhar(y); y += pendente.alt + 3; pendente = null; } };
  for (const c of campos) {
    if (c.t === "assinatura") continue;
    if (c.t === "secao") { fecharLinha(); novaPagina(14); y += 2; doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(11, 31, 68); doc.text(c.l.toUpperCase(), M, y + 4); doc.setDrawColor(249, 209, 11); doc.setLineWidth(0.8); doc.line(M, y + 6, W - M, y + 6); y += 10; continue; }
    const inteira = c.largura === "inteira" || ["textarea", "endereco"].includes(c.t);
    if (inteira) { fecharLinha(); const b = caixa(c, M, W - 2 * M); novaPagina(b.alt); b.desenhar(y); y += b.alt + 3; continue; }
    if (!pendente) { pendente = caixa(c, M, colW); continue; }
    const b = caixa(c, M + colW + G, colW); const alt = Math.max(pendente.alt, b.alt);
    novaPagina(alt); pendente.alt = alt; b.alt = alt;
    pendente.desenhar(y); b.desenhar(y); y += alt + 3; pendente = null;
  }
  fecharLinha();
  // assinaturas: duas por linha, com imagem (se assinada na tela) ou linha em branco
  if (assinaturas.length) {
    y += 6;
    for (let i = 0; i < assinaturas.length; i += 2) {
      novaPagina(34);
      assinaturas.slice(i, i + 2).forEach((c, j) => {
        const x0 = M + j * (colW + G);
        if (v[c.k]) { try { doc.addImage(v[c.k], "PNG", x0 + 8, y, colW - 16, 18); } catch { /* */ } }
        doc.setDrawColor(16, 26, 43); doc.setLineWidth(0.4); doc.line(x0 + 4, y + 20, x0 + colW - 4, y + 20);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(91, 107, 128); doc.text(c.l, x0 + colW / 2, y + 25, { align: "center" });
      });
      y += 32;
    }
  }
  // local e data
  novaPagina(12); doc.setFontSize(9.5); doc.setTextColor(16, 26, 43); doc.text(`${cfg?.cidade || "Ivatuba-PR"}, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.`, M, y + 6);
  // rodapé em todas as páginas
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); doc.setDrawColor(225, 230, 238); doc.setLineWidth(0.3); doc.line(M, H - 16, W - M, H - 16);
    doc.setFontSize(7); doc.setTextColor(138, 152, 171);
    if (modelo.rodape) doc.text(doc.splitTextToSize(modelo.rodape, W - 2 * M - 22), M, H - 12);
    doc.text(`Página ${p} de ${n}`, W - M, H - 12, { align: "right" });
  }
  const nome = `${modelo.nome}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  doc.save(`${nome || "formulario"}-${new Date().toISOString().slice(0, 10)}.pdf`);   // nome do arquivo sem dados do cliente
}

// ============================================================================= ADMINISTRAÇÃO DOS MODELOS
export function ModelosFormAdm({ K }) {
  const [lista, setLista] = useState(null); const [erro, setErro] = useState(null); const [ed, setEd] = useState(null);
  const carregar = () => carregarModelos().then((l) => { setLista(l); setErro(null); }).catch((e) => { setErro(e); setLista([]); });
  useEffect(() => { carregar(); }, []);
  const salvar = async () => {
    if (!ed.nome) return K.avisar("Informe o nome do modelo.", "erro");
    const campos = (ed.campos || []).filter((c) => c.l?.trim()).map((c, i) => ({ ...c, l: c.l.trim(), k: c.k || `c${Date.now().toString(36)}${i}` }));
    if (!campos.length) return K.avisar("Adicione ao menos um campo.", "erro");
    try { const { id, criado_em, atualizado_em, ...d } = ed; await gravar("modelos", id, { ...d, campos, ordem: Number(d.ordem) || 1 }); K.avisar("Modelo salvo."); setEd(null); carregar(); } catch (e) { K.avisar(faltaBanco(e) ? SEM_BANCO : msgErro(e), "erro"); }
  };
  if (!lista) return <p className="font-body text-sm">Carregando...</p>;
  return (
    <div>
      <Titulo eyebrow="Documentos" title="Modelos de formulário" sub="Crie os modelos que os agentes usam no Gerador de Formulários. Só a estrutura (nomes e tipos dos campos) fica salva — os dados preenchidos nunca são gravados." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => setEd({ nome: "", campos: [{ k: "nome", l: "Nome completo", t: "texto", req: true, largura: "inteira" }], ativo: true, ordem: (lista.length || 0) + 1 })}>Novo modelo</Btn>} />
      {erro && <div className="mb-4"><Aviso tipo={faltaBanco(erro) ? "amarelo" : "erro"}>{faltaBanco(erro) ? SEM_BANCO : msgErro(erro)}</Aviso></div>}
      <Card className="mb-4"><p className="font-body text-sm font-bold mb-2" style={{ color: C.navy }}>Começar de um modelo sugerido</p><div className="flex gap-2 flex-wrap">{MODELOS_SUGERIDOS.map((m) => <Btn key={m.nome} small tipo="fantasma" icon={Copy} onClick={() => setEd({ ...JSON.parse(JSON.stringify(m)), ativo: true, ordem: (lista.length || 0) + 1 })}>{m.nome}</Btn>)}</div></Card>
      {lista.length ? <div className="space-y-2">{lista.map((m) => <Card key={m.id} className="!p-3.5" onClick={() => setEd(JSON.parse(JSON.stringify(m)))}><div className="flex justify-between gap-2"><div><p className="font-body text-sm font-bold">{m.nome}</p><p className="font-body text-xs" style={{ color: C.muted }}>{(m.campos || []).filter((c) => c.t !== "secao").length} campo(s){m.descricao ? ` · ${m.descricao}` : ""}</p></div>{!m.ativo && <Chip cor={C.soft}>inativo</Chip>}</div></Card>)}</div> : <Vazio>Nenhum modelo cadastrado. Enquanto isso, os agentes veem os modelos sugeridos.</Vazio>}
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.id ? ed.nome : "Novo modelo"} largura="max-w-4xl"><EditorModelo ed={ed} setEd={setEd} />
        <div className="flex justify-between mt-4 flex-wrap gap-2">{ed.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (!confirm("Excluir este modelo?")) return; try { await excluir("modelos", ed.id); setEd(null); carregar(); } catch (e) { K.avisar(msgErro(e), "erro"); } }}>Excluir</Btn> : <span />}
          <div className="flex gap-2"><Btn tipo="claro" icon={FileDown} onClick={() => gerarPDF(ed, {}, K.D?.config)}>Prévia em branco</Btn><Btn icon={Save} onClick={salvar}>Salvar</Btn></div></div></Modal>}
    </div>
  );
}

function EditorModelo({ ed, setEd }) {
  const campos = ed.campos || [];
  const setC = (i, d) => setEd({ ...ed, campos: campos.map((c, j) => (j === i ? { ...c, ...d } : c)) });
  const mover = (i, d) => { const l = [...campos]; const [x] = l.splice(i, 1); l.splice(i + d, 0, x); setEd({ ...ed, campos: l }); };
  return (
    <div>
      <Campos v={ed} set={setEd} campos={[{ k: "nome", l: "Nome do modelo", req: true }, { k: "ordem", l: "Ordem", t: "number" }, { k: "descricao", l: "Descrição", full: true }, { k: "rodape", l: "Texto do rodapé do PDF", t: "textarea", rows: 2, full: true }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo (aparece para os agentes)" }]} />
      <p className="font-display font-bold mt-5 mb-2" style={{ color: C.navy }}>Campos</p>
      <div className="space-y-2">{campos.map((c, i) => (
        <div key={i} className="rounded-xl border p-2.5 grid grid-cols-12 gap-2 items-center" style={{ borderColor: C.line, background: c.t === "secao" ? C.yellowTint : "#fff" }}>
          <input value={c.l || ""} onChange={(e) => setC(i, { l: e.target.value })} placeholder="Nome do campo" className={`${inp} col-span-12 sm:col-span-4`} style={inpS} />
          <select value={c.t || "texto"} onChange={(e) => setC(i, { t: e.target.value })} className={`${inp} col-span-6 sm:col-span-3`} style={inpS}>{TIPOS_CAMPO.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>
          {c.t !== "secao" && c.t !== "assinatura" ? <select value={c.largura || "meia"} onChange={(e) => setC(i, { largura: e.target.value })} className={`${inp} col-span-6 sm:col-span-2`} style={inpS}><option value="meia">Meia linha</option><option value="inteira">Linha inteira</option></select> : <span className="col-span-6 sm:col-span-2" />}
          <label className="col-span-4 sm:col-span-1 font-body text-xs flex items-center gap-1">{c.t !== "secao" && <><input type="checkbox" checked={!!c.req} onChange={(e) => setC(i, { req: e.target.checked })} /> Obrig.</>}</label>
          <div className="col-span-8 sm:col-span-2 flex justify-end gap-1">
            <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ background: C.gray }}><ArrowUp size={14} /></button>
            <button type="button" disabled={i === campos.length - 1} onClick={() => mover(i, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ background: C.gray }}><ArrowDown size={14} /></button>
            <button type="button" onClick={() => setEd({ ...ed, campos: campos.filter((_, j) => j !== i) })} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.redTint }}><Trash2 size={14} color={C.red} /></button>
          </div>
          {c.t === "opcoes" && <input value={c.opcoes || ""} onChange={(e) => setC(i, { opcoes: e.target.value })} placeholder="Opções separadas por ponto e vírgula. Ex.: Solteiro(a); Casado(a); Divorciado(a)" className={`${inp} col-span-12`} style={inpS} />}
        </div>))}</div>
      <div className="flex gap-2 mt-3 flex-wrap"><Btn small tipo="fantasma" icon={Plus} onClick={() => setEd({ ...ed, campos: [...campos, { l: "", t: "texto", largura: "meia" }] })}>Campo</Btn><Btn small tipo="fantasma" icon={Plus} onClick={() => setEd({ ...ed, campos: [...campos, { l: "Nova seção", t: "secao" }] })}>Título de seção</Btn><Btn small tipo="fantasma" icon={Plus} onClick={() => setEd({ ...ed, campos: [...campos, { l: "Assinatura", t: "assinatura" }] })}>Assinatura</Btn></div>
    </div>
  );
}
