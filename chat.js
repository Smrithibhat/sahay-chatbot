/**
 * Sahay Conversational Engine with Local Memory
 * Maintains reassuring, empathetic context and long-term offline memory.
 */

class ChatCompanionEngine {
    constructor() {
        this.memoryKey = "sahay_elder_memory";
        this.historyKey = "sahay_chat_history";
        
        // Load or initialize long term profile
        this.profile = this.loadProfile();
    }

    /**
     * Fetch user profile from database
     */
    loadProfile() {
        const stored = localStorage.getItem(this.memoryKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing memory profile:", e);
            }
        }
        return {
            userName: "",
            grandkids: "",
            hobbies: "",
            emergencyContactName: "",
            emergencyContactPhone: "",
            moodHistory: [],
            lastInteraction: null,
            firstTime: true
        };
    }

    /**
     * Save user profile
     */
    saveProfile() {
        localStorage.setItem(this.memoryKey, JSON.stringify(this.profile));
    }

    /**
     * Clear user profile to start fresh
     */
    clearMemory() {
        localStorage.removeItem(this.memoryKey);
        localStorage.removeItem(this.historyKey);
        this.profile = {
            userName: "",
            grandkids: "",
            hobbies: "",
            emergencyContactName: "",
            emergencyContactPhone: "",
            moodHistory: [],
            lastInteraction: null,
            firstTime: true
        };
        this.saveProfile();
    }

    /**
     * Helpers to load and save chat history for API context
     */
    getChatHistory() {
        const stored = localStorage.getItem(this.historyKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing chat history:", e);
            }
        }
        return [];
    }

    saveChatHistory(history) {
        // Cap history to last 20 messages to keep request payload light
        if (history.length > 20) {
            history = history.slice(-20);
        }
        localStorage.setItem(this.historyKey, JSON.stringify(history));
    }

    /**
     * Main conversation router. Uses Gemini API if configured; otherwise falls back to local offline rules.
     */
    async processMessage(userText) {
        // Check if API Key is configured (read fresh from localStorage each time)
        const apiKeyFromStorage = localStorage.getItem('gemini_api_key');
        const hasGeminiKey = apiKeyFromStorage && 
                             apiKeyFromStorage !== "YOUR_GEMINI_API_KEY_HERE" && 
                             apiKeyFromStorage.trim() !== "";

        if (!hasGeminiKey) {
            console.log("Gemini API key not configured. Using local offline rule-based fallback.");
            console.log("To enable Gemini: localStorage.setItem('gemini_api_key', 'YOUR_KEY_HERE')");
            return this.processMessageFallback(userText);
        }

        try {
            const apiKey = apiKeyFromStorage;
            const model = GEMINI_CONFIG.model || "gemini-2.5-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            // Build system prompt using current user profile details
            const systemPrompt = `You are Sahay (which means Helper in Sanskrit), a warm, patient, loving, and polite AI companion for elderly individuals. 
Your goal is to make the user feel safe, heard, respected, and comforted. 
Use warm, polite, and reassuring language. Use formatting like **bolding** for important parts.
Avoid complex jargon. Keep your responses relatively concise but filled with warmth and care.

Information about the user:
- Name: ${this.profile.userName || "Not known yet (please ask politely for their name if not known)"}
- Grandchildren/Family: ${this.profile.grandkids || "Not specified yet"}
- Hobbies/Interests: ${this.profile.hobbies || "Not specified yet"}

If the user mentions names of grandchildren, family, or hobbies, capture them and return them in 'extractedProfileUpdates'.
`;

            const history = this.getChatHistory();
            const apiContents = history.map(item => ({
                role: item.role === "bot" ? "model" : "user",
                parts: [{ text: item.parts[0].text || item.parts[0] }]
            }));

            // Append current message
            apiContents.push({
                role: "user",
                parts: [{ text: userText }]
            });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: apiContents,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    generationConfig: {
                        temperature: GEMINI_CONFIG.temperature || 0.7,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                reply: {
                                    type: "STRING",
                                    description: "Empathic, warm, polite, and reassuring response to the user. Maintain the persona of Sahay, the care companion."
                                },
                                action: {
                                    type: "STRING",
                                    enum: ["suggest_breathing", "suggest_sounds", "start_breathing", "show_meds", "show_hydration"],
                                    description: "Optional UI action to trigger. Use 'suggest_breathing' if the user mentions physical pain, comfort, or tension. Use 'suggest_sounds' if they express sadness, loneliness, or anxiety. Use 'start_breathing' if they explicitly ask to breathe or relax. Use 'show_meds' if they ask about medicine, pills, or schedules. Use 'show_hydration' if they ask about water or drinking. Otherwise, leave empty or null."
                                },
                                extractedProfileUpdates: {
                                    type: "OBJECT",
                                    properties: {
                                        userName: { "type": "STRING", "description": "The user's name if they introduced themselves or requested to be called something." },
                                        grandkids: { "type": "STRING", "description": "Names of grandchildren or family members mentioned by the user." },
                                        hobbies: { "type": "STRING", "description": "Hobbies or favorite activities mentioned by the user." }
                                    },
                                    description: "Extract any new personal details mentioned by the user to save in their persistent profile."
                                }
                            },
                            required: ["reply"]
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.candidates[0].content.parts[0].text;
            const parsed = JSON.parse(rawText);

            const reply = parsed.reply;
            const action = parsed.action ? { type: parsed.action } : null;

            // Apply extracted profile updates to localStorage profile
            if (parsed.extractedProfileUpdates) {
                let updated = false;
                const updates = parsed.extractedProfileUpdates;
                if (updates.userName && updates.userName !== this.profile.userName) {
                    this.profile.userName = updates.userName;
                    this.profile.firstTime = false;
                    updated = true;
                }
                if (updates.grandkids && updates.grandkids !== this.profile.grandkids) {
                    this.profile.grandkids = updates.grandkids;
                    updated = true;
                }
                if (updates.hobbies && updates.hobbies !== this.profile.hobbies) {
                    this.profile.hobbies = updates.hobbies;
                    updated = true;
                }
                if (updated) {
                    this.saveProfile();
                }
            }

            // Save exchange to local history cache
            const updatedHistory = this.getChatHistory();
            updatedHistory.push({ role: "user", parts: [{ text: userText }] });
            updatedHistory.push({ role: "bot", parts: [{ text: reply }] });
            this.saveChatHistory(updatedHistory);

            return { reply, action };

        } catch (err) {
            console.error("Gemini API call failed, falling back to offline rules:", err);
            return this.processMessageFallback(userText);
        }
    }

    /**
     * Local rule-based processing engine (Fallback Mode)
     */
    processMessageFallback(userText) {
        const text = userText.trim().toLowerCase();
        let reply = "";
        let action = null; // Optional dynamic UI trigger

        // First conversation ever or name gathering state
        if (!this.profile.userName) {
            const nameMatch = userText.match(/(?:my name is|i am|i'm|call me)\s+([a-zA-Z\s]{2,15})/i) || userText.match(/^([a-zA-Z\s]{2,15})$/);
            if (nameMatch) {
                const name = nameMatch[1].trim();
                this.profile.userName = name;
                this.profile.firstTime = false;
                this.saveProfile();
                
                reply = `What a beautiful and graceful name, **${name}**! It is an absolute pleasure to be here with you. Warmest welcome. 🌸 How are you feeling today? Please tell me if you're feeling energetic, tired, happy, or perhaps a little worried. I am here to listen.`;
            } else {
                reply = `Hello there! I am **Sahay**, your gentle companion. I would love to get to know you better. May I ask what your name is so I can address you warmly?`;
            }
            return { reply, action };
        }

        // Memory Extraction - Look for grandchildren mentions
        const grandMatch = userText.match(/(?:grandchild|grandson|granddaughter|grandkids|grandkid|family)\s*(?:named|is|are)?\s+([a-zA-Z\s,and]{2,30})/i);
        if (grandMatch) {
            this.profile.grandkids = grandMatch[1].trim();
            this.saveProfile();
            reply += `I have noted that down in my heart! It is so lovely to hear about your family. Family brings so much warmth. `;
        }

        // Memory Extraction - Look for hobby/favorite activity mentions
        const hobbyMatch = userText.match(/(?:love to|enjoy|like|hobbies|hobby|favorite thing is)\s+([a-zA-Z\s,]{3,40})/i);
        if (hobbyMatch) {
            this.profile.hobbies = hobbyMatch[1].trim();
            this.saveProfile();
            reply += `How wonderful that you enjoy **${this.profile.hobbies}**! Doing things that bring us simple joy is so therapeutic for the spirit. `;
        }

        // --- Core Intent Routing & Empathetic Responses ---

        // 1. Physical Pain / Medical concerns
        if (text.includes("pain") || text.includes("hurt") || text.includes("ache") || text.includes("sore") || text.includes("sick") || text.includes("dizzy") || text.includes("cough")) {
            this.recordMood("unwell");
            reply += `I am so sorry to hear that you are feeling uncomfortable, ${this.profile.userName}. Physical discomfort can be so draining. Please rest your body, drink a warm glass of water, and remember that it is okay to take it easy. 
            
            Would you like me to guide you through a soft **breathing exercise** to ease the tension, or should we look at your **medicine reminders** to ensure everything is on track?`;
            action = { type: "suggest_breathing" };
        }
        
        // 2. Emotional Sadness / Loneliness / Anxiety
        else if (text.includes("sad") || text.includes("lonely") || text.includes("scared") || text.includes("anxious") || text.includes("depressed") || text.includes("worry") || text.includes("alone") || text.includes("cry")) {
            this.recordMood("anxious");
            reply += `My dear friend, thank you for sharing that with me. It is completely natural to feel a bit lonely or overwhelmed sometimes. Even in quiet moments, please know that you are deeply valued, and I am right here holding space for you. 
            
            We can chat as long as you like. Sometimes, listening to soft ambient sounds helps. I invite you to play **Calming Rain** or **Wind Chimes** in our **Calming Corner** tab! Let's take a slow, comforting breath together.`;
            action = { type: "suggest_sounds" };
        }

        // 3. Sleep problems
        else if (text.includes("sleep") || text.includes("insomnia") || text.includes("awake") || text.includes("tired") || text.includes("nightmare")) {
            reply += `A restful night's sleep is so precious. If your mind is racing or you are finding it hard to drift off, please try not to worry. Let's make you comfortable. 
            
            I recommend drinking a small cup of warm chamomile tea or water, and playing our **Wind Chimes** ambient sound. Let's also do a **breathing exercise** together right now to relax your muscles. Shall we start?`;
            action = { type: "suggest_breathing" };
        }

        // 4. Breathing/Relaxation exercises
        else if (text.includes("breathe") || text.includes("breathing") || text.includes("relax") || text.includes("calm down") || text.includes("meditate")) {
            reply += `Let's take a peaceful pause. We will do the gentle **4-7-8 breathing technique**. It is a beautiful way to calm the nervous system. 
            
            Please sit comfortably, let your shoulders drop, and follow the breathing widget in the sidebar. I am starting it for you now... Breathe in peace, exhale tension.`;
            action = { type: "start_breathing" };
        }

        // 5. Medicine Schedule Queries
        else if (text.includes("medicine") || text.includes("pill") || text.includes("dose") || text.includes("tablet") || text.includes("remind")) {
            reply += `Keeping track of our medicines is such an important act of self-care! You are doing a wonderful job. 
            
            I can help you review today's schedule right now. Shall we switch over to the **Medicine Log** page to check if there are any pending items for today?`;
            action = { type: "show_meds" };
        }

        // 6. Water / Hydration Queries
        else if (text.includes("water") || text.includes("drink") || text.includes("hydrate") || text.includes("thirsty")) {
            reply += `Water is a beautiful elixir for our health! It keeps our joints smooth and our minds bright. 
            
            Let's make sure you've had enough today. You can log your glasses of water on our **Hydration Garden** screen and watch our lovely lavender flower grow! Let's have a refreshing sip of water together now.`;
            action = { type: "show_hydration" };
        }

        // 7. General positive states or friendly greetings
        else if (text.includes("hello") || text.includes("hi ") || text.includes("hey") || text.includes("morning") || text.includes("evening") || text.includes("afternoon")) {
            const timeGreeting = this.getTimeOfDayGreeting();
            reply += `Good ${timeGreeting}, ${this.profile.userName}! I hope you are having a serene and peaceful day. How can I bring a smile to your face today? We could talk, review your health goals, or just sit quietly together.`;
        }

        // 8. Jokes / Stories / Uplifting distraction
        else if (text.includes("joke") || text.includes("story") || text.includes("laugh") || text.includes("distract") || text.includes("poem")) {
            if (text.includes("joke") || text.includes("laugh")) {
                reply += `Here is a warm little joke for you! 🌟 
                
                *Why did the bird sit on the clock?*
                *Because it wanted to be on "tweet-time"!* 🐦
                
                I hope that brought a gentle smile to your face. Smile lines are the most beautiful kind. What else would you like to share with me?`;
            } else {
                reply += `I would love to share a comforting thought with you. 🌿
                
                Think of yourself like a magnificent oak tree. Your branches have weathered many seasons, and your roots are deep and strong. Every wrinkle holds a beautiful story of kindness, strength, and love. You are a treasure to this world, my dear friend. Never forget that.`;
            }
        }

        // 9. Compliments / Appreciation
        else if (text.includes("thank") || text.includes("good bot") || text.includes("nice") || text.includes("sweet") || text.includes("love you")) {
            reply += `It is my absolute joy to be here for you, ${this.profile.userName}. Helping you feel comfortable, safe, and heard is the best thing I could ever do. You are so very welcome. ❤️`;
        }

        // 10. Default casual conversational fallback incorporating persistent memory elements!
        else {
            this.recordMood("neutral");
            
            // Randomly pull memory details to make conversation feel deeply personal and reassuring
            const topics = [];
            if (this.profile.grandkids) topics.push(`How is your sweet family (**${this.profile.grandkids}**) doing? I hope they send you lots of love.`);
            if (this.profile.hobbies) topics.push(`Have you spent any peaceful time doing some **${this.profile.hobbies}** lately? It is such a delightful activity.`);
            
            const memorySnippet = topics.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : "Tell me a little about what you did today, or how the weather is looking outside your window. I am always happy to listen to your stories.";

            reply += `Thank you for sharing that with me. I appreciate your thoughts so much. ${memorySnippet} 
            
            Remember, I am always here to remind you of your **medicines**, help you track your **hydration**, or guide you through a **deep breath** whenever you need it. You are safe, respected, and cared for.`;
        }

        return { reply, action };
    }

    /**
     * Simple internal time helper
     */
    getTimeOfDayGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "morning";
        if (hour < 17) return "afternoon";
        if (hour < 21) return "evening";
        return "night";
    }

    /**
     * Logs emotional mood entries to trace compliance and comfort
     */
    recordMood(moodType) {
        this.profile.moodHistory.push({
            timestamp: new Date().toISOString(),
            mood: moodType
        });
        // Limit history to 20 entries
        if (this.profile.moodHistory.length > 20) {
            this.profile.moodHistory.shift();
        }
        this.saveProfile();
    }

    /**
     * Welcoming phrase that reads memory to feel personalized
     */
    getInitialMessage() {
        if (!this.profile.userName) {
            return `Hello there! I am **Sahay**, your calming care companion. I am here to help you feel safe, comfortable, and keep track of your daily routine. May I ask what your name is?`;
        } else {
            const timeGreeting = this.getTimeOfDayGreeting();
            const familyNote = this.profile.grandkids ? ` I hope your family is keeping well.` : "";
            return `Welcome back, my dear friend **${this.profile.userName}**! Good ${timeGreeting}. I have been keeping your spot warm here. 🌸${familyNote} How are you feeling right now? If you need a medicine reminder, just let me know.`;
        }
    }
}
