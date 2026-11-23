// =============================================================================
// 🎁 SORTEIOS MENSAIS DE ATENDIMENTOS + GALERIA DOS SORTEIOS
// Fotos em bucket PRIVADO (links temporários). Só o administrador cadastra,
// edita e exclui; os agentes veem quando o administrador libera a galeria.
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Gift, Images, CalendarCheck, CalendarX, Trophy, Plus, Save, Trash2, Upload, RefreshCw, X, ChevronLeft, ChevronRight, Lock, Users, Camera, Eye } from "lucide-react";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Modal, Campos, Campo, inp, inpS, msgErro } from "./base.jsx";
import { MES_NOME, br } from "./motor.js";
import { carregarSorteios, gravar, excluir, enviarFotoSorteio, apagarArquivoSorteio, definirGaleriaLiberada, lerConfigNova, faltaBanco } from "./ampliacao-dados.js";
import { SEM_BANCO } from "./aneps.jsx";

const anoAtual = () => new Date().getFullYear();

export function SorteiosMensais({ K, modoAdmin }) {
  const [S, setS] = useState(null); const [erro, setErro] = useState(null);
  const [ano, setAno] = useState(anoAtual()); const [mes, setMes] = useState(0);   // 0 = todos
  const [aba, setAba] = useState("painel");
  const [ed, setEd] = useState(null); const [foto, setFoto] = useState(null); const [zoom, setZoom] = useState(null);
  const [liberada, setLiberada] = useState(null);
  const recarregar = async () => { try { setS(await carregarSorteios()); setErro(null); } catch (e) { setErro(e); setS({ sorteios: [], fotos: [], liberada: false }); } };
  useEffect(() => { recarregar(); if (K.admin) lerConfigNova().then((c) => setLiberada(c.galeria_sorteios)).catch(() => {}); }, []);
  if (!S) return <p className="font-body text-sm">Carregando sorteios...</p>;
  const admin = K.admin;

  if (!S.liberada && !admin) return (
    <div><Titulo eyebrow="Incentivo" title="🎁 Sorteios Mensais" />
      {erro && faltaBanco(erro) ? <Aviso tipo="amarelo">{SEM_BANCO}</Aviso> : <Vazio><Lock className="mx-auto mb-2" />A galeria dos sorteios ainda não foi liberada para consulta. O administrador pode liberar no painel.</Vazio>}</div>
  );

  const anos = [...new Set([anoAtual(), ...S.sorteios.map((s) => s.ano), ...S.fotos.map((f) => f.ano)])].sort((a, b) => b - a);
  const doAno = S.sorteios.filter((s) => s.ano === ano);
  const fotosAno = S.fotos.filter((f) => f.ano === ano);
  const mesesFeitos = new Set(doAno.map((s) => s.mes));
  const limiteMes = ano < anoAtual() ? 12 : ano > anoAtual() ? 0 : new Date().getMonth() + 1;
  const pendentes = Array.from({ length: limiteMes }, (_, i) => i + 1).filter((m) => !mesesFeitos.has(m));
  const ganhadores = new Set(doAno.map((s) => (s.ganhador || "").trim().toLowerCase()).filter(Boolean));
  const visS = doAno.filter((s) => !mes || s.mes === mes).sort((a, b) => a.mes - b.mes || String(a.data_sorteio).localeCompare(String(b.data_sorteio)));
  const nomeSorteio = Object.fromEntries(S.sorteios.map((s) => [s.id, `${MES_NOME[s.mes - 1]}/${s.ano}${s.ganhador ? ` · ${s.ganhador}` : ""}`]));

  const alternarGaleria = async () => { try { await definirGaleriaLiberada(!liberada); setLiberada(!liberada); K.avisar(!liberada ? "Galeria liberada para os agentes." : "Galeria restrita ao administrador."); } catch (e) { K.avisar(faltaBanco(e) ? SEM_BANCO : msgErro(e), "erro"); } };

  return (
    <div>
      <Titulo eyebrow="Incentivo" title={modoAdmin ? "Sorteios mensais" : "🎁 Sorteios Mensais"} sub="Registro dos sorteios mensais realizados com os atendimentos do correspondente e galeria de fotos por mês."
        direita={admin && <Btn tipo="amarelo" icon={Plus} onClick={() => setEd({ ano, mes: mes || (ano === anoAtual() ? new Date().getMonth() + 1 : 1) })}>Novo sorteio</Btn>} />
      {erro && <div className="mb-4"><Aviso tipo={faltaBanco(erro) ? "amarelo" : "erro"}>{faltaBanco(erro) ? SEM_BANCO : msgErro(erro)}</Aviso></div>}
      {admin && liberada != null && <Card className="mb-4 !p-3"><div className="flex items-center gap-3 flex-wrap"><span className="font-body text-sm flex-1">{liberada ? <><Eye size={14} className="inline" /> Os agentes <b>podem consultar</b> a galeria e os sorteios.</> : <><Lock size={14} className="inline" /> Somente administradores veem os sorteios e as fotos.</>}</span><Btn small tipo={liberada ? "claro" : "verde"} onClick={alternarGaleria}>{liberada ? "Restringir ao administrador" : "Liberar consulta aos agentes"}</Btn></div></Card>}

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className={inp} style={{ ...inpS, width: "auto" }}>{anos.map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inp} style={{ ...inpS, width: "auto" }}><option value={0}>Todos os meses</option>{MES_NOME.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        <div className="flex gap-1.5 flex-wrap">{[["painel", "Painel anual"], ["sorteios", "Sorteios"], ["galeria", "Galeria dos sorteios"]].map(([k, l]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      </div>

      {aba === "painel" && <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPI titulo="Sorteios realizados" valor={doAno.length} icon={Gift} cor={C.yellowDeep} destaque />
          <KPI titulo="Ganhadores" valor={ganhadores.size} icon={Trophy} />
          <KPI titulo="Meses realizados" valor={mesesFeitos.size} icon={CalendarCheck} cor={C.green} />
          <KPI titulo="Meses pendentes" valor={pendentes.length} sub={pendentes.length ? pendentes.map((m) => MES_NOME[m - 1].slice(0, 3)).join(", ") : "nenhum"} icon={CalendarX} cor={C.red} />
          <KPI titulo="Fotos cadastradas" valor={fotosAno.length} icon={Images} />
        </div>
        <Card><p className="font-display font-bold mb-3" style={{ color: C.navy }}>Linha do tempo · {ano}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">{MES_NOME.map((nm, i) => {
            const m = i + 1; const ss = doAno.filter((s) => s.mes === m); const nf = fotosAno.filter((f) => f.mes === m).length;
            const st = ss.length ? "feito" : m <= limiteMes ? "pendente" : "futuro";
            const cor = { feito: C.green, pendente: C.red, futuro: C.soft }[st];
            const capa = ss.find((s) => s._foto)?._foto || fotosAno.find((f) => f.mes === m && f._url)?._url;
            return (
              <button key={nm} onClick={() => { setMes(m); setAba(ss.length ? "sorteios" : "galeria"); }} className="text-left rounded-xl border overflow-hidden bg-white hover:shadow-md transition" style={{ borderColor: st === "feito" ? C.green : C.line }}>
                <div className="h-1.5" style={{ background: cor }} />
                <div className="p-3 flex gap-2.5">
                  {capa ? <img src={capa} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" /> : <span className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: C.gray }}><Gift size={20} color={C.soft} /></span>}
                  <div className="min-w-0"><p className="font-display font-bold text-sm" style={{ color: C.navy }}>{nm}</p>
                    <p className="font-body text-[11px] font-bold" style={{ color: cor }}>{st === "feito" ? `✓ ${ss.length} sorteio(s)` : st === "pendente" ? "Pendente" : "A realizar"}</p>
                    {ss[0]?.ganhador && <p className="font-body text-xs truncate">🏆 {ss[0].ganhador}</p>}
                    {nf > 0 && <p className="font-body text-[11px]" style={{ color: C.muted }}>{nf} foto(s)</p>}</div>
                </div>
              </button>); })}</div></Card>
      </div>}

      {aba === "sorteios" && (visS.length ? <div className="grid md:grid-cols-2 gap-3">{visS.map((s) => (
        <Card key={s.id}>
          <div className="flex gap-3">
            {s._foto ? <img src={s._foto} alt="Foto do sorteio" onClick={() => setZoom({ url: s._foto, legenda: `Sorteio de ${MES_NOME[s.mes - 1]}/${s.ano}` })} className="w-28 h-28 rounded-xl object-cover cursor-zoom-in shrink-0" /> : <span className="w-28 h-28 rounded-xl shrink-0 flex items-center justify-center" style={{ background: C.gray }}><Gift size={28} color={C.soft} /></span>}
            <div className="min-w-0 flex-1">
              <p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>{MES_NOME[s.mes - 1]} de {s.ano}</p>
              <p className="font-display font-bold" style={{ color: C.navy }}>🏆 {s.ganhador || "Ganhador não informado"}</p>
              <p className="font-body text-xs mt-0.5" style={{ color: C.muted }}>Sorteio em {br(s.data_sorteio)}{s.participantes != null ? ` · ${s.participantes} atendimento(s) participantes` : ""}</p>
              {s.descricao && <p className="font-body text-sm mt-1.5">{s.descricao}</p>}
              {s.observacoes && <p className="font-body text-xs mt-1" style={{ color: C.muted }}>Obs.: {s.observacoes}</p>}
            </div>
            {s._fotoGanhador && <img src={s._fotoGanhador} alt="Foto do ganhador" onClick={() => setZoom({ url: s._fotoGanhador, legenda: `Ganhador(a): ${s.ganhador || ""}` })} className="w-16 h-16 rounded-full object-cover cursor-zoom-in shrink-0 border-2" style={{ borderColor: C.yellow }} />}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap"><Btn small tipo="fantasma" icon={Images} onClick={() => { setMes(s.mes); setAba("galeria"); }}>Fotos do mês ({S.fotos.filter((f) => f.sorteio_id === s.id || (f.ano === s.ano && f.mes === s.mes)).length})</Btn>{admin && <Btn small tipo="claro" onClick={() => setEd(s)}>Editar</Btn>}</div>
        </Card>))}</div> : <Vazio><Gift className="mx-auto mb-2" />Nenhum sorteio registrado {mes ? `em ${MES_NOME[mes - 1]}` : "neste ano"}.{admin ? " Clique em \"Novo sorteio\"." : ""}</Vazio>)}

      {aba === "galeria" && <Galeria K={K} S={S} ano={ano} mes={mes} admin={admin} nomeSorteio={nomeSorteio} onZoom={setZoom} onEditar={setFoto} recarregar={recarregar} />}

      {ed && <EditorSorteio K={K} s={ed} onFechar={(mudou) => { setEd(null); if (mudou) recarregar(); }} />}
      {foto && <EditorFoto K={K} f={foto} sorteios={S.sorteios} onFechar={(mudou) => { setFoto(null); if (mudou) recarregar(); }} />}
      {zoom && <Ampliada z={zoom} onFechar={() => setZoom(null)} />}
    </div>
  );
}

function Galeria({ K, S, ano, mes, admin, nomeSorteio, onZoom, onEditar, recarregar }) {
  const [enviando, setEnviando] = useState(null);
  const meses = mes ? [mes] : Array.from({ length: 12 }, (_, i) => i + 1);
  const enviar = async (files, m) => {
    if (!files?.length) return; setEnviando(m);
    const sorteio = S.sorteios.find((s) => s.ano === ano && s.mes === m);
    let ok = 0;
    for (const f of files) { try { const { path } = await enviarFotoSorteio(f, ano, m); await gravar("fotos", null, { ano, mes: m, path, legenda: null, data: null, sorteio_id: sorteio?.id || null }); ok++; } catch (e) { K.avisar(`${f.name}: ${msgErro(e)}`, "erro"); } }
    setEnviando(null); if (ok) { K.avisar(`${ok} foto(s) adicionada(s) em ${MES_NOME[m - 1]}.`); recarregar(); }
  };
  const lista = meses.map((m) => ({ m, fotos: S.fotos.filter((f) => f.ano === ano && f.mes === m) })).filter((x) => admin || x.fotos.length);
  if (!lista.length) return <Vazio><Camera className="mx-auto mb-2" />Nenhuma foto em {mes ? MES_NOME[mes - 1] : ano}.</Vazio>;
  return (
    <div className="space-y-4">{lista.map(({ m, fotos }) => (
      <Card key={m}>
        <div className="flex items-center gap-2 mb-3 flex-wrap"><p className="font-display font-bold flex-1" style={{ color: C.navy }}>{MES_NOME[m - 1]} · {ano} <span className="font-body text-xs font-normal" style={{ color: C.muted }}>({fotos.length} foto{fotos.length === 1 ? "" : "s"})</span></p>
          {admin && <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 font-body text-xs font-bold px-2.5 py-1.5 rounded-xl" style={{ background: C.yellow, color: C.navy }}><Upload size={13} /> {enviando === m ? "Enviando..." : "Adicionar fotos"}</span><input type="file" accept="image/*" multiple className="hidden" disabled={enviando != null} onChange={(e) => { enviar([...e.target.files], m); e.target.value = ""; }} /></label>}</div>
        {fotos.length ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">{fotos.map((f) => (
          <div key={f.id} className="rounded-xl overflow-hidden border bg-white" style={{ borderColor: C.line }}>
            {f._url ? <img src={f._url} alt={f.legenda || "Foto do sorteio"} loading="lazy" onClick={() => onZoom({ url: f._url, legenda: f.legenda, data: f.data, sorteio: nomeSorteio[f.sorteio_id] })} className="w-full aspect-square object-cover cursor-zoom-in" /> : <div className="w-full aspect-square flex items-center justify-center font-body text-xs" style={{ background: C.gray, color: C.soft }}>Imagem indisponível</div>}
            <div className="p-2"><p className="font-body text-xs font-semibold truncate">{f.legenda || "Sem legenda"}</p><p className="font-body text-[10.5px] truncate" style={{ color: C.muted }}>{f.data ? br(f.data) : ""}{f.sorteio_id && nomeSorteio[f.sorteio_id] ? ` · ${nomeSorteio[f.sorteio_id]}` : ""}</p>
              {admin && <button onClick={() => onEditar(f)} className="font-body text-[11px] font-bold mt-1" style={{ color: C.navy }}>Editar</button>}</div>
          </div>))}</div> : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhuma foto neste mês.</p>}
      </Card>))}</div>
  );
}

function EditorSorteio({ K, s, onFechar }) {
  const [v, setV] = useState({ ...s, _foto: s._foto, _fotoGanhador: s._fotoGanhador });
  const [arq, setArq] = useState({}); const [sal, setSal] = useState(false);
  const preview = (k) => (arq[k] ? URL.createObjectURL(arq[k]) : v[k === "foto_path" ? "_foto" : "_fotoGanhador"]);
  const salvar = async () => {
    const ano = Number(v.ano), mes = Number(v.mes);
    if (!ano || !mes) return K.avisar("Informe ano e mês.", "erro");
    setSal(true);
    try {
      const d = { ano, mes, data_sorteio: v.data_sorteio || null, ganhador: v.ganhador || null, participantes: v.participantes === "" || v.participantes == null ? null : Math.max(0, Math.round(Number(v.participantes))), descricao: v.descricao || null, observacoes: v.observacoes || null, foto_path: v.foto_path || null, foto_ganhador_path: v.foto_ganhador_path || null };
      const antigos = [];
      for (const k of ["foto_path", "foto_ganhador_path"]) if (arq[k]) { const { path } = await enviarFotoSorteio(arq[k], ano, mes); if (s[k]) antigos.push(s[k]); d[k] = path; }
      for (const k of ["foto_path", "foto_ganhador_path"]) if (s[k] && !v[k] && !arq[k]) antigos.push(s[k]);
      await gravar("sorteios", s.id, d);
      for (const p of antigos) await apagarArquivoSorteio(p);
      K.avisar("Sorteio salvo."); onFechar(true);
    } catch (e) { K.avisar(faltaBanco(e) ? SEM_BANCO : msgErro(e), "erro"); } finally { setSal(false); }
  };
  const remover = async () => {
    if (!confirm("Excluir este sorteio? As fotos da galeria do mês continuam salvas.")) return;
    try { await excluir("sorteios", s.id); await apagarArquivoSorteio(s.foto_path); await apagarArquivoSorteio(s.foto_ganhador_path); K.avisar("Sorteio excluído."); onFechar(true); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  const FotoCampo = ({ k, l }) => { const url = preview(k); return (
    <Campo label={l}><div className="flex items-center gap-3">
      {url ? <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover border" style={{ borderColor: C.line }} /> : <span className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ background: C.gray }}><Camera size={20} color={C.soft} /></span>}
      <div className="flex flex-col gap-1.5"><label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 font-body text-xs font-bold px-2.5 py-1.5 rounded-xl" style={{ background: C.yellow, color: C.navy }}><Upload size={13} /> {url ? "Substituir" : "Enviar foto"}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setArq({ ...arq, [k]: f }); }} /></label>
        {url && <Btn small tipo="perigo" onClick={() => { setArq({ ...arq, [k]: null }); setV({ ...v, [k]: null, [k === "foto_path" ? "_foto" : "_fotoGanhador"]: null }); }}>Remover</Btn>}</div>
    </div></Campo>); };
  return (
    <Modal onFechar={() => onFechar(false)} titulo={s.id ? `Sorteio de ${MES_NOME[s.mes - 1]}/${s.ano}` : "Novo sorteio mensal"} largura="max-w-3xl">
      <Campos v={v} set={setV} campos={[{ k: "ano", l: "Ano", t: "number", req: true }, { k: "mes", l: "Mês de referência", t: "select", semVazio: true, op: MES_NOME.map((m, i) => [i + 1, m]) }, { k: "data_sorteio", l: "Data do sorteio", t: "date" }, { k: "participantes", l: "Atendimentos participantes", t: "number", im: "numeric" }, { k: "ganhador", l: "Nome do ganhador", full: true }, { k: "descricao", l: "Descrição", t: "textarea", full: true }, { k: "observacoes", l: "Observações", t: "textarea", full: true }]} />
      <div className="grid sm:grid-cols-2 gap-3 mt-3"><FotoCampo k="foto_path" l="Foto ou imagem do sorteio" /><FotoCampo k="foto_ganhador_path" l="Foto do ganhador" /></div>
      <div className="mt-3"><Aviso>Publique fotos e o nome do ganhador somente com autorização da pessoa (LGPD e direito de imagem).</Aviso></div>
      <div className="flex justify-between mt-4">{s.id ? <Btn small tipo="perigo" icon={Trash2} onClick={remover}>Excluir</Btn> : <span />}<Btn icon={Save} disabled={sal} onClick={salvar}>{sal ? "Salvando..." : "Salvar"}</Btn></div>
    </Modal>
  );
}

function EditorFoto({ K, f, sorteios, onFechar }) {
  const [v, setV] = useState({ legenda: f.legenda || "", data: f.data || "", sorteio_id: f.sorteio_id || "" });
  const [nova, setNova] = useState(null); const [sal, setSal] = useState(false);
  const salvar = async () => {
    setSal(true);
    try { const d = { legenda: v.legenda || null, data: v.data || null, sorteio_id: v.sorteio_id || null }; if (nova) { const { path } = await enviarFotoSorteio(nova, f.ano, f.mes); d.path = path; } await gravar("fotos", f.id, d); if (nova) await apagarArquivoSorteio(f.path); K.avisar("Foto atualizada."); onFechar(true); }
    catch (e) { K.avisar(msgErro(e), "erro"); } finally { setSal(false); }
  };
  const remover = async () => { if (!confirm("Excluir esta foto?")) return; try { await excluir("fotos", f.id); await apagarArquivoSorteio(f.path); K.avisar("Foto excluída."); onFechar(true); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <Modal onFechar={() => onFechar(false)} titulo={`Foto · ${MES_NOME[f.mes - 1]}/${f.ano}`}>
      <img src={nova ? URL.createObjectURL(nova) : f._url} alt="" className="w-full max-h-72 object-contain rounded-xl mb-3" style={{ background: C.gray }} />
      <Campos v={v} set={setV} campos={[{ k: "legenda", l: "Legenda", full: true }, { k: "data", l: "Data", t: "date" }, { k: "sorteio_id", l: "Sorteio", t: "select", vazio: "Sem vínculo", op: sorteios.map((s) => [s.id, `${MES_NOME[s.mes - 1]}/${s.ano}${s.ganhador ? ` · ${s.ganhador}` : ""}`]) }]} />
      <label className="cursor-pointer inline-block mt-3"><span className="inline-flex items-center gap-1.5 font-body text-xs font-bold px-2.5 py-1.5 rounded-xl" style={{ background: C.navyTint, color: C.navy }}><RefreshCw size={13} /> Substituir imagem</span><input type="file" accept="image/*" className="hidden" onChange={(e) => setNova(e.target.files?.[0] || null)} /></label>
      <div className="flex justify-between mt-4"><Btn small tipo="perigo" icon={Trash2} onClick={remover}>Excluir</Btn><Btn icon={Save} disabled={sal} onClick={salvar}>{sal ? "Salvando..." : "Salvar"}</Btn></div>
    </Modal>
  );
}

function Ampliada({ z, onFechar }) {
  useEffect(() => { const e = (ev) => ev.key === "Escape" && onFechar(); window.addEventListener("keydown", e); return () => window.removeEventListener("keydown", e); }, []);
  return (
    <div className="fixed inset-0 z-[140] flex flex-col items-center justify-center p-4" style={{ background: "rgba(5,12,28,0.92)" }} onClick={onFechar}>
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/15" aria-label="Fechar"><X color="#fff" /></button>
      <img src={z.url} alt={z.legenda || ""} className="max-w-full max-h-[80vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      {(z.legenda || z.data || z.sorteio) && <p className="font-body text-sm text-white mt-3 text-center">{z.legenda}{z.data ? ` · ${br(z.data)}` : ""}{z.sorteio ? ` · ${z.sorteio}` : ""}</p>}
    </div>
  );
}
