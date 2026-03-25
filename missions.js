// ============================================================
//  missions.js – Missions de base pour le jeu Missions Secrètes
//  Ces missions servent de fallback si l'IA est indisponible
// ============================================================

const missionsBase = [
  // Mots à placer
  { type: "mot", contenu: "frigo" },
  { type: "mot", contenu: "parapluie" },
  { type: "mot", contenu: "astronaute" },
  { type: "mot", contenu: "cactus" },
  { type: "mot", contenu: "escalier" },
  { type: "mot", contenu: "licorne" },
  { type: "mot", contenu: "pizzeria" },
  { type: "mot", contenu: "trampoliner" },
  { type: "mot", contenu: "crocodile" },
  { type: "mot", contenu: "baguette" },

  // Actions Discord
  { type: "action", contenu: "Change ton pseudo en ajoutant '🌟' dedans" },
  { type: "action", contenu: "Envoie un GIF bizarre sans explication" },
  { type: "action", contenu: "Utilise uniquement des majuscules pendant 2 messages" },
  { type: "action", contenu: "Pose 3 questions d'affilée sans attendre les réponses" },
  { type: "action", contenu: "Dis 'attends' au milieu d'une de tes phrases" },
  { type: "action", contenu: "Réponds à quelqu'un en commençant par 'En fait non...'" },
  { type: "action", contenu: "Envoie un emoji totalement hors contexte" },

  // Missions sociales
  { type: "social", contenu: "Interromps quelqu'un au milieu de son message" },
  { type: "social", contenu: "Répète un mot 3 fois dans la même phrase" },
  { type: "social", contenu: "Dis 'j'ai une théorie' et développe n'importe quoi" },
  { type: "social", contenu: "Change de sujet brutalement en plein milieu d'une conversation" },
  { type: "social", contenu: "Donne un avis très tranché sur un sujet banal" },

  // Sabotage
  { type: "sabotage", contenu: "Fais dériver la conversation vers la nourriture" },
  { type: "sabotage", contenu: "Convaincs quelqu'un de changer d'avis sur n'importe quoi" },
  { type: "sabotage", contenu: "Fais parler quelqu'un de son enfance" },
];

if (typeof module !== "undefined") module.exports = { missionsBase };
