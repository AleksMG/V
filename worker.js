class VigenereCipher {
    constructor(alphabet) {
        this.alphabet = alphabet.toUpperCase();
        this.alphabetMap = {};
        this.alphabetSize = this.alphabet.length;
        
        for (let i = 0; i < this.alphabetSize; i++) {
            this.alphabetMap[this.alphabet[i]] = i;
        }
    }
    
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

class TextScorer {
    constructor() {
        this.quadgrams = this.loadQuadgrams();
        this.englishFrequencies = this.loadEnglishFrequencies();
        this.cache = new Map();
    }
    
    loadQuadgrams() {
        const commonQuadgrams = {
            'TION': 0.0314, 'THER': 0.0267, 'NTHE': 0.0263, 'THAT': 0.0253,
            'OFTH': 0.0246, 'FTHE': 0.0244, 'THES': 0.0234, 'WITH': 0.0232,
            'INTH': 0.0213, 'ATIO': 0.0208, 'OTHE': 0.0206, 'TTHA': 0.0198,
            'NDTH': 0.0196, 'ETHE': 0.0194, 'TOTH': 0.0189, 'DTHE': 0.0187
        };
        
        const total = Object.values(commonQuadgrams).reduce((sum, val) => sum + val, 0);
        const normalized = {};
        
        for (const [key, value] of Object.entries(commonQuadgrams)) {
            normalized[key] = value / total;
        }
        
        return normalized;
    }
    
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
    
    score(text, method) {
        if (!text || text.length < 4) return -Infinity;
        
        const cacheKey = `${method}_${text}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
        
        const normalized = text.toUpperCase().replace(/[^A-Z]/g, '');
        if (normalized.length < 4) return -Infinity;
        
        let score;
        switch (method) {
            case 'quadgrams':
                score = this.quadgramScore(normalized);
                break;
            case 'indexOfCoincidence':
                score = this.indexOfCoincidence(normalized) * 100;
                break;
            case 'frequency':
                score = this.frequencyScore(normalized);
                break;
            default:
                const ic = this.indexOfCoincidence(normalized);
                score = ic > 0.06 ? this.quadgramScore(normalized) : this.frequencyScore(normalized);
        }
        
        if (this.cache.size < 10000) this.cache.set(cacheKey, score);
        return score;
    }
    
    quadgramScore(text) {
        let score = 0;
        const textLength = text.length;
        
        for (let i = 0; i < textLength - 3; i++) {
            const quadgram = text.substr(i, 4);
            const probability = this.quadgrams[quadgram] || 1e-10;
            score += Math.log10(probability);
        }
        
        return score / (textLength - 3);
    }
    
    indexOfCoincidence(text) {
        const counts = {};
        const length = text.length;
        
        for (const char of text) {
            counts[char] = (counts[char] || 0) + 1;
        }
        
        let sum = 0;
        for (const char in counts) {
            sum += counts[char] * (counts[char] - 1);
        }
        
        return sum / (length * (length - 1));
    }
    
    frequencyScore(text) {
        const counts = {};
        const length = text.length;
        
        for (const char of text) {
            counts[char] = (counts[char] || 0) + 1;
        }
        
        let chiSquared = 0;
        for (const char in this.englishFrequencies) {
            const expected = this.englishFrequencies[char] * length;
            const observed = counts[char] || 0;
            chiSquared += Math.pow(observed - expected, 2) / expected;
        }
        
        return -chiSquared;
    }
    
    checkMemory() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        }
        return 0;
    }
}

let cipher, scorer, workerId, alphabet, maxKeyLength, ciphertext, knownPlaintext, scoringMethod, startIdx, endIdx;
let keysProcessed = 0, lastReportTime = 0, results = [];

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    try {
        if (type === 'START') {
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
            
            processKeys();
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            data: {
                workerId: workerId || 'unknown',
                error: {
                    message: error.message,
                    stack: error.stack || 'No stack trace'
                }
            }
        });
    }
};

function processKeys() {
    const BATCH_SIZE = 100;
    const REPORT_INTERVAL = 1000;
    
    let batchStart = startIdx;
    let batchEnd = Math.min(batchStart + BATCH_SIZE, endIdx);
    
    while (batchStart < endIdx) {
        for (let i = batchStart; i < batchEnd; i++) {
            try {
                const key = cipher.generateKey(i, maxKeyLength);
                const decrypted = cipher.decrypt(ciphertext, key);
                
                if (knownPlaintext && !decrypted.toUpperCase().includes(knownPlaintext.toUpperCase())) {
                    keysProcessed++;
                    continue;
                }
                
                const score = scorer.score(decrypted, scoringMethod);
                
                if (score > -10) {
                    results.push({
                        key,
                        text: decrypted,
                        score
                    });
                }
                
                keysProcessed++;
                
                if (keysProcessed % 100 === 0 && scorer.checkMemory() > 80) {
                    scorer.cache.clear();
                }
            } catch (error) {
                keysProcessed++;
            }
        }
        
        const now = performance.now();
        if (now - lastReportTime > REPORT_INTERVAL) {
            self.postMessage({
                type: 'PROGRESS',
                data: { workerId, keysTested: keysProcessed }
            });
            lastReportTime = now;
        }
        
        batchStart = batchEnd;
        batchEnd = Math.min(batchStart + BATCH_SIZE, endIdx);
    }
    
    self.postMessage({
        type: 'RESULT',
        data: { workerId, results }
    });
    
    self.postMessage({
        type: 'COMPLETE',
        data: { workerId }
    });
}

self.onerror = function(error) {
    self.postMessage({
        type: 'FATAL_ERROR',
        data: {
            workerId: workerId || 'unknown',
            error: {
                message: error.message,
                stack: error.stack || 'No stack trace'
            }
        }
    });
    return true;
};
