import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/lib/auth/session";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { await redirectIfSignedIn(); return <SignupForm next={(await searchParams).next} />; }
