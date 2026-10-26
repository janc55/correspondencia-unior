import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Transporte SMTP. Si no hay SMTP configurado (desarrollo), `send` falla de
 * forma controlada para que el llamador registre el envío como omitido.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: AppConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.smtpHost);
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('SMTP no configurado.');
    }
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.config.mailFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpSecure,
        auth: this.config.smtpUser
          ? { user: this.config.smtpUser, pass: this.config.smtpPassword }
          : undefined,
      });
      this.logger.log(`Transporte SMTP inicializado (${this.config.smtpHost}).`);
    }
    return this.transporter;
  }
}
