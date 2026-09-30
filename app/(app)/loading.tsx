export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded bg-black/[0.07]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-20 rounded-lg bg-black/[0.05]" />)}</div>
      <div className="h-64 rounded-lg bg-black/[0.05]" />
    </div>
  );
}
