// worker.js
const workerCode = `
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

class VigenereAnalyzer {
  constructor(alphabet) {
    this.alphabet = alphabet.toUpperCase();
    this.charToIndex = new Map([...this.alphabet].map((c, i) => [c, i]));
    
    // Частоты для индекса совпадений
    this.englishFreq = {
      'A':0.08167,'B':0.01492,'C':0.02782,'D':0.04253,'E':0.12702,
      'F':0.02228,'G':0.02015,'H':0.06094,'I':0.06966,'J':0.00153,
      'K':0.00772,'L':0.04025,'M':0.02406,'N':0.06749,'O':0.07507,
      'P':0.01929,'Q':0.00095,'R':0.05987,'S':0.06327,'T':0.09056,
      'U':0.02758,'V':0.00978,'W':0.02360,'X':0.00150,'Y':0.01974,'Z':0.00074
    };
    
    // Квадграммы
    this.quadgrams = {
      'TION':0.031404,'THER':0.026642,'NTHE':0.026317,'THAT':0.025347,
      'OFTH':0.024598,'FTHE':0.024373,'THES':0.023390,'WITH':0.023163,
      'INTH':0.021318,'ATIO':0.020796,'OTHE':0.020626,'TTHA':0.019758,
      'NDTH':0.019578,'ETHE':0.019373,'TOTH':0.018921,'DTHE':0.018673
    };
    
    // Нормализация квадграмм
    this.quadgramTotal = Object.values(this.quadgrams).reduce((a,b) => a+b, 0);
  }

  decrypt(ciphertext, key) {
    let plaintext = '';
    const keyUpper = key.toUpperCase();
    for (let i = 0; i < ciphertext.length; i++) {
      const c = ciphertext[i].toUpperCase();
      const cIdx = this.charToIndex.get(c);
      if (cIdx !== undefined) {
        const kIdx = this.charToIndex.get(keyUpper[i % keyUpper.length]);
        plaintext += this.alphabet[(cIdx - kIdx + this.alphabet.length) % this.alphabet.length];
      } else {
        plaintext += c;
      }
    }
    return plaintext;
  }

  // Метод 1: Quadgram анализ (0-100%)
  quadgramScore(text) {
    const clean = text.replace(/[^A-Z]/g, '');
    if (clean.length < 4) return 0;
    
    let score = 0;
    for (let i = 0; i < clean.length - 3; i++) {
      const quad = clean.substr(i, 4);
      const prob = this.quadgrams[quad] || 1e-10;
      score += Math.log10(prob / this.quadgramTotal);
    }
    
    // Нормализация к 0-100%
    const min = -50; // Примерное минимальное значение
    const max = -10;  // Примерное максимальное значение
    return Math.min(100, Math.max(0, ((score - min) / (max - min)) * 100));
  }

  // Метод 2: Индекс совпадений (0-100%)
  indexOfCoincidence(text) {
    const clean = text.replace(/[^A-Z]/g, '');
    if (clean.length < 2) return 0;
    
    const counts = new Map();
    for (const c of clean) {
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    
    let sum = 0;
    for (const count of counts.values()) {
      sum += count * (count - 1);
    }
    
    const ic = sum / (clean.length * (clean.length - 1));
    const englishIC = 0.0667;
    
    // Преобразование в процент близости к английскому
    return Math.min(100, Math.max(0, (1 - Math.abs(ic - englishIC) / 0.02) * 100));
  }

  // Метод 3: Хи-квадрат (0-100%)
  chiSquared(text) {
    const clean = text.replace(/[^A-Z]/g, '');
    if (clean.length < 5) return 0;
    
    const counts = new Map();
    for (const c of clean) {
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    
    let chi2 = 0;
    for (const [char, freq] of Object.entries(this.englishFreq)) {
      const expected = freq * clean.length;
      const observed = counts.get(char) || 0;
      chi2 += Math.pow(observed - expected, 2) / expected;
    }
    
    // Преобразование в процент (меньше хи-квадрат = лучше)
    const maxChi2 = 150; // Эмпирически подобранное значение
    return Math.min(100, Math.max(0, (1 - chi2 / maxChi2) * 100));
  }

  // Комбинированная оценка
  combinedScore(text) {
    const q = this.quadgramScore(text);
    const ic = this.indexOfCoincidence(text);
    const chi = this.chiSquared(text);
    return (q * 0.5 + ic * 0.3 + chi * 0.2);
  }

  // Генерация ключей
  *generateKeys(maxLength) {
    function* generate(prefix) {
      if (prefix.length === maxLength) {
        yield prefix;
        return;
      }
      for (const char of ALPHABET) {
        yield* generate(prefix + char);
      }
    }
    yield* generate('');
  }
}

self.onmessage = function(e) {
  const { type, taskId, data } = e.data;
  
  if (type === 'INIT') {
    const analyzer = new VigenereAnalyzer(data.alphabet);
    self.postMessage({ type: 'READY' });
    return;
  }

  if (type === 'PROCESS') {
    const { ciphertext, maxKeyLength, method } = data;
    const analyzer = new VigenereAnalyzer('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const results = [];
    let processed = 0;
    
    for (const key of analyzer.generateKeys(maxKeyLength)) {
      const plaintext = analyzer.decrypt(ciphertext, key);
      let score;
      
      switch(method) {
        case 'quadgrams': score = analyzer.quadgramScore(plaintext); break;
        case 'ic': score = analyzer.indexOfCoincidence(plaintext); break;
        case 'chi2': score = analyzer.chiSquared(plaintext); break;
        case 'combined': score = analyzer.combinedScore(plaintext); break;
        default: score = analyzer.quadgramScore(plaintext);
      }
      
      if (score > 30) { // Порог 30%
        results.push({
          key,
          text: plaintext,
          score: parseFloat(score.toFixed(2))
        });
      }
      
      processed++;
      if (processed % 100 === 0) {
        self.postMessage({
          type: 'PROGRESS',
          processed,
          taskId
        });
      }
    }
    
    self.postMessage({
      type: 'RESULTS',
      results: results.sort((a, b) => b.score - a.score).slice(0, 10),
      taskId
    });
  }
};
`;

// Создаем Worker
const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
