
// Load API key from localStorage (set during initialization)
// For local development: manually set in console with:
// localStorage.setItem('gemini_api_key', 'YOUR_KEY_HERE')
const GEMINI_CONFIG = {
    apiKey: localStorage.getItem('gemini_api_key') || "",
    model: "gemini-2.5-flash",
    temperature: 0.7
};

// Helper function to set API key (call this once at startup)
function setGeminiApiKey(apiKey) {
    localStorage.setItem('gemini_api_key', apiKey);
    GEMINI_CONFIG.apiKey = apiKey;
    console.log("Gemini API key configured successfully");
}
