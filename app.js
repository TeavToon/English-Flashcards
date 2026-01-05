import { RAW_DATA_CONTENT } from './data.js';
import { StorageManager } from './storage.js';
import { parseFlashcardData } from './parser.js';
import { AudioManager } from './audio.js';
import { SpeechRecognizer } from './recognition.js';
import { SRSLogic } from './srs.js';
import { UIManager } from './ui.js';

class App {
    constructor() {
        this.storage = new StorageManager();
        this.audio = new AudioManager();
        this.mic = new SpeechRecognizer();
        this.ui = new UIManager();

        this.allCards = [];
        this.categories = new Set();
        this.activeCards = [];
        this.currentIndex = 0;
        this.dragState = { isDragging: false, startX: 0, startY: 0 };

        const settings = this.storage.loadSettings();
        this.state = {
            isDark: settings.isDark,
            isReversed: settings.isReversed,
            currentCategory: settings.lastCategory,
            searchTerm: "",
            knownCards: this.storage.loadKnownCards()
        };

        this.init();
    }

    init() {
        this.ui.setTheme(this.state.isDark);
        this.ui.setReverseUI(this.state.isReversed);

        parseFlashcardData(RAW_DATA_CONTENT, this.categories, this.allCards);
        this.ui.populateCategories(Array.from(this.categories));
        
        if (Array.from(this.categories).includes(this.state.currentCategory) || this.state.currentCategory === 'all') {
            this.ui.els.categorySelect.value = this.state.currentCategory;
        } else {
            this.state.currentCategory = 'all';
            this.ui.els.categorySelect.value = 'all';
        }

        this.setupEventListeners();
        this.filterCards();
    }

    setupEventListeners() {
        const { els } = this.ui;

        els.categorySelect.addEventListener("change", (e) => {
            this.state.currentCategory = e.target.value;
            this.storage.saveLastCategory(this.state.currentCategory);
            this.filterCards();
        });

        els.searchInput.addEventListener("input", (e) => {
            this.state.searchTerm = e.target.value.toLowerCase();
            this.filterCards();
        });

        els.btnTheme.addEventListener("click", () => {
            this.state.isDark = !this.state.isDark;
            this.storage.saveTheme(this.state.isDark);
            this.ui.setTheme(this.state.isDark);
        });

        els.btnReverse.addEventListener("click", () => {
            this.state.isReversed = !this.state.isReversed;
            this.storage.saveReverseMode(this.state.isReversed);
            this.ui.setReverseUI(this.state.isReversed);
            this.filterCards(); // Reload to apply
        });

        const startDrag = (x, y) => { this.dragState = { isDragging: false, startX: x, startY: y }; };
        const moveDrag = (x, y) => {
            if (Math.abs(x - this.dragState.startX) > 10 || Math.abs(y - this.dragState.startY) > 10) 
                this.dragState.isDragging = true;
        };

        els.cardContainer.addEventListener("mousedown", e => startDrag(e.clientX, e.clientY));
        els.cardContainer.addEventListener("touchstart", e => startDrag(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
        els.cardContainer.addEventListener("mousemove", e => moveDrag(e.clientX, e.clientY));
        els.cardContainer.addEventListener("touchmove", e => moveDrag(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
        els.cardContainer.addEventListener("click", e => {
            if (this.dragState.isDragging) return;
            if (e.target.closest('button')) return;
            this.ui.flipCard();
        });

        els.btnAgain.addEventListener("click", e => { e.stopPropagation(); this.processRating('again'); });
        els.btnGood.addEventListener("click", e => { e.stopPropagation(); this.processRating('good'); });
        els.btnEasy.addEventListener("click", e => { e.stopPropagation(); this.processRating('easy'); });

        els.btnMic.addEventListener("click", e => { e.stopPropagation(); this.handleMic(); });
        
        const bindAudio = (btn, type) => {
            if(btn) btn.addEventListener("click", e => { e.stopPropagation(); this.playAudio(type); });
        };
        bindAudio(els.btnAudioFrontNormal, 'front');
        bindAudio(document.getElementById("btn-audio-back-normal"), 'vocab');
        bindAudio(document.getElementById("btn-audio-back-slow"), 'vocab_slow');
        bindAudio(els.btnAudioSentNormal, 'sentence');

        els.btnMenu.addEventListener("click", e => { e.stopPropagation(); els.menuDropdown.classList.toggle("hidden"); });
        document.addEventListener("click", () => els.menuDropdown.classList.add("hidden"));
        
        els.btnExport.addEventListener("click", () => this.exportData());
        els.btnImport.addEventListener("click", () => els.fileImport.click());
        els.fileImport.addEventListener("change", (e) => this.importData(e));
        
        els.btnReset.addEventListener("click", () => {
            if (confirm("Reset ALL progress?")) {
                this.storage.clearAll();
                this.state.knownCards = new Set();
                this.state.currentCategory = Array.from(this.categories)[0];
                this.storage.saveLastCategory(this.state.currentCategory);
                this.ui.els.categorySelect.value = this.state.currentCategory;
                this.filterCards();
            }
        });

        els.btnNextCategory.addEventListener("click", () => this.nextCategory());
        els.btnRestartSet.addEventListener("click", () => this.restartSet());

        document.addEventListener("keydown", e => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                this.ui.flipCard();
            }
        });
    }

    filterCards() {
        let filtered = this.allCards;
        if (this.state.currentCategory !== "all") {
            filtered = filtered.filter(c => c.category === this.state.currentCategory);
        }
        filtered = filtered.filter(c => !this.state.knownCards.has(c.id));
        if (this.state.searchTerm) {
            const term = this.state.searchTerm;
            filtered = filtered.filter(c => 
                c.vocab.toLowerCase().includes(term) || 
                c.meaning.toLowerCase().includes(term) ||
                (c.exampleEn && c.exampleEn.toLowerCase().includes(term))
            );
        }

        this.activeCards = filtered;
        this.currentIndex = 0;
        this.ui.renderCard(this.activeCards[0], this.state.isReversed, this.allCards.length, this.activeCards.length);
    }

    processRating(rating) {
        if (this.activeCards.length === 0) return;
        this.ui.animateSRSButton(rating);
        const result = SRSLogic.handleRating(this.activeCards, this.currentIndex, rating);
        if (result.action === 'remove') {
            this.state.knownCards.add(result.card.id);
            this.storage.saveKnownCards(this.state.knownCards);
        }
        this.currentIndex = result.nextIndex;
        setTimeout(() => {
            this.ui.renderCard(this.activeCards[this.currentIndex], this.state.isReversed, this.allCards.length, this.activeCards.length);
        }, 250);
    }

    playAudio(type) {
        if (!this.activeCards[this.currentIndex]) return;
        const card = this.activeCards[this.currentIndex];
        let text = "";
        let rate = 1.0;

        if (this.state.isReversed && type === 'front') return;

        if (type === 'front') text = card.exampleEn || card.vocab;
        else if (type === 'vocab') text = card.vocab;
        else if (type === 'vocab_slow') { text = card.vocab; rate = 0.5; }
        else if (type === 'sentence') text = card.exampleEn;

        this.audio.speak(text, rate);
    }

    handleMic() {
        if (!this.mic.isSupported()) {
            alert("Mic not supported in this browser");
            return;
        }
        this.ui.showMicFeedback("<span class='text-primary-500'>Listening...</span>", true);
        this.mic.start(
            (transcript) => {
                const target = this.activeCards[this.currentIndex].vocab.toLowerCase().replace(/[^a-z0-9]/g, '');
                const spoken = transcript.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (spoken === target || target.includes(spoken)) {
                    this.ui.showMicFeedback(`<span class="text-green-500 font-bold"><i class="fa-solid fa-check"></i> Correct!</span>`, false);
                } else {
                    this.ui.showMicFeedback(`<span class="text-red-500"><i class="fa-solid fa-xmark"></i> ${transcript}</span>`, false);
                }
            },
            (err) => {
                this.ui.showMicFeedback("<span class='text-slate-400'>Error/No Input</span>", false);
            },
            () => {}
        );
    }

    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([...this.state.knownCards]));
        const node = document.createElement('a');
        node.setAttribute("href", dataStr);
        node.setAttribute("download", "engflash_backup.json");
        document.body.appendChild(node);
        node.click();
        node.remove();
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                this.state.knownCards = new Set([...this.state.knownCards, ...imported]);
                this.storage.saveKnownCards(this.state.knownCards);
                alert("Import Successful!");
                this.filterCards();
            } catch (err) {
                alert("Invalid File");
            }
        };
        reader.readAsText(file);
    }

    nextCategory() {
        const list = Array.from(this.categories);
        const idx = list.indexOf(this.state.currentCategory);
        if (idx !== -1 && idx < list.length - 1) {
            this.state.currentCategory = list[idx + 1];
            this.storage.saveLastCategory(this.state.currentCategory);
            this.ui.els.categorySelect.value = this.state.currentCategory;
            this.filterCards();
        } else {
            alert("All categories completed!");
        }
    }

    restartSet() {
        if (confirm("Review again?")) {
            const cards = this.allCards.filter(c => c.category === this.state.currentCategory);
            cards.forEach(c => this.state.knownCards.delete(c.id));
            this.storage.saveKnownCards(this.state.knownCards);
            this.filterCards();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new App();
});