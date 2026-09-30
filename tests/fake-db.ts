/** Tiny in-memory stand-in for the supabase-js query builder, enough for the public action tests. */
type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

export function fakeSupabase(tables: Tables) {
  let idCounter = 0;
  const from = (name: string) => {
    tables[name] ??= [];
    let mode: "select" | "update" | "insert" | "delete" = "select";
    let patch: Row = {};
    let inserted: Row[] = [];
    const filters: ((r: Row) => boolean)[] = [];
    let head = false; let wantCount = false; let limitN = Infinity;
    let order: { col: string; asc: boolean } | null = null;
    const matches = () => tables[name].filter((r) => filters.every((f) => f(r)));

    const run = () => {
      if (mode === "insert") return { data: inserted, error: null, count: null };
      let rows = matches();
      if (mode === "update") { rows.forEach((r) => Object.assign(r, patch)); return { data: rows, error: null, count: rows.length }; }
      if (mode === "delete") { tables[name] = tables[name].filter((r) => !rows.includes(r)); return { data: rows, error: null, count: rows.length }; }
      if (order) rows = [...rows].sort((a, b) => (String(a[order!.col]) < String(b[order!.col]) ? -1 : 1) * (order!.asc ? 1 : -1));
      return { data: head ? null : rows.slice(0, limitN), error: null, count: wantCount ? matches().length : null };
    };

    const q: Record<string, unknown> = {
      select: (_c?: string, o?: { count?: string; head?: boolean }) => { head = !!o?.head; wantCount = !!o?.count; return q; },
      insert: (v: Row | Row[]) => { mode = "insert"; inserted = (Array.isArray(v) ? v : [v]).map((r) => ({ id: `id${++idCounter}`, created_at: new Date().toISOString(), ...r })); tables[name].push(...inserted); return q; },
      update: (p: Row) => { mode = "update"; patch = p; return q; },
      delete: () => { mode = "delete"; return q; },
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
      in: (c: string, v: unknown[]) => { filters.push((r) => v.includes(r[c])); return q; },
      gte: (c: string, v: string) => { filters.push((r) => String(r[c]) >= v); return q; },
      order: (col: string, o?: { ascending?: boolean }) => { order = { col, asc: o?.ascending !== false }; return q; },
      limit: (n: number) => { limitN = n; return q; },
      maybeSingle: async () => { const r = run(); return { data: (r.data as Row[] | null)?.[0] ?? null, error: null }; },
      single: async () => { const r = run(); return { data: (r.data as Row[] | null)?.[0] ?? null, error: null }; },
      then: (resolve: (v: unknown) => unknown) => resolve(run()),
    };
    return q;
  };
  return { from };
}
