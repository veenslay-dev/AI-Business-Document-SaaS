/**
 * Development seed. Creates a demo user and a demo workspace ("Acme Digital") with clients,
 * projects, packages, knowledge entries and three documents.
 *
 * Demo rows are marked workspaces.is_demo = true and live in their own workspace, so they never mix
 * with real customer data. Refuses to run in production unless --force is given.
 *
 *   npm run seed
 *   SEED_EMAIL=me@example.com SEED_PASSWORD=... npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { ACME_BRAND, SAMPLE_CLIENTS, sampleAudit, sampleProposal, sampleQuotation, sampleSocialAudit } from "../lib/documents/samples";
import { documentTotals } from "../lib/documents/totals";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example)."); process.exit(1); }
if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) { console.error("Refusing to seed demo data with NODE_ENV=production. Pass --force if you really mean it."); process.exit(1); }

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const email = process.env.SEED_EMAIL ?? "demo@acme-digital.example";
const password = process.env.SEED_PASSWORD ?? randomBytes(9).toString("base64url");
const SLUG = "acme-digital-demo";

function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error || res.data === null || res.data === undefined) throw new Error(`${what}: ${res.error?.message ?? "no data"}`);
  return res.data as NonNullable<T>;
}

async function main() {
  const existing = await admin.from("workspaces").select("id").eq("slug", SLUG).maybeSingle();
  if (existing.data) { console.log(`Demo workspace already exists (${SLUG}). Nothing to do.`); return; }

  // User (idempotent on email).
  let userId: string;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Asha Rao", company_name: "Acme Digital" } });
  if (created.error) {
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list.data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error(`create user: ${created.error.message}`);
    userId = found.id;
    console.log(`User ${email} already exists; its password was not changed.`);
  } else { userId = created.data.user.id; }

  const ws = must(await admin.from("workspaces").insert({ name: "Acme Digital", slug: SLUG, is_demo: true, onboarding_completed_at: new Date().toISOString() }).select("id").single(), "workspace");
  const wsId = ws.id as string;
  must(await admin.from("workspace_members").insert({ workspace_id: wsId, user_id: userId, role: "owner" }).select("id").single(), "member");

  const c = ACME_BRAND.company, b = ACME_BRAND.brand;
  must(await admin.from("company_profiles").insert({
    workspace_id: wsId, company_name: c.name, tagline: c.tagline, description: c.description, website: c.website, email: c.email, phone: c.phone, address: c.address,
    gst_number: c.gst, pan_number: c.pan, services: c.services, default_terms: c.terms, authorized_name: c.signatory.name, authorized_designation: c.signatory.designation,
  }).select("id").single(), "company profile");
  must(await admin.from("brand_kits").insert({
    workspace_id: wsId, primary_color: b.primary, secondary_color: b.secondary, accent_color: b.accent, heading_font: b.headingFont, body_font: b.bodyFont,
  }).select("id").single(), "brand kit");
  must(await admin.from("subscriptions").insert({ workspace_id: wsId, plan: "agency", status: "active" }).select("id").single(), "subscription");

  const clientIds: string[] = [];
  for (const cl of SAMPLE_CLIENTS) {
    const row = must(await admin.from("clients").insert({ workspace_id: wsId, company_name: cl.company, contact_name: cl.contact, email: cl.email, phone: cl.phone, website: cl.website, industry: cl.industry, address: cl.address }).select("id").single(), "client");
    clientIds.push(row.id as string);
  }

  must(await admin.from("projects").insert([
    { workspace_id: wsId, client_id: clientIds[0], name: "SEO growth programme", description: "Six month retainer", status: "active" },
    { workspace_id: wsId, client_id: clientIds[1], name: "Website relaunch", description: "New site with local SEO", status: "planned" },
    { workspace_id: wsId, client_id: clientIds[2], name: "Listings audit", description: "Technical review of the property portal", status: "completed" },
  ]).select("id"), "projects");

  must(await admin.from("pricing_packages").insert([
    { workspace_id: wsId, tier: "basic", name: "Starter", description: "Fixes and reporting", price: 50000, currency: "INR", features: ["Technical audit", "Monthly report"], sort_order: 1 },
    { workspace_id: wsId, tier: "standard", name: "Growth", description: "Fixes plus content", price: 85000, currency: "INR", features: ["Everything in Starter", "4 pages a month", "Link outreach"], sort_order: 2 },
    { workspace_id: wsId, tier: "premium", name: "Premium", description: "Full service", price: 125000, currency: "INR", features: ["Everything in Growth", "8 pages a month", "Conversion work"], sort_order: 3 },
  ]).select("id"), "packages");

  must(await admin.from("knowledge_base_items").insert([
    { workspace_id: wsId, title: "Local SEO for clinics", type: "case_study", content: "We rebuilt the service pages for a two-branch dental clinic and set up Google Business Profile posts. Booking enquiries from search rose over the following quarter." },
    { workspace_id: wsId, title: "How we price retainers", type: "pricing", content: "Retainers start at 50,000 INR a month with a six month minimum. Audits are a one time fee of 60,000 INR and are credited against the first month if the client continues." },
  ]).select("id"), "knowledge base");

  const brandSnapshot = ACME_BRAND;
  const insertDoc = async (type: "proposal" | "quotation" | "seo_audit" | "social_audit", title: string, clientIdx: number, content: unknown, status: string, tpl: string, extra: Record<string, unknown> = {}) => {
    const t = documentTotals(content as never);
    return must(await admin.from("documents").insert({
      workspace_id: wsId, client_id: clientIds[clientIdx], type, title, status, content_json: content, template_key: tpl, created_by: userId,
      total_amount: t.amount, currency: t.currency, brand_snapshot: status === "draft" ? null : brandSnapshot, finalized_at: status === "draft" ? null : new Date().toISOString(), ...extra,
    }).select("id").single(), title).id as string;
  };

  const proposalId = await insertDoc("proposal", "SEO growth plan for Nova Furniture", 0, sampleProposal(SAMPLE_CLIENTS[0]), "viewed", "proposal-modern");
  const quoteId = await insertDoc("quotation", "Website quotation for Bright Dental", 1, sampleQuotation(SAMPLE_CLIENTS[1]), "sent", "quotation-executive");
  await insertDoc("seo_audit", "SEO Audit: novafurniture.example", 0, sampleAudit(SAMPLE_CLIENTS[0]), "draft", "audit-seo-professional");
  await insertDoc("social_audit", "Social Media Audit: Bright Dental", 1, sampleSocialAudit(SAMPLE_CLIENTS[1]), "draft", "social-audit-scorecard");

  const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  must(await admin.from("document_views").insert([
    { document_id: proposalId, viewed_at: ago(600), ip_hash: "seed1", user_agent: "Seed browser", duration_seconds: 210 },
    { document_id: proposalId, viewed_at: ago(15), ip_hash: "seed2", user_agent: "Seed browser", duration_seconds: 95 },
  ]).select("id"), "views");
  must(await admin.from("document_actions").insert([
    { document_id: proposalId, action: "viewed", metadata: {}, created_at: ago(600) },
    { document_id: proposalId, action: "viewed", metadata: {}, created_at: ago(15) },
    { document_id: proposalId, action: "comment_added", metadata: { kind: "change_request", comment: "Can you add a phased payment option?", name: "Rohan Mehta" }, created_at: ago(10) },
  ]).select("id"), "actions");
  void quoteId;

  console.log("\nSeeded demo workspace 'Acme Digital'.");
  console.log(`  Sign in:  ${email}`);
  if (!created.error) console.log(`  Password: ${password}${process.env.SEED_PASSWORD ? "" : "  (generated, shown once)"}`);
}

main().catch((e) => { console.error("Seed failed:", e instanceof Error ? e.message : e); process.exit(1); });
