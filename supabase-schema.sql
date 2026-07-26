import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, MapPin, Star, Heart, MessageCircle, Briefcase, GraduationCap,
  Newspaper, Menu, X, ChevronRight, Building2, ShoppingBag, Smartphone,
  BadgeCheck, Clock, Instagram, Store, Wrench, Utensils, Shirt, Stethoscope,
  Scissors, Laptop, Hammer, ArrowRight, Eye, Bell, MapPinned, LayoutDashboard,
  CheckCircle2, Image as ImageIcon, Users, TrendingUp, Send, PlusCircle,
  Pencil, Trash2, Tag, UserCircle2, ChevronLeft, ShieldCheck, BarChart3, Vote, Sparkles,
  FileText, Receipt, ClipboardList, HandCoins, ExternalLink,
  Calendar, CalendarDays, Camera, Upload, PartyPopper, Landmark, Handshake
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase, supabaseConfigurado } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
const C = {
  blue: "#0A5AA8",
  blueDark: "#073F73",
  blueDeep: "#052A4D",
  blueTint: "#EAF2FB",
  blueTint2: "#F5F9FD",
  ink: "#0E2233",
  amber: "#E8A23D",
  amberDark: "#C6811F",
  line: "#DCE7F2",
};

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

.glow-card { transition: transform .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s ease, border-color .4s ease; }
.glow-card:hover { transform: translateY(-6px); box-shadow: 0 26px 50px -18px rgba(10,90,168,0.38); border-color: rgba(10,90,168,0.35); }

.glow-btn { transition: transform .25s ease, box-shadow .25s ease; }
.glow-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -10px rgba(232,162,61,0.55); }

.reveal { opacity: 0; transform: translateY(28px); transition: opacity .8s ease, transform .8s cubic-bezier(.2,.8,.2,1); }
.reveal.in { opacity: 1; transform: translateY(0); }

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

@media (prefers-reduced-motion: reduce) {
  .blob, .marquee-track, .reveal, .pulse-dot, .ring-pulse, .grad-text, .stamp, .promo-slide, .tech-grid, .scan-line, .price-pop { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
}
`;

// ---------------------------------------------------------------------------
// Motion helpers
// ---------------------------------------------------------------------------
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
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

const comerciantesPublicidade = [
  {
    nome: "Mercado Bom Preço",
    categoria: "Mercado & Varejo",
    bairro: "Jardim Primavera",
    chamada: "Ofertas da semana com até 30% de desconto em mais de 50 produtos.",
  },
  {
    nome: "Materiais Const. Rocha",
    categoria: "Construção",
    bairro: "Vila Nova",
    chamada: "Tudo para sua reforma com entrega grátis em Ivatuba.",
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
function LogoMark({ size = 40, iconSize }) {
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

function SectionHeader({ eyebrow, title, sub, linkLabel }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-display text-2xl md:text-[28px] font-extrabold" style={{ color: C.ink }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1" style={{ color: "#5C7186" }}>{sub}</p>}
      </div>
      {linkLabel && (
        <button className="font-body flex items-center gap-1 text-sm font-semibold shrink-0" style={{ color: C.blue }}>
          {linkLabel} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

function CategoryCard({ cat }) {
  const Icon = cat.icon;
  return (
    <button className="glow-card group flex flex-col items-start gap-3 p-4 rounded-2xl border text-left"
      style={{ borderColor: C.line, background: "#fff" }}>
      <span className="flex items-center justify-center w-11 h-11 rounded-xl transition-colors"
        style={{ background: C.blueTint, color: C.blue }}>
        <Icon size={20} />
      </span>
      <div>
        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{cat.nome}</p>
        <p className="font-body text-xs mt-0.5" style={{ color: "#7E93A7" }}>{cat.count} empresas</p>
      </div>
    </button>
  );
}

function EmpresaCard({ e, fav, onFav }) {
  return (
    <div className="glow-card rounded-2xl border overflow-hidden bg-white flex flex-col" style={{ borderColor: C.line }}>
      <div className="h-24 relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})` }}>
        <Building2 className="text-white/90" size={30} />
        <button onClick={onFav} className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
          <Heart size={15} fill={fav ? C.amber : "none"} color={fav ? C.amber : C.blueDark} />
        </button>
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/95 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body" style={{ color: C.amberDark }}>
          <Star size={11} fill={C.amber} color={C.amber} /> {e.rating}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="font-display font-bold text-sm leading-snug" style={{ color: C.ink }}>{e.nome}</p>
        <p className="font-body text-xs flex items-center gap-1" style={{ color: "#7E93A7" }}>
          <MapPin size={11} /> {e.bairro}, {e.cidade}
        </p>
        <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{e.itens} {e.itens === 1 ? "item ativo" : "itens ativos"}</p>
        {e.cartaoServidor && (
          <span className="w-fit flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold font-body mt-0.5" style={{ background: C.blueTint, color: C.blue }}>
            <BadgeCheck size={11} /> Aceita Cartão Servidor
          </span>
        )}
        <div className="mt-auto flex gap-2 pt-2">
          <button className="glow-btn flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold font-body text-white"
            style={{ background: "#25A85B" }}>
            <MessageCircle size={14} /> WhatsApp
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold font-body border"
            style={{ borderColor: C.line, color: C.blue }}>
            <MapPin size={14} /> Ver Mapa
          </button>
        </div>
      </div>
    </div>
  );
}

function ProdutoCard({ p }) {
  return (
    <div className="glow-card rounded-2xl border bg-white overflow-hidden flex flex-col" style={{ borderColor: C.line }}>
      <div className="h-28 flex items-center justify-center" style={{ background: C.blueTint }}>
        <ShoppingBag size={26} color={C.blue} />
      </div>
      <div className="p-3.5 flex flex-col gap-1">
        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
        <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{p.empresa}</p>
        <p className="font-display font-extrabold text-base mt-1" style={{ color: C.blue }}>{p.preco}</p>
        <button className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold font-body"
          style={{ background: C.blueTint, color: C.blue }}>
          <MessageCircle size={13} /> Chamar no WhatsApp
        </button>
      </div>
    </div>
  );
}

function VagaCard({ v }) {
  return (
    <div className="glow-card rounded-2xl border bg-white p-4 flex flex-col gap-2" style={{ borderColor: C.line }}>
      <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.blueTint, color: C.blue }}>
        <Briefcase size={16} />
      </span>
      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{v.cargo}</p>
      <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{v.empresa} · {v.cidade}</p>
      <p className="font-body text-xs font-semibold" style={{ color: C.amberDark }}>{v.salario}</p>
      <button className="mt-1 w-full rounded-lg py-2 text-xs font-bold font-body text-white" style={{ background: C.blue }}>
        Candidatar-se
      </button>
    </div>
  );
}

function CursoCard({ c }) {
  return (
    <div className="rounded-2xl border bg-white p-4 flex gap-3 items-start" style={{ borderColor: C.line }}>
      <div className="rounded-lg px-2.5 py-1.5 text-center shrink-0" style={{ background: C.blueDeep }}>
        <p className="font-display text-[10px] font-bold text-white leading-none">{c.data.split(" ")[0]}</p>
        <p className="font-display text-[9px] text-white/70 leading-none mt-0.5">{c.data.split(" ")[1]}</p>
      </div>
      <div>
        <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{c.titulo}</p>
        <p className="font-body text-xs mt-1 flex items-center gap-1" style={{ color: "#7E93A7" }}>
          <MapPin size={11} /> {c.local}
        </p>
      </div>
    </div>
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
  // Moderação de empresas — aprovar, recusar e editar de verdade.
  // -------------------------------------------------------------------------
  const [empresasPend, setEmpresasPend] = useState(null); // null = carregando/indisponível
  const [statusEmpresa, setStatusEmpresa] = useState({});
  const [editandoEmpresa, setEditandoEmpresa] = useState(null);
  const [formEmpresa, setFormEmpresa] = useState({ nome: "", categoria: "" });

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("empresas").select("id, nome, categoria, status, criado_em").order("criado_em", { ascending: false })
      .then(({ data, error }) => { if (!error) setEmpresasPend(data || []); });
  }, []);

  const listaEmpresas = empresasPend ?? pendentes.map((p, i) => ({ id: `demo-${i}`, nome: p.nome, categoria: p.cat, status: "pendente", criado_em: p.data }));

  const mudarStatusEmpresa = async (id, status) => {
    if (!supabaseConfigurado) {
      setStatusEmpresa((s) => ({ ...s, [id]: "Modo demonstração — conecte o Supabase para salvar de verdade." }));
      return;
    }
    const { error } = await supabase.from("empresas").update({ status }).eq("id", id);
    if (!error) setEmpresasPend((atual) => atual.map((e) => (e.id === id ? { ...e, status } : e)));
    else setStatusEmpresa((s) => ({ ...s, [id]: error.message }));
  };

  const iniciarEdicaoEmpresa = (e) => { setEditandoEmpresa(e.id); setFormEmpresa({ nome: e.nome, categoria: e.categoria }); };

  const salvarEdicaoEmpresa = async (id) => {
    if (!supabaseConfigurado) {
      setEmpresasPend((atual) => atual.map((e) => (e.id === id ? { ...e, ...formEmpresa } : e)));
      setEditandoEmpresa(null);
      return;
    }
    const { error } = await supabase.from("empresas").update({ nome: formEmpresa.nome, categoria: formEmpresa.categoria }).eq("id", id);
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
    supabase.from("feirantes").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => {
      if (!error) setFeirantes(data || []);
    });
  }, []);

  const mudarStatusFeirante = async (id, status) => {
    if (!supabaseConfigurado) { setFeirantes((atual) => (atual || []).map((f) => (f.id === id ? { ...f, status } : f))); return; }
    const { error } = await supabase.from("feirantes").update({ status }).eq("id", id);
    if (!error) setFeirantes((atual) => atual.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const [feirasEspeciaisAdmin, setFeirasEspeciaisAdmin] = useState(null);
  const [novaFeiraEspecial, setNovaFeiraEspecial] = useState({ titulo: "", data_inicio: "", local: "" });

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
      setNovaFeiraEspecial({ titulo: "", data_inicio: "", local: "" });
      return;
    }
    const { data, error } = await supabase.from("eventos_calendario").insert({ ...novaFeiraEspecial, tipo: "feira" }).select().single();
    if (!error) {
      setFeirasEspeciaisAdmin((atual) => [...(atual ?? []), data]);
      setNovaFeiraEspecial({ titulo: "", data_inicio: "", local: "" });
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
  const [novoEvento, setNovoEvento] = useState({ titulo: "", descricao: "", data_inicio: "", data_fim: "", local: "", tipo: "outro" });
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [erroEvento, setErroEvento] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("eventos_calendario").select("*").order("data_inicio").then(({ data, error }) => {
      if (!error) setEventosAdmin(data || []);
    });
  }, []);

  const listaEventos = eventosAdmin ?? [];

  const adicionarEvento = async (e) => {
    e.preventDefault();
    setErroEvento("");
    if (!novoEvento.titulo || !novoEvento.data_inicio) { setErroEvento("Preencha ao menos título e data."); return; }
    if (!supabaseConfigurado) {
      setEventosAdmin((atual) => [...(atual ?? []), { id: `demo-${Date.now()}`, ...novoEvento }]);
      setNovoEvento({ titulo: "", descricao: "", data_inicio: "", data_fim: "", local: "", tipo: "outro" });
      return;
    }
    setSalvandoEvento(true);
    try {
      const registro = { ...novoEvento, data_fim: novoEvento.data_fim || null };
      const { data, error } = await supabase.from("eventos_calendario").insert(registro).select().single();
      if (error) throw error;
      setEventosAdmin((atual) => [...(atual ?? []), data]);
      setNovoEvento({ titulo: "", descricao: "", data_inicio: "", data_fim: "", local: "", tipo: "outro" });
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

  const items = [
    { id: "dashboard", label: "Estatísticas", icon: LayoutDashboard },
    { id: "empresas", label: "Comerciantes", icon: CheckCircle2 },
    { id: "produtos", label: "Produtos", icon: ShoppingBag },
    { id: "feira", label: "Feira do Empreendedor", icon: PartyPopper },
    { id: "calendario", label: "Calendário de eventos", icon: CalendarDays },
    { id: "servicos", label: "Serviços do Empreendedor", icon: Landmark },
    { id: "enquetes", label: "Enquetes", icon: Vote },
    { id: "noticias", label: "Notícias", icon: Newspaper },
    { id: "vagas", label: "Vagas", icon: Briefcase },
    { id: "banners", label: "Banners", icon: ImageIcon },
    { id: "notificacoes", label: "Notificações", icon: Bell },
  ];

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="rounded-2xl border p-3 h-fit" style={{ borderColor: C.line }}>
        <p className="font-body text-[11px] font-bold uppercase tracking-wider px-2 mb-2" style={{ color: "#7E93A7" }}>Painel do administrador</p>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                ["206", "Empresas ativas", Building2],
                ["540", "Produtos publicados", ShoppingBag],
                ["18", "Vagas abertas", Briefcase],
                ["12.4k", "Visualizações no mês", Eye],
              ].map(([n, l, Icon]) => (
                <div key={l} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <Icon size={16} color={C.blue} />
                  <p className="font-display font-extrabold text-xl mt-2" style={{ color: C.ink }}>{n}</p>
                  <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{l}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
              <p className="font-display font-bold text-sm mb-3" style={{ color: C.ink }}>Acessos na última semana</p>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={visitasSemana}>
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#7E93A7" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#7E93A7" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke={C.blue} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === "empresas" && (
          <div>
            <SectionHeader eyebrow="Moderação" title="Empresas aguardando aprovação" sub="Aprovar, recusar e editar já grava direto no banco" />
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: as ações abaixo só são salvas de verdade com o Supabase conectado.
              </div>
            )}
            <div className="flex flex-col gap-3">
              {listaEmpresas.map((p) => (
                <div key={p.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: C.line }}>
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                    <Building2 size={17} />
                  </span>
                  {editandoEmpresa === p.id ? (
                    <div className="flex-1 min-w-[200px] flex gap-2">
                      <input value={formEmpresa.nome} onChange={(e) => setFormEmpresa((f) => ({ ...f, nome: e.target.value }))}
                        className="flex-1 font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                      <input value={formEmpresa.categoria} onChange={(e) => setFormEmpresa((f) => ({ ...f, categoria: e.target.value }))}
                        className="w-36 font-body text-sm border rounded-lg px-2.5 py-1.5 outline-none" style={{ borderColor: C.line }} />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
                      <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{p.categoria} · status: {p.status}</p>
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
                    </>
                  )}
                </div>
              ))}
              {listaEmpresas.length === 0 && <p className="font-body text-sm" style={{ color: "#7E93A7" }}>Nenhuma empresa cadastrada ainda.</p>}
            </div>
          </div>
        )}

        {tab === "produtos" && (
          <div>
            <SectionHeader eyebrow="Moderação" title="Produtos publicados" sub="Publicar/despublicar e remover já grava direto no banco" />
            <div className="flex flex-col gap-3">
              {listaProdutos.map((p) => (
                <div key={p.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: C.line }}>
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                    <ShoppingBag size={17} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
                    <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{p.empresas?.nome || "—"}</p>
                  </div>
                  {p._denunciado ? (
                    <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#FBEAE5", color: "#B4462F" }}>Denunciado</span>
                  ) : p.ativo ? (
                    <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#E7F6EE", color: "#1E8E5A" }}>Publicado</span>
                  ) : (
                    <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: C.blueTint, color: "#7E93A7" }}>Inativo</span>
                  )}
                  <button onClick={() => alternarAtivoProduto(p.id, !p.ativo)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>
                    {p.ativo ? "Despublicar" : "Publicar"}
                  </button>
                  <button onClick={() => removerProduto(p.id)} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Remover</button>
                </div>
              ))}
              {listaProdutos.length === 0 && <p className="font-body text-sm" style={{ color: "#7E93A7" }}>Nenhum produto publicado ainda.</p>}
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
                <button type="submit" className="font-body text-xs font-bold text-white rounded-lg py-2.5 sm:col-span-3 flex items-center justify-center gap-1.5" style={{ background: C.amberDark }}>
                  <PlusCircle size={14} /> Cadastrar feira especial
                </button>
              </form>
              <div className="flex flex-col gap-2 max-w-lg">
                {listaFeirasEspeciais.map((f) => (
                  <div key={f.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: C.line }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-xs truncate" style={{ color: C.ink }}>{f.titulo}</p>
                      <p className="font-body text-[11px]" style={{ color: "#7E93A7" }}>{f.data_inicio} · {f.local}</p>
                    </div>
                    <button onClick={() => removerFeiraEspecial(f.id)} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                  </div>
                ))}
                {listaFeirasEspeciais.length === 0 && <p className="font-body text-xs" style={{ color: "#7E93A7" }}>Nenhuma feira especial cadastrada.</p>}
              </div>
            </div>

            <div>
              <SectionHeader eyebrow="Cadastros" title="Feirantes" sub="Aprovar ou recusar quem se cadastrou pelo site" />
              <div className="flex flex-col gap-3">
                {(feirantes ?? []).map((f) => (
                  <div key={f.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: C.line }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{f.nome}</p>
                      <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{f.produto} · {f.whatsapp}{f.instagram ? ` · ${f.instagram}` : ""}</p>
                    </div>
                    <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{
                        background: f.status === "aprovado" ? "#E7F6EE" : f.status === "recusado" ? "#FBEAE5" : C.blueTint,
                        color: f.status === "aprovado" ? "#1E8E5A" : f.status === "recusado" ? "#B4462F" : "#7E93A7",
                      }}>
                      {f.status}
                    </span>
                    {f.status !== "aprovado" && (
                      <button onClick={() => mudarStatusFeirante(f.id, "aprovado")} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: "#25A85B" }}>Aprovar</button>
                    )}
                    {f.status !== "recusado" && (
                      <button onClick={() => mudarStatusFeirante(f.id, "recusado")} className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Recusar</button>
                    )}
                  </div>
                ))}
                {(feirantes ?? []).length === 0 && <p className="font-body text-sm" style={{ color: "#7E93A7" }}>Nenhum cadastro de feirante ainda.</p>}
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
              <input value={novoEvento.local} onChange={(e) => setNovoEvento((f) => ({ ...f, local: e.target.value }))} placeholder="Local"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <select value={novoEvento.tipo} onChange={(e) => setNovoEvento((f) => ({ ...f, tipo: e.target.value }))}
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }}>
                <option value="outro">Evento geral</option>
                <option value="feira">Feira</option>
                <option value="curso">Curso</option>
                <option value="institucional">Institucional</option>
              </select>
              <button type="submit" disabled={salvandoEvento} className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2 disabled:opacity-60" style={{ background: C.blue }}>
                {salvandoEvento ? "Salvando..." : "Adicionar ao calendário"}
              </button>
            </form>

            <div className="flex flex-col gap-2 max-w-2xl">
              {listaEventos.map((ev) => (
                <div key={ev.id} className="rounded-xl border p-3.5 flex items-center gap-3" style={{ borderColor: C.line }}>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                    <CalendarDays size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-xs truncate" style={{ color: C.ink }}>{ev.titulo}</p>
                    <p className="font-body text-[11px]" style={{ color: "#7E93A7" }}>
                      {ev.data_inicio}{ev.data_fim ? ` a ${ev.data_fim}` : ""}{ev.local ? ` · ${ev.local}` : ""} · {ev.tipo}
                    </p>
                  </div>
                  <button onClick={() => removerEvento(ev.id)} style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                </div>
              ))}
              {listaEventos.length === 0 && <p className="font-body text-sm" style={{ color: "#7E93A7" }}>Nenhum evento cadastrado ainda.</p>}
            </div>
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
                      {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" /> : <Upload size={16} color={s.cor_hex || C.blue} />}
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

        {tab === "enquetes" && (
          <div>
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <SectionHeader eyebrow="Engajamento" title="Enquetes" sub="Pergunte à comunidade e acompanhe os resultados em tempo real" />
            </div>
            <div className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg mb-6" style={{ borderColor: C.line }}>
              <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Criar nova enquete</p>
              <input placeholder="Pergunta da enquete" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input placeholder="Opção 1" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input placeholder="Opção 2" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button className="glow-btn font-body text-sm font-bold text-white rounded-lg py-2.5 flex items-center justify-center gap-2" style={{ background: C.blue }}>
                <Vote size={14} /> Publicar enquete
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {enquetes.map((eq) => {
                const total = eq.opcoes.reduce((s, o) => s + o.votos, 0);
                return (
                  <div key={eq.pergunta} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{eq.pergunta}</p>
                      <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                        style={{ background: eq.ativa ? "#E7F6EE" : C.blueTint, color: eq.ativa ? "#1E8E5A" : "#7E93A7" }}>
                        {eq.ativa ? "Ativa" : "Encerrada"}
                      </span>
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
                    <p className="font-body text-[11px] mt-2" style={{ color: "#7E93A7" }}>{total} votos no total</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "noticias" && (
          <div>
            <SectionHeader eyebrow="Comunicação" title="Cadastrar notícia" />
            <div className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg" style={{ borderColor: C.line }}>
              <input placeholder="Título da notícia" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea placeholder="Conteúdo" rows={4} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button className="font-body text-sm font-bold text-white rounded-lg py-2.5" style={{ background: C.blue }}>Publicar notícia</button>
            </div>
          </div>
        )}

        {tab === "vagas" && (
          <div>
            <SectionHeader eyebrow="Empregabilidade" title="Vagas publicadas" />
            <div className="flex flex-col gap-3">
              {vagas.map((v) => (
                <div key={v.cargo} className="rounded-2xl border p-4 flex items-center gap-4" style={{ borderColor: C.line }}>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{v.cargo}</p>
                    <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{v.empresa} · {v.salario}</p>
                  </div>
                  <button className="font-body text-xs font-bold px-3 py-2 rounded-lg border" style={{ borderColor: C.line, color: "#425A70" }}>Editar</button>
                  <button className="font-body text-xs font-bold px-3 py-2 rounded-lg" style={{ color: "#B4462F" }}>Remover</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "banners" && (
          <div>
            <SectionHeader eyebrow="Vitrine" title="Gerenciar banners da home" />
            <div className="grid sm:grid-cols-2 gap-4">
              {["Banner principal", "Campanha Compre em Ivatuba"].map((b) => (
                <div key={b} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <div className="h-24 rounded-xl flex items-center justify-center mb-3" style={{ background: C.blueTint }}>
                    <ImageIcon size={22} color={C.blue} />
                  </div>
                  <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{b}</p>
                  <button className="font-body text-xs font-bold mt-2" style={{ color: C.blue }}>Substituir imagem</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "notificacoes" && (
          <div>
            <SectionHeader eyebrow="Engajamento" title="Enviar notificação push" />
            <div className="rounded-2xl border p-5 flex flex-col gap-3 max-w-lg" style={{ borderColor: C.line }}>
              <input placeholder="Título da notificação" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea placeholder="Mensagem" rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button className="font-body text-sm font-bold text-white rounded-lg py-2.5 flex items-center justify-center gap-2" style={{ background: C.blue }}>
                <Send size={14} /> Enviar para todos os usuários
              </button>
            </div>
          </div>
        )}
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
function ModalNovoProduto({ onFechar }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
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
        descricao, foto_url: fotoUrl, imagem_ilustrativa: usandoImagemIlustrativa, ativo: true,
      });
      if (error) throw error;
      setSalvo(true);
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
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint2 }}>
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
              <p className="font-body text-sm mt-1" style={{ color: "#7E93A7" }}>Ele já aparece na sua lista de produtos.</p>
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
                    <img src={foto.previewUrl} alt="Prévia do produto" className="w-20 h-20 rounded-lg object-cover border" style={{ borderColor: C.line }} />
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
                    <span className="font-body text-xs" style={{ color: "#7E93A7" }}>Enviar foto real do produto</span>
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
                        <img src={`data:image/png;base64,${imagemIA}`} alt="Imagem ilustrativa gerada por IA" className="w-20 h-20 rounded-lg object-cover border" style={{ borderColor: C.line }} />
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

function EmpresarioPanel() {
  const [tab, setTab] = useState("perfil");
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);

  // Dados reais da empresa do empresário logado — WhatsApp e Instagram
  // já existem no banco (tabela `empresas`), só faltava esta tela ler e
  // gravar de verdade em vez de mostrar valores fixos.
  const [empresaId, setEmpresaId] = useState(null);
  const [perfilForm, setPerfilForm] = useState({ nome: "", whatsapp: "", instagram: "", endereco: "", horario_atendimento: "" });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [statusPerfil, setStatusPerfil] = useState("");

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
      const { data } = await supabase.from("empresas").select("*").eq("dono_id", usuarioId).single();
      if (data) {
        setEmpresaId(data.id);
        setPerfilForm({
          nome: data.nome || "", whatsapp: data.whatsapp || "", instagram: data.instagram || "",
          endereco: data.endereco || "", horario_atendimento: data.horario_atendimento || "",
        });
      }
    })();
  }, []);

  const atualizarPerfilForm = (campo, valor) => setPerfilForm((f) => ({ ...f, [campo]: valor }));

  const salvarPerfil = async (e) => {
    e.preventDefault();
    setStatusPerfil("");
    if (!supabaseConfigurado || !empresaId) { setStatusPerfil("ok"); return; }
    setSalvandoPerfil(true);
    try {
      const { error } = await supabase.from("empresas").update({
        nome: perfilForm.nome, whatsapp: perfilForm.whatsapp, instagram: perfilForm.instagram,
        endereco: perfilForm.endereco, horario_atendimento: perfilForm.horario_atendimento,
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
    { id: "perfil", label: "Editar perfil", icon: UserCircle2 },
    { id: "produtos", label: "Produtos", icon: ShoppingBag },
    { id: "promocoes", label: "Promoções", icon: Tag },
    { id: "vagas", label: "Publicar vaga", icon: Briefcase },
    { id: "visualizacoes", label: "Visualizações", icon: Eye },
  ];

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="rounded-2xl border p-3 h-fit" style={{ borderColor: C.line }}>
        <p className="font-body text-[11px] font-bold uppercase tracking-wider px-2 mb-2 truncate" style={{ color: "#7E93A7" }}>{perfilForm.nome || "Minha empresa"}</p>
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
        {tab === "perfil" && (
          <div>
            <SectionHeader eyebrow="Sua empresa" title="Editar perfil" />
            {!supabaseConfigurado && (
              <div className="mb-4 rounded-xl px-3.5 py-2.5 font-body text-xs flex items-start gap-2 max-w-2xl" style={{ background: "#FFF6E9", color: "#8A5A12" }}>
                <BadgeCheck size={14} className="mt-0.5 shrink-0" />
                Modo demonstração: conecte o Supabase para essas alterações serem salvas de verdade.
              </div>
            )}
            <form onSubmit={salvarPerfil} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl" style={{ borderColor: C.line }}>
              <input value={perfilForm.nome} onChange={(e) => atualizarPerfilForm("nome", e.target.value)} placeholder="Nome da empresa"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
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
              <input value={perfilForm.endereco} onChange={(e) => atualizarPerfilForm("endereco", e.target.value)} placeholder="Endereço"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input value={perfilForm.horario_atendimento} onChange={(e) => atualizarPerfilForm("horario_atendimento", e.target.value)} placeholder="Horário de atendimento"
                className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button type="button" className="font-body text-sm font-bold px-3 py-2.5 rounded-lg border flex items-center justify-center gap-2" style={{ borderColor: C.line, color: "#425A70" }}>
                <MapPin size={14} /> Ajustar localização no mapa
              </button>
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
            <div className="flex items-center justify-between mb-6">
              <SectionHeader eyebrow="Vitrine" title="Meus produtos" />
              <button onClick={() => setModalProdutoAberto(true)} className="font-body text-xs font-bold text-white rounded-lg px-3 py-2 flex items-center gap-1.5 h-fit shrink-0" style={{ background: C.blue }}>
                <PlusCircle size={14} /> Novo produto
              </button>
            </div>
            <div className="flex flex-col gap-3 -mt-4">
              {meusProdutos.map((p) => (
                <div key={p.nome} className="rounded-2xl border p-4 flex items-center gap-4" style={{ borderColor: C.line }}>
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                    <ShoppingBag size={16} />
                  </span>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{p.nome}</p>
                    <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{p.preco} · {p.ativo ? "Ativo" : "Inativo"}</p>
                  </div>
                  <button style={{ color: "#425A70" }}><Pencil size={15} /></button>
                  <button style={{ color: "#B4462F" }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "promocoes" && (
          <div>
            <SectionHeader eyebrow="Vendas" title="Criar promoção" />
            <div className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl" style={{ borderColor: C.line }}>
              <select className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }}>
                {meusProdutos.map((p) => <option key={p.nome}>{p.nome}</option>)}
              </select>
              <input placeholder="% de desconto" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input placeholder="Válida até" type="date" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <button className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2" style={{ background: C.blue }}>Publicar promoção</button>
            </div>
          </div>
        )}

        {tab === "vagas" && (
          <div>
            <SectionHeader eyebrow="Contratação" title="Publicar vaga" />
            <div className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3 max-w-2xl" style={{ borderColor: C.line }}>
              <input placeholder="Cargo" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <input placeholder="Salário" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <input placeholder="Cidade" defaultValue="Ivatuba - PR" className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
              <textarea placeholder="Requisitos" rows={3} className="font-body text-sm border rounded-lg px-3 py-2.5 outline-none sm:col-span-2" style={{ borderColor: C.line }} />
              <button className="font-body text-sm font-bold text-white rounded-lg py-2.5 sm:col-span-2" style={{ background: C.blue }}>Publicar vaga</button>
            </div>
          </div>
        )}

        {tab === "visualizacoes" && (
          <div>
            <SectionHeader eyebrow="Desempenho" title="Visualizações do meu perfil" />
            <div className="grid grid-cols-3 gap-4 mb-6 max-w-lg">
              {[["1.2k", "Este mês"], ["312", "Esta semana"], ["48", "Hoje"]].map(([n, l]) => (
                <div key={l} className="rounded-2xl border p-4" style={{ borderColor: C.line }}>
                  <p className="font-display font-extrabold text-xl" style={{ color: C.blue }}>{n}</p>
                  <p className="font-body text-xs" style={{ color: "#7E93A7" }}>{l}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border p-4 max-w-2xl" style={{ borderColor: C.line }}>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={visitasSemana}>
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#7E93A7" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#7E93A7" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke={C.amber} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalProdutoAberto && <ModalNovoProduto onFechar={() => setModalProdutoAberto(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de cadastro de feirante — nome, contato, redes sociais e até 5 fotos
// dos produtos oferecidos.
// ---------------------------------------------------------------------------
function ModalCadastroFeirante({ onFechar }) {
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
        fotos_urls: urls,
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
          <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint2 }}>
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
              <p className="font-body text-sm mt-1" style={{ color: "#7E93A7" }}>
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

              <div>
                <p className="font-body text-xs font-semibold mb-1.5" style={{ color: "#425A70" }}>
                  Fotos do que você oferece <span style={{ color: "#B7C6D6" }}>(até 5)</span>
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {fotos.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border" style={{ borderColor: C.line }}>
                      <img src={f.previewUrl} alt={f.nome} className="w-full h-full object-cover" />
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
// Capa de comerciante em destaque — espaço de publicidade paga, com rótulo
// "Publicidade" visível (transparência com quem visita o site).
// ---------------------------------------------------------------------------
function CapaComercianteDestaque() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndice((i) => (i + 1) % comerciantesPublicidade.length), 6000);
    return () => clearInterval(t);
  }, []);

  const c = comerciantesPublicidade[indice];

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

            <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Building2 size={42} color="#fff" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.amber, color: C.blueDeep }}>
                  {c.categoria}
                </span>
                <span className="font-body text-[11px] text-white/60">{c.bairro}, Ivatuba</span>
              </div>
              <p className="font-display font-extrabold text-white text-2xl md:text-3xl">{c.nome}</p>
              <p className="font-body text-sm text-white/75 mt-1.5 max-w-md">{c.chamada}</p>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
              <button className="glow-btn font-body font-bold text-xs rounded-xl px-5 py-3 flex items-center justify-center gap-1.5 text-white" style={{ background: "#25A85B" }}>
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button className="font-body font-bold text-xs rounded-xl px-5 py-3 flex items-center justify-center gap-1.5 border border-white/25 text-white">
                Ver perfil
              </button>
            </div>
          </div>

          <div className="relative flex justify-center gap-1.5 pb-4">
            {comerciantesPublicidade.map((_, i) => (
              <button key={i} onClick={() => setIndice(i)} aria-label={`Anunciante ${i + 1}`}
                className="rounded-full transition-all"
                style={{ width: i === indice ? 18 : 6, height: 6, background: i === indice ? C.amber : "rgba(255,255,255,0.3)" }} />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function BannerPromocoes() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndice((i) => (i + 1) % promocoesDestaque.length), 4500);
    return () => clearInterval(t);
  }, []);

  const promo = promocoesDestaque[indice];
  const desconto = Math.round((1 - promo.precoPromo / promo.precoOriginal) * 100);

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
                <button className="glow-btn font-body font-bold text-sm rounded-xl px-5 py-2.5 flex items-center gap-2" style={{ background: "#25A85B", color: "#fff" }}>
                  <MessageCircle size={15} /> Chamar no WhatsApp
                </button>
                <div className="flex gap-1.5">
                  {promocoesDestaque.map((_, i) => (
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
function CalendarioEventos() {
  const [eventos, setEventos] = useState(null); // null = carregando/indisponível

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("eventos_calendario").select("*").order("data_inicio").then(({ data, error }) => {
      if (!error && data) setEventos(data);
    });
  }, []);

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
    .filter((ev) => ev.data_inicio)
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
    .slice(0, 5);

  const rotuloTipo = { feira: "Feira", curso: "Curso", institucional: "Institucional", outro: "Evento" };
  const corTipo = { feira: C.amberDark, curso: C.blue, institucional: C.blueDeep, outro: "#7E93A7" };
  const formatarData = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

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
              className="aspect-square rounded-lg flex items-center justify-center relative font-body text-xs"
              style={{
                background: selecionado ? C.blue : ehHoje ? C.blueTint : "transparent",
                color: selecionado ? "#fff" : C.ink,
                fontWeight: ehHoje || selecionado ? 700 : 500,
              }}>
              {dia}
              {temEvento && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: selecionado ? "#fff" : C.amberDark }} />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: C.line }}>
        <p className="font-body text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "#7E93A7" }}>
          {eventosDoDia ? `Eventos do dia ${diaSelecionado}` : "Próximos eventos"}
        </p>
        <div className="flex flex-col gap-2.5">
          {(eventosDoDia ?? proximosEventos).length === 0 && (
            <p className="font-body text-xs" style={{ color: "#B7C6D6" }}>Nenhum evento nessa data.</p>
          )}
          {(eventosDoDia ?? proximosEventos).map((ev) => (
            <div key={ev.id} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: corTipo[ev.tipo] || "#7E93A7" }} />
              <div className="min-w-0 flex-1">
                <p className="font-body text-xs font-semibold truncate" style={{ color: C.ink }}>{ev.titulo}</p>
                <p className="font-body text-[10px]" style={{ color: "#7E93A7" }}>
                  {formatarData(ev.data_inicio)}{ev.local ? ` · ${ev.local}` : ""} · {rotuloTipo[ev.tipo] || "Evento"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SiteHome({ onAuth }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalFeiranteAberto, setModalFeiranteAberto] = useState(false);
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState({});
  const [empresasReais, setEmpresasReais] = useState(null); // null = ainda carregando / indisponível
  const [servicosReais, setServicosReais] = useState(null);
  const [feiraConfigReal, setFeiraConfigReal] = useState(null);
  const [feirasEspeciaisReais, setFeirasEspeciaisReais] = useState(null);
  const empresasSecaoRef = useRef(null);
  const vagasSecaoRef = useRef(null);

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

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase
      .from("empresas")
      .select("nome, categoria, bairro, cidade, rating, cartao_servidor:aceita_cartao_servidor, itens:visualizacoes")
      .eq("status", "aprovada")
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setEmpresasReais(data.map((d) => ({
            nome: d.nome, cat: d.categoria, bairro: d.bairro, cidade: d.cidade,
            rating: d.rating ?? "—", cartaoServidor: !!d.cartao_servidor, itens: d.itens ?? 0,
          })));
        }
      });
  }, []);

  const listaBase = empresasReais ?? empresas; // usa dados reais assim que existirem

  const empresasFiltradas = useMemo(() => {
    if (!query.trim()) return listaBase;
    return listaBase.filter((e) => e.nome.toLowerCase().includes(query.toLowerCase()) || e.cat.toLowerCase().includes(query.toLowerCase()));
  }, [query, listaBase]);

  const nav = ["Empresas", "Produtos", "Vagas", "Cursos", "Notícias"];

  return (
    <div className="font-body min-h-screen" style={{ background: "#fff", color: C.ink }}>
      {/* Barra institucional */}
      <div className="text-white text-[11px] font-body" style={{ background: C.blueDeep }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 truncate"><MapPinned size={12} /> Feito para fortalecer o comércio de Ivatuba</span>
          <span className="hidden sm:inline">Desenvolvido por Gabriel Oliveira</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b" style={{ borderColor: C.line }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <LogoMark size={36} />
            <span className="font-display font-extrabold text-lg leading-none" style={{ color: C.blue }}>
              Conecta<span style={{ color: C.ink }}>Comércio</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 ml-4">
            {nav.map((n) => (
              <a key={n} href="#" className="font-body text-sm font-semibold" style={{ color: "#425A70" }}>{n}</a>
            ))}
          </nav>

          <div className="ml-auto hidden md:flex items-center gap-3">
            <button onClick={() => onAuth?.("entrar")} className="font-body text-sm font-semibold px-4 py-2 rounded-lg border" style={{ borderColor: C.blue, color: C.blue }}>
              Entrar
            </button>
            <button onClick={() => onAuth?.("cadastro")} className="glow-btn font-body text-sm font-bold px-4 py-2 rounded-lg text-white" style={{ background: C.blue }}>
              Cadastrar empresa
            </button>
          </div>

          <button className="md:hidden ml-auto" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t px-4 py-3 flex flex-col gap-3" style={{ borderColor: C.line }}>
            {nav.map((n) => (
              <a key={n} href="#" className="font-body text-sm font-semibold" style={{ color: "#425A70" }}>{n}</a>
            ))}
            <button onClick={() => onAuth?.("cadastro")} className="font-body text-sm font-bold px-4 py-2 rounded-lg text-white text-center" style={{ background: C.blue }}>
              Cadastrar empresa
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${C.blue} 0%, ${C.blueDeep} 100%)` }}>
        {/* Blobs animados de fundo */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="blob absolute -top-20 -left-10 w-80 h-80 rounded-full" style={{ background: "#3E8FD9" }} />
          <div className="blob blob-b absolute top-10 right-0 w-96 h-96 rounded-full" style={{ background: C.amber, opacity: 0.35 }} />
          <div className="blob blob-c absolute bottom-[-6rem] left-1/3 w-72 h-72 rounded-full" style={{ background: "#5FC6E8", opacity: 0.3 }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-10 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center relative">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: C.amber }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C.amber }} />
              </span>
              <span className="font-display text-xs font-bold tracking-[0.16em] uppercase text-white/90">Plataforma oficial do comércio local · ao vivo</span>
            </div>
            <h1 className="font-display font-extrabold grad-text text-[34px] leading-[1.12] md:text-[48px] md:leading-[1.08]">
              O comércio de Ivatuba,<br /> em movimento.
            </h1>
            <p className="font-body text-white/80 text-[15px] mt-4 max-w-md">
              Empresas, produtos, vagas e cursos da sua cidade, atualizados agora mesmo — e cada compra ajuda o dinheiro a girar aqui.
            </p>

            <div className="mt-7 bg-white rounded-2xl p-2 flex items-center gap-2 shadow-2xl max-w-lg glow-card" style={{ borderColor: "transparent" }}>
              <Search size={18} className="ml-2 shrink-0" color="#7E93A7" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empresas, produtos ou serviços..."
                className="font-body flex-1 min-w-0 text-sm outline-none py-2"
              />
              <button className="glow-btn font-body font-bold text-sm px-4 md:px-5 py-2.5 rounded-xl shrink-0" style={{ background: C.amber, color: C.blueDeep }}>
                Buscar
              </button>
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

            <div className="flex gap-6 mt-8">
              {[[206, "", "empresas"], [540, "+", "produtos"], [18, "", "vagas abertas"]].map(([n, s, l]) => (
                <div key={l}>
                  <p className="font-display font-extrabold text-white text-2xl tabular-nums">
                    <AnimatedNumber value={n} suffix={s} />
                  </p>
                  <p className="font-body text-white/60 text-xs">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signature: selo/carimbo "Compre em Ivatuba" com pulso */}
          <div className="relative hidden md:flex items-center justify-center h-full">
            <div className="stamp ring-pulse w-52 h-52 rounded-full border-4 border-dashed flex items-center justify-center text-center p-6"
              style={{ borderColor: "rgba(255,255,255,0.5)", transform: "rotate(-8deg)" }}>
              <div>
                <BadgeCheck size={30} color="#fff" className="mx-auto mb-2" />
                <p className="font-display font-extrabold text-white text-sm leading-tight">COMPRE EM<br />IVATUBA</p>
                <p className="font-body text-white/70 text-[10px] mt-1 tracking-wide">MOVIMENTO LOCAL</p>
              </div>
            </div>
          </div>
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
                {[...atividades, ...atividades].map((a, i) => (
                  <span key={i} className="font-body text-xs text-white/75">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <BannerPromocoes />
      <CapaComercianteDestaque />

      {/* Categorias */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <Reveal>
          <SectionHeader eyebrow="Explorar" title="Categorias de empresas" sub="Tudo que Ivatuba tem para oferecer, organizado por perto de você" />
        </Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categorias.map((c, i) => (
            <Reveal key={c.nome} delay={i * 60}><CategoryCard cat={c} /></Reveal>
          ))}
        </div>
      </section>

      {/* Serviços do Empreendedor — em destaque */}
      <section className="relative overflow-hidden py-14" style={{ background: `linear-gradient(155deg, ${C.blueDeep} 0%, ${C.blue} 100%)` }}>
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
                        {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" /> : <Icon size={20} />}
                      </span>
                      <ExternalLink size={14} color="#B7C6D6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{s.titulo}</p>
                      <p className="font-body text-xs mt-1 leading-snug" style={{ color: "#7E93A7" }}>{s.descricao}</p>
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

      {/* Feira do Empreendedor — em destaque */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
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
                      <p className="font-body text-[11px]" style={{ color: "#7E93A7" }}>{f.data_inicio} · {f.local}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {modalFeiranteAberto && <ModalCadastroFeirante onFechar={() => setModalFeiranteAberto(false)} />}

      {/* Calendário de eventos — só o administrador edita, todo mundo vê */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
        <Reveal><SectionHeader eyebrow="Agenda da cidade" title="Calendário de eventos" sub="Feiras, cursos e eventos do comércio local — atualizado pelo administrador" /></Reveal>
        <div className="max-w-md">
          <CalendarioEventos />
        </div>
      </section>

      {/* Empresas em destaque */}
      <section ref={empresasSecaoRef} className="py-12" style={{ background: C.blueTint2 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <Reveal><SectionHeader eyebrow="Vitrine local" title="Empresas em destaque" linkLabel="Ver mapa de empresas" /></Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresasFiltradas.map((e, i) => (
              <Reveal key={e.nome} delay={i * 70}>
                <EmpresaCard e={e} fav={!!favs[e.nome]} onFav={() => setFavs((f) => ({ ...f, [e.nome]: !f[e.nome] }))} />
              </Reveal>
            ))}
            {empresasFiltradas.length === 0 && (
              <p className="font-body text-sm col-span-full" style={{ color: "#7E93A7" }}>Nenhuma empresa encontrada para "{query}".</p>
            )}
          </div>
        </div>
      </section>

      {/* Produtos em destaque */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <Reveal><SectionHeader eyebrow="Ofertas" title="Produtos em destaque" linkLabel="Ver todos" /></Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {produtos.map((p, i) => <Reveal key={p.nome} delay={i * 70}><ProdutoCard p={p} /></Reveal>)}
        </div>
      </section>

      {/* Vagas */}
      <section ref={vagasSecaoRef} className="py-12" style={{ background: C.blueTint2 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <Reveal><SectionHeader eyebrow="Trabalhe em Ivatuba" title="Vagas de emprego" linkLabel="Ver todas as vagas" /></Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vagas.map((v, i) => <Reveal key={v.cargo} delay={i * 70}><VagaCard v={v} /></Reveal>)}
          </div>
        </div>
      </section>

      {/* Cursos e Notícias */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid md:grid-cols-2 gap-10">
        <div>
          <SectionHeader eyebrow="Sala do Empreendedor" title="Cursos e eventos" />
          <div className="flex flex-col gap-3">
            {cursos.map((c) => <CursoCard key={c.titulo} c={c} />)}
          </div>
        </div>
        <div>
          <SectionHeader eyebrow="Fique por dentro" title="Notícias" />
          <div className="flex flex-col">
            {noticias.map((n, i) => (
              <a key={n.titulo} href="#" className="flex items-center gap-3 py-3.5 border-b" style={{ borderColor: C.line }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueTint, color: C.blue }}>
                  <Newspaper size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold truncate" style={{ color: C.ink }}>{n.titulo}</p>
                  <p className="font-body text-xs flex items-center gap-1 mt-0.5" style={{ color: "#7E93A7" }}><Clock size={10} /> {n.data}</p>
                </div>
                <ChevronRight size={16} color="#B7C6D6" />
              </a>
            ))}
          </div>
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
          <button className="font-body font-bold text-sm px-6 py-3 rounded-xl whitespace-nowrap" style={{ background: C.amber, color: C.blueDeep }}>
            Instalar aplicativo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 pt-12 pb-6 text-white" style={{ background: C.blueDeep }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 grid sm:grid-cols-2 md:grid-cols-5 gap-8">
          <div>
            <span className="font-display font-extrabold text-lg">Conecta Comércio</span>
            <p className="font-body text-white/60 text-xs mt-2 leading-relaxed">
              Plataforma independente para fortalecer o comércio e o empreendedorismo de Ivatuba - PR.
            </p>
            <div className="flex gap-2 mt-4">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Instagram size={14} /></span>
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><MessageCircle size={14} /></span>
            </div>
          </div>
          <div>
            <p className="font-display font-bold text-sm mb-3">Comércio Local</p>
            <ul className="font-body text-white/60 text-xs space-y-2">
              <li>Empresas cadastradas</li>
              <li>Cartão do Servidor</li>
              <li>Compre em Ivatuba</li>
            </ul>
          </div>
          <div>
            <p className="font-display font-bold text-sm mb-3">Sala do Empreendedor</p>
            <ul className="font-body text-white/60 text-xs space-y-2">
              <li>Abrir um MEI</li>
              <li>Cursos e capacitações</li>
              <li>Atendimento presencial</li>
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
          <p className="font-body text-white/40 text-xs">Feito para fortalecer quem move a economia local</p>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entrar / Cadastro — segue o modelo institucional do site oficial
// (logo + card branco), com o acabamento moderno da
// plataforma.
// ---------------------------------------------------------------------------
function ContaAcesso({ abaInicial = "cadastro", mensagem = "", onSucesso }) {
  // tela: "entrar" | "escolha" | "cadastro-cliente" | "cadastro-empresario"
  const [tela, setTela] = useState(abaInicial === "entrar" ? "entrar" : "escolha");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

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
        await supabase.from("perfis").insert({
          id: userId, nome: form.get("nome"), tipo, telefone: form.get("whatsapp"),
        });

        if (tipo === "empresario") {
          await supabase.from("empresas").insert({
            dono_id: userId,
            nome: form.get("nomeEmpresa"),
            categoria: form.get("categoria") || "A definir",
            whatsapp: form.get("whatsapp"),
            status: "pendente",
          });
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
  }[tela];

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center"
      style={{ background: `linear-gradient(160deg, ${C.blue} 0%, ${C.blueDeep} 100%)` }}>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute -top-24 -left-16 w-96 h-96 rounded-full" style={{ background: "#3E8FD9" }} />
        <div className="blob blob-b absolute bottom-[-8rem] right-[-4rem] w-96 h-96 rounded-full" style={{ background: C.amber, opacity: 0.3 }} />
      </div>

      <div className="relative max-w-5xl w-full mx-auto px-4 md:px-6 py-12 grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl">
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
              <p className="font-body text-sm mt-1" style={{ color: "#7E93A7" }}>
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
                  <p className="font-body text-xs mt-1" style={{ color: "#7E93A7" }}>
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
                  <p className="font-body text-xs mt-1" style={{ color: "#7E93A7" }}>
                    Quero cadastrar meu negócio, publicar produtos, promoções e vagas de emprego.
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
                <span className="font-body text-xs" style={{ color: "#7E93A7" }}>
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
                <input name="categoria" placeholder="Ex: Alimentação, Beleza, Serviços..." className="mt-1 w-full font-body text-sm border rounded-lg px-3 py-2.5 outline-none" style={{ borderColor: C.line }} />
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
                <span className="font-body text-xs" style={{ color: "#7E93A7" }}>
                  Li e aceito os termos de uso da plataforma e a política de privacidade.
                </span>
              </label>
              <button type="submit" disabled={carregando} className="glow-btn font-body font-bold text-sm text-white rounded-xl py-3 mt-1 disabled:opacity-60" style={{ background: C.amberDark }}>
                {carregando ? "Enviando..." : "Cadastrar minha empresa"}
              </button>
              <p className="font-body text-[11px] text-center" style={{ color: "#B7C6D6" }}>
                Sua empresa fica em análise até ser aprovada pelo administrador da plataforma.
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
              <p className="font-body text-xs text-center mt-1" style={{ color: "#7E93A7" }}>
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
        aria-label="Abrir assistente virtual"
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
              <div className="self-start font-body text-xs px-3.5 py-2.5 rounded-2xl" style={{ background: C.blueTint, color: "#7E93A7" }}>
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
      <p className="font-body text-sm mt-2" style={{ color: "#7E93A7" }}>
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
const ROTA_HASH = { site: "#/", conta: "#/entrar", admin: "#/admin", empresario: "#/empresa" };

function modoDaHash(hash) {
  const h = (hash || "").toLowerCase();
  if (h.startsWith("#/admin")) return "admin";
  if (h.startsWith("#/empresa") || h.startsWith("#/vendedor")) return "empresario";
  if (h.startsWith("#/cadastro")) return "cadastro-conta";
  if (h.startsWith("#/entrar") || h.startsWith("#/conta")) return "conta";
  return null;
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

  // Busca o perfil (tipo: cliente/empresario/admin) assim que há sessão.
  useEffect(() => {
    if (!supabaseConfigurado || !sessao) { setPerfil(null); return; }
    supabase.from("perfis").select("tipo, nome").eq("id", sessao.user.id).single()
      .then(({ data }) => setPerfil(data ?? null));
  }, [sessao]);

  const modos = [
    { id: "site", label: "Site", icon: Store },
    { id: "conta", label: "Entrar / Cadastro", icon: UserCircle2 },
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
    const alvo = ROTA_HASH[modo] || "#/";
    if (window.location.hash !== alvo) window.history.replaceState(null, "", alvo);
  }, [modo]);

  // Um painel só é liberado se: Supabase não configurado (modo demo livre),
  // ou há sessão E o perfil tem o tipo exigido.
  const podeVer = (restrito) => {
    if (!supabaseConfigurado) return true;
    if (!sessao) return false;
    if (!perfil) return true; // ainda carregando o perfil — libera provisoriamente
    return perfil.tipo === restrito;
  };

  return (
    <div className="font-body min-h-screen" style={{ background: "#fff" }}>
      <style>{fontImport}</style>

      <div className="sticky top-0 z-40 flex justify-center px-3 pt-3">
        <div className="flex items-center gap-1 bg-white rounded-full border shadow-lg p-1" style={{ borderColor: C.line }}>
          {modos.map((m) => {
            const Icon = m.icon;
            const active = modo === m.id;
            const bloqueado = m.restrito && supabaseConfigurado && !sessao;
            return (
              <a key={m.id} href={ROTA_HASH[m.id]}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full font-body text-xs font-bold transition-colors cursor-pointer"
                style={{ background: active ? C.blue : "transparent", color: active ? "#fff" : "#425A70" }}>
                <Icon size={13} /> {m.label} {bloqueado && <ShieldCheck size={11} style={{ opacity: 0.5 }} />}
              </a>
            );
          })}
        </div>
      </div>

      {modo === "site" && <SiteHome onAuth={(aba) => { setAbaConta(aba); setDestinoPosLogin(null); setModo("conta"); }} />}
      {modo === "conta" && <ContaAcesso abaInicial={abaConta} mensagem={mensagemAcesso} onSucesso={aposLogin} />}

      {modo === "admin" && (
        podeVer("admin") ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
            <SectionHeader eyebrow="Área restrita" title="Painel administrativo" sub={perfil?.nome ? `Olá, ${perfil.nome}` : "Visível só para administradores da plataforma"} />
            <AdminPanel />
          </div>
        ) : (
          <AcessoRestrito tipo="admin" onEntrar={() => irPara(modos.find((m) => m.id === "admin"))} />
        )
      )}

      {modo === "empresario" && (
        podeVer("empresario") ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
            <SectionHeader eyebrow="Área restrita" title="Painel do empresário" sub={perfil?.nome ? `Olá, ${perfil.nome}` : "Visível só para o dono da empresa, após login"} />
            <EmpresarioPanel />
          </div>
        ) : (
          <AcessoRestrito tipo="empresario" onEntrar={() => irPara(modos.find((m) => m.id === "empresario"))} />
        )
      )}

      <ChatWidget />
    </div>
  );
}
