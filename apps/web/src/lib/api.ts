/**
 * Cliente HTTP tipado del contrato v1.
 *
 * DECISIÓN DE SEGURIDAD (MVP): los tokens se guardan en `localStorage` para
 * permitir una SPA sin backend de sesión. Esto acepta el riesgo de XSS sobre el
 * token (documentado y acotado: el access token dura 1 h y el refresh rota).
 * En producción se recomienda mover la sesión a cookies httpOnly + SameSite
 * emitidas por la API, manteniendo este módulo como única capa de acceso.
 */

import type {
  Attachment,
  AuditEntry,
  AuditQuery,
  AuthResponse,
  CorrespondenceDetail,
  CorrespondenceListItem,
  CorrespondenceQuery,
  CreateCorrespondenceInput,
  CreateCorrespondenceResponse,
  CreateUserInput,
  Department,
  LoginInput,
  MySegment,
  MySegmentsQuery,
  OverdueNotifyResult,
  OverdueQuery,
  OverdueResponse,
  Paginated,
  PublicAccess,
  PublicTrackingResult,
  Role,
  SegmentTransitionResponse,
  TrackingStats,
  UpdateUserInput,
  User,
  UserQuery,
} from './types';

/**
 * URL base de la API. Por defecto se usa el proxy same-origin `/api/v1`
 * (`src/app/api/v1/[...path]/route.ts`), que resuelve la API real en el servidor
 * con `API_INTERNAL_URL`. Si se define `NEXT_PUBLIC_API_URL` en el build, el
 * navegador habla directamente con esa URL (requiere CORS configurado).
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'unior.accessToken';
const REFRESH_TOKEN_KEY = 'unior.refreshToken';

/** Evento global que avisa al contexto de sesión que la sesión ya no es válida. */
export const SESSION_EXPIRED_EVENT = 'unior:session-expired';

/* ── Errores del contrato ─────────────────────────────────────── */

export interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorPayload {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  details?: unknown;
  requestId?: string;
  timestamp?: string;
  path?: string;
}

const DEFAULT_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
  UNAUTHORIZED: 'Su sesión expiró. Vuelva a iniciar sesión.',
  FORBIDDEN_SCOPE: 'No tiene permisos para acceder a este recurso.',
  NOT_FOUND: 'No se encontró el recurso solicitado.',
  RATE_LIMITED: 'Demasiados intentos. Espere un momento antes de reintentar.',
  VALIDATION_ERROR: 'Revise los datos ingresados.',
  CONFLICT: 'La operación entra en conflicto con datos existentes.',
  INVALID_TRANSITION: 'La acción no es válida para el estado actual del trámite.',
  PAYLOAD_TOO_LARGE: 'El archivo supera el tamaño máximo permitido.',
  UNSUPPORTED_FILE_TYPE: 'El tipo de archivo no está permitido.',
  INTERNAL_ERROR: 'Ocurrió un error interno. Intente nuevamente en unos instantes.',
};

function fallbackMessage(status: number, code?: string): string {
  if (code && DEFAULT_MESSAGES[code]) return DEFAULT_MESSAGES[code];
  if (status === 401) return DEFAULT_MESSAGES.UNAUTHORIZED;
  if (status === 403) return 'No tiene permisos para realizar esta acción.';
  if (status === 404) return DEFAULT_MESSAGES.NOT_FOUND;
  if (status === 409) return DEFAULT_MESSAGES.CONFLICT;
  if (status === 422) return 'Los datos enviados no son válidos.';
  if (status === 429) return DEFAULT_MESSAGES.RATE_LIMITED;
  if (status === 413) return DEFAULT_MESSAGES.PAYLOAD_TOO_LARGE;
  if (status >= 500) return DEFAULT_MESSAGES.INTERNAL_ERROR;
  return 'No se pudo completar la operación.';
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details: unknown = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get fieldErrors(): FieldError[] {
    const details = this.details;
    if (!Array.isArray(details)) return [];
    return details
      .map((item): FieldError | null => {
        if (typeof item === 'string') return { field: 'general', message: item };
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const field =
            typeof record.field === 'string'
              ? record.field
              : typeof record.property === 'string'
                ? record.property
                : typeof record.path === 'string'
                  ? record.path
                  : 'general';
          const message =
            typeof record.message === 'string'
              ? record.message
              : record.constraints && typeof record.constraints === 'object'
                ? Object.values(record.constraints as Record<string, unknown>)
                    .filter((value): value is string => typeof value === 'string')
                    .join('. ')
                : '';
          if (!message) return null;
          return { field, message };
        }
        return null;
      })
      .filter((item): item is FieldError => item !== null);
  }
}

/** Convierte cualquier error desconocido en un mensaje legible en español. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Ocurrió un error inesperado.';
}

/* ── Persistencia de tokens ───────────────────────────────────── */

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  save(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

function notifySessionExpired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/* ── Transporte ───────────────────────────────────────────────── */

type QueryValue = string | number | boolean | null | undefined;

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Cuerpo ya serializado (por ejemplo `FormData`). */
  rawBody?: BodyInit;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
}

async function parseApiError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }
  const rawMessage = payload?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join('. ')
    : rawMessage && rawMessage.trim().length > 0
      ? rawMessage
      : fallbackMessage(response.status, payload?.code);
  return new ApiError(
    response.status,
    payload?.code ?? `HTTP_${response.status}`,
    message,
    payload?.details ?? null,
    payload?.requestId ?? null,
  );
}

async function sendWithAuth(
  path: string,
  options: RequestOptions,
  retried = false,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  let body: BodyInit | undefined;

  if (options.rawBody !== undefined) {
    body = options.rawBody;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const useAuth = options.auth !== false;
  const accessToken = tokenStorage.getAccessToken();
  if (useAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', DEFAULT_MESSAGES.NETWORK_ERROR);
  }

  if (response.status === 401 && useAuth && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return sendWithAuth(path, options, true);
  }

  return response;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as AuthResponse;
    if (!data.accessToken || !data.refreshToken) return false;
    tokenStorage.save(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  const response = await sendWithAuth(path, options);

  if (!response.ok) {
    const error = await parseApiError(response);
    if (useAuth && response.status === 401) {
      tokenStorage.clear();
      notifySessionExpired();
    }
    throw error;
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'Respuesta inesperada del servidor.');
  }
}

/* ── Anexos (descarga autenticada) ────────────────────────────── */

interface DownloadedFile {
  blob: Blob;
  filename: string;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      /* continúa con el nombre simple */
    }
  }
  const simple = /filename="?([^";]+)"?/i.exec(header);
  return simple?.[1]?.trim() ?? null;
}

/* ── Endpoints ────────────────────────────────────────────────── */

export const api = {
  auth: {
    login: (input: LoginInput) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),
    me: () => request<User>('/users/me'),
    logout: (refreshToken: string) =>
      request<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      }),
  },

  departments: {
    list: () => request<Department[]>('/departments'),
  },

  correspondences: {
    list: (query: CorrespondenceQuery = {}) =>
      request<Paginated<CorrespondenceListItem>>(withQuery('/correspondences', { ...query })),
    get: (id: string) =>
      request<CorrespondenceDetail>(`/correspondences/${encodeURIComponent(id)}`),
    create: (input: CreateCorrespondenceInput) =>
      request<CreateCorrespondenceResponse>('/correspondences', {
        method: 'POST',
        body: input,
      }),
    archive: (id: string, reason?: string) =>
      request<CorrespondenceDetail>(`/correspondences/${encodeURIComponent(id)}/archive`, {
        method: 'POST',
        body: { reason: reason && reason.trim().length > 0 ? reason.trim() : null },
      }),
    rotatePublicCode: (id: string) =>
      request<PublicAccess>(`/correspondences/${encodeURIComponent(id)}/public-code`, {
        method: 'POST',
      }),
    uploadAttachment: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<Attachment>(`/correspondences/${encodeURIComponent(id)}/attachments`, {
        method: 'POST',
        rawBody: formData,
      });
    },
  },

  attachments: {
    download: async (id: string, fallbackName?: string): Promise<DownloadedFile> => {
      const response = await sendWithAuth(`/attachments/${encodeURIComponent(id)}/download`, {
        headers: { Accept: '*/*' },
      });
      if (!response.ok) throw await parseApiError(response);
      const blob = await response.blob();
      const filename =
        filenameFromDisposition(response.headers.get('Content-Disposition')) ??
        fallbackName ??
        'anexo';
      return { blob, filename };
    },
  },

  recipients: {
    mine: (query: MySegmentsQuery = {}) =>
      request<MySegment[]>(withQuery('/route-recipients/mine', { ...query })),
    receive: (id: string) =>
      request<SegmentTransitionResponse>(`/route-recipients/${encodeURIComponent(id)}/receive`, {
        method: 'POST',
      }),
    classify: (id: string, action: string) =>
      request<SegmentTransitionResponse>(`/route-recipients/${encodeURIComponent(id)}/action`, {
        method: 'PATCH',
        body: { action },
      }),
    dispatch: (id: string, internalNotes?: string) =>
      request<SegmentTransitionResponse>(`/route-recipients/${encodeURIComponent(id)}/dispatch`, {
        method: 'POST',
        body: {
          internalNotes:
            internalNotes && internalNotes.trim().length > 0 ? internalNotes.trim() : null,
        },
      }),
  },

  tracking: {
    stats: () => request<TrackingStats>('/tracking/stats'),
    overdue: (query: OverdueQuery = {}) =>
      request<OverdueResponse>(withQuery('/tracking/overdue', { ...query })),
    notifyOverdue: () =>
      request<OverdueNotifyResult>('/tracking/overdue/notify', { method: 'POST' }),
    publicLookup: (trackingNumber: string, code: string) =>
      request<PublicTrackingResult>(
        withQuery('/tracking/public', { number: trackingNumber, code }),
        { auth: false },
      ),
  },

  audit: {
    list: (query: AuditQuery = {}) =>
      request<Paginated<AuditEntry>>(withQuery('/audit', { ...query })),
  },

  users: {
    list: (query: UserQuery = {}) => request<Paginated<User>>(withQuery('/users', { ...query })),
    create: (input: CreateUserInput) => request<User>('/users', { method: 'POST', body: input }),
    update: (id: string, input: UpdateUserInput) =>
      request<User>(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: input }),
    resetPassword: (id: string, password: string) =>
      request<void>(`/users/${encodeURIComponent(id)}/reset-password`, {
        method: 'POST',
        body: { password },
      }),
  },
};

export const ROLE_LIST: Role[] = ['ADMIN', 'RECEPCION', 'DESTINATARIO', 'SEGUIMIENTO'];
