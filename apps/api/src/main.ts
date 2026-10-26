import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { ApiError } from './common/errors/api-error';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  const config = app.get(AppConfigService);

  app.setGlobalPrefix(config.prefix);
  if (config.trustProxy) {
    // Detrás de Traefik (Dokploy) la IP real llega en X-Forwarded-For.
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(
    helmet({
      // Swagger UI requiere estilos/scripts inline; la API sirve JSON con nosniff.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id'],
    credentials: false,
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
      exceptionFactory: (errors) =>
        ApiError.validation(
          'Datos inválidos.',
          errors.map((error) => ({
            field: error.property,
            message: Object.values(error.constraints ?? {})[0] ?? 'El valor enviado no es válido.',
          })),
        ),
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('UNIOR · Sistema de Correspondencia')
    .setDescription(
      'API REST para el registro y seguimiento de correspondencia de la Universidad Privada de Oruro. ' +
        'La consulta externa requiere correlativo y código de verificación.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addServer(`http://localhost:${config.port}`, 'Desarrollo local')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(config.port, '0.0.0.0');
  logger.log(`API escuchando en http://localhost:${config.port}/${config.prefix}`);
  logger.log(`Documentación Swagger en http://localhost:${config.port}/api/docs`);
}

void bootstrap();
