export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
