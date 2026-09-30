import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandContext, BrandKitRow, CompanyProfileRow } from "@/lib/documents/branding";
import { buildBrandContext } from "@/lib/documents/branding";
import { parseContent, type DocumentContent } from "@/lib/documents/content";
import { parseSnapshot } from "@/lib/documents/snapshot";
import {
  DEFAULT_TEMPLATE_KEY, getSystemTemplate, normalizeConfig, type DocType, type TemplateConfig,
} from "@/lib/documents/templates";

export type DocRecord = {
  id: string; workspace_id: string; client_id: string | null; type: DocType; title: string; status: string;
  content_json: unknown; template_id: string | null; template_key: string | null; brand_snapshot: unknown;
  finalized_at: string | null; total_amount: number | null; currency: string | null; expires_at: string | null;
  public_token: string; created_at: string; updated_at: string;
};
export const DOC_COLUMNS =
  "id, workspace_id, client_id, type, title, status, content_json, template_id, template_key, brand_snapshot, finalized_at, total_amount, currency, expires_at, public_token, created_at, updated_at";

export const COMPANY_COLS =
  "company_name, tagline, description, website, email, phone, address, gst_number, pan_number, services, default_terms, authorized_name, authorized_designation, signature_url";
export const BRAND_COLS =
  "primary_color, secondary_color, accent_color, heading_font, body_font, logo_url, dark_logo_url, favicon_url, default_footer, header_color, heading_color";

export const BRAND_COLS_LEGACY = BRAND_COLS.replace(", header_color, heading_color", "");

/** Reads the brand kit. Falls back to the older column set when migration 0003 has not been applied yet. */
export async function selectBrandKit(client: SupabaseClient, workspaceId: string) {
  const full = await client.from("brand_kits").select(BRAND_COLS).eq("workspace_id", workspaceId).maybeSingle();
  if (!full.error) return full;
  return client.from("brand_kits").select(BRAND_COLS_LEGACY).eq("workspace_id", workspaceId).maybeSingle();
}

export async function loadLiveBrand(client: SupabaseClient, workspaceId: string): Promise<BrandContext | null> {
  const [c, b] = await Promise.all([
    client.from("company_profiles").select(COMPANY_COLS).eq("workspace_id", workspaceId).maybeSingle(),
    selectBrandKit(client, workspaceId),
  ]);
  if (!c.data || !b.data) return null;
  return buildBrandContext(c.data as CompanyProfileRow, b.data as BrandKitRow);
}

export async function loadTemplateConfig(client: SupabaseClient, doc: Pick<DocRecord, "type" | "template_id" | "template_key" | "workspace_id">): Promise<TemplateConfig> {
  const fallback = getSystemTemplate(DEFAULT_TEMPLATE_KEY[doc.type])!.config;
  if (doc.template_id) {
    const { data } = await client.from("document_templates").select("template_config").eq("id", doc.template_id).eq("workspace_id", doc.workspace_id).maybeSingle();
    if (data) return normalizeConfig((data.template_config as { config?: unknown })?.config, fallback);
  }
  return getSystemTemplate(doc.template_key)?.config ?? fallback;
}

export type RenderData = { content: DocumentContent; brand: BrandContext; template: TemplateConfig; frozen: boolean };

/**
 * Everything the renderer needs. A document that has been shared renders from its
 * frozen brand snapshot; drafts render from the live brand kit.
 */
export async function loadRenderData(client: SupabaseClient, doc: DocRecord): Promise<RenderData | null> {
  const content = parseContent(doc.content_json);
  if (!content) return null;
  const snapshot = doc.brand_snapshot ? parseSnapshot(doc.brand_snapshot) : null;
  const brand = snapshot ?? (await loadLiveBrand(client, doc.workspace_id));
  if (!brand) return null;
  return { content, brand, template: await loadTemplateConfig(client, doc), frozen: !!snapshot };
}

/** Loads one document, scoped to the workspace. Never look documents up by id alone. */
export async function fetchDocument(client: SupabaseClient, workspaceId: string, id: string): Promise<DocRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await client.from("documents").select(DOC_COLUMNS).eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  return (data as DocRecord) ?? null;
}
