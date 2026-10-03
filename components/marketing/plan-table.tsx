import { Check, Minus } from "lucide-react";
import { PLANS, YEARLY_MONTHS, type PlanId } from "@/lib/billing/plans";

const IDS: PlanId[] = ["free", "professional", "agency"];
const inr = (n: number | null) => (n === null ? "Custom" : n === 0 ? "₹0" : `₹${n.toLocaleString("en-IN")}`);

/** A plain comparison table, read straight from the plan table, so it can never disagree with the plan cards. */
export function PlanTable() {
  const rows: [string, (id: PlanId) => React.ReactNode][] = [
    ["Price per month", (id) => inr(PLANS[id].priceInr)],
    ["Price for a year", (id) => (PLANS[id].priceInr ? `${inr((PLANS[id].priceInr as number) * YEARLY_MONTHS)} (${YEARLY_MONTHS} months for 12)` : "₹0")],
    ["Documents per month", (id) => (PLANS[id].monthlyDocuments === null ? "Unlimited (fair use)" : PLANS[id].monthlyDocuments)],
    ["AI actions per month", (id) => PLANS[id].aiPerMonth],
    ["Team members", (id) => (PLANS[id].teamMembers === null ? "Unlimited" : PLANS[id].teamMembers)],
    ["Premium audit report templates", (id) => (PLANS[id].premiumTemplates ? <Check className="mx-auto size-4 text-brand" aria-label="Included" /> : <Minus className="mx-auto size-4 text-ink-faint" aria-label="Not included" />)],
    ["Support", (id) => PLANS[id].support],
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Comparison of the Free, Pro and Agency plans</caption>
        <thead className="border-b border-line bg-brand-soft/40"><tr><th scope="col" className="px-4 py-3 font-semibold">Feature</th>{IDS.map((id) => <th key={id} scope="col" className="px-4 py-3 text-center font-semibold">{PLANS[id].name}</th>)}</tr></thead>
        <tbody>
          {rows.map(([label, cell]) => (
            <tr key={label} className="border-b border-line last:border-0"><th scope="row" className="px-4 py-3 font-medium text-ink-soft">{label}</th>{IDS.map((id) => <td key={id} className="px-4 py-3 text-center tabular-nums">{cell(id)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
