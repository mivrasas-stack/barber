import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import ProfessionalShell from "./professional-shell";

export default async function ProfessionalLayout({children}:{children:React.ReactNode}) {
 await requireActiveUser();
 return <ProfessionalShell>{children}</ProfessionalShell>;
}
