import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/lib/auth/session";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export default async function Page() { await redirectIfSignedIn(); return <ForgotPasswordForm />; }
