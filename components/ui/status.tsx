import { Badge } from "./badge";

const DOC: Record<string, { label: string; tone: "neutral" | "ok" | "warn" | "signal" | "brand" }> = {
  draft: { label: "Draft", tone: "neutral" }, sent: { label: "Sent", tone: "brand" }, viewed: { label: "Viewed", tone: "warn" },
  accepted: { label: "Accepted", tone: "ok" }, rejected: { label: "Rejected", tone: "signal" }, expired: { label: "Expired", tone: "neutral" },
};
export function DocStatusBadge({ status }: { status: string }) {
  const s = DOC[status] ?? DOC.draft;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const PROJECT: Record<string, { label: string; tone: "neutral" | "ok" | "warn" | "signal" | "brand" }> = {
  planned: { label: "Planned", tone: "neutral" }, active: { label: "Active", tone: "ok" }, on_hold: { label: "On hold", tone: "warn" },
  completed: { label: "Completed", tone: "brand" }, cancelled: { label: "Cancelled", tone: "signal" },
};
export function ProjectStatusBadge({ status }: { status: string }) {
  const s = PROJECT[status] ?? PROJECT.planned;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
