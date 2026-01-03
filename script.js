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

    this.knownCards = new Set(JSON.parse(localStorage.getItem("knownCards") || "[]"));
    this.currentCategory = localStorage.getItem("lastCategory") || "all";

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
      
      // Elements for Empty State
      nextCategoryArea: document.getElementById("next-category-area"),
      btnNextCategory: document.getElementById("btn-next-category"),
      frontAudioBtns: document.getElementById("front-audio-btns"),
      tapHint: document.getElementById("tap-hint"),
      questionLabel: document.getElementById("question-label"),
    };

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
    
    this.ui.btnNextCategory.addEventListener("click", (e) => {
        e.stopPropagation();
        this.goToNextCategory();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") this.navigate(1);
      if (e.key === "ArrowLeft") this.navigate(-1);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.flipCard();
      }
    });

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
    
    // รีเซ็ต UI ให้เป็นปกติก่อน (แสดงปุ่มเสียง, ซ่อนปุ่ม Next Category)
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
    const progressPercent = ((this.currentIndex + 1) / count) * 100;
    this.ui.progressBar.style.width = `${progressPercent}%`;
    
    this.ui.btnPrev.disabled = this.currentIndex === 0;
    this.ui.btnNext.disabled = this.currentIndex === count - 1;
    this.ui.btnKnown.disabled = false;
    
    if (!card.exampleEn) this.ui.btnAudioSentNormal.style.display = 'none';
    else this.ui.btnAudioSentNormal.style.display = 'block';
  }

  showEmptyState() {
    // ปรับข้อความและซ่อน Element รกๆ ด้านหน้า
    this.ui.cardCategory.innerText = "Completed";
    this.ui.cardFrontText.innerHTML = "🎉 ยอดเยี่ยม!<br><span class='text-lg font-normal text-slate-500 block mt-4'>คุณเรียนรู้ครบทุกคำในหมวดนี้แล้ว</span>";
    this.ui.questionLabel.innerText = "Finish";
    
    // ซ่อนปุ่มเสียงและคำแนะนำ
    this.ui.frontAudioBtns.style.opacity = '0';
    this.ui.frontAudioBtns.style.pointerEvents = 'none';
    this.ui.tapHint.style.opacity = '0';

    this.ui.progressText.innerText = "0 / 0";
    this.ui.progressBar.style.width = "100%";
    
    this.ui.btnPrev.disabled = true;
    this.ui.btnNext.disabled = true;
    this.ui.btnKnown.disabled = true;

    // ตรวจสอบและแสดงปุ่ม Next Category
    const currentCatIndex = this.categoryList.indexOf(this.currentCategory);
    if (this.currentCategory !== 'all' && currentCatIndex !== -1 && currentCatIndex < this.categoryList.length - 1) {
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
      this.knownCards.clear();
      localStorage.removeItem("knownCards");
      const targetCategory = "หมวดผู้คน";
      if (this.categoryList.includes(targetCategory)) {
          this.ui.categorySelect.value = targetCategory;
          this.changeCategory(targetCategory);
      } else if (this.categoryList.length > 0) {
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