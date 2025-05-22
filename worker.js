// worker.js
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

class VigenereMaster {
  constructor() {
    // Топ-30 биграмм английского языка
    this.BIGRAMS = new Set([
      'TH','HE','IN','EN','NT','RE','ER','AN','TI','ES',
      'ON','AT','SE','ND','OR','AR','AL','TE','CO','DE',
      'TO','RA','ET','ED','IT','SA','EM','RO','HA','VE'
    ]);

    // Все допустимые 2-буквенные слова
    this.TWO_LETTER_WORDS = new Set([
      'OF','TO','IN','IT','IS','BE','AS','AT','SO','WE',
      'HE','BY','OR','ON','DO','IF','ME','MY','UP','AN'
    ]);

    // Топ-20 частых слов
    this.TOP_WORDS = new Set([
      'THE','AND','FOR','ARE','BUT','NOT','YOU','ALL','ANY','CAN',
      'HAD','HER','WAS','ONE','OUR','OUT','DAY','GET','HAS','HIM'
    ]);
  }

  decrypt(ciphertext, key) {
    let plaintext = '';
    const keyUpper = key.toUpperCase();
    for (let i = 0; i < ciphertext.length; i++) {
      const c = ciphertext[i].toUpperCase();
      const cIndex = ALPHABET.indexOf(c);
      if (cIndex >= 0) {
        const kIndex = ALPHABET.indexOf(keyUpper[i % keyUpper.length]);
        plaintext += ALPHABET[(cIndex - kIndex + 26) % 26];
      } else {
        plaintext += c;
      }
    }
    return plaintext;
  }

  calculateProbability(text) {
    const cleanText = text.replace(/[^A-Z]/g, '');
    if (cleanText.length < 5) return 0;

    // 1. Проверка биграмм (60% оценки)
    let bigramHits = 0;
    for (let i = 0; i < cleanText.length - 1; i++) {
      if (this.BIGRAMS.has(cleanText.substr(i, 2))) bigramHits++;
    }
    const bigramPercent = Math.min(60, (bigramHits / (cleanText.length - 1)) * 120);

    // 2. Проверка слов (40% оценки)
    const words = text.split(/[^A-Za-z]+/).filter(w => w.length > 0);
    let wordScore = 0;
    
    words.forEach(word => {
      const upperWord = word.toUpperCase();
      if (upperWord.length === 2 && this.TWO_LETTER_WORDS.has(upperWord)) {
        wordScore += 8; // +8% за каждое 2-буквенное слово
      }
      if (this.TOP_WORDS.has(upperWord)) {
        wordScore += 15; // +15% за каждое ключевое слово
      }
    });

    const totalScore = Math.min(100, bigramPercent + wordScore);
    return Math.round(totalScore);
  }

  crack(ciphertext, maxKeyLength = 3) {
    const results = [];
    const ciphertextUpper = ciphertext.toUpperCase();

    // Генератор ключей
    function* generateKeys(length) {
      const arr = Array(length).fill(0);
      while (true) {
        yield arr.map(i => ALPHABET[i]).join('');
        let j = length - 1;
        while (j >= 0 && ++arr[j] === 26) {
          arr[j] = 0;
          j--;
        }
        if (j < 0) break;
      }
    }

    // Перебор ключей
    for (let len = 1; len <= maxKeyLength; len++) {
      for (const key of generateKeys(len)) {
        const plaintext = this.decrypt(ciphertextUpper, key);
        const probability = this.calculateProbability(plaintext);
        
        if (probability >= 40) { // Порог приемлемости
          results.push({
            key,
            text: plaintext,
            probability, // Процент вероятности (40-100)
            matches: {
              bigrams: (plaintext.match(/[A-Z]{2}/g) || []).filter(b => this.BIGRAMS.has(b)).length,
              words: words.filter(w => this.TOP_WORDS.has(w.toUpperCase())).length
            }
          });

          if (probability >= 90) break; // Прерывание при отличном результате
        }
      }
    }

    return results.sort((a, b) => b.probability - a.probability).slice(0, 5);
  }
}

// Обработчик сообщений
self.onmessage = function(e) {
  const { ciphertext, maxKeyLength } = e.data;
  const solver = new VigenereMaster();
  const startTime = performance.now();
  
  try {
    const results = solver.crack(ciphertext, maxKeyLength);
    const timeTaken = ((performance.now() - startTime)/1000).toFixed(2);
    
    self.postMessage({
      type: 'RESULTS',
      results: results.length > 0 ? results : [],
      time: timeTaken + ' сек',
      error: results.length === 0 ? 'Не найдено подходящих вариантов' : null
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: 'Ошибка при обработке: ' + error.message
    });
  }
};
