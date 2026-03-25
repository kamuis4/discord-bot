// ============================================================
//  market-bot.js – Jeu Marché Secret pour Discord
//  Commandes :
//    !market @joueur1 @joueur2        → Lance une partie
//    !bid <montant>                   → Enchérir (en DM ou salon)
//    !team                            → Voir son équipe
//    !scores                          → Voir les scores finaux
// ============================================================

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { characters, rareteConfig } = require('./market.js');

require('dotenv').config();
const TOKEN  = process.env.TOKEN;
const PREFIX = '!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// ── STATE ────────────────────────────────────────────────────
// Map<guildId, GameState>
const games = new Map();

const BUDGET_DEPART  = 10_000_000;
const PERSO_PAR_JOUEUR = 3;

// ── UTILITAIRES ──────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatMoney(n) {
  return n.toLocaleString('fr-FR') + ' 💰';
}

function rareteEmoji(r) {
  return rareteConfig[r]?.emoji ?? '⚪';
}

function rareteLabel(r) {
  return rareteConfig[r]?.label ?? r;
}

// ── NOUVEAU JEU ──────────────────────────────────────────────

function createGame(player1, player2, channel) {
  const totalPerso = PERSO_PAR_JOUEUR * 2;

  // Mélanger et piocher les personnages
  const pool = shuffle(characters.anime).slice(0, totalPerso + 5); // petit buffer

  return {
    channel,
    players: {
      [player1.id]: {
        user: player1,
        budget: BUDGET_DEPART,
        team: [],
        bidTime: null,
        bidAmount: null,
      },
      [player2.id]: {
        user: player2,
        budget: BUDGET_DEPART,
        team: [],
        bidTime: null,
        bidAmount: null,
      },
    },
    playerIds: [player1.id, player2.id],
    pool,
    currentIndex: 0,
    currentChar: null,
    phase: 'bidding', // 'bidding' | 'ended'
    round: 0,
    totalRounds: totalPerso,
  };
}

// ── LANCER UNE ENCHÈRE ───────────────────────────────────────

async function startNextAuction(guildId) {
  const game = games.get(guildId);
  if (!game) return;

  const totalPerso = PERSO_PAR_JOUEUR * 2;

  // Vérifier si la partie est terminée
  const teamsComplete = game.playerIds.every(
    id => game.players[id].team.length >= PERSO_PAR_JOUEUR
  );

  if (game.round >= totalPerso || teamsComplete) {
    return endGame(guildId);
  }

  // Piocher le prochain personnage
  const char = game.pool[game.currentIndex];
  game.currentChar = char;
  game.currentIndex++;
  game.round++;

  // Reset des mises
  for (const id of game.playerIds) {
    game.players[id].bidAmount = null;
    game.players[id].bidTime   = null;
  }

  const cfg = rareteConfig[char.rarete];

  const msg =
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${cfg.emoji} **ENCHÈRE #${game.round}/${totalPerso}**\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎴 **${char.name}** — *${char.serie}*\n` +
    `Rareté : ${cfg.emoji} **${cfg.label}**\n` +
    `Mise de départ : **${formatMoney(cfg.miseDepart)}**\n\n` +
    `📬 Envoyez votre enchère secrète en **DM au bot** :\n` +
    `\`!bid <montant>\`\n` +
    `*(ex: \`!bid 3500000\`)*\n\n` +
    `Budgets restants :\n` +
    game.playerIds.map(id => {
      const p = game.players[id];
      return `> ${p.user.username} : **${formatMoney(p.budget)}**`;
    }).join('\n');

  await game.channel.send(msg);

  // Envoyer un rappel en DM à chaque joueur
  for (const id of game.playerIds) {
    const p = game.players[id];
    try {
      await p.user.send(
        `🎴 **${char.name}** est en vente !\n` +
        `Rareté : ${cfg.emoji} ${cfg.label}\n` +
        `Mise de départ : **${formatMoney(cfg.miseDepart)}**\n` +
        `Ton budget : **${formatMoney(p.budget)}**\n\n` +
        `Réponds avec \`!bid <montant>\` pour enchérir.`
      );
    } catch (e) {
      console.log(`DM impossible pour ${p.user.username}`);
    }
  }
}

// ── RÉSOUDRE UNE ENCHÈRE ─────────────────────────────────────

async function resolveAuction(guildId) {
  const game = games.get(guildId);
  if (!game || !game.currentChar) return;

  const [id1, id2] = game.playerIds;
  const p1 = game.players[id1];
  const p2 = game.players[id2];
  const char = game.currentChar;
  const cfg  = rareteConfig[char.rarete];

  const bid1 = p1.bidAmount ?? 0;
  const bid2 = p2.bidAmount ?? 0;

  let winnerId   = null;
  let resultMsg  = '';

  // Vérifier les mises minimales
  const minBid = cfg.miseDepart;

  const valid1 = bid1 >= minBid && bid1 <= p1.budget;
  const valid2 = bid2 >= minBid && bid2 <= p2.budget;

  if (!valid1 && !valid2) {
    // Personne n'a misé valablement → personnage ignoré
    resultMsg =
      `❌ Aucune enchère valide pour **${char.name}** !\n` +
      `*(mise minimum : ${formatMoney(minBid)})*\n` +
      `Le personnage est retiré de la vente.`;
  } else if (!valid1) {
    winnerId = id2;
  } else if (!valid2) {
    winnerId = id1;
  } else if (bid1 > bid2) {
    winnerId = id1;
  } else if (bid2 > bid1) {
    winnerId = id2;
  } else {
    // Égalité → premier à avoir misé gagne
    winnerId = p1.bidTime <= p2.bidTime ? id1 : id2;
    resultMsg = `⚖️ Égalité ! **${game.players[winnerId].user.username}** a misé en premier.\n`;
  }

  if (winnerId) {
    const winner = game.players[winnerId];
    const winnerBid = game.players[winnerId].bidAmount;
    const loserBid  = game.players[winnerId === id1 ? id2 : id1].bidAmount ?? 0;

    winner.budget -= winnerBid;
    winner.team.push({ ...char, prixPaye: winnerBid });

    resultMsg +=
      `\n🏆 **${winner.user.username}** remporte **${char.name}** !\n` +
      `💸 Prix payé : **${formatMoney(winnerBid)}**\n` +
      `📊 Enchères : ${p1.user.username} → ${formatMoney(bid1)} | ${p2.user.username} → ${formatMoney(bid2)}\n\n` +
      `💰 Budgets restants :\n` +
      game.playerIds.map(id => {
        const p = game.players[id];
        return `> ${p.user.username} : **${formatMoney(p.budget)}** | 🃏 ${p.team.length}/${PERSO_PAR_JOUEUR} perso`;
      }).join('\n');
  }

  await game.channel.send(resultMsg);

  // Attendre 3 secondes avant la prochaine enchère
  setTimeout(() => startNextAuction(guildId), 3000);
}

// ── FIN DE PARTIE ────────────────────────────────────────────

async function endGame(guildId) {
  const game = games.get(guildId);
  if (!game) return;

  game.phase = 'ended';

  let msg = `\n${'═'.repeat(35)}\n🏁 **FIN DE PARTIE – MARCHÉ SECRET**\n${'═'.repeat(35)}\n\n`;

  for (const id of game.playerIds) {
    const p = game.players[id];
    const spent = BUDGET_DEPART - p.budget;
    msg += `👤 **${p.user.username}**\n`;
    msg += `💰 Budget restant : **${formatMoney(p.budget)}** *(dépensé : ${formatMoney(spent)})*\n`;
    msg += `🃏 Équipe :\n`;

    if (p.team.length === 0) {
      msg += `> *Aucun personnage*\n`;
    } else {
      for (const c of p.team) {
        msg += `> ${rareteEmoji(c.rarete)} **${c.name}** *(${c.serie})* — payé ${formatMoney(c.prixPaye)}\n`;
      }
    }
    msg += '\n';
  }

  msg += `🗣️ **Débattez maintenant : qui a la meilleure équipe ?**\n`;
  msg += `Utilisez \`!scores\` pour revoir les équipes à tout moment.`;

  await game.channel.send(msg);
  games.delete(guildId);

  // Garder les scores en mémoire 10 min pour !scores
  game.phase = 'ended';
  games.set(guildId + '_ended', game);
  setTimeout(() => games.delete(guildId + '_ended'), 10 * 60 * 1000);
}

// ── ÉVÉNEMENTS ──────────────────────────────────────────────

client.once('clientReady', () => {
  console.log(`✅ Marché Secret Bot connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args    = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // ── !market ──────────────────────────────────────────────
  if (command === 'market') {
    const mentions = [...message.mentions.users.values()];

    if (mentions.length !== 2) {
      return message.channel.send(
        '❌ Il faut mentionner exactement **2 joueurs**.\nEx : `!market @Alice @Bob`'
      );
    }

    const guildId = message.guild?.id ?? message.author.id;

    if (games.has(guildId)) {
      return message.channel.send('⚠️ Une partie est déjà en cours sur ce serveur !');
    }

    const [p1, p2] = mentions;
    const game = createGame(p1, p2, message.channel);
    games.set(guildId, game);

    await message.channel.send(
      `🎮 **MARCHÉ SECRET** — La partie commence !\n` +
      `👥 ${p1} vs ${p2}\n` +
      `💰 Budget de départ : **${formatMoney(BUDGET_DEPART)}** chacun\n` +
      `🎯 Objectif : remporter **${PERSO_PAR_JOUEUR} personnages** chacun\n` +
      `📬 Les enchères se font en **DM au bot** avec \`!bid <montant>\`\n\n` +
      `Bonne chance ! 🍀`
    );

    setTimeout(() => startNextAuction(guildId), 2000);
  }

  // ── !bid ─────────────────────────────────────────────────
  if (command === 'bid') {
    // Fonctionne en DM ou en salon
    const amount = parseInt(args[0]?.replace(/\s/g, '').replace(/[^0-9]/g, ''));

    if (isNaN(amount) || amount <= 0) {
      return message.author.send('❌ Montant invalide. Ex : `!bid 3500000`');
    }

    // Trouver la partie en cours pour ce joueur
    let foundGame = null;
    let foundGuildId = null;

    for (const [gid, g] of games.entries()) {
      if (g.phase === 'bidding' && g.players[message.author.id]) {
        foundGame    = g;
        foundGuildId = gid;
        break;
      }
    }

    if (!foundGame) {
      return message.author.send('❌ Aucune partie en cours pour toi.');
    }

    const player = foundGame.players[message.author.id];
    const cfg    = rareteConfig[foundGame.currentChar?.rarete];

    if (!foundGame.currentChar) {
      return message.author.send('⏳ Attends la prochaine enchère !');
    }

    if (player.bidAmount !== null) {
      return message.author.send('⚠️ Tu as déjà misé pour cette enchère !');
    }

    if (amount < cfg.miseDepart) {
      return message.author.send(
        `❌ Mise trop basse ! Minimum : **${formatMoney(cfg.miseDepart)}**`
      );
    }

    if (amount > player.budget) {
      return message.author.send(
        `❌ Budget insuffisant ! Tu as **${formatMoney(player.budget)}**`
      );
    }

    // Enregistrer la mise
    player.bidAmount = amount;
    player.bidTime   = Date.now();

    await message.author.send(
      `✅ Mise enregistrée : **${formatMoney(amount)}** pour **${foundGame.currentChar.name}**`
    );

    // Vérifier si les deux joueurs ont misé
    const allBid = foundGame.playerIds.every(id => foundGame.players[id].bidAmount !== null);
    if (allBid) {
      await resolveAuction(foundGuildId);
    }
  }

  // ── !team ────────────────────────────────────────────────
  if (command === 'team') {
    let foundGame = null;
    for (const [, g] of games.entries()) {
      if (g.players?.[message.author.id]) { foundGame = g; break; }
    }
    // Chercher aussi dans les parties terminées
    if (!foundGame) {
      for (const [gid, g] of games.entries()) {
        if (gid.endsWith('_ended') && g.players?.[message.author.id]) {
          foundGame = g; break;
        }
      }
    }

    if (!foundGame) {
      return message.channel.send('❌ Aucune partie trouvée pour toi.');
    }

    const p = foundGame.players[message.author.id];
    let msg = `🃏 **Équipe de ${p.user.username}**\n💰 Budget restant : **${formatMoney(p.budget)}**\n\n`;

    if (p.team.length === 0) {
      msg += '*Aucun personnage pour le moment.*';
    } else {
      for (const c of p.team) {
        msg += `${rareteEmoji(c.rarete)} **${c.name}** *(${c.serie})* — ${rareteLabel(c.rarete)} — payé ${formatMoney(c.prixPaye)}\n`;
      }
    }

    try {
      await message.author.send(msg);
      if (message.guild) await message.react('📬');
    } catch {
      await message.channel.send(msg);
    }
  }

  // ── !scores ──────────────────────────────────────────────
  if (command === 'scores') {
    const guildId = message.guild?.id ?? message.author.id;
    const game    = games.get(guildId + '_ended') ?? games.get(guildId);

    if (!game) {
      return message.channel.send('❌ Aucune partie récente trouvée.');
    }

    let msg = `📊 **SCORES – MARCHÉ SECRET**\n\n`;

    for (const id of game.playerIds) {
      const p = game.players[id];
      msg += `👤 **${p.user.username}** — 💰 ${formatMoney(p.budget)} restant\n`;
      for (const c of p.team) {
        msg += `  ${rareteEmoji(c.rarete)} ${c.name} *(${c.serie})* — ${formatMoney(c.prixPaye)}\n`;
      }
      msg += '\n';
    }

    await message.channel.send(msg);
  }

  // ── !mhelp ───────────────────────────────────────────────
  if (command === 'mhelp') {
    await message.channel.send(
      `\`\`\`\n` +
      `╔══════════════════════════════════════╗\n` +
      `║        MARCHÉ SECRET – Commandes     ║\n` +
      `╠══════════════════════════════════════╣\n` +
      `║  !market @j1 @j2  → Lancer partie   ║\n` +
      `║  !bid <montant>   → Enchérir (DM)   ║\n` +
      `║  !team            → Voir son équipe  ║\n` +
      `║  !scores          → Scores finaux    ║\n` +
      `║  !mhelp           → Cette aide       ║\n` +
      `╚══════════════════════════════════════╝\n` +
      `\`\`\``
    );
  }
});

// ── DÉMARRAGE ────────────────────────────────────────────────
client.login(TOKEN);
