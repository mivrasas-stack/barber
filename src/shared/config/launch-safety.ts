/**
 * Pages with synthetic identities, orders, appointments, security claims, or settings.
 * Never expose these as functioning workflows to production customers.
 * Leave the existing files untouched for local development and QA.
 */
export const UNVERIFIED_LAUNCH_ROUTES = [
  "/barber/accounting",
  "/barber/appointments",
  "/barber/earnings",
  "/barber/metrics",
  "/barber/payments",
  "/barber/portfolio",
  "/barber/profile",
  "/barber/staff",
  "/barber/wait-room",
  "/barber/wallet",
  "/business/accounting",
  "/business/appointments",
  "/business/orders",
  "/business/roles",
  "/business/security",
  "/business/settings",
] as const;

export function isUnverifiedLaunchRoute(pathname: string): boolean {
  const clean = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  if (clean === "/clientes" || clean.startsWith("/clientes/")) return true;
  return UNVERIFIED_LAUNCH_ROUTES.some((route) => clean === route || clean.startsWith(route + "/"));
}

export function shouldBlockUnverifiedLaunchRoute(pathname: string, isProduction: boolean): boolean {
  return isProduction && isUnverifiedLaunchRoute(pathname);
}
