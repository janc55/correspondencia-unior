import { RouteRecipientStatus } from '@prisma/client';
import { publicRecipientLabel, resolvePublicStatus } from './public-tracking.service';

const { PENDIENTE, RECIBIDO, CLASIFICADO, DESPACHADO } = RouteRecipientStatus;

describe('estado público de la correspondencia', () => {
  it('oculta el detalle interno y resume el avance', () => {
    expect(resolvePublicStatus(false, [PENDIENTE, PENDIENTE])).toBe('RECIBIDO');
    expect(resolvePublicStatus(false, [DESPACHADO, PENDIENTE])).toBe('EN_CURSO');
    expect(resolvePublicStatus(false, [RECIBIDO])).toBe('EN_CURSO');
    expect(resolvePublicStatus(false, [DESPACHADO, DESPACHADO])).toBe('FINALIZADO');
    expect(resolvePublicStatus(true, [DESPACHADO])).toBe('ARCHIVADO');
  });

  it('etiqueta cada tramo sin revelar a su responsable', () => {
    expect(publicRecipientLabel(PENDIENTE)).toBe('Pendiente');
    expect(publicRecipientLabel(RECIBIDO)).toBe('En proceso');
    expect(publicRecipientLabel(CLASIFICADO)).toBe('En proceso');
    expect(publicRecipientLabel(DESPACHADO)).toBe('Finalizado');
  });
});
