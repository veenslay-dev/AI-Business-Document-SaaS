import { AuditLanding } from "@/components/marketing/audit-landing";
import { pageMetadata } from "@/lib/seo/pages";
import { AUDIT_LANDING } from "@/lib/seo/audit-landing";

export const generateMetadata = () => pageMetadata(AUDIT_LANDING.path);
export default function SeoAuditReportGeneratorPage() { return <AuditLanding />; }
