// =============================================================================
// DOSSIÊ DE EVIDÊNCIAS — SELO SEBRAE (Projeto Master · seção 11.6)
// Gera um PDF pronto para apresentar ao Sebrae/Comitê:
//   1. capa com a pontuação estimada e a faixa do Selo
//   2. resumo por pilar (critérios, concluídos, pontos, %)
//   3. pendências (o que falta, com responsável e prazo)
//   4. uma seção por critério: evidência exigida, responsável, observações e
//      os comprovantes anexados (fotos entram como miniatura; os demais como link)
// Usa só o que já está cadastrado na aba Selo Sebrae — não altera nada.
// =============================================================================

const AZUL = [10, 90, 168];
const INK = [14, 34, 51];
const MUTED = [92, 113, 134];

// A fonte padrão do PDF não desenha alguns símbolos: troca por equivalentes
const ACEITOS = new Set("“”‘’–—…€".split(""));
function limpar(t) {
  return String(t ?? "")
    .replace(/[≥]/g, ">=").replace(/[≤]/g, "<=").replace(/[→➜➔]/g, "->").replace(/[·•●▪]/g, "-")
    .replace(/[✓✔]/g, "OK").replace(/[✗✘]/g, "X")
    .split("").filter((c) => c.charCodeAt(0) <= 0xff || ACEITOS.has(c)).join("");
}
const dataBR = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "-");
const num = (n) => Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const ehImagem = (a) => /\.(jpe?g|png)(\?|$)/i.test(a?.url || a?.nome || "");

async function imagemComoDataURL(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (blob.size > 6 * 1024 * 1024) return null; // fotos muito grandes ficam só como link
    return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(blob); });
  } catch { return null; }
}

/**
 * @param {object} p
 * @param {number} p.ciclo
 * @param {Array} p.itens         linhas de sala_selo_itens do ciclo
 * @param {object} p.statusRotulo  { nao_iniciado: {r}, em_andamento: {r}, concluido: {r} }
 * @param {(pontos:number)=>{r:string,k:string}} p.faixa
 * @param {string} [p.nomeSala]
 */
export async function gerarDossieSelo({ ciclo, itens, statusRotulo, faixa, nomeSala = "Sala do Empreendedor de Ivatuba - PR" }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 14, LARG = W - 2 * M;
  const st = (s) => limpar(statusRotulo?.[s]?.r || s);

  const lista = [...(itens || [])].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));
  const total = lista.reduce((s, i) => s + Number(i.pontos || 0), 0);
  const prontos = lista.filter((i) => i.status === "concluido").reduce((s, i) => s + Number(i.pontos || 0), 0);
  const pontos = total ? (prontos * 100) / total : 0;
  const fx = faixa(pontos);
  const nAnexos = lista.reduce((s, i) => s + (i.anexos || []).length, 0);

  // ---------------------------------------------------------------- 1. capa
  doc.setFillColor(...AZUL); doc.rect(0, 0, W, 92, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("SELO SEBRAE DE REFERÊNCIA EM ATENDIMENTO", M, 30);
  doc.setFontSize(26); doc.text("Dossiê de Evidências", M, 46);
  doc.setFont("helvetica", "normal"); doc.setFontSize(13);
  doc.text(limpar(nomeSala), M, 58);
  doc.text(`Ciclo ${ciclo}`, M, 66);
  doc.setFontSize(9.5); doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, M, 80);

  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Situação atual (estimativa interna)", M, 110);
  const caixas = [
    ["Pontuação com evidência", `${num(pontos)} de 100`],
    ["Faixa estimada", fx.k === "nenhum" ? "Ainda não selaria" : `Selo ${limpar(fx.r)}`],
    ["Critérios concluídos", `${lista.filter((i) => i.status === "concluido").length} de ${lista.length}`],
    ["Comprovantes anexados", String(nAnexos)],
  ];
  caixas.forEach(([r, v], k) => {
    const x = M + (k % 2) * (LARG / 2 + 2), y = 116 + Math.floor(k / 2) * 26;
    doc.setDrawColor(220, 231, 242); doc.setFillColor(247, 250, 253); doc.roundedRect(x, y, LARG / 2 - 2, 22, 3, 3, "FD");
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(r, x + 5, y + 8);
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...INK); doc.text(v, x + 5, y + 17);
  });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize("Faixas do regulamento 2026: Bronze 75 a 80,99 | Prata 81 a 89,99 | Ouro 90 a 100 | Diamante 100 (etapa nacional). A pontuação acima considera apenas os critérios marcados como concluídos com evidência; a nota oficial é atribuída pelo Comitê do Sebrae.", LARG), M, 178);

  // -------------------------------------------------------- 2. resumo por pilar
  const pilares = Array.from(new Set(lista.map((i) => i.pilar || "Sem pilar")));
  autoTable(doc, {
    startY: 196,
    head: [["Pilar", "Critérios", "Concluídos", "Pontos possíveis", "Pontos com evidência", "%"]],
    body: [
      ...pilares.map((p) => {
        const d = lista.filter((i) => (i.pilar || "Sem pilar") === p);
        const t = d.reduce((s, i) => s + Number(i.pontos || 0), 0);
        const c = d.filter((i) => i.status === "concluido").reduce((s, i) => s + Number(i.pontos || 0), 0);
        return [limpar(p), d.length, d.filter((i) => i.status === "concluido").length, num(t), num(c), t ? `${num((c * 100) / t)}%` : "-"];
      }),
      [{ content: "Total", styles: { fontStyle: "bold" } }, lista.length, lista.filter((i) => i.status === "concluido").length, num(total), num(prontos), total ? `${num((prontos * 100) / total)}%` : "-"],
    ],
    styles: { fontSize: 9 }, headStyles: { fillColor: AZUL }, margin: { left: M, right: M },
  });

  // ----------------------------------------------------------- 3. pendências
  const pend = lista.filter((i) => i.status !== "concluido").sort((a, b) => Number(b.pontos || 0) - Number(a.pontos || 0));
  doc.addPage();
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...INK);
  doc.text(pend.length ? `Pendências (${pend.length})` : "Pendências", M, 20);
  if (pend.length) {
    autoTable(doc, {
      startY: 25,
      head: [["Nº", "Critério", "Pts", "Responsável", "Prazo", "Status"]],
      body: pend.map((i) => [i.numero ?? "", limpar(i.criterio), num(i.pontos), limpar(i.responsavel || "-"), dataBR(i.prazo), st(i.status)]),
      styles: { fontSize: 8.5 }, headStyles: { fillColor: [180, 70, 47] }, columnStyles: { 1: { cellWidth: 80 } }, margin: { left: M, right: M },
    });
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
    doc.text("Todos os critérios estão marcados como concluídos.", M, 28);
  }

  // ------------------------------------------------- 4. evidências por critério
  doc.addPage();
  let y = 20;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...INK);
  doc.text("Evidências por critério", M, y); y += 8;
  const garantir = (h) => { if (y + h > 280) { doc.addPage(); y = 18; } };

  for (const i of lista) {
    const titulo = doc.splitTextToSize(`${i.numero ?? "-"}. ${limpar(i.criterio)}`, LARG - 4);
    garantir(10 + titulo.length * 5);
    const concl = i.status === "concluido";
    doc.setFillColor(...(concl ? [231, 246, 238] : [251, 234, 229])); doc.rect(M, y - 4.5, LARG, titulo.length * 5 + 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
    doc.text(titulo, M + 2, y); y += titulo.length * 5 + 2;

    const campos = [
      ["Pilar", i.pilar], ["Pontos", num(i.pontos)], ["Situação", st(i.status)],
      ["Responsável", i.responsavel], ["Prazo", i.prazo ? dataBR(i.prazo) : ""],
      ["Evidência exigida", i.evidencia], ["Observações", i.observacao],
    ].filter(([, v]) => v != null && String(v).trim() !== "");
    doc.setFontSize(9);
    for (const [r, v] of campos) {
      const linhas = doc.splitTextToSize(limpar(v), LARG - 36);
      garantir(linhas.length * 4.4 + 1);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED); doc.text(`${r}:`, M + 2, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...INK); doc.text(linhas, M + 36, y);
      y += linhas.length * 4.4 + 0.8;
    }

    const anexos = i.anexos || [];
    garantir(6);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED); doc.text("Comprovantes:", M + 2, y);
    if (!anexos.length) { doc.setFont("helvetica", "normal"); doc.setTextColor(180, 70, 47); doc.text("nenhum anexado", M + 36, y); y += 5; }
    else {
      y += 0.5;
      for (const a of anexos) {
        garantir(5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...AZUL);
        const rot = limpar(`${a.nome || "arquivo"}${a.em ? ` (${dataBR(a.em)})` : ""}`).slice(0, 90);
        if (a.url) doc.textWithLink(rot, M + 36, y, { url: a.url }); else doc.text(rot, M + 36, y);
        y += 4.6;
        if (ehImagem(a) && a.url) {
          const img = await imagemComoDataURL(a.url);
          if (img) {
            try {
              const prop = doc.getImageProperties(img);
              const w = 70, h = Math.min(60, (prop.height / prop.width) * w);
              garantir(h + 3);
              doc.addImage(img, prop.fileType || "JPEG", M + 36, y - 1, (h / ((prop.height / prop.width) * w)) * w, h);
              y += h + 3;
            } catch { /* imagem num formato que o PDF não aceita: fica só o link */ }
          }
        }
      }
    }
    y += 5;
  }

  // ------------------------------------------------------------- rodapé
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(140);
    doc.text(`Dossiê de Evidências | Selo Sebrae ${ciclo} | ${limpar(nomeSala)}  |  Desenvolvedor: Gabriel Oliveira`, M, 291);
    doc.text(`${p}/${n}`, W - M, 291, { align: "right" });
  }
  doc.save(`dossie-selo-sebrae-${ciclo}.pdf`);
}
