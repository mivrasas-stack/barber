import { requirePortalWorkspace } from "@/modules/tenancy/application/require-portal-workspace";
import BusinessShell from "./business-shell";

export default async function BusinessLayout({children}: {children:React.ReactNode}) {
  await requirePortalWorkspace("BUSINESS");
  return <BusinessShell>{children}</BusinessShell>;
}
