const NGRAMS = {
    quadgrams: {
        'TION': 3.79, 'THER': 3.59, 'NTHE': 3.51, 'THAT': 3.28,
        'OFTH': 3.19, 'FTHE': 3.16, 'THES': 3.03, 'WITH': 2.98,
        'INTH': 2.84, 'ATIO': 2.73, 'OTHE': 2.71, 'TTHA': 2.63
    },
    trigrams: {
        'THE': 3.51, 'AND': 2.71, 'ING': 2.62, 'HER': 2.49,
        'HAT': 2.44, 'HIS': 2.43, 'THA': 2.38, 'ERE': 2.36,
        'FOR': 2.34, 'ENT': 2.34, 'ION': 2.30, 'TER': 2.26
    },
    bigrams: {
        'TH': 3.56, 'HE': 3.07, 'IN': 2.43, 'ER': 2.41,
        'AN': 2.38, 'RE': 2.21, 'ND': 2.02, 'AT': 1.96,
        'ON': 1.95, 'NT': 1.89, 'HA': 1.85, 'ES': 1.84
    }
};

class VigenereExpert {
    constructor(alphabet) {
        this.alphabet = [...new Set(alphabet.toUpperCase())];
        this.charMap = Object.fromEntries(
            this.alphabet.map((c, i) => [c, i])
        );
    }

    decrypt(ciphertext, key) {
        return [...ciphertext].map((c, i) => {
            const upper = c.toUpperCase();
            if(!this.charMap[upper]) return c;
            
            const textIdx = this.charMap[upper];
            const keyIdx = this.charMap[key[i % key.length].toUpperCase()];
            const decryptedIdx = (textIdx - keyIdx + this.alphabet.length) % this.alphabet.length;
            
            return this.alphabet[decryptedIdx];
        }).join('');
    }

    score(text) {
        const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
        let score = 0;

        // Quadgram scoring (основной вес)
        for(let i = 0; i < clean.length - 3; i++) {
            const q = clean.substr(i, 4);
            score += Math.log10(NGRAMS.quadgrams[q] || 1e-10);
        }

        // Trigram validation
        for(let i = 0; i < clean.length - 2; i++) {
            const t = clean.substr(i, 3);
            score += Math.log10(NGRAMS.trigrams[t] || 1e-12);
        }

        // Bigram penalties
        for(let i = 0; i < clean.length - 1; i++) {
            const b = clean.substr(i, 2);
            if(!NGRAMS.bigrams[b]) score -= 0.5;
        }

        return score;
    }

    *generateKeys(maxLength) {
        function* generate(len, prefix = '') {
            if(len === 0) yield prefix;
            else for(const c of this.alphabet) yield* generate(len - 1, prefix + c);
        }
        for(let l = 1; l <= maxLength; l++) yield* generate.call(this, l);
    }
}

let solver;

self.onmessage = function(e) {
    const {type, data} = e.data;
    
    try {
        if(type === 'START') {
            solver = new VigenereExpert(data.alphabet);
            let keysTested = 0;
            const startTime = Date.now();
            
            for(const key of solver.generateKeys(data.maxKeyLength)) {
                const decrypted = solver.decrypt(data.ciphertext, key);
                const score = solver.score(decrypted);
                
                if(score > -Infinity) {
                    self.postMessage({
                        type: 'RESULT',
                        data: {result: {key, text: decrypted, score}}
                    );
                }

                keysTested++;
                
                // Отправляем прогресс каждые 100 мс
                if(Date.now() - startTime > 100) {
                    self.postMessage({
                        type: 'PROGRESS',
                        data: {keysTested}
                    });
                    keysTested = 0;
                }
            }
        }
    } catch(error) {
        self.postMessage({type: 'ERROR', error: error.message});
    }
};
