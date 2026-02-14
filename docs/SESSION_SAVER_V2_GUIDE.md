# Guide du Système de Sauvegarde de Session V2

## 🚀 Vue d'ensemble

Le système de sauvegarde de session V2 est une amélioration majeure qui transforme la capture de sessions de développement en un outil puissant de documentation, recherche et analyse.

### Améliorations principales

1. **Capture de conversation réelle** - Plus de placeholder
2. **Intégration Git complète** - Diffs, branches, historique
3. **Système de recherche** - Index, recherche full-text
4. **Multi-formats** - MD, JSON, HTML
5. **Automatisation** - Hooks Git, watch mode
6. **Métadonnées enrichies** - Tests, dépendances, métriques
7. **Catégorisation** - Tags, catégories, topics

## 📦 Installation

```bash
# Installer les dépendances optionnelles
npm install chokidar marked

# Rendre les scripts exécutables
chmod +x scripts/save-session-v2.js
chmod +x scripts/search-sessions.js
```

## 🎯 Utilisation

### Sauvegarde basique

```bash
# Sauvegarde simple
node scripts/save-session-v2.js

# Avec catégorie et tags
node scripts/save-session-v2.js --category feature --tags "mcp,auth,docker"

# Avec fichier de conversation
node scripts/save-session-v2.js -c conversation.json

# Auto-commit après sauvegarde
node scripts/save-session-v2.js --auto-commit
```

### Options avancées

```bash
# Désactiver les tests
node scripts/save-session-v2.js --no-tests

# Désactiver les diffs Git
node scripts/save-session-v2.js --no-diffs

# Exporter en plusieurs formats
node scripts/save-session-v2.js --format md,json,html

# Générer un résumé AI (future feature)
node scripts/save-session-v2.js --ai-summary
```

## 🔍 Recherche dans les sessions

### Mode interactif

```bash
# Lancer le mode interactif
node scripts/search-sessions.js

# Commandes disponibles:
search> MCP                    # Recherche par mot-clé
search> :file auth-service     # Recherche par fichier
search> :tag feature           # Recherche par tag
search> :cat bugfix           # Recherche par catégorie
search> :date 2025-06-27      # Recherche par date
search> :help                 # Afficher l'aide
search> :quit                 # Quitter
```

### Mode ligne de commande

```bash
# Recherche simple
node scripts/search-sessions.js "docker"

# Recherche par fichier
node scripts/search-sessions.js --file "save-session"

# Recherche par tag
node scripts/search-sessions.js --tag "security"

# Recherche par date
node scripts/search-sessions.js --date "2025-06-27"

# Limiter les résultats
node scripts/search-sessions.js "test" --limit 5

# Sans contexte
node scripts/search-sessions.js "auth" --no-context
```

## 📊 Structure des données

### Métadonnées enrichies

```json
{
  "number": 2,
  "date": "2025-06-27T10:30:00Z",
  "category": "feature",
  "tags": ["mcp", "auth"],
  "filesCreated": ["src/new-feature.js"],
  "filesModified": ["src/auth/auth-service.js"],
  "filesDeleted": [],
  "topics": ["MCP", "Authentification"],
  "achievements": ["Système MCP v2 implémenté"],
  "gitInfo": {
    "branch": "feature/mcp-v2",
    "remoteUrl": "https://github.com/user/project.git",
    "lastCommit": "abc123 Add MCP v2",
    "diffs": {
      "src/auth/auth-service.js": "diff content..."
    }
  },
  "tests": {
    "executed": true,
    "passed": 45,
    "failed": 0
  },
  "metrics": {
    "linesAdded": 523,
    "linesRemoved": 89,
    "duration": "~2 heures"
  },
  "dependencies": {
    "added": [
      {"name": "chokidar", "version": "3.5.3"}
    ]
  }
}
```

## 🤖 Automatisation

### Hook Git post-commit

Le système crée automatiquement un hook Git qui sauvegarde la session après chaque commit:

```bash
# .git/hooks/post-commit
#!/bin/bash
if [ -z "$SKIP_SESSION_SAVE" ]; then
  node scripts/save-session-v2.js --auto-commit --category=commit
fi
```

Pour désactiver temporairement:
```bash
SKIP_SESSION_SAVE=1 git commit -m "Message"
```

### Mode Watch

Un script de surveillance est créé pour sauvegarder automatiquement:

```bash
# Démarrer la surveillance
node scripts/watch-session.js

# Les sessions sont sauvegardées automatiquement après 5 secondes d'inactivité
```

## 📁 Organisation des fichiers

```
Derniere-Session/
├── README.md                           # Index des sessions
├── search-index.json                   # Index de recherche
├── session-001-2025-06-27.md         # Session Markdown
├── session-001-2025-06-27.json       # Session JSON
├── session-001-2025-06-27.html       # Session HTML (optionnel)
├── session-001-metadata.json          # Métadonnées détaillées
├── code/                              # Archives du code
├── diagrams/                          # Diagrammes (futur)
└── backups/                           # Sauvegardes
```

## 🔄 Workflow recommandé

### 1. Début de journée
```bash
# Voir les sessions récentes
cat Derniere-Session/README.md

# Rechercher le travail d'hier
node scripts/search-sessions.js --date "$(date -d yesterday +%Y-%m-%d)"
```

### 2. Pendant le développement
```bash
# Activer le mode watch
node scripts/watch-session.js

# Ou sauvegarder manuellement à des points clés
node scripts/save-session-v2.js --category feature --tags "current-work"
```

### 3. Fin de journée
```bash
# Sauvegarde complète avec tests
node scripts/save-session-v2.js \
  --category "$(git branch --show-current)" \
  --tags "daily-summary" \
  --auto-commit
```

### 4. Revue hebdomadaire
```bash
# Rechercher tout le travail de la semaine
for i in {0..6}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  node scripts/search-sessions.js --date "$date"
done

# Ou par catégorie
node scripts/search-sessions.js --category feature
```

## 🚀 Cas d'usage avancés

### 1. Génération de rapport

```bash
# Exporter toutes les sessions d'une catégorie
for file in Derniere-Session/session-*.json; do
  cat "$file" | jq 'select(.category == "feature")'
done > features-report.json
```

### 2. Analyse de productivité

```bash
# Compter les lignes de code par jour
cat Derniere-Session/session-*.json | \
  jq -r '[.date[0:10], .metrics.linesAdded] | @csv' | \
  sort | uniq -c
```

### 3. Recherche de patterns

```bash
# Trouver toutes les sessions avec des tests échoués
cat Derniere-Session/search-index.json | \
  jq '.sessions[] | select(.tests.failed > 0)'
```

### 4. Documentation automatique

```bash
# Générer un changelog depuis les sessions
cat Derniere-Session/session-*.json | \
  jq -r '.achievements[] | "- " + .' | \
  sort -u > CHANGELOG.md
```

## 🔐 Sécurité et bonnes pratiques

1. **Ne jamais committer de secrets**
   - Le système exclut automatiquement .env et les fichiers sensibles
   - Vérifiez toujours avant de partager des sessions

2. **Nettoyer régulièrement**
   ```bash
   # Garder seulement les 30 derniers jours
   find Derniere-Session -name "session-*.md" -mtime +30 -delete
   ```

3. **Sauvegarder l'historique**
   ```bash
   # Créer une archive mensuelle
   tar czf sessions-$(date +%Y-%m).tar.gz Derniere-Session/
   ```

## 🎨 Personnalisation

### Ajouter des extracteurs de topics

Dans `save-session-v2.js`, modifier `extractTopics()`:

```javascript
extractTopics() {
  const topics = new Set();
  
  // Ajouter vos propres patterns
  for (const file of [...this.sessionData.filesCreated, ...this.sessionData.filesModified]) {
    if (file.includes('api')) topics.add('API Development');
    if (file.includes('test')) topics.add('Testing');
    // ... autres patterns
  }
  
  return Array.from(topics);
}
```

### Catégories personnalisées

```javascript
// Dans le constructeur
this.config = {
  // ...
  categories: [
    'feature', 'bugfix', 'refactor', 'documentation',
    'security', 'performance', 'infrastructure',
    // Ajouter vos catégories
    'research', 'prototype', 'review'
  ]
};
```

## 📈 Évolutions futures

1. **Interface Web**
   - Dashboard interactif
   - Visualisations des métriques
   - Timeline des sessions

2. **Intégration AI**
   - Résumés automatiques
   - Suggestions de code
   - Détection de patterns

3. **Collaboration**
   - Partage de sessions
   - Commentaires
   - Merge de sessions

4. **Exports avancés**
   - PDF avec mise en page
   - Rapports Jira/GitHub
   - Présentations automatiques

## 🆘 Dépannage

### L'index de recherche est corrompu
```bash
# Reconstruire l'index
rm Derniere-Session/search-index.json
node scripts/search-sessions.js "test"  # Force la reconstruction
```

### Les hooks Git ne fonctionnent pas
```bash
# Vérifier les permissions
ls -la .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

### Erreur de mémoire avec grandes sessions
```bash
# Augmenter la mémoire Node.js
NODE_OPTIONS="--max-old-space-size=4096" node scripts/save-session-v2.js
```

---

Le système de sauvegarde V2 transforme la documentation de sessions en un outil puissant pour améliorer la productivité, faciliter la collaboration et maintenir une trace détaillée de l'évolution du projet.