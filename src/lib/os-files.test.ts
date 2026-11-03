import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ eq: vi.fn(), download: vi.fn(), from: vi.fn(), bucket: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ obterClienteSupabase: () => ({
  from: mocks.from, storage: { from: mocks.bucket },
}) }));
import { lerFotosSupervisao } from "@/lib/os-files";

describe("leitura de anexos privados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: () => ({ eq: mocks.eq }) });
    mocks.eq.mockReturnValueOnce({ eq: mocks.eq });
    mocks.eq.mockResolvedValueOnce({ data: [{ id: "metadata-id", storage_path: "supervisao/registro/foto.jpg" }], error: null });
    mocks.bucket.mockReturnValue({ download: mocks.download });
  });
  it("recupera a foto pelo caminho privado usando o cliente autenticado", async () => {
    const blob = new Blob(["photo"], { type: "image/jpeg" });
    mocks.download.mockResolvedValue({ data: blob, error: null });
    expect(await lerFotosSupervisao("registro")).toEqual([blob]);
    expect(mocks.bucket).toHaveBeenCalledWith("private-attachments");
    expect(mocks.download).toHaveBeenCalledWith("supervisao/registro/foto.jpg");
  });
  it("propaga falhas de acesso sem retornar conteúdo vazio", async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: "Acesso negado" } });
    await expect(lerFotosSupervisao("registro")).rejects.toThrow("Acesso negado");
  });
});