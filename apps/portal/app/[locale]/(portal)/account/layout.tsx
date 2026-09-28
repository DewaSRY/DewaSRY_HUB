import { PortalShell } from "@/components/layout/portal-shell";

export default function AccountLayout({ children }: LayoutProps<"/[locale]/account">) {
  return <PortalShell>{children}</PortalShell>;
}
