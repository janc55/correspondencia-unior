/**
 * Presentación de fechas y duraciones. La API envía ISO-8601 en UTC; toda la
 * interfaz muestra la hora institucional `America/La_Paz`.
 */

const TIME_ZONE = 'America/La_Paz';
const LOCALE = 'es-BO';

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value);
  return date ? dateTimeFormatter.format(date) : '—';
}

export function formatDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? dateFormatter.format(date) : '—';
}

/** "hace 5 min", "hace 3 h", "hace 2 d" o fecha corta si es antiguo. */
export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  const date = parse(value);
  if (!date) return '—';
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return formatDateTime(value);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return formatDate(value);
}

/** Duración de un tramo en minutos. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  if (minutes < 1) return 'menos de 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const totalHours = Math.floor(minutes / 60);
  const restMinutes = Math.round(minutes % 60);
  if (totalHours < 24) {
    return restMinutes > 0 ? `${totalHours} h ${restMinutes} min` : `${totalHours} h`;
  }
  const days = Math.floor(totalHours / 24);
  const restHours = totalHours % 24;
  return restHours > 0 ? `${days} d ${restHours} h` : `${days} d`;
}

/** Horas transcurridas (demoras) expresadas en días y horas. */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '—';
  if (hours < 1) return 'menos de 1 h';
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = Math.floor(hours / 24);
  const restHours = Math.round(hours % 24);
  return restHours > 0 ? `${days} d ${restHours} h` : `${days} d`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFormatter.format(value);
}

export function formatHoursShort(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)} h`;
}
