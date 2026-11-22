import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import "./index.css";

// Garante que quem já tem o app instalado/em cache receba a versão nova
// assim que ela for publicada, sem precisar fechar e abrir o app várias
// vezes — o próprio service worker recarrega a página quando assume o
// controle da aba.
registerSW({ immediate: true });

// Link curto: conectacomercio.app.br/fomento abre direto a página do Fomento Paraná.
// Links separados: /fomento (público), /fomento/agente (agente de crédito), /fomento/admin (gestão).
{
  const p = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const destino = { "/fomento": "/#/fomento", "/fomento/publico": "/#/fomento", "/fomento/agente": "/#/fomento-agente", "/fomento/admin": "/#/fomento-admin" }[p];
  if (destino) window.history.replaceState(null, "", destino);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
