export type TemaQuiz = {
  id: string;
  titulo: string;
  descricao: string;
  icon: "shield" | "scale" | "lock" | "landmark" | "badge" | "clipboard";
};

export type PerguntaQuiz = {
  id: string;
  tema: string;
  nivel: "Básico" | "Intermediário" | "Avançado";
  enunciado: string;
  opcoes: [string, string, string, string, string];
  correta: number;
  explicacao: string;
  artigo: string;
  fonte: string;
  url: string;
};

export type DificuldadeQuiz = "facil" | "normal" | "dificil";
export type MedalhaQuiz = "bronze" | "prata" | "ouro" | null;

export function obterProgressoQuiz(respostas: number) {
  const totalRespostas = Math.max(0, Math.floor(respostas));
  const nivel = Math.min(1000, Math.floor(totalRespostas / 10));
  const medalha: MedalhaQuiz =
    totalRespostas >= 1000
      ? "ouro"
      : totalRespostas >= 500
        ? "prata"
        : totalRespostas >= 100
          ? "bronze"
          : null;
  const proximaMetaMedalha =
    totalRespostas < 100 ? 100 : totalRespostas < 500 ? 500 : totalRespostas < 1000 ? 1000 : null;

  return {
    totalRespostas,
    nivel,
    medalha,
    respostasParaProximoNivel: nivel < 1000 ? 10 - (totalRespostas % 10) : 0,
    proximaMetaMedalha,
    respostasParaProximaMedalha: proximaMetaMedalha ? proximaMetaMedalha - totalRespostas : 0,
  };
}

export const dificuldadesQuiz: {
  id: DificuldadeQuiz;
  titulo: string;
  descricao: string;
}[] = [
  {
    id: "facil",
    titulo: "Fácil",
    descricao: "Perguntas básicas para revisar os conceitos essenciais.",
  },
  {
    id: "normal",
    titulo: "Normal",
    descricao: "Perguntas básicas e intermediárias para praticar.",
  },
  {
    id: "dificil",
    titulo: "Difícil",
    descricao: "Perguntas intermediárias e avançadas para desafiar seus conhecimentos.",
  },
];

export const temasQuiz: TemaQuiz[] = [
  {
    id: "fundamentos",
    titulo: "Fundamentos da segurança patrimonial",
    descricao: "Prevenção, observação, registro e atuação profissional.",
    icon: "shield",
  },
  {
    id: "penal",
    titulo: "Direito Penal",
    descricao: "Furto, roubo, legítima defesa e conceitos essenciais.",
    icon: "scale",
  },
  {
    id: "processual-penal",
    titulo: "Direito Processual Penal",
    descricao: "Flagrante, condução responsável e limites de atuação.",
    icon: "clipboard",
  },
  {
    id: "lgpd",
    titulo: "LGPD e proteção de dados",
    descricao: "Imagens, dados pessoais, necessidade e segurança.",
    icon: "lock",
  },
  {
    id: "constitucional",
    titulo: "Direito Constitucional",
    descricao: "Direitos fundamentais, privacidade e segurança pública.",
    icon: "landmark",
  },
  {
    id: "seguranca-privada",
    titulo: "Estatuto da Segurança Privada",
    descricao: "Lei nº 14.967/2024 e atuação profissional.",
    icon: "badge",
  },
];

export const perguntasQuiz: PerguntaQuiz[] = [
  {
    id: "fund-01",
    tema: "fundamentos",
    nivel: "Básico",
    enunciado:
      "Ao observar uma situação potencialmente irregular, qual é a conduta inicial mais profissional?",
    opcoes: [
      "Observar os fatos com atenção e comunicar conforme o procedimento da empresa.",
      "Acusar publicamente a pessoa para que ela confesse.",
      "Divulgar a imagem da pessoa em grupos de mensagens.",
      "Revistar todos que estejam próximos.",
      "Aplicar uma penalidade por conta própria.",
    ],
    correta: 0,
    explicacao:
      "A atuação profissional começa pela observação objetiva, registro adequado e comunicação pelos canais previstos. Suspeita não é prova de infração.",
    artigo:
      "Constituição Federal, art. 5º, incisos X e LVII; Lei nº 13.709/2018, princípios do art. 6º.",
    fonte: "Constituição Federal e LGPD",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "fund-02",
    tema: "fundamentos",
    nivel: "Básico",
    enunciado: "Qual informação tende a tornar um relato de ocorrência mais útil e verificável?",
    opcoes: [
      "Horário, local e descrição objetiva do que foi observado.",
      "Opiniões sobre a personalidade da pessoa.",
      "Conclusões sobre culpa antes de apuração.",
      "Rumores ou informações de terceiros sem identificação.",
      "Adjetivos e suposições sobre a intenção.",
    ],
    correta: 0,
    explicacao:
      "Um registro objetivo deve separar fatos observados de interpretações e seguir o padrão e os canais internos da organização.",
    artigo: "Referência operacional: registro objetivo e respeito aos direitos fundamentais.",
    fonte: "Constituição Federal, art. 5º",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "fund-03",
    tema: "fundamentos",
    nivel: "Intermediário",
    enunciado:
      "Uma gravação de CFTV mostra uma pessoa cuja conduta ainda não foi esclarecida. O que fazer com o arquivo?",
    opcoes: [
      "Preservá-lo e encaminhá-lo somente a pessoas autorizadas, conforme procedimento.",
      "Publicá-lo na internet para pedir ajuda na identificação.",
      "Enviar uma cópia para todos os funcionários.",
      "Editar o vídeo para destacar a pessoa.",
      "Guardar uma cópia particular no celular.",
    ],
    correta: 0,
    explicacao:
      "Imagens identificáveis podem ser dados pessoais. O acesso e o compartilhamento precisam respeitar finalidade, necessidade, segurança e regras da organização.",
    artigo: "LGPD, arts. 5º, I, e 6º; Constituição Federal, art. 5º, X.",
    fonte: "Lei Geral de Proteção de Dados",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  {
    id: "fund-04",
    tema: "fundamentos",
    nivel: "Intermediário",
    enunciado:
      "Ao notar uma possível situação de emergência que excede sua atribuição, qual é a melhor resposta?",
    opcoes: [
      "Acionar o protocolo de emergência e os responsáveis competentes, sem improvisar poderes.",
      "Assumir a investigação criminal.",
      "Impedir qualquer pessoa de sair, sem avaliar o contexto.",
      "Aguardar em silêncio, mesmo havendo risco imediato.",
      "Divulgar o caso nas redes sociais.",
    ],
    correta: 0,
    explicacao:
      "Siga o plano de emergência da empresa e acione os serviços ou autoridades competentes quando necessário. A segurança privada não substitui a segurança pública.",
    artigo: "Constituição Federal, art. 144; Lei nº 14.967/2024.",
    fonte: "Constituição Federal e Estatuto da Segurança Privada",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "fund-05",
    tema: "fundamentos",
    nivel: "Avançado",
    enunciado: "Por que não se deve tratar uma característica pessoal como prova de suspeita?",
    opcoes: [
      "Porque decisões devem se basear em fatos observáveis, sem discriminação ou prejulgamento.",
      "Porque somente a gerência pode observar clientes.",
      "Porque qualquer observação é proibida.",
      "Porque a aparência define a intenção.",
      "Porque todo relato deve omitir o que aconteceu.",
    ],
    correta: 0,
    explicacao:
      "A abordagem profissional deve ser pautada em conduta concreta, igualdade e respeito à dignidade. Aparência, origem ou outros atributos não demonstram por si só uma infração.",
    artigo: "Constituição Federal, arts. 1º, III, e 5º, caput e XLI.",
    fonte: "Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "pen-01",
    tema: "penal",
    nivel: "Básico",
    enunciado: "De forma geral, o crime de furto descrito no Código Penal consiste em:",
    opcoes: [
      "Subtrair, para si ou para outra pessoa, coisa alheia móvel.",
      "Receber qualquer produto em uma loja.",
      "Entrar em um estabelecimento aberto ao público.",
      "Deixar de apresentar documento de identidade.",
      "Recusar-se a responder a uma pergunta.",
    ],
    correta: 0,
    explicacao:
      "O art. 155 define furto como subtrair coisa alheia móvel para si ou para outrem. A classificação concreta cabe às autoridades competentes.",
    artigo: "Código Penal, art. 155.",
    fonte: "Código Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
  },
  {
    id: "pen-02",
    tema: "penal",
    nivel: "Básico",
    enunciado: "Qual elemento diferencia, em linhas gerais, roubo de furto no Código Penal?",
    opcoes: [
      "Violência ou grave ameaça à pessoa, ou outro meio previsto no art. 157.",
      "O valor do produto ser sempre superior a um salário mínimo.",
      "O fato ocorrer dentro de um supermercado.",
      "A existência de câmeras no local.",
      "A pessoa sair do estabelecimento a pé.",
    ],
    correta: 0,
    explicacao:
      "O art. 157 descreve a subtração mediante violência, grave ameaça ou redução da possibilidade de resistência, conforme a redação legal.",
    artigo: "Código Penal, art. 157.",
    fonte: "Código Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
  },
  {
    id: "pen-03",
    tema: "penal",
    nivel: "Intermediário",
    enunciado:
      "Uma pessoa recebe legitimamente um bem sob sua posse e depois se apropria dele. Qual figura penal pode ser pertinente, em tese?",
    opcoes: [
      "Apropriação indébita, prevista no art. 168.",
      "Furto qualificado por escalada, automaticamente.",
      "Roubo, mesmo sem violência ou ameaça.",
      "Dano, necessariamente.",
      "Nenhuma figura penal pode se aplicar a bens móveis.",
    ],
    correta: 0,
    explicacao:
      "O art. 168 trata de apropriar-se de coisa alheia móvel de que se tem a posse ou detenção. O enquadramento depende dos fatos e não deve ser decidido pelo vigilante.",
    artigo: "Código Penal, art. 168.",
    fonte: "Código Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
  },
  {
    id: "pen-04",
    tema: "penal",
    nivel: "Intermediário",
    enunciado: "Segundo o Código Penal, qual situação é prevista como exclusão de ilicitude?",
    opcoes: [
      "Legítima defesa, estado de necessidade, estrito cumprimento do dever legal ou exercício regular de direito.",
      "A simples suspeita de que alguém cometerá um crime.",
      "A autorização informal de qualquer colega.",
      "A vontade de recuperar um bem a qualquer custo.",
      "A ordem de uma pessoa sem competência legal.",
    ],
    correta: 0,
    explicacao:
      "O art. 23 enumera essas hipóteses. A aplicação depende do caso concreto; não é autorização genérica para uso da força ou restrição de direitos.",
    artigo: "Código Penal, arts. 23 e 25.",
    fonte: "Código Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
  },
  {
    id: "pen-05",
    tema: "penal",
    nivel: "Avançado",
    enunciado: "De acordo com o art. 25 do Código Penal, legítima defesa envolve:",
    opcoes: [
      "Repelir injusta agressão, atual ou iminente, usando moderadamente os meios necessários.",
      "Punir alguém por um fato passado para evitar reincidência.",
      "Usar qualquer força sempre que houver suspeita de furto.",
      "Defender exclusivamente patrimônio, sem considerar a situação.",
      "Agir contra uma ameaça hipotética futura.",
    ],
    correta: 0,
    explicacao:
      "A definição legal exige agressão injusta atual ou iminente e uso moderado dos meios necessários. Avalie riscos e siga os protocolos; em caso de dúvida, acione apoio.",
    artigo: "Código Penal, art. 25.",
    fonte: "Código Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
  },
  {
    id: "cpp-01",
    tema: "processual-penal",
    nivel: "Básico",
    enunciado: "Segundo o CPP, quem pode prender alguém que esteja em flagrante delito?",
    opcoes: [
      "Qualquer pessoa do povo pode; autoridades policiais e seus agentes devem fazê-lo.",
      "Somente o gerente do estabelecimento.",
      "Somente o proprietário do bem.",
      "Qualquer pessoa, em qualquer situação, sem limite.",
      "Apenas testemunhas presenciais com autorização judicial.",
    ],
    correta: 0,
    explicacao:
      "O art. 301 diferencia a faculdade de qualquer pessoa do povo do dever atribuído às autoridades policiais e seus agentes. Isso não amplia a atuação privada para além da lei.",
    artigo: "Código de Processo Penal, art. 301.",
    fonte: "Código de Processo Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm",
  },
  {
    id: "cpp-02",
    tema: "processual-penal",
    nivel: "Básico",
    enunciado: "Qual alternativa corresponde a uma hipótese de flagrante prevista no CPP?",
    opcoes: [
      "A pessoa está cometendo a infração ou acaba de cometê-la.",
      "A pessoa foi apontada por comentário anônimo, sem outros fatos.",
      "A pessoa tem histórico de ocorrências antigas.",
      "A pessoa se recusa a conversar com o fiscal.",
      "A pessoa parece nervosa em uma loja.",
    ],
    correta: 0,
    explicacao:
      "O art. 302 prevê hipóteses de flagrante, incluindo estar cometendo a infração e acabar de cometê-la. A análise concreta compete às autoridades.",
    artigo: "Código de Processo Penal, art. 302, incisos I e II.",
    fonte: "Código de Processo Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm",
  },
  {
    id: "cpp-03",
    tema: "processual-penal",
    nivel: "Intermediário",
    enunciado:
      "Após uma contenção em situação de flagrante, qual deve ser a prioridade do profissional de segurança?",
    opcoes: [
      "Acionar imediatamente as autoridades e seguir o protocolo, preservando a integridade das pessoas.",
      "Interrogar a pessoa até obter uma confissão.",
      "Publicar a ocorrência antes de comunicar a empresa.",
      "Aplicar uma pena no local.",
      "Impedir contato com qualquer autoridade.",
    ],
    correta: 0,
    explicacao:
      "A segurança privada não conduz investigação nem aplica pena. Em situação de flagrante, acione a autoridade competente sem demora e observe os procedimentos de segurança e direitos.",
    artigo: "Código de Processo Penal, arts. 301 e 304; Constituição Federal, art. 5º, III.",
    fonte: "CPP e Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm",
  },
  {
    id: "cpp-04",
    tema: "processual-penal",
    nivel: "Intermediário",
    enunciado:
      "A pessoa abordada deve ser tratada como culpada antes de uma decisão judicial definitiva?",
    opcoes: [
      "Não. A Constituição assegura que ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória.",
      "Sim, se alguém no local disser que a reconheceu.",
      "Sim, se o produto estiver perto da pessoa.",
      "Sim, para facilitar o registro interno.",
      "Depende da opinião do segurança.",
    ],
    correta: 0,
    explicacao:
      "A presunção de não culpabilidade é garantia constitucional. Evite exposição e prejulgamento e registre fatos de forma objetiva.",
    artigo: "Constituição Federal, art. 5º, inciso LVII.",
    fonte: "Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "cpp-05",
    tema: "processual-penal",
    nivel: "Avançado",
    enunciado:
      "Qual opção descreve corretamente o papel do profissional privado diante de uma possível infração?",
    opcoes: [
      "Adotar medidas compatíveis com a lei e o protocolo, preservar informações e comunicar a autoridade competente.",
      "Substituir a polícia judiciária e instaurar inquérito.",
      "Obrigar a pessoa a produzir prova contra si.",
      "Definir a pena e executar a sentença.",
      "Realizar buscas pessoais indiscriminadas para encontrar provas.",
    ],
    correta: 0,
    explicacao:
      "A investigação e o processo penal são atribuições das autoridades competentes. A atuação privada deve permanecer dentro dos limites legais e contratuais.",
    artigo: "CPP, arts. 4º e 301; Constituição Federal, art. 144.",
    fonte: "Código de Processo Penal",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm",
  },
  {
    id: "lgpd-01",
    tema: "lgpd",
    nivel: "Básico",
    enunciado: "Uma imagem de CFTV que permite identificar uma pessoa pode ser considerada:",
    opcoes: [
      "Dado pessoal, quando relacionada a pessoa natural identificada ou identificável.",
      "Dado anônimo em todos os casos.",
      "Informação sem qualquer regra de proteção.",
      "Dado sensível automaticamente, em qualquer contexto.",
      "Propriedade pessoal do operador da câmera.",
    ],
    correta: 0,
    explicacao:
      "A LGPD define dado pessoal como informação relacionada a pessoa natural identificada ou identificável. O contexto e a possibilidade de identificação importam.",
    artigo: "LGPD, art. 5º, inciso I.",
    fonte: "Lei Geral de Proteção de Dados",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  {
    id: "lgpd-02",
    tema: "lgpd",
    nivel: "Básico",
    enunciado:
      "Qual é a conduta mais adequada ao receber pedido informal de cópia de imagens de CFTV?",
    opcoes: [
      "Não compartilhar por iniciativa própria; encaminhar o pedido ao responsável autorizado.",
      "Enviar imediatamente por aplicativo de mensagens.",
      "Entregar a qualquer pessoa que diga ser familiar.",
      "Publicar um link temporário aberto.",
      "Copiar o vídeo para dispositivo pessoal.",
    ],
    correta: 0,
    explicacao:
      "Imagens podem conter dados pessoais de várias pessoas. O atendimento deve seguir a política interna, a finalidade e os procedimentos para solicitações de titulares ou autoridades.",
    artigo: "LGPD, arts. 6º e 46.",
    fonte: "Lei Geral de Proteção de Dados",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  {
    id: "lgpd-03",
    tema: "lgpd",
    nivel: "Intermediário",
    enunciado: "O princípio da necessidade na LGPD orienta que o tratamento de dados seja:",
    opcoes: [
      "Limitado ao mínimo necessário para a finalidade, com dados pertinentes e não excessivos.",
      "Feito sem finalidade definida, desde que os dados sejam úteis.",
      "Mantido para sempre, por precaução.",
      "Compartilhado amplamente dentro da empresa.",
      "Ampliado para qualquer uso futuro possível.",
    ],
    correta: 0,
    explicacao:
      "O princípio da necessidade limita o tratamento ao mínimo necessário para alcançar a finalidade, abrangendo dados pertinentes, proporcionais e não excessivos.",
    artigo: "LGPD, art. 6º, inciso III.",
    fonte: "Lei Geral de Proteção de Dados",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  {
    id: "lgpd-04",
    tema: "lgpd",
    nivel: "Intermediário",
    enunciado:
      "Na LGPD, quem toma as decisões referentes ao tratamento de dados pessoais é, em regra:",
    opcoes: [
      "O controlador.",
      "O titular dos dados, em todos os casos.",
      "O operador, sempre e exclusivamente.",
      "A pessoa que acessou o sistema por último.",
      "Qualquer funcionário que possua uma cópia.",
    ],
    correta: 0,
    explicacao:
      "A lei define controlador como quem compete decidir sobre o tratamento; operador realiza o tratamento em nome do controlador.",
    artigo: "LGPD, art. 5º, incisos VI e VII.",
    fonte: "Lei Geral de Proteção de Dados",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  {
    id: "lgpd-05",
    tema: "lgpd",
    nivel: "Avançado",
    enunciado: "Ao perceber possível acesso indevido a gravações, o vigilante deve:",
    opcoes: [
      "Comunicar imediatamente pelo canal interno previsto e preservar as informações, sem divulgar o incidente.",
      "Apagar os registros para evitar problemas.",
      "Avisar publicamente os envolvidos pelas redes sociais.",
      "Investigar sozinho e acessar outras contas.",
      "Ignorar se as imagens não foram publicadas.",
    ],
    correta: 0,
    explicacao:
      "A organização deve ter medidas de segurança e procedimento de resposta a incidentes. O profissional deve comunicar o responsável e não ampliar o acesso ou a divulgação.",
    artigo: "LGPD, arts. 46 e 48.",
    fonte: "Lei Geral de Proteção de Dados",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  {
    id: "cf-01",
    tema: "constitucional",
    nivel: "Básico",
    enunciado:
      "A Constituição protege a intimidade, a vida privada, a honra e a imagem das pessoas?",
    opcoes: [
      "Sim, e prevê direito à indenização por dano material ou moral decorrente de violação.",
      "Não, esses direitos só se aplicam dentro da residência.",
      "Sim, mas somente para agentes públicos.",
      "Não, se houver câmera no estabelecimento.",
      "Sim, exceto em espaços comerciais, sem qualquer limite.",
    ],
    correta: 0,
    explicacao:
      "O art. 5º, X, declara invioláveis esses direitos e prevê indenização por dano material ou moral decorrente de sua violação.",
    artigo: "Constituição Federal, art. 5º, inciso X.",
    fonte: "Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "cf-02",
    tema: "constitucional",
    nivel: "Básico",
    enunciado:
      "A Constituição reconhece expressamente a proteção de dados pessoais como direito fundamental?",
    opcoes: [
      "Sim. O art. 5º, LXXIX, assegura o direito à proteção dos dados pessoais, inclusive nos meios digitais.",
      "Não, apenas uma política interna pode tratar do tema.",
      "Sim, mas apenas para dados bancários.",
      "Não, esse direito só existe para menores de idade.",
      "Sim, somente para informações mantidas pelo Poder Judiciário.",
    ],
    correta: 0,
    explicacao:
      "A Emenda Constitucional nº 115/2022 incluiu a proteção de dados pessoais, inclusive nos meios digitais, no rol de direitos e garantias fundamentais.",
    artigo: "Constituição Federal, art. 5º, inciso LXXIX.",
    fonte: "Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "cf-03",
    tema: "constitucional",
    nivel: "Intermediário",
    enunciado: "A presunção de não culpabilidade significa que:",
    opcoes: [
      "Ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória.",
      "Uma pessoa suspeita não pode ser identificada por autoridade.",
      "Toda abordagem é proibida.",
      "A empresa deve ignorar fatos observados.",
      "A pessoa deve provar que é inocente ao segurança.",
    ],
    correta: 0,
    explicacao:
      "É a garantia do art. 5º, LVII. Ela reforça a importância de não prejulgar, expor ou tratar suspeita como condenação.",
    artigo: "Constituição Federal, art. 5º, inciso LVII.",
    fonte: "Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "cf-04",
    tema: "constitucional",
    nivel: "Intermediário",
    enunciado: "Segundo o art. 144 da Constituição, segurança pública é:",
    opcoes: [
      "Dever do Estado, direito e responsabilidade de todos, exercida para preservar a ordem pública e a incolumidade das pessoas e do patrimônio.",
      "Responsabilidade exclusiva dos estabelecimentos comerciais.",
      "Atribuição de empresas privadas sem participação estatal.",
      "Atividade exercida somente pelas Forças Armadas.",
      "Uma tarefa opcional sem relação com direitos.",
    ],
    correta: 0,
    explicacao:
      "O art. 144 define a segurança pública como dever do Estado, direito e responsabilidade de todos e lista os órgãos que a exercem.",
    artigo: "Constituição Federal, art. 144.",
    fonte: "Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "cf-05",
    tema: "constitucional",
    nivel: "Avançado",
    enunciado: "A proteção constitucional à casa pode ser resumida corretamente como:",
    opcoes: [
      "A casa é asilo inviolável, com exceções expressas no texto constitucional.",
      "Qualquer segurança pode entrar se houver uma suspeita.",
      "A proteção só vale durante a noite.",
      "O proprietário pode dispensar todas as garantias legais.",
      "A regra se aplica somente a imóveis próprios.",
    ],
    correta: 0,
    explicacao:
      "O art. 5º, XI, protege a casa e prevê exceções específicas, como flagrante delito, desastre, prestação de socorro ou, durante o dia, determinação judicial.",
    artigo: "Constituição Federal, art. 5º, inciso XI.",
    fonte: "Constituição Federal",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
  },
  {
    id: "priv-01",
    tema: "seguranca-privada",
    nivel: "Básico",
    enunciado:
      "Qual lei instituiu o Estatuto da Segurança Privada e da Segurança das Instituições Financeiras?",
    opcoes: [
      "Lei nº 14.967, de 9 de setembro de 2024.",
      "Lei nº 13.709, de 14 de agosto de 2018.",
      "Lei nº 8.078, de 11 de setembro de 1990.",
      "Lei nº 10.406, de 10 de janeiro de 2002.",
      "Lei nº 9.099, de 26 de setembro de 1995.",
    ],
    correta: 0,
    explicacao:
      "A Lei nº 14.967/2024 institui o Estatuto da Segurança Privada e da Segurança das Instituições Financeiras. Consulte sempre o texto atualizado e as normas aplicáveis.",
    artigo: "Lei nº 14.967/2024.",
    fonte: "Estatuto da Segurança Privada",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14967.htm",
  },
  {
    id: "priv-02",
    tema: "seguranca-privada",
    nivel: "Básico",
    enunciado: "A segurança privada substitui as atribuições dos órgãos de segurança pública?",
    opcoes: [
      "Não. São atividades distintas; a segurança privada atua nos limites legais e não substitui o poder público.",
      "Sim, dentro do estabelecimento e em qualquer situação.",
      "Sim, quando o cliente assina um contrato.",
      "Não, mas pode aplicar penas administrativas criminais.",
      "Sim, desde que haja câmeras.",
    ],
    correta: 0,
    explicacao:
      "A segurança privada não transforma seus profissionais em agentes policiais. Sua atuação deve observar a lei e os limites das atividades autorizadas.",
    artigo: "Lei nº 14.967/2024; Constituição Federal, art. 144.",
    fonte: "Estatuto da Segurança Privada",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14967.htm",
  },
  {
    id: "priv-03",
    tema: "seguranca-privada",
    nivel: "Intermediário",
    enunciado: "Antes de executar uma atividade de segurança privada, o profissional deve:",
    opcoes: [
      "Atuar conforme sua função, capacitação, legislação e procedimentos autorizados.",
      "Criar poderes próprios conforme a situação.",
      "Cumprir qualquer ordem, mesmo manifestamente ilegal.",
      "Realizar investigação criminal sem comunicar ninguém.",
      "Compartilhar dados de clientes para facilitar a vigilância.",
    ],
    correta: 0,
    explicacao:
      "A atividade deve ser exercida nos termos da legislação, da habilitação profissional e dos procedimentos da organização, respeitando os direitos das pessoas.",
    artigo: "Lei nº 14.967/2024.",
    fonte: "Estatuto da Segurança Privada",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14967.htm",
  },
  {
    id: "priv-04",
    tema: "seguranca-privada",
    nivel: "Intermediário",
    enunciado:
      "Uma solicitação de cliente exige atuação fora da lei ou da função profissional. Qual resposta é adequada?",
    opcoes: [
      "Não executar a medida irregular e comunicar o responsável conforme os canais internos.",
      "Executar imediatamente porque o cliente é o contratante.",
      "Delegar a medida a um colega sem registro.",
      "Omitir a solicitação e improvisar.",
      "Publicar a solicitação para obter votação dos colegas.",
    ],
    correta: 0,
    explicacao:
      "Ordens privadas não afastam a legislação nem autorizam excesso. Use os canais de supervisão e registre objetivamente os fatos relevantes.",
    artigo: "Lei nº 14.967/2024; Constituição Federal, art. 5º.",
    fonte: "Estatuto da Segurança Privada",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14967.htm",
  },
  {
    id: "priv-05",
    tema: "seguranca-privada",
    nivel: "Avançado",
    enunciado: "Por que é importante consultar o texto vigente do Estatuto da Segurança Privada?",
    opcoes: [
      "Porque leis e regulamentações podem ser alteradas ou complementadas, e a prática deve seguir as regras atuais.",
      "Porque a versão impressa mais antiga sempre prevalece.",
      "Porque o treinamento dispensa a consulta à legislação.",
      "Porque cada estabelecimento pode reescrever a lei.",
      "Porque somente notícias em redes sociais atualizam a lei.",
    ],
    correta: 0,
    explicacao:
      "Use o texto oficial atualizado e as orientações institucionais. Este quiz é educativo e não substitui atualização profissional ou aconselhamento jurídico.",
    artigo: "Lei nº 14.967/2024 e legislação correlata.",
    fonte: "Estatuto da Segurança Privada",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14967.htm",
  },
];

export function embaralhar<T>(itens: readonly T[], aleatorio = Math.random): T[] {
  const resultado = [...itens];
  for (let indice = resultado.length - 1; indice > 0; indice--) {
    const destino = Math.floor(aleatorio() * (indice + 1));
    const atual = resultado[indice];
    const outro = resultado[destino];
    if (atual === undefined || outro === undefined) continue;
    resultado[indice] = outro;
    resultado[destino] = atual;
  }
  return resultado;
}

export function obterPerguntasDoTema(tema: string, dificuldade?: DificuldadeQuiz) {
  const niveisPorDificuldade: Record<DificuldadeQuiz, PerguntaQuiz["nivel"][]> = {
    facil: ["Básico"],
    normal: ["Básico", "Intermediário"],
    dificil: ["Intermediário", "Avançado"],
  };
  return perguntasQuiz.filter(
    (pergunta) =>
      pergunta.tema === tema &&
      (!dificuldade || niveisPorDificuldade[dificuldade].includes(pergunta.nivel)),
  );
}
