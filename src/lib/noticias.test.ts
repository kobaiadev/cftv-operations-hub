import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarNoticias } from "@/lib/noticias";

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
