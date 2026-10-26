import { formatTrackingNumber, normalizeTrackingNumber, parseTrackingNumber } from './correlative';

describe('correlativo', () => {
  it('formatea el número con año y seis dígitos', () => {
    expect(formatTrackingNumber(2026, 1)).toBe('COR-2026-000001');
    expect(formatTrackingNumber(2026, 123456)).toBe('COR-2026-123456');
    expect(formatTrackingNumber(2030, 42)).toBe('COR-2030-000042');
  });

  it('rechaza valores inválidos en lugar de generar números ambiguos', () => {
    expect(() => formatTrackingNumber(1999, 1)).toThrow();
    expect(() => formatTrackingNumber(2026, 0)).toThrow();
    expect(() => formatTrackingNumber(2026, 1.5)).toThrow();
  });

  it('normaliza la entrada del usuario', () => {
    expect(normalizeTrackingNumber('  cor-2026-000012 ')).toBe('COR-2026-000012');
    expect(normalizeTrackingNumber('COR 2026 000012')).toBe('COR2026000012');
  });

  it('parsea un correlativo válido y rechaza formatos ajenos', () => {
    expect(parseTrackingNumber('cor-2026-000012')).toEqual({ year: 2026, sequence: 12 });
    expect(parseTrackingNumber('COR-26-12')).toBeNull();
    expect(parseTrackingNumber('2026-000012')).toBeNull();
  });
});
