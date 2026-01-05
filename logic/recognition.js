export class SpeechRecognizer {
    constructor() {
        this.recognition = null;
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
        }
    }
    isSupported() { return !!this.recognition; }
    start(onResult, onError, onEnd) {
        if (!this.recognition) return;
        this.recognition.onresult = (event) => onResult(event.results[0][0].transcript);
        this.recognition.onerror = (event) => onError ? onError(event) : null;
        this.recognition.onend = () => onEnd ? onEnd() : null;
        try { this.recognition.start(); } catch (e) { console.error("Mic start error", e); }
    }
}