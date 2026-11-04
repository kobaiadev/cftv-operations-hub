import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), single: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ update: mocks.update }),
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
} }));
import { atualizarReparo } from "./reparo-api";
describe("edição de reparos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ select: () => ({ single: mocks.single }) });
    mocks.single.mockResolvedValue({ data: { id: "SR-1" }, error: null });
  });
  it("mantém o solicitante original e os anexos ao editar sem novo upload", async () => {
    const imagens = [{ rotulo: "Solicitação GLPI", detalhes: "", path: "SR-1/glpi.png", tipo: "image/png" }];
    await atualizarReparo("SR-1", { loja: "loja 09", empresa_responsavel: "Empresa", gerente: "gilson", solicitante: "Editor atual", glpi_numero: "123", descricao: "Descrição corrigida", arquivos: [] }, imagens);
    expect(mocks.eq).toHaveBeenCalledWith("id", "SR-1");
    expect(mocks.update.mock.calls[0]?.[0]).toEqual({ loja: "loja 09", empresa_responsavel: "Empresa", gerente: "gilson", glpi_numero: "123", descricao: "Descrição corrigida", imagens });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("não reporta sucesso quando a atualização é recusada", async () => {
    mocks.single.mockResolvedValue({ error: new Error("Acesso negado") });
    await expect(atualizarReparo("SR-1", { loja: "loja 09", empresa_responsavel: "", gerente: "gilson", solicitante: "", glpi_numero: "", descricao: "Reparo", arquivos: [] }, [])).rejects.toThrow("Acesso negado");
  });
});