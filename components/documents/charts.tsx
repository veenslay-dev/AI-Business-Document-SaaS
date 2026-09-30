/** Small SVG charts used by the document renderer. Pure and static, so they print and render on the server. */

export type Slice = { label: string; value: number; color: string };

const polar = (cx: number, cy: number, r: number, angle: number) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;

export function PieChart({ slices, size = 150, hole = 0.58, centre }: { slices: Slice[]; size?: number; hole?: number; centre?: { top: string; bottom?: string } }) {
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((a, s) => a + s.value, 0);
  const r = size / 2, ri = r * hole;
  let angle = -Math.PI / 2;
  return (
    <div className="chart pie">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={shown.map((s) => `${s.label} ${s.value}`).join(", ") || "No data"}>
        {total === 0 && <circle cx={r} cy={r} r={(r + ri) / 2} fill="none" stroke="var(--line)" strokeWidth={r - ri} />}
        {shown.length === 1 && total > 0 && <circle cx={r} cy={r} r={(r + ri) / 2} fill="none" stroke={shown[0].color} strokeWidth={r - ri} />}
        {shown.length > 1 && shown.map((s) => {
          const sweep = (s.value / total) * Math.PI * 2;
          const a0 = angle, a1 = angle + sweep; angle = a1;
          const [x0, y0] = polar(r, r, r, a0), [x1, y1] = polar(r, r, r, a1), [x2, y2] = polar(r, r, ri, a1), [x3, y3] = polar(r, r, ri, a0);
          const large = sweep > Math.PI ? 1 : 0;
          return <path key={s.label} d={`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${large} 0 ${x3} ${y3}Z`} fill={s.color} stroke="var(--paper)" strokeWidth="2" />;
        })}
        {centre && (
          <>
            <text x="50%" y={centre.bottom ? "46%" : "50%"} textAnchor="middle" dominantBaseline="central" fontSize={size / 5} fontWeight="700" fill="var(--ink)">{centre.top}</text>
            {centre.bottom && <text x="50%" y="63%" textAnchor="middle" dominantBaseline="central" fontSize={size / 12} fill="var(--muted)">{centre.bottom}</text>}
          </>
        )}
      </svg>
      <ul className="legend">
        {slices.map((s) => <li key={s.label}><i style={{ background: s.color }} />{s.label}<b>{s.value}</b></li>)}
      </ul>
    </div>
  );
}

const tone = (v: number) => (v >= 80 ? "#2f7d55" : v >= 60 ? "#b08800" : "#b3261e");

/** Horizontal bars, one per row, for scores from 0 to 100. */
export function BarList({ rows, suffix = "%" }: { rows: { label: string; value: number; color?: string }[]; suffix?: string }) {
  return (
    <div className="chart bars">
      {rows.map((r) => (
        <div className="brow" key={r.label}>
          <span className="bl">{r.label}</span>
          <span className="bt"><i style={{ width: `${Math.max(2, Math.min(100, r.value))}%`, background: r.color ?? tone(r.value) }} /></span>
          <span className="bv">{Math.round(r.value)}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

/** A radar chart. Needs three or more axes to make sense, otherwise nothing is drawn. */
export function Radar({ axes, size = 260 }: { axes: { label: string; value: number }[]; size?: number }) {
  if (axes.length < 3) return null;
  const c = size / 2, R = size / 2 - 46, n = axes.length;
  const pt = (i: number, v: number) => polar(c, c, (R * Math.max(0, Math.min(100, v))) / 100, -Math.PI / 2 + (i * 2 * Math.PI) / n);
  const poly = (v: (i: number) => number) => axes.map((_, i) => pt(i, v(i)).join(",")).join(" ");
  return (
    <div className="chart radar">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Score by area">
        {[25, 50, 75, 100].map((g) => <polygon key={g} points={poly(() => g)} fill="none" stroke="var(--line)" strokeWidth="1" />)}
        {axes.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />; })}
        <polygon points={poly((i) => axes[i].value)} fill="var(--accent)" fillOpacity="0.28" stroke="var(--accent)" strokeWidth="2" />
        {axes.map((a, i) => { const [x, y] = pt(i, a.value); return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />; })}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 122);
          const label = a.label.length > 16 ? `${a.label.slice(0, 15)}…` : a.label;
          return <text key={i} x={x} y={y} textAnchor={x < c - 4 ? "end" : x > c + 4 ? "start" : "middle"} dominantBaseline="central" fontSize="10" fill="var(--muted)">{label}</text>;
        })}
      </svg>
    </div>
  );
}

export const SEVERITY_COLORS = { critical: "#b3261e", high: "#d9631b", medium: "#b08800", low: "#4a6fa5", passed: "#2f7d55" } as const;
export const STATUS_COLORS = { good: "#2f7d55", needs_work: "#b08800", poor: "#b3261e", unchecked: "#8a909b" } as const;
