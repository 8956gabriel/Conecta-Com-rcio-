// =============================================================================
// PORTAL DE ENTRADA — "Como você quer entrar?" (Projeto Master · seções 6 e 7)
// Os três cartões grandes que a Sala do Empreendedor já usa (Área pública,
// equipe e administração), agora reaproveitados pela Fomento Paraná e pela
// página Portal do Conecta Comércio. Cada ambiente passa a sua marca e as suas
// cores — a identidade de cada um continua a dele.
// =============================================================================
import React from "react";

/**
 * @param {object} p
 * @param {React.ReactNode} [p.marca]   logomarca do ambiente (imagem ou ícone + nome)
 * @param {string} [p.titulo]           título (padrão: "Como você quer entrar?")
 * @param {string} [p.sub]              subtítulo
 * @param {Array<{chave:string, icon:any, titulo:string, texto:string, cor:string, href?:string, onClick?:Function, corFim?:string}>} p.opcoes
 * @param {boolean} [p.compacto]        cartões menores (para várias seções na mesma página)
 * @param {string} [p.corTexto]
 */
export default function PortalEntrada({ marca, titulo = "Como você quer entrar?", sub = "Escolha a área de acordo com o seu perfil.", opcoes, compacto = false, corTexto = "#0E2233", corSub = "#5C7186" }) {
  return (
    <div>
      {(marca || titulo) && (
        <div className={`text-center max-w-2xl mx-auto ${compacto ? "mb-5" : "mb-8"}`}>
          {marca && <div className="flex justify-center">{marca}</div>}
          {titulo && <h1 className={`font-display font-extrabold ${compacto ? "text-2xl md:text-3xl mt-3" : "text-3xl md:text-4xl mt-4"}`} style={{ color: corTexto }}>{titulo}</h1>}
          {sub && <p className="font-body text-sm mt-2" style={{ color: corSub }}>{sub}</p>}
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        {opcoes.map((o) => {
          const Ic = o.icon;
          const conteudo = (
            <>
              <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
              <span className={`${compacto ? "w-11 h-11" : "w-14 h-14"} rounded-2xl flex items-center justify-center relative`} style={{ background: "rgba(255,255,255,0.16)" }}><Ic size={compacto ? 21 : 26} /></span>
              <p className={`font-display font-extrabold ${compacto ? "text-xl mt-3" : "text-2xl mt-5"} relative`}>{o.titulo}</p>
              <p className="font-body text-sm text-white/80 mt-2 relative flex-1">{o.texto}</p>
              <span className="font-body text-sm font-bold mt-4 relative">Entrar →</span>
            </>
          );
          const cls = `rounded-3xl ${compacto ? "p-5 min-h-[190px]" : "p-6 md:p-8 min-h-[240px]"} text-white relative overflow-hidden flex flex-col text-left hover:-translate-y-1 transition-transform`;
          const sty = { background: `linear-gradient(135deg, ${o.cor}, ${o.corFim || "#052A4D"})` };
          return o.href
            ? <a key={o.chave} href={o.href} className={cls} style={sty}>{conteudo}</a>
            : <button key={o.chave} type="button" onClick={o.onClick} className={cls} style={sty}>{conteudo}</button>;
        })}
      </div>
    </div>
  );
}
