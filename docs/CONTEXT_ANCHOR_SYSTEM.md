# 🔵 Système de Points d'Ancrage Claude Premium

## 🎯 Pourquoi les Points d'Ancrage?

Avec votre plan Claude Teams à 200$ CAD, vous pouvez avoir des sessions de 8-12 heures, mais après ~150 messages, Claude peut commencer à perdre des détails du contexte initial. Les points d'ancrage résolvent ce problème.

## 🚀 Quick Start

### 1. Lancer l'Assistant Premium

```bash
npm run claude
# ou
node scripts/claude-premium-assistant.js
```

### 2. Commandes Principales

Dans l'assistant interactif :
- `/anchor` - Créer un point d'ancrage maintenant
- `/save` - Sauvegarder la session
- `/status` - Voir l'état de la session
- `/objectives` - Gérer vos objectifs

## ⚓ Qu'est-ce qu'un Point d'Ancrage?

Un point d'ancrage capture :
- 📁 Structure complète du projet
- 🎯 Objectifs en cours
- 💡 Décisions clés prises
- 📝 Fichiers récemment modifiés
- 🔧 État Git
- 💻 Snapshots du code important
- 🖥️ État des services Docker

## 🔄 Workflow Recommandé

### Session Longue (8-12 heures)

```bash
# 1. Début de session
npm run claude

# 2. Toutes les 50 interactions, une ancre est créée automatiquement

# 3. Avant une tâche majeure
/anchor "Avant refactoring du système d'auth"

# 4. Si Claude semble perdre le contexte
/anchor "Rappel: on travaille sur l'intégration MCP"

# 5. Fin de session
/quit  # Sauvegarde automatique
```

### Restauration de Contexte

```bash
# 1. Lister les ancres disponibles
npm run anchor:list

# 2. Dans une nouvelle conversation Claude, dire:
"J'ai un point d'ancrage à restaurer: anchor-abc123-001-2025-06-27.md"

# 3. Copier/coller le contenu du fichier
cat .claude-anchors/anchor-abc123-001-2025-06-27.md
```

## 📊 Architecture du Système

```
.claude-anchors/
├── index.json                              # Index de toutes les ancres
├── anchor-{session}-{number}-{date}.md     # Ancre complète
└── anchor-{session}-{number}-{date}-claude.md  # Version condensée
```

## 🎮 Utilisation Avancée

### Mode Automatique

Les ancres sont créées automatiquement :
- Toutes les 50 interactions
- Lors de chaque sauvegarde de session
- Quand vous changez de projet

### Intégration avec Save-Session

```bash
# Sauvegarder avec ancre
node scripts/save-session-v2.js --create-anchor

# Rechercher dans les ancres
node scripts/search-sessions.js "anchor"
```

### Personnalisation

Dans `claude-premium-assistant.js`, ajustez :
```javascript
this.config = {
  autoAnchorThreshold: 50,     // Messages avant ancrage auto
  sessionSaveInterval: 30,     // Minutes entre saves
  maxMessagesBeforeWarn: 100,  // Avertissement
  contextDecayThreshold: 150   // Suggestion nouvelle session
};
```

## 📈 Métriques et Monitoring

L'assistant affiche en temps réel :
- Nombre de messages échangés
- Santé du contexte (barre de progression)
- Temps depuis la dernière ancre
- Ancres créées dans la session

## 💡 Best Practices

### 1. Ancres Stratégiques

Créez des ancres :
- ✅ Avant un changement majeur
- ✅ Après avoir complété une feature
- ✅ Quand vous changez de sujet
- ✅ Toutes les 2-3 heures minimum

### 2. Descriptions Utiles

```bash
# Mauvais
/anchor

# Bon
/anchor "Système d'auth OAuth2 complété, début intégration Stripe"
```

### 3. Session Planning

Au début de chaque session :
```bash
/objectives add "Implémenter système de paiement"
/objectives add "Ajouter tests unitaires"
/objectives add "Documenter l'API"
```

### 4. Multi-Projets

Si vous travaillez sur plusieurs parties :
```bash
/switch frontend
# ... travail ...
/anchor "Frontend: composants de base terminés"

/switch backend
# ... travail ...
/anchor "Backend: API REST configurée"
```

## 🚨 Troubleshooting

### Claude ne se souvient plus du contexte

1. Vérifiez le statut : `/status`
2. Si > 100 messages, créez une ancre : `/anchor`
3. Si > 150 messages, considérez une nouvelle session

### Restauration échoue

1. Vérifiez que le fichier existe :
   ```bash
   ls -la .claude-anchors/
   ```

2. Utilisez la version complète, pas la version `-claude.md`

3. Commencez la conversation par :
   > "J'ai un point d'ancrage de session à restaurer. Voici le contenu complet:"

### Performance dégradée

Après 200+ messages, même avec des ancres :
1. Sauvegardez : `/save`
2. Créez une ancre finale : `/anchor "Fin session 1"`
3. Démarrez une nouvelle conversation
4. Restaurez depuis la dernière ancre

## 🎯 Exemples Concrets

### Exemple 1: Session de Développement Feature

```
09:00 - npm run claude
09:05 - /objectives add "Implémenter système de notifications"
09:30 - [50 messages] Auto-ancre créée
10:00 - /anchor "Architecture notifications définie"
11:00 - [100 messages] ⚠️ Avertissement
11:30 - /anchor "Backend notifications terminé"
12:00 - /save
14:00 - /anchor "Tests ajoutés, début frontend"
15:00 - [150 messages] 🔴 Nouvelle session recommandée
15:30 - /anchor "Feature complète, ready for review"
16:00 - /quit
```

### Exemple 2: Debugging Complex

```
/anchor "Début debug: users can't login with Google"
# ... investigation ...
/anchor "Trouvé: token JWT expiré trop vite"
# ... fix ...
/anchor "Fix appliqué: TTL augmenté à 24h"
# ... tests ...
/anchor "Tests passent, bug résolu"
```

## 🔮 Fonctionnalités Futures

1. **Ancres Intelligentes**
   - Détection automatique des moments clés
   - Suggestions basées sur l'activité

2. **Compression de Contexte**
   - Résumé AI des ancres précédentes
   - Graphe de dépendances

3. **Partage d'Ancres**
   - Export pour autres développeurs
   - Import de contexte d'équipe

---

Avec ce système, vous pouvez maintenir des sessions productives de 12+ heures sans jamais perdre le fil! 🚀