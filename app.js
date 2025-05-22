class VigenereBreaker {
    constructor() {
        this.workers = [];
        this.isRunning = false;
        this.startTime = 0;
        this.keysTested = 0;
        this.totalKeys = 0;
        this.bestScore = -Infinity;
        this.workerProgress = {};
        this.currentBatch = 0;
        this.batches = [];
        this.results = [];
        this.alphabet = '';
        this.maxKeyLength = 0;
        this.workerCount = 0;
        this.ciphertext = '';
    }

    init(alphabet, workerCount, maxKeyLength) {
        this.stop();
        
        // Validate alphabet
        if (!alphabet || alphabet.length === 0) {
            throw new Error("Alphabet cannot be empty");
        }
        
        const uniqueChars = new Set(alphabet.toUpperCase().split(''));
        if (uniqueChars.size !== alphabet.length) {
            throw new Error("Alphabet contains duplicate characters");
        }

        this.alphabet = alphabet.toUpperCase();
        this.workerCount = workerCount;
        this.maxKeyLength = maxKeyLength;
        this.keysTested = 0;
        this.bestScore = -Infinity;
        this.workerProgress = {};
        this.currentBatch = 0;
        this.results = [];
        
        this.totalKeys = this.calculateTotalKeys(this.alphabet.length, maxKeyLength);
        
        this.workers = Array.from({ length: workerCount }, () => {
            const worker = new Worker('worker.js');
            worker.onmessage = (e) => this.handleWorkerMessage(e);
            worker.onerror = (e) => this.handleWorkerError(e);
            return worker;
        });
        
        this.batches = this.generateKeyBatches(this.alphabet, maxKeyLength, workerCount * 100);
    }

    calculateTotalKeys(alphabetSize, maxLength) {
        let total = 0;
        for (let length = 1; length <= maxLength; length++) {
            total += Math.pow(alphabetSize, length);
        }
        return total;
    }

    generateKeyBatches(alphabet, maxLength, batchSize) {
        const batches = [];
        let currentBatch = [];
        
        for (let length = 1; length <= maxLength; length++) {
            const keys = this.generateKeysOfLength(alphabet, length);
            
            for (const key of keys) {
                currentBatch.push(key);
                
                if (currentBatch.length >= batchSize) {
                    batches.push(currentBatch);
                    currentBatch = [];
                }
            }
        }
        
        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }
        
        return batches;
    }

    generateKeysOfLength(alphabet, length) {
        const keys = [];
        const generate = (prefix) => {
            if (prefix.length === length) {
                keys.push(prefix);
                return;
            }
            
            for (const char of alphabet) {
                generate(prefix + char);
            }
        };
        
        generate('');
        return keys;
    }

    start(ciphertext, scoringMethod, knownPlaintext) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.ciphertext = ciphertext;
        
        if (!ciphertext || ciphertext.trim().length === 0) {
            throw new Error("Ciphertext cannot be empty");
        }

        // Initialize all workers
        this.workers.forEach((worker, index) => {
            worker.postMessage({
                type: 'INIT',
                alphabet: this.alphabet,
                workerId: index
            });
            
            this.workerProgress[index] = {
                keysProcessed: 0,
                lastUpdate: performance.now(),
                busy: false
            };
        });
        
        // Start processing batches
        this.distributeBatches(scoringMethod, knownPlaintext);
    }

    distributeBatches(scoringMethod, knownPlaintext) {
        if (!this.isRunning || this.currentBatch >= this.batches.length) {
            if (this.currentBatch >= this.batches.length) {
                this.stop();
                this.updateUI();
            }
            return;
        }
        
        // Find available workers
        const availableWorkers = this.workers.map((worker, index) => ({
            worker,
            index,
            busy: this.workerProgress[index].busy
        })).filter(w => !w.busy);
        
        if (availableWorkers.length === 0) {
            // All workers are busy, check again soon
            setTimeout(() => this.distributeBatches(scoringMethod, knownPlaintext), 100);
            return;
        }
        
        // Assign batches to available workers
        for (const { worker, index } of availableWorkers) {
            if (this.currentBatch >= this.batches.length) break;
            
            const batch = this.batches[this.currentBatch];
            this.currentBatch++;
            
            this.workerProgress[index].busy = true;
            this.workerProgress[index].batchStart = performance.now();
            
            worker.postMessage({
                type: 'PROCESS',
                batch,
                ciphertext: this.ciphertext,
                scoringMethod,
                knownPlaintext,
                batchId: this.currentBatch - 1
            });
        }
        
        // Continue distributing batches
        setTimeout(() => this.distributeBatches(scoringMethod, knownPlaintext), 50);
    }

    handleWorkerMessage(event) {
        const { type, data } = event.data;
        
        try {
            switch (type) {
                case 'READY':
                    // Worker is ready
                    break;
                    
                case 'PROGRESS':
                    this.handleProgressUpdate(data);
                    break;
                    
                case 'RESULT':
                    this.handleResults(data);
                    break;
                    
                case 'ERROR':
                    console.error('Worker error:', data);
                    this.showError(`Worker error: ${data.message}`);
                    this.stop();
                    break;
                    
                default:
                    console.warn('Unknown message type:', type);
            }
        } catch (error) {
            console.error('Error handling worker message:', error);
            this.stop();
        }
    }

    handleWorkerError(event) {
        console.error('Worker error:', event);
        this.showError('Worker encountered an error');
        this.stop();
    }

    handleProgressUpdate(data) {
        const { workerId, processed } = data;
        
        // Update worker progress
        this.workerProgress[workerId] = {
            ...this.workerProgress[workerId],
            keysProcessed: processed,
            lastUpdate: performance.now(),
            busy: false
        };
        
        // Update total keys tested
        const newKeysTested = Object.values(this.workerProgress)
            .reduce((sum, wp) => sum + wp.keysProcessed, 0);
        
        this.keysTested = newKeysTested;
        this.updateUI();
    }

    handleResults(data) {
        const { results } = data;
        
        if (results && results.length > 0) {
            // Add new results and keep track of best score
            for (const result of results) {
                this.results.push(result);
                
                if (result.score > this.bestScore) {
                    this.bestScore = result.score;
                }
            }
            
            // Sort results by score (descending)
            this.results.sort((a, b) => b.score - a.score);
            
            // Update UI with new results
            this.updateResultsUI();
        }
    }

    updateUI() {
        const elapsed = (performance.now() - this.startTime) / 1000;
        const speed = elapsed > 0 ? Math.floor(this.keysTested / elapsed) : 0;
        const progress = this.totalKeys > 0 ? (this.keysTested / this.totalKeys * 100) : 0;
        
        // Calculate estimated time remaining
        let timeLeft = '-';
        if (speed > 0 && this.keysTested > 0) {
            const remainingKeys = this.totalKeys - this.keysTested;
            const secondsLeft = Math.floor(remainingKeys / speed);
            
            if (secondsLeft > 3600) {
                timeLeft = `${Math.floor(secondsLeft / 3600)}h ${Math.floor((secondsLeft % 3600) / 60)}m`;
            } else if (secondsLeft > 60) {
                timeLeft = `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`;
            } else {
                timeLeft = `${secondsLeft}s`;
            }
        }
        
        // Update DOM elements
        document.getElementById('progressBar').style.width = `${Math.min(100, progress)}%`;
        document.getElementById('progressPercent').textContent = `${progress.toFixed(2)}%`;
        document.getElementById('keysTested').textContent = this.keysTested.toLocaleString();
        document.getElementById('speed').textContent = speed.toLocaleString();
        document.getElementById('timeLeft').textContent = timeLeft;
        document.getElementById('bestScore').textContent = this.bestScore > -Infinity 
            ? this.bestScore.toFixed(2) 
            : '-';
    }

    updateResultsUI() {
        const container = document.getElementById('resultsContainer');
        
        // Clear existing results (we'll rebuild them all for simplicity)
        container.innerHTML = '';
        
        // Add each result
        this.results.slice(0, 50).forEach((result, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = `result-item ${index === 0 ? 'highlight' : ''}`;
            resultElement.innerHTML = `
                <div class="result-key">
                    Key: ${result.key}
                    <span class="result-score">Score: ${result.score.toFixed(2)}</span>
                </div>
                <div class="result-text">${result.plaintext}</div>
            `;
            container.appendChild(resultElement);
        });
    }

    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        const panel = document.querySelector('.input-panel');
        panel.insertBefore(errorElement, panel.firstChild);
        
        setTimeout(() => errorElement.remove(), 5000);
    }

    stop() {
        this.isRunning = false;
        
        // Terminate all workers
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        
        // Reset progress
        this.workerProgress = {};
        
        // Update UI
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
    }

    exportResults() {
        if (this.results.length === 0) {
            this.showError("No results to export");
            return;
        }
        
        const data = {
            ciphertext: this.ciphertext,
            alphabet: this.alphabet,
            maxKeyLength: this.maxKeyLength,
            results: this.results,
            stats: {
                keysTested: this.keysTested,
                totalKeys: this.totalKeys,
                bestScore: this.bestScore
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `vigenere-breaker-results-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    const breaker = new VigenereBreaker();
    
    // UI event handlers
    document.getElementById('workers').addEventListener('input', function() {
        document.getElementById('workersValue').textContent = this.value;
    });
    
    document.getElementById('keyLength').addEventListener('input', function() {
        document.getElementById('keyLengthValue').textContent = this.value;
    });
    
    document.getElementById('startBtn').addEventListener('click', () => {
        try {
            const alphabet = document.getElementById('alphabet').value;
            const workers = parseInt(document.getElementById('workers').value);
            const maxKeyLength = parseInt(document.getElementById('keyLength').value);
            const ciphertext = document.getElementById('ciphertext').value;
            const scoringMethod = document.getElementById('scoringMethod').value;
            const knownPlaintext = document.getElementById('knownPlaintext').value;
            
            breaker.init(alphabet, workers, maxKeyLength);
            breaker.start(ciphertext, scoringMethod, knownPlaintext);
            
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
        } catch (error) {
            breaker.showError(error.message);
        }
    });
    
    document.getElementById('stopBtn').addEventListener('click', () => {
        breaker.stop();
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
        breaker.stop();
        document.getElementById('resultsContainer').innerHTML = '';
        document.getElementById('ciphertext').value = '';
        document.getElementById('keysTested').textContent = '0';
        document.getElementById('speed').textContent = '0';
        document.getElementById('timeLeft').textContent = '-';
        document.getElementById('bestScore').textContent = '-';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressPercent').textContent = '0%';
    });
    
    document.getElementById('exportBtn').addEventListener('click', () => {
        breaker.exportResults();
    });
});
