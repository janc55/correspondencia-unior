import {
  generatePublicCode,
  hashPublicCode,
  isValidPublicCodeFormat,
  normalizePublicCode,
  verifyPublicCode,
} from './public-code';

const SECRET = 'secreto-de-prueba-con-longitud-suficiente-para-hmac';

describe('código de verificación público', () => {
  it('genera códigos con formato legible XXXX-XXXX', () => {
    const code = generatePublicCode();
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    expect(isValidPublicCodeFormat(code)).toBe(true);
  });

  it('genera códigos distintos en llamadas sucesivas', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generatePublicCode()));
    expect(codes.size).toBeGreaterThan(45);
  });

  it('normaliza guiones, espacios y minúsculas', () => {
    expect(normalizePublicCode(' a7k4 - 9qtx ')).toBe('A7K49QTX');
    expect(isValidPublicCodeFormat('A7K4-9QTX')).toBe(true);
    expect(isValidPublicCodeFormat('A7K4-9QT')).toBe(false);
  });

  it('verifica el código contra su HMAC sin comparación vulnerable', () => {
    const code = 'A7K4-9QTX';
    const hash = hashPublicCode(code, SECRET);
    expect(hash).toHaveLength(64);
    expect(verifyPublicCode('a7k49qtx', hash, SECRET)).toBe(true);
    expect(verifyPublicCode('A7K4-9QTY', hash, SECRET)).toBe(false);
    expect(verifyPublicCode(code, hash, `${SECRET}-otro`)).toBe(false);
  });
});
