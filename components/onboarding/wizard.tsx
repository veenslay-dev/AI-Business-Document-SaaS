"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyInfoForm, type CompanyInfoDefaults } from "@/components/branding/company-info-form";
import { BrandKitForm, type BrandKitDefaults } from "@/components/branding/brand-kit-form";
import { BusinessInfoForm, type BusinessInfoDefaults } from "@/components/branding/business-info-form";
import { completeOnboardingAction } from "@/lib/actions/workspace";
import { cn } from "@/lib/utils";

const STEPS = ["Company", "Brand", "Business", "Ready"] as const;

export function OnboardingWizard({
  company, brand, business, firstDocumentHref,
}: {
  company: CompanyInfoDefaults; brand: BrandKitDefaults; business: BusinessInfoDefaults; firstDocumentHref: string;
}) {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState(company.companyName);
  const [finishing, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function finish() {
    setError(null);
    start(async () => {
      try {
        const res = await completeOnboardingAction();
        if (res.ok) setStep(3);
        else setError(res.error);
      } catch {
        setError("We couldn’t reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Setup progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span className={cn(
              "grid size-6 place-items-center rounded-full border text-xs font-medium",
              i < step ? "border-brand bg-brand text-white" : i === step ? "border-brand text-brand" : "border-line-strong text-ink-faint",
            )}>
              {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden sm:inline", i === step ? "font-medium" : "text-ink-faint")}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden className="mx-1 h-px w-6 bg-line-strong sm:w-10" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="max-w-2xl">
          <h1 className="font-serif text-3xl">Tell us about your company</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">This appears on every document you create. You’ll only enter it once.</p>
          <CompanyInfoForm defaults={company} submitLabel="Save and continue" onSaved={(v) => { setCompanyName(v.companyName ?? ""); setStep(1); }} />
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="font-serif text-3xl">Set your brand</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">Logo, colors and fonts. The preview updates as you go.</p>
          <BrandKitForm
            defaults={brand} company={{ companyName, tagline: company.tagline, email: company.email, phone: company.phone, website: company.website }}
            submitLabel="Save and continue" onSaved={() => setStep(2)}
          />
          <Button variant="ghost" className="mt-4" onClick={() => setStep(0)}>Back</Button>
        </section>
      )}

      {step === 2 && (
        <section className="max-w-2xl">
          <h1 className="font-serif text-3xl">Business details</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">Services, standard terms and who signs your documents.</p>
          {error && <p role="alert" className="mb-4 text-sm text-signal">{error}</p>}
          <BusinessInfoForm defaults={business} submitLabel="Finish setup" onSaved={finish} />
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={finishing}>Back</Button>
            <Button variant="ghost" onClick={finish} loading={finishing}>Skip for now</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="max-w-lg py-10">
          <PartyPopper className="mb-4 size-9 text-signal" aria-hidden />
          <h1 className="font-serif text-4xl">Your workspace is ready.</h1>
          <p className="mt-3 text-ink-soft">
            Your company profile and brand kit are saved. Every new document will use them, and you can
            change them any time from Brand Kit and Settings.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href={firstDocumentHref}>Create Your First Document</Link></Button>
            <Button asChild variant="secondary" size="lg"><Link href="/dashboard">Go to dashboard</Link></Button>
          </div>
        </section>
      )}
    </div>
  );
}
