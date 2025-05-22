class VigenereCipher {
    constructor(alphabet) {
        if (!alphabet || alphabet.length === 0) {
            throw new Error("Alphabet cannot be empty");
        }
        
        this.alphabet = alphabet.toUpperCase();
        this.alphabetMap = {};
        
        // Create mapping and check for duplicates
        for (let i = 0; i < this.alphabet.length; i++) {
            const char = this.alphabet[i];
            if (this.alphabetMap[char] !== undefined) {
                throw new Error(`Alphabet contains duplicate character: ${char}`);
            }
            this.alphabetMap[char] = i;
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
}

class TextScorer {
    constructor() {
        this.quadgrams = this.loadQuadgrams();
        this.trigrams = this.loadTrigrams();
        this.cache = new Map();
    }
    
    loadQuadgrams() {
        // English quadgram frequencies (log probabilities)
        return {
            'TION': 3.14, 'THER': 2.67, 'NTHE': 2.63, 'THAT': 2.53,
            'OFTH': 2.46, 'FTHE': 2.44, 'THES': 2.34, 'WITH': 2.32,
            'INTH': 2.13, 'ATIO': 2.08, 'OTHE': 2.06, 'TTHA': 1.98,
            'NDTH': 1.96, 'ETHE': 1.94, 'TOTH': 1.89, 'DTHE': 1.87,
            'INGT': 1.85, 'INGA': 1.83, 'OFTH': 1.81, 'REQU': 1.79
        };
    }
    
    loadTrigrams() {
        // English trigram frequencies (log probabilities)
        return {
            'THE': 3.51, 'AND': 2.99, 'ING': 2.78, 'ENT': 2.71,
            'ION': 2.55, 'HER': 2.45, 'FOR': 2.38, 'THA': 2.34,
            'NTH': 2.33, 'INT': 2.19, 'ERE': 2.16, 'TIO': 2.15,
            'TER': 2.09, 'EST': 2.03, 'ERS': 1.99, 'ATI': 1.97
        };
    }
    
    score(text, method) {
        const cacheKey = `${method}_${text}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const normalized = text.toUpperCase().replace(/[^A-Z]/g, '');
        if (normalized.length < 3) {
            return -Infinity;
        }
        
        let score = 0;
        
        switch (method) {
            case 'quadgrams':
                score = this.quadgramScore(normalized);
                break;
                
            case 'trigrams':
                score = this.trigramScore(normalized);
                break;
                
            case 'index':
                score = this.indexOfCoincidence(normalized);
                break;
                
            default:
                score = this.quadgramScore(normalized);
        }
        
        if (this.cache.size < 10000) {
            this.cache.set(cacheKey, score);
        }
        
        return score;
    }
    
    quadgramScore(text) {
        let score = 0;
        const quadgrams = this.quadgrams;
        const defaultScore = Math.log10(1e-10);
        
        for (let i = 0; i < text.length - 3; i++) {
            const quadgram = text.substr(i, 4);
            score += quadgrams[quadgram] !== undefined ? quadgrams[quadgram] : defaultScore;
        }
        
        return score / (text.length - 3);
    }
    
    trigramScore(text) {
        let score = 0;
        const trigrams = this.trigrams;
        const defaultScore = Math.log10(1e-10);
        
        for (let i = 0; i < text.length - 2; i++) {
            const trigram = text.substr(i, 3);
            score += trigrams[trigram] !== undefined ? trigrams[trigram] : defaultScore;
        }
        
        return score / (text.length - 2);
    }
    
    indexOfCoincidence(text) {
        const counts = {};
        for (const char of text) {
            counts[char] = (counts[char] || 0) + 1;
        }
        
        let sum = 0;
        const n = text.length;
        for (const char in counts) {
            sum += counts[char] * (counts[char] - 1);
        }
        
        return n > 1 ? sum / (n * (n - 1)) : 0;
    }
    
    checkMemory() {
        if (typeof performance !== 'undefined' && performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            return (used / limit) * 100;
        }
        return 0;
    }
}

let cipher;
let scorer;

function processBatch(batch, ciphertext, knownPlaintext, scoringMethod) {
    const results = [];
    let processed = 0;
    
    for (const key of batch) {
        try {
            // Check memory usage periodically
            if (processed > 0 && processed % 100 === 0 && scorer.checkMemory() > 85) {
                scorer.cache.clear();
                self.postMessage({
                    type: 'WARNING',
                    message: 'Memory threshold exceeded, cache cleared'
                });
            }
            
            const decrypted = cipher.decrypt(ciphertext, key);
            
            // Skip if known plaintext is not found
            if (knownPlaintext && !decrypted.includes(knownPlaintext)) {
                processed++;
                continue;
            }
            
            const score = scorer.score(decrypted, scoringMethod);
            
            // Only keep results with meaningful scores
            if (score > -Infinity) {
                results.push({
                    key,
                    plaintext: decrypted,
                    score
                });
            }
            
            processed++;
            
            // Report progress periodically
            if (processed % 50 === 0) {
                self.postMessage({
                    type: 'PROGRESS',
                    data: {
                        processed,
                        workerId: self.workerId,
                        batchId: batch.batchId
                    }
                });
            }
        } catch (error) {
            console.error(`Error processing key ${key}:`, error);
            processed++;
        }
    }
    
    return results;
}

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'INIT':
                cipher = new VigenereCipher(data.alphabet);
                scorer = new TextScorer();
                self.workerId = data.workerId;
                self.postMessage({ type: 'READY' });
                break;
                
            case 'PROCESS':
                const results = processBatch(
                    data.batch,
                    data.ciphertext,
                    data.knownPlaintext,
                    data.scoringMethod
                );
                
                self.postMessage({
                    type: 'RESULT',
                    data: {
                        results,
                        workerId: self.workerId,
                        batchId: data.batchId
                    }
                });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
};

self.onerror = function(error) {
    self.postMessage({
        type: 'FATAL_ERROR',
        error: {
            message: 'Worker fatal error',
            stack: error.message
        }
    });
    return true; // Prevent default error handling
};
