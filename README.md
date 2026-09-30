# DocuPro AI

Multi-tenant SaaS for branded business documents (proposals, quotations, SEO audits).
Create your company profile and brand kit once; every document inherits it.

Status: **Phase 1** (setup, auth, database, workspaces, company profile, brand kit). See the roadmap below.

## Stack
Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage, RLS), Zod, React Hook Form.

## Run locally
1. Create a Supabase project (or run `supabase start`).
2. Apply `supabase/migrations/0001_core_schema.sql` (SQL editor, or `supabase db push`).
3. `cp .env.example .env.local` and fill in the Supabase URL, anon key and service-role key.
4. In Supabase Auth settings, add `http://localhost:3000/auth/callback` to the allowed redirect URLs.
   For quick local testing you can turn off "Confirm email".
5. `npm install && npm run dev`

## Checks
```
npm run typecheck
npm run lint
npm test          # unit tests
npm run test:db   # applies migrations to a scratch Postgres and runs the RLS isolation tests
```
`test:db` needs a local Postgres you can create databases in. It uses a stub of Supabase's `auth` and
`storage` schemas (`supabase/tests/00_supabase_stub.sql`), so it never touches a real project.

## Architecture notes
- **Tenancy:** every tenant table has `workspace_id` and RLS keyed on `workspace_members`. Server code
  never trusts a client-supplied workspace id: the active workspace comes from `lib/auth/session.ts`,
  which checks the cookie against the user's real memberships on every request.
- **Roles:** owner, admin, member. RLS is the enforcement layer; `lib/permissions/roles.ts` mirrors it for the UI.
- **Branding engine:** `lib/documents/branding.ts` builds a `BrandContext` from company profile + brand kit.
  `documents.brand_snapshot` is reserved for freezing that context when a document is sent.
- **Public documents** (Phase 5) are read through the service-role client by `public_token` only. There is
  deliberately no anonymous RLS policy on `documents`.

## Roadmap
1. Setup, auth, database, workspace, company profile, brand kit (done)
2. Clients, projects, dashboard
3. Proposal builder, quotation builder, document editor
4. Templates, branding engine renderer, PDF
5. Public documents, tracking, acceptance
6. SEO audit
7. AI integrations (`lib/ai/`)
8. Polish, security review, performance
