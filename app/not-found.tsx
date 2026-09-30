import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
      <div className="max-w-sm">
        <p className="font-serif text-6xl text-ink-faint">404</p>
        <h1 className="mt-2 font-serif text-2xl">We can't find that page</h1>
        <p className="mt-2 text-sm text-ink-soft">The link may be old, or the item may have been deleted. If you expected to see something here, check that you're in the right workspace.</p>
        <div className="mt-6 flex justify-center gap-2"><Button asChild><Link href="/dashboard">Go to dashboard</Link></Button><Button asChild variant="secondary"><Link href="/">Home</Link></Button></div>
      </div>
    </main>
  );
}
