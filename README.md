# colabsocial-spa

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_FY1k9xY6F59g9dFSWSCwqkGuwLpP)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Supabase Setup

1. Copy `.env.local.example` to `.env.local`.
2. Add your Supabase values:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Open the Supabase SQL editor and execute the SQL files in this order:
   - `supabase/init.sql` to create the base tables, views and seed data.
   - `supabase/github_issue_flow.sql` to add the GitHub issue contribution flow database layer.
   - `supabase/allow_multiple_collaborators_per_issue.sql` to allow multiple collaborators per issue and add explicit issue finalization.
   - `supabase/colabscore_configuration.sql` to add project and issue-level ColabScore settings.
   - `supabase/business_validation_mvp.sql` to add the initial business validation MVP tables.
   - `supabase/business_validation_sources_update.sql` to add source metadata for external validation evidence.
   - `supabase/business_validation_connector_status.sql` to store connector execution status for each validation run.
   - `supabase/colabai_assist_lite.sql` to add ColabAI Assist Lite credits, prompts, feature flags and usage logs.
4. Start the app with `npm run dev`, `yarn dev`, or `pnpm dev` once Node.js is installed.

## GitHub Webhook

Configure these environment variables for the GitHub contribution flow:

- `GITHUB_TOKEN` — required to merge Pull Requests from the review screen, useful for higher GitHub API limits, and optional for Business Validation GitHub searches.
- `GITHUB_WEBHOOK_SECRET` — required for signed GitHub webhook verification in production.
- `BRAVE_SEARCH_API_KEY` — optional; enables broader web search in the Business Validation MVP.

For each project repository, create a GitHub webhook pointing to:

```text
https://YOUR_APP_DOMAIN/api/github/webhook
```

Use these settings:

- Content type: `application/json`
- Secret: the same value configured in `GITHUB_WEBHOOK_SECRET`.
- Events: `push`

Commits should include the claim key in the message, for example:

```text
COSOCIAL:CS-ABC12345 fix issue #12
```

The webhook only marks matching assignments and issues as `submitted`. Points are awarded later after owner review.

## Fluxo com múltiplos colaboradores

Uma issue do GitHub pode receber contribuições de vários colaboradores ao mesmo tempo. Cada colaborador mantém sua própria assignment, branch e evidência.

Aceitar uma entrega pontua o colaborador, mas não fecha a issue automaticamente. O responsável deve finalizar a issue na tela de revisão para encerrar novas contribuições.

## Dashboard real

The home page dashboard reads real data from Supabase through `GET /api/dashboard`.
It uses accepted assignments and `public.colab_points` as the source of truth for awarded points. If an accepted assignment does not yet have a `colab_points` row, the dashboard falls back to `issue_assignments.accepted_points`.

## ColabAI Assist Lite

`/colabai` is a minimal AI assistant for the GitHub contribution flow. It helps collaborators and project owners explain issues, generate technical plans, create implementation checklists, generate IDE prompt packs, review submissions, and validate whether a delivery matches the original issue.

The MVP uses internal credits stored in Supabase. If an account does not exist for an email, the backend creates it with 20 monthly credits. Usage is logged in `public.ai_usage_events`; API keys are never exposed to the frontend.

Run `supabase/colabai_assist_lite.sql` before using the feature.

Optional environment variables:

- `AI_PROVIDER=openrouter`
- `OPENROUTER_API_KEY`
- `REQUESTY_API_KEY`
- `AI_DEFAULT_MODEL`
- `AI_PREMIUM_MODEL`

If no AI API key is configured, the backend uses the mock provider and returns a deterministic local demonstration response.

To test locally:

1. Run `npm run dev`.
2. Open `/colabai`.
3. Enter an email.
4. Select a project and issue.
5. Run `Explicar tarefa`.

Security notes:

- Never expose AI provider API keys in frontend code.
- Never send raw webhook payloads to the AI provider.
- The context builder masks values that look like tokens, secrets, passwords, API keys or `.env` content.
- `ai_usage_events` stores only metadata, not raw prompts or raw webhook payloads.

## Validação de Negócio MVP

`/validar-negocio` is an initial business validation module for project owners. It generates suggested search queries, initial competitor hypotheses, novelty/risk/differentiation scores, and a critical report.

This MVP uses public sources such as GitHub Search, Hacker News Algolia, Wikipedia/OpenSearch, OpenAlex, and optionally Brave Search. If external APIs fail, it falls back to local deterministic candidates and clearly marks them as fallback.

Future work can add Product Hunt official GraphQL, Google Patents through an allowed source, app store search, source confidence calibration, and manual reviewer validation.

## Queries, evidências externas e hipóteses locais

Queries are short search terms used to consult external sources. They are not results by themselves.

External evidence can come from GitHub, Hacker News, Wikipedia, OpenAlex, or Brave Search. Local fallback hypotheses are not external evidence and must be used only to guide manual investigation.

Previous validation history is shown only as history, not as competitor evidence. The validation flow must not compare a project with itself or use previous runs from the same idea as market evidence.

## API Endpoints

- `POST /api/ideas` — cadastra uma ideia
- `GET /api/ideas` — lista ideias cadastradas
- `POST /api/collaborators` — cadastra colaborador
- `GET /api/collaborators` — lista colaboradores cadastrados
- `GET /api/dashboard` — consolida métricas reais do dashboard
- `POST /api/github/webhook` — captura commits de push do GitHub
- `GET /api/ai/credits` — mostra créditos e uso recente do ColabAI
- `POST /api/ai/colabai-action` — executa uma ação do ColabAI no backend

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
