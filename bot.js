// ============================================================
//  bot.js – Bot Discord — 5 jeux
//
//  !help                → aide générale (tous les jeux)
//  !help undercover     → détails Undercover
//  !help market         → détails Marché Secret
//  !help draft          → détails Draft Anime
//  !help word           → détails Trouve le Mot
//  !help missions       → détails Missions Secrètes
// ============================================================

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { words }                    = require('./mots.js');
const { characters, rareteConfig } = require('./market.js');
const { missionsBase }             = require('./missions.js');

// ── CONFIG ───────────────────────────────────────────────────
require('dotenv').config();
const token = process.env.TOKEN;
const ANTHROPIC_KEY = 'VOTRE_CLE_ANTHROPIC_ICI'; // ← clé API Anthropic (optionnel)
const PREFIX        = '!';
// ────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// ════════════════════════════════════════════════════════════
//  UTILITAIRES
// ════════════════════════════════════════════════════════════

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function formatMoney(n)  { return n.toLocaleString('fr-FR') + ' 💰'; }
function rareteEmoji(r)  { return rareteConfig[r]?.emoji ?? '⚪'; }
function rareteLabel(r)  { return rareteConfig[r]?.label ?? r; }

async function askClaude(system, user) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? null;
  } catch (e) {
    console.error('Erreur Claude:', e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════
//  SYSTÈME D'AIDE UNIFIÉ
// ════════════════════════════════════════════════════════════

const HELP_GENERAL = `\`\`\`
╔══════════════════════════════════════════════╗
║              🎮 LISTE DES JEUX               ║
╠══════════════════════════════════════════════╣
║                                              ║
║  🕵️  Undercover                              ║
║      !start <nb> <uc> <cat> @j1 @j2 ...     ║
║                                              ║
║  🎴  Marché Secret  (enchères secrètes)      ║
║      !market @j1 @j2                        ║
║                                              ║
║  🏆  Draft Anime    (enchères + débat)       ║
║      !draft @j1 @j2                         ║
║                                              ║
║  🔍  Trouve le Mot                           ║
║      !word @devineur                        ║
║                                              ║
║  🎭  Missions Secrètes                       ║
║      !mission @j1 @j2 ...                   ║
║                                              ║
║  👉  !help <jeu> pour plus de détails        ║
║      ex: !help undercover                   ║
╚══════════════════════════════════════════════╝\`\`\``;

const HELP_PAGES = {
  undercover: `\`\`\`
╔══════════════════════════════════════════════╗
║           🕵️  UNDERCOVER                     ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Chaque joueur reçoit un mot secret en DM.   ║
║  Les civils ont le même mot.                 ║
║  L'undercover a un mot différent mais lié.   ║
║  Donnez des indices, trouvez l'intrus !      ║
║                                              ║
║  !start <joueurs> <undercovers> <catégorie>  ║
║          @j1 @j2 @j3 ...                    ║
║                                              ║
║  Exemple :                                   ║
║  !start 5 1 anime @Alice @Bob @Charlie       ║
║                   @David @Eve                ║
║                                              ║
║  Catégories :                                ║
║  anime | films | jeuxvideo | general         ║
║  sport | nourriture                          ║
║                                              ║
║  !cats → liste les catégories               ║
╚══════════════════════════════════════════════╝\`\`\``,

  market: `\`\`\`
╔══════════════════════════════════════════════╗
║           🎴  MARCHÉ SECRET                  ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Budget de départ : 10 000 000               ║
║  Objectif : remporter 3 personnages          ║
║                                              ║
║  Le bot propose un perso aux enchères.       ║
║  Chaque joueur envoie sa mise en DM.         ║
║  La plus haute mise l'emporte !              ║
║  Égalité → le premier à avoir misé gagne.   ║
║                                              ║
║  !market @j1 @j2   → lancer la partie       ║
║  !bid <montant>    → enchérir (en DM)       ║
║  !team             → voir son équipe        ║
║  !scores           → scores finaux          ║
╚══════════════════════════════════════════════╝\`\`\``,

  draft: `\`\`\`
╔══════════════════════════════════════════════╗
║           🏆  DRAFT ANIME                    ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Budget de départ : 15 000 000               ║
║  Objectif : remporter 3 personnages          ║
║                                              ║
║  Même principe que le Marché Secret          ║
║  mais avec plus de budget pour miser sur     ║
║  des persos légendaires !                    ║
║  À la fin, débattez pour savoir qui a        ║
║  la meilleure team.                          ║
║                                              ║
║  !draft @j1 @j2    → lancer le draft        ║
║  !dbid <montant>   → enchérir (en DM)       ║
║  !dteam            → voir sa team           ║
║  !dscores          → scores finaux          ║
╚══════════════════════════════════════════════╝\`\`\``,

  word: `\`\`\`
╔══════════════════════════════════════════════╗
║           🔍  TROUVE LE MOT                  ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Le Gardien reçoit un mot secret en DM.      ║
║  Le Devineur propose des mots.               ║
║  Le Gardien donne une note à voix haute      ║
║  (en vocal) selon la proximité du mot.       ║
║  Le Devineur continue jusqu'à trouver !      ║
║                                              ║
║  !word @devineur   → lancer la partie       ║
║      (vous êtes automatiquement le gardien) ║
║  !guess <mot>      → proposer un mot        ║
║  !wstop            → arrêter la partie      ║
╚══════════════════════════════════════════════╝\`\`\``,

  missions: `\`\`\`
╔══════════════════════════════════════════════╗
║           🎭  MISSIONS SECRÈTES              ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Chaque joueur reçoit une mission secrète    ║
║  en DM toutes les 10 minutes.                ║
║  Réussis-la sans te faire repérer !          ║
║                                              ║
║  Exemples : placer un mot bizarre,           ║
║  changer de pseudo, envoyer un GIF...        ║
║                                              ║
║  Mission réussie sans accusation → +1 pt    ║
║  Accusation correcte → +1 pt               ║
║  Fausse accusation → -1 pt                 ║
║                                              ║
║  !mission @j1 @j2 ...  → lancer            ║
║  !sus @joueur          → accuser           ║
║  !mscore               → scores            ║
║  !stopmission          → arrêter           ║
╚══════════════════════════════════════════════╝\`\`\``,
};

// ════════════════════════════════════════════════════════════
//  1. UNDERCOVER
// ════════════════════════════════════════════════════════════

async function handleStart(message, args) {
  if (args.length < 3)
    return message.channel.send(`❌ Usage : \`!start <joueurs> <undercovers> <catégorie> @j1 @j2 ...\`\nEx : \`!start 5 1 anime @Alice @Bob @Charlie @David @Eve\``);

  const numPlayers = parseInt(args[0]);
  const numUnder   = parseInt(args[1]);
  const category   = args[2].toLowerCase();
  const mentions   = [...message.mentions.users.values()];

  if (isNaN(numPlayers) || numPlayers < 3 || numPlayers > 20)
    return message.channel.send('❌ Le nombre de joueurs doit être entre **3** et **20**.');
  if (isNaN(numUnder) || numUnder < 1 || numUnder >= numPlayers)
    return message.channel.send(`❌ Le nombre d'undercover doit être ≥ 1 et < ${numPlayers}.`);
  if (!words[category]?.length) {
    const cats = Object.keys(words).join(', ');
    return message.channel.send(`❌ Catégorie inconnue : \`${category}\`\nDisponibles : ${cats}`);
  }
  if (mentions.length !== numPlayers)
    return message.channel.send(`❌ Mentionnez exactement **${numPlayers}** joueurs.`);

  const pair            = randomPick(words[category]);
  const civWord         = pair[0];
  const underWord       = pair[1];
  const shuffledPlayers = shuffle(mentions);
  const underSet        = new Set(shuffledPlayers.slice(0, numUnder).map(u => u.id));

  const assignments = shuffledPlayers.map(user => ({
    user,
    role: underSet.has(user.id) ? 'under' : 'civil',
    word: underSet.has(user.id) ? underWord : civWord,
  }));

  const dmResults = await Promise.allSettled(
    assignments.map(async ({ user, word, role }) => {
      await user.send(
        `${role === 'under' ? '🕵️' : '👤'} **Undercover – Ton mot secret**\n\n` +
        `> Ton mot est : **\`${word}\`**\n\n` +
        `*Ne le révèle à personne ! Donne des indices sans le dire directement.*`
      );
    })
  );

  const failed = dmResults
    .filter(r => r.status === 'rejected')
    .map((_, i) => shuffledPlayers[i].username);

  // Choisir aléatoirement qui commence (parmi les joueurs qui ont reçu leur DM)
  const successPlayers = shuffledPlayers.filter((_, i) => dmResults[i].status === 'fulfilled');
  const firstPlayer    = randomPick(successPlayers.length ? successPlayers : shuffledPlayers);

  let msg =
    `🎮 **Undercover** – La partie commence !\n` +
    `📂 \`${category}\` | 👥 ${numPlayers} joueurs | 🕵️ ${numUnder} undercover\n\n` +
    `🔒 Mots distribués ! Vérifiez vos DMs.\n` +
    `**Joueurs :** ${shuffledPlayers.map(u => `<@${u.id}>`).join(' · ')}`;

  if (failed.length)
    msg += `\n\n⚠️ DM impossible pour : **${failed.join(', ')}** — autorisez les DMs du serveur.`;

  await message.channel.send(msg);

  // Annoncer qui commence avec un petit délai pour le suspense
  setTimeout(async () => {
    await message.channel.send(
      `\n🎲 **Tirage au sort...**\n\n` +
      `▶️ C'est **${firstPlayer.username}** qui commence !\n` +
      `*Donne ton premier indice !*`
    );
  }, 2000);
}

// ════════════════════════════════════════════════════════════
//  2. MARCHÉ SECRET
// ════════════════════════════════════════════════════════════

const marketGames = new Map();
const BUDGET_MARKET = 10_000_000;
const PERSO_MARKET  = 3;

function createMarketGame(p1, p2, channel) {
  const pool = shuffle(characters.anime).slice(0, PERSO_MARKET * 2 + 5);
  return {
    channel,
    players: {
      [p1.id]: { user: p1, budget: BUDGET_MARKET, team: [], bidTime: null, bidAmount: null },
      [p2.id]: { user: p2, budget: BUDGET_MARKET, team: [], bidTime: null, bidAmount: null },
    },
    playerIds: [p1.id, p2.id],
    pool, currentIndex: 0, currentChar: null, phase: 'bidding', round: 0,
  };
}

async function marketNextAuction(guildId) {
  const game = marketGames.get(guildId);
  if (!game) return;

  const total    = PERSO_MARKET * 2;
  const complete = game.playerIds.every(id => game.players[id].team.length >= PERSO_MARKET);
  if (game.round >= total || complete) return marketEndGame(guildId);

  const char = game.pool[game.currentIndex];
  game.currentChar = char; game.currentIndex++; game.round++;
  for (const id of game.playerIds) { game.players[id].bidAmount = null; game.players[id].bidTime = null; }

  const cfg = rareteConfig[char.rarete];
  await game.channel.send(
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${cfg.emoji} **ENCHÈRE #${game.round}/${total}**\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎴 **${char.name}** — *${char.serie}*\n` +
    `Rareté : ${cfg.emoji} **${cfg.label}** | Mise min : **${formatMoney(cfg.miseDepart)}**\n\n` +
    `📬 Enchérissez en DM au bot : \`!bid <montant>\`\n\n` +
    game.playerIds.map(id => `> ${game.players[id].user.username} : **${formatMoney(game.players[id].budget)}**`).join('\n')
  );

  for (const id of game.playerIds) {
    const p = game.players[id];
    try {
      await p.user.send(
        `🎴 **${char.name}** est en vente !\n` +
        `${cfg.emoji} ${cfg.label} | Mise min : **${formatMoney(cfg.miseDepart)}**\n` +
        `Ton budget : **${formatMoney(p.budget)}**\n\n` +
        `\`!bid <montant>\` pour enchérir.`
      );
    } catch {}
  }
}

async function marketResolve(guildId) {
  const game = marketGames.get(guildId);
  if (!game?.currentChar) return;

  const [id1, id2] = game.playerIds;
  const p1 = game.players[id1], p2 = game.players[id2];
  const char = game.currentChar;
  const cfg  = rareteConfig[char.rarete];
  const bid1 = p1.bidAmount ?? 0, bid2 = p2.bidAmount ?? 0;
  const v1   = bid1 >= cfg.miseDepart && bid1 <= p1.budget;
  const v2   = bid2 >= cfg.miseDepart && bid2 <= p2.budget;

  let winnerId = null, resultMsg = '';

  if (!v1 && !v2) {
    resultMsg = `❌ Aucune enchère valide pour **${char.name}** ! Personnage retiré.`;
  } else if (!v1) { winnerId = id2; }
  else if (!v2)   { winnerId = id1; }
  else if (bid1 > bid2) { winnerId = id1; }
  else if (bid2 > bid1) { winnerId = id2; }
  else {
    winnerId  = p1.bidTime <= p2.bidTime ? id1 : id2;
    resultMsg = `⚖️ Égalité ! **${game.players[winnerId].user.username}** a misé en premier.\n`;
  }

  if (winnerId) {
    const w = game.players[winnerId];
    w.budget -= w.bidAmount;
    w.team.push({ ...char, prixPaye: w.bidAmount });
    resultMsg +=
      `\n🏆 **${w.user.username}** remporte **${char.name}** !\n` +
      `💸 Prix : **${formatMoney(w.bidAmount)}** | 📊 ${p1.user.username} → ${formatMoney(bid1)} | ${p2.user.username} → ${formatMoney(bid2)}\n\n` +
      game.playerIds.map(id => {
        const p = game.players[id];
        return `> ${p.user.username} : **${formatMoney(p.budget)}** | 🃏 ${p.team.length}/${PERSO_MARKET}`;
      }).join('\n');
  }

  await game.channel.send(resultMsg);
  setTimeout(() => marketNextAuction(guildId), 3000);
}

async function marketEndGame(guildId) {
  const game = marketGames.get(guildId);
  if (!game) return;
  game.phase = 'ended';

  let msg = `\n${'═'.repeat(33)}\n🏁 **FIN – MARCHÉ SECRET**\n${'═'.repeat(33)}\n\n`;
  for (const id of game.playerIds) {
    const p = game.players[id];
    msg += `👤 **${p.user.username}** — 💰 ${formatMoney(p.budget)} restant\n`;
    for (const c of p.team)
      msg += `  ${rareteEmoji(c.rarete)} **${c.name}** *(${c.serie})* — ${formatMoney(c.prixPaye)}\n`;
    msg += '\n';
  }
  msg += `🗣️ **Débattez : qui a la meilleure équipe ?**`;

  await game.channel.send(msg);
  marketGames.delete(guildId);
  marketGames.set(guildId + '_ended', game);
  setTimeout(() => marketGames.delete(guildId + '_ended'), 10 * 60 * 1000);
}

// ════════════════════════════════════════════════════════════
//  3. DRAFT ANIME
// ════════════════════════════════════════════════════════════

const draftGames  = new Map();
const BUDGET_DRAFT = 15_000_000;
const PERSO_DRAFT  = 3;

function createDraftGame(p1, p2, channel, budget) {
  const pool = shuffle(characters.anime).slice(0, PERSO_DRAFT * 2 + 5);
  return {
    channel,
    players: {
      [p1.id]: { user: p1, budget, team: [], bidTime: null, bidAmount: null },
      [p2.id]: { user: p2, budget, team: [], bidTime: null, bidAmount: null },
    },
    playerIds: [p1.id, p2.id],
    pool, currentIndex: 0, currentChar: null, phase: 'bidding', round: 0,
  };
}

async function draftNextAuction(guildId) {
  const game = draftGames.get(guildId);
  if (!game) return;

  const total    = PERSO_DRAFT * 2;
  const complete = game.playerIds.every(id => game.players[id].team.length >= PERSO_DRAFT);
  if (game.round >= total || complete) return draftEndGame(guildId);

  const char = game.pool[game.currentIndex];
  game.currentChar = char; game.currentIndex++; game.round++;
  for (const id of game.playerIds) { game.players[id].bidAmount = null; game.players[id].bidTime = null; }

  const cfg = rareteConfig[char.rarete];
  await game.channel.send(
    `\n🏆━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏆\n` +
    `**DRAFT #${game.round}/${total}**\n` +
    `🏆━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏆\n\n` +
    `🎴 **${char.name}** — *${char.serie}*\n` +
    `${cfg.emoji} **${cfg.label}** | Mise min : **${formatMoney(cfg.miseDepart)}**\n\n` +
    `📬 Enchérissez en DM : \`!dbid <montant>\`\n\n` +
    game.playerIds.map(id => {
      const p = game.players[id];
      return `> ${p.user.username} : **${formatMoney(p.budget)}** | 🃏 ${p.team.length}/${PERSO_DRAFT}`;
    }).join('\n')
  );

  for (const id of game.playerIds) {
    const p = game.players[id];
    try {
      await p.user.send(
        `🏆 **DRAFT** — **${char.name}** est en jeu !\n` +
        `${cfg.emoji} ${cfg.label} | Mise min : **${formatMoney(cfg.miseDepart)}**\n` +
        `Ton budget : **${formatMoney(p.budget)}**\n\n` +
        `\`!dbid <montant>\` pour enchérir.`
      );
    } catch {}
  }
}

async function draftResolve(guildId) {
  const game = draftGames.get(guildId);
  if (!game?.currentChar) return;

  const [id1, id2] = game.playerIds;
  const p1 = game.players[id1], p2 = game.players[id2];
  const char = game.currentChar;
  const cfg  = rareteConfig[char.rarete];
  const bid1 = p1.bidAmount ?? 0, bid2 = p2.bidAmount ?? 0;
  const v1   = bid1 >= cfg.miseDepart && bid1 <= p1.budget;
  const v2   = bid2 >= cfg.miseDepart && bid2 <= p2.budget;

  let winnerId = null, resultMsg = '';

  if (!v1 && !v2) {
    resultMsg = `❌ Aucune enchère valide pour **${char.name}** ! Personnage retiré.`;
  } else if (!v1) { winnerId = id2; }
  else if (!v2)   { winnerId = id1; }
  else if (bid1 > bid2) { winnerId = id1; }
  else if (bid2 > bid1) { winnerId = id2; }
  else {
    winnerId  = p1.bidTime <= p2.bidTime ? id1 : id2;
    resultMsg = `⚖️ Égalité ! **${game.players[winnerId].user.username}** a misé en premier.\n`;
  }

  if (winnerId) {
    const w = game.players[winnerId];
    w.budget -= w.bidAmount;
    w.team.push({ ...char, prixPaye: w.bidAmount });
    resultMsg +=
      `\n🏆 **${w.user.username}** remporte **${char.name}** !\n` +
      `💸 Prix : **${formatMoney(w.bidAmount)}** | 📊 ${p1.user.username} → ${formatMoney(bid1)} | ${p2.user.username} → ${formatMoney(bid2)}\n\n` +
      game.playerIds.map(id => {
        const p = game.players[id];
        return `> ${p.user.username} : **${formatMoney(p.budget)}** | 🃏 ${p.team.length}/${PERSO_DRAFT}`;
      }).join('\n');
  }

  await game.channel.send(resultMsg);
  setTimeout(() => draftNextAuction(guildId), 3000);
}

async function draftEndGame(guildId) {
  const game = draftGames.get(guildId);
  if (!game) return;
  game.phase = 'ended';

  let msg = `\n${'═'.repeat(33)}\n🏁 **FIN DU DRAFT ANIME**\n${'═'.repeat(33)}\n\n`;
  for (const id of game.playerIds) {
    const p = game.players[id];
    msg += `👤 **${p.user.username}** — 💰 ${formatMoney(p.budget)} restant\n`;
    for (const c of p.team)
      msg += `  ${rareteEmoji(c.rarete)} **${c.name}** *(${c.serie})* — ${rareteLabel(c.rarete)} — ${formatMoney(c.prixPaye)}\n`;
    msg += '\n';
  }
  msg += `🗣️ **Débattez : qui a la meilleure team ?**`;

  await game.channel.send(msg);
  draftGames.delete(guildId);
  draftGames.set(guildId + '_ended', game);
  setTimeout(() => draftGames.delete(guildId + '_ended'), 10 * 60 * 1000);
}

// ════════════════════════════════════════════════════════════
//  4. TROUVE LE MOT
//  Le gardien reçoit le mot en DM.
//  Le devineur propose avec !guess.
//  Le gardien donne sa note À VOIX HAUTE en vocal.
//  Le bot affiche juste les tentatives dans le chat.
// ════════════════════════════════════════════════════════════

const wordGames = new Map();

const WORD_LIST = [
  'voiture','chat','soleil','musique','château','montagne','pizza',
  'ordinateur','forêt','dragon','téléphone','bibliothèque','océan',
  'guitare','horloge','parapluie','volcan','astronaute','chocolat',
  'arc-en-ciel','désert','locomotive','phare','cactus','igloo',
  'accordéon','baleine','carnaval','détective','éléphant',
  'fantôme','girafe','hamster','île','jongleur','koala',
  'lanterne','marionnette','ninja','origami','pirate','robot',
  'saxophone','trampoline','ukulélé','vampire','xylophone','yoyo','zeppelin',
];

function createWordGame(guardian, guesser, channel) {
  return {
    channel,
    guardianId: guardian.id,
    guesserId:  guesser.id,
    guardian, guesser,
    secret:   randomPick(WORD_LIST),
    guesses:  [],
    attempts: 0,
    phase:    'playing',
  };
}

// ════════════════════════════════════════════════════════════
//  5. MISSIONS SECRÈTES
// ════════════════════════════════════════════════════════════

const missionGames    = new Map();
const MISSION_INTERVAL = 10 * 60 * 1000;

function createMissionGame(players, channel) {
  const state = { channel, players: {}, playerIds: players.map(u => u.id), scores: {}, activeMissions: {}, phase: 'playing' };
  for (const u of players) { state.players[u.id] = { user: u }; state.scores[u.id] = 0; }
  return state;
}

async function generateMission(playerName, otherPlayers) {
  const result = await askClaude(
    'Tu génères des missions secrètes courtes et amusantes pour un jeu Discord. Réponds UNIQUEMENT avec la description de la mission (1-2 phrases), sans titre ni introduction.',
    `Génère une mission secrète fun pour ${playerName}. Les autres joueurs sont : ${otherPlayers.join(', ')}. La mission doit être faisable dans un chat Discord textuel.`
  );
  return result ?? randomPick(missionsBase).contenu;
}

async function assignMission(guildId, playerId) {
  const game = missionGames.get(guildId);
  if (!game || game.phase !== 'playing') return;

  const player     = game.players[playerId];
  const otherNames = game.playerIds.filter(id => id !== playerId).map(id => game.players[id].user.username);
  const mission    = await generateMission(player.user.username, otherNames);

  if (game.activeMissions[playerId]?.timerId)
    clearTimeout(game.activeMissions[playerId].timerId);

  game.activeMissions[playerId] = {
    mission,
    startTime: Date.now(),
    timerId: setTimeout(() => assignMission(guildId, playerId), MISSION_INTERVAL),
  };

  try {
    await player.user.send(
      `🎭 **MISSION SECRÈTE**\n\n` +
      `> ${mission}\n\n` +
      `⏱️ Tu as **15 minutes** pour la réussir sans te faire repérer !\n` +
      `Si quelqu'un tape \`!sus @toi\` et a raison → tu perds le point.\n` +
      `Réussie sans être détecté → **+1 point** 🏆`
    );
  } catch {
    await game.channel.send(`⚠️ Impossible d'envoyer la mission à **${player.user.username}** en DM.`);
  }

  await game.channel.send(`🎭 Une nouvelle mission secrète vient d'être attribuée... 👀`);
}

// ════════════════════════════════════════════════════════════
//  ÉVÉNEMENTS
// ════════════════════════════════════════════════════════════

client.once('clientReady', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  client.user.setActivity('!help pour jouer', { type: 'PLAYING' });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args    = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  const guildId = message.guild?.id ?? message.author.id;

  // ══════════════════════════════════════════
  //  AIDE UNIFIÉE
  // ══════════════════════════════════════════

  if (command === 'help') {
    const sub = args[0]?.toLowerCase();
    if (sub && HELP_PAGES[sub]) return message.channel.send(HELP_PAGES[sub]);
    return message.channel.send(HELP_GENERAL);
  }

  if (command === 'cats') {
    const cats = Object.keys(words).map(c => `\`${c}\``).join(', ');
    return message.channel.send(`📂 **Catégories disponibles :** ${cats}`);
  }

  // ══════════════════════════════════════════
  //  UNDERCOVER
  // ══════════════════════════════════════════

  if (command === 'start') return handleStart(message, args);

  // ══════════════════════════════════════════
  //  MARCHÉ SECRET
  // ══════════════════════════════════════════

  if (command === 'market') {
    const mentions = [...message.mentions.users.values()];
    if (mentions.length !== 2)
      return message.channel.send('❌ Mentionnez exactement **2 joueurs**. Ex : `!market @Alice @Bob`');
    if (marketGames.has(guildId))
      return message.channel.send('⚠️ Une partie Marché Secret est déjà en cours !');

    const [p1, p2] = mentions;
    marketGames.set(guildId, createMarketGame(p1, p2, message.channel));
    await message.channel.send(
      `🎮 **MARCHÉ SECRET** — C'est parti !\n👥 ${p1} vs ${p2}\n` +
      `💰 Budget : **${formatMoney(BUDGET_MARKET)}** chacun | 🎯 ${PERSO_MARKET} personnages\n` +
      `📬 Enchères en DM avec \`!bid <montant>\` — Bonne chance ! 🍀`
    );
    setTimeout(() => marketNextAuction(guildId), 2000);
    return;
  }

  if (command === 'bid') {
    const amount = parseInt(args[0]?.replace(/[^0-9]/g, ''));
    if (isNaN(amount) || amount <= 0)
      return message.author.send('❌ Montant invalide. Ex : `!bid 3500000`');

    let foundGame = null, foundGuildId = null;
    for (const [gid, g] of marketGames.entries()) {
      if (g.phase === 'bidding' && g.players?.[message.author.id]) { foundGame = g; foundGuildId = gid; break; }
    }
    if (!foundGame) return message.author.send('❌ Aucune partie Marché Secret en cours pour toi.');

    const player = foundGame.players[message.author.id];
    const cfg    = rareteConfig[foundGame.currentChar?.rarete];
    if (!foundGame.currentChar) return message.author.send('⏳ Attends la prochaine enchère !');
    if (player.bidAmount !== null) return message.author.send('⚠️ Tu as déjà misé pour cette enchère !');
    if (amount < cfg.miseDepart)   return message.author.send(`❌ Mise min : **${formatMoney(cfg.miseDepart)}**`);
    if (amount > player.budget)    return message.author.send(`❌ Budget insuffisant : **${formatMoney(player.budget)}**`);

    player.bidAmount = amount; player.bidTime = Date.now();
    await message.author.send(`✅ Mise enregistrée : **${formatMoney(amount)}** pour **${foundGame.currentChar.name}**`);

    if (foundGame.playerIds.every(id => foundGame.players[id].bidAmount !== null))
      await marketResolve(foundGuildId);
    return;
  }

  if (command === 'team') {
    let g = null;
    for (const [, game] of marketGames.entries()) if (game.players?.[message.author.id]) { g = game; break; }
    if (!g) for (const [gid, game] of marketGames.entries()) if (gid.endsWith('_ended') && game.players?.[message.author.id]) { g = game; break; }
    if (!g) return message.channel.send('❌ Aucune partie Marché Secret trouvée.');

    const p = g.players[message.author.id];
    let msg = `🃏 **${p.user.username}** — 💰 ${formatMoney(p.budget)}\n\n`;
    for (const c of p.team) msg += `${rareteEmoji(c.rarete)} **${c.name}** *(${c.serie})* — ${formatMoney(c.prixPaye)}\n`;
    if (!p.team.length) msg += '*Aucun personnage.*';
    try { await message.author.send(msg); if (message.guild) await message.react('📬'); }
    catch { await message.channel.send(msg); }
    return;
  }

  if (command === 'scores') {
    const g = marketGames.get(guildId + '_ended') ?? marketGames.get(guildId);
    if (!g) return message.channel.send('❌ Aucune partie Marché Secret récente.');
    let msg = `📊 **SCORES – MARCHÉ SECRET**\n\n`;
    for (const id of g.playerIds) {
      const p = g.players[id];
      msg += `👤 **${p.user.username}** — 💰 ${formatMoney(p.budget)}\n`;
      for (const c of p.team) msg += `  ${rareteEmoji(c.rarete)} ${c.name} — ${formatMoney(c.prixPaye)}\n`;
      msg += '\n';
    }
    return message.channel.send(msg);
  }

  // ══════════════════════════════════════════
  //  DRAFT ANIME
  // ══════════════════════════════════════════

  if (command === 'draft') {
    const mentions = [...message.mentions.users.values()];
    if (mentions.length !== 2)
      return message.channel.send('❌ Mentionnez exactement **2 joueurs**. Ex : `!draft @Alice @Bob`');
    if (draftGames.has(guildId))
      return message.channel.send('⚠️ Un Draft est déjà en cours !');

    const budget = parseInt(args.find(a => /^\d+$/.test(a))) || BUDGET_DRAFT;
    const [p1, p2] = mentions;
    draftGames.set(guildId, createDraftGame(p1, p2, message.channel, budget));
    await message.channel.send(
      `🏆 **DRAFT ANIME** — C'est parti !\n👥 ${p1} vs ${p2}\n` +
      `💰 Budget : **${formatMoney(budget)}** chacun | 🎯 ${PERSO_DRAFT} personnages\n` +
      `📬 Enchères en DM avec \`!dbid <montant>\` — Bonne chance ! 🍀`
    );
    setTimeout(() => draftNextAuction(guildId), 2000);
    return;
  }

  if (command === 'dbid') {
    const amount = parseInt(args[0]?.replace(/[^0-9]/g, ''));
    if (isNaN(amount) || amount <= 0)
      return message.author.send('❌ Montant invalide. Ex : `!dbid 4000000`');

    let foundGame = null, foundGuildId = null;
    for (const [gid, g] of draftGames.entries()) {
      if (g.phase === 'bidding' && g.players?.[message.author.id]) { foundGame = g; foundGuildId = gid; break; }
    }
    if (!foundGame) return message.author.send('❌ Aucun Draft en cours pour toi.');

    const player = foundGame.players[message.author.id];
    const cfg    = rareteConfig[foundGame.currentChar?.rarete];
    if (!foundGame.currentChar) return message.author.send('⏳ Attends la prochaine enchère !');
    if (player.bidAmount !== null) return message.author.send('⚠️ Tu as déjà misé !');
    if (amount < cfg.miseDepart)   return message.author.send(`❌ Mise min : **${formatMoney(cfg.miseDepart)}**`);
    if (amount > player.budget)    return message.author.send(`❌ Budget insuffisant : **${formatMoney(player.budget)}**`);

    player.bidAmount = amount; player.bidTime = Date.now();
    await message.author.send(`✅ Mise enregistrée : **${formatMoney(amount)}** pour **${foundGame.currentChar.name}**`);

    if (foundGame.playerIds.every(id => foundGame.players[id].bidAmount !== null))
      await draftResolve(foundGuildId);
    return;
  }

  if (command === 'dteam') {
    let g = null;
    for (const [, game] of draftGames.entries()) if (game.players?.[message.author.id]) { g = game; break; }
    if (!g) for (const [gid, game] of draftGames.entries()) if (gid.endsWith('_ended') && game.players?.[message.author.id]) { g = game; break; }
    if (!g) return message.channel.send('❌ Aucun Draft trouvé.');

    const p = g.players[message.author.id];
    let msg = `🏆 **Team de ${p.user.username}** — 💰 ${formatMoney(p.budget)}\n\n`;
    for (const c of p.team) msg += `${rareteEmoji(c.rarete)} **${c.name}** *(${c.serie})* — ${rareteLabel(c.rarete)} — ${formatMoney(c.prixPaye)}\n`;
    if (!p.team.length) msg += '*Aucun personnage.*';
    try { await message.author.send(msg); if (message.guild) await message.react('📬'); }
    catch { await message.channel.send(msg); }
    return;
  }

  if (command === 'dscores') {
    const g = draftGames.get(guildId + '_ended') ?? draftGames.get(guildId);
    if (!g) return message.channel.send('❌ Aucun Draft récent.');
    let msg = `📊 **SCORES – DRAFT ANIME**\n\n`;
    for (const id of g.playerIds) {
      const p = g.players[id];
      msg += `👤 **${p.user.username}** — 💰 ${formatMoney(p.budget)}\n`;
      for (const c of p.team) msg += `  ${rareteEmoji(c.rarete)} ${c.name} *(${c.serie})* — ${formatMoney(c.prixPaye)}\n`;
      msg += '\n';
    }
    return message.channel.send(msg);
  }

  // ══════════════════════════════════════════
  //  TROUVE LE MOT
  // ══════════════════════════════════════════

  if (command === 'word') {
    const mentions = [...message.mentions.users.values()];
    if (mentions.length !== 1)
      return message.channel.send('❌ Mentionnez le devineur. Ex : `!word @Bob`\n*(vous êtes automatiquement le gardien)*');
    if (wordGames.has(guildId))
      return message.channel.send('⚠️ Une partie Trouve le Mot est déjà en cours ! (`!wstop` pour arrêter)');

    const guardian = message.author;
    const guesser  = mentions[0];
    if (guardian.id === guesser.id)
      return message.channel.send('❌ Tu ne peux pas jouer contre toi-même !');

    const game = createWordGame(guardian, guesser, message.channel);
    wordGames.set(guildId, game);

    try {
      await guardian.send(
        `🔍 **TROUVE LE MOT — Tu es le Gardien**\n\n` +
        `Le mot secret est : **\`${game.secret}\`**\n\n` +
        `${guesser.username} va proposer des mots avec \`!guess <mot>\`.\n` +
        `Donne ta note **à voix haute en vocal** (0 à 100) après chaque tentative.\n` +
        `*(100 = le mot exact, 0 = aucun rapport)*`
      );
    } catch {
      wordGames.delete(guildId);
      return message.channel.send(`⚠️ Impossible d'envoyer le mot secret en DM à ${guardian.username}. Autorisez les DMs !`);
    }

    await message.channel.send(
      `🔍 **TROUVE LE MOT** — C'est parti !\n\n` +
      `🔒 **Gardien :** ${guardian} *(a reçu le mot secret en DM)*\n` +
      `❓ **Devineur :** ${guesser}\n\n` +
      `${guesser}, propose un mot avec \`!guess <mot>\` !\n` +
      `Le gardien donnera sa note **à voix haute** en vocal 🎙️`
    );
    return;
  }

  if (command === 'guess') {
    const game = wordGames.get(guildId);
    if (!game) return message.channel.send('❌ Aucune partie en cours. Lance avec `!word @devineur`');
    if (message.author.id !== game.guesserId)
      return message.channel.send(`❌ Seul **${game.guesser.username}** peut deviner !`);
    if (game.phase !== 'playing') return;

    const guess = args[0]?.toLowerCase().trim();
    if (!guess) return message.channel.send('❌ Précise un mot. Ex : `!guess voiture`');

    game.attempts++;

    if (guess === game.secret.toLowerCase()) {
      game.phase = 'won';
      wordGames.delete(guildId);

      const history = game.guesses.length
        ? `\n\n📜 Historique :\n` + game.guesses.map((g, i) => `> #${i + 1} **${g.word}**`).join('\n')
        : '';

      return message.channel.send(
        `🎉 **TROUVÉ !** ${game.guesser} a trouvé **\`${game.secret}\`** en **${game.attempts} tentatives** !${history}`
      );
    }

    game.guesses.push({ word: guess });
    await message.channel.send(
      `💭 **Tentative #${game.attempts}** : **\`${guess}\`**\n` +
      `🎙️ *${game.guardian.username}, donne ta note à voix haute !*\n\n` +
      `${game.guesser}, continue avec \`!guess <mot>\``
    );
    return;
  }

  if (command === 'wstop') {
    const game = wordGames.get(guildId);
    if (!game) return message.channel.send('❌ Aucune partie Trouve le Mot en cours.');
    wordGames.delete(guildId);
    return message.channel.send(`🛑 Partie arrêtée. Le mot secret était : **\`${game.secret}\`**`);
  }

  // ══════════════════════════════════════════
  //  MISSIONS SECRÈTES
  // ══════════════════════════════════════════

  if (command === 'mission') {
    const mentions = [...message.mentions.users.values()];
    if (mentions.length < 2)
      return message.channel.send('❌ Il faut au moins **2 joueurs**. Ex : `!mission @Alice @Bob @Charlie`');
    if (missionGames.has(guildId))
      return message.channel.send('⚠️ Une partie Missions Secrètes est déjà en cours !');

    const game = createMissionGame(mentions, message.channel);
    missionGames.set(guildId, game);

    await message.channel.send(
      `🎭 **MISSIONS SECRÈTES** — La partie commence !\n` +
      `👥 ${mentions.map(u => `<@${u.id}>`).join(' · ')}\n\n` +
      `📬 Chaque joueur reçoit une mission secrète en DM toutes les **10 min**.\n` +
      `🔍 Repère quelqu'un en mission → \`!sus @joueur\`\n` +
      `🏆 Mission réussie : **+1pt** | Bonne accusation : **+1pt** | Fausse : **-1pt**\n\n` +
      `*Que le chaos commence...* 😈`
    );

    for (let i = 0; i < mentions.length; i++)
      setTimeout(() => assignMission(guildId, mentions[i].id), i * 2000);
    return;
  }

  if (command === 'sus') {
    const game = missionGames.get(guildId);
    if (!game) return message.channel.send('❌ Aucune partie Missions Secrètes en cours.');

    const accused = message.mentions.users.first();
    if (!accused) return message.channel.send('❌ Mentionne le joueur suspect. Ex : `!sus @Alice`');
    if (accused.id === message.author.id) return message.channel.send('❌ Tu ne peux pas t\'accuser toi-même !');
    if (!game.players[accused.id]) return message.channel.send('❌ Ce joueur ne participe pas à la partie.');

    const activeMission = game.activeMissions[accused.id];

    if (activeMission) {
      game.scores[message.author.id] = (game.scores[message.author.id] ?? 0) + 1;
      clearTimeout(activeMission.timerId);
      delete game.activeMissions[accused.id];

      await message.channel.send(
        `✅ **${message.author.username}** a raison ! **${accused.username}** était en mission !\n` +
        `> *${activeMission.mission}*\n\n` +
        `🏆 **+1 point** pour ${message.author.username} !\n` +
        `📬 Une nouvelle mission va être attribuée à ${accused.username}...`
      );
      setTimeout(() => assignMission(guildId, accused.id), 3000);
    } else {
      game.scores[message.author.id] = Math.max(0, (game.scores[message.author.id] ?? 0) - 1);
      await message.channel.send(
        `❌ **${message.author.username}** se trompe ! **${accused.username}** n'avait pas de mission active.\n` +
        `💸 **-1 point** pour ${message.author.username} !`
      );
    }

    const board = [...game.playerIds]
      .sort((a, b) => (game.scores[b] ?? 0) - (game.scores[a] ?? 0))
      .map(id => `> ${game.players[id].user.username} : **${game.scores[id] ?? 0} pt(s)**`)
      .join('\n');
    await message.channel.send(`📊 **Scores :**\n${board}`);
    return;
  }

  if (command === 'mscore') {
    const game = missionGames.get(guildId);
    if (!game) return message.channel.send('❌ Aucune partie Missions Secrètes en cours.');
    const medals = ['🥇', '🥈', '🥉'];
    const board  = [...game.playerIds]
      .sort((a, b) => (game.scores[b] ?? 0) - (game.scores[a] ?? 0))
      .map((id, i) => `${medals[i] ?? '  '} ${game.players[id].user.username} : **${game.scores[id] ?? 0} pt(s)**`)
      .join('\n');
    return message.channel.send(`🏆 **SCORES – MISSIONS SECRÈTES**\n\n${board}`);
  }

  if (command === 'stopmission') {
    const game = missionGames.get(guildId);
    if (!game) return message.channel.send('❌ Aucune partie en cours.');
    for (const id of game.playerIds)
      if (game.activeMissions[id]?.timerId) clearTimeout(game.activeMissions[id].timerId);
    const medals = ['🥇', '🥈', '🥉'];
    const board  = [...game.playerIds]
      .sort((a, b) => (game.scores[b] ?? 0) - (game.scores[a] ?? 0))
      .map((id, i) => `${medals[i] ?? '  '} ${game.players[id].user.username} : **${game.scores[id] ?? 0} pt(s)**`)
      .join('\n');
    missionGames.delete(guildId);
    return message.channel.send(`🏁 **FIN DES MISSIONS SECRÈTES**\n\n🏆 **Classement final :**\n${board}`);
  }
});

// ════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ════════════════════════════════════════════════════════════
client.login(TOKEN);
