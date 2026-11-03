import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("mantém somente a tela pública de login", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/login").at(-1)?.routeId).toBe("/login");
    for (const path of ["/criar-conta", "/recuperar-senha", "/reset-password"]) {
      expect(router.matchRoutes(path).at(-1)?.routeId).toBe(rootRouteId);
    }
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("reconhece a página de análise de perdas", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/analise-perdas");

    expect(matches.at(-1)?.routeId).toBe("/analise-perdas");
  });

  it("reconhece a página de supervisão", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/supervisao");

    expect(matches.at(-1)?.routeId).toBe("/supervisao");
  });

  it("reconhece as páginas de notícias e sobre o criador", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/noticias").at(-1)?.routeId).toBe("/noticias");
    expect(router.matchRoutes("/sobre-criador").at(-1)?.routeId).toBe("/sobre-criador");
  });
});
