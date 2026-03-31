# Art generative project - spam_mails 

Script for filter spam mails and recover some informations about the spam

##  Données utilisables :
Longueur des mots, liens contenus dans le mail, taille du mail, mail de l'expéditeur, IP du serveur de l'expéditeur, heure d'envoi, et bien plus encore...

##  Données utilisées :

Voici les données que nous traitons actuellement dans les mails reçus :

Émotions ressenties à la lecture du spam, la longueur du message, la date dee réception

**A MODIFIER**
<br>
{
  "id": "1772790547513-vc3u4e",
  "date_reception": "2026-03-06T09:49:07.555Z",
  "sujet": "Fwd: Plus que 7 jours pour gagner 100 €",
  "expediteur": "yaelfavre22@gmail.com",
  "destinataires": [],
  "date_envoi": "2026-03-06T09:49:07.127Z",
  "return_path": "<yaelfavre22@gmail.com>",
  "a_texte": true,
  "a_html": true,
  "taille_texte": 6538,
  "liens": [],
  "pieces_jointes": [],
  "suspect": {
    "liens_raccourcis": false,
    "urls_ip": false,
    "mots_urgence": false,
    "points_exclamation": 0,
    "majuscules": 10
  },
  "score_agressivite": 30
}

##  Possibilités coté JavaScript :

**Métadonnées** : La librairie JS [mailparser](https://nodemailer.com/extras/mailparser) nous permet de récupérer les métadonnées du mail afin de pouvoir les utiliser par la suite.

**Liens, scripts, pièces jointes...** : Nous utilisons un regex et recherchons des mots clés afin de déterminer si un mail contientW ou non des liens/scripts.

**Bienveillance du mail** : Un appel à une API ou une IA externe nous permettrait de filtrer la bienveillance du mail. Cependant afin de maintenir la confidentialité de nos mails, nous installons [node-nlp](https://www.npmjs.com/package/node-nlp) afin de traiter les données en local.

## Librairies utilisées: mailparser, mailparse, express, node-nlp et csv-parser

## Itinéraire de nos données
Voici l'itinéraire complet de nos données, en premier temps, nous devrons réceptionner le mail afin de pouvoir en extraire les données. Nous procédons à une redirection de mail afin d'automatiser au maximum le processus.

### Redirection du mail
Le principe de base était d'automatiser la procédure d'analyse afin que le processus puisse fonctionner en effectuant le moins de tâches possibles. 
#### V1
Dans un premier temps, nous devrons lancer notre serveur Node.JS, [ngrok](https://ngrok.com/) en local ainsi que le scénario de [Make](https://eu1.make.com/) en distant afin d'établir une connexion entre les différents services.

Je me suis donc rendu sur make.com afin de créer un mailhook qui récéptionnerai tout les mails à traiter. Il suffit de lui envoyer nos spams directement à cette adresse : 2u6idvmpcyvee3z2dwreqly87o44qnfc@hook.eu1.make.com.
Afin de pouvoir communiquer directement avec notre serveur express (Node.JS ) local, nous utilisons ngrok qui sert de tunnel entre Make et mon localhost. Cela va pouvoir permettre à Make via une requête HTTP d'envoyer le mail directement sur mon serveur local.

![Schéma de la redirection des mails](/assets/images/redirection_schema.png)


### Emotions du mail
Afin de filtrer les émotions du mail, nous utilisons un [NLP](https://www.ibm.com/fr-fr/think/topics/natural-language-processing). 
Plus précisément, une partie du NLP (Traitement Automatique du Langage Naturel), le [NLU](https://www.ibm.com/fr-fr/think/topics/natural-language-understanding). Le NLP est composé de deux sous-domaines principaux et complémentaires :

- Le [NLU](https://www.ibm.com/fr-fr/think/topics/natural-language-understanding) (Natural Language Understanding) : c'est le processus par lequel l'ordinateur, dont le langage natif est le code binaire (les 0 et les 1), comprend le langage humain. Le NLU va au-delà des simples mots pour saisir le sens, le contexte et l'intention de ce qui est dit ou écrit.
  
- Le [NLG](https://www.ibm.com/think/topics/natural-language-generation) (Natural Language Generation) : c'est le processus inverse, qui sert à ce que l'ordinateur génère des phrases et un langage compréhensibles par nous, les humains, à  partir de données structurées.

Dans notre cas, comme nous utiliserons directement les données extraites, nous n'aurons pas besoin de demander à l'ordinateur de formuler des phrases.
Après avoir comparé plusieurs NLP, l'outil utilisé sera [node-nlp](https://www.npmjs.com/package/node-nlp).
#### Comment ca fonctionne
- Il comprend le français
- Il est complet et permet une approche Machine learning via le [word embedding](https://www.ibm.com/think/topics/word-embeddings) ou/et le [token embedding](https://nkalra0123.medium.com/token-embeddings-what-they-are-why-they-matter-and-how-to-build-them-with-working-code-c42d152f6877) qui consiste à faire de l'embedding avec des tokens
- En cas de problèmne, il exécutera le fallback qui utilisera une méthode [rule-based](https://en.wikipedia.org/wiki/Rule-based_machine_learning)

![Comparatif du machine learning et du rule-based](/assets/images/MD-MLvsRuleBased.png)

#### Fonctionnement machine learning : 
📨 Email reçu (ID: 123456)
    ↓
📁 emails_bruts/email-123456.eml
    ↓
🧠 Analyse ML via node-nlp
    ↓
📁 npm-nlp_analysis/analyse-123456.json  ← Données BRUTES du ML
    ↓
📝 Traitement et enrichissement
    ↓
📁 analysis/analysis-123456.json         ← Résultat FINAL (avec mode: "nlp")


#### Fonctionnement rule-based (sans modèle): 
📨 Email reçu (ID: 123456)
    ↓
📁 emails_bruts/email-123456.eml
    ↓
⚠️ Modèle non chargé → fallbackSentimentAnalysis()
    ↓
📁 analysis/analysis-123456.json         ← Résultat FINAL (avec mode: "fallback")
    ↓
( PAS de fichier dans npm-nlp_analysis/ )

