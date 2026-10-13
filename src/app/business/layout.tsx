import { requirePortalWorkspace } from "@/modules/tenancy/application/require-portal-workspace";
import BusinessShell from "./business-shell";

export default async function BusinessLayout({children}: {children:React.ReactNode}) {
  const {session}=await requirePortalWorkspace("BUSINESS");
  return <BusinessShell currentUserName={session.name}>{children}</BusinessShell>;
}
