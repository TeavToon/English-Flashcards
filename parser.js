// parser.js
export function parseFlashcardData(text, categoriesSet, allCardsArray) {
    const lines = text.split("\n");
    let currentCategory = "General";
    let currentCard = null;

    lines.forEach((line) => {
        line = line.trim();
        if (!line) return;

        if (line.startsWith("หมวด")) {
            currentCategory = line;
            categoriesSet.add(currentCategory);
        } else {
            const isVocabLine = /^[A-Za-z0-9'\s/-]+\(.+\)/.test(line);

            if (isVocabLine) {
                if (currentCard) allCardsArray.push(currentCard);
                const match = line.match(/^([^(]+)(\([^)]+\))\s*(.*)$/);

                if (match) {
                    const vocab = match[1].trim();
                    const type = match[2].trim();
                    const rawContent = match[3].trim();
                    let meaning = rawContent;
                    let exampleEn = "";
                    let exampleTh = "";

                    // Smart Splitter Logic
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
                        id: allCardsArray.length,
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
                    if (!currentCard.exampleEn) currentCard.exampleEn = line;
                    else currentCard.exampleEn += " " + line;
                } else {
                    if (currentCard.exampleEn) {
                        if (!currentCard.exampleTh) currentCard.exampleTh = line;
                        else currentCard.exampleTh += " " + line;
                    } else {
                        currentCard.meaning += " " + line;
                    }
                }
            }
        }
    });
    if (currentCard) allCardsArray.push(currentCard);
}