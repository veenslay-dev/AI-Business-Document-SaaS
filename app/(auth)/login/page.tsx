import { PageSchema } from "@/components/seo/page-schema";
import { pageMetadata } from "@/lib/seo/pages";
import { redirectIfSignedIn } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";

export const generateMetadata = () => pageMetadata("/login");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  await redirectIfSignedIn();
  const { next, error } = await searchParams;
  return (
    <>
    <PageSchema path="/login" />
    <LoginForm
      next={next}
      notice={error === "link_expired" ? "That link has expired or was already used. Sign in, or request a new one." : undefined}
    />
    </>
  );
}
