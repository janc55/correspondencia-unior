/**
 * Reglas del correlativo institucional. Se mantienen puras para poder probarlas
 * sin base de datos y para garantizar que el formato no dependa del cliente.
 */

export const TRACKING_NUMBER_PREFIX = 'COR';
export const TRACKING_SEQUENCE_DIGITS = 6;

export function formatTrackingNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2999) {
    throw new Error('Año inválido para el correlativo.');
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Secuencia inválida para el correlativo.');
  }
  return `${TRACKING_NUMBER_PREFIX}-${year}-${String(sequence).padStart(TRACKING_SEQUENCE_DIGITS, '0')}`;
}

export function normalizeTrackingNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

const TRACKING_NUMBER_PATTERN = /^COR-(\d{4})-(\d{6,})$/;

export function parseTrackingNumber(raw: string): { year: number; sequence: number } | null {
  const match = TRACKING_NUMBER_PATTERN.exec(normalizeTrackingNumber(raw));
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}
