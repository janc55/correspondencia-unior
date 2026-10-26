/**
 * Traducción de ruta HTTP a una acción de auditoría legible y estable.
 * Función pura para poder probarla sin levantar la aplicación.
 */
const RESOURCE_LABELS: Record<string, string> = {
  correspondences: 'correspondence',
  'route-recipients': 'route_recipient',
  users: 'user',
  departments: 'department',
  attachments: 'attachment',
  tracking: 'tracking',
  auth: 'auth',
  notifications: 'notification',
};

const SUB_ACTIONS: Record<string, string> = {
  attachments: 'attachment_upload',
  archive: 'archive',
  'public-code': 'public_code_rotate',
  receive: 'receive',
  action: 'classify',
  dispatch: 'dispatch',
  'reset-password': 'reset_password',
  notify: 'overdue_notify',
  me: 'me',
  overdue: 'overdue_list',
};

const VERBS: Record<string, string> = {
  POST: 'create',
  PATCH: 'update',
  PUT: 'update',
  DELETE: 'delete',
  GET: 'read',
};

export function deriveAuditAction(method: string, path: string): string {
  const upperMethod = method.toUpperCase();
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(upperMethod)) {
    return `http.${upperMethod.toLowerCase()}`;
  }

  const segments = path
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .filter((segment) => segment !== 'api' && !/^v\d+$/.test(segment));

  const resource = RESOURCE_LABELS[segments[0] ?? ''] ?? segments[0] ?? 'unknown';
  const subAction = segments
    .slice(2)
    .map((segment) => SUB_ACTIONS[segment])
    .find((value): value is string => Boolean(value));

  if (subAction) return `${resource}.${subAction}`;

  if (segments.length <= 1) return `${resource}.${VERBS[upperMethod] ?? 'write'}`;
  return `${resource}.${VERBS[upperMethod] ?? 'write'}`;
}
