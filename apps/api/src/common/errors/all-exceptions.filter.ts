import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiError } from './api-error';

type ErrorPayload = {
  statusCode: number;
  code: string;
  message: string;
  details: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Respuestas de error consistentes. Nunca expone stack traces, SQL ni detalles
 * internos: solo un código estable y un mensaje apto para el usuario.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? null;

    const payload = this.toPayload(exception);

    if (payload.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `[${requestId}] ${request.method} ${request.originalUrl} -> ${payload.statusCode}`,
        stack,
      );
    }

    response.status(payload.statusCode).json({
      statusCode: payload.statusCode,
      code: payload.code,
      message: payload.message,
      details: payload.details,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private toPayload(exception: unknown): ErrorPayload {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'Ya existe un registro con esos datos.',
          details: null,
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Recurso no encontrado.',
          details: null,
        };
      }
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'BAD_REQUEST',
        message: 'La operación no pudo completarse con los datos enviados.',
        details: null,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (body instanceof Object && !Array.isArray(body)) {
        const record = body as Record<string, unknown>;
        const rawMessage = record.message;
        const message = Array.isArray(rawMessage)
          ? 'Datos inválidos.'
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message;

        return {
          statusCode,
          code: typeof record.code === 'string' ? record.code : defaultCode(statusCode),
          message,
          details: record.details ?? (Array.isArray(rawMessage) ? rawMessage : null) ?? null,
        };
      }

      return {
        statusCode,
        code: defaultCode(statusCode),
        message: typeof body === 'string' ? body : exception.message,
        details: null,
      };
    }

    if (exception instanceof ApiError) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details ?? null,
      };
    }

    if (isObject(exception) && 'code' in exception && exception.code === 'LIMIT_FILE_SIZE') {
      return {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'El archivo excede el tamaño máximo permitido.',
        details: null,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado. Intente nuevamente o contacte a soporte.',
      details: null,
    };
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN_SCOPE';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'VALIDATION_ERROR';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return 'PAYLOAD_TOO_LARGE';
    default:
      return 'ERROR';
  }
}
