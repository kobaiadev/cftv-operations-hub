# CFTV Operations Hub

Guia de Execução Iterativa para o Lovable: Sistema de Controle de OS e CFTV

Para que o Lovable gere código de alta qualidade sem alucinar ou quebrar a aplicação, dividiremos a construção em 6 fases sequenciais. Você enviará um prompt por vez, aguardará a IA gerar a tela, testará a funcionalidade e só então avançará para o próximo.

Fase 1: Estrutura Base e Painel Inicial (Dashboard)

Objetivo: Estabelecer o Design System, a navegação principal e a tela inicial com dados simulados (Mock Data) para aprovação visual.

Copie e cole no Lovable:




Atue como UI/UX Designer Sênior e Engenheiro Frontend. Vamos iniciar a construção de um "Sistema de Controle de OS e Reservas CFTV" para Prevenção de Perdas no varejo, utilizando React, Tailwind CSS e shadcn/ui.




Crie o layout base (App Shell) com as seguintes diretrizes:

1. Tema: Dark Mode Analítico (fundo bg-slate-950, superfícies bg-slate-900).

2. Cores: Azul corporativo para ações primárias e cores semânticas para gravidade (verde, amarelo, vermelho).

3. Navegação: Sidebar lateral retrátil contendo os menus: "Dashboard", "Ordens de Serviço", "Reservas CFTV" e "Configurações".




Crie apenas a primeira tela: "Dashboard (Painel Inicial)".

- Topo: 4 Cartões de KPI (Total de OS, Aguardando Imagens, Em Análise, Concluídas).

- Corpo: Uma tabela simples de "Últimas OS Registradas" (com 5 linhas de dados fictícios de supermercado).

- Não conecte a nenhum banco de dados ainda. Foque 100% na responsividade e na estética corporativa.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6b8b1c88-303d-4479-b17e-68f08493c252).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
