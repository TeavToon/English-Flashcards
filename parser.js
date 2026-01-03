// parser.js
export function parseFlashcardData(text, categoriesSet, allCardsArray) {
    const lines = text.split("\n");
    let currentCategory = "General";
    let currentCard = null;

    // ฟังก์ชันสร้าง ID ที่ไม่ซ้ำและคงที่ (Stable ID)
    // สร้างจาก Vocab + ExampleEn (ตัดช่องว่างและตัวอักษรพิเศษออก)
    const generateId = (vocab, exampleEn) => {
        const v = vocab ? vocab.toLowerCase().replace(/[^a-z0-9]/g, '') : 'unknown';
        const e = exampleEn ? exampleEn.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) : 'noex';
        return `${v}-${e}`;
    };

    const pushWithSplit = (card) => {
        if (!card) return;

        // แยกการ์ดกรณีมีเครื่องหมาย / ในประโยคภาษาอังกฤษ
        if (card.exampleEn && card.exampleEn.includes(" / ")) {
            const enParts = card.exampleEn.split(" / ").map(s => s.trim()).filter(s => s);
            const thParts = card.exampleTh ? card.exampleTh.split(" / ").map(s => s.trim()) : [];

            enParts.forEach((en, i) => {
                const newCard = { ...card };
                newCard.exampleEn = en;
                newCard.exampleTh = thParts[i] || "";
                // สร้าง ID ใหม่สำหรับแต่ละส่วนย่อย
                newCard.id = generateId(newCard.vocab, newCard.exampleEn);
                allCardsArray.push(newCard);
            });
        } else {
            // สร้าง ID ปกติ
            card.id = generateId(card.vocab, card.exampleEn);
            allCardsArray.push(card);
        }
    };

    lines.forEach((line) => {
        line = line.trim();
        if (!line) return;

        if (line.startsWith("หมวด")) {
            currentCategory = line;
            categoriesSet.add(currentCategory);
        } else {
            // เช็คว่าเป็นบรรทัดศัพท์หรือไม่ Pattern: คำศัพท์ (ชนิดคำ) ...
            const isVocabLine = /^[A-Za-z0-9'\s/-]+\(.+\)/.test(line);

            if (isVocabLine) {
                if (currentCard) pushWithSplit(currentCard); // บันทึกการ์ดก่อนหน้า

                const match = line.match(/^([^(]+)(\([^)]+\))\s*(.*)$/);
                if (match) {
                    const vocab = match[1].trim();
                    const type = match[2].trim();
                    const rawContent = match[3].trim();
                    
                    let meaning = rawContent;
                    let exampleEn = "";
                    let exampleTh = "";

                    // Smart Splitter: แยก Meaning ออกจาก Example กรณีอยู่บรรทัดเดียวกัน
                    const hasThai = /[\u0E00-\u0E7F]/.test(rawContent);
                    if (hasThai) {
                        let splitIndex = -1;
                        let foundThai = false;
                        for (let i = 0; i < rawContent.length - 1; i++) {
                            const char = rawContent[i];
                            const nextChar = rawContent[i + 1];
                            if (/[\u0E00-\u0E7F]/.test(char)) foundThai = true;
                            // จุดตัดคือเมื่อเจอไทยแล้วตามด้วยช่องว่างและตัวอักษรพิมพ์ใหญ่ภาษาอังกฤษ
                            if (foundThai && char === ' ' && /[A-Z]/.test(nextChar)) {
                                splitIndex = i;
                                break;
                            }
                        }
                        if (splitIndex !== -1) {
                            meaning = rawContent.substring(0, splitIndex).trim();
                            let remaining = rawContent.substring(splitIndex).trim();
                            const thaiIndex = remaining.search(/[\u0E00-\u0E7F]/);
                            if (thaiIndex > -1) {
                                exampleEn = remaining.substring(0, thaiIndex).trim();
                                exampleTh = remaining.substring(thaiIndex).trim();
                            } else {
                                exampleEn = remaining;
                            }
                        }
                    }

                    currentCard = {
                        category: currentCategory,
                        vocab: vocab,
                        type: type,
                        meaning: meaning,
                        exampleEn: exampleEn,
                        exampleTh: exampleTh
                    };
                    return;
                }
            }

            // จัดการบรรทัดต่อมา (ที่เป็นประโยคตัวอย่าง หรือคำแปลเพิ่มเติม)
            if (currentCard) {
                const hasThai = /[\u0E00-\u0E7F]/.test(line);
                const startsWithEng = /^[A-Za-z0-9"']/.test(line);
                const isNote = line.startsWith("(") && line.endsWith(")");

                if (startsWithEng && hasThai) {
                    const thaiMatch = line.match(/[\u0E00-\u0E7F]/);
                    if (thaiMatch) {
                        const splitIndex = thaiMatch.index;
                        const enPart = line.substring(0, splitIndex).trim();
                        const thPart = line.substring(splitIndex).trim();
                        if (!currentCard.exampleEn) currentCard.exampleEn = enPart;
                        if (!currentCard.exampleTh) currentCard.exampleTh = thPart;
                    }
                } else if (startsWithEng && !hasThai && !isNote) {
                    // ใช้ " / " เพื่อแยกประโยคชัดเจนขึ้นสำหรับการ process ในภายหลัง
                    if (!currentCard.exampleEn) currentCard.exampleEn = line;
                    else currentCard.exampleEn += " / " + line; 
                } else {
                    if (currentCard.exampleEn) {
                        if (!currentCard.exampleTh) currentCard.exampleTh = line;
                        else currentCard.exampleTh += " / " + line;
                    } else {
                        currentCard.meaning += " " + line;
                    }
                }
            }
        }
    });

    if (currentCard) pushWithSplit(currentCard);
}