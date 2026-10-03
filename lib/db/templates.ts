import { canUsePremiumTemplates } from "@/lib/billing/plans";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATE_KEY, getSystemTemplate, normalizeConfig, templatesFor, type DocType, type TemplateConfig } from "@/lib/documents/templates";

export type EditorTemplate = { value: string; label: string; config: TemplateConfig; /** A paid template this workspace can't use yet. */ locked?: boolean };

/** System templates for a type plus the workspace's saved ones. Values are "sys:<key>" or "custom:<id>". */
export async function listEditorTemplates(workspaceId: string, type: DocType): Promise<EditorTemplate[]> {
  const supabase = await createClient();
  const fallback = getSystemTemplate(DEFAULT_TEMPLATE_KEY[type])!.config;
  const { data: sub } = await supabase.from("subscriptions").select("plan, limits, status, current_period_end").eq("workspace_id", workspaceId).maybeSingle();
  const premiumOk = canUsePremiumTemplates(sub);
  const { data } = await supabase.from("document_templates").select("id, name, template_config, is_default").eq("workspace_id", workspaceId).eq("type", type).order("name");
  const custom = (data ?? []).map((t) => ({ value: `custom:${t.id}`, label: `${t.name} (yours)`, config: normalizeConfig((t.template_config as { config?: unknown })?.config, fallback), isDefault: t.is_default as boolean, locked: false }));
  const system = templatesFor(type).map((t) => ({ value: `sys:${t.key}`, label: t.premium && !premiumOk ? `${t.name} (Pro)` : t.name, config: t.config, isDefault: false, locked: !!t.premium && !premiumOk }));
  // Premium layouts come after the standard ones so wizards never preselect a locked template.
  const list = [...system.filter((t) => !t.value.startsWith("sys:") || !getSystemTemplate(t.value.slice(4))?.premium), ...custom, ...system.filter((t) => getSystemTemplate(t.value.slice(4))?.premium)];
  // A workspace default goes first so wizards preselect it.
  const def = list.find((t) => t.isDefault);
  const ordered = def ? [def, ...list.filter((t) => t !== def)] : list;
  return ordered.map(({ value, label, config, locked }) => ({ value, label, config, locked }));
}

export type PackageRow = { id: string; tier: string; name: string; description: string; price: number; currency: string; features: string[]; sort_order: number };

export async function listPackages(workspaceId: string): Promise<PackageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("pricing_packages").select("id, tier, name, description, price, currency, features, sort_order").eq("workspace_id", workspaceId).order("sort_order").order("created_at");
  return (data ?? []).map((p) => ({
    id: p.id, tier: p.tier, name: p.name, description: p.description ?? "", price: Number(p.price), currency: p.currency,
    features: Array.isArray(p.features) ? (p.features as string[]) : [], sort_order: p.sort_order,
  }));
}
