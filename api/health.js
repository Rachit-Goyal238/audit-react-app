export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientUrl = req.headers['x-gotenberg-url'];
  const targetUrl = (
    clientUrl && typeof clientUrl === 'string' && !clientUrl.includes('localhost')
      ? clientUrl
      : (process.env.VITE_GOTENBERG_URL || 'http://localhost:3000')
  ).replace(/\/+$/, '');

  try {
    const upstream = await fetch(`${targetUrl}/health`);
    const data = await upstream.json().catch(() => ({ status: 'healthy' }));
    return res.status(upstream.status).json({
      ...data,
      engine: 'Gotenberg LibreOffice (Cloud Proxy)',
      targetUrl,
    });
  } catch (err) {
    return res.status(502).json({
      error: 'Gotenberg unreachable',
      details: err?.message || String(err),
      targetUrl,
    });
  }
}
