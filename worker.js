// Класс для шифра Виженера
class VigenereCipher {
    constructor(alphabet) {
        this.alphabet = alphabet.toUpperCase();
        this.alphabetMap = {};
        this.alphabetSize = this.alphabet.length;
        
        // Создаем карту символов алфавита для быстрого доступа
        for (let i = 0; i < this.alphabetSize; i++) {
            this.alphabetMap[this.alphabet[i]] = i;
        }
    }
    
    // Дешифрование текста
    decrypt(ciphertext, key) {
        let result = '';
        const keyUpper = key.toUpperCase();
        let keyIndex = 0;
        
        for (let i = 0; i < ciphertext.length; i++) {
            const char = ciphertext[i];
            const upperChar = char.toUpperCase();
            
            if (this.alphabetMap[upperChar] !== undefined) {
                const textPos = this.alphabetMap[upperChar];
                const keyPos = this.alphabetMap[keyUpper[keyIndex % keyUpper.length]];
                const newPos = (textPos - keyPos + this.alphabetSize) % this.alphabetSize;
                
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
    
    // Генерация ключа по индексу
    generateKey(index, maxLength) {
        let key = '';
        const alphabetSize = this.alphabet.length;
        
        for (let length = 1; length <= maxLength; length++) {
            if (index < Math.pow(alphabetSize, length)) {
                for (let i = 0; i < length; i++) {
                    const charIndex = Math.floor(index / Math.pow(alphabetSize, i)) % alphabetSize;
                    key = this.alphabet[charIndex] + key;
                }
                return key;
            }
            index -= Math.pow(alphabetSize, length);
        }
        
        return '';
    }
}

// Класс для оценки текста
class TextScorer {
    constructor() {
        this.quadgrams = this.loadQuadgrams();
        this.englishFrequencies = this.loadEnglishFrequencies();
        this.cache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
    
    // Загрузка квадграмм английского языка
    loadQuadgrams() {
        // Это упрощенная версия, в реальном приложении нужно загрузить полный набор
        const commonQuadgrams = {
            'TION': 0.0314, 'THER': 0.0267, 'NTHE': 0.0263, 'THAT': 0.0253,
            'OFTH': 0.0246, 'FTHE': 0.0244, 'THES': 0.0234, 'WITH': 0.0232,
            'INTH': 0.0213, 'ATIO': 0.0208, 'OTHE': 0.0206, 'TTHA': 0.0198,
            'NDTH': 0.0196, 'ETHE': 0.0194, 'TOTH': 0.0189, 'DTHE': 0.0187,
            'INGT': 0.0185, 'INGA': 0.0183, 'OFTH': 0.0181, 'REQU': 0.0179,
            'ANDT': 0.0178, 'NGTH': 0.0177, 'IONS': 0.0176, 'EDTH': 0.0175,
            'HERE': 0.0174, 'THEC': 0.0173, 'MENT': 0.0172, 'THEI': 0.0171
        };
        
        // Нормализуем вероятности
        const total = Object.values(commonQuadgrams).reduce((sum, val) => sum + val, 0);
        const normalized = {};
        
        for (const [key, value] of Object.entries(commonQuadgrams)) {
            normalized[key] = value / total;
        }
        
        return normalized;
    }
    
    // Загрузка частот букв английского языка
    loadEnglishFrequencies() {
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
    
    // Основной метод оценки текста
    score(text, method) {
        const cacheKey = `${method}_${text}`;
        
        // Проверка кэша
        if (this.cache.has(cacheKey)) {
            this.cacheHits++;
            return this.cache.get(cacheKey);
        }
        
        this.cacheMisses++;
        
        // Нормализация текста (только буквы алфавита в верхнем регистре)
        const normalized = text.toUpperCase().replace(/[^A-Z]/g, '');
        
        if (normalized.length < 4) {
            return -Infinity;
        }
        
        let score;
        
        switch (method) {
            case 'quadgrams':
                score = this.quadgramScore(normalized);
                break;
                
            case 'indexOfCoincidence':
                score = this.indexOfCoincidence(normalized);
                break;
                
            case 'frequency':
                score = this.frequencyScore(normalized);
                break;
                
            default:
                score = this.quadgramScore(normalized);
        }
        
        // Кэшируем результат (если кэш не слишком большой)
        if (this.cache.size < 10000) {
            this.cache.set(cacheKey, score);
        }
        
        return score;
    }
    
    // Оценка с помощью квадграмм
    quadgramScore(text) {
        let score = 0;
        const textLength = text.length;
        
        for (let i = 0; i < textLength - 3; i++) {
            const quadgram = text.substr(i, 4);
            const probability = this.quadgrams[quadgram] || 1e-10;
            score += Math.log10(probability);
        }
        
        // Нормализуем по длине текста
        return score / (textLength - 3);
    }
    
    // Индекс совпадений
    indexOfCoincidence(text) {
        const counts = {};
        const length = text.length;
        
        // Подсчет частот символов
        for (const char of text) {
            counts[char] = (counts[char] || 0) + 1;
        }
        
        // Расчет индекса совпадений
        let sum = 0;
        for (const char in counts) {
            sum += counts[char] * (counts[char] - 1);
        }
        
        const ic = sum / (length * (length - 1));
        return ic;
    }
    
    // Частотный анализ
    frequencyScore(text) {
        const counts = {};
        const length = text.length;
        
        // Подсчет частот символов
        for (const char of text) {
            counts[char] = (counts[char] || 0) + 1;
        }
        
        // Расчет хи-квадрат статистики
        let chiSquared = 0;
        for (const char in this.englishFrequencies) {
            const expected = this.englishFrequencies[char] * length;
            const observed = counts[char] || 0;
            chiSquared += Math.pow(observed - expected, 2) / expected;
        }
        
        // Инвертируем, так как меньшее значение хи-квадрат лучше
        return -chiSquared;
    }
    
    // Проверка использования памяти
    checkMemory() {
        if (typeof performance !== 'undefined' && performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            return (used / limit) * 100;
        }
        return 0;
    }
}

// Глобальные переменные воркера
let cipher;
let scorer;
let workerId;
let alphabet;
let maxKeyLength;
let ciphertext;
let knownPlaintext;
let scoringMethod;
let startIdx;
let endIdx;
let keysProcessed = 0;
let lastReportTime = 0;
let results = [];

// Обработчик сообщений
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'START':
                handleStart(data);
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            data: {
                workerId,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            }
        });
    }
};

// Обработка команды START
function handleStart(data) {
    workerId = data.workerId;
    alphabet = data.alphabet;
    maxKeyLength = data.maxKeyLength;
    ciphertext = data.ciphertext;
    knownPlaintext = data.knownPlaintext;
    scoringMethod = data.scoringMethod;
    startIdx = data.startIdx || 0;
    endIdx = data.endIdx || Infinity;
    
    cipher = new VigenereCipher(alphabet);
    scorer = new TextScorer();
    
    // Начинаем обработку
    processKeys();
}

// Основной цикл обработки ключей
function processKeys() {
    const batchSize = 100;
    const reportInterval = 1000; // Отчет каждую секунду
    
    let batchStart = startIdx;
    let batchEnd = Math.min(batchStart + batchSize, endIdx);
    
    while (batchStart < endIdx) {
        // Обработка пакета ключей
        for (let i = batchStart; i < batchEnd; i++) {
            try {
                const key = cipher.generateKey(i, maxKeyLength);
                const decrypted = cipher.decrypt(ciphertext, key);
                
                // Проверка на известный фрагмент текста
                if (knownPlaintext && !decrypted.toUpperCase().includes(knownPlaintext.toUpperCase())) {
                    keysProcessed++;
                    continue;
                }
                
                const score = scorer.score(decrypted, scoringMethod);
                
                // Сохраняем только достаточно хорошие результаты
                if (score > -10) {
                    results.push({
                        key,
                        text: decrypted,
                        score
                    });
                }
                
                keysProcessed++;
                
                // Проверка памяти
                if (keysProcessed % 100 === 0 && scorer.checkMemory() > 80) {
                    scorer.cache.clear();
                    self.postMessage({
                        type: 'WARNING',
                        data: {
                            workerId,
                            message: 'Memory threshold exceeded, cache cleared'
                        }
                    });
                }
            } catch (error) {
                console.error(`Error processing key index ${i}:`, error);
                keysProcessed++;
            }
        }
        
        // Отчет о прогрессе
        const now = performance.now();
        if (now - lastReportTime > reportInterval) {
            self.postMessage({
                type: 'PROGRESS',
                data: {
                    workerId,
                    keysTested: keysProcessed
                }
            });
            lastReportTime = now;
        }
        
        // Переход к следующему пакету
        batchStart = batchEnd;
        batchEnd = Math.min(batchStart + batchSize, endIdx);
    }
    
    // Отправка результатов
    self.postMessage({
        type: 'RESULT',
        data: {
            workerId,
            results
        }
    });
    
    // Сообщение о завершении
    self.postMessage({
        type: 'COMPLETE',
        data: { workerId }
    });
}

// Обработка ошибок
self.onerror = function(error) {
    self.postMessage({
        type: 'FATAL_ERROR',
        data: {
            workerId,
            error: {
                message: 'Worker fatal error',
                stack: error.message
            }
        }
    });
    return true; // Предотвращаем вывод ошибки в консоль
};
