const { NlpManager } = require('node-nlp');
const fs = require('fs');
const path = require('path');

// Fonction pour parser une ligne CSV en respectant les guillemets
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function trainMultilingual() {
  console.log('🚀 Entraînement multilingue...');

  const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'pt', 'de', 'it'];

  const manager = new NlpManager({
    languages: SUPPORTED_LANGUAGES,
    autoSave: false
  });

  const dataDir = path.join(__dirname, '../data');

  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Dossier ${dataDir} introuvable.`);
    return;
  }

  const files = fs.readdirSync(dataDir);

  files.forEach(file => {
    if (!file.endsWith('.csv')) return;

    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() !== '');

    if (lines.length < 2) return;

    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    const hasLangColumn = header.includes('lang');
    const hasScoreColumn = header.includes('score');

    lines.slice(1).forEach(line => {
      const columns = parseCSVLine(line);
      if (columns.length < 2) return;

      if (hasScoreColumn && columns.length >= 3) {
        // Format lexique : word,score,lang
        const word = columns[0].replace(/^"|"$/g, '');
        const score = parseFloat(columns[1]);
        const lang = columns[2].replace(/^"|"$/g, '');

        if (word && !isNaN(score) && lang && SUPPORTED_LANGUAGES.includes(lang)) {
          // Utilisation de la bonne méthode pour le lexique
          if (typeof manager.addSentimentWord === 'function') {
            manager.addSentimentWord(lang, word, score);
          } else if (manager.sentiment && typeof manager.sentiment.addWord === 'function') {
            manager.sentiment.addWord(lang, word, score);
          }
        } else if (lang && !SUPPORTED_LANGUAGES.includes(lang)) {
          console.warn(`⚠️ Langue non supportée ignorée : "${lang}" (mot: ${word})`);
        }
      } else if (hasLangColumn && columns.length >= 3) {
        // Format intentions : intent,utterance,lang
        const intent = columns[0];
        const utterance = columns[1].replace(/^"|"$/g, '');
        const lang = columns[2].replace(/^"|"$/g, '');

        if (intent && utterance && lang && SUPPORTED_LANGUAGES.includes(lang)) {
          manager.addDocument(lang, utterance, intent);
        } else if (lang && !SUPPORTED_LANGUAGES.includes(lang)) {
          console.warn(`⚠️ Langue non supportée ignorée : "${lang}" (utterance: ${utterance})`);
        }
      } else {
        // Fallback ancien format sans colonne 'lang' (intent,utterance) -> français
        const intent = columns[0];
        const utterance = columns[1].replace(/^"|"$/g, '');
        if (intent && utterance) {
          manager.addDocument('fr', utterance, intent);
        }
      }
    });
  });

  console.log('📚 Données chargées. Entraînement...');
  await manager.train();

  const modelDir = path.join(__dirname, '../models');
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);

  const modelPath = path.join(modelDir, 'hybrid-model-multilingual.nlp');
  manager.save(modelPath);
  console.log(`✅ Modèle sauvegardé : ${modelPath}`);

  // Test rapide
  console.log('\n🧪 Test :');
  const testFr = await manager.process('fr', 'tu es idiot');
  console.log(`   FR : "tu es idiot" → ${testFr.intent} (${testFr.score.toFixed(3)})`);
  const testEn = await manager.process('en', 'you are an idiot');
  console.log(`   EN : "you are an idiot" → ${testEn.intent} (${testEn.score.toFixed(3)})`);
}


if (fs.existsSync('./models/hybrid-model-multilingual.nlp')) {
    console.log('❌ Modèle déjà existant');
  } else {
        trainMultilingual();
}