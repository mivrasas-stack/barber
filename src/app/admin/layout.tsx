import { redirect } from "next/navigation";
import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import AdminShell from "./admin-shell";

export default async function AdminLayout({children}:{children:React.ReactNode}) {
 const session = await requireActiveUser();
 if(!session.isPlatformAdmin) redirect("/login?error=forbidden_platform_admin_required");
 return <AdminShell>{children}</AdminShell>;
}
