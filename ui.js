// ui.js
export class UIManager {
    constructor() {
        this.els = {
            // Inputs
            categorySelect: document.getElementById("category-select"),
            searchInput: document.getElementById("search-input"),
            
            // Containers
            cardContainer: document.getElementById("flashcard"),
            nextCategoryArea: document.getElementById("next-category-area"),
            
            // Text Content
            cardCategory: document.getElementById("card-category"),
            cardFrontText: document.getElementById("card-front-text"),
            cardBackVocab: document.getElementById("card-vocab-back"),
            cardMeaning: document.getElementById("card-meaning"),
            cardExTh: document.getElementById("card-ex-th"),
            cardExEn: document.getElementById("card-ex-en"),
            questionLabel: document.getElementById("question-label"),
            tapHint: document.getElementById("tap-hint"),
            micFeedback: document.getElementById("mic-feedback"),
            progressText: document.getElementById("progress-text"),
            progressBar: document.getElementById("progress-bar"),
            
            // Buttons
            btnTheme: document.getElementById("btn-theme"),
            btnReverse: document.getElementById("btn-reverse"),
            reverseIndicator: document.getElementById("reverse-indicator"),
            btnMic: document.getElementById("btn-mic"),
            btnAudioFrontNormal: document.getElementById("btn-audio-front-normal"),
            btnAudioSentNormal: document.getElementById("btn-audio-sent-normal"),
            
            // SRS Buttons
            btnAgain: document.getElementById("btn-srs-again"),
            btnGood: document.getElementById("btn-srs-good"),
            btnEasy: document.getElementById("btn-srs-easy"),
            
            // Menu
            btnMenu: document.getElementById("btn-menu"),
            menuDropdown: document.getElementById("menu-dropdown"),
            btnExport: document.getElementById("btn-export"),
            btnImport: document.getElementById("btn-import"),
            fileImport: document.getElementById("file-import"),
            btnReset: document.getElementById("btn-reset"),
            btnNextCategory: document.getElementById("btn-next-category"),
            btnRestartSet: document.getElementById("btn-restart-set")
        };
    }

    renderCard(card, isReversed, total, remaining) {
        // Update Progress
        this.els.progressText.innerText = `${remaining} left`;
        const percent = total > 0 ? ((total - remaining) / total) * 100 : 0;
        this.els.progressBar.style.width = `${Math.min(100, percent)}%`;

        if (!card) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        this.els.cardCategory.innerText = card.category.replace('หมวด', '').trim();
        this.els.micFeedback.innerHTML = "";

        // Reverse Logic
        if (isReversed) {
            this.els.questionLabel.innerText = "Translate to English";
            this.els.cardFrontText.innerText = card.meaning;
            this.els.cardFrontText.classList.remove('font-heading');
            this.els.btnAudioFrontNormal.style.display = 'none'; // ไทยไม่อ่าน
        } else {
            this.els.questionLabel.innerText = "Translate to Thai";
            this.els.cardFrontText.innerText = card.exampleEn ? `"${card.exampleEn}"` : card.vocab;
            this.els.cardFrontText.classList.add('font-heading');
            this.els.btnAudioFrontNormal.style.display = 'flex';
        }

        // Back Content
        this.els.cardBackVocab.innerText = `${card.vocab} ${card.type || ''}`;
        this.els.cardMeaning.innerText = card.meaning;
        this.els.cardExTh.innerText = card.exampleTh || "-";
        this.els.cardExEn.innerText = card.exampleEn ? `"${card.exampleEn}"` : "-";
        this.els.btnAudioSentNormal.style.display = card.exampleEn ? 'flex' : 'none';
        
        // Reset Flip State
        this.els.cardContainer.classList.remove("flipped");
    }

    showEmptyState() {
        this.els.nextCategoryArea.classList.remove('hidden');
        this.els.cardFrontText.innerText = "";
    }

    hideEmptyState() {
        this.els.nextCategoryArea.classList.add('hidden');
    }

    flipCard() {
        this.els.cardContainer.classList.toggle("flipped");
    }

    setTheme(isDark) {
        document.documentElement.classList.toggle('dark', isDark);
    }

    setReverseUI(isReversed) {
        if (isReversed) {
            this.els.btnReverse.classList.add('text-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/30');
            this.els.reverseIndicator.classList.remove('hidden');
        } else {
            this.els.btnReverse.classList.remove('text-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/30');
            this.els.reverseIndicator.classList.add('hidden');
        }
    }

    showMicFeedback(html, isListening) {
        this.els.micFeedback.innerHTML = html;
        this.els.micFeedback.style.opacity = '1';
        if (isListening) this.els.btnMic.classList.add('mic-listening');
        else this.els.btnMic.classList.remove('mic-listening');
    }

    animateSRSButton(type) {
        const btn = type === 'again' ? this.els.btnAgain : (type === 'good' ? this.els.btnGood : this.els.btnEasy);
        btn.classList.add('scale-110', 'brightness-110');
        setTimeout(() => btn.classList.remove('scale-110', 'brightness-110'), 150);
    }

    populateCategories(categories) {
        this.els.categorySelect.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(cat => {
            const shortCat = cat.replace('หมวด', '').trim();
            const option = document.createElement("option");
            option.value = cat;
            option.textContent = shortCat;
            this.els.categorySelect.appendChild(option);
        });
    }
}