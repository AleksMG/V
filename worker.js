const workerCode = `
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

class VigenereUltra {
  constructor() {
    // Полный набор биграмм английского языка (топ-50)
    this.BIGRAMS = new Set([
      'TH','HE','IN','EN','NT','RE','ER','AN','TI','ES',
      'ON','AT','SE','ND','OR','AR','AL','TE','CO','DE',
      'TO','RA','ET','ED','IT','SA','EM','RO','HA','VE',
      'LE','ME','AS','HI','RI','NE','EA','SI','OM','UR',
      'ST','IO','OU','HI','IS','EA','SO','US','UN','LO'
    ]);

    // Все допустимые 2-буквенные слова английского языка
    this.TWO_LETTER_WORDS = new Set([
      'OF','TO','IN','IT','IS','BE','AS','AT','SO','WE','HE','BY','OR',
      'ON','DO','IF','ME','MY','UP','AN','GO','NO','US','AM','AH','AY',
      'BO','DA','EX','HA','HI','HO','ID','JA','KA','LA','LI','LO','MA',
      'MI','MU','NA','NE','NU','OM','OP','OS','OW','OX','OY','PA','PE',
      'PI','RE','SH','SI','TA','TI','UH','UM','UN','WO','XI','XU','YA',
      'YE','YO','ZA','AD','AE','AG','AI','AL','AR','AW','AX','BA','BI',
      'DE','ED','EF','EH','EL','EM','ER','ET','FA','FE','GI','GU','HE',
      'HM','JO','KO','KY','MO','OB','OD','OE','OF','OH','OI','OK','OM',
      'OO','OU','OW','OY','PO','QI','ST','UG','YU','ZA','ZE','ZO'
    ]);

    this.TOP_WORDS = new Set(['THE','AND','FOR','ARE','BUT','NOT','YOU','ALL','ANY','CAN']);
  }

  // Ультрабыстрая дешифровка
  decrypt(ct, key) {
    let pt = '';
    const kLen = key.length;
    const kArr = Array.from(key.toUpperCase()).map(c => ALPHABET.indexOf(c));
    
    for (let i = 0; i < ct.length; i++) {
      const c = ALPHABET.indexOf(ct[i]);
      if (c >= 0) {
        const k = kArr[i % kLen];
        pt += ALPHABET[(c - k + 26) % 26];
      } else {
        pt += ct[i];
      }
    }
    return pt;
  }

  // Быстрая проверка биграмм и слов
  isMeaningful(text) {
    const clean = text.replace(/[^A-Z]/g, '');
    if (clean.length < 4) return false;

    // Проверка биграмм
    let bigramScore = 0;
    for (let i = 0; i < clean.length - 1; i++) {
      if (this.BIGRAMS.has(clean.substr(i, 2))) bigramScore++;
    }
    if (bigramScore / (clean.length - 1) < 0.3) return false;

    // Проверка 2-буквенных слов
    const words = text.split(/[^A-Za-z]+/).filter(w => w.length > 0);
    const twoLetterMatches = words.filter(w => 
      w.length === 2 && this.TWO_LETTER_WORDS.has(w.toUpperCase())
    ).length;

    return twoLetterMatches >= 1 && 
           words.some(w => this.TOP_WORDS.has(w.toUpperCase()));
  }

  // Основной метод с оптимизированным перебором
  crack(ciphertext, maxKeyLength = 3) {
    const ct = ciphertext.toUpperCase();
    const results = [];
    
    // Генерация ключей через yield для экономии памяти
    function* genKeys(len) {
      const arr = Array(len).fill(0);
      while (true) {
        yield arr.map(i => ALPHABET[i]).join('');
        let j = len - 1;
        while (j >= 0 && ++arr[j] === 26) {
          arr[j] = 0;
          j--;
        }
        if (j < 0) break;
      }
    }

    for (let len = 1; len <= maxKeyLength; len++) {
      for (const key of genKeys(len)) {
        const pt = this.decrypt(ct, key);
        if (this.isMeaningful(pt)) {
          return {
            key,
            plaintext: pt,
            stats: {
              bigrams: (pt.match(/[A-Z]{2}/g) || []).filter(b => this.BIGRAMS.has(b)).length,
              twoLetterWords: (pt.match(/\b[A-Za-z]{2}\b/g) || []).filter(w => this.TWO_LETTER_WORDS.has(w.toUpperCase())).length
            }
          };
        }
      }
    }
    
    return { error: 'Не удалось найти осмысленный текст' };
  }
}

self.onmessage = (e) => {
  const { ciphertext, maxKeyLength } = e.data;
  const hacker = new VigenereUltra();
  const start = performance.now();
  const result = hacker.crack(ciphertext, maxKeyLength);
  result.time = (performance.now() - start).toFixed(2) + ' мс';
  self.postMessage(result);
};
`;

// Пример использования:
const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
worker.onmessage = (e) => console.log(e.data);
worker.postMessage({ ciphertext: 'CXVRCNMOCAKZ', maxKeyLength: 3 });
