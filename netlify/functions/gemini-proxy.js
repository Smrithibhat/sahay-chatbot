// Netlify Function: gemini-proxy
// Forwards client requests to Google Generative Language API using a server-side API key
// Environment variables required on Netlify: GEMINI_API_KEY (required), GEMINI_MODEL (optional)

exports.handler = async function(event, context) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
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
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Proxy error', details: err.message })
    };
  }
};
