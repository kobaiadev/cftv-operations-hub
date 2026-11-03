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
      className="fixed right-4 top-3 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      <span>Plantão de dúvidas</span>
    </a>
  );
}
