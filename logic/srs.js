export class SRSLogic {
    static handleRating(deck, currentIndex, rating) {
        if (deck.length === 0) return { action: 'none' };
        const currentCard = deck[currentIndex];
        if (rating === 'easy') {
            deck.splice(currentIndex, 1);
            const nextIndex = currentIndex >= deck.length ? Math.max(0, deck.length - 1) : currentIndex;
            return { action: 'remove', card: currentCard, nextIndex };
        } 
        if (rating === 'good') {
            deck.splice(currentIndex, 1);
            deck.push(currentCard);
            const nextIndex = currentIndex >= deck.length ? Math.max(0, deck.length - 1) : currentIndex;
            return { action: 'move_back', nextIndex };
        } 
        if (rating === 'again') {
            deck.splice(currentIndex, 1);
            const insertPos = Math.min(currentIndex + 3, deck.length);
            deck.splice(insertPos, 0, currentCard);
            const nextIndex = currentIndex >= deck.length ? Math.max(0, deck.length - 1) : currentIndex;
            return { action: 'insert_soon', nextIndex };
        }
    }
}