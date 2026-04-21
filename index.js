
const fs = require('fs');
const path = require('path');
// ============================================
// EXPRESS
// ============================================
const express = require('express');
const chalk = require('chalk');

// ============================================
// MODULE NLP POUR ANALYSE DE SENTIMENT
// ============================================
const { NlpManager } = require('node-nlp');

// ============================================
// Language Guesser
// ============================================
const languageGuesser = require('./scripts/language-guesser');

// Initialisation express
const app = express();
const PORT = 3000;
let manager = null;

// Dossiers pour sauvegarder les fichiers
const DOSSIER_ANALYSIS = path.join(__dirname, './analysis');
if (!fs.existsSync(DOSSIER_ANALYSIS)) fs.mkdirSync(DOSSIER_ANALYSIS);

const DOSSIER_EML = path.join(__dirname, './analysis/mails_bruts');
const DOSSIER_FALLBACK = path.join(__dirname, './analysis/fallback');
const DOSSIER_TEXTES = path.join(__dirname, './analysis/textes');
const DOSSIER_NLPJS = path.join(__dirname, './analysis/npm-nlp_analysis');
const DOSSIER_TRANSFER = path.join(__dirname, './analysis/transfer')
const DOSSIER_MODELS = path.join(__dirname, './models');

// Créer les dossiers s'ils n'existent pas

if (!fs.existsSync(DOSSIER_EML)) fs.mkdirSync(DOSSIER_EML);
if (!fs.existsSync(DOSSIER_FALLBACK)) fs.mkdirSync(DOSSIER_FALLBACK);
if (!fs.existsSync(DOSSIER_TEXTES)) fs.mkdirSync(DOSSIER_TEXTES);
if (!fs.existsSync(DOSSIER_MODELS)) fs.mkdirSync(DOSSIER_MODELS);
if (!fs.existsSync(DOSSIER_NLPJS)) fs.mkdirSync(DOSSIER_NLPJS);
if (!fs.existsSync(DOSSIER_TRANSFER)) fs.mkdirSync(DOSSIER_TRANSFER);

// ============================================l
// CONFIGURATION NLP HYBRIDE
// ============================================
const MODEL_PATH = path.join(DOSSIER_MODELS, 'hybrid-model-multilingual.nlp');
let modelLoaded = false;

const startMessage = `
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║               ███████╗████████╗ █████╗ ██████╗ ████████╗             ║   
║               ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝             ║   
║               ███████╗   ██║   ███████║██████╔╝   ██║                ║   
║               ╚════██║   ██║   ██╔══██║█████╔╝    ██║                ║
║               ███████║   ██║   ██║  ██║██║║███║   ██║                ║       
║               ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═══╝   ╚═╝                ║
║                                                                      ║
║                    [ START INITIALIZING SYSTEM ]                     ║
║                                                                      ║
║        > boot sequence: Lancement du fichier "index.js"              ║
║        > status: ONLINE                                              ║
║        > security: 2xmSD33-sa9Km'sMl_aa                              ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`
console.log(chalk.hex('#c30051')(startMessage));

// =========================
// Language Guesser
// =========================
// Simulation d'un UseState avec un setters
const textTransfer_obj = {
  _value: null,
  _texteComplet: '',

  set value(v) {
    console.log("✅ Setter exécuté ! Valeur reçue:", v ? v.substring(0, 50) + "..." : "vide");

    if (v && typeof v === 'string' && v.trim() !== '') {
      this._texteComplet = v;
      try {
        const guessedLanguages = languageGuesser(v);
        console.log("🎯 Langues détectées:", guessedLanguages);
        this._value = guessedLanguages;
      } catch (error) {
        console.error("❌ Erreur dans languageGuesser:", error);
        this._value = [];
      }
    } else {
      this._value = [];
    }
  },

  get value() {
    return this._value;
  },

  get detectedLanguages() {
    return this._value;
  }
};

// =========================
// Initialisation du NLP
// =========================
async function initializeNLP() {
  console.log('🔄 Initialisation du module NLP hybride...');

  try {
    manager = new NlpManager({
      languages: ['en', 'fr', 'es'],
      nlu: { useNoneFeature: false }
    });

    if (fs.existsSync(MODEL_PATH)) {
      manager.load(MODEL_PATH);
      modelLoaded = true;
      console.log('✅ Modèle NLP hybride chargé avec succès');
      console.log('   - Lexique personnalisé actif');
      console.log('   - Intentions entraînées actives');
    } else {
      console.log('⚠️ Modèle non trouvé! Utilisation du mode basique');
      console.log('   Pour entraîner: node scripts/train-hybrid.js');
    }
  } catch (error) {
    console.error('❌ Erreur chargement modèle NLP:', error.message);
  }
}

// ============================================
// FONCTION ANALYSE SENTIMENT AVEC DÉTECTION AUTO
// ============================================
async function analyzeSentiment(mail, id) {
  text = mail.text
  if (!text || text.trim() === '') {
    return {
      score: 0,
      vote: 'neutral',
      words: [],
      comparative: 0,
      intent: 'unknown',
      intentConfidence: 0
    };
  }

  try {
    console.log(`📝 Analyse pour ID: ${id}`);
    console.log(`   modelLoaded = ${modelLoaded}`);

    if (modelLoaded && manager) {
      console.log(`   ✅ Mode ML activé pour ID: ${id}`);

      const guesses = languageGuesser(text);
      const detectedLang = guesses.length > 0 ? guesses[0].alpha2 : 'en'; // fallback anglais
      const result = await manager.process(detectedLang, text);

      // Sauvegarde
      const cheminNpmNLP = path.join(DOSSIER_NLPJS, `analyse-${id}.json`);
      fs.writeFileSync(cheminNpmNLP, JSON.stringify({ result }, null, 2));
      const cheminNpmNLP1 = cheminNpmNLP.substring(cheminNpmNLP.indexOf("DELETE"));
      console.log(`   ✅ Fichier ML créé: ${cheminNpmNLP1}`);

      // Temps de lecture
      let timeToReadInSeconds = ((result.sentiment?.numWords || 0) / 225) * 60;
      let minutes = false;
      let timeToReadToTransfer;

      if (timeToReadInSeconds < 60) {
        timeToReadToTransfer = timeToReadInSeconds;
      } else {
        timeToReadToTransfer = Math.round(timeToReadInSeconds * 60);
        minutes = false;
      };

      // Analyse de l'objet du mail :  
      let objectToAnalyze;

      if (mail.subject) {
        objectResp = await manager.process(mail.subject);
      }
      else {
        console.log(`❌ Mail doesn't have any object`)
      };

      // Résultats à transférer 
      const languages = textTransfer_obj.value.slice(0,4);
      const resultToTransfer = {
        languages: {
            principalLanguage: textTransfer_obj.value[0],
            language: textTransfer_obj.value.slice(0,4),
        },
        timetoread: {
          time: timeToReadToTransfer,
          minutes: minutes,
        },
        object: { //==================================================================
          object: mail.subject || '(aucun sujet)',
          emotions: objectResp?.classifications || [],
          strongerEmotion: objectResp?.intent || 'undefined',
          scoreStrongerEmotion: objectResp?.score || 'undefined',
        },//==========================================================================
        mail: {
          emotions: result.classifications || [],
          strongerEmotion: result.intent || 'undefined',
          scoreStrongerEmotion: result.score || 'undefined',
        },
      };

      const cheminToTransfer = path.join(DOSSIER_TRANSFER, `transfer-${id}.json`);
      fs.writeFileSync(cheminToTransfer, JSON.stringify({ resultToTransfer }, null, 2));
      console.log(`   ✅ Fichier Transfer créé: ${cheminToTransfer}`);

      return {
        score: result.sentiment ? result.sentiment.score : 0,
        vote: result.sentiment ? result.sentiment.vote : 'neutral',
        words: result.sentiment && result.sentiment.words ? result.sentiment.words : [],
        comparative: result.sentiment ? result.sentiment.comparative : 0,
        intent: result.intent || 'unknown',
        intentConfidence: result.score || 0
      };

    } else {
      return fallbackSentimentAnalysis(text);
    }
  } catch (error) {
    console.error('Erreur analyse sentiment:', error);
    return fallbackSentimentAnalysis(text);
  }
}

// Analyse de secours (A SUPPRIMER)
function fallbackSentimentAnalysis(text) {
  const words = text.toLowerCase().split(' ');

  const negativeWords = [
    // Insultes et gros mots (toujours négatifs)
    'con', 'connard', 'connasse', 'putain', 'merde', 'salope', 'enfoiré', 'enfoirée',
    'bâtard', 'bâtarde', 'fils de pute', 'chienne', 'charogne', 'ordure', 'raclure',
    'débile', 'demeuré', 'demeurée', 'idiot', 'idiote', 'imbécile', 'crétin', 'crétine',
    'abruti', 'abrUTie', 'taré', 'tarée', 'dingue', 'fou', 'folle', 'malade mental',

    // Mots de colère (toujours négatifs)
    'colère', 'furieux', 'furieuse', 'énervé', 'énervée', 'agacé', 'agacée',
    'exaspéré', 'exaspérée', 'ulcéré', 'ulcérée', 'révolté', 'révoltée', 'indigné',
    'haine', 'haineux', 'haineuse', 'rage', 'rageur', 'rageuse', 'frustré',

    // Mots de plainte (toujours négatifs)
    'problème', 'souci', 'embêtement', 'désagrément', 'désastre', 'catastrophe',
    'cauchemar', 'horreur', 'calvaire', 'enfer', 'galère', 'emmerde', 'emmerdement',
    'complication', 'difficulté', 'obstacle', 'contretemps', 'dysfonctionnement',

    // Mots d'échec (toujours négatifs)
    'échec', 'raté', 'ratée', 'fiasco', 'déroute', 'défaite', 'débâcle', 'faillite',
    'perte', 'échec cuisant', 'échec total', 'fiasco complet', 'désillusion',
    'insuccès', 'non-réussite', 'contre-performance', 'mauvais résultat',

    // Mots de critique (toujours négatifs)
    'nul', 'nulle', 'nuls', 'nulles', 'mauvais', 'mauvaise', 'médiocre', 'pitoyable',
    'lamentable', 'déplorable', 'navrant', 'navrante', 'affligeant', 'affligeante',
    'consternant', 'désolant', 'désastreux', 'catastrophique', 'horrible', 'affreux',
    'atroce', 'abominable', 'exécrable', 'détestable', 'méprisable', 'indigne',

    // Mots de déception (toujours négatifs)
    'déçu', 'déçue', 'déception', 'désappointé', 'désappointée', 'mécontent',
    'insatisfait', 'insatisfaite', 'déçu', 'déçue', 'regret', 'regrettable',
    'dommage', 'triste', 'tristesse', 'peine', 'chagrin', 'désolation', 'désespoir',

    // Mots de peur (toujours négatifs)
    'peur', 'crainte', 'inquiétude', 'angoisse', 'anxiété', 'stress', 'panique',
    'terreur', 'effroi', 'frayeur', 'appréhension', 'trac', 'phobie', 'hantise',

    // Mots de menace (toujours négatifs)
    'menace', 'menaçant', 'intimidation', 'chantage', 'harcèlement', 'pression',
    'ultimatum', 'avertissement', 'sanction', 'punition', 'représailles', 'vengeance',

    // Mots de conflit (toujours négatifs)
    'conflit', 'dispute', 'querelle', 'bagarre', 'scandale', 'polémique', 'controverse',
    'désaccord', 'divergence', 'opposition', 'hostilité', 'inimitié', 'animosité',

    // Mots d'injustice (toujours négatifs)
    'injustice', 'injuste', 'scandaleux', 'scandaleuse', 'honteux', 'honteuse',
    'immoral', 'immorale', 'illégal', 'illégale', 'frauduleux', 'frauduleuse',
    'tromperie', 'arnaque', 'escroquerie', 'mensonge', 'tromperie', 'duperie',

    // Mots d'erreur (toujours négatifs)
    'erreur', 'faute', 'bévue', 'maladresse', 'gaffe', 'boulette', 'méprise',
    'confusion', 'inexactitude', 'imprécision', 'oublie', 'négligence', 'lapsus',

    // Mots de douleur (toujours négatifs)
    'douleur', 'souffrance', 'mal', 'souffrir', 'peiner', 'faire mal', 'blesser',
    'meurtrir', 'blessure', 'meurtrissure', 'traumatisme', 'séquelle', 'cicatrice',

    // Mots de perte (toujours négatifs)
    'perte', 'disparition', 'vol', 'casse', 'destruction', 'anéantissement',
    'ruine', 'déclin', 'chute', 'effondrement', 'écroulement', 'naufrage',

    // Mots de rejet (toujours négatifs)
    'rejet', 'refus', 'dénégation', 'opposition', 'veto', 'non', 'négatif',
    'déclin', 'débouté', 'rejeté', 'exclu', 'exclue', 'banni', 'bannie',

    // Insultes professionnelles polies (négatives)
    'incompétent', 'incompétente', 'incapable', 'inefficace', 'improductif',
    'négligent', 'négligente', 'irresponsable', 'dilettante', 'amateur',

    // Mots de mauvaise qualité
    'cassé', 'cassée', 'abîmé', 'abîmée', 'endommagé', 'détérioré', 'défectueux',
    'défaillant', 'hors-service', 'en panne', 'rouillé', 'pourri', 'pourrie',

    // Mots de désordre
    'désordre', 'chaos', 'pagaille', 'bazar', 'foutoir', 'capharnaüm',

    // Mots de tristesse
    'triste', 'mélancolique', 'morose', 'sombre', 'lugubre', 'funèbre', 'sinistre',

    // Mots d'inquiétude
    'inquiétant', 'alarmant', 'préoccupant', 'troublant', 'perturbant',

    // Mots d'énervement
    'énervant', 'agaçant', 'exaspérant', 'irritant', 'rageant', 'frustrant',

    // Mots de malchance
    'malchance', 'malheureux', 'malencontreux', 'fâcheux', 'regrettable',

    // Mots d'impolitesse
    'impoli', 'malpoli', 'grossier', 'vulgaire', 'irrespectueux', 'insolent',

    // Mots de malveillance
    'méchant', 'malveillant', 'malfaisant', 'nuisible', 'toxique', 'pervers',

    // Mots de tromperie
    'menteur', 'trompeur', 'fourbe', 'hypocrite', 'traître', 'félon',

    // Mots de rejet catégorique
    'jamais', 'aucun', 'nullement', 'pas du tout', 'absolument pas',

    // Mots d'urgence négative
    'urgent', 'immédiat', 'critique', 'grave', 'sérieux', 'dramatique',

    // Mots de sanction
    'amende', 'pénalité', 'sanction', 'punition', 'suspension', 'radiation',

    // Mots de rupture
    'rupture', 'séparation', 'divorce', 'adieu', 'fin', 'terminé', 'fini',

    // Mots d'abandon
    'abandon', 'délaissement', 'démission', 'renoncement', 'capitulation',

    // Mots de gaspillage
    'gaspillage', 'perte', 'gâchis', 'dilapidation', 'prodigalité',

    // Mots de regret intense
    'regret amer', 'remords', 'repentir', 'contrition', 'mea culpa',

    // Mots de mépris
    'mépris', 'dédain', 'désdain', 'arrogance', 'supériorité', 'morgue',

    // Mots de moquerie
    'moquerie', 'raillerie', 'dérision', 'ridicule', 'dérision', 'sarcasme',

    // Mots d'humiliation
    'humiliation', 'honte', 'ignominie', 'opprobre', 'flétrissure', 'déshonneur',

    // Mots de harcèlement
    'harcèlement', 'persécution', 'tyrannie', 'oppression', 'despotisme',

    // Mots d'arnaque
    'arnaque', 'escroquerie', 'fraude', 'tromperie', 'duperie', 'entourloupe',

    // Mots de spam (négatifs dans ce contexte)
    'spam', 'pourriel', 'indésirable', 'pub intempestive', 'sollicitation abusive',

    // Mots de fatigue face aux emails
    'fatigué', 'lassé', 'épuisé', 'saturé', 'débordé', 'submergé',

    // Mots de rejet d'offre
    'désabonnement', 'désinscription', 'retrait', 'opposition', 'refus',

    // Mots de blocage
    'blocage', 'bloqué', 'bloquée', 'empêché', 'entravé', 'contrarié'
  ];

  const positiveWords = [
    // Mots de gratitude (toujours positifs)
    'merci', 'remercie', 'remerciements', 'reconnaissant', 'grâce',

    // Mots de félicitation (toujours positifs)
    'bravo', 'félicitations', 'fier', 'fière', 'admiration', 'respect',

    // Mots de satisfaction (presque toujours positifs)
    'content', 'contente', 'satisfait', 'satisfaite', 'ravi', 'ravie',
    'heureux', 'heureuse', 'comblé', 'comblée', 'enchanté', 'enchantée',

    // Mots de qualité (difficilement négatifs)
    'parfait', 'parfaite', 'impeccable', 'excellent', 'excellente',
    'formidable', 'magnifique', 'superbe', 'remarquable',

    // Mots d'appréciation simple
    'bien', 'bon', 'bonne', 'bons', 'bonnes', 'sympa', 'génial', 'géniale',

    // Superlatifs positifs clairs
    'extraordinaire', 'exceptionnel', 'exceptionnelle', 'incroyable',
    'fantastique', 'merveilleux', 'merveilleuse', 'fabuleux', 'fabuleuse',

    // Mots d'approbation
    'oui', 'd\'accord', 'approuve', 'validé', 'parfaitement',

    // Mots de succès (toujours positifs)
    'réussi', 'réussie', 'victoire', 'gagné', 'succès',

    // Qualités personnelles (positives)
    'gentil', 'gentille', 'aimable', 'serviable', 'attentionné', 'attentionnée',
    'professionnel', 'professionnelle', 'compétent', 'compétente',

    // Mots d'encouragement
    'courage', 'persévérance', 'continuez', 'allez-y',

    // Mots de célébration
    'youpi', 'hourra', 'super', 'top', 'cool', 'chouette',

    // Mots de confiance
    'confiance', 'fiable', 'sérieux', 'sérieuse', 'rigoureux', 'rigoureuse',

    // Mots de plaisir simple
    'plaisir', 'joie', 'bonheur', 'sourire', 'amusant', 'amusante',

    // Résultats positifs
    'progrès', 'amélioration', 'réussite', 'performance', 'efficace',

    // Mots d'appréciation professionnelle
    'professionnalisme', 'qualité', 'expertise', 'savoir-faire',

    // Mots d'émotion positive simple
    'adorable', 'charmant', 'charmante', 'agréable', 'délicieux', 'délicieuse',

    // Mots d'accord enthousiaste
    'carrément', 'absolument', 'totalement', 'entièrement',

    // Mots de remerciement spécifiques
    'merci beaucoup', 'merci infiniment', 'mille mercis', 'grand merci',

    // Mots d'appréciation du travail
    'travail remarquable', 'beau travail', 'excellent travail',

    // Mots de soutien
    'soutien', 'encouragement', 'motivation', 'inspiration',

    // Mots d'admiration
    'admirable', 'impressionnant', 'impressionnante', 'époustouflant',

    // Mots de valeur
    'précieux', 'précieuse', 'important', 'importante', 'essentiel',

    // Mots de recommandation
    'recommandé', 'recommandée', 'approuvé', 'certifié',

    // Mots de gratitude professionnelle
    'reconnaissance', 'gratitude', 'obligé', 'obligée',

    // Mots de contentement
    'sérénité', 'paix', 'tranquillité', 'bien-être',

    // Mots d'optimisme
    'optimiste', 'positif', 'positive', 'encourageant', 'encourageante',

    // Mots de célébration collective
    'ensemble', 'collectif', 'équipe', 'collaboration', 'partenariat',

    // Mots de réussite collective
    'succès collectif', 'réussite commune', 'travail d\'équipe',

    // Mots d'avenir positif
    'prometteur', 'prometteuse', 'avenir', 'progrès', 'évolution',

    // Mots de satisfaction client
    'client satisfait', 'client fidèle', 'fidélité', 'confiance client'
  ];

  let score = 0;
  const detectedWords = [];

  words.forEach(word => {
    if (negativeWords.includes(word)) {
      score -= 2;
      detectedWords.push(word);
    }
    if (positiveWords.includes(word)) {
      score += 2;
      detectedWords.push(word);
    }
  });

  const vote = score > 0 ? 'positive' : (score < 0 ? 'negative' : 'neutral');
  const comparative = words.length > 0 ? score / words.length : 0;

  return {
    score,
    vote,
    words: detectedWords,
    comparative,
    intent: 'unknown',
    intentConfidence: 0,
    mode: 'fallback'
  };
}

// Fonction pour classifier le sentiment
function getSentimentLabel(score) {
  if (score <= -3) return 'très négatif';
  if (score < 0) return 'négatif';
  if (score === 0) return 'neutre';
  if (score <= 2) return 'positif';
  return 'très positif';
}

function deepParseJSON(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return deepParseJSON(parsed);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map(deepParseJSON);
  }

  if (value && typeof value === "object") {
    const result = {};
    for (const key in value) {
      result[key] = deepParseJSON(value[key]);
    }
    return result;
  }

  return value;
}

// Middleware pour recevoir du texte brut (emails)
app.use(express.text({
  type: '*/*',
  limit: '500mb'
}));

// ============================================
// ENDPOINT PRINCIPAL - Réception des emails
// ============================================

app.post('/index', async (req, res) => {
  try {
    const mailBrut = req.body;

    if (!mailBrut) {
      return res.status(400).json({ error: 'Email vide' });
    }

    // ========================= 
    // BARRE DE CHARGEMENT NON BLOQUANTE
    // =========================
    function loadingBar(duration = 3000, steps = 30) {
      return new Promise((resolve) => {
        let current = 0;
        const intervalTime = duration / steps;
        const interval = setInterval(() => {
          current++;

          const progress = Math.floor((current / steps) * 100);
          const bar = "█".repeat(current) + "-".repeat(steps - current);
          process.stdout.write(chalk.hex('#c30051')(`\r[${bar}] ${progress}%`));

          if (current >= steps) {
            clearInterval(interval);
            process.stdout.write("\n");
            resolve(); // FIN → on libère le code
          }
        }, intervalTime);
      });
    }

    await loadingBar();

    // =========================
    // TRAITEMENT EMAIL (NORMAL)
    // =========================
    const timestamp = Date.now();
    const id = `${timestamp}-${Math.random().toString(36).substring(7)}`;

    console.log(`📨 Nouvel email (ID: ${id})`);
    const cheminEML = path.join(DOSSIER_EML, `email-${id}.eml`);
    fs.writeFileSync(cheminEML, mailBrut);
    console.log(`   ✅ Sauvegardé: ${cheminEML}`);

    const mail = deepParseJSON(req.body).rawEmail;

    const analyse = {
      id,
      date_reception: new Date().toISOString(),
      sujet: mail.subject || '(pas de sujet)',
      expediteur: mail.from?.address || 'inconnu',
      destinataires: mail.to?.value?.map(d => d.address) || [],
      date_envoi: mail.date || null,
      message_id: mail.messageId,
      liens: [],
      pieces_jointes: mail.attachments?.map(a => ({
        nom: a.filename,
        type: a.contentType,
        taille: a.size
      })) || []
    };

    const texteComplet = mail.text || mail.html || '';
    console.log("Longueur du texte ", texteComplet.length);
    textTransfer_obj.value = texteComplet;
    console.log("Langue détectée après setter ", textTransfer_obj.value);

    if (mail.html) {
      analyse.liens = mail.html.match(/https?:\/\/[^\s"'<>(){}|\\^`[\]]+/g) || [];
    } else if (mail.text) {
      analyse.liens = mail.text.match(/https?:\/\/[^\s]+/g) || [];
    };

    if (texteComplet) {
      const sentimentResult = await analyzeSentiment(mail, id);

      analyse.sentiment = {
        score: sentimentResult.score,
        vote: sentimentResult.vote,
        label: getSentimentLabel(sentimentResult.score),
        words: sentimentResult.words,
        comparative: sentimentResult.comparative,
        intent: sentimentResult.intent,
        intentConfidence: sentimentResult.intentConfidence,
        mode: sentimentResult.mode || 'nlp'
      };

      console.log(`📊 Sentiment: ${analyse.sentiment.label}`);
    };

    analyse.suspect = {
      liens_raccourcis: analyse.liens.some(l => /bit\.ly|tinyurl|short\.link/i.test(l)),
      urls_ip: analyse.liens.some(l => /\d+\.\d+\.\d+\.\d+/.test(l)),
      mots_urgence:
        /urgent|immédiat|action requise|vérifiez|cliquez/i.test(mail.subject || '') ||
        /urgent|immédiat|action requise|vérifiez|cliquez/i.test(mail.text || ''),
      points_exclamation: (mail.text || '').split('!').length - 1,
      majuscules: (mail.text || '').match(/[A-Z]{5,}/g)?.length || 0
    };

    analyse.score_agressivite = Math.min(
      (analyse.suspect.points_exclamation * 5) +
      (analyse.suspect.majuscules * 3) +
      (analyse.suspect.mots_urgence ? 20 : 0) +
      (analyse.suspect.liens_raccourcis ? 15 : 0),
      100
    );

    const cheminTexte = path.join(DOSSIER_TEXTES, `texte-${id}.json`);
    fs.writeFileSync(cheminTexte, JSON.stringify(mail.text, null, 2));

    const cheminFallback = path.join(DOSSIER_FALLBACK, `mailparsersentimentcode-${id}.json`);
    fs.writeFileSync(cheminFallback, JSON.stringify(analyse, null, 2));


    return res.status(200).json({
      success: true,
      id,
      message: 'Email traité avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINT DE TEST
// ============================================
app.get('/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur webhook actif',
    nlp: {
      loaded: modelLoaded,
      modelPath: MODEL_PATH
    },
    dossiers: {
      eml: DOSSIER_EML,
      analyses: DOSSIER_FALLBACK,
      textes: DOSSIER_TEXTES,
      models: DOSSIER_MODELS,
      transfer: DOSSIER_TRANSFER,
      npmnlp: DOSSIER_NLPJS,
    },
    mode_actuel: modelLoaded ? 'ML (node-nlp)' : 'Rule-Based uniquement',
    stats: {
      modele_ml_charge: modelLoaded ? '✅ Oui' : '❌ Non'
    }
  });
});




// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
async function startServer() {
  await initializeNLP();

  const PathEMl = DOSSIER_EML.substring(DOSSIER_EML.indexOf("spamalaxie"));
  const PathFallback = DOSSIER_FALLBACK.substring(DOSSIER_FALLBACK.indexOf("spamalaxie"));
  const PathTextes = DOSSIER_TEXTES.substring(DOSSIER_TEXTES.indexOf("spamalaxie"));
  const PathModels = DOSSIER_MODELS.substring(DOSSIER_MODELS.indexOf("spamalaxie"));
  const PathTransfer = DOSSIER_TRANSFER.substring(DOSSIER_TRANSFER.indexOf("spamalaxie"))
  const PathNpmNLP = DOSSIER_NLPJS.substring(DOSSIER_NLPJS.indexOf("spamalaxie"));

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║  SERVEUR WEBHOOK DÉMARRÉ                              ║
╠═══════════════════════════════════════════════════════╣
║  📡 URL locale: http://localhost:${PORT}       
║  🧪 Test: http://localhost:${PORT}/test        
║  📥 Webhook: http://localhost:${PORT}/index              
║                                              
║  🤖 NLP: ${modelLoaded ? '✅ Hybride' : '⚠️ Mode basique'}                      
║  📁 Dossier EML: ${PathEMl}    
║  📁 Dossier fallback: ${PathFallback} 
║  📁 Dossier textes: ${PathTextes}
║  📁 Dossier models: ${PathModels}
║  📁 Dossier npm-nlp: ${PathNpmNLP}
║  📁 Dossier à tranférer :${PathTransfer}
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du serveur...');
  process.exit();
});

// Lancer le serveur
startServer();