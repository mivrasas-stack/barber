import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import CustomerShell from "./customer-shell";

export default async function ClientLayout({ children }: {children:React.ReactNode}) {
 await requireActiveUser();
 return <CustomerShell>{children}</CustomerShell>;
}
