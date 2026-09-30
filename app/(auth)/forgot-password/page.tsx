import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export default function Page() { return <ForgotPasswordForm />; }
