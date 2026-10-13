import { requirePortalWorkspace } from "@/modules/tenancy/application/require-portal-workspace";
import BarberShell from "./barber-shell";

export default async function BarberLayout({children}: {children:React.ReactNode}) {
  const {session}=await requirePortalWorkspace("BARBER");
  return <BarberShell currentUserName={session.name}>{children}</BarberShell>;
}
