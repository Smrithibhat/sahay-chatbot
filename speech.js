/**
 * Sahay Speech Accessibility Module
 * Handles speech input (STT) and output (TTS) with elder-friendly speed and tuning.
 */

class SpeechCompanion {
    constructor() {
        this.enabled = false;
        this.speaking = false;
        this.recognizing = false;
        this.speechRate = 0.85; // Slow, reassuring speed for elderly clarity
        this.speechPitch = 1.05; // Slightly warm tone
        this.voice = null;
        
        // Initialize Speech Synthesis
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                this.selectCalmingVoice();
            };
            this.selectCalmingVoice();
        }

        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.recognizing = true;
                this.onRecognitionStart();
            };
            
            this.recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                this.stopListening();
            };
            
            this.recognition.onend = () => {
                this.recognizing = false;
                this.onRecognitionEnd();
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.onRecognitionResult(transcript);
            };
        } else {
            console.warn("Speech Recognition not supported in this browser.");
        }
    }

    /**
     * Choose a reassuring, warm voice available in the system
     */
    selectCalmingVoice() {
        if (!('speechSynthesis' in window)) return;
        const voices = window.speechSynthesis.getVoices();
        
        // Look for premium natural sounding voices
        // Prefer Google US English, Apple Samantha/Daniel, Microsoft Zira, etc.
        const matches = [
            'Google US English', 
            'Samantha', 
            'Zira', 
            'Hazel', 
            'Susan', 
            'Microsoft Zira',
            'en-US',
            'en-GB'
        ];

        for (let pattern of matches) {
            const found = voices.find(v => v.name.includes(pattern) || v.lang === pattern);
            if (found) {
                this.voice = found;
                break;
            }
        }
        
        if (!this.voice && voices.length > 0) {
            this.voice = voices[0];
        }
    }

    /**
     * Read a reassuring text out loud
     */
    speak(text) {
        if (!('speechSynthesis' in window)) return;
        
        // Stop any current reading
        window.speechSynthesis.cancel();
        
        if (!this.enabled || !text) return;

        // Clean text of emojis or special markdown triggers for synthesis
        let cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // Remove emojis
        cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold markdown

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        if (this.voice) {
            utterance.voice = this.voice;
        }
        
        utterance.rate = this.speechRate;
        utterance.pitch = this.speechPitch;
        
        utterance.onstart = () => {
            this.speaking = true;
        };
        
        utterance.onend = () => {
            this.speaking = false;
        };

        utterance.onerror = () => {
            this.speaking = false;
        };

        window.speechSynthesis.speak(utterance);
    }

    /**
     * Cancel speaking
     */
    stopSpeaking() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            this.speaking = false;
        }
    }

    /**
     * Start speech capturing
     */
    startListening() {
        if (!this.recognition) {
            alert("Voice input is not supported or permitted on your current browser. You can type in the box instead!");
            return;
        }
        if (this.recognizing) return;
        
        this.stopSpeaking();
        try {
            this.recognition.start();
        } catch (e) {
            console.error("Failed to start speech recognition:", e);
        }
    }

    /**
     * Stop speech capturing
     */
    stopListening() {
        if (!this.recognition) return;
        if (!this.recognizing) return;
        this.recognition.stop();
    }

    // Callbacks to override in main application
    onRecognitionStart() {}
    onRecognitionEnd() {}
    onRecognitionResult(text) {}
}
