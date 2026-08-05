import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
import {
  Search, MapPin, Star, Heart, MessageCircle, Briefcase, GraduationCap,
  Newspaper, Menu, X, ChevronRight, Building2, ShoppingBag, Smartphone,
  BadgeCheck, Clock, Instagram, Store, Wrench, Utensils, Shirt, Stethoscope,
  Scissors, Laptop, Hammer, ArrowRight, Eye, Bell, MapPinned, LayoutDashboard,
  CheckCircle2, Image as ImageIcon, Users, TrendingUp, Send, PlusCircle,
  Pencil, Trash2, Tag, UserCircle2, ChevronLeft, ShieldCheck, BarChart3, Vote, Sparkles,
  FileText, Receipt, ClipboardList, HandCoins, ExternalLink,
  Calendar, CalendarDays, Camera, Upload, PartyPopper, Landmark, Handshake, Palette,
  Leaf, ArrowUp, ArrowDown, Phone, Repeat, QrCode, Share2, RefreshCw, Zap, Activity
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase, supabaseConfigurado } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Cidade — nome configurável pelo admin (em vez de "Ivatuba" fixo no código),
// preparando o terreno para reaproveitar essa base em outra cidade no futuro
// (ver NOVA-CIDADE.md). Todo componente pode ler via useCidade().
// ---------------------------------------------------------------------------
const CidadeContext = createContext({ nomeCidade: "Ivatuba", nomeCidadeUF: "Ivatuba - PR" });
function useCidade() {
  return useContext(CidadeContext);
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
const C = {
  blue: "var(--cor-principal, #0A5AA8)",
  blueDark: "var(--cor-principal-escura, #073F73)",
  blueDeep: "var(--cor-principal-profunda, #052A4D)",
  blueTint: "#EAF2FB",
  blueTint2: "#F5F9FD",
  ink: "#0E2233",
  amber: "#E8A23D",
  amberDark: "#C6811F",
  line: "#DCE7F2",
};

// Paleta usada nos gráficos de barra/pizza e nos ícones dos cartões de
// estatística do painel admin — dá variedade visual sem depender de cor
// customizada nenhuma.
const PALETA_GRAFICOS = ["#0A5AA8", "#E8A23D", "#25A85B", "#B4462F", "#7E5BEF", "#0EA5A5"];

// Tipos fixos de credencial — usado no cadastro de credenciamento de eventos.
const TIPOS_CREDENCIAL = ["Participante", "Palestrante", "Organização", "Mídia/Comunicação", "Expositores", "Patrocinadores"];

// Escurece uma cor hex em uma porcentagem — usado para gerar os tons mais
// escuros (blueDark/blueDeep) a partir da única cor que o admin escolhe.
function escurecerCor(hex, quantidade) {
  try {
    const n = hex.replace("#", "");
    const r = Math.max(0, Math.round(parseInt(n.substring(0, 2), 16) * (1 - quantidade)));
    const g = Math.max(0, Math.round(parseInt(n.substring(2, 4), 16) * (1 - quantidade)));
    const b = Math.max(0, Math.round(parseInt(n.substring(4, 6), 16) * (1 - quantidade)));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return hex;
  }
}

// Busca inteligente (FASE 40): ignora acento e maiúscula/minúscula, então
// "cafe", "café" e "CAFÉ" encontram a mesma coisa.
function normalizarTexto(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
// Notificação push (Web Push) — a chave pública VAPID é segura de expor,
// só a privada (guardada como segredo na Edge Function) assina as
// mensagens de verdade.
const VAPID_PUBLIC_KEY = "BEBCuOYCXVNPmGEPiQIzdHO2J2z7eDdRnf7_t7rb1dm3GF66FI4ABqxqoC3fj5UMmgvEPzIV_IBOiSsB3ME0Kxc";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const MINUTOS_PARA_CONSIDERAR_ONLINE = 5;

function estaOnline(ultimoAcesso) {
  if (!ultimoAcesso) return false;
  return Date.now() - new Date(ultimoAcesso).getTime() <= MINUTOS_PARA_CONSIDERAR_ONLINE * 60 * 1000;
}

function formatarUltimoAcesso(ultimoAcesso) {
  if (!ultimoAcesso) return "Nunca acessou";
  const diffMs = Date.now() - new Date(ultimoAcesso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffDias = Math.floor(diffH / 24);
  if (diffDias < 30) return `há ${diffDias} ${diffDias === 1 ? "dia" : "dias"}`;
  return new Date(ultimoAcesso).toLocaleDateString("pt-BR");
}

function textoContem(campo, termo) {
  return normalizarTexto(campo).includes(normalizarTexto(termo));
}

// Um anúncio patrocinado (FASE 35) pode ter prazo de validade (FASE 37 —
// "destaque temporário"). Sem data marcada, vale pra sempre, como antes.
function patrocinadoAtivo(e) {
  if (!e?.patrocinado) return false;
  if (!e.patrocinado_ate) return true;
  const hoje = new Date().toISOString().slice(0, 10);
  return e.patrocinado_ate >= hoje;
}

// Plano Premium (FASE 52) — assinatura opcional do comerciante, ativada
// manualmente pelo admin depois de combinar o pagamento por fora da
// plataforma (mesmo esquema já usado no "patrocinado").
function planoPremiumAtivo(e) {
  if (!e?.plano_premium) return false;
  if (!e.plano_premium_ate) return true;
  const hoje = new Date().toISOString().slice(0, 10);
  return e.plano_premium_ate >= hoje;
}
const LIMITE_FOTOS_GRATUITO = 3;
const LIMITE_FOTOS_PREMIUM = 15;

// Campos type="number" sempre usam ponto como separador decimal (padrão do
// HTML, ignora o idioma do navegador) — então "20.000" vira 20, não 20 mil.
// Por isso valores em R$ usam campo de texto e essa função pra interpretar
// o jeito brasileiro de digitar (ponto separa milhar, vírgula separa centavos).
function parseMoedaBR(texto) {
  if (texto == null || texto === "") return null;
  const limpo = String(texto).trim().replace(/\./g, "").replace(",", ".");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

// Categorias estáveis do relatório oficial da Sala do Empreendedor (Sebrae) —
// os subitens variam de ano pra ano, mas esses grupos se repetem, por isso
// usamos eles como categoria fixa e deixamos um campo livre pro detalhe.
const CATEGORIAS_SALA_EMPREENDEDOR = [
  "Alteração de Dados",
  "Alvará",
  "Baixa da Inscrição do MEI (CNPJ)",
  "Boleto DAS - (INSS/ICMS/ISS)",
  "CNPJ MEI",
  "Compras Públicas",
  "Crédito",
  "Declaração Anual - DASN-SIMEI",
  "Formalização - Abertura de Empresa",
  "Nota Fiscal MEI - SERVIÇO (ISS)",
  "Orientações sobre o MEI",
  "Parcelamento Especial - Microempreendedor Individual",
  "Parcelamento - Microempreendedor Individual",
  "Parcelamento - Regularize (Dívida Ativa)",
  "Outros",
];
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// -----------------------------------------------------------------------
// Horário de funcionamento por dia da semana e indicador "aberto agora".
// Guardado como JSON: { seg: { aberto, abre, fecha }, ter: {...}, ... }.
// FASE 46.
// -----------------------------------------------------------------------
const DIAS_SEMANA = [
  { chave: "dom", label: "Domingo" },
  { chave: "seg", label: "Segunda" },
  { chave: "ter", label: "Terça" },
  { chave: "qua", label: "Quarta" },
  { chave: "qui", label: "Quinta" },
  { chave: "sex", label: "Sexta" },
  { chave: "sab", label: "Sábado" },
];

const horarioFuncionamentoVazio = () => ({
  dom: { aberto: false, abre: "", fecha: "" },
  seg: { aberto: true, abre: "08:00", fecha: "18:00" },
  ter: { aberto: true, abre: "08:00", fecha: "18:00" },
  qua: { aberto: true, abre: "08:00", fecha: "18:00" },
  qui: { aberto: true, abre: "08:00", fecha: "18:00" },
  sex: { aberto: true, abre: "08:00", fecha: "18:00" },
  sab: { aberto: true, abre: "08:00", fecha: "12:00" },
});

function horarioFuncionamentoCadastrado(horario) {
  return !!horario && DIAS_SEMANA.some((d) => horario[d.chave]?.aberto && horario[d.chave]?.abre && horario[d.chave]?.fecha);
}

function estaAbertaAgora(horario) {
  if (!horarioFuncionamentoCadastrado(horario)) return null;
  const agora = new Date();
  const chaveHoje = DIAS_SEMANA[agora.getDay()].chave;
  const cfg = horario[chaveHoje];
  if (!cfg?.aberto || !cfg.abre || !cfg.fecha) return false;
  const [hA, mA] = cfg.abre.split(":").map(Number);
  const [hF, mF] = cfg.fecha.split(":").map(Number);
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const minAbre = hA * 60 + (mA || 0);
  const minFecha = hF * 60 + (mF || 0);
  if (minFecha <= minAbre) return false;
  return minAgora >= minAbre && minAgora < minFecha;
}

function resumoHorarioHoje(horario) {
  if (!horarioFuncionamentoCadastrado(horario)) return null;
  const agora = new Date();
  const chaveHoje = DIAS_SEMANA[agora.getDay()].chave;
  const cfg = horario[chaveHoje];
  if (!cfg?.aberto || !cfg.abre || !cfg.fecha) return "Fechado hoje";
  return estaAbertaAgora(horario) ? `Aberto agora · fecha às ${cfg.fecha}` : `Fechado agora · hoje das ${cfg.abre} às ${cfg.fecha}`;
}

// -----------------------------------------------------------------------
// Pix "copia e cola" gerado no navegador — segue o padrão público do Banco
// Central (BR Code / EMV), o mesmo que qualquer maquininha ou app de banco
// usa. O site só monta o código; quem confirma o pagamento é o banco de
// cada um, o Conecta Comércio não processa nem vê o dinheiro. FASE 51.
// -----------------------------------------------------------------------
function crc16Pix(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function campoPix(id, valor) {
  const tamanho = String(valor).length.toString().padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

function removerAcentos(texto) {
  return (texto || "").normalize("NFD").split("").filter((ch) => {
    const codigo = ch.charCodeAt(0);
    return codigo < 0x0300 || codigo > 0x036f; // remove marcas de acento (combining diacritics)
  }).join("");
}

function gerarPayloadPix({ chave, nomeRecebedor, cidade, valor }) {
  if (!chave) return null;
  const nome = removerAcentos(nomeRecebedor || "CONECTA COMERCIO").toUpperCase().slice(0, 25);
  const cidadeLimpa = removerAcentos(cidade || "IVATUBA").toUpperCase().slice(0, 15);
  const merchantAccount = campoPix("00", "BR.GOV.BCB.PIX") + campoPix("01", chave);
  let payload =
    campoPix("00", "01") +
    campoPix("26", merchantAccount) +
    campoPix("52", "0000") +
    campoPix("53", "986");
  if (valor != null && Number(valor) > 0) {
    payload += campoPix("54", Number(valor).toFixed(2));
  }
  payload +=
    campoPix("58", "BR") +
    campoPix("59", nome || "CONECTA COMERCIO") +
    campoPix("60", cidadeLimpa || "IVATUBA") +
    campoPix("62", campoPix("05", "***"));
  payload += "6304";
  return payload + crc16Pix(payload);
}

// Editor compacto de horário de funcionamento, reutilizado no cadastro da
// empresa (admin) e no perfil do próprio empresário.
function EditorHorarioSemana({ valor, onChange }) {
  const dados = valor && Object.keys(valor).length > 0 ? valor : horarioFuncionamentoVazio();
  const atualizarDia = (chave, campo, novoValor) => {
    onChange({ ...dados, [chave]: { ...dados[chave], [campo]: novoValor } });
  };
  return (
    <div className="flex flex-col gap-1.5">
      {DIAS_SEMANA.filter((d) => d.chave !== "dom").concat(DIAS_SEMANA.filter((d) => d.chave === "dom")).map((d) => {
        const cfg = dados[d.chave] || { aberto: false, abre: "", fecha: "" };
        return (
          <div key={d.chave} className="flex items-center gap-2 flex-wrap">
            <label className="font-body text-xs font-semibold flex items-center gap-1.5 w-24 shrink-0 cursor-pointer" style={{ color: "#425A70" }}>
              <input type="checkbox" checked={!!cfg.aberto} onChange={(e) => atualizarDia(d.chave, "aberto", e.target.checked)} />
              {d.label}
            </label>
            {cfg.aberto && (
              <>
                <input type="time" value={cfg.abre || ""} onChange={(e) => atualizarDia(d.chave, "abre", e.target.value)}
                  className="font-body text-xs border rounded-lg px-2 py-1 outline-none" style={{ borderColor: C.line }} />
                <span className="font-body text-xs" style={{ color: "#8896A6" }}>às</span>
                <input type="time" value={cfg.fecha || ""} onChange={(e) => atualizarDia(d.chave, "fecha", e.target.value)}
                  className="font-body text-xs border rounded-lg px-2 py-1 outline-none" style={{ borderColor: C.line }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Aplica a cor principal do site nas variáveis CSS globais — chamado assim
// que a configuração de identidade visual é carregada (ou salva pelo admin).
function aplicarCorPrincipal(hex) {
  if (!hex) return;
  document.documentElement.style.setProperty("--cor-principal", hex);
  document.documentElement.style.setProperty("--cor-principal-escura", escurecerCor(hex, 0.32));
  document.documentElement.style.setProperty("--cor-principal-profunda", escurecerCor(hex, 0.55));
}

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
.font-display { font-family: 'Manrope', sans-serif; }
.font-body { font-family: 'Inter', sans-serif; }

@keyframes stamp-in { 0% { transform: scale(1.4) rotate(-14deg); opacity: 0 } 60% { transform: scale(0.94) rotate(-8deg); opacity: 1 } 100% { transform: scale(1) rotate(-8deg); opacity: 1 } }
.stamp { animation: stamp-in 0.9s cubic-bezier(.2,.8,.2,1) both; }

@keyframes float-blob {
  0%, 100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(34px,-26px) scale(1.08); }
  66% { transform: translate(-24px,20px) scale(0.94); }
}
.blob { filter: blur(70px); animation: float-blob 12s ease-in-out infinite; }
.blob-b { animation-duration: 15s; animation-delay: -4s; }
.blob-c { animation-duration: 18s; animation-delay: -8s; }

.grad-text {
  background: linear-gradient(95deg, #ffffff 10%, #BFE0FF 55%, #ffffff 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  background-size: 200% auto; animation: sheen 6s linear infinite;
}
@keyframes sheen { to { background-position: 200% center; } }

@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee-track { animation: marquee 32s linear infinite; width: max-content; }

@keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(0.6); } }
.pulse-dot { animation: pulse-dot 1.7s ease-in-out infinite; }

@keyframes ring-pulse { 0% { box-shadow: 0 0 0 0 rgba(232,162,61,0.55); } 100% { box-shadow: 0 0 0 14px rgba(232,162,61,0); } }
.ring-pulse { animation: ring-pulse 2.2s ease-out infinite; }

/* Foco visível pra quem navega pelo teclado (Tab) — sem mudar nada pra
   quem usa o mouse, já que :focus-visible só ativa no teclado. */
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible,
textarea:focus-visible, [tabindex]:focus-visible {
  outline: 2.5px solid #0A5AA8;
  outline-offset: 2px;
  border-radius: 4px;
}

.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

@keyframes skeleton-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
.skeleton-pulse {
  background-image: linear-gradient(90deg, #EAF0F7 0px, #F6F9FC 40px, #EAF0F7 80px);
  background-size: 400px 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes toast-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
.toast-in { animation: toast-in .25s cubic-bezier(.2,.8,.2,1) both; }

.glow-card { transition: transform .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s ease, border-color .4s ease; }
.glow-card:hover { transform: translateY(-6px); box-shadow: 0 26px 50px -18px rgba(10,90,168,0.38); border-color: rgba(10,90,168,0.35); }

.glow-btn { transition: transform .25s ease, box-shadow .25s ease; }
.glow-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -10px rgba(232,162,61,0.55); }


@keyframes hero-in-left { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes hero-in-right { from { opacity: 0; transform: scale(0.92) rotate(-4deg); } to { opacity: 1; transform: scale(1) rotate(-8deg); } }
.hero-in-left { animation: hero-in-left .9s cubic-bezier(.2,.8,.2,1) both; }
.hero-in-right { animation: hero-in-right 1s cubic-bezier(.2,.8,.2,1) .15s both; }

@keyframes promo-slide-in { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }
.promo-slide { animation: promo-slide-in .5s cubic-bezier(.2,.8,.2,1) both; }

@keyframes grid-drift { from { background-position: 0 0; } to { background-position: 48px 48px; } }
.tech-grid {
  background-image: linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px);
  background-size: 24px 24px;
  animation: grid-drift 6s linear infinite;
}

@keyframes scan-sweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
.scan-line { animation: scan-sweep 3.2s cubic-bezier(.4,0,.2,1) infinite; }

@keyframes price-pop { 0% { transform: scale(0.85); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
.price-pop { animation: price-pop .5s cubic-bezier(.2,.8,.2,1) both; }

@keyframes page-transition-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.page-transition { animation: page-transition-in .35s cubic-bezier(.2,.8,.2,1) both; }

.nav-link { position: relative; transition: color .2s ease; }
.nav-link::after { content: ""; position: absolute; left: 0; bottom: -4px; width: 0; height: 2px; border-radius: 2px; background: currentColor; transition: width .25s cubic-bezier(.2,.8,.2,1); }
.nav-link:hover { color: #0A5AA8 !important; }
.nav-link:hover::after { width: 100%; }

@keyframes mobile-menu-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.mobile-menu-in { animation: mobile-menu-in .25s cubic-bezier(.2,.8,.2,1) both; }

@media (prefers-reduced-motion: reduce) {
  .blob, .marquee-track, .pulse-dot, .ring-pulse, .grad-text, .stamp, .promo-slide, .tech-grid, .scan-line, .price-pop, .hero-in-left, .hero-in-right, .page-transition, .nav-link::after, .mobile-menu-in { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
}
`;

// ---------------------------------------------------------------------------
// Motion helpers
// ---------------------------------------------------------------------------
function Reveal({ children, delay = 0, className = "" }) {
  const reduzMovimento = useReducedMotion();
  if (reduzMovimento) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedNumber({ value, duration = 1400, suffix = "" }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let raf, start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, value, duration]);
  return <span ref={ref}>{n}{suffix}</span>;
}

const atividades = [
  "🔥 Padaria Pão Nosso recebeu uma avaliação 5 estrelas",
  "🛍️ Mercado Bom Preço publicou uma nova promoção",
  "💼 Nova vaga aberta: Atendente de loja",
  "📍 Alguém favoritou o Espaço Bella agora",
  "✅ Doceria Sabor & Arte foi aprovada na plataforma",
  "🎓 Turma nova na Sala do Empreendedor com vagas abertas",
  "📈 TechIva teve 8 visualizações na última hora",
];

// ---------------------------------------------------------------------------
// Mock data — sabor local de Ivatuba/PR
// ---------------------------------------------------------------------------
const categorias = [
  { nome: "Alimentação", icon: Utensils, count: 38 },
  { nome: "Moda & Vestuário", icon: Shirt, count: 21 },
  { nome: "Serviços", icon: Wrench, count: 47 },
  { nome: "Saúde & Bem-estar", icon: Stethoscope, count: 19 },
  { nome: "Beleza", icon: Scissors, count: 24 },
  { nome: "Tecnologia", icon: Laptop, count: 12 },
  { nome: "Construção", icon: Hammer, count: 16 },
  { nome: "Mercado & Varejo", icon: Store, count: 29 },
];

// Ícones disponíveis pra categoria — o admin escolhe pelo nome, e a gente
// resolve pro componente de ícone de verdade na hora de desenhar.
const ICONES_CATEGORIA = [
  { nome: "Utensils", Icon: Utensils, label: "Alimentação" },
  { nome: "Shirt", Icon: Shirt, label: "Moda" },
  { nome: "Wrench", Icon: Wrench, label: "Serviços" },
  { nome: "Stethoscope", Icon: Stethoscope, label: "Saúde" },
  { nome: "Scissors", Icon: Scissors, label: "Beleza" },
  { nome: "Laptop", Icon: Laptop, label: "Tecnologia" },
  { nome: "Hammer", Icon: Hammer, label: "Construção" },
  { nome: "Store", Icon: Store, label: "Mercado & Varejo" },
  { nome: "Leaf", Icon: Leaf, label: "Agricultura" },
  { nome: "Tag", Icon: Tag, label: "Outra" },
];
const resolverIconeCategoria = (nome) => (ICONES_CATEGORIA.find((i) => i.nome === nome) || ICONES_CATEGORIA[ICONES_CATEGORIA.length - 1]).Icon;

// Hook reutilizado nos formulários e na home: busca as categorias reais
// (ativas, em ordem) e cai pras categorias de exemplo enquanto não existir
// nenhuma cadastrada de verdade.
function useCategoriasReais() {
  const [categoriasReais, setCategoriasReais] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("categorias").select("*").eq("ativa", true).order("ordem")
      .then(({ data, error }) => { if (!error && data && data.length > 0) setCategoriasReais(data); });
  }, []);
  return categoriasReais;
}

// "Editor rico" leve pro conteúdo de notícias: sem depender de nenhuma
// biblioteca, interpreta **negrito**, *itálico* e ## título por linha, e
// preserva as quebras de linha normais como parágrafos.
function renderizarConteudoNoticia(texto) {
  if (!texto) return null;
  return texto.split("\n").filter((linha) => linha.trim() !== "").map((linha, i) => {
    if (linha.trim().startsWith("## ")) {
      return <p key={i} className="font-display font-bold text-base mt-3 mb-1" style={{ color: C.ink }}>{linha.trim().slice(3)}</p>;
    }
    const partes = linha.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
    return (
      <p key={i} className="font-body text-sm leading-relaxed mb-2" style={{ color: "#425A70" }}>
        {partes.map((parte, j) => {
          if (parte.startsWith("**") && parte.endsWith("**")) return <strong key={j}>{parte.slice(2, -2)}</strong>;
          if (parte.startsWith("*") && parte.endsWith("*")) return <em key={j}>{parte.slice(1, -1)}</em>;
          return <span key={j}>{parte}</span>;
        })}
      </p>
    );
  });
}

const empresas = [
  { nome: "Padaria Pão Nosso", cat: "Alimentação", bairro: "Centro", cidade: "Ivatuba", itens: 16, cartaoServidor: false, rating: 4.8 },
  { nome: "Auto Peças Ivatuba", cat: "Serviços", bairro: "Vila Nova", cidade: "Ivatuba", itens: 12, cartaoServidor: false, rating: 4.6 },
  { nome: "Salão Espaço Bella", cat: "Beleza", bairro: "Centro", cidade: "Ivatuba", itens: 3, cartaoServidor: true, rating: 4.9 },
  { nome: "Mercado Bom Preço", cat: "Mercado & Varejo", bairro: "Jardim Primavera", cidade: "Ivatuba", itens: 27, cartaoServidor: true, rating: 4.5 },
  { nome: "Assist. Téc. TechIva", cat: "Tecnologia", bairro: "Centro", cidade: "Ivatuba", itens: 8, cartaoServidor: false, rating: 4.7 },
  { nome: "Materiais Const. Rocha", cat: "Construção", bairro: "Vila Nova", cidade: "Ivatuba", itens: 21, cartaoServidor: false, rating: 4.4 },
];

const produtos = [
  { nome: "Cesta de pães artesanais", preco: "R$ 24,90", empresa: "Padaria Pão Nosso", cat: "Alimentação" },
  { nome: "Corte + escova", preco: "R$ 45,00", empresa: "Espaço Bella", cat: "Beleza" },
  { nome: "Troca de óleo completa", preco: "R$ 89,90", empresa: "Auto Peças Ivatuba", cat: "Serviços" },
  { nome: "Kit ferramentas 45 peças", preco: "R$ 139,90", empresa: "Materiais Rocha", cat: "Construção" },
];

const vagas = [
  { cargo: "Atendente de loja", empresa: "Mercado Bom Preço", cidade: "Ivatuba - PR", salario: "R$ 1.518,00" },
  { cargo: "Auxiliar de padeiro", empresa: "Padaria Pão Nosso", cidade: "Ivatuba - PR", salario: "R$ 1.650,00" },
  { cargo: "Técnico em manutenção", empresa: "TechIva", cidade: "Ivatuba - PR", salario: "A combinar" },
];

const depoimentos = [
  {
    nome: "Ana Cláudia",
    papel: "Dona da Padaria Pão Nosso",
    texto: "Desde que entrei no Conecta Comércio, apareço pra muito mais gente da cidade. As vendas pelo WhatsApp aumentaram de verdade.",
  },
  {
    nome: "Roberto Lima",
    papel: "Materiais Const. Rocha",
    texto: "Consegui divulgar promoções sem gastar com anúncio. A plataforma é simples e o suporte responde rápido.",
  },
  {
    nome: "Juliana Freitas",
    papel: "Cliente de Ivatuba",
    texto: "Uso pra achar tudo perto de casa e ainda ajudo o comércio local. Ficou muito mais fácil encontrar quem presta serviço aqui.",
  },
];

const faqItens = [
  {
    pergunta: "Preciso pagar para usar o Conecta Comércio?",
    resposta: "Não. A navegação é livre para qualquer pessoa, sem cadastro. Cadastrar uma empresa, um serviço ou criar uma conta de cliente também é gratuito.",
  },
  {
    pergunta: "Como cadastro minha empresa ou serviço?",
    resposta: "Clique em \"Entrar / Cadastro\" no menu, escolha \"Tenho uma Empresa\" ou \"Sou Prestador de Serviço\" e preencha o formulário. Seu cadastro fica em análise até ser aprovado pelo administrador.",
  },
  {
    pergunta: "Quanto tempo leva para meu cadastro ser aprovado?",
    resposta: "Normalmente em até 1 dia útil. Assim que aprovado, você aparece automaticamente na vitrine do site.",
  },
  {
    pergunta: "Posso editar minhas informações depois?",
    resposta: "Sim. Empresários têm um painel próprio para editar dados, WhatsApp, Instagram e produtos a qualquer momento.",
  },
];

const promocoesDestaque = [
  { empresa: "Padaria Pão Nosso", produto: "Cesta de pães artesanais", precoOriginal: 32.9, precoPromo: 24.9, validoAte: "31/07" },
  { empresa: "Mercado Bom Preço", produto: "Combo churrasco (2kg carne + carvão)", precoOriginal: 89.9, precoPromo: 69.9, validoAte: "28/07" },
  { empresa: "Salão Espaço Bella", produto: "Corte + escova + hidratação", precoOriginal: 75, precoPromo: 55, validoAte: "02/08" },
  { empresa: "Auto Peças Ivatuba", produto: "Troca de óleo completa", precoOriginal: 119.9, precoPromo: 89.9, validoAte: "05/08" },
];

const feiraRegular = {
  dia: "Toda quinta-feira",
  horario: "16h às 20h",
  local: "Praça Central de Ivatuba",
};

const feirasEspeciais = [
  { titulo: "Feira Junina do Empreendedor", data: "15 e 16 de agosto", local: "Praça Central" },
  { titulo: "Feira de Natal", data: "13 de dezembro", local: "Praça Central" },
];

const servicosEmpreendedor = [
  {
    titulo: "Abrir e gerenciar o MEI",
    descricao: "Emita o DAS mensal, consulte débitos e regularize seu MEI (PGMEI).",
    icon: FileText,
    cor_hex: C.blue,
    logo_url: null,
    url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao",
  },
  {
    titulo: "Declaração Anual do MEI",
    descricao: "Envie a DASN-SIMEI, obrigatória todo ano para quem é MEI.",
    icon: ClipboardList,
    cor_hex: C.blue,
    logo_url: null,
    url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao",
  },
  {
    titulo: "Emitir Nota Fiscal (NFS-e)",
    descricao: "Emissor Nacional de Nota Fiscal de Serviço eletrônica.",
    icon: Receipt,
    cor_hex: C.blue,
    logo_url: null,
    url: "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional",
  },
  {
    titulo: "Parcelar débitos do Simples",
    descricao: "Solicite ou acompanhe parcelamento de débitos do Simples Nacional.",
    icon: HandCoins,
    cor_hex: C.blue,
    logo_url: null,
    url: "https://www8.receita.fazenda.gov.br/simplesnacional/servicos/grupo.aspx?grp=14",
  },
  {
    titulo: "Empréstimo ao Empreendedor",
    descricao: "Linhas de crédito da Fomento Paraná: microcrédito, capital de giro, máquinas e mais.",
    icon: Landmark,
    cor_hex: C.amber,
    logo_url: null,
    url: "https://www.fomento.pr.gov.br/Linhas-de-Credito",
  },
];

const cursos = [
  { titulo: "Formalização do MEI na prática", data: "12 AGO", local: "Sala do Empreendedor" },
  { titulo: "Vendas pelo WhatsApp e redes sociais", data: "20 AGO", local: "Sebrae Maringá" },
  { titulo: "Gestão financeira para pequenos negócios", data: "03 SET", local: "Sala do Empreendedor" },
];

const noticias = [
  { titulo: "Sala do Empreendedor amplia horário de atendimento", data: "22 jul" },
  { titulo: "Feira do Produtor Local acontece neste sábado", data: "18 jul" },
  { titulo: "Cartão do Servidor passa a valer em mais 12 comércios", data: "14 jul" },
];

// ---------------------------------------------------------------------------
// UI bits
// ---------------------------------------------------------------------------
function LogoMark({ size = 40, iconSize, url }) {
  if (url) {
    return (
      <span className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
        <img loading="lazy" decoding="async" src={url} alt="Logo" className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(180deg, #3EC0F0 0%, #3EC0F0 45%, ${C.blueDeep} 45%, ${C.blueDeep} 100%)` }}
    >
      <Handshake size={iconSize || Math.round(size * 0.52)} color="#fff" />
    </span>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-[2px] w-6" style={{ background: C.amber }} />
      <span className="font-display text-xs font-bold tracking-[0.16em] uppercase" style={{ color: C.blue }}>
        {children}
      </span>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub, linkLabel, onLinkClick }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-display text-2xl md:text-[28px] font-extrabold" style={{ color: C.ink }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1" style={{ color: "#5C7186" }}>{sub}</p>}
      </div>
      {linkLabel && (
        <button type="button" onClick={onLinkClick} className="font-body flex items-center gap-1 text-sm font-semibold shrink-0" style={{ color: C.blue }}>
          {linkLabel} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

// Bloco cinza com "brilho" passando por cima — usado nos lugares que
// carregam dados do banco, no lugar de deixar a tela em branco/vazia.
function Skeleton({ className = "", style = {} }) {
  return (
    <div className={`skeleton-pulse rounded-lg ${className}`} style={{ background: "#EAF0F7", ...style }} />
  );
}

// Pilha de avisos rápidos (toasts) no canto da tela — some sozinha depois
// de alguns segundos. Usada pra confirmar ações que antes eram silenciosas
// (aprovar, recusar, ativar/inativar, excluir, check-in).
function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[80] flex flex-col gap-2 items-center sm:items-end px-3 sm:px-0 w-full sm:w-auto">
      {toasts.map((t) => (
        <div key={t.id} className="toast-in flex items-center gap-2 rounded-xl px-4 py-3 shadow-xl font-body text-sm font-semibold max-w-sm"
          style={{
            background: t.tipo === "erro" ? "#B4462F" : t.tipo === "aviso" ? "#C6811F" : C.blueDeep,
            color: "#fff",
          }}>
          {t.tipo === "erro" ? <X size={15} className="shrink-0" /> : <CheckCircle2 size={15} className="shrink-0" />}
          {t.mensagem}
        </div>
      ))}
    </div>
  );
}

function CategoryCard({ cat, onClick }) {
  const Icon = cat.icon || resolverIconeCategoria(cat.icone);
  const cor = cat.cor || C.blue;
  return (
    <button type="button" onClick={onClick} className="glow-card group flex flex-col items-start gap-3 p-4 rounded-2xl border text-left"
      style={{ borderColor: C.line, background: "#fff" }}>
      <span className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
        style={{ background: `${cor}1a`, color: cor }}>
        <Icon size={20} />
      </span>
      <div>
        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{cat.nome}</p>
        {cat.count !== undefined && <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>{cat.count} empresas</p>}
      </div>
    </button>
  );
}

function EmpresaCard({ e, fav, onFav, onAbrir }) {
  const linkWhats = e.whatsapp ? `https://wa.me/55${String(e.whatsapp).replace(/\D/g, "")}` : null;
  return (
    <div className="glow-card rounded-2xl border overflow-hidden bg-white flex flex-col" style={{ borderColor: C.line }}>
      <button type="button" onClick={onAbrir} className="h-24 relative flex items-center justify-center overflow-hidden w-full text-left" style={{ background: e.banner_url ? undefined : `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})` }}>
        {e.banner_url ? (
          <img loading="lazy" decoding="async" src={e.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Building2 className="text-white/90" size={30} />
        )}
        <span onClick={(ev) => { ev.stopPropagation(); onFav(); }} className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center" role="button" tabIndex={0} aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={fav}>
          <Heart size={15} fill={fav ? C.amber : "none"} color={fav ? C.amber : C.blueDark} />
        </span>
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/95 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ color: C.amberDark }}>
          <Star size={11} fill={C.amber} color={C.amber} /> {e.rating}
        </span>
        {e.destaque && (
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ background: C.amber, color: C.blueDeep }}>
            Destaque
          </span>
        )}
        {patrocinadoAtivo(e) && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ background: "rgba(255,255,255,0.95)", color: "#425A70" }}>
            <Sparkles size={10} /> Patrocinado
          </span>
        )}
      </button>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <button type="button" onClick={onAbrir} className="text-left">
          <p className="font-display font-bold text-sm leading-snug flex items-center gap-1" style={{ color: C.ink }}>
            {e.nome}
            {e.verificada && <BadgeCheck size={14} color={C.blue} aria-label="Comerciante verificado" />}
          </p>
        </button>
        <p className="font-body text-xs flex items-center gap-1" style={{ color: "#5C7186" }}>
          <MapPin size={11} /> {e.bairro}, {e.cidade}
        </p>
        <p className="font-body text-xs" style={{ color: "#5C7186" }}>{e.itens} {e.itens === 1 ? "item ativo" : "itens ativos"}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mt-0.5" style={{ background: e.regiao === "bairro_refugio" ? "#F3E8FF" : C.blueTint, color: e.regiao === "bairro_refugio" ? "#7C3AED" : C.blue }}>
            <MapPin size={11} /> {e.regiao === "bairro_refugio" ? "Bairro do Refúgio" : "Ivatuba"}
          </span>
          {planoPremiumAtivo(e) && (
            <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mt-0.5 text-white" style={{ background: "linear-gradient(120deg, #C6811F, #E8A23D)" }}>
              <Sparkles size={11} /> Premium
            </span>
          )}
          {e.verificada && (
            <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mt-0.5" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>
              <BadgeCheck size={11} /> Comerciante verificado
            </span>
          )}
          {(e.cartaoServidor || e.aceita_cartao_servidor) && (
            <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mt-0.5" style={{ background: C.blueTint, color: C.blue }}>
              <BadgeCheck size={11} /> Aceita Cartão do Servidor
            </span>
          )}
          {estaAbertaAgora(e.horario_funcionamento) === true && (
            <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mt-0.5" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>
              <Clock size={11} /> Aberto agora
            </span>
          )}
          {estaAbertaAgora(e.horario_funcionamento) === false && (
            <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mt-0.5" style={{ background: "#FBEAE5", color: "#B4462F" }}>
              <Clock size={11} /> Fechado agora
            </span>
          )}
        </div>
        {e.instagram && (
          <a
            href={`https://instagram.com/${String(e.instagram).replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
            onClick={(ev) => ev.stopPropagation()}
            className="w-fit flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] font-bold font-body mt-0.5 text-white"
            style={{ background: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)" }}
          >
            <Instagram size={12} /> Vitrine no Instagram
          </a>
        )}
        {(e.facebook || e.site) && (
          <div className="flex gap-2 mt-0.5">
            {e.facebook && <a href={e.facebook} target="_blank" rel="noreferrer" className="font-body text-[11px] font-semibold" style={{ color: C.blue }}>Facebook</a>}
            {e.site && <a href={e.site} target="_blank" rel="noreferrer" className="font-body text-[11px] font-semibold" style={{ color: C.blue }}>Site</a>}
          </div>
        )}
        <div className="mt-auto flex gap-2 pt-2">
          <a href={linkWhats || "#"} target={linkWhats ? "_blank" : undefined} rel="noreferrer" className="glow-btn flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold font-body text-white"
            style={{ background: "#25A85B", opacity: linkWhats ? 1 : 0.5 }}>
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a href={e.google_maps_url || "#"} target={e.google_maps_url ? "_blank" : undefined} rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold font-body border"
            style={{ borderColor: C.line, color: C.blue, opacity: e.google_maps_url ? 1 : 0.5 }}>
            <MapPin size={14} /> Ver Mapa
          </a>
        </div>
      </div>
    </div>
  );
}

// Ficha completa da empresa — galeria, redes, e avaliações/comentários do
// público (nota em estrelas + comentário, com resposta do comerciante).
function ModalPerfilEmpresa({ empresa, onFechar }) {
  const [avaliacoes, setAvaliacoes] = useState(null);
  const [cupons, setCupons] = useState(null);
  const [cupomRevelado, setCupomRevelado] = useState({});

  useEffect(() => {
    if (!supabaseConfigurado || !empresa?.id) { setCupons([]); return; }
    supabase.from("cupons").select("*").eq("empresa_id", empresa.id).eq("ativo", true)
      .order("criado_em", { ascending: false }).then(({ data, error }) => setCupons(error ? [] : data || []));
  }, [empresa?.id]);

  // Combos e promoções combinadas, produtos ativos (pro catálogo em PDF) e
  // cartão fidelidade — tudo do FASE 37, mostrado no perfil público.
  const [combos, setCombos] = useState(null);
  const [produtosEmpresa, setProdutosEmpresa] = useState(null);
  const [fidelidadeInfo, setFidelidadeInfo] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado || !empresa?.id) { setCombos([]); setProdutosEmpresa([]); setFidelidadeInfo(null); return; }
    supabase.from("combos").select("*").eq("empresa_id", empresa.id).eq("ativo", true)
      .order("criado_em", { ascending: false }).then(({ data, error }) => setCombos(error ? [] : data || []));
    supabase.from("produtos").select("*").eq("empresa_id", empresa.id).eq("ativo", true)
      .order("criado_em", { ascending: false }).then(({ data, error }) => setProdutosEmpresa(error ? [] : data || []));
    supabase.from("fidelidade_config").select("*").eq("empresa_id", empresa.id).eq("ativo", true)
      .maybeSingle().then(({ data }) => setFidelidadeInfo(data || null));
  }, [empresa?.id]);

  const baixarCatalogoPublicoPDF = () => {
    const linhas = (produtosEmpresa || []).map((p) => `
      <div class="item">
        ${p.foto_url ? `<img src="${p.foto_url}" />` : `<div class="semfoto"></div>`}
        <div>
          <p class="nome">${p.nome}</p>
          ${p.descricao ? `<p class="desc">${p.descricao}</p>` : ""}
          <p class="preco">${p.preco ? `R$ ${Number(p.preco).toFixed(2).replace(".", ",")}` : ""}</p>
        </div>
      </div>`).join("");
    const janela = window.open("", "_blank");
    janela.document.write(`
      <html><head><title>Catálogo — ${empresa.nome}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0E2233}
        h1{font-size:20px;margin-bottom:4px}
        p.sub{color:#5C7186;font-size:12px;margin-top:0;margin-bottom:20px}
        .item{display:flex;gap:12px;align-items:center;border-bottom:1px solid #E4EAF0;padding:10px 0}
        .item img{width:56px;height:56px;object-fit:cover;border-radius:8px}
        .semfoto{width:56px;height:56px;border-radius:8px;background:#EAF2FA}
        .nome{font-weight:bold;font-size:13px;margin:0}
        .desc{font-size:11px;color:#5C7186;margin:2px 0}
        .preco{font-size:12px;font-weight:bold;color:#0A5AA8;margin:2px 0 0}
        @media print{body{padding:0}}
      </style></head>
      <body>
        <h1>${empresa.nome}</h1>
        <p class="sub">Catálogo gerado pelo Conecta Comércio</p>
        ${linhas || "<p>Nenhum produto ativo no momento.</p>"}
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    janela.document.close();
  };
  const [nomeAvaliador, setNomeAvaliador] = useState("");
  const [notaAvaliacao, setNotaAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado || !empresa?.id) { setAvaliacoes([]); return; }
    supabase.from("avaliacoes").select("*").eq("empresa_id", empresa.id).eq("status", "aprovado")
      .order("criado_em", { ascending: false }).then(({ data, error }) => {
        setAvaliacoes(error ? [] : data || []);
      });
  }, [empresa?.id]);

  const mediaAvaliacoes = avaliacoes && avaliacoes.length > 0
    ? (avaliacoes.reduce((s, a) => s + (a.nota || 0), 0) / avaliacoes.length).toFixed(1)
    : null;

  const enviarAvaliacao = async (e) => {
    e.preventDefault();
    setErroAvaliacao("");
    if (!nomeAvaliador.trim() || !comentarioAvaliacao.trim()) { setErroAvaliacao("Preencha seu nome e o comentário."); return; }
    if (!supabaseConfigurado) { setAvaliacaoEnviada(true); return; }
    setEnviandoAvaliacao(true);
    try {
      const { data, error } = await supabase.from("avaliacoes").insert({
        empresa_id: empresa.id, nome: nomeAvaliador, nota: notaAvaliacao, comentario: comentarioAvaliacao, status: "aprovado",
      }).select().single();
      if (error) throw error;
      setAvaliacoes((atual) => [data, ...(atual || [])]);
      setAvaliacaoEnviada(true);
      setNomeAvaliador("");
      setComentarioAvaliacao("");
    } catch (err) {
      setErroAvaliacao(err.message || "Não consegui enviar agora. Tente de novo.");
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const linkWhats = empresa.whatsapp ? `https://wa.me/55${String(empresa.whatsapp).replace(/\D/g, "")}` : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="h-32 relative overflow-hidden" style={{ background: empresa.banner_url ? undefined : `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})` }}>
          {empresa.banner_url ? <img loading="lazy" decoding="async" src={empresa.banner_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="text-white/90 mx-auto mt-10" size={30} />}
          <button onClick={onFechar} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center" aria-label="Fechar">
            <X size={16} color="#425A70" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="font-display font-extrabold text-lg flex items-center gap-1.5" style={{ color: C.ink }}>
              {empresa.nome}
              {empresa.verificada && <BadgeCheck size={16} color={C.blue} />}
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>{empresa.cat} · {empresa.bairro}, {empresa.cidade}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {planoPremiumAtivo(empresa) && (
                <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body text-white" style={{ background: "linear-gradient(120deg, #C6811F, #E8A23D)" }}>
                  <Sparkles size={11} /> Premium
                </span>
              )}
              {empresa.verificada && (
                <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>
                  <BadgeCheck size={11} /> Comerciante verificado
                </span>
              )}
              {(empresa.cartaoServidor || empresa.aceita_cartao_servidor) && (
                <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ background: C.blueTint, color: C.blue }}>
                  <BadgeCheck size={11} /> Aceita Cartão do Servidor
                </span>
              )}
              {mediaAvaliacoes && (
                <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                  <Star size={11} fill="#E8A23D" color="#E8A23D" /> {mediaAvaliacoes} ({avaliacoes.length})
                </span>
              )}
              {resumoHorarioHoje(empresa.horario_funcionamento) && (
                <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body"
                  style={{ background: estaAbertaAgora(empresa.horario_funcionamento) ? "#E7F6EE" : "#FBEAE5", color: estaAbertaAgora(empresa.horario_funcionamento) ? "#1E8E5A" : "#B4462F" }}>
                  <Clock size={11} /> {resumoHorarioHoje(empresa.horario_funcionamento)}
                </span>
              )}
            </div>
          </div>

          {empresa.fotos_urls?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {empresa.fotos_urls.map((url, i) => (
                <img key={i} loading="lazy" decoding="async" src={url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 border" style={{ borderColor: C.line }} />
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {linkWhats && (
              <a href={linkWhats} target="_blank" rel="noreferrer" className="glow-btn flex items-center justify-center gap-1.5 rounded-lg py-2 px-4 text-xs font-bold font-body text-white" style={{ background: "#25A85B" }}>
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            {empresa.google_maps_url && (
              <a href={empresa.google_maps_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-4 text-xs font-bold font-body border" style={{ borderColor: C.line, color: C.blue }}>
                <MapPin size={13} /> Ver mapa
              </a>
            )}
            {empresa.instagram && (
              <a href={`https://instagram.com/${String(empresa.instagram).replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-4 text-xs font-bold font-body border" style={{ borderColor: C.line, color: C.blue }}>
                <Instagram size={13} /> Instagram
              </a>
            )}
          </div>

          {horarioFuncionamentoCadastrado(empresa.horario_funcionamento) && (
            <div className="rounded-xl border p-3" style={{ borderColor: C.line }}>
              <p className="font-body text-[11px] font-bold mb-1.5 flex items-center gap-1.5" style={{ color: C.ink }}><Clock size={12} /> Horário de funcionamento</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {DIAS_SEMANA.map((d) => {
                  const cfg = empresa.horario_funcionamento[d.chave];
                  return (
                    <p key={d.chave} className="font-body text-[11px]" style={{ color: "#5C7186" }}>
                      {d.label}: {cfg?.aberto && cfg.abre && cfg.fecha ? `${cfg.abre} às ${cfg.fecha}` : "fechado"}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {cupons && cupons.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Cupons de desconto</p>
              {cupons.map((c) => (
                <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: C.amber, background: "#FFF9EE" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-body text-xs font-bold" style={{ color: "#8A5A12" }}>{c.titulo}</p>
                      {c.descricao && <p className="font-body text-[11px] mt-0.5" style={{ color: "#8A5A12" }}>{c.descricao}</p>}
                    </div>
                    {!cupomRevelado[c.id] ? (
                      <button onClick={() => setCupomRevelado((r) => ({ ...r, [c.id]: true }))} className="font-body text-[11px] font-bold rounded-lg px-3 py-1.5 shrink-0" style={{ background: C.amber, color: C.blueDeep }}>
                        Ver cupom
                      </button>
                    ) : (
                      <span className="font-body text-xs font-extrabold px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: "#fff", color: "#8A5A12", border: "1px dashed #E8A23D" }}>
                        {c.codigo}
                      </span>
                    )}
                  </div>
                  {cupomRevelado[c.id] && (
                    <p className="font-body text-[10px] mt-1.5" style={{ color: "#8A5A12" }}>Mostre esse código na loja pra resgatar.{c.validade && ` Válido até ${c.validade.split("-").reverse().join("/")}.`}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {combos && combos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Combos e promoções</p>
              {combos.map((c) => (
                <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body text-xs font-bold" style={{ color: C.ink }}>{c.titulo}</p>
                    {c.preco && <span className="font-body text-xs font-extrabold shrink-0" style={{ color: C.blue }}>R$ {Number(c.preco).toFixed(2).replace(".", ",")}</span>}
                  </div>
                  {c.descricao && <p className="font-body text-[11px] mt-0.5" style={{ color: "#5C7186" }}>{c.descricao}</p>}
                </div>
              ))}
            </div>
          )}

          {fidelidadeInfo && (
            <div className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: C.blue, background: C.blueTint2 }}>
              <BadgeCheck size={16} color={C.blue} />
              <p className="font-body text-xs" style={{ color: "#425A70" }}>
                <span className="font-bold">Cartão fidelidade:</span> a cada {fidelidadeInfo.meta_carimbos} compras{fidelidadeInfo.recompensa ? `, ganhe ${fidelidadeInfo.recompensa.toLowerCase()}` : ""}. Peça pra loja marcar seu carimbo.
              </p>
            </div>
          )}

          {produtosEmpresa && produtosEmpresa.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Produtos ({produtosEmpresa.length})</p>
                <button onClick={baixarCatalogoPublicoPDF} className="font-body text-[11px] font-bold rounded-lg px-2.5 py-1.5 border flex items-center gap-1" style={{ borderColor: C.line, color: "#425A70" }}>
                  <FileText size={12} /> Catálogo em PDF
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {produtosEmpresa.slice(0, 6).map((p) => (
                  <div key={p.id} className="rounded-lg border p-2 flex items-center gap-2" style={{ borderColor: C.line }}>
                    {p.foto_url ? (
                      <img loading="lazy" decoding="async" src={p.foto_url} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-md shrink-0" style={{ background: C.blueTint }} />
                    )}
                    <div className="min-w-0">
                      <p className="font-body text-[11px] font-bold truncate" style={{ color: C.ink }}>{p.nome}</p>
                      {p.preco && <p className="font-body text-[10px]" style={{ color: C.blue }}>R$ {Number(p.preco).toFixed(2).replace(".", ",")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t" style={{ borderColor: C.line }}>
            <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Avaliações {avaliacoes ? `(${avaliacoes.length})` : ""}</p>

            {avaliacoes === null && <Skeleton className="w-full h-16" />}

            {avaliacoes && avaliacoes.length === 0 && (
              <p className="font-body text-xs mb-3" style={{ color: "#5C7186" }}>Ainda não tem avaliações — seja o primeiro a comentar.</p>
            )}

            <div className="flex flex-col gap-3 mb-4">
              {(avaliacoes || []).map((a) => (
                <div key={a.id} className="rounded-xl border p-3" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <p className="font-body text-xs font-bold" style={{ color: C.ink }}>{a.nome}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={11} fill={n <= a.nota ? "#E8A23D" : "none"} color="#E8A23D" />)}
                    </div>
                  </div>
                  {a.comentario && <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{a.comentario}</p>}
                  {a.resposta_comerciante && (
                    <div className="mt-2 rounded-lg px-2.5 py-2" style={{ background: C.blueTint2 }}>
                      <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>Resposta do comerciante</p>
                      <p className="font-body text-[11px]" style={{ color: "#425A70" }}>{a.resposta_comerciante}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {avaliacaoEnviada ? (
              <p className="font-body text-xs font-semibold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
                <CheckCircle2 size={14} /> Obrigado pela avaliação!
              </p>
            ) : (
              <form onSubmit={enviarAvaliacao} className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: C.line }}>
                <p className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>Deixe sua avaliação</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setNotaAvaliacao(n)} aria-label={`${n} estrelas`}>
                      <Star size={18} fill={n <= notaAvaliacao ? "#E8A23D" : "none"} color="#E8A23D" />
                    </button>
                  ))}
                </div>
                <input value={nomeAvaliador} onChange={(e) => setNomeAvaliador(e.target.value)} placeholder="Seu nome"
                  className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                <textarea value={comentarioAvaliacao} onChange={(e) => setComentarioAvaliacao(e.target.value)} rows={2} placeholder="Conte como foi sua experiência..."
                  className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                {erroAvaliacao && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erroAvaliacao}</p>}
                <button type="submit" disabled={enviandoAvaliacao} className="font-body text-xs font-bold rounded-lg py-2.5 text-white disabled:opacity-60" style={{ background: C.blue }}>
                  {enviandoAvaliacao ? "Enviando..." : "Enviar avaliação"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AvaliacaoPrestadorForm({ prestadorId, onEnviado }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) { setErro("Diga seu nome."); return; }
    setEnviando(true);
    const { error } = await supabase.from("avaliacoes").insert({
      prestador_id: prestadorId,
      nome: nome.trim(),
      nota,
      comentario: comentario.trim() || null,
      status: "aprovado",
    });
    setEnviando(false);
    if (error) { setErro(error.message || "Não consegui enviar agora."); return; }
    setNome(""); setNota(5); setComentario(""); setAberto(false);
    onEnviado?.();
  };

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="font-body text-xs font-bold flex items-center gap-1 mt-3" style={{ color: C.blue }}>
        <Star size={12} /> Avaliar / deixar depoimento
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-3 rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: C.line, background: C.blueTint2 }}>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setNota(n)}>
            <Star size={16} fill={n <= nota ? "#E8A23D" : "none"} color="#E8A23D" />
          </button>
        ))}
      </div>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="font-body text-xs border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte sua experiência (opcional)" rows={2} className="font-body text-xs border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
      {erro && <p className="font-body text-[11px]" style={{ color: "#B4462F" }}>{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="font-body text-xs font-bold rounded-lg px-4 py-2 text-white disabled:opacity-60" style={{ background: C.blue }}>
          {enviando ? "Enviando..." : "Enviar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="font-body text-xs font-bold rounded-lg px-4 py-2 border" style={{ borderColor: C.line, color: "#5C7186" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ModalDetalhePrestador({ p, onFechar, linkWhats, linkInsta, avaliacoes, onAvaliacaoEnviada }) {
  const media = avaliacoes.length ? avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length : 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.6)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <div className="h-44 relative overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})` }}>
          {p.foto_url ? (
            <img loading="lazy" decoding="async" src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Wrench size={40} className="text-white/90" /></div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,26,46,0.75), rgba(5,26,46,0) 55%)" }} />
          <button onClick={onFechar} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/90" aria-label="Fechar"><X size={16} color="#425A70" /></button>
          <div className="absolute left-5 bottom-4 right-5">
            <p className="font-display font-extrabold text-lg text-white">{p.nome}</p>
            <p className="font-body text-xs font-semibold text-white/85 mt-0.5">{p.servico}</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-3">
            {p.endereco && <span className="font-body text-xs flex items-center gap-1" style={{ color: "#8896A6" }}><MapPin size={12} /> {p.endereco}</span>}
            {p.google_maps_url && (
              <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold flex items-center gap-1" style={{ color: C.blue }}>
                <ExternalLink size={12} /> Ver no mapa
              </a>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            {linkWhats && (
              <a href={linkWhats} target="_blank" rel="noreferrer" className="glow-btn flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold font-body text-white" style={{ background: "#25A85B" }}>
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            {linkInsta && (
              <a href={linkInsta} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl py-3 px-4 text-sm font-bold font-body border" style={{ borderColor: C.line, color: C.blue }}>
                <Instagram size={15} />
              </a>
            )}
          </div>

          {avaliacoes.length > 0 && (
            <div className="mt-4 flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} fill={n <= Math.round(media) ? "#E8A23D" : "none"} color="#E8A23D" />)}
              </div>
              <span className="font-body text-xs" style={{ color: "#8896A6" }}>({avaliacoes.length} {avaliacoes.length === 1 ? "avaliação" : "avaliações"})</span>
            </div>
          )}
          {avaliacoes.slice(0, 3).map((a) => (
            <div key={a.id} className="mt-2 pl-2 border-l-2" style={{ borderColor: C.line }}>
              <p className="font-body text-xs font-bold" style={{ color: C.ink }}>{a.nome}</p>
              {a.comentario && <p className="font-body text-xs" style={{ color: "#5C7186" }}>{a.comentario}</p>}
            </div>
          ))}
          <AvaliacaoPrestadorForm prestadorId={p.id} onEnviado={onAvaliacaoEnviada} />
        </div>
      </div>
    </div>
  );
}

function PrestadorCard({ p, agendamentoAtivo, avaliacoes = [], onAvaliacaoEnviada }) {
  const linkWhats = p.whatsapp ? `https://wa.me/55${String(p.whatsapp).replace(/\D/g, "")}` : null;
  const linkInsta = p.instagram ? `https://instagram.com/${String(p.instagram).replace(/^@/, "")}` : null;
  const [agendaAberta, setAgendaAberta] = useState(false);
  const [detalheAberto, setDetalheAberto] = useState(false);
  return (
    <div className="glow-card rounded-2xl border overflow-hidden flex flex-col"
      style={{ borderColor: C.line, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)" }}>
      <button type="button" onClick={() => setDetalheAberto(true)} className="h-24 relative flex items-center justify-center overflow-hidden w-full text-left" style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})` }}>
        {p.foto_url ? (
          <img loading="lazy" decoding="async" src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
        ) : (
          <Wrench className="text-white/90" size={26} />
        )}
      </button>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <button type="button" onClick={() => setDetalheAberto(true)} className="text-left">
          <p className="font-display font-bold text-sm leading-snug" style={{ color: C.ink }}>{p.nome}</p>
          <p className="font-body text-xs font-semibold" style={{ color: C.blue }}>{p.servico}</p>
          {avaliacoes.length > 0 && (
            <span className="font-body text-[11px] flex items-center gap-1 mt-0.5" style={{ color: "#8896A6" }}>
              <Star size={11} fill="#E8A23D" color="#E8A23D" />
              {(avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)} ({avaliacoes.length})
            </span>
          )}
        </button>
        {p.endereco && (
          <p className="font-body text-xs flex items-center gap-1" style={{ color: "#5C7186" }}>
            <MapPin size={11} /> {p.endereco}
          </p>
        )}
        {agendamentoAtivo && (
          <button type="button" onClick={() => setAgendaAberta(true)} className="glow-btn font-body text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg py-2 border mt-1" style={{ borderColor: C.line, color: C.blue }}>
            <Clock size={13} /> Agendar horário
          </button>
        )}
        <div className="mt-auto flex gap-2 pt-2">
          {linkWhats && (
            <a href={linkWhats} target="_blank" rel="noreferrer" className="glow-btn flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold font-body text-white" style={{ background: "#25A85B" }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {linkInsta && (
            <a href={linkInsta} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold font-body border" style={{ borderColor: C.line, color: C.blue }}>
              <Instagram size={14} />
            </a>
          )}
        </div>
      </div>
      {agendaAberta && <ModalAgendarHorario prestador={p} onFechar={() => setAgendaAberta(false)} />}
      {detalheAberto && (
        <ModalDetalhePrestador p={p} onFechar={() => setDetalheAberto(false)} linkWhats={linkWhats} linkInsta={linkInsta}
          avaliacoes={avaliacoes} onAvaliacaoEnviada={onAvaliacaoEnviada} />
      )}
    </div>
  );
}

// Modal de agendamento — mostra os horários disponíveis (gerados pelo admin)
// de um prestador, o cliente escolhe um e reserva na hora. FASE 50.
function ModalAgendarHorario({ prestador, onFechar }) {
  const [slots, setSlots] = useState(null);
  const [slotEscolhido, setSlotEscolhido] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [reservando, setReservando] = useState(false);
  const [erro, setErro] = useState("");
  const [reservado, setReservado] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado || !prestador?.id) { setSlots([]); return; }
    supabase.from("prestador_agenda").select("id, data, hora").eq("prestador_id", prestador.id).eq("status", "disponivel")
      .order("data").order("hora").then(({ data, error }) => setSlots(error ? [] : data || []));
  }, [prestador?.id]);

  const slotsPorData = useMemo(() => {
    const mapa = {};
    (slots || []).forEach((s) => { (mapa[s.data] = mapa[s.data] || []).push(s); });
    return mapa;
  }, [slots]);

  const reservar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!slotEscolhido) { setErro("Escolha um horário."); return; }
    if (!nome.trim() || !telefone.trim()) { setErro("Preencha seu nome e telefone."); return; }
    setReservando(true);
    try {
      const { data, error } = await supabase.from("prestador_agenda")
        .update({ status: "reservado", cliente_nome: nome, cliente_telefone: telefone })
        .eq("id", slotEscolhido.id).eq("status", "disponivel").select();
      if (error) throw error;
      if (!data || data.length === 0) { setErro("Esse horário acabou de ser reservado por outra pessoa. Escolha outro."); setSlotEscolhido(null); setSlots((atual) => (atual || []).filter((s) => s.id !== slotEscolhido.id)); return; }
      setReservado(true);
    } catch (err) {
      setErro(err.message || "Não consegui reservar agora. Tente de novo.");
    } finally {
      setReservando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: C.line }}>
          <p className="font-display font-bold text-base" style={{ color: C.ink }}>Agendar com {prestador.nome}</p>
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint2 }} aria-label="Fechar"><X size={16} color="#425A70" /></button>
        </div>
        <div className="p-5">
          {reservado ? (
            <div className="py-4 text-center">
              <CheckCircle2 size={30} color="#1E8E5A" className="mx-auto mb-2" />
              <p className="font-display font-bold text-base" style={{ color: C.ink }}>Horário reservado!</p>
              <p className="font-body text-sm mt-1" style={{ color: "#5C7186" }}>{slotEscolhido.data} às {slotEscolhido.hora}, com {prestador.nome}.</p>
            </div>
          ) : (
            <>
              {slots === null && <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>}
              {slots && slots.length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum horário disponível no momento — tente falar direto pelo WhatsApp.</p>}
              <div className="flex flex-col gap-3 mb-4">
                {Object.entries(slotsPorData).map(([data, doDia]) => (
                  <div key={data}>
                    <p className="font-body text-xs font-bold mb-1.5" style={{ color: "#5C7186" }}>{data}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {doDia.map((s) => (
                        <button key={s.id} type="button" onClick={() => setSlotEscolhido(s)}
                          className="font-body text-xs font-bold px-2.5 py-1.5 rounded-lg border"
                          style={{ borderColor: slotEscolhido?.id === s.id ? C.blue : C.line, background: slotEscolhido?.id === s.id ? C.blueTint : "transparent", color: slotEscolhido?.id === s.id ? C.blue : "#425A70" }}>
                          {s.hora}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {slotEscolhido && (
                <form onSubmit={reservar} className="flex flex-col gap-2.5">
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Seu telefone" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  {erro && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erro}</p>}
                  <button type="submit" disabled={reservando} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                    {reservando ? "Reservando..." : `Confirmar ${slotEscolhido.data} às ${slotEscolhido.hora}`}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalDetalheProduto({ p, onFechar, onAdicionarCarrinho, podeAdicionar, precoCarrinho, linkWhats }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: C.line }}>
          <p className="font-display font-bold text-base truncate pr-2" style={{ color: C.ink }}>{p.nome}</p>
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueTint2 }} aria-label="Fechar"><X size={16} color="#425A70" /></button>
        </div>
        <div className="p-5">
          <div className="h-44 rounded-2xl flex items-center justify-center overflow-hidden mb-4" style={{ background: C.blueTint }}>
            {p.foto_url ? <img loading="lazy" decoding="async" src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" /> : <ShoppingBag size={32} color={C.blue} />}
          </div>
          <p className="font-body text-xs" style={{ color: "#5C7186" }}>{p.empresa}</p>
          {p.precoPromocional ? (
            <div className="flex items-center gap-2 mt-1">
              <p className="font-display font-extrabold text-xl" style={{ color: "#B4462F" }}>{p.precoPromocional}</p>
              <p className="font-body text-sm line-through" style={{ color: "#B7C6D6" }}>{p.preco}</p>
            </div>
          ) : (
            <p className="font-display font-extrabold text-xl mt-1" style={{ color: C.blue }}>{p.preco}</p>
          )}
          {p.descricao && <p className="font-body text-sm mt-3" style={{ color: "#425A70" }}>{p.descricao}</p>}
          {podeAdicionar && (
            <button type="button" onClick={() => { onAdicionarCarrinho({
              itemId: p.id, nome: p.nome, preco: precoCarrinho, foto_url: p.foto_url,
              empresaId: p.empresaId, empresaNome: p.empresa, empresaWhatsapp: p.whatsapp, empresaChavePix: p.chavePix,
            }); onFechar(); }}
              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold font-body text-white glow-btn"
              style={{ background: C.blue }}>
              <ShoppingBag size={15} /> Adicionar ao carrinho
            </button>
          )}
          {linkWhats && (
            <a href={linkWhats} target="_blank" rel="noopener noreferrer"
              className="glow-btn mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold font-body"
              style={{ background: C.blueTint, color: C.blue }}>
              <MessageCircle size={15} /> Chamar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ProdutoCard({ p, onAdicionarCarrinho, fav, onFav }) {
  const [aberto, setAberto] = useState(false);
  const esgotado = p.estoque != null && Number(p.estoque) <= 0;
  const poucoEstoque = p.estoque != null && Number(p.estoque) > 0 && Number(p.estoque) <= 3;
  const linkWhats = p.whatsapp ? `https://wa.me/55${(p.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi o produto "${p.nome}" no Conecta Comércio e queria saber mais.`)}` : null;
  const precoCarrinho = p.precoPromocionalNumerico ?? p.precoNumerico;
  const podeAdicionar = !esgotado && onAdicionarCarrinho && p.empresaId && precoCarrinho != null;
  return (
    <div className="glow-card rounded-2xl border bg-white overflow-hidden flex flex-col" style={{ borderColor: C.line }}>
      <button type="button" onClick={() => setAberto(true)} className="h-28 flex items-center justify-center relative overflow-hidden w-full text-left" style={{ background: C.blueTint }}>
        {p.foto_url ? <img loading="lazy" decoding="async" src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" /> : <ShoppingBag size={26} color={C.blue} />}
        {onFav && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onFav(); }} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center" aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={fav}>
            <Heart size={13} fill={fav ? C.amber : "none"} color={fav ? C.amber : C.blueDark} />
          </button>
        )}
        {esgotado && (
          <span className="absolute top-2 right-2 font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FBEAE5", color: "#B4462F" }}>Esgotado</span>
        )}
        {!esgotado && poucoEstoque && (
          <span className="absolute top-2 right-2 font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFF6E9", color: "#8A5A12" }}>Últimas unidades</span>
        )}
      </button>
      <div className="p-3.5 flex flex-col gap-1">
        <button type="button" onClick={() => setAberto(true)} className="text-left">
          <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
          <p className="font-body text-xs" style={{ color: "#5C7186" }}>{p.empresa}</p>
        </button>
        {p.precoPromocional ? (
          <div className="flex items-center gap-2 mt-1">
            <p className="font-display font-extrabold text-base" style={{ color: "#B4462F" }}>{p.precoPromocional}</p>
            <p className="font-body text-xs line-through" style={{ color: "#B7C6D6" }}>{p.preco}</p>
          </div>
        ) : (
          <p className="font-display font-extrabold text-base mt-1" style={{ color: C.blue }}>{p.preco}</p>
        )}
        {podeAdicionar && (
          <button type="button" onClick={() => onAdicionarCarrinho({
            itemId: p.id, nome: p.nome, preco: precoCarrinho, foto_url: p.foto_url,
            empresaId: p.empresaId, empresaNome: p.empresa, empresaWhatsapp: p.whatsapp, empresaChavePix: p.chavePix,
          })}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold font-body text-white glow-btn"
            style={{ background: C.blue }}>
            <ShoppingBag size={13} /> Adicionar ao carrinho
          </button>
        )}
        {linkWhats ? (
          <a href={linkWhats} target="_blank" rel="noopener noreferrer"
            className="glow-btn mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold font-body"
            style={{ background: C.blueTint, color: C.blue }}>
            <MessageCircle size={13} /> Chamar no WhatsApp
          </a>
        ) : (
          <span className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold font-body opacity-50"
            style={{ background: C.blueTint, color: C.blue }}>
            <MessageCircle size={13} /> Chamar no WhatsApp
          </span>
        )}
      </div>
      {aberto && (
        <ModalDetalheProduto p={p} onFechar={() => setAberto(false)} onAdicionarCarrinho={onAdicionarCarrinho}
          podeAdicionar={podeAdicionar} precoCarrinho={precoCarrinho} linkWhats={linkWhats} />
      )}
    </div>
  );
}

function ModalDetalheVaga({ v, onFechar, linkWhats, prazoFormatado }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: C.line }}>
          <p className="font-display font-bold text-base truncate pr-2" style={{ color: C.ink }}>{v.cargo}</p>
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueTint2 }} aria-label="Fechar"><X size={16} color="#425A70" /></button>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <p className="font-body text-sm" style={{ color: "#5C7186" }}>{v.empresa} · {v.cidade}</p>
          <p className="font-body text-base font-bold" style={{ color: C.amberDark }}>{v.salario}</p>
          {v.tipo && (
            <span className="font-body text-[11px] font-bold px-2 py-1 rounded-full w-fit" style={{ background: C.blueTint2, color: "#425A70" }}>{v.tipo}</span>
          )}
          {v.requisitos && (
            <div className="mt-2">
              <p className="font-body text-xs font-bold" style={{ color: C.ink }}>Requisitos</p>
              <p className="font-body text-sm" style={{ color: "#425A70" }}>{v.requisitos}</p>
            </div>
          )}
          {v.beneficios && (
            <div className="mt-1">
              <p className="font-body text-xs font-bold" style={{ color: C.ink }}>Benefícios</p>
              <p className="font-body text-sm" style={{ color: "#425A70" }}>{v.beneficios}</p>
            </div>
          )}
          {prazoFormatado && <p className="font-body text-xs font-semibold mt-1" style={{ color: "#B4462F" }}>Inscrições até {prazoFormatado}</p>}
          {linkWhats && (
            <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="glow-btn mt-3 w-full text-center rounded-xl py-3 text-sm font-bold font-body text-white" style={{ background: C.blue }}>
              Candidatar-se
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function VagaCard({ v }) {
  const [aberto, setAberto] = useState(false);
  const linkWhats = v.whatsapp ? `https://wa.me/55${(v.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi a vaga de "${v.cargo}" no Conecta Comércio e gostaria de me candidatar.`)}` : null;
  const prazoFormatado = v.prazo ? v.prazo.split("-").reverse().join("/") : null;
  return (
    <div className="glow-card rounded-2xl border bg-white p-4 flex flex-col gap-2" style={{ borderColor: C.line }}>
      <button type="button" onClick={() => setAberto(true)} className="flex flex-col gap-2 text-left">
        <div className="flex items-center justify-between">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
            <Briefcase size={16} />
          </span>
          {v.tipo && (
            <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: C.blueTint2, color: "#425A70" }}>{v.tipo}</span>
          )}
        </div>
        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{v.cargo}</p>
        <p className="font-body text-xs" style={{ color: "#5C7186" }}>{v.empresa} · {v.cidade}</p>
        <p className="font-body text-xs font-semibold" style={{ color: C.amberDark }}>{v.salario}</p>
        {v.beneficios && <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{v.beneficios}</p>}
        {prazoFormatado && <p className="font-body text-[11px] font-semibold" style={{ color: "#B4462F" }}>Inscrições até {prazoFormatado}</p>}
      </button>
      {linkWhats ? (
        <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="glow-btn mt-1 w-full text-center rounded-lg py-2 text-xs font-bold font-body text-white" style={{ background: C.blue }}>
          Candidatar-se
        </a>
      ) : (
        <span className="mt-1 w-full text-center rounded-lg py-2 text-xs font-bold font-body text-white opacity-50" style={{ background: C.blue }}>
          Candidatar-se
        </span>
      )}
      {aberto && <ModalDetalheVaga v={v} onFechar={() => setAberto(false)} linkWhats={linkWhats} prazoFormatado={prazoFormatado} />}
    </div>
  );
}

function ModalDetalheCurso({ c, onFechar }) {
  const dataFormatada = c.data_inicio ? c.data_inicio.split("-").reverse().join("/") : c.data || "";
  const local = c.local || c.instituicao || "";
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.6)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="h-44 relative overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
          {c.banner_url ? (
            <img loading="lazy" decoding="async" src={c.banner_url} alt={c.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><GraduationCap size={40} className="text-white/90" /></div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,26,46,0.75), rgba(5,26,46,0) 55%)" }} />
          <button onClick={onFechar} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/90" aria-label="Fechar"><X size={16} color="#425A70" /></button>
          <div className="absolute left-5 bottom-4 right-5">
            {c.data_inicio && c.data_inicio < new Date().toISOString().slice(0, 10) && (
              <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block" style={{ background: "#EAF0F7", color: "#425A70" }}>Já aconteceu</span>
            )}
            <p className="font-display font-extrabold text-lg text-white">{c.titulo}</p>
          </div>
        </div>
        <div className="p-5">
          <p className="font-body text-xs flex items-center gap-1" style={{ color: "#5C7186" }}>
            <MapPin size={12} /> {local}{c.professor ? ` · ${c.professor}` : ""}{c.carga_horaria ? ` · ${c.carga_horaria}` : ""}{dataFormatada ? ` · ${dataFormatada}` : ""}
          </p>
          {c.certificado && (
            <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>Com certificado</span>
          )}
          {c.descricao && <p className="font-body text-sm mt-3" style={{ color: "#425A70" }}>{c.descricao}</p>}

          {c.relato && (
            <div className="mt-3 rounded-lg p-3" style={{ background: C.blueTint2 }}>
              <p className="font-body text-[10px] font-bold uppercase tracking-wide" style={{ color: C.blue }}>Como foi</p>
              <p className="font-body text-xs mt-0.5" style={{ color: "#425A70" }}>{c.relato}</p>
              {c.relato_fotos?.length > 0 && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {c.relato_fotos.map((url, i) => (
                    <img key={i} loading="lazy" decoding="async" src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
          )}

          {c.link_inscricao && (
            <a href={c.link_inscricao} target="_blank" rel="noopener noreferrer"
              className="glow-btn mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold font-body text-white" style={{ background: C.blue }}>
              <ExternalLink size={15} /> Inscreva-se
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CursoCard({ c }) {
  // Aceita tanto os cursos de exemplo (data: "12 AGO", local: "...") quanto
  // os cursos reais cadastrados pelo admin (data_inicio ISO, instituição,
  // professor, carga horária, link de inscrição, certificado, banner).
  const [diaData, mesData] = c.data ? c.data.split(" ") : (c.data_inicio ? c.data_inicio.split("-").reverse() : ["--", ""]);
  const local = c.local || c.instituicao || "";
  const [detalheAberto, setDetalheAberto] = useState(false);

  // Inscrição direta pela plataforma (além do link externo, se houver) e,
  // pra cursos com certificado, consulta se a presença já foi confirmada
  // pra poder baixar o certificado pronto pra imprimir. FASE 38.
  const [formAberto, setFormAberto] = useState(null); // "inscrever" | "certificado" | null
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [certificadoLiberado, setCertificadoLiberado] = useState(null); // { nome } quando pronto

  const inscrever = async () => {
    if (!nome.trim() || !telefone.trim()) { setMensagem("Preencha nome e telefone."); return; }
    setEnviando(true);
    setMensagem("");
    const { error } = await supabase.from("curso_inscricoes").upsert(
      { curso_id: c.id, nome, telefone: telefone.replace(/\D/g, ""), email: null },
      { onConflict: "curso_id,telefone", ignoreDuplicates: true }
    );
    setEnviando(false);
    if (error) { setMensagem(error.message || "Não foi possível inscrever agora."); return; }
    setMensagem("ok");
  };

  const consultarCertificado = async () => {
    if (!telefone.trim()) { setMensagem("Informe o telefone usado na inscrição."); return; }
    setEnviando(true);
    setMensagem("");
    const { data, error } = await supabase.rpc("verificar_certificado", { p_curso_id: c.id, p_telefone: telefone.replace(/\D/g, "") });
    setEnviando(false);
    if (error) { setMensagem("Não foi possível consultar agora."); return; }
    const registro = data?.[0];
    if (!registro) { setMensagem("Não encontramos inscrição com esse telefone."); return; }
    if (!registro.confirmado) { setMensagem("Sua presença ainda não foi confirmada pela organização."); return; }
    setCertificadoLiberado({ nome: registro.nome });
  };

  const baixarCertificado = () => {
    const janela = window.open("", "_blank");
    const dataFormatada = c.data_inicio ? c.data_inicio.split("-").reverse().join("/") : "";
    janela.document.write(`
      <html><head><title>Certificado — ${certificadoLiberado.nome}</title>
      <style>
        body{font-family:Georgia,serif;padding:60px;color:#0E2233;text-align:center;border:10px solid #0A5AA8;margin:20px}
        h1{font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#5C7186;margin-bottom:30px}
        .nome{font-size:30px;font-weight:bold;margin:20px 0;color:#0A5AA8}
        p{font-size:15px;line-height:1.6}
        .rodape{margin-top:50px;font-size:11px;color:#5C7186}
      </style></head>
      <body>
        <h1>Certificado de conclusão</h1>
        <p>Certificamos que</p>
        <p class="nome">${certificadoLiberado.nome}</p>
        <p>concluiu o curso <b>${c.titulo}</b>${c.instituicao ? ` promovido por ${c.instituicao}` : ""}${c.carga_horaria ? `, com carga horária de ${c.carga_horaria}` : ""}${dataFormatada ? `, em ${dataFormatada}` : ""}.</p>
        <p class="rodape">Emitido pelo Conecta Comércio — Ivatuba - PR</p>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    janela.document.close();
  };

  return (
    <>
    <div className="rounded-2xl border bg-white p-4 flex gap-3 items-start overflow-hidden" style={{ borderColor: C.line }}>
      <button type="button" onClick={() => setDetalheAberto(true)} className="shrink-0">
        {c.banner_url ? (
          <img loading="lazy" decoding="async" src={c.banner_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="rounded-lg px-2.5 py-1.5 text-center shrink-0" style={{ background: C.blueDeep }}>
            <p className="font-display text-[10px] font-bold text-white leading-none">{diaData}</p>
            <p className="font-display text-[9px] text-white/70 leading-none mt-0.5">{mesData}</p>
          </div>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => setDetalheAberto(true)} className="text-left w-full">
          <p className="font-display font-bold text-sm flex flex-wrap items-center gap-1.5" style={{ color: C.ink }}>
            <span className="min-w-0 break-words">{c.titulo}</span>
            {c.data_inicio && c.data_inicio < new Date().toISOString().slice(0, 10) && (
              <span className="font-body text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#EAF0F7", color: "#5C7186" }}>Já aconteceu</span>
            )}
          </p>
          <p className="font-body text-xs mt-1 flex items-center gap-1" style={{ color: "#5C7186" }}>
            <MapPin size={11} /> {local}{c.professor ? ` · ${c.professor}` : ""}{c.carga_horaria ? ` · ${c.carga_horaria}` : ""}
          </p>
        </button>
        {c.certificado && (
          <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>Com certificado</span>
        )}
        {c.relato && (
          <div className="mt-2 rounded-lg p-2.5" style={{ background: C.blueTint2 }}>
            <p className="font-body text-[10px] font-bold uppercase tracking-wide" style={{ color: C.blue }}>Como foi</p>
            <p className="font-body text-xs mt-0.5" style={{ color: "#425A70" }}>{c.relato}</p>
            {c.relato_fotos?.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {c.relato_fotos.map((url, i) => (
                  <img key={i} loading="lazy" decoding="async" src={url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {c.link_inscricao && (
            <a href={c.link_inscricao} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold flex items-center gap-1 w-fit" style={{ color: C.blue }}>
              <ExternalLink size={11} /> Inscreva-se
            </a>
          )}
          {c.id && !c._origemCalendario && supabaseConfigurado && (
            <button onClick={() => { setFormAberto(formAberto === "inscrever" ? null : "inscrever"); setMensagem(""); setCertificadoLiberado(null); }} className="font-body text-xs font-bold flex items-center gap-1" style={{ color: C.blue }}>
              <Users size={11} /> Inscrever-se pelo site
            </button>
          )}
          {c.id && !c._origemCalendario && c.certificado && supabaseConfigurado && (
            <button onClick={() => { setFormAberto(formAberto === "certificado" ? null : "certificado"); setMensagem(""); setCertificadoLiberado(null); }} className="font-body text-xs font-bold flex items-center gap-1" style={{ color: "#1E8E5A" }}>
              <BadgeCheck size={11} /> Baixar certificado
            </button>
          )}
        </div>

        {formAberto === "inscrever" && (
          <div className="flex flex-col gap-1.5 mt-2 p-2.5 rounded-lg" style={{ background: C.blueTint2 }}>
            {mensagem === "ok" ? (
              <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Inscrição confirmada!</p>
            ) : (
              <>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone / WhatsApp" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                {mensagem && <p className="font-body text-[11px]" style={{ color: "#B4462F" }}>{mensagem}</p>}
                <button onClick={inscrever} disabled={enviando} className="font-body text-xs font-bold rounded-lg py-1.5 text-white disabled:opacity-60" style={{ background: C.blue }}>
                  {enviando ? "Enviando..." : "Confirmar inscrição"}
                </button>
              </>
            )}
          </div>
        )}

        {formAberto === "certificado" && (
          <div className="flex flex-col gap-1.5 mt-2 p-2.5 rounded-lg" style={{ background: "#E7F6EE" }}>
            {certificadoLiberado ? (
              <>
                <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Certificado liberado, {certificadoLiberado.nome}!</p>
                <button onClick={baixarCertificado} className="font-body text-xs font-bold rounded-lg py-1.5 text-white" style={{ background: "#1E8E5A" }}>Baixar certificado</button>
              </>
            ) : (
              <>
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone usado na inscrição" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                {mensagem && <p className="font-body text-[11px]" style={{ color: "#8A5A12" }}>{mensagem}</p>}
                <button onClick={consultarCertificado} disabled={enviando} className="font-body text-xs font-bold rounded-lg py-1.5 text-white disabled:opacity-60" style={{ background: "#1E8E5A" }}>
                  {enviando ? "Consultando..." : "Consultar"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    {detalheAberto && <ModalDetalheCurso c={c} onFechar={() => setDetalheAberto(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Dados mock — painéis
// ---------------------------------------------------------------------------
const pendentes = [
  { nome: "Doceria Sabor & Arte", cat: "Alimentação", data: "23/07/2026" },
  { nome: "Barbearia Corte Fino", cat: "Beleza", data: "22/07/2026" },
  { nome: "Pet Shop Amigo Fiel", cat: "Serviços", data: "20/07/2026" },
];

const produtosModeracao = [
  { nome: "Cesta de pães artesanais", empresa: "Padaria Pão Nosso", status: "publicado" },
  { nome: "Kit ferramentas 45 peças", empresa: "Materiais Rocha", status: "publicado" },
  { nome: "Combo café da manhã", empresa: "Padaria Pão Nosso", status: "denunciado" },
];

const enquetes = [
  {
    pergunta: "Qual novidade você quer ver primeiro no Conecta Comércio?",
    ativa: true,
    opcoes: [
      { texto: "Mapa com rota até a loja", votos: 142 },
      { texto: "Cupons de desconto", votos: 98 },
      { texto: "Avaliação de clientes", votos: 61 },
    ],
  },
  {
    pergunta: "Você já usou o Cartão do Servidor em algum comércio local?",
    ativa: false,
    opcoes: [
      { texto: "Sim", votos: 210 },
      { texto: "Não, ainda não sabia", votos: 87 },
    ],
  },
];

const visitasSemana = [
  { dia: "Seg", views: 34 }, { dia: "Ter", views: 41 }, { dia: "Qua", views: 38 },
  { dia: "Qui", views: 52 }, { dia: "Sex", views: 61 }, { dia: "Sáb", views: 74 }, { dia: "Dom", views: 45 },
];

const meusProdutos = [
  { nome: "Cesta de pães artesanais", preco: "R$ 24,90", ativo: true },
  { nome: "Bolo de fubá caseiro", preco: "R$ 18,00", ativo: true },
  { nome: "Combo café da manhã", preco: "R$ 32,50", ativo: false },
];

// ---------------------------------------------------------------------------
// Painel administrativo
// ---------------------------------------------------------------------------
function AdminPanel() {
  const [tab, setTab] = useState("dashboard");
  const categoriasReaisAdmin = useCategoriasReais();

  // Toasts (avisos rápidos) e confirmação antes de excluir — FASE 21.
  const [toastsAdmin, setToastsAdmin] = useState([]);
  const notificar = (mensagem, tipo = "sucesso") => {
    const id = Date.now() + Math.random();
    setToastsAdmin((t) => [...t, { id, mensagem, tipo }]);
    setTimeout(() => setToastsAdmin((t) => t.filter((x) => x.id !== id)), 3500);
  };
  const confirmarExclusao = (mensagem = "Tem certeza que quer excluir? Essa ação não pode ser desfeita.") => window.confirm(mensagem);

  // -------------------------------------------------------------------------
  // Categorias de empresas — CRUD completo (nome, ícone, cor, ordem, status).
  // -------------------------------------------------------------------------
  const [categoriasAdmin, setCategoriasAdmin] = useState(null); // null = carregando/indisponível
  const [novaCategoria, setNovaCategoria] = useState({ nome: "", icone: "Tag", cor: "#0A5AA8" });
  const [statusCategoria, setStatusCategoria] = useState("");
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [formCategoria, setFormCategoria] = useState({ nome: "", icone: "Tag", cor: "#0A5AA8" });

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("categorias").select("*").order("ordem").then(({ data, error }) => {
      if (!error) setCategoriasAdmin(data || []);
    });
  }, []);

  const criarCategoria = async (e) => {
    e.preventDefault();
    setStatusCategoria("");
    if (!novaCategoria.nome.trim()) { setStatusCategoria("Informe o nome da categoria."); return; }
    if (!supabaseConfigurado) {
      setCategoriasAdmin((atual) => [...(atual ?? []), { id: `demo-${Date.now()}`, ...novaCategoria, ordem: (atual ?? []).length, ativa: true }]);
      setNovaCategoria({ nome: "", icone: "Tag", cor: "#0A5AA8" });
      setStatusCategoria("ok");
      return;
    }
    const ordem = (categoriasAdmin ?? []).length;
    const { data, error } = await supabase.from("categorias").insert({ ...novaCategoria, ordem, ativa: true }).select().single();
    if (error) { setStatusCategoria(error.message); return; }
    setCategoriasAdmin((atual) => [...(atual ?? []), data]);
    setNovaCategoria({ nome: "", icone: "Tag", cor: "#0A5AA8" });
    setStatusCategoria("ok");
  };

  const alternarAtivaCategoria = async (id, ativa) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCategoriasAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ativa } : c)));
      return;
    }
    const { error } = await supabase.from("categorias").update({ ativa }).eq("id", id);
    if (!error) setCategoriasAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ativa } : c)));
  };

  const removerCategoria = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCategoriasAdmin((atual) => atual.filter((c) => c.id !== id));
      return;
    }
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (!error) setCategoriasAdmin((atual) => atual.filter((c) => c.id !== id));
  };

  const iniciarEdicaoCategoria = (c) => { setEditandoCategoria(c.id); setFormCategoria({ nome: c.nome, icone: c.icone, cor: c.cor || "#0A5AA8" }); };

  const salvarEdicaoCategoria = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCategoriasAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ...formCategoria } : c)));
      setEditandoCategoria(null);
      return;
    }
    const { error } = await supabase.from("categorias").update(formCategoria).eq("id", id);
    if (!error) setCategoriasAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ...formCategoria } : c)));
    setEditandoCategoria(null);
  };

  // Reordenar trocando a "ordem" com o vizinho — mais simples e confiável
  // pra quem não mexe com informática do que arrastar-e-soltar.
  const moverCategoria = async (index, direcao) => {
    const lista = [...(categoriasAdmin ?? [])];
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= lista.length) return;
    const a = lista[index];
    const b = lista[alvo];
    const ordemA = b.ordem;
    const ordemB = a.ordem;
    lista[index] = { ...a, ordem: ordemA };
    lista[alvo] = { ...b, ordem: ordemB };
    lista.sort((x, y) => x.ordem - y.ordem);
    setCategoriasAdmin(lista);
    if (supabaseConfigurado && !String(a.id).startsWith("demo-")) {
      await supabase.from("categorias").update({ ordem: ordemA }).eq("id", a.id);
      await supabase.from("categorias").update({ ordem: ordemB }).eq("id", b.id);
    }
  };

  // -------------------------------------------------------------------------
  // FAQ — CRUD completo com categoria e ordenação (mesmo padrão de
  // reordenar das categorias de empresas: trocar a "ordem" com o vizinho).
  // -------------------------------------------------------------------------
  const [faqAdmin, setFaqAdmin] = useState(null);
  const [novaFaq, setNovaFaq] = useState({ pergunta: "", resposta: "", categoria: "Geral" });
  const [statusFaq, setStatusFaq] = useState("");
  const [editandoFaq, setEditandoFaq] = useState(null);
  const [formFaq, setFormFaq] = useState({ pergunta: "", resposta: "", categoria: "Geral" });

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("faq").select("*").order("ordem").then(({ data, error }) => {
      if (!error) setFaqAdmin(data || []);
    });
  }, []);

  const criarFaq = async (e) => {
    e.preventDefault();
    setStatusFaq("");
    if (!novaFaq.pergunta.trim() || !novaFaq.resposta.trim()) { setStatusFaq("Preencha a pergunta e a resposta."); return; }
    if (!supabaseConfigurado) {
      setFaqAdmin((atual) => [...(atual ?? []), { id: `demo-${Date.now()}`, ...novaFaq, ordem: (atual ?? []).length, ativa: true }]);
      setNovaFaq({ pergunta: "", resposta: "", categoria: "Geral" });
      setStatusFaq("ok");
      return;
    }
    const ordem = (faqAdmin ?? []).length;
    const { data, error } = await supabase.from("faq").insert({ ...novaFaq, ordem, ativa: true }).select().single();
    if (error) { setStatusFaq(error.message); return; }
    setFaqAdmin((atual) => [...(atual ?? []), data]);
    setNovaFaq({ pergunta: "", resposta: "", categoria: "Geral" });
    setStatusFaq("ok");
  };

  const alternarAtivaFaq = async (id, ativa) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setFaqAdmin((atual) => atual.map((f) => (f.id === id ? { ...f, ativa } : f)));
      return;
    }
    const { error } = await supabase.from("faq").update({ ativa }).eq("id", id);
    if (!error) setFaqAdmin((atual) => atual.map((f) => (f.id === id ? { ...f, ativa } : f)));
  };

  const removerFaq = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setFaqAdmin((atual) => atual.filter((f) => f.id !== id));
      return;
    }
    const { error } = await supabase.from("faq").delete().eq("id", id);
    if (!error) setFaqAdmin((atual) => atual.filter((f) => f.id !== id));
  };

  const iniciarEdicaoFaq = (f) => { setEditandoFaq(f.id); setFormFaq({ pergunta: f.pergunta, resposta: f.resposta, categoria: f.categoria || "Geral" }); };

  const salvarEdicaoFaq = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setFaqAdmin((atual) => atual.map((f) => (f.id === id ? { ...f, ...formFaq } : f)));
      setEditandoFaq(null);
      return;
    }
    const { error } = await supabase.from("faq").update(formFaq).eq("id", id);
    if (!error) setFaqAdmin((atual) => atual.map((f) => (f.id === id ? { ...f, ...formFaq } : f)));
    setEditandoFaq(null);
  };

  const moverFaq = async (index, direcao) => {
    const lista = [...(faqAdmin ?? [])];
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= lista.length) return;
    const a = lista[index];
    const b = lista[alvo];
    const ordemA = b.ordem;
    const ordemB = a.ordem;
    lista[index] = { ...a, ordem: ordemA };
    lista[alvo] = { ...b, ordem: ordemB };
    lista.sort((x, y) => x.ordem - y.ordem);
    setFaqAdmin(lista);
    if (supabaseConfigurado && !String(a.id).startsWith("demo-")) {
      await supabase.from("faq").update({ ordem: ordemA }).eq("id", a.id);
      await supabase.from("faq").update({ ordem: ordemB }).eq("id", b.id);
    }
  };

  const [servicos, setServicos] = useState(servicosEmpreendedor.map((s) => ({ ...s })));
  const [servicosCarregados, setServicosCarregados] = useState(false);
  const [salvandoServico, setSalvandoServico] = useState(null); // titulo do serviço sendo salvo
  const [statusServico, setStatusServico] = useState({}); // { [titulo]: "ok" | "erro" | mensagem }

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("servicos_empreendedor").select("*").order("ordem").then(({ data, error }) => {
      if (!error && data && data.length > 0) { setServicos(data); setServicosCarregados(true); }
    });
  }, []);

  // -------------------------------------------------------------------------
  // Sala do Empreendedor — totais oficiais mensais (transcritos do relatório
  // do Sebrae), categoria x mês. Isso aqui é o que fica visível no site
  // público — a Sala do Empreendedor "divulga" os números oficiais mês a mês.
  const [anoTotaisSala, setAnoTotaisSala] = useState(new Date().getFullYear());
  const [totaisSalaGrid, setTotaisSalaGrid] = useState(null); // null = carregando
  const [salvandoTotaisSala, setSalvandoTotaisSala] = useState(false);
  const [statusTotaisSala, setStatusTotaisSala] = useState("");

  const grelhaVazia = () => Object.fromEntries(CATEGORIAS_SALA_EMPREENDEDOR.map((c) => [c, Array(12).fill(0)]));

  const carregarTotaisSala = (ano) => {
    if (!supabaseConfigurado) { setTotaisSalaGrid(grelhaVazia()); return; }
    setTotaisSalaGrid(null);
    supabase.from("sala_atendimentos_totais").select("*").eq("ano", ano).then(({ data, error }) => {
      const grelha = grelhaVazia();
      if (!error) (data || []).forEach((r) => { if (grelha[r.categoria]) grelha[r.categoria][r.mes - 1] = r.total; });
      setTotaisSalaGrid(grelha);
    });
  };

  useEffect(() => { carregarTotaisSala(anoTotaisSala); }, [anoTotaisSala]);

  const atualizarCelulaTotais = (categoria, mesIndex, valor) => {
    setTotaisSalaGrid((atual) => ({ ...atual, [categoria]: atual[categoria].map((v, i) => (i === mesIndex ? Math.max(0, Number(valor) || 0) : v)) }));
  };

  const salvarTotaisSala = async () => {
    setStatusTotaisSala("");
    if (!supabaseConfigurado) { setStatusTotaisSala("ok"); return; }
    setSalvandoTotaisSala(true);
    const linhas = CATEGORIAS_SALA_EMPREENDEDOR.flatMap((categoria) =>
      totaisSalaGrid[categoria].map((total, i) => ({ ano: anoTotaisSala, mes: i + 1, categoria, total }))
    );
    const { error } = await supabase.from("sala_atendimentos_totais").upsert(linhas, { onConflict: "ano,mes,categoria" });
    setSalvandoTotaisSala(false);
    setStatusTotaisSala(error ? error.message || "Não foi possível salvar." : "ok");
  };

  const [anosDisponiveisSala, setAnosDisponiveisSala] = useState([new Date().getFullYear()]);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("sala_atendimentos_totais").select("ano").then(({ data, error }) => {
      if (error) return;
      const anos = new Set((data || []).map((r) => r.ano));
      anos.add(new Date().getFullYear());
      setAnosDisponiveisSala(Array.from(anos).sort((a, b) => b - a));
    });
  }, [statusTotaisSala]);

  const relatorioSala = useMemo(() => {
    const grelha = totaisSalaGrid || {};
    const linhas = CATEGORIAS_SALA_EMPREENDEDOR.map((categoria) => {
      const meses = grelha[categoria] || Array(12).fill(0);
      const total = meses.reduce((s, v) => s + v, 0);
      return { categoria, meses, total };
    }).filter((l) => l.total > 0);
    const totaisMeses = Array(12).fill(0);
    linhas.forEach((l) => l.meses.forEach((v, i) => { totaisMeses[i] += v; }));
    const totalGeral = totaisMeses.reduce((s, v) => s + v, 0);
    return { linhas, totaisMeses, totalGeral };
  }, [totaisSalaGrid]);

  const exportarRelatorioSalaExcel = () => {
    const cabecalho = ["Categoria", "Total", ...MESES_ABREV];
    const linhas = relatorioSala.linhas.map((l) => [l.categoria, l.total, ...l.meses]);
    linhas.push(["TOTAL GERAL", relatorioSala.totalGeral, ...relatorioSala.totaisMeses]);
    const csv = [cabecalho, ...linhas].map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sala-empreendedor-${anoTotaisSala}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportarRelatorioSalaPDF = () => {
    const janela = window.open("", "_blank");
    if (!janela) return;
    const linhasHtml = relatorioSala.linhas.map((l) => `
      <tr><td>${l.categoria}</td><td class="num">${l.total}</td>${l.meses.map((v) => `<td class="num">${v}</td>`).join("")}</tr>
    `).join("");
    janela.document.write(`
      <html><head><title>Sala do Empreendedor ${anoTotaisSala} — Ivatuba</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0E2233}
        h2{margin-bottom:4px} p{color:#5C7186;margin-top:0;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #DCE7F2;padding:6px 8px;text-align:left;font-size:12px}
        th{background:#EAF2FB;color:#0A5AA8}
        td.num,th.num{text-align:center}
        tfoot td{font-weight:bold;background:#EAF2FB}
      </style></head>
      <body>
        <h2>Relatório de Atendimento — Sala do Empreendedor — Ano ${anoTotaisSala} — Ivatuba</h2>
        <p>Totalizado por atendimentos · gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
        <table>
          <thead><tr><th>Serviços prestados</th><th class="num">Totais</th>${MESES_ABREV.map((m) => `<th class="num">${m}</th>`).join("")}</tr></thead>
          <tbody>${linhasHtml}</tbody>
          <tfoot><tr><td>TOTALIZAÇÃO GERAL</td><td class="num">${relatorioSala.totalGeral}</td>${relatorioSala.totaisMeses.map((v) => `<td class="num">${v}</td>`).join("")}</tr></tfoot>
        </table>
      </body></html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 300);
  };

  // -------------------------------------------------------------------------
  // Dashboard — números e gráficos reais (nada de valores fixos de exemplo).
  // -------------------------------------------------------------------------
  const [statsReais, setStatsReais] = useState(null); // null = carregando
  const [empresasDestaqueReais, setEmpresasDestaqueReais] = useState(null);
  const [ultimosCadastros, setUltimosCadastros] = useState(null);
  const [crescimentoMensal, setCrescimentoMensal] = useState(null);
  const [acessosSemanaReais, setAcessosSemanaReais] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;

    const contar = (tabela, filtro) => {
      let q = supabase.from(tabela).select("*", { count: "exact", head: true });
      if (filtro) q = filtro(q);
      return q.then(({ count }) => count ?? 0);
    };

    Promise.all([
      contar("empresas", (q) => q.eq("status", "aprovada")),
      contar("produtos", (q) => q.eq("ativo", true)),
      contar("vagas", (q) => q.eq("status", "aberta")),
      contar("noticias"),
      contar("eventos_calendario"),
      contar("prestadores", (q) => q.eq("status", "aprovado")),
      // Uso de cada funcionalidade adicionada nas fases 45-53 — pra saber o
      // que os moradores/comerciantes realmente estão usando.
      contar("mural_comunidade", (q) => q.eq("status", "aprovado")),
      contar("classificados", (q) => q.eq("status", "aprovado")),
      contar("ouvidoria_denuncias"),
      contar("prestador_agenda", (q) => q.eq("status", "reservado")),
      contar("empresas", (q) => q.eq("plano_premium", true)),
      contar("cupons", (q) => q.eq("ativo", true)),
      contar("combos", (q) => q.eq("ativo", true)),
    ]).then(([empresas, produtos, vagas, noticiasN, eventos, prestadoresN, mural, classificados, ouvidoria, agendamentos, premium, cupons, combos]) => {
      setStatsReais({ empresas, produtos, vagas, noticias: noticiasN, eventos, prestadores: prestadoresN, mural, classificados, ouvidoria, agendamentos, premium, cupons, combos });
    });

    supabase.from("empresas").select("nome, categoria, visualizacoes").eq("status", "aprovada")
      .order("visualizacoes", { ascending: false }).limit(5)
      .then(({ data, error }) => { if (!error) setEmpresasDestaqueReais(data || []); });

    Promise.all([
      supabase.from("empresas").select("nome, criado_em").order("criado_em", { ascending: false }).limit(6),
      supabase.from("produtos").select("nome, criado_em").order("criado_em", { ascending: false }).limit(6),
      supabase.from("prestadores").select("nome, criado_em").order("criado_em", { ascending: false }).limit(6),
    ]).then(([emp, prod, pres]) => {
      const juntos = [
        ...(emp.data || []).map((x) => ({ nome: x.nome, tipo: "Empresa", criado_em: x.criado_em })),
        ...(prod.data || []).map((x) => ({ nome: x.nome, tipo: "Produto", criado_em: x.criado_em })),
        ...(pres.data || []).map((x) => ({ nome: x.nome, tipo: "Prestador", criado_em: x.criado_em })),
      ]
        .filter((x) => x.criado_em)
        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
        .slice(0, 8);
      setUltimosCadastros(juntos);
    });

    // Crescimento mensal — empresas novas cadastradas nos últimos 6 meses.
    supabase.from("empresas").select("criado_em").then(({ data, error }) => {
      if (error || !data) return;
      const hoje = new Date();
      const meses = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        meses.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, mes: d.toLocaleDateString("pt-BR", { month: "short" }), empresas: 0 });
      }
      data.forEach((row) => {
        if (!row.criado_em) return;
        const d = new Date(row.criado_em);
        const chave = `${d.getFullYear()}-${d.getMonth()}`;
        const alvo = meses.find((m) => m.chave === chave);
        if (alvo) alvo.empresas += 1;
      });
      setCrescimentoMensal(meses);
    });

    // Acessos ao site — conta visitas reais registradas na tabela page_views.
    supabase.from("page_views").select("criado_em").gte("criado_em", new Date(Date.now() - 7 * 86400000).toISOString())
      .then(({ data, error }) => {
        if (error || !data) { setAcessosSemanaReais([]); return; }
        const dias = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          dias.push({ chave: d.toDateString(), dia: d.toLocaleDateString("pt-BR", { weekday: "short" }), views: 0 });
        }
        data.forEach((row) => {
          const chave = new Date(row.criado_em).toDateString();
          const alvo = dias.find((d) => d.chave === chave);
          if (alvo) alvo.views += 1;
        });
        setAcessosSemanaReais(dias);
      });
  }, []);

  // -------------------------------------------------------------------------
  // Moderação de empresas — aprovar, recusar e editar de verdade.
  // -------------------------------------------------------------------------
  const [empresasPend, setEmpresasPend] = useState(null); // null = carregando/indisponível
  const [statusEmpresa, setStatusEmpresa] = useState({});
  const [editandoEmpresa, setEditandoEmpresa] = useState(null);
  const [formEmpresa, setFormEmpresa] = useState({ nome: "", categoria: "", regiao: "ivatuba", logo_url: "", banner_url: "", facebook: "", site: "", destaque: false, patrocinado: false, patrocinado_ate: "", fotos_urls: [], email: "", whatsapp: "", instagram: "", cpf: "", cnpj: "", aceita_cartao_servidor: false, possui_mei: false, horario_funcionamento: null, chave_pix: "", plano_premium: false, plano_premium_ate: "" });
  const [enviandoLogoEmpresa, setEnviandoLogoEmpresa] = useState(false);
  const [enviandoBannerEmpresa, setEnviandoBannerEmpresa] = useState(false);
  const [enviandoFotoGaleria, setEnviandoFotoGaleria] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("empresas").select("id, nome, categoria, regiao, status, logo_url, banner_url, facebook, site, destaque, fotos_urls, criado_em, email, whatsapp, instagram, cpf, cnpj, possui_mei, horario_funcionamento, chave_pix, plano_premium, plano_premium_ate").order("criado_em", { ascending: false })
      .then(({ data, error }) => { if (!error) setEmpresasPend(data || []); });
  }, []);

  const listaEmpresas = empresasPend ?? pendentes.map((p, i) => ({ id: `demo-${i}`, nome: p.nome, categoria: p.cat, status: "pendente", criado_em: p.data }));
  const [buscaEmpresasAdmin, setBuscaEmpresasAdmin] = useState("");
  const listaEmpresasFiltradaAdmin = useMemo(() => {
    if (!buscaEmpresasAdmin.trim()) return listaEmpresas;
    const q = buscaEmpresasAdmin.toLowerCase();
    return listaEmpresas.filter((e) => (e.nome || "").toLowerCase().includes(q) || (e.categoria || "").toLowerCase().includes(q));
  }, [listaEmpresas, buscaEmpresasAdmin]);
  const [qtdEmpresasAdminVisiveis, setQtdEmpresasAdminVisiveis] = useState(15);
  useEffect(() => { setQtdEmpresasAdminVisiveis(15); }, [buscaEmpresasAdmin]);

  const mudarStatusEmpresa = async (id, status) => {
    if (!supabaseConfigurado) {
      setStatusEmpresa((s) => ({ ...s, [id]: "Modo demonstração — conecte o Supabase para salvar de verdade." }));
      return;
    }
    const { error } = await supabase.from("empresas").update({ status }).eq("id", id);
    if (!error) { setEmpresasPend((atual) => atual.map((e) => (e.id === id ? { ...e, status } : e))); notificar(status === "aprovada" ? "Empresa aprovada." : "Empresa recusada.", status === "aprovada" ? "sucesso" : "aviso"); }
    else setStatusEmpresa((s) => ({ ...s, [id]: error.message }));
  };

  // Bloquear/desbloquear e excluir empresa — FASE 25.
  const alternarBloqueioEmpresa = async (e) => {
    const novoStatus = e.status === "bloqueada" ? "aprovada" : "bloqueada";
    const { error } = await supabase.from("empresas").update({ status: novoStatus }).eq("id", e.id);
    if (!error) {
      setEmpresasPend((atual) => atual.map((x) => (x.id === e.id ? { ...x, status: novoStatus } : x)));
      notificar(novoStatus === "bloqueada" ? "Empresa bloqueada." : "Empresa desbloqueada.", novoStatus === "bloqueada" ? "aviso" : "sucesso");
    } else notificar("Não consegui atualizar: " + error.message, "erro");
  };

  const removerEmpresaAdmin = async (id) => {
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (!error) { setEmpresasPend((atual) => atual.filter((e) => e.id !== id)); notificar("Empresa excluída."); }
    else notificar("Não consegui excluir: " + error.message, "erro");
  };

  const iniciarEdicaoEmpresa = (e) => {
    setEditandoEmpresa(e.id);
    setFormEmpresa({
      nome: e.nome, categoria: e.categoria, regiao: e.regiao || "ivatuba", logo_url: e.logo_url || "",
      banner_url: e.banner_url || "", facebook: e.facebook || "", site: e.site || "",
      destaque: !!e.destaque, fotos_urls: e.fotos_urls || [],
      email: e.email || "", whatsapp: e.whatsapp || "", instagram: e.instagram || "",
      cpf: e.cpf || "", cnpj: e.cnpj || "", aceita_cartao_servidor: !!e.aceita_cartao_servidor, patrocinado: !!e.patrocinado,
      patrocinado_ate: e.patrocinado_ate || "", possui_mei: !!e.possui_mei,
      horario_funcionamento: e.horario_funcionamento || null, chave_pix: e.chave_pix || "",
      plano_premium: !!e.plano_premium, plano_premium_ate: e.plano_premium_ate || "",
    });
  };

  const enviarLogoEmpresaAdmin = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setFormEmpresa((f) => ({ ...f, logo_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoLogoEmpresa(true);
    const caminho = `logos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("logos").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoLogoEmpresa(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("logos").getPublicUrl(caminho);
        setFormEmpresa((f) => ({ ...f, logo_url: pub.publicUrl }));
      }
    });
  };

  const enviarBannerEmpresaAdmin = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setFormEmpresa((f) => ({ ...f, banner_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoBannerEmpresa(true);
    const caminho = `banners-empresas/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("fotos-empresas").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBannerEmpresa(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("fotos-empresas").getPublicUrl(caminho);
        setFormEmpresa((f) => ({ ...f, banner_url: pub.publicUrl }));
      }
    });
  };

  const enviarFotoGaleriaEmpresa = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const limiteFotos = formEmpresa.plano_premium ? LIMITE_FOTOS_PREMIUM : LIMITE_FOTOS_GRATUITO;
    if (formEmpresa.fotos_urls.length >= limiteFotos) { notificar(`Limite de ${limiteFotos} fotos atingido.`, "aviso"); return; }
    if (!supabaseConfigurado) { setFormEmpresa((f) => ({ ...f, fotos_urls: [...f.fotos_urls, URL.createObjectURL(arquivo)] })); return; }
    setEnviandoFotoGaleria(true);
    const caminho = `galeria/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("fotos-empresas").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoGaleria(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("fotos-empresas").getPublicUrl(caminho);
        setFormEmpresa((f) => ({ ...f, fotos_urls: [...f.fotos_urls, pub.publicUrl] }));
      }
    });
  };

  const removerFotoGaleriaEmpresa = (indice) => {
    setFormEmpresa((f) => ({ ...f, fotos_urls: f.fotos_urls.filter((_, i) => i !== indice) }));
  };

  const salvarEdicaoEmpresa = async (id) => {
    if (!supabaseConfigurado) {
      setEmpresasPend((atual) => atual.map((e) => (e.id === id ? { ...e, ...formEmpresa } : e)));
      setEditandoEmpresa(null);
      return;
    }
    const { error } = await supabase.from("empresas").update({
      nome: formEmpresa.nome, categoria: formEmpresa.categoria, regiao: formEmpresa.regiao, logo_url: formEmpresa.logo_url,
      banner_url: formEmpresa.banner_url, facebook: formEmpresa.facebook, site: formEmpresa.site,
      destaque: formEmpresa.destaque, fotos_urls: formEmpresa.fotos_urls,
      email: formEmpresa.email || null, whatsapp: formEmpresa.whatsapp || null, instagram: formEmpresa.instagram || null,
      cpf: formEmpresa.cpf || null, cnpj: formEmpresa.cnpj || null,
      aceita_cartao_servidor: formEmpresa.aceita_cartao_servidor, patrocinado: formEmpresa.patrocinado,
      patrocinado_ate: formEmpresa.patrocinado_ate || null, possui_mei: formEmpresa.possui_mei,
      horario_funcionamento: formEmpresa.horario_funcionamento, chave_pix: formEmpresa.chave_pix || null,
      plano_premium: formEmpresa.plano_premium, plano_premium_ate: formEmpresa.plano_premium_ate || null,
    }).eq("id", id);
    if (!error) setEmpresasPend((atual) => atual.map((e) => (e.id === id ? { ...e, ...formEmpresa } : e)));
    setEditandoEmpresa(null);
  };

  // -------------------------------------------------------------------------
  // Moderação de produtos — publicar/despublicar e remover de verdade.
  // -------------------------------------------------------------------------
  const [produtosAdmin, setProdutosAdmin] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("produtos").select("id, nome, ativo, empresas(nome)").order("criado_em", { ascending: false })
      .then(({ data, error }) => { if (!error) setProdutosAdmin(data || []); });
  }, []);

  const listaProdutos = produtosAdmin ?? produtosModeracao.map((p, i) => ({
    id: `demo-${i}`, nome: p.nome, ativo: p.status !== "denunciado", empresas: { nome: p.empresa }, _denunciado: p.status === "denunciado",
  }));
  const [buscaProdutosAdmin, setBuscaProdutosAdmin] = useState("");
  const listaProdutosFiltradaAdmin = useMemo(() => {
    if (!buscaProdutosAdmin.trim()) return listaProdutos;
    const q = buscaProdutosAdmin.toLowerCase();
    return listaProdutos.filter((p) => (p.nome || "").toLowerCase().includes(q) || (p.empresas?.nome || "").toLowerCase().includes(q));
  }, [listaProdutos, buscaProdutosAdmin]);
  const [qtdProdutosAdminVisiveis, setQtdProdutosAdminVisiveis] = useState(15);
  useEffect(() => { setQtdProdutosAdminVisiveis(15); }, [buscaProdutosAdmin]);

  const alternarAtivoProduto = async (id, ativo) => {
    setProdutosAdmin((atual) => (atual || listaProdutos).map((p) => (p.id === id ? { ...p, ativo } : p)));
    if (!supabaseConfigurado) return;
    await supabase.from("produtos").update({ ativo }).eq("id", id);
  };

  const removerProduto = async (id) => {
    if (!supabaseConfigurado) { setProdutosAdmin((atual) => (atual || listaProdutos).filter((p) => p.id !== id)); return; }
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (!error) setProdutosAdmin((atual) => atual.filter((p) => p.id !== id));
  };

  // -------------------------------------------------------------------------
  // Promoções — cadastro real vinculado a um produto (nome, desconto,
  // imagem, período de validade e status). Antes essa tabela existia no
  // banco mas não tinha nenhuma tela nem política de acesso.
  // -------------------------------------------------------------------------
  const [promocoesAdmin, setPromocoesAdmin] = useState(null);
  const [novaPromocao, setNovaPromocao] = useState({ produto_id: "", nome: "", descricao: "", desconto_percentual: "", data_inicio: "", valida_ate: "", imagem_url: "" });
  const [publicandoPromocao, setPublicandoPromocao] = useState(false);
  const [statusPromocao, setStatusPromocao] = useState("");
  const [enviandoImagemPromocao, setEnviandoImagemPromocao] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("promocoes").select("*, produtos(nome, empresas(nome))").order("criado_em", { ascending: false })
      .then(({ data, error }) => { if (!error) setPromocoesAdmin(data || []); });
  }, []);

  const enviarImagemPromocao = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovaPromocao((v) => ({ ...v, imagem_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoImagemPromocao(true);
    const caminho = `promocoes/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("fotos-produtos").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoImagemPromocao(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("fotos-produtos").getPublicUrl(caminho);
        setNovaPromocao((v) => ({ ...v, imagem_url: pub.publicUrl }));
      }
    });
  };

  const publicarPromocao = async (e) => {
    e.preventDefault();
    setStatusPromocao("");
    if (!novaPromocao.produto_id || !novaPromocao.desconto_percentual || !novaPromocao.valida_ate) {
      setStatusPromocao("Escolha o produto, o desconto e a validade.");
      return;
    }
    if (!supabaseConfigurado) {
      setPromocoesAdmin((atual) => [{ id: `demo-${Date.now()}`, ...novaPromocao, ativa: true }, ...(atual ?? [])]);
      setNovaPromocao({ produto_id: "", nome: "", descricao: "", desconto_percentual: "", data_inicio: "", valida_ate: "", imagem_url: "" });
      setStatusPromocao("ok");
      return;
    }
    setPublicandoPromocao(true);
    try {
      const registro = {
        produto_id: novaPromocao.produto_id, nome: novaPromocao.nome || null, descricao: novaPromocao.descricao || null,
        desconto_percentual: Number(novaPromocao.desconto_percentual), data_inicio: novaPromocao.data_inicio || null,
        valida_ate: novaPromocao.valida_ate, imagem_url: novaPromocao.imagem_url || null, ativa: true,
      };
      const { data, error } = await supabase.from("promocoes").insert(registro).select("*, produtos(nome, empresas(nome))").single();
      if (error) throw error;
      setPromocoesAdmin((atual) => [data, ...(atual ?? [])]);
      setNovaPromocao({ produto_id: "", nome: "", descricao: "", desconto_percentual: "", data_inicio: "", valida_ate: "", imagem_url: "" });
      setStatusPromocao("ok");
    } catch (err) {
      setStatusPromocao(err.message || "Erro ao publicar promoção");
    } finally {
      setPublicandoPromocao(false);
    }
  };

  const alternarAtivaPromocao = async (id, ativa) => {
    setPromocoesAdmin((atual) => (atual ?? []).map((p) => (p.id === id ? { ...p, ativa } : p)));
    if (!supabaseConfigurado || String(id).startsWith("demo-")) return;
    await supabase.from("promocoes").update({ ativa }).eq("id", id);
  };

  const removerPromocao = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setPromocoesAdmin((atual) => (atual ?? []).filter((p) => p.id !== id));
      return;
    }
    const { error } = await supabase.from("promocoes").delete().eq("id", id);
    if (!error) setPromocoesAdmin((atual) => atual.filter((p) => p.id !== id));
  };

  // -------------------------------------------------------------------------
  // Feira do Empreendedor — configuração da feira regular, feiras especiais
  // (guardadas como eventos do calendário com tipo "feira") e aprovação de
  // feirantes cadastrados pelo site público.
  // -------------------------------------------------------------------------
  const [feiraConfig, setFeiraConfig] = useState({ dia: feiraRegular.dia, horario: feiraRegular.horario, local: feiraRegular.local });
  const [salvandoFeira, setSalvandoFeira] = useState(false);
  const [statusFeira, setStatusFeira] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("feira_config").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) setFeiraConfig({ dia: data.dia, horario: data.horario, local: data.local });
    });
  }, []);

  const salvarFeiraConfig = async (e) => {
    e.preventDefault();
    setStatusFeira("");
    if (!supabaseConfigurado) { setStatusFeira("ok"); return; }
    setSalvandoFeira(true);
    try {
      const { error } = await supabase.from("feira_config").upsert({ id: 1, ...feiraConfig });
      if (error) throw error;
      setStatusFeira("ok");
    } catch (err) {
      setStatusFeira(err.message || "Erro ao salvar");
    } finally {
      setSalvandoFeira(false);
    }
  };

  const [feirantes, setFeirantes] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("feirantes").select("*, credenciais(codigo)").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setFeirantes((data || []).map((f) => ({ ...f, credencial_codigo: f.credenciais?.codigo || null })));
    });
  }, []);

  const mudarStatusFeirante = async (id, status) => {
    if (!supabaseConfigurado) { setFeirantes((atual) => (atual || []).map((f) => (f.id === id ? { ...f, status } : f))); return; }
    const { error } = await supabase.from("feirantes").update({ status }).eq("id", id);
    if (!error) setFeirantes((atual) => atual.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  // Bloquear/desbloquear e excluir feirante — FASE 25.
  const alternarBloqueioFeirante = async (f) => {
    const novoStatus = f.status === "bloqueado" ? "aprovado" : "bloqueado";
    const { error } = await supabase.from("feirantes").update({ status: novoStatus }).eq("id", f.id);
    if (!error) {
      setFeirantes((atual) => atual.map((x) => (x.id === f.id ? { ...x, status: novoStatus } : x)));
      notificar(novoStatus === "bloqueado" ? "Feirante bloqueado." : "Feirante desbloqueado.", novoStatus === "bloqueado" ? "aviso" : "sucesso");
    } else notificar("Não consegui atualizar: " + error.message, "erro");
  };

  const removerFeiranteAdmin = async (id) => {
    const { error } = await supabase.from("feirantes").delete().eq("id", id);
    if (!error) { setFeirantes((atual) => atual.filter((f) => f.id !== id)); notificar("Feirante excluído."); }
    else notificar("Não consegui excluir: " + error.message, "erro");
  };

  // Marca se o feirante realmente montou barraca no dia (diferente de só
  // ter cadastro aprovado) e se tem MEI — entram no painel de Critérios de
  // participação. FASE 44.
  const marcarCompareceuFeirante = async (id, compareceu) => {
    const { error } = await supabase.from("feirantes").update({ compareceu }).eq("id", id);
    if (!error) setFeirantes((atual) => atual.map((f) => (f.id === id ? { ...f, compareceu } : f)));
  };
  const alternarMeiFeirante = async (id, possui_mei) => {
    const { error } = await supabase.from("feirantes").update({ possui_mei }).eq("id", id);
    if (!error) setFeirantes((atual) => atual.map((f) => (f.id === id ? { ...f, possui_mei } : f)));
  };

  const [feirasEspeciaisAdmin, setFeirasEspeciaisAdmin] = useState(null);
  const [novaFeiraEspecial, setNovaFeiraEspecial] = useState({ titulo: "", data_inicio: "", local: "", imagem_url: "", link_url: "" });
  const [enviandoFotoFeiraEspecial, setEnviandoFotoFeiraEspecial] = useState(false);

  const enviarFotoFeiraEspecial = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovaFeiraEspecial((f) => ({ ...f, imagem_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoFotoFeiraEspecial(true);
    const caminho = `feiras/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoFeiraEspecial(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setNovaFeiraEspecial((f) => ({ ...f, imagem_url: pub.publicUrl }));
      }
    });
  };

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("eventos_calendario").select("*").eq("tipo", "feira").order("data_inicio").then(({ data, error }) => {
      if (!error) setFeirasEspeciaisAdmin(data || []);
    });
  }, []);

  const listaFeirasEspeciais = feirasEspeciaisAdmin ?? feirasEspeciais.map((f, i) => ({ id: `demo-${i}`, titulo: f.titulo, data_inicio: f.data, local: f.local }));

  const adicionarFeiraEspecial = async (e) => {
    e.preventDefault();
    if (!novaFeiraEspecial.titulo || !novaFeiraEspecial.data_inicio) return;
    if (!supabaseConfigurado) {
      setFeirasEspeciaisAdmin((atual) => [...(atual ?? listaFeirasEspeciais), { id: `demo-${Date.now()}`, ...novaFeiraEspecial }]);
      setNovaFeiraEspecial({ titulo: "", data_inicio: "", local: "", imagem_url: "", link_url: "" });
      return;
    }
    const { data, error } = await supabase.from("eventos_calendario").insert({ ...novaFeiraEspecial, tipo: "feira" }).select().single();
    if (!error) {
      setFeirasEspeciaisAdmin((atual) => [...(atual ?? []), data]);
      setNovaFeiraEspecial({ titulo: "", data_inicio: "", local: "", imagem_url: "", link_url: "" });
    }
  };

  const removerFeiraEspecial = async (id) => {
    if (!supabaseConfigurado) { setFeirasEspeciaisAdmin((atual) => (atual ?? listaFeirasEspeciais).filter((f) => f.id !== id)); return; }
    const { error } = await supabase.from("eventos_calendario").delete().eq("id", id);
    if (!error) setFeirasEspeciaisAdmin((atual) => atual.filter((f) => f.id !== id));
  };

  // -------------------------------------------------------------------------
  // Calendário de eventos — CRUD completo, só o admin edita. Aparece no site
  // principal em modo somente leitura (componente CalendarioEventos).
  // -------------------------------------------------------------------------
  const [eventosAdmin, setEventosAdmin] = useState(null);
  const eventoVazio = { titulo: "", descricao: "", data_inicio: "", data_fim: "", hora: "", local: "", tipo: "outro", banner_url: "", link_inscricao: "", google_maps_url: "", status: "confirmado", relato: "", relato_fotos: [] };
  const [novoEvento, setNovoEvento] = useState(eventoVazio);
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [erroEvento, setErroEvento] = useState("");
  const [enviandoBannerEvento, setEnviandoBannerEvento] = useState(false);

  const enviarBannerEvento = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovoEvento((f) => ({ ...f, banner_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoBannerEvento(true);
    const caminho = `eventos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBannerEvento(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setNovoEvento((f) => ({ ...f, banner_url: pub.publicUrl }));
      }
    });
  };

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("eventos_calendario").select("*").order("data_inicio").then(({ data, error }) => {
      if (!error) setEventosAdmin(data || []);
    });
  }, []);

  const listaEventos = eventosAdmin ?? [];
  const [filtroTipoEventoAdmin, setFiltroTipoEventoAdmin] = useState("todos");
  const listaEventosFiltrada = filtroTipoEventoAdmin === "todos" ? listaEventos : listaEventos.filter((ev) => (ev.tipo || "outro") === filtroTipoEventoAdmin);

  const adicionarEvento = async (e) => {
    e.preventDefault();
    setErroEvento("");
    if (!novoEvento.titulo || !novoEvento.data_inicio) { setErroEvento("Preencha ao menos título e data."); return; }
    if (!supabaseConfigurado) {
      setEventosAdmin((atual) => [...(atual ?? []), { id: `demo-${Date.now()}`, ...novoEvento }]);
      setNovoEvento(eventoVazio);
      return;
    }
    setSalvandoEvento(true);
    try {
      const registro = { ...novoEvento, data_fim: novoEvento.data_fim || null };
      const { data, error } = await supabase.from("eventos_calendario").insert(registro).select().single();
      if (error) throw error;
      setEventosAdmin((atual) => [...(atual ?? []), data]);
      setNovoEvento(eventoVazio);
    } catch (err) {
      setErroEvento(err.message || "Erro ao salvar evento");
    } finally {
      setSalvandoEvento(false);
    }
  };

  const removerEvento = async (id) => {
    if (!supabaseConfigurado) { setEventosAdmin((atual) => (atual ?? []).filter((ev) => ev.id !== id)); return; }
    const { error } = await supabase.from("eventos_calendario").delete().eq("id", id);
    if (!error) setEventosAdmin((atual) => atual.filter((ev) => ev.id !== id));
  };

  const mudarStatusEvento = async (id, status) => {
    if (!supabaseConfigurado) { setEventosAdmin((atual) => (atual ?? []).map((ev) => (ev.id === id ? { ...ev, status } : ev))); return; }
    const { error } = await supabase.from("eventos_calendario").update({ status }).eq("id", id);
    if (!error) setEventosAdmin((atual) => atual.map((ev) => (ev.id === id ? { ...ev, status } : ev)));
  };

  const [editandoEvento, setEditandoEvento] = useState(null);
  const [formEvento, setFormEvento] = useState(eventoVazio);
  const [enviandoBannerEdicaoEvento, setEnviandoBannerEdicaoEvento] = useState(false);

  const iniciarEdicaoEvento = (ev) => {
    setEditandoEvento(ev.id);
    setFormEvento({
      titulo: ev.titulo || "", descricao: ev.descricao || "", data_inicio: ev.data_inicio || "",
      data_fim: ev.data_fim || "", hora: ev.hora || "", local: ev.local || "", tipo: ev.tipo || "outro",
      banner_url: ev.banner_url || "", link_inscricao: ev.link_inscricao || "",
      google_maps_url: ev.google_maps_url || "", status: ev.status || "confirmado",
      relato: ev.relato || "", relato_fotos: ev.relato_fotos || [],
    });
  };

  const [enviandoFotoRelatoEvento, setEnviandoFotoRelatoEvento] = useState(false);
  const enviarFotoRelatoEvento = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setFormEvento((f) => ({ ...f, relato_fotos: [...f.relato_fotos, URL.createObjectURL(arquivo)] })); return; }
    setEnviandoFotoRelatoEvento(true);
    const caminho = `relatos-eventos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoRelatoEvento(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setFormEvento((f) => ({ ...f, relato_fotos: [...f.relato_fotos, pub.publicUrl] }));
      }
    });
  };
  const removerFotoRelatoEvento = (indice) => {
    setFormEvento((f) => ({ ...f, relato_fotos: f.relato_fotos.filter((_, i) => i !== indice) }));
  };

  const enviarBannerEdicaoEvento = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setFormEvento((f) => ({ ...f, banner_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoBannerEdicaoEvento(true);
    const caminho = `eventos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBannerEdicaoEvento(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setFormEvento((f) => ({ ...f, banner_url: pub.publicUrl }));
      }
    });
  };

  const salvarEdicaoEvento = async (id) => {
    const registro = { ...formEvento, data_fim: formEvento.data_fim || null };
    if (!supabaseConfigurado) {
      setEventosAdmin((atual) => (atual ?? []).map((ev) => (ev.id === id ? { ...ev, ...registro } : ev)));
      setEditandoEvento(null);
      return;
    }
    const { error } = await supabase.from("eventos_calendario").update(registro).eq("id", id);
    if (!error) setEventosAdmin((atual) => atual.map((ev) => (ev.id === id ? { ...ev, ...registro } : ev)));
    setEditandoEvento(null);
  };

  // Quem confirmou presença em cada evento — carregado só quando o admin
  // clica em "Ver participantes" (evita buscar tudo de uma vez).
  const [participantesAbertos, setParticipantesAbertos] = useState(null); // id do evento aberto
  const [participantesPorEvento, setParticipantesPorEvento] = useState({}); // { [eventoId]: [...] }
  const verParticipantes = (eventoId) => {
    if (participantesAbertos === eventoId) { setParticipantesAbertos(null); return; }
    setParticipantesAbertos(eventoId);
    if (!participantesPorEvento[eventoId]) {
      supabase.from("evento_participantes").select("*").eq("evento_id", eventoId).order("criado_em", { ascending: false }).then(({ data, error }) => {
        if (!error) setParticipantesPorEvento((atual) => ({ ...atual, [eventoId]: data || [] }));
      });
    }
  };

  // Cadastro manual de participante pelo admin — cobre quem esteve num
  // evento (inclusive já passado) mas nunca confirmou presença pelo site,
  // pra poder contar nos Critérios de participação.
  const [novoParticipanteManual, setNovoParticipanteManual] = useState({}); // { [eventoId]: { nome, telefone } }
  const adicionarParticipanteManual = async (eventoId) => {
    const dados = novoParticipanteManual[eventoId];
    if (!dados?.nome?.trim()) { notificar("Informe o nome.", "aviso"); return; }
    const { data, error } = await supabase.from("evento_participantes").insert({
      evento_id: eventoId, nome: dados.nome.trim(), telefone: dados.telefone?.trim() || null, compareceu: true,
    }).select().single();
    if (error) { notificar("Não consegui adicionar: " + error.message, "erro"); return; }
    setParticipantesPorEvento((atual) => ({ ...atual, [eventoId]: [data, ...(atual[eventoId] || [])] }));
    setNovoParticipanteManual((s) => ({ ...s, [eventoId]: { nome: "", telefone: "" } }));
    notificar("Participante adicionado.");
  };

  // Marca quem realmente compareceu no dia (diferente de só ter confirmado
  // presença antes) — usado no painel de Critérios de participação. FASE 44.
  const marcarCompareceuEvento = async (eventoId, participanteId, compareceu) => {
    const { error } = await supabase.from("evento_participantes").update({ compareceu }).eq("id", participanteId);
    if (!error) {
      setParticipantesPorEvento((atual) => ({
        ...atual,
        [eventoId]: (atual[eventoId] || []).map((p) => (p.id === participanteId ? { ...p, compareceu } : p)),
      }));
    }
  };

  const atualizarServico = (indice, campo, valor) => {
    setServicos((atual) => atual.map((s, i) => (i === indice ? { ...s, [campo]: valor } : s)));
  };

  const salvarServico = async (servico) => {
    if (!supabaseConfigurado) return;
    setSalvandoServico(servico.titulo);
    try {
      const registro = { titulo: servico.titulo, descricao: servico.descricao, url: servico.url, cor_hex: servico.cor_hex, logo_url: servico.logo_url, ordem: servico.ordem ?? 0, ativo: true };
      const { error } = servico.id
        ? await supabase.from("servicos_empreendedor").update(registro).eq("id", servico.id)
        : await supabase.from("servicos_empreendedor").insert(registro);
      if (error) throw error;
      setStatusServico((s) => ({ ...s, [servico.titulo]: "ok" }));
    } catch (err) {
      setStatusServico((s) => ({ ...s, [servico.titulo]: err.message || "Erro ao salvar" }));
    } finally {
      setSalvandoServico(null);
    }
  };

  const enviarLogoServico = (indice, e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) {
      atualizarServico(indice, "logo_url", URL.createObjectURL(arquivo));
      return;
    }
    const caminho = `servicos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("logos").upload(caminho, arquivo).then(({ error }) => {
      if (error) return;
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(caminho);
      atualizarServico(indice, "logo_url", pub.publicUrl);
    });
  };

  // -------------------------------------------------------------------------
  // Banners da home — upload de imagem de verdade (Storage) + tabela banners.
  // -------------------------------------------------------------------------
  const [bannersAdmin, setBannersAdmin] = useState(null);
  const [enviandoBanner, setEnviandoBanner] = useState(null);
  const [statusBanner, setStatusBanner] = useState({});

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("banners").select("*").order("ordem").then(({ data, error }) => {
      if (!error) setBannersAdmin(data || []);
    });
  }, []);

  const listaBanners = bannersAdmin ?? [
    { id: "demo-1", titulo: "Banner principal", imagem_url: null, link_url: "", ordem: 1, ativo: true },
    { id: "demo-2", titulo: "Campanha Compre em Ivatuba", imagem_url: null, link_url: "", ordem: 2, ativo: true },
  ];

  const atualizarBanner = (id, campo, valor) =>
    setBannersAdmin((atual) => (atual ?? listaBanners).map((b) => (b.id === id ? { ...b, [campo]: valor } : b)));

  const enviarImagemBanner = (id, e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { atualizarBanner(id, "imagem_url", URL.createObjectURL(arquivo)); return; }
    setEnviandoBanner(id);
    const caminho = `banners/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBanner(null);
      if (error) { setStatusBanner((s) => ({ ...s, [id]: error.message })); return; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
      atualizarBanner(id, "imagem_url", pub.publicUrl);
    });
  };

  const enviarImagemBannerMobile = (id, e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { atualizarBanner(id, "imagem_mobile_url", URL.createObjectURL(arquivo)); return; }
    setEnviandoBanner(id);
    const caminho = `banners/mobile-${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBanner(null);
      if (error) { setStatusBanner((s) => ({ ...s, [id]: error.message })); return; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
      atualizarBanner(id, "imagem_mobile_url", pub.publicUrl);
    });
  };

  const salvarBanner = async (banner) => {
    setStatusBanner((s) => ({ ...s, [banner.id]: "" }));
    if (!banner.imagem_url) { setStatusBanner((s) => ({ ...s, [banner.id]: "Envie uma imagem antes de salvar." })); return; }
    if (!supabaseConfigurado) { setStatusBanner((s) => ({ ...s, [banner.id]: "ok" })); return; }
    try {
      const registro = {
        titulo: banner.titulo, descricao: banner.descricao || null, botao_texto: banner.botao_texto || null,
        imagem_url: banner.imagem_url, imagem_mobile_url: banner.imagem_mobile_url || null,
        link_url: banner.link_url, ordem: banner.ordem ?? 0, ativo: banner.ativo !== false,
        posicao: banner.posicao || "geral",
        data_inicio: banner.data_inicio || null, data_fim: banner.data_fim || null,
      };
      const ehNovo = String(banner.id).startsWith("demo-") || String(banner.id).startsWith("novo-");
      const { data, error } = ehNovo
        ? await supabase.from("banners").insert(registro).select().single()
        : await supabase.from("banners").update(registro).eq("id", banner.id).select().single();
      if (error) throw error;
      setBannersAdmin((atual) => (atual ?? listaBanners).map((b) => (b.id === banner.id ? data : b)));
      setStatusBanner((s) => ({ ...s, [banner.id]: "ok" }));
    } catch (err) {
      setStatusBanner((s) => ({ ...s, [banner.id]: err.message || "Erro ao salvar" }));
    }
  };

  const removerBanner = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-") || String(id).startsWith("novo-")) {
      setBannersAdmin((atual) => (atual ?? listaBanners).filter((b) => b.id !== id));
      return;
    }
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (!error) setBannersAdmin((atual) => atual.filter((b) => b.id !== id));
  };

  // -------------------------------------------------------------------------
  // Cadastrar usuário direto pelo admin — sem passar pelo cadastro público.
  // Usa um endpoint de servidor (api/admin-criar-usuario) com a chave de
  // serviço, porque criar conta de outra pessoa exige privilégio de admin
  // que não pode ficar no navegador.
  // -------------------------------------------------------------------------
  const [novoUsuarioAdmin, setNovoUsuarioAdmin] = useState({ nome: "", email: "", senha: "", tipo: "cliente", cpf: "", cnpj: "", empresaNome: "", empresaCategoria: "", empresaWhatsapp: "", empresaInstagram: "", empresaEndereco: "", empresaGoogleMaps: "", empresaAceitaCartaoServidor: false, prestadorServico: "", prestadorWhatsapp: "", prestadorInstagram: "", prestadorEndereco: "", prestadorGoogleMaps: "" });
  const [criandoUsuarioAdmin, setCriandoUsuarioAdmin] = useState(false);
  const [statusUsuarioAdmin, setStatusUsuarioAdmin] = useState("");

  // Permite reaproveitar um perfil já cadastrado (ex: alguém que já criou
  // conta de cliente) em vez de sempre criar uma conta nova do zero — o
  // email/nome vêm preenchidos automaticamente do perfil escolhido.
  const [buscaUsuarioExistente, setBuscaUsuarioExistente] = useState("");
  const [usuarioExistenteSelecionado, setUsuarioExistenteSelecionado] = useState(null);

  const selecionarUsuarioExistente = (u) => {
    setUsuarioExistenteSelecionado(u);
    setBuscaUsuarioExistente("");
    setNovoUsuarioAdmin((v) => ({ ...v, nome: u.nome || "", email: u.email || "", cpf: u.cpf || v.cpf, cnpj: u.cnpj || v.cnpj }));
  };

  const limparUsuarioExistente = () => {
    setUsuarioExistenteSelecionado(null);
    setNovoUsuarioAdmin((v) => ({ ...v, nome: "", email: "" }));
  };

  const criarUsuarioAdmin = async (e) => {
    e.preventDefault();
    setStatusUsuarioAdmin("");
    if (!supabaseConfigurado) {
      setStatusUsuarioAdmin("Modo demonstração: conecte o Supabase para criar usuários de verdade.");
      return;
    }
    setCriandoUsuarioAdmin(true);
    try {
      // Reaproveitando um perfil já existente: não cria conta nova, só
      // ajusta o tipo do perfil e cadastra a empresa/prestador vinculados.
      if (usuarioExistenteSelecionado) {
        const v = novoUsuarioAdmin;
        if (v.tipo !== usuarioExistenteSelecionado.tipo) {
          const { error: erroTipo } = await supabase.from("perfis").update({ tipo: v.tipo }).eq("id", usuarioExistenteSelecionado.id);
          if (erroTipo) throw new Error("Não consegui atualizar o tipo do usuário: " + erroTipo.message);
        }
        if (v.tipo === "empresario" && v.empresaNome) {
          const { error: erroEmpresa } = await supabase.from("empresas").insert({
            dono_id: usuarioExistenteSelecionado.id,
            nome: v.empresaNome,
            categoria: v.empresaCategoria || "Outros",
            whatsapp: v.empresaWhatsapp || null,
            instagram: v.empresaInstagram || null,
            endereco: v.empresaEndereco || null,
            google_maps_url: v.empresaGoogleMaps || null,
            email: v.email || null,
            cpf: v.cpf || null,
            cnpj: v.cnpj || null,
            aceita_cartao_servidor: !!v.empresaAceitaCartaoServidor,
            status: "aprovada",
          });
          if (erroEmpresa) throw new Error("Usuário atualizado, mas a empresa não pôde ser cadastrada: " + erroEmpresa.message);
        }
        if (v.tipo === "prestador") {
          const { error: erroPrestador } = await supabase.from("prestadores").insert({
            dono_id: usuarioExistenteSelecionado.id,
            nome: v.nome,
            servico: v.prestadorServico,
            whatsapp: v.prestadorWhatsapp || null,
            instagram: v.prestadorInstagram || null,
            endereco: v.prestadorEndereco || null,
            google_maps_url: v.prestadorGoogleMaps || null,
            email: v.email || null,
            cpf: v.cpf || null,
            cnpj: v.cnpj || null,
            status: "aprovado",
          });
          if (erroPrestador) throw new Error("Usuário atualizado, mas o prestador não pôde ser cadastrado: " + erroPrestador.message);
        }
        setStatusUsuarioAdmin("ok");
        limparUsuarioExistente();
        setNovoUsuarioAdmin({ nome: "", email: "", senha: "", tipo: "cliente", cpf: "", cnpj: "", empresaNome: "", empresaCategoria: "", empresaWhatsapp: "", empresaInstagram: "", empresaEndereco: "", empresaGoogleMaps: "", empresaAceitaCartaoServidor: false, prestadorServico: "", prestadorWhatsapp: "", prestadorInstagram: "", prestadorEndereco: "", prestadorGoogleMaps: "" });
        carregarTodosUsuariosAdmin();
        return;
      }

      const { data: sessaoAtual } = await supabase.auth.getSession();
      const token = sessaoAtual?.session?.access_token;
      const resp = await fetch("/api/admin-criar-usuario", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(novoUsuarioAdmin),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não foi possível criar o usuário agora.");
      setStatusUsuarioAdmin("ok");
      setNovoUsuarioAdmin({ nome: "", email: "", senha: "", tipo: "cliente", empresaNome: "", empresaCategoria: "", empresaWhatsapp: "", empresaInstagram: "", empresaEndereco: "", empresaGoogleMaps: "", empresaAceitaCartaoServidor: false, prestadorServico: "", prestadorWhatsapp: "", prestadorInstagram: "", prestadorEndereco: "", prestadorGoogleMaps: "" });
      carregarTodosUsuariosAdmin(); // atualiza a lista de "Usuários cadastrados" na hora
    } catch (err) {
      setStatusUsuarioAdmin(err.message || "Erro ao criar usuário.");
    } finally {
      setCriandoUsuarioAdmin(false);
    }
  };

  // -------------------------------------------------------------------------
  // Identidade visual do site — cor principal, logo e frase de destaque.
  // -------------------------------------------------------------------------
  const [siteConfigAdmin, setSiteConfigAdmin] = useState(null);
  const [enviandoLogoSite, setEnviandoLogoSite] = useState(false);
  const [salvandoIdentidade, setSalvandoIdentidade] = useState(false);
  const [statusIdentidade, setStatusIdentidade] = useState("");

  const siteConfigVazio = {
    cor_principal: "#0A5AA8", logo_url: null, frase: "",
    telefone: "", whatsapp_contato: "", instagram_contato: "", endereco_sala_empreendedor: "",
    fomento_ativo: false, fomento_foto_url: "", fomento_texto: "",
    fomento_link: "https://www.fomento.pr.gov.br/Linhas-de-Credito",
    fomento_whatsapp: "", fomento_agente_nome: "Gabriel Oliveira",
    agencia_ativo: false, agencia_texto: "", agencia_endereco: "", agencia_whatsapp: "", agencia_horario: "",
    sala_horario: "", sala_servicos: "",
    turismo_ativo: false, historia_cidade: "", historia_foto_url: "",
    mural_ativo: false,
    termos_uso: "", politica_privacidade: "",
    utilidade_ativo: false,
    ouvidoria_ativo: false,
    classificados_ativo: false,
    estatisticas_ativo: false,
    agendamento_ativo: false,
  };

  useEffect(() => {
    if (!supabaseConfigurado) { setSiteConfigAdmin(siteConfigVazio); return; }
    supabase.from("site_config").select("*").eq("id", 1).single().then(({ data }) => {
      setSiteConfigAdmin(data ? { ...siteConfigVazio, ...data } : siteConfigVazio);
    });
  }, []);

  // Cadastros de interessados na Fomento Paraná (leads).
  const [fomentoLeadsAdmin, setFomentoLeadsAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("fomento_leads").select("*").order("criado_em", { ascending: false }).limit(50).then(({ data, error }) => {
      if (!error) setFomentoLeadsAdmin(data || []);
    });
  }, []);
  const ROTULO_STATUS_FOMENTO = { recebido: "Recebido", em_analise: "Em processo", concedido: "Concedido", negado: "Negado" };
  const CONTAGEM_STATUS_FOMENTO_VAZIA = { recebido: 0, em_analise: 0, concedido: 0, negado: 0 };
  const contagemStatusFomento = (fomentoLeadsAdmin ?? []).reduce(
    (acc, l) => ({ ...acc, [l.status || "recebido"]: (acc[l.status || "recebido"] || 0) + 1 }),
    CONTAGEM_STATUS_FOMENTO_VAZIA
  );
  const atualizarStatusFomentoLead = async (id, status) => {
    const { error } = await supabase.from("fomento_leads").update({ status }).eq("id", id);
    if (!error) setFomentoLeadsAdmin((atual) => atual.map((l) => (l.id === id ? { ...l, status } : l)));
    else notificar(error.message || "Não foi possível atualizar o status.", "erro");
  };
  const [valorConcedidoEdicao, setValorConcedidoEdicao] = useState({}); // { [id]: texto digitado }
  const salvarValorConcedidoFomento = async (id) => {
    const texto = valorConcedidoEdicao[id];
    if (texto === undefined) return;
    const valor = texto.trim() === "" ? null : parseMoedaBR(texto);
    const { error } = await supabase.from("fomento_leads").update({ valor_concedido: valor }).eq("id", id);
    if (!error) {
      setFomentoLeadsAdmin((atual) => atual.map((l) => (l.id === id ? { ...l, valor_concedido: valor } : l)));
      setValorConcedidoEdicao((atual) => { const { [id]: _omit, ...resto } = atual; return resto; });
    } else {
      notificar(error.message || "Não foi possível salvar o valor.", "erro");
    }
  };
  const totalConcedidoFomento = (fomentoLeadsAdmin ?? []).reduce((s, l) => s + (Number(l.valor_concedido) || 0), 0);

  const formatarValorRelatorioFomento = (v) => v != null ? Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—";

  const exportarFomentoExcel = () => {
    const cabecalho = ["Nome/Categoria", "Status", "Valor concedido (R$)", "Data", "Orientação", "Proposta"];
    const linhas = (fomentoLeadsAdmin ?? []).map((l) => [
      l.nome || l.categoria || "—",
      ROTULO_STATUS_FOMENTO[l.status] || l.status || "—",
      formatarValorRelatorioFomento(l.valor_concedido),
      l.criado_em ? new Date(l.criado_em).toLocaleDateString("pt-BR") : "—",
      l.orientacao || "",
      l.proposta || "",
    ]);
    linhas.push(["TOTAL CONCEDIDO", "", formatarValorRelatorioFomento(totalConcedidoFomento), "", "", ""]);
    const csv = [cabecalho, ...linhas].map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fomento-parana.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportarFomentoPDF = () => {
    const janela = window.open("", "_blank");
    if (!janela) return;
    const linhasHtml = (fomentoLeadsAdmin ?? []).map((l) => `
      <tr>
        <td>${l.nome || l.categoria || "—"}</td>
        <td>${ROTULO_STATUS_FOMENTO[l.status] || l.status || "—"}</td>
        <td class="num">R$ ${formatarValorRelatorioFomento(l.valor_concedido)}</td>
        <td>${l.criado_em ? new Date(l.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
        <td>${l.orientacao || ""}</td>
        <td>${l.proposta || ""}</td>
      </tr>
    `).join("");
    janela.document.write(`
      <html><head><title>Fomento Paraná — Ivatuba</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0E2233}
        h2{margin-bottom:4px} p{color:#5C7186;margin-top:0;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #DCE7F2;padding:6px 8px;text-align:left;font-size:12px}
        th{background:#EAF2FB;color:#0A5AA8}
        td.num,th.num{text-align:right}
        tfoot td{font-weight:bold;background:#EAF2FB}
      </style></head>
      <body>
        <h2>Relatório de Pedidos — Fomento Paraná — Ivatuba</h2>
        <p>${(fomentoLeadsAdmin ?? []).length} pedido(s) · gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
        <table>
          <thead><tr><th>Nome/Categoria</th><th>Status</th><th class="num">Valor concedido</th><th>Data</th><th>Orientação</th><th>Proposta</th></tr></thead>
          <tbody>${linhasHtml}</tbody>
          <tfoot><tr><td colspan="2">TOTAL CONCEDIDO</td><td class="num">R$ ${formatarValorRelatorioFomento(totalConcedidoFomento)}</td><td colspan="3"></td></tr></tfoot>
        </table>
      </body></html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 300);
  };

  // Cadastro manual de pedido do Fomento direto pelo admin (sem precisar
  // que a pessoa preencha o formulário público), tudo na aba Sala do
  // Empreendedor: valor, orientação, proposta, anexo e status.
  const CATEGORIAS_FOMENTO = ["Microcrédito", "Capital de giro", "Máquinas e equipamentos", "Outros"];
  const leadFomentoAdminVazio = { categoria: CATEGORIAS_FOMENTO[0], orientacao: "", proposta: "", valor_concedido: "", status: "recebido" };
  const [novoLeadFomentoAdmin, setNovoLeadFomentoAdmin] = useState(leadFomentoAdminVazio);
  const [anexoLeadFomentoAdmin, setAnexoLeadFomentoAdmin] = useState(null);
  const [criandoLeadFomentoAdmin, setCriandoLeadFomentoAdmin] = useState(false);
  const [statusCriarLeadFomento, setStatusCriarLeadFomento] = useState("");

  const criarLeadFomentoAdmin = async (e) => {
    e.preventDefault();
    setStatusCriarLeadFomento("");
    setCriandoLeadFomentoAdmin(true);
    try {
      let anexoUrl = null;
      if (anexoLeadFomentoAdmin) {
        const caminho = `propostas/${Date.now()}-${anexoLeadFomentoAdmin.name}`;
        const { error: erroUpload } = await supabase.storage.from("documentos-fomento").upload(caminho, anexoLeadFomentoAdmin);
        if (!erroUpload) {
          const { data: pub } = supabase.storage.from("documentos-fomento").getPublicUrl(caminho);
          anexoUrl = pub.publicUrl;
        }
      }
      const { data, error } = await supabase.from("fomento_leads").insert({
        categoria: novoLeadFomentoAdmin.categoria,
        orientacao: novoLeadFomentoAdmin.orientacao || null,
        proposta: novoLeadFomentoAdmin.proposta || null,
        valor_concedido: parseMoedaBR(novoLeadFomentoAdmin.valor_concedido),
        status: novoLeadFomentoAdmin.status,
        anexo_url: anexoUrl,
      }).select().single();
      if (error) throw error;
      setFomentoLeadsAdmin((atual) => [data, ...(atual ?? [])]);
      setNovoLeadFomentoAdmin(leadFomentoAdminVazio);
      setAnexoLeadFomentoAdmin(null);
      setStatusCriarLeadFomento("ok");
    } catch (err) {
      setStatusCriarLeadFomento(err.message || "Não foi possível cadastrar o pedido.");
    } finally {
      setCriandoLeadFomentoAdmin(false);
    }
  };

  const [detalhesFomentoEdicao, setDetalhesFomentoEdicao] = useState({}); // { [id]: { orientacao, proposta } }
  const salvarDetalhesFomento = async (id) => {
    const v = detalhesFomentoEdicao[id];
    if (!v) return;
    const registro = { orientacao: v.orientacao?.trim() || null, proposta: v.proposta?.trim() || null };
    const { error } = await supabase.from("fomento_leads").update(registro).eq("id", id);
    if (!error) {
      setFomentoLeadsAdmin((atual) => atual.map((l) => (l.id === id ? { ...l, ...registro } : l)));
      setDetalhesFomentoEdicao((atual) => { const { [id]: _omit, ...resto } = atual; return resto; });
    } else {
      notificar(error.message || "Não foi possível salvar.", "erro");
    }
  };

  const enviarAnexoFomentoLead = (id) => async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const caminho = `propostas/${Date.now()}-${arquivo.name}`;
    const { error: erroUpload } = await supabase.storage.from("documentos-fomento").upload(caminho, arquivo);
    if (erroUpload) { notificar("Não foi possível enviar o anexo.", "erro"); return; }
    const { data: pub } = supabase.storage.from("documentos-fomento").getPublicUrl(caminho);
    const { error } = await supabase.from("fomento_leads").update({ anexo_url: pub.publicUrl }).eq("id", id);
    if (!error) setFomentoLeadsAdmin((atual) => atual.map((l) => (l.id === id ? { ...l, anexo_url: pub.publicUrl } : l)));
    else notificar("Não foi possível salvar o anexo.", "erro");
  };

  const enviarFotoFomento = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setSiteConfigAdmin((v) => ({ ...v, fomento_foto_url: URL.createObjectURL(arquivo) })); return; }
    const caminho = `fomento/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setSiteConfigAdmin((v) => ({ ...v, fomento_foto_url: pub.publicUrl }));
      }
    });
  };

  const enviarFotoHistoriaCidade = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setSiteConfigAdmin((v) => ({ ...v, historia_foto_url: URL.createObjectURL(arquivo) })); return; }
    const caminho = `historia/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setSiteConfigAdmin((v) => ({ ...v, historia_foto_url: pub.publicUrl }));
      }
    });
  };

  // -------------------------------------------------------------------------
  // Pontos turísticos — a ordem escolhida também define a sequência do
  // roteiro sugerido mostrado no site. FASE 42.
  // -------------------------------------------------------------------------
  const [pontosTuristicosAdmin, setPontosTuristicosAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("pontos_turisticos").select("*").order("ordem").then(({ data, error }) => {
      if (!error) setPontosTuristicosAdmin(data || []);
    });
  }, []);
  const pontoTuristicoVazio = { nome: "", categoria: "", descricao: "", endereco: "", foto_url: "", google_maps_url: "", ordem: 0, destaque: false };
  const [novoPontoTuristico, setNovoPontoTuristico] = useState(pontoTuristicoVazio);
  const [enviandoFotoPontoTuristico, setEnviandoFotoPontoTuristico] = useState(false);
  const [publicandoPontoTuristico, setPublicandoPontoTuristico] = useState(false);
  const [statusPontoTuristico, setStatusPontoTuristico] = useState("");

  const enviarFotoPontoTuristico = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovoPontoTuristico((v) => ({ ...v, foto_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoFotoPontoTuristico(true);
    const caminho = `turismo/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoPontoTuristico(false);
      if (error) { setStatusPontoTuristico(error.message); return; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
      setNovoPontoTuristico((v) => ({ ...v, foto_url: pub.publicUrl }));
    });
  };

  const publicarPontoTuristico = async (e) => {
    e.preventDefault();
    setStatusPontoTuristico("");
    if (!novoPontoTuristico.nome.trim()) { setStatusPontoTuristico("Informe o nome do ponto turístico."); return; }
    setPublicandoPontoTuristico(true);
    try {
      const registro = { ...novoPontoTuristico, ordem: Number(novoPontoTuristico.ordem) || 0 };
      const { data, error } = await supabase.from("pontos_turisticos").insert(registro).select().single();
      if (error) throw error;
      setPontosTuristicosAdmin((atual) => [...(atual ?? []), data].sort((a, b) => a.ordem - b.ordem));
      setNovoPontoTuristico(pontoTuristicoVazio);
      setStatusPontoTuristico("ok");
    } catch (err) {
      setStatusPontoTuristico(err.message || "Erro ao publicar.");
    } finally {
      setPublicandoPontoTuristico(false);
    }
  };

  const removerPontoTuristico = async (id) => {
    const { error } = await supabase.from("pontos_turisticos").delete().eq("id", id);
    if (!error) { setPontosTuristicosAdmin((atual) => atual.filter((p) => p.id !== id)); notificar("Ponto turístico excluído."); }
  };

  const alternarDestaquePontoTuristico = async (p) => {
    const { error } = await supabase.from("pontos_turisticos").update({ destaque: !p.destaque }).eq("id", p.id);
    if (!error) setPontosTuristicosAdmin((atual) => atual.map((x) => (x.id === p.id ? { ...x, destaque: !p.destaque } : x)));
  };

  const [editandoPontoTuristico, setEditandoPontoTuristico] = useState(null);
  const [formPontoTuristico, setFormPontoTuristico] = useState(pontoTuristicoVazio);
  const [enviandoFotoEdicaoPontoTuristico, setEnviandoFotoEdicaoPontoTuristico] = useState(false);

  const iniciarEdicaoPontoTuristico = (p) => {
    setEditandoPontoTuristico(p.id);
    setFormPontoTuristico({
      nome: p.nome, categoria: p.categoria || "", descricao: p.descricao || "", endereco: p.endereco || "",
      foto_url: p.foto_url || "", google_maps_url: p.google_maps_url || "", ordem: p.ordem ?? 0, destaque: !!p.destaque,
    });
  };

  const enviarFotoEdicaoPontoTuristico = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setFormPontoTuristico((v) => ({ ...v, foto_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoFotoEdicaoPontoTuristico(true);
    const caminho = `turismo/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoEdicaoPontoTuristico(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setFormPontoTuristico((v) => ({ ...v, foto_url: pub.publicUrl }));
      }
    });
  };

  const salvarEdicaoPontoTuristico = async (id) => {
    const registro = { ...formPontoTuristico, ordem: Number(formPontoTuristico.ordem) || 0 };
    if (!supabaseConfigurado) {
      setPontosTuristicosAdmin((atual) => atual.map((p) => (p.id === id ? { ...p, ...registro } : p)));
      setEditandoPontoTuristico(null);
      return;
    }
    const { error } = await supabase.from("pontos_turisticos").update(registro).eq("id", id);
    if (!error) setPontosTuristicosAdmin((atual) => atual.map((p) => (p.id === id ? { ...p, ...registro } : p)).sort((a, b) => a.ordem - b.ordem));
    setEditandoPontoTuristico(null);
  };

  const enviarLogoSite = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setSiteConfigAdmin((v) => ({ ...v, logo_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoLogoSite(true);
    const caminho = `site/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("logos").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoLogoSite(false);
      if (error) { setStatusIdentidade(error.message); return; }
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(caminho);
      setSiteConfigAdmin((v) => ({ ...v, logo_url: pub.publicUrl }));
    });
  };

  const salvarIdentidade = async (e) => {
    e.preventDefault();
    setStatusIdentidade("");
    aplicarCorPrincipal(siteConfigAdmin.cor_principal);
    if (!supabaseConfigurado) { setStatusIdentidade("ok"); return; }
    setSalvandoIdentidade(true);
    try {
      const { error } = await supabase.from("site_config").upsert({
        id: 1,
        cor_principal: siteConfigAdmin.cor_principal,
        logo_url: siteConfigAdmin.logo_url,
        frase: siteConfigAdmin.frase,
        telefone: siteConfigAdmin.telefone || null,
        whatsapp_contato: siteConfigAdmin.whatsapp_contato || null,
        instagram_contato: siteConfigAdmin.instagram_contato || null,
        endereco_sala_empreendedor: siteConfigAdmin.endereco_sala_empreendedor || null,
        fomento_ativo: !!siteConfigAdmin.fomento_ativo,
        fomento_foto_url: siteConfigAdmin.fomento_foto_url || null,
        fomento_texto: siteConfigAdmin.fomento_texto || null,
        fomento_link: siteConfigAdmin.fomento_link || null,
        fomento_whatsapp: siteConfigAdmin.fomento_whatsapp || null,
        fomento_agente_nome: siteConfigAdmin.fomento_agente_nome || null,
        agencia_ativo: !!siteConfigAdmin.agencia_ativo,
        agencia_texto: siteConfigAdmin.agencia_texto || null,
        agencia_endereco: siteConfigAdmin.agencia_endereco || null,
        agencia_whatsapp: siteConfigAdmin.agencia_whatsapp || null,
        agencia_horario: siteConfigAdmin.agencia_horario || null,
        sala_horario: siteConfigAdmin.sala_horario || null,
        sala_servicos: siteConfigAdmin.sala_servicos || null,
        turismo_ativo: !!siteConfigAdmin.turismo_ativo,
        historia_cidade: siteConfigAdmin.historia_cidade || null,
        historia_foto_url: siteConfigAdmin.historia_foto_url || null,
        mural_ativo: !!siteConfigAdmin.mural_ativo,
        termos_uso: siteConfigAdmin.termos_uso || null,
        politica_privacidade: siteConfigAdmin.politica_privacidade || null,
        utilidade_ativo: !!siteConfigAdmin.utilidade_ativo,
        ouvidoria_ativo: !!siteConfigAdmin.ouvidoria_ativo,
        classificados_ativo: !!siteConfigAdmin.classificados_ativo,
        estatisticas_ativo: !!siteConfigAdmin.estatisticas_ativo,
        agendamento_ativo: !!siteConfigAdmin.agendamento_ativo,
      });
      if (error) throw error;
      setStatusIdentidade("ok");
    } catch (err) {
      setStatusIdentidade(err.message || "Erro ao salvar identidade visual");
    } finally {
      setSalvandoIdentidade(false);
    }
  };

  // -------------------------------------------------------------------------
  // Notícias — cadastro real com foto e link.
  // -------------------------------------------------------------------------
  const [noticiasAdmin, setNoticiasAdmin] = useState(null);
  const noticiaVazia = { titulo: "", resumo: "", conteudo: "", imagem_url: "", link_url: "", categoria: "", autor: "", tags: "", destaque: false, galeria_urls: [] };
  const [novaNoticia, setNovaNoticia] = useState(noticiaVazia);
  const [enviandoFotoNoticia, setEnviandoFotoNoticia] = useState(false);
  const [enviandoGaleriaNoticia, setEnviandoGaleriaNoticia] = useState(false);
  const [publicandoNoticia, setPublicandoNoticia] = useState(false);
  const [statusNoticia, setStatusNoticia] = useState("");
  const conteudoNoticiaRef = useRef(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("noticias").select("*").order("publicada_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setNoticiasAdmin(data || []);
    });
  }, []);

  const enviarFotoNoticia = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovaNoticia((v) => ({ ...v, imagem_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoFotoNoticia(true);
    const caminho = `noticias/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoNoticia(false);
      if (error) { setStatusNoticia(error.message); return; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
      setNovaNoticia((v) => ({ ...v, imagem_url: pub.publicUrl }));
    });
  };

  const enviarGaleriaNoticia = (e) => {
    const arquivos = Array.from(e.target.files || []);
    if (!arquivos.length) return;
    if (!supabaseConfigurado) {
      setNovaNoticia((v) => ({ ...v, galeria_urls: [...v.galeria_urls, ...arquivos.map((a) => URL.createObjectURL(a))] }));
      return;
    }
    setEnviandoGaleriaNoticia(true);
    (async () => {
      const urls = [];
      for (const arquivo of arquivos) {
        const caminho = `noticias/galeria/${Date.now()}-${arquivo.name}`;
        const { error } = await supabase.storage.from("banners").upload(caminho, arquivo);
        if (!error) {
          const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
          urls.push(pub.publicUrl);
        }
      }
      setNovaNoticia((v) => ({ ...v, galeria_urls: [...v.galeria_urls, ...urls] }));
      setEnviandoGaleriaNoticia(false);
    })();
  };

  const removerFotoGaleriaNoticia = (url) => setNovaNoticia((v) => ({ ...v, galeria_urls: v.galeria_urls.filter((u) => u !== url) }));

  // Toolbar de "editor rico" simples: envolve o texto selecionado com marcação
  // (negrito **, itálico *, título ##) sem depender de nenhuma biblioteca —
  // o site interpreta essa marcação na hora de exibir a notícia.
  const formatarConteudoNoticia = (marcador) => {
    const campo = conteudoNoticiaRef.current;
    if (!campo) return;
    const inicio = campo.selectionStart;
    const fim = campo.selectionEnd;
    const texto = novaNoticia.conteudo;
    const selecionado = texto.slice(inicio, fim) || "texto";
    const novoTexto = marcador === "##"
      ? `${texto.slice(0, inicio)}\n## ${selecionado}\n${texto.slice(fim)}`
      : `${texto.slice(0, inicio)}${marcador}${selecionado}${marcador}${texto.slice(fim)}`;
    setNovaNoticia((v) => ({ ...v, conteudo: novoTexto }));
  };

  const publicarNoticia = async (e) => {
    e.preventDefault();
    setStatusNoticia("");
    if (!novaNoticia.titulo) { setStatusNoticia("Informe ao menos o título."); return; }
    const registro = { ...novaNoticia, tags: novaNoticia.tags ? novaNoticia.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] };
    if (!supabaseConfigurado) {
      setNoticiasAdmin((atual) => [{ id: `demo-${Date.now()}`, ...registro, publicada_em: new Date().toISOString() }, ...(atual ?? [])]);
      setNovaNoticia(noticiaVazia);
      setStatusNoticia("ok");
      return;
    }
    setPublicandoNoticia(true);
    try {
      const { data, error } = await supabase.from("noticias").insert(registro).select().single();
      if (error) throw error;
      setNoticiasAdmin((atual) => [data, ...(atual ?? [])]);
      setNovaNoticia(noticiaVazia);
      setStatusNoticia("ok");
    } catch (err) {
      setStatusNoticia(err.message || "Erro ao publicar notícia");
    } finally {
      setPublicandoNoticia(false);
    }
  };

  const removerNoticia = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setNoticiasAdmin((atual) => (atual ?? []).filter((n) => n.id !== id));
      return;
    }
    const { error } = await supabase.from("noticias").delete().eq("id", id);
    if (!error) setNoticiasAdmin((atual) => atual.filter((n) => n.id !== id));
  };

  // -------------------------------------------------------------------------
  // Cursos — CRUD completo, só o administrador cadastra. Aparece no site
  // principal para todo mundo (seção "Cursos e Eventos").
  // -------------------------------------------------------------------------
  const [cursosAdmin, setCursosAdmin] = useState(null);
  const cursoVazio = { titulo: "", instituicao: "", descricao: "", professor: "", carga_horaria: "", data_inicio: "", link_inscricao: "", certificado: false, banner_url: "" };
  const [novoCurso, setNovoCurso] = useState(cursoVazio);
  const [enviandoBannerCurso, setEnviandoBannerCurso] = useState(false);
  const [publicandoCurso, setPublicandoCurso] = useState(false);
  const [statusCurso, setStatusCurso] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("cursos").select("*").order("data_inicio").then(({ data, error }) => {
      if (!error) setCursosAdmin(data || []);
    });
  }, []);

  const enviarBannerCurso = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovoCurso((v) => ({ ...v, banner_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoBannerCurso(true);
    const caminho = `cursos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBannerCurso(false);
      if (error) { setStatusCurso(error.message); return; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
      setNovoCurso((v) => ({ ...v, banner_url: pub.publicUrl }));
    });
  };

  const publicarCurso = async (e) => {
    e.preventDefault();
    setStatusCurso("");
    if (!novoCurso.titulo || !novoCurso.data_inicio) { setStatusCurso("Informe ao menos o título e a data."); return; }
    if (!supabaseConfigurado) {
      setCursosAdmin((atual) => [{ id: `demo-${Date.now()}`, ...novoCurso }, ...(atual ?? [])]);
      setNovoCurso(cursoVazio);
      setStatusCurso("ok");
      return;
    }
    setPublicandoCurso(true);
    try {
      const { data, error } = await supabase.from("cursos").insert(novoCurso).select().single();
      if (error) throw error;
      setCursosAdmin((atual) => [data, ...(atual ?? [])]);
      setNovoCurso(cursoVazio);
      setStatusCurso("ok");
    } catch (err) {
      setStatusCurso(err.message || "Erro ao publicar curso");
    } finally {
      setPublicandoCurso(false);
    }
  };

  const removerCurso = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCursosAdmin((atual) => (atual ?? []).filter((c) => c.id !== id));
      return;
    }
    const { error } = await supabase.from("cursos").delete().eq("id", id);
    if (!error) setCursosAdmin((atual) => atual.filter((c) => c.id !== id));
  };

  const [editandoCurso, setEditandoCurso] = useState(null);
  const [formCurso, setFormCurso] = useState(cursoVazio);
  const [enviandoBannerEdicaoCurso, setEnviandoBannerEdicaoCurso] = useState(false);

  const iniciarEdicaoCurso = (c) => {
    setEditandoCurso(c.id);
    setFormCurso({
      titulo: c.titulo || "", instituicao: c.instituicao || "", descricao: c.descricao || "",
      professor: c.professor || "", carga_horaria: c.carga_horaria || "", data_inicio: c.data_inicio || "",
      link_inscricao: c.link_inscricao || "", certificado: !!c.certificado, banner_url: c.banner_url || "",
      relato: c.relato || "", relato_fotos: c.relato_fotos || [],
    });
  };

  const [enviandoFotoRelatoCurso, setEnviandoFotoRelatoCurso] = useState(false);
  const enviarFotoRelatoCurso = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setFormCurso((f) => ({ ...f, relato_fotos: [...f.relato_fotos, URL.createObjectURL(arquivo)] })); return; }
    setEnviandoFotoRelatoCurso(true);
    const caminho = `relatos-cursos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoRelatoCurso(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setFormCurso((f) => ({ ...f, relato_fotos: [...f.relato_fotos, pub.publicUrl] }));
      }
    });
  };
  const removerFotoRelatoCurso = (indice) => {
    setFormCurso((f) => ({ ...f, relato_fotos: f.relato_fotos.filter((_, i) => i !== indice) }));
  };

  const enviarBannerEdicaoCurso = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setFormCurso((v) => ({ ...v, banner_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoBannerEdicaoCurso(true);
    const caminho = `cursos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBannerEdicaoCurso(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
        setFormCurso((v) => ({ ...v, banner_url: pub.publicUrl }));
      }
    });
  };

  const salvarEdicaoCurso = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCursosAdmin((atual) => (atual ?? []).map((c) => (c.id === id ? { ...c, ...formCurso } : c)));
      setEditandoCurso(null);
      return;
    }
    const { error } = await supabase.from("cursos").update(formCurso).eq("id", id);
    if (!error) setCursosAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ...formCurso } : c)));
    setEditandoCurso(null);
  };

  // Inscritos de cada curso — o admin confirma a presença de quem realmente
  // participou, o que libera o certificado pra essa pessoa baixar. FASE 38.
  const [inscritosAbertos, setInscritosAbertos] = useState(null);
  const [inscritosPorCurso, setInscritosPorCurso] = useState({});
  const verInscritos = (cursoId) => {
    if (inscritosAbertos === cursoId) { setInscritosAbertos(null); return; }
    setInscritosAbertos(cursoId);
    if (!inscritosPorCurso[cursoId]) {
      supabase.from("curso_inscricoes").select("*").eq("curso_id", cursoId).order("criado_em", { ascending: false }).then(({ data, error }) => {
        if (!error) setInscritosPorCurso((atual) => ({ ...atual, [cursoId]: data || [] }));
      });
    }
  };
  // Cadastro manual de inscrito pelo admin — cobre quem participou de um
  // curso (inclusive já passado) mas nunca se inscreveu pelo site, pra
  // poder contar nos Critérios de participação e liberar certificado.
  const [novoInscritoManual, setNovoInscritoManual] = useState({}); // { [cursoId]: { nome, telefone } }
  const adicionarInscritoManual = async (cursoId) => {
    const dados = novoInscritoManual[cursoId];
    if (!dados?.nome?.trim() || !dados?.telefone?.trim()) { notificar("Informe nome e telefone.", "aviso"); return; }
    const { data, error } = await supabase.from("curso_inscricoes").insert({
      curso_id: cursoId, nome: dados.nome.trim(), telefone: dados.telefone.trim().replace(/\D/g, ""), presenca_confirmada: true,
    }).select().single();
    if (error) { notificar("Não consegui adicionar: " + error.message, "erro"); return; }
    setInscritosPorCurso((atual) => ({ ...atual, [cursoId]: [data, ...(atual[cursoId] || [])] }));
    setNovoInscritoManual((s) => ({ ...s, [cursoId]: { nome: "", telefone: "" } }));
    notificar("Inscrito adicionado.");
  };

  const confirmarPresencaCurso = async (inscricaoId, cursoId, presenca) => {
    const { error } = await supabase.from("curso_inscricoes").update({ presenca_confirmada: presenca }).eq("id", inscricaoId);
    if (!error) {
      setInscritosPorCurso((atual) => ({
        ...atual,
        [cursoId]: (atual[cursoId] || []).map((i) => (i.id === inscricaoId ? { ...i, presenca_confirmada: presenca } : i)),
      }));
    }
  };

  // -------------------------------------------------------------------------
  // Notificações push — cadastro real com foto e link, grava histórico.
  // -------------------------------------------------------------------------
  const [notificacoesAdmin, setNotificacoesAdmin] = useState(null);
  const [novaNotificacao, setNovaNotificacao] = useState({ titulo: "", mensagem: "", imagem_url: "", link_url: "" });
  const [enviandoFotoNotificacao, setEnviandoFotoNotificacao] = useState(false);
  const [enviandoNotificacao, setEnviandoNotificacao] = useState(false);
  const [statusNotificacao, setStatusNotificacao] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("notificacoes").select("*").order("enviada_em", { ascending: false }).limit(10).then(({ data, error }) => {
      if (!error) setNotificacoesAdmin(data || []);
    });
  }, []);

  const enviarFotoNotificacao = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovaNotificacao((v) => ({ ...v, imagem_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoFotoNotificacao(true);
    const caminho = `notificacoes/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoNotificacao(false);
      if (error) { setStatusNotificacao(error.message); return; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
      setNovaNotificacao((v) => ({ ...v, imagem_url: pub.publicUrl }));
    });
  };

  const enviarNotificacao = async (e) => {
    e.preventDefault();
    setStatusNotificacao("");
    if (!novaNotificacao.titulo || !novaNotificacao.mensagem) { setStatusNotificacao("Preencha título e mensagem."); return; }
    if (!supabaseConfigurado) {
      setNotificacoesAdmin((atual) => [{ id: `demo-${Date.now()}`, ...novaNotificacao, enviada_em: new Date().toISOString() }, ...(atual ?? [])]);
      setNovaNotificacao({ titulo: "", mensagem: "", imagem_url: "", link_url: "" });
      setStatusNotificacao("ok");
      return;
    }
    setEnviandoNotificacao(true);
    try {
      const { data, error } = await supabase.from("notificacoes").insert(novaNotificacao).select().single();
      if (error) throw error;
      setNotificacoesAdmin((atual) => [data, ...(atual ?? [])]);
      setNovaNotificacao({ titulo: "", mensagem: "", imagem_url: "", link_url: "" });
      setStatusNotificacao("ok");
    } catch (err) {
      setStatusNotificacao(err.message || "Erro ao enviar notificação");
    } finally {
      setEnviandoNotificacao(false);
    }
  };

  // -------------------------------------------------------------------------
  // Vagas — admin cadastra vagas publicadas vinculadas a uma empresa.
  // -------------------------------------------------------------------------
  const [vagasAdmin, setVagasAdmin] = useState(null);
  const vagaVazia = { empresa_id: "", cargo: "", salario: "", requisitos: "", cidade: "Ivatuba - PR", tipo: "CLT", beneficios: "", prazo: "" };
  const [novaVaga, setNovaVaga] = useState(vagaVazia);
  const [publicandoVaga, setPublicandoVaga] = useState(false);
  const [statusVaga, setStatusVaga] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("vagas").select("*, empresas(nome)").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setVagasAdmin(data || []);
    });
  }, []);

  const publicarVaga = async (e) => {
    e.preventDefault();
    setStatusVaga("");
    if (!novaVaga.cargo) { setStatusVaga("Informe ao menos o cargo."); return; }
    if (!supabaseConfigurado) {
      setVagasAdmin((atual) => [{ id: `demo-${Date.now()}`, ...novaVaga, status: "aberta" }, ...(atual ?? [])]);
      setNovaVaga(vagaVazia);
      setStatusVaga("ok");
      return;
    }
    if (!novaVaga.empresa_id) { setStatusVaga("Escolha a empresa da vaga."); return; }
    setPublicandoVaga(true);
    try {
      const registro = { ...novaVaga, prazo: novaVaga.prazo || null };
      const { data, error } = await supabase.from("vagas").insert(registro).select("*, empresas(nome)").single();
      if (error) throw error;
      setVagasAdmin((atual) => [data, ...(atual ?? [])]);
      setNovaVaga(vagaVazia);
      setStatusVaga("ok");
    } catch (err) {
      setStatusVaga(err.message || "Erro ao publicar vaga");
    } finally {
      setPublicandoVaga(false);
    }
  };

  const removerVaga = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setVagasAdmin((atual) => (atual ?? []).filter((v) => v.id !== id));
      return;
    }
    const { error } = await supabase.from("vagas").delete().eq("id", id);
    if (!error) setVagasAdmin((atual) => atual.filter((v) => v.id !== id));
  };

  // -------------------------------------------------------------------------
  // Feirantes — admin cadastra direto (com foto), já aprovado, aparece no site.
  // -------------------------------------------------------------------------
  const feiranteVazio = { nome: "", produto: "", whatsapp: "", instagram: "", categoria: "", descricao: "", local: "", numero_estande: "", empresa_id: "", email: "", cpf: "", cnpj: "", possui_mei: false };
  const [novoFeiranteAdmin, setNovoFeiranteAdmin] = useState(feiranteVazio);
  const [fotoFeiranteAdmin, setFotoFeiranteAdmin] = useState(null);
  const [enviandoFeiranteAdmin, setEnviandoFeiranteAdmin] = useState(false);
  const [statusFeiranteAdmin, setStatusFeiranteAdmin] = useState("");
  const [editandoLocalFeirante, setEditandoLocalFeirante] = useState({}); // { [id]: { local, numero_estande } }
  const [editandoPerfilFeirante, setEditandoPerfilFeirante] = useState(null); // id do feirante com o perfil completo aberto pra edição

  const cadastrarFeiranteAdmin = async (e) => {
    e.preventDefault();
    setStatusFeiranteAdmin("");
    if (!novoFeiranteAdmin.nome || !novoFeiranteAdmin.produto || !novoFeiranteAdmin.whatsapp) {
      setStatusFeiranteAdmin("Preencha nome, produto e WhatsApp.");
      return;
    }
    const payload = { ...novoFeiranteAdmin, empresa_id: novoFeiranteAdmin.empresa_id || null };
    if (!supabaseConfigurado) {
      setFeirantes((atual) => [{ id: `demo-${Date.now()}`, ...payload, status: "aprovado", fotos_urls: [] }, ...(atual ?? [])]);
      setNovoFeiranteAdmin(feiranteVazio);
      setFotoFeiranteAdmin(null);
      setStatusFeiranteAdmin("ok");
      return;
    }
    setEnviandoFeiranteAdmin(true);
    try {
      let fotosUrls = [];
      if (fotoFeiranteAdmin) {
        const caminho = `feirantes/${Date.now()}-${fotoFeiranteAdmin.name}`;
        const { error: erroUpload } = await supabase.storage.from("fotos-feirantes").upload(caminho, fotoFeiranteAdmin);
        if (!erroUpload) {
          const { data: pub } = supabase.storage.from("fotos-feirantes").getPublicUrl(caminho);
          fotosUrls = [pub.publicUrl];
        }
      }
      const { data, error } = await supabase.from("feirantes").insert({ ...payload, status: "aprovado", fotos_urls: fotosUrls }).select().single();
      if (error) throw error;
      setFeirantes((atual) => [data, ...(atual ?? [])]);
      setNovoFeiranteAdmin(feiranteVazio);
      setFotoFeiranteAdmin(null);
      setStatusFeiranteAdmin("ok");
    } catch (err) {
      setStatusFeiranteAdmin(err.message || "Erro ao cadastrar feirante");
    } finally {
      setEnviandoFeiranteAdmin(false);
    }
  };

  const salvarLocalFeirante = async (id) => {
    const valores = editandoLocalFeirante[id];
    if (!valores) return;
    if (!supabaseConfigurado) {
      setFeirantes((atual) => atual.map((f) => (f.id === id ? { ...f, ...valores } : f)));
      return;
    }
    const { error } = await supabase.from("feirantes").update(valores).eq("id", id);
    if (!error) setFeirantes((atual) => atual.map((f) => (f.id === id ? { ...f, ...valores } : f)));
  };

  // Credencial digital da barraca — reaproveita o mesmo sistema de crachá
  // com QR Code já usado nos eventos (aba Credenciamento), só que gerada
  // automaticamente a partir do cadastro do feirante. FASE 39.
  const [gerandoCredencialFeirante, setGerandoCredencialFeirante] = useState(null);
  const gerarCredencialFeirante = async (f) => {
    if (!f.evento_id) { notificar("Escolha a feira/evento antes de gerar a credencial.", "aviso"); return; }
    setGerandoCredencialFeirante(f.id);
    try {
      const { data, error } = await supabase.from("credenciais").insert({
        evento_id: f.evento_id, nome: f.nome, telefone: f.whatsapp, tipo: "Barraca", status: "ativa",
      }).select().single();
      if (error) throw error;
      const { error: erroLink } = await supabase.from("feirantes").update({ credencial_id: data.id }).eq("id", f.id);
      if (erroLink) throw erroLink;
      setFeirantes((atual) => atual.map((x) => (x.id === f.id ? { ...x, credencial_id: data.id, credencial_codigo: data.codigo } : x)));
      notificar("Credencial gerada.");
    } catch (err) {
      notificar("Não foi possível gerar: " + (err.message || "erro"), "erro");
    } finally {
      setGerandoCredencialFeirante(null);
    }
  };

  // -------------------------------------------------------------------------
  // Produtos — admin cadastra direto para qualquer empresa (não só modera).
  // -------------------------------------------------------------------------
  const produtoAdminVazio = { empresa_id: "", nome: "", descricao: "", preco: "", preco_promocional: "", estoque: "", categoria: "" };
  const [novoProdutoAdmin, setNovoProdutoAdmin] = useState(produtoAdminVazio);
  const [fotoProdutoAdmin, setFotoProdutoAdmin] = useState(null);
  const [cadastrandoProdutoAdmin, setCadastrandoProdutoAdmin] = useState(false);
  const [statusProdutoAdmin, setStatusProdutoAdmin] = useState("");

  // IA no cadastro de produto do admin — gera descrição e foto ilustrativa
  // só com base no nome do produto (FASE 26). Reaproveita os mesmos
  // endpoints já usados no cadastro de produto do empresário.
  const [gerandoDescricaoProdutoAdmin, setGerandoDescricaoProdutoAdmin] = useState(false);
  const [erroDescricaoProdutoAdmin, setErroDescricaoProdutoAdmin] = useState("");
  const [imagemIAProdutoAdmin, setImagemIAProdutoAdmin] = useState(null); // base64
  const [gerandoImagemProdutoAdmin, setGerandoImagemProdutoAdmin] = useState(false);
  const [erroImagemProdutoAdmin, setErroImagemProdutoAdmin] = useState("");

  const gerarDescricaoProdutoAdmin = async () => {
    if (!novoProdutoAdmin.nome.trim()) { setErroDescricaoProdutoAdmin("Preencha ao menos o nome do produto primeiro."); return; }
    setErroDescricaoProdutoAdmin("");
    setGerandoDescricaoProdutoAdmin(true);
    try {
      const resp = await fetch("/api/gerar-descricao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: novoProdutoAdmin.nome, categoria: novoProdutoAdmin.categoria, palavrasChave: "" }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não consegui gerar agora.");
      setNovoProdutoAdmin((v) => ({ ...v, descricao: dados.descricao }));
    } catch (err) {
      setErroDescricaoProdutoAdmin(err.message || "Não consegui gerar agora. Tente de novo.");
    } finally {
      setGerandoDescricaoProdutoAdmin(false);
    }
  };

  const gerarImagemProdutoAdmin = async () => {
    if (!novoProdutoAdmin.nome.trim()) { setErroImagemProdutoAdmin("Preencha ao menos o nome do produto primeiro."); return; }
    setErroImagemProdutoAdmin("");
    setGerandoImagemProdutoAdmin(true);
    try {
      const resp = await fetch("/api/gerar-imagem-ilustrativa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: novoProdutoAdmin.nome, categoria: novoProdutoAdmin.categoria, descricao: novoProdutoAdmin.descricao }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não consegui gerar a imagem agora.");
      setImagemIAProdutoAdmin(dados.imagemBase64);
    } catch (err) {
      setErroImagemProdutoAdmin(err.message || "Não consegui gerar a imagem agora. Tente de novo.");
    } finally {
      setGerandoImagemProdutoAdmin(false);
    }
  };

  const cadastrarProdutoAdmin = async (e) => {
    e.preventDefault();
    setStatusProdutoAdmin("");
    if (!novoProdutoAdmin.nome) { setStatusProdutoAdmin("Informe ao menos o nome do produto."); return; }
    if (!supabaseConfigurado) {
      setProdutosAdmin((atual) => [{ id: `demo-${Date.now()}`, ...novoProdutoAdmin, ativo: true }, ...(atual ?? listaProdutos)]);
      setNovoProdutoAdmin(produtoAdminVazio);
      setFotoProdutoAdmin(null);
      setImagemIAProdutoAdmin(null);
      setStatusProdutoAdmin("ok");
      return;
    }
    if (!novoProdutoAdmin.empresa_id) { setStatusProdutoAdmin("Escolha a empresa do produto."); return; }
    setCadastrandoProdutoAdmin(true);
    try {
      let fotoUrl = null;
      let usandoImagemIlustrativa = false;
      if (fotoProdutoAdmin) {
        const caminho = `produtos/${Date.now()}-${fotoProdutoAdmin.name}`;
        const { error: erroUpload } = await supabase.storage.from("fotos-produtos").upload(caminho, fotoProdutoAdmin);
        if (!erroUpload) {
          const { data: pub } = supabase.storage.from("fotos-produtos").getPublicUrl(caminho);
          fotoUrl = pub.publicUrl;
        }
      } else if (imagemIAProdutoAdmin) {
        // Só usa a imagem gerada por IA se não houver foto real enviada.
        const bytes = atob(imagemIAProdutoAdmin);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: "image/png" });
        const caminho = `produtos/${Date.now()}-ilustrativa.png`;
        const { error: erroUpload } = await supabase.storage.from("fotos-produtos").upload(caminho, blob);
        if (!erroUpload) {
          const { data: pub } = supabase.storage.from("fotos-produtos").getPublicUrl(caminho);
          fotoUrl = pub.publicUrl;
          usandoImagemIlustrativa = true;
        }
      }
      const registro = {
        empresa_id: novoProdutoAdmin.empresa_id,
        nome: novoProdutoAdmin.nome,
        descricao: novoProdutoAdmin.descricao,
        preco: novoProdutoAdmin.preco ? Number(novoProdutoAdmin.preco) : null,
        preco_promocional: novoProdutoAdmin.preco_promocional ? Number(novoProdutoAdmin.preco_promocional) : null,
        estoque: novoProdutoAdmin.estoque !== "" ? Number(novoProdutoAdmin.estoque) : null,
        categoria: novoProdutoAdmin.categoria,
        foto_url: fotoUrl,
        imagem_ilustrativa: usandoImagemIlustrativa,
        ativo: true,
      };
      const { data, error } = await supabase.from("produtos").insert(registro).select("*, empresas(nome)").single();
      if (error) throw error;
      setProdutosAdmin((atual) => [data, ...(atual ?? [])]);
      setNovoProdutoAdmin(produtoAdminVazio);
      setFotoProdutoAdmin(null);
      setImagemIAProdutoAdmin(null);
      setStatusProdutoAdmin("ok");
    } catch (err) {
      setStatusProdutoAdmin(err.message || "Erro ao cadastrar produto");
    } finally {
      setCadastrandoProdutoAdmin(false);
    }
  };

  // -------------------------------------------------------------------------
  // Cupons de desconto — o admin também pode cadastrar pra qualquer empresa.
  // FASE 35.
  // -------------------------------------------------------------------------
  const [cuponsAdmin, setCuponsAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("cupons").select("*, empresas(nome)").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setCuponsAdmin(data || []);
    });
  }, []);
  const cupomAdminVazio = { empresa_id: "", titulo: "", descricao: "", desconto_percentual: "", validade: "" };
  const [novoCupomAdmin, setNovoCupomAdmin] = useState(cupomAdminVazio);
  const [criandoCupomAdmin, setCriandoCupomAdmin] = useState(false);
  const [statusCupomAdmin, setStatusCupomAdmin] = useState("");

  const criarCupomAdmin = async (e) => {
    e.preventDefault();
    setStatusCupomAdmin("");
    if (!novoCupomAdmin.empresa_id || !novoCupomAdmin.titulo.trim()) { setStatusCupomAdmin("Escolha a empresa e informe o título."); return; }
    setCriandoCupomAdmin(true);
    try {
      const codigo = `${novoCupomAdmin.titulo.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error } = await supabase.from("cupons").insert({
        empresa_id: novoCupomAdmin.empresa_id,
        titulo: novoCupomAdmin.titulo,
        descricao: novoCupomAdmin.descricao || null,
        desconto_percentual: novoCupomAdmin.desconto_percentual ? Number(novoCupomAdmin.desconto_percentual) : null,
        validade: novoCupomAdmin.validade || null,
        codigo,
      }).select("*, empresas(nome)").single();
      if (error) throw error;
      setCuponsAdmin((atual) => [data, ...(atual ?? [])]);
      setNovoCupomAdmin(cupomAdminVazio);
      setStatusCupomAdmin("ok");
      notificar("Cupom criado.");
    } catch (err) {
      setStatusCupomAdmin(err.message || "Erro ao criar cupom.");
    } finally {
      setCriandoCupomAdmin(false);
    }
  };

  const alternarAtivoCupomAdmin = async (id, ativo) => {
    const { error } = await supabase.from("cupons").update({ ativo }).eq("id", id);
    if (!error) { setCuponsAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ativo } : c))); notificar(ativo ? "Cupom ativado." : "Cupom desativado."); }
  };

  const apagarCupomAdmin = async (id) => {
    const { error } = await supabase.from("cupons").delete().eq("id", id);
    if (!error) { setCuponsAdmin((atual) => atual.filter((c) => c.id !== id)); notificar("Cupom excluído."); }
  };

  // -------------------------------------------------------------------------
  // Combos e promoções combinadas — o admin também pode cadastrar pra
  // qualquer empresa. FASE 37.
  // -------------------------------------------------------------------------
  const [combosAdmin, setCombosAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("combos").select("*, empresas(nome)").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setCombosAdmin(data || []);
    });
  }, []);
  const comboAdminVazio = { empresa_id: "", titulo: "", descricao: "", preco: "" };
  const [novoComboAdmin, setNovoComboAdmin] = useState(comboAdminVazio);
  const [criandoComboAdmin, setCriandoComboAdmin] = useState(false);
  const [statusComboAdmin, setStatusComboAdmin] = useState("");

  const criarComboAdmin = async (e) => {
    e.preventDefault();
    setStatusComboAdmin("");
    if (!novoComboAdmin.empresa_id || !novoComboAdmin.titulo.trim()) { setStatusComboAdmin("Escolha a empresa e informe o título."); return; }
    setCriandoComboAdmin(true);
    try {
      const { data, error } = await supabase.from("combos").insert({
        empresa_id: novoComboAdmin.empresa_id,
        titulo: novoComboAdmin.titulo,
        descricao: novoComboAdmin.descricao || null,
        preco: novoComboAdmin.preco ? Number(novoComboAdmin.preco) : null,
      }).select("*, empresas(nome)").single();
      if (error) throw error;
      setCombosAdmin((atual) => [data, ...(atual ?? [])]);
      setNovoComboAdmin(comboAdminVazio);
      setStatusComboAdmin("ok");
      notificar("Combo criado.");
    } catch (err) {
      setStatusComboAdmin(err.message || "Erro ao criar combo.");
    } finally {
      setCriandoComboAdmin(false);
    }
  };

  const alternarAtivoComboAdmin = async (id, ativo) => {
    const { error } = await supabase.from("combos").update({ ativo }).eq("id", id);
    if (!error) { setCombosAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ativo } : c))); notificar(ativo ? "Combo ativado." : "Combo desativado."); }
  };

  const apagarComboAdmin = async (id) => {
    const { error } = await supabase.from("combos").delete().eq("id", id);
    if (!error) { setCombosAdmin((atual) => atual.filter((c) => c.id !== id)); notificar("Combo excluído."); }
  };

  // -------------------------------------------------------------------------
  // Editais e licitações municipais abertas pra empresas locais. FASE 41.
  // -------------------------------------------------------------------------
  const [licitacoesAdmin, setLicitacoesAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("licitacoes").select("*").order("data_limite", { ascending: true, nullsFirst: false }).then(({ data, error }) => {
      if (!error) setLicitacoesAdmin(data || []);
    });
  }, []);
  const [licitacaoLeadsAdmin, setLicitacaoLeadsAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("licitacao_leads").select("*").order("criado_em", { ascending: false }).limit(50).then(({ data, error }) => {
      if (!error) setLicitacaoLeadsAdmin(data || []);
    });
  }, []);
  const licitacaoAdminVazia = { titulo: "", orgao: "", descricao: "", valor_estimado: "", data_limite: "", link_edital: "" };
  const [novaLicitacaoAdmin, setNovaLicitacaoAdmin] = useState(licitacaoAdminVazia);
  const [criandoLicitacaoAdmin, setCriandoLicitacaoAdmin] = useState(false);
  const [statusLicitacaoAdmin, setStatusLicitacaoAdmin] = useState("");

  const criarLicitacaoAdmin = async (e) => {
    e.preventDefault();
    setStatusLicitacaoAdmin("");
    if (!novaLicitacaoAdmin.titulo.trim()) { setStatusLicitacaoAdmin("Informe o título."); return; }
    setCriandoLicitacaoAdmin(true);
    try {
      const { data, error } = await supabase.from("licitacoes").insert({
        titulo: novaLicitacaoAdmin.titulo,
        orgao: novaLicitacaoAdmin.orgao || null,
        descricao: novaLicitacaoAdmin.descricao || null,
        valor_estimado: novaLicitacaoAdmin.valor_estimado ? Number(novaLicitacaoAdmin.valor_estimado) : null,
        data_limite: novaLicitacaoAdmin.data_limite || null,
        link_edital: novaLicitacaoAdmin.link_edital || null,
      }).select().single();
      if (error) throw error;
      setLicitacoesAdmin((atual) => [data, ...(atual ?? [])]);
      setNovaLicitacaoAdmin(licitacaoAdminVazia);
      setStatusLicitacaoAdmin("ok");
      notificar("Edital publicado.");
    } catch (err) {
      setStatusLicitacaoAdmin(err.message || "Erro ao publicar edital.");
    } finally {
      setCriandoLicitacaoAdmin(false);
    }
  };

  const alternarAtivoLicitacaoAdmin = async (id, ativo) => {
    const { error } = await supabase.from("licitacoes").update({ ativo }).eq("id", id);
    if (!error) { setLicitacoesAdmin((atual) => atual.map((l) => (l.id === id ? { ...l, ativo } : l))); notificar(ativo ? "Edital reativado." : "Edital encerrado."); }
  };

  const apagarLicitacaoAdmin = async (id) => {
    const { error } = await supabase.from("licitacoes").delete().eq("id", id);
    if (!error) { setLicitacoesAdmin((atual) => atual.filter((l) => l.id !== id)); notificar("Edital excluído."); }
  };

  const [formResultadoLicitacao, setFormResultadoLicitacao] = useState({}); // { [id]: { resultado, data_resultado } }
  const [editandoResultadoId, setEditandoResultadoId] = useState(null);
  const [salvandoResultadoId, setSalvandoResultadoId] = useState(null);

  const iniciarEdicaoResultado = (l) => {
    setEditandoResultadoId(l.id);
    setFormResultadoLicitacao((f) => ({ ...f, [l.id]: { resultado: l.resultado || "", data_resultado: l.data_resultado || new Date().toISOString().slice(0, 10) } }));
  };

  const salvarResultadoLicitacao = async (id) => {
    const v = formResultadoLicitacao[id];
    if (!v) return;
    setSalvandoResultadoId(id);
    const registro = { resultado: v.resultado.trim() || null, data_resultado: v.resultado.trim() ? v.data_resultado : null };
    const { error } = await supabase.from("licitacoes").update(registro).eq("id", id);
    setSalvandoResultadoId(null);
    if (!error) {
      setLicitacoesAdmin((atual) => atual.map((l) => (l.id === id ? { ...l, ...registro } : l)));
      setEditandoResultadoId(null);
      notificar("Resultado divulgado.");
    } else {
      notificar(error.message || "Não foi possível salvar o resultado.", "erro");
    }
  };

  // -------------------------------------------------------------------------
  // Mural da comunidade — moradores publicam sugestão/elogio/reclamação/
  // aviso, e só aparece pra todo mundo depois que o admin aprova. FASE 43.
  // -------------------------------------------------------------------------
  const [muralAdmin, setMuralAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("mural_comunidade").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setMuralAdmin(data || []);
    });
  }, []);
  const [respostaMural, setRespostaMural] = useState({}); // { [id]: texto }

  const moderarMural = async (id, status) => {
    const { error } = await supabase.from("mural_comunidade").update({ status }).eq("id", id);
    if (!error) { setMuralAdmin((atual) => atual.map((m) => (m.id === id ? { ...m, status } : m))); notificar(status === "aprovado" ? "Publicação aprovada." : "Publicação recusada."); }
  };

  const enviarRespostaMural = async (id) => {
    const texto = (respostaMural[id] || "").trim();
    if (!texto) return;
    const { error } = await supabase.from("mural_comunidade").update({ resposta_admin: texto }).eq("id", id);
    if (!error) { setMuralAdmin((atual) => atual.map((m) => (m.id === id ? { ...m, resposta_admin: texto } : m))); notificar("Resposta publicada."); }
  };

  const apagarMural = async (id) => {
    const { error } = await supabase.from("mural_comunidade").delete().eq("id", id);
    if (!error) { setMuralAdmin((atual) => atual.filter((m) => m.id !== id)); notificar("Publicação excluída."); }
  };

  // -------------------------------------------------------------------------
  // Critérios de participação — reúne "possui MEI" e presença real (não só
  // inscrição/confirmação) em cursos, eventos do calendário e feira, por
  // empresa, pra ajudar a decidir quem convidar pras próximas festas. FASE 44.
  // -------------------------------------------------------------------------
  const somenteDigitos = (v) => (v || "").replace(/\D/g, "");

  const [participantesEventosTodos, setParticipantesEventosTodos] = useState(null);
  const [inscricoesCursosTodos, setInscricoesCursosTodos] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("evento_participantes").select("telefone, compareceu").eq("compareceu", true).then(({ data, error }) => {
      if (!error) setParticipantesEventosTodos(data || []);
    });
    supabase.from("curso_inscricoes").select("telefone, presenca_confirmada").eq("presenca_confirmada", true).then(({ data, error }) => {
      if (!error) setInscricoesCursosTodos(data || []);
    });
  }, []);

  const criteriosPorEmpresa = useMemo(() => {
    const contarPorTelefone = (lista) => {
      const mapa = {};
      (lista || []).forEach((item) => {
        const tel = somenteDigitos(item.telefone);
        if (!tel) return;
        mapa[tel] = (mapa[tel] || 0) + 1;
      });
      return mapa;
    };
    const eventosPorTel = contarPorTelefone(participantesEventosTodos);
    const cursosPorTel = contarPorTelefone(inscricoesCursosTodos);
    const feirasPorEmpresaId = {};
    (feirantes || []).forEach((f) => {
      if (f.compareceu && f.empresa_id) feirasPorEmpresaId[f.empresa_id] = (feirasPorEmpresaId[f.empresa_id] || 0) + 1;
    });
    return (empresasPend || []).map((e) => {
      const tel = somenteDigitos(e.whatsapp);
      return {
        ...e,
        eventosComparecidos: eventosPorTel[tel] || 0,
        cursosConcluidos: cursosPorTel[tel] || 0,
        feirasParticipadas: feirasPorEmpresaId[e.id] || 0,
      };
    });
  }, [empresasPend, feirantes, participantesEventosTodos, inscricoesCursosTodos]);

  const feirantesAvulsos = useMemo(() => (feirantes || []).filter((f) => !f.empresa_id), [feirantes]);
  const [buscaCriteriosAdmin, setBuscaCriteriosAdmin] = useState("");
  const criteriosFiltrados = useMemo(() => {
    if (!buscaCriteriosAdmin.trim()) return criteriosPorEmpresa;
    const q = buscaCriteriosAdmin.toLowerCase();
    return criteriosPorEmpresa.filter((e) => (e.nome || "").toLowerCase().includes(q));
  }, [criteriosPorEmpresa, buscaCriteriosAdmin]);

  // -------------------------------------------------------------------------
  // Utilidade pública — telefones úteis, ônibus e órgãos públicos, pra
  // ajudar o morador no dia a dia. FASE 47.
  // -------------------------------------------------------------------------
  const [utilidadeAdmin, setUtilidadeAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("utilidade_publica").select("*").order("ordem").then(({ data, error }) => {
      if (!error) setUtilidadeAdmin(data || []);
    });
  }, []);
  const utilidadeVazia = { titulo: "", categoria: "telefone", telefone: "", endereco: "", horario: "", descricao: "", ordem: 0 };
  const [novaUtilidade, setNovaUtilidade] = useState(utilidadeVazia);
  const [publicandoUtilidade, setPublicandoUtilidade] = useState(false);
  const [statusUtilidade, setStatusUtilidade] = useState("");

  const publicarUtilidade = async (e) => {
    e.preventDefault();
    setStatusUtilidade("");
    if (!novaUtilidade.titulo.trim()) { setStatusUtilidade("Informe o título."); return; }
    setPublicandoUtilidade(true);
    try {
      const registro = { ...novaUtilidade, ordem: Number(novaUtilidade.ordem) || 0 };
      const { data, error } = await supabase.from("utilidade_publica").insert(registro).select().single();
      if (error) throw error;
      setUtilidadeAdmin((atual) => [...(atual ?? []), data].sort((a, b) => a.ordem - b.ordem));
      setNovaUtilidade(utilidadeVazia);
      setStatusUtilidade("ok");
    } catch (err) {
      setStatusUtilidade(err.message || "Erro ao publicar.");
    } finally {
      setPublicandoUtilidade(false);
    }
  };

  const alternarAtivoUtilidade = async (id, ativo) => {
    const { error } = await supabase.from("utilidade_publica").update({ ativo }).eq("id", id);
    if (!error) setUtilidadeAdmin((atual) => atual.map((u) => (u.id === id ? { ...u, ativo } : u)));
  };

  const apagarUtilidade = async (id) => {
    const { error } = await supabase.from("utilidade_publica").delete().eq("id", id);
    if (!error) { setUtilidadeAdmin((atual) => atual.filter((u) => u.id !== id)); notificar("Item removido."); }
  };

  // -------------------------------------------------------------------------
  // Ouvidoria — morador denuncia problema na cidade (buraco, iluminação,
  // lixo etc.), acompanha pelo protocolo, e o admin atualiza o status.
  // FASE 48.
  // -------------------------------------------------------------------------
  const [ouvidoriaAdmin, setOuvidoriaAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("ouvidoria_denuncias").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setOuvidoriaAdmin(data || []);
    });
  }, []);
  const [respostaOuvidoria, setRespostaOuvidoria] = useState({}); // { [id]: texto }

  const mudarStatusDenuncia = async (id, status) => {
    const { error } = await supabase.from("ouvidoria_denuncias").update({ status }).eq("id", id);
    if (!error) { setOuvidoriaAdmin((atual) => atual.map((d) => (d.id === id ? { ...d, status } : d))); notificar("Status atualizado."); }
  };

  const enviarRespostaOuvidoria = async (id) => {
    const texto = (respostaOuvidoria[id] || "").trim();
    if (!texto) return;
    const { error } = await supabase.from("ouvidoria_denuncias").update({ resposta_admin: texto }).eq("id", id);
    if (!error) { setOuvidoriaAdmin((atual) => atual.map((d) => (d.id === id ? { ...d, resposta_admin: texto } : d))); notificar("Resposta salva."); }
  };

  const apagarDenuncia = async (id) => {
    const { error } = await supabase.from("ouvidoria_denuncias").delete().eq("id", id);
    if (!error) { setOuvidoriaAdmin((atual) => atual.filter((d) => d.id !== id)); notificar("Denúncia excluída."); }
  };

  // -------------------------------------------------------------------------
  // Classificados entre moradores — compra, venda e doação direto entre
  // pessoas, com moderação antes de aparecer pra todo mundo. FASE 49.
  // -------------------------------------------------------------------------
  const [classificadosAdmin, setClassificadosAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("classificados").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setClassificadosAdmin(data || []);
    });
  }, []);

  const moderarClassificado = async (id, status) => {
    const { error } = await supabase.from("classificados").update({ status }).eq("id", id);
    if (!error) { setClassificadosAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, status } : c))); notificar("Status atualizado."); }
  };

  const apagarClassificado = async (id) => {
    const { error } = await supabase.from("classificados").delete().eq("id", id);
    if (!error) { setClassificadosAdmin((atual) => atual.filter((c) => c.id !== id)); notificar("Anúncio excluído."); }
  };

  // -------------------------------------------------------------------------
  // Agendamento de horário — o admin gera os horários disponíveis de cada
  // prestador de serviço, e o cliente reserva direto pelo site. FASE 50.
  // -------------------------------------------------------------------------
  const [prestadorAgendaSelecionado, setPrestadorAgendaSelecionado] = useState("");
  const [agendaAdmin, setAgendaAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado || !prestadorAgendaSelecionado) { setAgendaAdmin(null); return; }
    supabase.from("prestador_agenda").select("*").eq("prestador_id", prestadorAgendaSelecionado)
      .order("data").order("hora").then(({ data, error }) => {
        if (!error) setAgendaAdmin(data || []);
      });
  }, [prestadorAgendaSelecionado]);

  const geradorAgendaVazio = { data: "", hora_inicio: "08:00", hora_fim: "12:00", intervalo_minutos: 30 };
  const [geradorAgenda, setGeradorAgenda] = useState(geradorAgendaVazio);
  const [gerandoAgenda, setGerandoAgenda] = useState(false);
  const [statusGeradorAgenda, setStatusGeradorAgenda] = useState("");

  const gerarHorariosAgenda = async (e) => {
    e.preventDefault();
    setStatusGeradorAgenda("");
    if (!prestadorAgendaSelecionado) { setStatusGeradorAgenda("Escolha o prestador primeiro."); return; }
    if (!geradorAgenda.data || !geradorAgenda.hora_inicio || !geradorAgenda.hora_fim) { setStatusGeradorAgenda("Preencha data, horário inicial e final."); return; }
    const intervalo = Number(geradorAgenda.intervalo_minutos) || 30;
    const [hI, mI] = geradorAgenda.hora_inicio.split(":").map(Number);
    const [hF, mF] = geradorAgenda.hora_fim.split(":").map(Number);
    let minutos = hI * 60 + mI;
    const minutosFim = hF * 60 + mF;
    const novosSlots = [];
    while (minutos < minutosFim) {
      const h = String(Math.floor(minutos / 60)).padStart(2, "0");
      const m = String(minutos % 60).padStart(2, "0");
      novosSlots.push({ prestador_id: prestadorAgendaSelecionado, data: geradorAgenda.data, hora: `${h}:${m}`, duracao_minutos: intervalo, status: "disponivel" });
      minutos += intervalo;
    }
    if (novosSlots.length === 0) { setStatusGeradorAgenda("Intervalo inválido."); return; }
    setGerandoAgenda(true);
    try {
      const { data, error } = await supabase.from("prestador_agenda").insert(novosSlots).select();
      if (error) throw error;
      setAgendaAdmin((atual) => [...(atual ?? []), ...data].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)));
      setStatusGeradorAgenda("ok");
    } catch (err) {
      setStatusGeradorAgenda(err.message || "Erro ao gerar horários.");
    } finally {
      setGerandoAgenda(false);
    }
  };

  const cancelarReservaAgenda = async (id) => {
    const { error } = await supabase.from("prestador_agenda").update({ status: "disponivel", cliente_nome: null, cliente_telefone: null }).eq("id", id);
    if (!error) { setAgendaAdmin((atual) => atual.map((s) => (s.id === id ? { ...s, status: "disponivel", cliente_nome: null, cliente_telefone: null } : s))); notificar("Reserva cancelada."); }
  };

  const apagarHorarioAgenda = async (id) => {
    const { error } = await supabase.from("prestador_agenda").delete().eq("id", id);
    if (!error) setAgendaAdmin((atual) => atual.filter((s) => s.id !== id));
  };

  // -------------------------------------------------------------------------
  // Avaliações de empresas — o público comenta, o admin só modera (apaga
  // comentário abusivo/spam). FASE 34.
  // -------------------------------------------------------------------------
  const [avaliacoesAdmin, setAvaliacoesAdmin] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("avaliacoes").select("*, empresas(nome), pontos_turisticos(nome)").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setAvaliacoesAdmin(data || []);
    });
  }, []);
  const removerAvaliacaoAdmin = async (id) => {
    const { error } = await supabase.from("avaliacoes").delete().eq("id", id);
    if (!error) { setAvaliacoesAdmin((atual) => atual.filter((a) => a.id !== id)); notificar("Avaliação excluída."); }
    else notificar("Não consegui excluir: " + error.message, "erro");
  };

  // -------------------------------------------------------------------------
  // Depoimentos — CRUD completo com avaliação em estrelas, só o admin cadastra.
  // -------------------------------------------------------------------------
  const [depoimentosAdmin, setDepoimentosAdmin] = useState(null);
  const depoimentoVazio = { nome: "", empresa: "", cargo: "", foto_url: "", avaliacao: 5, texto: "", status: "aprovado" };
  const [novoDepoimento, setNovoDepoimento] = useState(depoimentoVazio);
  const [enviandoFotoDepoimento, setEnviandoFotoDepoimento] = useState(false);
  const [publicandoDepoimento, setPublicandoDepoimento] = useState(false);
  const [statusDepoimentoForm, setStatusDepoimentoForm] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("depoimentos").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setDepoimentosAdmin(data || []);
    });
  }, []);

  const enviarFotoDepoimento = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setNovoDepoimento((v) => ({ ...v, foto_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoFotoDepoimento(true);
    const caminho = `depoimentos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("banners").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoDepoimento(false);
      if (error) { setStatusDepoimentoForm(error.message); return; }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
      setNovoDepoimento((v) => ({ ...v, foto_url: pub.publicUrl }));
    });
  };

  const publicarDepoimento = async (e) => {
    e.preventDefault();
    setStatusDepoimentoForm("");
    if (!novoDepoimento.nome || !novoDepoimento.texto) { setStatusDepoimentoForm("Informe ao menos o nome e o texto."); return; }
    if (!supabaseConfigurado) {
      setDepoimentosAdmin((atual) => [{ id: `demo-${Date.now()}`, ...novoDepoimento }, ...(atual ?? [])]);
      setNovoDepoimento(depoimentoVazio);
      setStatusDepoimentoForm("ok");
      return;
    }
    setPublicandoDepoimento(true);
    try {
      const { data, error } = await supabase.from("depoimentos").insert(novoDepoimento).select().single();
      if (error) throw error;
      setDepoimentosAdmin((atual) => [data, ...(atual ?? [])]);
      setNovoDepoimento(depoimentoVazio);
      setStatusDepoimentoForm("ok");
    } catch (err) {
      setStatusDepoimentoForm(err.message || "Erro ao publicar depoimento");
    } finally {
      setPublicandoDepoimento(false);
    }
  };

  const mudarStatusDepoimento = async (id, status) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setDepoimentosAdmin((atual) => (atual ?? []).map((d) => (d.id === id ? { ...d, status } : d)));
      return;
    }
    const { error } = await supabase.from("depoimentos").update({ status }).eq("id", id);
    if (!error) setDepoimentosAdmin((atual) => atual.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const removerDepoimento = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setDepoimentosAdmin((atual) => (atual ?? []).filter((d) => d.id !== id));
      return;
    }
    const { error } = await supabase.from("depoimentos").delete().eq("id", id);
    if (!error) setDepoimentosAdmin((atual) => atual.filter((d) => d.id !== id));
  };

  // -------------------------------------------------------------------------
  // Enquetes — cadastro real (pergunta + opções) e encerrar/reabrir.
  // -------------------------------------------------------------------------
  const [enquetesAdmin, setEnquetesAdmin] = useState(null);
  const [novaEnquete, setNovaEnquete] = useState({ pergunta: "", opcao1: "", opcao2: "", opcao3: "" });
  const [publicandoEnquete, setPublicandoEnquete] = useState(false);
  const [statusEnquete, setStatusEnquete] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("enquetes").select("*").order("criada_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setEnquetesAdmin(data || []);
    });
  }, []);

  const listaEnquetes = enquetesAdmin ?? enquetes.map((e, i) => ({ id: `demo-${i}`, ...e }));

  const publicarEnquete = async (e) => {
    e.preventDefault();
    setStatusEnquete("");
    const opcoesTexto = [novaEnquete.opcao1, novaEnquete.opcao2, novaEnquete.opcao3].filter((t) => t.trim());
    if (!novaEnquete.pergunta || opcoesTexto.length < 2) { setStatusEnquete("Informe a pergunta e ao menos 2 opções."); return; }
    const opcoes = opcoesTexto.map((texto) => ({ texto, votos: 0 }));
    if (!supabaseConfigurado) {
      setEnquetesAdmin((atual) => [{ id: `demo-${Date.now()}`, pergunta: novaEnquete.pergunta, opcoes, ativa: true }, ...(atual ?? listaEnquetes)]);
      setNovaEnquete({ pergunta: "", opcao1: "", opcao2: "", opcao3: "" });
      setStatusEnquete("ok");
      return;
    }
    setPublicandoEnquete(true);
    try {
      const { data, error } = await supabase.from("enquetes").insert({ pergunta: novaEnquete.pergunta, opcoes, ativa: true }).select().single();
      if (error) throw error;
      setEnquetesAdmin((atual) => [data, ...(atual ?? [])]);
      setNovaEnquete({ pergunta: "", opcao1: "", opcao2: "", opcao3: "" });
      setStatusEnquete("ok");
    } catch (err) {
      setStatusEnquete(err.message || "Erro ao publicar enquete");
    } finally {
      setPublicandoEnquete(false);
    }
  };

  const alternarAtivaEnquete = async (id, ativa) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setEnquetesAdmin((atual) => (atual ?? listaEnquetes).map((eq) => (eq.id === id ? { ...eq, ativa } : eq)));
      return;
    }
    const { error } = await supabase.from("enquetes").update({ ativa }).eq("id", id);
    if (!error) setEnquetesAdmin((atual) => atual.map((eq) => (eq.id === id ? { ...eq, ativa } : eq)));
  };

  const removerEnquete = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setEnquetesAdmin((atual) => (atual ?? listaEnquetes).filter((eq) => eq.id !== id));
      return;
    }
    const { error } = await supabase.from("enquetes").delete().eq("id", id);
    if (!error) setEnquetesAdmin((atual) => atual.filter((eq) => eq.id !== id));
  };

  // -------------------------------------------------------------------------
  // Prestadores de serviço — moderação (aprovar/recusar/editar), igual ao
  // fluxo de empresas.
  // -------------------------------------------------------------------------
  const [prestadoresAdmin, setPrestadoresAdmin] = useState(null);
  const [statusPrestador, setStatusPrestador] = useState({});
  const [editandoPrestador, setEditandoPrestador] = useState(null);
  const [formPrestador, setFormPrestador] = useState({ nome: "", servico: "", endereco: "", whatsapp: "", instagram: "", email: "", cpf: "", cnpj: "" });

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("prestadores").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setPrestadoresAdmin(data || []);
    });
  }, []);

  const listaPrestadores = prestadoresAdmin ?? [];

  const mudarStatusPrestador = async (id, status) => {
    if (!supabaseConfigurado) {
      setPrestadoresAdmin((atual) => (atual ?? []).map((p) => (p.id === id ? { ...p, status } : p)));
      return;
    }
    const { error } = await supabase.from("prestadores").update({ status }).eq("id", id);
    if (!error) { setPrestadoresAdmin((atual) => atual.map((p) => (p.id === id ? { ...p, status } : p))); notificar(status === "aprovado" ? "Prestador aprovado." : "Prestador recusado.", status === "aprovado" ? "sucesso" : "aviso"); }
    else setStatusPrestador((s) => ({ ...s, [id]: error.message }));
  };

  // Bloquear/desbloquear e excluir prestador — FASE 25.
  const alternarBloqueioPrestador = async (p) => {
    const novoStatus = p.status === "bloqueado" ? "aprovado" : "bloqueado";
    const { error } = await supabase.from("prestadores").update({ status: novoStatus }).eq("id", p.id);
    if (!error) {
      setPrestadoresAdmin((atual) => atual.map((x) => (x.id === p.id ? { ...x, status: novoStatus } : x)));
      notificar(novoStatus === "bloqueado" ? "Prestador bloqueado." : "Prestador desbloqueado.", novoStatus === "bloqueado" ? "aviso" : "sucesso");
    } else notificar("Não consegui atualizar: " + error.message, "erro");
  };

  const removerPrestadorAdmin = async (id) => {
    const { error } = await supabase.from("prestadores").delete().eq("id", id);
    if (!error) { setPrestadoresAdmin((atual) => atual.filter((p) => p.id !== id)); notificar("Prestador excluído."); }
    else notificar("Não consegui excluir: " + error.message, "erro");
  };

  const iniciarEdicaoPrestador = (p) => {
    setEditandoPrestador(p.id);
    setFormPrestador({ nome: p.nome, servico: p.servico, endereco: p.endereco || "", whatsapp: p.whatsapp || "", instagram: p.instagram || "", email: p.email || "", cpf: p.cpf || "", cnpj: p.cnpj || "" });
  };

  const salvarEdicaoPrestador = async (id) => {
    if (!supabaseConfigurado) {
      setPrestadoresAdmin((atual) => atual.map((p) => (p.id === id ? { ...p, ...formPrestador } : p)));
      setEditandoPrestador(null);
      return;
    }
    const { error } = await supabase.from("prestadores").update(formPrestador).eq("id", id);
    if (!error) setPrestadoresAdmin((atual) => atual.map((p) => (p.id === id ? { ...p, ...formPrestador } : p)));
    setEditandoPrestador(null);
  };

  // -------------------------------------------------------------------------
  // Credenciamento de eventos — FASE 19. Cada credencial fica ligada a um
  // evento do Calendário; o "código" dela vira o link/QR Code da credencial
  // digital pública (ver componente CredencialDigital). Check-in é manual:
  // o organizador busca o nome na lista e clica em confirmar.
  // -------------------------------------------------------------------------
  const [eventoCredenciaisSelecionado, setEventoCredenciaisSelecionado] = useState("");
  const [credenciaisAdmin, setCredenciaisAdmin] = useState(null); // null = nenhum evento escolhido ainda
  const [novaCredencial, setNovaCredencial] = useState({ nome: "", telefone: "", tipo: "Participante" });
  const [fotoCredencialAdmin, setFotoCredencialAdmin] = useState(null);
  const [cadastrandoCredencial, setCadastrandoCredencial] = useState(false);
  const [statusCredencial, setStatusCredencial] = useState("");
  const [buscaCredenciaisAdmin, setBuscaCredenciaisAdmin] = useState("");
  const [filtroTipoCredenciaisAdmin, setFiltroTipoCredenciaisAdmin] = useState("");
  const [editandoCredencial, setEditandoCredencial] = useState(null);
  const [formCredencial, setFormCredencial] = useState({ nome: "", telefone: "", tipo: "" });
  const [credencialDigitalAberta, setCredencialDigitalAberta] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado || !eventoCredenciaisSelecionado) { setCredenciaisAdmin(null); return; }
    setCredenciaisAdmin(null); // volta pro estado de carregando ao trocar de evento
    supabase.from("credenciais").select("*").eq("evento_id", eventoCredenciaisSelecionado).order("criado_em", { ascending: false })
      .then(({ data, error }) => { if (!error) setCredenciaisAdmin(data || []); });
  }, [eventoCredenciaisSelecionado]);

  const criarCredencial = async (e) => {
    e.preventDefault();
    setStatusCredencial("");
    if (!eventoCredenciaisSelecionado) { setStatusCredencial("Selecione o evento primeiro."); return; }
    if (!novaCredencial.nome.trim()) { setStatusCredencial("Informe o nome."); return; }
    setCadastrandoCredencial(true);
    try {
      let foto_url = null;
      if (fotoCredencialAdmin && supabaseConfigurado) {
        const caminho = `credenciais/${Date.now()}-${fotoCredencialAdmin.name}`;
        const { error: erroUpload } = await supabase.storage.from("fotos-empresas").upload(caminho, fotoCredencialAdmin);
        if (!erroUpload) {
          const { data: pub } = supabase.storage.from("fotos-empresas").getPublicUrl(caminho);
          foto_url = pub.publicUrl;
        }
      }
      if (!supabaseConfigurado) {
        setCredenciaisAdmin((atual) => [
          { id: `demo-${Date.now()}`, codigo: `demo-${Date.now()}`, evento_id: eventoCredenciaisSelecionado, ...novaCredencial, foto_url, status: "ativa", checkin_feito: false },
          ...(atual ?? []),
        ]);
        setNovaCredencial({ nome: "", telefone: "", tipo: "Participante" });
        setFotoCredencialAdmin(null);
        setStatusCredencial("ok");
        return;
      }
      const { data, error } = await supabase.from("credenciais").insert({
        evento_id: eventoCredenciaisSelecionado, nome: novaCredencial.nome, telefone: novaCredencial.telefone,
        tipo: novaCredencial.tipo || "Participante", foto_url, status: "ativa",
      }).select().single();
      if (error) { setStatusCredencial(error.message); return; }
      setCredenciaisAdmin((atual) => [data, ...(atual ?? [])]);
      setNovaCredencial({ nome: "", telefone: "", tipo: "Participante" });
      setFotoCredencialAdmin(null);
      setStatusCredencial("ok");
    } finally {
      setCadastrandoCredencial(false);
    }
  };

  const alternarStatusCredencial = async (id, statusAtual) => {
    const novoStatus = statusAtual === "ativa" ? "inativa" : "ativa";
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCredenciaisAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, status: novoStatus } : c)));
      return;
    }
    const { error } = await supabase.from("credenciais").update({ status: novoStatus }).eq("id", id);
    if (!error) { setCredenciaisAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, status: novoStatus } : c))); notificar(novoStatus === "ativa" ? "Credencial ativada." : "Credencial inativada.", novoStatus === "ativa" ? "sucesso" : "aviso"); }
  };

  const alternarCheckinCredencial = async (id, feitoAtual) => {
    const payload = { checkin_feito: !feitoAtual, checkin_em: !feitoAtual ? new Date().toISOString() : null };
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCredenciaisAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ...payload } : c)));
      return;
    }
    const { error } = await supabase.from("credenciais").update(payload).eq("id", id);
    if (!error) { setCredenciaisAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ...payload } : c))); notificar(!feitoAtual ? "Check-in confirmado." : "Check-in desfeito."); }
  };

  const removerCredencial = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCredenciaisAdmin((atual) => atual.filter((c) => c.id !== id));
      return;
    }
    const { error } = await supabase.from("credenciais").delete().eq("id", id);
    if (!error) setCredenciaisAdmin((atual) => atual.filter((c) => c.id !== id));
  };

  const iniciarEdicaoCredencial = (c) => { setEditandoCredencial(c.id); setFormCredencial({ nome: c.nome, telefone: c.telefone || "", tipo: c.tipo || "" }); };

  const salvarEdicaoCredencial = async (id) => {
    if (!supabaseConfigurado || String(id).startsWith("demo-")) {
      setCredenciaisAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ...formCredencial } : c)));
      setEditandoCredencial(null);
      return;
    }
    const { error } = await supabase.from("credenciais").update(formCredencial).eq("id", id);
    if (!error) setCredenciaisAdmin((atual) => atual.map((c) => (c.id === id ? { ...c, ...formCredencial } : c)));
    setEditandoCredencial(null);
  };

  const credenciaisFiltradasAdmin = useMemo(() => {
    let lista = credenciaisAdmin ?? [];
    if (buscaCredenciaisAdmin.trim()) {
      const q = buscaCredenciaisAdmin.toLowerCase();
      lista = lista.filter((c) => (c.nome || "").toLowerCase().includes(q));
    }
    if (filtroTipoCredenciaisAdmin) lista = lista.filter((c) => c.tipo === filtroTipoCredenciaisAdmin);
    return lista;
  }, [credenciaisAdmin, buscaCredenciaisAdmin, filtroTipoCredenciaisAdmin]);

  const statsCredenciaisAdmin = useMemo(() => {
    const lista = credenciaisAdmin ?? [];
    return {
      total: lista.length,
      ativas: lista.filter((c) => c.status === "ativa").length,
      inativas: lista.filter((c) => c.status === "inativa").length,
      checkins: lista.filter((c) => c.checkin_feito).length,
      tipos: new Set(lista.map((c) => c.tipo).filter(Boolean)).size,
    };
  }, [credenciaisAdmin]);

  const tiposCredenciaisAdmin = useMemo(() => Array.from(new Set((credenciaisAdmin ?? []).map((c) => c.tipo).filter(Boolean))), [credenciaisAdmin]);

  // -------------------------------------------------------------------------
  // Usuários cadastrados — FASE 20. Lista todo mundo que já se cadastrou
  // (tabela perfis), com busca, ordenação, filtro por tipo, paginação e
  // exportar em Excel (CSV) / PDF (impressão do navegador).
  // -------------------------------------------------------------------------
  const [todosUsuariosAdmin, setTodosUsuariosAdmin] = useState(null);

  const resultadosUsuarioExistente = useMemo(() => {
    const termo = buscaUsuarioExistente.trim().toLowerCase();
    if (!termo || !todosUsuariosAdmin) return [];
    return todosUsuariosAdmin
      .filter((u) =>
        u.nome?.toLowerCase().includes(termo) ||
        u.telefone?.toLowerCase().includes(termo) ||
        u.email?.toLowerCase().includes(termo)
      )
      .slice(0, 8);
  }, [buscaUsuarioExistente, todosUsuariosAdmin]);

  const [buscaTodosUsuariosAdmin, setBuscaTodosUsuariosAdmin] = useState("");
  const [filtroTipoTodosUsuariosAdmin, setFiltroTipoTodosUsuariosAdmin] = useState("");
  const [ordenacaoTodosUsuariosAdmin, setOrdenacaoTodosUsuariosAdmin] = useState("recentes");
  const [paginaTodosUsuariosAdmin, setPaginaTodosUsuariosAdmin] = useState(1);
  const ITENS_POR_PAGINA_USUARIOS = 15;

  const carregarTodosUsuariosAdmin = () => {
    if (!supabaseConfigurado) return;
    supabase.from("perfis").select("id, nome, email, tipo, telefone, instagram, cpf, cnpj, bloqueado, criado_em, ultimo_acesso").order("criado_em", { ascending: false })
      .then(({ data, error }) => { if (!error) setTodosUsuariosAdmin(data || []); });
  };

  useEffect(() => { carregarTodosUsuariosAdmin(); }, []);

  useEffect(() => { setPaginaTodosUsuariosAdmin(1); }, [buscaTodosUsuariosAdmin, filtroTipoTodosUsuariosAdmin, ordenacaoTodosUsuariosAdmin]);

  const todosUsuariosFiltradosAdmin = useMemo(() => {
    let lista = todosUsuariosAdmin ?? [];
    if (buscaTodosUsuariosAdmin.trim()) {
      const q = buscaTodosUsuariosAdmin.toLowerCase();
      lista = lista.filter((u) => (u.nome || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
    }
    if (filtroTipoTodosUsuariosAdmin) lista = lista.filter((u) => u.tipo === filtroTipoTodosUsuariosAdmin);
    lista = [...lista];
    if (ordenacaoTodosUsuariosAdmin === "nome") lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    else if (ordenacaoTodosUsuariosAdmin === "perfil") lista.sort((a, b) => (a.tipo || "").localeCompare(b.tipo || ""));
    else if (ordenacaoTodosUsuariosAdmin === "antigos") lista.sort((a, b) => new Date(a.criado_em || 0) - new Date(b.criado_em || 0));
    else if (ordenacaoTodosUsuariosAdmin === "acesso") lista.sort((a, b) => new Date(b.ultimo_acesso || 0) - new Date(a.ultimo_acesso || 0));
    else lista.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0)); // recentes
    return lista;
  }, [todosUsuariosAdmin, buscaTodosUsuariosAdmin, filtroTipoTodosUsuariosAdmin, ordenacaoTodosUsuariosAdmin]);

  const usuariosOnlineAgoraAdmin = useMemo(
    () => (todosUsuariosAdmin ?? []).filter((u) => estaOnline(u.ultimo_acesso)).length,
    [todosUsuariosAdmin]
  );

  // Relatório de acessos — mesma base de usuários, olhada por atividade em
  // vez de cadastro. FASE 63.
  const [filtroTipoAcessosAdmin, setFiltroTipoAcessosAdmin] = useState("");
  const relatorioAcessosAdmin = useMemo(() => {
    const agora = Date.now();
    const umDia = 24 * 60 * 60 * 1000;
    const umaSemana = 7 * umDia;
    let lista = todosUsuariosAdmin ?? [];
    if (filtroTipoAcessosAdmin) lista = lista.filter((u) => u.tipo === filtroTipoAcessosAdmin);
    const ordenada = [...lista].sort((a, b) => new Date(b.ultimo_acesso || 0) - new Date(a.ultimo_acesso || 0));
    return {
      lista: ordenada,
      onlineAgora: lista.filter((u) => estaOnline(u.ultimo_acesso)).length,
      ativosHoje: lista.filter((u) => u.ultimo_acesso && agora - new Date(u.ultimo_acesso).getTime() <= umDia).length,
      ativosSemana: lista.filter((u) => u.ultimo_acesso && agora - new Date(u.ultimo_acesso).getTime() <= umaSemana).length,
      nuncaAcessou: lista.filter((u) => !u.ultimo_acesso).length,
    };
  }, [todosUsuariosAdmin, filtroTipoAcessosAdmin]);

  const totalPaginasUsuariosAdmin = Math.max(1, Math.ceil(todosUsuariosFiltradosAdmin.length / ITENS_POR_PAGINA_USUARIOS));
  const usuariosPaginaAtualAdmin = todosUsuariosFiltradosAdmin.slice(
    (paginaTodosUsuariosAdmin - 1) * ITENS_POR_PAGINA_USUARIOS,
    paginaTodosUsuariosAdmin * ITENS_POR_PAGINA_USUARIOS
  );

  const rotuloTipoUsuario = (tipo) => ({ cliente: "Cliente", empresario: "Empresário", prestador: "Prestador", admin: "Administrador" }[tipo] || tipo || "—");

  // Editar/bloquear/apagar usuário — FASE 25.
  const [editandoUsuarioAdmin, setEditandoUsuarioAdmin] = useState(null);
  const [formUsuarioAdmin, setFormUsuarioAdmin] = useState({ nome: "", telefone: "", instagram: "", cpf: "", cnpj: "" });
  const [processandoUsuarioAdmin, setProcessandoUsuarioAdmin] = useState(null);

  const iniciarEdicaoUsuarioAdmin = (u) => {
    setEditandoUsuarioAdmin(u.id);
    setFormUsuarioAdmin({ nome: u.nome || "", telefone: u.telefone || "", instagram: u.instagram || "", cpf: u.cpf || "", cnpj: u.cnpj || "" });
  };

  const salvarEdicaoUsuarioAdmin = async (id) => {
    const { error } = await supabase.from("perfis").update(formUsuarioAdmin).eq("id", id);
    if (!error) {
      setTodosUsuariosAdmin((atual) => atual.map((u) => (u.id === id ? { ...u, ...formUsuarioAdmin } : u)));
      notificar("Usuário atualizado.");
    } else {
      notificar("Não consegui salvar: " + error.message, "erro");
    }
    setEditandoUsuarioAdmin(null);
  };

  const alternarBloqueioUsuarioAdmin = async (u) => {
    const novoValor = !u.bloqueado;
    const { error } = await supabase.from("perfis").update({ bloqueado: novoValor }).eq("id", u.id);
    if (!error) {
      setTodosUsuariosAdmin((atual) => atual.map((x) => (x.id === u.id ? { ...x, bloqueado: novoValor } : x)));
      notificar(novoValor ? "Usuário bloqueado." : "Usuário desbloqueado.", novoValor ? "aviso" : "sucesso");
    } else {
      notificar("Não consegui atualizar: " + error.message, "erro");
    }
  };

  const apagarUsuarioAdmin = async (id) => {
    setProcessandoUsuarioAdmin(id);
    try {
      const { data: sessaoAtual } = await supabase.auth.getSession();
      const token = sessaoAtual?.session?.access_token;
      const resp = await fetch("/api/admin-excluir-usuario", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não foi possível excluir.");
      setTodosUsuariosAdmin((atual) => atual.filter((u) => u.id !== id));
      notificar("Usuário excluído.");
    } catch (err) {
      notificar(err.message || "Erro ao excluir usuário.", "erro");
    } finally {
      setProcessandoUsuarioAdmin(null);
    }
  };

  const exportarUsuariosExcel = () => {
    const cabecalho = ["Nome", "E-mail", "Perfil", "Data de cadastro"];
    const linhas = todosUsuariosFiltradosAdmin.map((u) => [
      u.nome || "", u.email || "", rotuloTipoUsuario(u.tipo), u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR") : "",
    ]);
    const csv = [cabecalho, ...linhas].map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usuarios-conecta-comercio.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportarUsuariosPDF = () => {
    const janela = window.open("", "_blank");
    if (!janela) return;
    const linhas = todosUsuariosFiltradosAdmin.map((u) => `
      <tr><td>${u.nome || ""}</td><td>${u.email || ""}</td><td>${rotuloTipoUsuario(u.tipo)}</td><td>${u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR") : ""}</td></tr>
    `).join("");
    janela.document.write(`
      <html><head><title>Usuários — Conecta Comércio</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0E2233}
        h2{margin-bottom:4px} p{color:#5C7186;margin-top:0;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #DCE7F2;padding:8px 10px;text-align:left;font-size:13px}
        th{background:#EAF2FB;color:#0A5AA8}
      </style></head>
      <body>
        <h2>Usuários cadastrados — Conecta Comércio</h2>
        <p>${todosUsuariosFiltradosAdmin.length} usuário(s) · gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
        <table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Data de cadastro</th></tr></thead><tbody>${linhas}</tbody></table>
      </body></html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 300);
  };

  // Resumo geral em barras (mesmos números dos cartões) e distribuição de
  // empresas por categoria em pizza — usam dados que já foram buscados
  // acima, sem nenhuma consulta nova ao banco.
  const resumoBarrasAdmin = useMemo(() => ([
    { nome: "Empresas", valor: statsReais?.empresas ?? 0 },
    { nome: "Produtos", valor: statsReais?.produtos ?? 0 },
    { nome: "Vagas", valor: statsReais?.vagas ?? 0 },
    { nome: "Prestadores", valor: statsReais?.prestadores ?? 0 },
    { nome: "Notícias", valor: statsReais?.noticias ?? 0 },
    { nome: "Eventos", valor: statsReais?.eventos ?? 0 },
  ]), [statsReais]);

  const distribuicaoCategoriasAdmin = useMemo(() => {
    const empresasAprovadas = (empresasPend ?? []).filter((e) => e.status === "aprovada");
    if (empresasAprovadas.length === 0) return [];
    const contagem = {};
    empresasAprovadas.forEach((e) => {
      const cat = e.categoria || "Sem categoria";
      contagem[cat] = (contagem[cat] || 0) + 1;
    });
    return Object.entries(contagem).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 6);
  }, [empresasPend]);

  const items = [
    { id: "dashboard", label: "Estatísticas", icon: LayoutDashboard },
    { id: "usuarios", label: "Cadastrar usuário", icon: UserCircle2 },
    { id: "todos-usuarios", label: "Usuários cadastrados", icon: Users },
    { id: "acessos", label: "Relatório de acessos", icon: TrendingUp },
    { id: "categorias", label: "Categorias", icon: Tag },
    { id: "empresas", label: "Comerciantes", icon: CheckCircle2 },
    { id: "criterios", label: "Critérios de participação", icon: ClipboardList },
    { id: "prestadores", label: "Prestadores de serviço", icon: Wrench },
    { id: "agenda", label: "Agendamentos", icon: Clock },
    { id: "produtos", label: "Produtos", icon: ShoppingBag },
    { id: "promocoes", label: "Promoções", icon: Tag },
    { id: "feira", label: "Feira do Empreendedor", icon: PartyPopper },
    { id: "calendario", label: "Calendário de eventos", icon: CalendarDays },
    { id: "credenciais", label: "Credenciamento", icon: BadgeCheck },
    { id: "cursos", label: "Cursos", icon: GraduationCap },
    { id: "servicos", label: "Serviços do Empreendedor", icon: Landmark },
    { id: "sala-empreendedor", label: "Sala do Empreendedor - Atendimentos", icon: ClipboardList },
    { id: "licitacoes", label: "Editais e Licitações", icon: FileText },
    { id: "turismo", label: "Turismo", icon: MapPinned },
    { id: "utilidade", label: "Utilidade pública", icon: Phone },
    { id: "ouvidoria", label: "Ouvidoria", icon: MessageCircle },
    { id: "classificados", label: "Classificados", icon: Repeat },
    { id: "mural", label: "Mural da comunidade", icon: Users },
    { id: "enquetes", label: "Enquetes", icon: Vote },
    { id: "cupons", label: "Cupons de desconto", icon: Tag },
    { id: "combos", label: "Combos e promoções", icon: HandCoins },
    { id: "avaliacoes", label: "Avaliações", icon: MessageCircle },
    { id: "depoimentos", label: "Depoimentos", icon: Star },
    { id: "faq", label: "FAQ", icon: FileText },
    { id: "noticias", label: "Notícias", icon: Newspaper },
    { id: "vagas", label: "Vagas", icon: Briefcase },
    { id: "banners", label: "Banners", icon: ImageIcon },
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "identidade", label: "Identidade do site", icon: Palette },
  ];

  const itemAtivo = items.find((it) => it.id === tab);

  return (
    <div>
      <ToastStack toasts={toastsAdmin} />
      <div className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap overflow-hidden relative"
        style={{ background: `linear-gradient(120deg, ${C.blueDeep}, ${C.blue})` }}>
        <div aria-hidden="true" className="absolute -right-8 -top-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div aria-hidden="true" className="absolute right-16 bottom-[-3rem] w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="relative">
          <p className="font-body text-[11px] font-bold uppercase tracking-wider text-white/70">Painel do administrador</p>
          <h1 className="font-display text-xl md:text-2xl font-extrabold text-white mt-0.5">{itemAtivo?.label || "Estatísticas"}</h1>
        </div>
        <div className="relative flex items-center gap-2 shrink-0">
          {[
            [statsReais?.empresas, "Empresas"],
            [statsReais?.produtos, "Produtos"],
            [statsReais?.vagas, "Vagas"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-xl px-3.5 py-2 text-center" style={{ background: "rgba(255,255,255,0.14)" }}>
              <p className="font-display font-extrabold text-lg text-white leading-none">{statsReais ? n : "…"}</p>
              <p className="font-body text-[10px] text-white/70 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="rounded-2xl border p-3 h-fit" style={{ borderColor: C.line }}>
        <p className="font-body text-[11px] font-bold uppercase tracking-wider px-2 mb-2" style={{ color: "#5C7186" }}>Painel do administrador</p>
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => setTab(it.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body font-semibold text-left"
              style={{ background: active ? C.blueTint : "transparent", color: active ? C.blue : "#425A70" }}>
              <Icon size={16} /> {it.label}
            </button>
          );
        })}
      </aside>

      <div className="min-w-0">
        {tab === "dashboard" && (
          <div>
            <SectionHeader eyebrow="Visão geral" title="Estatísticas da plataforma" />
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: conecte o Supabase para ver os números reais da plataforma.
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                [statsReais?.empresas, "Empresas aprovadas", Building2],
                [statsReais?.produtos, "Produtos ativos", ShoppingBag],
                [statsReais?.vagas, "Vagas abertas", Briefcase],
                [statsReais?.prestadores, "Prestadores aprovados", Wrench],
                [statsReais?.noticias, "Notícias publicadas", Newspaper],
                [statsReais?.eventos, "Eventos no calendário", CalendarDays],
              ].map(([n, l, Icon], i) => {
                const cor = PALETA_GRAFICOS[i % PALETA_GRAFICOS.length];
                if (!statsReais) {
                  return (
                    <div key={l} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                      <Skeleton className="w-9 h-9" />
                      <Skeleton className="w-12 h-5 mt-2.5" />
                      <Skeleton className="w-20 h-3 mt-1.5" />
                    </div>
                  );
                }
                return (
                  <div key={l} className="glow-card rounded-2xl border p-4" style={{ borderColor: C.line }}>
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: `${cor}1a`, color: cor }}>
                      <Icon size={16} />
                    </span>
                    <p className="font-display font-extrabold text-xl mt-2.5" style={{ color: C.ink }}>{n}</p>
                    <p className="font-body text-xs" style={{ color: "#5C7186" }}>{l}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Acessos no site (últimos 7 dias)</p>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={acessosSemanaReais ?? []}>
                      <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#5C7186" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#5C7186" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke={C.blue} strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {acessosSemanaReais && acessosSemanaReais.every((d) => d.views === 0) && (
                  <p className="font-body text-[11px] mt-2" style={{ color: "#5C7186" }}>Sem visitas registradas ainda nos últimos 7 dias.</p>
                )}
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Crescimento mensal (novas empresas)</p>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={crescimentoMensal ?? []}>
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#5C7186" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#5C7186" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="empresas" stroke={C.amberDark} strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Resumo geral (todas as áreas)</p>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={resumoBarrasAdmin}>
                      <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#5C7186" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 12, fill: "#5C7186" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        {resumoBarrasAdmin.map((_, i) => <Cell key={i} fill={PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Empresas por categoria</p>
                {distribuicaoCategoriasAdmin.length > 0 ? (
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={distribuicaoCategoriasAdmin} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {distribuicaoCategoriasAdmin.map((_, i) => <Cell key={i} fill={PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter, sans-serif" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="font-body text-sm" style={{ color: "#5C7186" }}>Sem empresas aprovadas o suficiente ainda.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border p-4 overflow-x-auto" style={{ borderColor: C.line }}>
                <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Empresas em destaque (mais visualizadas)</p>
                {(empresasDestaqueReais ?? []).length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide pb-2" style={{ color: "#5C7186" }}>Empresa</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide pb-2" style={{ color: "#5C7186" }}>Categoria</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide pb-2 text-right" style={{ color: "#5C7186" }}>Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(empresasDestaqueReais ?? []).map((e, i) => (
                        <tr key={e.nome + i} style={{ borderBottom: i < empresasDestaqueReais.length - 1 ? `1px solid ${C.line}` : "none" }}>
                          <td className="font-body text-sm font-semibold py-2 truncate max-w-[140px]" style={{ color: C.ink }}>{e.nome}</td>
                          <td className="font-body text-xs py-2" style={{ color: "#5C7186" }}>{e.categoria}</td>
                          <td className="font-body text-xs font-bold py-2 text-right" style={{ color: C.blue }}>{e.visualizacoes ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhuma empresa aprovada ainda.</p>
                )}
              </div>

              <div className="rounded-2xl border p-4 overflow-x-auto" style={{ borderColor: C.line }}>
                <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Últimos cadastros</p>
                {(ultimosCadastros ?? []).length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide pb-2" style={{ color: "#5C7186" }}>Nome</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide pb-2 text-right" style={{ color: "#5C7186" }}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ultimosCadastros ?? []).map((u, i) => (
                        <tr key={u.nome + i} style={{ borderBottom: i < ultimosCadastros.length - 1 ? `1px solid ${C.line}` : "none" }}>
                          <td className="font-body text-sm font-semibold py-2 truncate max-w-[160px]" style={{ color: C.ink }}>{u.nome}</td>
                          <td className="py-2 text-right">
                            <span className="font-body text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>{u.tipo}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum cadastro ainda.</p>
                )}
              </div>
            </div>

            {/* Uso de cada funcionalidade — pra saber o que está sendo usado
                de verdade e o que ainda precisa de divulgação. */}
            <div className="rounded-2xl border p-4 mb-6" style={{ borderColor: C.line }}>
              <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Uso de cada funcionalidade</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  [statsReais?.mural, "Posts no mural", Users],
                  [statsReais?.classificados, "Classificados aprovados", Repeat],
                  [statsReais?.ouvidoria, "Denúncias na ouvidoria", MessageCircle],
                  [statsReais?.agendamentos, "Horários reservados", Clock],
                  [statsReais?.premium, "Comerciantes Premium", Sparkles],
                  [statsReais?.cupons, "Cupons ativos", Tag],
                  [statsReais?.combos, "Combos ativos", HandCoins],
                ].map(([n, l, Icon], i) => {
                  const cor = PALETA_GRAFICOS[i % PALETA_GRAFICOS.length];
                  if (!statsReais) {
                    return (
                      <div key={l} className="rounded-xl border p-3" style={{ borderColor: C.line }}>
                        <Skeleton className="w-8 h-8" />
                        <Skeleton className="w-10 h-4 mt-2" />
                        <Skeleton className="w-16 h-2.5 mt-1.5" />
                      </div>
                    );
                  }
                  return (
                    <div key={l} className="rounded-xl border p-3" style={{ borderColor: C.line }}>
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${cor}1a`, color: cor }}>
                        <Icon size={14} />
                      </span>
                      <p className="font-display font-extrabold text-lg mt-2" style={{ color: C.ink }}>{n}</p>
                      <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{l}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumo simples de usuários — total e por tipo, pra ter noção
                rápida de quem está usando o site sem precisar abrir a lista. */}
            <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
              <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Resumo de usuários</p>
              {!todosUsuariosAdmin ? (
                <Skeleton className="w-full h-16" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    ["Total cadastrados", todosUsuariosAdmin.length],
                    ["Clientes", todosUsuariosAdmin.filter((u) => u.tipo === "cliente").length],
                    ["Empresários", todosUsuariosAdmin.filter((u) => u.tipo === "empresario").length],
                    ["Prestadores", todosUsuariosAdmin.filter((u) => u.tipo === "prestador").length],
                    ["Bloqueados", todosUsuariosAdmin.filter((u) => u.bloqueado).length],
                  ].map(([l, n]) => (
                    <div key={l} className="rounded-xl p-3 text-center" style={{ background: C.blueTint2 }}>
                      <p className="font-display font-extrabold text-lg" style={{ color: C.ink }}>{n}</p>
                      <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "usuarios" && (
          <div>
            <SectionHeader eyebrow="Acesso" title="Cadastrar usuário direto pelo painel" sub="Cria a conta de login e o perfil (cliente, empresário ou admin) sem precisar de auto-cadastro" />
            <form onSubmit={criarUsuarioAdmin} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg" style={{ borderColor: C.line }}>
              <div className="rounded-xl border p-3" style={{ borderColor: C.line, background: C.blueTint2 }}>
                <p className="font-body text-xs font-bold" style={{ color: C.ink }}>
                  Já tem conta? Busque em vez de criar do zero
                </p>
                {usuarioExistenteSelecionado ? (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-white border px-3 py-2" style={{ borderColor: C.line }}>
                    <div>
                      <p className="font-body text-sm font-bold" style={{ color: C.ink }}>{usuarioExistenteSelecionado.nome}</p>
                      <p className="font-body text-xs" style={{ color: "#5C7186" }}>{usuarioExistenteSelecionado.email || "sem e-mail"}</p>
                    </div>
                    <button type="button" onClick={limparUsuarioExistente} className="font-body text-xs font-bold" style={{ color: C.blue }}>
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div className="relative mt-2">
                    <input
                      value={buscaUsuarioExistente}
                      onChange={(e) => setBuscaUsuarioExistente(e.target.value)}
                      placeholder="Buscar por nome, telefone ou e-mail..."
                      className="w-full font-body text-sm border rounded-lg px-3 py-2 outline-none bg-white"
                      style={{ borderColor: C.line }}
                    />
                    {resultadosUsuarioExistente.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: C.line }}>
                        {resultadosUsuarioExistente.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => selecionarUsuarioExistente(u)}
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                            style={{ borderColor: C.line }}
                          >
                            <span className="font-body text-sm" style={{ color: C.ink }}>{u.nome}</span>
                            <span className="font-body text-xs" style={{ color: "#5C7186" }}>
                              {u.email} · {u.tipo}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input
                required
                disabled={!!usuarioExistenteSelecionado}
                value={novoUsuarioAdmin.nome}
                onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, nome: e.target.value }))}
                placeholder="Nome completo"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none disabled:bg-gray-100"
                style={{ borderColor: C.line }}
              />
              <input
                required
                disabled={!!usuarioExistenteSelecionado}
                type="email"
                value={novoUsuarioAdmin.email}
                onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, email: e.target.value }))}
                placeholder="E-mail"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none disabled:bg-gray-100"
                style={{ borderColor: C.line }}
              />
              {!usuarioExistenteSelecionado && (
                <input
                  required
                  type="password"
                  minLength={6}
                  value={novoUsuarioAdmin.senha}
                  onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, senha: e.target.value }))}
                  placeholder="Senha provisória (mín. 6 caracteres)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                  style={{ borderColor: C.line }}
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={novoUsuarioAdmin.cpf}
                  onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, cpf: e.target.value }))}
                  placeholder="CPF"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                  style={{ borderColor: C.line }}
                />
                <input
                  value={novoUsuarioAdmin.cnpj}
                  onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, cnpj: e.target.value }))}
                  placeholder="CNPJ (opcional)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                  style={{ borderColor: C.line }}
                />
              </div>
              <select
                value={novoUsuarioAdmin.tipo}
                onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, tipo: e.target.value }))}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                style={{ borderColor: C.line }}
              >
                <option value="cliente">Cliente</option>
                <option value="empresario">Empresário</option>
                <option value="prestador">Prestador de serviço</option>
                <option value="admin">Administrador</option>
              </select>
              {novoUsuarioAdmin.tipo === "empresario" && (
                <div className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: C.line, background: C.blueTint2 }}>
                  <p className="font-body text-xs font-bold" style={{ color: C.ink }}>Cadastrar a empresa deste empresário junto (aparece aprovada direto)</p>
                  <input
                    value={novoUsuarioAdmin.empresaNome}
                    onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, empresaNome: e.target.value }))}
                    placeholder="Nome da empresa"
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                    style={{ borderColor: C.line }}
                  />
                  <select
                    value={novoUsuarioAdmin.empresaCategoria}
                    onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, empresaCategoria: e.target.value }))}
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white"
                    style={{ borderColor: C.line }}
                  >
                    <option value="">Categoria da empresa</option>
                    {(categoriasReaisAdmin ?? categorias).map((cat) => <option key={cat.nome} value={cat.nome}>{cat.nome}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={novoUsuarioAdmin.empresaWhatsapp}
                      onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, empresaWhatsapp: e.target.value }))}
                      placeholder="WhatsApp"
                      className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                      style={{ borderColor: C.line }}
                    />
                    <input
                      value={novoUsuarioAdmin.empresaInstagram}
                      onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, empresaInstagram: e.target.value }))}
                      placeholder="Instagram"
                      className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                  <input
                    value={novoUsuarioAdmin.empresaEndereco}
                    onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, empresaEndereco: e.target.value }))}
                    placeholder="Endereço"
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                    style={{ borderColor: C.line }}
                  />
                  <input
                    value={novoUsuarioAdmin.empresaGoogleMaps}
                    onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, empresaGoogleMaps: e.target.value }))}
                    placeholder="Link do Google Maps"
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                    style={{ borderColor: C.line }}
                  />
                  <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                    <input type="checkbox" checked={novoUsuarioAdmin.empresaAceitaCartaoServidor || false}
                      onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, empresaAceitaCartaoServidor: e.target.checked }))} />
                    Aceita Cartão do Servidor
                  </label>
                </div>
              )}
              {novoUsuarioAdmin.tipo === "prestador" && (
                <div className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: C.line, background: C.blueTint2 }}>
                  <p className="font-body text-xs font-bold" style={{ color: C.ink }}>Dados do prestador de serviço (aparece aprovado direto)</p>
                  <input
                    value={novoUsuarioAdmin.prestadorServico}
                    onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, prestadorServico: e.target.value }))}
                    placeholder="Serviço prestado (ex: Eletricista)"
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                    style={{ borderColor: C.line }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={novoUsuarioAdmin.prestadorWhatsapp}
                      onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, prestadorWhatsapp: e.target.value }))}
                      placeholder="WhatsApp"
                      className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                      style={{ borderColor: C.line }}
                    />
                    <input
                      value={novoUsuarioAdmin.prestadorInstagram}
                      onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, prestadorInstagram: e.target.value }))}
                      placeholder="Instagram"
                      className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                  <input
                    value={novoUsuarioAdmin.prestadorEndereco}
                    onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, prestadorEndereco: e.target.value }))}
                    placeholder="Endereço"
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                    style={{ borderColor: C.line }}
                  />
                  <input
                    value={novoUsuarioAdmin.prestadorGoogleMaps}
                    onChange={(e) => setNovoUsuarioAdmin((v) => ({ ...v, prestadorGoogleMaps: e.target.value }))}
                    placeholder="Link do Google Maps"
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none"
                    style={{ borderColor: C.line }}
                  />
                </div>
              )}
              {statusUsuarioAdmin && statusUsuarioAdmin !== "ok" && (
                <p className="font-body text-xs" style={{ color: "#D64545" }}>{statusUsuarioAdmin}</p>
              )}
              {statusUsuarioAdmin === "ok" && (
                <p className="font-body text-xs" style={{ color: "#3AA76D" }}>Pronto! Usuário criado/vinculado com sucesso.</p>
              )}
              <button
                type="submit"
                disabled={criandoUsuarioAdmin}
                className="font-body text-sm font-bold text-white rounded-lg py-2.5 flex items-center justify-center gap-2"
                style={{ background: C.blue, opacity: criandoUsuarioAdmin ? 0.7 : 1 }}
              >
                <UserCircle2 size={14} />
                {criandoUsuarioAdmin ? "Enviando..." : usuarioExistenteSelecionado ? "Vincular usuário" : "Criar usuário"}
              </button>
            </form>
          </div>
        )}

        {tab === "todos-usuarios" && (
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <SectionHeader eyebrow="Acesso" title="Usuários cadastrados" sub="Todo mundo que já se cadastrou na plataforma" />
                <span className="inline-flex items-center gap-1.5 mt-1.5 rounded-full pl-2 pr-3 py-1 font-body text-xs font-bold" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: "#25A85B" }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#25A85B" }} />
                  </span>
                  {usuariosOnlineAgoraAdmin} {usuariosOnlineAgoraAdmin === 1 ? "online agora" : "online agora"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={carregarTodosUsuariosAdmin} title="Atualizar lista"
                  className="font-body text-xs font-bold rounded-lg px-3 py-2.5 flex items-center gap-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>
                  <RefreshCw size={14} /> Atualizar
                </button>
                <button onClick={() => { setNovoUsuarioAdmin((v) => ({ ...v, tipo: "cliente" })); setTab("usuarios"); }}
                  className="font-body text-xs font-bold text-white rounded-lg px-4 py-2.5 flex items-center gap-1.5" style={{ background: C.blue }}>
                  <PlusCircle size={14} /> Novo cadastro
                </button>
              </div>
            </div>
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: conecte o Supabase para ver os usuários reais.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input value={buscaTodosUsuariosAdmin} onChange={(e) => setBuscaTodosUsuariosAdmin(e.target.value)} placeholder="Buscar por nome ou e-mail..."
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full max-w-xs" style={{ borderColor: C.line }} />
              <select value={filtroTipoTodosUsuariosAdmin} onChange={(e) => setFiltroTipoTodosUsuariosAdmin(e.target.value)}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                <option value="">Todos os perfis</option>
                <option value="cliente">Cliente</option>
                <option value="empresario">Empresário</option>
                <option value="prestador">Prestador</option>
                <option value="admin">Administrador</option>
              </select>
              <select value={ordenacaoTodosUsuariosAdmin} onChange={(e) => setOrdenacaoTodosUsuariosAdmin(e.target.value)}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
                <option value="acesso">Último acesso</option>
                <option value="nome">Nome (A-Z)</option>
                <option value="perfil">Perfil (A-Z)</option>
              </select>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={exportarUsuariosExcel} className="font-body text-xs font-bold px-3 py-2.5 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.line, color: "#425A70" }}>
                  <FileText size={13} /> Excel
                </button>
                <button onClick={exportarUsuariosPDF} className="font-body text-xs font-bold px-3 py-2.5 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.line, color: "#425A70" }}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            </div>

            <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: C.line }}>
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.blueTint2 }}>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Nome</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>E-mail</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Perfil</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>WhatsApp</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Instagram</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>CPF</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>CNPJ</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Cadastro</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Último acesso</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Status</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!todosUsuariosAdmin && [0, 1, 2, 3].map((i) => (
                    <tr key={`sk-${i}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                      {Array.from({ length: 10 }).map((_, j) => <td key={j} className="px-3 py-2.5"><Skeleton className="w-20 h-3.5" /></td>)}
                    </tr>
                  ))}
                  {usuariosPaginaAtualAdmin.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.line}`, opacity: u.bloqueado ? 0.55 : 1 }}>
                      {editandoUsuarioAdmin === u.id ? (
                        <>
                          <td className="px-3 py-2"><input value={formUsuarioAdmin.nome} onChange={(e) => setFormUsuarioAdmin((f) => ({ ...f, nome: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-28" style={{ borderColor: C.line }} /></td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.email || "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-body text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>{rotuloTipoUsuario(u.tipo)}</span>
                          </td>
                          <td className="px-3 py-2"><input value={formUsuarioAdmin.telefone} onChange={(e) => setFormUsuarioAdmin((f) => ({ ...f, telefone: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-24" style={{ borderColor: C.line }} /></td>
                          <td className="px-3 py-2"><input value={formUsuarioAdmin.instagram} onChange={(e) => setFormUsuarioAdmin((f) => ({ ...f, instagram: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-24" style={{ borderColor: C.line }} /></td>
                          <td className="px-3 py-2"><input value={formUsuarioAdmin.cpf} onChange={(e) => setFormUsuarioAdmin((f) => ({ ...f, cpf: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-24" style={{ borderColor: C.line }} /></td>
                          <td className="px-3 py-2"><input value={formUsuarioAdmin.cnpj} onChange={(e) => setFormUsuarioAdmin((f) => ({ ...f, cnpj: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-24" style={{ borderColor: C.line }} /></td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{formatarUltimoAcesso(u.ultimo_acesso)}</td>
                          <td className="px-3 py-2.5">{u.bloqueado ? "Bloqueado" : "Ativo"}</td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => salvarEdicaoUsuarioAdmin(u.id)} className="font-body text-xs font-bold" style={{ color: C.blue }}>Salvar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="font-body text-sm font-semibold px-3 py-2.5" style={{ color: C.ink }}>{u.nome || "—"}</td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.email || "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-body text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>{rotuloTipoUsuario(u.tipo)}</span>
                          </td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.telefone || "—"}</td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.instagram || "—"}</td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.cpf || "—"}</td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.cnpj || "—"}</td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-body text-xs flex items-center gap-1.5" style={{ color: estaOnline(u.ultimo_acesso) ? "#1E8E5A" : "#5C7186" }}>
                              {estaOnline(u.ultimo_acesso) && (
                                <span className="relative flex h-1.5 w-1.5 shrink-0">
                                  <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: "#25A85B" }} />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#25A85B" }} />
                                </span>
                              )}
                              {estaOnline(u.ultimo_acesso) ? "Online agora" : formatarUltimoAcesso(u.ultimo_acesso)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: u.bloqueado ? "#FBEAE5" : "#E7F6EE", color: u.bloqueado ? "#B4462F" : "#1E8E5A" }}>
                              {u.bloqueado ? "Bloqueado" : "Ativo"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <button onClick={() => iniciarEdicaoUsuarioAdmin(u)} title="Editar" style={{ color: "#425A70" }}><Pencil size={14} /></button>
                              <button onClick={() => alternarBloqueioUsuarioAdmin(u)} title={u.bloqueado ? "Desbloquear" : "Bloquear"} style={{ color: u.bloqueado ? "#1E8E5A" : "#C6811F" }}>
                                <ShieldCheck size={14} />
                              </button>
                              <button onClick={() => { if (confirmarExclusao("Excluir esse usuário? A conta de login também será removida. Essa ação não pode ser desfeita.")) apagarUsuarioAdmin(u.id); }}
                                disabled={processandoUsuarioAdmin === u.id} title="Excluir" style={{ color: "#B4462F" }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {todosUsuariosAdmin && usuariosPaginaAtualAdmin.length === 0 && (
                <p className="font-body text-sm p-4" style={{ color: "#5C7186" }}>Nenhum usuário encontrado.</p>
              )}
            </div>

            {totalPaginasUsuariosAdmin > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => setPaginaTodosUsuariosAdmin((p) => Math.max(1, p - 1))} disabled={paginaTodosUsuariosAdmin === 1}
                  className="font-body text-xs font-bold px-3 py-2 rounded-lg border disabled:opacity-40" style={{ borderColor: C.line, color: "#425A70" }} aria-label="Página anterior">
                  <ChevronLeft size={13} />
                </button>
                <p className="font-body text-xs font-semibold" style={{ color: "#5C7186" }}>Página {paginaTodosUsuariosAdmin} de {totalPaginasUsuariosAdmin}</p>
                <button onClick={() => setPaginaTodosUsuariosAdmin((p) => Math.min(totalPaginasUsuariosAdmin, p + 1))} disabled={paginaTodosUsuariosAdmin === totalPaginasUsuariosAdmin}
                  className="font-body text-xs font-bold px-3 py-2 rounded-lg border disabled:opacity-40" style={{ borderColor: C.line, color: "#425A70" }} aria-label="Próxima página">
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "acessos" && (
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <SectionHeader eyebrow="Atividade" title="Relatório de acessos" sub="Quem está online agora e quando cada um acessou pela última vez" />
              <button onClick={carregarTodosUsuariosAdmin} title="Atualizar"
                className="font-body text-xs font-bold rounded-lg px-3 py-2.5 flex items-center gap-1.5 border shrink-0" style={{ borderColor: C.line, color: "#425A70" }}>
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: conecte o Supabase para ver os acessos reais.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 mb-5">
              <div className="rounded-2xl border p-4" style={{ borderColor: C.line, background: "#E7F6EE" }}>
                <p className="font-display font-extrabold text-2xl" style={{ color: "#1E8E5A" }}>{relatorioAcessosAdmin.onlineAgora}</p>
                <p className="font-body text-xs font-semibold mt-0.5" style={{ color: "#1E8E5A" }}>Online agora</p>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                <p className="font-display font-extrabold text-2xl" style={{ color: C.ink }}>{relatorioAcessosAdmin.ativosHoje}</p>
                <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>Ativos nas últimas 24h</p>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                <p className="font-display font-extrabold text-2xl" style={{ color: C.ink }}>{relatorioAcessosAdmin.ativosSemana}</p>
                <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>Ativos nos últimos 7 dias</p>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                <p className="font-display font-extrabold text-2xl" style={{ color: C.ink }}>{relatorioAcessosAdmin.nuncaAcessou}</p>
                <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>Nunca acessaram</p>
              </div>
            </div>

            <select value={filtroTipoAcessosAdmin} onChange={(e) => setFiltroTipoAcessosAdmin(e.target.value)}
              className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white mb-3" style={{ borderColor: C.line }}>
              <option value="">Todos os perfis</option>
              <option value="cliente">Cliente</option>
              <option value="empresario">Empresário</option>
              <option value="prestador">Prestador</option>
              <option value="admin">Administrador</option>
            </select>

            <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: C.line }}>
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.blueTint2 }}>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Nome</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Perfil</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Cadastro</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Último acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {!todosUsuariosAdmin && [0, 1, 2, 3].map((i) => (
                    <tr key={`sk-${i}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                      {Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-3 py-2.5"><Skeleton className="w-20 h-3.5" /></td>)}
                    </tr>
                  ))}
                  {relatorioAcessosAdmin.lista.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td className="font-body text-sm font-semibold px-3 py-2.5" style={{ color: C.ink }}>{u.nome || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-body text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>{rotuloTipoUsuario(u.tipo)}</span>
                      </td>
                      <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-body text-xs flex items-center gap-1.5" style={{ color: estaOnline(u.ultimo_acesso) ? "#1E8E5A" : "#5C7186" }}>
                          {estaOnline(u.ultimo_acesso) && (
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: "#25A85B" }} />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#25A85B" }} />
                            </span>
                          )}
                          {estaOnline(u.ultimo_acesso) ? "Online agora" : formatarUltimoAcesso(u.ultimo_acesso)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {todosUsuariosAdmin && relatorioAcessosAdmin.lista.length === 0 && (
                <p className="font-body text-sm p-4" style={{ color: "#5C7186" }}>Nenhum usuário encontrado.</p>
              )}
            </div>
          </div>
        )}

        {tab === "categorias" && (
          <div>
            <SectionHeader eyebrow="Vitrine" title="Categorias de empresas" sub="Nome, ícone, cor, ordem e status — controla o que aparece na home e nos formulários de cadastro" />
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: conecte o Supabase para essas alterações serem salvas de verdade.
              </div>
            )}

            <form onSubmit={criarCategoria} className="rounded-2xl border p-4 flex flex-col sm:flex-row gap-2.5 sm:items-end mb-6 max-w-3xl" style={{ borderColor: C.line }}>
              <label className="font-body text-xs font-semibold flex-1" style={{ color: "#425A70" }}>
                Nome
                <input value={novaCategoria.nome} onChange={(e) => setNovaCategoria((v) => ({ ...v, nome: e.target.value }))}
                  placeholder="Ex: Agricultura" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Ícone
                <select value={novaCategoria.icone} onChange={(e) => setNovaCategoria((v) => ({ ...v, icone: e.target.value }))}
                  className="mt-1 font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                  {ICONES_CATEGORIA.map((i) => <option key={i.nome} value={i.nome}>{i.label}</option>)}
                </select>
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Cor
                <input type="color" value={novaCategoria.cor} onChange={(e) => setNovaCategoria((v) => ({ ...v, cor: e.target.value }))}
                  className="mt-1 w-14 h-[38px] border rounded-lg outline-none block" style={{ borderColor: C.line }} />
              </label>
              <button type="submit" className="font-body text-sm font-bold text-white rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 shrink-0" style={{ background: C.blue }}>
                <PlusCircle size={14} /> Adicionar
              </button>
            </form>
            {statusCategoria && statusCategoria !== "ok" && <p className="font-body text-xs mb-3" style={{ color: "#D64545" }}>{statusCategoria}</p>}

            <div className="flex flex-col gap-2.5 max-w-3xl">
              {(categoriasAdmin ?? []).map((c, i) => {
                const Icon = resolverIconeCategoria(c.icone);
                const editando = editandoCategoria === c.id;
                return (
                  <div key={c.id} className="rounded-2xl border p-3.5 flex items-center gap-3 flex-wrap" style={{ borderColor: C.line }}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.cor || C.blue}1a`, color: c.cor || C.blue }}>
                      <Icon size={18} />
                    </span>
                    {editando ? (
                      <div className="flex-1 min-w-[220px] flex flex-wrap gap-2 items-center">
                        <input value={formCategoria.nome} onChange={(e) => setFormCategoria((f) => ({ ...f, nome: e.target.value }))}
                          className="flex-1 min-w-[140px] font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        <select value={formCategoria.icone} onChange={(e) => setFormCategoria((f) => ({ ...f, icone: e.target.value }))}
                          className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none bg-white" style={{ borderColor: C.line }}>
                          {ICONES_CATEGORIA.map((i) => <option key={i.nome} value={i.nome}>{i.label}</option>)}
                        </select>
                        <input type="color" value={formCategoria.cor} onChange={(e) => setFormCategoria((f) => ({ ...f, cor: e.target.value }))}
                          className="w-10 h-8 border rounded-lg outline-none" style={{ borderColor: C.line }} />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{c.nome}</p>
                        <p className="font-body text-xs" style={{ color: "#5C7186" }}>{c.ativa ? "Ativa" : "Desativada"} · ordem {c.ordem}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => moverCategoria(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg border flex items-center justify-center disabled:opacity-30" style={{ borderColor: C.line, color: "#425A70" }}><ArrowUp size={14} /></button>
                      <button onClick={() => moverCategoria(i, 1)} disabled={i === (categoriasAdmin ?? []).length - 1} className="w-8 h-8 rounded-lg border flex items-center justify-center disabled:opacity-30" style={{ borderColor: C.line, color: "#425A70" }}><ArrowDown size={14} /></button>
                      <button onClick={() => alternarAtivaCategoria(c.id, !c.ativa)} className="font-body text-xs font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: C.line, color: c.ativa ? "#B4462F" : "#1E8E5A" }}>
                        {c.ativa ? "Desativar" : "Ativar"}
                      </button>
                      {editando ? (
                        <button onClick={() => salvarEdicaoCategoria(c.id)} className="font-body text-xs font-bold px-2.5 py-1.5 rounded-lg text-white" style={{ background: C.blue }}>Salvar</button>
                      ) : (
                        <button onClick={() => iniciarEdicaoCategoria(c)} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: C.line, color: "#425A70" }}><Pencil size={14} /></button>
                      )}
                      <button onClick={() => { if (confirmarExclusao()) { removerCategoria(c.id); notificar("Categoria excluída."); } }} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: C.line, color: "#B4462F" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
              {categoriasAdmin && categoriasAdmin.length === 0 && (
                <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhuma categoria cadastrada ainda — as categorias de exemplo estão sendo usadas nos formulários por enquanto.</p>
              )}
            </div>
          </div>
        )}

        {tab === "empresas" && (
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <SectionHeader eyebrow="Moderação" title="Empresas aguardando aprovação" sub="Aprovar, recusar e editar já grava direto no banco" />
              <button onClick={() => { setNovoUsuarioAdmin((v) => ({ ...v, tipo: "empresario" })); setTab("usuarios"); }}
                className="font-body text-xs font-bold text-white rounded-lg px-4 py-2.5 flex items-center gap-1.5 shrink-0" style={{ background: C.blue }}>
                <PlusCircle size={14} /> Cadastrar comerciante
              </button>
            </div>
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: as ações abaixo só são salvas de verdade com o Supabase conectado.
              </div>
            )}
            <input value={buscaEmpresasAdmin} onChange={(e) => setBuscaEmpresasAdmin(e.target.value)} placeholder="Buscar por nome ou categoria..."
              className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full max-w-sm mb-4" style={{ borderColor: C.line }} />
            <div className="flex flex-col gap-3">
              {listaEmpresasFiltradaAdmin.slice(0, qtdEmpresasAdminVisiveis).map((p) => (
                <div key={p.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: C.line }}>
                  {p.logo_url ? (
                    <img loading="lazy" decoding="async" src={p.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                      <Building2 size={17} />
                    </span>
                  )}
                  {editandoEmpresa === p.id ? (
                    <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input value={formEmpresa.nome} onChange={(e) => setFormEmpresa((f) => ({ ...f, nome: e.target.value }))}
                          className="flex-1 font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        <select value={formEmpresa.categoria} onChange={(e) => setFormEmpresa((f) => ({ ...f, categoria: e.target.value }))}
                          className="w-36 font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none bg-white" style={{ borderColor: C.line }}>
                          <option value="">Categoria</option>
                          {(categoriasReaisAdmin ?? categorias).map((cat) => <option key={cat.nome} value={cat.nome}>{cat.nome}</option>)}
                        </select>
                        <select value={formEmpresa.regiao} onChange={(e) => setFormEmpresa((f) => ({ ...f, regiao: e.target.value }))}
                          className="w-36 font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none bg-white" style={{ borderColor: C.line }}>
                          <option value="ivatuba">Ivatuba (Centro)</option>
                          <option value="bairro_refugio">Bairro do Refúgio</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <label className="font-body text-xs font-bold cursor-pointer w-fit flex items-center gap-1.5" style={{ color: C.blue }}>
                          <Camera size={13} /> {enviandoLogoEmpresa ? "Enviando..." : "Trocar logo"}
                          <input type="file" accept="image/*" className="hidden" onChange={enviarLogoEmpresaAdmin} />
                        </label>
                        <label className="font-body text-xs font-bold cursor-pointer w-fit flex items-center gap-1.5" style={{ color: C.blue }}>
                          <ImageIcon size={13} /> {enviandoBannerEmpresa ? "Enviando..." : "Trocar banner"}
                          <input type="file" accept="image/*" className="hidden" onChange={enviarBannerEmpresaAdmin} />
                        </label>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input value={formEmpresa.facebook} onChange={(e) => setFormEmpresa((f) => ({ ...f, facebook: e.target.value }))}
                          placeholder="Link do Facebook" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        <input value={formEmpresa.site} onChange={(e) => setFormEmpresa((f) => ({ ...f, site: e.target.value }))}
                          placeholder="Site (https://...)" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input value={formEmpresa.email} onChange={(e) => setFormEmpresa((f) => ({ ...f, email: e.target.value }))}
                          placeholder="E-mail" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        <input value={formEmpresa.whatsapp} onChange={(e) => setFormEmpresa((f) => ({ ...f, whatsapp: e.target.value }))}
                          placeholder="WhatsApp" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <input value={formEmpresa.instagram} onChange={(e) => setFormEmpresa((f) => ({ ...f, instagram: e.target.value }))}
                          placeholder="Instagram" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        <input value={formEmpresa.cpf} onChange={(e) => setFormEmpresa((f) => ({ ...f, cpf: e.target.value }))}
                          placeholder="CPF" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        <input value={formEmpresa.cnpj} onChange={(e) => setFormEmpresa((f) => ({ ...f, cnpj: e.target.value }))}
                          placeholder="CNPJ" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      </div>
                      <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                        <input type="checkbox" checked={formEmpresa.destaque} onChange={(e) => setFormEmpresa((f) => ({ ...f, destaque: e.target.checked }))} />
                        Mostrar em destaque na Vitrine Local
                      </label>
                      <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                        <input type="checkbox" checked={formEmpresa.possui_mei} onChange={(e) => setFormEmpresa((f) => ({ ...f, possui_mei: e.target.checked }))} />
                        Possui MEI
                      </label>
                      <div>
                        <p className="font-body text-xs font-bold mb-1.5" style={{ color: C.ink }}>Horário de funcionamento</p>
                        <EditorHorarioSemana valor={formEmpresa.horario_funcionamento} onChange={(novo) => setFormEmpresa((f) => ({ ...f, horario_funcionamento: novo }))} />
                      </div>
                      <input value={formEmpresa.chave_pix} onChange={(e) => setFormEmpresa((f) => ({ ...f, chave_pix: e.target.value }))}
                        placeholder="Chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)" className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none w-full" style={{ borderColor: C.line }} />
                      <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                        <input type="checkbox" checked={formEmpresa.aceita_cartao_servidor} onChange={(e) => setFormEmpresa((f) => ({ ...f, aceita_cartao_servidor: e.target.checked }))} />
                        Aceita Cartão do Servidor
                      </label>
                      <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                        <input type="checkbox" checked={formEmpresa.patrocinado} onChange={(e) => setFormEmpresa((f) => ({ ...f, patrocinado: e.target.checked }))} />
                        Anúncio patrocinado (aparece primeiro nas buscas)
                      </label>
                      {formEmpresa.patrocinado && (
                        <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit" style={{ color: "#425A70" }}>
                          Destaque temporário até:
                          <input type="date" value={formEmpresa.patrocinado_ate} onChange={(e) => setFormEmpresa((f) => ({ ...f, patrocinado_ate: e.target.value }))}
                            className="font-body text-xs border rounded-lg px-2 py-1 outline-none" style={{ borderColor: C.line }} />
                          <span className="font-body text-[10px]" style={{ color: "#8896A6" }}>(em branco = sem prazo)</span>
                        </label>
                      )}
                      <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#C6811F" }}>
                        <input type="checkbox" checked={formEmpresa.plano_premium} onChange={(e) => setFormEmpresa((f) => ({ ...f, plano_premium: e.target.checked }))} />
                        Plano Premium (selo fixo + mais fotos + relatório de desempenho)
                      </label>
                      {formEmpresa.plano_premium && (
                        <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit" style={{ color: "#425A70" }}>
                          Premium até:
                          <input type="date" value={formEmpresa.plano_premium_ate} onChange={(e) => setFormEmpresa((f) => ({ ...f, plano_premium_ate: e.target.value }))}
                            className="font-body text-xs border rounded-lg px-2 py-1 outline-none" style={{ borderColor: C.line }} />
                          <span className="font-body text-[10px]" style={{ color: "#8896A6" }}>(em branco = sem prazo)</span>
                        </label>
                      )}
                      <div>
                        <p className="font-body text-xs font-bold mb-1.5" style={{ color: "#425A70" }}>
                          Galeria de fotos <span style={{ color: "#8896A6", fontWeight: 400 }}>({formEmpresa.fotos_urls.length}/{formEmpresa.plano_premium ? LIMITE_FOTOS_PREMIUM : LIMITE_FOTOS_GRATUITO})</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {formEmpresa.fotos_urls.map((url, i) => (
                            <div key={url + i} className="relative w-14 h-14 rounded-lg overflow-hidden border" style={{ borderColor: C.line }}>
                              <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
                              <button onClick={() => removerFotoGaleriaEmpresa(i)} type="button" className="absolute top-0 right-0 w-5 h-5 bg-black/60 text-white flex items-center justify-center"><X size={11} /></button>
                            </div>
                          ))}
                          {formEmpresa.fotos_urls.length < (formEmpresa.plano_premium ? LIMITE_FOTOS_PREMIUM : LIMITE_FOTOS_GRATUITO) && (
                            <label className="w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer" style={{ borderColor: C.line, color: "#5C7186" }}>
                              {enviandoFotoGaleria ? "..." : <PlusCircle size={16} />}
                              <input type="file" accept="image/*" className="hidden" onChange={enviarFotoGaleriaEmpresa} />
                            </label>
                          )}
                        </div>
                        {!formEmpresa.plano_premium && formEmpresa.fotos_urls.length >= LIMITE_FOTOS_GRATUITO && (
                          <p className="font-body text-[10px] mt-1" style={{ color: "#8A5A12" }}>Limite do plano gratuito. Ative o Plano Premium pra liberar até {LIMITE_FOTOS_PREMIUM} fotos.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm flex items-center gap-1.5" style={{ color: C.ink }}>
                        {p.nome}
                        {p.destaque && <span className="font-body text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.amber, color: C.blueDeep }}>DESTAQUE</span>}
                      </p>
                      <p className="font-body text-xs" style={{ color: "#5C7186" }}>{p.categoria} · status: {p.status}</p>
                      {statusEmpresa[p.id] && statusEmpresa[p.id] !== "ok" && <p className="font-body text-[11px] mt-1" style={{ color: "#B4462F" }}>{statusEmpresa[p.id]}</p>}
                    </div>
                  )}
                  {editandoEmpresa === p.id ? (
                    <button onClick={() => salvarEdicaoEmpresa(p.id)} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: C.blue }}>Salvar</button>
                  ) : (
                    <>
                      {p.status !== "aprovada" && (
                        <button onClick={() => mudarStatusEmpresa(p.id, "aprovada")} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: "#25A85B" }}>Aprovar</button>
                      )}
                      {p.status !== "recusada" && (
                        <button onClick={() => mudarStatusEmpresa(p.id, "recusada")} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Recusar</button>
                      )}
                      <button onClick={() => iniciarEdicaoEmpresa(p)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>Editar</button>
                      <button onClick={() => alternarBloqueioEmpresa(p)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: p.status === "bloqueada" ? "#1E8E5A" : "#C6811F" }}>
                        {p.status === "bloqueada" ? "Desbloquear" : "Bloquear"}
                      </button>
                      <button onClick={() => { if (confirmarExclusao("Excluir essa empresa? Essa ação não pode ser desfeita.")) removerEmpresaAdmin(p.id); }}
                        className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Excluir</button>
                    </>
                  )}
                </div>
              ))}
              {listaEmpresas.length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhuma empresa cadastrada ainda.</p>}
              {listaEmpresas.length > 0 && listaEmpresasFiltradaAdmin.length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhuma empresa encontrada.</p>}
            </div>
            {listaEmpresasFiltradaAdmin.length > qtdEmpresasAdminVisiveis && (
              <button onClick={() => setQtdEmpresasAdminVisiveis((n) => n + 15)} className="font-body text-xs font-bold px-4 py-2.5 rounded-lg border mt-3" style={{ borderColor: C.line, color: "#425A70" }}>
                Carregar mais
              </button>
            )}
          </div>
        )}

        {tab === "criterios" && (
          <div>
            <SectionHeader eyebrow="Seleção" title="Critérios de participação" sub="Quem tem MEI e quem já participou de verdade de cursos, eventos e feiras — pra ajudar a decidir quem chamar pras próximas festas" />
            <input value={buscaCriteriosAdmin} onChange={(e) => setBuscaCriteriosAdmin(e.target.value)} placeholder="Buscar empresa pelo nome..."
              className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full max-w-sm mb-4" style={{ borderColor: C.line }} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>Empresa</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>MEI</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>Eventos</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>Cursos</th>
                    <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>Feiras</th>
                  </tr>
                </thead>
                <tbody>
                  {criteriosFiltrados.map((e) => (
                    <tr key={e.id} className="border-t" style={{ borderColor: C.line }}>
                      <td className="font-body text-sm px-3 py-2.5" style={{ color: C.ink }}>{e.nome}</td>
                      <td className="px-3 py-2.5">
                        {e.possui_mei ? (
                          <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>Tem MEI</span>
                        ) : (
                          <span className="font-body text-[10px] px-2 py-0.5 rounded-full" style={{ background: C.blueTint2, color: "#8896A6" }}>Sem MEI</span>
                        )}
                      </td>
                      <td className="font-body text-xs px-3 py-2.5" style={{ color: "#425A70" }}>{e.eventosComparecidos}</td>
                      <td className="font-body text-xs px-3 py-2.5" style={{ color: "#425A70" }}>{e.cursosConcluidos}</td>
                      <td className="font-body text-xs px-3 py-2.5" style={{ color: "#425A70" }}>{e.feirasParticipadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {criteriosFiltrados.length === 0 && <p className="font-body text-sm mt-3" style={{ color: "#5C7186" }}>Nenhuma empresa encontrada.</p>}
            </div>
            <p className="font-body text-[11px] mt-3" style={{ color: "#8896A6" }}>
              Eventos e cursos contam quem foi marcado como "Compareceu"/presença confirmada, cruzando pelo WhatsApp cadastrado na empresa. Feiras contam feirantes vinculados à empresa marcados como "Compareceu na feira".
            </p>

            {feirantesAvulsos.length > 0 && (
              <div className="mt-8">
                <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Feirantes sem empresa vinculada</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>Nome</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>MEI</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5 text-left" style={{ color: "#5C7186" }}>Compareceu na feira</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feirantesAvulsos.map((f) => (
                        <tr key={f.id} className="border-t" style={{ borderColor: C.line }}>
                          <td className="font-body text-sm px-3 py-2.5" style={{ color: C.ink }}>{f.nome}</td>
                          <td className="px-3 py-2.5">
                            {f.possui_mei ? (
                              <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>Tem MEI</span>
                            ) : (
                              <span className="font-body text-[10px] px-2 py-0.5 rounded-full" style={{ background: C.blueTint2, color: "#8896A6" }}>Sem MEI</span>
                            )}
                          </td>
                          <td className="font-body text-xs px-3 py-2.5" style={{ color: "#425A70" }}>{f.compareceu ? "Sim" : "Não"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "prestadores" && (
          <div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <SectionHeader eyebrow="Moderação" title="Prestadores de serviço" sub="Aprovar, recusar e editar já grava direto no banco" />
              <button onClick={() => { setNovoUsuarioAdmin((v) => ({ ...v, tipo: "prestador" })); setTab("usuarios"); }}
                className="font-body text-xs font-bold text-white rounded-lg px-4 py-2.5 flex items-center gap-1.5 shrink-0" style={{ background: C.blue }}>
                <PlusCircle size={14} /> Cadastrar prestador
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {listaPrestadores.map((p) => (
                <div key={p.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: C.line }}>
                  {p.foto_url ? (
                    <img loading="lazy" decoding="async" src={p.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                      <Wrench size={17} />
                    </span>
                  )}
                  {editandoPrestador === p.id ? (
                    <div className="flex-1 min-w-[220px] grid sm:grid-cols-2 gap-2">
                      <input value={formPrestador.nome} onChange={(e) => setFormPrestador((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPrestador.servico} onChange={(e) => setFormPrestador((f) => ({ ...f, servico: e.target.value }))} placeholder="Serviço"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPrestador.endereco} onChange={(e) => setFormPrestador((f) => ({ ...f, endereco: e.target.value }))} placeholder="Endereço"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPrestador.whatsapp} onChange={(e) => setFormPrestador((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="WhatsApp"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPrestador.instagram} onChange={(e) => setFormPrestador((f) => ({ ...f, instagram: e.target.value }))} placeholder="Instagram"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPrestador.email} onChange={(e) => setFormPrestador((f) => ({ ...f, email: e.target.value }))} placeholder="E-mail"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPrestador.cpf} onChange={(e) => setFormPrestador((f) => ({ ...f, cpf: e.target.value }))} placeholder="CPF"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPrestador.cnpj} onChange={(e) => setFormPrestador((f) => ({ ...f, cnpj: e.target.value }))} placeholder="CNPJ (opcional)"
                        className="font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
                      <p className="font-body text-xs" style={{ color: "#5C7186" }}>{p.servico} · status: {p.status}</p>
                      <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{p.whatsapp}{p.instagram ? ` · ${p.instagram}` : ""}{p.endereco ? ` · ${p.endereco}` : ""}</p>
                      {statusPrestador[p.id] && <p className="font-body text-[11px] mt-1" style={{ color: "#B4462F" }}>{statusPrestador[p.id]}</p>}
                    </div>
                  )}
                  {editandoPrestador === p.id ? (
                    <button onClick={() => salvarEdicaoPrestador(p.id)} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: C.blue }}>Salvar</button>
                  ) : (
                    <>
                      {p.status !== "aprovado" && (
                        <button onClick={() => mudarStatusPrestador(p.id, "aprovado")} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: "#25A85B" }}>Aprovar</button>
                      )}
                      {p.status !== "recusado" && (
                        <button onClick={() => mudarStatusPrestador(p.id, "recusado")} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Recusar</button>
                      )}
                      <button onClick={() => iniciarEdicaoPrestador(p)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>Editar</button>
                      <button onClick={() => alternarBloqueioPrestador(p)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: p.status === "bloqueado" ? "#1E8E5A" : "#C6811F" }}>
                        {p.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                      </button>
                      <button onClick={() => { if (confirmarExclusao("Excluir esse prestador? Essa ação não pode ser desfeita.")) removerPrestadorAdmin(p.id); }}
                        className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Excluir</button>
                    </>
                  )}
                </div>
              ))}
              {listaPrestadores.length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum prestador cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "agenda" && (
          <div>
            <SectionHeader eyebrow="Agendamento" title="Agendamentos" sub="Gere os horários disponíveis de cada prestador — o cliente reserva direto pelo site" />
            <select value={prestadorAgendaSelecionado} onChange={(e) => setPrestadorAgendaSelecionado(e.target.value)}
              className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full max-w-sm mb-4" style={{ borderColor: C.line }}>
              <option value="">Escolha um prestador...</option>
              {listaPrestadores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>

            {prestadorAgendaSelecionado && (
              <>
                <form onSubmit={gerarHorariosAgenda} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
                  <input type="date" value={geradorAgenda.data} onChange={(e) => setGeradorAgenda((v) => ({ ...v, data: e.target.value }))}
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                  <input type="time" value={geradorAgenda.hora_inicio} onChange={(e) => setGeradorAgenda((v) => ({ ...v, hora_inicio: e.target.value }))}
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  <input type="time" value={geradorAgenda.hora_fim} onChange={(e) => setGeradorAgenda((v) => ({ ...v, hora_fim: e.target.value }))}
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  <select value={geradorAgenda.intervalo_minutos} onChange={(e) => setGeradorAgenda((v) => ({ ...v, intervalo_minutos: e.target.value }))}
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }}>
                    <option value="15">Horários de 15 em 15 minutos</option>
                    <option value="30">Horários de 30 em 30 minutos</option>
                    <option value="60">Horários de 1 em 1 hora</option>
                  </select>
                  {statusGeradorAgenda && statusGeradorAgenda !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusGeradorAgenda}</p>}
                  {statusGeradorAgenda === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Horários gerados!</p>}
                  <button type="submit" disabled={gerandoAgenda} className="font-body text-xs font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                    {gerandoAgenda ? "Gerando..." : "Gerar horários pra esse dia"}
                  </button>
                </form>

                <div className="flex flex-col gap-2 max-w-lg">
                  {(agendaAdmin ?? []).map((s) => (
                    <div key={s.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: C.line }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-xs" style={{ color: C.ink }}>{s.data} às {s.hora}</p>
                        {s.status === "reservado" ? (
                          <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>Reservado por {s.cliente_nome}{s.cliente_telefone ? ` · ${s.cliente_telefone}` : ""}</p>
                        ) : (
                          <p className="font-body text-[11px]" style={{ color: "#1E8E5A" }}>Disponível</p>
                        )}
                      </div>
                      {s.status === "reservado" && (
                        <button onClick={() => cancelarReservaAgenda(s.id)} className="font-body text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0" style={{ borderColor: C.line, color: "#425A70" }}>
                          Cancelar reserva
                        </button>
                      )}
                      <button onClick={() => apagarHorarioAgenda(s.id)} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                    </div>
                  ))}
                  {(agendaAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum horário gerado ainda pra esse prestador.</p>}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "produtos" && (
          <div>
            <SectionHeader eyebrow="Catálogo" title="Cadastrar produto" sub="Escolha a empresa e publique direto pelo painel" />
            <form onSubmit={cadastrarProdutoAdmin} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <select value={novoProdutoAdmin.empresa_id} onChange={(e) => setNovoProdutoAdmin((v) => ({ ...v, empresa_id: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }}>
                <option value="">Selecione a empresa</option>
                {listaEmpresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
              </select>
              <input value={novoProdutoAdmin.nome} onChange={(e) => setNovoProdutoAdmin((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome do produto" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novoProdutoAdmin.preco} onChange={(e) => setNovoProdutoAdmin((v) => ({ ...v, preco: e.target.value }))} type="number" step="0.01" placeholder="Preço" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoProdutoAdmin.preco_promocional} onChange={(e) => setNovoProdutoAdmin((v) => ({ ...v, preco_promocional: e.target.value }))} type="number" step="0.01" placeholder="Preço promocional (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoProdutoAdmin.estoque} onChange={(e) => setNovoProdutoAdmin((v) => ({ ...v, estoque: e.target.value }))} type="number" min="0" placeholder="Estoque (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoProdutoAdmin.categoria} onChange={(e) => setNovoProdutoAdmin((v) => ({ ...v, categoria: e.target.value }))} placeholder="Categoria" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novoProdutoAdmin.descricao} onChange={(e) => setNovoProdutoAdmin((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />

              {/* IA: gera descrição e foto ilustrativa só com o nome do produto */}
              <div className="sm:col-span-2 rounded-2xl border p-3.5 flex flex-col gap-2.5" style={{ borderColor: C.line, background: C.blueTint2 }}>
                <p className="font-body text-xs font-semibold flex items-center gap-1.5" style={{ color: "#425A70" }}>
                  <Sparkles size={13} color={C.blue} /> Gerar com IA (usa só o nome do produto)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={gerarDescricaoProdutoAdmin} disabled={gerandoDescricaoProdutoAdmin}
                    className="font-body text-xs font-bold rounded-lg px-3 py-2 border disabled:opacity-60" style={{ borderColor: C.line, color: C.blue, background: "#fff" }}>
                    {gerandoDescricaoProdutoAdmin ? "Gerando descrição..." : "Gerar descrição"}
                  </button>
                  <button type="button" onClick={gerarImagemProdutoAdmin} disabled={gerandoImagemProdutoAdmin}
                    className="font-body text-xs font-bold rounded-lg px-3 py-2 border disabled:opacity-60" style={{ borderColor: C.line, color: C.blue, background: "#fff" }}>
                    {gerandoImagemProdutoAdmin ? "Gerando foto..." : "Gerar foto ilustrativa"}
                  </button>
                </div>
                {erroDescricaoProdutoAdmin && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erroDescricaoProdutoAdmin}</p>}
                {erroImagemProdutoAdmin && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erroImagemProdutoAdmin}</p>}
                {imagemIAProdutoAdmin && !fotoProdutoAdmin && (
                  <div className="flex items-center gap-2.5">
                    <img src={`data:image/png;base64,${imagemIAProdutoAdmin}`} alt="Imagem gerada por IA" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: C.line }} />
                    <div>
                      <p className="font-body text-[11px] font-semibold" style={{ color: "#1E8E5A" }}>Foto ilustrativa gerada!</p>
                      <button type="button" onClick={() => setImagemIAProdutoAdmin(null)} className="font-body text-[11px] font-bold" style={{ color: "#B4462F" }}>Remover</button>
                    </div>
                  </div>
                )}
                <p className="font-body text-[10px]" style={{ color: "#5C7186" }}>Se você anexar uma foto de verdade abaixo, ela tem prioridade sobre a foto gerada por IA.</p>
              </div>

              <label className="font-body text-xs font-bold cursor-pointer sm:col-span-2 flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {fotoProdutoAdmin ? `Foto: ${fotoProdutoAdmin.name}` : "Anexar foto real (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoProdutoAdmin(e.target.files?.[0] || null)} />
              </label>
              {statusProdutoAdmin && statusProdutoAdmin !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusProdutoAdmin}</p>}
              {statusProdutoAdmin === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Produto cadastrado!</p>}
              <button type="submit" disabled={cadastrandoProdutoAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {cadastrandoProdutoAdmin ? "Cadastrando..." : "Cadastrar produto"}
              </button>
            </form>

            <SectionHeader eyebrow="Moderação" title="Produtos publicados" sub="Publicar/despublicar e remover já grava direto no banco" />
            <input value={buscaProdutosAdmin} onChange={(e) => setBuscaProdutosAdmin(e.target.value)} placeholder="Buscar por nome ou empresa..."
              className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full max-w-sm mb-4" style={{ borderColor: C.line }} />
            <div className="flex flex-col gap-3">
              {listaProdutosFiltradaAdmin.slice(0, qtdProdutosAdminVisiveis).map((p) => (
                <div key={p.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: C.line }}>
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                    <ShoppingBag size={17} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
                    <p className="font-body text-xs" style={{ color: "#5C7186" }}>{p.empresas?.nome || "—"}</p>
                  </div>
                  {p._denunciado ? (
                    <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#FBEAE5", color: "#B4462F" }}>Denunciado</span>
                  ) : p.ativo ? (
                    <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>Publicado</span>
                  ) : (
                    <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: C.blueTint, color: "#5C7186" }}>Inativo</span>
                  )}
                  <button onClick={() => alternarAtivoProduto(p.id, !p.ativo)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>
                    {p.ativo ? "Despublicar" : "Publicar"}
                  </button>
                  <button onClick={() => { if (confirmarExclusao()) { removerProduto(p.id); notificar("Produto removido."); } }} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Remover</button>
                </div>
              ))}
              {listaProdutosFiltradaAdmin.length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>{listaProdutos.length === 0 ? "Nenhum produto publicado ainda." : "Nenhum produto encontrado."}</p>}
            </div>
            {listaProdutosFiltradaAdmin.length > qtdProdutosAdminVisiveis && (
              <button onClick={() => setQtdProdutosAdminVisiveis((n) => n + 15)} className="font-body text-xs font-bold px-4 py-2.5 rounded-lg border mt-3" style={{ borderColor: C.line, color: "#425A70" }}>
                Carregar mais
              </button>
            )}
          </div>
        )}

        {tab === "promocoes" && (
          <div>
            <SectionHeader eyebrow="Ofertas" title="Cadastrar promoção" sub="Escolha um produto já publicado e defina o desconto" />
            <form onSubmit={publicarPromocao} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <select value={novaPromocao.produto_id} onChange={(e) => setNovaPromocao((v) => ({ ...v, produto_id: e.target.value }))}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2 bg-white" style={{ borderColor: C.line }}>
                <option value="">Selecione o produto</option>
                {listaProdutos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.empresas?.nome || "—"}</option>)}
              </select>
              <input value={novaPromocao.nome} onChange={(e) => setNovaPromocao((v) => ({ ...v, nome: e.target.value }))}
                placeholder="Nome da promoção (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <textarea value={novaPromocao.descricao} onChange={(e) => setNovaPromocao((v) => ({ ...v, descricao: e.target.value }))}
                placeholder="Descrição (opcional)" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novaPromocao.desconto_percentual} onChange={(e) => setNovaPromocao((v) => ({ ...v, desconto_percentual: e.target.value }))}
                type="number" min="1" max="90" placeholder="% de desconto" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaPromocao.data_inicio} onChange={(e) => setNovaPromocao((v) => ({ ...v, data_inicio: e.target.value }))}
                type="date" placeholder="Início (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaPromocao.valida_ate} onChange={(e) => setNovaPromocao((v) => ({ ...v, valida_ate: e.target.value }))}
                type="date" placeholder="Válida até" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-bold cursor-pointer sm:col-span-2 flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {enviandoImagemPromocao ? "Enviando..." : (novaPromocao.imagem_url ? "Imagem enviada" : "Anexar imagem (opcional)")}
                <input type="file" accept="image/*" className="hidden" onChange={enviarImagemPromocao} />
              </label>
              {statusPromocao && statusPromocao !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusPromocao}</p>}
              {statusPromocao === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Promoção publicada!</p>}
              <button type="submit" disabled={publicandoPromocao} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoPromocao ? "Publicando..." : "Publicar promoção"}
              </button>
            </form>

            <SectionHeader eyebrow="Moderação" title="Promoções cadastradas" sub="Ativar/desativar e remover já grava direto no banco" />
            <div className="flex flex-col gap-3">
              {(promocoesAdmin ?? []).map((p) => (
                <div key={p.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: C.line }}>
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                    <Tag size={17} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome || p.produtos?.nome || "Promoção"}</p>
                    <p className="font-body text-xs" style={{ color: "#5C7186" }}>
                      {p.produtos?.empresas?.nome || "—"} · -{p.desconto_percentual}% · até {p.valida_ate ? new Date(p.valida_ate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: p.ativa ? "#E7F6EE" : C.blueTint, color: p.ativa ? "#1E8E5A" : "#5C7186" }}>
                    {p.ativa ? "Ativa" : "Inativa"}
                  </span>
                  <button onClick={() => alternarAtivaPromocao(p.id, !p.ativa)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>
                    {p.ativa ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => { if (confirmarExclusao()) { removerPromocao(p.id); notificar("Promoção removida."); } }} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Remover</button>
                </div>
              ))}
              {promocoesAdmin && promocoesAdmin.length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhuma promoção cadastrada ainda.</p>}
            </div>
          </div>
        )}

        {tab === "feira" && (
          <div className="flex flex-col gap-8">
            <div>
              <SectionHeader eyebrow="Feira do Empreendedor" title="Feira regular" sub="Dia, horário e local exibidos na home" />
              {!supabaseConfigurado && (
                <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2 max-w-lg" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                  <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                  Modo demonstração: conecte o Supabase para salvar de verdade.
                </div>
              )}
              <form onSubmit={salvarFeiraConfig} className="rounded-2xl border p-5 grid sm:grid-cols-3 gap-3 max-w-lg" style={{ borderColor: C.line }}>
                <input value={feiraConfig.dia} onChange={(e) => setFeiraConfig((f) => ({ ...f, dia: e.target.value }))} placeholder="Ex: Toda quinta-feira"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-3" style={{ borderColor: C.line }} />
                <input value={feiraConfig.horario} onChange={(e) => setFeiraConfig((f) => ({ ...f, horario: e.target.value }))} placeholder="Ex: 16h às 20h"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-1" style={{ borderColor: C.line }} />
                <input value={feiraConfig.local} onChange={(e) => setFeiraConfig((f) => ({ ...f, local: e.target.value }))} placeholder="Local"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                <button type="submit" disabled={salvandoFeira} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-3 disabled:opacity-60" style={{ background: C.blue }}>
                  {salvandoFeira ? "Salvando..." : "Salvar feira regular"}
                </button>
                {statusFeira === "ok" && <p className="sm:col-span-3 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Salvo!</p>}
                {statusFeira && statusFeira !== "ok" && <p className="sm:col-span-3 font-body text-xs" style={{ color: "#B4462F" }}>{statusFeira}</p>}
              </form>
            </div>

            <div>
              <SectionHeader eyebrow="Divulgação" title="Cadastrar e divulgar feiras especiais" sub="Aparecem na home e no calendário de eventos" />
              <form onSubmit={adicionarFeiraEspecial} className="rounded-2xl border p-5 grid sm:grid-cols-3 gap-3 max-w-lg mb-4" style={{ borderColor: C.line }}>
                <input value={novaFeiraEspecial.titulo} onChange={(e) => setNovaFeiraEspecial((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título (ex: Feira Junina)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-3" style={{ borderColor: C.line }} />
                <input type="date" value={novaFeiraEspecial.data_inicio} onChange={(e) => setNovaFeiraEspecial((f) => ({ ...f, data_inicio: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novaFeiraEspecial.local} onChange={(e) => setNovaFeiraEspecial((f) => ({ ...f, local: e.target.value }))} placeholder="Local"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                <input value={novaFeiraEspecial.link_url} onChange={(e) => setNovaFeiraEspecial((f) => ({ ...f, link_url: e.target.value }))} placeholder="Link de divulgação (opcional)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-3" style={{ borderColor: C.line }} />
                <label className="font-body text-xs font-bold cursor-pointer sm:col-span-3 flex items-center gap-2" style={{ color: C.blue }}>
                  <Camera size={14} /> {enviandoFotoFeiraEspecial ? "Enviando..." : novaFeiraEspecial.imagem_url ? "Foto anexada — trocar" : "Anexar foto"}
                  <input type="file" accept="image/*" className="hidden" onChange={enviarFotoFeiraEspecial} />
                </label>
                <button type="submit" className="font-body text-xs font-bold text-white rounded-lg py-2.5 sm:col-span-3 flex items-center justify-center gap-1.5" style={{ background: C.amberDark }}>
                  <PlusCircle size={14} /> Cadastrar feira especial
                </button>
              </form>
              <div className="flex flex-col gap-2 max-w-lg">
                {listaFeirasEspeciais.map((f) => (
                  <div key={f.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: C.line }}>
                    {f.imagem_url && <img loading="lazy" decoding="async" src={f.imagem_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-xs truncate" style={{ color: C.ink }}>{f.titulo}</p>
                      <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{f.data_inicio} · {f.local}</p>
                    </div>
                    <button onClick={() => { if (confirmarExclusao()) { removerFeiraEspecial(f.id); notificar("Feira removida."); } }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                  </div>
                ))}
                {listaFeirasEspeciais.length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhuma feira especial cadastrada.</p>}
              </div>
            </div>

            <div>
              <SectionHeader eyebrow="Cadastros" title="Feirantes" sub="Cadastre direto (já aparece aprovado no site) ou modere quem se cadastrou sozinho" />
              <form onSubmit={cadastrarFeiranteAdmin} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-4" style={{ borderColor: C.line }}>
                <input value={novoFeiranteAdmin.nome} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome do feirante"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                <input value={novoFeiranteAdmin.produto} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, produto: e.target.value }))} placeholder="Produto/serviço"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoFeiranteAdmin.whatsapp} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="WhatsApp"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoFeiranteAdmin.instagram} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, instagram: e.target.value }))} placeholder="Instagram (opcional)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                <input value={novoFeiranteAdmin.email} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, email: e.target.value }))} placeholder="E-mail (opcional)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoFeiranteAdmin.cpf} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, cpf: e.target.value }))} placeholder="CPF (opcional)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoFeiranteAdmin.cnpj} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, cnpj: e.target.value }))} placeholder="CNPJ (opcional)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                <select value={novoFeiranteAdmin.categoria} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, categoria: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                  <option value="">Categoria (opcional)</option>
                  {(categoriasReaisAdmin ?? []).map((c) => <option key={c.id || c.nome} value={c.nome}>{c.nome}</option>)}
                </select>
                <select value={novoFeiranteAdmin.empresa_id} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, empresa_id: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                  <option value="">Vincular a uma empresa (opcional)</option>
                  {(empresasPend ?? []).map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                </select>
                <input value={novoFeiranteAdmin.local} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, local: e.target.value }))} placeholder="Local na feira (ex: Praça Central)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoFeiranteAdmin.numero_estande} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, numero_estande: e.target.value }))} placeholder="Nº da barraca/estande"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <textarea value={novoFeiranteAdmin.descricao} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição breve (opcional)" rows={2}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2 resize-none" style={{ borderColor: C.line }} />
                <label className="font-body text-xs font-bold cursor-pointer sm:col-span-2 flex items-center gap-2" style={{ color: C.blue }}>
                  <Camera size={14} /> {fotoFeiranteAdmin ? `Foto: ${fotoFeiranteAdmin.name}` : "Anexar foto (opcional)"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoFeiranteAdmin(e.target.files?.[0] || null)} />
                </label>
                <label className="font-body text-xs font-semibold cursor-pointer sm:col-span-2 flex items-center gap-2" style={{ color: "#425A70" }}>
                  <input type="checkbox" checked={!!novoFeiranteAdmin.possui_mei} onChange={(e) => setNovoFeiranteAdmin((f) => ({ ...f, possui_mei: e.target.checked }))} />
                  Possui MEI
                </label>
                {statusFeiranteAdmin && statusFeiranteAdmin !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusFeiranteAdmin}</p>}
                {statusFeiranteAdmin === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Feirante cadastrado!</p>}
                <button type="submit" disabled={enviandoFeiranteAdmin} className="font-body text-xs font-bold text-white rounded-lg py-2.5 sm:col-span-2 flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: C.blue }}>
                  <PlusCircle size={14} /> {enviandoFeiranteAdmin ? "Cadastrando..." : "Cadastrar feirante"}
                </button>
              </form>
              <div className="flex flex-col gap-3">
                {(feirantes ?? []).map((f) => {
                  const editando = editandoLocalFeirante[f.id] ?? {
                    local: f.local || "", numero_estande: f.numero_estande || "",
                    nome: f.nome || "", produto: f.produto || "", categoria: f.categoria || "",
                    whatsapp: f.whatsapp || "", instagram: f.instagram || "", descricao: f.descricao || "",
                  };
                  const empresaVinculada = (empresasPend ?? []).find((emp) => emp.id === f.empresa_id);
                  const editandoPerfil = editandoPerfilFeirante === f.id;
                  return (
                  <div key={f.id} className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: C.line }}>
                    <div className="flex items-center gap-4 flex-wrap">
                      {editandoPerfil ? (
                        <div className="flex-1 min-w-0 grid sm:grid-cols-2 gap-2">
                          <input value={editando.nome} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, nome: e.target.value } }))}
                            placeholder="Nome" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                          <input value={editando.produto} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, produto: e.target.value } }))}
                            placeholder="Produto" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                          <input value={editando.categoria} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, categoria: e.target.value } }))}
                            placeholder="Categoria" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                          <input value={editando.whatsapp} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, whatsapp: e.target.value } }))}
                            placeholder="WhatsApp" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                          <input value={editando.instagram} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, instagram: e.target.value } }))}
                            placeholder="Instagram (opcional)" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                          <textarea value={editando.descricao} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, descricao: e.target.value } }))}
                            placeholder="Descrição (opcional)" rows={1} className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{f.nome}{f.categoria ? ` · ${f.categoria}` : ""}</p>
                          <p className="font-body text-xs" style={{ color: "#5C7186" }}>{f.produto} · {f.whatsapp}{f.instagram ? ` · ${f.instagram}` : ""}{empresaVinculada ? ` · Empresa: ${empresaVinculada.nome}` : ""}</p>
                          {f.descricao && <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>{f.descricao}</p>}
                        </div>
                      )}
                      <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{
                          background: f.status === "aprovado" ? "#E7F6EE" : f.status === "recusado" ? "#FBEAE5" : C.blueTint,
                          color: f.status === "aprovado" ? "#1E8E5A" : f.status === "recusado" ? "#B4462F" : "#5C7186",
                        }}>
                        {f.status}
                      </span>
                      {editandoPerfil ? (
                        <>
                          <button onClick={() => { salvarLocalFeirante(f.id); setEditandoPerfilFeirante(null); }} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: C.blue }}>Salvar perfil</button>
                          <button onClick={() => setEditandoPerfilFeirante(null)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#5C7186" }}>Cancelar</button>
                        </>
                      ) : (
                        <button onClick={() => setEditandoPerfilFeirante(f.id)} title="Editar perfil" style={{ color: "#5C7186" }}><Pencil size={15} /></button>
                      )}
                      {f.status !== "aprovado" && (
                        <button onClick={() => mudarStatusFeirante(f.id, "aprovado")} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: "#25A85B" }}>Aprovar</button>
                      )}
                      {f.status !== "recusado" && (
                        <button onClick={() => mudarStatusFeirante(f.id, "recusado")} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Recusar</button>
                      )}
                      <button onClick={() => alternarBloqueioFeirante(f)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: f.status === "bloqueado" ? "#1E8E5A" : "#C6811F" }}>
                        {f.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                      </button>
                      <button onClick={() => { if (confirmarExclusao("Excluir esse feirante? Essa ação não pode ser desfeita.")) removerFeiranteAdmin(f.id); }}
                        className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Excluir</button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input value={editando.local} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, local: e.target.value } }))}
                        placeholder="Local na feira" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none w-44" style={{ borderColor: C.line }} />
                      <input value={editando.numero_estande} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, numero_estande: e.target.value } }))}
                        placeholder="Nº da barraca" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none w-32" style={{ borderColor: C.line }} />
                      <select value={editando.evento_id ?? (f.evento_id || "")} onChange={(e) => setEditandoLocalFeirante((s) => ({ ...s, [f.id]: { ...editando, evento_id: e.target.value } }))}
                        className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }}>
                        <option value="">Vincular a uma feira...</option>
                        {listaEventos.filter((ev) => ev.tipo === "feira").map((ev) => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
                      </select>
                      <button onClick={() => salvarLocalFeirante(f.id)} className="font-body text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: C.blueTint, color: C.blue }}>Salvar local</button>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap pt-1">
                      <label className="font-body text-xs font-semibold flex items-center gap-1.5 cursor-pointer" style={{ color: f.possui_mei ? "#1E8E5A" : "#5C7186" }}>
                        <input type="checkbox" checked={!!f.possui_mei} onChange={(e) => alternarMeiFeirante(f.id, e.target.checked)} />
                        Possui MEI
                      </label>
                      <label className="font-body text-xs font-semibold flex items-center gap-1.5 cursor-pointer" style={{ color: f.compareceu ? "#1E8E5A" : "#5C7186" }}>
                        <input type="checkbox" checked={!!f.compareceu} onChange={(e) => marcarCompareceuFeirante(f.id, e.target.checked)} />
                        Compareceu na feira
                      </label>
                    </div>
                    {f.status === "aprovado" && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {f.credencial_id || f.credencial_codigo ? (
                          <>
                            <span className="font-body text-[11px] font-semibold flex items-center gap-1" style={{ color: "#1E8E5A" }}>
                              <BadgeCheck size={12} /> Credencial gerada
                            </span>
                            {f.credencial_codigo && (
                              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/#/credencial-${f.credencial_codigo}`); notificar("Link copiado."); }}
                                className="font-body text-[11px] font-bold flex items-center gap-1" style={{ color: C.blue }}>
                                Copiar link do crachá
                              </button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => gerarCredencialFeirante({ ...f, evento_id: editando.evento_id ?? f.evento_id })} disabled={gerandoCredencialFeirante === f.id}
                            className="font-body text-[11px] font-bold px-3 py-1.5 rounded-lg border disabled:opacity-60" style={{ borderColor: C.line, color: "#425A70" }}>
                            {gerandoCredencialFeirante === f.id ? "Gerando..." : "Gerar credencial digital"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
                {(feirantes ?? []).length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum cadastro de feirante ainda.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "calendario" && (
          <div>
            <SectionHeader eyebrow="Agenda" title="Calendário de eventos" sub="Só o administrador edita — aparece no site principal para todo mundo" />
            {erroEvento && <p className="font-body text-xs mb-2 max-w-lg" style={{ color: "#B4462F" }}>{erroEvento}</p>}
            <form onSubmit={adicionarEvento} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl mb-6" style={{ borderColor: C.line }}>
              <input value={novoEvento.titulo} onChange={(e) => setNovoEvento((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título do evento"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <textarea value={novoEvento.descricao} onChange={(e) => setNovoEvento((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Data de início
                <input type="date" value={novoEvento.data_inicio} onChange={(e) => setNovoEvento((f) => ({ ...f, data_inicio: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Data final (opcional)
                <input type="date" value={novoEvento.data_fim} onChange={(e) => setNovoEvento((f) => ({ ...f, data_fim: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Horário (opcional)
                <input type="time" value={novoEvento.hora} onChange={(e) => setNovoEvento((f) => ({ ...f, hora: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <input value={novoEvento.local} onChange={(e) => setNovoEvento((f) => ({ ...f, local: e.target.value }))} placeholder="Local"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <select value={novoEvento.tipo} onChange={(e) => setNovoEvento((f) => ({ ...f, tipo: e.target.value }))}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                <option value="outro">Evento geral</option>
                <option value="feira">Feira</option>
                <option value="curso">Curso</option>
                <option value="festa">Festa</option>
                <option value="institucional">Institucional</option>
              </select>
              <select value={novoEvento.status} onChange={(e) => setNovoEvento((f) => ({ ...f, status: e.target.value }))}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                <option value="confirmado">Confirmado</option>
                <option value="adiado">Adiado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <input value={novoEvento.link_inscricao} onChange={(e) => setNovoEvento((f) => ({ ...f, link_inscricao: e.target.value }))} placeholder="Link de inscrição (opcional)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoEvento.google_maps_url} onChange={(e) => setNovoEvento((f) => ({ ...f, google_maps_url: e.target.value }))} placeholder="Link do Google Maps (opcional)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-bold cursor-pointer sm:col-span-2 flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {enviandoBannerEvento ? "Enviando..." : novoEvento.banner_url ? "Banner anexado ✓" : "Anexar banner do evento (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={enviarBannerEvento} />
              </label>
              <button type="submit" disabled={salvandoEvento} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoEvento ? "Salvando..." : "Adicionar ao calendário"}
              </button>
            </form>

            <div className="flex flex-wrap gap-2 mb-3">
              {[
                ["todos", "Todos"], ["festa", "Festa"], ["curso", "Curso"], ["feira", "Feira"],
                ["institucional", "Institucional"], ["outro", "Evento geral"],
              ].map(([valor, label]) => (
                <button key={valor} type="button" onClick={() => setFiltroTipoEventoAdmin(valor)}
                  className="font-body text-xs font-bold px-3 py-1.5 rounded-full border"
                  style={{
                    borderColor: filtroTipoEventoAdmin === valor ? C.blue : C.line,
                    background: filtroTipoEventoAdmin === valor ? C.blueTint : "transparent",
                    color: filtroTipoEventoAdmin === valor ? C.blue : "#5C7186",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 max-w-2xl">
              {listaEventosFiltrada.length === 0 && (
                <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum evento nessa categoria.</p>
              )}
              {listaEventosFiltrada.map((ev) => (
                <div key={ev.id} className="rounded-xl border p-3.5" style={{ borderColor: C.line }}>
                {editandoEvento === ev.id ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={formEvento.titulo} onChange={(e) => setFormEvento((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título do evento"
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                    <textarea value={formEvento.descricao} onChange={(e) => setFormEvento((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2}
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                    <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                      Data de início
                      <input type="date" value={formEvento.data_inicio} onChange={(e) => setFormEvento((f) => ({ ...f, data_inicio: e.target.value }))}
                        className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                    </label>
                    <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                      Data final (opcional)
                      <input type="date" value={formEvento.data_fim} onChange={(e) => setFormEvento((f) => ({ ...f, data_fim: e.target.value }))}
                        className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                    </label>
                    <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                      Horário (opcional)
                      <input type="time" value={formEvento.hora} onChange={(e) => setFormEvento((f) => ({ ...f, hora: e.target.value }))}
                        className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                    </label>
                    <input value={formEvento.local} onChange={(e) => setFormEvento((f) => ({ ...f, local: e.target.value }))} placeholder="Local"
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                    <select value={formEvento.tipo} onChange={(e) => setFormEvento((f) => ({ ...f, tipo: e.target.value }))}
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }}>
                      <option value="outro">Evento geral</option>
                      <option value="feira">Feira</option>
                      <option value="curso">Curso</option>
                      <option value="festa">Festa</option>
                      <option value="institucional">Institucional</option>
                    </select>
                    <select value={formEvento.status} onChange={(e) => setFormEvento((f) => ({ ...f, status: e.target.value }))}
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }}>
                      <option value="confirmado">Confirmado</option>
                      <option value="adiado">Adiado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    <input value={formEvento.link_inscricao} onChange={(e) => setFormEvento((f) => ({ ...f, link_inscricao: e.target.value }))} placeholder="Link de inscrição (opcional)"
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                    <input value={formEvento.google_maps_url} onChange={(e) => setFormEvento((f) => ({ ...f, google_maps_url: e.target.value }))} placeholder="Link do Google Maps (opcional)"
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                    <label className="font-body text-xs font-bold cursor-pointer sm:col-span-2 flex items-center gap-2" style={{ color: C.blue }}>
                      <Camera size={14} /> {enviandoBannerEdicaoEvento ? "Enviando..." : "Trocar banner"}
                      <input type="file" accept="image/*" className="hidden" onChange={enviarBannerEdicaoEvento} />
                    </label>

                    <div className="sm:col-span-2 rounded-xl border p-3 mt-1" style={{ borderColor: C.line, background: C.blueTint2 }}>
                      <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Como foi o evento (preencha depois que acontecer)</p>
                      <textarea value={formEvento.relato} onChange={(e) => setFormEvento((f) => ({ ...f, relato: e.target.value }))}
                        placeholder="Conte como foi, quantas pessoas participaram, destaques..." rows={3}
                        className="font-body text-sm border rounded-lg px-3 py-2 outline-none w-full bg-white" style={{ borderColor: C.line }} />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formEvento.relato_fotos.map((url, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                            <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removerFotoRelatoEvento(i)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                              <X size={10} color="#fff" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2 mt-2" style={{ color: C.blue }}>
                        <Camera size={14} /> {enviandoFotoRelatoEvento ? "Enviando..." : "Adicionar foto do evento"}
                        <input type="file" accept="image/*" className="hidden" onChange={enviarFotoRelatoEvento} />
                      </label>
                    </div>

                    <div className="flex gap-2 sm:col-span-2">
                      <button onClick={() => salvarEdicaoEvento(ev.id)} className="font-body text-xs font-bold text-white rounded-lg px-3 py-2" style={{ background: C.blue }}>Salvar</button>
                      <button onClick={() => setEditandoEvento(null)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border" style={{ borderColor: C.line, color: "#5C7186" }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  {ev.banner_url ? (
                    <img loading="lazy" decoding="async" src={ev.banner_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                      <CalendarDays size={16} />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-xs truncate" style={{ color: C.ink }}>{ev.titulo}</p>
                    <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>
                      {ev.data_inicio}{ev.data_fim ? ` a ${ev.data_fim}` : ""}{ev.hora ? ` · ${ev.hora}` : ""}{ev.local ? ` · ${ev.local}` : ""} · {ev.tipo}
                    </p>
                  </div>
                  <button onClick={() => verParticipantes(ev.id)} className="font-body text-[11px] font-bold flex items-center gap-1 shrink-0" style={{ color: C.blue }}>
                    <Users size={12} /> Participantes{participantesPorEvento[ev.id] ? ` (${participantesPorEvento[ev.id].length})` : ""}
                  </button>
                  <select value={ev.status || "confirmado"} onChange={(e) => mudarStatusEvento(ev.id, e.target.value)}
                    className="font-body text-[11px] font-bold border rounded-lg px-2 py-1.5 outline-none"
                    style={{
                      borderColor: C.line,
                      color: ev.status === "cancelado" ? "#B4462F" : ev.status === "adiado" ? "#B4802F" : "#1E8E5A",
                    }}>
                    <option value="confirmado">Confirmado</option>
                    <option value="adiado">Adiado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <button onClick={() => iniciarEdicaoEvento(ev)} title="Editar" style={{ color: "#5C7186" }}><Pencil size={15} /></button>
                  <button onClick={() => { if (confirmarExclusao()) { removerEvento(ev.id); notificar("Evento removido."); } }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                </div>
                )}
                {editandoEvento !== ev.id && participantesAbertos === ev.id && (
                  <div className="mt-3 pt-3 border-t flex flex-col gap-1.5" style={{ borderColor: C.line }}>
                    {(participantesPorEvento[ev.id] ?? []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between font-body text-[11px]" style={{ color: "#425A70" }}>
                        <span>{p.nome}{p.telefone && <span style={{ color: "#8896A6" }}> · {p.telefone}</span>}</span>
                        <label className="flex items-center gap-1 cursor-pointer shrink-0" style={{ color: p.compareceu ? "#1E8E5A" : "#8896A6" }}>
                          <input type="checkbox" checked={!!p.compareceu} onChange={(e) => marcarCompareceuEvento(ev.id, p.id, e.target.checked)} />
                          Compareceu
                        </label>
                      </div>
                    ))}
                    {(participantesPorEvento[ev.id] ?? []).length === 0 && (
                      <p className="font-body text-[11px]" style={{ color: "#8896A6" }}>Ninguém confirmou presença ainda.</p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 mt-1 border-t" style={{ borderColor: C.line }}>
                      <input value={novoParticipanteManual[ev.id]?.nome ?? ""}
                        onChange={(e) => setNovoParticipanteManual((s) => ({ ...s, [ev.id]: { ...s[ev.id], nome: e.target.value } }))}
                        placeholder="Nome de quem participou" className="font-body text-[11px] border rounded-lg px-2 py-1.5 outline-none flex-1 min-w-[120px]" style={{ borderColor: C.line }} />
                      <input value={novoParticipanteManual[ev.id]?.telefone ?? ""}
                        onChange={(e) => setNovoParticipanteManual((s) => ({ ...s, [ev.id]: { ...s[ev.id], telefone: e.target.value } }))}
                        placeholder="Telefone (opcional)" className="font-body text-[11px] border rounded-lg px-2 py-1.5 outline-none w-32" style={{ borderColor: C.line }} />
                      <button onClick={() => adicionarParticipanteManual(ev.id)} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white" style={{ background: C.blue }}>
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
                </div>
              ))}
              {listaEventos.length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum evento cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "credenciais" && (
          <div>
            <SectionHeader eyebrow="Eventos" title="Credenciamento" sub="Crachá digital com QR Code e check-in manual na porta" />

            <select value={eventoCredenciaisSelecionado} onChange={(e) => setEventoCredenciaisSelecionado(e.target.value)}
              className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full max-w-sm mb-5 bg-white" style={{ borderColor: C.line }}>
              <option value="">Selecione o evento</option>
              {listaEventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.titulo} — {ev.data_inicio}</option>)}
            </select>

            {!eventoCredenciaisSelecionado ? (
              listaEventos.length === 0 ? (
                <div className="rounded-2xl border p-5 max-w-lg" style={{ borderColor: C.line }}>
                  <p className="font-body text-sm mb-3" style={{ color: "#5C7186" }}>
                    Ainda não há nenhum evento cadastrado. Para cadastrar credenciais (crachás com QR Code), primeiro crie um evento no Calendário.
                  </p>
                  <button onClick={() => setTab("calendario")} className="font-body text-xs font-bold text-white rounded-lg px-4 py-2.5 flex items-center gap-1.5 w-fit" style={{ background: C.blue }}>
                    <PlusCircle size={14} /> Ir para Calendário de eventos
                  </button>
                </div>
              ) : (
                <p className="font-body text-sm" style={{ color: "#5C7186" }}>Escolha um evento acima pra ver e cadastrar as credenciais dele.</p>
              )
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  {[
                    [statsCredenciaisAdmin.total, "Total", UserCircle2],
                    [statsCredenciaisAdmin.ativas, "Ativas", CheckCircle2],
                    [statsCredenciaisAdmin.inativas, "Inativas", X],
                    [statsCredenciaisAdmin.checkins, "Check-ins", BadgeCheck],
                    [statsCredenciaisAdmin.tipos, "Tipos", Tag],
                  ].map(([n, l, Icon], i) => {
                    const cor = PALETA_GRAFICOS[i % PALETA_GRAFICOS.length];
                    return (
                      <div key={l} className="rounded-2xl border p-3.5" style={{ borderColor: C.line }}>
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${cor}1a`, color: cor }}>
                          <Icon size={14} />
                        </span>
                        <p className="font-display font-extrabold text-lg mt-2" style={{ color: C.ink }}>{n}</p>
                        <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{l}</p>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={criarCredencial} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
                  <input value={novaCredencial.nome} onChange={(e) => setNovaCredencial((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome completo" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                  <input value={novaCredencial.telefone} onChange={(e) => setNovaCredencial((v) => ({ ...v, telefone: e.target.value }))} placeholder="Telefone (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  <select value={novaCredencial.tipo} onChange={(e) => setNovaCredencial((v) => ({ ...v, tipo: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                    {TIPOS_CREDENCIAL.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="font-body text-xs font-bold cursor-pointer sm:col-span-2 flex items-center gap-2" style={{ color: C.blue }}>
                    <Camera size={14} /> {fotoCredencialAdmin ? `Foto: ${fotoCredencialAdmin.name}` : "Anexar foto (opcional)"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoCredencialAdmin(e.target.files?.[0] || null)} />
                  </label>
                  {statusCredencial && statusCredencial !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusCredencial}</p>}
                  {statusCredencial === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Credencial cadastrada!</p>}
                  <button type="submit" disabled={cadastrandoCredencial} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                    {cadastrandoCredencial ? "Cadastrando..." : "Gerar credencial"}
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 mb-4">
                  <input value={buscaCredenciaisAdmin} onChange={(e) => setBuscaCredenciaisAdmin(e.target.value)} placeholder="Buscar por nome..."
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full max-w-xs" style={{ borderColor: C.line }} />
                  <select value={filtroTipoCredenciaisAdmin} onChange={(e) => setFiltroTipoCredenciaisAdmin(e.target.value)}
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                    <option value="">Todos os tipos</option>
                    {tiposCredenciaisAdmin.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: C.line }}>
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.blueTint2 }}>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Foto</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Nome</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Telefone</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Tipo</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Status</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Check-in</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2.5" style={{ color: "#5C7186" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!credenciaisAdmin && [0, 1, 2].map((i) => (
                        <tr key={`sk-${i}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                          <td className="px-3 py-2.5"><Skeleton className="w-8 h-8 rounded-full" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="w-24 h-3.5" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="w-20 h-3.5" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="w-16 h-3.5" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="w-14 h-5 rounded-full" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="w-20 h-5 rounded-full" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="w-12 h-3.5" /></td>
                        </tr>
                      ))}
                      {credenciaisFiltradasAdmin.map((c) => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                          <td className="px-3 py-2.5">
                            {c.foto_url ? (
                              <img loading="lazy" decoding="async" src={c.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}><UserCircle2 size={15} /></span>
                            )}
                          </td>
                          {editandoCredencial === c.id ? (
                            <>
                              <td className="px-3 py-2.5"><input value={formCredencial.nome} onChange={(e) => setFormCredencial((f) => ({ ...f, nome: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-32" style={{ borderColor: C.line }} /></td>
                              <td className="px-3 py-2.5"><input value={formCredencial.telefone} onChange={(e) => setFormCredencial((f) => ({ ...f, telefone: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-28" style={{ borderColor: C.line }} /></td>
                              <td className="px-3 py-2.5">
                                <select value={formCredencial.tipo} onChange={(e) => setFormCredencial((f) => ({ ...f, tipo: e.target.value }))} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none w-32 bg-white" style={{ borderColor: C.line }}>
                                  {TIPOS_CREDENCIAL.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="font-body text-sm font-semibold px-3 py-2.5" style={{ color: C.ink }}>{c.nome}</td>
                              <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{c.telefone || "—"}</td>
                              <td className="font-body text-xs px-3 py-2.5" style={{ color: "#5C7186" }}>{c.tipo}</td>
                            </>
                          )}
                          <td className="px-3 py-2.5">
                            <button onClick={() => alternarStatusCredencial(c.id, c.status)}
                              className="font-body text-[10px] font-bold px-2 py-1 rounded-full"
                              style={{ background: c.status === "ativa" ? "#E7F6EE" : "#FBEAE5", color: c.status === "ativa" ? "#1E8E5A" : "#B4462F" }}>
                              {c.status === "ativa" ? "Ativa" : "Inativa"}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => alternarCheckinCredencial(c.id, c.checkin_feito)}
                              className="font-body text-[10px] font-bold px-2 py-1 rounded-full"
                              style={{ background: c.checkin_feito ? C.blueTint : "#F3F0FA", color: c.checkin_feito ? C.blue : "#7E5BEF" }}>
                              {c.checkin_feito ? "Feito ✓" : "Fazer check-in"}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {editandoCredencial === c.id ? (
                                <button onClick={() => salvarEdicaoCredencial(c.id)} className="font-body text-xs font-bold" style={{ color: C.blue }}>Salvar</button>
                              ) : (
                                <>
                                  <button onClick={() => setCredencialDigitalAberta(c)} title="Ver credencial digital" style={{ color: C.blue }}><BadgeCheck size={15} /></button>
                                  <button onClick={() => iniciarEdicaoCredencial(c)} title="Editar" style={{ color: "#425A70" }}><Pencil size={14} /></button>
                                  <button onClick={() => { if (confirmarExclusao()) { removerCredencial(c.id); notificar("Credencial excluída."); } }} title="Excluir" style={{ color: "#B4462F" }}><Trash2 size={14} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {credenciaisAdmin && credenciaisFiltradasAdmin.length === 0 && (
                    <p className="font-body text-sm p-4" style={{ color: "#5C7186" }}>Nenhuma credencial encontrada.</p>
                  )}
                </div>
              </>
            )}

            {credencialDigitalAberta && (
              <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={() => setCredencialDigitalAberta(null)}>
                <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xs overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="p-5 text-center text-white" style={{ background: `linear-gradient(120deg, ${C.blueDeep}, ${C.blue})` }}>
                    <p className="font-body text-[11px] uppercase tracking-wider text-white/70">Credencial digital</p>
                    <p className="font-display font-bold text-base mt-1">{credencialDigitalAberta.nome}</p>
                  </div>
                  <div className="p-5 flex flex-col items-center gap-3">
                    <img loading="lazy" decoding="async"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(String(credencialDigitalAberta.codigo))}`}
                      alt="QR Code" className="w-44 h-44" />
                    <p className="font-body text-xs text-center" style={{ color: "#5C7186" }}>
                      Link pra enviar por WhatsApp:<br />
                      <span className="font-semibold break-all" style={{ color: C.blue }}>{`${window.location.origin}/#/credencial-${credencialDigitalAberta.codigo}`}</span>
                    </p>
                    <button onClick={() => setCredencialDigitalAberta(null)} className="font-body text-xs font-bold px-4 py-2 rounded-lg border w-full" style={{ borderColor: C.line, color: "#425A70" }}>Fechar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "servicos" && (
          <div>
            <SectionHeader eyebrow="Personalização" title="Serviços do Empreendedor" sub="Cor e logo de cada botão da home — mudanças aqui refletem no site assim que salvar" />
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: as alterações não são salvas de verdade sem o Supabase conectado.
              </div>
            )}
            <div className="flex flex-col gap-3">
              {servicos.map((s, i) => (
                <div key={s.id || s.titulo} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border-2 border-dashed"
                      style={{ background: `${s.cor_hex || C.blue}1A`, borderColor: C.line }}>
                      {s.logo_url ? <img loading="lazy" decoding="async" src={s.logo_url} alt="" className="w-full h-full object-cover" /> : <Upload size={16} color={s.cor_hex || C.blue} />}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => enviarLogoServico(i, e)} />
                    </label>
                    <input value={s.titulo} onChange={(e) => atualizarServico(i, "titulo", e.target.value)}
                      className="flex-1 font-display font-bold text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line, color: C.ink }} />
                    <input type="color" value={s.cor_hex || C.blue} onChange={(e) => atualizarServico(i, "cor_hex", e.target.value)}
                      className="w-10 h-10 rounded-lg border cursor-pointer shrink-0" style={{ borderColor: C.line }} title="Cor do botão" />
                  </div>
                  <input value={s.descricao} onChange={(e) => atualizarServico(i, "descricao", e.target.value)} placeholder="Descrição curta"
                    className="w-full font-body text-xs border rounded-lg px-3 py-2 outline-none mb-2" style={{ borderColor: C.line }} />
                  <input value={s.url} onChange={(e) => atualizarServico(i, "url", e.target.value)} placeholder="Link (https://...)"
                    className="w-full font-body text-xs border rounded-lg px-3 py-2 outline-none mb-3" style={{ borderColor: C.line }} />
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => salvarServico(s)} disabled={salvandoServico === s.titulo}
                      className="glow-btn font-body text-xs font-bold text-white rounded-lg px-4 py-2 disabled:opacity-60" style={{ background: C.blue }}>
                      {salvandoServico === s.titulo ? "Salvando..." : "Salvar"}
                    </button>
                    {statusServico[s.titulo] === "ok" && <span className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Salvo!</span>}
                    {statusServico[s.titulo] && statusServico[s.titulo] !== "ok" && <span className="font-body text-xs" style={{ color: "#B4462F" }}>{statusServico[s.titulo]}</span>}
                  </div>
                </div>
              ))}
            </div>
            <button type="button"
              onClick={() => setServicos((atual) => [...atual, { titulo: "Novo serviço", descricao: "", url: "", cor_hex: C.blue, logo_url: null, ordem: atual.length + 1 }])}
              className="font-body text-xs font-bold mt-4 px-3 py-2 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.line, color: "#425A70" }}>
              <PlusCircle size={14} /> Adicionar novo serviço
            </button>
          </div>
        )}

        {tab === "sala-empreendedor" && (
          <div>
            <SectionHeader eyebrow="Empreendedorismo" title="Sala do Empreendedor — Atendimentos" sub="Totais oficiais mensais (transcritos do relatório do Sebrae) — aparece no site público" />
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2 max-w-2xl" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: conecte o Supabase para esses números serem salvos de verdade.
              </div>
            )}

            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Totais por categoria e mês</p>
              <div className="flex items-center gap-2">
                <select value={anoTotaisSala} onChange={(e) => setAnoTotaisSala(Number(e.target.value))}
                  className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none bg-white" style={{ borderColor: C.line }}>
                  {anosDisponiveisSala.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
                </select>
                <button onClick={exportarRelatorioSalaExcel} className="font-body text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.line, color: "#425A70" }}>
                  <FileText size={13} /> Excel
                </button>
                <button onClick={exportarRelatorioSalaPDF} className="font-body text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.line, color: "#425A70" }}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            </div>

            {!totaisSalaGrid ? (
              <p className="font-body text-sm" style={{ color: "#5C7186" }}>Carregando...</p>
            ) : (
              <>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                  className="rounded-3xl overflow-hidden mb-5 relative" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={15} color="#8FC1F2" />
                      <p className="font-body text-[11px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
                        Painel ao vivo — {anoTotaisSala}
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3 mb-4">
                      <div className="rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <p className="font-display font-extrabold text-2xl text-white">{relatorioSala.totalGeral}</p>
                        <p className="font-body text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>Total no ano</p>
                      </div>
                      <div className="rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <p className="font-display font-extrabold text-2xl text-white">{relatorioSala.linhas.length}</p>
                        <p className="font-body text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>Categorias com movimento</p>
                      </div>
                      <div className="rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <p className="font-display font-extrabold text-2xl text-white">
                          {relatorioSala.totaisMeses[new Date().getMonth()]}
                        </p>
                        <p className="font-body text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>Neste mês</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={MESES_ABREV.map((m, i) => ({ mes: m, total: relatorioSala.totaisMeses[i] }))}>
                        <XAxis dataKey="mes" stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: C.blueDeep, border: "none", borderRadius: 8, color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                        <Bar dataKey="total" fill="#8FC1F2" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <div className="overflow-x-auto rounded-2xl border mb-3" style={{ borderColor: C.line }}>
                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: C.blueTint }}>
                        <th className="font-body text-[11px] font-bold text-left px-3 py-2" style={{ color: C.blue }}>Serviço</th>
                        <th className="font-body text-[11px] font-bold px-2 py-2" style={{ color: C.blue }}>Total</th>
                        {MESES_ABREV.map((m) => <th key={m} className="font-body text-[11px] font-bold px-1 py-2" style={{ color: C.blue }}>{m}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORIAS_SALA_EMPREENDEDOR.map((categoria) => {
                        const meses = totaisSalaGrid[categoria];
                        const total = meses.reduce((s, v) => s + v, 0);
                        return (
                          <tr key={categoria} className="border-t" style={{ borderColor: C.line }}>
                            <td className="font-body text-xs px-3 py-2" style={{ color: C.ink }}>{categoria}</td>
                            <td className="font-body text-xs font-bold text-center px-2 py-2" style={{ color: C.ink }}>{total}</td>
                            {meses.map((v, i) => (
                              <td key={i} className="px-1 py-1">
                                <input type="number" min={0} value={v} onChange={(e) => atualizarCelulaTotais(categoria, i, e.target.value)}
                                  className="w-12 font-body text-xs text-center border rounded px-1 py-1 outline-none" style={{ borderColor: C.line }} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t" style={{ borderColor: C.line, background: C.blueTint2 }}>
                        <td className="font-body text-xs font-bold px-3 py-2" style={{ color: C.ink }}>TOTALIZAÇÃO GERAL</td>
                        <td className="font-body text-xs font-bold text-center px-2 py-2" style={{ color: C.ink }}>{relatorioSala.totalGeral}</td>
                        {relatorioSala.totaisMeses.map((v, i) => <td key={i} className="font-body text-xs font-bold text-center px-1 py-2" style={{ color: C.ink }}>{v}</td>)}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="flex items-center gap-3 mb-8">
                  <button onClick={salvarTotaisSala} disabled={salvandoTotaisSala} className="font-body text-sm font-bold text-white rounded-lg px-5 py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                    {salvandoTotaisSala ? "Salvando..." : "Salvar e divulgar"}
                  </button>
                  {statusTotaisSala === "ok" && <span className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Salvo! Já aparece no site público.</span>}
                  {statusTotaisSala && statusTotaisSala !== "ok" && <span className="font-body text-xs" style={{ color: "#B4462F" }}>{statusTotaisSala}</span>}
                </div>
              </>
            )}

            <div className="mt-4 border-t pt-6" style={{ borderColor: C.line }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <SectionHeader eyebrow="Crédito" title="Fomento Paraná — pedidos" sub="Cadastre e acompanhe cada pedido de crédito: valor, orientação, proposta, anexo e status" />
                <div className="flex gap-2 h-fit shrink-0">
                  <button onClick={exportarFomentoExcel} className="font-body text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.line, color: "#425A70" }}>
                    <FileText size={13} /> Excel
                  </button>
                  <button onClick={exportarFomentoPDF} className="font-body text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.line, color: "#425A70" }}>
                    <FileText size={13} /> PDF
                  </button>
                </div>
              </div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="rounded-3xl overflow-hidden mt-3 mb-5 relative" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <HandCoins size={15} color="#8FC1F2" />
                    <p className="font-body text-[11px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Painel ao vivo — Fomento Paraná
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                    <div className="rounded-2xl p-3.5 lg:col-span-2" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                      <p className="font-display font-extrabold text-2xl text-white">R$ {totalConcedidoFomento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="font-body text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>Total concedido</p>
                    </div>
                    {Object.entries(ROTULO_STATUS_FOMENTO).map(([chave, rotulo]) => (
                      <div key={chave} className="rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <p className="font-display font-extrabold text-2xl text-white">{contagemStatusFomento[chave] || 0}</p>
                        <p className="font-body text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{rotulo}</p>
                      </div>
                    ))}
                  </div>
                  {(fomentoLeadsAdmin ?? []).length > 0 && (
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={Object.entries(ROTULO_STATUS_FOMENTO).map(([chave, rotulo]) => ({ name: rotulo, value: contagemStatusFomento[chave] || 0 })).filter((d) => d.value > 0)}
                          dataKey="value" nameKey="name" innerRadius={35} outerRadius={55} paddingAngle={3}>
                          {Object.keys(ROTULO_STATUS_FOMENTO).map((chave, i) => (
                            <Cell key={chave} fill={["#8FC1F2", "#F2D98F", "#8FF2C4", "#F28F8F"][i % 4]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: C.blueDeep, border: "none", borderRadius: 8, color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              <form onSubmit={criarLeadFomentoAdmin} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl mb-6" style={{ borderColor: C.line }}>
                <select value={novoLeadFomentoAdmin.categoria} onChange={(e) => setNovoLeadFomentoAdmin((v) => ({ ...v, categoria: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white sm:col-span-2" style={{ borderColor: C.line }}>
                  {CATEGORIAS_FOMENTO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <textarea value={novoLeadFomentoAdmin.orientacao} onChange={(e) => setNovoLeadFomentoAdmin((v) => ({ ...v, orientacao: e.target.value }))}
                  placeholder="Orientação dada" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                <textarea value={novoLeadFomentoAdmin.proposta} onChange={(e) => setNovoLeadFomentoAdmin((v) => ({ ...v, proposta: e.target.value }))}
                  placeholder="Proposta (ex: capital de giro R$ 5.000, 24x)" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                <input value={novoLeadFomentoAdmin.valor_concedido} onChange={(e) => setNovoLeadFomentoAdmin((v) => ({ ...v, valor_concedido: e.target.value }))}
                  type="text" inputMode="decimal" placeholder="Valor concedido (ex: 20.000,00 — opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <select value={novoLeadFomentoAdmin.status} onChange={(e) => setNovoLeadFomentoAdmin((v) => ({ ...v, status: e.target.value }))}
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                  {Object.entries(ROTULO_STATUS_FOMENTO).map(([chave, rotulo]) => <option key={chave} value={chave}>{rotulo}</option>)}
                </select>
                <label className="font-body text-xs font-semibold flex items-center gap-2 cursor-pointer w-fit sm:col-span-2" style={{ color: C.blue }}>
                  <FileText size={14} />
                  {anexoLeadFomentoAdmin ? anexoLeadFomentoAdmin.name : "Anexar proposta/documento (opcional)"}
                  <input type="file" hidden onChange={(e) => setAnexoLeadFomentoAdmin(e.target.files?.[0] || null)} />
                </label>
                {statusCriarLeadFomento && statusCriarLeadFomento !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusCriarLeadFomento}</p>}
                {statusCriarLeadFomento === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Pedido cadastrado!</p>}
                <button type="submit" disabled={criandoLeadFomentoAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                  {criandoLeadFomentoAdmin ? "Cadastrando..." : "Cadastrar pedido"}
                </button>
              </form>

              <div className="flex flex-col gap-3 max-w-2xl">
                {(fomentoLeadsAdmin ?? []).map((l) => {
                  const edicao = detalhesFomentoEdicao[l.id] ?? { orientacao: l.orientacao || "", proposta: l.proposta || "" };
                  return (
                    <div key={l.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{l.nome || l.categoria || "Pedido"}</p>
                        <select value={l.status || "recebido"} onChange={(e) => atualizarStatusFomentoLead(l.id, e.target.value)}
                          className="font-body text-xs border rounded-lg px-2 py-1 outline-none bg-white" style={{ borderColor: C.line }}>
                          {Object.entries(ROTULO_STATUS_FOMENTO).map(([chave, rotulo]) => <option key={chave} value={chave}>{rotulo}</option>)}
                        </select>
                      </div>
                      <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>
                        {l.nome ? `${l.whatsapp || "—"} · ` : l.categoria ? `${l.categoria} · ` : ""}
                        {l.criado_em ? new Date(l.criado_em).toLocaleDateString("pt-BR") : "—"}
                      </p>

                      {(l.documentos_urls || []).length > 0 && (
                        <button type="button" className="font-body text-xs font-bold underline mt-1" style={{ color: C.blue }}
                          onClick={async () => {
                            for (const caminho of l.documentos_urls) {
                              const { data, error } = await supabase.storage.from("documentos-fomento").createSignedUrl(caminho, 300);
                              if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
                            }
                          }}>
                          Baixar documentos enviados ({l.documentos_urls.length})
                        </button>
                      )}

                      <div className="grid sm:grid-cols-2 gap-2 mt-3">
                        <textarea value={edicao.orientacao} onChange={(e) => setDetalhesFomentoEdicao((atual) => ({ ...atual, [l.id]: { ...edicao, orientacao: e.target.value } }))}
                          placeholder="Orientação dada" rows={2} className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        <textarea value={edicao.proposta} onChange={(e) => setDetalhesFomentoEdicao((atual) => ({ ...atual, [l.id]: { ...edicao, proposta: e.target.value } }))}
                          placeholder="Proposta" rows={2} className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      </div>

                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <input type="text" inputMode="decimal" placeholder="R$ concedido (ex: 20.000,00)"
                          value={valorConcedidoEdicao[l.id] ?? (l.valor_concedido != null ? Number(l.valor_concedido).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "")}
                          onChange={(e) => setValorConcedidoEdicao((atual) => ({ ...atual, [l.id]: e.target.value }))}
                          className="w-32 font-body text-xs border rounded-lg px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
                        {valorConcedidoEdicao[l.id] !== undefined && (
                          <button onClick={() => salvarValorConcedidoFomento(l.id)} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white" style={{ background: C.blue }}>Salvar valor</button>
                        )}
                        <button onClick={() => salvarDetalhesFomento(l.id)} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>Salvar orientação/proposta</button>
                        <label className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: C.line, color: "#425A70" }}>
                          {l.anexo_url ? "Trocar anexo" : "Anexar proposta"}
                          <input type="file" hidden onChange={enviarAnexoFomentoLead(l.id)} />
                        </label>
                        {l.anexo_url && (
                          <a href={l.anexo_url} target="_blank" rel="noopener noreferrer" className="font-body text-[11px] font-bold underline" style={{ color: C.blue }}>Ver anexo</a>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(fomentoLeadsAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum pedido cadastrado ainda.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "licitacoes" && (
          <div>
            <SectionHeader eyebrow="Compras públicas" title="Editais e Licitações" sub="Publique editais abertos pra empresas locais participarem" />
            <form onSubmit={criarLicitacaoAdmin} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <input value={novaLicitacaoAdmin.titulo} onChange={(e) => setNovaLicitacaoAdmin((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título do edital" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novaLicitacaoAdmin.orgao} onChange={(e) => setNovaLicitacaoAdmin((v) => ({ ...v, orgao: e.target.value }))} placeholder="Órgão (ex: Prefeitura de Ivatuba)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novaLicitacaoAdmin.valor_estimado} onChange={(e) => setNovaLicitacaoAdmin((v) => ({ ...v, valor_estimado: e.target.value }))} type="number" step="0.01" placeholder="Valor estimado (R$, opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Prazo final pra participar
                <input type="date" value={novaLicitacaoAdmin.data_limite} onChange={(e) => setNovaLicitacaoAdmin((v) => ({ ...v, data_limite: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <input value={novaLicitacaoAdmin.link_edital} onChange={(e) => setNovaLicitacaoAdmin((v) => ({ ...v, link_edital: e.target.value }))} placeholder="Link do edital completo (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <textarea value={novaLicitacaoAdmin.descricao} onChange={(e) => setNovaLicitacaoAdmin((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição / objeto do edital" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              {statusLicitacaoAdmin && statusLicitacaoAdmin !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusLicitacaoAdmin}</p>}
              {statusLicitacaoAdmin === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Edital publicado!</p>}
              <button type="submit" disabled={criandoLicitacaoAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {criandoLicitacaoAdmin ? "Publicando..." : "Publicar edital"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg mb-8">
              {(licitacoesAdmin ?? []).map((l) => (
                <div key={l.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{l.titulo}</p>
                    <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: l.ativo ? "#E7F6EE" : "#FBEAE5", color: l.ativo ? "#1E8E5A" : "#B4462F" }}>
                      {l.ativo ? "Aberto" : "Encerrado"}
                    </span>
                  </div>
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>
                    {l.orgao}{l.data_limite ? ` · prazo ${l.data_limite.split("-").reverse().join("/")}` : ""}{l.valor_estimado ? ` · R$ ${Number(l.valor_estimado).toFixed(2).replace(".", ",")}` : ""}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => alternarAtivoLicitacaoAdmin(l.id, !l.ativo)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>{l.ativo ? "Encerrar" : "Reabrir"}</button>
                    <button onClick={() => { if (confirmarExclusao("Excluir esse edital?")) apagarLicitacaoAdmin(l.id); }} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ color: "#B4462F" }}>Excluir</button>
                  </div>

                  {editandoResultadoId === l.id ? (
                    <div className="mt-3 pt-3 border-t flex flex-col gap-2" style={{ borderColor: C.line }}>
                      <textarea value={formResultadoLicitacao[l.id]?.resultado ?? ""} onChange={(e) => setFormResultadoLicitacao((f) => ({ ...f, [l.id]: { ...f[l.id], resultado: e.target.value } }))}
                        placeholder="Ex: Vencedor — Empresa X, R$ 12.345,00 / Deserto / Cancelado" rows={2}
                        className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input type="date" value={formResultadoLicitacao[l.id]?.data_resultado ?? ""} onChange={(e) => setFormResultadoLicitacao((f) => ({ ...f, [l.id]: { ...f[l.id], data_resultado: e.target.value } }))}
                        className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none w-fit" style={{ borderColor: C.line }} />
                      <div className="flex gap-2">
                        <button onClick={() => salvarResultadoLicitacao(l.id)} disabled={salvandoResultadoId === l.id} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 text-white disabled:opacity-60" style={{ background: C.blue }}>
                          {salvandoResultadoId === l.id ? "Salvando..." : "Divulgar resultado"}
                        </button>
                        <button onClick={() => setEditandoResultadoId(null)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
                      {l.resultado ? (
                        <div className="rounded-lg px-2.5 py-2 mb-2" style={{ background: C.blueTint2 }}>
                          <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>
                            Resultado{l.data_resultado ? ` — ${l.data_resultado.split("-").reverse().join("/")}` : ""}
                          </p>
                          <p className="font-body text-[11px]" style={{ color: "#425A70" }}>{l.resultado}</p>
                        </div>
                      ) : null}
                      <button onClick={() => iniciarEdicaoResultado(l)} className="font-body text-xs font-bold" style={{ color: C.blue }}>
                        {l.resultado ? "Editar resultado" : "Divulgar resultado"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(licitacoesAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum edital cadastrado ainda.</p>}
            </div>

            {licitacaoLeadsAdmin && licitacaoLeadsAdmin.length > 0 && (
              <div className="max-w-lg">
                <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Empresários que querem ser avisados ({licitacaoLeadsAdmin.length})</p>
                <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: C.line }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.blueTint2 }}>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2" style={{ color: "#5C7186" }}>Nome</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2" style={{ color: "#5C7186" }}>WhatsApp</th>
                        <th className="font-body text-[10px] font-bold uppercase tracking-wide px-3 py-2" style={{ color: "#5C7186" }}>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licitacaoLeadsAdmin.map((l) => (
                        <tr key={l.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                          <td className="font-body text-xs px-3 py-2" style={{ color: C.ink }}>{l.nome}</td>
                          <td className="font-body text-xs px-3 py-2" style={{ color: "#5C7186" }}>{l.whatsapp}</td>
                          <td className="font-body text-xs px-3 py-2" style={{ color: "#5C7186" }}>{l.criado_em ? new Date(l.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "turismo" && (
          <div>
            <SectionHeader eyebrow="Cidade" title="História da cidade" sub="Aparece no topo da aba Turismo do site" />
            <form onSubmit={salvarIdentidade} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-8" style={{ borderColor: C.line }}>
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={!!siteConfigAdmin?.turismo_ativo} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, turismo_ativo: e.target.checked }))} />
                Mostrar a aba Turismo no menu do site
              </label>
              <label className="font-body text-xs font-bold mt-1" style={{ color: C.ink }}>Foto</label>
              <div className="flex items-center gap-3">
                {siteConfigAdmin?.historia_foto_url ? (
                  <img loading="lazy" decoding="async" src={siteConfigAdmin.historia_foto_url} alt="" className="w-16 h-16 rounded-xl object-cover border" style={{ borderColor: C.line }} />
                ) : (
                  <span className="w-16 h-16 rounded-xl flex items-center justify-center border" style={{ borderColor: C.line, background: C.blueTint }}>
                    <MapPinned size={22} color={C.blue} />
                  </span>
                )}
                <label className="font-body text-xs font-bold cursor-pointer" style={{ color: C.blue }}>
                  Enviar foto
                  <input type="file" accept="image/*" className="hidden" onChange={enviarFotoHistoriaCidade} />
                </label>
              </div>
              <label className="font-body text-xs font-bold mt-1" style={{ color: C.ink }}>Texto sobre a história da cidade</label>
              <textarea value={siteConfigAdmin?.historia_cidade || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, historia_cidade: e.target.value }))}
                rows={5} placeholder="Conte a história e as origens da cidade..." className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button type="submit" disabled={salvandoIdentidade || !siteConfigAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoIdentidade ? "Salvando..." : "Salvar história da cidade"}
              </button>
            </form>

            <SectionHeader eyebrow="Roteiro" title="Pontos turísticos" sub="A ordem definida aqui é a sequência do roteiro sugerido no site" />
            <form onSubmit={publicarPontoTuristico} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <input value={novoPontoTuristico.nome} onChange={(e) => setNovoPontoTuristico((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome do ponto turístico" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={novoPontoTuristico.categoria} onChange={(e) => setNovoPontoTuristico((v) => ({ ...v, categoria: e.target.value }))} placeholder="Categoria (ex: Praça, Igreja, Mirante)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoPontoTuristico.ordem} onChange={(e) => setNovoPontoTuristico((v) => ({ ...v, ordem: e.target.value }))} type="number" placeholder="Ordem no roteiro (0, 1, 2...)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              <textarea value={novoPontoTuristico.descricao} onChange={(e) => setNovoPontoTuristico((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoPontoTuristico.endereco} onChange={(e) => setNovoPontoTuristico((v) => ({ ...v, endereco: e.target.value }))} placeholder="Endereço" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoPontoTuristico.google_maps_url} onChange={(e) => setNovoPontoTuristico((v) => ({ ...v, google_maps_url: e.target.value }))} placeholder="Link do Google Maps (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {enviandoFotoPontoTuristico ? "Enviando..." : novoPontoTuristico.foto_url ? "Foto anexada — trocar" : "Anexar foto"}
                <input type="file" accept="image/*" className="hidden" onChange={enviarFotoPontoTuristico} />
              </label>
              <label className="font-body text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: C.ink }}>
                <input type="checkbox" checked={novoPontoTuristico.destaque} onChange={(e) => setNovoPontoTuristico((v) => ({ ...v, destaque: e.target.checked }))} />
                Mostrar em destaque no roteiro de Turismo
              </label>
              {statusPontoTuristico && statusPontoTuristico !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusPontoTuristico}</p>}
              {statusPontoTuristico === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Publicado!</p>}
              <button type="submit" disabled={publicandoPontoTuristico} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoPontoTuristico ? "Publicando..." : "Adicionar ao roteiro"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg">
              {(pontosTuristicosAdmin ?? []).map((p, i) => (
                <div key={p.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  {editandoPontoTuristico === p.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={formPontoTuristico.nome} onChange={(e) => setFormPontoTuristico((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPontoTuristico.categoria} onChange={(e) => setFormPontoTuristico((v) => ({ ...v, categoria: e.target.value }))} placeholder="Categoria" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <textarea value={formPontoTuristico.descricao} onChange={(e) => setFormPontoTuristico((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição" rows={2} className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPontoTuristico.endereco} onChange={(e) => setFormPontoTuristico((v) => ({ ...v, endereco: e.target.value }))} placeholder="Endereço" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <input value={formPontoTuristico.google_maps_url} onChange={(e) => setFormPontoTuristico((v) => ({ ...v, google_maps_url: e.target.value }))} placeholder="Link do Google Maps (opcional)" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                        <Camera size={14} /> {enviandoFotoEdicaoPontoTuristico ? "Enviando..." : "Trocar foto"}
                        <input type="file" accept="image/*" className="hidden" onChange={enviarFotoEdicaoPontoTuristico} />
                      </label>
                      <label className="font-body text-xs font-bold flex items-center gap-2 cursor-pointer" style={{ color: C.ink }}>
                        <input type="checkbox" checked={formPontoTuristico.destaque} onChange={(e) => setFormPontoTuristico((v) => ({ ...v, destaque: e.target.checked }))} />
                        Mostrar em destaque no roteiro de Turismo
                      </label>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => salvarEdicaoPontoTuristico(p.id)} className="font-body text-xs font-bold text-white rounded-lg px-3 py-2" style={{ background: C.blue }}>Salvar</button>
                        <button onClick={() => setEditandoPontoTuristico(null)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border" style={{ borderColor: C.line, color: "#5C7186" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-xs shrink-0" style={{ background: C.blueTint, color: C.blue }}>{i + 1}</span>
                      {p.foto_url && <img loading="lazy" decoding="async" src={p.foto_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm truncate flex items-center gap-1.5" style={{ color: C.ink }}>
                          {p.nome}
                          {p.destaque && <Star size={12} fill={C.amber} color={C.amber} />}
                        </p>
                        <p className="font-body text-xs truncate" style={{ color: "#5C7186" }}>{p.categoria}{p.endereco ? ` · ${p.endereco}` : ""}</p>
                      </div>
                      <button onClick={() => iniciarEdicaoPontoTuristico(p)} title="Editar" style={{ color: "#5C7186" }}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => alternarDestaquePontoTuristico(p)} title={p.destaque ? "Remover destaque" : "Marcar como destaque"} style={{ color: p.destaque ? C.amber : "#B8C2CC" }}>
                        <Star size={16} fill={p.destaque ? C.amber : "none"} />
                      </button>
                      <button onClick={() => { if (confirmarExclusao("Excluir esse ponto turístico?")) removerPontoTuristico(p.id); }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
              {(pontosTuristicosAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum ponto turístico cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "utilidade" && (
          <div>
            <SectionHeader eyebrow="Dia a dia" title="Utilidade pública" sub="Telefones úteis, ônibus e órgãos públicos, pra ajudar o morador" />
            <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer mb-6" style={{ color: "#425A70" }}>
              <input type="checkbox" checked={!!siteConfigAdmin?.utilidade_ativo} onChange={(e) => { setSiteConfigAdmin((v) => ({ ...v, utilidade_ativo: e.target.checked })); }} />
              Mostrar a aba Utilidade pública no menu do site
            </label>
            {siteConfigAdmin?.utilidade_ativo !== undefined && (
              <button onClick={salvarIdentidade} className="font-body text-xs font-bold rounded-lg px-3 py-2 border mb-6 -mt-4" style={{ borderColor: C.line, color: C.blue }}>
                Salvar essa opção
              </button>
            )}

            <form onSubmit={publicarUtilidade} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <select value={novaUtilidade.categoria} onChange={(e) => setNovaUtilidade((v) => ({ ...v, categoria: e.target.value }))}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }}>
                <option value="telefone">Telefone útil</option>
                <option value="onibus">Horário de ônibus</option>
                <option value="orgao">Órgão público</option>
              </select>
              <input value={novaUtilidade.titulo} onChange={(e) => setNovaUtilidade((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título (ex: Corpo de Bombeiros, Linha Centro)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novaUtilidade.telefone} onChange={(e) => setNovaUtilidade((v) => ({ ...v, telefone: e.target.value }))} placeholder="Telefone (opcional)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaUtilidade.horario} onChange={(e) => setNovaUtilidade((v) => ({ ...v, horario: e.target.value }))} placeholder="Horário (opcional)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaUtilidade.endereco} onChange={(e) => setNovaUtilidade((v) => ({ ...v, endereco: e.target.value }))} placeholder="Endereço (opcional)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <textarea value={novaUtilidade.descricao} onChange={(e) => setNovaUtilidade((v) => ({ ...v, descricao: e.target.value }))} placeholder="Observação (opcional)" rows={2}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2 resize-none" style={{ borderColor: C.line }} />
              <input type="number" value={novaUtilidade.ordem} onChange={(e) => setNovaUtilidade((v) => ({ ...v, ordem: e.target.value }))} placeholder="Ordem (0, 1, 2...)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              {statusUtilidade && statusUtilidade !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusUtilidade}</p>}
              {statusUtilidade === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Publicado!</p>}
              <button type="submit" disabled={publicandoUtilidade} className="font-body text-xs font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoUtilidade ? "Publicando..." : "Adicionar"}
              </button>
            </form>

            <div className="flex flex-col gap-2 max-w-lg">
              {(utilidadeAdmin ?? []).map((u) => (
                <div key={u.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: C.line }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-xs truncate" style={{ color: C.ink }}>{u.titulo}</p>
                    <p className="font-body text-[11px] truncate" style={{ color: "#5C7186" }}>
                      {u.categoria === "telefone" ? "Telefone útil" : u.categoria === "onibus" ? "Ônibus" : "Órgão público"}
                      {u.telefone ? ` · ${u.telefone}` : ""}{u.horario ? ` · ${u.horario}` : ""}
                    </p>
                  </div>
                  <label className="font-body text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0" style={{ color: u.ativo ? "#1E8E5A" : "#8896A6" }}>
                    <input type="checkbox" checked={!!u.ativo} onChange={(e) => alternarAtivoUtilidade(u.id, e.target.checked)} />
                    Ativo
                  </label>
                  <button onClick={() => { if (confirmarExclusao("Excluir esse item?")) apagarUtilidade(u.id); }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                </div>
              ))}
              {(utilidadeAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum item cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "ouvidoria" && (
          <div>
            <SectionHeader eyebrow="Comunidade" title="Ouvidoria" sub="Denúncias de problemas na cidade — buraco, iluminação, lixo e outros" />
            <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer mb-6" style={{ color: "#425A70" }}>
              <input type="checkbox" checked={!!siteConfigAdmin?.ouvidoria_ativo} onChange={(e) => { setSiteConfigAdmin((v) => ({ ...v, ouvidoria_ativo: e.target.checked })); }} />
              Mostrar a aba Ouvidoria no menu do site
            </label>
            {siteConfigAdmin?.ouvidoria_ativo !== undefined && (
              <button onClick={salvarIdentidade} className="font-body text-xs font-bold rounded-lg px-3 py-2 border mb-6 -mt-4" style={{ borderColor: C.line, color: C.blue }}>
                Salvar essa opção
              </button>
            )}

            {(ouvidoriaAdmin ?? []).filter((d) => d.status === "recebido").length > 0 && (
              <div className="mb-8">
                <p className="font-body text-xs font-bold mb-2" style={{ color: "#8A5A12" }}>Recebidas, aguardando análise ({(ouvidoriaAdmin ?? []).filter((d) => d.status === "recebido").length})</p>
                <div className="flex flex-col gap-3 max-w-2xl">
                  {(ouvidoriaAdmin ?? []).filter((d) => d.status === "recebido").map((d) => (
                    <div key={d.id} className="rounded-2xl border p-4" style={{ borderColor: C.amber, background: "#FFF9EE" }}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>
                          {d.categoria} <span className="font-body text-[10px] font-normal" style={{ color: "#8A5A12" }}>· protocolo {d.protocolo}</span>
                        </p>
                        <select value={d.status} onChange={(e) => mudarStatusDenuncia(d.id, e.target.value)}
                          className="font-body text-[11px] font-bold border rounded-lg px-2 py-1 outline-none" style={{ borderColor: C.line }}>
                          <option value="recebido">Recebido</option>
                          <option value="em_analise">Em análise</option>
                          <option value="resolvido">Resolvido</option>
                        </select>
                      </div>
                      {d.local && <p className="font-body text-xs mt-1" style={{ color: "#425A70" }}><MapPin size={11} className="inline mr-1" />{d.local}</p>}
                      <p className="font-body text-sm mt-1" style={{ color: "#425A70" }}>{d.descricao}</p>
                      {(d.nome || d.telefone) && <p className="font-body text-[11px] mt-1" style={{ color: "#8896A6" }}>{d.nome}{d.telefone ? ` · ${d.telefone}` : ""}</p>}
                      {d.foto_url && <img loading="lazy" decoding="async" src={d.foto_url} alt="" className="w-24 h-24 rounded-lg object-cover mt-2" />}
                      <div className="flex gap-2 mt-2">
                        <input value={respostaOuvidoria[d.id] || ""} onChange={(e) => setRespostaOuvidoria((r) => ({ ...r, [d.id]: e.target.value }))} placeholder="Resposta (opcional, visível pra quem consultar o protocolo)"
                          className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none flex-1" style={{ borderColor: C.line }} />
                        <button onClick={() => enviarRespostaOuvidoria(d.id)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: C.blueTint, color: C.blue }}>Salvar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Em análise / resolvidas</p>
            <div className="flex flex-col gap-3 max-w-2xl">
              {(ouvidoriaAdmin ?? []).filter((d) => d.status !== "recebido").map((d) => (
                <div key={d.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>
                      {d.categoria} <span className="font-body text-[10px] font-normal" style={{ color: "#5C7186" }}>· protocolo {d.protocolo}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <select value={d.status} onChange={(e) => mudarStatusDenuncia(d.id, e.target.value)}
                        className="font-body text-[11px] font-bold border rounded-lg px-2 py-1 outline-none" style={{ borderColor: C.line, color: d.status === "resolvido" ? "#1E8E5A" : "#425A70" }}>
                        <option value="recebido">Recebido</option>
                        <option value="em_analise">Em análise</option>
                        <option value="resolvido">Resolvido</option>
                      </select>
                      <button onClick={() => { if (confirmarExclusao("Excluir essa denúncia?")) apagarDenuncia(d.id); }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {d.local && <p className="font-body text-xs mt-1" style={{ color: "#425A70" }}><MapPin size={11} className="inline mr-1" />{d.local}</p>}
                  <p className="font-body text-sm mt-1" style={{ color: "#425A70" }}>{d.descricao}</p>
                  <div className="flex gap-2 mt-2">
                    <input value={respostaOuvidoria[d.id] ?? d.resposta_admin ?? ""} onChange={(e) => setRespostaOuvidoria((r) => ({ ...r, [d.id]: e.target.value }))} placeholder="Resposta (opcional)"
                      className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none flex-1" style={{ borderColor: C.line }} />
                    <button onClick={() => enviarRespostaOuvidoria(d.id)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: C.blueTint, color: C.blue }}>Salvar</button>
                  </div>
                </div>
              ))}
              {(ouvidoriaAdmin ?? []).filter((d) => d.status !== "recebido").length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhuma por aqui ainda.</p>}
            </div>
          </div>
        )}

        {tab === "classificados" && (
          <div>
            <SectionHeader eyebrow="Comunidade" title="Classificados" sub="Compra, venda e doação direto entre moradores — aprove antes de aparecer no site" />
            <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer mb-6" style={{ color: "#425A70" }}>
              <input type="checkbox" checked={!!siteConfigAdmin?.classificados_ativo} onChange={(e) => { setSiteConfigAdmin((v) => ({ ...v, classificados_ativo: e.target.checked })); }} />
              Mostrar a aba Classificados no menu do site
            </label>
            {siteConfigAdmin?.classificados_ativo !== undefined && (
              <button onClick={salvarIdentidade} className="font-body text-xs font-bold rounded-lg px-3 py-2 border mb-6 -mt-4" style={{ borderColor: C.line, color: C.blue }}>
                Salvar essa opção
              </button>
            )}

            {(classificadosAdmin ?? []).filter((c) => c.status === "pendente").length > 0 && (
              <div className="mb-8">
                <p className="font-body text-xs font-bold mb-2" style={{ color: "#8A5A12" }}>Aguardando aprovação ({(classificadosAdmin ?? []).filter((c) => c.status === "pendente").length})</p>
                <div className="flex flex-col gap-3 max-w-2xl">
                  {(classificadosAdmin ?? []).filter((c) => c.status === "pendente").map((c) => (
                    <div key={c.id} className="rounded-2xl border p-4 flex gap-3" style={{ borderColor: C.amber, background: "#FFF9EE" }}>
                      {c.foto_url && <img loading="lazy" decoding="async" src={c.foto_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>
                          {c.titulo} <span className="font-body text-[10px] font-normal uppercase" style={{ color: "#8A5A12" }}>· {c.tipo === "venda" ? "venda" : c.tipo === "doacao" ? "doação" : "procura"}</span>
                        </p>
                        {c.preco != null && <p className="font-body text-xs font-bold" style={{ color: C.blue }}>R$ {Number(c.preco).toFixed(2).replace(".", ",")}</p>}
                        <p className="font-body text-sm mt-1" style={{ color: "#425A70" }}>{c.descricao}</p>
                        <p className="font-body text-[11px] mt-1" style={{ color: "#8896A6" }}>{c.nome}{c.whatsapp ? ` · ${c.whatsapp}` : ""}</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => moderarClassificado(c.id, "aprovado")} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 text-white" style={{ background: "#25A85B" }}>Aprovar</button>
                          <button onClick={() => moderarClassificado(c.id, "recusado")} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ color: "#B4462F" }}>Recusar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Publicados</p>
            <div className="flex flex-col gap-3 max-w-2xl">
              {(classificadosAdmin ?? []).filter((c) => c.status === "aprovado" || c.status === "concluido").map((c) => (
                <div key={c.id} className="rounded-2xl border p-4 flex gap-3" style={{ borderColor: C.line }}>
                  {c.foto_url && <img loading="lazy" decoding="async" src={c.foto_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>
                        {c.titulo} <span className="font-body text-[10px] font-normal uppercase" style={{ color: "#5C7186" }}>· {c.tipo === "venda" ? "venda" : c.tipo === "doacao" ? "doação" : "procura"}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => moderarClassificado(c.id, c.status === "concluido" ? "aprovado" : "concluido")}
                          className="font-body text-[11px] font-bold px-2.5 py-1 rounded-lg border" style={{ borderColor: C.line, color: c.status === "concluido" ? "#1E8E5A" : "#425A70" }}>
                          {c.status === "concluido" ? "Concluído" : "Marcar concluído"}
                        </button>
                        <button onClick={() => { if (confirmarExclusao("Excluir esse anúncio?")) apagarClassificado(c.id); }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {c.preco != null && <p className="font-body text-xs font-bold" style={{ color: C.blue }}>R$ {Number(c.preco).toFixed(2).replace(".", ",")}</p>}
                    <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>{c.descricao}</p>
                  </div>
                </div>
              ))}
              {(classificadosAdmin ?? []).filter((c) => c.status === "aprovado" || c.status === "concluido").length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum anúncio publicado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "mural" && (
          <div>
            <SectionHeader eyebrow="Comunidade" title="Mural da comunidade" sub="Aprove antes de aparecer no site — dá pra responder publicamente" />
            <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer mb-6" style={{ color: "#425A70" }}>
              <input type="checkbox" checked={!!siteConfigAdmin?.mural_ativo} onChange={(e) => { setSiteConfigAdmin((v) => ({ ...v, mural_ativo: e.target.checked })); }} />
              Mostrar a aba Mural no menu do site
            </label>
            {siteConfigAdmin?.mural_ativo !== undefined && (
              <button onClick={salvarIdentidade} className="font-body text-xs font-bold rounded-lg px-3 py-2 border mb-6 -mt-4" style={{ borderColor: C.line, color: C.blue }}>
                Salvar essa opção
              </button>
            )}

            {(muralAdmin ?? []).filter((m) => m.status === "pendente").length > 0 && (
              <div className="mb-8">
                <p className="font-body text-xs font-bold mb-2" style={{ color: "#8A5A12" }}>Aguardando aprovação ({(muralAdmin ?? []).filter((m) => m.status === "pendente").length})</p>
                <div className="flex flex-col gap-3 max-w-2xl">
                  {(muralAdmin ?? []).filter((m) => m.status === "pendente").map((m) => (
                    <div key={m.id} className="rounded-2xl border p-4" style={{ borderColor: C.amber, background: "#FFF9EE" }}>
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{m.nome} <span className="font-body text-[10px] font-normal uppercase" style={{ color: "#8A5A12" }}>· {m.categoria}</span></p>
                      <p className="font-body text-sm mt-1" style={{ color: "#425A70" }}>{m.mensagem}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => moderarMural(m.id, "aprovado")} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 text-white" style={{ background: "#25A85B" }}>Aprovar</button>
                        <button onClick={() => moderarMural(m.id, "recusado")} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ color: "#B4462F" }}>Recusar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Publicadas</p>
            <div className="flex flex-col gap-3 max-w-2xl">
              {(muralAdmin ?? []).filter((m) => m.status === "aprovado").map((m) => (
                <div key={m.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{m.nome} <span className="font-body text-[10px] font-normal uppercase" style={{ color: "#5C7186" }}>· {m.categoria}</span></p>
                    <button onClick={() => { if (confirmarExclusao("Excluir essa publicação?")) apagarMural(m.id); }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                  </div>
                  <p className="font-body text-sm mt-1" style={{ color: "#425A70" }}>{m.mensagem}</p>
                  {m.resposta_admin ? (
                    <div className="mt-2 rounded-lg px-2.5 py-2" style={{ background: C.blueTint2 }}>
                      <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>Resposta da administração</p>
                      <p className="font-body text-xs" style={{ color: "#425A70" }}>{m.resposta_admin}</p>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input value={respostaMural[m.id] || ""} onChange={(e) => setRespostaMural((r) => ({ ...r, [m.id]: e.target.value }))} placeholder="Responder publicamente (opcional)"
                        className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none flex-1" style={{ borderColor: C.line }} />
                      <button onClick={() => enviarRespostaMural(m.id)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: C.blueTint, color: C.blue }}>Responder</button>
                    </div>
                  )}
                </div>
              ))}
              {(muralAdmin ?? []).filter((m) => m.status === "aprovado").length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhuma publicação aprovada ainda.</p>}
            </div>
          </div>
        )}

        {tab === "enquetes" && (
          <div>
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <SectionHeader eyebrow="Engajamento" title="Enquetes" sub="Pergunte à comunidade e acompanhe os resultados em tempo real" />
            </div>
            <form onSubmit={publicarEnquete} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Criar nova enquete</p>
              <input value={novaEnquete.pergunta} onChange={(e) => setNovaEnquete((v) => ({ ...v, pergunta: e.target.value }))} placeholder="Pergunta da enquete" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaEnquete.opcao1} onChange={(e) => setNovaEnquete((v) => ({ ...v, opcao1: e.target.value }))} placeholder="Opção 1" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaEnquete.opcao2} onChange={(e) => setNovaEnquete((v) => ({ ...v, opcao2: e.target.value }))} placeholder="Opção 2" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaEnquete.opcao3} onChange={(e) => setNovaEnquete((v) => ({ ...v, opcao3: e.target.value }))} placeholder="Opção 3 (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              {statusEnquete && statusEnquete !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusEnquete}</p>}
              {statusEnquete === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Publicada!</p>}
              <button type="submit" disabled={publicandoEnquete} className="glow-btn font-body text-sm font-bold text-white rounded-lg py-2.5 flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: C.blue }}>
                <Vote size={14} /> {publicandoEnquete ? "Publicando..." : "Publicar enquete"}
              </button>
            </form>

            <div className="flex flex-col gap-4">
              {listaEnquetes.map((eq) => {
                const total = eq.opcoes.reduce((s, o) => s + o.votos, 0);
                return (
                  <div key={eq.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{eq.pergunta}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ background: eq.ativa ? "#E7F6EE" : C.blueTint, color: eq.ativa ? "#1E8E5A" : "#5C7186" }}>
                          {eq.ativa ? "Ativa" : "Encerrada"}
                        </span>
                        <button onClick={() => alternarAtivaEnquete(eq.id, !eq.ativa)} className="font-body text-[11px] font-bold px-2 py-1 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>
                          {eq.ativa ? "Encerrar" : "Reabrir"}
                        </button>
                        <button onClick={() => { if (confirmarExclusao()) { removerEnquete(eq.id); notificar("Enquete excluída."); } }} style={{ color: "#B4462F" }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {eq.opcoes.map((o) => {
                        const pct = total ? Math.round((o.votos / total) * 100) : 0;
                        return (
                          <div key={o.texto}>
                            <div className="flex justify-between font-body text-xs mb-1" style={{ color: "#425A70" }}>
                              <span>{o.texto}</span>
                              <span className="font-semibold">{pct}%</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: C.blueTint }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.blue }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="font-body text-[11px] mt-2" style={{ color: "#5C7186" }}>{total} votos no total</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "cupons" && (
          <div>
            <SectionHeader eyebrow="Fidelização" title="Cupons de desconto" sub="Cadastre pra qualquer empresa — os donos também podem criar os deles" />
            <form onSubmit={criarCupomAdmin} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <select value={novoCupomAdmin.empresa_id} onChange={(e) => setNovoCupomAdmin((v) => ({ ...v, empresa_id: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }}>
                <option value="">Selecione a empresa</option>
                {listaEmpresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
              </select>
              <input value={novoCupomAdmin.titulo} onChange={(e) => setNovoCupomAdmin((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título (ex: 10% na primeira compra)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novoCupomAdmin.desconto_percentual} onChange={(e) => setNovoCupomAdmin((v) => ({ ...v, desconto_percentual: e.target.value }))} type="number" placeholder="Desconto (%)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoCupomAdmin.validade} onChange={(e) => setNovoCupomAdmin((v) => ({ ...v, validade: e.target.value }))} type="date" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novoCupomAdmin.descricao} onChange={(e) => setNovoCupomAdmin((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              {statusCupomAdmin && statusCupomAdmin !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusCupomAdmin}</p>}
              {statusCupomAdmin === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Cupom criado!</p>}
              <button type="submit" disabled={criandoCupomAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {criandoCupomAdmin ? "Criando..." : "Criar cupom"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg">
              {(cuponsAdmin ?? []).map((c) => (
                <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{c.titulo} <span className="font-body text-xs font-normal" style={{ color: "#5C7186" }}>· {c.empresas?.nome}</span></p>
                    <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.ativo ? "#E7F6EE" : "#FBEAE5", color: c.ativo ? "#1E8E5A" : "#B4462F" }}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>
                    Código: <span className="font-bold" style={{ color: C.blue }}>{c.codigo}</span> · Resgatado {c.usos_atuais}x
                    {c.validade && ` · válido até ${c.validade.split("-").reverse().join("/")}`}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => alternarAtivoCupomAdmin(c.id, !c.ativo)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>{c.ativo ? "Desativar" : "Ativar"}</button>
                    <button onClick={() => { if (confirmarExclusao("Excluir esse cupom?")) apagarCupomAdmin(c.id); }} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ color: "#B4462F" }}>Excluir</button>
                  </div>
                </div>
              ))}
              {(cuponsAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum cupom cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "combos" && (
          <div>
            <SectionHeader eyebrow="Vendas" title="Combos e promoções combinadas" sub="Cadastre pra qualquer empresa — os donos também podem criar os deles" />
            <form onSubmit={criarComboAdmin} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <select value={novoComboAdmin.empresa_id} onChange={(e) => setNovoComboAdmin((v) => ({ ...v, empresa_id: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }}>
                <option value="">Selecione a empresa</option>
                {listaEmpresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
              </select>
              <input value={novoComboAdmin.titulo} onChange={(e) => setNovoComboAdmin((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título (ex: Combo lanche + suco)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novoComboAdmin.preco} onChange={(e) => setNovoComboAdmin((v) => ({ ...v, preco: e.target.value }))} type="number" step="0.01" placeholder="Preço do combo (R$)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novoComboAdmin.descricao} onChange={(e) => setNovoComboAdmin((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              {statusComboAdmin && statusComboAdmin !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusComboAdmin}</p>}
              {statusComboAdmin === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Combo criado!</p>}
              <button type="submit" disabled={criandoComboAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {criandoComboAdmin ? "Criando..." : "Criar combo"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg">
              {(combosAdmin ?? []).map((c) => (
                <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{c.titulo} <span className="font-body text-xs font-normal" style={{ color: "#5C7186" }}>· {c.empresas?.nome}</span></p>
                    <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.ativo ? "#E7F6EE" : "#FBEAE5", color: c.ativo ? "#1E8E5A" : "#B4462F" }}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {c.descricao && <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{c.descricao}</p>}
                  {c.preco && <p className="font-body text-xs mt-1 font-bold" style={{ color: C.blue }}>R$ {Number(c.preco).toFixed(2).replace(".", ",")}</p>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => alternarAtivoComboAdmin(c.id, !c.ativo)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>{c.ativo ? "Desativar" : "Ativar"}</button>
                    <button onClick={() => { if (confirmarExclusao("Excluir esse combo?")) apagarComboAdmin(c.id); }} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ color: "#B4462F" }}>Excluir</button>
                  </div>
                </div>
              ))}
              {(combosAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum combo cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "avaliacoes" && (
          <div>
            <SectionHeader eyebrow="Moderação" title="Avaliações (empresas e turismo)" sub="O público avalia direto no site — apague comentário abusivo ou spam" />
            <div className="flex flex-col gap-3 max-w-2xl">
              {(avaliacoesAdmin ?? []).map((a) => (
                <div key={a.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{a.nome} <span className="font-body text-xs font-normal" style={{ color: "#5C7186" }}>· {a.ponto_turistico_id ? `Turismo: ${a.pontos_turisticos?.nome || "ponto removido"}` : (a.empresas?.nome || "empresa removida")}</span></p>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} fill={n <= a.nota ? "#E8A23D" : "none"} color="#E8A23D" />)}
                      </div>
                    </div>
                    <button onClick={() => { if (confirmarExclusao("Excluir essa avaliação?")) removerAvaliacaoAdmin(a.id); }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                  </div>
                  {a.comentario && <p className="font-body text-xs mt-2" style={{ color: "#425A70" }}>{a.comentario}</p>}
                  {a.resposta_comerciante && (
                    <div className="mt-2 rounded-lg px-2.5 py-2" style={{ background: C.blueTint2 }}>
                      <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>Resposta do comerciante</p>
                      <p className="font-body text-[11px]" style={{ color: "#425A70" }}>{a.resposta_comerciante}</p>
                    </div>
                  )}
                </div>
              ))}
              {(avaliacoesAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhuma avaliação ainda.</p>}
            </div>
          </div>
        )}

        {tab === "depoimentos" && (
          <div>
            <SectionHeader eyebrow="Prova social" title="Depoimentos" sub="Cadastre — os aprovados aparecem no carrossel da home" />
            <form onSubmit={publicarDepoimento} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={novoDepoimento.nome} onChange={(e) => setNovoDepoimento((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoDepoimento.cargo} onChange={(e) => setNovoDepoimento((v) => ({ ...v, cargo: e.target.value }))} placeholder="Cargo (ex: Dona da Padaria X)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              <input value={novoDepoimento.empresa} onChange={(e) => setNovoDepoimento((v) => ({ ...v, empresa: e.target.value }))} placeholder="Empresa (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novoDepoimento.texto} onChange={(e) => setNovoDepoimento((v) => ({ ...v, texto: e.target.value }))} placeholder="Texto do depoimento" rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <div className="flex items-center gap-1">
                <span className="font-body text-xs font-semibold mr-1" style={{ color: "#425A70" }}>Avaliação:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setNovoDepoimento((v) => ({ ...v, avaliacao: n }))}>
                    <Star size={18} fill={n <= novoDepoimento.avaliacao ? C.amberDark : "none"} color={C.amberDark} />
                  </button>
                ))}
              </div>
              <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {enviandoFotoDepoimento ? "Enviando..." : novoDepoimento.foto_url ? "Foto anexada — trocar" : "Anexar foto (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={enviarFotoDepoimento} />
              </label>
              {statusDepoimentoForm && statusDepoimentoForm !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusDepoimentoForm}</p>}
              {statusDepoimentoForm === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Publicado!</p>}
              <button type="submit" disabled={publicandoDepoimento} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoDepoimento ? "Publicando..." : "Publicar depoimento"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg">
              {(depoimentosAdmin ?? []).map((d) => (
                <div key={d.id} className="rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: C.line }}>
                  {d.foto_url ? (
                    <img loading="lazy" decoding="async" src={d.foto_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-white" style={{ background: C.blue }}>{(d.nome || "?").charAt(0)}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm truncate" style={{ color: C.ink }}>{d.nome}</p>
                    <p className="font-body text-xs truncate" style={{ color: "#5C7186" }}>{d.papel || d.cargo}{d.empresa ? ` · ${d.empresa}` : ""} · {"★".repeat(d.avaliacao || 0)}</p>
                  </div>
                  <select value={d.status} onChange={(e) => mudarStatusDepoimento(d.id, e.target.value)}
                    className="font-body text-[11px] font-bold border rounded-lg px-2 py-1.5 outline-none shrink-0"
                    style={{ borderColor: C.line, color: d.status === "aprovado" ? "#1E8E5A" : "#5C7186" }}>
                    <option value="aprovado">Aprovado</option>
                    <option value="pendente">Pendente</option>
                  </select>
                  <button onClick={() => { if (confirmarExclusao()) { removerDepoimento(d.id); notificar("Depoimento excluído."); } }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                </div>
              ))}
              {(depoimentosAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum depoimento cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "faq" && (
          <div>
            <SectionHeader eyebrow="Dúvidas" title="Perguntas frequentes" sub="Agrupe por categoria e use as setas pra definir a ordem de exibição" />
            <form onSubmit={criarFaq} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <input value={novaFaq.pergunta} onChange={(e) => setNovaFaq((v) => ({ ...v, pergunta: e.target.value }))} placeholder="Pergunta" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novaFaq.resposta} onChange={(e) => setNovaFaq((v) => ({ ...v, resposta: e.target.value }))} placeholder="Resposta" rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaFaq.categoria} onChange={(e) => setNovaFaq((v) => ({ ...v, categoria: e.target.value }))} placeholder="Categoria (ex: Cadastro, Pagamento, Geral)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              {statusFaq && statusFaq !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusFaq}</p>}
              {statusFaq === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Adicionada!</p>}
              <button type="submit" className="font-body text-sm font-bold text-white rounded-lg py-2.5" style={{ background: C.blue }}>
                Adicionar pergunta
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg">
              {(faqAdmin ?? []).map((f, i) => (
                <div key={f.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  {editandoFaq === f.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={formFaq.pergunta} onChange={(e) => setFormFaq((v) => ({ ...v, pergunta: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <textarea value={formFaq.resposta} onChange={(e) => setFormFaq((v) => ({ ...v, resposta: e.target.value }))} rows={2} className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <input value={formFaq.categoria} onChange={(e) => setFormFaq((v) => ({ ...v, categoria: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <div className="flex gap-2">
                        <button onClick={() => salvarEdicaoFaq(f.id)} className="font-body text-xs font-bold text-white rounded-lg px-3 py-2" style={{ background: C.blue }}>Salvar</button>
                        <button onClick={() => setEditandoFaq(null)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border" style={{ borderColor: C.line, color: "#425A70" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{f.pergunta}</p>
                        <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{f.resposta}</p>
                        <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block" style={{ background: C.blueTint, color: C.blue }}>{f.categoria || "Geral"}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => moverFaq(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg border flex items-center justify-center disabled:opacity-30" style={{ borderColor: C.line, color: "#425A70" }}><ArrowUp size={14} /></button>
                        <button onClick={() => moverFaq(i, 1)} disabled={i === (faqAdmin ?? []).length - 1} className="w-8 h-8 rounded-lg border flex items-center justify-center disabled:opacity-30" style={{ borderColor: C.line, color: "#425A70" }}><ArrowDown size={14} /></button>
                        <button onClick={() => alternarAtivaFaq(f.id, !f.ativa)} className="font-body text-[10px] font-bold px-2 py-2 rounded-lg border" style={{ borderColor: C.line, color: f.ativa ? "#1E8E5A" : "#5C7186" }}>{f.ativa ? "Ativa" : "Oculta"}</button>
                        <button onClick={() => iniciarEdicaoFaq(f)} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: C.line, color: "#425A70" }}><Pencil size={14} /></button>
                        <button onClick={() => { if (confirmarExclusao()) { removerFaq(f.id); notificar("Pergunta excluída."); } }} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: C.line, color: "#B4462F" }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(faqAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhuma pergunta cadastrada ainda.</p>}
            </div>
          </div>
        )}

        {tab === "noticias" && (
          <div>
            <SectionHeader eyebrow="Comunicação" title="Cadastrar notícia" sub="Foto e link são opcionais — aparece com data mais recente primeiro" />
            <form onSubmit={publicarNoticia} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <input value={novaNoticia.titulo} onChange={(e) => setNovaNoticia((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título da notícia" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novaNoticia.resumo} onChange={(e) => setNovaNoticia((v) => ({ ...v, resumo: e.target.value }))} placeholder="Resumo curto (aparece na lista)" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <button type="button" onClick={() => formatarConteudoNoticia("**")} className="font-display font-bold text-xs w-7 h-7 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>N</button>
                  <button type="button" onClick={() => formatarConteudoNoticia("*")} className="font-display italic text-xs w-7 h-7 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>I</button>
                  <button type="button" onClick={() => formatarConteudoNoticia("##")} className="font-display font-bold text-[10px] w-7 h-7 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>T</button>
                  <span className="font-body text-[10px]" style={{ color: "#B7C6D6" }}>Selecione o texto e clique pra formatar</span>
                </div>
                <textarea ref={conteudoNoticiaRef} value={novaNoticia.conteudo} onChange={(e) => setNovaNoticia((v) => ({ ...v, conteudo: e.target.value }))} placeholder="Conteúdo completo da notícia" rows={6} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full" style={{ borderColor: C.line }} />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <input value={novaNoticia.categoria} onChange={(e) => setNovaNoticia((v) => ({ ...v, categoria: e.target.value }))} placeholder="Categoria (ex: Comércio local)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novaNoticia.autor} onChange={(e) => setNovaNoticia((v) => ({ ...v, autor: e.target.value }))} placeholder="Autor (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              <input value={novaNoticia.tags} onChange={(e) => setNovaNoticia((v) => ({ ...v, tags: e.target.value }))} placeholder="Tags separadas por vírgula (ex: feira, mei, eventos)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaNoticia.link_url} onChange={(e) => setNovaNoticia((v) => ({ ...v, link_url: e.target.value }))} placeholder="Link externo (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />

              <label className="font-body text-xs font-semibold flex items-center gap-2" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={novaNoticia.destaque} onChange={(e) => setNovaNoticia((v) => ({ ...v, destaque: e.target.checked }))} />
                Notícia em destaque
              </label>

              <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {enviandoFotoNoticia ? "Enviando..." : novaNoticia.imagem_url ? "Foto de capa anexada — trocar" : "Anexar foto de capa (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={enviarFotoNoticia} />
              </label>

              <div>
                <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                  <ImageIcon size={14} /> {enviandoGaleriaNoticia ? "Enviando..." : "Adicionar fotos à galeria (opcional)"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={enviarGaleriaNoticia} />
                </label>
                {novaNoticia.galeria_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {novaNoticia.galeria_urls.map((url) => (
                      <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden border" style={{ borderColor: C.line }}>
                        <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removerFotoGaleriaNoticia(url)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                          <X size={9} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {statusNoticia && statusNoticia !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusNoticia}</p>}
              {statusNoticia === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Publicada!</p>}
              <button type="submit" disabled={publicandoNoticia} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoNoticia ? "Publicando..." : "Publicar notícia"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg">
              {(noticiasAdmin ?? []).map((n) => (
                <div key={n.id} className="rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: C.line }}>
                  {n.imagem_url && <img loading="lazy" decoding="async" src={n.imagem_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm truncate" style={{ color: C.ink }}>{n.titulo}{n.destaque ? " ⭐" : ""}</p>
                    <p className="font-body text-xs truncate" style={{ color: "#5C7186" }}>{n.resumo || n.conteudo}{n.categoria ? ` · ${n.categoria}` : ""}</p>
                  </div>
                  <button onClick={() => { if (confirmarExclusao()) { removerNoticia(n.id); notificar("Notícia excluída."); } }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                </div>
              ))}
              {(noticiasAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhuma notícia publicada ainda.</p>}
            </div>
          </div>
        )}

        {tab === "cursos" && (
          <div>
            <SectionHeader eyebrow="Formação" title="Cursos e capacitações" sub="Cadastre — aparece direto na home, em Cursos e Eventos" />
            <form onSubmit={publicarCurso} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <input value={novoCurso.titulo} onChange={(e) => setNovoCurso((v) => ({ ...v, titulo: e.target.value }))} placeholder="Nome do curso" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={novoCurso.instituicao} onChange={(e) => setNovoCurso((v) => ({ ...v, instituicao: e.target.value }))} placeholder="Instituição" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoCurso.professor} onChange={(e) => setNovoCurso((v) => ({ ...v, professor: e.target.value }))} placeholder="Professor/instrutor" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                  Data
                  <input type="date" value={novoCurso.data_inicio} onChange={(e) => setNovoCurso((v) => ({ ...v, data_inicio: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <input value={novoCurso.carga_horaria} onChange={(e) => setNovoCurso((v) => ({ ...v, carga_horaria: e.target.value }))} placeholder="Carga horária (ex: 8h)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none self-end" style={{ borderColor: C.line }} />
              </div>
              <textarea value={novoCurso.descricao} onChange={(e) => setNovoCurso((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoCurso.link_inscricao} onChange={(e) => setNovoCurso((v) => ({ ...v, link_inscricao: e.target.value }))} placeholder="Link de inscrição (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-semibold flex items-center gap-2" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={novoCurso.certificado} onChange={(e) => setNovoCurso((v) => ({ ...v, certificado: e.target.checked }))} />
                Emite certificado
              </label>
              <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {enviandoBannerCurso ? "Enviando..." : novoCurso.banner_url ? "Banner anexado — trocar" : "Anexar banner (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={enviarBannerCurso} />
              </label>
              {statusCurso && statusCurso !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusCurso}</p>}
              {statusCurso === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Publicado!</p>}
              <button type="submit" disabled={publicandoCurso} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoCurso ? "Publicando..." : "Publicar curso"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-lg">
              {(cursosAdmin ?? []).map((c) => (
                <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  {editandoCurso === c.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={formCurso.titulo} onChange={(e) => setFormCurso((v) => ({ ...v, titulo: e.target.value }))} placeholder="Nome do curso" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input value={formCurso.instituicao} onChange={(e) => setFormCurso((v) => ({ ...v, instituicao: e.target.value }))} placeholder="Instituição" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                        <input value={formCurso.professor} onChange={(e) => setFormCurso((v) => ({ ...v, professor: e.target.value }))} placeholder="Professor/instrutor" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input type="date" value={formCurso.data_inicio} onChange={(e) => setFormCurso((v) => ({ ...v, data_inicio: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                        <input value={formCurso.carga_horaria} onChange={(e) => setFormCurso((v) => ({ ...v, carga_horaria: e.target.value }))} placeholder="Carga horária (ex: 8h)" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      </div>
                      <textarea value={formCurso.descricao} onChange={(e) => setFormCurso((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição" rows={2} className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <input value={formCurso.link_inscricao} onChange={(e) => setFormCurso((v) => ({ ...v, link_inscricao: e.target.value }))} placeholder="Link de inscrição (opcional)" className="font-body text-sm border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <label className="font-body text-xs font-semibold flex items-center gap-2" style={{ color: "#425A70" }}>
                        <input type="checkbox" checked={formCurso.certificado} onChange={(e) => setFormCurso((v) => ({ ...v, certificado: e.target.checked }))} />
                        Emite certificado
                      </label>
                      <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                        <Camera size={14} /> {enviandoBannerEdicaoCurso ? "Enviando..." : "Trocar banner"}
                        <input type="file" accept="image/*" className="hidden" onChange={enviarBannerEdicaoCurso} />
                      </label>

                      <div className="rounded-xl border p-3 mt-1" style={{ borderColor: C.line, background: C.blueTint2 }}>
                        <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Como foi o curso (preencha depois que acontecer)</p>
                        <textarea value={formCurso.relato} onChange={(e) => setFormCurso((f) => ({ ...f, relato: e.target.value }))}
                          placeholder="Conte como foi, quantas pessoas participaram, destaques..." rows={3}
                          className="font-body text-sm border rounded-lg px-3 py-2 outline-none w-full bg-white" style={{ borderColor: C.line }} />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formCurso.relato_fotos.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                              <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removerFotoRelatoCurso(i)}
                                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                                <X size={10} color="#fff" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2 mt-2" style={{ color: C.blue }}>
                          <Camera size={14} /> {enviandoFotoRelatoCurso ? "Enviando..." : "Adicionar foto do curso"}
                          <input type="file" accept="image/*" className="hidden" onChange={enviarFotoRelatoCurso} />
                        </label>
                      </div>

                      <div className="flex gap-2 mt-1">
                        <button onClick={() => salvarEdicaoCurso(c.id)} className="font-body text-xs font-bold text-white rounded-lg px-3 py-2" style={{ background: C.blue }}>Salvar</button>
                        <button onClick={() => setEditandoCurso(null)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border" style={{ borderColor: C.line, color: "#5C7186" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                  <div className="flex items-center gap-3">
                    {c.banner_url && <img loading="lazy" decoding="async" src={c.banner_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm truncate" style={{ color: C.ink }}>{c.titulo}</p>
                      <p className="font-body text-xs truncate" style={{ color: "#5C7186" }}>{c.instituicao}{c.data_inicio ? ` · ${c.data_inicio}` : ""}{c.certificado ? " · Com certificado" : ""}</p>
                    </div>
                    <button onClick={() => verInscritos(c.id)} className="font-body text-[11px] font-bold flex items-center gap-1 shrink-0" style={{ color: C.blue }}>
                      <Users size={12} /> Inscritos{inscritosPorCurso[c.id] ? ` (${inscritosPorCurso[c.id].length})` : ""}
                    </button>
                    <button onClick={() => iniciarEdicaoCurso(c)} title="Editar" style={{ color: "#5C7186" }}><Pencil size={15} /></button>
                    <button onClick={() => { if (confirmarExclusao()) { removerCurso(c.id); notificar("Curso excluído."); } }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                  </div>
                  )}
                  {editandoCurso !== c.id && inscritosAbertos === c.id && (
                    <div className="mt-3 pt-3 border-t flex flex-col gap-1.5" style={{ borderColor: C.line }}>
                      {(inscritosPorCurso[c.id] ?? []).map((i) => (
                        <div key={i.id} className="flex items-center justify-between gap-2 font-body text-[11px]" style={{ color: "#425A70" }}>
                          <span className="truncate">{i.nome} <span style={{ color: "#8896A6" }}>· {i.telefone}</span></span>
                          <button onClick={() => confirmarPresencaCurso(i.id, c.id, !i.presenca_confirmada)}
                            className="font-body text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                            style={{ background: i.presenca_confirmada ? "#E7F6EE" : "#F1F4F8", color: i.presenca_confirmada ? "#1E8E5A" : "#5C7186" }}>
                            {i.presenca_confirmada ? "Presença confirmada" : "Confirmar presença"}
                          </button>
                        </div>
                      ))}
                      {(inscritosPorCurso[c.id] ?? []).length === 0 && (
                        <p className="font-body text-[11px]" style={{ color: "#8896A6" }}>Ninguém se inscreveu ainda.</p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1.5 mt-1 border-t" style={{ borderColor: C.line }}>
                        <input value={novoInscritoManual[c.id]?.nome ?? ""}
                          onChange={(e) => setNovoInscritoManual((s) => ({ ...s, [c.id]: { ...s[c.id], nome: e.target.value } }))}
                          placeholder="Nome de quem participou" className="font-body text-[11px] border rounded-lg px-2 py-1.5 outline-none flex-1 min-w-[120px]" style={{ borderColor: C.line }} />
                        <input value={novoInscritoManual[c.id]?.telefone ?? ""}
                          onChange={(e) => setNovoInscritoManual((s) => ({ ...s, [c.id]: { ...s[c.id], telefone: e.target.value } }))}
                          placeholder="Telefone" className="font-body text-[11px] border rounded-lg px-2 py-1.5 outline-none w-32" style={{ borderColor: C.line }} />
                        <button onClick={() => adicionarInscritoManual(c.id)} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white" style={{ background: C.blue }}>
                          Adicionar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(cursosAdmin ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum curso cadastrado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "vagas" && (
          <div>
            <SectionHeader eyebrow="Empregabilidade" title="Cadastrar vaga" sub="Escolha a empresa e publique — aparece direto no site" />
            <form onSubmit={publicarVaga} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <select value={novaVaga.empresa_id} onChange={(e) => setNovaVaga((v) => ({ ...v, empresa_id: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }}>
                <option value="">Selecione a empresa</option>
                {listaEmpresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
              </select>
              <input value={novaVaga.cargo} onChange={(e) => setNovaVaga((v) => ({ ...v, cargo: e.target.value }))} placeholder="Cargo" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novaVaga.salario} onChange={(e) => setNovaVaga((v) => ({ ...v, salario: e.target.value }))} placeholder="Salário" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaVaga.cidade} onChange={(e) => setNovaVaga((v) => ({ ...v, cidade: e.target.value }))} placeholder="Cidade" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <select value={novaVaga.tipo} onChange={(e) => setNovaVaga((v) => ({ ...v, tipo: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="Estágio">Estágio</option>
                <option value="Temporário">Temporário</option>
                <option value="Freelance">Freelance</option>
              </select>
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Prazo para se candidatar (opcional)
                <input type="date" value={novaVaga.prazo} onChange={(e) => setNovaVaga((v) => ({ ...v, prazo: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <textarea value={novaVaga.requisitos} onChange={(e) => setNovaVaga((v) => ({ ...v, requisitos: e.target.value }))} placeholder="Requisitos" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <textarea value={novaVaga.beneficios} onChange={(e) => setNovaVaga((v) => ({ ...v, beneficios: e.target.value }))} placeholder="Benefícios (ex: vale-transporte, vale-refeição)" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              {statusVaga && statusVaga !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusVaga}</p>}
              {statusVaga === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Vaga publicada!</p>}
              <button type="submit" disabled={publicandoVaga} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoVaga ? "Publicando..." : "Publicar vaga"}
              </button>
            </form>
            <div className="flex flex-col gap-3">
              {(vagasAdmin ?? vagas.map((v, i) => ({ id: `demo-${i}`, cargo: v.cargo, salario: v.salario, empresas: { nome: v.empresa } }))).map((v) => (
                <div key={v.id} className="rounded-2xl border p-4 flex items-center gap-4" style={{ borderColor: C.line }}>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{v.cargo}</p>
                    <p className="font-body text-xs" style={{ color: "#5C7186" }}>
                      {v.empresas?.nome} · {v.salario}{v.tipo ? ` · ${v.tipo}` : ""}{v.prazo ? ` · até ${v.prazo}` : ""}
                    </p>
                  </div>
                  <button onClick={() => { if (confirmarExclusao()) { removerVaga(v.id); notificar("Vaga removida."); } }} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Remover</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "banners" && (
          <div>
            <SectionHeader eyebrow="Vitrine" title="Gerenciar banners da home" sub="Envie a imagem, defina o link e a ordem — grava direto no banco" />
            <div className="grid sm:grid-cols-2 gap-4">
              {listaBanners.map((b) => (
                <div key={b.id} className="rounded-2xl border p-4 flex flex-col gap-2" style={{ borderColor: C.line }}>
                  <div className="h-28 rounded-xl flex items-center justify-center mb-1 overflow-hidden" style={{ background: C.blueTint }}>
                    {b.imagem_url ? (
                      <img loading="lazy" decoding="async" src={b.imagem_url} alt={b.titulo || "Banner"} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={22} color={C.blue} />
                    )}
                  </div>
                  <input
                    value={b.titulo || ""}
                    onChange={(e) => atualizarBanner(b.id, "titulo", e.target.value)}
                    placeholder="Título do banner"
                    className="font-body text-sm border rounded-lg px-3 py-2 outline-none"
                    style={{ borderColor: C.line }}
                  />
                  <textarea
                    value={b.descricao || ""}
                    onChange={(e) => atualizarBanner(b.id, "descricao", e.target.value)}
                    placeholder="Descrição (opcional)"
                    rows={2}
                    className="font-body text-sm border rounded-lg px-3 py-2 outline-none"
                    style={{ borderColor: C.line }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={b.botao_texto || ""}
                      onChange={(e) => atualizarBanner(b.id, "botao_texto", e.target.value)}
                      placeholder="Texto do botão (opcional)"
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none"
                      style={{ borderColor: C.line }}
                    />
                    <input
                      value={b.link_url || ""}
                      onChange={(e) => atualizarBanner(b.id, "link_url", e.target.value)}
                      placeholder="Link ao clicar"
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                  <label className="font-body text-[11px] font-semibold" style={{ color: "#425A70" }}>
                    Onde aparece
                    <select value={b.posicao || "geral"} onChange={(e) => atualizarBanner(b.id, "posicao", e.target.value)}
                      className="mt-1 w-full font-body text-xs border rounded-lg px-2 py-1.5 outline-none" style={{ borderColor: C.line }}>
                      <option value="geral">Banner principal da home (padrão)</option>
                      <option value="topo">Topo do site (acima de tudo)</option>
                      <option value="apos_destaques">Após o comerciante em destaque</option>
                      <option value="entre_categorias">Entre as categorias</option>
                      <option value="entre_empresas">Entre as empresas</option>
                      <option value="lateral">Lateral (perto da busca)</option>
                      <option value="rodape">Rodapé (antes do fim da página)</option>
                      <option value="paginas_internas">Páginas internas (Turismo, Mural, etc.)</option>
                    </select>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={b.ordem ?? 0}
                      onChange={(e) => atualizarBanner(b.id, "ordem", Number(e.target.value))}
                      placeholder="Ordem"
                      className="font-body text-sm border rounded-lg px-3 py-2 outline-none w-24"
                      style={{ borderColor: C.line }}
                    />
                    <label className="flex items-center gap-2 font-body text-xs" style={{ color: C.ink }}>
                      <input type="checkbox" checked={b.ativo !== false} onChange={(e) => atualizarBanner(b.id, "ativo", e.target.checked)} />
                      Ativo
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="font-body text-[11px] font-semibold" style={{ color: "#425A70" }}>
                      Válido de
                      <input type="date" value={b.data_inicio || ""} onChange={(e) => atualizarBanner(b.id, "data_inicio", e.target.value)}
                        className="mt-1 w-full font-body text-xs border rounded-lg px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
                    </label>
                    <label className="font-body text-[11px] font-semibold" style={{ color: "#425A70" }}>
                      Até
                      <input type="date" value={b.data_fim || ""} onChange={(e) => atualizarBanner(b.id, "data_fim", e.target.value)}
                        className="mt-1 w-full font-body text-xs border rounded-lg px-2 py-1.5 outline-none" style={{ borderColor: C.line }} />
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <label className="font-body text-xs font-bold cursor-pointer" style={{ color: C.blue }}>
                      {enviandoBanner === b.id ? "Enviando..." : "Imagem desktop"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => enviarImagemBanner(b.id, e)} />
                    </label>
                    <label className="font-body text-xs font-bold cursor-pointer" style={{ color: C.blue }}>
                      {b.imagem_mobile_url ? "Trocar imagem mobile" : "Imagem mobile (opcional)"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => enviarImagemBannerMobile(b.id, e)} />
                    </label>
                  </div>
                  {statusBanner[b.id] && statusBanner[b.id] !== "ok" && (
                    <p className="font-body text-xs" style={{ color: "#D64545" }}>{statusBanner[b.id]}</p>
                  )}
                  {statusBanner[b.id] === "ok" && (
                    <p className="font-body text-xs" style={{ color: "#3AA76D" }}>Salvo!</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => salvarBanner(b)} className="font-body text-xs font-bold text-white rounded-lg px-3 py-1.5" style={{ background: C.blue }}>
                      Salvar
                    </button>
                    <button onClick={() => { if (confirmarExclusao()) { removerBanner(b.id); notificar("Banner removido."); } }} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: C.line, color: C.ink }}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setBannersAdmin((atual) => [...(atual ?? listaBanners), { id: `novo-${Date.now()}`, titulo: "", descricao: "", botao_texto: "", imagem_url: null, imagem_mobile_url: null, link_url: "", posicao: "geral", ordem: (atual ?? listaBanners).length + 1, ativo: true, data_inicio: "", data_fim: "" }])}
                className="rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 min-h-[180px]"
                style={{ borderColor: C.line, color: C.blue }}
              >
                <ImageIcon size={22} />
                <span className="font-body text-xs font-bold">Adicionar novo banner</span>
              </button>
            </div>
          </div>
        )}

        {tab === "notificacoes" && (
          <div>
            <SectionHeader eyebrow="Engajamento" title="Enviar notificação push" sub="Fica salva no histórico — foto e link são opcionais" />
            <form onSubmit={enviarNotificacao} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <input value={novaNotificacao.titulo} onChange={(e) => setNovaNotificacao((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título da notificação" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novaNotificacao.mensagem} onChange={(e) => setNovaNotificacao((v) => ({ ...v, mensagem: e.target.value }))} placeholder="Mensagem" rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaNotificacao.link_url} onChange={(e) => setNovaNotificacao((v) => ({ ...v, link_url: e.target.value }))} placeholder="Link (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-bold cursor-pointer flex items-center gap-2" style={{ color: C.blue }}>
                <Camera size={14} /> {enviandoFotoNotificacao ? "Enviando..." : novaNotificacao.imagem_url ? "Foto anexada — trocar" : "Anexar foto (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={enviarFotoNotificacao} />
              </label>
              {statusNotificacao && statusNotificacao !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusNotificacao}</p>}
              {statusNotificacao === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Enviada!</p>}
              <button type="submit" disabled={enviandoNotificacao} className="font-body text-sm font-bold text-white rounded-lg py-2.5 flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: C.blue }}>
                <Send size={14} /> {enviandoNotificacao ? "Enviando..." : "Enviar para todos os usuários"}
              </button>
            </form>
            <div className="flex flex-col gap-2 max-w-lg">
              {(notificacoesAdmin ?? []).map((n) => (
                <div key={n.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: C.line }}>
                  {n.imagem_url && <img loading="lazy" decoding="async" src={n.imagem_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-xs truncate" style={{ color: C.ink }}>{n.titulo}</p>
                    <p className="font-body text-[11px] truncate" style={{ color: "#5C7186" }}>{n.mensagem}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "identidade" && (
          <div>
            <SectionHeader eyebrow="Marca" title="Identidade do site" sub="Cor principal, logo e frase de destaque da home — aplicado em todo o site" />
            <form onSubmit={salvarIdentidade} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg" style={{ borderColor: C.line }}>
              <label className="font-body text-xs font-bold" style={{ color: C.ink }}>Cor principal</label>
              <div className="flex items-center gap-3">
                <input type="color" value={siteConfigAdmin?.cor_principal || "#0A5AA8"} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, cor_principal: e.target.value }))} className="h-10 w-16 rounded-lg border cursor-pointer" style={{ borderColor: C.line }} />
                <input value={siteConfigAdmin?.cor_principal || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, cor_principal: e.target.value }))} placeholder="#0A5AA8" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none flex-1" style={{ borderColor: C.line }} />
              </div>

              <label className="font-body text-xs font-bold mt-2" style={{ color: C.ink }}>Logo</label>
              <div className="flex items-center gap-3">
                {siteConfigAdmin?.logo_url ? (
                  <img loading="lazy" decoding="async" src={siteConfigAdmin.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover border" style={{ borderColor: C.line }} />
                ) : (
                  <LogoMark size={48} />
                )}
                <label className="font-body text-xs font-bold cursor-pointer" style={{ color: C.blue }}>
                  {enviandoLogoSite ? "Enviando..." : "Substituir logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={enviarLogoSite} />
                </label>
              </div>

              <label className="font-body text-xs font-bold mt-2" style={{ color: C.ink }}>Frase de destaque (aparece na home)</label>
              <textarea value={siteConfigAdmin?.frase || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, frase: e.target.value }))} placeholder="Empresas, produtos, vagas e cursos da sua cidade..." rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />

              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer mt-2" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={!!siteConfigAdmin?.estatisticas_ativo} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, estatisticas_ativo: e.target.checked }))} />
                Mostrar a aba Números no menu do site
              </label>
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={!!siteConfigAdmin?.agendamento_ativo} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, agendamento_ativo: e.target.checked }))} />
                Permitir agendamento de horário com prestadores de serviço
              </label>

              <label className="font-body text-xs font-bold mt-2" style={{ color: C.ink }}>Contato / Sala do Empreendedor (aparece no rodapé do site)</label>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={siteConfigAdmin?.telefone || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, telefone: e.target.value }))} placeholder="Telefone fixo" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={siteConfigAdmin?.whatsapp_contato || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, whatsapp_contato: e.target.value }))} placeholder="WhatsApp" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={siteConfigAdmin?.instagram_contato || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, instagram_contato: e.target.value }))} placeholder="Instagram (@usuario)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={siteConfigAdmin?.endereco_sala_empreendedor || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, endereco_sala_empreendedor: e.target.value }))} placeholder="Endereço da Sala do Empreendedor" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={siteConfigAdmin?.sala_horario || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, sala_horario: e.target.value }))} placeholder="Horário de atendimento (ex: Seg a sex, 8h às 17h)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={siteConfigAdmin?.sala_servicos || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, sala_servicos: e.target.value }))} placeholder="Serviços oferecidos, separados por vírgula" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>

              <label className="font-body text-xs font-bold mt-2" style={{ color: C.ink }}>Termos de uso (aparece na página #/termos)</label>
              <textarea value={siteConfigAdmin?.termos_uso || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, termos_uso: e.target.value }))} placeholder="Cole aqui o texto dos termos de uso" rows={6} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />

              <label className="font-body text-xs font-bold mt-2" style={{ color: C.ink }}>Política de privacidade (aparece na página #/privacidade)</label>
              <textarea value={siteConfigAdmin?.politica_privacidade || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, politica_privacidade: e.target.value }))} placeholder="Cole aqui o texto da política de privacidade" rows={6} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <p className="font-body text-[11px]" style={{ color: "#8896A6" }}>Já deixamos um texto padrão pronto no banco de dados — edite aqui à vontade pra ajustar à sua realidade. Isso não substitui a orientação de um advogado, mas já cobre o básico da LGPD.</p>

              {statusIdentidade && statusIdentidade !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusIdentidade}</p>}
              {statusIdentidade === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Salvo! Recarregue o site para ver tudo aplicado.</p>}
              <button type="submit" disabled={salvandoIdentidade || !siteConfigAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoIdentidade ? "Salvando..." : "Salvar identidade"}
              </button>
            </form>

            <SectionHeader eyebrow="Crédito" title="Fomento Paraná" sub="Botão de linhas de crédito, com foto, link e WhatsApp do agente de crédito" />
            <form onSubmit={salvarIdentidade} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg" style={{ borderColor: C.line }}>
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={!!siteConfigAdmin?.fomento_ativo} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, fomento_ativo: e.target.checked }))} />
                Mostrar o botão Fomento Paraná no site
              </label>

              <label className="font-body text-xs font-bold mt-1" style={{ color: C.ink }}>Foto</label>
              <div className="flex items-center gap-3">
                {siteConfigAdmin?.fomento_foto_url ? (
                  <img loading="lazy" decoding="async" src={siteConfigAdmin.fomento_foto_url} alt="" className="w-16 h-16 rounded-xl object-cover border" style={{ borderColor: C.line }} />
                ) : (
                  <span className="w-16 h-16 rounded-xl flex items-center justify-center border" style={{ borderColor: C.line, background: C.blueTint }}>
                    <Landmark size={22} color={C.blue} />
                  </span>
                )}
                <label className="font-body text-xs font-bold cursor-pointer" style={{ color: C.blue }}>
                  Enviar foto
                  <input type="file" accept="image/*" className="hidden" onChange={enviarFotoFomento} />
                </label>
              </div>

              <label className="font-body text-xs font-bold mt-1" style={{ color: C.ink }}>Texto de apresentação</label>
              <textarea value={siteConfigAdmin?.fomento_texto || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, fomento_texto: e.target.value }))}
                placeholder="Ex: Precisa de crédito para sua empresa? Conheça as linhas de crédito da Fomento Paraná com as melhores taxas do mercado."
                rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />

              <label className="font-body text-xs font-bold mt-1" style={{ color: C.ink }}>Link das linhas de crédito / simulação</label>
              <input value={siteConfigAdmin?.fomento_link || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, fomento_link: e.target.value }))}
                placeholder="https://www.fomento.pr.gov.br/Linhas-de-Credito" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  WhatsApp do agente de crédito
                  <input value={siteConfigAdmin?.fomento_whatsapp || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, fomento_whatsapp: e.target.value }))}
                    placeholder="(44) 90000-0000" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Nome do agente de crédito
                  <input value={siteConfigAdmin?.fomento_agente_nome || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, fomento_agente_nome: e.target.value }))}
                    placeholder="Gabriel Oliveira" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>

              <button type="submit" disabled={salvandoIdentidade || !siteConfigAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoIdentidade ? "Salvando..." : "Salvar Fomento Paraná"}
              </button>
            </form>

            <p className="font-body text-xs mt-6 max-w-lg" style={{ color: "#8896A6" }}>
              A lista de pedidos de crédito (com valor, orientação, proposta e status) agora fica na aba <b>"Sala do Empreendedor - Atendimentos"</b>.
            </p>

            <SectionHeader eyebrow="Emprego" title="Agência do Trabalhador" sub="Card no site, no mesmo estilo do Fomento Paraná, com endereço e WhatsApp" />
            <form onSubmit={salvarIdentidade} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg" style={{ borderColor: C.line }}>
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={!!siteConfigAdmin?.agencia_ativo} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, agencia_ativo: e.target.checked }))} />
                Mostrar o card da Agência do Trabalhador no site
              </label>
              <label className="font-body text-xs font-bold mt-1" style={{ color: C.ink }}>Texto de apresentação</label>
              <textarea value={siteConfigAdmin?.agencia_texto || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, agencia_texto: e.target.value }))}
                placeholder="Ex: Procurando emprego ou precisa contratar? A Agência do Trabalhador de Ivatuba conecta candidatos e empresas locais."
                rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Endereço
                  <input value={siteConfigAdmin?.agencia_endereco || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, agencia_endereco: e.target.value }))}
                    className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Horário de atendimento
                  <input value={siteConfigAdmin?.agencia_horario || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, agencia_horario: e.target.value }))}
                    placeholder="Seg a sex, 8h às 17h" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                WhatsApp
                <input value={siteConfigAdmin?.agencia_whatsapp || ""} onChange={(e) => setSiteConfigAdmin((v) => ({ ...v, agencia_whatsapp: e.target.value }))}
                  placeholder="(44) 90000-0000" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <button type="submit" disabled={salvandoIdentidade || !siteConfigAdmin} className="font-body text-sm font-bold text-white rounded-lg py-2.5 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoIdentidade ? "Salvando..." : "Salvar Agência do Trabalhador"}
              </button>
            </form>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel do empresário
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Modal "Novo produto" com IA — gera descrição de vendas a partir de poucas
// palavras, e dá dicas sobre a FOTO REAL do produto (nunca gera foto falsa).
// ---------------------------------------------------------------------------
function ModalNovoProduto({ onFechar, onSalvo }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [estoque, setEstoque] = useState("");
  const [palavrasChave, setPalavrasChave] = useState("");
  const [descricao, setDescricao] = useState("");
  const [gerandoDescricao, setGerandoDescricao] = useState(false);
  const [erroDescricao, setErroDescricao] = useState("");

  const [foto, setFoto] = useState(null); // { previewUrl, base64, mediaType }
  const [dicasFoto, setDicasFoto] = useState("");
  const [analisandoFoto, setAnalisandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState("");

  const [imagemIA, setImagemIA] = useState(null); // base64 da imagem ilustrativa
  const [gerandoImagemIA, setGerandoImagemIA] = useState(false);
  const [erroImagemIA, setErroImagemIA] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const gerarImagemIlustrativa = async () => {
    if (!nome.trim()) { setErroImagemIA("Preencha ao menos o nome do produto primeiro."); return; }
    setErroImagemIA("");
    setGerandoImagemIA(true);
    try {
      const resp = await fetch("/api/gerar-imagem-ilustrativa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, categoria, descricao }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não consegui gerar a imagem agora.");
      setImagemIA(dados.imagemBase64);
    } catch (err) {
      setErroImagemIA(err.message || "Não consegui gerar a imagem agora. Tente de novo.");
    } finally {
      setGerandoImagemIA(false);
    }
  };

  const gerarDescricao = async () => {
    if (!nome.trim()) { setErroDescricao("Preencha ao menos o nome do produto primeiro."); return; }
    setErroDescricao("");
    setGerandoDescricao(true);
    try {
      const resp = await fetch("/api/gerar-descricao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, categoria, palavrasChave }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não consegui gerar agora.");
      setDescricao(dados.descricao);
    } catch (err) {
      setErroDescricao(err.message || "Não consegui gerar agora. Tente de novo.");
    } finally {
      setGerandoDescricao(false);
    }
  };

  const escolherFoto = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const previewUrl = URL.createObjectURL(arquivo);
    const leitor = new FileReader();
    leitor.onload = () => {
      const base64 = leitor.result.split(",")[1];
      setFoto({ previewUrl, base64, mediaType: arquivo.type, arquivo });
      setDicasFoto("");
    };
    leitor.readAsDataURL(arquivo);
  };

  const analisarFoto = async () => {
    if (!foto) return;
    setErroFoto("");
    setAnalisandoFoto(true);
    try {
      const resp = await fetch("/api/analisar-foto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imagemBase64: foto.base64, mediaType: foto.mediaType }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não consegui analisar agora.");
      setDicasFoto(dados.dicas);
    } catch (err) {
      setErroFoto(err.message || "Não consegui analisar agora. Tente de novo.");
    } finally {
      setAnalisandoFoto(false);
    }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErroSalvar("");

    if (!supabaseConfigurado) { setSalvo(true); return; }

    setSalvando(true);
    try {
      let fotoUrl = null;
      let usandoImagemIlustrativa = false;

      if (foto?.arquivo) {
        const caminho = `produtos/${Date.now()}-${foto.arquivo.name}`;
        const { error: erroUpload } = await supabase.storage.from("fotos-produtos").upload(caminho, foto.arquivo);
        if (erroUpload) throw erroUpload;
        const { data: pub } = supabase.storage.from("fotos-produtos").getPublicUrl(caminho);
        fotoUrl = pub.publicUrl;
      } else if (imagemIA) {
        // Só usa a imagem ilustrativa se não houver foto real — e marca isso
        // no banco, para o site sempre mostrar o selo "gerada por IA".
        const bytes = atob(imagemIA);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: "image/png" });
        const caminho = `produtos/${Date.now()}-ilustrativa.png`;
        const { error: erroUpload } = await supabase.storage.from("fotos-produtos").upload(caminho, blob);
        if (erroUpload) throw erroUpload;
        const { data: pub } = supabase.storage.from("fotos-produtos").getPublicUrl(caminho);
        fotoUrl = pub.publicUrl;
        usandoImagemIlustrativa = true;
      }

      const { data: sessao } = await supabase.auth.getSession();
      const { data: empresa } = await supabase.from("empresas").select("id").eq("dono_id", sessao.session.user.id).single();

      const { error } = await supabase.from("produtos").insert({
        empresa_id: empresa?.id,
        nome, categoria, preco: preco ? Number(preco) : null,
        preco_promocional: precoPromocional ? Number(precoPromocional) : null,
        estoque: estoque !== "" ? Number(estoque) : null,
        descricao, foto_url: fotoUrl, imagem_ilustrativa: usandoImagemIlustrativa, ativo: true,
      });
      if (error) throw error;
      setSalvo(true);
      onSalvo?.();
    } catch (err) {
      setErroSalvar(err.message || "Não foi possível salvar agora. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-5 pb-3 border-b z-10" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
              <ShoppingBag size={17} />
            </span>
            <p className="font-display font-bold text-base" style={{ color: C.ink }}>Novo produto</p>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint2 }} aria-label="Fechar">
            <X size={16} color="#425A70" />
          </button>
        </div>

        <div className="p-5">
          {!supabaseConfigurado && (
            <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
              <BadgeCheck size={14} className="mt-0.5 shrink-0" />
              Modo demonstração: a descrição e a análise de foto por IA só funcionam com a ANTHROPIC_API_KEY configurada no servidor.
            </div>
          )}
          {erroSalvar && <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs" style={{ background: "#FBEAE5", color: "#B4462F" }}>{erroSalvar}</div>}

          {salvo ? (
            <div className="py-8 text-center">
              <span className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.blueTint }}>
                <CheckCircle2 size={26} color={C.blue} />
              </span>
              <p className="font-display font-bold text-lg" style={{ color: C.ink }}>Produto salvo!</p>
              <p className="font-body text-sm mt-1" style={{ color: "#5C7186" }}>Ele já aparece na sua lista de produtos.</p>
              <button onClick={onFechar} className="glow-btn font-body text-sm font-bold text-white rounded-xl py-2.5 px-5 mt-5" style={{ background: C.blue }}>Fechar</button>
            </div>
          ) : (
            <form onSubmit={salvar} className="flex flex-col gap-3.5">
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Nome do produto
                <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: Cesta de pães artesanais"
                  className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Categoria
                  <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Alimentação"
                    className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Preço (R$)
                  <input value={preco} onChange={(e) => setPreco(e.target.value)} type="number" step="0.01" placeholder="24,90"
                    className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Preço promocional (opcional)
                  <input value={precoPromocional} onChange={(e) => setPrecoPromocional(e.target.value)} type="number" step="0.01" placeholder="19,90"
                    className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Estoque disponível (opcional)
                  <input value={estoque} onChange={(e) => setEstoque(e.target.value)} type="number" min="0" placeholder="Ex: 10"
                    className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>

              {/* Descrição com IA */}
              <div className="rounded-2xl border p-3.5" style={{ borderColor: C.line, background: C.blueTint2 }}>
                <p className="font-body text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#425A70" }}>
                  <Sparkles size={13} color={C.blue} /> Descrição de impacto (com IA)
                </p>
                <input value={palavrasChave} onChange={(e) => setPalavrasChave(e.target.value)} placeholder="Palavras-chave: ex. fresquinho, feito na hora, sem conservantes"
                  className="w-full font-body text-xs border rounded-lg px-3 py-2 outline-none mb-2" style={{ borderColor: C.line }} />
                <button type="button" onClick={gerarDescricao} disabled={gerandoDescricao}
                  className="glow-btn font-body text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: C.blue, color: "#fff" }}>
                  <Sparkles size={12} /> {gerandoDescricao ? "Gerando..." : "Gerar descrição"}
                </button>
                {erroDescricao && <p className="font-body text-[11px] mt-2" style={{ color: "#B4462F" }}>{erroDescricao}</p>}
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="A descrição gerada aparece aqui — você pode editar antes de salvar"
                  className="w-full font-body text-xs border rounded-lg px-3 py-2.5 outline-none mt-2.5" style={{ borderColor: C.line, background: "#fff" }} />
              </div>

              {/* Foto real do produto + análise por IA */}
              <div className="rounded-2xl border p-3.5" style={{ borderColor: C.line, background: C.blueTint2 }}>
                <p className="font-body text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#425A70" }}>
                  <Camera size={13} color={C.blue} /> Foto real do produto
                </p>
                {foto ? (
                  <div className="flex gap-3 items-start">
                    <img loading="lazy" decoding="async" src={foto.previewUrl} alt="Prévia do produto" className="w-20 h-20 rounded-lg object-cover border" style={{ borderColor: C.line }} />
                    <div className="flex-1">
                      <button type="button" onClick={analisarFoto} disabled={analisandoFoto}
                        className="glow-btn font-body text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 disabled:opacity-60"
                        style={{ background: C.blue, color: "#fff" }}>
                        <Sparkles size={12} /> {analisandoFoto ? "Analisando..." : "Dicas para essa foto"}
                      </button>
                      {erroFoto && <p className="font-body text-[11px] mt-2" style={{ color: "#B4462F" }}>{erroFoto}</p>}
                      {dicasFoto && <p className="font-body text-[11px] mt-2 leading-relaxed" style={{ color: "#425A70" }}>{dicasFoto}</p>}
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 justify-center rounded-lg border-2 border-dashed py-5 cursor-pointer" style={{ borderColor: C.line }}>
                    <Upload size={16} color="#B7C6D6" />
                    <span className="font-body text-xs" style={{ color: "#5C7186" }}>Enviar foto real do produto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={escolherFoto} />
                  </label>
                )}
                <p className="font-body text-[10px] mt-2" style={{ color: "#B7C6D6" }}>
                  A IA só dá dicas sobre a sua foto de verdade — ela nunca substitui a foto real sem você pedir.
                </p>
              </div>

              {/* Imagem ilustrativa opcional, só quando ainda não há foto real */}
              {!foto && (
                <div className="rounded-2xl border p-3.5" style={{ borderColor: C.line, background: "#FFF6E9" }}>
                  <p className="font-body text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "#8A5A12" }}>
                    <Sparkles size={13} /> Ainda não tem foto? Gere uma imagem ilustrativa (opcional)
                  </p>
                  <p className="font-body text-[10px] mb-2" style={{ color: "#8A5A12", opacity: 0.85 }}>
                    Ela sempre aparece marcada como "gerada por IA" — assim que você tiver a foto de verdade, troque por ela.
                  </p>

                  {imagemIA ? (
                    <div className="flex gap-3 items-start">
                      <div className="relative w-20 h-20 shrink-0">
                        <img loading="lazy" decoding="async" src={`data:image/png;base64,${imagemIA}`} alt="Imagem ilustrativa gerada por IA" className="w-20 h-20 rounded-lg object-cover border" style={{ borderColor: C.line }} />
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-body text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.amberDark, color: "#fff" }}>
                          IA
                        </span>
                      </div>
                      <div className="flex-1">
                        <button type="button" onClick={gerarImagemIlustrativa} disabled={gerandoImagemIA}
                          className="font-body text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 disabled:opacity-60 border"
                          style={{ borderColor: C.amberDark, color: C.amberDark }}>
                          <Sparkles size={12} /> {gerandoImagemIA ? "Gerando..." : "Gerar outra"}
                        </button>
                        <button type="button" onClick={() => setImagemIA(null)}
                          className="font-body text-xs font-semibold ml-2" style={{ color: "#B4462F" }}>
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={gerarImagemIlustrativa} disabled={gerandoImagemIA}
                      className="glow-btn font-body text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 disabled:opacity-60"
                      style={{ background: C.amberDark, color: "#fff" }}>
                      <Sparkles size={12} /> {gerandoImagemIA ? "Gerando imagem..." : "Gerar imagem ilustrativa"}
                    </button>
                  )}
                  {erroImagemIA && <p className="font-body text-[11px] mt-2" style={{ color: "#B4462F" }}>{erroImagemIA}</p>}
                </div>
              )}

              <button type="submit" disabled={salvando} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-3 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {salvando ? "Salvando..." : "Salvar produto"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PainelAvisosEmpresario({ siteConfig }) {
  const [cursosProximos, setCursosProximos] = useState(null);
  const [noticiasRecentes, setNoticiasRecentes] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) { setCursosProximos([]); setNoticiasRecentes([]); return; }
    Promise.all([
      supabase.from("cursos").select("*").order("data_inicio").limit(20),
      supabase.from("eventos_calendario").select("*").eq("tipo", "curso").order("data_inicio").limit(20),
    ]).then(([{ data: cursosData, error: erroCursos }, { data: eventosData, error: erroEventos }]) => {
      const listaCursos = !erroCursos && cursosData ? cursosData : [];
      const listaEventosCurso = !erroEventos && eventosData
        ? eventosData.map((ev) => ({
            id: `evento-${ev.id}`,
            titulo: ev.titulo,
            instituicao: ev.local || "",
            descricao: ev.descricao || "",
            data_inicio: ev.data_inicio,
            link_inscricao: ev.link_inscricao || "",
            banner_url: ev.banner_url || "",
            certificado: false,
            relato: ev.relato || "",
            relato_fotos: ev.relato_fotos || [],
            _origemCalendario: true,
          }))
        : [];
      const combinados = [...listaCursos, ...listaEventosCurso].sort((a, b) => (a.data_inicio || "").localeCompare(b.data_inicio || ""));
      setCursosProximos(combinados);
    });

    supabase.from("noticias").select("*").order("publicada_em", { ascending: false }).limit(5).then(({ data, error }) => {
      setNoticiasRecentes(error ? [] : data || []);
    });
  }, []);

  const linkWhatsFomento = siteConfig?.fomento_whatsapp
    ? `https://wa.me/55${String(siteConfig.fomento_whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Quero solicitar informações sobre as linhas de crédito da Fomento Paraná com o agente de crédito ${siteConfig?.fomento_agente_nome || "Gabriel Oliveira"}.`)}`
    : null;

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader eyebrow="Fique por dentro" title="Novidades para você" sub="Serviços, crédito, cursos, notícias e eventos que podem ajudar seu negócio" />

      <div>
        <h3 className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Serviços do Empreendedor (MEI)</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {servicosEmpreendedor.map((s, i) => {
            const Icon = s.icon;
            return (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="glow-card flex items-center gap-3 rounded-xl border p-3.5 bg-white" style={{ borderColor: C.line }}>
                <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.cor_hex}1A` }}>
                  <Icon size={18} color={s.cor_hex} />
                </span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs" style={{ color: C.ink }}>{s.titulo}</p>
                  <p className="font-body text-[11px] mt-0.5" style={{ color: "#5C7186" }}>{s.descricao}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {siteConfig?.fomento_ativo && (
        <div>
          <h3 className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Fomento Paraná — linhas de crédito</h3>
          <div className="rounded-2xl border p-4 flex flex-col sm:flex-row gap-3 sm:items-center" style={{ borderColor: C.line, background: C.blueTint2 }}>
            <p className="font-body text-xs flex-1" style={{ color: "#425A70" }}>
              {siteConfig?.fomento_texto || "Precisa de crédito para sua empresa? Conheça as linhas de crédito da Fomento Paraná."}
            </p>
            {linkWhatsFomento && (
              <a href={linkWhatsFomento} target="_blank" rel="noopener noreferrer" className="glow-btn shrink-0 inline-flex items-center justify-center gap-1.5 font-body text-xs font-bold rounded-lg px-4 py-2.5 text-white" style={{ background: C.blue }}>
                <MessageCircle size={13} /> Falar com o agente
              </a>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Cursos</h3>
        {cursosProximos === null && (
          <div className="grid sm:grid-cols-2 gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        )}
        {cursosProximos && cursosProximos.length === 0 && (
          <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum curso cadastrado no momento.</p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {(cursosProximos || []).slice(0, 4).map((c) => <CursoCard key={c.id} c={c} />)}
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Notícias</h3>
        {noticiasRecentes === null && (
          <div className="flex flex-col gap-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        )}
        {noticiasRecentes && noticiasRecentes.length === 0 && (
          <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhuma notícia publicada ainda.</p>
        )}
        <div className="flex flex-col gap-2">
          {(noticiasRecentes || []).map((n) => (
            <div key={n.id} className="rounded-xl border p-3.5 flex gap-3" style={{ borderColor: C.line }}>
              {n.foto_url && <img loading="lazy" decoding="async" src={n.foto_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />}
              <div className="min-w-0">
                <p className="font-display font-bold text-xs" style={{ color: C.ink }}>{n.titulo}</p>
                <p className="font-body text-[11px] mt-0.5 line-clamp-2" style={{ color: "#5C7186" }}>{n.resumo || n.conteudo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Calendário de eventos</h3>
        <CalendarioEventos />
      </div>
    </div>
  );
}

function EmpresarioPanel({ siteConfig }) {
  const [tab, setTab] = useState("avisos");
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);

  // Dados reais da empresa do empresário logado — WhatsApp e Instagram
  // já existem no banco (tabela `empresas`), só faltava esta tela ler e
  // gravar de verdade em vez de mostrar valores fixos.
  const [empresaId, setEmpresaId] = useState(null);
  const [empresaNaoEncontrada, setEmpresaNaoEncontrada] = useState(false);
  const [usuarioIdAtual, setUsuarioIdAtual] = useState(null);
  const [formCriarEmpresa, setFormCriarEmpresa] = useState({ nome: "", whatsapp: "", categoria: "" });
  const [criandoEmpresaAgora, setCriandoEmpresaAgora] = useState(false);
  const [statusCriarEmpresaAgora, setStatusCriarEmpresaAgora] = useState("");

  const criarMinhaEmpresaAgora = async (e) => {
    e.preventDefault();
    setStatusCriarEmpresaAgora("");
    if (!formCriarEmpresa.nome.trim()) { setStatusCriarEmpresaAgora("Informe o nome da empresa."); return; }
    if (!usuarioIdAtual) { setStatusCriarEmpresaAgora("Sessão expirada — saia e entre de novo."); return; }
    setCriandoEmpresaAgora(true);
    try {
      const { data, error } = await supabase.from("empresas").insert({
        dono_id: usuarioIdAtual,
        nome: formCriarEmpresa.nome,
        whatsapp: formCriarEmpresa.whatsapp || null,
        categoria: formCriarEmpresa.categoria || "A definir",
        status: "aprovada",
      }).select().single();
      if (error) throw error;
      setEmpresaId(data.id);
      setEmpresaNaoEncontrada(false);
      setPerfilForm((f) => ({ ...f, nome: data.nome || "", whatsapp: data.whatsapp || "" }));
      setStatusCriarEmpresaAgora("ok");
    } catch (err) {
      setStatusCriarEmpresaAgora(err.message || "Não foi possível cadastrar a empresa.");
    } finally {
      setCriandoEmpresaAgora(false);
    }
  };
  const [perfilForm, setPerfilForm] = useState({
    nome: "", whatsapp: "", instagram: "", endereco: "", horario_atendimento: "", horario_funcionamento: null, chave_pix: "",
    logo_url: "", banner_url: "", fotos_urls: [], email: "", facebook: "", site: "",
    cpf: "", cnpj: "", possui_mei: false, aceita_cartao_servidor: false, destaque: false,
  });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [statusPerfil, setStatusPerfil] = useState("");
  const [enviandoLogoPerfil, setEnviandoLogoPerfil] = useState(false);
  const [enviandoBannerPerfil, setEnviandoBannerPerfil] = useState(false);
  const [enviandoFotoGaleriaPerfil, setEnviandoFotoGaleriaPerfil] = useState(false);

  // Produtos reais desta empresa — substitui a lista de exemplo assim que
  // soubermos o id da empresa (buscado no efeito abaixo).
  const [meusProdutosReais, setMeusProdutosReais] = useState(null);

  const carregarMeusProdutos = (idEmpresa) => {
    if (!supabaseConfigurado || !idEmpresa) return;
    supabase.from("produtos").select("*").eq("empresa_id", idEmpresa).order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setMeusProdutosReais(data || []);
    });
  };

  // Promoção real vinculada a um dos meus produtos.
  const [novaPromocaoEmpresario, setNovaPromocaoEmpresario] = useState({ produto_id: "", desconto_percentual: "", valida_ate: "" });
  const [publicandoPromocaoEmpresario, setPublicandoPromocaoEmpresario] = useState(false);
  const [statusPromocaoEmpresario, setStatusPromocaoEmpresario] = useState("");

  const publicarPromocaoEmpresario = async (e) => {
    e.preventDefault();
    setStatusPromocaoEmpresario("");
    if (!novaPromocaoEmpresario.produto_id || !novaPromocaoEmpresario.desconto_percentual || !novaPromocaoEmpresario.valida_ate) {
      setStatusPromocaoEmpresario("Escolha o produto, o desconto e a validade.");
      return;
    }
    if (!supabaseConfigurado) { setStatusPromocaoEmpresario("ok"); return; }
    setPublicandoPromocaoEmpresario(true);
    try {
      const { error } = await supabase.from("promocoes").insert({
        produto_id: novaPromocaoEmpresario.produto_id,
        desconto_percentual: Number(novaPromocaoEmpresario.desconto_percentual),
        valida_ate: novaPromocaoEmpresario.valida_ate,
        ativa: true,
      });
      if (error) throw error;
      setNovaPromocaoEmpresario({ produto_id: "", desconto_percentual: "", valida_ate: "" });
      setStatusPromocaoEmpresario("ok");
    } catch (err) {
      setStatusPromocaoEmpresario(err.message || "Erro ao publicar promoção.");
    } finally {
      setPublicandoPromocaoEmpresario(false);
    }
  };

  const [erroAcaoProduto, setErroAcaoProduto] = useState("");

  const alternarAtivoMeuProduto = async (id, ativo) => {
    setErroAcaoProduto("");
    if (!supabaseConfigurado) { setMeusProdutosReais((atual) => (atual ?? []).map((p) => (p.id === id ? { ...p, ativo } : p))); return; }
    const { error } = await supabase.from("produtos").update({ ativo }).eq("id", id);
    if (!error) setMeusProdutosReais((atual) => atual.map((p) => (p.id === id ? { ...p, ativo } : p)));
    else setErroAcaoProduto(error.message || "Não foi possível atualizar o produto.");
  };

  const removerMeuProduto = async (id) => {
    setErroAcaoProduto("");
    if (!supabaseConfigurado) { setMeusProdutosReais((atual) => (atual ?? []).filter((p) => p.id !== id)); return; }
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (!error) setMeusProdutosReais((atual) => atual.filter((p) => p.id !== id));
    else setErroAcaoProduto(error.message || "Não foi possível excluir o produto.");
  };

  const [editandoValoresProduto, setEditandoValoresProduto] = useState({}); // { [id]: { preco_promocional, estoque } }
  const salvarValoresProduto = async (id) => {
    const v = editandoValoresProduto[id];
    if (!v) return;
    setErroAcaoProduto("");
    const registro = { preco_promocional: v.preco_promocional !== "" ? Number(v.preco_promocional) : null, estoque: v.estoque !== "" ? Number(v.estoque) : null };
    if (!supabaseConfigurado) { setMeusProdutosReais((atual) => atual.map((p) => (p.id === id ? { ...p, ...registro } : p))); return; }
    const { error } = await supabase.from("produtos").update(registro).eq("id", id);
    if (!error) setMeusProdutosReais((atual) => atual.map((p) => (p.id === id ? { ...p, ...registro } : p)));
    else setErroAcaoProduto(error.message || "Não foi possível salvar os valores do produto.");
  };

  // -------------------------------------------------------------------------
  // Vagas do próprio empresário — o formulário existia na tela mas nunca
  // salvava nada (nenhum input tinha state, o botão não fazia nada). Agora
  // publica de verdade, vinculado à empresa do empresário logado.
  // -------------------------------------------------------------------------
  const [minhasVagasReais, setMinhasVagasReais] = useState(null);
  const vagaEmpresarioVazia = { cargo: "", salario: "", cidade: "Ivatuba - PR", tipo: "CLT", requisitos: "", beneficios: "" };
  const [novaVagaEmpresario, setNovaVagaEmpresario] = useState(vagaEmpresarioVazia);
  const [publicandoVagaEmpresario, setPublicandoVagaEmpresario] = useState(false);
  const [statusVagaEmpresario, setStatusVagaEmpresario] = useState("");

  const carregarMinhasVagas = (idEmpresa) => {
    if (!supabaseConfigurado || !idEmpresa) return;
    supabase.from("vagas").select("*").eq("empresa_id", idEmpresa).order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setMinhasVagasReais(data || []);
    });
  };

  const publicarVagaEmpresario = async (e) => {
    e.preventDefault();
    setStatusVagaEmpresario("");
    if (!novaVagaEmpresario.cargo) { setStatusVagaEmpresario("Informe ao menos o cargo."); return; }
    if (!supabaseConfigurado) { setStatusVagaEmpresario("ok"); return; }
    if (!empresaId) { setStatusVagaEmpresario("Não encontramos sua empresa cadastrada. Fale com o suporte."); return; }
    setPublicandoVagaEmpresario(true);
    try {
      const { data, error } = await supabase.from("vagas").insert({ ...novaVagaEmpresario, empresa_id: empresaId, status: "aberta" }).select().single();
      if (error) throw error;
      setMinhasVagasReais((atual) => [data, ...(atual ?? [])]);
      setNovaVagaEmpresario(vagaEmpresarioVazia);
      setStatusVagaEmpresario("ok");
    } catch (err) {
      setStatusVagaEmpresario(err.message || "Erro ao publicar vaga");
    } finally {
      setPublicandoVagaEmpresario(false);
    }
  };

  const encerrarVagaEmpresario = async (id) => {
    setStatusVagaEmpresario("");
    if (!supabaseConfigurado) { setMinhasVagasReais((atual) => atual.map((v) => (v.id === id ? { ...v, status: "encerrada" } : v))); return; }
    const { error } = await supabase.from("vagas").update({ status: "encerrada" }).eq("id", id);
    if (!error) setMinhasVagasReais((atual) => atual.map((v) => (v.id === id ? { ...v, status: "encerrada" } : v)));
    else setStatusVagaEmpresario(error.message || "Não foi possível encerrar a vaga.");
  };

  // Visualizações do perfil — a coluna já existia na empresa (usada até pra
  // ordenar "empresas em destaque"), só faltava mostrar aqui de verdade.
  const [visualizacoesEmpresa, setVisualizacoesEmpresa] = useState(null);
  const [planoPremiumEmpresa, setPlanoPremiumEmpresa] = useState({ ativo: false, ate: null });

  useEffect(() => {
    if (!supabaseConfigurado) {
      setPerfilForm({
        nome: "Padaria Pão Nosso", whatsapp: "(44) 99999-0001", instagram: "@paonosso.ivatuba",
        endereco: "Rua das Flores, 120 - Centro", horario_atendimento: "Seg a Sáb, 6h às 19h",
      });
      return;
    }
    (async () => {
      const { data: sessaoAtual } = await supabase.auth.getSession();
      const usuarioId = sessaoAtual?.session?.user?.id;
      if (!usuarioId) return;
      setUsuarioIdAtual(usuarioId);
      const { data, error } = await supabase.from("empresas").select("*").eq("dono_id", usuarioId).single();
      if (error) {
        console.error("Falha ao carregar a empresa do usuário logado:", error);
        setEmpresaNaoEncontrada(true);
        return;
      }
      if (data) {
        setEmpresaId(data.id);
        setPerfilForm({
          nome: data.nome || "", whatsapp: data.whatsapp || "", instagram: data.instagram || "",
          endereco: data.endereco || "", horario_atendimento: data.horario_atendimento || "",
          horario_funcionamento: data.horario_funcionamento || null, chave_pix: data.chave_pix || "",
          logo_url: data.logo_url || "", banner_url: data.banner_url || "", fotos_urls: data.fotos_urls || [],
          email: data.email || "", facebook: data.facebook || "", site: data.site || "",
          cpf: data.cpf || "", cnpj: data.cnpj || "", possui_mei: !!data.possui_mei,
          aceita_cartao_servidor: !!data.aceita_cartao_servidor, destaque: !!data.destaque,
        });
        setVisualizacoesEmpresa(data.visualizacoes ?? 0);
        setPlanoPremiumEmpresa({ ativo: planoPremiumAtivo(data), ate: data.plano_premium_ate || null });
        carregarMeusProdutos(data.id);
        carregarMinhasVagas(data.id);
        carregarMinhasAvaliacoes(data.id);
        carregarMeusCupons(data.id);
        carregarMeusCombos(data.id);
        carregarFidelidade(data.id);
      }
    })();
  }, []);

  // Cupons de desconto digitais — resgatados na loja física.
  const [meusCupons, setMeusCupons] = useState(null);
  const cupomVazio = { titulo: "", descricao: "", desconto_percentual: "", validade: "" };
  const [novoCupom, setNovoCupom] = useState(cupomVazio);
  const [criandoCupom, setCriandoCupom] = useState(false);
  const [statusCupom, setStatusCupom] = useState("");

  const carregarMeusCupons = (idEmpresa) => {
    if (!supabaseConfigurado || !idEmpresa) return;
    supabase.from("cupons").select("*").eq("empresa_id", idEmpresa).order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setMeusCupons(data || []);
    });
  };

  const criarCupom = async (e, idEmpresaAtual) => {
    e.preventDefault();
    setStatusCupom("");
    if (!novoCupom.titulo.trim()) { setStatusCupom("Informe o título do cupom."); return; }
    setCriandoCupom(true);
    try {
      const codigo = `${novoCupom.titulo.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error } = await supabase.from("cupons").insert({
        empresa_id: idEmpresaAtual,
        titulo: novoCupom.titulo,
        descricao: novoCupom.descricao || null,
        desconto_percentual: novoCupom.desconto_percentual ? Number(novoCupom.desconto_percentual) : null,
        validade: novoCupom.validade || null,
        codigo,
      }).select().single();
      if (error) throw error;
      setMeusCupons((atual) => [data, ...(atual ?? [])]);
      setNovoCupom(cupomVazio);
      setStatusCupom("ok");
    } catch (err) {
      setStatusCupom(err.message || "Erro ao criar cupom.");
    } finally {
      setCriandoCupom(false);
    }
  };

  const alternarAtivoCupom = async (id, ativo) => {
    setStatusCupom("");
    const { error } = await supabase.from("cupons").update({ ativo }).eq("id", id);
    if (!error) setMeusCupons((atual) => atual.map((c) => (c.id === id ? { ...c, ativo } : c)));
    else setStatusCupom(error.message || "Não foi possível atualizar o cupom.");
  };

  const registrarResgateCupom = async (id, usosAtuais) => {
    setStatusCupom("");
    const { error } = await supabase.from("cupons").update({ usos_atuais: usosAtuais + 1 }).eq("id", id);
    if (!error) setMeusCupons((atual) => atual.map((c) => (c.id === id ? { ...c, usos_atuais: usosAtuais + 1 } : c)));
    else setStatusCupom(error.message || "Não foi possível registrar o resgate.");
  };

  const apagarCupom = async (id) => {
    setStatusCupom("");
    const { error } = await supabase.from("cupons").delete().eq("id", id);
    if (!error) setMeusCupons((atual) => atual.filter((c) => c.id !== id));
    else setStatusCupom(error.message || "Não foi possível excluir o cupom.");
  };

  // Combos e promoções combinadas (ex: "Combo lanche + suco por R$ 20").
  const [meusCombos, setMeusCombos] = useState(null);
  const comboVazio = { titulo: "", descricao: "", preco: "" };
  const [novoCombo, setNovoCombo] = useState(comboVazio);
  const [criandoCombo, setCriandoCombo] = useState(false);
  const [statusCombo, setStatusCombo] = useState("");

  const carregarMeusCombos = (idEmpresa) => {
    if (!supabaseConfigurado || !idEmpresa) return;
    supabase.from("combos").select("*").eq("empresa_id", idEmpresa).order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setMeusCombos(data || []);
    });
  };

  const criarCombo = async (e, idEmpresaAtual) => {
    e.preventDefault();
    setStatusCombo("");
    if (!novoCombo.titulo.trim()) { setStatusCombo("Informe o título do combo."); return; }
    setCriandoCombo(true);
    try {
      const { data, error } = await supabase.from("combos").insert({
        empresa_id: idEmpresaAtual,
        titulo: novoCombo.titulo,
        descricao: novoCombo.descricao || null,
        preco: novoCombo.preco ? Number(novoCombo.preco) : null,
      }).select().single();
      if (error) throw error;
      setMeusCombos((atual) => [data, ...(atual ?? [])]);
      setNovoCombo(comboVazio);
      setStatusCombo("ok");
    } catch (err) {
      setStatusCombo(err.message || "Erro ao criar combo.");
    } finally {
      setCriandoCombo(false);
    }
  };

  const alternarAtivoCombo = async (id, ativo) => {
    setStatusCombo("");
    const { error } = await supabase.from("combos").update({ ativo }).eq("id", id);
    if (!error) setMeusCombos((atual) => atual.map((c) => (c.id === id ? { ...c, ativo } : c)));
    else setStatusCombo(error.message || "Não foi possível atualizar o combo.");
  };

  const apagarCombo = async (id) => {
    setStatusCombo("");
    const { error } = await supabase.from("combos").delete().eq("id", id);
    if (!error) setMeusCombos((atual) => atual.filter((c) => c.id !== id));
    else setStatusCombo(error.message || "Não foi possível excluir o combo.");
  };

  // Cartão fidelidade digital — a loja define a regra (ex: "a cada 10
  // compras, ganhe 1 grátis") e vai marcando os carimbos de cada cliente
  // (identificado pelo telefone) direto no balcão.
  const [fidelidadeConfig, setFidelidadeConfig] = useState(null); // null = carregando
  const [salvandoFidelidadeConfig, setSalvandoFidelidadeConfig] = useState(false);
  const [statusFidelidadeConfig, setStatusFidelidadeConfig] = useState("");
  const [buscaFidelidadeTelefone, setBuscaFidelidadeTelefone] = useState("");
  const [buscaFidelidadeNome, setBuscaFidelidadeNome] = useState("");
  const [clienteFidelidade, setClienteFidelidade] = useState(null); // undefined = buscando, null = não encontrado ainda
  const [meusClientesFidelidade, setMeusClientesFidelidade] = useState(null);
  const [erroAcaoFidelidade, setErroAcaoFidelidade] = useState("");

  const carregarFidelidade = (idEmpresa) => {
    if (!supabaseConfigurado || !idEmpresa) return;
    supabase.from("fidelidade_config").select("*").eq("empresa_id", idEmpresa).maybeSingle().then(({ data }) => {
      setFidelidadeConfig(data || { empresa_id: idEmpresa, meta_carimbos: 10, recompensa: "", ativo: false });
    });
    supabase.from("fidelidade_clientes").select("*").eq("empresa_id", idEmpresa).order("carimbos", { ascending: false }).then(({ data, error }) => {
      if (!error) setMeusClientesFidelidade(data || []);
    });
  };

  const salvarFidelidadeConfig = async (e, idEmpresaAtual) => {
    e.preventDefault();
    setStatusFidelidadeConfig("");
    setSalvandoFidelidadeConfig(true);
    try {
      const { error } = await supabase.from("fidelidade_config").upsert({
        empresa_id: idEmpresaAtual,
        meta_carimbos: Number(fidelidadeConfig.meta_carimbos) || 10,
        recompensa: fidelidadeConfig.recompensa || null,
        ativo: fidelidadeConfig.ativo,
      });
      if (error) throw error;
      setStatusFidelidadeConfig("ok");
    } catch (err) {
      setStatusFidelidadeConfig(err.message || "Erro ao salvar.");
    } finally {
      setSalvandoFidelidadeConfig(false);
    }
  };

  const buscarOuCriarClienteFidelidade = async (idEmpresaAtual) => {
    const telefone = buscaFidelidadeTelefone.replace(/\D/g, "");
    if (!telefone) return;
    setErroAcaoFidelidade("");
    setClienteFidelidade(undefined);
    const { data, error: erroBusca } = await supabase.from("fidelidade_clientes").select("*").eq("empresa_id", idEmpresaAtual).eq("telefone", telefone).maybeSingle();
    if (erroBusca) {
      setErroAcaoFidelidade(erroBusca.message || "Não foi possível buscar o cliente.");
      setClienteFidelidade(null);
      return;
    }
    if (data) { setClienteFidelidade(data); return; }
    const { data: novo, error } = await supabase.from("fidelidade_clientes").insert({
      empresa_id: idEmpresaAtual, telefone, nome: buscaFidelidadeNome || null, carimbos: 0,
    }).select().single();
    if (!error) {
      setClienteFidelidade(novo);
      setMeusClientesFidelidade((atual) => [novo, ...(atual ?? [])]);
    } else {
      setErroAcaoFidelidade(error.message || "Não foi possível cadastrar o cliente.");
      setClienteFidelidade(null);
    }
  };

  const darCarimbo = async () => {
    if (!clienteFidelidade) return;
    setErroAcaoFidelidade("");
    const novoValor = clienteFidelidade.carimbos + 1;
    const { error } = await supabase.from("fidelidade_clientes").update({ carimbos: novoValor }).eq("id", clienteFidelidade.id);
    if (!error) {
      setClienteFidelidade((c) => ({ ...c, carimbos: novoValor }));
      setMeusClientesFidelidade((atual) => atual.map((c) => (c.id === clienteFidelidade.id ? { ...c, carimbos: novoValor } : c)));
    } else {
      setErroAcaoFidelidade(error.message || "Não foi possível registrar o carimbo.");
    }
  };

  const resgatarFidelidade = async () => {
    if (!clienteFidelidade) return;
    setErroAcaoFidelidade("");
    const { error } = await supabase.from("fidelidade_clientes").update({ carimbos: 0 }).eq("id", clienteFidelidade.id);
    if (!error) {
      setClienteFidelidade((c) => ({ ...c, carimbos: 0 }));
      setMeusClientesFidelidade((atual) => atual.map((c) => (c.id === clienteFidelidade.id ? { ...c, carimbos: 0 } : c)));
    } else {
      setErroAcaoFidelidade(error.message || "Não foi possível resgatar a recompensa.");
    }
  };

  // Catálogo de produtos em PDF — abre uma página pronta pra imprimir (o
  // cliente escolhe "Salvar como PDF" na janela de impressão do navegador).
  const baixarCatalogoPDF = () => {
    const produtosAtivos = (meusProdutosReais || []).filter((p) => p.ativo);
    const linhas = produtosAtivos.map((p) => `
      <div class="item">
        ${p.foto_url ? `<img src="${p.foto_url}" />` : `<div class="semfoto"></div>`}
        <div>
          <p class="nome">${p.nome}</p>
          ${p.descricao ? `<p class="desc">${p.descricao}</p>` : ""}
          <p class="preco">${p.preco ? `R$ ${Number(p.preco).toFixed(2).replace(".", ",")}` : ""}</p>
        </div>
      </div>`).join("");
    const janela = window.open("", "_blank");
    janela.document.write(`
      <html><head><title>Catálogo — ${perfilForm.nome || "Minha empresa"}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0E2233}
        h1{font-size:20px;margin-bottom:4px}
        p.sub{color:#5C7186;font-size:12px;margin-top:0;margin-bottom:20px}
        .item{display:flex;gap:12px;align-items:center;border-bottom:1px solid #E4EAF0;padding:10px 0}
        .item img{width:56px;height:56px;object-fit:cover;border-radius:8px}
        .semfoto{width:56px;height:56px;border-radius:8px;background:#EAF2FA}
        .nome{font-weight:bold;font-size:13px;margin:0}
        .desc{font-size:11px;color:#5C7186;margin:2px 0}
        .preco{font-size:12px;font-weight:bold;color:#0A5AA8;margin:2px 0 0}
        @media print{body{padding:0}}
      </style></head>
      <body>
        <h1>${perfilForm.nome || "Catálogo de produtos"}</h1>
        <p class="sub">Catálogo gerado pelo Conecta Comércio</p>
        ${linhas || "<p>Nenhum produto ativo no momento.</p>"}
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    janela.document.close();
  };

  // Avaliações recebidas pela empresa — o dono pode responder.
  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState(null);
  const [respostaAvaliacao, setRespostaAvaliacao] = useState({}); // { [id]: texto }
  const [enviandoRespostaId, setEnviandoRespostaId] = useState(null);
  const [erroRespostaAvaliacao, setErroRespostaAvaliacao] = useState("");

  const carregarMinhasAvaliacoes = (idEmpresa) => {
    if (!supabaseConfigurado || !idEmpresa) return;
    supabase.from("avaliacoes").select("*").eq("empresa_id", idEmpresa).order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setMinhasAvaliacoes(data || []);
    });
  };

  const enviarRespostaAvaliacao = async (id) => {
    const texto = (respostaAvaliacao[id] || "").trim();
    if (!texto) return;
    setErroRespostaAvaliacao("");
    setEnviandoRespostaId(id);
    const { error } = await supabase.from("avaliacoes").update({ resposta_comerciante: texto }).eq("id", id);
    if (!error) setMinhasAvaliacoes((atual) => atual.map((a) => (a.id === id ? { ...a, resposta_comerciante: texto } : a)));
    else setErroRespostaAvaliacao(error.message || "Não foi possível enviar a resposta.");
    setEnviandoRespostaId(null);
  };

  const atualizarPerfilForm = (campo, valor) => setPerfilForm((f) => ({ ...f, [campo]: valor }));

  const enviarLogoPerfil = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setPerfilForm((f) => ({ ...f, logo_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoLogoPerfil(true);
    const caminho = `logos/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("logos").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoLogoPerfil(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("logos").getPublicUrl(caminho);
        setPerfilForm((f) => ({ ...f, logo_url: pub.publicUrl }));
      }
    });
  };

  const enviarBannerPerfil = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!supabaseConfigurado) { setPerfilForm((f) => ({ ...f, banner_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoBannerPerfil(true);
    const caminho = `banners-empresas/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("fotos-empresas").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoBannerPerfil(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("fotos-empresas").getPublicUrl(caminho);
        setPerfilForm((f) => ({ ...f, banner_url: pub.publicUrl }));
      }
    });
  };

  const limiteFotosPerfil = planoPremiumEmpresa.ativo ? LIMITE_FOTOS_PREMIUM : LIMITE_FOTOS_GRATUITO;

  const enviarFotoGaleriaPerfil = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (perfilForm.fotos_urls.length >= limiteFotosPerfil) {
      setStatusPerfil(`Limite de ${limiteFotosPerfil} fotos atingido.`);
      return;
    }
    if (!supabaseConfigurado) { setPerfilForm((f) => ({ ...f, fotos_urls: [...f.fotos_urls, URL.createObjectURL(arquivo)] })); return; }
    setEnviandoFotoGaleriaPerfil(true);
    const caminho = `galeria/${Date.now()}-${arquivo.name}`;
    supabase.storage.from("fotos-empresas").upload(caminho, arquivo).then(({ error }) => {
      setEnviandoFotoGaleriaPerfil(false);
      if (!error) {
        const { data: pub } = supabase.storage.from("fotos-empresas").getPublicUrl(caminho);
        setPerfilForm((f) => ({ ...f, fotos_urls: [...f.fotos_urls, pub.publicUrl] }));
      }
    });
  };

  const removerFotoGaleriaPerfil = (indice) => {
    setPerfilForm((f) => ({ ...f, fotos_urls: f.fotos_urls.filter((_, i) => i !== indice) }));
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    setStatusPerfil("");
    if (!supabaseConfigurado) { setStatusPerfil("ok"); return; }
    if (!empresaId) {
      setStatusPerfil("Não encontramos sua empresa cadastrada. Fale com o suporte antes de tentar salvar de novo.");
      return;
    }
    setSalvandoPerfil(true);
    try {
      const { error } = await supabase.from("empresas").update({
        nome: perfilForm.nome, whatsapp: perfilForm.whatsapp, instagram: perfilForm.instagram,
        endereco: perfilForm.endereco, horario_atendimento: perfilForm.horario_atendimento,
        horario_funcionamento: perfilForm.horario_funcionamento, chave_pix: perfilForm.chave_pix || null,
        logo_url: perfilForm.logo_url || null, banner_url: perfilForm.banner_url || null,
        fotos_urls: perfilForm.fotos_urls, email: perfilForm.email || null,
        facebook: perfilForm.facebook || null, site: perfilForm.site || null,
        cpf: perfilForm.cpf || null, cnpj: perfilForm.cnpj || null, possui_mei: perfilForm.possui_mei,
        aceita_cartao_servidor: perfilForm.aceita_cartao_servidor, destaque: perfilForm.destaque,
      }).eq("id", empresaId);
      if (error) throw error;
      setStatusPerfil("ok");
    } catch (err) {
      setStatusPerfil(err.message || "Não foi possível salvar agora. Tente de novo.");
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const items = [
    { id: "avisos", label: "Novidades p/ você", icon: Bell },
    { id: "perfil", label: "Editar perfil", icon: UserCircle2 },
    { id: "produtos", label: "Produtos", icon: ShoppingBag },
    { id: "promocoes", label: "Promoções", icon: Tag },
    { id: "vagas", label: "Publicar vaga", icon: Briefcase },
    { id: "cupons", label: "Cupons de desconto", icon: Tag },
    { id: "combos", label: "Combos e promoções", icon: HandCoins },
    { id: "fidelidade", label: "Cartão fidelidade", icon: BadgeCheck },
    { id: "avaliacoes", label: "Avaliações", icon: Star },
    { id: "visualizacoes", label: "Desempenho / Premium", icon: Eye },
  ];

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="rounded-2xl border p-3 h-fit" style={{ borderColor: C.line }}>
        <p className="font-body text-[11px] font-bold uppercase tracking-wider px-2 mb-2 truncate" style={{ color: "#5C7186" }}>{perfilForm.nome || "Minha empresa"}</p>
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => setTab(it.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body font-semibold text-left"
              style={{ background: active ? C.blueTint : "transparent", color: active ? C.blue : "#425A70" }}>
              <Icon size={16} /> {it.label}
            </button>
          );
        })}
      </aside>

      <div className="min-w-0">
        {tab === "avisos" && <PainelAvisosEmpresario siteConfig={siteConfig} />}
        {tab === "perfil" && (
          <div>
            <SectionHeader eyebrow="Sua empresa" title="Editar perfil" />
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2 max-w-2xl" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: conecte o Supabase para essas alterações serem salvas de verdade.
              </div>
            )}
            {empresaNaoEncontrada && (
              <div className="mb-4 rounded-2xl border p-5 max-w-2xl" style={{ borderColor: "#F0B8A8", background: "#FDEEEA" }}>
                <p className="font-body text-xs flex items-start gap-2 mb-3" style={{ color: "#B4462F" }}>
                  <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                  Não encontramos uma empresa vinculada a este login ainda. Cadastre agora pra liberar o resto do painel:
                </p>
                <form onSubmit={criarMinhaEmpresaAgora} className="grid sm:grid-cols-2 gap-2">
                  <input value={formCriarEmpresa.nome} onChange={(e) => setFormCriarEmpresa((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome da empresa" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
                  <input value={formCriarEmpresa.whatsapp} onChange={(e) => setFormCriarEmpresa((f) => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="WhatsApp" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  <input value={formCriarEmpresa.categoria} onChange={(e) => setFormCriarEmpresa((f) => ({ ...f, categoria: e.target.value }))}
                    placeholder="Categoria (ex: Alimentação)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  {statusCriarEmpresaAgora && statusCriarEmpresaAgora !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusCriarEmpresaAgora}</p>}
                  <button type="submit" disabled={criandoEmpresaAgora} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                    {criandoEmpresaAgora ? "Cadastrando..." : "Cadastrar minha empresa"}
                  </button>
                </form>
              </div>
            )}
            <form onSubmit={salvarPerfil} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl" style={{ borderColor: C.line }}>
              <input value={perfilForm.nome} onChange={(e) => atualizarPerfilForm("nome", e.target.value)} placeholder="Nome da empresa"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />

              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <label className="font-body text-xs font-bold cursor-pointer w-fit flex items-center gap-1.5" style={{ color: C.blue }}>
                  <Camera size={13} /> {enviandoLogoPerfil ? "Enviando..." : "Trocar logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={enviarLogoPerfil} />
                </label>
                <label className="font-body text-xs font-bold cursor-pointer w-fit flex items-center gap-1.5" style={{ color: C.blue }}>
                  <ImageIcon size={13} /> {enviandoBannerPerfil ? "Enviando..." : "Trocar banner"}
                  <input type="file" accept="image/*" className="hidden" onChange={enviarBannerPerfil} />
                </label>
                {perfilForm.logo_url && <img loading="lazy" decoding="async" src={perfilForm.logo_url} alt="Logo" className="w-9 h-9 rounded-lg object-cover border" style={{ borderColor: C.line }} />}
                {perfilForm.banner_url && <img loading="lazy" decoding="async" src={perfilForm.banner_url} alt="Banner" className="w-16 h-9 rounded-lg object-cover border" style={{ borderColor: C.line }} />}
              </div>

              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                WhatsApp
                <input value={perfilForm.whatsapp} onChange={(e) => atualizarPerfilForm("whatsapp", e.target.value)} placeholder="(44) 99999-0000"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Instagram
                <input value={perfilForm.instagram} onChange={(e) => atualizarPerfilForm("instagram", e.target.value)} placeholder="@sua.empresa"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Facebook
                <input value={perfilForm.facebook} onChange={(e) => atualizarPerfilForm("facebook", e.target.value)} placeholder="Link do Facebook"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                Site
                <input value={perfilForm.site} onChange={(e) => atualizarPerfilForm("site", e.target.value)} placeholder="https://..."
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
                E-mail
                <input value={perfilForm.email} onChange={(e) => atualizarPerfilForm("email", e.target.value)} placeholder="contato@suaempresa.com"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <input value={perfilForm.endereco} onChange={(e) => atualizarPerfilForm("endereco", e.target.value)} placeholder="Endereço"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={perfilForm.horario_atendimento} onChange={(e) => atualizarPerfilForm("horario_atendimento", e.target.value)} placeholder="Horário de atendimento"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button type="button" className="font-body text-sm font-bold px-3 py-2.5 rounded-lg border flex items-center justify-center gap-2" style={{ borderColor: C.line, color: "#425A70" }}>
                <MapPin size={14} /> Ajustar localização no mapa
              </button>
              <div className="sm:col-span-2">
                <p className="font-body text-xs font-bold mb-1.5" style={{ color: C.ink }}>Horário de funcionamento (mostra "aberto agora" pro cliente)</p>
                <EditorHorarioSemana valor={perfilForm.horario_funcionamento} onChange={(novo) => setPerfilForm((f) => ({ ...f, horario_funcionamento: novo }))} />
              </div>
              <input value={perfilForm.chave_pix} onChange={(e) => atualizarPerfilForm("chave_pix", e.target.value)} placeholder="Chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <p className="font-body text-[11px] sm:col-span-2 -mt-1.5" style={{ color: "#8896A6" }}>Com a chave Pix cadastrada, o cliente vê um código Pix pra pagar direto no carrinho — o dinheiro cai na sua conta, o site não participa do pagamento.</p>

              <input value={perfilForm.cpf} onChange={(e) => atualizarPerfilForm("cpf", e.target.value)} placeholder="CPF"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={perfilForm.cnpj} onChange={(e) => atualizarPerfilForm("cnpj", e.target.value)} placeholder="CNPJ"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={perfilForm.possui_mei} onChange={(e) => atualizarPerfilForm("possui_mei", e.target.checked)} />
                Possui MEI
              </label>
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={perfilForm.aceita_cartao_servidor} onChange={(e) => atualizarPerfilForm("aceita_cartao_servidor", e.target.checked)} />
                Aceita Cartão do Servidor
              </label>
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer sm:col-span-2" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={perfilForm.destaque} onChange={(e) => atualizarPerfilForm("destaque", e.target.checked)} />
                Mostrar em destaque na Vitrine Local
              </label>

              <div className="sm:col-span-2">
                <p className="font-body text-xs font-bold mb-1.5" style={{ color: "#425A70" }}>
                  Galeria de fotos <span style={{ color: "#8896A6", fontWeight: 400 }}>({perfilForm.fotos_urls.length}/{limiteFotosPerfil})</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {perfilForm.fotos_urls.map((url, i) => (
                    <div key={url + i} className="relative w-14 h-14 rounded-lg overflow-hidden border" style={{ borderColor: C.line }}>
                      <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removerFotoGaleriaPerfil(i)} type="button" className="absolute top-0 right-0 w-5 h-5 bg-black/60 text-white flex items-center justify-center"><X size={11} /></button>
                    </div>
                  ))}
                  {perfilForm.fotos_urls.length < limiteFotosPerfil && (
                    <label className="w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer" style={{ borderColor: C.line, color: "#5C7186" }}>
                      {enviandoFotoGaleriaPerfil ? "..." : <PlusCircle size={16} />}
                      <input type="file" accept="image/*" className="hidden" onChange={enviarFotoGaleriaPerfil} />
                    </label>
                  )}
                </div>
                {!planoPremiumEmpresa.ativo && perfilForm.fotos_urls.length >= LIMITE_FOTOS_GRATUITO && (
                  <p className="font-body text-[10px] mt-1" style={{ color: "#8A5A12" }}>Limite do plano gratuito. Ative o Plano Premium pra liberar até {LIMITE_FOTOS_PREMIUM} fotos.</p>
                )}
              </div>

              <button type="submit" disabled={salvandoPerfil} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoPerfil ? "Salvando..." : "Salvar alterações"}
              </button>
              {statusPerfil === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Perfil atualizado!</p>}
              {statusPerfil && statusPerfil !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusPerfil}</p>}
            </form>
          </div>
        )}

        {tab === "produtos" && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <SectionHeader eyebrow="Vitrine" title="Meus produtos" />
              <div className="flex gap-2 h-fit shrink-0">
                <button onClick={baixarCatalogoPDF} className="font-body text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>
                  <FileText size={14} /> Catálogo em PDF
                </button>
                <button onClick={() => setModalProdutoAberto(true)} className="font-body text-xs font-bold text-white rounded-lg px-3 py-2 flex items-center gap-1.5" style={{ background: C.blue }}>
                  <PlusCircle size={14} /> Novo produto
                </button>
              </div>
            </div>
            {erroAcaoProduto && <p className="font-body text-xs mb-3" style={{ color: "#B4462F" }}>{erroAcaoProduto}</p>}
            <div className="flex flex-col gap-3 -mt-4">
              {(meusProdutosReais ?? meusProdutos.map((p, i) => ({ id: `demo-${i}`, ...p, preco_exibicao: p.preco }))).map((p) => {
                const editando = editandoValoresProduto[p.id] ?? { preco_promocional: p.preco_promocional ?? "", estoque: p.estoque ?? "" };
                return (
                <div key={p.id} className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-4">
                    {p.foto_url ? (
                      <img loading="lazy" decoding="async" src={p.foto_url} alt={p.nome} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                        <ShoppingBag size={16} />
                      </span>
                    )}
                    <div className="flex-1">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
                      <p className="font-body text-xs" style={{ color: "#5C7186" }}>
                        {p.preco_exibicao ?? (p.preco != null ? `R$ ${Number(p.preco).toFixed(2)}` : "Sem preço")}
                        {p.preco_promocional != null ? ` · Promo: R$ ${Number(p.preco_promocional).toFixed(2)}` : ""}
                        {p.estoque != null ? ` · Estoque: ${p.estoque}` : ""} · {p.ativo ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                    <button onClick={() => alternarAtivoMeuProduto(p.id, !p.ativo)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border shrink-0" style={{ borderColor: C.line, color: "#425A70" }}>
                      {p.ativo ? "Despublicar" : "Publicar"}
                    </button>
                    <button onClick={() => { if (window.confirm("Tem certeza que quer excluir esse produto? Essa ação não pode ser desfeita.")) removerMeuProduto(p.id); }} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                  </div>
                  {!String(p.id).startsWith("demo-") && (
                    <div className="flex items-center gap-2 flex-wrap pl-14">
                      <input value={editando.preco_promocional} onChange={(e) => setEditandoValoresProduto((s) => ({ ...s, [p.id]: { ...editando, preco_promocional: e.target.value } }))}
                        type="number" step="0.01" placeholder="Preço promocional" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none w-36" style={{ borderColor: C.line }} />
                      <input value={editando.estoque} onChange={(e) => setEditandoValoresProduto((s) => ({ ...s, [p.id]: { ...editando, estoque: e.target.value } }))}
                        type="number" min="0" placeholder="Estoque" className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none w-24" style={{ borderColor: C.line }} />
                      <button onClick={() => salvarValoresProduto(p.id)} className="font-body text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: C.blueTint, color: C.blue }}>Salvar</button>
                    </div>
                  )}
                </div>
                );
              })}
              {(meusProdutosReais ?? []).length === 0 && meusProdutosReais !== null && (
                <p className="font-body text-sm" style={{ color: "#5C7186" }}>Você ainda não cadastrou nenhum produto.</p>
              )}
            </div>
          </div>
        )}

        {tab === "promocoes" && (
          <div>
            <SectionHeader eyebrow="Vendas" title="Criar promoção" />
            <form onSubmit={publicarPromocaoEmpresario} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl" style={{ borderColor: C.line }}>
              <select value={novaPromocaoEmpresario.produto_id} onChange={(e) => setNovaPromocaoEmpresario((v) => ({ ...v, produto_id: e.target.value }))}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2 bg-white" style={{ borderColor: C.line }}>
                <option value="">Escolha o produto</option>
                {(meusProdutosReais ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <input value={novaPromocaoEmpresario.desconto_percentual} onChange={(e) => setNovaPromocaoEmpresario((v) => ({ ...v, desconto_percentual: e.target.value }))}
                type="number" min="1" max="90" placeholder="% de desconto" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaPromocaoEmpresario.valida_ate} onChange={(e) => setNovaPromocaoEmpresario((v) => ({ ...v, valida_ate: e.target.value }))}
                placeholder="Válida até" type="date" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button type="submit" disabled={publicandoPromocaoEmpresario} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoPromocaoEmpresario ? "Publicando..." : "Publicar promoção"}
              </button>
              {statusPromocaoEmpresario === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Promoção publicada!</p>}
              {statusPromocaoEmpresario && statusPromocaoEmpresario !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusPromocaoEmpresario}</p>}
              {(meusProdutosReais ?? []).length === 0 && (
                <p className="sm:col-span-2 font-body text-xs" style={{ color: "#5C7186" }}>Cadastre um produto primeiro na aba "Produtos" pra poder criar uma promoção.</p>
              )}
            </form>
          </div>
        )}

        {tab === "vagas" && (
          <div>
            <SectionHeader eyebrow="Contratação" title="Publicar vaga" sub="Aparece direto na home, na seção Vagas de emprego" />
            <form onSubmit={publicarVagaEmpresario} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl mb-6" style={{ borderColor: C.line }}>
              <input value={novaVagaEmpresario.cargo} onChange={(e) => setNovaVagaEmpresario((v) => ({ ...v, cargo: e.target.value }))} placeholder="Cargo" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={novaVagaEmpresario.salario} onChange={(e) => setNovaVagaEmpresario((v) => ({ ...v, salario: e.target.value }))} placeholder="Salário" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novaVagaEmpresario.cidade} onChange={(e) => setNovaVagaEmpresario((v) => ({ ...v, cidade: e.target.value }))} placeholder="Cidade" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <select value={novaVagaEmpresario.tipo} onChange={(e) => setNovaVagaEmpresario((v) => ({ ...v, tipo: e.target.value }))} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="Estágio">Estágio</option>
                <option value="Temporário">Temporário</option>
                <option value="Freelance">Freelance</option>
              </select>
              <textarea value={novaVagaEmpresario.requisitos} onChange={(e) => setNovaVagaEmpresario((v) => ({ ...v, requisitos: e.target.value }))} placeholder="Requisitos" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <textarea value={novaVagaEmpresario.beneficios} onChange={(e) => setNovaVagaEmpresario((v) => ({ ...v, beneficios: e.target.value }))} placeholder="Benefícios (opcional)" rows={2} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              {statusVagaEmpresario && statusVagaEmpresario !== "ok" && <p className="sm:col-span-2 font-body text-xs" style={{ color: "#B4462F" }}>{statusVagaEmpresario}</p>}
              {statusVagaEmpresario === "ok" && <p className="sm:col-span-2 font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Vaga publicada!</p>}
              <button type="submit" disabled={publicandoVagaEmpresario} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {publicandoVagaEmpresario ? "Publicando..." : "Publicar vaga"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-2xl">
              {(minhasVagasReais ?? []).map((v) => (
                <div key={v.id} className="rounded-2xl border p-4 flex items-center gap-4" style={{ borderColor: C.line }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{v.cargo}</p>
                    <p className="font-body text-xs" style={{ color: "#5C7186" }}>{v.salario} · {v.tipo}{v.status === "encerrada" ? " · Encerrada" : ""}</p>
                  </div>
                  {v.status !== "encerrada" && (
                    <button onClick={() => encerrarVagaEmpresario(v.id)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>Encerrar</button>
                  )}
                </div>
              ))}
              {(minhasVagasReais ?? []).length === 0 && <p className="font-body text-sm" style={{ color: "#5C7186" }}>Você ainda não publicou nenhuma vaga.</p>}
            </div>
          </div>
        )}

        {tab === "cupons" && (
          <div>
            <SectionHeader eyebrow="Fidelização" title="Cupons de desconto" sub="Cliente mostra o código na loja — você confere e clica em '+1 resgate'" />
            <form onSubmit={(e) => criarCupom(e, empresaId)} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-md mb-6" style={{ borderColor: C.line }}>
              <input value={novoCupom.titulo} onChange={(e) => setNovoCupom((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título (ex: 10% na primeira compra)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novoCupom.descricao} onChange={(e) => setNovoCupom((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={novoCupom.desconto_percentual} onChange={(e) => setNovoCupom((v) => ({ ...v, desconto_percentual: e.target.value }))} type="number" placeholder="Desconto (%)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={novoCupom.validade} onChange={(e) => setNovoCupom((v) => ({ ...v, validade: e.target.value }))} type="date"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              {statusCupom && statusCupom !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusCupom}</p>}
              {statusCupom === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Cupom criado!</p>}
              <button type="submit" disabled={criandoCupom} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {criandoCupom ? "Criando..." : "Criar cupom"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-md">
              {(meusCupons ?? []).map((c) => (
                <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{c.titulo}</p>
                    <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.ativo ? "#E7F6EE" : "#FBEAE5", color: c.ativo ? "#1E8E5A" : "#B4462F" }}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {c.descricao && <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{c.descricao}</p>}
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>
                    Código: <span className="font-bold" style={{ color: C.blue }}>{c.codigo}</span>
                    {c.validade && ` · válido até ${c.validade.split("-").reverse().join("/")}`}
                  </p>
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>Resgatado {c.usos_atuais}x</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => registrarResgateCupom(c.id, c.usos_atuais)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 text-white" style={{ background: "#25A85B" }}>+1 resgate</button>
                    <button onClick={() => alternarAtivoCupom(c.id, !c.ativo)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>{c.ativo ? "Desativar" : "Ativar"}</button>
                    <button onClick={() => apagarCupom(c.id)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ color: "#B4462F" }}>Excluir</button>
                  </div>
                </div>
              ))}
              {(meusCupons ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum cupom criado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "combos" && (
          <div>
            <SectionHeader eyebrow="Vendas" title="Combos e promoções combinadas" sub="Ex: 'Combo lanche + suco por R$ 20' — aparece no perfil público da sua empresa" />
            <form onSubmit={(e) => criarCombo(e, empresaId)} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-md mb-6" style={{ borderColor: C.line }}>
              <input value={novoCombo.titulo} onChange={(e) => setNovoCombo((v) => ({ ...v, titulo: e.target.value }))} placeholder="Título (ex: Combo lanche + suco)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={novoCombo.descricao} onChange={(e) => setNovoCombo((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={novoCombo.preco} onChange={(e) => setNovoCombo((v) => ({ ...v, preco: e.target.value }))} type="number" step="0.01" placeholder="Preço do combo (R$)"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              {statusCombo && statusCombo !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusCombo}</p>}
              {statusCombo === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Combo criado!</p>}
              <button type="submit" disabled={criandoCombo} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {criandoCombo ? "Criando..." : "Criar combo"}
              </button>
            </form>
            <div className="flex flex-col gap-3 max-w-md">
              {(meusCombos ?? []).map((c) => (
                <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{c.titulo}</p>
                    <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.ativo ? "#E7F6EE" : "#FBEAE5", color: c.ativo ? "#1E8E5A" : "#B4462F" }}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {c.descricao && <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{c.descricao}</p>}
                  {c.preco && <p className="font-body text-xs mt-1 font-bold" style={{ color: C.blue }}>R$ {Number(c.preco).toFixed(2).replace(".", ",")}</p>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => alternarAtivoCombo(c.id, !c.ativo)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: C.line, color: "#425A70" }}>{c.ativo ? "Desativar" : "Ativar"}</button>
                    <button onClick={() => apagarCombo(c.id)} className="font-body text-xs font-bold rounded-lg px-3 py-1.5" style={{ color: "#B4462F" }}>Excluir</button>
                  </div>
                </div>
              ))}
              {(meusCombos ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum combo criado ainda.</p>}
            </div>
          </div>
        )}

        {tab === "fidelidade" && fidelidadeConfig && (
          <div>
            <SectionHeader eyebrow="Fidelização" title="Cartão fidelidade" sub="Defina a regra e vá marcando os carimbos dos clientes direto no balcão" />
            <form onSubmit={(e) => salvarFidelidadeConfig(e, empresaId)} className="rounded-2xl border p-5 flex flex-col gap-3 max-w-md mb-6" style={{ borderColor: C.line }}>
              <label className="font-body text-xs font-semibold flex items-center gap-2 w-fit cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" checked={fidelidadeConfig.ativo} onChange={(e) => setFidelidadeConfig((f) => ({ ...f, ativo: e.target.checked }))} />
                Ativar cartão fidelidade (aparece no perfil público)
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs" style={{ color: "#425A70" }}>
                  Carimbos necessários
                  <input value={fidelidadeConfig.meta_carimbos} onChange={(e) => setFidelidadeConfig((f) => ({ ...f, meta_carimbos: e.target.value }))} type="number" min="1"
                    className="mt-1 font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full" style={{ borderColor: C.line }} />
                </label>
              </div>
              <label className="font-body text-xs" style={{ color: "#425A70" }}>
                Recompensa
                <input value={fidelidadeConfig.recompensa || ""} onChange={(e) => setFidelidadeConfig((f) => ({ ...f, recompensa: e.target.value }))} placeholder="Ex: 1 produto grátis"
                  className="mt-1 font-body text-sm border rounded-lg px-3 py-2.5 outline-none w-full" style={{ borderColor: C.line }} />
              </label>
              {statusFidelidadeConfig && statusFidelidadeConfig !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{statusFidelidadeConfig}</p>}
              {statusFidelidadeConfig === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Salvo!</p>}
              <button type="submit" disabled={salvandoFidelidadeConfig} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoFidelidadeConfig ? "Salvando..." : "Salvar regra"}
              </button>
            </form>

            <div className="rounded-2xl border p-5 max-w-md mb-6" style={{ borderColor: C.line }}>
              <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Marcar carimbo de um cliente</p>
              <div className="flex gap-2 mb-2">
                <input value={buscaFidelidadeTelefone} onChange={(e) => setBuscaFidelidadeTelefone(e.target.value)} placeholder="Telefone do cliente"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none flex-1" style={{ borderColor: C.line }} />
                <input value={buscaFidelidadeNome} onChange={(e) => setBuscaFidelidadeNome(e.target.value)} placeholder="Nome (1ª vez)"
                  className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none flex-1" style={{ borderColor: C.line }} />
              </div>
              <button onClick={() => buscarOuCriarClienteFidelidade(empresaId)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border w-full" style={{ borderColor: C.line, color: "#425A70" }}>
                Buscar / cadastrar cliente
              </button>
              {erroAcaoFidelidade && <p className="font-body text-xs mt-2" style={{ color: "#B4462F" }}>{erroAcaoFidelidade}</p>}
              {clienteFidelidade === undefined && <p className="font-body text-xs mt-2" style={{ color: "#5C7186" }}>Buscando...</p>}
              {clienteFidelidade && (
                <div className="mt-3 rounded-xl p-3" style={{ background: C.blueTint2 }}>
                  <p className="font-body text-sm font-bold" style={{ color: C.ink }}>{clienteFidelidade.nome || clienteFidelidade.telefone}</p>
                  <p className="font-body text-xs mt-0.5" style={{ color: "#425A70" }}>
                    {clienteFidelidade.carimbos} de {fidelidadeConfig.meta_carimbos} carimbos
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={darCarimbo} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 text-white" style={{ background: "#25A85B" }}>+1 carimbo</button>
                    {clienteFidelidade.carimbos >= fidelidadeConfig.meta_carimbos && (
                      <button onClick={resgatarFidelidade} className="font-body text-xs font-bold rounded-lg px-3 py-1.5 text-white" style={{ background: C.amber, color: C.blueDeep }}>Resgatar e zerar</button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="max-w-md">
              <p className="font-display font-bold text-sm mb-2" style={{ color: C.ink }}>Clientes cadastrados</p>
              <div className="flex flex-col gap-2">
                {(meusClientesFidelidade ?? []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: C.line }}>
                    <span className="font-body text-xs" style={{ color: "#425A70" }}>{c.nome || c.telefone}</span>
                    <span className="font-body text-xs font-bold" style={{ color: C.blue }}>{c.carimbos}/{fidelidadeConfig.meta_carimbos}</span>
                  </div>
                ))}
                {(meusClientesFidelidade ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nenhum cliente cadastrado ainda.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "avaliacoes" && (
          <div>
            <SectionHeader eyebrow="Reputação" title="Avaliações" sub="O que os clientes estão dizendo — responda pra mostrar que você se importa" />
            {erroRespostaAvaliacao && <p className="font-body text-xs mb-3" style={{ color: "#B4462F" }}>{erroRespostaAvaliacao}</p>}
            <div className="flex flex-col gap-3 max-w-xl">
              {(minhasAvaliacoes ?? []).map((a) => (
                <div key={a.id} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{a.nome}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} fill={n <= a.nota ? "#E8A23D" : "none"} color="#E8A23D" />)}
                    </div>
                  </div>
                  {a.comentario && <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{a.comentario}</p>}
                  {a.resposta_comerciante ? (
                    <div className="mt-2 rounded-lg px-2.5 py-2" style={{ background: C.blueTint2 }}>
                      <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>Sua resposta</p>
                      <p className="font-body text-[11px]" style={{ color: "#425A70" }}>{a.resposta_comerciante}</p>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input value={respostaAvaliacao[a.id] || ""} onChange={(e) => setRespostaAvaliacao((r) => ({ ...r, [a.id]: e.target.value }))}
                        placeholder="Responder este cliente..." className="flex-1 font-body text-xs border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
                      <button onClick={() => enviarRespostaAvaliacao(a.id)} disabled={enviandoRespostaId === a.id}
                        className="font-body text-xs font-bold rounded-lg px-3 py-2 text-white disabled:opacity-60" style={{ background: C.blue }}>
                        Responder
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(minhasAvaliacoes ?? []).length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Ainda não recebeu nenhuma avaliação.</p>}
            </div>
          </div>
        )}

        {tab === "visualizacoes" && (
          <div>
            <SectionHeader eyebrow="Desempenho" title="Visualizações e Plano Premium" sub="Contagem real de acessos à ficha da sua empresa" />
            <div className="rounded-2xl border p-5 max-w-xs mb-6" style={{ borderColor: C.line }}>
              <p className="font-display font-extrabold text-3xl" style={{ color: C.blue }}>{visualizacoesEmpresa ?? "—"}</p>
              <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>Total de visualizações desde o cadastro</p>
            </div>

            {planoPremiumEmpresa.ativo ? (
              <div>
                <div className="rounded-2xl border p-4 mb-5 flex items-center gap-2 w-fit" style={{ borderColor: "#E8A23D", background: "#FFF9EE" }}>
                  <Sparkles size={16} color="#C6811F" />
                  <div>
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Plano Premium ativo</p>
                    <p className="font-body text-[11px]" style={{ color: "#8A5A12" }}>{planoPremiumEmpresa.ate ? `Válido até ${planoPremiumEmpresa.ate}` : "Sem data de expiração"}</p>
                  </div>
                </div>
                <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Relatório de desempenho</p>
                <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
                  <div className="rounded-xl border p-3.5" style={{ borderColor: C.line }}>
                    <p className="font-display font-extrabold text-xl" style={{ color: C.ink }}>{(meusProdutosReais ?? []).filter((p) => p.ativo).length}</p>
                    <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>Produtos ativos no catálogo</p>
                  </div>
                  <div className="rounded-xl border p-3.5" style={{ borderColor: C.line }}>
                    <p className="font-display font-extrabold text-xl" style={{ color: C.ink }}>{(minhasAvaliacoes ?? []).length}</p>
                    <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>
                      Avaliações recebidas{(minhasAvaliacoes ?? []).length > 0 ? ` · média ${(minhasAvaliacoes.reduce((s, a) => s + (a.nota || 0), 0) / minhasAvaliacoes.length).toFixed(1)}` : ""}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3.5" style={{ borderColor: C.line }}>
                    <p className="font-display font-extrabold text-xl" style={{ color: C.ink }}>{(meusCupons ?? []).filter((c) => c.ativo).length}</p>
                    <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>Cupons de desconto ativos</p>
                  </div>
                  <div className="rounded-xl border p-3.5" style={{ borderColor: C.line }}>
                    <p className="font-display font-extrabold text-xl" style={{ color: C.ink }}>{(meusCombos ?? []).filter((c) => c.ativo).length}</p>
                    <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>Combos ativos</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border p-5 max-w-lg" style={{ borderColor: C.line, background: C.blueTint2 }}>
                <p className="font-display font-bold text-sm flex items-center gap-1.5" style={{ color: C.ink }}><Sparkles size={15} color="#C6811F" /> Plano Premium</p>
                <p className="font-body text-sm mt-1.5" style={{ color: "#425A70" }}>
                  Selo Premium fixo na sua ficha, mais fotos na galeria (até {LIMITE_FOTOS_PREMIUM} em vez de {LIMITE_FOTOS_GRATUITO}) e este relatório de desempenho detalhado.
                </p>
                <a href={`https://wa.me/55${String(siteConfig?.whatsapp_contato || "").replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Quero saber mais sobre o Plano Premium do Conecta Comércio.")}`}
                  target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg px-4 py-2.5 text-white" style={{ background: C.blue }}>
                  <MessageCircle size={13} /> Quero ser Premium
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {modalProdutoAberto && <ModalNovoProduto onFechar={() => setModalProdutoAberto(false)} onSalvo={() => carregarMeusProdutos(empresaId)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de cadastro de feirante — nome, contato, redes sociais e até 5 fotos
// dos produtos oferecidos.
// ---------------------------------------------------------------------------
function ModalCadastroFeirante({ onFechar }) {
  const categoriasReaisModal = useCategoriasReais();
  const [fotos, setFotos] = useState([]); // [{ nome, previewUrl, arquivo }]
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  const adicionarFotos = (e) => {
    const arquivos = Array.from(e.target.files || []);
    const espacoLivre = 5 - fotos.length;
    const selecionados = arquivos.slice(0, espacoLivre);
    selecionados.forEach((arquivo) => {
      const previewUrl = URL.createObjectURL(arquivo);
      setFotos((atual) => [...atual, { nome: arquivo.name, previewUrl, arquivo }]);
    });
  };

  const removerFoto = (i) => setFotos((atual) => atual.filter((_, idx) => idx !== i));

  const submeter = async (e) => {
    e.preventDefault();
    setErro("");
    const form = new FormData(e.target);

    if (!supabaseConfigurado) {
      setEnviado(true);
      return;
    }

    setEnviando(true);
    try {
      const urls = [];
      for (const f of fotos) {
        const caminho = `feirantes/${Date.now()}-${f.nome}`;
        const { error: erroUpload } = await supabase.storage.from("fotos-feirantes").upload(caminho, f.arquivo);
        if (erroUpload) throw erroUpload;
        const { data: pub } = supabase.storage.from("fotos-feirantes").getPublicUrl(caminho);
        urls.push(pub.publicUrl);
      }

      const { error } = await supabase.from("feirantes").insert({
        nome: form.get("nome"),
        produto: form.get("produto"),
        instagram: form.get("instagram"),
        whatsapp: form.get("whatsapp"),
        categoria: form.get("categoria"),
        descricao: form.get("descricao"),
        fotos_urls: urls,
        possui_mei: form.get("possui_mei") === "on",
        status: "pendente",
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      setErro(err.message || "Não foi possível enviar seu cadastro agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
              <PartyPopper size={17} />
            </span>
            <p className="font-display font-bold text-base" style={{ color: C.ink }}>Cadastro de feirante</p>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint2 }} aria-label="Fechar">
            <X size={16} color="#425A70" />
          </button>
        </div>

        <div className="p-5">
          {!supabaseConfigurado && (
            <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
              <BadgeCheck size={14} className="mt-0.5 shrink-0" />
              Modo demonstração: conecte o Supabase para o cadastro ser salvo de verdade.
            </div>
          )}
          {erro && (
            <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs" style={{ background: "#FBEAE5", color: "#B4462F" }}>{erro}</div>
          )}

          {enviado ? (
            <div className="py-8 text-center">
              <span className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.blueTint }}>
                <CheckCircle2 size={26} color={C.blue} />
              </span>
              <p className="font-display font-bold text-lg" style={{ color: C.ink }}>Cadastro enviado!</p>
              <p className="font-body text-sm mt-1" style={{ color: "#5C7186" }}>
                A organização da feira vai analisar e entrar em contato pelo WhatsApp.
              </p>
              <button onClick={onFechar} className="glow-btn font-body text-sm font-bold text-white rounded-xl py-2.5 px-5 mt-5" style={{ background: C.blue }}>
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={submeter} className="flex flex-col gap-3.5">
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Nome completo
                <input name="nome" required placeholder="Seu nome" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>

              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                O que você vende na feira?
                <input name="produto" required placeholder="Ex: doces caseiros, artesanato, roupas..." className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  WhatsApp
                  <input name="whatsapp" required placeholder="(44) 90000-0000" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Instagram (opcional)
                  <input name="instagram" placeholder="@seuperfil" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>

              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Categoria (opcional)
                <select name="categoria" defaultValue="" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                  <option value="">Selecione</option>
                  {(categoriasReaisModal ?? []).map((c) => <option key={c.id || c.nome} value={c.nome}>{c.nome}</option>)}
                </select>
              </label>

              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Descrição breve (opcional)
                <textarea name="descricao" rows={2} placeholder="Conte um pouco sobre o que você vende" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none resize-none" style={{ borderColor: C.line }} />
              </label>

              <label className="font-body text-xs font-semibold flex items-center gap-2 cursor-pointer" style={{ color: "#425A70" }}>
                <input type="checkbox" name="possui_mei" />
                Já tenho MEI (Microempreendedor Individual)
              </label>

              <div>
                <p className="font-body text-xs font-semibold mb-1.5" style={{ color: "#425A70" }}>
                  Fotos do que você oferece <span style={{ color: "#B7C6D6" }}>(até 5)</span>
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {fotos.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border" style={{ borderColor: C.line }}>
                      <img loading="lazy" decoding="async" src={f.previewUrl} alt={f.nome} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removerFoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                        <X size={10} color="#fff" />
                      </button>
                    </div>
                  ))}
                  {fotos.length < 5 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer" style={{ borderColor: C.line }}>
                      <Camera size={18} color="#B7C6D6" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={adicionarFotos} />
                    </label>
                  )}
                </div>
              </div>

              <button type="submit" disabled={enviando} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-3 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {enviando ? "Enviando..." : "Enviar cadastro"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Banner de promoções em destaque — carrossel com autoplay das ofertas
// publicadas pelos comerciantes.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Banners de publicidade — imagem real cadastrada pelo admin (desktop e
// mobile, com período de validade). Antes essa tabela existia mas nunca
// era mostrada em lugar nenhum do site; agora aparece logo abaixo do Hero.
// ---------------------------------------------------------------------------
function PublicidadeBanners({ posicao = "geral", compacto = false }) {
  const [banners, setBanners] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    const hoje = new Date().toISOString().slice(0, 10);
    supabase.from("banners").select("*").eq("ativo", true).eq("posicao", posicao).order("ordem")
      .then(({ data, error }) => {
        if (error) return;
        const validos = (data || []).filter((b) => {
          if (b.data_inicio && b.data_inicio > hoje) return false;
          if (b.data_fim && b.data_fim < hoje) return false;
          return !!b.imagem_url;
        });
        setBanners(validos);
      });
  }, [posicao]);

  if (!banners || banners.length === 0) return null;

  return (
    <section className={compacto ? "flex flex-col gap-3" : "max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-col gap-3"}>
      {banners.map((b) => {
        const imagem = (
          <picture>
            {b.imagem_mobile_url && <source media="(max-width: 640px)" srcSet={b.imagem_mobile_url} />}
            <img loading="lazy" decoding="async" src={b.imagem_url} alt={b.titulo || "Publicidade"}
              className={`w-full rounded-2xl object-cover ${compacto ? "h-28 sm:h-36" : "h-44 sm:h-64 md:h-80 lg:h-96"}`} />
          </picture>
        );
        const conteudo = (b.descricao || b.botao_texto) ? (
          <div className="relative rounded-2xl overflow-hidden">
            {imagem}
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6" style={{ background: "linear-gradient(0deg, rgba(5,26,46,0.75), rgba(5,26,46,0.05) 60%)" }}>
              {b.titulo && <p className="font-display font-bold text-white text-base sm:text-xl">{b.titulo}</p>}
              {b.descricao && <p className="font-body text-white/85 text-xs sm:text-sm mt-1 max-w-md">{b.descricao}</p>}
              {b.botao_texto && (
                <span className="glow-btn mt-3 w-fit font-body text-xs font-bold text-white rounded-lg px-4 py-2" style={{ background: C.blue }}>
                  {b.botao_texto}
                </span>
              )}
            </div>
          </div>
        ) : imagem;
        return b.link_url ? (
          <a key={b.id} href={b.link_url} target="_blank" rel="noreferrer" className="block">{conteudo}</a>
        ) : (
          <div key={b.id}>{conteudo}</div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Capa de comerciante em destaque — espaço de publicidade paga, com rótulo
// "Publicidade" visível (transparência com quem visita o site).
// ---------------------------------------------------------------------------
function CapaComercianteDestaque({ empresas, onAbrir }) {
  const [indice, setIndice] = useState(0);
  const patrocinadas = (empresas || []).filter(patrocinadoAtivo);

  useEffect(() => {
    if (patrocinadas.length === 0) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % patrocinadas.length), 6000);
    return () => clearInterval(t);
  }, [patrocinadas.length]);

  if (patrocinadas.length === 0) return null;
  const c = patrocinadas[indice % patrocinadas.length];
  const linkWhats = c.whatsapp ? `https://wa.me/55${String(c.whatsapp).replace(/\D/g, "")}` : null;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4">
      <Reveal>
        <div className="glow-card rounded-3xl overflow-hidden relative border-2" style={{ background: `linear-gradient(100deg, #14324F, ${C.blueDeep} 55%, ${C.blue})`, borderColor: C.amber, boxShadow: `0 0 0 4px rgba(232,162,61,0.15), 0 20px 45px -15px rgba(10,90,168,0.5)` }}>
          <div aria-hidden="true" className="tech-grid absolute inset-0 pointer-events-none opacity-60" />
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="blob absolute -bottom-20 right-[-2rem] w-72 h-72 rounded-full" style={{ background: C.blue, opacity: 0.35 }} />
          </div>

          <span className="ring-pulse absolute top-0 left-6 -translate-y-1/2 flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5 font-display text-[10px] font-extrabold uppercase tracking-wide"
            style={{ background: C.amber, color: C.blueDeep }}>
            <Sparkles size={11} /> Destaque
          </span>

          <div key={indice} className="promo-slide relative flex flex-col sm:flex-row items-center gap-6 p-7 md:p-10 pt-9">
            <span className="absolute top-4 right-4 font-body text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)" }}>
              Publicidade
            </span>

            <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              {c.logo_url ? (
                <img loading="lazy" decoding="async" src={c.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 size={42} color="#fff" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.amber, color: C.blueDeep }}>
                  {c.cat}
                </span>
                <span className="font-body text-[11px] text-white/60">{c.bairro ? `${c.bairro}, ` : ""}Ivatuba</span>
              </div>
              <p className="font-display font-extrabold text-white text-2xl md:text-3xl">{c.nome}</p>
              {c.endereco && <p className="font-body text-sm text-white/75 mt-1.5 max-w-md">{c.endereco}</p>}
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
              <a href={linkWhats || "#"} target={linkWhats ? "_blank" : undefined} rel="noreferrer"
                className="glow-btn font-body font-bold text-xs rounded-xl px-5 py-3 flex items-center justify-center gap-1.5 text-white"
                style={{ background: "#25A85B", opacity: linkWhats ? 1 : 0.5 }}>
                <MessageCircle size={14} /> WhatsApp
              </a>
              <button onClick={() => onAbrir?.(c)} className="font-body font-bold text-xs rounded-xl px-5 py-3 flex items-center justify-center gap-1.5 border border-white/25 text-white">
                Ver perfil
              </button>
            </div>
          </div>

          {patrocinadas.length > 1 && (
            <div className="relative flex justify-center gap-1.5 pb-4">
              {patrocinadas.map((_, i) => (
                <button key={i} onClick={() => setIndice(i)} aria-label={`Anunciante ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{ width: i === indice ? 18 : 6, height: 6, background: i === indice ? C.amber : "rgba(255,255,255,0.3)" }} />
              ))}
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}

function BannerPromocoes() {
  const [indice, setIndice] = useState(0);
  const [promocoesReais, setPromocoesReais] = useState(null); // null = carregando

  useEffect(() => {
    if (!supabaseConfigurado) { setPromocoesReais([]); return; }
    const hoje = new Date().toISOString().slice(0, 10);
    supabase.from("promocoes").select("*, produtos(nome, preco, empresas(nome, whatsapp))").eq("ativa", true)
      .then(({ data, error }) => {
        if (error) { setPromocoesReais([]); return; }
        const validas = (data || [])
          .filter((p) => (!p.data_inicio || p.data_inicio <= hoje) && (!p.valida_ate || p.valida_ate >= hoje))
          .map((p) => ({
            empresa: p.produtos?.empresas?.nome || p.nome || "Comércio local",
            produto: p.nome || p.produtos?.nome || "Promoção",
            precoOriginal: Number(p.produtos?.preco ?? 0),
            precoPromo: Number(p.produtos?.preco ?? 0) * (1 - Number(p.desconto_percentual) / 100),
            validoAte: p.valida_ate ? new Date(p.valida_ate + "T00:00:00").toLocaleDateString("pt-BR") : "",
            whatsapp: p.produtos?.empresas?.whatsapp || null,
          }));
        setPromocoesReais(validas);
      });
  }, []);

  useEffect(() => {
    if (!promocoesReais || promocoesReais.length === 0) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % promocoesReais.length), 4500);
    return () => clearInterval(t);
  }, [promocoesReais]);

  if (!promocoesReais || promocoesReais.length === 0) return null;

  const promo = promocoesReais[indice];
  const linkWhats = promo.whatsapp ? `https://wa.me/55${String(promo.whatsapp).replace(/\D/g, "")}` : null;
  const desconto = promo.precoOriginal > 0 ? Math.round((1 - promo.precoPromo / promo.precoOriginal) * 100) : 0;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 -mt-7 relative z-20">
      <Reveal>
        <div className="glow-card rounded-3xl overflow-hidden shadow-2xl relative" style={{ background: `linear-gradient(115deg, ${C.blueDeep}, ${C.blue})` }}>
          <div aria-hidden="true" className="tech-grid absolute inset-0 pointer-events-none" />
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="blob blob-b absolute -top-12 right-[-3rem] w-56 h-56 rounded-full" style={{ background: C.amber, opacity: 0.3 }} />
            <div className="scan-line absolute top-0 bottom-0 w-24" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)" }} />
          </div>

          <div className="relative flex flex-col sm:flex-row items-stretch">
            <div key={indice} className="promo-slide flex-1 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="ring-pulse flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold font-display" style={{ background: C.amber, color: C.blueDeep }}>
                  <Tag size={11} /> -{desconto}%
                </span>
                <span className="font-body text-[11px] text-white/70">Promoção de {promo.empresa}</span>
              </div>
              <p className="font-display font-extrabold text-white text-xl md:text-2xl leading-snug">{promo.produto}</p>
              <div className="price-pop flex items-baseline gap-2 mt-2">
                <span className="font-body text-sm text-white/50 line-through">R$ {promo.precoOriginal.toFixed(2).replace(".", ",")}</span>
                <span className="font-display font-extrabold text-2xl" style={{ color: C.amber }}>R$ {promo.precoPromo.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="font-body text-[11px] text-white/60 mt-1">Válida até {promo.validoAte}</p>

              <div className="flex items-center gap-3 mt-5">
                <a href={linkWhats || "#"} target={linkWhats ? "_blank" : undefined} rel="noreferrer" className="glow-btn font-body font-bold text-sm rounded-xl px-5 py-2.5 flex items-center gap-2" style={{ background: "#25A85B", color: "#fff", opacity: linkWhats ? 1 : 0.5 }}>
                  <MessageCircle size={15} /> Chamar no WhatsApp
                </a>
                <div className="flex gap-1.5">
                  {promocoesReais.map((_, i) => (
                    <button key={i} onClick={() => setIndice(i)} aria-label={`Promoção ${i + 1}`}
                      className="rounded-full transition-all"
                      style={{ width: i === indice ? 18 : 6, height: 6, background: i === indice ? C.amber : "rgba(255,255,255,0.35)" }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden sm:flex w-40 md:w-56 items-center justify-center shrink-0 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <ShoppingBag key={`icon-${indice}`} className="promo-slide" size={40} color="rgba(255,255,255,0.6)" />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Calendário de eventos — só leitura no site público. As datas são geradas
// e mantidas só pelo administrador (aba "Calendário de eventos" no painel).
// ---------------------------------------------------------------------------
// Gera e baixa um arquivo .ics (lembrete de evento) — abre direto no
// Google Agenda, Outlook, Apple Calendar etc, sem precisar de servidor.
function baixarLembreteEvento(ev) {
  if (!ev?.data_inicio) return;
  const dataBase = ev.data_inicio.replace(/-/g, "");
  const horaBase = ev.hora ? ev.hora.replace(":", "") + "00" : "090000";
  const dtStart = `${dataBase}T${horaBase}`;
  const conteudo = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Conecta Comercio//PT-BR", "BEGIN:VEVENT",
    `UID:${ev.id}@conectacomercio`,
    `DTSTAMP:${dtStart}Z`,
    `DTSTART:${dtStart}`,
    `SUMMARY:${(ev.titulo || "Evento").replace(/\n/g, " ")}`,
    `LOCATION:${(ev.local || "").replace(/\n/g, " ")}`,
    `DESCRIPTION:Evento do Conecta Comercio${ev.link_inscricao ? " - " + ev.link_inscricao : ""}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([conteudo], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(ev.titulo || "evento").replace(/[^a-z0-9]+/gi, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CalendarioEventos() {
  const [eventos, setEventos] = useState(null); // null = carregando/indisponível

  // Cursos ficam numa tabela separada (cadastro próprio, na aba Cursos), mas
  // precisam aparecer aqui no calendário também, sem o admin precisar
  // cadastrar o mesmo curso duas vezes — por isso buscamos os dois e
  // juntamos numa lista só, no mesmo formato usado pelo calendário.
  useEffect(() => {
    if (!supabaseConfigurado) return;
    Promise.all([
      supabase.from("eventos_calendario").select("*").order("data_inicio"),
      supabase.from("cursos").select("*").order("data_inicio"),
    ]).then(([{ data: eventosData, error: erroEventos }, { data: cursosData, error: erroCursos }]) => {
      const listaEventos = !erroEventos && eventosData ? eventosData : [];
      const listaCursos = !erroCursos && cursosData
        ? cursosData.map((c) => ({
            id: `curso-${c.id}`,
            titulo: c.titulo,
            data_inicio: c.data_inicio,
            local: c.local || c.instituicao || "",
            tipo: "curso",
            link_inscricao: c.link_inscricao || null,
            banner_url: c.banner_url || null,
          }))
        : [];
      if (!erroEventos || !erroCursos) setEventos([...listaEventos, ...listaCursos]);
    });
  }, []);

  // Participação confirmada — qualquer um clica em "Vou participar", informa
  // o nome, e isso conta pro organizador saber quantas pessoas esperar. A
  // contagem pública não expõe nome/telefone de ninguém (função no banco).
  const [confirmados, setConfirmados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc_eventos_confirmados") || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("cc_eventos_confirmados", JSON.stringify(confirmados)); } catch {} }, [confirmados]);
  const [contagemPresenca, setContagemPresenca] = useState({}); // { [eventoId]: n }
  const [formPresencaAberto, setFormPresencaAberto] = useState(null);
  const [nomePresenca, setNomePresenca] = useState("");
  const [telefonePresenca, setTelefonePresenca] = useState("");
  const [enviandoPresenca, setEnviandoPresenca] = useState(false);

  const carregarContagemPresenca = (idsEventos) => {
    if (!supabaseConfigurado) return;
    idsEventos.forEach((id) => {
      if (contagemPresenca[id] !== undefined) return;
      supabase.rpc("contar_participantes", { p_evento_id: id }).then(({ data, error }) => {
        if (!error) setContagemPresenca((atual) => ({ ...atual, [id]: data ?? 0 }));
      });
    });
  };

  const confirmarPresenca = async (evento) => {
    if (!nomePresenca.trim()) return;
    setEnviandoPresenca(true);
    try {
      const { error } = await supabase.from("evento_participantes").insert({
        evento_id: evento.id, nome: nomePresenca, telefone: telefonePresenca || null,
      });
      if (error) throw error;
      setConfirmados((atual) => ({ ...atual, [evento.id]: true }));
      setContagemPresenca((atual) => ({ ...atual, [evento.id]: (atual[evento.id] ?? 0) + 1 }));
      setFormPresencaAberto(null);
      setNomePresenca("");
      setTelefonePresenca("");
    } catch {
      // silencioso — se der erro, a pessoa pode tentar de novo
    } finally {
      setEnviandoPresenca(false);
    }
  };

  const eventosDemo = [
    { id: "d1", titulo: feirasEspeciais[0]?.titulo || "Feira Junina do Empreendedor", data_inicio: "2026-08-15", local: feirasEspeciais[0]?.local || "Praça Central", tipo: "feira" },
    { id: "d2", titulo: "Formalização do MEI na prática", data_inicio: "2026-08-12", local: "Sala do Empreendedor", tipo: "curso" },
    { id: "d3", titulo: "Vendas pelo WhatsApp e redes sociais", data_inicio: "2026-08-20", local: "Sebrae Maringá", tipo: "curso" },
  ];

  const lista = eventos ?? eventosDemo;

  const [mesAtual, setMesAtual] = useState(() => {
    const primeiraData = [...lista].filter((e) => e.data_inicio).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))[0]?.data_inicio;
    const d = primeiraData ? new Date(`${primeiraData}T00:00:00`) : new Date();
    d.setDate(1);
    return d;
  });
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  const porDia = useMemo(() => {
    const mapa = {};
    lista.forEach((ev) => {
      if (!ev.data_inicio) return;
      const chave = ev.data_inicio.slice(0, 10);
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(ev);
    });
    return mapa;
  }, [lista]);

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const celulas = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)];
  const chaveDia = (dia) => `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const hojeChave = new Date().toISOString().slice(0, 10);
  const eventosDoDia = diaSelecionado ? (porDia[chaveDia(diaSelecionado)] || []) : null;

  const proximosEventos = [...lista]
    .filter((ev) => ev.data_inicio && ev.data_inicio >= hojeChave)
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
    .slice(0, 5);

  const eventosPassados = [...lista]
    .filter((ev) => ev.data_inicio && ev.data_inicio < hojeChave)
    .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio))
    .slice(0, 5);

  const [mostrarPassados, setMostrarPassados] = useState(false);

  const rotuloTipo = { feira: "Feira", curso: "Curso", festa: "Festa", institucional: "Institucional", outro: "Evento" };
  const corTipo = { feira: C.amberDark, curso: C.blue, festa: "#C6389E", institucional: C.blueDeep, outro: "#5C7186" };
  const formatarData = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

  const listaVisivel = eventosDoDia ?? proximosEventos;
  useEffect(() => {
    if (!supabaseConfigurado) return;
    const ids = listaVisivel.map((ev) => ev.id).filter((id) => typeof id === "string" && !id.startsWith("d") && !id.startsWith("curso-"));
    if (ids.length > 0) carregarContagemPresenca(ids);
  }, [listaVisivel.map((e) => e.id).join(",")]);

  return (
    <div className="rounded-2xl border p-5 bg-white" style={{ borderColor: C.line }}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setMesAtual((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
          className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: C.line }}>
          <ChevronLeft size={15} color="#425A70" />
        </button>
        <p className="font-display font-bold text-sm capitalize" style={{ color: C.ink }}>
          {mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <button type="button" onClick={() => setMesAtual((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
          className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: C.line }}>
          <ChevronRight size={15} color="#425A70" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <p key={i} className="font-body text-[10px] font-bold text-center" style={{ color: "#B7C6D6" }}>{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((dia, i) => {
          if (!dia) return <div key={i} />;
          const chave = chaveDia(dia);
          const temEvento = !!(porDia[chave] && porDia[chave].length);
          const ehHoje = chave === hojeChave;
          const selecionado = diaSelecionado === dia;
          return (
            <button key={i} type="button" onClick={() => setDiaSelecionado(selecionado ? null : dia)}
              className="aspect-square rounded-lg flex items-center justify-center relative font-body text-xs border"
              style={{
                background: selecionado ? C.blue : ehHoje ? C.blueTint : temEvento ? C.blueTint2 : "transparent",
                borderColor: temEvento && !selecionado ? C.blue : "transparent",
                color: selecionado ? "#fff" : temEvento ? C.blue : C.ink,
                fontWeight: ehHoje || selecionado || temEvento ? 700 : 500,
              }}>
              {dia}
              {temEvento && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: selecionado ? "#fff" : C.blue }} />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: C.line }}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: "#5C7186" }}>
            {eventosDoDia ? `Eventos do dia ${diaSelecionado}` : mostrarPassados ? "Eventos que já aconteceram" : "Próximos eventos"}
          </p>
          {!eventosDoDia && (
            <button type="button" onClick={() => setMostrarPassados((v) => !v)} className="font-body text-[10px] font-bold" style={{ color: C.blue }}>
              {mostrarPassados ? "Ver próximos" : "Ver já aconteceram"}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          {(eventosDoDia ?? (mostrarPassados ? eventosPassados : proximosEventos)).length === 0 && (
            <p className="font-body text-xs" style={{ color: "#B7C6D6" }}>
              {mostrarPassados && !eventosDoDia ? "Nenhum evento passado registrado." : "Nenhum evento nessa data."}
            </p>
          )}
          {(eventosDoDia ?? (mostrarPassados ? eventosPassados : proximosEventos)).map((ev) => (
            <div key={ev.id} className="flex items-start gap-2.5">
              {ev.banner_url ? (
                <img loading="lazy" decoding="async" src={ev.banner_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: corTipo[ev.tipo] || "#5C7186" }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-body text-xs font-semibold truncate flex items-center gap-1.5" style={{ color: C.ink }}>
                  {ev.titulo}
                  {ev.data_inicio && ev.data_inicio < hojeChave && (
                    <span className="font-body text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#EAF0F7", color: "#5C7186" }}>Já aconteceu</span>
                  )}
                  {ev.status === "cancelado" && <span className="font-body text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FBEAE5", color: "#B4462F" }}>Cancelado</span>}
                  {ev.status === "adiado" && <span className="font-body text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FFF6E9", color: "#8A5A12" }}>Adiado</span>}
                </p>
                <p className="font-body text-[10px]" style={{ color: "#5C7186" }}>
                  {formatarData(ev.data_inicio)}{ev.hora ? ` · ${ev.hora}` : ""}{ev.local ? ` · ${ev.local}` : ""} · {rotuloTipo[ev.tipo] || "Evento"}
                </p>
                {ev.relato && (
                  <div className="mt-1.5 rounded-lg p-2" style={{ background: C.blueTint2 }}>
                    <p className="font-body text-[9px] font-bold uppercase tracking-wide" style={{ color: C.blue }}>Como foi</p>
                    <p className="font-body text-[11px] mt-0.5" style={{ color: "#425A70" }}>{ev.relato}</p>
                    {ev.relato_fotos?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {ev.relato_fotos.map((url, i) => (
                          <img key={i} loading="lazy" decoding="async" src={url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {ev.link_inscricao && (
                    <a href={ev.link_inscricao} target="_blank" rel="noopener noreferrer" className="font-body text-[10px] font-bold flex items-center gap-1" style={{ color: C.blue }}>
                      <ExternalLink size={10} /> Inscreva-se
                    </a>
                  )}
                  {ev.google_maps_url && (
                    <a href={ev.google_maps_url} target="_blank" rel="noopener noreferrer" className="font-body text-[10px] font-bold flex items-center gap-1" style={{ color: C.blue }}>
                      <MapPin size={10} /> Ver no mapa
                    </a>
                  )}
                  {ev.status !== "cancelado" && (
                    <button onClick={() => baixarLembreteEvento(ev)} className="font-body text-[10px] font-bold flex items-center gap-1" style={{ color: "#425A70" }}>
                      <CalendarDays size={10} /> Lembrete
                    </button>
                  )}
                  {ev.status !== "cancelado" && ev.tipo !== "curso" && supabaseConfigurado && (
                    confirmados[ev.id] ? (
                      <span className="font-body text-[10px] font-bold flex items-center gap-1" style={{ color: "#1E8E5A" }}>
                        <CheckCircle2 size={10} /> Presença confirmada
                      </span>
                    ) : (
                      <button onClick={() => setFormPresencaAberto(formPresencaAberto === ev.id ? null : ev.id)} className="font-body text-[10px] font-bold flex items-center gap-1" style={{ color: C.blue }}>
                        <Users size={10} /> Vou participar
                      </button>
                    )
                  )}
                  {contagemPresenca[ev.id] > 0 && (
                    <span className="font-body text-[10px]" style={{ color: "#5C7186" }}>{contagemPresenca[ev.id]} {contagemPresenca[ev.id] === 1 ? "confirmado" : "confirmados"}</span>
                  )}
                </div>
                {formPresencaAberto === ev.id && (
                  <div className="flex flex-col gap-1.5 mt-2 p-2.5 rounded-lg" style={{ background: C.blueTint2 }}>
                    <input value={nomePresenca} onChange={(e) => setNomePresenca(e.target.value)} placeholder="Seu nome"
                      className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                    <input value={telefonePresenca} onChange={(e) => setTelefonePresenca(e.target.value)} placeholder="WhatsApp (opcional)"
                      className="font-body text-xs border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                    <button onClick={() => confirmarPresenca(ev)} disabled={enviandoPresenca || !nomePresenca.trim()} className="font-body text-xs font-bold rounded-lg py-1.5 text-white disabled:opacity-60" style={{ background: C.blue }}>
                      {enviandoPresenca ? "Confirmando..." : "Confirmar presença"}
                    </button>
                  </div>
                )}
                {ev.link_inscricao && (
                  <img loading="lazy" decoding="async"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(ev.link_inscricao)}`}
                    alt="QR Code de inscrição" className="w-12 h-12 mt-1.5 rounded" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carrossel do Hero — o antigo carimbo estático "Compre em Ivatuba" agora
// gira entre esse carimbo de boas-vindas e destaques reais (empresa em
// destaque, produto em promoção), com troca suave via Framer Motion e
// arraste no touch. Se não houver dados reais ainda, mostra só o carimbo.
// ---------------------------------------------------------------------------
function HeroCarousel({ slides }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => { if (indice >= slides.length) setIndice(0); }, [slides.length, indice]);

  useEffect(() => {
    if (pausado || slides.length <= 1) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [pausado, slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[indice];
  const Icon = slide.icon;
  const trocar = (dir) => setIndice((i) => (i + dir + slides.length) % slides.length);

  return (
    <div className="hero-in-right relative hidden md:flex flex-col items-center justify-center h-full w-full"
      onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
      <AnimatePresence mode="wait">
        <motion.button
          key={indice}
          type="button"
          onClick={slide.onClick}
          initial={{ opacity: 0, scale: 0.9, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          exit={{ opacity: 0, scale: 0.9, rotate: -2 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(e, info) => {
            if (info.offset.x < -50) trocar(1);
            else if (info.offset.x > 50) trocar(-1);
          }}
          className={`ring-pulse w-56 h-56 rounded-full border-4 border-dashed flex items-center justify-center text-center overflow-hidden ${slide.onClick ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
          style={{ borderColor: "rgba(255,255,255,0.5)", backgroundImage: slide.foto_url ? `url(${slide.foto_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="p-6 rounded-full w-full h-full flex flex-col items-center justify-center" style={slide.foto_url ? { background: "rgba(5,26,46,0.55)" } : undefined}>
            {Icon && <Icon size={28} color="#fff" className="mx-auto mb-2" />}
            <p className="font-display font-extrabold text-white text-sm leading-tight whitespace-pre-line line-clamp-2">{slide.titulo}</p>
            <p className="font-body text-white/70 text-[10px] mt-1 tracking-wide">{slide.subtitulo}</p>
          </div>
        </motion.button>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="flex gap-1.5 mt-5">
          {slides.map((_, i) => (
            <button key={i} type="button" onClick={() => setIndice(i)} aria-label={`Ir para o slide ${i + 1}`}
              className="rounded-full transition-all duration-300" style={{ width: i === indice ? 18 : 6, height: 6, background: i === indice ? "#fff" : "rgba(255,255,255,0.35)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModalDetalheFeirante({ f, onFechar }) {
  const linkWhats = f.whatsapp ? `https://wa.me/55${String(f.whatsapp).replace(/\D/g, "")}` : null;
  const linkInsta = f.instagram ? `https://instagram.com/${String(f.instagram).replace(/^@/, "")}` : null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.6)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <div className="h-44 relative overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})` }}>
          {f.fotos_urls?.[0] ? (
            <img loading="lazy" decoding="async" src={f.fotos_urls[0]} alt={f.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><PartyPopper size={40} className="text-white/90" /></div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,26,46,0.75), rgba(5,26,46,0) 55%)" }} />
          <button onClick={onFechar} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/90" aria-label="Fechar"><X size={16} color="#425A70" /></button>
          <div className="absolute left-5 bottom-4 right-5">
            <p className="font-display font-extrabold text-lg text-white">{f.nome}</p>
            <p className="font-body text-xs font-semibold text-white/85 mt-0.5">{f.produto}</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {f.categoria && (
              <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>{f.categoria}</span>
            )}
            {(f.local || f.numero_estande) && (
              <span className="font-body text-xs flex items-center gap-1" style={{ color: "#8896A6" }}>
                <MapPin size={12} /> {[f.local, f.numero_estande ? `Barraca ${f.numero_estande}` : null].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          {f.descricao && <p className="font-body text-sm mt-3" style={{ color: "#425A70" }}>{f.descricao}</p>}

          {f.fotos_urls?.length > 1 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {f.fotos_urls.slice(1).map((url, i) => (
                <img key={i} loading="lazy" decoding="async" src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {linkWhats && (
              <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="glow-btn flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold font-body text-white" style={{ background: "#25A85B" }}>
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            {linkInsta && (
              <a href={linkInsta} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl py-3 px-4 text-sm font-bold font-body border" style={{ borderColor: C.line, color: C.blue }}>
                <Instagram size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteHome({ onAuth, logoUrl, frase, siteConfig, sessao, perfil }) {
  const { nomeCidade, nomeCidadeUF } = useCidade();
  const [menuOpen, setMenuOpen] = useState(false);
  const categoriasReaisHome = useCategoriasReais();

  // Cadastro de interessados na Fomento Paraná — nome + WhatsApp.
  const [fomentoNome, setFomentoNome] = useState("");
  const [fomentoWhatsapp, setFomentoWhatsapp] = useState("");
  const [fomentoDocumentos, setFomentoDocumentos] = useState([]);
  const [enviandoFomento, setEnviandoFomento] = useState(false);
  const [fomentoEnviado, setFomentoEnviado] = useState(false);
  const [erroFomento, setErroFomento] = useState("");

  const cadastrarInteresseFomento = async (e) => {
    e.preventDefault();
    setErroFomento("");
    if (!fomentoNome.trim() || !fomentoWhatsapp.trim()) { setErroFomento("Preencha nome e WhatsApp."); return; }
    if (!supabaseConfigurado) { setFomentoEnviado(true); return; }
    setEnviandoFomento(true);
    try {
      const pastaEnvio = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const caminhos = [];
      for (const arquivo of fomentoDocumentos) {
        const caminho = `${pastaEnvio}/${arquivo.name}`;
        const { error: erroUpload } = await supabase.storage.from("documentos-fomento").upload(caminho, arquivo);
        if (!erroUpload) caminhos.push(caminho);
      }
      const { error } = await supabase.from("fomento_leads").insert({ nome: fomentoNome, whatsapp: fomentoWhatsapp, documentos_urls: caminhos });
      if (error) throw error;
      setFomentoEnviado(true);
      setFomentoNome("");
      setFomentoWhatsapp("");
      setFomentoDocumentos([]);
    } catch (err) {
      setErroFomento(err.message || "Não consegui enviar agora. Tente de novo.");
    } finally {
      setEnviandoFomento(false);
    }
  };

  const linkWhatsFomento = siteConfig?.fomento_whatsapp
    ? `https://wa.me/55${String(siteConfig.fomento_whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Quero solicitar informações sobre as linhas de crédito da Fomento Paraná com o agente de crédito ${siteConfig?.fomento_agente_nome || "Gabriel Oliveira"}.`)}`
    : null;

  // Agência do Trabalhador — mesmo estilo de card do Fomento Paraná. FASE 41.
  const linkWhatsAgencia = siteConfig?.agencia_whatsapp
    ? `https://wa.me/55${String(siteConfig.agencia_whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vim pelo Conecta Comércio e quero falar com a Agência do Trabalhador.")}`
    : null;

  // Editais e licitações abertas — lista pública + cadastro de quem quer
  // ser avisado de novos editais. FASE 41.
  const [licitacoesPublicas, setLicitacoesPublicas] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("licitacoes").select("*").or("ativo.eq.true,resultado.not.is.null").order("data_limite", { ascending: true, nullsFirst: false }).then(({ data, error }) => {
      if (!error) setLicitacoesPublicas(data || []);
    });
  }, []);
  const licitacoesAbertasPublicas = (licitacoesPublicas ?? []).filter((l) => l.ativo && !l.resultado);
  const licitacoesComResultadoPublicas = (licitacoesPublicas ?? []).filter((l) => l.resultado);

  // Sala do Empreendedor — números oficiais divulgados publicamente (ano
  // mais recente que já tenha algum total lançado).
  const [totaisSalaPublicos, setTotaisSalaPublicos] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("sala_atendimentos_totais").select("*").then(({ data, error }) => {
      if (!error) setTotaisSalaPublicos(data || []);
    });
  }, []);
  const anosSalaPublico = useMemo(() => {
    if (!totaisSalaPublicos) return [];
    return Array.from(new Set(totaisSalaPublicos.filter((r) => r.total > 0).map((r) => r.ano))).sort((a, b) => b - a);
  }, [totaisSalaPublicos]);
  const [anoSalaPublicoEscolhido, setAnoSalaPublicoEscolhido] = useState(null);
  const anoSalaPublico = anoSalaPublicoEscolhido ?? (anosSalaPublico.length > 0 ? anosSalaPublico[0] : null);
  const relatorioSalaPublico = useMemo(() => {
    if (!totaisSalaPublicos || anoSalaPublico === null) return { linhas: [], totaisMeses: Array(12).fill(0), totalGeral: 0 };
    const doAno = totaisSalaPublicos.filter((r) => r.ano === anoSalaPublico);
    const linhas = CATEGORIAS_SALA_EMPREENDEDOR.map((categoria) => {
      const meses = Array(12).fill(0);
      doAno.filter((r) => r.categoria === categoria).forEach((r) => { meses[r.mes - 1] = r.total; });
      const total = meses.reduce((s, v) => s + v, 0);
      return { categoria, meses, total };
    }).filter((l) => l.total > 0);
    const totaisMeses = Array(12).fill(0);
    linhas.forEach((l) => l.meses.forEach((v, i) => { totaisMeses[i] += v; }));
    return { linhas, totaisMeses, totalGeral: totaisMeses.reduce((s, v) => s + v, 0) };
  }, [totaisSalaPublicos, anoSalaPublico]);
  const mesAtualSalaPublico = useMemo(() => {
    const hoje = new Date();
    if (!totaisSalaPublicos) return { total: 0, nome: MESES_ABREV[hoje.getMonth()] };
    const total = totaisSalaPublicos
      .filter((r) => r.ano === hoje.getFullYear() && r.mes === hoje.getMonth() + 1)
      .reduce((s, r) => s + r.total, 0);
    return { total, nome: MESES_ABREV[hoje.getMonth()] };
  }, [totaisSalaPublicos]);
  const [qtdCursosPublico, setQtdCursosPublico] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    // Cursos vêm de duas tabelas (aba própria "cursos" e eventos do
    // calendário com tipo "curso") — igual à lista pública de cursos.
    Promise.all([
      supabase.from("cursos").select("*", { count: "exact", head: true }),
      supabase.from("eventos_calendario").select("*", { count: "exact", head: true }).eq("tipo", "curso"),
    ]).then(([{ count: qtdCursos }, { count: qtdEventosCurso }]) => {
      setQtdCursosPublico((qtdCursos ?? 0) + (qtdEventosCurso ?? 0));
    });
  }, []);
  const [totalConcedidoFomentoPublico, setTotalConcedidoFomentoPublico] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.rpc("total_concedido_fomento").then(({ data, error }) => {
      if (!error) setTotalConcedidoFomentoPublico(Number(data) || 0);
    });
  }, []);
  const [contagemStatusFomentoPublico, setContagemStatusFomentoPublico] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.rpc("contagem_status_fomento").then(({ data, error }) => {
      if (!error) {
        const mapa = Object.fromEntries((data || []).map((r) => [r.status, Number(r.total)]));
        setContagemStatusFomentoPublico(mapa);
      }
    });
  }, []);
  const [licitacaoNome, setLicitacaoNome] = useState("");
  const [licitacaoWhatsapp, setLicitacaoWhatsapp] = useState("");
  const [enviandoLicitacao, setEnviandoLicitacao] = useState(false);
  const [licitacaoEnviada, setLicitacaoEnviada] = useState(false);
  const [erroLicitacao, setErroLicitacao] = useState("");
  const cadastrarInteresseLicitacao = async (e) => {
    e.preventDefault();
    setErroLicitacao("");
    if (!licitacaoNome.trim() || !licitacaoWhatsapp.trim()) { setErroLicitacao("Preencha nome e WhatsApp."); return; }
    if (!supabaseConfigurado) { setLicitacaoEnviada(true); return; }
    setEnviandoLicitacao(true);
    try {
      const { error } = await supabase.from("licitacao_leads").insert({ nome: licitacaoNome, whatsapp: licitacaoWhatsapp });
      if (error) throw error;
      setLicitacaoEnviada(true);
      setLicitacaoNome("");
      setLicitacaoWhatsapp("");
    } catch (err) {
      setErroLicitacao(err.message || "Não consegui enviar agora. Tente de novo.");
    } finally {
      setEnviandoLicitacao(false);
    }
  };

  // ---------------------------------------------------------------------
  // Carrinho de compras — separado por comerciante (não mistura empresas
  // diferentes no mesmo pedido), salvo no navegador (localStorage), sem
  // exigir login. Finalização é sempre feita pelo WhatsApp do comerciante.
  // ---------------------------------------------------------------------
  const [carrinho, setCarrinho] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc_carrinho") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem("cc_carrinho", JSON.stringify(carrinho)); } catch {}
  }, [carrinho]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [nomeClienteCarrinho, setNomeClienteCarrinho] = useState("");
  const [enderecoClienteCarrinho, setEnderecoClienteCarrinho] = useState("");
  const [pixCopiadoId, setPixCopiadoId] = useState(null);

  const adicionarAoCarrinho = (produto) => {
    if (!produto?.empresaId || produto.preco == null) return;
    setCarrinho((atual) => {
      const grupoAtual = atual[produto.empresaId] || { empresaNome: produto.empresaNome, empresaWhatsapp: produto.empresaWhatsapp, empresaChavePix: produto.empresaChavePix, itens: {} };
      const itemAtual = grupoAtual.itens[produto.itemId];
      const novoItem = itemAtual
        ? { ...itemAtual, quantidade: itemAtual.quantidade + 1 }
        : { nome: produto.nome, preco: produto.preco, foto_url: produto.foto_url || null, quantidade: 1 };
      return { ...atual, [produto.empresaId]: { ...grupoAtual, itens: { ...grupoAtual.itens, [produto.itemId]: novoItem } } };
    });
    setCarrinhoAberto(true);
  };

  const alterarQuantidadeCarrinho = (empresaId, itemId, delta) => {
    setCarrinho((atual) => {
      const grupo = atual[empresaId];
      if (!grupo || !grupo.itens[itemId]) return atual;
      const novaQtd = grupo.itens[itemId].quantidade + delta;
      const novosItens = { ...grupo.itens };
      if (novaQtd <= 0) delete novosItens[itemId];
      else novosItens[itemId] = { ...novosItens[itemId], quantidade: novaQtd };
      if (Object.keys(novosItens).length === 0) {
        const { [empresaId]: _removido, ...resto } = atual;
        return resto;
      }
      return { ...atual, [empresaId]: { ...grupo, itens: novosItens } };
    });
  };

  const removerItemCarrinho = (empresaId, itemId) => {
    setCarrinho((atual) => {
      const grupo = atual[empresaId];
      if (!grupo) return atual;
      const novosItens = { ...grupo.itens };
      delete novosItens[itemId];
      if (Object.keys(novosItens).length === 0) {
        const { [empresaId]: _removido, ...resto } = atual;
        return resto;
      }
      return { ...atual, [empresaId]: { ...grupo, itens: novosItens } };
    });
  };

  const esvaziarCarrinhoEmpresa = (empresaId) => {
    setCarrinho((atual) => {
      const { [empresaId]: _removido, ...resto } = atual;
      return resto;
    });
  };

  const gruposCarrinho = Object.entries(carrinho).map(([empresaId, grupo]) => ({
    empresaId, ...grupo, itensLista: Object.entries(grupo.itens).map(([itemId, item]) => ({ itemId, ...item })),
  }));
  const totalItensCarrinho = gruposCarrinho.reduce((soma, g) => soma + g.itensLista.reduce((s, i) => s + i.quantidade, 0), 0);

  const finalizarPeloWhatsapp = (empresaId) => {
    const grupo = carrinho[empresaId];
    if (!grupo) return;
    const itens = Object.values(grupo.itens);
    const subtotal = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
    let msg = `Olá! Gostaria de fazer um pedido pelo Conecta Comércio:\n\n*${grupo.empresaNome}*\n\n`;
    itens.forEach((i) => {
      msg += `• ${i.quantidade}x ${i.nome} — R$ ${(i.preco * i.quantidade).toFixed(2).replace(".", ",")}\n`;
    });
    msg += `\n*Total: R$ ${subtotal.toFixed(2).replace(".", ",")}*\n`;
    if (nomeClienteCarrinho.trim()) msg += `\nNome: ${nomeClienteCarrinho.trim()}`;
    if (enderecoClienteCarrinho.trim()) msg += `\nEndereço para entrega: ${enderecoClienteCarrinho.trim()}`;
    const link = `https://wa.me/55${String(grupo.empresaWhatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  // Depoimento enviado pelo próprio usuário logado (cliente/empresário/
  // prestador) — entra como "pendente" até o admin aprovar.
  const [mostrarFormDepoimento, setMostrarFormDepoimento] = useState(false);
  const [textoDepoimentoProprio, setTextoDepoimentoProprio] = useState("");
  const [avaliacaoDepoimentoProprio, setAvaliacaoDepoimentoProprio] = useState(5);
  const [enviandoDepoimentoProprio, setEnviandoDepoimentoProprio] = useState(false);
  const [depoimentoProprioEnviado, setDepoimentoProprioEnviado] = useState(false);
  const [erroDepoimentoProprio, setErroDepoimentoProprio] = useState("");

  const rotuloPapelUsuario = { cliente: "Cliente", empresario: "Empresário(a)", prestador: "Prestador(a) de serviço" };

  const enviarDepoimentoProprio = async (e) => {
    e.preventDefault();
    setErroDepoimentoProprio("");
    if (!textoDepoimentoProprio.trim()) { setErroDepoimentoProprio("Escreva seu depoimento."); return; }
    if (!supabaseConfigurado) { setDepoimentoProprioEnviado(true); return; }
    setEnviandoDepoimentoProprio(true);
    try {
      const { error } = await supabase.from("depoimentos").insert({
        nome: perfil?.nome || "Usuário",
        papel: rotuloPapelUsuario[perfil?.tipo] || "",
        texto: textoDepoimentoProprio,
        avaliacao: avaliacaoDepoimentoProprio,
        status: "pendente",
      });
      if (error) throw error;
      setDepoimentoProprioEnviado(true);
      setTextoDepoimentoProprio("");
      setMostrarFormDepoimento(false);
    } catch (err) {
      setErroDepoimentoProprio(err.message || "Não consegui enviar agora. Tente de novo.");
    } finally {
      setEnviandoDepoimentoProprio(false);
    }
  };

  // Registra uma visita real (sem dado pessoal nenhum, só a hora) pra
  // alimentar o gráfico de "Acessos ao site" no dashboard do admin.
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("page_views").insert({}).then(() => {});
  }, []);

  // Instalação como app (PWA) — captura o prompt nativo do navegador (Android/
  // desktop Chrome) e mostra um passo a passo manual pra quem usa iPhone
  // (Safari não tem esse prompt automático).
  const [promptInstalacao, setPromptInstalacao] = useState(null);
  const [mostrarComoInstalarIOS, setMostrarComoInstalarIOS] = useState(false);
  const ehIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  // Navegador embutido do WhatsApp/Instagram/Facebook — nenhum deles suporta
  // instalar PWA (independente da marca do celular). É a causa mais comum de
  // "não consigo instalar": a pessoa abriu o link direto de dentro do app de
  // mensagem, em vez de num navegador de verdade.
  const ehWebviewEmbutido = typeof navigator !== "undefined" && /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(navigator.userAgent);

  useEffect(() => {
    const aoTerBeforeInstall = (e) => {
      e.preventDefault();
      setPromptInstalacao(e);
    };
    window.addEventListener("beforeinstallprompt", aoTerBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", aoTerBeforeInstall);
  }, []);

  const instalarApp = async () => {
    if (promptInstalacao) {
      promptInstalacao.prompt();
      await promptInstalacao.userChoice;
      setPromptInstalacao(null);
      return;
    }
    if (ehIOS) {
      setMostrarComoInstalarIOS(true);
      return;
    }
    setMostrarComoInstalarIOS(true); // navegador sem suporte automático — mostra instrução genérica
  };
  const [modalFeiranteAberto, setModalFeiranteAberto] = useState(false);
  const [query, setQuery] = useState("");
  // Favoritos de empresas e produtos — salvos no navegador (sem precisar de
  // login), pra habilitar o aviso de promoção em empresa favoritada.
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc_favoritos_empresas") || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("cc_favoritos_empresas", JSON.stringify(favs)); } catch {} }, [favs]);

  const [favsProdutos, setFavsProdutos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc_favoritos_produtos") || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("cc_favoritos_produtos", JSON.stringify(favsProdutos)); } catch {} }, [favsProdutos]);

  const [empresaAberta, setEmpresaAberta] = useState(null);
  const [feiranteAberto, setFeiranteAberto] = useState(null);

  // Abrir/fechar o perfil de uma empresa também atualiza o endereço (URL) da
  // página, pra virar um link de verdade — copiável, compartilhável no
  // WhatsApp e que o Google consegue indexar como página própria da empresa.
  const abrirEmpresa = (e) => {
    setEmpresaAberta(e);
    if (e?.id) window.history.pushState(null, "", `#/loja-${e.id}`);
  };
  const fecharEmpresa = () => {
    setEmpresaAberta(null);
    if (window.location.hash.startsWith("#/loja-")) window.history.pushState(null, "", "#/");
  };

  // Aviso (sino) de promoção nova em empresa favoritada — compara as
  // promoções recentes com a lista de favoritos salva no navegador.
  const [notifAberta, setNotifAberta] = useState(false);
  const [promocoesParaAviso, setPromocoesParaAviso] = useState([]);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    const catorzeDiasAtras = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    supabase.from("promocoes").select("id, nome, desconto_percentual, criado_em, produtos(empresa_id, nome, empresas(id, nome))")
      .eq("ativa", true).gte("criado_em", catorzeDiasAtras).order("criado_em", { ascending: false })
      .then(({ data, error }) => { if (!error) setPromocoesParaAviso(data || []); });
  }, []);
  const notificacoesFavoritas = useMemo(() => {
    const idsFavoritos = Object.keys(favs).filter((k) => favs[k]);
    const ultimaVista = Number(localStorage.getItem("cc_notif_vista_em") || 0);
    const lista = promocoesParaAviso
      .filter((p) => {
        const emp = p.produtos?.empresas;
        return emp && idsFavoritos.includes(String(emp.id));
      })
      .map((p) => ({
        id: p.id, empresaNome: p.produtos?.empresas?.nome || "", criado_em: p.criado_em,
        titulo: `${p.desconto_percentual ? `${p.desconto_percentual}% OFF` : "Promoção"} em ${p.produtos?.nome || p.nome || "um produto"}`,
      }));
    const naoVistas = lista.filter((n) => new Date(n.criado_em).getTime() > ultimaVista).length;
    return { lista, naoVistas };
  }, [promocoesParaAviso, favs]);
  const marcarNotificacoesVistas = () => {
    try { localStorage.setItem("cc_notif_vista_em", String(Date.now())); } catch {}
  };

  // Notificação push de verdade (chega com o site fechado) — opcional, além
  // do sino. O endpoint da inscrição fica salvo no navegador pra sabermos
  // qual linha atualizar no banco quando os favoritos mudarem.
  const [statusPush, setStatusPush] = useState(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return "indisponivel";
    return localStorage.getItem("cc_push_endpoint") ? "ativado" : "desativado";
  });

  const ativarNotificacoesPush = async () => {
    if (statusPush === "indisponivel" || !supabaseConfigurado) return;
    setStatusPush("ativando");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") { setStatusPush("desativado"); return; }
      const registro = await navigator.serviceWorker.ready;
      let subscription = await registro.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = subscription.toJSON();
      const idsFavoritos = Object.keys(favs).filter((k) => favs[k]);
      const { error } = await supabase.from("push_subscriptions").upsert({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        empresas_favoritas: idsFavoritos,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) throw error;
      localStorage.setItem("cc_push_endpoint", json.endpoint);
      setStatusPush("ativado");
    } catch {
      setStatusPush("erro");
    }
  };

  // Sempre que os favoritos mudam, re-sincroniza a lista no banco (se já
  // tiver uma inscrição ativa), pra empresa nova favoritada também gerar
  // aviso e empresa desfavoritada parar de gerar.
  useEffect(() => {
    if (statusPush !== "ativado" || !supabaseConfigurado) return;
    const endpoint = localStorage.getItem("cc_push_endpoint");
    if (!endpoint) return;
    const idsFavoritos = Object.keys(favs).filter((k) => favs[k]);
    supabase.from("push_subscriptions").update({ empresas_favoritas: idsFavoritos, atualizado_em: new Date().toISOString() }).eq("endpoint", endpoint).then(() => {});
  }, [favs, statusPush]);
  const [empresasReais, setEmpresasReais] = useState(null); // null = ainda carregando / indisponível
  const [produtosReais, setProdutosReais] = useState(null);
  const [vagasReais, setVagasReais] = useState(null);
  const [cursosReais, setCursosReais] = useState(null);
  const [noticiasReais, setNoticiasReais] = useState(null);
  const [noticiaAberta, setNoticiaAberta] = useState(null);
  const [servicosReais, setServicosReais] = useState(null);
  const [feiraConfigReal, setFeiraConfigReal] = useState(null);
  const [feirasEspeciaisReais, setFeirasEspeciaisReais] = useState(null);
  const [feirantesReais, setFeirantesReais] = useState(null);
  const [prestadoresReais, setPrestadoresReais] = useState(null);
  const [faqAberta, setFaqAberta] = useState(null);
  const [faqReais, setFaqReais] = useState(null);

  // Números reais da plataforma pro hero (empresas/produtos/vagas) — antes
  // eram 3 números fixos (206/540/18) que nunca mudavam de verdade.
  const [statsPublicosHome, setStatsPublicosHome] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setStatsPublicosHome({ empresas: 206, produtos: 540, vagas: 18 }); return; }
    const contarPublico = (tabela, filtro) => {
      let q = supabase.from(tabela).select("*", { count: "exact", head: true });
      if (filtro) q = filtro(q);
      return q.then(({ count }) => count ?? 0);
    };
    Promise.all([
      contarPublico("empresas", (q) => q.eq("status", "aprovada")),
      contarPublico("produtos", (q) => q.eq("ativo", true)),
      contarPublico("vagas", (q) => q.eq("status", "aberta")),
    ]).then(([empresas, produtos, vagas]) => setStatsPublicosHome({ empresas, produtos, vagas }));
  }, []);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("faq").select("*").eq("ativa", true).order("ordem").then(({ data, error }) => {
      if (!error && data && data.length > 0) setFaqReais(data);
    });
  }, []);
  const listaFaq = faqReais ?? faqItens;
  const faqPorCategoria = useMemo(() => {
    const mapa = {};
    listaFaq.forEach((item) => {
      const cat = item.categoria || "Geral";
      if (!mapa[cat]) mapa[cat] = [];
      mapa[cat].push(item);
    });
    return mapa;
  }, [listaFaq]);
  const categoriasFaq = Object.keys(faqPorCategoria);
  const empresasSecaoRef = useRef(null);
  const vagasSecaoRef = useRef(null);
  const produtosSecaoRef = useRef(null);
  const cursosNoticiasSecaoRef = useRef(null);
  const promocoesSecaoRef = useRef(null);
  const servicosSecaoRef = useRef(null);
  const feiraSecaoRef = useRef(null);
  const calendarioSecaoRef = useRef(null);
  const depoimentosSecaoRef = useRef(null);
  const faqSecaoRef = useRef(null);
  const contatoSecaoRef = useRef(null);
  const heroSecaoRef = useRef(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("prestadores").select("*").eq("status", "aprovado").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setPrestadoresReais(data || []);
    });
  }, []);

  // Avaliações de prestadores — mesma estrutura já usada pra pontos
  // turísticos e empresas, só filtrando pela coluna prestador_id.
  const [avaliacoesPorPrestador, setAvaliacoesPorPrestador] = useState({});
  const carregarAvaliacoesPrestadores = () => {
    if (!supabaseConfigurado) return;
    supabase.from("avaliacoes").select("*").not("prestador_id", "is", null).order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (error) return;
      const porPrestador = {};
      (data || []).forEach((a) => {
        if (!porPrestador[a.prestador_id]) porPrestador[a.prestador_id] = [];
        porPrestador[a.prestador_id].push(a);
      });
      setAvaliacoesPorPrestador(porPrestador);
    });
  };
  useEffect(() => { carregarAvaliacoesPrestadores(); }, []);

  const [depoimentosReais, setDepoimentosReais] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("depoimentos").select("*").eq("status", "aprovado").order("criado_em", { ascending: false }).limit(20).then(({ data, error }) => {
      if (!error && data && data.length > 0) setDepoimentosReais(data);
    });
  }, []);
  const listaDepoimentos = depoimentosReais ?? depoimentos;

  const [indiceDepoimento, setIndiceDepoimento] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndiceDepoimento((i) => (i + 1) % listaDepoimentos.length), 5500);
    return () => clearInterval(t);
  }, [listaDepoimentos.length]);

  // Navbar ganha sombra/blur mais forte assim que a página é rolada.
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 12);
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase
      .from("servicos_empreendedor")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setServicosReais(data);
      });
  }, []);

  const listaServicos = servicosReais ?? servicosEmpreendedor; // usa dados reais assim que existirem

  // Feira regular e feiras especiais: assim que o admin cadastrar de verdade,
  // a home passa a mostrar esses dados em vez dos valores de exemplo.
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("feira_config").select("*").eq("id", 1).single().then(({ data }) => { if (data) setFeiraConfigReal(data); });
    supabase.from("eventos_calendario").select("*").eq("tipo", "feira").order("data_inicio").then(({ data, error }) => {
      if (!error && data) setFeirasEspeciaisReais(data);
    });
    supabase.from("feirantes").select("*").eq("status", "aprovado").order("criado_em", { ascending: false }).limit(24).then(({ data, error }) => {
      if (!error) setFeirantesReais(data || []);
    });
  }, []);

  const feiraAtual = feiraConfigReal ?? feiraRegular;
  const listaFeirasEspeciais = feirasEspeciaisReais ?? feirasEspeciais.map((f, i) => ({ id: `demo-${i}`, titulo: f.titulo, data_inicio: f.data, local: f.local }));

  const irParaCategoria = (categoria) => {
    if (categoria === "Vagas") {
      vagasSecaoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setQuery(categoria);
    setTimeout(() => empresasSecaoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  // Cliques no menu do topo (Empresas, Produtos, Vagas, Cursos, Notícias)
  // rolam a página até a seção certa, em vez de ficar sem fazer nada.
  const irParaSecaoNav = (item) => {
    setMenuOpen(false);
    if (item === "Home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const refs = {
      Empresas: empresasSecaoRef,
      Serviços: servicosSecaoRef,
      Promoções: promocoesSecaoRef,
      "Feira do Empreendedor": feiraSecaoRef,
      Calendário: calendarioSecaoRef,
      Produtos: produtosSecaoRef,
      Vagas: vagasSecaoRef,
      Cursos: cursosNoticiasSecaoRef,
      Notícias: cursosNoticiasSecaoRef,
      Depoimentos: depoimentosSecaoRef,
      FAQ: faqSecaoRef,
      Contato: contatoSecaoRef,
    };
    refs[item]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase
      .from("empresas")
      .select("id, nome, categoria, regiao, bairro, cidade, rating, cartao_servidor:aceita_cartao_servidor, itens:visualizacoes, banner_url, logo_url, facebook, site, destaque, patrocinado, patrocinado_ate, whatsapp, instagram, endereco, google_maps_url, email, criado_em, fotos_urls, horario_funcionamento, plano_premium, plano_premium_ate")
      .eq("status", "aprovada")
      .order("destaque", { ascending: false })
      .order("visualizacoes", { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setEmpresasReais(data.map((d) => ({
            id: d.id, nome: d.nome, cat: d.categoria, regiao: d.regiao || "ivatuba", bairro: d.bairro, cidade: d.cidade,
            rating: d.rating ?? "—", cartaoServidor: !!d.cartao_servidor, itens: d.itens ?? 0,
            banner_url: d.banner_url, logo_url: d.logo_url, facebook: d.facebook, site: d.site, destaque: d.destaque, patrocinado: !!d.patrocinado, patrocinado_ate: d.patrocinado_ate || null, whatsapp: d.whatsapp,
            instagram: d.instagram, endereco: d.endereco, google_maps_url: d.google_maps_url, email: d.email, criado_em: d.criado_em,
            fotos_urls: d.fotos_urls || [], horario_funcionamento: d.horario_funcionamento || null,
            plano_premium: !!d.plano_premium, plano_premium_ate: d.plano_premium_ate || null,
            verificada: !!(d.logo_url && d.whatsapp && d.endereco && (d.instagram || d.site)),
          })));
        }
      });
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase
      .from("produtos")
      .select("id, nome, descricao, preco, preco_promocional, estoque, foto_url, categoria, empresa_id, empresas(id, nome, whatsapp, chave_pix)")
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
      .limit(40)
      .then(({ data, error }) => {
        if (!error) {
          setProdutosReais((data || []).map((d, i) => ({
            id: d.id || `demo-produto-${i}`,
            nome: d.nome,
            cat: d.categoria,
            descricao: d.descricao || "",
            empresa: d.empresas?.nome || "",
            empresaId: d.empresas?.id || d.empresa_id || null,
            whatsapp: d.empresas?.whatsapp || "",
            chavePix: d.empresas?.chave_pix || "",
            foto_url: d.foto_url,
            estoque: d.estoque,
            preco: d.preco != null ? `R$ ${Number(d.preco).toFixed(2).replace(".", ",")}` : "Consulte",
            precoNumerico: d.preco != null ? Number(d.preco) : null,
            precoPromocional: d.preco_promocional != null ? `R$ ${Number(d.preco_promocional).toFixed(2).replace(".", ",")}` : null,
            precoPromocionalNumerico: d.preco_promocional != null ? Number(d.preco_promocional) : null,
          })));
        }
      });
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase
      .from("vagas")
      .select("id, cargo, salario, cidade, tipo, beneficios, requisitos, prazo, empresas(nome, whatsapp)")
      .eq("status", "aberta")
      .order("criado_em", { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!error) {
          setVagasReais((data || []).map((d, i) => ({
            id: d.id || `demo-vaga-${i}`,
            cargo: d.cargo,
            salario: d.salario || "A combinar",
            cidade: d.cidade || "Ivatuba - PR",
            empresa: d.empresas?.nome || "",
            whatsapp: d.empresas?.whatsapp || "",
            tipo: d.tipo,
            beneficios: d.beneficios,
            requisitos: d.requisitos,
            prazo: d.prazo,
          })));
        }
      });
  }, []);

  // Cursos podem ser cadastrados de dois jeitos: pela aba própria "Cursos"
  // (tabela cursos) ou direto no Calendário com tipo "Curso" (tabela
  // eventos_calendario) — a aba Cursos do site precisa mostrar os dois
  // juntos, senão um curso cadastrado só no calendário nunca aparece aqui.
  useEffect(() => {
    if (!supabaseConfigurado) return;
    Promise.all([
      supabase.from("cursos").select("*").order("data_inicio").limit(20),
      supabase.from("eventos_calendario").select("*").eq("tipo", "curso").order("data_inicio").limit(20),
    ]).then(([{ data: cursosData, error: erroCursos }, { data: eventosData, error: erroEventos }]) => {
      const listaCursos = !erroCursos && cursosData ? cursosData : [];
      const listaEventosCurso = !erroEventos && eventosData
        ? eventosData.map((ev) => ({
            id: `evento-${ev.id}`,
            titulo: ev.titulo,
            instituicao: ev.local || "",
            descricao: ev.descricao || "",
            data_inicio: ev.data_inicio,
            link_inscricao: ev.link_inscricao || "",
            banner_url: ev.banner_url || "",
            certificado: false,
            relato: ev.relato || "",
            relato_fotos: ev.relato_fotos || [],
            _origemCalendario: true,
          }))
        : [];
      const combinados = [...listaCursos, ...listaEventosCurso].sort((a, b) => (a.data_inicio || "").localeCompare(b.data_inicio || ""));
      if (combinados.length > 0) setCursosReais(combinados);
    });
  }, []);

  // Ticker "ao vivo" — antes eram frases de exemplo fixas; agora reflete
  // cadastros reais (empresa, promoção, vaga, curso, prestador) assim que
  // existem, e só cai pro exemplo se a plataforma ainda estiver vazia.
  const atividadesReais = useMemo(() => {
    const itens = [];
    (empresasReais ?? []).slice(0, 3).forEach((e) => itens.push(`✅ ${e.nome} está na vitrine do Conecta Comércio`));
    (produtosReais ?? [])
      .filter((p) => p.precoPromocionalNumerico != null)
      .slice(0, 3)
      .forEach((p) => itens.push(`🛍️ ${p.empresa || "Uma loja"} publicou uma promoção: ${p.nome}`));
    (vagasReais ?? []).slice(0, 3).forEach((v) => itens.push(`💼 Nova vaga aberta: ${v.cargo}${v.empresa ? ` na ${v.empresa}` : ""}`));
    (cursosReais ?? []).slice(0, 3).forEach((c) => itens.push(`🎓 Novo curso: ${c.titulo}`));
    (prestadoresReais ?? []).slice(0, 3).forEach((p) => itens.push(`🛠️ ${p.nome} está oferecendo ${p.servico || "serviços"} em Ivatuba`));
    return itens;
  }, [empresasReais, produtosReais, vagasReais, cursosReais, prestadoresReais]);
  const listaAtividades = atividadesReais.length > 0 ? atividadesReais : atividades;

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("noticias").select("*").order("publicada_em", { ascending: false }).limit(10).then(({ data, error }) => {
      if (!error && data && data.length > 0) setNoticiasReais(data);
    });
  }, []);

  // Assim que existir cadastro real (empresa aprovada, produto ativo, vaga
  // aberta), a home passa a mostrar só dados reais — nada de exemplo fica
  // exibido para sempre.
  const listaBase = empresasReais ?? []; // usa dados reais assim que existirem

  // Slides do carrossel do hero: sempre o carimbo de boas-vindas primeiro,
  // seguido de uma empresa em destaque e um produto em promoção quando
  // existirem — pra não depender só de conteúdo estático.
  const heroSlides = useMemo(() => {
    const slides = [{
      titulo: `COMPRE EM\n${nomeCidade.toUpperCase()}`,
      subtitulo: "MOVIMENTO LOCAL",
      icon: BadgeCheck,
      foto_url: null,
      onClick: undefined,
    }];
    const empresaDestaque = (empresasReais ?? []).find((e) => e.destaque);
    if (empresaDestaque) {
      slides.push({
        titulo: empresaDestaque.nome,
        subtitulo: "EM DESTAQUE",
        icon: Star,
        foto_url: empresaDestaque.banner_url || null,
        onClick: () => abrirEmpresa(empresaDestaque),
      });
    }
    const produtoPromo = (produtosReais ?? []).find((p) => p.precoPromocionalNumerico != null);
    if (produtoPromo) {
      slides.push({
        titulo: produtoPromo.nome,
        subtitulo: `${produtoPromo.precoPromocional} · ${produtoPromo.empresa}`,
        icon: Tag,
        foto_url: produtoPromo.foto_url || null,
        onClick: () => produtosSecaoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      });
    }
    return slides;
  }, [nomeCidade, empresasReais, produtosReais]);

  // Link direto pra uma empresa (ex: alguém compartilhou "#/loja-<id>" no
  // WhatsApp): assim que a lista de empresas carrega, abre o perfil dela
  // automaticamente, sem precisar buscar/clicar de novo.
  useEffect(() => {
    if (!empresasReais || empresasReais.length === 0) return;
    if (!window.location.hash.startsWith("#/loja-")) return;
    const id = window.location.hash.replace("#/loja-", "");
    const achada = empresasReais.find((e) => String(e.id) === id);
    if (achada) setEmpresaAberta(achada);
  }, [empresasReais]);

  // Título e descrição da aba do navegador acompanham o que está sendo
  // visto — ajuda o Google a entender do que se trata cada link e deixa o
  // compartilhamento (WhatsApp/Instagram) com nome e descrição certos.
  useEffect(() => {
    const tituloBase = `Conecta Comércio · ${nomeCidadeUF}`;
    const descBase = `Plataforma independente para fortalecer o comércio local de ${nomeCidadeUF}.`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (empresaAberta) {
      document.title = `${empresaAberta.nome} — Conecta Comércio`;
      if (metaDesc) metaDesc.setAttribute("content", `${empresaAberta.nome}${empresaAberta.cat ? " · " + empresaAberta.cat : ""} em ${nomeCidadeUF}. Veja contato, produtos e avaliações no Conecta Comércio.`);
    } else {
      document.title = tituloBase;
      if (metaDesc) metaDesc.setAttribute("content", descBase);
    }
  }, [empresaAberta]);

  const [ordenacaoEmpresas, setOrdenacaoEmpresas] = useState("recentes");
  const empresasFiltradas = useMemo(() => {
    const temBusca = !!query.trim();
    let lista = !temBusca ? listaBase : listaBase.filter((e) =>
      textoContem(e.nome, query) || textoContem(e.cat, query) || textoContem(e.bairro, query) || textoContem(e.cidade, query)
    );
    lista = [...lista];
    if (ordenacaoEmpresas === "az") lista.sort((a, b) => a.nome.localeCompare(b.nome));
    if (ordenacaoEmpresas === "avaliacao") lista.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    // Anúncio patrocinado — empresas marcadas pelo admin aparecem primeiro
    // nos resultados de busca por nome/categoria.
    if (temBusca) lista.sort((a, b) => (patrocinadoAtivo(b) ? 1 : 0) - (patrocinadoAtivo(a) ? 1 : 0));
    return lista;
  }, [query, listaBase, ordenacaoEmpresas]);

  const [queryProdutos, setQueryProdutos] = useState("");
  const [ordenacaoProdutos, setOrdenacaoProdutos] = useState("recentes");
  const produtosFiltrados = useMemo(() => {
    let lista = (produtosReais ?? []);
    if (queryProdutos.trim()) {
      lista = lista.filter((p) =>
        textoContem(p.nome, queryProdutos) || textoContem(p.empresa, queryProdutos) ||
        textoContem(p.cat, queryProdutos) || textoContem(p.descricao, queryProdutos)
      );
    }
    lista = [...lista];
    const precoNum = (p) => Number((p.precoPromocional || p.preco || "0").replace(/[^\d,]/g, "").replace(",", "."));
    if (ordenacaoProdutos === "menor-preco") lista.sort((a, b) => precoNum(a) - precoNum(b));
    if (ordenacaoProdutos === "maior-preco") lista.sort((a, b) => precoNum(b) - precoNum(a));
    if (ordenacaoProdutos === "az") lista.sort((a, b) => a.nome.localeCompare(b.nome));
    return lista;
  }, [produtosReais, queryProdutos, ordenacaoProdutos]);

  const [queryVagas, setQueryVagas] = useState("");
  const [filtroTipoVaga, setFiltroTipoVaga] = useState("");
  const vagasFiltradas = useMemo(() => {
    let lista = (vagasReais ?? []);
    if (queryVagas.trim()) {
      lista = lista.filter((v) => textoContem(v.cargo, queryVagas) || textoContem(v.cidade, queryVagas) || textoContem(v.requisitos, queryVagas));
    }
    if (filtroTipoVaga) lista = lista.filter((v) => v.tipo === filtroTipoVaga);
    return lista;
  }, [vagasReais, queryVagas, filtroTipoVaga]);

  // Paginação "carregar mais" — evita jogar centenas de cards na tela de
  // uma vez só; mostra um tanto por vez e o resto sob demanda.
  const PAGINA_EMPRESAS = 9, PAGINA_PRODUTOS = 8, PAGINA_VAGAS = 6;
  const [qtdEmpresasVisiveis, setQtdEmpresasVisiveis] = useState(PAGINA_EMPRESAS);
  const [qtdProdutosVisiveis, setQtdProdutosVisiveis] = useState(PAGINA_PRODUTOS);
  const [qtdVagasVisiveis, setQtdVagasVisiveis] = useState(PAGINA_VAGAS);
  useEffect(() => { setQtdEmpresasVisiveis(PAGINA_EMPRESAS); }, [query, ordenacaoEmpresas]);
  useEffect(() => { setQtdProdutosVisiveis(PAGINA_PRODUTOS); }, [queryProdutos, ordenacaoProdutos]);
  useEffect(() => { setQtdVagasVisiveis(PAGINA_VAGAS); }, [queryVagas, filtroTipoVaga]);

  const nav = [
    "Home", "Empresas", "Serviços", "Promoções", "Feira do Empreendedor",
    "Calendário", "Produtos", "Vagas", "Cursos", "Notícias",
    "Depoimentos", "FAQ", "Contato",
  ];

  return (
    <div className="font-body min-h-screen" style={{ background: "#fff", color: C.ink }}>
      {/* Barra institucional */}
      <div className="text-white text-[11px] font-body" style={{ background: `linear-gradient(90deg, ${C.blueDeep}, ${C.blue})` }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 truncate"><MapPinned size={12} /> Feito para fortalecer o comércio de {nomeCidade}</span>
          <span className="hidden sm:inline">Desenvolvido por Gabriel Oliveira</span>
        </div>
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b transition-shadow duration-300"
        style={{
          borderColor: rolou ? "transparent" : C.line,
          background: rolou ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.95)",
          boxShadow: rolou ? "0 8px 30px -12px rgba(10,34,58,0.18)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <LogoMark size={36} url={logoUrl} />
            <span className="font-display font-extrabold text-lg leading-none" style={{ color: C.blue }}>
              Conecta<span style={{ color: C.ink }}>Comércio</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 ml-4">
            {nav.map((n) => (
              <a key={n} href="#" onClick={(e) => { e.preventDefault(); irParaSecaoNav(n); }} className="nav-link font-body text-sm font-semibold cursor-pointer" style={{ color: "#425A70" }}>{n}</a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setNotifAberta((v) => !v); marcarNotificacoesVistas(); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: "#425A70" }} aria-label="Notificações">
                <Bell size={18} />
                {notificacoesFavoritas.naoVistas > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-body text-[9px] font-bold text-white" style={{ background: "#B4462F" }}>
                    {notificacoesFavoritas.naoVistas}
                  </span>
                )}
              </button>
              {notifAberta && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border bg-white shadow-2xl p-3 z-40" style={{ borderColor: C.line }}>
                  <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Promoções das suas empresas favoritas</p>
                  {statusPush !== "indisponivel" && statusPush !== "ativado" && (
                    <button type="button" onClick={ativarNotificacoesPush} disabled={statusPush === "ativando"}
                      className="w-full flex items-center gap-1.5 rounded-lg px-2.5 py-2 mb-2 font-body text-[11px] font-bold disabled:opacity-60"
                      style={{ background: C.blueTint2, color: C.blue }}>
                      <Bell size={12} />
                      {statusPush === "ativando" ? "Ativando..." : statusPush === "erro" ? "Não deu certo, tentar de novo" : "Ativar notificação no celular/navegador"}
                    </button>
                  )}
                  {statusPush === "ativado" && (
                    <p className="font-body text-[11px] flex items-center gap-1.5 mb-2" style={{ color: "#1E8E5A" }}>
                      <BadgeCheck size={12} /> Notificações ativadas
                    </p>
                  )}
                  {notificacoesFavoritas.lista.length === 0 ? (
                    <p className="font-body text-xs" style={{ color: "#5C7186" }}>Nada por aqui ainda. Favorite empresas (❤) pra ver as promoções delas.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {notificacoesFavoritas.lista.map((n) => (
                        <div key={n.id} className="rounded-lg px-2.5 py-2" style={{ background: C.blueTint2 }}>
                          <p className="font-body text-[11px] font-bold" style={{ color: C.ink }}>{n.empresaNome}</p>
                          <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{n.titulo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => onAuth?.("entrar")} className="glow-btn font-body text-sm font-semibold px-4 py-2 rounded-lg border" style={{ borderColor: C.blue, color: C.blue }}>
                Entrar
              </button>
              <button onClick={() => onAuth?.("cadastro")} className="glow-btn font-body text-sm font-bold px-4 py-2 rounded-lg text-white" style={{ background: C.blue }}>
                Cadastrar empresa
              </button>
            </div>

            <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu-in md:hidden border-t px-4 py-3 flex flex-col gap-3" style={{ borderColor: C.line }}>
            {nav.map((n) => (
              <a key={n} href="#" onClick={(e) => { e.preventDefault(); irParaSecaoNav(n); }} className="nav-link font-body text-sm font-semibold cursor-pointer" style={{ color: "#425A70" }}>{n}</a>
            ))}
            <button onClick={() => onAuth?.("cadastro")} className="font-body text-sm font-bold px-4 py-2 rounded-lg text-white text-center" style={{ background: C.blue }}>
              Cadastrar empresa
            </button>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6"><PublicidadeBanners posicao="topo" compacto /></div>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${C.blue} 0%, ${C.blueDeep} 100%)` }}>
        {/* Blobs animados de fundo */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="blob absolute -top-20 -left-10 w-80 h-80 rounded-full" style={{ background: "#3E8FD9" }} />
          <div className="blob blob-b absolute top-10 right-0 w-96 h-96 rounded-full" style={{ background: C.amber, opacity: 0.35 }} />
          <div className="blob blob-c absolute bottom-[-6rem] left-1/3 w-72 h-72 rounded-full" style={{ background: "#5FC6E8", opacity: 0.3 }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-10 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center relative">
          <div className="hero-in-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: C.amber }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C.amber }} />
              </span>
              <span className="font-display text-xs font-bold tracking-[0.16em] uppercase text-white/90">Plataforma oficial do comércio local · ao vivo</span>
            </div>
            <h1 className="font-display font-extrabold grad-text text-[34px] leading-[1.12] md:text-[48px] md:leading-[1.08]">
              O comércio de {nomeCidade},<br /> em movimento.
            </h1>
            <p className="font-body text-white/80 text-[15px] mt-4 max-w-md">
              {frase || "Empresas, produtos, vagas e cursos da sua cidade, atualizados agora mesmo — e cada compra ajuda o dinheiro a girar aqui."}
            </p>

            <div className="mt-7 bg-white rounded-2xl p-2 flex items-center gap-2 shadow-2xl max-w-lg glow-card" style={{ borderColor: "transparent" }}>
              <Search size={18} className="ml-2 shrink-0" color="#5C7186" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empresas, produtos ou serviços..."
                aria-label="Buscar empresas, produtos ou serviços"
                className="font-body flex-1 min-w-0 text-sm outline-none py-2"
              />
              <button type="button" onClick={() => empresasSecaoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="glow-btn font-body font-bold text-sm px-4 md:px-5 py-2.5 rounded-xl shrink-0" style={{ background: C.amber, color: C.blueDeep }}>
                Buscar
              </button>
            </div>
            <div className="max-w-lg mt-3">
              <PublicidadeBanners posicao="lateral" compacto />
            </div>

            {/* Atalhos rápidos — Serviços em destaque */}
            <div className="flex flex-wrap gap-2 mt-3.5 max-w-lg">
              <button onClick={() => irParaCategoria("Serviços")}
                className="glow-btn flex items-center gap-1.5 rounded-full pl-3 pr-4 py-2 font-body text-xs font-bold"
                style={{ background: C.amber, color: C.blueDeep }}>
                <Wrench size={13} /> Serviços
              </button>
              {[["Alimentação", Utensils], ["Beleza", Scissors], ["Vagas", Briefcase]].map(([label, Icon]) => (
                <button key={label} onClick={() => irParaCategoria(label)}
                  className="flex items-center gap-1.5 rounded-full pl-3 pr-4 py-2 font-body text-xs font-semibold text-white/90 border"
                  style={{ borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.08)" }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8 flex-wrap">
              {[
                [statsPublicosHome?.empresas, "empresas", Building2],
                [statsPublicosHome?.produtos, "produtos", ShoppingBag],
                [statsPublicosHome?.vagas, "vagas abertas", Briefcase],
              ].map(([n, l, Icon]) => (
                <div key={l} className="rounded-xl px-4 py-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)" }}>
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.14)" }}>
                    <Icon size={15} color="#fff" />
                  </span>
                  <div>
                    <p className="font-display font-extrabold text-white text-lg leading-none tabular-nums">
                      {statsPublicosHome ? <AnimatedNumber value={n ?? 0} /> : "…"}
                    </p>
                    <p className="font-body text-white/60 text-[11px] mt-0.5">{l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature: carrossel do hero — boas-vindas, empresa em destaque e promoção */}
          <HeroCarousel slides={heroSlides} />
        </div>

        {/* Ticker de atividade ao vivo */}
        <div className="relative border-t border-white/10 bg-black/10 overflow-hidden py-2.5">
          <div className="flex items-center">
            <span className="flex items-center gap-1.5 font-display text-[10px] font-bold tracking-widest uppercase text-white shrink-0 pl-4 pr-3 z-10"
              style={{ background: C.blueDeep }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-red-400" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
              Ao vivo
            </span>
            <div className="overflow-hidden flex-1">
              <div className="marquee-track flex items-center gap-10 whitespace-nowrap">
                {[...listaAtividades, ...listaAtividades].map((a, i) => (
                  <span key={i} className="font-body text-xs text-white/75">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona — timeline */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-14">
        <Reveal>
          <SectionHeader eyebrow="Passo a passo" title="Como funciona o Conecta Comércio" sub="Do cadastro até aparecer pra cidade toda, em poucos minutos" />
        </Reveal>
        <div className="relative grid sm:grid-cols-4 gap-8 sm:gap-4 mt-4">
          <div aria-hidden="true" className="hidden sm:block absolute top-6 left-0 right-0 h-[2px]" style={{ background: C.line }} />
          {[
            { n: "1", titulo: "Cadastre-se grátis", desc: "Como cliente, empresário ou prestador de serviço — leva menos de 2 minutos.", icon: UserCircle2 },
            { n: "2", titulo: "Publique seu conteúdo", desc: "Empresa, produtos, vagas ou seu serviço, com fotos de verdade.", icon: Upload },
            { n: "3", titulo: "Admin aprova rapidinho", desc: "Uma checagem simples pra manter a plataforma confiável pra todo mundo.", icon: BadgeCheck },
            { n: "4", titulo: "Apareça pra cidade toda", desc: "Clientes te encontram, favoritam e chamam direto no WhatsApp.", icon: TrendingUp },
          ].map((etapa, i) => {
            const Icon = etapa.icon;
            return (
              <Reveal key={etapa.n} delay={i * 110} className="relative">
                <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3">
                  <span className="relative z-10 shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-display font-extrabold text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})` }}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{etapa.titulo}</p>
                    <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{etapa.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <PublicidadeBanners />
      <div ref={promocoesSecaoRef}><BannerPromocoes /></div>
      <CapaComercianteDestaque empresas={listaBase} onAbrir={abrirEmpresa} />
      <div className="max-w-6xl mx-auto px-4 md:px-6"><PublicidadeBanners posicao="apos_destaques" compacto /></div>

      {/* Categorias */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <Reveal>
          <SectionHeader eyebrow="Explorar" title="Categorias de empresas" sub="Tudo que Ivatuba tem para oferecer, organizado por perto de você" />
        </Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(categoriasReaisHome ?? categorias).map((c, i) => (
            <Reveal key={c.nome} delay={i * 60}><CategoryCard cat={c} onClick={() => irParaCategoria(c.nome)} /></Reveal>
          ))}
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-4 md:px-6"><PublicidadeBanners posicao="entre_categorias" compacto /></div>

      {/* Serviços do Empreendedor — em destaque */}
      <section ref={servicosSecaoRef} className="relative overflow-hidden py-14" style={{ background: `linear-gradient(155deg, ${C.blueDeep} 0%, ${C.blue} 100%)` }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="blob absolute -top-16 right-[-4rem] w-72 h-72 rounded-full" style={{ background: C.amber, opacity: 0.25 }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6">
          <Reveal>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.amber }}>
                <FileText size={16} color={C.blueDeep} />
              </span>
              <span className="font-display text-xs font-bold tracking-[0.16em] uppercase text-white/90">Direto ao ponto · serviços oficiais</span>
            </div>
            <h2 className="font-display font-extrabold text-white text-2xl md:text-[28px]">Serviços do Empreendedor</h2>
            <p className="font-body text-white/75 text-sm mt-1 max-w-md">
              Atalhos oficiais da Receita Federal e do Governo — pra você não perder tempo procurando.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-7">
            {listaServicos.map((s, i) => {
              const Icon = s.icon || FileText;
              const cor = s.cor_hex || C.blue;
              return (
                <Reveal key={s.titulo} delay={i * 70}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="glow-card group flex flex-col gap-3 p-4 rounded-2xl h-full"
                    style={{ background: "rgba(255,255,255,0.97)" }}>
                    <div className="flex items-start justify-between">
                      <span className="flex items-center justify-center w-11 h-11 rounded-xl overflow-hidden" style={{ background: `${cor}1A`, color: cor }}>
                        {s.logo_url ? <img loading="lazy" decoding="async" src={s.logo_url} alt="" className="w-full h-full object-cover" /> : <Icon size={20} />}
                      </span>
                      <ExternalLink size={14} color="#B7C6D6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{s.titulo}</p>
                      <p className="font-body text-xs mt-1 leading-snug" style={{ color: "#5C7186" }}>{s.descricao}</p>
                    </div>
                  </a>
                </Reveal>
              );
            })}
          </div>
          <p className="font-body text-[11px] mt-4 text-white/50">
            Esses links abrem os serviços oficiais do governo (gov.br) em uma nova aba. O Conecta Comércio não armazena seus dados fiscais.
          </p>
        </div>
      </section>

      {/* Fomento Paraná — linhas de crédito */}
      {siteConfig?.fomento_ativo && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <Reveal>
            <div className="rounded-3xl overflow-hidden relative border" style={{ borderColor: C.line }}>
              <div className="grid md:grid-cols-[1fr_1.1fr]">
                <div className="h-48 md:h-full relative flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
                  {siteConfig?.fomento_foto_url ? (
                    <img loading="lazy" decoding="async" src={siteConfig.fomento_foto_url} alt="Fomento Paraná" className="w-full h-full object-cover" />
                  ) : (
                    <Landmark size={48} className="text-white/90" />
                  )}
                </div>
                <div className="p-6 md:p-8 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
                      <HandCoins size={16} />
                    </span>
                    <span className="font-display text-xs font-bold tracking-[0.16em] uppercase" style={{ color: C.blue }}>Crédito para o seu negócio</span>
                  </div>
                  <h2 className="font-display font-extrabold text-xl md:text-2xl" style={{ color: C.ink }}>Fomento Paraná</h2>
                  <p className="font-body text-sm" style={{ color: "#5C7186" }}>
                    {siteConfig?.fomento_texto || "Precisa de crédito para sua empresa? Conheça as linhas de crédito da Fomento Paraná, agência oficial do Governo do Paraná."}
                  </p>

                  <details className="rounded-xl border" style={{ borderColor: C.line, background: C.blueTint2 }}>
                    <summary className="font-body text-xs font-bold px-3 py-2.5 cursor-pointer" style={{ color: C.blue }}>
                      Quanto posso pedir e quais documentos preciso? (clique para ver)
                    </summary>
                    <div className="px-3 pb-3 flex flex-col gap-3">
                      <div>
                        <p className="font-body text-xs font-bold mb-1" style={{ color: C.ink }}>Quanto posso solicitar (regras gerais):</p>
                        <ul className="font-body text-xs list-disc list-inside space-y-0.5" style={{ color: "#5C7186" }}>
                          <li>Trabalha sem CNPJ (informal), há menos de 1 ano: até R$ 5 mil</li>
                          <li>Trabalha sem CNPJ (informal), há mais de 1 ano: até R$ 10 mil (com avalista)</li>
                          <li>MEI com menos de 1 ano de CNPJ: até R$ 5 mil</li>
                          <li>MEI de 1 a 3 anos de CNPJ: até R$ 10 a R$ 20 mil (com avalista)</li>
                          <li>MEI com mais de 3 anos de CNPJ: até R$ 6 mil no 1º empréstimo, até R$ 12,5 mil a partir do 2º</li>
                          <li>Microempresa (fatura até R$ 360 mil/ano): faixas parecidas com as do MEI acima</li>
                          <li>Empresa que fatura mais de R$ 130 mil/ano e quer pedir mais de R$ 20 mil: análise à parte, direto com o agente de crédito</li>
                        </ul>
                        <p className="font-body text-[10px] mt-1" style={{ color: "#8896A6" }}>
                          Isso é um resumo geral — o valor exato aprovado depende da análise da Fomento Paraná. Fale com o agente de crédito para confirmar o seu caso.
                        </p>
                      </div>
                      <div>
                        <p className="font-body text-xs font-bold mb-1" style={{ color: C.ink }}>Documentos que costumam ser pedidos:</p>
                        <ul className="font-body text-xs list-disc list-inside space-y-0.5" style={{ color: "#5C7186" }}>
                          <li>Documento de identidade (RG, CNH) — seu e do cônjuge, se tiver</li>
                          <li>Comprovante de endereço seu e da empresa (conta de luz, água, internet — vencida há no máximo 60 dias)</li>
                          <li>Comprovante de renda (holerite, Imposto de Renda, DASN se for MEI, ou declaração de autônomo)</li>
                          <li>Se tiver CNPJ: Certificado de MEI, Requerimento de Empresário ou Contrato Social</li>
                          <li>Print ou extrato da conta bancária com nome, banco, agência e conta</li>
                          <li>Se precisar de avalista: os mesmos documentos acima também dele/dela</li>
                        </ul>
                        <p className="font-body text-[10px] mt-1" style={{ color: "#8896A6" }}>
                          A Fomento Paraná pode pedir outros documentos, conforme o seu caso. Você já pode anexar o que tiver no formulário abaixo.
                        </p>
                      </div>
                    </div>
                  </details>

                  <div className="flex flex-wrap gap-2">
                    {siteConfig?.fomento_link && (
                      <a href={siteConfig.fomento_link} target="_blank" rel="noopener noreferrer"
                        className="font-body text-xs font-bold rounded-lg px-4 py-2.5 border flex items-center gap-1.5" style={{ borderColor: C.line, color: C.blue }}>
                        <ExternalLink size={13} /> Ver linhas de crédito e simulação
                      </a>
                    )}
                    {linkWhatsFomento && (
                      <a href={linkWhatsFomento} target="_blank" rel="noopener noreferrer"
                        className="glow-btn font-body text-xs font-bold rounded-lg px-4 py-2.5 text-white flex items-center gap-1.5" style={{ background: "#25A85B" }}>
                        <MessageCircle size={13} /> Solicite já com {siteConfig?.fomento_agente_nome || "nosso agente de crédito"}
                      </a>
                    )}
                  </div>

                  <div className="mt-2 pt-4 border-t" style={{ borderColor: C.line }}>
                    {fomentoEnviado ? (
                      <p className="font-body text-sm font-semibold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
                        <CheckCircle2 size={15} /> Recebemos seu contato! Em breve alguém fala com você.
                      </p>
                    ) : (
                      <form onSubmit={cadastrarInteresseFomento} className="flex flex-col gap-2">
                        <p className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>Quer que a gente te ajude a solicitar? Deixe seu contato:</p>
                        <div className="flex flex-wrap gap-2">
                          <input value={fomentoNome} onChange={(e) => setFomentoNome(e.target.value)} placeholder="Seu nome"
                            className="font-body text-sm border rounded-lg px-3 py-2 outline-none flex-1 min-w-[140px]" style={{ borderColor: C.line }} />
                          <input value={fomentoWhatsapp} onChange={(e) => setFomentoWhatsapp(e.target.value)} placeholder="WhatsApp"
                            className="font-body text-sm border rounded-lg px-3 py-2 outline-none flex-1 min-w-[140px]" style={{ borderColor: C.line }} />
                          <button type="submit" disabled={enviandoFomento} className="font-body text-xs font-bold rounded-lg px-4 py-2 text-white disabled:opacity-60" style={{ background: C.blue }}>
                            {enviandoFomento ? "Enviando..." : "Cadastrar"}
                          </button>
                        </div>
                        <label className="font-body text-xs font-semibold flex items-center gap-2 cursor-pointer w-fit" style={{ color: C.blue }}>
                          <FileText size={14} />
                          {fomentoDocumentos.length > 0 ? `${fomentoDocumentos.length} documento(s) anexado(s)` : "Anexar documentos (opcional)"}
                          <input type="file" accept="application/pdf,image/*" multiple hidden
                            onChange={(e) => setFomentoDocumentos(Array.from(e.target.files || []))} />
                        </label>
                        <p className="font-body text-[10px]" style={{ color: "#8896A6" }}>
                          Seus documentos ficam guardados só para a Fomento Paraná analisar — não aparecem publicamente no site.
                        </p>
                        {erroFomento && <p className="font-body text-[11px]" style={{ color: "#B4462F" }}>{erroFomento}</p>}
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* Agência do Trabalhador */}
      {siteConfig?.agencia_ativo && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <Reveal>
            <div className="rounded-3xl overflow-hidden relative border" style={{ borderColor: C.line }}>
              <div className="grid md:grid-cols-[1fr_1.1fr]">
                <div className="h-48 md:h-full relative flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
                  <Briefcase size={48} className="text-white/90" />
                </div>
                <div className="p-6 md:p-8 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
                      <Briefcase size={16} />
                    </span>
                    <span className="font-display text-xs font-bold tracking-[0.16em] uppercase" style={{ color: C.blue }}>Emprego</span>
                  </div>
                  <h2 className="font-display font-extrabold text-xl md:text-2xl" style={{ color: C.ink }}>Agência do Trabalhador</h2>
                  <p className="font-body text-sm" style={{ color: "#5C7186" }}>
                    {siteConfig?.agencia_texto || "Procurando emprego ou precisa contratar? A Agência do Trabalhador conecta candidatos e empresas locais."}
                  </p>
                  {(siteConfig?.agencia_endereco || siteConfig?.agencia_horario) && (
                    <div className="font-body text-xs flex flex-col gap-1" style={{ color: "#5C7186" }}>
                      {siteConfig?.agencia_endereco && <span className="flex items-center gap-1"><MapPin size={12} /> {siteConfig.agencia_endereco}</span>}
                      {siteConfig?.agencia_horario && <span className="flex items-center gap-1"><Clock size={12} /> {siteConfig.agencia_horario}</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => vagasSecaoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="font-body text-xs font-bold rounded-lg px-4 py-2.5 border flex items-center gap-1.5" style={{ borderColor: C.line, color: C.blue }}>
                      <Briefcase size={13} /> Ver vagas disponíveis
                    </button>
                    {linkWhatsAgencia && (
                      <a href={linkWhatsAgencia} target="_blank" rel="noopener noreferrer"
                        className="glow-btn font-body text-xs font-bold rounded-lg px-4 py-2.5 text-white flex items-center gap-1.5" style={{ background: "#25A85B" }}>
                        <MessageCircle size={13} /> Falar no WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* Editais e Licitações */}
      {licitacoesAbertasPublicas.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <Reveal><SectionHeader eyebrow="Compras públicas" title="Editais e Licitações" sub="Oportunidades abertas pra empresas locais participarem" /></Reveal>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {licitacoesAbertasPublicas.map((l) => {
              const hoje = new Date().toISOString().slice(0, 10);
              const vencido = l.data_limite && l.data_limite < hoje;
              return (
                <Reveal key={l.id}>
                  <div className="rounded-2xl border p-4 bg-white h-full flex flex-col gap-1.5" style={{ borderColor: C.line }}>
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{l.titulo}</p>
                    {l.orgao && <p className="font-body text-xs" style={{ color: "#5C7186" }}>{l.orgao}</p>}
                    {l.descricao && <p className="font-body text-xs" style={{ color: "#5C7186" }}>{l.descricao}</p>}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {l.valor_estimado && (
                        <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>
                          R$ {Number(l.valor_estimado).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                      {l.data_limite && (
                        <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: vencido ? "#FBEAE5" : "#FFF6E9", color: vencido ? "#B4462F" : "#8A5A12" }}>
                          {vencido ? "Prazo encerrado" : `Prazo: ${l.data_limite.split("-").reverse().join("/")}`}
                        </span>
                      )}
                    </div>
                    {l.link_edital && (
                      <a href={l.link_edital} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold flex items-center gap-1 mt-1 w-fit" style={{ color: C.blue }}>
                        <ExternalLink size={11} /> Ver edital completo
                      </a>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
          <div className="max-w-md mt-6">
            {licitacaoEnviada ? (
              <p className="font-body text-sm font-semibold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
                <CheckCircle2 size={15} /> Recebemos seu contato! Vamos te avisar de novos editais.
              </p>
            ) : (
              <form onSubmit={cadastrarInteresseLicitacao} className="flex flex-col gap-2">
                <p className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>Quer ser avisado quando surgir um edital novo?</p>
                <div className="flex flex-wrap gap-2">
                  <input value={licitacaoNome} onChange={(e) => setLicitacaoNome(e.target.value)} placeholder="Seu nome"
                    className="font-body text-sm border rounded-lg px-3 py-2 outline-none flex-1 min-w-[140px]" style={{ borderColor: C.line }} />
                  <input value={licitacaoWhatsapp} onChange={(e) => setLicitacaoWhatsapp(e.target.value)} placeholder="WhatsApp"
                    className="font-body text-sm border rounded-lg px-3 py-2 outline-none flex-1 min-w-[140px]" style={{ borderColor: C.line }} />
                  <button type="submit" disabled={enviandoLicitacao} className="font-body text-xs font-bold rounded-lg px-4 py-2 text-white disabled:opacity-60" style={{ background: C.blue }}>
                    {enviandoLicitacao ? "Enviando..." : "Cadastrar"}
                  </button>
                </div>
                {erroLicitacao && <p className="font-body text-[11px]" style={{ color: "#B4462F" }}>{erroLicitacao}</p>}
              </form>
            )}
          </div>
        </section>
      )}

      {/* Resultados de editais e licitações já divulgados */}
      {licitacoesComResultadoPublicas.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <Reveal><SectionHeader eyebrow="Compras públicas" title="Resultados de editais" sub="Resultados já divulgados de editais e licitações anteriores" /></Reveal>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {licitacoesComResultadoPublicas.map((l) => (
              <Reveal key={l.id}>
                <div className="rounded-2xl border p-4 bg-white h-full flex flex-col gap-1.5" style={{ borderColor: C.line }}>
                  <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{l.titulo}</p>
                  {l.orgao && <p className="font-body text-xs" style={{ color: "#5C7186" }}>{l.orgao}</p>}
                  <div className="rounded-lg px-2.5 py-2 mt-1" style={{ background: C.blueTint2 }}>
                    <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>
                      Resultado{l.data_resultado ? ` — ${l.data_resultado.split("-").reverse().join("/")}` : ""}
                    </p>
                    <p className="font-body text-[11px]" style={{ color: "#425A70" }}>{l.resultado}</p>
                  </div>
                  {l.link_edital && (
                    <a href={l.link_edital} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold flex items-center gap-1 mt-1 w-fit" style={{ color: C.blue }}>
                      <ExternalLink size={11} /> Ver edital completo
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Sala do Empreendedor — dashboard tecnológico */}
      {relatorioSalaPublico.linhas.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <Reveal>
            <div className="flex items-end justify-between flex-wrap gap-3">
              <SectionHeader eyebrow="Empreendedorismo · dados em tempo real" title="Sala do Empreendedor" sub={`Atendimentos prestados em ${anoSalaPublico} — números oficiais (fonte: Sebrae)`} />
              {anosSalaPublico.length > 1 && (
                <select value={anoSalaPublico} onChange={(e) => setAnoSalaPublicoEscolhido(Number(e.target.value))}
                  className="font-body text-sm font-bold border rounded-lg px-3 py-2 outline-none bg-white" style={{ borderColor: C.line, color: C.blue }}>
                  {anosSalaPublico.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
                </select>
              )}
            </div>
          </Reveal>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-3xl overflow-hidden mt-5 relative" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
            <div aria-hidden="true" className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
            <div className="relative p-5 md:p-7">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Activity, valor: relatorioSalaPublico.totalGeral, rotulo: `Atendimentos em ${anoSalaPublico}` },
                  { icon: Zap, valor: mesAtualSalaPublico.total, rotulo: `Atendimentos em ${mesAtualSalaPublico.nome}` },
                  { icon: GraduationCap, valor: qtdCursosPublico ?? "—", rotulo: "Cursos oferecidos" },
                  { icon: HandCoins, valor: totalConcedidoFomentoPublico != null ? `R$ ${totalConcedidoFomentoPublico.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—", rotulo: "Concedido via Fomento Paraná", pequeno: true },
                  { icon: CheckCircle2, valor: contagemStatusFomentoPublico?.concedido ?? 0, rotulo: "Pedidos concedidos" },
                  { icon: RefreshCw, valor: contagemStatusFomentoPublico?.em_analise ?? 0, rotulo: "Pedidos em processo" },
                ].map((s, i) => (
                  <motion.div key={s.rotulo} initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <s.icon size={18} color="#8FC1F2" />
                    <p className={`font-display font-extrabold ${s.pequeno ? "text-xl" : "text-3xl"} text-white mt-2`}>{s.valor}</p>
                    <p className="font-body text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{s.rotulo}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p className="font-body text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>Evolução mensal</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={MESES_ABREV.map((m, i) => ({ mes: m, total: relatorioSalaPublico.totaisMeses[i] }))}>
                    <XAxis dataKey="mes" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: C.blueDeep, border: "none", borderRadius: 8, color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                    <Bar dataKey="total" fill="#8FC1F2" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          <Reveal>
            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: C.line }}>
              <p className="font-body text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#5C7186" }}>Por categoria de serviço</p>
              <div className="flex flex-col gap-2.5">
                {relatorioSalaPublico.linhas.map((l) => {
                  const pct = relatorioSalaPublico.totalGeral > 0 ? Math.round((l.total / relatorioSalaPublico.totalGeral) * 100) : 0;
                  return (
                    <div key={l.categoria}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-xs" style={{ color: C.ink }}>{l.categoria}</span>
                        <span className="font-body text-xs font-bold" style={{ color: C.blue }}>{l.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.blueTint }}>
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.7, ease: "easeOut" }}
                          className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.blueDeep})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* Feira do Empreendedor — em destaque */}
      <section ref={feiraSecaoRef} className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <Reveal>
          <div className="rounded-3xl overflow-hidden relative" style={{ background: `linear-gradient(120deg, ${C.amber}, ${C.amberDark})` }}>
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="blob absolute -bottom-16 -left-10 w-72 h-72 rounded-full" style={{ background: C.blueDeep, opacity: 0.18 }} />
            </div>
            <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-8 p-6 md:p-10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/25">
                    <PartyPopper size={16} color={C.blueDeep} />
                  </span>
                  <span className="font-display text-xs font-bold tracking-[0.16em] uppercase" style={{ color: C.blueDeep }}>Feira do Empreendedor</span>
                </div>
                <h2 className="font-display font-extrabold text-2xl md:text-[28px]" style={{ color: C.blueDeep }}>
                  Vende na feira? Cadastre sua barraca.
                </h2>
                <p className="font-body text-sm mt-2 max-w-md" style={{ color: C.blueDeep, opacity: 0.85 }}>
                  Apareça pra cidade toda: mostre seus produtos, seu WhatsApp e suas redes sociais pra quem for prestigiar a feira.
                </p>

                <div className="flex items-center gap-2 mt-5 font-body text-sm font-semibold" style={{ color: C.blueDeep }}>
                  <Calendar size={16} /> {feiraAtual.dia} · {feiraAtual.horario}
                </div>
                <div className="flex items-center gap-2 mt-1.5 font-body text-sm" style={{ color: C.blueDeep, opacity: 0.8 }}>
                  <MapPin size={16} /> {feiraAtual.local}
                </div>

                <button onClick={() => setModalFeiranteAberto(true)}
                  className="glow-btn font-body font-bold text-sm rounded-xl px-5 py-3 mt-6 text-white flex items-center gap-2 w-fit"
                  style={{ background: C.blueDeep }}>
                  <Camera size={15} /> Quero ser feirante
                </button>
              </div>

              <div className="flex flex-col gap-2.5 justify-center">
                <p className="font-display font-bold text-xs uppercase tracking-wide" style={{ color: C.blueDeep, opacity: 0.7 }}>Feiras especiais</p>
                {listaFeirasEspeciais.map((f) => (
                  <div key={f.id || f.titulo} className="rounded-2xl p-3.5 flex items-center gap-3 bg-white/90">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                      <CalendarDays size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-xs truncate" style={{ color: C.ink }}>{f.titulo}</p>
                      <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>{f.data_inicio} · {f.local}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {(feirantesReais ?? []).length > 0 && (
          <div className="mt-6">
            <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Quem confirmou presença</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(feirantesReais ?? []).map((f, i) => (
                <Reveal key={f.id} delay={i * 60}>
                  <div className="glow-card rounded-2xl border overflow-hidden h-full flex flex-col" style={{ borderColor: C.line }}>
                    <button type="button" onClick={() => setFeiranteAberto(f)} className="aspect-[4/3] bg-gray-100 overflow-hidden w-full text-left">
                      {f.fotos_urls && f.fotos_urls[0] ? (
                        <img loading="lazy" decoding="async" src={f.fotos_urls[0]} alt={f.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}><PartyPopper size={22} /></div>
                      )}
                    </button>
                    <div className="p-3.5 flex-1 flex flex-col">
                      <button type="button" onClick={() => setFeiranteAberto(f)} className="text-left">
                        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{f.nome}</p>
                        <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>{f.produto}</p>
                      </button>
                      {f.categoria && (
                        <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 w-fit" style={{ background: C.blueTint, color: C.blue }}>{f.categoria}</span>
                      )}
                      {(f.local || f.numero_estande) && (
                        <p className="font-body text-[11px] mt-1.5 flex items-center gap-1" style={{ color: "#5C7186" }}>
                          <MapPin size={11} /> {[f.local, f.numero_estande ? `Barraca ${f.numero_estande}` : null].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {f.whatsapp && (
                        <a href={`https://wa.me/55${(f.whatsapp || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="mt-auto pt-3 font-body text-xs font-bold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
                          <MessageCircle size={13} /> Chamar no WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </section>

      {modalFeiranteAberto && <ModalCadastroFeirante onFechar={() => setModalFeiranteAberto(false)} />}
      {feiranteAberto && <ModalDetalheFeirante f={feiranteAberto} onFechar={() => setFeiranteAberto(null)} />}

      {/* Calendário de eventos — só o administrador edita, todo mundo vê */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
        <Reveal><SectionHeader eyebrow="Agenda da cidade" title="Calendário de eventos" sub="Feiras, cursos e eventos do comércio local — atualizado pelo administrador" /></Reveal>
        <div ref={calendarioSecaoRef} className="max-w-md">
          <CalendarioEventos />
        </div>
      </section>

      {/* O que abriu essa semana — empresas cadastradas nos últimos 7 dias */}
      {(() => {
        const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const novasDaSemana = (empresasReais ?? []).filter((e) => e.criado_em && new Date(e.criado_em).getTime() >= seteDiasAtras);
        if (novasDaSemana.length === 0) return null;
        return (
          <section className="max-w-6xl mx-auto px-4 md:px-6 py-10">
            <Reveal><SectionHeader eyebrow="Novidades" title="O que abriu essa semana" sub="Comércios recém-chegados na plataforma" /></Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {novasDaSemana.slice(0, 6).map((e, i) => (
                <Reveal key={e.nome} delay={i * 70}>
                  <EmpresaCard e={e} fav={!!favs[e.id || e.nome]} onFav={() => setFavs((f) => ({ ...f, [e.id || e.nome]: !f[e.id || e.nome] }))} onAbrir={() => abrirEmpresa(e)} />
                </Reveal>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Empresas em destaque */}
      <section ref={empresasSecaoRef} className="py-12" style={{ background: C.blueTint2 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <Reveal><SectionHeader eyebrow="Vitrine local" title="Empresas em destaque" linkLabel="Ver mapa de empresas" onLinkClick={() => window.open("https://www.google.com/maps/search/com%C3%A9rcio+Ivatuba+PR", "_blank")} /></Reveal>
            <select value={ordenacaoEmpresas} onChange={(e) => setOrdenacaoEmpresas(e.target.value)}
              className="font-body text-xs border rounded-lg px-3 py-2 outline-none bg-white mb-1" style={{ borderColor: C.line, color: "#425A70" }}>
              <option value="recentes">Mais recentes</option>
              <option value="az">Ordem alfabética</option>
              <option value="avaliacao">Melhor avaliação</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresasFiltradas.slice(0, qtdEmpresasVisiveis).map((e, i) => (
              <Reveal key={e.nome} delay={i * 70}>
                <EmpresaCard e={e} fav={!!favs[e.id || e.nome]} onFav={() => setFavs((f) => ({ ...f, [e.id || e.nome]: !f[e.id || e.nome] }))} onAbrir={() => abrirEmpresa(e)} />
              </Reveal>
            ))}
            {empresasFiltradas.length === 0 && (
              <p className="font-body text-sm col-span-full" style={{ color: "#5C7186" }}>
                {query.trim() ? `Nenhuma empresa encontrada para "${query}".` : "Nenhuma empresa cadastrada ainda. Assim que a primeira for aprovada, aparece aqui."}
              </p>
            )}
          </div>
          {empresasFiltradas.length > qtdEmpresasVisiveis && (
            <div className="flex justify-center mt-6">
              <button onClick={() => setQtdEmpresasVisiveis((n) => n + PAGINA_EMPRESAS)}
                className="font-body text-sm font-bold px-5 py-2.5 rounded-xl border bg-white" style={{ borderColor: C.line, color: C.blue }}>
                Carregar mais empresas
              </button>
            </div>
          )}
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-4 md:px-6"><PublicidadeBanners posicao="entre_empresas" compacto /></div>

      {/* Produtos em destaque */}
      <section ref={produtosSecaoRef} className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <Reveal><SectionHeader eyebrow="Ofertas" title="Produtos em destaque" linkLabel="Ver todos" onLinkClick={() => setQtdProdutosVisiveis(produtosFiltrados.length)} /></Reveal>
          {(produtosReais ?? []).length > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <input value={queryProdutos} onChange={(e) => setQueryProdutos(e.target.value)} placeholder="Buscar produto..."
                className="font-body text-xs border rounded-lg px-3 py-2 outline-none w-36" style={{ borderColor: C.line }} />
              <select value={ordenacaoProdutos} onChange={(e) => setOrdenacaoProdutos(e.target.value)}
                className="font-body text-xs border rounded-lg px-3 py-2 outline-none bg-white" style={{ borderColor: C.line, color: "#425A70" }}>
                <option value="recentes">Mais recentes</option>
                <option value="menor-preco">Menor preço</option>
                <option value="maior-preco">Maior preço</option>
                <option value="az">Ordem alfabética</option>
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {produtosFiltrados.slice(0, qtdProdutosVisiveis).map((p, i) => (
            <Reveal key={`${p.nome}-${i}`} delay={i * 70}>
              <ProdutoCard p={p} onAdicionarCarrinho={adicionarAoCarrinho}
                fav={!!favsProdutos[p.id]} onFav={() => setFavsProdutos((f) => ({ ...f, [p.id]: !f[p.id] }))} />
            </Reveal>
          ))}
          {(produtosReais ?? []).length === 0 && (
            <p className="font-body text-sm col-span-full" style={{ color: "#5C7186" }}>Nenhum produto cadastrado ainda. Assim que um empresário publicar, aparece aqui.</p>
          )}
          {(produtosReais ?? []).length > 0 && produtosFiltrados.length === 0 && (
            <p className="font-body text-sm col-span-full" style={{ color: "#5C7186" }}>Nenhum produto encontrado para "{queryProdutos}".</p>
          )}
        </div>
        {produtosFiltrados.length > qtdProdutosVisiveis && (
          <div className="flex justify-center mt-6">
            <button onClick={() => setQtdProdutosVisiveis((n) => n + PAGINA_PRODUTOS)}
              className="font-body text-sm font-bold px-5 py-2.5 rounded-xl border bg-white" style={{ borderColor: C.line, color: C.blue }}>
              Carregar mais produtos
            </button>
          </div>
        )}
      </section>

      {/* Vagas */}
      <section ref={vagasSecaoRef} className="py-12" style={{ background: C.blueTint2 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <Reveal><SectionHeader eyebrow="Trabalhe em Ivatuba" title="Vagas de emprego" linkLabel="Ver todas as vagas" onLinkClick={() => setQtdVagasVisiveis(vagasFiltradas.length)} /></Reveal>
            {(vagasReais ?? []).length > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <input value={queryVagas} onChange={(e) => setQueryVagas(e.target.value)} placeholder="Buscar cargo ou cidade..."
                  className="font-body text-xs border rounded-lg px-3 py-2 outline-none w-40" style={{ borderColor: C.line }} />
                <select value={filtroTipoVaga} onChange={(e) => setFiltroTipoVaga(e.target.value)}
                  className="font-body text-xs border rounded-lg px-3 py-2 outline-none bg-white" style={{ borderColor: C.line, color: "#425A70" }}>
                  <option value="">Todos os tipos</option>
                  <option value="CLT">CLT</option>
                  <option value="PJ">PJ</option>
                  <option value="Estágio">Estágio</option>
                  <option value="Temporário">Temporário</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vagasFiltradas.slice(0, qtdVagasVisiveis).map((v, i) => <Reveal key={`${v.cargo}-${i}`} delay={i * 70}><VagaCard v={v} /></Reveal>)}
            {(vagasReais ?? []).length === 0 && (
              <p className="font-body text-sm col-span-full" style={{ color: "#5C7186" }}>Nenhuma vaga publicada ainda.</p>
            )}
            {(vagasReais ?? []).length > 0 && vagasFiltradas.length === 0 && (
              <p className="font-body text-sm col-span-full" style={{ color: "#5C7186" }}>Nenhuma vaga encontrada com esse filtro.</p>
            )}
          </div>
          {vagasFiltradas.length > qtdVagasVisiveis && (
            <div className="flex justify-center mt-6">
              <button onClick={() => setQtdVagasVisiveis((n) => n + PAGINA_VAGAS)}
                className="font-body text-sm font-bold px-5 py-2.5 rounded-xl border bg-white" style={{ borderColor: C.line, color: C.blue }}>
                Carregar mais vagas
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Cursos e Notícias */}
      <section ref={cursosNoticiasSecaoRef} className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <SectionHeader eyebrow="Sala do Empreendedor" title="Cursos e eventos" />
          <div className="flex flex-col gap-3">
            {(cursosReais ?? cursos).map((c) => <CursoCard key={c.id || c.titulo} c={c} />)}
          </div>
        </div>
        <div>
          <SectionHeader eyebrow="Fique por dentro" title="Notícias" />
          <div className="flex flex-col">
            {(noticiasReais ?? noticias).map((n, i) => {
              const ehReal = !!noticiasReais;
              const dataExibida = n.data || (n.publicada_em ? new Date(n.publicada_em).toLocaleDateString("pt-BR") : "");
              return (
                <button key={n.id || n.titulo} type="button" onClick={() => (ehReal ? setNoticiaAberta(n) : n.link_url && window.open(n.link_url, "_blank"))}
                  className="flex items-center gap-3 py-3.5 border-b text-left w-full" style={{ borderColor: C.line }}>
                  {n.imagem_url ? (
                    <img loading="lazy" decoding="async" src={n.imagem_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                      <Newspaper size={15} />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: C.ink }}>
                      {n.titulo}
                      {n.destaque && <Sparkles size={12} color={C.amberDark} />}
                    </p>
                    <p className="font-body text-xs flex items-center gap-1 mt-0.5" style={{ color: "#5C7186" }}><Clock size={10} /> {dataExibida}{n.categoria ? ` · ${n.categoria}` : ""}</p>
                  </div>
                  <ChevronRight size={16} color="#B7C6D6" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {noticiaAberta && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={() => setNoticiaAberta(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
            {noticiaAberta.imagem_url && <img loading="lazy" decoding="async" src={noticiaAberta.imagem_url} alt="" className="w-full h-40 object-cover sm:rounded-t-3xl" />}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-display font-bold text-lg" style={{ color: C.ink }}>{noticiaAberta.titulo}</p>
                <button onClick={() => setNoticiaAberta(null)} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueTint2 }} aria-label="Fechar">
                  <X size={16} color="#425A70" />
                </button>
              </div>
              <p className="font-body text-xs mb-3" style={{ color: "#5C7186" }}>
                {noticiaAberta.publicada_em ? new Date(noticiaAberta.publicada_em).toLocaleDateString("pt-BR") : ""}
                {noticiaAberta.autor ? ` · ${noticiaAberta.autor}` : ""}{noticiaAberta.categoria ? ` · ${noticiaAberta.categoria}` : ""}
              </p>
              {renderizarConteudoNoticia(noticiaAberta.conteudo)}
              {noticiaAberta.galeria_urls && noticiaAberta.galeria_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {noticiaAberta.galeria_urls.map((url) => (
                    <img loading="lazy" decoding="async" key={url} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              )}
              {noticiaAberta.tags && noticiaAberta.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {noticiaAberta.tags.map((t) => (
                    <span key={t} className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: C.blueTint, color: C.blue }}>#{t}</span>
                  ))}
                </div>
              )}
              {noticiaAberta.link_url && (
                <a href={noticiaAberta.link_url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold mt-4 flex items-center gap-1 w-fit" style={{ color: C.blue }}>
                  <ExternalLink size={12} /> Ver link relacionado
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prestadores de serviço */}
      {(prestadoresReais ?? []).length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <Reveal>
            <SectionHeader eyebrow="Autônomos e informais" title="Prestadores de serviço" sub="Encontre quem faz de tudo um pouco aqui em Ivatuba" />
          </Reveal>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(prestadoresReais ?? []).map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <PrestadorCard p={p} agendamentoAtivo={!!siteConfig?.agendamento_ativo} avaliacoes={avaliacoesPorPrestador[p.id] || []} onAvaliacaoEnviada={carregarAvaliacoesPrestadores} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Depoimentos */}
      <section ref={depoimentosSecaoRef} className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <Reveal>
          <SectionHeader eyebrow="Quem já usa" title="O que dizem sobre o Conecta Comércio" />
        </Reveal>
        <Reveal>
          <div className="rounded-3xl border p-8 md:p-10 relative overflow-hidden" style={{ borderColor: C.line, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)" }}>
            <div aria-hidden="true" className="blob absolute -top-16 right-[-4rem] w-64 h-64 rounded-full" style={{ background: C.blueTint, opacity: 0.6 }} />
            {(() => {
              const atual = listaDepoimentos[indiceDepoimento % listaDepoimentos.length];
              const nomeExibido = atual.nome;
              const papelExibido = atual.papel || [atual.cargo, atual.empresa].filter(Boolean).join(" · ");
              return (
                <div key={indiceDepoimento} className="promo-slide relative">
                  {atual.avaliacao && (
                    <div className="flex gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} fill={n <= atual.avaliacao ? C.amberDark : "none"} color={C.amberDark} />)}
                    </div>
                  )}
                  <p className="font-display font-bold text-lg md:text-xl leading-snug max-w-2xl" style={{ color: C.ink }}>
                    "{atual.texto}"
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    {atual.foto_url ? (
                      <img loading="lazy" decoding="async" src={atual.foto_url} alt={nomeExibido} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm text-white shrink-0" style={{ background: C.blue }}>
                        {nomeExibido.charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{nomeExibido}</p>
                      <p className="font-body text-xs" style={{ color: "#5C7186" }}>{papelExibido}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex gap-1.5 mt-6 relative">
              {listaDepoimentos.map((_, i) => (
                <button key={i} onClick={() => setIndiceDepoimento(i)} aria-label={`Depoimento ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{ width: i === indiceDepoimento ? 18 : 6, height: 6, background: i === indiceDepoimento ? C.blue : C.blueTint }} />
              ))}
            </div>
          </div>
        </Reveal>

        {/* Deixar meu depoimento — só para quem está logado (cliente, empresário ou prestador) */}
        {sessao && perfil && (
          <Reveal>
            <div className="max-w-2xl mt-5">
              {depoimentoProprioEnviado ? (
                <p className="font-body text-sm font-semibold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
                  <CheckCircle2 size={15} /> Obrigado! Seu depoimento foi enviado e vai aparecer aqui assim que for aprovado.
                </p>
              ) : !mostrarFormDepoimento ? (
                <button onClick={() => setMostrarFormDepoimento(true)} className="font-body text-xs font-bold rounded-lg px-4 py-2.5 border flex items-center gap-1.5" style={{ borderColor: C.line, color: C.blue }}>
                  <Star size={13} /> Deixar meu depoimento
                </button>
              ) : (
                <form onSubmit={enviarDepoimentoProprio} className="rounded-2xl border p-4 flex flex-col gap-2.5" style={{ borderColor: C.line, background: "#fff" }}>
                  <p className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>Sua avaliação</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setAvaliacaoDepoimentoProprio(n)} aria-label={`${n} estrelas`}>
                        <Star size={20} fill={n <= avaliacaoDepoimentoProprio ? C.amberDark : "none"} color={C.amberDark} />
                      </button>
                    ))}
                  </div>
                  <textarea value={textoDepoimentoProprio} onChange={(e) => setTextoDepoimentoProprio(e.target.value)} rows={3}
                    placeholder="Conte como foi sua experiência com o Conecta Comércio..."
                    className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  {erroDepoimentoProprio && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erroDepoimentoProprio}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={enviandoDepoimentoProprio} className="font-body text-xs font-bold rounded-lg px-4 py-2.5 text-white disabled:opacity-60" style={{ background: C.blue }}>
                      {enviandoDepoimentoProprio ? "Enviando..." : "Enviar depoimento"}
                    </button>
                    <button type="button" onClick={() => setMostrarFormDepoimento(false)} className="font-body text-xs font-bold rounded-lg px-4 py-2.5 border" style={{ borderColor: C.line, color: "#425A70" }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        )}
      </section>

      {/* FAQ */}
      <section ref={faqSecaoRef} className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <Reveal>
          <SectionHeader eyebrow="Dúvidas" title="Perguntas frequentes" />
        </Reveal>
        <div className="max-w-2xl flex flex-col gap-6">
          {categoriasFaq.map((cat) => (
            <div key={cat}>
              {categoriasFaq.length > 1 && (
                <p className="font-display font-bold text-xs uppercase tracking-wide mb-2" style={{ color: "#5C7186" }}>{cat}</p>
              )}
              <div className="flex flex-col gap-3">
                {faqPorCategoria[cat].map((item, i) => {
                  const chave = `${cat}-${i}`;
                  const aberta = faqAberta === chave;
                  return (
                    <Reveal key={item.id || item.pergunta} delay={i * 60}>
                      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.line, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                        <button onClick={() => setFaqAberta(aberta ? null : chave)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                          <span className="font-display font-bold text-sm" style={{ color: C.ink }}>{item.pergunta}</span>
                          <ChevronRight size={18} color={C.blue} style={{ transform: aberta ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .3s ease", flexShrink: 0 }} />
                        </button>
                        <div style={{ maxHeight: aberta ? 300 : 0, overflow: "hidden", transition: "max-height .35s ease" }}>
                          <p className="font-body text-sm px-5 pb-4" style={{ color: "#5C7186" }}>{item.resposta}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA PWA / Cartão do Servidor */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-4">
        <div className="rounded-3xl p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center"
          style={{ background: `linear-gradient(120deg, ${C.blueDeep}, ${C.blue})` }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Smartphone size={18} color="#fff" />
              <span className="font-display text-xs font-bold tracking-widest uppercase text-white/80">Leve o comércio no bolso</span>
            </div>
            <h3 className="font-display font-extrabold text-white text-xl md:text-2xl">Instale o Conecta Comércio no seu celular</h3>
            <p className="font-body text-white/75 text-sm mt-1">Aceita o Cartão do Servidor Municipal e funciona até offline, como um app de verdade.</p>
          </div>
          <button onClick={instalarApp} className="glow-btn font-body font-bold text-sm px-6 py-3 rounded-xl whitespace-nowrap" style={{ background: C.amber, color: C.blueDeep }}>
            Instalar aplicativo
          </button>
        </div>
      </section>

      {mostrarComoInstalarIOS && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={() => setMostrarComoInstalarIOS(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6">
            <p className="font-display font-bold text-base" style={{ color: C.ink }}>Como instalar no seu celular</p>
            {ehWebviewEmbutido ? (
              <>
                <p className="font-body text-xs mt-2 rounded-lg p-2.5" style={{ background: "#FBEAE5", color: "#B4462F" }}>
                  Você abriu esse link direto pelo WhatsApp/Instagram — esses aplicativos não deixam instalar. Abra no navegador de verdade primeiro.
                </p>
                <ol className="font-body text-sm mt-3 flex flex-col gap-2 list-decimal list-inside" style={{ color: "#425A70" }}>
                  <li>Toque nos <strong>três pontinhos</strong> (⋮) no canto superior da tela.</li>
                  <li>Escolha <strong>"Abrir no navegador"</strong> ou <strong>"Abrir no Chrome"</strong>.</li>
                  <li>Lá, toque em "Instalar aplicativo" de novo.</li>
                </ol>
              </>
            ) : ehIOS ? (
              <ol className="font-body text-sm mt-3 flex flex-col gap-2 list-decimal list-inside" style={{ color: "#425A70" }}>
                <li>Toque no ícone de <strong>compartilhar</strong> (quadrado com seta) na barra do Safari.</li>
                <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
              </ol>
            ) : (
              <>
                <ol className="font-body text-sm mt-3 flex flex-col gap-2 list-decimal list-inside" style={{ color: "#425A70" }}>
                  <li>Abra o menu do seu navegador (geralmente os três pontinhos, no canto superior).</li>
                  <li>Procure a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>Confirme — o ícone aparece na sua tela como um app normal.</li>
                </ol>
                <p className="font-body text-[11px] mt-2" style={{ color: "#8896A6" }}>
                  Não achou essa opção? Alguns celulares (ex: Xiaomi/MIUI) bloqueiam isso no navegador de fábrica — abra o link no <strong>Google Chrome</strong> e tente de novo.
                </p>
              </>
            )}
            <button onClick={() => setMostrarComoInstalarIOS(false)} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-2.5 mt-5 w-full" style={{ background: C.blue }}>
              Entendi
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-6"><PublicidadeBanners posicao="rodape" compacto /></div>

      {/* Footer */}
      <footer ref={contatoSecaoRef} className="mt-10 pt-12 pb-6 text-white" style={{ background: C.blueDeep }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 grid sm:grid-cols-2 md:grid-cols-5 gap-8">
          <div>
            <span className="font-display font-extrabold text-lg">Conecta Comércio</span>
            <p className="font-body text-white/60 text-xs mt-2 leading-relaxed">
              Plataforma independente para fortalecer o comércio e o empreendedorismo de {nomeCidadeUF}.
            </p>
            <div className="flex gap-2 mt-4">
              {siteConfig?.instagram_contato ? (
                <a href={`https://instagram.com/${String(siteConfig.instagram_contato).replace(/^@/, "")}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><Instagram size={14} /></a>
              ) : (
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Instagram size={14} /></span>
              )}
              {siteConfig?.whatsapp_contato ? (
                <a href={`https://wa.me/55${String(siteConfig.whatsapp_contato).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><MessageCircle size={14} /></a>
              ) : (
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><MessageCircle size={14} /></span>
              )}
            </div>
          </div>
          <div>
            <p className="font-display font-bold text-sm mb-3">Comércio Local</p>
            <ul className="font-body text-white/60 text-xs space-y-2">
              <li>Empresas cadastradas</li>
              <li>Cartão do Servidor</li>
              <li>Compre em {nomeCidade}</li>
            </ul>
          </div>
          <div>
            <p className="font-display font-bold text-sm mb-3">Sala do Empreendedor</p>
            <ul className="font-body text-white/60 text-xs space-y-2">
              {siteConfig?.sala_servicos ? (
                siteConfig.sala_servicos.split(",").map((s, i) => s.trim() && <li key={i}>{s.trim()}</li>)
              ) : (
                <>
                  <li>Abrir um MEI</li>
                  <li>Cursos e capacitações</li>
                </>
              )}
              {siteConfig?.endereco_sala_empreendedor ? (
                <li className="flex items-start gap-1"><MapPin size={12} className="mt-0.5 shrink-0" /> {siteConfig.endereco_sala_empreendedor}</li>
              ) : (
                <li>Atendimento presencial</li>
              )}
              {siteConfig?.sala_horario && <li className="flex items-start gap-1"><Clock size={12} className="mt-0.5 shrink-0" /> {siteConfig.sala_horario}</li>}
              {siteConfig?.telefone && <li>Tel: {siteConfig.telefone}</li>}
            </ul>
          </div>
          <div>
            <p className="font-display font-bold text-sm mb-3">Acesso</p>
            <ul className="font-body text-white/60 text-xs space-y-2">
              <li><a href="#/empresa" className="hover:text-white">Sou empresário</a></li>
              <li><a href="#/admin" className="hover:text-white">Acesso do administrador</a></li>
            </ul>
          </div>
          <div>
            <p className="font-display font-bold text-sm mb-3">Desenvolvedor</p>
            <ul className="font-body text-white/60 text-xs space-y-2">
              <li>Gabriel Oliveira</li>
              <li>Tecnologia e manutenção</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-6 mt-10 pt-5 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-2">
          <p className="font-body text-white/40 text-xs">© 2026 Conecta Comércio · Desenvolvido por Gabriel Oliveira</p>
          <div className="flex items-center gap-3">
            <a href="#/termos" className="font-body text-white/40 text-xs hover:text-white">Termos de uso</a>
            <a href="#/privacidade" className="font-body text-white/40 text-xs hover:text-white">Política de privacidade</a>
          </div>
        </div>
      </footer>

      {empresaAberta && <ModalPerfilEmpresa empresa={empresaAberta} onFechar={fecharEmpresa} />}

      {/* Carrinho de compras — ícone fixo com contador, finalização por WhatsApp */}
      {totalItensCarrinho > 0 && (
        <button onClick={() => setCarrinhoAberto(true)} aria-label="Abrir carrinho de compras"
          className="glow-btn fixed bottom-5 left-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl text-white"
          style={{ background: C.blue }}>
          <ShoppingBag size={22} />
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-body text-[11px] font-bold text-white" style={{ background: "#B4462F" }}>
            {totalItensCarrinho}
          </span>
        </button>
      )}

      {carrinhoAberto && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.55)" }} onClick={() => setCarrinhoAberto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[88vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-5 pb-3 border-b z-10" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
                  <ShoppingBag size={17} />
                </span>
                <p className="font-display font-bold text-base" style={{ color: C.ink }}>Meu carrinho</p>
              </div>
              <button onClick={() => setCarrinhoAberto(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint2 }} aria-label="Fechar">
                <X size={16} color="#425A70" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {gruposCarrinho.length === 0 && (
                <p className="font-body text-sm text-center py-6" style={{ color: "#5C7186" }}>Seu carrinho está vazio.</p>
              )}

              {gruposCarrinho.length > 0 && (
                <div className="grid gap-2">
                  <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                    Seu nome (opcional)
                    <input value={nomeClienteCarrinho} onChange={(e) => setNomeClienteCarrinho(e.target.value)} placeholder="Nome"
                      className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  </label>
                  <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                    Endereço para entrega (opcional)
                    <input value={enderecoClienteCarrinho} onChange={(e) => setEnderecoClienteCarrinho(e.target.value)} placeholder="Rua, número, bairro"
                      className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                  </label>
                </div>
              )}

              {gruposCarrinho.map((grupo) => {
                const subtotal = grupo.itensLista.reduce((s, i) => s + i.preco * i.quantidade, 0);
                const payloadPix = grupo.empresaChavePix ? gerarPayloadPix({ chave: grupo.empresaChavePix, nomeRecebedor: grupo.empresaNome, valor: subtotal }) : null;
                return (
                  <div key={grupo.empresaId} className="rounded-2xl border p-3.5 flex flex-col gap-2.5" style={{ borderColor: C.line }}>
                    <div className="flex items-center justify-between">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{grupo.empresaNome}</p>
                      <button onClick={() => esvaziarCarrinhoEmpresa(grupo.empresaId)} className="font-body text-[11px] font-bold" style={{ color: "#B4462F" }}>Esvaziar</button>
                    </div>
                    {grupo.itensLista.map((item) => (
                      <div key={item.itemId} className="flex items-center gap-2.5">
                        {item.foto_url ? (
                          <img loading="lazy" decoding="async" src={item.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}><ShoppingBag size={15} /></span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs font-semibold truncate" style={{ color: C.ink }}>{item.nome}</p>
                          <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>R$ {item.preco.toFixed(2).replace(".", ",")} cada</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => alterarQuantidadeCarrinho(grupo.empresaId, item.itemId, -1)} className="w-6 h-6 rounded-full border flex items-center justify-center font-body text-xs font-bold" style={{ borderColor: C.line, color: "#425A70" }}>–</button>
                          <span className="font-body text-xs font-bold w-4 text-center" style={{ color: C.ink }}>{item.quantidade}</span>
                          <button onClick={() => alterarQuantidadeCarrinho(grupo.empresaId, item.itemId, 1)} className="w-6 h-6 rounded-full border flex items-center justify-center font-body text-xs font-bold" style={{ borderColor: C.line, color: "#425A70" }}>+</button>
                        </div>
                        <button onClick={() => removerItemCarrinho(grupo.empresaId, item.itemId)} aria-label="Remover item" style={{ color: "#B4462F" }}><X size={14} /></button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: C.line }}>
                      <p className="font-body text-xs font-bold" style={{ color: "#425A70" }}>Total</p>
                      <p className="font-display font-extrabold text-sm" style={{ color: C.blue }}>R$ {subtotal.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <button onClick={() => finalizarPeloWhatsapp(grupo.empresaId)}
                      className="glow-btn w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold font-body text-white" style={{ background: "#25A85B" }}>
                      <MessageCircle size={14} /> Finalizar pelo WhatsApp
                    </button>
                    {payloadPix && (
                      <div className="rounded-xl border p-3 flex flex-col items-center gap-2" style={{ borderColor: C.line, background: C.blueTint2 }}>
                        <p className="font-body text-[11px] font-bold flex items-center gap-1.5" style={{ color: C.blue }}>
                          <QrCode size={13} /> Ou pague com Pix direto pra {grupo.empresaNome}
                        </p>
                        <img loading="lazy" decoding="async" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(payloadPix)}`} alt="QR Code Pix" className="w-32 h-32" />
                        <button onClick={() => { navigator.clipboard?.writeText(payloadPix); setPixCopiadoId(grupo.empresaId); setTimeout(() => setPixCopiadoId(null), 2500); }}
                          className="font-body text-xs font-bold rounded-lg px-3 py-1.5 border w-full" style={{ borderColor: C.line, color: C.blue }}>
                          {pixCopiadoId === grupo.empresaId ? "Copiado! Cole no app do seu banco" : "Copiar código Pix (copia e cola)"}
                        </button>
                        <p className="font-body text-[10px] text-center" style={{ color: "#8896A6" }}>
                          O pagamento vai direto pra empresa — o Conecta Comércio não processa nem recebe o valor.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entrar / Cadastro — segue o modelo institucional do site oficial
// (logo + card branco), com o acabamento moderno da
// plataforma.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Minha conta — perfil simples pra qualquer pessoa logada (morador/cliente,
// empresário ou admin): editar nome/telefone, ver empresas favoritadas e
// sair da conta. FASE 40.
// ---------------------------------------------------------------------------
function MinhaConta({ perfil, sessao }) {
  const [dados, setDados] = useState(null); // null = carregando
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState("");
  const [favoritas, setFavoritas] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado || !sessao?.user?.id) return;
    supabase.from("perfis").select("nome, email, telefone, tipo").eq("id", sessao.user.id).single().then(({ data }) => {
      if (data) { setDados(data); setNome(data.nome || ""); setTelefone(data.telefone || ""); }
    });
  }, [sessao?.user?.id]);

  useEffect(() => {
    if (!supabaseConfigurado) { setFavoritas([]); return; }
    let mapa = {};
    try { mapa = JSON.parse(localStorage.getItem("cc_favoritos_empresas") || "{}"); } catch { mapa = {}; }
    const ids = Object.keys(mapa).filter((id) => mapa[id]);
    if (ids.length === 0) { setFavoritas([]); return; }
    supabase.from("empresas").select("id, nome, categoria").in("id", ids).then(({ data, error }) => {
      setFavoritas(error ? [] : data || []);
    });
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setStatus("");
    setSalvando(true);
    try {
      const { error } = await supabase.from("perfis").update({ nome, telefone }).eq("id", sessao.user.id);
      if (error) throw error;
      setStatus("ok");
    } catch (err) {
      setStatus(err.message || "Não foi possível salvar agora.");
    } finally {
      setSalvando(false);
    }
  };

  const sair = async () => {
    if (supabaseConfigurado) await supabase.auth.signOut();
  };

  const rotuloTipo = { cliente: "Morador", empresario: "Empresário", prestador: "Prestador de serviço", admin: "Administrador" };

  return (
    <div className="max-w-lg mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Sua conta" title="Minha conta" sub={rotuloTipo[perfil?.tipo] || ""} />
      <form onSubmit={salvar} className="rounded-2xl border p-5 flex flex-col gap-3 mt-6" style={{ borderColor: C.line }}>
        <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
        </label>
        <label className="font-body text-xs font-semibold flex flex-col gap-1" style={{ color: "#425A70" }}>
          Telefone / WhatsApp
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
        </label>
        {dados?.email && (
          <p className="font-body text-xs" style={{ color: "#8896A6" }}>E-mail: {dados.email}</p>
        )}
        {status && status !== "ok" && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{status}</p>}
        {status === "ok" && <p className="font-body text-xs font-semibold" style={{ color: "#1E8E5A" }}>Salvo!</p>}
        <button type="submit" disabled={salvando} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="mt-6">
        <p className="font-display font-bold text-sm mb-2" style={{ color: C.ink }}>Empresas favoritadas</p>
        {favoritas === null && <Skeleton className="h-10 w-full" />}
        {favoritas && favoritas.length === 0 && <p className="font-body text-xs" style={{ color: "#5C7186" }}>Você ainda não favoritou nenhuma empresa.</p>}
        <div className="flex flex-col gap-2">
          {(favoritas || []).map((f) => (
            <div key={f.id} className="rounded-lg border px-3 py-2 flex items-center justify-between" style={{ borderColor: C.line }}>
              <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>{f.nome}</span>
              <span className="font-body text-[11px]" style={{ color: "#8896A6" }}>{f.categoria}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={sair} className="font-body text-xs font-bold rounded-lg px-4 py-2.5 border mt-6 flex items-center gap-1.5" style={{ borderColor: C.line, color: "#B4462F" }}>
        Sair da conta
      </button>
    </div>
  );
}

function ContaAcesso({ abaInicial = "cadastro", mensagem = "", onSucesso }) {
  const categoriasReaisConta = useCategoriasReais();
  // tela: "entrar" | "escolha" | "cadastro-cliente" | "cadastro-empresario"
  const [tela, setTela] = useState(abaInicial === "entrar" ? "entrar" : "escolha");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [logoEmpresa, setLogoEmpresa] = useState(null);
  const [fotoPrestador, setFotoPrestador] = useState(null);

  const submeterCadastro = async (e, tipo) => {
    e.preventDefault();
    setErro("");
    const form = new FormData(e.target);

    if (!supabaseConfigurado) { setEnviado(true); return; }

    const senha = form.get("senha");
    const confirmarSenha = form.get("confirmarSenha");
    if (senha !== confirmarSenha) { setErro("As senhas não conferem."); return; }

    setCarregando(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: form.get("email"), password: senha });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const { error: erroPerfil } = await supabase.from("perfis").insert({
          id: userId, nome: form.get("nome"), tipo, telefone: form.get("whatsapp"), email: form.get("email"),
        });
        if (erroPerfil) throw new Error("Não foi possível criar seu perfil: " + erroPerfil.message);

        if (tipo === "empresario") {
          let logoUrl = null;
          if (logoEmpresa) {
            const caminho = `logos/${Date.now()}-${logoEmpresa.name}`;
            const { error: erroUpload } = await supabase.storage.from("logos").upload(caminho, logoEmpresa);
            if (!erroUpload) {
              const { data: pub } = supabase.storage.from("logos").getPublicUrl(caminho);
              logoUrl = pub.publicUrl;
            }
          }
          const { error: erroEmpresa } = await supabase.from("empresas").insert({
            dono_id: userId,
            nome: form.get("nomeEmpresa"),
            categoria: form.get("categoria") || "A definir",
            whatsapp: form.get("whatsapp"),
            instagram: form.get("instagram") || null,
            endereco: form.get("endereco") || null,
            regiao: form.get("regiao") || "ivatuba",
            google_maps_url: form.get("googleMaps") || null,
            email: form.get("email") || null,
            cpf: form.get("cpf") || null,
            cnpj: form.get("cnpj") || null,
            aceita_cartao_servidor: form.get("aceitaCartaoServidor") === "on",
            logo_url: logoUrl,
            // Cadastro de empresa aprovado automaticamente — já aparece no
            // site assim que o empresário termina o cadastro.
            status: "aprovada",
          });
          if (erroEmpresa) throw new Error("Seu login foi criado, mas a empresa não pôde ser cadastrada: " + erroEmpresa.message);
        }

        if (tipo === "prestador") {
          let fotoUrl = null;
          if (fotoPrestador) {
            const caminho = `prestadores/${Date.now()}-${fotoPrestador.name}`;
            const { error: erroUpload } = await supabase.storage.from("fotos-empresas").upload(caminho, fotoPrestador);
            if (!erroUpload) {
              const { data: pub } = supabase.storage.from("fotos-empresas").getPublicUrl(caminho);
              fotoUrl = pub.publicUrl;
            }
          }
          const { error: erroPrestador } = await supabase.from("prestadores").insert({
            dono_id: userId,
            nome: form.get("nome"),
            servico: form.get("servico"),
            endereco: form.get("endereco"),
            whatsapp: form.get("whatsapp"),
            instagram: form.get("instagram"),
            google_maps_url: form.get("googleMaps") || null,
            email: form.get("email") || null,
            cpf: form.get("cpf") || null,
            cnpj: form.get("cnpj") || null,
            foto_url: fotoUrl,
            // Cadastro de prestador aprovado automaticamente — igual já
            // acontece com empresa, aparece no site assim que termina.
            status: "aprovado",
          });
          if (erroPrestador) throw new Error("Seu login foi criado, mas o cadastro de prestador não pôde ser concluído: " + erroPrestador.message);
        }
      }
      setEnviado(true);
      setTimeout(() => onSucesso?.(), 1400);
    } catch (err) {
      setErro(err.message || "Não foi possível concluir. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const submeterEntrar = async (e) => {
    e.preventDefault();
    setErro("");
    const form = new FormData(e.target);

    if (!supabaseConfigurado) { setEnviado(true); return; }

    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: form.get("email"), password: form.get("senha") });
      if (error) throw error;
      setEnviado(true);
      setTimeout(() => onSucesso?.(), 900);
    } catch (err) {
      setErro(err.message || "Não foi possível concluir. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const irPara = (novaTela) => { setTela(novaTela); setEnviado(false); setErro(""); };

  const textoLateral = {
    entrar: { titulo: "Olá, bem-vindo!", desc: "Entre com sua conta para acessar a plataforma." },
    escolha: { titulo: "Como você quer entrar?", desc: "Cada área tem seu próprio cadastro, pensado pra o que você precisa fazer." },
    "cadastro-cliente": { titulo: "Cadastro de Cliente", desc: "Favorite empresas, candidate-se a vagas e acompanhe as promoções da cidade." },
    "cadastro-empresario": { titulo: "Cadastro de Empresário", desc: "Cadastre sua empresa, publique produtos e vagas, e apareça na vitrine local." },
    "cadastro-prestador": { titulo: "Cadastro de Prestador de Serviço", desc: "Divulgue seu serviço com contato e endereço no site oficial." },
  }[tela];

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center"
      style={{ background: `linear-gradient(160deg, ${C.blue} 0%, ${C.blueDeep} 100%)` }}>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute -top-24 -left-16 w-96 h-96 rounded-full" style={{ background: "#3E8FD9" }} />
        <div className="blob blob-b absolute bottom-[-8rem] right-[-4rem] w-96 h-96 rounded-full" style={{ background: C.amber, opacity: 0.3 }} />
      </div>

      <div className="relative max-w-5xl w-full mx-auto px-4 md:px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl">
        {/* Painel institucional */}
        <div className="p-8 md:p-10 flex flex-col justify-between" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(6px)" }}>
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size={40} />
              <div>
                <p className="font-display font-extrabold text-white leading-none">CONECTACOMÉRCIO</p>
                <p className="font-body text-white/60 text-[10px] tracking-widest uppercase mt-1">Comércio Local de Ivatuba</p>
              </div>
            </div>

            <h1 className="font-display font-extrabold grad-text text-[28px] md:text-[32px] leading-tight mt-9">
              {textoLateral.titulo}
            </h1>
            <p className="font-body text-white/75 text-sm mt-3 max-w-xs">
              {textoLateral.desc}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-10">
            <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0">
              <ShieldCheck size={20} color={C.blue} />
            </span>
            <p className="font-body text-white/60 text-xs leading-snug">
              Plataforma independente para fortalecer o comércio local de Ivatuba.
            </p>
          </div>
        </div>

        {/* Card do formulário */}
        <div className="bg-white p-8 md:p-10">
          <div className="flex items-center gap-2 mb-7">
            {tela !== "entrar" && tela !== "escolha" && (
              <button onClick={() => irPara("escolha")} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueTint2 }}>
                <ChevronLeft size={16} color="#425A70" />
              </button>
            )}
            <div className="flex items-center gap-1 rounded-full p-1 w-fit" style={{ background: C.blueTint }}>
              {[["escolha", "Criar conta"], ["entrar", "Entrar"]].map(([id, label]) => (
                <button key={id} onClick={() => irPara(id)}
                  className="font-body text-xs font-bold px-4 py-2 rounded-full transition-colors"
                  style={{ background: (tela === id || (id === "escolha" && tela.startsWith("cadastro"))) ? C.blue : "transparent", color: (tela === id || (id === "escolha" && tela.startsWith("cadastro"))) ? "#fff" : C.blue }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mensagem && (
            <div className="mb-5 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: C.blueTint, color: C.blueDark }}>
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              {mensagem}
            </div>
          )}

          {!supabaseConfigurado && (
            <div className="mb-5 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
              <BadgeCheck size={14} className="mt-0.5 shrink-0" />
              Modo demonstração: conecte o Supabase (arquivo .env) para ativar cadastro e login reais.
            </div>
          )}

          {erro && (
            <div className="mb-5 rounded-xl px-3.5 py-2.5 font-body text-xs" style={{ background: "#FBEAE5", color: "#B4462F" }}>
              {erro}
            </div>
          )}

          {enviado ? (
            <div className="py-10 text-center">
              <span className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.blueTint }}>
                <CheckCircle2 size={26} color={C.blue} />
              </span>
              <p className="font-display font-bold text-lg" style={{ color: C.ink }}>
                {tela === "entrar" ? "Login realizado!" : "Conta criada com sucesso!"}
              </p>
              <p className="font-body text-sm mt-1" style={{ color: "#5C7186" }}>
                {tela === "cadastro-empresario"
                  ? "Sua empresa entrará em análise para aprovação."
                  : "Você já pode explorar a plataforma."}
              </p>
            </div>
          ) : tela === "escolha" ? (
            <div className="flex flex-col gap-4">
              <button onClick={() => irPara("cadastro-cliente")}
                className="glow-card flex items-start gap-4 p-5 rounded-2xl border text-left" style={{ borderColor: C.line }}>
                <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                  <UserCircle2 size={22} />
                </span>
                <div>
                  <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Sou Cliente</p>
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>
                    Quero explorar empresas, favoritar produtos, me candidatar a vagas e acompanhar promoções.
                  </p>
                </div>
              </button>

              <button onClick={() => irPara("cadastro-empresario")}
                className="glow-card flex items-start gap-4 p-5 rounded-2xl border text-left" style={{ borderColor: C.amberDark, background: "#FFF9F0" }}>
                <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.amber, color: C.blueDeep }}>
                  <Briefcase size={22} />
                </span>
                <div>
                  <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Tenho uma Empresa</p>
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>
                    Quero cadastrar meu negócio, publicar produtos, promoções e vagas de emprego.
                  </p>
                </div>
              </button>

              <button onClick={() => irPara("cadastro-prestador")}
                className="glow-card flex items-start gap-4 p-5 rounded-2xl border text-left" style={{ borderColor: C.line }}>
                <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                  <Wrench size={22} />
                </span>
                <div>
                  <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Sou Prestador de Serviço</p>
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>
                    Quero divulgar meu serviço (autônomo ou informal) no site oficial, com contato e endereço.
                  </p>
                </div>
              </button>
            </div>
          ) : tela === "cadastro-cliente" ? (
            <form onSubmit={(e) => submeterCadastro(e, "cliente")} className="flex flex-col gap-3.5">
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Nome completo
                <input name="nome" required placeholder="Como você se chama" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  E-mail
                  <input name="email" required type="email" placeholder="voce@email.com" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  WhatsApp <span style={{ color: "#B7C6D6" }}>(opcional)</span>
                  <input name="whatsapp" placeholder="(44) 90000-0000" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Senha
                  <input name="senha" required type="password" minLength={8} placeholder="Mínimo 8 caracteres" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Confirmar senha
                  <input name="confirmarSenha" required type="password" minLength={8} placeholder="Repita a senha" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <label className="flex items-start gap-2 mt-1">
                <input required type="checkbox" className="mt-0.5" />
                <span className="font-body text-xs" style={{ color: "#5C7186" }}>
                  Li e aceito os termos de uso da plataforma e a política de privacidade.
                </span>
              </label>
              <button type="submit" disabled={carregando} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-3 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {carregando ? "Enviando..." : "Criar minha conta"}
              </button>
            </form>
          ) : tela === "cadastro-empresario" ? (
            <form onSubmit={(e) => submeterCadastro(e, "empresario")} className="flex flex-col gap-3.5">
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Seu nome completo
                <input name="nome" required placeholder="Nome do responsável" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Nome da empresa
                <input name="nomeEmpresa" required placeholder="Ex: Padaria Pão Nosso" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Categoria
                <select name="categoria" required defaultValue="" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                  <option value="" disabled>Selecione uma categoria</option>
                  {(categoriasReaisConta ?? categorias).map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                </select>
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Endereço
                <input name="endereco" placeholder="Rua, número, bairro" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Região
                <select name="regiao" defaultValue="ivatuba" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white" style={{ borderColor: C.line }}>
                  <option value="ivatuba">Ivatuba (Centro)</option>
                  <option value="bairro_refugio">Bairro do Refúgio</option>
                </select>
              </label>
              <label className="font-body text-xs font-semibold flex items-center gap-2 cursor-pointer" style={{ color: C.blue }}>
                <Camera size={14} /> {logoEmpresa ? `Logo: ${logoEmpresa.name}` : "Enviar logo da empresa (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoEmpresa(e.target.files?.[0] || null)} />
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  E-mail
                  <input name="email" required type="email" placeholder="voce@email.com" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  WhatsApp
                  <input name="whatsapp" required placeholder="(44) 90000-0000" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Instagram (opcional)
                  <input name="instagram" placeholder="@suaempresa" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Link do Google Maps (opcional)
                  <input name="googleMaps" type="url" placeholder="https://maps.google.com/..." className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  CPF (do responsável)
                  <input name="cpf" required placeholder="000.000.000-00" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  CNPJ (opcional)
                  <input name="cnpj" placeholder="00.000.000/0000-00" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <label className="flex items-start gap-2 mt-1 rounded-xl border p-3" style={{ borderColor: C.line, background: C.blueTint2 }}>
                <input name="aceitaCartaoServidor" type="checkbox" className="mt-0.5" />
                <span className="font-body text-xs" style={{ color: "#425A70" }}>
                  <strong>Aceito o Cartão do Servidor</strong> como forma de pagamento/desconto — vai aparecer um selo na sua empresa no site.
                </span>
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Senha
                  <input name="senha" required type="password" minLength={8} placeholder="Mínimo 8 caracteres" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Confirmar senha
                  <input name="confirmarSenha" required type="password" minLength={8} placeholder="Repita a senha" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <label className="flex items-start gap-2 mt-1">
                <input required type="checkbox" className="mt-0.5" />
                <span className="font-body text-xs" style={{ color: "#5C7186" }}>
                  Li e aceito os termos de uso da plataforma e a política de privacidade.
                </span>
              </label>
              <button type="submit" disabled={carregando} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-3 mt-1 disabled:opacity-60" style={{ background: C.amberDark }}>
                {carregando ? "Enviando..." : "Cadastrar minha empresa"}
              </button>
              <p className="font-body text-[11px] text-center" style={{ color: "#B7C6D6" }}>
                Seu cadastro já aparece no site assim que você concluir.
              </p>
            </form>
          ) : tela === "cadastro-prestador" ? (
            <form onSubmit={(e) => submeterCadastro(e, "prestador")} className="flex flex-col gap-3.5">
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Seu nome completo
                <input name="nome" required placeholder="Como você se chama" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Serviço que presta
                <input name="servico" required placeholder="Ex: Eletricista, Diarista, Cabeleireiro..." className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Endereço (opcional)
                <input name="endereco" placeholder="Rua, número, bairro" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold flex items-center gap-2 cursor-pointer" style={{ color: C.blue }}>
                <Camera size={14} /> {fotoPrestador ? `Foto: ${fotoPrestador.name}` : "Enviar sua foto (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoPrestador(e.target.files?.[0] || null)} />
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  E-mail
                  <input name="email" required type="email" placeholder="voce@email.com" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  WhatsApp
                  <input name="whatsapp" required placeholder="(44) 90000-0000" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Instagram (opcional)
                  <input name="instagram" placeholder="@seuservico" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Link do Google Maps (opcional)
                  <input name="googleMaps" type="url" placeholder="https://maps.google.com/..." className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  CPF
                  <input name="cpf" required placeholder="000.000.000-00" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  CNPJ (opcional)
                  <input name="cnpj" placeholder="00.000.000/0000-00" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Senha
                  <input name="senha" required type="password" minLength={8} placeholder="Mínimo 8 caracteres" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
                <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                  Confirmar senha
                  <input name="confirmarSenha" required type="password" minLength={8} placeholder="Repita a senha" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                </label>
              </div>
              <label className="flex items-start gap-2 mt-1">
                <input required type="checkbox" className="mt-0.5" />
                <span className="font-body text-xs" style={{ color: "#5C7186" }}>
                  Li e aceito os termos de uso da plataforma e a política de privacidade.
                </span>
              </label>
              <button type="submit" disabled={carregando} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-3 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {carregando ? "Enviando..." : "Cadastrar meu serviço"}
              </button>
              <p className="font-body text-[11px] text-center" style={{ color: "#B7C6D6" }}>
                Seu cadastro fica em análise até ser aprovado pelo administrador da plataforma.
              </p>
            </form>
          ) : (
            <form onSubmit={submeterEntrar} className="flex flex-col gap-3.5">
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                E-mail
                <input name="email" required type="email" placeholder="voce@email.com" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <label className="font-body text-xs font-semibold" style={{ color: "#425A70" }}>
                Senha
                <input name="senha" required type="password" placeholder="Sua senha" className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </label>
              <button type="button" className="font-body text-xs font-semibold text-right w-fit ml-auto" style={{ color: C.blue }}>Esqueci minha senha</button>
              <button type="submit" disabled={carregando} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-3 mt-1 disabled:opacity-60" style={{ background: C.blue }}>
                {carregando ? "Entrando..." : "Entrar"}
              </button>
              <p className="font-body text-xs text-center mt-1" style={{ color: "#5C7186" }}>
                Não tem uma conta?{" "}
                <button type="button" onClick={() => irPara("escolha")} className="font-bold" style={{ color: C.blue }}>Cadastre-se aqui</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assistente virtual — botão flutuante com IA (fala com /api/chat, que por
// sua vez fala com a Anthropic usando a chave guardada no servidor).
// ---------------------------------------------------------------------------
// Botão flutuante de compartilhar — aparece em todas as abas do site.
// Em celular, abre o menu nativo de compartilhamento (WhatsApp, etc.) com o
// link da página atual; no computador (sem esse menu), copia o link.
function BotaoCompartilhar() {
  const [copiado, setCopiado] = useState(false);

  const compartilhar = async () => {
    const url = window.location.href;
    const titulo = document.title || "Conecta Comércio";
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
      } catch (e) {
        // usuário cancelou o compartilhamento — não faz nada
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      const campo = document.createElement("textarea");
      campo.value = url;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      document.body.removeChild(campo);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <button onClick={compartilhar} aria-label="Compartilhar essa página"
      className="fixed top-20 right-3 z-40 flex items-center gap-1.5 pl-3 pr-3.5 h-10 rounded-full shadow-lg bg-white border font-body text-xs font-bold"
      style={{ borderColor: C.line, color: C.blue }}>
      {copiado ? <CheckCircle2 size={15} /> : <Share2 size={15} />}
      {copiado ? "Link copiado!" : "Compartilhar"}
    </button>
  );
}

function ChatWidget() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([
    { role: "assistant", content: "Oi! Sou o assistente do Conecta Comércio. Posso ajudar a encontrar empresas, produtos, vagas ou tirar dúvidas sobre a Sala do Empreendedor. 😊" },
  ]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const fimRef = useRef(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto]);

  const enviar = async (e) => {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || carregando) return;

    const novasMensagens = [...mensagens, { role: "user", content: conteudo }];
    setMensagens(novasMensagens);
    setTexto("");
    setErro("");
    setCarregando(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: novasMensagens.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error || "Não consegui responder agora.");
      setMensagens((atual) => [...atual, { role: "assistant", content: dados.texto }]);
    } catch (err) {
      setErro(err.message || "Não consegui responder agora. Tente de novo em instantes.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setAberto((v) => !v)}
        className="glow-btn fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: aberto ? C.blueDeep : C.blue }}
        aria-label={aberto ? "Fechar assistente virtual" : "Abrir assistente virtual"}
        aria-expanded={aberto}
      >
        {aberto ? <X size={22} color="#fff" /> : <Sparkles size={22} color="#fff" />}
      </button>

      {aberto && (
        <div className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm rounded-2xl overflow-hidden shadow-2xl border flex flex-col"
          style={{ borderColor: C.line, height: "min(70vh, 520px)" }}>
          <div className="px-4 py-3 flex items-center gap-2.5 text-white" style={{ background: `linear-gradient(120deg, ${C.blueDeep}, ${C.blue})` }}>
            <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Sparkles size={15} />
            </span>
            <div>
              <p className="font-display font-bold text-sm leading-none">Assistente Conecta Comércio</p>
              <p className="font-body text-[11px] text-white/70 mt-1">Powered by IA · Conecta Comércio</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5 bg-white">
            {mensagens.map((m, i) => (
              <div key={i} className={`max-w-[85%] font-body text-sm px-3.5 py-2.5 rounded-2xl leading-snug ${m.role === "user" ? "self-end text-white" : "self-start"}`}
                style={{ background: m.role === "user" ? C.blue : C.blueTint, color: m.role === "user" ? "#fff" : C.ink }}>
                {m.content}
              </div>
            ))}
            {carregando && (
              <div className="self-start font-body text-xs px-3.5 py-2.5 rounded-2xl" style={{ background: C.blueTint, color: "#5C7186" }}>
                digitando...
              </div>
            )}
            {erro && (
              <div className="self-start font-body text-xs px-3.5 py-2.5 rounded-2xl" style={{ background: "#FBEAE5", color: "#B4462F" }}>
                {erro}
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <form onSubmit={enviar} className="flex items-center gap-2 p-2.5 border-t" style={{ borderColor: C.line }}>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 min-w-0 font-body text-sm outline-none px-3 py-2.5 rounded-xl border"
              style={{ borderColor: C.line }}
            />
            <button type="submit" disabled={carregando} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
              style={{ background: C.blue }}>
              <Send size={16} color="#fff" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Acesso restrito — mostrado quando a pessoa está logada, mas com um perfil
// que não dá permissão para aquele painel (ex: cliente tentando abrir o
// painel admin).
// ---------------------------------------------------------------------------
function LoadingBrand({ texto = "Carregando..." }) {
  return (
    <div className="max-w-md mx-auto px-4 py-24 flex flex-col items-center gap-4 text-center">
      <span className="relative flex items-center justify-center w-16 h-16">
        <span className="absolute inset-0 rounded-full border-4 animate-spin" style={{ borderColor: C.blueTint, borderTopColor: C.blue }} />
        <LogoMark size={34} />
      </span>
      <p className="font-body text-sm font-semibold" style={{ color: "#5C7186" }}>{texto}</p>
    </div>
  );
}

function AcessoRestrito({ tipo, onEntrar }) {
  const trocarConta = async () => {
    if (supabaseConfigurado) await supabase.auth.signOut();
    onEntrar?.();
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <span className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FBEAE5" }}>
        <ShieldCheck size={24} color="#B4462F" />
      </span>
      <p className="font-display font-bold text-lg" style={{ color: C.ink }}>Você não tem acesso a esse painel</p>
      <p className="font-body text-sm mt-2" style={{ color: "#5C7186" }}>
        {tipo === "admin"
          ? "Essa área é exclusiva para administradores da plataforma."
          : "Essa área é exclusiva para empresários com uma empresa cadastrada."}
      </p>
      <button onClick={trocarConta} className="glow-btn font-body text-sm font-bold mt-6 px-5 py-2.5 rounded-xl text-white" style={{ background: C.blue }}>
        Entrar com outra conta
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Links diretos de acesso — o administrador e o empresario (vendedor) entram
// por um link proprio (ex: seusite.com/#/admin ou #/empresa), sem precisar
// navegar pelo site publico. Qualquer pessoa continua entrando no site em
// "/" ou "#/", sem nenhum cadastro. A rota e refletida na URL (hash), entao
// esses links podem ser copiados e compartilhados de verdade.
// ---------------------------------------------------------------------------
const ROTA_HASH = { site: "#/", conta: "#/entrar", admin: "#/admin", empresario: "#/empresa", estatisticas: "#/estatisticas", turismo: "#/turismo", mural: "#/mural", termos: "#/termos", privacidade: "#/privacidade", utilidade: "#/utilidade", ouvidoria: "#/ouvidoria", classificados: "#/classificados" };

function modoDaHash(hash) {
  const h = (hash || "").toLowerCase();
  if (!h || h === "#" || h === "#/") return "site";
  if (h.startsWith("#/admin")) return "admin";
  if (h.startsWith("#/estatisticas") || h.startsWith("#/numeros")) return "estatisticas";
  if (h.startsWith("#/turismo")) return "turismo";
  if (h.startsWith("#/mural")) return "mural";
  if (h.startsWith("#/utilidade")) return "utilidade";
  if (h.startsWith("#/ouvidoria")) return "ouvidoria";
  if (h.startsWith("#/classificados")) return "classificados";
  if (h.startsWith("#/termos")) return "termos";
  if (h.startsWith("#/privacidade")) return "privacidade";
  if (h.startsWith("#/empresa") || h.startsWith("#/vendedor")) return "empresario";
  if (h.startsWith("#/cadastro")) return "cadastro-conta";
  if (h.startsWith("#/entrar") || h.startsWith("#/conta")) return "conta";
  return null;
}

// ---------------------------------------------------------------------------
// Página legal simples (Termos de uso / Política de privacidade) — texto
// editável pelo admin, com parágrafos separados por linha em branco. FASE 45.
// ---------------------------------------------------------------------------
function PaginaLegal({ titulo, texto }) {
  useEffect(() => {
    document.title = `${titulo} — Conecta Comércio`;
    return () => { document.title = "Conecta Comércio · Ivatuba - PR"; };
  }, [titulo]);

  const paragrafos = (texto || "").split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Legal" title={titulo} />
      <div className="flex flex-col gap-3.5 mt-4">
        {paragrafos.length > 0 ? (
          paragrafos.map((par, i) => (
            <p key={i} className="font-body text-sm leading-relaxed" style={{ color: "#425A70" }}>{par}</p>
          ))
        ) : (
          <p className="font-body text-sm" style={{ color: "#5C7186" }}>Conteúdo ainda não cadastrado.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mural da comunidade — qualquer morador publica sugestão, elogio,
// reclamação ou aviso; só aparece pra todo mundo depois que o admin aprova.
// FASE 43 (última do backlog de novas funcionalidades).
// ---------------------------------------------------------------------------
function PaginaMural({ perfil }) {
  const { nomeCidadeUF } = useCidade();
  const [publicacoes, setPublicacoes] = useState(null);
  const [nome, setNome] = useState(perfil?.nome || "");
  const [categoria, setCategoria] = useState("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    document.title = "Mural da comunidade — Conecta Comércio";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", `Sugestões, elogios, reclamações e avisos da comunidade de ${nomeCidadeUF}.`);
    return () => {
      document.title = `Conecta Comércio · ${nomeCidadeUF}`;
      if (metaDesc) metaDesc.setAttribute("content", `Plataforma independente para fortalecer o comércio local de ${nomeCidadeUF}.`);
    };
  }, []);

  const carregar = () => {
    if (!supabaseConfigurado) { setPublicacoes([]); return; }
    supabase.from("mural_comunidade").select("*").eq("status", "aprovado").order("criado_em", { ascending: false }).limit(50).then(({ data, error }) => {
      setPublicacoes(error ? [] : data || []);
    });
  };
  useEffect(carregar, []);

  const publicar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!nome.trim() || !mensagem.trim()) { setErro("Preencha seu nome e a mensagem."); return; }
    if (!supabaseConfigurado) { setEnviado(true); return; }
    setEnviando(true);
    try {
      const { error } = await supabase.from("mural_comunidade").insert({ nome, categoria, mensagem, status: "pendente" });
      if (error) throw error;
      setEnviado(true);
      setMensagem("");
    } catch (err) {
      setErro(err.message || "Não consegui publicar agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const categorias = { sugestao: "Sugestão", elogio: "Elogio", reclamacao: "Reclamação", aviso: "Aviso" };
  const corCategoria = { sugestao: C.blue, elogio: "#1E8E5A", reclamacao: "#B4462F", aviso: "#8A5A12" };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Sua voz" title="Mural da comunidade" sub="Sugestões, elogios, reclamações e avisos de quem mora na cidade" />

      <div className="rounded-2xl border p-5 mt-6" style={{ borderColor: C.line }}>
        {enviado ? (
          <p className="font-body text-sm font-semibold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
            <CheckCircle2 size={15} /> Recebemos sua publicação! Ela aparece aqui assim que for aprovada.
          </p>
        ) : (
          <form onSubmit={publicar} className="flex flex-col gap-2.5">
            <div className="grid sm:grid-cols-2 gap-2.5">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                {Object.entries(categorias).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={3} placeholder="Escreva sua mensagem..." className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
            {erro && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erro}</p>}
            <button type="submit" disabled={enviando} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
              {enviando ? "Publicando..." : "Publicar no mural"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {publicacoes === null && <Skeleton className="h-24 w-full" />}
        {publicacoes && publicacoes.length === 0 && (
          <p className="font-body text-sm" style={{ color: "#5C7186" }}>Ainda não tem nenhuma publicação — seja o primeiro a escrever.</p>
        )}
        {(publicacoes || []).map((m) => (
          <div key={m.id} className="rounded-2xl border p-4 bg-white" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between">
              <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{m.nome}</p>
              <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint2, color: corCategoria[m.categoria] || C.blue }}>
                {categorias[m.categoria] || m.categoria}
              </span>
            </div>
            <p className="font-body text-sm mt-1.5" style={{ color: "#425A70" }}>{m.mensagem}</p>
            {m.resposta_admin && (
              <div className="mt-2.5 rounded-lg px-3 py-2" style={{ background: C.blueTint2 }}>
                <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>Resposta da administração</p>
                <p className="font-body text-xs" style={{ color: "#425A70" }}>{m.resposta_admin}</p>
              </div>
            )}
            <p className="font-body text-[10px] mt-2" style={{ color: "#8896A6" }}>
              {m.criado_em ? new Date(m.criado_em).toLocaleDateString("pt-BR") : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Turismo — história da cidade + roteiro sugerido pelos pontos
// turísticos, na ordem definida pelo admin. FASE 42.
// ---------------------------------------------------------------------------
// Formulário de avaliação de um ponto turístico — nome, nota em estrelas e
// comentário opcional. Igual ao padrão já usado para empresas, mas ligado a
// `ponto_turistico_id` em vez de `empresa_id`.
function AvaliacaoTurismoForm({ pontoId, onEnviado }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) { setErro("Diga seu nome."); return; }
    setEnviando(true);
    const { error } = await supabase.from("avaliacoes").insert({
      ponto_turistico_id: pontoId,
      nome: nome.trim(),
      nota,
      comentario: comentario.trim() || null,
      status: "aprovado",
    });
    setEnviando(false);
    if (error) { setErro(error.message || "Não consegui enviar agora."); return; }
    setNome(""); setNota(5); setComentario(""); setAberto(false);
    onEnviado?.();
  };

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="font-body text-[11px] font-bold flex items-center gap-1 mt-2" style={{ color: C.blue }}>
        <Star size={11} /> Avaliar / deixar depoimento
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-2 rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: C.line, background: C.blueTint2 }}>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setNota(n)}>
            <Star size={16} fill={n <= nota ? "#E8A23D" : "none"} color="#E8A23D" />
          </button>
        ))}
      </div>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="font-body text-xs border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte sua experiência (opcional)" rows={2} className="font-body text-xs border rounded-lg px-3 py-2 outline-none" style={{ borderColor: C.line }} />
      {erro && <p className="font-body text-[11px]" style={{ color: "#B4462F" }}>{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="font-body text-xs font-bold rounded-lg px-4 py-2 text-white disabled:opacity-60" style={{ background: C.blue }}>
          {enviando ? "Enviando..." : "Enviar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="font-body text-xs font-bold rounded-lg px-4 py-2 border" style={{ borderColor: C.line, color: "#5C7186" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ModalDetalhePontoTuristico({ p, avaliacoes, onFechar, onEnviado }) {
  const media = avaliacoes.length ? avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length : 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,26,46,0.6)" }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="h-56 relative overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
          {p.foto_url ? (
            <img loading="lazy" decoding="async" src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><MapPinned size={44} className="text-white/90" /></div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,26,46,0.75), rgba(5,26,46,0) 55%)" }} />
          <button onClick={onFechar} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/90" aria-label="Fechar"><X size={16} color="#425A70" /></button>
          <div className="absolute left-5 bottom-4 right-5">
            {p.destaque && (
              <span className="inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mb-1.5" style={{ background: C.amber, color: C.blueDeep }}>
                <Star size={10} fill={C.blueDeep} /> Destaque
              </span>
            )}
            <p className="font-display font-extrabold text-xl text-white">{p.nome}</p>
            {p.categoria && <p className="font-body text-xs font-semibold text-white/85 mt-0.5">{p.categoria}</p>}
          </div>
        </div>
        <div className="p-5">
          {p.descricao && <p className="font-body text-sm" style={{ color: "#425A70" }}>{p.descricao}</p>}
          <div className="flex flex-wrap gap-3 mt-3">
            {p.endereco && <span className="font-body text-xs flex items-center gap-1" style={{ color: "#8896A6" }}><MapPin size={12} /> {p.endereco}</span>}
            {p.google_maps_url && (
              <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold flex items-center gap-1" style={{ color: C.blue }}>
                <ExternalLink size={12} /> Ver no mapa
              </a>
            )}
          </div>

          {avaliacoes.length > 0 && (
            <div className="mt-4 flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} fill={n <= Math.round(media) ? "#E8A23D" : "none"} color="#E8A23D" />)}
              </div>
              <span className="font-body text-xs" style={{ color: "#8896A6" }}>({avaliacoes.length} {avaliacoes.length === 1 ? "avaliação" : "avaliações"})</span>
            </div>
          )}
          {avaliacoes.slice(0, 3).map((a) => (
            <div key={a.id} className="mt-2 pl-2 border-l-2" style={{ borderColor: C.line }}>
              <p className="font-body text-xs font-bold" style={{ color: C.ink }}>{a.nome}</p>
              {a.comentario && <p className="font-body text-xs" style={{ color: "#5C7186" }}>{a.comentario}</p>}
            </div>
          ))}

          <AvaliacaoTurismoForm pontoId={p.id} onEnviado={onEnviado} />
        </div>
      </div>
    </div>
  );
}

function CardPontoTuristico({ p, destaqueGrande, nota, onAbrir, delay }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="glow-card group text-left rounded-3xl border overflow-hidden bg-white hero-in-left flex flex-col"
      style={{ borderColor: C.line, animationDelay: `${delay}ms` }}
    >
      <div className={`relative overflow-hidden shrink-0 ${destaqueGrande ? "h-56" : "h-36"}`} style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
        {p.foto_url ? (
          <img loading="lazy" decoding="async" src={p.foto_url} alt={p.nome} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><MapPinned size={destaqueGrande ? 40 : 28} className="text-white/90" /></div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,26,46,0.78), rgba(5,26,46,0) 60%)" }} />
        {p.destaque && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ background: C.amber, color: C.blueDeep }}>
            <Star size={10} fill={C.blueDeep} /> Destaque
          </span>
        )}
        {nota > 0 && (
          <span className="absolute top-3 right-3 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold font-body bg-white/90" style={{ color: C.blueDeep }}>
            <Star size={10} fill="#E8A23D" color="#E8A23D" /> {nota.toFixed(1)}
          </span>
        )}
        <div className="absolute left-4 bottom-3 right-4">
          <p className={`font-display font-extrabold text-white ${destaqueGrande ? "text-lg" : "text-sm"}`}>{p.nome}</p>
          {p.categoria && <p className="font-body text-[11px] font-semibold text-white/85 mt-0.5">{p.categoria}</p>}
        </div>
      </div>
      {p.descricao && (
        <div className="p-3.5">
          <p className="font-body text-xs line-clamp-2" style={{ color: "#5C7186" }}>{p.descricao}</p>
        </div>
      )}
    </button>
  );
}

function PaginaTurismo({ siteConfig }) {
  const { nomeCidadeUF } = useCidade();
  const [pontos, setPontos] = useState(null);
  const [pontoAberto, setPontoAberto] = useState(null);
  const [avaliacoesPorPonto, setAvaliacoesPorPonto] = useState({});

  useEffect(() => {
    document.title = "Turismo — Conecta Comércio";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", `Conheça a história e os pontos turísticos de ${nomeCidadeUF}, com um roteiro sugerido pela cidade.`);
    return () => {
      document.title = `Conecta Comércio · ${nomeCidadeUF}`;
      if (metaDesc) metaDesc.setAttribute("content", `Plataforma independente para fortalecer o comércio local de ${nomeCidadeUF}.`);
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) { setPontos([]); return; }
    supabase.from("pontos_turisticos").select("*").eq("ativo", true).order("ordem").then(({ data, error }) => {
      setPontos(error ? [] : data || []);
    });
  }, []);

  const carregarAvaliacoesTurismo = () => {
    if (!supabaseConfigurado) return;
    supabase.from("avaliacoes").select("*").not("ponto_turistico_id", "is", null).order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (error) return;
      const porPonto = {};
      (data || []).forEach((a) => {
        if (!porPonto[a.ponto_turistico_id]) porPonto[a.ponto_turistico_id] = [];
        porPonto[a.ponto_turistico_id].push(a);
      });
      setAvaliacoesPorPonto(porPonto);
    });
  };

  useEffect(() => { carregarAvaliacoesTurismo(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Conheça a cidade" title="Turismo" sub={`A história e os melhores pontos de ${nomeCidadeUF}`} />
      <PublicidadeBanners posicao="paginas_internas" compacto />

      {(siteConfig?.historia_cidade || siteConfig?.historia_foto_url) && (
        <div className="rounded-3xl overflow-hidden border mt-6 grid md:grid-cols-[1fr_1.2fr]" style={{ borderColor: C.line }}>
          <div className="h-48 md:h-full relative flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})` }}>
            {siteConfig?.historia_foto_url ? (
              <img loading="lazy" decoding="async" src={siteConfig.historia_foto_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <MapPinned size={44} className="text-white/90" />
            )}
          </div>
          <div className="p-6 md:p-8">
            <h2 className="font-display font-extrabold text-lg" style={{ color: C.ink }}>Um pouco da nossa história</h2>
            <p className="font-body text-sm mt-2 whitespace-pre-line" style={{ color: "#5C7186" }}>{siteConfig?.historia_cidade}</p>
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display font-extrabold text-lg mb-5" style={{ color: C.ink }}>Pontos turísticos</h2>
        {pontos === null && (
          <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
        )}
        {pontos && pontos.length === 0 && (
          <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum ponto turístico cadastrado ainda.</p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {(pontos || []).map((p, i) => {
            const avals = avaliacoesPorPonto[p.id] || [];
            const nota = avals.length ? avals.reduce((s, a) => s + a.nota, 0) / avals.length : 0;
            return (
              <div key={p.id} className={p.destaque ? "sm:col-span-2" : ""}>
                <CardPontoTuristico p={p} destaqueGrande={!!p.destaque} nota={nota} delay={i * 90} onAbrir={() => setPontoAberto(p)} />
              </div>
            );
          })}
        </div>
      </div>

      {pontoAberto && (
        <ModalDetalhePontoTuristico
          p={pontoAberto}
          avaliacoes={avaliacoesPorPonto[pontoAberto.id] || []}
          onFechar={() => setPontoAberto(null)}
          onEnviado={carregarAvaliacoesTurismo}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilidade pública — telefones úteis, horário de ônibus e endereços de
// órgãos públicos, organizados em três blocos. FASE 47.
// ---------------------------------------------------------------------------
function PaginaUtilidadePublica() {
  const { nomeCidadeUF } = useCidade();
  const [itens, setItens] = useState(null);

  useEffect(() => {
    document.title = "Utilidade pública — Conecta Comércio";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", `Telefones úteis, horário de ônibus e endereços de órgãos públicos de ${nomeCidadeUF}.`);
    return () => {
      document.title = `Conecta Comércio · ${nomeCidadeUF}`;
      if (metaDesc) metaDesc.setAttribute("content", `Plataforma independente para fortalecer o comércio local de ${nomeCidadeUF}.`);
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) { setItens([]); return; }
    supabase.from("utilidade_publica").select("*").eq("ativo", true).order("ordem").then(({ data, error }) => {
      setItens(error ? [] : data || []);
    });
  }, []);

  const blocos = [
    { chave: "telefone", titulo: "Telefones úteis", icone: Phone },
    { chave: "onibus", titulo: "Horário de ônibus", icone: Clock },
    { chave: "orgao", titulo: "Órgãos públicos", icone: Landmark },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Dia a dia" title="Utilidade pública" sub={`Telefones úteis, ônibus e órgãos públicos de ${nomeCidadeUF}`} />

      {itens === null && (
        <div className="flex flex-col gap-3 mt-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      )}

      {itens && itens.length === 0 && (
        <p className="font-body text-sm mt-6" style={{ color: "#5C7186" }}>Nenhuma informação cadastrada ainda.</p>
      )}

      <div className="flex flex-col gap-8 mt-6">
        {blocos.map((bloco) => {
          const doBloco = (itens || []).filter((i) => i.categoria === bloco.chave);
          if (doBloco.length === 0) return null;
          const Icone = bloco.icone;
          return (
            <div key={bloco.chave}>
              <h2 className="font-display font-extrabold text-base mb-3 flex items-center gap-2" style={{ color: C.ink }}>
                <Icone size={17} color={C.blue} /> {bloco.titulo}
              </h2>
              <div className="flex flex-col gap-2">
                {doBloco.map((item) => (
                  <div key={item.id} className="rounded-2xl border p-4 bg-white" style={{ borderColor: C.line }}>
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{item.titulo}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {item.telefone && (
                        <a href={`tel:${item.telefone.replace(/\D/g, "")}`} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.blue }}>
                          <Phone size={11} /> {item.telefone}
                        </a>
                      )}
                      {item.horario && <span className="font-body text-xs flex items-center gap-1" style={{ color: "#5C7186" }}><Clock size={11} /> {item.horario}</span>}
                      {item.endereco && <span className="font-body text-xs flex items-center gap-1" style={{ color: "#5C7186" }}><MapPin size={11} /> {item.endereco}</span>}
                    </div>
                    {item.descricao && <p className="font-body text-xs mt-1.5" style={{ color: "#5C7186" }}>{item.descricao}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ouvidoria — morador denuncia problema na cidade (buraco, iluminação, lixo
// etc.), recebe um protocolo e pode consultar o status depois sem precisar
// de login. FASE 48.
// ---------------------------------------------------------------------------
function gerarProtocoloOuvidoria() {
  return `OUV${Math.floor(100000 + Math.random() * 900000)}`;
}

function PaginaOuvidoria() {
  const { nomeCidadeUF } = useCidade();
  const [categoria, setCategoria] = useState("buraco");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [protocoloGerado, setProtocoloGerado] = useState(null);

  const [protocoloConsulta, setProtocoloConsulta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [resultadoConsulta, setResultadoConsulta] = useState(null);
  const [erroConsulta, setErroConsulta] = useState("");

  useEffect(() => {
    document.title = "Ouvidoria — Conecta Comércio";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", `Denuncie problemas na cidade de ${nomeCidadeUF}: buraco na via, iluminação, lixo e mais.`);
    return () => {
      document.title = `Conecta Comércio · ${nomeCidadeUF}`;
      if (metaDesc) metaDesc.setAttribute("content", `Plataforma independente para fortalecer o comércio local de ${nomeCidadeUF}.`);
    };
  }, []);

  const categorias = { buraco: "Buraco na via", iluminacao: "Iluminação pública", lixo: "Lixo / entulho", agua_esgoto: "Água / esgoto", outro: "Outro" };
  const labelStatus = { recebido: "Recebido", em_analise: "Em análise", resolvido: "Resolvido" };
  const corStatus = { recebido: "#8A5A12", em_analise: C.blue, resolvido: "#1E8E5A" };

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!descricao.trim()) { setErro("Descreva o problema."); return; }
    const protocolo = gerarProtocoloOuvidoria();
    if (!supabaseConfigurado) { setProtocoloGerado(protocolo); return; }
    setEnviando(true);
    try {
      const { error } = await supabase.from("ouvidoria_denuncias").insert({
        protocolo, categoria, descricao, local: local || null, nome: nome || null, telefone: telefone || null, status: "recebido",
      });
      if (error) throw error;
      setProtocoloGerado(protocolo);
    } catch (err) {
      setErro(err.message || "Não consegui enviar agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const consultar = async (e) => {
    e.preventDefault();
    setErroConsulta("");
    setResultadoConsulta(null);
    if (!protocoloConsulta.trim()) return;
    setConsultando(true);
    try {
      const { data, error } = await supabase.rpc("consultar_denuncia", { p_protocolo: protocoloConsulta.trim().toUpperCase() });
      if (error) throw error;
      if (!data || data.length === 0) { setErroConsulta("Protocolo não encontrado."); return; }
      setResultadoConsulta(data[0]);
    } catch (err) {
      setErroConsulta(err.message || "Não consegui consultar agora.");
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Comunidade" title="Ouvidoria" sub="Denuncie problemas na cidade — buraco na via, iluminação, lixo e outros" />

      <div className="rounded-2xl border p-5 mt-6" style={{ borderColor: C.line }}>
        {protocoloGerado ? (
          <div>
            <p className="font-body text-sm font-semibold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
              <CheckCircle2 size={15} /> Denúncia registrada!
            </p>
            <p className="font-body text-sm mt-2" style={{ color: "#425A70" }}>
              Guarde esse protocolo pra acompanhar o andamento: <span className="font-display font-bold" style={{ color: C.blue }}>{protocoloGerado}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-2.5">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
              {Object.entries(categorias).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Descreva o problema..." className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Local (rua, bairro, referência)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
            <div className="grid sm:grid-cols-2 gap-2.5">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone (opcional)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
            </div>
            {erro && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erro}</p>}
            <button type="submit" disabled={enviando} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
              {enviando ? "Enviando..." : "Enviar denúncia"}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-2xl border p-5 mt-6" style={{ borderColor: C.line }}>
        <p className="font-body text-xs font-bold mb-2" style={{ color: C.ink }}>Consultar protocolo</p>
        <form onSubmit={consultar} className="flex gap-2">
          <input value={protocoloConsulta} onChange={(e) => setProtocoloConsulta(e.target.value)} placeholder="Ex: OUV123456"
            className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none flex-1" style={{ borderColor: C.line }} />
          <button type="submit" disabled={consultando} className="font-body text-xs font-bold rounded-lg px-4 disabled:opacity-60" style={{ background: C.blueTint, color: C.blue }}>
            {consultando ? "..." : "Consultar"}
          </button>
        </form>
        {erroConsulta && <p className="font-body text-xs mt-2" style={{ color: "#B4462F" }}>{erroConsulta}</p>}
        {resultadoConsulta && (
          <div className="mt-3 rounded-xl p-3" style={{ background: C.blueTint2 }}>
            <div className="flex items-center justify-between">
              <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{categorias[resultadoConsulta.categoria] || resultadoConsulta.categoria}</p>
              <span className="font-body text-[10px] font-bold" style={{ color: corStatus[resultadoConsulta.status] }}>{labelStatus[resultadoConsulta.status] || resultadoConsulta.status}</span>
            </div>
            <p className="font-body text-xs mt-1" style={{ color: "#425A70" }}>{resultadoConsulta.descricao}</p>
            {resultadoConsulta.resposta_admin && (
              <div className="mt-2 rounded-lg px-2.5 py-2 bg-white">
                <p className="font-body text-[10px] font-bold mb-0.5" style={{ color: C.blue }}>Resposta</p>
                <p className="font-body text-xs" style={{ color: "#425A70" }}>{resultadoConsulta.resposta_admin}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Classificados entre moradores — compra, venda e doação direto entre
// pessoas, separado das empresas formais. Passa por aprovação antes de
// aparecer pra todo mundo, igual ao mural. FASE 49.
// ---------------------------------------------------------------------------
const CATEGORIAS_CLASSIFICADOS = ["Móveis", "Eletrônicos e celulares", "Roupas e calçados", "Casa e decoração", "Veículos", "Outros"];

function PaginaClassificados() {
  const { nomeCidadeUF } = useCidade();
  const [itens, setItens] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [tipo, setTipo] = useState("venda");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_CLASSIFICADOS[0]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    document.title = "Classificados — Conecta Comércio";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", `Compra, venda e doação direto entre moradores de ${nomeCidadeUF}.`);
    return () => {
      document.title = `Conecta Comércio · ${nomeCidadeUF}`;
      if (metaDesc) metaDesc.setAttribute("content", `Plataforma independente para fortalecer o comércio local de ${nomeCidadeUF}.`);
    };
  }, []);

  const carregar = () => {
    if (!supabaseConfigurado) { setItens([]); return; }
    supabase.from("classificados").select("*").eq("status", "aprovado").order("criado_em", { ascending: false }).then(({ data, error }) => {
      setItens(error ? [] : data || []);
    });
  };
  useEffect(carregar, []);

  const itensFiltrados = (itens || []).filter((i) => filtroTipo === "todos" || i.tipo === filtroTipo);

  const publicar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!titulo.trim() || !descricao.trim() || !nome.trim() || !whatsapp.trim()) { setErro("Preencha título, descrição, nome e WhatsApp."); return; }
    if (!supabaseConfigurado) { setEnviado(true); return; }
    setEnviando(true);
    try {
      let foto_url = null;
      if (foto) {
        const caminho = `classificados/${Date.now()}-${foto.name}`;
        const { error: erroUpload } = await supabase.storage.from("banners").upload(caminho, foto);
        if (!erroUpload) {
          const { data: pub } = supabase.storage.from("banners").getPublicUrl(caminho);
          foto_url = pub.publicUrl;
        }
      }
      const { error } = await supabase.from("classificados").insert({
        tipo, titulo, descricao, preco: tipo === "venda" && preco ? Number(preco) : null,
        categoria, nome, whatsapp, foto_url, status: "pendente",
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      setErro(err.message || "Não consegui publicar agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const labelTipo = { venda: "Venda", doacao: "Doação", procura: "Procura" };
  const corTipo = { venda: C.blue, doacao: "#1E8E5A", procura: "#8A5A12" };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Comunidade" title="Classificados" sub="Compra, venda e doação direto entre moradores" />

      <div className="flex items-center gap-2 flex-wrap mt-6 mb-4">
        {["todos", "venda", "doacao", "procura"].map((t) => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className="font-body text-xs font-bold px-3 py-1.5 rounded-full border"
            style={{ borderColor: filtroTipo === t ? C.blue : C.line, background: filtroTipo === t ? C.blueTint : "transparent", color: filtroTipo === t ? C.blue : "#5C7186" }}>
            {t === "todos" ? "Todos" : labelTipo[t]}
          </button>
        ))}
        <button onClick={() => setMostrarForm((v) => !v)} className="font-body text-xs font-bold px-3 py-1.5 rounded-full text-white ml-auto" style={{ background: C.blue }}>
          {mostrarForm ? "Fechar" : "Anunciar algo"}
        </button>
      </div>

      {mostrarForm && (
        <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: C.line }}>
          {enviado ? (
            <p className="font-body text-sm font-semibold flex items-center gap-1.5" style={{ color: "#1E8E5A" }}>
              <CheckCircle2 size={15} /> Recebemos seu anúncio! Ele aparece aqui assim que for aprovado.
            </p>
          ) : (
            <form onSubmit={publicar} className="flex flex-col gap-2.5">
              <div className="grid sm:grid-cols-2 gap-2.5">
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                  <option value="venda">Quero vender</option>
                  <option value="doacao">Quero doar</option>
                  <option value="procura">Estou procurando</option>
                </select>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                  {CATEGORIAS_CLASSIFICADOS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do anúncio" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Descreva o item..." className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              {tipo === "venda" && (
                <input value={preco} onChange={(e) => setPreco(e.target.value)} type="number" step="0.01" placeholder="Preço (R$)" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              )}
              <div className="grid sm:grid-cols-2 gap-2.5">
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Seu WhatsApp" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              </div>
              <label className="font-body text-xs font-bold cursor-pointer w-fit flex items-center gap-1.5" style={{ color: C.blue }}>
                <Camera size={14} /> {foto ? `Foto: ${foto.name}` : "Anexar foto (opcional)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
              </label>
              {erro && <p className="font-body text-xs" style={{ color: "#B4462F" }}>{erro}</p>}
              <button type="submit" disabled={enviando} className="font-body text-sm font-bold text-white rounded-lg py-2.5 disabled:opacity-60" style={{ background: C.blue }}>
                {enviando ? "Publicando..." : "Publicar anúncio"}
              </button>
            </form>
          )}
        </div>
      )}

      {itens === null && (
        <div className="grid sm:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      )}
      {itens && itensFiltrados.length === 0 && (
        <p className="font-body text-sm" style={{ color: "#5C7186" }}>Nenhum anúncio por aqui ainda.</p>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {itensFiltrados.map((item) => {
          const linkWhats = item.whatsapp ? `https://wa.me/55${String(item.whatsapp).replace(/\D/g, "")}` : null;
          return (
            <div key={item.id} className="rounded-2xl border overflow-hidden bg-white flex flex-col" style={{ borderColor: C.line }}>
              {item.foto_url && <img loading="lazy" decoding="async" src={item.foto_url} alt="" className="w-full h-32 object-cover" />}
              <div className="p-3.5 flex flex-col gap-1 flex-1">
                <span className="w-fit font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.blueTint2, color: corTipo[item.tipo] }}>{labelTipo[item.tipo]}</span>
                <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{item.titulo}</p>
                {item.preco != null && <p className="font-body text-xs font-bold" style={{ color: C.blue }}>R$ {Number(item.preco).toFixed(2).replace(".", ",")}</p>}
                <p className="font-body text-xs" style={{ color: "#5C7186" }}>{item.descricao}</p>
                {linkWhats && (
                  <a href={linkWhats} target="_blank" rel="noreferrer" className="mt-auto pt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold font-body text-white" style={{ background: "#25A85B" }}>
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página pública de estatísticas — números reais da plataforma, sem precisar
// de login. Serve tanto pra transparência com a comunidade quanto pra dar ao
// Google uma página com conteúdo textual rico (bom pra indexação/SEO).
// ---------------------------------------------------------------------------
function EstatisticasPublicas() {
  const { nomeCidadeUF } = useCidade();
  const [stats, setStats] = useState(null); // null = carregando
  const [categorias, setCategorias] = useState(null);

  useEffect(() => {
    document.title = "Números da plataforma — Conecta Comércio";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", `Veja em números o comércio local de ${nomeCidadeUF}: empresas, produtos, vagas, cursos e eventos cadastrados no Conecta Comércio.`);
    return () => {
      document.title = `Conecta Comércio · ${nomeCidadeUF}`;
      if (metaDesc) metaDesc.setAttribute("content", `Plataforma independente para fortalecer o comércio local de ${nomeCidadeUF}.`);
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    const contar = (tabela, filtro) => {
      let q = supabase.from(tabela).select("*", { count: "exact", head: true });
      if (filtro) q = filtro(q);
      return q.then(({ count }) => count ?? 0);
    };
    Promise.all([
      contar("empresas", (q) => q.eq("status", "aprovada")),
      contar("produtos", (q) => q.eq("ativo", true)),
      contar("vagas", (q) => q.eq("status", "aberta")),
      contar("prestadores", (q) => q.eq("status", "aprovado")),
      contar("eventos_calendario"),
      contar("cursos"),
      contar("avaliacoes"),
      contar("cupons", (q) => q.eq("ativo", true)),
      // Fases mais novas — só as métricas que fazem sentido mostrar pro
      // público (não inclui ouvidoria, agendamentos ou Premium aqui, que
      // são números internos, não de "vitrine" pro visitante).
      contar("mural_comunidade", (q) => q.eq("status", "aprovado")),
      contar("classificados", (q) => q.eq("status", "aprovado")),
      contar("combos", (q) => q.eq("ativo", true)),
    ]).then(([empresas, produtos, vagas, prestadores, eventos, cursos, avaliacoes, cupons, mural, classificados, combos]) => {
      setStats({ empresas, produtos, vagas, prestadores, eventos, cursos, avaliacoes, cupons, mural, classificados, combos });
    });

    supabase.from("empresas").select("categoria").eq("status", "aprovada").then(({ data, error }) => {
      if (error || !data) return;
      const contagem = {};
      data.forEach((e) => { const c = e.categoria || "Outros"; contagem[c] = (contagem[c] || 0) + 1; });
      setCategorias(Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 8));
    });
  }, []);

  const cartoes = stats ? [
    { label: "Empresas ativas", valor: stats.empresas, icon: Building2 },
    { label: "Produtos à venda", valor: stats.produtos, icon: ShoppingBag },
    { label: "Vagas abertas", valor: stats.vagas, icon: Briefcase },
    { label: "Prestadores de serviço", valor: stats.prestadores, icon: Wrench },
    { label: "Eventos na agenda", valor: stats.eventos, icon: Calendar },
    { label: "Cursos disponíveis", valor: stats.cursos, icon: GraduationCap },
    { label: "Avaliações da comunidade", valor: stats.avaliacoes, icon: Star },
    { label: "Cupons de desconto ativos", valor: stats.cupons, icon: Tag },
    { label: "Posts no mural", valor: stats.mural, icon: Users },
    { label: "Classificados publicados", valor: stats.classificados, icon: Repeat },
    { label: "Combos e promoções ativos", valor: stats.combos, icon: HandCoins },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <SectionHeader eyebrow="Transparência" title="Números da plataforma" sub={`Dados reais e atualizados do comércio local de ${nomeCidadeUF}`} />
      {!stats ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 11 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {cartoes.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="rounded-xl border p-5 bg-white" style={{ borderColor: C.line }}>
                  <Icon size={18} style={{ color: C.blue }} />
                  <p className="font-display text-3xl font-extrabold mt-2" style={{ color: C.ink }}>{c.valor}</p>
                  <p className="font-body text-xs mt-1" style={{ color: "#5C7186" }}>{c.label}</p>
                </div>
              );
            })}
          </div>
          {categorias && categorias.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display text-lg font-bold" style={{ color: C.ink }}>Empresas por categoria</h3>
              <div className="mt-4 space-y-2">
                {categorias.map(([cat, n]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="font-body text-xs w-40 shrink-0 truncate" style={{ color: "#425A70" }}>{cat}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(6, (n / categorias[0][1]) * 100)}%`, background: C.blue }} />
                    </div>
                    <span className="font-body text-xs font-bold w-6 text-right" style={{ color: C.ink }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credencial digital pública — página própria (sem menu, sem precisar de
// login) aberta pelo link/QR Code de uma credencial de evento. Mostra o
// nome, tipo e status; o check-in em si é feito pelo organizador no painel.
// ---------------------------------------------------------------------------
function CredencialDigital({ codigo }) {
  const [credencial, setCredencial] = useState(undefined); // undefined = carregando, null = não encontrada
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) { setCredencial(null); return; }
    supabase.from("credenciais").select("*").eq("codigo", codigo).single().then(({ data }) => {
      setCredencial(data ?? null);
      if (data?.evento_id) {
        supabase.from("eventos_calendario").select("titulo, data_inicio").eq("id", data.evento_id).single()
          .then(({ data: ev }) => setEvento(ev ?? null));
      }
    });
  }, [codigo]);

  if (credencial === undefined) return <LoadingBrand texto="Carregando credencial..." />;

  if (!credencial) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.blueTint2 }}>
        <p className="font-body text-sm" style={{ color: "#5C7186" }}>Credencial não encontrada.</p>
      </div>
    );
  }

  const imprimirCracha = () => {
    const janela = window.open("", "_blank");
    if (!janela) return;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(String(credencial.codigo))}`;
    janela.document.write(`
      <html><head><title>Crachá — ${credencial.nome}</title>
      <style>
        @page { size: 10cm 14cm; margin: 0; }
        * { box-sizing: border-box; }
        body{font-family:Arial,sans-serif;margin:0;padding:0;display:flex;justify-content:center;background:#fff}
        .cracha{width:10cm;height:14cm;border:1px solid #DCE7F2;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:0 0 20px}
        .furo{width:26px;height:8px;background:#DCE7F2;border-radius:6px;margin:12px auto 0}
        .topo{width:100%;background:linear-gradient(120deg,#052A4D,#0A5AA8);color:#fff;text-align:center;padding:20px 12px 26px;margin-top:14px}
        .topo p.evento{font-weight:800;font-size:16px;margin:4px 0 0}
        .topo p.data{font-size:11px;opacity:.8;margin:2px 0 0}
        .topo p.eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin:0}
        .foto{width:96px;height:96px;border-radius:50%;object-fit:cover;border:4px solid #fff;margin-top:-48px;background:#fff}
        .nome{font-weight:800;font-size:20px;color:#0E2233;margin:14px 0 2px;text-align:center;padding:0 12px}
        .tipo{font-size:12px;font-weight:700;color:#0A5AA8;background:#EAF2FB;padding:3px 12px;border-radius:999px;margin-top:4px}
        .qr{width:150px;height:150px;margin-top:18px}
        .codigo{font-size:9px;color:#5C7186;margin-top:6px;word-break:break-all;padding:0 20px;text-align:center}
        .rodape{font-size:9px;color:#B7C6D6;margin-top:auto;padding-top:10px}
      </style></head>
      <body>
        <div class="cracha">
          <div class="furo"></div>
          <div class="topo">
            <p class="eyebrow">Credencial digital</p>
            <p class="evento">${evento?.titulo || "Evento"}</p>
            ${evento?.data_inicio ? `<p class="data">${evento.data_inicio}</p>` : ""}
          </div>
          ${credencial.foto_url ? `<img class="foto" src="${credencial.foto_url}" />` : `<div class="foto" style="display:flex;align-items:center;justify-content:center;color:#0A5AA8;font-weight:800;font-size:28px">${(credencial.nome || "?").charAt(0).toUpperCase()}</div>`}
          <p class="nome">${credencial.nome || ""}</p>
          <span class="tipo">${credencial.tipo || "Participante"}</span>
          <img class="qr" src="${qr}" />
          <p class="codigo">${credencial.codigo}</p>
          <p class="rodape">Conecta Comércio</p>
        </div>
      </body></html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: C.blueTint2 }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden border bg-white" style={{ borderColor: C.line }}>
        <div className="p-6 text-center text-white" style={{ background: `linear-gradient(120deg, ${C.blueDeep}, ${C.blue})` }}>
          <p className="font-body text-[11px] uppercase tracking-wider text-white/70">Credencial digital</p>
          <p className="font-display font-extrabold text-lg mt-1">{evento?.titulo || "Evento"}</p>
          {evento?.data_inicio && <p className="font-body text-xs text-white/70 mt-0.5">{evento.data_inicio}</p>}
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {credencial.foto_url ? (
            <img loading="lazy" decoding="async" src={credencial.foto_url} alt="" className="w-20 h-20 rounded-full object-cover border" style={{ borderColor: C.line }} />
          ) : (
            <span className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
              <UserCircle2 size={36} />
            </span>
          )}
          <div className="text-center">
            <p className="font-display font-bold text-lg" style={{ color: C.ink }}>{credencial.nome}</p>
            <p className="font-body text-xs mt-0.5" style={{ color: "#5C7186" }}>{credencial.tipo}</p>
          </div>
          <img loading="lazy" decoding="async"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(String(credencial.codigo))}`}
            alt="QR Code" className="w-44 h-44" />
          <span className="font-body text-[11px] font-bold px-3 py-1 rounded-full"
            style={{ background: credencial.status === "ativa" ? "#E7F6EE" : "#FBEAE5", color: credencial.status === "ativa" ? "#1E8E5A" : "#B4462F" }}>
            {credencial.status === "ativa" ? "Credencial ativa" : "Credencial inativa"}
          </span>
          {credencial.checkin_feito && (
            <p className="font-body text-[11px]" style={{ color: "#5C7186" }}>
              Check-in feito{credencial.checkin_em ? ` em ${new Date(credencial.checkin_em).toLocaleString("pt-BR")}` : ""}
            </p>
          )}
          <button onClick={imprimirCracha} className="font-body text-xs font-bold rounded-lg px-4 py-2.5 border flex items-center gap-1.5 w-full justify-center" style={{ borderColor: C.line, color: C.blue }}>
            <FileText size={13} /> Imprimir crachá
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App raiz — alterna entre Site publico, Painel Admin e Painel Empresario.
// Cada painel e acessado por um link proprio (ver ROTA_HASH acima); o site
// publico em si nunca exige cadastro para ser visitado.
// ---------------------------------------------------------------------------
export default function ConectaComercio() {
  const [modo, setModo] = useState("site");
  const [abaConta, setAbaConta] = useState("cadastro");
  const [destinoPosLogin, setDestinoPosLogin] = useState(null);
  const [mensagemAcesso, setMensagemAcesso] = useState("");

  // Identidade visual do site (cor, logo, frase) — editada pelo admin na aba
  // "Identidade" e aplicada aqui globalmente assim que a página carrega.
  const [siteConfig, setSiteConfig] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("site_config").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        setSiteConfig(data);
        if (data.cor_principal) aplicarCorPrincipal(data.cor_principal);
      }
    });
  }, []);

  const [sessao, setSessao] = useState(undefined); // undefined = carregando, null = sem sessão
  const [perfil, setPerfil] = useState(null);

  // Observa a sessão de login do Supabase em tempo real.
  useEffect(() => {
    if (!supabaseConfigurado) { setSessao(null); return; }
    supabase.auth.getSession().then(({ data }) => setSessao(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // "Heartbeat" de atividade — atualiza o último acesso do usuário logado
  // de tempos em tempos, pra o admin ver quem esteve ativo recentemente.
  useEffect(() => {
    if (!supabaseConfigurado || !sessao?.user?.id) return;
    const atualizarUltimoAcesso = () => {
      supabase.from("perfis").update({ ultimo_acesso: new Date().toISOString() }).eq("id", sessao.user.id).then(() => {});
    };
    atualizarUltimoAcesso();
    const intervalo = setInterval(atualizarUltimoAcesso, 2 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [sessao?.user?.id]);

  // Busca o perfil (tipo: cliente/empresario/admin) assim que há sessão.
  const [contaBloqueada, setContaBloqueada] = useState(false);
  useEffect(() => {
    if (!supabaseConfigurado || !sessao) { setPerfil(null); return; }
    supabase.from("perfis").select("tipo, nome, bloqueado").eq("id", sessao.user.id).single()
      .then(({ data }) => {
        if (data?.bloqueado) {
          setContaBloqueada(true);
          setPerfil(null);
          supabase.auth.signOut();
          return;
        }
        setPerfil(data ?? null);
      });
  }, [sessao]);

  if (contaBloqueada) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: C.bg }}>
        <div className="max-w-sm w-full text-center rounded-2xl border p-8" style={{ borderColor: C.line, background: "#fff" }}>
          <ShieldCheck size={32} style={{ color: "#B4462F", margin: "0 auto 12px" }} />
          <h1 className="font-display text-lg font-bold mb-2" style={{ color: C.ink }}>Conta bloqueada</h1>
          <p className="font-body text-sm mb-4" style={{ color: "#5C7186" }}>
            Sua conta foi bloqueada pela administração. Entre em contato para mais informações.
          </p>
          <button onClick={() => setContaBloqueada(false)} className="font-body text-sm font-bold px-4 py-2 rounded-xl" style={{ background: C.blue, color: "#fff" }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const modos = [
    { id: "site", label: "Site", icon: Store },
    ...(siteConfig?.turismo_ativo ? [{ id: "turismo", label: "Turismo", icon: MapPinned }] : []),
    ...(siteConfig?.mural_ativo ? [{ id: "mural", label: "Mural", icon: Users }] : []),
    ...(siteConfig?.utilidade_ativo ? [{ id: "utilidade", label: "Utilidade pública", icon: Phone }] : []),
    ...(siteConfig?.ouvidoria_ativo ? [{ id: "ouvidoria", label: "Ouvidoria", icon: MessageCircle }] : []),
    ...(siteConfig?.classificados_ativo ? [{ id: "classificados", label: "Classificados", icon: Repeat }] : []),
    ...(siteConfig?.estatisticas_ativo ? [{ id: "estatisticas", label: "Números", icon: TrendingUp }] : []),
    { id: "conta", label: sessao && perfil ? (perfil.nome ? `Olá, ${perfil.nome.split(" ")[0]}` : "Minha conta") : "Entrar / Cadastro", icon: UserCircle2 },
    { id: "admin", label: "Painel Admin", icon: ShieldCheck, restrito: "admin" },
    { id: "empresario", label: "Painel Empresário", icon: Briefcase, restrito: "empresario" },
  ];

  // Link direto de acesso: le o hash da URL (#/admin, #/empresa, #/entrar,
  // #/cadastro) uma vez ao carregar e a cada mudanca (voltar/avancar do
  // navegador ou clique num link real com href="#/admin" etc.).
  const [hashPendente, setHashPendente] = useState(() => modoDaHash(window.location.hash));
  useEffect(() => {
    const aoMudarHash = () => setHashPendente(modoDaHash(window.location.hash));
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, []);

  const irPara = (m) => {
    if (m.restrito && supabaseConfigurado) {
      if (!sessao) {
        setMensagemAcesso(
          m.restrito === "admin"
            ? "Entre com sua conta de administrador para acessar esse painel."
            : "Entre ou cadastre sua empresa para acessar o painel do empresário."
        );
        setDestinoPosLogin(m.id);
        setAbaConta("entrar");
        setModo("conta");
        return;
      }
    }
    setModo(m.id);
  };

  const aposLogin = () => {
    if (destinoPosLogin) {
      setModo(destinoPosLogin);
      setDestinoPosLogin(null);
      setMensagemAcesso("");
    } else {
      setModo("site");
    }
  };

  // Processa o link direto assim que soubermos se ha sessao (evita mandar
  // pra tela de login um admin/empresario que ja esta autenticado).
  useEffect(() => {
    if (!hashPendente) return;
    if (sessao === undefined) return; // ainda carregando a sessao — aguarda
    if (hashPendente === "cadastro-conta") {
      setAbaConta("cadastro");
      setDestinoPosLogin(null);
      setMensagemAcesso("");
      setModo("conta");
    } else {
      const alvo = modos.find((m) => m.id === hashPendente);
      if (alvo) irPara(alvo);
    }
    setHashPendente(null);
  }, [hashPendente, sessao]);

  // Mantem a URL sincronizada com a tela atual, para que "Painel Admin" e
  // "Painel Empresário" sejam links reais (copiaveis/compartilhaveis), nao
  // so um estado interno.
  useEffect(() => {
    if (window.location.hash.startsWith("#/credencial-")) return; // link de credencial digital — não mexe na URL
    const alvo = ROTA_HASH[modo] || "#/";
    if (window.location.hash !== alvo) window.history.replaceState(null, "", alvo);
  }, [modo]);

  // Um painel só é liberado se: Supabase não configurado (modo demo livre),
  // ou há sessão E o perfil tem o tipo exigido.
  const podeVer = (restrito) => {
    if (!supabaseConfigurado) return true;
    if (!sessao) return false;
    if (!perfil) return true; // ainda carregando o perfil — libera provisoriamente
    if (perfil.tipo === "admin") return true; // admin tem acesso a todos os painéis do site
    return perfil.tipo === restrito;
  };

  // Credencial digital pública (link/QR Code de um evento) — página própria,
  // sem menu e sem exigir login, então sai daqui antes do layout normal.
  if (window.location.hash.startsWith("#/credencial-")) {
    return <CredencialDigital codigo={window.location.hash.replace("#/credencial-", "")} />;
  }

  return (
    <CidadeContext.Provider value={{ nomeCidade: siteConfig?.nome_cidade || "Ivatuba", nomeCidadeUF: siteConfig?.nome_cidade_uf || "Ivatuba - PR" }}>
    <div className="font-body min-h-screen" style={{ background: "#fff" }}>
      <style>{fontImport}</style>

      <div className="sticky top-0 z-40 flex justify-center px-3 pt-3">
        <div className="flex items-center gap-1 bg-white rounded-full border shadow-lg p-1 max-w-full overflow-x-auto no-scrollbar" style={{ borderColor: C.line }}>
          {modos.map((m) => {
            const Icon = m.icon;
            const active = modo === m.id;
            const bloqueado = m.restrito && supabaseConfigurado && !sessao;
            return (
              <a key={m.id} href={ROTA_HASH[m.id]}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full font-body text-xs font-bold transition-colors cursor-pointer shrink-0"
                style={{ background: active ? C.blue : "transparent", color: active ? "#fff" : "#425A70" }}>
                <Icon size={13} /> {m.label} {bloqueado && <ShieldCheck size={11} style={{ opacity: 0.5 }} />}
              </a>
            );
          })}
        </div>
      </div>

      <div key={modo} className="page-transition">
      {modo === "site" && <SiteHome onAuth={(aba) => { setAbaConta(aba); setDestinoPosLogin(null); setModo("conta"); }} logoUrl={siteConfig?.logo_url} frase={siteConfig?.frase} siteConfig={siteConfig} sessao={sessao} perfil={perfil} />}
      {modo === "estatisticas" && <EstatisticasPublicas />}
      {modo === "turismo" && <PaginaTurismo siteConfig={siteConfig} />}
      {modo === "mural" && <PaginaMural perfil={perfil} />}
      {modo === "utilidade" && <PaginaUtilidadePublica />}
      {modo === "ouvidoria" && <PaginaOuvidoria />}
      {modo === "classificados" && <PaginaClassificados />}
      {modo === "termos" && <PaginaLegal titulo="Termos de uso" texto={siteConfig?.termos_uso} />}
      {modo === "privacidade" && <PaginaLegal titulo="Política de privacidade" texto={siteConfig?.politica_privacidade} />}
      {modo === "conta" && (sessao && perfil ? <MinhaConta perfil={perfil} sessao={sessao} /> : <ContaAcesso abaInicial={abaConta} mensagem={mensagemAcesso} onSucesso={aposLogin} />)}

      {modo === "admin" && (
        sessao === undefined ? (
          <LoadingBrand texto="Verificando seu acesso..." />
        ) : podeVer("admin") ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
            <SectionHeader eyebrow="Área restrita" title="Painel administrativo" sub={perfil?.nome ? `Olá, ${perfil.nome}` : "Visível só para administradores da plataforma"} />
            <AdminPanel />
          </div>
        ) : (
          <AcessoRestrito tipo="admin" onEntrar={() => irPara(modos.find((m) => m.id === "admin"))} />
        )
      )}

      {modo === "empresario" && (
        sessao === undefined ? (
          <LoadingBrand texto="Verificando seu acesso..." />
        ) : podeVer("empresario") ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
            <SectionHeader eyebrow="Área restrita" title="Painel do empresário" sub={perfil?.nome ? `Olá, ${perfil.nome}` : "Visível só para o dono da empresa, após login"} />
            <EmpresarioPanel siteConfig={siteConfig} />
          </div>
        ) : (
          <AcessoRestrito tipo="empresario" onEntrar={() => irPara(modos.find((m) => m.id === "empresario"))} />
        )
      )}
      </div>

      <BotaoCompartilhar />
      <ChatWidget />
    </div>
    </CidadeContext.Provider>
  );
}
