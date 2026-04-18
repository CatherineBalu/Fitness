export type Permission =
  | 'schedule:read'
  | 'schedule:write'
  | 'staff:read'
  | 'staff:write'
  | 'staff:delete'
  | 'customer:read'
  | 'customer:write'
  | 'reservation:read'
  | 'reservation:write'
  | 'reservation:manage'
  | 'profile:read'
  | 'profile:write';

// Employee permissions — admin inherits all of these
const EMPLOYEE_PERMISSIONS: Permission[] = [
  'schedule:read',
  'schedule:write',
  'staff:read',
  'staff:write',
  'staff:delete',
  'customer:read',
  'customer:write',
  'reservation:read',
  'reservation:write',
  'reservation:manage',
  'profile:read',
  'profile:write',
];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  customer: [
    'schedule:read',
    'reservation:read',
    'reservation:write',
    'profile:read',
    'profile:write',
  ],
  employee: EMPLOYEE_PERMISSIONS,
  admin: [...EMPLOYEE_PERMISSIONS], // same as employee for now; extend here when roles diverge
};

export function can(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
