'use client';

import clsx from 'clsx';
import { AlertTriangle, Download, FileImage, FileText, Paperclip, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { api, describeError } from '@/lib/api';
import { formatDateTime, formatFileSize } from '@/lib/format';
import type { Attachment } from '@/lib/types';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Spinner } from './Loading';
import { useToast } from './Toast';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) return `"${file.name}" supera el máximo de 10 MB.`;
  const type = file.type || '';
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extensionAllowed = ['pdf', 'jpg', 'jpeg', 'png'].includes(extension);
  if (!ALLOWED_MIME.includes(type) && !extensionAllowed) {
    return `"${file.name}" no es un formato permitido. Use PDF, JPG o PNG.`;
  }
  return null;
}

export interface AttachmentListProps {
  attachments: Attachment[];
  correspondenceId?: string;
  canUpload?: boolean;
  onUploaded?: () => void;
  emptyDescription?: string;
}

export function AttachmentList({
  attachments,
  correspondenceId,
  canUpload = false,
  onUploaded,
  emptyDescription = 'Los anexos escaneados aparecerán aquí.',
}: AttachmentListProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.id);
    try {
      const { blob, filename } = await api.attachments.download(
        attachment.id,
        attachment.originalName,
      );
      saveBlob(blob, filename || attachment.originalName);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !correspondenceId) return;
    const files = Array.from(fileList);
    setUploadError(null);

    for (const file of files) {
      const problem = validateFile(file);
      if (problem) {
        setUploadError(problem);
        toast.error(problem);
        continue;
      }
      setUploading(true);
      try {
        await api.correspondences.uploadAttachment(correspondenceId, file);
        toast.success(`Anexo "${file.name}" cargado.`);
        onUploaded?.();
      } catch (error) {
        const message = describeError(error);
        setUploadError(message);
        toast.error(message);
      } finally {
        setUploading(false);
      }
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {canUpload && correspondenceId ? (
        <div className="rounded-lg border border-dashed border-line bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Paperclip className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-slate-700">Adjuntar anexo escaneado</p>
                <p className="text-xs text-slate-500">PDF, JPG o PNG · máximo 10 MB por archivo.</p>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(event) => void handleFiles(event.target.files)}
              aria-label="Seleccionar anexos"
            />
            <Button
              variant="secondary"
              size="sm"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
              icon={<Upload className="h-4 w-4" aria-hidden="true" />}
            >
              Seleccionar archivos
            </Button>
          </div>
          {uploadError ? (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {uploadError}
            </p>
          ) : null}
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <EmptyState icon={Paperclip} title="Sin anexos" description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {attachments.map((attachment) => {
            const isImage = attachment.mimeType?.startsWith('image/');
            const Icon = isImage ? FileImage : FileText;
            return (
              <li
                key={attachment.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {attachment.originalName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(attachment.sizeBytes)} ·{' '}
                      {formatDateTime(attachment.createdAt)}
                      {attachment.uploadedBy?.name ? ` · ${attachment.uploadedBy.name}` : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleDownload(attachment)}
                  disabled={downloadingId === attachment.id}
                  icon={
                    downloadingId === attachment.id ? (
                      <Spinner className="h-3.5 w-3.5" label="Descargando" />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden="true" />
                    )
                  }
                  aria-label={`Descargar ${attachment.originalName}`}
                  className={clsx(downloadingId === attachment.id && 'opacity-80')}
                >
                  Descargar
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        La descarga se realiza con su sesión autenticada; los anexos no tienen URL pública.
      </p>
    </div>
  );
}
