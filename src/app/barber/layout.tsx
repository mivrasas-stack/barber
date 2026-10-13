import { requirePortalWorkspace } from "@/modules/tenancy/application/require-portal-workspace";
import BarberShell from "./barber-shell";

export default async function BarberLayout({children}: {children:React.ReactNode}) {
  await requirePortalWorkspace("BARBER");
  return <BarberShell>{children}</BarberShell>;
}
