import type { Metadata } from "next";
import { ProfileForm } from "@/components/dashboard/simple-forms";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfilePage() {
  const user = (await getUser())!;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
  return <ProfileForm fullName={data?.full_name ?? ""} email={user.email ?? ""} />;
}
