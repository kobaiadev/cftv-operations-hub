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

function SobreCriadorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-9">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-primary">
          Quem está por trás do projeto
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div
            aria-hidden="true"
            className="flex size-24 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-2xl font-bold text-primary"
          >
            DL
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Daniel da Silva Lima</h1>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">
              Segurança corporativa · Gestão de riscos · Data Analysis · Power BI · Engenharia de
              software e dados · Python · Full Stack (JS, SQL/NoSQL)
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseBusiness className="size-4" />
                Nagumo Supermercados
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                Volta Redonda — RJ
              </span>
            </div>
          </div>
        </div>
        <p className="mt-7 max-w-4xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          Profissional com mais de 17 anos de experiência no serviço público do Estado do Rio de
          Janeiro, conforme apresentado em seu perfil público. Atua na convergência entre segurança
          operacional e inteligência de dados, aplicando tecnologia e gestão de processos para
          transformar informações em melhorias práticas para a operação e o varejo.
        </p>
        <p className="mt-4 border-l-2 border-primary pl-4 text-base font-semibold text-foreground sm:text-lg">
          Transformando dados em decisões, tecnologia em resultados.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://github.com/kobaiadev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Github className="size-4" />
            Perfil no GitHub
            <ArrowUpRight className="size-4" />
          </a>
          <a
            href="https://www.linkedin.com/in/daniel-lima-2ab2982b8/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Linkedin className="size-4" />
            Perfil no LinkedIn
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </header>

      <section aria-labelledby="atuacao-titulo">
        <div className="mb-4 flex items-center gap-3">
          <Lightbulb className="size-5 text-primary" />
          <h2 id="atuacao-titulo" className="text-2xl font-bold tracking-tight">
            Áreas de atuação
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {especialidades.map(({ titulo, descricao, icon: Icon }) => (
            <article
              key={titulo}
              className="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <Icon className="mb-4 size-6 text-primary" />
              <h3 className="font-bold">{titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{descricao}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-bold">Tecnologias e ferramentas</h3>
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
              <Badge key={tecnologia} variant="outline">
                {tecnologia}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="formacao-titulo">
        <div className="mb-4 flex items-center gap-3">
          <GraduationCap className="size-5 text-primary" />
          <div>
            <h2 id="formacao-titulo" className="text-2xl font-bold tracking-tight">
              Formação acadêmica
            </h2>
            <p className="text-sm text-muted-foreground">
              Formação listada no perfil público do GitHub.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {formacao.map((item) => (
            <article
              key={item.curso}
              className="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <Badge variant="outline" className="mb-3">
                {item.tipo}
              </Badge>
              <h3 className="font-semibold">{item.curso}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.instituicao}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="certificacoes-titulo"
        className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-7"
      >
        <div className="mb-4 flex items-center gap-3">
          <GraduationCap className="size-5 text-primary" />
          <h2 id="certificacoes-titulo" className="text-2xl font-bold tracking-tight">
            Cursos e certificações
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {certificacoes.map((certificacao) => (
            <li
              key={certificacao}
              className="rounded-lg border border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground"
            >
              {certificacao}
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Formação, cursos e trajetória foram compilados do perfil e README públicos do GitHub. O
        resumo profissional e a frase de apresentação foram fornecidos pelo titular a partir do
        LinkedIn. Revise as informações antes de usar esta página como currículo ou apresentação
        institucional.
      </footer>
    </div>
  );
}
