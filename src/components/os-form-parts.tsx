import type { ReactNode } from "react";
import { FileText, ImageUp } from "lucide-react";
import { ehArquivoPdf } from "@/lib/documentos";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function UploadBox({
  url,
  alt,
  texto,
  tipo = "",
  onClick,
}: {
  url: string;
  alt: string;
  texto: string;
  tipo?: string | undefined;
  onClick: () => void;
}) {
  const pdf = ehArquivoPdf({ name: texto, type: tipo });
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
    >
      {url ? (
        <img src={url} alt={alt} className="max-h-36 rounded-md object-contain" />
      ) : (
        <>
          {pdf ? (
            <FileText className="size-5 shrink-0 text-primary" aria-label="Arquivo PDF" />
          ) : (
            <ImageUp className="size-5 shrink-0 text-primary" />
          )}
          <span className="min-w-0 break-words text-left">{texto}</span>
        </>
      )}
    </button>
  );
}
