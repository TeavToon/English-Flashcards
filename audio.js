// audio.js
export class AudioManager {
    constructor() {
        this.voices = [];
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => {
                this.voices = window.speechSynthesis.getVoices();
            };
        }
    }

    speak(text, rate = 1.0) {
        if (!text || !window.speechSynthesis) return;
        
        window.speechSynthesis.cancel(); // หยุดเสียงเก่าก่อนพูดใหม่
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Logic เลือกเสียงผู้หญิง (English Female Preferred)
        const allVoices = this.voices.length ? this.voices : window.speechSynthesis.getVoices();
        const voice = allVoices.find(v => 
            (v.lang.includes('en-US') || v.lang.includes('en-GB')) && 
            (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female'))
        );
        
        if (voice) utterance.voice = voice;
        utterance.lang = 'en-US';
        utterance.rate = rate;
        
        window.speechSynthesis.speak(utterance);
    }

    stop() {
        window.speechSynthesis.cancel();
    }
}