import { describe, expect, it } from "vitest";
import { proximoNumeroOS } from "@/lib/os-store";

describe("numeração automática de OS", () => {
  it("começa em OS-2026-001 no ano sem ordens", () => {
    expect(proximoNumeroOS(["OS-2481"], 2026)).toBe("OS-2026-001");
  });
  it("continua a sequência do ano", () => {
    expect(proximoNumeroOS(["OS-2026-001", "OS-2026-009"], 2026)).toBe("OS-2026-010");
  });
  it("reinicia no ano seguinte", () => {
    expect(proximoNumeroOS(["OS-2026-045"], 2027)).toBe("OS-2027-001");
  });
});
