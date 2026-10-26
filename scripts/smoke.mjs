#!/usr/bin/env node
/**
 * Prueba de humo de extremo a extremo contra la API en ejecución.
 *
 * Requiere: base migrada y sembrada, API escuchando en http://localhost:3001.
 * Uso: node scripts/smoke.mjs
 */
const BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const PASSWORD = 'Unior2026*';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` :: ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

async function request(method, path, { token, body, form, raw = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  if (raw) return response;
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}

async function login(email) {
  const { status, data } = await request('POST', '/auth/login', {
    body: { email, password: PASSWORD },
  });
  if (status !== 200)
    throw new Error(`Login falló para ${email}: ${status} ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log(`\nPrueba de humo contra ${BASE}\n`);

  const admin = await login('admin@unior.edu.bo');
  const recepcion = await login('recepcion@unior.edu.bo');
  const juridico = await login('juridico@unior.edu.bo');
  const rrhh = await login('rrhh@unior.edu.bo');
  const seguimiento = await login('seguimiento@unior.edu.bo');

  console.log('Autenticación');
  check('login devuelve token y usuario', Boolean(admin.accessToken && admin.user?.email));
  const health = await request('GET', '/health');
  check(
    'health público responde ok con base de datos arriba',
    health.status === 200 && health.data.status === 'ok' && health.data.database === 'up',
    `status ${health.status}`,
  );
  const badLogin = await request('POST', '/auth/login', {
    body: { email: 'admin@unior.edu.bo', password: 'incorrecta123' },
  });
  check('credenciales inválidas → 401', badLogin.status === 401, `status ${badLogin.status}`);
  const me = await request('GET', '/users/me', { token: juridico.accessToken });
  check(
    'GET /users/me devuelve el perfil',
    me.status === 200 && me.data.email === 'juridico@unior.edu.bo',
  );

  console.log('\nCatálogos y panel');
  const departments = await request('GET', '/departments', { token: recepcion.accessToken });
  check(
    'GET /departments devuelve catálogo',
    departments.status === 200 && departments.data.length >= 4,
  );
  const stats = await request('GET', '/tracking/stats', { token: admin.accessToken });
  check(
    'GET /tracking/stats devuelve métricas',
    stats.status === 200 &&
      typeof stats.data.total === 'number' &&
      typeof stats.data.overdue === 'number',
  );

  console.log('\nRegistro de correspondencia');
  const academica = departments.data.find((department) => department.code === 'ACADEMICA');
  const create = await request('POST', '/correspondences', {
    token: recepcion.accessToken,
    body: {
      direction: 'EXTERNA',
      subject: 'Prueba automatizada de registro y seguimiento',
      summary: 'Documento generado por la prueba de humo.',
      senderName: 'Remitente de Prueba',
      senderOrganization: 'Entidad Externa de Prueba',
      senderReference: 'CITE: TEST-001',
      recipients: [
        { userId: juridico.user.id, internalNotes: 'Tramo de prueba' },
        { departmentId: academica.id },
      ],
    },
  });
  check(
    'POST /correspondences crea la correspondencia',
    create.status === 201,
    JSON.stringify(create.data).slice(0, 300),
  );
  const correspondenceId = create.data?.correspondence?.id;
  const trackingNumber = create.data?.correspondence?.trackingNumber;
  const publicCode = create.data?.publicAccess?.code;
  check(
    'el correlativo tiene formato COR-AAAA-NNNNNN',
    /^COR-\d{4}-\d{6}$/.test(trackingNumber ?? ''),
    trackingNumber,
  );
  check(
    'se devuelve el código público una sola vez',
    /^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(publicCode ?? ''),
    publicCode,
  );
  check(
    'la hoja de ruta tiene 2 tramos ordenados',
    create.data?.correspondence?.routeSheet?.recipients?.length === 2,
  );

  const detail = await request('GET', `/correspondences/${correspondenceId}`, {
    token: juridico.accessToken,
  });
  check('el destinatario accede al detalle', detail.status === 200);
  check(
    'el detalle expone historial y hoja de ruta',
    Array.isArray(detail.data?.events) &&
      detail.data.events.length >= 1 &&
      detail.data.routeSheet?.recipients?.length === 2,
  );

  const byNumber = await request('GET', `/correspondences/by-number/${trackingNumber}`, {
    token: recepcion.accessToken,
  });
  check(
    'búsqueda interna por correlativo',
    byNumber.status === 200 && byNumber.data.id === correspondenceId,
  );

  const forbidden = await request('GET', `/correspondences/${correspondenceId}`, {
    token: rrhh.accessToken,
  });
  check('usuario fuera del ámbito → 403', forbidden.status === 403, `status ${forbidden.status}`);

  const badCreate = await request('POST', '/correspondences', {
    token: recepcion.accessToken,
    body: {
      direction: 'INTERNA',
      subject: 'AB',
      senderName: 'X',
      recipients: [],
    },
  });
  check('validación de DTO → 422', badCreate.status === 422, `status ${badCreate.status}`);
  check(
    'los errores de validación indican el campo',
    Array.isArray(badCreate.data?.details) &&
      badCreate.data.details.some((item) => item.field === 'subject'),
    JSON.stringify(badCreate.data?.details),
  );

  const recepcionCreate = await request('POST', '/correspondences', {
    token: juridico.accessToken,
    body: {
      direction: 'INTERNA',
      subject: 'Intento no autorizado de registro',
      senderName: 'Destinatario',
      recipients: [{ departmentId: academica.id }],
    },
  });
  check(
    'rol sin permiso de registro → 403',
    recepcionCreate.status === 403,
    `status ${recepcionCreate.status}`,
  );

  console.log('\nFlujo del tramo');
  const recipients = detail.data.routeSheet.recipients;
  const firstRecipient = recipients.find((recipient) => recipient.sequence === 1);
  const secondRecipient = recipients.find((recipient) => recipient.sequence === 2);

  const wrongUser = await request('POST', `/route-recipients/${firstRecipient.id}/receive`, {
    token: rrhh.accessToken,
  });
  check('tramo ajeno → 403', wrongUser.status === 403, `status ${wrongUser.status}`);

  const dispatchBeforeClassify = await request(
    'POST',
    `/route-recipients/${firstRecipient.id}/dispatch`,
    {
      token: juridico.accessToken,
      body: {},
    },
  );
  check(
    'despacho sin clasificación → 422',
    dispatchBeforeClassify.status === 422,
    `status ${dispatchBeforeClassify.status}`,
  );

  const receive = await request('POST', `/route-recipients/${firstRecipient.id}/receive`, {
    token: juridico.accessToken,
  });
  check(
    'recepción registrada con fecha del servidor',
    receive.status === 200 && Boolean(receive.data?.recipient?.receivedAt),
  );
  const receiveAgain = await request('POST', `/route-recipients/${firstRecipient.id}/receive`, {
    token: juridico.accessToken,
  });
  check('recepción duplicada → 422', receiveAgain.status === 422, `status ${receiveAgain.status}`);

  const classify = await request('PATCH', `/route-recipients/${firstRecipient.id}/action`, {
    token: juridico.accessToken,
    body: { action: 'URGENTE' },
  });
  check(
    'clasificación urgente registrada',
    classify.status === 200 && classify.data?.recipient?.action === 'URGENTE',
  );

  const dispatch = await request('POST', `/route-recipients/${firstRecipient.id}/dispatch`, {
    token: juridico.accessToken,
    body: { internalNotes: 'Respondido en prueba de humo' },
  });
  check(
    'salida registrada',
    dispatch.status === 200 && Boolean(dispatch.data?.recipient?.dispatchedAt),
  );
  check(
    'el tramo queda con duración calculada',
    (dispatch.data?.recipient?.durationMinutes ?? 0) >= 0,
  );

  const secondReceive = await request('POST', `/route-recipients/${secondRecipient.id}/receive`, {
    token: juridico.accessToken,
  });
  check(
    'un tramo de otro departamento no puede operarse por usuario ajeno',
    secondReceive.status === 403,
    `status ${secondReceive.status}`,
  );

  console.log('\nConsulta pública');
  const publicOk = await request(
    'GET',
    `/tracking/public?number=${encodeURIComponent(trackingNumber)}&code=${encodeURIComponent(publicCode)}`,
  );
  check(
    'consulta pública con código correcto',
    publicOk.status === 200 && publicOk.data.publicStatus === 'EN_CURSO',
    `status ${publicOk.status}`,
  );
  check(
    'la vista pública no expone remitente ni asunto',
    publicOk.data && !('senderName' in publicOk.data) && !('subject' in publicOk.data),
  );

  const publicBadCode = await request(
    'GET',
    `/tracking/public?number=${encodeURIComponent(trackingNumber)}&code=ZZZZ-ZZZZ`,
  );
  check('código incorrecto → 404 genérico', publicBadCode.status === 404);
  const publicUnknown = await request(
    'GET',
    '/tracking/public?number=COR-2026-999999&code=ZZZZ-ZZZZ',
  );
  check(
    'correlativo inexistente → mismo error genérico',
    publicUnknown.status === 404 && publicUnknown.data.code === 'NOT_FOUND',
  );

  console.log('\nAnexos');
  const pdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  );
  const form = new FormData();
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), 'documento-prueba.pdf');
  const upload = await request('POST', `/correspondences/${correspondenceId}/attachments`, {
    token: recepcion.accessToken,
    form,
  });
  check('carga de anexo PDF', upload.status === 201, JSON.stringify(upload.data).slice(0, 200));
  const attachmentId = upload.data?.id;
  const download = await request('GET', `/attachments/${attachmentId}/download`, {
    token: juridico.accessToken,
    raw: true,
  });
  check('descarga autorizada del anexo', download.status === 200);
  const anonDownload = await fetch(`${BASE}/attachments/${attachmentId}/download`);
  check('el anexo no es público', anonDownload.status === 401, `status ${anonDownload.status}`);

  const badFile = new FormData();
  badFile.append(
    'file',
    new Blob([Buffer.from('#!/bin/sh\necho hola')], { type: 'application/pdf' }),
    'malicioso.pdf',
  );
  const rejected = await request('POST', `/correspondences/${correspondenceId}/attachments`, {
    token: recepcion.accessToken,
    form: badFile,
  });
  check(
    'archivo con contenido no permitido → 415',
    rejected.status === 415,
    `status ${rejected.status}`,
  );

  console.log('\nDemoras y auditoría');
  const overdue = await request('GET', '/tracking/overdue', { token: seguimiento.accessToken });
  check(
    'GET /tracking/overdue devuelve umbral y tramos demorados',
    overdue.status === 200 &&
      typeof overdue.data.thresholdHours === 'number' &&
      Array.isArray(overdue.data.data),
  );
  check(
    'se detecta al menos un tramo demorado en los datos demo',
    overdue.data.data.length > 0,
    `tramos: ${overdue.data.data.length}`,
  );
  const overdueAsDestinatario = await request('GET', '/tracking/overdue', {
    token: rrhh.accessToken,
  });
  check(
    'demoras restringidas por rol → 403',
    overdueAsDestinatario.status === 403,
    `status ${overdueAsDestinatario.status}`,
  );

  const notify = await request('POST', '/tracking/overdue/notify', {
    token: seguimiento.accessToken,
  });
  check(
    'alerta de demora no bloquea sin SMTP (se registra como omitida)',
    notify.status === 200 && typeof notify.data.checked === 'number' && notify.data.failed === 0,
    JSON.stringify(notify.data),
  );
  const notifications = await request('GET', '/notifications', { token: admin.accessToken });
  check(
    'bitácora de notificaciones disponible para ADMIN',
    notifications.status === 200 && Array.isArray(notifications.data.data),
  );

  const audit = await request('GET', '/audit', { token: admin.accessToken });
  check('auditoría accesible para ADMIN', audit.status === 200 && Array.isArray(audit.data.data));
  check(
    'la auditoría registró el alta',
    audit.data.data.some((entry) => entry.action === 'correspondence.create'),
  );
  const auditForbidden = await request('GET', '/audit', { token: juridico.accessToken });
  check(
    'auditoría restringida → 403',
    auditForbidden.status === 403,
    `status ${auditForbidden.status}`,
  );

  console.log('\nRotación de código público y administración');
  const rotated = await request('POST', `/correspondences/${correspondenceId}/public-code`, {
    token: recepcion.accessToken,
  });
  check(
    'rotación del código público',
    rotated.status === 200 && /^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(rotated.data.code ?? ''),
  );
  const oldCode = await request(
    'GET',
    `/tracking/public?number=${encodeURIComponent(trackingNumber)}&code=${encodeURIComponent(publicCode)}`,
  );
  check('el código anterior queda revocado', oldCode.status === 404, `status ${oldCode.status}`);
  const newCode = await request(
    'GET',
    `/tracking/public?number=${encodeURIComponent(trackingNumber)}&code=${encodeURIComponent(rotated.data.code)}`,
  );
  check('el código rotado permite la consulta pública', newCode.status === 200);

  const usersAsRecepcion = await request('GET', '/users', { token: recepcion.accessToken });
  check(
    'listado de usuarios restringido a ADMIN',
    usersAsRecepcion.status === 403,
    `status ${usersAsRecepcion.status}`,
  );
  const stamp = Date.now();
  const createdUser = await request('POST', '/users', {
    token: admin.accessToken,
    body: {
      name: 'Usuario de Prueba',
      email: `prueba.${stamp}@unior.edu.bo`,
      password: 'Prueba2026*',
      role: 'DESTINATARIO',
      departmentId: academica.id,
    },
  });
  check(
    'alta de usuario por ADMIN',
    createdUser.status === 201,
    JSON.stringify(createdUser.data).slice(0, 200),
  );
  const updatedUser = await request('PATCH', `/users/${createdUser.data.id}`, {
    token: admin.accessToken,
    body: { role: 'SEGUIMIENTO', active: false },
  });
  check(
    'edición de rol y estado',
    updatedUser.status === 200 &&
      updatedUser.data.role === 'SEGUIMIENTO' &&
      updatedUser.data.active === false,
  );
  const resetPassword = await request('POST', `/users/${createdUser.data.id}/reset-password`, {
    token: admin.accessToken,
    body: { password: 'OtraClave2026*' },
  });
  check(
    'restablecimiento de contraseña',
    resetPassword.status === 204,
    `status ${resetPassword.status}`,
  );
  const duplicateUser = await request('POST', '/users', {
    token: admin.accessToken,
    body: {
      name: 'Duplicado',
      email: createdUser.data.email,
      password: 'Prueba2026*',
      role: 'DESTINATARIO',
    },
  });
  check('correo duplicado → 409', duplicateUser.status === 409, `status ${duplicateUser.status}`);

  console.log('\nArchivo lógico');
  const archive = await request('POST', `/correspondences/${correspondenceId}/archive`, {
    token: seguimiento.accessToken,
    body: { reason: 'Cierre de prueba' },
  });
  check(
    'archivado lógico',
    archive.status === 200 &&
      archive.data.isArchived === true &&
      archive.data.currentStatus === 'ARCHIVADA',
  );

  console.log('\nSesión');
  const refreshed = await request('POST', '/auth/refresh', {
    body: { refreshToken: juridico.refreshToken },
  });
  check(
    'refresh rotativo devuelve nuevos tokens',
    refreshed.status === 200 && refreshed.data.refreshToken !== juridico.refreshToken,
  );
  const reused = await request('POST', '/auth/refresh', {
    body: { refreshToken: juridico.refreshToken },
  });
  check(
    'reutilización del refresh anterior → 401',
    reused.status === 401,
    `status ${reused.status}`,
  );
  const logout = await request('POST', '/auth/logout', {
    body: { refreshToken: refreshed.data.refreshToken },
  });
  check('logout revoca la sesión', logout.status === 204);
  const afterLogout = await request('POST', '/auth/refresh', {
    body: { refreshToken: refreshed.data.refreshToken },
  });
  check('refresh tras logout → 401', afterLogout.status === 401, `status ${afterLogout.status}`);

  const swagger = await fetch('http://localhost:3001/api/docs-json');
  check('Swagger/OpenAPI disponible', swagger.status === 200);

  console.log(`\nResultado: ${passed} correctas, ${failed} fallidas`);
  if (failed > 0) {
    console.log('\nFallos:');
    for (const failure of failures) console.log(` - ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nLa prueba de humo no pudo completarse:', error);
  process.exitCode = 1;
});
