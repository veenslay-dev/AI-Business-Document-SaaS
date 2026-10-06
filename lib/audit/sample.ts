import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteSignals } from "./types";

export type SampleAudit = { url: string; scannedAt: string; signals: SiteSignals };

/** The saved audit of our own site, or null if none has been run yet (or the table is missing). */
export const getSampleAudit = cache(async (): Promise<SampleAudit | null> => {
  try {
    const { data, error } = await createAdminClient().from("sample_audits").select("url, scanned_at, signals").eq("key", "site").maybeSingle();
    if (error || !data || !data.signals || typeof data.signals !== "object" || !(data.signals as SiteSignals).home) return null;
    return { url: data.url as string, scannedAt: data.scanned_at as string, signals: data.signals as SiteSignals };
  } catch { return null; }
});
