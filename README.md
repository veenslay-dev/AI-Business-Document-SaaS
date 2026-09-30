# DocuPro AI

A multi-tenant SaaS for branded business documents: proposals, quotations and SEO audit reports. A company sets up its profile and brand kit once, and every document picks it up automatically.

Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage, Row Level Security), Zod, React Hook Form. The product name lives in `components/ui/logo.tsx`.

## What's in it

| Area | What it does |
| --- | --- |
| Auth and onboarding | Email and password, password reset, four step onboarding with live brand preview |
| Workspaces | Owner, admin and member roles, team invites, workspace switcher, RLS on every table |
| Company and brand | Company profile, services, terms, signatory, logo and signature upload, colors (including separate header and heading colors with automatic contrast), fonts, footer |
| Clients and projects | CRUD, search, filters, archive, client detail with documents, projects and activity |
| Document engine | One structured JSON format rendered by one renderer for the editor preview, the public page and the PDF |
| Editor | Sections and blocks (heading, paragraph, list, table, image, pricing, timeline, signature, page break), reorder, autosave, live preview, mobile tabs |
| Proposals | Six step builder, AI draft validated with Zod, editable draft, pricing packages |
| Quotations | A priced scope of work: overview, scope, deliverables, timeline, assumptions, line items with discounts and configurable tax (INR, USD, GBP, EUR, exact integer maths), payment schedule, acceptance |
| SEO audits | Real scan (SSRF safe), scored findings, optional AI rewrite in plain language, branded report |
| Social media audits | Manual checklist audit: section-wise library per platform, status and notes per checkpoint, auto-calculated scorecard, custom checklists and findings |
| Templates | Built-in layouts, saved workspace templates, default template per type |
| Sharing | Private link, expiry, revoke and regenerate, view tracking, PDF download, accept, reject, request changes |
| AI | Provider independent layer (OpenAI or Anthropic), knowledge base, rate limits, safe error messages |
| Marketing | Landing page rendered from the real document engine, pricing, sitemap, robots, Open Graph image, JSON-LD |

## Run it locally

1. Create a Supabase project (or run `supabase start`).
2. Apply the migrations in `supabase/migrations/` in order: `0001`, `0002`, then `0003` (SQL editor, or `supabase db push`).
3. Copy `.env.example` to `.env.local` and fill it in (see below).
4. In Supabase, Authentication, URL configuration: add `http://localhost:3000/auth/callback` as a redirect URL. For quick local testing you can turn off "Confirm email".
5. `npm install`
6. `npm run dev`, then open http://localhost:3000
7. Optional demo data: `npm run seed` creates a demo workspace (Acme Digital) with three clients and three documents. It is flagged `is_demo` and refuses to run with `NODE_ENV=production`.

PDF generation needs Chromium. On serverless hosts it uses `@sparticuz/chromium` automatically. Locally or on a server, set `PDF_CHROMIUM_PATH` to a Chrome or Chromium binary.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key (safe in the browser, protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Used for public document pages, tracking, invites and the seed script |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL, used in auth redirects and share links |
| `AI_PROVIDER` | for AI | `anthropic` or `openai` |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | for AI | Only the key for the chosen provider is needed |
| `AI_MODEL_ANTHROPIC`, `AI_MODEL_OPENAI` | no | Model names (defaults in `.env.example`) |
| `ANTHROPIC_BASE_URL`, `OPENAI_BASE_URL` | no | Route AI calls through a gateway |
| `IP_HASH_SALT` | recommended | Salt for hashing viewer IPs. Use a long random string |
| `PDF_CHROMIUM_PATH` | when self-hosting | Chromium binary for PDF export |
| `PAGESPEED_API_KEY` | no | Google PageSpeed key for audits |
| `BILLING_ENFORCEMENT` | no | `on` enforces plan limits. Leave off until billing is connected |

Never put the service role key or an AI key in a `NEXT_PUBLIC_` variable.

## Checks

```
npm run typecheck
npm run lint
npm test          # unit and integration tests (no database needed)
npm run test:db   # applies the migrations to a scratch Postgres and runs the RLS isolation tests
```

`test:db` needs a local Postgres you can create databases in. It uses a stub of Supabase's `auth` and `storage` schemas (`supabase/tests/00_supabase_stub.sql`), so it never touches a real project.

### End to end test

`tests/e2e/` runs the whole product in a real browser without a Supabase project. `stack.mjs` starts real Postgres tables and RLS behind a real PostgREST, plus a small fake of Supabase Auth, Storage and an AI endpoint. `flow.mjs` then signs up, onboards, adds a client, builds an AI proposal, shares it, accepts it as the client and checks the dashboard, isolation between companies and PDF output.

```
# terminal 1: needs Postgres and the PostgREST binary
POSTGREST_BIN=/path/to/postgrest node tests/e2e/stack.mjs      # prints the URL and keys
# terminal 2: build and run the app against it (NEXT_PUBLIC_ values are read at build time)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon> SUPABASE_SERVICE_ROLE_KEY=<service> \
NEXT_PUBLIC_SITE_URL=http://localhost:3111 ANTHROPIC_API_KEY=fake ANTHROPIC_BASE_URL=http://localhost:54321 \
PDF_CHROMIUM_PATH=/path/to/chromium npm run build && npm start -- -p 3111
# terminal 3
PDF_CHROMIUM_PATH=/path/to/chromium node tests/e2e/flow.mjs
```

## Architecture notes

- **Tenancy.** Every tenant table has `workspace_id` and RLS keyed on `workspace_members`. Server code never trusts a workspace id from the browser: `lib/auth/session.ts` checks the active workspace cookie against the user's real memberships on every request, and every query also filters by that id. Child rows are tied to their client and workspace with composite foreign keys, so a document can't point at another company's client.
- **Roles.** Owner, admin, member. RLS enforces them; `lib/permissions/roles.ts` mirrors them for the UI.
- **Document engine.** `documents.content_json` holds structured content (`lib/documents/content.ts`). `DocumentRenderer` turns content, brand and template config into HTML. The editor preview, the public page and the PDF all use it, so they can't drift. Styles are scoped per brand so several branded documents can share a page.
- **Branding.** `lib/documents/branding.ts` builds a `BrandContext` from company profile and brand kit. The first time a document is shared, that context is frozen into `documents.brand_snapshot`, so later brand changes never alter a document a client has seen.
- **Public documents.** Served through `getPublicDocument(token)` in `lib/db/public.ts` using the service role. There is deliberately no anonymous RLS policy on `documents`. Tokens are 48 hex characters, drafts are not visible, expired links stop working, and pages are `noindex` with `no-referrer`.
- **Tracking.** A hashed IP (scoped per document) and the user agent. Bots and link previews are skipped, and repeat loads within ten minutes count once. The owner's "Preview as client" link is not tracked.
- **AI.** `lib/ai/functions.ts` holds provider independent operations (`generateProposal`, `generateQuotationDescription`, `analyzeAudit`, `improveDocumentContent`, `generateFollowUp`). Providers live in `lib/ai/providers.ts`. Every reply is validated with Zod, with one repair retry. All calls go through `lib/ai/service.ts`, which checks the session, plan and rate limit and turns failures into safe messages. Keys never reach the browser.
- **PDF.** `lib/pdf/`. Headless Chromium prints the same HTML, with a full-bleed cover, running header, footer and page numbers. Next.js refuses a static import of `react-dom/server` in app-router code, so `lib/pdf/static-markup.ts` loads it at runtime.
- **Audits.** `lib/audit/`. All requests go through `safeFetch`, which validates the resolved IP at connect time, re-validates every redirect, and refuses private, loopback, link-local and metadata addresses.
- **Billing and email.** `lib/billing/` and `lib/email/` are provider boundaries with no provider connected. Plan limits are defined in `lib/billing/plans.ts` and only enforced when `BILLING_ENFORCEMENT=on`.

## Layout

```
app/            routes: (marketing), (auth), (app) dashboard and tools, view/p/[token], invite, api
components/     ui, dashboard, documents (renderer + editor), branding, proposals, quotations, audits, public, team
lib/            actions (server actions), ai, audit, auth, billing, db, documents, pdf, permissions, validation
supabase/       migrations, RLS tests
tests/          vitest suites and the end to end harness
scripts/        seed
```

## Adding things later

- **A new document type** (invoice, contract): add it to the `document_type` enum with a migration, add content builders in `lib/documents/builders.ts`, and a route that reuses `DocumentEditorPage`.
- **A new template**: add an entry to `SYSTEM_TEMPLATES` in `lib/documents/templates.ts`.
- **A new AI provider**: implement `AiProvider` in `lib/ai/providers.ts` and add it to `getProvider()`.
- **Payments**: implement `BillingProvider` in `lib/billing/provider.ts`, add a webhook route that updates `subscriptions` with the service role.
