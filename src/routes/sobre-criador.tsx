import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Code2,
  Database,
  GraduationCap,
  Github,
  Lightbulb,
  Linkedin,
  MapPin,
  Milestone,
  Sparkles,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/sobre-criador")({
  head: () => ({
    meta: [
      { title: "Sobre o Criador — Segurança Patrimonial Nagumo" },
      {
        name: "description",
        content:
          "Conheça a trajetória, as áreas de atuação, a formação e as tecnologias de Daniel da Silva Lima.",
      },
    ],
  }),
  component: SobreCriadorPage,
});

const especialidades = [
  {
    titulo: "Segurança e riscos",
    descricao:
      "Segurança corporativa, gestão de riscos, análise de incidentes e inteligência operacional.",
    icon: Shield,
  },
  {
    titulo: "Dados e BI",
    descricao: "Power BI, DAX, modelagem de dados, análise, ETL e automação com Python.",
    icon: Database,
  },
  {
    titulo: "Software e processos",
    descricao: "Desenvolvimento Full Stack, JavaScript, SQL/NoSQL, BPM e modelagem BPMN.",
    icon: Code2,
  },
];

const formacao = [
  {
    curso: "Segurança Pública",
    instituicao: "Universidade Federal Fluminense (UFF)",
    tipo: "Graduação",
  },
  {
    curso: "Análise de Sistemas e Engenharia de Software",
    instituicao: "Estácio RJ",
    tipo: "Tecnologia e graduação",
  },
  {
    curso: "Engenharia de Dados e Inteligência Artificial",
    instituicao: "Anhanguera",
    tipo: "Pós-graduação",
  },
  {
    curso: "Business Process Management (BPM)",
    instituicao: "Universidade São Marcos",
    tipo: "MBA",
  },
  { curso: "Direito Administrativo", instituicao: "FCE", tipo: "Pós-graduação lato sensu" },
];

const certificacoes = [
  "Power BI: modelagem, dashboards, DAX e tratamento de dados — Hashtag Treinamentos",
  "Autoconhecimento, inteligência emocional e resiliência — Fundação Getulio Vargas",
  "Computação em nuvem / AWS Discovery Day — Ka Solution",
  "Segurança da informação e identificação de ataques cibernéticos — Estácio",
  "Gestão e liderança — WR Educacional",
  "Gestão de riscos e ISO 31000 — Udemy",
];

const trajetoria = [
  { ano: "2009", titulo: "Início no serviço público", area: "Rio de Janeiro" },
  { ano: "2015", titulo: "Gestão de equipes", area: "Inteligência operacional" },
  { ano: "2021", titulo: "Transição para tecnologia", area: "Engenharia de software" },
  { ano: "2024", titulo: "Dados e automação", area: "Power BI avançado e varejo" },
  { ano: "2025", titulo: "BPM e inteligência artificial", area: "MBA e expansão em IA" },
];

function SobreCriadorPage() {
  return (
    <div className="profile-enter mx-auto max-w-6xl space-y-10">
      <header className="relative isolate overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div
          aria-hidden="true"
          className="profile-grid pointer-events-none absolute inset-0 -z-10"
        />
        <div
          aria-hidden="true"
          className="profile-orb pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="size-4" />
              Perfil profissional
            </p>
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 px-3 py-1">
              <span className="size-1.5 rounded-full bg-success" />
              Segurança · Dados · Tecnologia
            </Badge>
          </div>
          <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                aria-hidden="true"
                className="relative flex size-28 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-primary/25 via-primary/10 to-secondary text-3xl font-bold text-primary shadow-[0_0_48px_-16px_var(--primary)] sm:size-36 sm:text-4xl"
              >
                DL
                <span className="absolute bottom-1 right-1 size-4 rounded-full border-[3px] border-card bg-success sm:bottom-2 sm:right-2" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Segurança e tecnologia aplicadas ao negócio
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
                  Daniel da Silva Lima
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Segurança corporativa · Gestão de riscos · Data Analysis · Power BI · Engenharia
                  de software e dados · Python · Full Stack (JS, SQL/NoSQL)
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness className="size-4 text-primary" />
                    Nagumo Supermercados
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-primary" />
                    Volta Redonda — RJ
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 sm:gap-3 xl:w-64 xl:grid-cols-1">
              {[
                { valor: "17+", rotulo: "anos de experiência" },
                { valor: "3", rotulo: "áreas integradas" },
                { valor: "5", rotulo: "marcos na trajetória" },
              ].map((indicador) => (
                <div
                  key={indicador.rotulo}
                  className="rounded-xl border border-border/80 bg-background/70 p-3 backdrop-blur-sm sm:p-4"
                >
                  <p className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
                    {indicador.valor}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">
                    {indicador.rotulo}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 grid min-w-0 gap-6 border-t border-border/80 pt-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div>
              <p className="max-w-4xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Profissional com mais de 17 anos de experiência no serviço público do Estado do Rio
                de Janeiro, conforme apresentado em seu perfil público. Atua na convergência entre
                segurança operacional e inteligência de dados, aplicando tecnologia e gestão de
                processos para transformar informações em melhorias práticas para a operação e o
                varejo.
              </p>
              <p className="mt-4 border-l-2 border-primary pl-4 text-base font-semibold text-foreground sm:text-lg">
                Transformando dados em decisões, tecnologia em resultados.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/kobaiadev"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/70 px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Github className="size-4" />
                GitHub
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              <a
                href="https://www.linkedin.com/in/daniel-lima-2ab2982b8/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/70 px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Linkedin className="size-4" />
                LinkedIn
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="atuacao-titulo">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Especialidades
            </p>
            <h2 id="atuacao-titulo" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Áreas de atuação
            </h2>
          </div>
          <Lightbulb className="mb-1 size-5 text-primary" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {especialidades.map(({ titulo, descricao, icon: Icon }, indice) => (
            <article
              key={titulo}
              className="profile-card group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
            >
              <span className="absolute right-4 top-3 font-mono text-xs text-muted-foreground/50">
                0{indice + 1}
              </span>
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Icon className="size-5" />
              </div>
              <h3 className="font-bold">{titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{descricao}</p>
            </article>
          ))}
        </div>
        <div className="profile-card mt-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold">Tecnologias e ferramentas</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Recursos que conectam análise, engenharia e operação.
              </p>
            </div>
            <Code2 className="size-5 text-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Python",
              "Pandas",
              "NumPy",
              "Power BI",
              "DAX",
              "JavaScript",
              "Node.js",
              "SQL",
              "NoSQL",
              "PostgreSQL",
              "MongoDB",
              "PowerShell",
              "Git",
              "Docker",
              "BPMN",
              "Bizagi",
            ].map((tecnologia) => (
              <Badge
                key={tecnologia}
                variant="outline"
                className="px-3 py-1.5 transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                {tecnologia}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="trajetoria-titulo">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Experiência</p>
          <h2 id="trajetoria-titulo" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Uma trajetória em evolução
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Segurança operacional, tecnologia e inteligência de dados em uma carreira integrada.
          </p>
        </div>
        <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <div
            aria-hidden="true"
            className="absolute left-5 top-6 hidden h-px w-[calc(100%-2.5rem)] bg-gradient-to-r from-primary/50 via-primary/20 to-transparent 2xl:block"
          />
          {trajetoria.map((etapa, indice) => (
            <article
              key={etapa.ano}
              className="profile-card relative rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background text-primary">
                  <Milestone className="size-4" />
                </span>
                <span className="font-mono text-sm font-bold text-primary">{etapa.ano}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
                  0{indice + 1}
                </span>
              </div>
              <h3 className="font-semibold leading-snug">{etapa.titulo}</h3>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{etapa.area}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="formacao-titulo">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Aprendizado contínuo
            </p>
            <h2 id="formacao-titulo" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Formação acadêmica
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Formação listada no perfil público do GitHub.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {formacao.map((item) => (
            <article
              key={item.curso}
              className="profile-card relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <Badge variant="outline" className="border-primary/25 bg-primary/5">
                  {item.tipo}
                </Badge>
                <GraduationCap className="size-4 text-primary/70" />
              </div>
              <h3 className="font-semibold leading-snug">{item.curso}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.instituicao}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="certificacoes-titulo"
        className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Atualização profissional
            </p>
            <h2
              id="certificacoes-titulo"
              className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Cursos e certificações
            </h2>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {certificacoes.map((certificacao) => (
            <li
              key={certificacao}
              className="profile-card flex gap-3 rounded-xl border border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {certificacao}
            </li>
          ))}
        </ul>
      </section>

      <footer className="rounded-2xl border border-border bg-card/60 px-5 py-4 text-xs leading-5 text-muted-foreground">
        Formação, cursos e trajetória foram compilados do perfil e README públicos do GitHub. O
        resumo profissional e a frase de apresentação foram fornecidos pelo titular a partir do
        LinkedIn. Revise as informações antes de usar esta página como currículo ou apresentação
        institucional.
      </footer>
    </div>
  );
}
