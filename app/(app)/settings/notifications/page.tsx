import type { Metadata } from "next";
import { NotificationForm } from "@/components/dashboard/notification-form";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationsPage() {
  const user = (await getUser())!;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("notification_prefs").eq("user_id", user.id).maybeSingle();
  const p = (data?.notification_prefs ?? {}) as Record<string, boolean>;
  return <NotificationForm initial={{ document_viewed: p.document_viewed !== false, document_accepted: p.document_accepted !== false, changes_requested: p.changes_requested !== false }} />;
}
