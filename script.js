// script.js
import { RAW_DATA } from './data.js';     // ดึงข้อมูลมา
import { parseFlashcardData } from './parser.js'; // ดึงตัวตัดคำมา

class FlashcardApp {
  constructor(rawData) {
    this.allCards = [];
    this.categories = new Set();
    this.activeCards = [];
    this.currentIndex = 0;
    this.isFlipped = false;

    this.knownCards = new Set(JSON.parse(localStorage.getItem("knownCards") || "[]"));
    this.currentCategory = localStorage.getItem("lastCategory") || "all";

    // Cache DOM Elements (เหมือนเดิม)
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
    };

    this.init(rawData);
  }

  init(rawData) {
    // เรียกใช้ parser จากไฟล์อื่น!
    parseFlashcardData(rawData, this.categories, this.allCards);
    
    this.setupCategories();
    this.setupEventListeners();
    this.ui.categorySelect.value = this.currentCategory;
    this.filterCards(this.currentCategory);
  }
  
  setupCategories() {
    this.categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      this.ui.categorySelect.appendChild(option);
    });
  }

  setupEventListeners() {
    this.ui.categorySelect.addEventListener("change", (e) => {
      this.currentCategory = e.target.value;
      localStorage.setItem("lastCategory", this.currentCategory);
      this.filterCards(this.currentCategory);
    });

    this.ui.btnNext.addEventListener("click", () => this.navigate(1));
    this.ui.btnPrev.addEventListener("click", () => this.navigate(-1));
    this.ui.cardContainer.addEventListener("click", () => this.flipCard());
    this.ui.btnShuffle.addEventListener("click", () => this.shuffleCards());
    this.ui.btnKnown.addEventListener("click", (e) => {
      e.stopPropagation();
      this.markAsKnown();
    });
    this.ui.btnReset.addEventListener("click", () => this.resetProgress());

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
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1;
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
    this.ui.cardExTh.innerText = "กดปุ่ม 'รีเซ็ต' หรือเลือกหมวดอื่นเพื่อเริ่มใหม่";
    this.ui.cardExEn.innerText = "";
    this.ui.progressText.innerText = "0 / 0";
    this.ui.progressBar.style.width = "100%";
    this.ui.btnPrev.disabled = true;
    this.ui.btnNext.disabled = true;
    this.ui.btnKnown.disabled = true;
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
    if (confirm("ต้องการล้างประวัติคำที่จำได้แล้วทั้งหมดใช่ไหม?")) {
      this.knownCards.clear();
      localStorage.removeItem("knownCards");
      this.filterCards(this.ui.categorySelect.value);
      alert("รีเซ็ตเรียบร้อยแล้ว!");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FlashcardApp(RAW_DATA);
});