import { MessageCircle } from "lucide-react";

const linkWhatsApp =
  "https://wa.me/5524998177800?text=Ol%C3%A1%2C%20tenho%20uma%20d%C3%BAvida%20sobre%20o%20sistema.";

export function WhatsAppFloat() {
  return (
    <a
      href={linkWhatsApp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Plantão de dúvidas pelo WhatsApp"
      title="Plantão de dúvidas pelo WhatsApp"
      className="fixed right-3 top-3 z-50 inline-flex min-h-11 w-32 items-center justify-center gap-1 rounded-full bg-support px-2 text-center text-xs font-semibold leading-tight text-support-foreground shadow-lg transition-transform hover:scale-105 hover:bg-support-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-support focus-visible:ring-offset-2 lg:right-4 lg:w-auto lg:gap-2 lg:px-4 lg:text-sm"
    >
      <MessageCircle className="size-5 shrink-0" aria-hidden="true" />
      <span>Plantão de dúvidas</span>
    </a>
  );
}
