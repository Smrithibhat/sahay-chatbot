Netlify deployment notes

To deploy this app to Netlify and keep the Gemini API key secret, use a Netlify Function as a proxy.

Steps:
1. In Netlify dashboard for your site, go to Site settings → Build & deploy → Environment and add the following variable:
   - `GEMINI_API_KEY` = your_api_key_here
   - (optional) `GEMINI_MODEL` = gemini-2.5-flash

2. The repository includes a serverless function at `netlify/functions/gemini-proxy.js` which forwards requests to the Generative Language API using the server-side key. The client calls `/.netlify/functions/gemini-proxy`.

3. Build and deploy on Netlify as usual. No end-users will see the API key.

Local testing:
- For local development you can set the key in your browser console:
  `setGeminiApiKey('YOUR_KEY_HERE')`

Security:
- Do NOT commit API keys to the repository. Use Netlify environment variables or other secure server-side stores.
