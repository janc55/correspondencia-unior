import { NextRequest } from 'next/server';

/**
 * Proxy same-origin hacia la API NestJS.
 *
 * El navegador siempre llama a `/api/v1/...` en el mismo dominio del frontend:
 *  - no se requiere CORS ni exponer la API públicamente,
 *  - no hay variables `NEXT_PUBLIC_*` quemadas en el build (la URL real se
 *    resuelve en tiempo de ejecución con `API_INTERNAL_URL`),
 *  - los binarios (anexos) y los cuerpos multipart se reenvían sin transformar.
 *
 * Local: API_INTERNAL_URL=http://localhost:3001/api/v1
 * Dokploy: la URL interna del servicio API (o su dominio público) + /api/v1.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE_URL = (process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1').replace(
  /\/+$/,
  '',
);

const REQUEST_HEADERS_TO_SKIP = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

const RESPONSE_HEADERS_TO_SKIP = new Set([
  'content-encoding',
  'content-length',
  'connection',
  'keep-alive',
  'transfer-encoding',
]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = `${API_BASE_URL}/${path.map((segment) => encodeURIComponent(segment)).join('/')}${
    request.nextUrl.search
  }`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!REQUEST_HEADERS_TO_SKIP.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  let body: ArrayBuffer | undefined;
  if (hasBody) {
    try {
      body = await request.arrayBuffer();
    } catch {
      return Response.json(
        { statusCode: 400, code: 'BAD_REQUEST', message: 'No se pudo leer el cuerpo de la petición.' },
        { status: 400 },
      );
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error(`[proxy] No se pudo contactar la API (${request.method} ${target}):`, error);
    return Response.json(
      {
        statusCode: 502,
        code: 'BAD_GATEWAY',
        message: 'El servicio de correspondencia no está disponible en este momento.',
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!RESPONSE_HEADERS_TO_SKIP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });
  responseHeaders.set('X-Content-Type-Options', 'nosniff');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
  proxy as OPTIONS,
  proxy as HEAD,
};
