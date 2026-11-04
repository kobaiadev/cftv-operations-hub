import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarNoticias, buscarPaginaNoticias } from "@/lib/noticias";

const feedXml = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>Segurança &amp; varejo: novas medidas</title>
    <link>https://noticias.example.com/seguranca?origem=feed</link>
    <pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate>
    <source url="https://noticias.example.com">Veículo de Notícias</source>
    <description><![CDATA[<a href="https://noticias.example.com">Resumo &amp; contexto</a>]]></description>
  </item>
  <item>
    <title>Link inválido</title>
    <link>javascript:alert(1)</link>
    <pubDate>Tue, 27 Oct 2026 09:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("feed de notícias", () => {
  it("carrega pequenos grupos sob demanda, sem repetir notícias ou buscar o RSS novamente", async () => {
    const xml = `<rss><channel>${Array.from({ length: 14 }, (_, i) => `<item><title>Notícia ${i}</title><link>https://noticias.example.com/artigo-${i}</link><pubDate>${new Date(Date.UTC(2026, 10, 4, 10, i)).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`;
    const fetchMock = vi.fn().mockResolvedValue(new Response(xml));
    vi.stubGlobal("fetch", fetchMock);
    const primeira = await buscarPaginaNoticias("tecnologia", 0);
    expect(primeira.noticias).toHaveLength(6);
    expect(primeira.proximaPagina).toBe(1);
    const segunda = await buscarPaginaNoticias("tecnologia", 1);
    expect(segunda.noticias).toHaveLength(6);
    expect(segunda.proximaPagina).toBe(2);
    expect(new Set([...primeira.noticias, ...segunda.noticias].map((n) => n.url)).size).toBe(12);
    const ultima = await buscarPaginaNoticias("tecnologia", 2);
    expect(ultima.noticias).toHaveLength(2);
    expect(ultima.proximaPagina).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("interpreta o RSS, remove marcação do resumo e mantém links seguros", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(feedXml)));

    const resultado = await buscarNoticias("seguranca-privada");

    expect(resultado.noticias).toHaveLength(1);
    expect(resultado.noticias[0]).toMatchObject({
      titulo: "Segurança & varejo: novas medidas",
      resumo: "Resumo & contexto",
      fonte: "Veículo de Notícias",
      url: "https://noticias.example.com/seguranca?origem=feed",
      categoria: "seguranca-privada",
    });
    expect(resultado.atualizadaEm).toBeTruthy();
  });

  it("informa falha quando o feed não está disponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));

    await expect(buscarNoticias("varejo")).rejects.toThrow(
      "Não foi possível carregar notícias agora.",
    );
  });
});
