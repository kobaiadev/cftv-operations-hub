const EMOJIS_E_ICONES = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const MARCADORES_DE_EMOJI = /(?:\uFE0E|\uFE0F|\u200D|\u20E3)/g;

const LINHAS_DE_INTERFACE = [
  /^\s*(?:responder(?: a todos)?|encaminhar|compartilhar|reagir|reply|forward)(?:\s*(?:\.{1,3}|…))?\s*$/i,
  /^\s*(?:visto por último|online|digitando|mensagem apagada|mensagem excluída)\b.*$/i,
  /^\s*(?:bateria|battery|wi-?fi|sinal|signal|modo avião|4g|5g|lte)\b.*$/i,
  /^\s*(?:(?:\d{1,2}:\d{2})\s*)?(?:(?:3g|4g|5g|lte|h\+)\s*)?(?:\d{1,3}%\s*)?(?:(?:3g|4g|5g|lte|h\+)\s*)?\s*$/i,
];

const ehRuido = (linha: string) => {
  if (!linha || /^\d{1,2}:\d{2}(?:\s*[ap]m)?$/i.test(linha)) return true;
  if (/^\s*(?:[-=]){3,}\s*$/.test(linha)) return true;
  return LINHAS_DE_INTERFACE.some((padrao) => padrao.test(linha));
};

const capitalizarInicio = (texto: string) =>
  texto.replace(
    /(^|[.!?]\s+)([\p{Ll}])/gu,
    (_match, separador: string, letra: string) => separador + letra.toLocaleUpperCase("pt-BR"),
  );

const formalizarLinha = (linha: string) =>
  capitalizarInicio(
    linha
      .replace(/\bvc\b/gi, "você")
      .replace(/(^|[^\p{L}\p{N}])tá(?=$|[^\p{L}\p{N}])/giu, "$1está")
      .replace(/(^|[^\p{L}\p{N}])tô(?=$|[^\p{L}\p{N}])/giu, "$1estou")
      .replace(/\bpra\b/gi, "para")
      .replace(/\bpro\b/gi, "para o")
      .replace(/\bpq\b/gi, "porque")
      .replace(/\btb\b/gi, "também")
      .replace(/\bgerente\b/gi, "Gerente")
      .replace(/\bdelegacia de polícia\b/gi, "Delegacia de Polícia")
      .replace(/\bdistrito policial\b/gi, "Distrito Policial")
      .replace(/\bpolícia civil\b/gi, "Polícia Civil")
      .replace(/\bpolícia militar\b/gi, "Polícia Militar")
      .replace(/\bministério público\b/gi, "Ministério Público")
      .replace(/\bofício\s+n[ºo°]\s*([a-z0-9./-]+)/gi, "Ofício nº $1")
      .replace(/\s+([,.;!?])/g, "$1")
      .replace(/([,;:])(?=\S)/g, "$1 "),
  );

/** Limpa marcações, emojis e ruídos comuns de OCR de mensagens e capturas de tela. */
export function limparTextoCapturado(texto: string): string {
  return texto
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, (bloco) => bloco.replace(/```[^\n]*\n?|```/g, ""))
    .replace(EMOJIS_E_ICONES, "")
    .replace(MARCADORES_DE_EMOJI, "")
    .split(/\r?\n/)
    .map((linha) =>
      linha
        .replace(/^\s{0,3}>\s?/, "")
        .replace(/^\s{0,3}#{1,6}\s*/, "")
        .replace(/^\s*(?:\d+[.)]|[a-z][.)]|[-+*•◦▪‣])\s+/i, "• ")
        .replace(/[*_#~`]/g, "")
        .replace(/-{2,}/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter((linha) => !ehRuido(linha))
    .map((linha) =>
      capitalizarInicio(linha).replace(
        /^•\s+([\p{Ll}])/u,
        (_match, letra: string) => `• ${letra.toLocaleUpperCase("pt-BR")}`,
      ),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Apresenta relatos limpos em parágrafos com pontuação final consistente. */
export function formatarTextoFormal(texto: string): string {
  return limparTextoCapturado(texto)
    .split(/\n+/)
    .map((linha) => {
      const limpa = formalizarLinha(linha.trim());
      if (!limpa || limpa.endsWith(":") || /[.!?:;]$/.test(limpa)) return limpa;
      return `${limpa}.`;
    })
    .filter(Boolean)
    .join("\n");
}
