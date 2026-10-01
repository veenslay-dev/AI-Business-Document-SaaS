import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { AcceptInviteButton } from "@/components/team/accept-invite";
import { getUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Join a workspace", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: invite } = /^[a-f0-9]{40}$/.test(token)
    ? await admin.from("workspace_invites").select("email, role, accepted_at, workspaces(name)").eq("token", token).maybeSingle()
    : { data: null };
  const ws = Array.isArray(invite?.workspaces) ? invite?.workspaces[0] : invite?.workspaces;
  const user = await getUser();

  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-soft">
        <Wordmark className="mb-6" />
        {!invite || invite.accepted_at ? (
          <><h1 className="font-serif text-2xl">This invite isn't valid</h1><p className="mt-2 text-sm text-ink-soft">It may have been used or revoked. Ask the workspace owner for a new one.</p></>
        ) : (
          <>
            <h1 className="font-serif text-2xl">Join {ws?.name ?? "the workspace"}</h1>
            <p className="mt-2 text-sm text-ink-soft">You've been invited as {invite.role === "admin" ? "an admin" : "a member"} using <strong className="text-ink">{invite.email}</strong>.</p>
            {user ? (
              user.email?.toLowerCase() === invite.email.toLowerCase()
                ? <div className="mt-6"><AcceptInviteButton token={token} /></div>
                : <p className="mt-6 text-sm text-signal">You're signed in as {user.email}. Sign in with {invite.email} to accept.</p>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild><Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}>Create an account</Link></Button>
                <Button asChild variant="secondary"><Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>I already have an account</Link></Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
