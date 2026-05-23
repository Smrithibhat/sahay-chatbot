/**
 * Sahay Medicine Scheduler and Checklist Manager
 * Handles elder-friendly medication logs, checklist states, and automatic alerts.
 */

class MedicationReminders {
    constructor() {
        this.storageKey = "sahay_medication_list";
        this.statusKey = "sahay_medication_status_today";
        
        // Load initial lists
        this.meds = this.loadMeds();
        
        // Checklist status tracking (toggled daily)
        this.checkTodayReset();
    }

    /**
     * Load meds list from local db
     */
    loadMeds() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Error loading medications:", e);
            }
        }
        
        // Seed default elder-friendly medications to look complete out of the box!
        return [
            { id: "seed-1", name: "Calcium Supplement", dose: "1 Tablet", timeSlot: "morning" },
            { id: "seed-2", name: "Multi-Vitamin", dose: "1 Capsule", timeSlot: "afternoon" },
            { id: "seed-3", name: "Blood Pressure Support", dose: "1/2 Tablet", timeSlot: "evening" }
        ];
    }

    /**
     * Save meds list
     */
    saveMeds() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.meds));
    }

    /**
     * Daily checklist completion status checker
     */
    checkTodayReset() {
        const todayStr = new Date().toDateString();
        const storedDate = localStorage.getItem(this.statusKey + "_date");
        
        if (storedDate !== todayStr) {
            // New day! Reset checkboxes
            this.medsTakenToday = {};
            localStorage.setItem(this.statusKey + "_date", todayStr);
            this.saveTakenStatus();
        } else {
            const storedStatus = localStorage.getItem(this.statusKey);
            if (storedStatus) {
                try {
                    this.medsTakenToday = JSON.parse(storedStatus);
                } catch (e) {
                    this.medsTakenToday = {};
                }
            } else {
                this.medsTakenToday = {};
            }
        }
    }

    /**
     * Save checklist items checkmark state
     */
    saveTakenStatus() {
        localStorage.setItem(this.statusKey, JSON.stringify(this.medsTakenToday));
    }

    /**
     * Add new medicine
     */
    addMed(name, dose, timeSlot) {
        const newMed = {
            id: 'med-' + Date.now(),
            name: name,
            dose: dose,
            timeSlot: timeSlot
        };
        this.meds.push(newMed);
        this.saveMeds();
        return newMed;
    }

    /**
     * Delete medicine
     */
    deleteMed(id) {
        this.meds = this.meds.filter(m => m.id !== id);
        delete this.medsTakenToday[id];
        this.saveMeds();
        this.saveTakenStatus();
    }

    /**
     * Toggle the checkbox checkmark status
     */
    toggleTaken(id) {
        this.medsTakenToday[id] = !this.medsTakenToday[id];
        this.saveTakenStatus();
        return this.medsTakenToday[id]; // Returns true if marked taken
    }

    /**
     * Returns true if medicine is completed for today
     */
    isTaken(id) {
        return !!this.medsTakenToday[id];
    }

    /**
     * Evaluates hours to see which slot matches current actual time of day
     */
    getCurrentTimeSlot() {
        const hours = new Date().getHours();
        if (hours >= 6 && hours < 11) return "morning";
        if (hours >= 11 && hours < 16) return "afternoon";
        if (hours >= 16 && hours < 20) return "evening";
        return "night";
    }

    /**
     * Returns medications matching a specific slot
     */
    getMedsForSlot(slot) {
        return this.meds.filter(m => m.timeSlot === slot);
    }
}
