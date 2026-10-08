import type { PrismaClient } from "@prisma/client";
import { portalRoleAllows, type PortalPermission } from "./auth-core";

// Central per-tenant access check. The caller supplies an authenticated user ID,
// never a role or a business ownership claim from the browser.
export async function authorizedPortalMembership(
  client: Pick<PrismaClient, "businessUser">,
  userId: string,
  businessId: string,
  permission: PortalPermission = "read",
) {
  if (!userId || !businessId || businessId.length > 200) return null;
  const membership = await client.businessUser.findUnique({
    where: { userId_businessId: { userId, businessId } },
    include: {
      business: { select: { id: true, name: true, status: true, country: true } },
    },
  });
  if (!membership || membership.business.status !== "active") return null;
  return portalRoleAllows(membership.role, permission) ? membership : null;
}
