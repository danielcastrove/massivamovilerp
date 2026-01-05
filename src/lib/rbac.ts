// massivamovilerp/src/lib/rbac.ts

import { UserRole } from '@prisma/client';

export type ModulePath = 
  '/dashboard' | 
  '/dashboard/products' |
  '/billing' | 
  '/customers' | 
  '/settings' | 
  '/test-modules/admin-only' | 
  '/test-modules/extra-only' | 
  '/test-modules/client-only' | 
  '/test-modules/all-roles';

// This map defines which roles have access to which module paths.
// MASSIVA_ADMIN always has full access.
export const moduleAccess: Record<ModulePath, UserRole[]> = {
  '/dashboard': [UserRole.MASSIVA_ADMIN, UserRole.MASSIVA_EXTRA, UserRole.CLIENTE],
  '/dashboard/products': [UserRole.MASSIVA_ADMIN, UserRole.MASSIVA_EXTRA],
  '/billing': [UserRole.MASSIVA_ADMIN],
  '/customers': [UserRole.MASSIVA_ADMIN, UserRole.MASSIVA_EXTRA],
  '/settings': [UserRole.MASSIVA_ADMIN],
  
  // Test Modules
  '/test-modules/admin-only': [UserRole.MASSIVA_ADMIN],
  '/test-modules/extra-only': [UserRole.MASSIVA_ADMIN, UserRole.MASSIVA_EXTRA],
  '/test-modules/client-only': [UserRole.MASSIVA_ADMIN, UserRole.CLIENTE],
  '/test-modules/all-roles': [UserRole.MASSIVA_ADMIN, UserRole.MASSIVA_EXTRA, UserRole.CLIENTE],
};

/**
 * Checks if a user with a given role has access to a specific module path.
 * @param userRole The role of the authenticated user.
 * @param modulePath The path of the module to check access for.
 * @returns True if the user has access, false otherwise.
 */
export function hasAccess(userRole: UserRole | undefined, modulePath: ModulePath): boolean {
  if (!userRole) {
    return false; // No role, no access
  }
  // MASSIVA_ADMIN always has access to everything by default
  if (userRole === UserRole.MASSIVA_ADMIN) {
    return true;
  }
  
  const allowedRoles = moduleAccess[modulePath];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
}
