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
3. Open the Supabase SQL editor and execute `supabase/init.sql` to create the tables, views and seed data.
4. Start the app with `npm run dev`, `yarn dev`, or `pnpm dev` once Node.js is installed.

## API Endpoints

- `POST /api/ideas` — cadastra uma ideia
- `GET /api/ideas` — lista ideias cadastradas
- `POST /api/collaborators` — cadastra colaborador
- `GET /api/collaborators` — lista colaboradores cadastrados

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
