export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
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

  const clientUrl = req.headers['x-gotenberg-url'];
  const targetUrl = (
    clientUrl && typeof clientUrl === 'string' && !clientUrl.includes('localhost')
      ? clientUrl
      : (process.env.VITE_GOTENBERG_URL || 'http://localhost:3000')
  ).replace(/\/+$/, '');

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyBuffer = Buffer.concat(chunks);

    const upstreamResp = await fetch(`${targetUrl}/forms/libreoffice/convert`, {
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'] || '',
      },
      body: bodyBuffer,
    });

    if (!upstreamResp.ok) {
      const errText = await upstreamResp.text().catch(() => '');
      return res.status(upstreamResp.status).json({
        error: `Gotenberg error (HTTP ${upstreamResp.status})`,
        details: errText,
        targetUrl,
      });
    }

    const pdfBuffer = Buffer.from(await upstreamResp.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    return res.status(502).json({
      error: 'Gotenberg proxy error',
      details: err?.message || String(err),
      targetUrl,
    });
  }
}
