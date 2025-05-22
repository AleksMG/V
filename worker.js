class VigenereCipher {
    constructor(alphabet) {
        this.alphabet = alphabet.toUpperCase();
        this.charToIndex = new Map();
        
        // Создаем карту символов для быстрого доступа
        for (let i = 0; i < this.alphabet.length; i++) {
            this.charToIndex.set(this.alphabet[i], i);
        }
    }

    decrypt(ciphertext, key) {
        let result = '';
        const keyUpper = key.toUpperCase();
        let keyIndex = 0;

        for (const char of ciphertext) {
            const upperChar = char.toUpperCase();
            
            if (this.charToIndex.has(upperChar)) {
                const textPos = this.charToIndex.get(upperChar);
                const keyPos = this.charToIndex.get(keyUpper[keyIndex % keyUpper.length]);
                const newPos = (textPos - keyPos + this.alphabet.length) % this.alphabet.length;
                
                let newChar = this.alphabet[newPos];
                // Сохраняем оригинальный регистр
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

    generateKey(index, maxLength) {
        let key = '';
        const alphabetSize = this.alphabet.length;
        
        for (let length = 1; length <= maxLength; length++) {
            const keysOfLength = Math.pow(alphabetSize, length);
            if (index < keysOfLength) {
                for (let i = 0; i < length; i++) {
                    const charIndex = Math.floor(index / Math.pow(alphabetSize, i)) % alphabetSize;
                    key = this.alphabet[charIndex] + key;
                }
                return key;
            }
            index -= keysOfLength;
        }
        
        return '';
    }
}

class ProfessionalTextScorer {
    constructor() {
        // Полные статистики английского языка
        this.trigrams = {
            'THE': 0.0181, 'AND': 0.0073, 'ING': 0.0072, 'ION': 0.0042,
            'ENT': 0.0042, 'HER': 0.0036, 'FOR': 0.0034, 'THA': 0.0033,
            'NTH': 0.0033, 'INT': 0.0032, 'ERE': 0.0031, 'TIO': 0.0031,
            'TER': 0.0030, 'EST': 0.0028, 'ERS': 0.0028, 'ATI': 0.0027,
            'HAT': 0.0026, 'ATE': 0.0026, 'ALL': 0.0026, 'ETH': 0.0026,
            'HES': 0.0025, 'VER': 0.0024, 'HIS': 0.0024, 'OFT': 0.0022,
            'ITH': 0.0022, 'FTH': 0.0022, 'STH': 0.0021, 'OTH': 0.0021
        };

        this.shortWords = new Set([
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN',
            'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM',
            'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO',
            'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'OF',
            'TO', 'IN', 'IT', 'IS', 'BE', 'AS', 'AT', 'SO', 'WE', 'HE', 'BY', 'OR',
            'ON', 'DO', 'IF', 'ME', 'MY', 'UP', 'AN', 'GO', 'NO', 'US', 'AM'
        ]);

        this.impossiblePairs = [
            'QJ', 'QG', 'QK', 'QX', 'QZ', 'WQ', 'WX', 'WZ', 'XJ', 'XK',
            'XQ', 'XZ', 'ZQ', 'ZJ', 'ZX', 'FV', 'FJ', 'FQ', 'FZ', 'JV',
            'JQ', 'JX', 'JZ', 'PQ', 'QC', 'QE', 'QD', 'QT', 'QY', 'QB'
        ];
    }

    score(text) {
        const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
        if (cleanText.length < 15) return -Infinity;

        // 1. Основные оценки
        const trigramScore = this._calculateTrigramScore(cleanText);
        const shortWordScore = this._calculateShortWordScore(text); // Оригинальный текст с регистром
        const caseConsistency = this._checkCaseConsistency(text);

        // 2. Штрафы
        const impossiblePairPenalty = this._calculateImpossiblePairPenalty(cleanText);

        // Комбинированная оценка
        return (trigramScore * 0.6) + 
               (shortWordScore * 0.35) + 
               (caseConsistency * 0.05) - 
               (impossiblePairPenalty * 1.5);
    }

    _calculateTrigramScore(text) {
        let score = 0;
        const textLength = text.length;
        
        for (let i = 0; i < textLength - 2; i++) {
            const trigram = text.substr(i, 3);
            const probability = this.trigrams[trigram] || 1e-12;
            score += Math.log10(probability);
        }
        
        return score / (textLength - 2);
    }

    _calculateShortWordScore(text) {
        const words = text.split(/[^a-zA-Z']+/);
        let score = 0;
        let validWordCount = 0;
        
        for (const word of words) {
            if (word.length >= 2 && word.length <= 3) {
                if (this.shortWords.has(word.toUpperCase())) {
                    // Больший вес для более коротких слов
                    const weight = word.length === 2 ? 1.5 : 1.2;
                    score += weight;
                    validWordCount++;
                }
            }
        }
        
        return validWordCount > 0 ? score / validWordCount : 0;
    }

    _calculateImpossiblePairPenalty(text) {
        let penalty = 0;
        for (let i = 0; i < text.length - 1; i++) {
            const pair = text.substr(i, 2).toUpperCase();
            if (this.impossiblePairs.includes(pair)) {
                penalty += 3.0;
            }
        }
        return penalty;
    }

    _checkCaseConsistency(text) {
        let caseChanges = 0;
        let totalLetters = 0;
        let prevWasUpper = null;
        
        for (const char of text) {
            if (/[a-zA-Z]/.test(char)) {
                const isUpper = char === char.toUpperCase();
                if (prevWasUpper !== null && prevWasUpper !== isUpper) {
                    caseChanges++;
                }
                prevWasUpper = isUpper;
                totalLetters++;
            }
        }
        
        if (totalLetters < 5) return 0;
        return 1 - Math.min(caseChanges / (totalLetters / 2), 1);
    }

    highlightText(text) {
        // Подсветка коротких слов и триграмм
        return text.replace(/([a-zA-Z']+)/g, word => {
            if (this.shortWords.has(word.toUpperCase())) {
                return `<span class="highlight-word" data-score="${this.score(word)}">${word}</span>`;
            }
            return word;
        });
    }
}

// Главный обработчик Worker
let cipher, scorer;
let currentTaskId = 0;

self.onmessage = function(e) {
    const {type, taskId, data} = e.data;
    
    // Отмена предыдущей задачи при получении новой
    if (taskId && taskId !== currentTaskId) return;
    currentTaskId = taskId;

    switch(type) {
        case 'INIT':
            cipher = new VigenereCipher(data.alphabet);
            scorer = new ProfessionalTextScorer();
            self.postMessage({type: 'READY'});
            break;

        case 'PROCESS':
            processBatch(data.batch, data.ciphertext, data.maxKeyLength, taskId);
            break;

        case 'STOP':
            self.close();
            break;
    }
};

function processBatch(batch, ciphertext, maxKeyLength, taskId) {
    const results = [];
    let keysProcessed = 0;

    for (const key of batch) {
        if (taskId !== currentTaskId) return; // Проверка актуальности задачи
        
        try {
            const decrypted = cipher.decrypt(ciphertext, key);
            const score = scorer.score(decrypted);
            
            if (score > -2) { // Порог отсечения
                results.push({
                    key,
                    text: decrypted,
                    highlighted: scorer.highlightText(decrypted),
                    score: parseFloat(score.toFixed(4))
                });
            }
        } catch (error) {
            console.error(`Error processing key ${key}:`, error);
        }
        
        keysProcessed++;
        
        // Отчет о прогрессе каждые 100 ключей
        if (keysProcessed % 100 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                processed: keysProcessed,
                taskId
            });
        }
    }

    self.postMessage({
        type: 'RESULTS',
        results,
        taskId
    });
}
