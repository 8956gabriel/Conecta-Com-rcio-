// Service worker simples do Conecta Comércio — permite instalar o site
// como app ("Adicionar à tela inicial") e guarda uma cópia leve do "esqueleto"
// do site pra abrir mais rápido nas próximas vezes. Os dados (empresas,
// produtos etc.) sempre vêm direto da internet, então não funciona 100%
// offline — só deixa o carregamento inicial mais ágil.
const CACHE = "conecta-comercio-v1";
const ARQUIVOS_ESSENCIAIS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Nunca guarda em cache chamadas ao Supabase — sempre precisam ser
  // buscadas na hora, senão a pessoa veria dados desatualizados.
  if (event.request.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copia)).catch(() => {});
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
