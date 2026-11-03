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

## Autenticação, níveis de acesso e Supabase

A aplicação usa Supabase Auth para autenticação por e-mail e senha. As permissões de escrita e de acesso aos arquivos também são verificadas no backend por RLS; ocultar ações na interface não substitui essas políticas.

### Níveis de acesso

- **00 — Administrador:** acesso completo e gestão de usuários.
- **01 — Edição:** consulta, edição e download.
- **02 — Consulta e download:** visualiza registros e baixa arquivos, sem editar.
- **03 — Consulta:** visualiza registros e anexos na aplicação, sem ações de edição ou download.

O nível 03 pode visualizar o conteúdo exibido na tela; como em qualquer aplicação web, não é possível impedir capturas de tela ou cópias feitas por quem já tem permissão de visualização.

### Implantação do backend

1. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente da aplicação.
2. Com a CLI do Supabase autenticada e vinculada ao projeto, aplique a migration:

   ```sh
   supabase db push
   ```

3. As ações administrativas são executadas pela Edge Function `manage-users`; a chave de serviço nunca é necessária nem deve ser configurada no ambiente do frontend. As funções validam a sessão e a permissão no backend e aceitam chamadas CORS autenticadas sem exigir o segredo `APP_ORIGIN`. O Supabase fornece a chave de serviço ao runtime da Edge Function.
4. Publique as funções administrativas e de leitura de anexos após alterações:

   ```sh
   supabase functions deploy manage-users --project-ref vufvljuxgnoohqcjgopu
   supabase functions deploy view-attachment --project-ref vufvljuxgnoohqcjgopu
   ```

5. Execute o provisionamento inicial em um ambiente seguro com Bun, usando a URL e a chave de serviço do projeto e senhas fortes fornecidas somente por variáveis de ambiente:

   ```powershell
   $env:SUPABASE_URL = "URL_DO_PROJETO"
   $env:SUPABASE_SERVICE_ROLE_KEY = "CHAVE_DE_SERVICO"
   $env:BOOTSTRAP_ADMIN_PASSWORD = "SENHA_FORTE_DO_ADMIN"
   $env:BOOTSTRAP_TEST_PASSWORD = "SENHA_FORTE_DE_TESTE"
   bun run scripts/bootstrap-users.ts
   ```

   O script cria ou atualiza as contas `daniel.lima@nagumo.com.br` (nível 00) e `teste@nagumo.com` (nível 03). Ambas as senhas devem ter ao menos 12 caracteres; `teste123` não é aceita. Não salve valores reais de senha ou a chave de serviço no repositório, em arquivos versionados ou em mensagens.

Na primeira autenticação com nível 00 ou 01, os dados legados disponíveis no navegador são migrados para o estado remoto e os anexos são enviados ao bucket privado. Faça um backup antes da implantação e confirme que os dados foram migrados antes de remover o armazenamento antigo.

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
