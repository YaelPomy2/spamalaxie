const { Language } = require('node-nlp');

//

function languageGuesser(textToGuess) {

    
    const languageDetector = new Language();
    const guess = languageDetector.guess(textToGuess);
    console.log(guess[0], "GUESS");
    return guess[0];
}

module.exports = languageGuesser;