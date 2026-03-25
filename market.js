// ============================================================
//  market.js – Personnages pour le jeu Marché Secret
//  Format : { name, serie, rarete }
//  rarete : "C" commun | "R" rare | "SR" super rare | "SSR" légendaire
// ============================================================

const characters = {
  anime: [
    // SSR - Légendaires
    { name: "Goku", serie: "Dragon Ball Z", rarete: "SSR" },
    { name: "Naruto Uzumaki", serie: "Naruto", rarete: "SSR" },
    { name: "Luffy", serie: "One Piece", rarete: "SSR" },
    { name: "Saitama", serie: "One Punch Man", rarete: "SSR" },
    { name: "Levi Ackerman", serie: "Attack on Titan", rarete: "SSR" },
    { name: "Edward Elric", serie: "Fullmetal Alchemist", rarete: "SSR" },
    { name: "Light Yagami", serie: "Death Note", rarete: "SSR" },
    { name: "Tanjiro Kamado", serie: "Demon Slayer", rarete: "SSR" },

    // SR - Super Rares
    { name: "Vegeta", serie: "Dragon Ball Z", rarete: "SR" },
    { name: "Sasuke Uchiha", serie: "Naruto", rarete: "SR" },
    { name: "Zoro", serie: "One Piece", rarete: "SR" },
    { name: "Killua", serie: "Hunter x Hunter", rarete: "SR" },
    { name: "Gon", serie: "Hunter x Hunter", rarete: "SR" },
    { name: "Deku", serie: "My Hero Academia", rarete: "SR" },
    { name: "Bakugo", serie: "My Hero Academia", rarete: "SR" },
    { name: "Eren Yeager", serie: "Attack on Titan", rarete: "SR" },
    { name: "Ichigo", serie: "Bleach", rarete: "SR" },
    { name: "Ryuk", serie: "Death Note", rarete: "SR" },
    { name: "Zenitsu", serie: "Demon Slayer", rarete: "SR" },
    { name: "Inosuke", serie: "Demon Slayer", rarete: "SR" },

    // R - Rares
    { name: "Kakashi", serie: "Naruto", rarete: "R" },
    { name: "Itachi", serie: "Naruto", rarete: "R" },
    { name: "Nami", serie: "One Piece", rarete: "R" },
    { name: "Sanji", serie: "One Piece", rarete: "R" },
    { name: "Mikasa", serie: "Attack on Titan", rarete: "R" },
    { name: "Alphonse Elric", serie: "Fullmetal Alchemist", rarete: "R" },
    { name: "Todoroki", serie: "My Hero Academia", rarete: "R" },
    { name: "Spike Spiegel", serie: "Cowboy Bebop", rarete: "R" },
    { name: "Alucard", serie: "Hellsing", rarete: "R" },
    { name: "Giorno Giovanna", serie: "JoJo's Bizarre Adventure", rarete: "R" },

    // C - Communs
    { name: "Rock Lee", serie: "Naruto", rarete: "C" },
    { name: "Usopp", serie: "One Piece", rarete: "C" },
    { name: "Chopper", serie: "One Piece", rarete: "C" },
    { name: "Mineta", serie: "My Hero Academia", rarete: "C" },
    { name: "Connie", serie: "Attack on Titan", rarete: "C" },
    { name: "Zeref", serie: "Fairy Tail", rarete: "C" },
    { name: "Happy", serie: "Fairy Tail", rarete: "C" },
    { name: "Bulma", serie: "Dragon Ball Z", rarete: "C" },
  ]
};

// Mise de départ suggérée selon la rareté
const rareteConfig = {
  SSR: { emoji: "🌟", label: "LÉGENDAIRE", miseDepart: 5_000_000 },
  SR:  { emoji: "💎", label: "SUPER RARE",  miseDepart: 3_000_000 },
  R:   { emoji: "✨", label: "RARE",         miseDepart: 1_500_000 },
  C:   { emoji: "⚪", label: "COMMUN",       miseDepart:   500_000 },
};

if (typeof module !== "undefined") {
  module.exports = { characters, rareteConfig };
}
