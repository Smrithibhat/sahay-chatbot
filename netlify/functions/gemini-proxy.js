// Netlify Function: gemini-proxy
// Forwards client requests to Google Generative Language API using a server-side API key
// Environment variables required on Netlify: GEMINI_API_KEY (required), GEMINI_MODEL (optional)

exports.handler = async function(event, context) {
  // Add CORS headers for browser clients
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
  };

  // Respond to OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    // Health check endpoint (GET)
    if (event.httpMethod === 'GET') {
      const hasKey = !!process.env.GEMINI_API_KEY;
      return {
        statusCode: 200,
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
        body: JSON.stringify({ ok: true, hasKey })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
        body: JSON.stringify({ error: 'Server: GEMINI_API_KEY not configured' })
      };
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Forward the incoming body to Google's API
    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: event.body
    });

    const text = await fetchResponse.text();

    return {
      statusCode: fetchResponse.status,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
      body: JSON.stringify({ error: 'Proxy error', details: err.message })
    };
  }
};
