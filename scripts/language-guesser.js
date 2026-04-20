const { Language } = require('node-nlp');
const chalk = require('chalk');

// text = 'Salut comment ca va ? Je me demandais si tu voulais aller au restaurant dans trois jours. Ca me ferait super plaisir de te revoir !'
// text = 'Hey how are you today? I asked for a living in my bathroom because I absolutely need a new car. See you soon'
// text = 'Hola, me llamo Alejandra. Tengo 23 años y vivo en París. Todos los días me levanto a las 7 de la mañana y voy a la universidad a pie. Estudio derecho. Por las tardes, trabajo como camarera en un restaurante llamado La Concordia'

function languageGuesser(texteComplet) {
    let guess = [];
    if (texteComplet) {
        text = texteComplet.split('>')[4];
        const languageDetector = new Language();
        guess = languageDetector.guess(text);
        console.log(guess[0], "GUESS");
        console.log(guess[1], "GUESS");
        console.log(guess[2], "GUESS");
        console.log(guess[3], "GUESS");
    };
    return guess;
};

module.exports = languageGuesser;