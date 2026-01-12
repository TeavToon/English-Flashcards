export class UIManager {
    constructor() {
        this.els = {
            categorySelect: document.getElementById("category-select"),
            searchInput: document.getElementById("search-input"),
            cardContainer: document.getElementById("flashcard"),
            nextCategoryArea: document.getElementById("next-category-area"),
            cardCategory: document.getElementById("card-category"),
            cardFrontText: document.getElementById("card-front-text"),
            cardBackVocab: document.getElementById("card-vocab-back"),
            cardMeaning: document.getElementById("card-meaning"),
            cardExTh: document.getElementById("card-ex-th"),
            cardExEn: document.getElementById("card-ex-en"),
            questionLabel: document.getElementById("question-label"),
            tapHint: document.getElementById("tap-hint"),
            progressText: document.getElementById("progress-text"),
            progressBar: document.getElementById("progress-bar"),
            btnTheme: document.getElementById("btn-theme"),
            btnReverse: document.getElementById("btn-reverse"),
            reverseIndicator: document.getElementById("reverse-indicator"),
            btnAudioFrontNormal: document.getElementById("btn-audio-front-normal"),
            btnAudioFrontSlow: document.getElementById("btn-audio-front-slow"), 
            btnAudioSentNormal: document.getElementById("btn-audio-sent-normal"),
            btnAgain: document.getElementById("btn-srs-again"),
            btnGood: document.getElementById("btn-srs-good"),
            btnEasy: document.getElementById("btn-srs-easy"),
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
        this.els.progressText.innerText = `${remaining} Remaining`;
        const percent = total > 0 ? ((total - remaining) / total) * 100 : 0;
        this.els.progressBar.style.width = `${Math.min(100, percent)}%`;

        if (!card) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        this.els.cardCategory.innerText = card.category.replace('หมวด', '').trim();

        if (isReversed) {
            this.els.questionLabel.innerText = "Translate to English";
            this.els.cardFrontText.innerText = card.meaning;
            this.els.cardFrontText.classList.remove('font-heading');
            this.els.btnAudioFrontNormal.style.display = 'none';
            if (this.els.btnAudioFrontSlow) this.els.btnAudioFrontSlow.style.display = 'none';
        } else {
            this.els.questionLabel.innerText = "Translate to Thai";
            this.els.cardFrontText.innerText = card.exampleEn ? card.exampleEn : card.vocab; 
            this.els.cardFrontText.classList.add('font-heading');
            this.els.btnAudioFrontNormal.style.display = 'flex';
            if (this.els.btnAudioFrontSlow) this.els.btnAudioFrontSlow.style.display = 'flex';
        }

        this.els.cardBackVocab.innerText = `${card.vocab} ${card.type || ''}`;
        this.els.cardMeaning.innerText = card.meaning;
        this.els.cardExTh.innerText = card.exampleTh || "-";
        this.els.cardExEn.innerText = card.exampleEn ? card.exampleEn : "-";
        this.els.btnAudioSentNormal.style.display = card.exampleEn ? 'flex' : 'none';
        
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
            this.els.reverseIndicator.classList.remove('hidden');
        } else {
            this.els.reverseIndicator.classList.add('hidden');
        }
    }
    animateSRSButton(type) {
        const btn = type === 'again' ? this.els.btnAgain : (type === 'good' ? this.els.btnGood : this.els.btnEasy);
        btn.classList.add('scale-105', 'ring-2', 'ring-offset-2', 'ring-primary-400');
        setTimeout(() => btn.classList.remove('scale-105', 'ring-2', 'ring-offset-2', 'ring-primary-400'), 200);
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