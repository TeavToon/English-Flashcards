// script.js
import { RAW_DATA } from './data.js';
import { parseFlashcardData } from './parser.js';

class FlashcardApp {
  constructor(rawData) {
    this.allCards = [];
    this.categories = new Set();
    this.categoryList = [];
    this.activeCards = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.voices = [];
    
    // Drag detection variables
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Load State
    try {
        this.knownCards = new Set(JSON.parse(localStorage.getItem("knownCards") || "[]"));
    } catch (e) {
        this.knownCards = new Set();
    }
    
    this.currentCategory = localStorage.getItem("lastCategory") || "all";

    // Bind UI Elements
    this.ui = {
      categorySelect: document.getElementById("category-select"),
      totalCount: document.getElementById("total-count"),
      cardContainer: document.getElementById("flashcard"),
      
      // Content Elements
      cardCategory: document.getElementById("card-category"),
      cardFrontText: document.getElementById("card-front-text"),
      cardBackVocab: document.getElementById("card-vocab-back"),
      cardMeaning: document.getElementById("card-meaning"),
      cardExTh: document.getElementById("card-ex-th"),
      cardExEn: document.getElementById("card-ex-en"),
      
      // Progress & Controls
      progressText: document.getElementById("progress-text"),
      progressBar: document.getElementById("progress-bar"),
      btnPrev: document.getElementById("btn-prev"),
      btnNext: document.getElementById("btn-next"),
      btnKnown: document.getElementById("btn-known"),
      btnShuffle: document.getElementById("btn-shuffle"),
      btnReset: document.getElementById("btn-reset"),
      
      // Audio Buttons
      btnAudioFrontSlow: document.getElementById("btn-audio-front-slow"), // Hidden dummy
      btnAudioFrontNormal: document.getElementById("btn-audio-front-normal"),
      btnAudioBackSlow: document.getElementById("btn-audio-back-slow"),
      btnAudioBackNormal: document.getElementById("btn-audio-back-normal"),
      btnAudioSentNormal: document.getElementById("btn-audio-sent-normal"),
      
      // States & Hints
      nextCategoryArea: document.getElementById("next-category-area"),
      btnNextCategory: document.getElementById("btn-next-category"),
      frontAudioBtns: document.getElementById("front-audio-btns"),
      tapHint: document.getElementById("tap-hint"),
      questionLabel: document.getElementById("question-label"),
    };

    // Initialize Voice
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
            this.voices = window.speechSynthesis.getVoices();
        };
    }

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
    
    this.filterCards(this.ui.categorySelect.value);
  }
  
  setupCategories() {
    this.ui.categorySelect.innerHTML = '<option value="all">All Categories</option>';
    this.categoryList.forEach((cat) => {
      // ตัดคำว่า "หมวด" ออกเพื่อให้ดูสั้นกระชับใน Mobile
      const shortCat = cat.replace('หมวด', '').trim();
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = shortCat;
      this.ui.categorySelect.appendChild(option);
    });
  }

  setupEventListeners() {
    this.ui.categorySelect.addEventListener("change", (e) => this.changeCategory(e.target.value));
    this.ui.btnNext.addEventListener("click", (e) => { e.stopPropagation(); this.navigate(1); });
    this.ui.btnPrev.addEventListener("click", (e) => { e.stopPropagation(); this.navigate(-1); });

    // --- Drag vs Click Logic ---
    const handleStart = (x, y) => { this.isDragging = false; this.startX = x; this.startY = y; };
    const handleMove = (x, y) => {
        if (Math.abs(x - this.startX) > 10 || Math.abs(y - this.startY) > 10) this.isDragging = true;
    };

    this.ui.cardContainer.addEventListener("mousedown", (e) => handleStart(e.clientX, e.clientY));
    this.ui.cardContainer.addEventListener("touchstart", (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY), {passive: true});

    this.ui.cardContainer.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
    this.ui.cardContainer.addEventListener("touchmove", (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true});

    this.ui.cardContainer.addEventListener("click", (e) => {
        if (this.isDragging) return; // ถ้าลากอยู่ ห้ามพลิก
        if (e.target.closest('button')) return; // ถ้ากดปุ่ม ห้ามพลิก
        this.flipCard();
    });

    // Control Buttons
    this.ui.btnShuffle.addEventListener("click", () => this.shuffleCards());
    this.ui.btnKnown.addEventListener("click", (e) => { e.stopPropagation(); this.markAsKnown(); });
    this.ui.btnReset.addEventListener("click", () => this.resetProgress());
    this.ui.btnNextCategory.addEventListener("click", (e) => { e.stopPropagation(); this.goToNextCategory(); });

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") this.navigate(1);
      if (e.key === "ArrowLeft") this.navigate(-1);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.flipCard();
      }
    });

    // Audio Binding
    const setupAudio = (btn, rate, type) => {
        if(btn) btn.addEventListener("click", (e) => { 
            e.stopPropagation(); 
            this.playCurrentCardAudio(rate, type); 
        });
    };
    setupAudio(this.ui.btnAudioFrontNormal, 1.0, 'front');
    setupAudio(this.ui.btnAudioBackNormal, 1.0, 'vocab');
    setupAudio(this.ui.btnAudioBackSlow, 0.5, 'vocab');
    setupAudio(this.ui.btnAudioSentNormal, 1.0, 'sentence');
  }

  // --- Logic Functions ---
  changeCategory(newCategory) {
      this.currentCategory = newCategory;
      localStorage.setItem("lastCategory", this.currentCategory);
      this.filterCards(this.currentCategory);
  }

  playCurrentCardAudio(rate, type) {
    if (this.activeCards.length === 0) return;
    const card = this.activeCards[this.currentIndex];
    let text = "";
    if (type === 'front') text = card.exampleEn ? card.exampleEn : card.vocab;
    else if (type === 'vocab') text = card.vocab;
    else if (type === 'sentence') text = card.exampleEn;
    if (text) this.speak(text, rate);
  }

  speak(text, rate) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice Selection (English Female Preferred)
    let voices = this.voices.length ? this.voices : window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => (v.lang.includes('en-US') || v.lang.includes('en-GB')) && (v.name.includes('Google') || v.name.includes('Samantha')));
    
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = 'en-US'; 
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }

  filterCards(category) {
    if (category === "all") {
      this.activeCards = this.allCards.filter((c) => !this.knownCards.has(c.id));
    } else {
      this.activeCards = this.allCards.filter((c) => c.category === category && !this.knownCards.has(c.id));
    }
    this.currentIndex = 0;
    this.resetCardState();
    this.updateDisplay();
  }

  updateDisplay() {
    const count = this.activeCards.length;
    this.ui.totalCount.innerText = count;
    this.ui.nextCategoryArea.classList.add('hidden');
    this.ui.frontAudioBtns.style.opacity = '1';
    this.ui.frontAudioBtns.style.pointerEvents = 'auto';
    this.ui.tapHint.style.opacity = '0.6';
    this.ui.questionLabel.innerText = "Question";

    // Handle Empty State
    if (count === 0) { 
        this.showEmptyState(); 
        return; 
    }
    
    // Render Card Content
    const card = this.activeCards[this.currentIndex];
    // ตัดคำว่า "หมวด" ออกจาก Badge
    this.ui.cardCategory.innerText = card.category.replace('หมวด', '').trim();
    this.ui.cardFrontText.innerText = card.exampleEn ? `"${card.exampleEn}"` : card.vocab;
    this.ui.cardBackVocab.innerText = `${card.vocab} ${card.type || ''}`;
    this.ui.cardMeaning.innerText = card.meaning;
    this.ui.cardExTh.innerText = card.exampleTh || "-";
    this.ui.cardExEn.innerText = card.exampleEn ? `"${card.exampleEn}"` : "-";
    
    // Update Progress
    this.ui.progressText.innerText = `${this.currentIndex + 1} / ${count}`;
    const percent = ((this.currentIndex + 1) / count) * 100;
    this.ui.progressBar.style.width = `${percent}%`;
    
    // Button States
    this.ui.btnPrev.disabled = this.currentIndex === 0;
    this.ui.btnNext.disabled = this.currentIndex === count - 1;
    this.ui.btnKnown.disabled = false;
    
    this.ui.btnAudioSentNormal.style.display = card.exampleEn ? 'flex' : 'none';
  }

  showEmptyState() {
    this.ui.cardCategory.innerText = "Completed";
    this.ui.cardFrontText.innerHTML = "🎉 <br><span class='text-base font-normal text-slate-400 block mt-4'>เก่งมาก! จำครบทุกคำแล้ว</span>";
    this.ui.questionLabel.innerText = "Finish";
    this.ui.frontAudioBtns.style.opacity = '0';
    this.ui.frontAudioBtns.style.pointerEvents = 'none';
    this.ui.tapHint.style.opacity = '0';
    this.ui.progressText.innerText = "0 / 0";
    this.ui.progressBar.style.width = "100%";
    this.ui.btnPrev.disabled = true;
    this.ui.btnNext.disabled = true;
    this.ui.btnKnown.disabled = true;

    // Suggest Next Category
    let nextCatIndex = -1;
    if (this.currentCategory !== 'all') {
        const currentIdx = this.categoryList.indexOf(this.currentCategory);
        if (currentIdx !== -1 && currentIdx < this.categoryList.length - 1) {
            nextCatIndex = currentIdx + 1;
        }
    }

    if (nextCatIndex !== -1) {
        this.ui.nextCategoryArea.classList.remove('hidden');
        const nextCatName = this.categoryList[nextCatIndex].replace('หมวด', '').trim();
        this.ui.btnNextCategory.innerHTML = `<span>ไป ${nextCatName}</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  }
  
  goToNextCategory() {
      const currentCatIndex = this.categoryList.indexOf(this.currentCategory);
      if (currentCatIndex !== -1 && currentCatIndex < this.categoryList.length - 1) {
          const nextCat = this.categoryList[currentCatIndex + 1];
          this.ui.categorySelect.value = nextCat;
          this.changeCategory(nextCat);
      }
  }

  resetCardState() {
    this.isFlipped = false;
    this.ui.cardContainer.classList.remove("flipped");
  }

  flipCard() {
    if (this.activeCards.length === 0) return;
    this.isFlipped = !this.isFlipped;
    this.ui.cardContainer.classList.toggle("flipped", this.isFlipped);
  }

  navigate(direction) {
    if (this.activeCards.length === 0) return;
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.activeCards.length) {
      this.currentIndex = newIndex;
      this.resetCardState();
      setTimeout(() => this.updateDisplay(), 200);
    }
  }

  markAsKnown() {
    if (this.activeCards.length === 0) return;
    const card = this.activeCards[this.currentIndex];
    
    // Animation Effect
    const btn = this.ui.btnKnown;
    btn.classList.add('scale-110', 'bg-emerald-400');
    setTimeout(() => btn.classList.remove('scale-110', 'bg-emerald-400'), 150);

    this.knownCards.add(card.id);
    localStorage.setItem("knownCards", JSON.stringify([...this.knownCards]));
    
    // Remove from active & Update
    this.activeCards.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.activeCards.length) {
      this.currentIndex = Math.max(0, this.activeCards.length - 1);
    }
    
    this.resetCardState();
    setTimeout(() => this.updateDisplay(), 300); // Delay นิดหน่อยให้ตาปรับทัน
  }

  shuffleCards() {
    for (let i = this.activeCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.activeCards[i], this.activeCards[j]] = [this.activeCards[j], this.activeCards[i]];
    }
    this.currentIndex = 0;
    this.resetCardState();
    this.updateDisplay();
    
    // Feedback animation
    this.ui.btnShuffle.classList.add('rotate-180');
    setTimeout(() => this.ui.btnShuffle.classList.remove('rotate-180'), 300);
  }

  resetProgress() {
    if (confirm("ล้างประวัติคำที่จำได้แล้วทั้งหมด?")) {
      this.knownCards.clear();
      localStorage.removeItem("knownCards");
      this.filterCards(this.currentCategory);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FlashcardApp(RAW_DATA);
});