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
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const allVoices = this.voices.length ? this.voices : window.speechSynthesis.getVoices();
        const voice = allVoices.find(v => 
            (v.lang.includes('en-US') || v.lang.includes('en-GB')) && 
            (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female'))
        );

        // เพิ่มส่วนนี้: ถ้าหา voice ตามชื่อไม่เจอ ให้หา voice ภาษาอังกฤษอะไรก็ได้มาแทน
        const fallbackVoice = allVoices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB'));

        if (voice) utterance.voice = voice;
        else if (fallbackVoice) utterance.voice = fallbackVoice; // ใช้เสียงสำรอง
        utterance.lang = 'en-US';
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
    }
    stop() {
        window.speechSynthesis.cancel();
    }
}