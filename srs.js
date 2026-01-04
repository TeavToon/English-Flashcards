// srs.js
export class SRSLogic {
    /**
     * จัดการลำดับการ์ดตามเรตติ้ง
     * @param {Array} deck - กองการ์ดปัจจุบัน
     * @param {Number} currentIndex - ตำแหน่งปัจจุบัน
     * @param {String} rating - 'again' | 'good' | 'easy'
     * @returns {Object} ผลลัพธ์ { action: 'next'|'remove', newIndex: number }
     */
    static handleRating(deck, currentIndex, rating) {
        if (deck.length === 0) return { action: 'none' };

        const currentCard = deck[currentIndex];

        if (rating === 'easy') {
            // ลบออกจากกอง (จำได้แล้ว)
            deck.splice(currentIndex, 1);
            // ถ้าลบตัวสุดท้าย ให้ index ถอยกลับมา
            const nextIndex = currentIndex >= deck.length ? Math.max(0, deck.length - 1) : currentIndex;
            return { action: 'remove', card: currentCard, nextIndex };
        } 
        
        if (rating === 'good') {
            // ย้ายไปท้ายแถว
            deck.splice(currentIndex, 1);
            deck.push(currentCard);
            // index เดิมจะกลายเป็นการ์ดใบถัดไปโดยอัตโนมัติ
            const nextIndex = currentIndex >= deck.length ? Math.max(0, deck.length - 1) : currentIndex;
            return { action: 'move_back', nextIndex };
        } 
        
        if (rating === 'again') {
            // แทรกในอีก 3 คิวถัดไป (หรือท้ายสุดถ้าน้อยกว่า 3)
            deck.splice(currentIndex, 1);
            const insertPos = Math.min(currentIndex + 3, deck.length);
            deck.splice(insertPos, 0, currentCard);
            
            const nextIndex = currentIndex >= deck.length ? Math.max(0, deck.length - 1) : currentIndex;
            return { action: 'insert_soon', nextIndex };
        }
    }
}