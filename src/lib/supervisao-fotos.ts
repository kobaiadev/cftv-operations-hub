export type LocalizacaoFoto = {
  latitude: number;
  longitude: number;
  precisaoMetros: number;
};

export function obterLocalizacaoAtual(): Promise<LocalizacaoFoto> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Este dispositivo ou navegador não oferece geolocalização."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          precisaoMetros: coords.accuracy,
        }),
      (error) => {
        const mensagens: Record<number, string> = {
          1: "Permita o acesso à localização para registrar esta foto.",
          2: "Não foi possível obter a localização do dispositivo.",
          3: "O tempo para obter a localização expirou. Tente novamente.",
        };
        reject(new Error(mensagens[error.code] ?? error.message));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}

export async function gravarMetadadosNaFoto(
  arquivo: File,
  capturadaEm: string,
  localizacao: LocalizacaoFoto,
): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  try {
    const escala = Math.min(1, 1600 / imagem.width);
    const largura = Math.round(imagem.width * escala);
    const altura = Math.round(imagem.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Não foi possível preparar a imagem para gravação.");

    contexto.drawImage(imagem, 0, 0, largura, altura);
    const alturaFaixa = Math.max(76, Math.round(largura * 0.075));
    const tamanhoFonte = Math.max(16, Math.round(largura * 0.023));
    contexto.fillStyle = "rgba(0, 0, 0, 0.76)";
    contexto.fillRect(0, altura - alturaFaixa, largura, alturaFaixa);
    contexto.fillStyle = "#ffffff";
    contexto.font = `600 ${tamanhoFonte}px sans-serif`;
    contexto.textBaseline = "middle";
    const dataHora = new Date(capturadaEm).toLocaleString("pt-BR");
    const local = `${localizacao.latitude.toFixed(6)}, ${localizacao.longitude.toFixed(6)} · ±${Math.round(localizacao.precisaoMetros)} m`;
    contexto.fillText(dataHora, 16, altura - alturaFaixa / 2 - tamanhoFonte * 0.65);
    contexto.fillText(local, 16, altura - alturaFaixa / 2 + tamanhoFonte * 0.65);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Não foi possível gerar a foto com os dados de localização.")),
        "image/jpeg",
        0.88,
      );
    });
  } finally {
    imagem.close();
  }
}
