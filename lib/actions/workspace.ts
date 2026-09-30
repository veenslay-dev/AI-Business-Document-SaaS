"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WORKSPACE_COOKIE, getActiveMembership, getMemberships, getUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { businessInfoSchema, companyInfoSchema, type BusinessInfoInput, type CompanyInfoInput } from "@/lib/validation/company";
import { brandKitSchema, ALLOWED_ASSET_TYPES, ASSET_KINDS, MAX_ASSET_BYTES, type BrandKitInput } from "@/lib/validation/brand";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

async function setActiveCookie(workspaceId: string) {
  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
}

export async function switchWorkspaceAction(workspaceId: string) {
  const memberships = await getMemberships();
  if (!memberships.some((m) => m.workspaceId === workspaceId)) return;
  await setActiveCookie(workspaceId);
  redirect("/dashboard");
}

export async function saveCompanyInfoAction(input: CompanyInfoInput): Promise<ActionResult> {
  const membership = await getActiveMembership();
  if (!membership) return fail("Your session has expired. Please sign in again.");
  if (!can(membership.role, "company:update")) return fail("Only owners and admins can change company details.");

  const parsed = companyInfoSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_profiles")
    .update({
      company_name: v.companyName, tagline: v.tagline, website: v.website, email: v.email,
      phone: v.phone, address: v.address, gst_number: v.gstNumber, pan_number: v.panNumber,
      description: v.description,
    })
    .eq("workspace_id", membership.workspaceId);
  if (error) return fail(GENERIC_ERROR);

  await supabase.from("workspaces").update({ name: v.companyName }).eq("id", membership.workspaceId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Company details saved." };
}

export async function saveBusinessInfoAction(input: BusinessInfoInput): Promise<ActionResult> {
  const membership = await getActiveMembership();
  if (!membership) return fail("Your session has expired. Please sign in again.");
  if (!can(membership.role, "company:update")) return fail("Only owners and admins can change business details.");

  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_profiles")
    .update({
      services: v.services, default_terms: v.defaultTerms,
      authorized_name: v.authorizedName, authorized_designation: v.authorizedDesignation,
    })
    .eq("workspace_id", membership.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, message: "Business details saved." };
}

export async function saveBrandKitAction(input: BrandKitInput): Promise<ActionResult> {
  const membership = await getActiveMembership();
  if (!membership) return fail("Your session has expired. Please sign in again.");
  if (!can(membership.role, "brand:update")) return fail("Only owners and admins can change the brand kit.");

  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_kits")
    .update({
      primary_color: v.primaryColor.toLowerCase(), secondary_color: v.secondaryColor.toLowerCase(),
      accent_color: v.accentColor.toLowerCase(), heading_font: v.headingFont, body_font: v.bodyFont,
      header_color: v.headerColor ? v.headerColor.toLowerCase() : null, heading_color: v.headingColor ? v.headingColor.toLowerCase() : null,
      default_footer: v.defaultFooter,
    })
    .eq("workspace_id", membership.workspaceId);
  let legacy = false;
  if (error) {
    // Migration 0003 (header and heading colors) may not have been applied. Save the rest so colors and fonts still work.
    const retry = await supabase.from("brand_kits").update({
      primary_color: v.primaryColor.toLowerCase(), secondary_color: v.secondaryColor.toLowerCase(),
      accent_color: v.accentColor.toLowerCase(), heading_font: v.headingFont, body_font: v.bodyFont, default_footer: v.defaultFooter,
    }).eq("workspace_id", membership.workspaceId);
    if (retry.error) return fail(GENERIC_ERROR);
    legacy = true;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: legacy
    ? "Brand kit saved, but the separate header and heading colors need database migration 0003 to be applied first. Your primary color, fonts and footer were saved."
    : "Brand kit saved. Draft documents update right away. Documents you have already shared keep the look the client saw, use \"Refresh branding\" in the editor to update them." };
}

const EXT: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg",
};

/** Uploads a logo, dark logo, favicon or signature into the workspace's storage folder. */
export async function uploadBrandAssetAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const membership = await getActiveMembership();
  if (!membership) return fail("Your session has expired. Please sign in again.");
  if (!can(membership.role, "brand:update")) return fail("Only owners and admins can upload brand assets.");

  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  if (!(ASSET_KINDS as readonly string[]).includes(kind)) return fail("Unknown asset type.");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.");
  if (file.size > MAX_ASSET_BYTES) return fail("That file is larger than 2 MB. Try a smaller image.");
  if (!(ALLOWED_ASSET_TYPES as readonly string[]).includes(file.type)) return fail("Use a PNG, JPG, WebP or SVG image.");

  const supabase = await createClient();
  const path = `${membership.workspaceId}/${kind}-${Date.now()}.${EXT[file.type]}`;
  const { error: uploadError } = await supabase.storage
    .from("brand-assets")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return fail("The upload failed. Check your connection and try again.");

  const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
  const wsId = membership.workspaceId;
  let dbError;
  if (kind === "logo") {
    ({ error: dbError } = await supabase.from("brand_kits").update({ logo_url: url }).eq("workspace_id", wsId));
    await supabase.from("workspaces").update({ logo_url: url }).eq("id", wsId);
  } else if (kind === "dark_logo") {
    ({ error: dbError } = await supabase.from("brand_kits").update({ dark_logo_url: url }).eq("workspace_id", wsId));
  } else if (kind === "favicon") {
    ({ error: dbError } = await supabase.from("brand_kits").update({ favicon_url: url }).eq("workspace_id", wsId));
  } else if (kind === "signature") {
    ({ error: dbError } = await supabase.from("company_profiles").update({ signature_url: url }).eq("workspace_id", wsId));
  }
  // "doc_image" files are only stored; the document that uses them keeps the URL in its content.
  if (dbError) return fail(GENERIC_ERROR);

  revalidatePath("/", "layout");
  return { ok: true, data: { url } };
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const membership = await getActiveMembership();
  if (!membership) return fail("Your session has expired. Please sign in again.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", membership.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  // No revalidatePath here: it would re-render /onboarding and redirect away from the "ready" screen.
  return { ok: true };
}

export async function updateProfileAction(input: { fullName: string }): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Your session has expired. Please sign in again.");
  const fullName = String(input.fullName ?? "").trim();
  if (fullName.length < 2 || fullName.length > 80) return fail("Enter your name (2 to 80 characters).", { fullName: "Enter your name (2 to 80 characters)." });
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated." };
}

export async function markNotificationsSeenAction(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Your session has expired. Please sign in again.");
  const supabase = await createClient();
  await supabase.from("profiles").update({ notifications_seen_at: new Date().toISOString() }).eq("user_id", user.id);
  return { ok: true };
}

export async function saveNotificationPrefsAction(prefs: { document_viewed: boolean; document_accepted: boolean; changes_requested: boolean }): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Your session has expired. Please sign in again.");
  const clean = {
    document_viewed: !!prefs.document_viewed, document_accepted: !!prefs.document_accepted, changes_requested: !!prefs.changes_requested,
  };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ notification_prefs: clean }).eq("user_id", user.id);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, message: "Notification settings saved." };
}
