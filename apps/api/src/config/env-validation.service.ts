import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

/**
 * Verificación temprana de configuración. Falla al arrancar antes que el
 * sistema quede operando con secretos inseguros o valores inválidos.
 */
@Injectable()
export class EnvValidationService {
  private readonly logger = new Logger(EnvValidationService.name);

  constructor(private readonly config: AppConfigService) {}

  validate(): void {
    const problems: string[] = [];
    const secrets: Array<[string, string]> = [
      ['JWT_ACCESS_SECRET', this.config.jwtAccessSecret],
      ['PUBLIC_VERIFICATION_SECRET', this.config.publicVerificationSecret],
    ];

    for (const [name, value] of secrets) {
      if (!value || value.length < 32) {
        problems.push(`${name} debe existir y tener al menos 32 caracteres.`);
      }
    }

    if (this.config.isProduction) {
      for (const [name, value] of secrets) {
        if (value.startsWith('cambia-esto')) {
          problems.push(`${name} sigue usando el valor de ejemplo; cámbialo antes de producción.`);
        }
      }
      if (!this.config.mailTrackingTeam) {
        this.logger.warn(
          'MAIL_TRACKING_TEAM no está configurado: no se enviarán alertas de demora.',
        );
      }
    }

    if (!this.config.isProduction && problems.length > 0) {
      this.logger.warn(`Configuración incompleta para producción:\n- ${problems.join('\n- ')}`);
      return;
    }

    if (problems.length > 0) {
      throw new Error(`Configuración inválida:\n- ${problems.join('\n- ')}`);
    }
  }
}
