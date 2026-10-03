import { PageSchema } from "@/components/seo/page-schema";
import { pageMetadata } from "@/lib/seo/pages";
import { redirectIfSignedIn } from "@/lib/auth/session";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const generateMetadata = () => pageMetadata("/forgot-password");
export default async function Page() { await redirectIfSignedIn(); return <><PageSchema path="/forgot-password" /><ForgotPasswordForm /></>; }
