import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/50 text-center">
        <Icon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Esta tela será construída na próxima fase.</p>
      </div>
    </div>
  );
}
