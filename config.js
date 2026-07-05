
// Gemini API Configuration
// DO NOT commit API keys to Git! 
// For local development: set the key in localStorage via browser console or load from .env

const GEMINI_CONFIG = {
    // Load from localStorage if available, otherwise empty
    apiKey: localStorage.getItem('gemini_api_key') || "",
    model: "gemini-2.5-flash",
    temperature: 0.7
};

// Helper function to set API key at runtime
function setGeminiApiKey(apiKey) {
    GEMINI_CONFIG.apiKey = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
    console.log("✓ Gemini API key configured successfully");
}
