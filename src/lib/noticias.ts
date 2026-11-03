export const categoriasNoticias = [
  { id: "todas", nome: "Todas as notícias" },
  { id: "seguranca-privada", nome: "Segurança privada" },
  { id: "seguranca-patrimonial", nome: "Segurança patrimonial" },
  { id: "varejo", nome: "Varejo e prevenção" },
  { id: "tecnologia", nome: "Tecnologia e CFTV" },
] as const;

export type CategoriaNoticia = (typeof categoriasNoticias)[number]["id"];

export type Noticia = {
  id: string;
  titulo: string;
  resumo: string;
  fonte: string;
  url: string;
  publicadaEm: string;
  categoria: Exclude<CategoriaNoticia, "todas">;
};

const entidadesHtml: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
  nbsp: " ",
};

function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, codigo: string) => String.fromCodePoint(Number(codigo)))
    .replace(/&#x([\da-f]+);/gi, (_, codigo: string) =>
      String.fromCodePoint(Number.parseInt(codigo, 16)),
    )
    .replace(/&([a-z]+);/gi, (entidade, nome: string) => entidadesHtml[nome] ?? entidade);
}

function campoXml(bloco: string, nome: string): string {
  const expressao = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nome}>`, "i");
  const conteudo = bloco.match(expressao)?.[1] ?? "";
  const cdata = conteudo.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return decodificarEntidades(cdata?.[1] ?? conteudo.trim());
}

function textoSimples(html: string): string {
  return decodificarEntidades(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

const feeds = {
  "seguranca-privada": {
    categoria: "seguranca-privada",
    consulta: '"segurança privada" OR vigilante Brasil',
  },
  "seguranca-patrimonial": {
    categoria: "seguranca-patrimonial",
    consulta: '"segurança patrimonial" OR "segurança corporativa"',
  },
  varejo: {
    categoria: "varejo",
    consulta: '(varejo OR supermercado OR lojas) (furto OR roubo OR "prevenção de perdas")',
  },
  tecnologia: {
    categoria: "tecnologia",
    consulta: '(CFTV OR videomonitoramento OR "inteligência artificial") segurança varejo',
  },
} as const;

export async function buscarNoticias(
  categoria: CategoriaNoticia = "todas",
): Promise<{ noticias: Noticia[]; atualizadaEm: string }> {
  const selecionados = categoria === "todas" ? Object.values(feeds) : [feeds[categoria]];

  const resultados = await Promise.allSettled(
    selecionados.map(async (feed) => {
      const url = new URL("https://news.google.com/rss/search");
      url.searchParams.set("q", feed.consulta);
      url.searchParams.set("hl", "pt-BR");
      url.searchParams.set("gl", "BR");
      url.searchParams.set("ceid", "BR:pt-419");
      const resposta = await fetch(url, {
        headers: { "User-Agent": "CFTV-Operations-Hub/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (!resposta.ok) {
        throw new Error(`O feed de notícias respondeu com HTTP ${resposta.status}.`);
      }

      const xml = await resposta.text();
      const itens = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
      return itens.flatMap(([, item]): Noticia[] => {
        if (!item) return [];
        const titulo = textoSimples(campoXml(item, "title"));
        const link = campoXml(item, "link").trim();
        const fonte = textoSimples(campoXml(item, "source")) || "Google Notícias";
        const descricao = campoXml(item, "description");
        const resumo = textoSimples(descricao).slice(0, 260);
        const data = Date.parse(campoXml(item, "pubDate"));

        if (!titulo || !link || !Number.isFinite(data)) return [];
        try {
          const noticiaUrl = new URL(link);
          if (noticiaUrl.protocol !== "https:" && noticiaUrl.protocol !== "http:") return [];
          return [
            {
              id: `${feed.categoria}:${noticiaUrl.href}`,
              titulo,
              resumo,
              fonte,
              url: noticiaUrl.href,
              publicadaEm: new Date(data).toISOString(),
              categoria: feed.categoria,
            },
          ];
        } catch {
          return [];
        }
      });
    }),
  );

  const noticias = resultados.flatMap((resultado, indice) => {
    if (resultado.status === "fulfilled") return resultado.value;
    const feed = selecionados[indice];
    if (!feed) return [];
    console.error(
      `Não foi possível carregar notícias da categoria ${feed.categoria}.`,
      resultado.reason,
    );
    return [];
  });

  if (noticias.length === 0) {
    throw new Error("Não foi possível carregar notícias agora. Tente novamente em instantes.");
  }

  const unicas = new Map<string, Noticia>();
  for (const noticia of noticias.sort(
    (a, b) => Date.parse(b.publicadaEm) - Date.parse(a.publicadaEm),
  )) {
    const urlOriginal = new URL(noticia.url);
    urlOriginal.search = "";
    urlOriginal.hash = "";
    if (!unicas.has(urlOriginal.href)) unicas.set(urlOriginal.href, noticia);
  }

  return {
    noticias: [...unicas.values()].slice(0, 48),
    atualizadaEm: new Date().toISOString(),
  };
}
