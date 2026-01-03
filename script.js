// script.js
import { RAW_DATA } from './data.js'; 
import { parseFlashcardData } from './parser.js';

class FlashcardApp {
  constructor(rawData) {
    this.allCards = [];
    this.categories = new Set();
    this.categoryList = []; // เก็บรายชื่อหมวดหมู่แบบ Array เพื่อให้หาลำดับถัดไปได้
    this.activeCards = [];
    this.currentIndex = 0;
    this.isFlipped = false;

    // Load ข้อมูลจาก LocalStorage
    this.knownCards = new Set(JSON.parse(localStorage.getItem("knownCards") || "[]"));
    this.currentCategory = localStorage.getItem("lastCategory") || "all";

    // Bind UI Elements
    this.ui = {
      categorySelect: document.getElementById("category-select"),
      totalCount: document.getElementById("total-count"),
      cardContainer: document.getElementById("flashcard"),
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
      
      // เพิ่มส่วนนี้: พื้นที่ปุ่มไปหมวดถัดไป
      nextCategoryArea: document.getElementById("next-category-area"),
      btnNextCategory: document.getElementById("btn-next-category"),
    };

    this.init(rawData);
  }

  init(rawData) {
    parseFlashcardData(rawData, this.categories, this.allCards);
    
    // แปลง Set เป็น Array เพื่อใช้หา Next Category
    this.categoryList = Array.from(this.categories); 
    
    this.setupCategories();
    this.setupEventListeners();
    
    // ตรวจสอบว่าหมวดปัจจุบันถูกต้องไหม
    if (this.categoryList.includes(this.currentCategory) || this.currentCategory === 'all') {
        this.ui.categorySelect.value = this.currentCategory;
    } else {
        this.ui.categorySelect.value = 'all';
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
    this.ui.categorySelect.addEventListener("change", (e) => {
      this.changeCategory(e.target.value);
    });

    this.ui.btnNext.addEventListener("click", (e) => { e.stopPropagation(); this.navigate(1); });
    this.ui.btnPrev.addEventListener("click", (e) => { e.stopPropagation(); this.navigate(-1); });
    this.ui.cardContainer.addEventListener("click", () => this.flipCard());
    this.ui.btnShuffle.addEventListener("click", () => this.shuffleCards());
    this.ui.btnKnown.addEventListener("click", (e) => {
      e.stopPropagation();
      this.markAsKnown();
    });
    this.ui.btnReset.addEventListener("click", () => this.resetProgress());
    
    // ปุ่มไปหมวดถัดไป
    this.ui.btnNextCategory.addEventListener("click", (e) => {
        e.stopPropagation();
        this.goToNextCategory();
    });

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") this.navigate(1);
      if (e.key === "ArrowLeft") this.navigate(-1);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.flipCard();
      }
    });

    // ปุ่มเสียง
    this.ui.btnAudioFrontNormal.addEventListener("click", (e) => { e.stopPropagation(); this.playCurrentCardAudio(1.0, 'front'); });
    this.ui.btnAudioFrontSlow.addEventListener("click", (e) => { e.stopPropagation(); this.playCurrentCardAudio(0.5, 'front'); });
    this.ui.btnAudioBackNormal.addEventListener("click", (e) => { e.stopPropagation(); this.playCurrentCardAudio(1.0, 'vocab'); });
    this.ui.btnAudioBackSlow.addEventListener("click", (e) => { e.stopPropagation(); this.playCurrentCardAudio(0.5, 'vocab'); });
    this.ui.btnAudioSentNormal.addEventListener("click", (e) => { e.stopPropagation(); this.playCurrentCardAudio(1.0, 'sentence'); });
  }

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
    
    // Logic เลือกเสียงผู้หญิง
    let voices = window.speechSynthesis.getVoices();
    const femaleVoiceNames = ['Google US English', 'Microsoft Zira', 'Samantha', 'Google UK English Female', 'Karen', 'Tessa'];
    let selectedVoice = voices.find(v => 
        (v.lang.includes('en-US') || v.lang.includes('en-GB')) && 
        femaleVoiceNames.some(name => v.name.includes(name))
    );
    if (!selectedVoice) selectedVoice = voices.find(v => (v.lang.includes('en-US') || v.lang.includes('en-GB')) && v.name.toLowerCase().includes('female'));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang === 'en-US');

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
    this.ui.nextCategoryArea.classList.add('hidden'); // ซ่อนปุ่ม Next Category ไว้ก่อน

    if (count === 0) { this.showEmptyState(); return; }
    
    const card = this.activeCards[this.currentIndex];
    
    this.ui.cardCategory.innerText = card.category;
    this.ui.cardFrontText.innerText = card.exampleEn ? `"${card.exampleEn}"` : card.vocab;
    this.ui.cardBackVocab.innerText = `${card.vocab} ${card.type}`;
    this.ui.cardMeaning.innerText = card.meaning;
    this.ui.cardExTh.innerText = card.exampleTh || "-";
    this.ui.cardExEn.innerText = card.exampleEn ? `"${card.exampleEn}"` : "-";
    
    this.ui.progressText.innerText = `${this.currentIndex + 1} / ${count}`;
    const progressPercent = ((this.currentIndex + 1) / count) * 100;
    this.ui.progressBar.style.width = `${progressPercent}%`;
    
    this.ui.btnPrev.disabled = this.currentIndex === 0;
    this.ui.btnNext.disabled = this.currentIndex === count - 1;
    this.ui.btnKnown.disabled = false;
    
    if (!card.exampleEn) this.ui.btnAudioSentNormal.style.display = 'none';
    else this.ui.btnAudioSentNormal.style.display = 'block';
  }

  showEmptyState() {
    this.ui.cardCategory.innerText = "Completed";
    this.ui.cardFrontText.innerText = "🎉 ยอดเยี่ยม!";
    this.ui.cardBackVocab.innerText = "หมดแล้ว";
    this.ui.cardMeaning.innerText = "คุณเรียนรู้ครบทุกคำในหมวดนี้แล้ว";
    this.ui.cardExTh.innerText = "กดปุ่ม 'รีเซ็ต' หรือเลือกหมวดอื่น";
    this.ui.cardExEn.innerText = "";
    this.ui.progressText.innerText = "0 / 0";
    this.ui.progressBar.style.width = "100%";
    
    this.ui.btnPrev.disabled = true;
    this.ui.btnNext.disabled = true;
    this.ui.btnKnown.disabled = true;

    // ตรวจสอบว่ามีหมวดถัดไปให้ไปต่อไหม
    const currentCatIndex = this.categoryList.indexOf(this.currentCategory);
    if (this.currentCategory !== 'all' && currentCatIndex !== -1 && currentCatIndex < this.categoryList.length - 1) {
        // ถ้าไม่ใช่หมวดสุดท้าย ให้โชว์ปุ่มไปต่อ
        this.ui.nextCategoryArea.classList.remove('hidden');
        this.ui.btnNextCategory.innerHTML = `<span>ไป ${this.categoryList[currentCatIndex + 1]}</span> <i class="fa-solid fa-arrow-right"></i>`;
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
    setTimeout(() => this.updateDisplay(), 200);
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
    if (confirm("ต้องการล้างประวัติทั้งหมด และกลับไปเริ่มที่ 'หมวดผู้คน' ใช่ไหม?")) {
      // 1. ล้างความจำ
      this.knownCards.clear();
      localStorage.removeItem("knownCards");
      
      // 2. บังคับเปลี่ยนไปหมวด "หมวดผู้คน" (หรือหมวดแรกถ้าหาไม่เจอ)
      const targetCategory = "หมวดผู้คน";
      if (this.categoryList.includes(targetCategory)) {
          this.ui.categorySelect.value = targetCategory;
          this.changeCategory(targetCategory);
      } else if (this.categoryList.length > 0) {
          // ถ้าไม่มีหมวดผู้คน (เช่น ข้อมูลเปลี่ยน) ให้ไปหมวดแรก
          this.ui.categorySelect.value = this.categoryList[0];
          this.changeCategory(this.categoryList[0]);
      } else {
          this.changeCategory('all');
      }

      alert("รีเซ็ตเรียบร้อยแล้ว!");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FlashcardApp(RAW_DATA);
});