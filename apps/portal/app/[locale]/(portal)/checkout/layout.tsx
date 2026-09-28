import { PortalShell } from "@/components/layout/portal-shell";

export default function CheckoutLayout({ children }: LayoutProps<"/[locale]/checkout">) {
  return <PortalShell showTabs={false}>{children}</PortalShell>;
}
