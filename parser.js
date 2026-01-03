// parser.js
export function parseFlashcardData(text, categoriesSet, allCardsArray) {
    const lines = text.split("\n");
    let currentCategory = "General";
    let currentCard = null;

    // ฟังก์ชันช่วยดันการ์ดเข้า Array (รองรับการแยกประโยคด้วย / )
    const pushWithSplit = (card) => {
        if (!card) return;

        // ถ้ามีเครื่องหมาย / ในประโยคภาษาอังกฤษ ให้แยกเป็นหลายการ์ด
        if (card.exampleEn && card.exampleEn.includes("/")) {
            // แยกประโยคด้วย / และตัดช่องว่างหน้าหลัง
            const enParts = card.exampleEn.split("/").map(s => s.trim()).filter(s => s);
            const thParts = card.exampleTh ? card.exampleTh.split("/").map(s => s.trim()) : [];

            // วนลูปสร้างการ์ดตามจำนวนประโยค
            enParts.forEach((en, i) => {
                const newCard = { ...card }; // คัดลอกข้อมูลเดิม (Vocab, Meaning)
                newCard.id = allCardsArray.length; // ให้ ID ใหม่
                newCard.exampleEn = en; // ใส่ประโยคย่อยที่แยกมา
                newCard.exampleTh = thParts[i] || ""; // ใส่คำแปลย่อย (ถ้ามี)
                
                allCardsArray.push(newCard);
            });
        } else {
            // กรณีปกติ (ไม่มี /) ก็บันทึกการ์ดใบเดียว
            card.id = allCardsArray.length;
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
            const isVocabLine = /^[A-Za-z0-9'\s/-]+\(.+\)/.test(line);

            if (isVocabLine) {
                // บันทึกการ์ดใบเก่า (เรียกใช้ฟังก์ชันแยกการ์ด)
                if (currentCard) pushWithSplit(currentCard);

                const match = line.match(/^([^(]+)(\([^)]+\))\s*(.*)$/);
                if (match) {
                    const vocab = match[1].trim();
                    const type = match[2].trim();
                    const rawContent = match[3].trim();
                    
                    let meaning = rawContent;
                    let exampleEn = "";
                    let exampleTh = "";

                    // Smart Splitter Logic (สำหรับแยก Meaning กับ Example ในบรรทัดเดียวกัน)
                    const hasThai = /[\u0E00-\u0E7F]/.test(rawContent);
                    if (hasThai) {
                        let splitIndex = -1;
                        let foundThai = false;
                        for (let i = 0; i < rawContent.length - 1; i++) {
                            const char = rawContent[i];
                            const nextChar = rawContent[i + 1];
                            if (/[\u0E00-\u0E7F]/.test(char)) foundThai = true;
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
                        // id จะถูกใส่ตอน pushWithSplit
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
                    // ถ้ามีโจทย์อยู่แล้ว ให้ต่อด้วย / (เผื่อผู้ใช้ขึ้นบรรทัดใหม่แทนการเขียนติดกัน)
                    if (!currentCard.exampleEn) currentCard.exampleEn = line;
                    else currentCard.exampleEn += " / " + line; // *** เพิ่ม / อัตโนมัติถ้าขึ้นบรรทัดใหม่
                } else {
                    if (currentCard.exampleEn) {
                        if (!currentCard.exampleTh) currentCard.exampleTh = line;
                        else currentCard.exampleTh += " / " + line; // *** เพิ่ม / อัตโนมัติ
                    } else {
                        currentCard.meaning += " " + line;
                    }
                }
            }
        }
    });

    // บันทึกการ์ดใบสุดท้าย
    if (currentCard) pushWithSplit(currentCard);
}
