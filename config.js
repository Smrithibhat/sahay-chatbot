
const GEMINI_CONFIG = {
    apiKey: process.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || "",
    model: "gemini-2.5-flash",
    temperature: 0.7
};
