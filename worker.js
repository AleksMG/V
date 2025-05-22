const workerCode = `
class VigenereCipher {
    constructor(alphabet) {
        this.alphabet = alphabet.toUpperCase();
        this.charToIndex = new Map();
        
        // Создаем карту символов для быстрого доступа
        for (let i = 0; i < this.alphabet.length; i++) {
            this.charToIndex.set(this.alphabet[i], i);
        }
    }

    encrypt(plaintext, key) {
        let result = '';
        const keyUpper = key.toUpperCase();
        let keyIndex = 0;

        for (const char of plaintext) {
            const upperChar = char.toUpperCase();
            
            if (this.charToIndex.has(upperChar)) {
                const textPos = this.charToIndex.get(upperChar);
                const keyPos = this.charToIndex.get(keyUpper[keyIndex % keyUpper.length]);
                const newPos = (textPos + keyPos) % this.alphabet.length;
                
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

    *generateKeys(maxLength) {
        const alphabet = this.alphabet;
        const queue = [...alphabet].map(c => [c]);
        
        while (queue.length > 0) {
            const current = queue.shift();
            yield current.join('');
            
            if (current.length < maxLength) {
                for (const char of alphabet) {
                    queue.push([...current, char]);
                }
            }
        }
    }
}

class AdvancedTextScorer {
    constructor() {
        // Частоты букв в английском языке
        this.letterFrequencies = {
            'E': 0.12702, 'T': 0.09056, 'A': 0.08167, 'O': 0.07507,
            'I': 0.06966, 'N': 0.06749, 'S': 0.06327, 'H': 0.06094,
            'R': 0.05987, 'D': 0.04253, 'L': 0.04025, 'C': 0.02782,
            'U': 0.02758, 'M': 0.02406, 'W': 0.02360, 'F': 0.02228,
            'G': 0.02015, 'Y': 0.01974, 'P': 0.01929, 'B': 0.01492,
            'V': 0.00978, 'K': 0.00772, 'J': 0.00153, 'X': 0.00150,
            'Q': 0.00095, 'Z': 0.00074
        };

        // Частоты диграмм
        this.digrams = {
            'TH': 1.52, 'HE': 1.28, 'IN': 0.94, 'ER': 0.94,
            'AN': 0.82, 'RE': 0.68, 'ND': 0.63, 'AT': 0.59,
            'ON': 0.57, 'NT': 0.56, 'HA': 0.56, 'ES': 0.56,
            'ST': 0.55, 'EN': 0.55, 'ED': 0.53, 'TO': 0.52,
            'IT': 0.50, 'OU': 0.50, 'EA': 0.47, 'HI': 0.46
        };

        this.commonWords = new Set([
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN',
            'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM',
            'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO',
            'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE'
        ]);
    }

    score(text) {
        const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
        if (cleanText.length < 5) return -Infinity;

        // 1. Оценка частот букв
        const letterScore = this._calculateLetterScore(cleanText);
        
        // 2. Оценка диграмм
        const digramScore = this._calculateDigramScore(cleanText);
        
        // 3. Оценка коротких слов
        const wordScore = this._calculateWordScore(text);
        
        // 4. Оценка повторений
        const repetitionScore = this._calculateRepetitionScore(cleanText);

        // Комбинированная оценка
        return (letterScore * 0.4) + 
               (digramScore * 0.3) + 
               (wordScore * 0.2) + 
               (repetitionScore * 0.1);
    }

    _calculateLetterScore(text) {
        const counts = {};
        let score = 0;
        
        // Подсчет букв
        for (const char of text) {
            counts[char] = (counts[char] || 0) + 1;
        }
        
        // Сравнение с эталонными частотами
        for (const [char, freq] of Object.entries(this.letterFrequencies)) {
            const observed = (counts[char] || 0) / text.length;
            score += Math.min(freq, observed);
        }
        
        return score;
    }

    _calculateDigramScore(text) {
        let score = 0;
        
        for (let i = 0; i < text.length - 1; i++) {
            const digram = text.substr(i, 2);
            const probability = this.digrams[digram] || 0.01;
            score += Math.log10(probability);
        }
        
        return score / (text.length - 1);
    }

    _calculateWordScore(text) {
        const words = text.split(/[^a-zA-Z']+/);
        let score = 0;
        let validWords = 0;
        
        for (const word of words) {
            const upperWord = word.toUpperCase();
            if (this.commonWords.has(upperWord)) {
                // Больший вес для более коротких слов
                const weight = word.length === 2 ? 1.5 : 1.0;
                score += weight;
                validWords++;
            }
        }
        
        return validWords > 0 ? score / validWords : 0;
    }

    _calculateRepetitionScore(text) {
        const trigrams = {};
        let repetitions = 0;
        
        for (let i = 0; i < text.length - 2; i++) {
            const trigram = text.substr(i, 3);
            if (trigrams[trigram]) {
                repetitions++;
            } else {
                trigrams[trigram] = true;
            }
        }
        
        // Нормализация (меньше повторений - лучше)
        return 1 - Math.min(repetitions / (text.length / 3), 1);
    }
}

// Главный обработчик Worker
let cipher, scorer;
let currentTaskId = 0;
let abortController = new AbortController();

self.onmessage = function(e) {
    const {type, taskId, data} = e.data;
    
    // Отмена предыдущей задачи при получении новой
    if (taskId && taskId !== currentTaskId) {
        abortController.abort();
        abortController = new AbortController();
    }
    currentTaskId = taskId;

    switch(type) {
        case 'INIT':
            cipher = new VigenereCipher(data.alphabet);
            scorer = new AdvancedTextScorer();
            self.postMessage({type: 'READY'});
            break;

        case 'PROCESS':
            processBatch(data.batch, data.ciphertext, data.maxKeyLength, taskId);
            break;

        case 'STOP':
            abortController.abort();
            self.close();
            break;
    }
};

async function processBatch(batch, ciphertext, maxKeyLength, taskId) {
    const signal = abortController.signal;
    const results = [];
    let keysProcessed = 0;
    const startTime = performance.now();
    let lastUpdateTime = startTime;

    try {
        for (const key of cipher.generateKeys(maxKeyLength)) {
            if (signal.aborted) return;
            
            const decrypted = cipher.decrypt(ciphertext, key);
            const score = scorer.score(decrypted);
            
            if (score > -5) { // Более мягкий порог
                results.push({
                    key,
                    text: decrypted,
                    score: parseFloat(score.toFixed(4))
                });
            }
            
            keysProcessed++;
            
            // Отчет о прогрессе каждые 100мс или 100 ключей
            const now = performance.now();
            if (now - lastUpdateTime > 100 || keysProcessed % 100 === 0) {
                self.postMessage({
                    type: 'PROGRESS',
                    processed: keysProcessed,
                    taskId
                });
                lastUpdateTime = now;
            }
        }

        self.postMessage({
            type: 'RESULTS',
            results: results.sort((a, b) => b.score - a.score).slice(0, 20),
            taskId
        });
    } catch (error) {
        if (!signal.aborted) {
            self.postMessage({
                type: 'ERROR',
                message: error.toString(),
                taskId
            });
        }
    }
}
`;

// Создаем Blob URL для воркера
const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);

// Подключение worker к основному коду
worker.onmessage = function(e) {
    const { type, results, processed, message } = e.data;
    
    switch(type) {
        case 'READY':
            console.log('Worker готов к работе');
            break;
            
        case 'PROGRESS':
            updateProgress(processed);
            break;
            
        case 'RESULTS':
            displayResults(results);
            break;
            
        case 'ERROR':
            showError(message);
            break;
    }
};

function startAttack() {
    const alphabet = document.getElementById('alphabet').value;
    const ciphertext = document.getElementById('ciphertext').value;
    const maxKeyLength = parseInt(document.getElementById('keyLength').value);
    
    worker.postMessage({
        type: 'INIT',
        data: { alphabet }
    });
    
    worker.postMessage({
        type: 'PROCESS',
        taskId: Date.now(),
        data: {
            ciphertext,
            maxKeyLength
        }
    });
}

function stopAttack() {
    worker.postMessage({ type: 'STOP' });
}
