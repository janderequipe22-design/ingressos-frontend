// Next.js API route to proxy Mercado Pago webhooks to the backend
// This ensures we always have a stable HTTPS public URL (PUBLIC_BASE_URL) that MP can call

export default async function handler(req, res) {
  try {
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const url = `${backendBase}/api/payments/mp/webhook`;

    const method = req.method || 'POST';
    const headers = { 'content-type': req.headers['content-type'] || 'application/json' };

    const init = { method, headers };
    if (method !== 'GET') {
      init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const targetUrl = method === 'GET' && req.url.includes('?')
      ? `${url}${req.url.substring(req.url.indexOf('?'))}`
      : url;

    await fetch(targetUrl, init);
    // Always respond 200 quickly to MP
    res.status(200).end();
  } catch (e) {
    // Never propagate errors to MP to avoid retries storms
    res.status(200).end();
  }
}
