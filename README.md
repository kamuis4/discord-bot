# 🕵️ Undercover – Jeu de mots

Implémentation complète du jeu **Undercover** : version HTML locale et bot Discord.

---

## 📁 Structure des fichiers

```
undercover/
 ├─ undercover.html   ← Interface HTML du jeu (version locale)
 ├─ mots.js           ← Catégories et paires de mots (partagé)
 ├─ bot.js            ← Bot Discord
 └─ README.md
```

---

## 🌐 Version HTML (local)

### Utilisation

1. Placez `undercover.html` et `mots.js` dans le **même dossier**.
2. Ouvrez `undercover.html` dans votre navigateur.
3. Configurez la partie :
   - Nombre de joueurs (3–20)
   - Nombre d'undercover
   - Catégorie de mots
   - Noms des joueurs
4. Cliquez **Lancer la partie**.
5. Chaque joueur clique **Voir mot** à son tour, en cachant l'écran.
6. Après que tous ont vu leur mot → **Voir les résultats**.

> ⚠️ Les deux fichiers doivent être dans le même dossier pour que `mots.js` se charge correctement.

---

## 🤖 Bot Discord

### Prérequis

```bash
npm install discord.js
```

### Configuration

1. Créez un bot sur le [Portail Développeur Discord](https://discord.com/developers/applications).
2. Copiez le **token** du bot.
3. Dans `bot.js`, remplacez `'VOTRE_TOKEN_ICI'` par votre token.
4. Activez l'intent **Message Content** dans les paramètres du bot.

### Démarrage

```bash
node bot.js
```

### Commandes

| Commande | Description |
|---|---|
| `!help` | Affiche l'aide |
| `!cats` | Liste les catégories disponibles |
| `!start <joueurs> <undercovers> <catégorie> @j1 @j2 ...` | Lance une partie |

### Exemple

```
!start 5 1 anime @Alice @Bob @Charlie @David @Eve
```

- Le bot choisit une paire aléatoire dans la catégorie `anime`.
- Envoie le mot civil aux civils, le mot undercover aux undercover, en DM.
- Affiche un message public de confirmation.

---

## 📝 Ajouter des mots (`mots.js`)

Ouvrez `mots.js` et ajoutez des paires dans une catégorie existante :

```js
anime: [
  ["Eren", "Mikasa"],
  ["MonNouveauMot", "MotUndercover"], // ← Ajout
]
```

Ou créez une nouvelle catégorie :

```js
musique: [
  ["Guitare", "Basse"],
  ["Jazz", "Blues"],
]
```

N'oubliez pas d'ajouter l'option dans le `<select>` de `undercover.html` si vous jouez en local.

---

## 🎮 Règles du jeu

1. Chaque joueur reçoit un mot secret.
2. Les **civils** reçoivent tous le même mot.
3. Le(s) **undercover** reçoivent un mot différent mais lié.
4. À tour de rôle, chaque joueur donne un indice sans dire son mot.
5. Les joueurs votent pour éliminer l'undercover.
6. Les civils gagnent si l'undercover est éliminé ; l'undercover gagne s'il reste jusqu'à la fin.
