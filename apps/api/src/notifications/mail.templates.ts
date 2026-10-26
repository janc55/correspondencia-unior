/**
 * Plantillas de correo en texto plano y HTML simple. No se incluyen datos
 * sensibles: solo el correlativo, el asunto y la indicación de acción.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title: string, body: string): string {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;color:#0F172A;background:#F6F8FB;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
    <div style="background:#0B2A5B;color:#ffffff;padding:16px 24px;font-size:16px;font-weight:600">UNIOR · Correspondencia</div>
    <div style="padding:24px">
      <h1 style="font-size:19px;margin:0 0 12px">${escapeHtml(title)}</h1>
      ${body}
      <p style="color:#64748B;font-size:12px;margin-top:24px">Mensaje automático del Sistema de Registro y Seguimiento de Correspondencia. No responda a este correo.</p>
    </div>
  </div>
</div>`;
}

export function recipientAssignedTemplate(params: {
  recipientName: string;
  trackingNumber: string;
  subject: string;
  sequence: number;
}): { subject: string; text: string; html: string } {
  const subject = `Nueva correspondencia asignada: ${params.trackingNumber}`;
  const text = `Estimado/a ${params.recipientName}:

Se le asignó la correspondencia ${params.trackingNumber} (tramo ${params.sequence}).
Asunto: ${params.subject}

Ingrese al sistema para registrar la recepción, clasificar el trámite y registrar la salida.

Sistema de Correspondencia UNIOR`;

  const html = layout(
    'Nueva correspondencia asignada',
    `
      <p>Estimado/a <strong>${escapeHtml(params.recipientName)}</strong>:</p>
      <p>Se le asignó la correspondencia <strong>${escapeHtml(params.trackingNumber)}</strong> (tramo ${params.sequence}).</p>
      <p><strong>Asunto:</strong> ${escapeHtml(params.subject)}</p>
      <p>Ingrese al sistema para registrar la recepción, clasificar el trámite y registrar la salida.</p>
      <p style="margin-top:20px"><a href="#" style="color:#1D4E89">Abrir el sistema de correspondencia</a></p>`,
  );

  return { subject, text, html };
}

export function overdueEmailTemplate(params: {
  thresholdHours: number;
  items: Array<{
    trackingNumber: string;
    subject: string;
    assignee: string;
    hoursElapsed: number;
    sequence: number;
  }>;
}): { subject: string; text: string; html: string } {
  const count = params.items.length;
  const subject = `Alerta de demora: ${count} tramo(s) superan ${params.thresholdHours} horas`;
  const lines = params.items.map(
    (item) =>
      `- ${item.trackingNumber} · tramo ${item.sequence} · ${item.assignee} · ${item.hoursElapsed} h · ${item.subject}`,
  );

  const text = `Tramos con demora superior a ${params.thresholdHours} horas:

${lines.join('\n')}

Sistema de Correspondencia UNIOR`;

  const rows = params.items
    .map(
      (item) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${escapeHtml(item.trackingNumber)}</td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${item.sequence}</td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${escapeHtml(item.assignee)}</td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${item.hoursElapsed} h</td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${escapeHtml(item.subject)}</td>
      </tr>`,
    )
    .join('');

  const html = layout(
    `Tramos con demora superior a ${params.thresholdHours} horas`,
    `<p>Se identificaron <strong>${count}</strong> tramo(s) abiertos por encima del umbral configurado.</p>
     <table style="width:100%;border-collapse:collapse;font-size:13px">
       <thead><tr>
         <th style="text-align:left;padding:8px;border-bottom:2px solid #CBD5E1">Correlativo</th>
         <th style="text-align:left;padding:8px;border-bottom:2px solid #CBD5E1">Tramo</th>
         <th style="text-align:left;padding:8px;border-bottom:2px solid #CBD5E1">Destinatario</th>
         <th style="text-align:left;padding:8px;border-bottom:2px solid #CBD5E1">Horas</th>
         <th style="text-align:left;padding:8px;border-bottom:2px solid #CBD5E1">Asunto</th>
       </tr></thead>
       <tbody>${rows}</tbody>
     </table>`,
  );

  return { subject, text, html };
}
