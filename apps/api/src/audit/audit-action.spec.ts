import { deriveAuditAction } from './audit-action';

describe('deriveAuditAction', () => {
  it('deriva acciones de dominio a partir del método y la ruta', () => {
    expect(deriveAuditAction('POST', '/api/v1/correspondences')).toBe('correspondence.create');
    expect(deriveAuditAction('POST', '/api/v1/correspondences/abc/attachments')).toBe(
      'correspondence.attachment_upload',
    );
    expect(deriveAuditAction('POST', '/api/v1/correspondences/abc/archive')).toBe(
      'correspondence.archive',
    );
    expect(deriveAuditAction('POST', '/api/v1/correspondences/abc/public-code')).toBe(
      'correspondence.public_code_rotate',
    );
    expect(deriveAuditAction('POST', '/api/v1/route-recipients/abc/receive')).toBe(
      'route_recipient.receive',
    );
    expect(deriveAuditAction('PATCH', '/api/v1/route-recipients/abc/action')).toBe(
      'route_recipient.classify',
    );
    expect(deriveAuditAction('POST', '/api/v1/route-recipients/abc/dispatch')).toBe(
      'route_recipient.dispatch',
    );
    expect(deriveAuditAction('PATCH', '/api/v1/users/abc')).toBe('user.update');
    expect(deriveAuditAction('POST', '/api/v1/tracking/overdue/notify')).toBe(
      'tracking.overdue_notify',
    );
    expect(deriveAuditAction('GET', '/api/v1/correspondences')).toBe('http.get');
  });

  it('resuelve subacciones sin confundir identificadores', () => {
    expect(deriveAuditAction('POST', '/api/v1/users/123/reset-password')).toBe(
      'user.reset_password',
    );
  });
});
