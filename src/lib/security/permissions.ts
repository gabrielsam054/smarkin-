/**
 * Smarkin Security — Permissions (extension point, not a policy engine)
 *
 * SmarkinService gains an optional requiredPermissions field. This provider
 * checks it. Today, EVERY registered service (Business Intelligence,
 * Marketing Reasoning, Decision, Channel, Execution, Advertising) declares
 * no requiredPermissions, because none of them actually restrict access
 * beyond authentication — inventing a permission policy that doesn't exist
 * would be dishonest, not defensive. The hook is real; the policy is
 * honestly a no-op until a future capability (e.g. a paid-tier-only AI
 * feature) actually needs one.
 */
import { AuthenticatedIdentity } from "./identity";

export interface PermissionProvider {
  hasPermission(identity: AuthenticatedIdentity, permission: string): Promise<boolean>;
}

// Default implementation for Phase 1.6 — any authenticated identity has
// every permission, because no capability declares one that isn't already
// covered by authentication alone. This is the honest starting policy, not
// a placeholder pretending to be more restrictive than it is.
export class AllowAllPermissionProvider implements PermissionProvider {
  async hasPermission(_identity: AuthenticatedIdentity, _permission: string): Promise<boolean> {
    return true;
  }
}

export const permissionProvider: PermissionProvider = new AllowAllPermissionProvider();

export async function checkRequiredPermissions(
  identity: AuthenticatedIdentity,
  requiredPermissions: string[] | undefined,
): Promise<{ allowed: boolean; missing?: string }> {
  if (!requiredPermissions || requiredPermissions.length === 0) return { allowed: true };
  for (const permission of requiredPermissions) {
    const has = await permissionProvider.hasPermission(identity, permission);
    if (!has) return { allowed: false, missing: permission };
  }
  return { allowed: true };
}
