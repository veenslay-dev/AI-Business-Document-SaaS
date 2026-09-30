import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      next={next}
      notice={error === "link_expired" ? "That link has expired or was already used. Sign in, or request a new one." : undefined}
    />
  );
}
