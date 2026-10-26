-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECEPCION', 'DESTINATARIO', 'SEGUIMIENTO');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INTERNA', 'EXTERNA');

-- CreateEnum
CREATE TYPE "CorrespondenceStatus" AS ENUM ('REGISTRADA', 'EN_TRAMITE', 'ATENDIDA', 'ARCHIVADA');

-- CreateEnum
CREATE TYPE "RouteRecipientStatus" AS ENUM ('PENDIENTE', 'RECIBIDO', 'CLASIFICADO', 'DESPACHADO');

-- CreateEnum
CREATE TYPE "RecipientAction" AS ENUM ('URGENTE', 'ARCHIVAR', 'PREPARAR_RESPUESTA');

-- CreateEnum
CREATE TYPE "TrackingEventType" AS ENUM ('REGISTRO', 'RECEPCION', 'CLASIFICACION', 'DESPACHO', 'ANEXO', 'ARCHIVADO', 'CONSULTA_PUBLICA', 'NOTIFICACION', 'ACTUALIZACION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO', 'OMITIDO');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DESTINATARIO',
    "departmentId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correspondences" (
    "id" UUID NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "direction" "Direction" NOT NULL,
    "subject" TEXT NOT NULL,
    "summary" TEXT,
    "senderName" TEXT NOT NULL,
    "senderOrganization" TEXT,
    "senderReference" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "currentStatus" "CorrespondenceStatus" NOT NULL DEFAULT 'REGISTRADA',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correspondences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_sheets" (
    "id" UUID NOT NULL,
    "correspondenceId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_recipients" (
    "id" UUID NOT NULL,
    "routeSheetId" UUID NOT NULL,
    "userId" UUID,
    "departmentId" UUID,
    "sequence" INTEGER NOT NULL,
    "status" "RouteRecipientStatus" NOT NULL DEFAULT 'PENDIENTE',
    "action" "RecipientAction",
    "receivedAt" TIMESTAMP(3),
    "classifiedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "correspondenceId" UUID NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "correspondenceId" UUID NOT NULL,
    "recipientId" UUID,
    "eventType" "TrackingEventType" NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "actorId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "requestId" TEXT,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_tracking_tokens" (
    "id" UUID NOT NULL,
    "correspondenceId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_tracking_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "correspondenceId" UUID,
    "routeRecipientId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correlative_sequences" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "correlative_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "correspondences_trackingNumber_key" ON "correspondences"("trackingNumber");

-- CreateIndex
CREATE INDEX "correspondences_currentStatus_idx" ON "correspondences"("currentStatus");

-- CreateIndex
CREATE INDEX "correspondences_registeredAt_idx" ON "correspondences"("registeredAt");

-- CreateIndex
CREATE INDEX "correspondences_createdById_idx" ON "correspondences"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "correspondences_year_sequence_key" ON "correspondences"("year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "route_sheets_correspondenceId_key" ON "route_sheets"("correspondenceId");

-- CreateIndex
CREATE INDEX "route_recipients_userId_idx" ON "route_recipients"("userId");

-- CreateIndex
CREATE INDEX "route_recipients_departmentId_idx" ON "route_recipients"("departmentId");

-- CreateIndex
CREATE INDEX "route_recipients_status_idx" ON "route_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "route_recipients_routeSheetId_sequence_key" ON "route_recipients"("routeSheetId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storageKey_key" ON "attachments"("storageKey");

-- CreateIndex
CREATE INDEX "attachments_correspondenceId_idx" ON "attachments"("correspondenceId");

-- CreateIndex
CREATE INDEX "tracking_events_correspondenceId_occurredAt_idx" ON "tracking_events"("correspondenceId", "occurredAt");

-- CreateIndex
CREATE INDEX "tracking_events_recipientId_idx" ON "tracking_events"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "public_tracking_tokens_tokenHash_key" ON "public_tracking_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "public_tracking_tokens_correspondenceId_idx" ON "public_tracking_tokens"("correspondenceId");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_correspondenceId_idx" ON "notification_logs"("correspondenceId");

-- CreateIndex
CREATE INDEX "audit_logs_occurredAt_idx" ON "audit_logs"("occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_sheets" ADD CONSTRAINT "route_sheets_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_sheets" ADD CONSTRAINT "route_sheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_recipients" ADD CONSTRAINT "route_recipients_routeSheetId_fkey" FOREIGN KEY ("routeSheetId") REFERENCES "route_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_recipients" ADD CONSTRAINT "route_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_recipients" ADD CONSTRAINT "route_recipients_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "route_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_tracking_tokens" ADD CONSTRAINT "public_tracking_tokens_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_routeRecipientId_fkey" FOREIGN KEY ("routeRecipientId") REFERENCES "route_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

