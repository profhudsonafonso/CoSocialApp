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
4. Start the app with `npm run dev`, `yarn dev`, or `pnpm dev` once Node.js is installed.

## GitHub Webhook

Configure these environment variables for the GitHub contribution flow:

- `GITHUB_TOKEN` — required to merge Pull Requests from the review screen and useful for higher GitHub API limits.
- `GITHUB_WEBHOOK_SECRET` — required for signed GitHub webhook verification in production.

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

## Validação de Negócio MVP

`/validar-negocio` is an initial business validation module for project owners. It generates suggested search queries, initial competitor hypotheses, novelty/risk/differentiation scores, and a critical report.

This MVP does not yet execute real external web search. Future work can add Web Search API, GitHub Search API, Product Hunt, Google Patents, G2/Capterra, and app store search.

## API Endpoints

- `POST /api/ideas` — cadastra uma ideia
- `GET /api/ideas` — lista ideias cadastradas
- `POST /api/collaborators` — cadastra colaborador
- `GET /api/collaborators` — lista colaboradores cadastrados
- `GET /api/dashboard` — consolida métricas reais do dashboard
- `POST /api/github/webhook` — captura commits de push do GitHub

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
