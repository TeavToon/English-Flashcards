// recognition.js
export class SpeechRecognizer {
    constructor() {
        this.recognition = null;
        if ('webkitSpeechRecognition' in window) {
            // eslint-disable-next-line no-undef
            this.recognition = new webkitSpeechRecognition();
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
        }
    }

    isSupported() {
        return !!this.recognition;
    }

    start(onResult, onError, onEnd) {
        if (!this.recognition) return;

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };

        this.recognition.onerror = (event) => {
            if (onError) onError(event);
        };

        this.recognition.onend = () => {
            if (onEnd) onEnd();
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error("Mic start error", e);
        }
    }
}