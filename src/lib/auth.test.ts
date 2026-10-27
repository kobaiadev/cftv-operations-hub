import { describe, expect, it } from "vitest";
import { ehAdministrador, mapearPerfilUsuario, podeBaixar, podeEditar } from "@/lib/auth";

describe("permissões por nível de acesso", () => {
  it("limita cada nível às operações atribuídas", () => {
    expect([podeEditar("00"), podeBaixar("00"), ehAdministrador("00")]).toEqual([true, true, true]);
    expect([podeEditar("01"), podeBaixar("01"), ehAdministrador("01")]).toEqual([
      true,
      true,
      false,
    ]);
    expect([podeEditar("02"), podeBaixar("02"), ehAdministrador("02")]).toEqual([
      false,
      true,
      false,
    ]);
    expect([podeEditar("03"), podeBaixar("03"), ehAdministrador("03")]).toEqual([
      false,
      false,
      false,
    ]);
    expect([podeEditar(null), podeBaixar(undefined), ehAdministrador(null)]).toEqual([
      false,
      false,
      false,
    ]);
  });

  describe("perfil de usuário do Supabase", () => {
    it("mapeia as colunas configuradas em user_roles", () => {
      expect(
        mapearPerfilUsuario({
          id: "uuid-do-usuario",
          nome: "Pessoa Usuária",
          email: "pessoa@nagumo.com.br",
          nivel_acesso: "00",
        }),
      ).toEqual({
        user_id: "uuid-do-usuario",
        display_name: "Pessoa Usuária",
        email: "pessoa@nagumo.com.br",
        role: "00",
      });
    });

    it("rejeita níveis não reconhecidos", () => {
      expect(
        mapearPerfilUsuario({
          id: "uuid-do-usuario",
          nome: "Pessoa Usuária",
          email: "pessoa@nagumo.com.br",
          nivel_acesso: "99",
        }),
      ).toBeNull();
    });
  });
});
