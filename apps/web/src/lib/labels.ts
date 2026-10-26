import type {
  CorrespondenceStatus,
  Direction,
  PublicStatus,
  RecipientAction,
  Role,
  RouteRecipientStatus,
  TrackingEventType,
} from './types';

export const APP_NAME = 'Sistema de Correspondencia';

export const INSTITUTION_NAME =
  process.env.NEXT_PUBLIC_INSTITUTION_NAME ?? 'Universidad Privada de Oruro';

export const INSTITUTION_SHORT_NAME = process.env.NEXT_PUBLIC_INSTITUTION_SHORT_NAME ?? 'UNIOR';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  RECEPCION: 'Recepción / Ventanilla',
  DESTINATARIO: 'Destinatario interno',
  SEGUIMIENTO: 'Seguimiento / Secretaría',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Gestiona usuarios, configuración y auditoría. Acceso total.',
  RECEPCION: 'Registra correspondencia y anexos, y consulta todo el sistema.',
  DESTINATARIO: 'Atiende los tramos asignados a su usuario o departamento.',
  SEGUIMIENTO: 'Consulta el curso completo, demoras y auditoría.',
};

export const CORRESPONDENCE_STATUS_LABELS: Record<CorrespondenceStatus, string> = {
  REGISTRADA: 'Registrada',
  EN_TRAMITE: 'En trámite',
  ATENDIDA: 'Atendida',
  ARCHIVADA: 'Archivada',
};

export const ROUTE_STATUS_LABELS: Record<RouteRecipientStatus, string> = {
  PENDIENTE: 'Pendiente',
  RECIBIDO: 'Recibido',
  CLASIFICADO: 'Clasificado',
  DESPACHADO: 'Despachado',
};

export const RECIPIENT_ACTION_LABELS: Record<RecipientAction, string> = {
  URGENTE: 'Urgente',
  ARCHIVAR: 'Archivar',
  PREPARAR_RESPUESTA: 'Preparar respuesta',
};

export const RECIPIENT_ACTION_DESCRIPTIONS: Record<RecipientAction, string> = {
  URGENTE: 'Requiere atención inmediata y prioritaria.',
  ARCHIVAR: 'El documento se conserva sin respuesta adicional.',
  PREPARAR_RESPUESTA: 'Se elaborará una respuesta institucional.',
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  INTERNA: 'Interna',
  EXTERNA: 'Externa',
};

export const PUBLIC_STATUS_LABELS: Record<PublicStatus, string> = {
  RECIBIDO: 'Recibido',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  ARCHIVADO: 'Archivado',
};

export const TRACKING_EVENT_LABELS: Record<TrackingEventType, string> = {
  REGISTRO: 'Registro de correspondencia',
  RECEPCION: 'Recepción del tramo',
  CLASIFICACION: 'Clasificación del trámite',
  DESPACHO: 'Salida del tramo',
  ANEXO: 'Anexo adjuntado',
  ARCHIVADO: 'Correspondencia archivada',
  CONSULTA_PUBLICA: 'Consulta pública',
  NOTIFICACION: 'Notificación enviada',
  ACTUALIZACION: 'Actualización',
};

export function eventLabel(value: string): string {
  return TRACKING_EVENT_LABELS[value as TrackingEventType] ?? value;
}

export const PUBLIC_LOOKUP_PLACEHOLDERS = {
  number: 'COR-2026-000012',
  code: '7K4M-9QTX',
};
