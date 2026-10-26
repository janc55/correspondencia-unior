import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorDetail = { field?: string; message: string } | Record<string, unknown>;

/**
 * Error de dominio con código estable, apto para clientes y para auditoría.
 * El detalle nunca debe contener información interna sensible.
 */
export class ApiError extends HttpException {
  readonly code: string;
  readonly details?: unknown;

  constructor(status: HttpStatus, code: string, message: string, details?: unknown) {
    super({ statusCode: status, code, message, details: details ?? null }, status);
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, 'BAD_REQUEST', message, details);
  }

  static validation(message = 'Datos inválidos', details?: unknown): ApiError {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Credenciales inválidas.'): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'No tiene permisos para esta operación.'): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN_SCOPE', message);
  }

  static notFound(message = 'Recurso no encontrado.'): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(HttpStatus.CONFLICT, 'CONFLICT', message);
  }

  static invalidTransition(message: string): ApiError {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'INVALID_TRANSITION', message);
  }

  static tooLarge(message: string): ApiError {
    return new ApiError(HttpStatus.PAYLOAD_TOO_LARGE, 'PAYLOAD_TOO_LARGE', message);
  }

  static unsupportedFile(message: string): ApiError {
    return new ApiError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'UNSUPPORTED_FILE_TYPE', message);
  }
}
