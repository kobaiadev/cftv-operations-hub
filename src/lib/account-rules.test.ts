import { describe, expect, it } from "vitest";
import { accountSchema, accountEditSchema, requireSafeAccountEdit, requireAdministrator, requireOtherAccount } from "./account-rules";

describe("administrator-only account registration", () => {
  it("permits editing registration without changing the password", () => {
    expect(accountEditSchema.safeParse({ userId: "a0000000-0000-4000-8000-000000000001", nome: "Pessoa", email: "person@example.com", nivel: "01" }).success).toBe(true);
    expect(accountEditSchema.safeParse({ userId: "invalid", nome: "Pessoa", email: "person@example.com", nivel: "99" }).success).toBe(false);
  });
  it("prevents self-demotion but allows editing another account", () => {
    expect(() => requireSafeAccountEdit("a", "a", "01")).toThrow();
    expect(() => requireSafeAccountEdit("a", "a", "00")).not.toThrow();
    expect(() => requireSafeAccountEdit("a", "b", "01")).not.toThrow();
  });
  it("permits account management only for level 00", () => {
    expect(() => requireAdministrator("00")).not.toThrow();
    for (const role of ["01", "02", "03", null, undefined, "admin"]) {
      expect(() => requireAdministrator(role)).toThrow();
    }
  });
  it("prevents administrators from revoking their own access", () => {
    expect(() => requireOtherAccount("a", "a")).toThrow();
    expect(() => requireOtherAccount("a", "b")).not.toThrow();
  });
  it("accepts only the existing assigned levels", () => {
    const data = { nome: "Pessoa", email: "person@example.com", senha: "test-password-long" };
    for (const nivel of ["00", "01", "02", "03"])
      expect(accountSchema.safeParse({ ...data, nivel }).success).toBe(true);
    expect(accountSchema.safeParse({ ...data, nivel: "99" }).success).toBe(false);
  });
});
