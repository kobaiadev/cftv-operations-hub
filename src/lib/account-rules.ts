import { z } from "zod";

export const accountSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  senha: z.string().min(12).max(128),
  nivel: z.enum(["00", "01", "02", "03"]),
});

export function requireAdministrator(role: unknown) {
  if (role !== "00") throw new Error("Apenas administradores podem gerenciar contas.");
}

export function requireOtherAccount(callerId: string, targetId: string) {
  if (callerId === targetId) throw new Error("Você não pode revogar seu próprio acesso.");
}
