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
if (import.meta.env.VITE_SITE !== "fomento") {
  const p = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const destino = { "/fomento": "/#/fomento", "/fomento/publico": "/#/fomento", "/fomento/agente": "/#/fomento-agente", "/fomento/admin": "/#/fomento-admin" }[p];
  if (destino) window.history.replaceState(null, "", destino);
}

// Site próprio do Fomento Paraná (VITE_SITE=fomento) ou Conecta Comércio completo
const carregar = import.meta.env.VITE_SITE === "fomento" ? import("./FomentoSite.jsx") : import("./App.jsx");
carregar.then(({ default: Raiz }) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Raiz />
    </React.StrictMode>
  );
});
