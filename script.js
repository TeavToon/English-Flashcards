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
    
    // Variables for handling drag vs click
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    try {
        this.knownCards = new Set(JSON.parse(localStorage.getItem("knownCards") || "[]"));
    } catch (e) {
        this.knownCards = new Set();
    }
    
    this.currentCategory = localStorage.getItem("lastCategory") || "all";

    this.ui = {
      categorySelect: document.getElementById("category-select"),
      totalCount: document.getElementById("total-count"),
      cardContainer: document.getElementById("flashcard"),
      // ... (รายการ UI เดิมเหมือนเดิม) ...
      cardCategory: document.getElementById("card-category"),
      cardFrontText: document.getElementById("card-front-text"),
      cardBackVocab: document.getElementById("card-vocab-back"),
      cardMeaning: document.getElementById("card-meaning"),
      cardExTh: document.getElementById("card-ex-th"),
      cardExEn: document.getElementById("card-ex-en"),
      progressText: document.getElementById("progress-text"),
      progressBar: document.getElementById("progress-bar"),
      btnPrev: document.getElementById("btn-prev"),
      btnNext: document.getElementById("btn-next"),
      btnKnown: document.getElementById("btn-known"),
      btnShuffle: document.getElementById("btn-shuffle"),
      btnReset: document.getElementById("btn-reset"),
      btnAudioFrontSlow: document.getElementById("btn-audio-front-slow"),
      btnAudioFrontNormal: document.getElementById("btn-audio-front-normal"),
      btnAudioBackSlow: document.getElementById("btn-audio-back-slow"),
      btnAudioBackNormal: document.getElementById("btn-audio-back-normal"),
      btnAudioSentNormal: document.getElementById("btn-audio-sent-normal"),
      nextCategoryArea: document.getElementById("next-category-area"),
      btnNextCategory: document.getElementById("btn-next-category"),
      frontAudioBtns: document.getElementById("front-audio-btns"),
      backAudioBtns: document.getElementById("back-audio-btns"),
      tapHint: document.getElementById("tap-hint"),
      questionLabel: document.getElementById("question-label"),
    };

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
    this.ui.categorySelect.innerHTML = '<option value="all">ทั้งหมด (All Categories)</option>';
    this.categoryList.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      this.ui.categorySelect.appendChild(option);
    });
  }

  setupEventListeners() {
    this.ui.categorySelect.addEventListener("change", (e) => this.changeCategory(e.target.value));
    this.ui.btnNext.addEventListener("click", (e) => { e.stopPropagation(); this.navigate(1); });
    this.ui.btnPrev.addEventListener("click", (e) => { e.stopPropagation(); this.navigate(-1); });

    // --- BUG FIX: Drag & Selection Handling ---
    const handleDragStart = (x, y) => {
        this.isDragging = false;
        this.startX = x;
        this.startY = y;
    };

    const handleDragMove = (x, y) => {
        // ถ้าขยับเกิน 10px ถือว่ากำลังลาก/เลื่อน (ไม่ใช่ Click)
        if (Math.abs(x - this.startX) > 10 || Math.abs(y - this.startY) > 10) {
            this.isDragging = true;
        }
    };

    this.ui.cardContainer.addEventListener("mousedown", (e) => handleDragStart(e.clientX, e.clientY));
    this.ui.cardContainer.addEventListener("touchstart", (e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY));

    this.ui.cardContainer.addEventListener("mousemove", (e) => handleDragMove(e.clientX, e.clientY));
    this.ui.cardContainer.addEventListener("touchmove", (e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY));

    this.ui.cardContainer.addEventListener("click", (e) => {
        // 1. ถ้าเป็นการลาก (Scroll) ไม่พลิก
        if (this.isDragging) return;
        // 2. ถ้ามีการเลือกข้อความ (Highlight Text) ไม่พลิก
        if (window.getSelection().toString().length > 0) return;
        // 3. ถ้ากดปุ่ม (เช่น ปุ่มเสียง) ไม่พลิก
        if (e.target.closest('button')) return;
        
        this.flipCard();
    });
    // ------------------------------------------

    this.ui.btnShuffle.addEventListener("click", () => this.shuffleCards());
    this.ui.btnKnown.addEventListener("click", (e) => { e.stopPropagation(); this.markAsKnown(); });
    this.ui.btnReset.addEventListener("click", () => this.resetProgress());
    this.ui.btnNextCategory.addEventListener("click", (e) => { e.stopPropagation(); this.goToNextCategory(); });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") this.navigate(1);
      if (e.key === "ArrowLeft") this.navigate(-1);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.flipCard();
      }
    });

    const setupAudioBtn = (btn, rate, type) => {
        if(btn) btn.addEventListener("click", (e) => { 
            e.stopPropagation(); 
            this.playCurrentCardAudio(rate, type); 
        });
    };
    setupAudioBtn(this.ui.btnAudioFrontNormal, 1.0, 'front');
    setupAudioBtn(this.ui.btnAudioFrontSlow, 0.5, 'front');
    setupAudioBtn(this.ui.btnAudioBackNormal, 1.0, 'vocab');
    setupAudioBtn(this.ui.btnAudioBackSlow, 0.5, 'vocab');
    setupAudioBtn(this.ui.btnAudioSentNormal, 1.0, 'sentence');
  }

  // ... (ฟังก์ชัน changeCategory, updateDisplay และอื่นๆ เหมือนเดิม) ...
  changeCategory(newCategory) {
      this.currentCategory = newCategory;
      localStorage.setItem("lastCategory", this.currentCategory);
      this.filterCards(this.currentCategory);
  }

  playCurrentCardAudio(rate, type) {
    if (this.activeCards.length === 0) return;
    const card = this.activeCards[this.currentIndex];
    let textToSpeak = "";
    if (type === 'front') textToSpeak = card.exampleEn ? card.exampleEn : card.vocab;
    else if (type === 'vocab') textToSpeak = card.vocab;
    else if (type === 'sentence') textToSpeak = card.exampleEn;
    if (textToSpeak) this.speak(textToSpeak, rate);
  }

  speak(text, rate) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voices.length === 0) this.voices = window.speechSynthesis.getVoices();

    let voices = this.voices;
    const femaleVoiceNames = ['Google US English', 'Microsoft Zira', 'Samantha', 'Google UK English Female', 'Karen', 'Tessa'];
    
    // BUG FIX: Normalize language code (en_US -> en-US)
    let selectedVoice = voices.find(v => {
        const lang = v.lang.replace('_', '-').toLowerCase();
        return (lang.includes('en-us') || lang.includes('en-gb')) && 
               femaleVoiceNames.some(name => v.name.includes(name));
    });
    
    if (!selectedVoice) selectedVoice = voices.find(v => {
        const lang = v.lang.replace('_', '-').toLowerCase();
        return (lang.includes('en-us') || lang.includes('en-gb')) && 
               v.name.toLowerCase().includes('female');
    });

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
    this.ui.tapHint.style.opacity = '1';
    this.ui.questionLabel.innerText = "Question";

    if (count === 0) { this.showEmptyState(); return; }
    
    const card = this.activeCards[this.currentIndex];
    this.ui.cardCategory.innerText = card.category;
    this.ui.cardFrontText.innerText = card.exampleEn ? `"${card.exampleEn}"` : card.vocab;
    this.ui.cardBackVocab.innerText = `${card.vocab} ${card.type}`;
    this.ui.cardMeaning.innerText = card.meaning;
    this.ui.cardExTh.innerText = card.exampleTh || "-";
    this.ui.cardExEn.innerText = card.exampleEn ? `"${card.exampleEn}"` : "-";
    
    this.ui.progressText.innerText = `${this.currentIndex + 1} / ${count}`;
    const progressPercent = count > 0 ? ((this.currentIndex + 1) / count) * 100 : 0;
    this.ui.progressBar.style.width = `${progressPercent}%`;
    
    this.ui.btnPrev.disabled = this.currentIndex === 0;
    this.ui.btnNext.disabled = this.currentIndex === count - 1;
    this.ui.btnKnown.disabled = false;
    
    if (!card.exampleEn) this.ui.btnAudioSentNormal.style.display = 'none';
    else this.ui.btnAudioSentNormal.style.display = 'block';
  }

  showEmptyState() {
    this.ui.cardCategory.innerText = "Completed";
    this.ui.cardFrontText.innerHTML = "🎉 ยอดเยี่ยม!<br><span class='text-lg font-normal text-slate-500 block mt-4'>คุณเรียนรู้ครบทุกคำในหมวดนี้แล้ว</span>";
    this.ui.questionLabel.innerText = "Finish";
    this.ui.frontAudioBtns.style.opacity = '0';
    this.ui.frontAudioBtns.style.pointerEvents = 'none';
    this.ui.tapHint.style.opacity = '0';
    this.ui.progressText.innerText = "0 / 0";
    this.ui.progressBar.style.width = "100%";
    this.ui.btnPrev.disabled = true;
    this.ui.btnNext.disabled = true;
    this.ui.btnKnown.disabled = true;

    let nextCatIndex = -1;
    if (this.currentCategory !== 'all') {
        const currentIdx = this.categoryList.indexOf(this.currentCategory);
        if (currentIdx !== -1 && currentIdx < this.categoryList.length - 1) {
            nextCatIndex = currentIdx + 1;
        }
    }

    if (nextCatIndex !== -1) {
        this.ui.nextCategoryArea.classList.remove('hidden');
        this.ui.btnNextCategory.innerHTML = `<span>ไป ${this.categoryList[nextCatIndex]}</span> <i class="fa-solid fa-arrow-right"></i>`;
    } else {
        this.ui.nextCategoryArea.classList.add('hidden');
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
    this.knownCards.add(card.id);
    localStorage.setItem("knownCards", JSON.stringify([...this.knownCards]));
    this.activeCards.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.activeCards.length) {
      this.currentIndex = Math.max(0, this.activeCards.length - 1);
    }
    this.resetCardState();
    if (this.activeCards.length === 0) {
        this.updateDisplay();
    } else {
        setTimeout(() => this.updateDisplay(), 200);
    }
  }

  shuffleCards() {
    for (let i = this.activeCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.activeCards[i], this.activeCards[j]] = [this.activeCards[j], this.activeCards[i]];
    }
    this.currentIndex = 0;
    this.resetCardState();
    this.updateDisplay();
  }

  resetProgress() {
    if (confirm("ต้องการล้างประวัติคำศัพท์ที่จำได้แล้วทั้งหมด ใช่หรือไม่?")) {
      this.knownCards.clear();
      localStorage.removeItem("knownCards");
      this.filterCards(this.currentCategory);
      alert("รีเซ็ตเรียบร้อยแล้ว!");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FlashcardApp(RAW_DATA);
});