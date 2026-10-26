/**
 * Datos de demostración — NO PRODUCTIVOS.
 *
 * Crea departamentos, usuarios de ejemplo y correspondencias con distintos
 * estados (incluida una demorada) para probar el flujo completo.
 *
 * Ejecutar con: pnpm --filter @unior/api prisma:seed
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';
import {
  PrismaClient,
  Role,
  Direction,
  RouteRecipientStatus,
  RecipientAction,
  TrackingEventType,
  CorrespondenceStatus,
} from '@prisma/client';

// Carga simple de .env de la app (sin dependencias extra).
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
      // Archivo opcional.
    }
  }
}

loadEnv();

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Unior2026*';
const PUBLIC_SECRET =
  process.env.PUBLIC_VERIFICATION_SECRET ?? 'secreto-de-verificacion-publica-de-desarrollo';
const CORRELATIVE_YEAR = new Date().getFullYear();

function hashPublicCode(code: string): string {
  return createHmac('sha256', PUBLIC_SECRET)
    .update(code.toUpperCase().replace(/[^0-9A-Z]/g, ''))
    .digest('hex');
}

// Contraseña compartida de demo. bcrypt exige el paquete; se importa en runtime.
async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(plain, 12);
}

const DEPARTMENTS = [
  { code: 'RECTORADO', name: 'Rectorado' },
  { code: 'VENTANILLA', name: 'Ventanilla Única' },
  { code: 'SECRETARIA', name: 'Secretaría General' },
  { code: 'JURIDICA', name: 'Asesoría Jurídica' },
  { code: 'ACADEMICA', name: 'Dirección Académica' },
  { code: 'RRHH', name: 'Recursos Humanos' },
];

const USERS = [
  {
    email: 'admin@unior.edu.bo',
    name: 'Ana Quispe Rojas',
    role: Role.ADMIN,
    department: 'RECTORADO',
  },
  {
    email: 'recepcion@unior.edu.bo',
    name: 'Rosa Ventanilla Lima',
    role: Role.RECEPCION,
    department: 'VENTANILLA',
  },
  {
    email: 'seguimiento@unior.edu.bo',
    name: 'Carlos Secretaría Paz',
    role: Role.SEGUIMIENTO,
    department: 'SECRETARIA',
  },
  {
    email: 'juridico@unior.edu.bo',
    name: 'Luis Abogado Soto',
    role: Role.DESTINATARIO,
    department: 'JURIDICA',
  },
  {
    email: 'academico@unior.edu.bo',
    name: 'María Académica Flores',
    role: Role.DESTINATARIO,
    department: 'ACADEMICA',
  },
  {
    email: 'rrhh@unior.edu.bo',
    name: 'Jorge Recursos Mamani',
    role: Role.DESTINATARIO,
    department: 'RRHH',
  },
];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000);
}

async function main(): Promise<void> {
  console.log('Sembrando datos de demostración...');

  const departmentByCode = new Map<string, string>();
  for (const department of DEPARTMENTS) {
    const created = await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name, active: true },
      create: { code: department.code, name: department.name },
    });
    departmentByCode.set(department.code, created.id);
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userByEmail = new Map<string, string>();
  for (const user of USERS) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        departmentId: departmentByCode.get(user.department) ?? null,
        active: true,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        departmentId: departmentByCode.get(user.department) ?? null,
      },
    });
    userByEmail.set(user.email, created.id);
  }

  const existing = await prisma.correspondence.count();
  if (existing > 0) {
    console.log(`Ya existen ${existing} correspondencias; no se duplican datos de demostración.`);
    await prisma.correlativeSequence.upsert({
      where: { year: CORRELATIVE_YEAR },
      update: {},
      create: { year: CORRELATIVE_YEAR, value: existing },
    });
    await printDemoInfo();
    return;
  }

  const receptorId = userByEmail.get('recepcion@unior.edu.bo')!;
  const juridicoId = userByEmail.get('juridico@unior.edu.bo')!;
  const academicoId = userByEmail.get('academico@unior.edu.bo')!;
  const rrhhId = userByEmail.get('rrhh@unior.edu.bo')!;

  const demoCorrespondences: Array<{
    sequence: number;
    direction: Direction;
    subject: string;
    summary: string;
    senderName: string;
    senderOrganization: string | null;
    senderReference: string | null;
    registeredAt: Date;
    status: CorrespondenceStatus;
    publicCode: string;
    recipients: Array<{
      sequence: number;
      userId?: string;
      departmentId?: string;
      status: RouteRecipientStatus;
      action?: RecipientAction;
      receivedAt?: Date;
      classifiedAt?: Date;
      dispatchedAt?: Date;
      internalNotes?: string;
    }>;
  }> = [
    {
      sequence: 1,
      direction: Direction.EXTERNA,
      subject: 'Solicitud de constancia de estudios para trámite externo',
      summary: 'Estudiante solicita constancia de estudios vigente para postulación laboral.',
      senderName: 'Juan Pérez Mamani',
      senderOrganization: 'Ministerio de Educación',
      senderReference: 'CITE: MINEDU-2026-0451',
      registeredAt: hoursAgo(50),
      status: CorrespondenceStatus.ATENDIDA,
      publicCode: 'A7K4-9QTX',
      recipients: [
        {
          sequence: 1,
          departmentId: departmentByCode.get('ACADEMICA'),
          status: RouteRecipientStatus.DESPACHADO,
          action: RecipientAction.PREPARAR_RESPUESTA,
          receivedAt: hoursAgo(49),
          classifiedAt: hoursAgo(48),
          dispatchedAt: hoursAgo(30),
        },
        {
          sequence: 2,
          userId: juridicoId,
          status: RouteRecipientStatus.DESPACHADO,
          action: RecipientAction.PREPARAR_RESPUESTA,
          receivedAt: hoursAgo(29),
          classifiedAt: hoursAgo(28),
          dispatchedAt: hoursAgo(20),
        },
      ],
    },
    {
      sequence: 2,
      direction: Direction.INTERNA,
      subject: 'Informe de laboratorio pendiente de revisión jurídica',
      summary: 'Informe remitido para evaluación de contrato de servicios.',
      senderName: 'Dirección Académica',
      senderOrganization: 'UNIOR',
      senderReference: 'MEMO DA-2026-112',
      registeredAt: hoursAgo(32),
      status: CorrespondenceStatus.EN_TRAMITE,
      publicCode: 'B3MN-7RTY',
      recipients: [
        {
          sequence: 1,
          departmentId: departmentByCode.get('SECRETARIA'),
          status: RouteRecipientStatus.DESPACHADO,
          action: RecipientAction.PREPARAR_RESPUESTA,
          receivedAt: hoursAgo(31),
          classifiedAt: hoursAgo(30),
          dispatchedAt: hoursAgo(29),
        },
        {
          sequence: 2,
          userId: juridicoId,
          status: RouteRecipientStatus.RECIBIDO,
          receivedAt: hoursAgo(28),
          internalNotes: 'Revisar cláusula de confidencialidad.',
        },
      ],
    },
    {
      sequence: 3,
      direction: Direction.EXTERNA,
      subject: 'Solicitud de información sobre convenio de prácticas',
      summary: 'Empresa local solicita información sobre el convenio vigente de prácticas.',
      senderName: 'Constructora Andina SRL',
      senderOrganization: 'Constructora Andina SRL',
      senderReference: 'CITE: CA-2026-018',
      registeredAt: hoursAgo(10),
      status: CorrespondenceStatus.REGISTRADA,
      publicCode: 'C5PQ-2WXV',
      recipients: [
        {
          sequence: 1,
          userId: academicoId,
          status: RouteRecipientStatus.PENDIENTE,
          internalNotes: 'Coordinar con Secretaría General.',
        },
      ],
    },
    {
      sequence: 4,
      direction: Direction.INTERNA,
      subject: 'Solicitud de vacaciones del personal administrativo',
      summary: 'Nómina de solicitudes de vacaciones del primer semestre.',
      senderName: 'Recursos Humanos',
      senderOrganization: 'UNIOR',
      senderReference: 'MEMO RRHH-2026-034',
      registeredAt: hoursAgo(6),
      status: CorrespondenceStatus.EN_TRAMITE,
      publicCode: 'D8HJ-4KLP',
      recipients: [
        {
          sequence: 1,
          userId: rrhhId,
          status: RouteRecipientStatus.RECIBIDO,
          receivedAt: hoursAgo(5),
        },
      ],
    },
    {
      sequence: 5,
      direction: Direction.EXTERNA,
      subject: 'Notificación de la Dirección Departamental de Educación',
      summary: 'Notificación sobre inspección programada.',
      senderName: 'Dirección Departamental de Educación Oruro',
      senderOrganization: 'DDE Oruro',
      senderReference: 'CITE: DDE-2026-889',
      registeredAt: hoursAgo(70),
      status: CorrespondenceStatus.EN_TRAMITE,
      publicCode: 'E2RT-6NMB',
      recipients: [
        {
          sequence: 1,
          userId: juridicoId,
          status: RouteRecipientStatus.CLASIFICADO,
          action: RecipientAction.URGENTE,
          receivedAt: hoursAgo(68),
          classifiedAt: hoursAgo(66),
          internalNotes: 'Requiere respuesta en 48 horas.',
        },
        {
          sequence: 2,
          userId: academicoId,
          status: RouteRecipientStatus.PENDIENTE,
        },
      ],
    },
  ];

  let sequenceCounter = 0;
  for (const item of demoCorrespondences) {
    sequenceCounter += 1;
    const trackingNumber = `COR-${CORRELATIVE_YEAR}-${String(item.sequence).padStart(6, '0')}`;

    const correspondence = await prisma.correspondence.create({
      data: {
        trackingNumber,
        year: CORRELATIVE_YEAR,
        sequence: item.sequence,
        direction: item.direction,
        subject: item.subject,
        summary: item.summary,
        senderName: item.senderName,
        senderOrganization: item.senderOrganization,
        senderReference: item.senderReference,
        registeredAt: item.registeredAt,
        createdById: receptorId,
        currentStatus: item.status,
        routeSheet: {
          create: {
            createdById: receptorId,
            recipients: {
              create: item.recipients.map((recipient) => ({
                sequence: recipient.sequence,
                userId: recipient.userId ?? null,
                departmentId: recipient.departmentId ?? null,
                status: recipient.status,
                action: recipient.action ?? null,
                receivedAt: recipient.receivedAt ?? null,
                classifiedAt: recipient.classifiedAt ?? null,
                dispatchedAt: recipient.dispatchedAt ?? null,
                internalNotes: recipient.internalNotes ?? null,
              })),
            },
          },
        },
        publicTokens: {
          create: {
            tokenHash: hashPublicCode(item.publicCode),
            createdAt: item.registeredAt,
          },
        },
        events: {
          create: {
            eventType: TrackingEventType.REGISTRO,
            toStatus: 'REGISTRADA',
            actorId: receptorId,
            occurredAt: item.registeredAt,
          },
        },
      },
      include: { routeSheet: { include: { recipients: true } } },
    });

    // Eventos históricos coherentes con el estado de cada tramo.
    for (const recipient of correspondence.routeSheet?.recipients ?? []) {
      const demo = item.recipients.find((entry) => entry.sequence === recipient.sequence);
      if (!demo) continue;
      if (demo.receivedAt) {
        await prisma.trackingEvent.create({
          data: {
            correspondenceId: correspondence.id,
            recipientId: recipient.id,
            eventType: TrackingEventType.RECEPCION,
            fromStatus: RouteRecipientStatus.PENDIENTE,
            toStatus: RouteRecipientStatus.RECIBIDO,
            actorId: demo.userId ?? receptorId,
            occurredAt: demo.receivedAt,
          },
        });
      }
      if (demo.classifiedAt) {
        await prisma.trackingEvent.create({
          data: {
            correspondenceId: correspondence.id,
            recipientId: recipient.id,
            eventType: TrackingEventType.CLASIFICACION,
            fromStatus: RouteRecipientStatus.RECIBIDO,
            toStatus: RouteRecipientStatus.CLASIFICADO,
            actorId: demo.userId ?? receptorId,
            occurredAt: demo.classifiedAt,
            metadata: { action: demo.action ?? null },
          },
        });
      }
      if (demo.dispatchedAt) {
        await prisma.trackingEvent.create({
          data: {
            correspondenceId: correspondence.id,
            recipientId: recipient.id,
            eventType: TrackingEventType.DESPACHO,
            fromStatus: RouteRecipientStatus.CLASIFICADO,
            toStatus: RouteRecipientStatus.DESPACHADO,
            actorId: demo.userId ?? receptorId,
            occurredAt: demo.dispatchedAt,
          },
        });
      }
    }
  }

  await prisma.correlativeSequence.upsert({
    where: { year: CORRELATIVE_YEAR },
    update: { value: sequenceCounter },
    create: { year: CORRELATIVE_YEAR, value: sequenceCounter },
  });

  await printDemoInfo();
  console.log('\nCódigos de consulta externa (correlativo → código):');
  for (const item of demoCorrespondences) {
    console.log(
      `  - COR-${CORRELATIVE_YEAR}-${String(item.sequence).padStart(6, '0')}  →  ${item.publicCode}`,
    );
  }
  console.log('Datos de demostración creados correctamente.');
}

async function printDemoInfo(): Promise<void> {
  console.log('\nUsuarios de demostración (contraseña: Unior2026*):');
  for (const user of USERS) {
    console.log(`  - ${user.email.padEnd(32)} ${user.role}`);
  }
  console.log(
    '  Las correspondencias nuevas muestran su código público una sola vez al registrarse.\n',
  );
}

main()
  .catch((error) => {
    console.error('Error al sembrar datos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
