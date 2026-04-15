const { NlpManager } = require('node-nlp');
const fs = require('fs');
const path = require('path');

async function trainSimple() {
  console.log('🚀 Entraînement...');
  const manager = new NlpManager({ autoLanguage: true, autoSave: false });
/*
  const phrases = [
    ['insulte', 'putain'],
    ['insulte', 'connard'],
    ['insulte', 'idiot'],
    ['positif', 'comment ca va?'],
    ['positif', 'merci beaucoup'],
    ['positif', 'super merci'],
    ['neutre', 'ok']
  ];
*/
  // phrases internes


  // 📂 Chargement des CSV dans /data
  const dataDir = path.join(__dirname, '../data');

  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);

    files.forEach(file => {
      if (file.endsWith('.csv')) {
        const filePath = path.join(dataDir, file);
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');

        // skip header
        lines.slice(1).forEach(line => {
          const [intent, text] = line.split(',');

          if (intent && text) {
            manager.addDocument('fr', text.trim(), intent.trim());
          }
        });
      }
    });
  }

  console.log('📚 Données chargées');

  await manager.train();

  const modelDir = path.join(__dirname, '../models');
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);

  manager.save(path.join(modelDir, 'hybrid-model.nlp'));

  console.log('✅ Modèle créé!');

  const test = await manager.process('fr', 'tu es idiot');
  console.log("TEST")
  console.log('Intent:', test.intent);
  console.log('Score:', test.score);
}

trainSimple();