import type { ReactNode } from "react";
import logoUrl from "@/assets/logo-nagumo.png";

export function authHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Segurança Patrimonial Nagumo` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Segurança Patrimonial Nagumo` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] };
}

export function AuthPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-card sm:p-8">
      <img src={logoUrl} alt="Nagumo" className="mb-8 w-44" />
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">{description}</p>
      {children}
      <p className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">Segurança Patrimonial · OS e Reservas CFTV</p>
    </section>
  </main>;
}