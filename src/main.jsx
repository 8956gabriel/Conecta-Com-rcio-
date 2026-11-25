import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";

// Garante que quem já tem o app instalado/em cache receba a versão nova
// assim que ela for publicada, sem precisar fechar e abrir o app várias
// vezes — o próprio service worker recarrega a página quando assume o
// controle da aba.
registerSW({ immediate: true });

// Link curto: conectacomercio.app.br/fomento abre direto a página do Fomento Paraná.
// Links separados: /fomento (público), /fomento/agente (agente de crédito), /fomento/admin (gestão).
// Sala do Empreendedor: /sala (público), /sala/agente (atendente), /sala/admin (gestão).
if (!import.meta.env.VITE_SITE) {
  const p = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const destino = { "/fomento": "/#/fomento", "/fomento/publico": "/#/fomento", "/fomento/agente": "/#/fomento-agente", "/fomento/admin": "/#/fomento-admin", "/sala": "/#/sala", "/sala/publico": "/#/sala", "/sala/agente": "/#/sala-agente", "/sala/atendente": "/#/sala-agente", "/sala/admin": "/#/sala-admin" }[p];
  if (destino) window.history.replaceState(null, "", destino);
}

// VITE_SITE=fomento → site do Fomento · VITE_SITE=maisbb → Mais BB Digital · vazio → Conecta Comércio
const SITE = import.meta.env.VITE_SITE;
const carregar = SITE === "fomento" ? import("./FomentoSite.jsx") : SITE === "maisbb" ? import("./maisbb/MaisBBSite.jsx") : import("./App.jsx");
// Crédito do desenvolvedor no fim de todas as páginas/abas dos três sites.
function CreditoDesenvolvedor() {
  return (
    <div style={{ textAlign: "center", padding: "10px 12px 14px", fontSize: 11, lineHeight: 1.4, color: "#6B7A8C", background: "#F5F7FA", borderTop: "1px solid #E3E8EF", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      Desenvolvedor: <strong style={{ color: "#3A4757" }}>Gabriel Oliveira</strong>
    </div>
  );
}

carregar.then(({ default: Raiz }) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Raiz />
      <CreditoDesenvolvedor />
    </React.StrictMode>
  );
});
