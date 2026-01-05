export function parseFlashcardData(text, categoriesSet, allCardsArray) {
    const lines = text.split("\n");
    let currentCategory = "General";
    let currentCard = null;

    const generateId = (vocab, exampleEn) => {
        const v = vocab ? vocab.toLowerCase().replace(/[^a-z0-9]/g, '') : 'unknown';
        const e = exampleEn ? exampleEn.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) : 'noex';
        return `${v}-${e}`;
    };

    const pushWithSplit = (card) => {
        if (!card) return;
        if (card.exampleEn && card.exampleEn.includes(" / ")) {
            const enParts = card.exampleEn.split(" / ").map(s => s.trim()).filter(s => s);
            const thParts = card.exampleTh ? card.exampleTh.split(" / ").map(s => s.trim()) : [];
            enParts.forEach((en, i) => {
                const newCard = { ...card };
                newCard.exampleEn = en;
                newCard.exampleTh = thParts[i] || thParts[0] || "";
                newCard.id = generateId(newCard.vocab, newCard.exampleEn);
                allCardsArray.push(newCard);
            });
        } else {
            card.id = generateId(card.vocab, card.exampleEn);
            allCardsArray.push(card);
        }
    };

    lines.forEach((line) => {
        line = line.trim();
        if (!line) return;
        if (line.includes("หมวดสรรพนาม ความเป็นเจ้าของหมวดสรรพนาม")) {
            line = "หมวดสรรพนาม ความเป็นเจ้าของ";
        }
        if (line.startsWith("หมวด")) {
            currentCategory = line;
            categoriesSet.add(currentCategory);
        } else {
            const isVocabLine = /^[A-Za-z][A-Za-z0-9'\s/-]*\(.+\)/.test(line);
            if (isVocabLine) {
                if (currentCard) pushWithSplit(currentCard);
                const match = line.match(/^([^(]+)(\([^)]+\))\s*(.*)$/);
                if (match) {
                    const vocab = match[1].trim();
                    const type = match[2].trim();
                    const rawContent = match[3].trim();
                    let meaning = rawContent;
                    let exampleEn = "";
                    let exampleTh = "";
                    const hasThai = /[\u0E00-\u0E7F]/.test(rawContent);
                    if (hasThai) {
                        const splitMatch = rawContent.match(/([\u0E00-\u0E7F]+)\s+([A-Z"])/);
                        if (splitMatch && splitMatch.index) {
                            const splitIndex = rawContent.indexOf(splitMatch[0]) + splitMatch[1].length;
                            meaning = rawContent.substring(0, splitIndex).trim();
                            let remaining = rawContent.substring(splitIndex).trim();
                            const nextThaiMatch = remaining.match(/[\u0E00-\u0E7F]/);
                            if (nextThaiMatch) {
                                exampleEn = remaining.substring(0, nextThaiMatch.index).trim();
                                exampleTh = remaining.substring(nextThaiMatch.index).trim();
                            } else {
                                exampleEn = remaining;
                            }
                        }
                    }
                    currentCard = { category: currentCategory, vocab: vocab, type: type, meaning: meaning, exampleEn: exampleEn, exampleTh: exampleTh };
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
                        if (!currentCard.exampleEn) {
                            currentCard.exampleEn = enPart;
                            currentCard.exampleTh = thPart;
                        } else {
                            currentCard.exampleEn += " / " + enPart;
                            currentCard.exampleTh += " / " + thPart;
                        }
                    }
                } else if (startsWithEng && !hasThai && !isNote) {
                    if (!currentCard.exampleEn) currentCard.exampleEn = line;
                    else currentCard.exampleEn += " / " + line;
                } else if (isNote) {
                    currentCard.meaning += " " + line;
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