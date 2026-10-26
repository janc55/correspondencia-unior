/**
 * Bootstrap de producción: crea el primer usuario administrador sin cargar los
 * datos de demostración.
 *
 * Variables: ADMIN_EMAIL, ADMIN_PASSWORD (obligatorias), ADMIN_NAME y
 * ADMIN_DEPARTMENT_CODE/ADMIN_DEPARTMENT_NAME (opcionales).
 *
 * Es idempotente: si el usuario ya existe NO modifica su contraseña. Se ejecuta
 * desde el arranque de la API solo cuando BOOTSTRAP_ADMIN=true, o a mano:
 *   pnpm --filter @unior/api exec ts-node --compiler-options {"module":"CommonJS"} prisma/bootstrap-admin.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

function loadEnv(): void {
  for (const file of [join(process.cwd(), '.env'), join(process.cwd(), '../../.env')]) {
    try {
      const content = readFileSync(file, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
        if (match && process.env[match[1]] === undefined) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // Archivo opcional: en producción la configuración llega por entorno.
    }
  }
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  loadEnv();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador UNIOR';
  const departmentCode = process.env.ADMIN_DEPARTMENT_CODE?.trim().toUpperCase();
  const departmentName = process.env.ADMIN_DEPARTMENT_NAME?.trim();

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorias para el bootstrap.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
    throw new Error('ADMIN_PASSWORD debe incluir mayúscula, minúscula y número.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`El usuario ${email} ya existe (rol ${existing.role}); no se modifica.`);
    return;
  }

  let departmentId: string | null = null;
  if (departmentCode) {
    const department = await prisma.department.upsert({
      where: { code: departmentCode },
      update: { name: departmentName ?? departmentCode, active: true },
      create: { code: departmentCode, name: departmentName ?? departmentCode },
    });
    departmentId = department.id;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: Role.ADMIN,
      departmentId,
      active: true,
    },
  });

  console.log(
    `Administrador ${email} creado${departmentCode ? ` (departamento ${departmentCode})` : ''}.`,
  );
}

main()
  .catch((error) => {
    console.error('Bootstrap de administrador falló:', (error as Error).message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
