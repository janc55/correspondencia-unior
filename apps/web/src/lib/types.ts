/**
 * Tipos del contrato de API v1 (`docs/api-contract.md`).
 * No se define lógica de negocio aquí: solo la forma de los payloads.
 */

export type Role = 'ADMIN' | 'RECEPCION' | 'DESTINATARIO' | 'SEGUIMIENTO';

export type CorrespondenceStatus = 'REGISTRADA' | 'EN_TRAMITE' | 'ATENDIDA' | 'ARCHIVADA';

export type Direction = 'INTERNA' | 'EXTERNA';

export type RouteRecipientStatus = 'PENDIENTE' | 'RECIBIDO' | 'CLASIFICADO' | 'DESPACHADO';

export type RecipientAction = 'URGENTE' | 'ARCHIVAR' | 'PREPARAR_RESPUESTA';

/** Verbos que el backend publica en `allowedActions`. */
export type SegmentVerb = 'receive' | 'classify' | 'dispatch';

export type PublicStatus = 'RECIBIDO' | 'EN_CURSO' | 'FINALIZADO' | 'ARCHIVADO';

export type TrackingEventType =
  | 'REGISTRO'
  | 'RECEPCION'
  | 'CLASIFICACION'
  | 'DESPACHO'
  | 'ANEXO'
  | 'ARCHIVADO'
  | 'CONSULTA_PUBLICA'
  | 'NOTIFICACION'
  | 'ACTUALIZACION';

/* ── Catálogos y usuarios ─────────────────────────────────────── */

export interface Department {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  department: Department | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
}

export interface UserWithRoleSummary extends UserSummary {
  role: Role;
}

/* ── Autenticación ────────────────────────────────────────────── */

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

/* ── Paginación ───────────────────────────────────────────────── */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/* ── Correspondencias ─────────────────────────────────────────── */

export interface CorrespondenceListItem {
  id: string;
  trackingNumber: string;
  direction: Direction;
  subject: string;
  senderName: string;
  senderOrganization: string | null;
  registeredAt: string;
  currentStatus: CorrespondenceStatus;
  isArchived: boolean;
  recipientsTotal: number;
  recipientsCompleted: number;
  hasOverdueSegment: boolean;
}

export type CorrespondenceQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CorrespondenceStatus | '';
  direction?: Direction | '';
  from?: string;
  to?: string;
  overdue?: boolean;
  mine?: boolean;
};

export interface RouteAssignee {
  type: 'USER' | 'DEPARTMENT';
  id: string;
  name: string;
  department?: string | null;
}

export interface RouteRecipientDetail {
  id: string;
  sequence: number;
  status: RouteRecipientStatus;
  action: RecipientAction | null;
  receivedAt: string | null;
  classifiedAt: string | null;
  dispatchedAt: string | null;
  internalNotes: string | null;
  assignee: RouteAssignee;
  durationMinutes: number | null;
  isOverdue: boolean;
  overdueHours: number;
  canAct: boolean;
  allowedActions?: string[];
}

export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  uploadedBy: UserSummary;
}

export interface TrackingEvent {
  id: string;
  eventType: TrackingEventType;
  fromStatus: CorrespondenceStatus | null;
  toStatus: CorrespondenceStatus | null;
  occurredAt: string;
  actor: UserSummary | null;
  recipientSequence: number | null;
}

export interface PublicTrackingInfo {
  hasActiveToken: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CorrespondenceMetrics {
  elapsedHours: number;
  overdueSegments: number;
  thresholdHours: number;
}

export interface CorrespondenceDetail {
  id: string;
  trackingNumber: string;
  year: number;
  sequence: number;
  direction: Direction;
  subject: string;
  summary: string | null;
  senderName: string;
  senderOrganization: string | null;
  senderReference: string | null;
  registeredAt: string;
  currentStatus: CorrespondenceStatus;
  isArchived: boolean;
  createdBy: UserSummary;
  routeSheet: {
    id: string;
    createdAt: string;
    recipients: RouteRecipientDetail[];
  };
  attachments: Attachment[];
  events: TrackingEvent[];
  publicTracking: PublicTrackingInfo | null;
  metrics: CorrespondenceMetrics;
}

export interface RecipientInput {
  userId?: string;
  departmentId?: string;
  internalNotes?: string;
}

export interface CreateCorrespondenceInput {
  direction: Direction;
  subject: string;
  summary?: string;
  senderName: string;
  senderOrganization?: string;
  senderReference?: string;
  recipients: RecipientInput[];
}

export interface PublicAccess {
  trackingNumber: string;
  code: string;
  expiresAt: string | null;
}

export interface CreateCorrespondenceResponse {
  correspondence: CorrespondenceDetail;
  publicAccess: PublicAccess;
}

/* ── Tramos ───────────────────────────────────────────────────── */

export interface MySegmentCorrespondence {
  id: string;
  trackingNumber: string;
  subject: string;
  direction: Direction;
  senderName: string;
  senderOrganization: string | null;
  registeredAt: string;
  currentStatus: CorrespondenceStatus;
}

export interface MySegment {
  id: string;
  sequence: number;
  status: RouteRecipientStatus;
  action: RecipientAction | null;
  receivedAt: string | null;
  dispatchedAt: string | null;
  internalNotes: string | null;
  canAct: boolean;
  allowedActions: string[];
  correspondence: MySegmentCorrespondence;
  waitingHours: number;
  isOverdue: boolean;
}

export type MySegmentsQuery = {
  status?: RouteRecipientStatus | '';
  pending?: boolean;
};

export interface SegmentTransitionResponse {
  recipient: RouteRecipientDetail;
  correspondenceStatus: CorrespondenceStatus;
}

/* ── Seguimiento y demoras ────────────────────────────────────── */

export interface TrackingStats {
  total: number;
  byStatus: Record<CorrespondenceStatus, number>;
  overdue: number;
  registeredToday: number;
  averageAttentionHours: number | null;
  thresholdHours: number;
}

export interface OverdueSegment {
  correspondenceId: string;
  trackingNumber: string;
  subject: string;
  recipientId: string;
  recipientSequence: number;
  status: RouteRecipientStatus;
  assigneeName: string;
  since: string;
  hoursElapsed: number;
  isOverdue: boolean;
}

export interface OverdueResponse extends Paginated<OverdueSegment> {
  thresholdHours: number;
}

export type OverdueQuery = {
  page?: number;
  pageSize?: number;
};

export interface OverdueNotifyResult {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface PublicRecipientTrack {
  sequence: number;
  statusLabel: string;
  receivedAt: string | null;
  dispatchedAt: string | null;
}

export interface PublicTrackingResult {
  trackingNumber: string;
  publicStatus: PublicStatus;
  publicStatusLabel: string;
  registeredAt: string;
  lastMovementAt: string | null;
  recipients: PublicRecipientTrack[];
}

/* ── Auditoría ────────────────────────────────────────────────── */

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  requestId: string | null;
  ip: string | null;
  actor: UserWithRoleSummary | null;
}

export type AuditQuery = {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

/* ── Administración de usuarios ───────────────────────────────── */

export type UserQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: Role | '';
  active?: boolean;
};

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  departmentId?: string | null;
  active?: boolean;
}

/* ── Notificaciones (solo ADMIN) ──────────────────────────────── */

export interface NotificationLog {
  id: string;
  recipient: string;
  template: string;
  status: string;
  attempts: number;
  sentAt: string | null;
  errorCode: string | null;
  createdAt: string;
}

export type NotificationQuery = {
  status?: string;
  page?: number;
  pageSize?: number;
};
