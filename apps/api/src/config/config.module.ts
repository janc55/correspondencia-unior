import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { EnvValidationService } from './env-validation.service';

/**
 * Módulo global de configuración: expone AppConfigService a cualquier módulo
 * (incluidos los dinámicos, como JwtModule) sin repetir providers.
 */
@Global()
@Module({
  providers: [AppConfigService, EnvValidationService],
  exports: [AppConfigService, EnvValidationService],
})
export class AppConfigModule {}
