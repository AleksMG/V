class NGramAnalyzer {
    constructor(alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        this.setAlphabet(alphabet);
        this.loadLanguageModels();
        this.cache = new Map();
    }

    setAlphabet(alphabet) {
        if (new Set(alphabet).size !== alphabet.length) {
            throw new Error('Alphabet must contain unique characters');
        }
        this.alphabet = alphabet.toUpperCase();
        this.charToIndex = {};
        for (let i = 0; i < this.alphabet.length; i++) {
            this.charToIndex[this.alphabet[i]] = i;
        }
    }

    loadLanguageModels() {
        // Загрузка частот N-грамм (упрощенная версия)
        this.unigrams = this.getEnglishUnigrams();
        this.bigrams = this.getEnglishBigrams();
        this.trigrams = this.getEnglishTrigrams();
        this.quadgrams = this.getEnglishQuadgrams();
        
        // Паттерны для штрафов
        this.penaltyPatterns = [
            { pattern: /Q[^U]/g, penalty: -15 }, // Q не перед U
            { pattern: /[JZQX]{2,}/g, penalty: -10 }, // Повторы редких букв
            { pattern: /([^AEIOU]{4,})/g, penalty: -8 }, // Длинные последовательности согласных
            { pattern: /(['A-Z]{5,})/g, penalty: -5 } // Слишком длинные слова
        ];
    }

    getEnglishUnigrams() {
        return {
            'A': 0.08167, 'B': 0.01492, 'C': 0.02782, 'D': 0.04253,
            'E': 0.12702, 'F': 0.02228, 'G': 0.02015, 'H': 0.06094,
            'I': 0.06966, 'J': 0.00153, 'K': 0.00772, 'L': 0.04025,
            'M': 0.02406, 'N': 0.06749, 'O': 0.07507, 'P': 0.01929,
            'Q': 0.00095, 'R': 0.05987, 'S': 0.06327, 'T': 0.09056,
            'U': 0.02758, 'V': 0.00978, 'W': 0.02360, 'X': 0.00150,
            'Y': 0.01974, 'Z': 0.00074
        };
    }

    getEnglishBigrams() {
        return {
            'TH': 0.0388, 'HE': 0.0368, 'IN': 0.0228, 'ER': 0.0218,
            'AN': 0.0214, 'RE': 0.0174, 'ND': 0.0157, 'AT': 0.0152,
            'ON': 0.0148, 'NT': 0.0146, 'HA': 0.0142, 'ES': 0.0141,
            'ST': 0.0139, 'EN': 0.0138, 'ED': 0.0134, 'TO': 0.0134,
            'IT': 0.0131, 'OU': 0.0128, 'EA': 0.0127, 'HI': 0.0126
        };
    }

    getEnglishTrigrams() {
        return {
            'THE': 0.0352, 'AND': 0.0157, 'ING': 0.0115, 'HER': 0.0082,
            'HAT': 0.0067, 'HIS': 0.0065, 'THA': 0.0061, 'ERE': 0.0059,
            'FOR': 0.0058, 'ENT': 0.0057, 'ION': 0.0056, 'TER': 0.0050,
            'WAS': 0.0049, 'YOU': 0.0048, 'ITH': 0.0046, 'VER': 0.0044
        };
    }

    getEnglishQuadgrams() {
        return {
            'TION': 0.0314, 'THER': 0.0267, 'NTHE': 0.0263, 'THAT': 0.0253,
            'OFTH': 0.0246, 'FTHE': 0.0244, 'THES': 0.0234, 'WITH': 0.0232,
            'INTH': 0.0213, 'ATIO': 0.0208, 'OTHE': 0.0206, 'TTHA': 0.0198
        };
    }

    decrypt(ciphertext, key) {
        let result = '';
        const keyUpper = key.toUpperCase();
        let keyIndex = 0;

        for (let i = 0; i < ciphertext.length; i++) {
            const char = ciphertext[i];
            const upperChar = char.toUpperCase();

            if (this.charToIndex[upperChar] !== undefined) {
                const textPos = this.charToIndex[upperChar];
                const keyPos = this.charToIndex[keyUpper[keyIndex % keyUpper.length]];
                const newPos = (textPos - keyPos + this.alphabet.length) % this.alphabet.length;
                
                let newChar = this.alphabet[newPos];
                if (char === char.toLowerCase()) {
                    newChar = newChar.toLowerCase();
                }
                
                result += newChar;
                keyIndex++;
            } else {
                result += char;
            }
        }

        return result;
    }

    evaluateText(text) {
        const cacheKey = text;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        // Нормализация текста
        const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
        if (cleanText.length < 4) return -Infinity;

        let score = 0;
        const length = cleanText.length;

        // Оценка по N-граммам
        score += this.scoreQuadgrams(cleanText) * 2; // Наибольший вес
        score += this.scoreTrigrams(cleanText) * 1.5;
        score += this.scoreBigrams(cleanText);
        score += this.scoreUnigrams(cleanText) * 0.5;

        // Штрафы за невозможные паттерны
        score += this.applyPenalties(text);

        // Кэширование результата
        this.cache.set(cacheKey, score);
        if (this.cache.size > 10000) this.cache.clear();

        return score;
    }

    scoreUnigrams(text) {
        let score = 0;
        for (const char of text) {
            score += Math.log10(this.unigrams[char] || 1e-10);
        }
        return score / text.length;
    }

    scoreBigrams(text) {
        let score = 0;
        let count = 0;
        for (let i = 0; i < text.length - 1; i++) {
            const bigram = text.substr(i, 2);
            score += Math.log10(this.bigrams[bigram] || 1e-12);
            count++;
        }
        return count > 0 ? score / count : 0;
    }

    scoreTrigrams(text) {
        let score = 0;
        let count = 0;
        for (let i = 0; i < text.length - 2; i++) {
            const trigram = text.substr(i, 3);
            score += Math.log10(this.trigrams[trigram] || 1e-14);
            count++;
        }
        return count > 0 ? score / count : 0;
    }

    scoreQuadgrams(text) {
        let score = 0;
        let count = 0;
        for (let i = 0; i < text.length - 3; i++) {
            const quadgram = text.substr(i, 4);
            score += Math.log10(this.quadgrams[quadgram] || 1e-16);
            count++;
        }
        return count > 0 ? score / count : 0;
    }

    applyPenalties(text) {
        let penalty = 0;
        for (const { pattern, penalty: p } of this.penaltyPatterns) {
            const matches = text.match(pattern);
            if (matches) penalty += matches.length * p;
        }
        return penalty;
    }
}

// Работа с воркером
let analyzer = new NGramAnalyzer();

self.onmessage = function(e) {
    const { type, data } = e.data;

    try {
        switch (type) {
            case 'INIT':
                analyzer = new NGramAnalyzer(data.alphabet);
                self.postMessage({ type: 'READY' });
                break;

            case 'DECRYPT':
                const decrypted = analyzer.decrypt(data.ciphertext, data.key);
                const score = analyzer.evaluateText(decrypted);
                self.postMessage({
                    type: 'RESULT',
                    data: { key: data.key, decrypted, score }
                });
                break;

            case 'BATCH':
                const results = [];
                for (const key of data.keys) {
                    const decrypted = analyzer.decrypt(data.ciphertext, key);
                    const score = analyzer.evaluateText(decrypted);
                    results.push({ key, decrypted, score });
                }
                self.postMessage({ type: 'BATCH_RESULT', data: results });
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error.message
        });
    }
};
