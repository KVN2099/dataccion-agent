export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = [
    'https://kvn2099.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    DATABRICKS_HOST,
    DATABRICKS_SP_CLIENT_ID,
    DATABRICKS_SP_CLIENT_SECRET,
  } = process.env;

  if (!DATABRICKS_HOST || !DATABRICKS_SP_CLIENT_ID || !DATABRICKS_SP_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured — missing env vars' });
  }

  try {
    // OAuth M2M token exchange
    const tokenResp = await fetch(`${DATABRICKS_HOST}/oidc/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: DATABRICKS_SP_CLIENT_ID,
        client_secret: DATABRICKS_SP_CLIENT_SECRET,
        scope: 'all-apis',
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      return res.status(502).json({ error: 'Token exchange failed', detail: err });
    }

    const { access_token, expires_in } = await tokenResp.json();

    return res.status(200).json({
      token: access_token,
      expires_in,
      instance_url: DATABRICKS_HOST,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
