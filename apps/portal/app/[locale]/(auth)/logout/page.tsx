import { Suspense } from "react";
import { localeParams } from "@/i18n/settings";
import { LogoutScreen } from "@/feature/auth";

export function generateStaticParams() {
  return localeParams();
}

export default function LogoutPage() {
  return (
    <Suspense>
      <LogoutScreen />
    </Suspense>
  );
}
