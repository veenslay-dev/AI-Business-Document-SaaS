import { PageSchema } from "@/components/seo/page-schema";
import { pageMetadata } from "@/lib/seo/pages";
import { redirectIfSignedIn } from "@/lib/auth/session";
import { SignupForm } from "@/components/auth/signup-form";

export const generateMetadata = () => pageMetadata("/signup");
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { await redirectIfSignedIn(); return <><PageSchema path="/signup" /><SignupForm next={(await searchParams).next} /></>; }
