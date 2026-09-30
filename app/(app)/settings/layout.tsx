import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsNav } from "@/components/dashboard/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (<><PageHeader title="Settings" /><SettingsNav />{children}</>);
}
