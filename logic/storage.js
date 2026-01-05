export class StorageManager {
    constructor() {
        this.KEYS = {
            KNOWN: "knownCards",
            THEME: "theme",
            REVERSE: "isReversed",
            LAST_CAT: "lastCategory"
        };
    }
    loadKnownCards() {
        try {
            return new Set(JSON.parse(localStorage.getItem(this.KEYS.KNOWN) || "[]"));
        } catch {
            return new Set();
        }
    }
    saveKnownCards(knownSet) {
        localStorage.setItem(this.KEYS.KNOWN, JSON.stringify([...knownSet]));
    }
    loadSettings() {
        return {
            isDark: localStorage.getItem(this.KEYS.THEME) === "dark",
            isReversed: localStorage.getItem(this.KEYS.REVERSE) === "true",
            lastCategory: localStorage.getItem(this.KEYS.LAST_CAT) || "all"
        };
    }
    saveTheme(isDark) {
        localStorage.setItem(this.KEYS.THEME, isDark ? "dark" : "light");
    }
    saveReverseMode(isReversed) {
        localStorage.setItem(this.KEYS.REVERSE, isReversed);
    }
    saveLastCategory(category) {
        localStorage.setItem(this.KEYS.LAST_CAT, category);
    }
    clearAll() {
        localStorage.removeItem(this.KEYS.KNOWN);
    }
}