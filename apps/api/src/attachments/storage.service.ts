import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { AppConfigService } from '../config/app-config.service';

export type StoredFile = {
  storageKey: string;
  checksum: string;
  sizeBytes: number;
};

/**
 * Almacenamiento local abstrayendo el acceso al disco. La interfaz permite
 * sustituir la implementación por S3/MinIO sin tocar el dominio.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private readonly config: AppConfigService) {
    this.root = resolve(process.cwd(), this.config.storageDir);
  }

  async save(params: {
    correspondenceId: string;
    extension: string;
    buffer: Buffer;
  }): Promise<StoredFile> {
    const storageKey = join(
      params.correspondenceId,
      `${randomUUID()}${params.extension.startsWith('.') ? params.extension : `.${params.extension}`}`,
    );
    const absolute = this.resolveKey(storageKey);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, params.buffer, { mode: 0o640 });

    return {
      storageKey,
      checksum: createHash('sha256').update(params.buffer).digest('hex'),
      sizeBytes: params.buffer.byteLength,
    };
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveKey(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveKey(storageKey));
    } catch {
      // El archivo pudo no haberse escrito; no se considera un error de negocio.
    }
  }

  /** Evita salir del directorio de almacenamiento mediante claves manipuladas. */
  private resolveKey(storageKey: string): string {
    const absolute = resolve(this.root, storageKey);
    if (absolute !== this.root && !absolute.startsWith(this.root + sep)) {
      throw new Error('Ruta de almacenamiento inválida.');
    }
    return absolute;
  }
}
