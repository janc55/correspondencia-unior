import { ApiError } from '../common/errors/api-error';

/**
 * Validación del contenido real del archivo (no solo la extensión o el
 * Content-Type declarado por el cliente).
 */
export type AllowedFileType = {
  mimeType: string;
  extension: string;
};

const SIGNATURES: Array<{
  mimeType: string;
  extension: string;
  check: (buffer: Buffer) => boolean;
}> = [
  {
    mimeType: 'application/pdf',
    extension: '.pdf',
    check: (buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-',
  },
  {
    mimeType: 'image/jpeg',
    extension: '.jpg',
    check: (buffer) =>
      buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    extension: '.png',
    check: (buffer) =>
      buffer.length > 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
];

export function detectAllowedFileType(buffer: Buffer): AllowedFileType {
  const match = SIGNATURES.find((signature) => signature.check(buffer));
  if (!match) {
    throw ApiError.unsupportedFile('Solo se permiten archivos PDF, JPG o PNG.');
  }
  return { mimeType: match.mimeType, extension: match.extension };
}

/** Limpia el nombre original para mostrarlo sin rutas ni caracteres de control. */
export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'archivo';
  return base.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || 'archivo';
}
