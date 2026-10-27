import type { ReactNode } from "react";
import { ImageUp } from "lucide-react";

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
  onClick,
}: {
  url: string;
  alt: string;
  texto: string;
  onClick: () => void;
}) {
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
          <ImageUp className="size-5 text-primary" />
          {texto}
        </>
      )}
    </button>
  );
}
