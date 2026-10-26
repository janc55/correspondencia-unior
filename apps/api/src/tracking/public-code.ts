import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Código de verificación de la consulta pública. Se guarda solo su HMAC: el
 * correlativo por sí solo nunca es suficiente para revelar información.
 *
 * Alfabeto sin caracteres ambiguos (0/O, 1/I/L) para facilitar su dictado.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_GROUPS = 2;
const CODE_GROUP_SIZE = 4;

export function generatePublicCode(): string {
  const groups: string[] = [];
  for (let group = 0; group < CODE_GROUPS; group += 1) {
    let chunk = '';
    for (let index = 0; index < CODE_GROUP_SIZE; index += 1) {
      chunk += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    groups.push(chunk);
  }
  return groups.join('-');
}

export function normalizePublicCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .trim();
}

export function hashPublicCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(normalizePublicCode(code)).digest('hex');
}

export function verifyPublicCode(code: string, expectedHash: string, secret: string): boolean {
  const candidate = Buffer.from(hashPublicCode(code, secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function isValidPublicCodeFormat(code: string): boolean {
  return normalizePublicCode(code).length === CODE_GROUPS * CODE_GROUP_SIZE;
}
