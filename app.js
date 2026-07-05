
class SahayApplication {
    constructor() {
        // Core Modules
        this.speech = new SpeechCompanion();
        this.chatEngine = new ChatCompanionEngine();
        this.medsEngine = new MedicationReminders();
        
        // Calming Sound System (Web Audio API Synthesizer)
        this.audioCtx = null;
        this.ambientNodes = {
            rain: null,
            birds: null,
            ocean: null,
            chimes: null
        };
        this.volumeNode = null;
        this.activeSounds = {};

        // Breathing Loop State
        this.breathingInterval = null;
        this.breathingState = "idle"; // idle, running
        this.breathStep = 0; // 0=inhale, 1=hold, 2=exhale
        
        // Hydration Count
        this.waterCount = this.loadWaterCount();

        // Alarm monitor
        this.alarmInterval = null;
    }

    /**
     * Initializes elements and sets up listeners once DOM is ready
     */
    init() {
        this.setupDOMReferences();
        this.setupEventListeners();
        
        // Initialize speech synthesis callbacks
        this.setupSpeechCallbacks();

        // Render initial UI
        this.renderMedsToday();
        this.updateHydrationBloom();
        this.showBotGreeting();

        // Set up medicine alarm checking loop (runs every 10 seconds)
        this.startAlarmMonitor();

        // Default accessibility check
        const isXL = localStorage.getItem("sahay_xl_text") === "true";
        if (isXL) {
            document.body.classList.add("accessible-xl");
            this.dom.btnToggleText.classList.add("active");
        }

        const isVoice = localStorage.getItem("sahay_voice_companion") === "true";
        if (isVoice) {
            this.speech.enabled = true;
            this.dom.btnToggleVoice.classList.add("active");
        }
    }

    setupDOMReferences() {
        this.dom = {
            // Accessibility
            btnToggleText: document.getElementById("toggleTextSize"),
            btnToggleVoice: document.getElementById("toggleVoiceCompanion"),
            
            // Tabs
            tabChat: document.getElementById("navTabChat"),
            tabMeds: document.getElementById("navTabMeds"),
            tabSounds: document.getElementById("navTabSounds"),
            tabHydration: document.getElementById("navTabHydration"),
            
            // Screens
            screenChat: document.getElementById("screenChat"),
            screenMeds: document.getElementById("screenMeds"),
            screenSounds: document.getElementById("screenSounds"),
            screenHydration: document.getElementById("screenHydration"),
            
            // Chat
            chatHistory: document.getElementById("chatHistory"),
            chatInput: document.getElementById("chatInput"),
            btnSend: document.getElementById("btnSendMessage"),
            btnVoice: document.getElementById("btnVoiceInput"),
            typingIndicator: document.getElementById("chatTypingIndicator"),
            
            // Meds
            medsTodayList: document.getElementById("medsTodayList"),
            medForm: document.getElementById("medForm"),
            btnAddMed: document.getElementById("btnAddMed"),
            medName: document.getElementById("medName"),
            medDose: document.getElementById("medDose"),
            medTimeGroup: document.getElementById("medTimeGroup"),
            
            // Breathing Widget
            breathingWidget: document.getElementById("breathingWidget"),
            breathingText: document.getElementById("breathingText"),
            breathingGuide: document.getElementById("breathingGuide"),
            btnToggleBreathing: document.getElementById("btnToggleBreathing"),
            
            // Hydration
            waterValue: document.getElementById("waterValue"),
            btnDecreaseWater: document.getElementById("btnDecreaseWater"),
            btnIncreaseWater: document.getElementById("btnIncreaseWater"),
            btnResetWater: document.getElementById("btnResetWater"),
            flowerStem: document.getElementById("flowerStem"),
            gardenPrompt: document.getElementById("gardenPrompt"),
            
            // SOS Help
            btnSosHelp: document.getElementById("btnSosHelp"),

            // Settings
            tabSettings: document.getElementById("navTabSettings"),
            screenSettings: document.getElementById("screenSettings"),
            settingsName: document.getElementById("settingsName"),
            settingsHobbies: document.getElementById("settingsHobbies"),
            settingsGrandkids: document.getElementById("settingsGrandkids"),
            settingsContactName: document.getElementById("settingsContactName"),
            settingsContactPhone: document.getElementById("settingsContactPhone"),
            btnSaveSettings: document.getElementById("btnSaveSettings"),

            // Alert overlay
            alertContainer: document.getElementById("appAlertContainer"),
            reassuranceModal: document.getElementById("reassuranceModal")
        };
    }

    setupEventListeners() {
        // Accessibilities
        this.dom.btnToggleText.addEventListener("click", () => this.toggleTextScale());
        this.dom.btnToggleVoice.addEventListener("click", () => this.toggleVoiceAccessibility());

        // Chat actions
        this.dom.btnSend.addEventListener("click", () => this.handleSendMessage());
        this.dom.chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.handleSendMessage();
        });
        this.dom.btnVoice.addEventListener("click", () => this.toggleVoiceInput());

        // Med actions
        this.dom.btnAddMed.addEventListener("click", () => this.addNewMedFromForm());
        
        // Med time slot picker behavior
        const timeButtons = this.dom.medTimeGroup.querySelectorAll(".time-btn");
        timeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                timeButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });

        // Soundboard cards
        const soundCards = document.querySelectorAll(".sound-card");
        soundCards.forEach(card => {
            card.addEventListener("click", () => {
                const soundType = card.dataset.sound;
                this.toggleAmbientSound(soundType, card);
            });
        });

        // Sound volume slider
        document.getElementById("masterVolume").addEventListener("input", (e) => {
            this.setAmbientVolume(e.target.value);
        });

        // Breathing toggle
        this.dom.btnToggleBreathing.addEventListener("click", () => this.toggleBreathingExercise());

        // Hydration clicks
        this.dom.btnDecreaseWater.addEventListener("click", () => this.decreaseWaterIntake());
        this.dom.btnIncreaseWater.addEventListener("click", () => this.increaseWaterIntake());
        this.dom.btnResetWater.addEventListener("click", () => this.resetWaterTracker());

        // SOS Click
        this.dom.btnSosHelp.addEventListener("click", () => this.triggerEmergencySOS());

        // Settings Click
        this.dom.btnSaveSettings.addEventListener("click", () => this.saveUserSettingsForm());
    }

    setupSpeechCallbacks() {
        this.speech.onRecognitionStart = () => {
            this.dom.btnVoice.classList.add("active");
            this.dom.chatInput.placeholder = "Listening... Speak warmly into your microphone.";
        };

        this.speech.onRecognitionEnd = () => {
            this.dom.btnVoice.classList.remove("active");
            this.dom.chatInput.placeholder = "Type a message, or use the microphone to talk...";
        };

        this.speech.onRecognitionResult = (text) => {
            this.dom.chatInput.value = text;
            // Automatically send text for elder convenience
            this.handleSendMessage();
        };
    }

    // ==========================================
    // Accessibility Controls
    // ==========================================

    toggleTextScale() {
        const body = document.body;
        const active = body.classList.toggle("accessible-xl");
        this.dom.btnToggleText.classList.toggle("active", active);
        localStorage.setItem("sahay_xl_text", active ? "true" : "false");
        
        this.speech.speak(active ? "Text size is now enlarged for comfortable reading." : "Text size has been reset to standard.");
    }

    toggleVoiceAccessibility() {
        this.speech.enabled = !this.speech.enabled;
        this.dom.btnToggleVoice.classList.toggle("active", this.speech.enabled);
        localStorage.setItem("sahay_voice_companion", this.speech.enabled ? "true" : "false");
        
        if (this.speech.enabled) {
            this.speech.speak("Hello there! I am now ready to read my messages out loud for you.");
        } else {
            this.speech.stopSpeaking();
        }
    }

    // ==========================================
    // Tab Router View
    // ==========================================

    switchTab(tabId) {
        // Remove active states from all tabs
        this.dom.tabChat.classList.remove("active");
        this.dom.tabMeds.classList.remove("active");
        this.dom.tabSounds.classList.remove("active");
        this.dom.tabHydration.classList.remove("active");
        this.dom.tabSettings.classList.remove("active");
        
        // Hide all screens
        this.dom.screenChat.classList.remove("active");
        this.dom.screenMeds.classList.remove("active");
        this.dom.screenSounds.classList.remove("active");
        this.dom.screenHydration.classList.remove("active");
        this.dom.screenSettings.classList.remove("active");

        // Set active class
        if (tabId === 'chat') {
            this.dom.tabChat.classList.add("active");
            this.dom.screenChat.classList.add("active");
        } else if (tabId === 'meds') {
            this.dom.tabMeds.classList.add("active");
            this.dom.screenMeds.classList.add("active");
            this.renderMedsToday();
        } else if (tabId === 'sounds') {
            this.dom.tabSounds.classList.add("active");
            this.dom.screenSounds.classList.add("active");
        } else if (tabId === 'hydration') {
            this.dom.tabHydration.classList.add("active");
            this.dom.screenHydration.classList.add("active");
        } else if (tabId === 'settings') {
            this.dom.tabSettings.classList.add("active");
            this.dom.screenSettings.classList.add("active");
            this.prefillSettingsForm();
        }
        
        // Stop Speech capturing if active
        this.speech.stopListening();
    }

    // ==========================================
    // Empathetic Local Chat Flow
    // ==========================================

    showBotGreeting() {
        const greeting = this.chatEngine.getInitialMessage();
        this.appendChatMessage("bot", greeting);
        this.speech.speak(greeting);
    }

    handleSendMessage() {
        const text = this.dom.chatInput.value.trim();
        if (!text) return;

        // Clear input
        this.dom.chatInput.value = "";
        
        // Append user balloon
        this.appendChatMessage("user", text);
        
        // Cancel speech synthesis of previous messages
        this.speech.stopSpeaking();

        // Show typing indicator
        this.dom.typingIndicator.style.display = "flex";
        this.dom.chatHistory.scrollTop = this.dom.chatHistory.scrollHeight;

        // Delay response to simulate warm reflection
        setTimeout(async () => {
            try {
                const { reply, action } = await this.chatEngine.processMessage(text);
                
                // Hide typing indicator
                this.dom.typingIndicator.style.display = "none";
                
                // Append Sahay balloon
                this.appendChatMessage("bot", reply);
                
                // Speak response if enabled
                this.speech.speak(reply);

                // Execute bot UI action hooks
                if (action) {
                    this.executeChatAction(action);
                }
            } catch (err) {
                console.error("Error generating Sahay message:", err);
                this.dom.typingIndicator.style.display = "none";
                const errReply = "I am so sorry, but I'm having a small issue processing that request. Please try again or check your settings.";
                this.appendChatMessage("bot", errReply);
                this.speech.speak(errReply);
            }
        }, 1200);
    }

    appendChatMessage(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}`;
        
        // Format bold markdown dynamically for aesthetics
        let formattedText = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Add speech toggle button inside bot message for ease
        if (sender === "bot") {
            msgDiv.innerHTML = `
                <div>${formattedText}</div>
                <button class="speak-message-btn" title="Speak this paragraph out loud">
                    <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                </button>
                <div class="message-meta">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            `;
            
            // Set up local speaker click
            msgDiv.querySelector(".speak-message-btn").addEventListener("click", () => {
                this.speech.enabled = true; // force temporary enable
                this.speech.speak(text);
            });
        } else {
            msgDiv.innerHTML = `
                <div>${formattedText}</div>
                <div class="message-meta">You • ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            `;
        }

        this.dom.chatHistory.appendChild(msgDiv);
        this.dom.chatHistory.scrollTop = this.dom.chatHistory.scrollHeight;
    }

    toggleVoiceInput() {
        if (this.speech.recognizing) {
            this.speech.stopListening();
        } else {
            this.speech.startListening();
        }
    }

    executeChatAction(action) {
        if (action.type === "suggest_breathing") {
            this.appendBotActionButton("Let's do a deep breath", () => this.toggleBreathingExercise());
        } else if (action.type === "suggest_sounds") {
            this.appendBotActionButton("Listen to Soft Rain", () => {
                this.switchTab('sounds');
                const card = document.querySelector('[data-sound="rain"]');
                this.toggleAmbientSound('rain', card);
            });
        } else if (action.type === "start_breathing") {
            this.toggleBreathingExercise(true); // force start
        } else if (action.type === "show_meds") {
            this.switchTab('meds');
        } else if (action.type === "show_hydration") {
            this.switchTab('hydration');
        }
    }

    appendBotActionButton(label, clickHandler) {
        const btn = document.createElement("button");
        btn.className = "chat-action-btn";
        btn.innerHTML = `
            <span>🧘</span> <span>${label}</span>
        `;
        btn.onclick = () => {
            btn.remove();
            clickHandler();
        };

        // Append to the last chatbot container
        const bots = this.dom.chatHistory.querySelectorAll(".message.bot");
        if (bots.length > 0) {
            bots[bots.length - 1].appendChild(btn);
        }
        this.dom.chatHistory.scrollTop = this.dom.chatHistory.scrollHeight;
    }

    // ==========================================
    // 4-7-8 Breathing Loop
    // ==========================================

    toggleBreathingExercise(forceStart = false) {
        if (this.breathingState === "running" && !forceStart) {
            // Stop exercise
            clearInterval(this.breathingInterval);
            this.breathingState = "idle";
            this.dom.breathingWidget.className = "breathing-box exhale";
            this.dom.breathingText.innerText = "Out";
            this.dom.breathingGuide.innerText = "Let go of tension...";
            this.dom.btnToggleBreathing.innerText = "Start 4-7-8 Exercise";
            this.speech.speak("Breathing session ended. Excellent job taking care of your body.");
        } else {
            // Start exercise
            if (this.breathingInterval) clearInterval(this.breathingInterval);
            
            this.breathingState = "running";
            this.dom.btnToggleBreathing.innerText = "Stop Session";
            this.breathStep = 0;
            this.runBreathingCycleStep();
            
            // Cycle: Inhale 4s, Hold 7s, Exhale 8s
            this.breathingInterval = setInterval(() => {
                this.runBreathingCycleStep();
            }, 1000);
        }
    }

    runBreathingCycleStep() {
        if (this.breathStep === 0) {
            // INHALE
            this.dom.breathingWidget.className = "breathing-box inhale";
            this.dom.breathingText.innerText = "In";
            this.dom.breathingGuide.innerText = "Breathe in pure, calm air... (4 seconds)";
            this.speech.speak("Breathe in");
            
            // Trigger hold state after 4 seconds
            this.breathStep = 1;
            this.breathSecondsLeft = 4;
        } else if (this.breathStep === 1) {
            this.breathSecondsLeft--;
            if (this.breathSecondsLeft <= 0) {
                // Shift to HOLD
                this.dom.breathingWidget.className = "breathing-box inhale";
                this.dom.breathingText.innerText = "Hold";
                this.dom.breathingGuide.innerText = "Gently hold your breath... (7 seconds)";
                this.speech.speak("Hold");
                this.breathStep = 2;
                this.breathSecondsLeft = 7;
            }
        } else if (this.breathStep === 2) {
            this.breathSecondsLeft--;
            if (this.breathSecondsLeft <= 0) {
                // Shift to EXHALE
                this.dom.breathingWidget.className = "breathing-box exhale";
                this.dom.breathingText.innerText = "Out";
                this.dom.breathingGuide.innerText = "Exhale slowly, releasing worries... (8 seconds)";
                this.speech.speak("Exhale");
                this.breathStep = 0; // Loop back
                this.breathSecondsLeft = 8;
            }
        }
    }

    // ==========================================
    // Medicine Log Implementation
    // ==========================================

    renderMedsToday() {
        const medsToday = this.medsEngine.meds;
        this.dom.medsTodayList.innerHTML = "";

        if (medsToday.length === 0) {
            this.dom.medsTodayList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24"><path d="M4.5 10.5C3.67 10.5 3 11.17 3 12s.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5h-15z"/></svg>
                    <p>No medicines scheduled. Enjoy your peaceful day!</p>
                </div>
            `;
            return;
        }

        // Sort by slot ordering: morning first, then afternoon, evening, night
        const slotOrder = { morning: 1, afternoon: 2, evening: 3, night: 4 };
        const sortedMeds = [...medsToday].sort((a,b) => slotOrder[a.timeSlot] - slotOrder[b.timeSlot]);

        sortedMeds.forEach(med => {
            const isCompleted = this.medsEngine.isTaken(med.id);
            const medDiv = document.createElement("div");
            medDiv.className = `med-item ${isCompleted ? 'taken' : ''}`;
            
            let slotIcon = "☀️";
            if (med.timeSlot === "afternoon") slotIcon = "🌤️";
            if (med.timeSlot === "evening") slotIcon = "🌅";
            if (med.timeSlot === "night") slotIcon = "🌙";

            medDiv.innerHTML = `
                <div class="med-details-group">
                    <div class="time-slot-icon ${med.timeSlot}">${slotIcon}</div>
                    <div class="med-meta-info">
                        <h3>${med.name}</h3>
                        <p>${med.dose} • ${med.timeSlot.charAt(0).toUpperCase() + med.timeSlot.slice(1)}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                    <button class="med-action-checkbox" title="Mark this medicine as taken">
                        <svg viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </button>
                    <button class="btn-delete-med" title="Delete medication reminder">
                        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;

            // Setup taken state toggle listener
            medDiv.querySelector(".med-action-checkbox").addEventListener("click", () => {
                const complete = this.medsEngine.toggleTaken(med.id);
                medDiv.classList.toggle("taken", complete);
                
                if (complete) {
                    this.showBannerAlert(`Heartwarming job! You've taken your **${med.name}**. Keeping healthy is wonderful.`, "success");
                    this.speech.speak(`Wonderful! You have taken your ${med.name}. Good job keeping healthy.`);
                    this.chatEngine.recordMood("healthy");
                }
            });

            // Setup delete listener
            medDiv.querySelector(".btn-delete-med").addEventListener("click", () => {
                this.medsEngine.deleteMed(med.id);
                this.renderMedsToday();
            });

            this.dom.medsTodayList.appendChild(medDiv);
        });
    }

    addNewMedFromForm() {
        const name = this.dom.medName.value.trim();
        const dose = this.dom.medDose.value.trim();
        const timeBtn = this.dom.medTimeGroup.querySelector(".time-btn.active");
        const slot = timeBtn ? timeBtn.dataset.time : "morning";

        if (!name || !dose) {
            alert("Please fill in both the Medicine Name and Dosage amount so Sahay can remind you correctly!");
            return;
        }

        this.medsEngine.addMed(name, dose, slot);
        
        // Reset form inputs
        this.dom.medName.value = "";
        this.dom.medDose.value = "";
        
        // Re-render
        this.renderMedsToday();
        
        this.speech.speak(`Medication reminder for ${name} saved successfully.`);
        this.showBannerAlert(`Medication reminder for **${name}** added successfully!`, "success");
    }

    // ==========================================
    // Hydration Garden implementation
    // ==========================================

    loadWaterCount() {
        const count = localStorage.getItem("sahay_water_cups");
        return count ? parseInt(count) : 0;
    }

    increaseWaterIntake() {
        this.waterCount++;
        localStorage.setItem("sahay_water_cups", this.waterCount);
        this.dom.waterValue.innerText = this.waterCount;
        
        this.updateHydrationBloom();
        
        this.speech.speak(`Fantastic! That is glass number ${this.waterCount} today. Keep it up!`);
        this.showBannerAlert(`Super! You have logged **${this.waterCount} cups** of water. Watch your lavender plant grow!`, "success");
    }

    decreaseWaterIntake() {
        if (this.waterCount <= 0) return;
        this.waterCount--;
        localStorage.setItem("sahay_water_cups", this.waterCount);
        this.dom.waterValue.innerText = this.waterCount;
        
        this.updateHydrationBloom();
        
        this.speech.speak(`Alright, removed a glass. You are now at ${this.waterCount} glasses.`);
        this.showBannerAlert(`Logged. You are at **${this.waterCount} cups** of water today.`, "info");
    }

    resetWaterTracker() {
        this.waterCount = 0;
        localStorage.setItem("sahay_water_cups", 0);
        this.dom.waterValue.innerText = 0;
        this.updateHydrationBloom();
        this.speech.speak("Hydration garden started fresh.");
    }

    updateHydrationBloom() {
        this.dom.waterValue.innerText = this.waterCount;
        
        // Flower stem growth stage class updates
        this.dom.flowerStem.className = "flower-stem";
        
        if (this.waterCount >= 1 && this.waterCount < 2) {
            this.dom.flowerStem.classList.add("stage-1");
            this.dom.gardenPrompt.innerText = "Looking good! 1 cup has sprouted a tiny root stem. Let's drink more water!";
        } else if (this.waterCount >= 2 && this.waterCount < 3) {
            this.dom.flowerStem.classList.add("stage-2");
            this.dom.gardenPrompt.innerText = "Wow! 2 cups sprouted our first friendly lavender leaf. Keep hydrating!";
        } else if (this.waterCount >= 3 && this.waterCount < 4) {
            this.dom.flowerStem.classList.add("stage-3");
            this.dom.gardenPrompt.innerText = "Beautiful! 3 cups. The stem is growing high and strong, sprout leaves everywhere!";
        } else if (this.waterCount >= 4) {
            this.dom.flowerStem.classList.add("stage-4");
            this.dom.gardenPrompt.innerText = "Congratulations! 🌟 Your love and water have bloomed a gorgeous purple lavender flower! You are well hydrated!";
        } else {
            this.dom.gardenPrompt.innerText = "Drink 4 cups of water to help Sahay's lavender flower grow and bloom beautifully!";
        }
    }

    // ==========================================
    // Calming Corner Web Audio Synthesizer
    // ==========================================

    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            // Create master volume
            this.volumeNode = this.audioCtx.createGain();
            this.volumeNode.gain.value = 0.5; // Default 50%
            this.volumeNode.connect(this.audioCtx.destination);
        }
    }

    setAmbientVolume(val) {
        this.initAudioContext();
        if (this.volumeNode) {
            this.volumeNode.gain.setValueAtTime(parseFloat(val), this.audioCtx.currentTime);
        }
    }

    toggleAmbientSound(type, cardElement) {
        this.initAudioContext();
        
        // Resume Audio Context if suspended
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        if (this.activeSounds[type]) {
            // STOP
            this.stopSoundType(type);
            cardElement.classList.remove("playing");
            cardElement.querySelector(".play-state-indicator").innerText = "Tap to Play";
            this.activeSounds[type] = false;
        } else {
            // PLAY
            this.startSoundType(type);
            cardElement.classList.add("playing");
            cardElement.querySelector(".play-state-indicator").innerText = "Now Playing";
            this.activeSounds[type] = true;
        }
    }

    startSoundType(type) {
        if (type === "rain") {
            this.ambientNodes.rain = this.createRainSynthesizer();
        } else if (type === "birds") {
            this.ambientNodes.birds = this.createBirdsSynthesizer();
        } else if (type === "ocean") {
            this.ambientNodes.ocean = this.createOceanSynthesizer();
        } else if (type === "chimes") {
            this.ambientNodes.chimes = this.createChimesSynthesizer();
        }
    }

    stopSoundType(type) {
        const node = this.ambientNodes[type];
        if (node) {
            try {
                if (Array.isArray(node)) {
                    node.forEach(n => {
                        if (n.stop) n.stop();
                        if (n.timer) clearInterval(n.timer);
                    });
                } else {
                    if (node.stop) node.stop();
                    if (node.timer) clearInterval(node.timer);
                }
            } catch (e) {
                console.warn("Failed to stop synthesizer node:", e);
            }
            this.ambientNodes[type] = null;
        }
    }

    // --- Web Audio Generators ---

    createNoiseBuffer() {
        const bufferSize = 2 * this.audioCtx.sampleRate;
        const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return noiseBuffer;
    }

    createRainSynthesizer() {
        // High quality pink-ish filtered rain noise
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = this.createNoiseBuffer();
        noiseSource.loop = true;

        // Bandpass Filter to mold white noise into gentle soft rain
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 600;
        filter.Q.value = 0.65;

        // Gain node to control rain volume
        const rainGain = this.audioCtx.createGain();
        rainGain.gain.value = 0.25;

        noiseSource.connect(filter);
        filter.connect(rainGain);
        rainGain.connect(this.volumeNode);
        
        noiseSource.start(0);
        return noiseSource;
    }

    createOceanSynthesizer() {
        // Synthesizes dynamic ocean tides
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = this.createNoiseBuffer();
        noiseSource.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 350;

        const oceanGain = this.audioCtx.createGain();
        oceanGain.gain.value = 0.05;

        noiseSource.connect(filter);
        filter.connect(oceanGain);
        oceanGain.connect(this.volumeNode);
        
        noiseSource.start(0);

        // Slowly modulate gain to simulate incoming/outgoing waves (8 second cycle)
        let waveState = 0;
        const timer = setInterval(() => {
            const now = this.audioCtx.currentTime;
            if (waveState === 0) {
                // High Tide
                oceanGain.gain.linearRampToValueAtTime(0.3, now + 4);
                filter.frequency.linearRampToValueAtTime(500, now + 4);
                waveState = 1;
            } else {
                // Low Tide
                oceanGain.gain.linearRampToValueAtTime(0.04, now + 4);
                filter.frequency.linearRampToValueAtTime(280, now + 4);
                waveState = 0;
            }
        }, 4000);

        // Return container objects to stop cleanly
        return {
            stop: () => {
                noiseSource.stop();
                clearInterval(timer);
            },
            timer: timer
        };
    }

    createBirdsSynthesizer() {
        // Emits friendly random bird chirps
        const birdTimer = setInterval(() => {
            if (Math.random() < 0.6) {
                this.triggerBirdChirp();
            }
        }, 2200);

        return {
            stop: () => clearInterval(birdTimer),
            timer: birdTimer
        };
    }

    triggerBirdChirp() {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = "sine";
        
        // Random bird chirp high frequencies (1500Hz - 2500Hz)
        const baseFreq = 1600 + Math.random() * 800;
        osc.frequency.setValueAtTime(baseFreq, now);
        
        // Modulate frequency rapidly to create a chattering sound
        osc.frequency.exponentialRampToValueAtTime(baseFreq + 300, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(baseFreq - 200, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(baseFreq + 400, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(baseFreq - 100, now + 0.25);
        
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        
        osc.connect(gain);
        gain.connect(this.volumeNode);
        
        osc.start(now);
        osc.stop(now + 0.3);
    }

    createChimesSynthesizer() {
        // High crystal resonance bell sounds
        const frequencies = [880, 1174, 1318, 1567, 1760]; // Crystal pentatonic scale
        
        const chimeTimer = setInterval(() => {
            if (Math.random() < 0.5) {
                const randomFreq = frequencies[Math.floor(Math.random() * frequencies.length)];
                this.triggerChimeTone(randomFreq);
            }
        }, 1800);

        return {
            stop: () => clearInterval(chimeTimer),
            timer: chimeTimer
        };
    }

    triggerChimeTone(freq) {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const bandpass = this.audioCtx.createBiquadFilter();
        const gain = this.audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        bandpass.type = "bandpass";
        bandpass.frequency.value = freq;
        bandpass.Q.value = 10; // high Q rings beautifully
        
        // Slow exponential volume release
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        
        osc.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.volumeNode);
        
        osc.start(now);
        osc.stop(now + 2.8);
    }

    // ==========================================
    // Alerts and Medicine Reminders
    // ==========================================

    showBannerAlert(text, type = "info") {
        const div = document.createElement("div");
        div.className = `app-alert-banner ${type === "success" ? "med-success" : ""}`;
        
        let icon = "🔔";
        if (type === "success") icon = "🌸";

        div.innerHTML = `
            <div class="app-alert-banner-text">${icon} ${text}</div>
            <button class="app-alert-banner-btn">Dismiss</button>
        `;
        
        div.querySelector(".app-alert-banner-btn").addEventListener("click", () => {
            div.remove();
        });

        // Prepend to display panel
        this.dom.alertContainer.appendChild(div);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (div.parentNode) div.remove();
        }, 8000);
    }

    startAlarmMonitor() {
        this.alarmInterval = setInterval(() => {
            this.checkMedicineTimeAlarms();
        }, 12000); // Check every 12 seconds
        
        // Initial check on startup after a delay
        setTimeout(() => {
            this.checkMedicineTimeAlarms();
        }, 3000);
    }

    checkMedicineTimeAlarms() {
        const currentSlot = this.medsEngine.getCurrentTimeSlot();
        const medsInSlot = this.medsEngine.getMedsForSlot(currentSlot);
        
        // Find if there is any med in this slot that has NOT been taken yet
        const untakenMeds = medsInSlot.filter(m => !this.medsEngine.isTaken(m.id));
        
        if (untakenMeds.length > 0) {
            const medNames = untakenMeds.map(m => m.name).join(" and ");
            
            // Check if there is already an alert showing for this med to avoid duplication
            const showingAlerts = this.dom.alertContainer.innerText;
            if (showingAlerts.includes(untakenMeds[0].name)) return;

            this.showBannerAlert(`Hi there! It is ${currentSlot.charAt(0).toUpperCase() + currentSlot.slice(1)} time. It is a perfect time to take your **${medNames}**!`, "info");
            
            this.speech.speak(`Hello there! It is ${currentSlot} time. Please remember to take your ${medNames}. I am here to remind you.`);
        }
    }

    // ==========================================
    // Quick Reassurance Modals
    // ==========================================

    showReassuranceModal() {
        this.dom.reassuranceModal.classList.add("active");
        this.speech.speak("Take a slow breath... You are doing incredibly well. If you ever feel worried, please remember you are safe. Sahay is right here with you.");
    }

    closeReassuranceModal() {
        this.dom.reassuranceModal.classList.remove("active");
        this.speech.stopSpeaking();
    }

    startModalBreathing() {
        this.closeReassuranceModal();
        this.switchTab('chat');
        this.toggleBreathingExercise(true); // force start breathing
    }

    prefillSettingsForm() {
        this.dom.settingsName.value = this.chatEngine.profile.userName || "";
        this.dom.settingsHobbies.value = this.chatEngine.profile.hobbies || "";
        this.dom.settingsGrandkids.value = this.chatEngine.profile.grandkids || "";
        this.dom.settingsContactName.value = this.chatEngine.profile.emergencyContactName || "";
        this.dom.settingsContactPhone.value = this.chatEngine.profile.emergencyContactPhone || "";
    }

    saveUserSettingsForm() {
        const name = this.dom.settingsName.value.trim();
        const hobby = this.dom.settingsHobbies.value.trim();
        const family = this.dom.settingsGrandkids.value.trim();
        const cName = this.dom.settingsContactName.value.trim();
        const cPhone = this.dom.settingsContactPhone.value.trim();

        this.chatEngine.profile.userName = name;
        this.chatEngine.profile.hobbies = hobby;
        this.chatEngine.profile.grandkids = family;
        this.chatEngine.profile.emergencyContactName = cName;
        this.chatEngine.profile.emergencyContactPhone = cPhone;
        this.chatEngine.profile.firstTime = false;
        
        this.chatEngine.saveProfile();

        this.showBannerAlert("Warm hugs! Your profile preferences have been saved securely.", "success");
        this.speech.speak("Your profile details have been saved successfully.");

        // Automatically return to chat tab
        setTimeout(() => this.switchTab('chat'), 1500);
    }

    triggerEmergencySOS() {
        const phone = this.chatEngine.profile.emergencyContactPhone;
        const name = this.chatEngine.profile.emergencyContactName || "your Helper";

        // Speak comforting, slow emergency sound
        const sosText = `Breathe slowly, my dear friend. I am dialing ${name} at ${phone} for you right now. Please sit down and stay calm. Help is coming.`;
        
        this.speech.enabled = true; // force sound synthesis
        this.speech.speak(sosText);

        this.showBannerAlert(`🚨 Calling Emergency Contact: **${name}** (${phone})!`, "success");

        // Dial using standard phone tel: link
        if (phone) {
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = `tel:${phone}`;
                a.click();
            }, 1000);
        } else {
            this.showBannerAlert("🚨 No Emergency Phone number is configured! Please save one in 'My Profile' tab.", "info");
            this.speech.speak("No emergency phone number is configured yet. Please configure it in your profile settings.");
            setTimeout(() => this.switchTab('settings'), 3000);
        }
    }
}

// Instantiate and bind to global context on ready
window.addEventListener("DOMContentLoaded", () => {
    window.app = new SahayApplication();
    window.app.init();
});
