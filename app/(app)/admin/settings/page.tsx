import { Badge } from "@/components/ui/badge";
import { costRates } from "@/lib/billing/ai-cost";
import { checkRazorpayKeys, razorpayMode } from "@/lib/billing/razorpay";
import { enforcementOn, PLANS, PLAN_ORDER } from "@/lib/billing/plans";

const row = (k: string, v: React.ReactNode) => (<div key={k} className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0"><dt className="text-ink-soft">{k}</dt><dd className="text-right font-medium">{v}</dd></div>);

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const rz = await checkRazorpayKeys();
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  const key = provider === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY;
  const model = provider === "openai" ? process.env.AI_MODEL_OPENAI ?? "gpt-4o-mini" : process.env.AI_MODEL_ANTHROPIC ?? "claude-sonnet-4-5";
  const r = costRates();
  const yes = <Badge tone="ok">Set</Badge>, no = <Badge tone="signal">Missing</Badge>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <h2 className="mb-2 font-bold">AI connection</h2>
        <dl>
          {row("Provider (AI_PROVIDER)", provider)}
          {row("Model", model)}
          {row(provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY", key ? yes : no)}
          {row("Cost rate, input per 1M tokens", `US$ ${r.inputPerM}`)}
          {row("Cost rate, output per 1M tokens", `US$ ${r.outputPerM}`)}
          {row("US$ to ₹ (USD_TO_INR)", r.usdToInr)}
        </dl>
        <p className="mt-3 text-xs text-ink-faint">To use OpenAI set AI_PROVIDER=openai, OPENAI_API_KEY and AI_MODEL_OPENAI in Vercel. Set AI_COST_INPUT_PER_M_USD and AI_COST_OUTPUT_PER_M_USD to your model's current prices so the cost estimates match. Keys are never shown here.</p>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <h2 className="mb-2 font-bold">Plans</h2>
        <dl>{row("Plan limits enforced", enforcementOn() ? yes : <Badge tone="warn">Off</Badge>)}</dl>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-ink-faint"><tr><th className="py-1.5 pr-3">Plan</th><th className="py-1.5 pr-3">₹/mo</th><th className="py-1.5 pr-3">Docs</th><th className="py-1.5 pr-3">AI</th><th className="py-1.5">People</th></tr></thead>
            <tbody>{PLAN_ORDER.map((id) => { const p = PLANS[id]; return <tr key={id} className="border-t border-line"><td className="py-2 pr-3 font-medium">{p.name}</td><td className="py-2 pr-3 tabular-nums">{p.priceInr ?? "Custom"}</td><td className="py-2 pr-3">{p.monthlyDocuments ?? "Unlimited"}</td><td className="py-2 pr-3">{p.aiPerMonth}</td><td className="py-2">{p.teamMembers ?? "Unlimited"}</td></tr>; })}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Plan numbers and prices live in lib/billing/plans.ts. Change them there and redeploy. Use a workspace's page to give one customer different limits.</p>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft lg:col-span-2">
        <h2 className="mb-2 font-bold">Online payments (Razorpay)</h2>
        <dl>
          {row("RAZORPAY_KEY_ID", process.env.RAZORPAY_KEY_ID?.trim() ? yes : no)}
          {row("RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET?.trim() ? yes : no)}
          {row("RAZORPAY_WEBHOOK_SECRET", process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ? yes : <Badge tone="warn">Missing</Badge>)}
          {row("Mode", razorpayMode() ?? "Not configured")}
          {row("Connection test", rz.ok ? <Badge tone="ok">Working</Badge> : <Badge tone="signal">Failed</Badge>)}
        </dl>
        <p className={rz.ok ? "mt-3 text-xs text-ink-faint" : "mt-3 text-xs text-signal"}>{rz.message}. {rz.ok ? "Customers see Pay buttons on Settings, Subscription. Without the webhook secret, a customer who closes the tab right after paying may need a moment or a refresh." : "Until this works, upgrade buttons open the contact form instead. After changing variables in Vercel you must redeploy."}</p>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft lg:col-span-2">
        <h2 className="mb-2 font-bold">Who is the admin?</h2>
        <p className="text-sm text-ink-soft">The first account ever created is the admin. To add a second admin, set <code className="rounded bg-black/5 px-1">ADMIN_EMAIL</code> in Vercel to that person's confirmed email address.</p>
      </section>
    </div>
  );
}
