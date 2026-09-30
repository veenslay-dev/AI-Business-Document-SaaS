import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
          <Button asChild><Link href="/signup">Start Free</Link></Button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-16 sm:pt-24">
        <h1 className="max-w-3xl font-serif text-4xl leading-[1.08] sm:text-6xl">
          Create proposals, quotations and audits that look like your company created them.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-soft">
          Build your company profile once. Generate branded client documents in minutes with AI.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href="/signup">Start Free</Link></Button>
          <Button asChild size="lg" variant="secondary"><Link href="#how-it-works">See How It Works</Link></Button>
        </div>
        <section id="how-it-works" className="mt-28 max-w-2xl scroll-mt-10">
          <h2 className="font-serif text-2xl">How it works</h2>
          <ol className="mt-4 space-y-3 text-ink-soft">
            <li><strong className="text-ink">1. Set up once.</strong> Company details, logo, colors, fonts and standard terms.</li>
            <li><strong className="text-ink">2. Write with AI.</strong> Pick a client, describe the project, edit the draft.</li>
            <li><strong className="text-ink">3. Send and track.</strong> Share a link or a PDF and see when the client opens it.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
