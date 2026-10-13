import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import PortalShell from "./portal-shell";

export default async function PortalLayout({ children }: {children:React.ReactNode}) {
 await requireActiveUser();
 // Avoid rendering local demo carts and reward data on real customer sessions.
 if (process.env.NODE_ENV === "production") return <>{children}</>;
 return <PortalShell>{children}</PortalShell>;
}
