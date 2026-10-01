import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Subscription" };

export default async function SubscriptionPage() {
  const { membership } = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase.from("subscriptions").select("plan, status").eq("workspace_id", membership.workspaceId).maybeSingle();
  const plan = data?.plan ?? "free";
  return (
    <section className="max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold capitalize">{plan} plan</h2>
        <Badge tone="ok">{data?.status ?? "active"}</Badge>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        Online billing isn’t connected yet. Plan changes will appear here once a payment provider is
        configured for this deployment.
      </p>
    </section>
  );
}
