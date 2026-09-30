export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const targetUrl = (process.env.VITE_GOTENBERG_URL || 'http://localhost:3000').replace(/\/+$/, '');

  try {
    const upstreamResp = await fetch(`${targetUrl}/forms/libreoffice/convert`, {
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'] || '',
      },
      body: req,
      // @ts-ignore
      duplex: 'half',
    });

    res.status(upstreamResp.status);
    const buffer = Buffer.from(await upstreamResp.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(buffer);
  } catch (err) {
    return res.status(502).json({ error: 'Gotenberg proxy error', details: err?.message || String(err) });
  }
}
