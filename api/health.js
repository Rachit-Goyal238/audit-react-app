export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const targetUrl = (process.env.VITE_GOTENBERG_URL || 'http://localhost:3000').replace(/\/+$/, '');
  try {
    const upstream = await fetch(`${targetUrl}/health`);
    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Gotenberg unreachable', details: err?.message || String(err) });
  }
}
