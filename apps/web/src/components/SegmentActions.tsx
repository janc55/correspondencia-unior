'use client';

import clsx from 'clsx';
import { Inbox, Send, Tags } from 'lucide-react';
import { useState } from 'react';

import { segmentActions, SEGMENT_VERB_LABELS } from '@/lib/actions';
import { api } from '@/lib/api';
import { RECIPIENT_ACTION_DESCRIPTIONS, RECIPIENT_ACTION_LABELS } from '@/lib/labels';
import type { RecipientAction, RouteRecipientStatus, SegmentVerb } from '@/lib/types';
import { ApiErrorAlert } from './Alert';
import { Button } from './Button';
import { Textarea } from './Input';
import { Modal } from './Modal';
import { useToast } from './Toast';

const VERB_ICONS: Record<SegmentVerb, typeof Inbox> = {
  receive: Inbox,
  classify: Tags,
  dispatch: Send,
};

const VERB_VARIANTS: Record<SegmentVerb, 'primary' | 'secondary'> = {
  receive: 'primary',
  classify: 'secondary',
  dispatch: 'secondary',
};

const ACTIONS: RecipientAction[] = ['URGENTE', 'ARCHIVAR', 'PREPARAR_RESPUESTA'];

export interface SegmentLike {
  id: string;
  sequence?: number;
  status: RouteRecipientStatus;
  canAct: boolean;
  allowedActions?: string[];
}

export interface SegmentActionsProps {
  segment: SegmentLike;
  onDone: () => void;
  /** Texto de ayuda cuando el usuario no puede operar el tramo. */
  showBlockedHint?: boolean;
  className?: string;
}

export function SegmentActions({
  segment,
  onDone,
  showBlockedHint = true,
  className,
}: SegmentActionsProps) {
  const toast = useToast();
  const [dialog, setDialog] = useState<SegmentVerb | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [chosenAction, setChosenAction] = useState<RecipientAction | null>(null);
  const [notes, setNotes] = useState('');

  const actions = segmentActions(segment.status, segment.canAct, segment.allowedActions);

  const open = (verb: SegmentVerb) => {
    setError(null);
    setChosenAction(null);
    setNotes('');
    setDialog(verb);
  };

  const close = () => {
    if (busy) return;
    setDialog(null);
    setError(null);
  };

  const finish = (message: string) => {
    toast.success(message);
    setDialog(null);
    setError(null);
    onDone();
  };

  const runReceive = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.recipients.receive(segment.id);
      finish(
        segment.sequence
          ? `Recepción registrada en el tramo ${segment.sequence}.`
          : 'Recepción registrada.',
      );
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const runClassify = async () => {
    if (!chosenAction) return;
    setBusy(true);
    setError(null);
    try {
      await api.recipients.classify(segment.id, chosenAction);
      finish(`Trámite clasificado como "${RECIPIENT_ACTION_LABELS[chosenAction]}".`);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const runDispatch = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.recipients.dispatch(segment.id, notes);
      finish('Salida registrada. Se notificará al siguiente tramo si corresponde.');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  if (actions.length === 0) {
    if (!showBlockedHint || segment.status === 'DESPACHADO') return null;
    return (
      <p className={clsx('text-xs text-slate-500', className)}>
        Solo el destinatario asignado puede registrar acciones sobre este tramo.
      </p>
    );
  }

  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)}>
      {actions.map((verb) => {
        const Icon = VERB_ICONS[verb];
        return (
          <Button
            key={verb}
            variant={VERB_VARIANTS[verb]}
            size="sm"
            onClick={() => open(verb)}
            icon={<Icon className="h-4 w-4" aria-hidden="true" />}
          >
            {SEGMENT_VERB_LABELS[verb]}
          </Button>
        );
      })}

      {/* Recepción */}
      <Modal
        open={dialog === 'receive'}
        onClose={close}
        title="Registrar recepción"
        description={
          segment.sequence ? `Tramo ${segment.sequence} · recepción del documento` : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void runReceive()} loading={busy}>
              Confirmar recepción
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Se registrará la fecha y hora de recepción en el servidor. Esta marca no puede
            modificarse manualmente.
          </p>
          {error ? <ApiErrorAlert error={error} /> : null}
        </div>
      </Modal>

      {/* Clasificación */}
      <Modal
        open={dialog === 'classify'}
        onClose={close}
        title="Clasificar el trámite"
        description="Seleccione el destino que tendrá esta correspondencia en su tramo."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void runClassify()} loading={busy} disabled={!chosenAction}>
              Registrar clasificación
            </Button>
          </>
        }
      >
        <fieldset className="space-y-2">
          <legend className="sr-only">Acción de clasificación</legend>
          {ACTIONS.map((action) => {
            const selected = chosenAction === action;
            return (
              <label
                key={action}
                className={clsx(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  selected
                    ? 'border-unior-600 bg-unior-50/60 ring-1 ring-unior-600'
                    : 'border-line bg-white hover:bg-slate-50',
                )}
              >
                <input
                  type="radio"
                  name={`classify-${segment.id}`}
                  value={action}
                  checked={selected}
                  onChange={() => setChosenAction(action)}
                  className="mt-1 h-4 w-4 accent-unior-700"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    {RECIPIENT_ACTION_LABELS[action]}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {RECIPIENT_ACTION_DESCRIPTIONS[action]}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {error ? <ApiErrorAlert error={error} className="mt-3" /> : null}
      </Modal>

      {/* Salida */}
      <Modal
        open={dialog === 'dispatch'}
        onClose={close}
        title="Registrar salida"
        description="El servidor fijará la fecha y hora de salida del tramo."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void runDispatch()} loading={busy}>
              Confirmar salida
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Nota de salida (opcional)"
            hint="Se guarda en el historial del tramo. Máximo 1000 caracteres."
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Por ejemplo: respuesta remitida a ventanilla única."
          />
          <p className="text-xs text-slate-500">
            Si todos los tramos quedan despachados, la correspondencia pasa a estado Atendida.
          </p>
          {error ? <ApiErrorAlert error={error} /> : null}
        </div>
      </Modal>
    </div>
  );
}
