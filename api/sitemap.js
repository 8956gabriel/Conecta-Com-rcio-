
// Mapa do site (sitemap) gerado na hora, com a página inicial e o link de
// cada empresa aprovada — assim o Google descobre e indexa o perfil de cada
// comércio como uma página própria, não só a home.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const base = "https://conecta-com-rcio.vercel.app";
  const paginasFixas = [
    { loc: `${base}/`, prioridade: "1.0" },
    { loc: `${base}/#/estatisticas`, prioridade: "0.5" },
  ];

  let empresas = [];
  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey);
      const { data } = await supabase
        .from("empresas")
        .select("id, criado_em")
        .eq("status", "aprovada");
      empresas = data || [];
    } catch {
      empresas = [];
    }
  }

  const urls = [
    ...paginasFixas.map((p) => `  <url>\n    <loc>${p.loc}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${p.prioridade}</priority>\n  </url>`),
    ...empresas.map((e) => {
      const data = (e.criado_em || "").slice(0, 10);
      return `  <url>\n    <loc>${base}/#/loja-${e.id}</loc>${data ? `\n    <lastmod>${data}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(xml);
}
