import { RAW_DATA } from './data.js';
import { parseFlashcardData } from './parser.js';

class FlashcardApp {
  constructor(rawData) {
    this.allCards = [];
    this.categories = new Set();
    this.categoryList = [];
    this.activeCards = []; // Cards in current session
    this.currentIndex = 0;
    this.isFlipped = false;
    this.voices = [];
    
    // States
    this.isReversed = localStorage.getItem("isReversed") === "true";
    this.isDark = localStorage.getItem("theme") === "dark";
    this.searchTerm = "";

    // Drag Logic
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Load Known Cards
    try {
        this.knownCards = new Set(JSON.parse(localStorage.getItem("knownCards") || "[]"));
    } catch (e) {
        this.knownCards = new Set();
    }
    
    this.currentCategory = localStorage.getItem("lastCategory") || "all";

    // Bind UI
    this.ui = {
      // Inputs
      categorySelect: document.getElementById("category-select"),
      searchInput: document.getElementById("search-input"),
      
      // Card Container
      cardContainer: document.getElementById("flashcard"),
      
      // Card Content
      cardCategory: document.getElementById("card-category"),
      cardFrontText: document.getElementById("card-front-text"),
      cardBackVocab: document.getElementById("card-vocab-back"),
      cardMeaning: document.getElementById("card-meaning"),
      cardExTh: document.getElementById("card-ex-th"),
      cardExEn: document.getElementById("card-ex-en"),
      questionLabel: document.getElementById("question-label"),
      tapHint: document.getElementById("tap-hint"),
      
      // Feedback
      micFeedback: document.getElementById("mic-feedback"),
      
      // Status
      progressBar: document.getElementById("progress-bar"),
      progressText: document.getElementById("progress-text"),
      
      // Buttons (Header)
      btnTheme: document.getElementById("btn-theme"),
      btnReverse: document.getElementById("btn-reverse"),
      reverseIndicator: document.getElementById("reverse-indicator"),
      btnMenu: document.getElementById("btn-menu"),
      menuDropdown: document.getElementById("menu-dropdown"),
      btnExport: document.getElementById("btn-export"),
      btnImport: document.getElementById("btn-import"),
      fileImport: document.getElementById("file-import"),
      btnReset: document.getElementById("btn-reset"),
      
      // Buttons (SRS Footer)
      btnAgain: document.getElementById("btn-srs-again"),
      btnGood: document.getElementById("btn-srs-good"),
      btnEasy: document.getElementById("btn-srs-easy"),
      
      // Buttons (Audio/Mic)
      btnMic: document.getElementById("btn-mic"),
      btnAudioFrontNormal: document.getElementById("btn-audio-front-normal"),
      btnAudioBackSlow: document.getElementById("btn-audio-back-slow"),
      btnAudioBackNormal: document.getElementById("btn-audio-back-normal"),
      btnAudioSentNormal: document.getElementById("btn-audio-sent-normal"),
      
      // Overlays
      nextCategoryArea: document.getElementById("next-category-area"),
      btnNextCategory: document.getElementById("btn-next-category"),
      btnRestartSet: document.getElementById("btn-restart-set"),
    };

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => { this.voices = window.speechSynthesis.getVoices(); };
    }

    // Apply initial theme
    if (this.isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    this.updateReverseUI();

    this.init(rawData);
  }

  init(rawData) {
    parseFlashcardData(rawData, this.categories, this.allCards);
    this.categoryList = Array.from(this.categories); 
    this.setupCategories();
    this.setupEventListeners();
    
    if (this.categoryList.includes(this.currentCategory) || this.currentCategory === 'all') {
        this.ui.categorySelect.value = this.currentCategory;
    } else {
        this.ui.categorySelect.value = 'all';
        this.currentCategory = 'all';
    }
    
    this.filterCards();
  }
  
  setupCategories() {
    this.ui.categorySelect.innerHTML = '<option value="all">All Categories</option>';
    this.categoryList.forEach((cat) => {
      const shortCat = cat.replace('หมวด', '').trim();
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = shortCat;
      this.ui.categorySelect.appendChild(option);
    });
  }

  setupEventListeners() {
    // 1. Settings & Tools
    this.ui.categorySelect.addEventListener("change", (e) => {
        this.currentCategory = e.target.value;
        localStorage.setItem("lastCategory", this.currentCategory);
        this.filterCards();
    });

    this.ui.searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.filterCards();
    });

    this.ui.btnTheme.addEventListener("click", () => this.toggleTheme());
    this.ui.btnReverse.addEventListener("click", () => this.toggleReverse());
    
    // Menu Dropdown
    this.ui.btnMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        this.ui.menuDropdown.classList.toggle("hidden");
    });
    document.addEventListener("click", () => this.ui.menuDropdown.classList.add("hidden"));

    // Data Management
    this.ui.btnExport.addEventListener("click", () => this.exportData());
    this.ui.btnImport.addEventListener("click", () => this.ui.fileImport.click());
    this.ui.fileImport.addEventListener("change", (e) => this.importData(e));
    this.ui.btnReset.addEventListener("click", () => this.resetProgress());

    // 2. Card Interaction (Drag & Click)
    const handleStart = (x, y) => { this.isDragging = false; this.startX = x; this.startY = y; };
    const handleMove = (x, y) => {
        if (Math.abs(x - this.startX) > 10 || Math.abs(y - this.startY) > 10) this.isDragging = true;
    };

    this.ui.cardContainer.addEventListener("mousedown", (e) => handleStart(e.clientX, e.clientY));
    this.ui.cardContainer.addEventListener("touchstart", (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
    this.ui.cardContainer.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
    this.ui.cardContainer.addEventListener("touchmove", (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true});

    this.ui.cardContainer.addEventListener("click", (e) => {
        if (this.isDragging) return; 
        if (e.target.closest('button')) return;
        this.flipCard();
    });

    // 3. SRS Buttons
    this.ui.btnAgain.addEventListener("click", (e) => { e.stopPropagation(); this.handleSRS('again'); });
    this.ui.btnGood.addEventListener("click", (e) => { e.stopPropagation(); this.handleSRS('good'); });
    this.ui.btnEasy.addEventListener("click", (e) => { e.stopPropagation(); this.handleSRS('easy'); });

    // 4. Audio & Mic
    this.ui.btnMic.addEventListener("click", (e) => { e.stopPropagation(); this.startListening(); });
    
    const setupAudio = (btn, rate, type) => {
        if(btn) btn.addEventListener("click", (e) => { 
            e.stopPropagation(); 
            this.playAudio(rate, type); 
        });
    };
    setupAudio(this.ui.btnAudioFrontNormal, 1.0, 'front');
    setupAudio(this.ui.btnAudioBackNormal, 1.0, 'vocab');
    setupAudio(this.ui.btnAudioBackSlow, 0.5, 'vocab');
    setupAudio(this.ui.btnAudioSentNormal, 1.0, 'sentence');

    // 5. Completion Flow
    this.ui.btnNextCategory.addEventListener("click", () => this.goToNextCategory());
    this.ui.btnRestartSet.addEventListener("click", () => this.restartCurrentSet());

    // Keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.flipCard();
      }
    });
  }

  // --- Core Features ---

  filterCards() {
    let filtered = this.allCards;
    
    // 1. Filter by Category
    if (this.currentCategory !== "all") {
        filtered = filtered.filter(c => c.category === this.currentCategory);
    }
    
    // 2. Filter by Known (Remove Known)
    filtered = filtered.filter(c => !this.knownCards.has(c.id));

    // 3. Filter by Search
    if (this.searchTerm) {
        filtered = filtered.filter(c => 
            c.vocab.toLowerCase().includes(this.searchTerm) || 
            c.meaning.toLowerCase().includes(this.searchTerm) ||
            (c.exampleEn && c.exampleEn.toLowerCase().includes(this.searchTerm))
        );
    }

    this.activeCards = filtered; // Reset active deck
    this.currentIndex = 0;
    this.resetCardState();
    this.updateDisplay();
  }

  updateDisplay() {
    const count = this.activeCards.length;
    this.ui.progressText.innerText = `${count} left`;
    const progressPercent = this.allCards.length > 0 ? ((this.allCards.length - count) / this.allCards.length) * 100 : 0;
    this.ui.progressBar.style.width = `${Math.min(100, progressPercent)}%`;

    this.ui.nextCategoryArea.classList.add('hidden');
    this.ui.tapHint.style.opacity = '0.6';

    if (count === 0) { 
        this.showEmptyState(); 
        return; 
    }
    
    const card = this.activeCards[this.currentIndex];
    this.ui.cardCategory.innerText = card.category.replace('หมวด', '').trim();
    this.ui.micFeedback.innerHTML = ""; 

    // REVERSE MODE LOGIC
    if (this.isReversed) {
        // Front = Meaning (Thai), Back = Vocab (Eng)
        this.ui.questionLabel.innerText = "Translate to English";
        this.ui.cardFrontText.innerText = card.meaning;
        this.ui.cardFrontText.classList.remove('font-heading'); // Use standard font for Thai
        
        // Hide Front Audio in Reverse mode (since it's Thai text)
        this.ui.btnAudioFrontNormal.style.display = 'none';
    } else {
        // Normal Mode
        this.ui.questionLabel.innerText = "Translate to Thai";
        this.ui.cardFrontText.innerText = card.exampleEn ? `"${card.exampleEn}"` : card.vocab;
        this.ui.cardFrontText.classList.add('font-heading');
        
        this.ui.btnAudioFrontNormal.style.display = 'flex';
    }
    
    // Back Content (Always showing full info)
    this.ui.cardBackVocab.innerText = `${card.vocab} ${card.type || ''}`;
    this.ui.cardMeaning.innerText = card.meaning;
    this.ui.cardExTh.innerText = card.exampleTh || "-";
    this.ui.cardExEn.innerText = card.exampleEn ? `"${card.exampleEn}"` : "-";
    this.ui.btnAudioSentNormal.style.display = card.exampleEn ? 'flex' : 'none';
  }

  handleSRS(rating) {
    if (this.activeCards.length === 0) return;
    const card = this.activeCards[this.currentIndex];

    // Animation Feedback
    const btn = rating === 'again' ? this.ui.btnAgain : (rating === 'good' ? this.ui.btnGood : this.ui.btnEasy);
    btn.classList.add('scale-110', 'brightness-110');
    setTimeout(() => btn.classList.remove('scale-110', 'brightness-110'), 150);

    if (rating === 'easy') {
        // Known: Remove from deck
        this.knownCards.add(card.id);
        localStorage.setItem("knownCards", JSON.stringify([...this.knownCards]));
        this.activeCards.splice(this.currentIndex, 1);
        
    } else if (rating === 'good') {
        // Good: Move to end of queue
        this.activeCards.push(this.activeCards.splice(this.currentIndex, 1)[0]);
        // currentIndex doesn't change because next card slides into 0 (if we remove) 
        // BUT wait, splice removes it, so next card becomes current index.
        // Actually, let's keep it simple: Remove from current, Push to back.
        // If array is [A, B, C] and we move A to back -> [B, C, A]. Index 0 is now B.
        // So currentIndex stays 0.
        
    } else if (rating === 'again') {
        // Again: Insert 3 spots later (or end)
        const current = this.activeCards.splice(this.currentIndex, 1)[0];
        const insertIndex = Math.min(this.activeCards.length, 3);
        this.activeCards.splice(insertIndex, 0, current);
    }

    this.resetCardState();
    setTimeout(() => this.updateDisplay(), 300);
  }

  // --- Pronunciation ---
  startListening() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Browser นี้ไม่รองรับการสั่งงานด้วยเสียง (แนะนำ Chrome)");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const feedback = this.ui.micFeedback;
    const micBtn = this.ui.btnMic;

    recognition.start();
    micBtn.classList.add('mic-listening');
    feedback.innerHTML = "<span class='text-indigo-500'>Listening...</span>";
    feedback.style.opacity = '1';

    recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript.toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = this.activeCards[this.currentIndex].vocab.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        micBtn.classList.remove('mic-listening');
        
        if (spoken === target || target.includes(spoken)) {
            feedback.innerHTML = `<span class="text-green-500 font-bold"><i class="fa-solid fa-check"></i> Correct! (${event.results[0][0].transcript})</span>`;
            // Auto flip if correct? Maybe just feedback.
        } else {
            feedback.innerHTML = `<span class="text-red-500"><i class="fa-solid fa-xmark"></i> Try again (${event.results[0][0].transcript})</span>`;
        }
    };

    recognition.onerror = (e) => {
        micBtn.classList.remove('mic-listening');
        feedback.innerHTML = "<span class='text-slate-400'>Error, try again.</span>";
    };
    
    recognition.onend = () => {
         micBtn.classList.remove('mic-listening');
    };
  }

  // --- Audio ---
  playAudio(rate, type) {
    if (this.activeCards.length === 0) return;
    const card = this.activeCards[this.currentIndex];
    let text = "";
    
    // Logic for Reverse Mode Audio
    if (this.isReversed && type === 'front') {
        // Front is Thai, do we read Thai? WebSpeech supports it but voice might vary.
        // Let's skip front audio for reverse mode or read vocab as hint?
        // Let's just return to avoid confusion.
        return;
    }

    if (type === 'front') text = card.exampleEn ? card.exampleEn : card.vocab;
    else if (type === 'vocab') text = card.vocab;
    else if (type === 'sentence') text = card.exampleEn;
    
    if (text) this.speak(text, rate);
  }

  speak(text, rate) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.voices.length ? this.voices : window.speechSynthesis.getVoices();
    // Try to find English Female voice
    const voice = voices.find(v => (v.lang.includes('en-US') || v.lang.includes('en-GB')) && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female')));
    if (voice) utterance.voice = voice;
    utterance.lang = 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }

  // --- Settings ---
  toggleTheme() {
    this.isDark = !this.isDark;
    localStorage.setItem("theme", this.isDark ? "dark" : "light");
    document.documentElement.classList.toggle('dark', this.isDark);
  }

  toggleReverse() {
    this.isReversed = !this.isReversed;
    localStorage.setItem("isReversed", this.isReversed);
    this.updateReverseUI();
    this.updateDisplay();
  }

  updateReverseUI() {
    if(this.isReversed) {
        this.ui.btnReverse.classList.add('text-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/30');
        this.ui.reverseIndicator.classList.remove('hidden');
    } else {
        this.ui.btnReverse.classList.remove('text-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/30');
        this.ui.reverseIndicator.classList.add('hidden');
    }
  }

  // --- Data Management ---
  exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([...this.knownCards]));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "engflash_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            this.knownCards = new Set([...this.knownCards, ...imported]);
            localStorage.setItem("knownCards", JSON.stringify([...this.knownCards]));
            alert(`Imported ${imported.length} known cards successfully!`);
            this.filterCards();
        } catch (err) {
            alert("Invalid File Format");
        }
    };
    reader.readAsText(file);
  }

  resetProgress() {
    if (confirm("Reset ALL progress? This cannot be undone.")) {
        this.knownCards.clear();
        localStorage.removeItem("knownCards");
        this.currentCategory = this.categoryList[0];
        localStorage.setItem("lastCategory", this.currentCategory);
        this.ui.categorySelect.value = this.currentCategory;
        this.filterCards();
    }
  }

  // --- Navigation & Helper ---
  resetCardState() {
    this.isFlipped = false;
    this.ui.cardContainer.classList.remove("flipped");
  }

  flipCard() {
    if (this.activeCards.length === 0) return;
    this.isFlipped = !this.isFlipped;
    this.ui.cardContainer.classList.toggle("flipped", this.isFlipped);
  }

  showEmptyState() {
    this.ui.nextCategoryArea.classList.remove('hidden');
    this.ui.cardFrontText.innerText = "";
  }

  goToNextCategory() {
      const currentCatIndex = this.categoryList.indexOf(this.currentCategory);
      if (currentCatIndex !== -1 && currentCatIndex < this.categoryList.length - 1) {
          const nextCat = this.categoryList[currentCatIndex + 1];
          this.ui.categorySelect.value = nextCat;
          // Trigger change event logic manually
          this.currentCategory = nextCat;
          localStorage.setItem("lastCategory", this.currentCategory);
          this.filterCards();
      } else {
          alert("You've finished all categories! Great job!");
      }
  }
  
  restartCurrentSet() {
      // Logic: Bring back known cards OF THIS CATEGORY to active deck?
      // For now, simpler logic: just clear known cards for this specific category? 
      // Or simply filter activeCards again (which won't work if they are in knownCards).
      // Let's assume the user wants to review. We have to temporarily ignore knownCards logic or remove them from knownCards.
      // Better UX: Ask to "Unlearn" this category.
      if(confirm("Review this category again? (This will unmark these cards as known)")) {
          const cardsInCat = this.allCards.filter(c => c.category === this.currentCategory);
          cardsInCat.forEach(c => this.knownCards.delete(c.id));
          localStorage.setItem("knownCards", JSON.stringify([...this.knownCards]));
          this.filterCards();
      }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FlashcardApp(RAW_DATA);
});