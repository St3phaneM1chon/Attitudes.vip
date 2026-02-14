# Guide de l'Agent de Découverte MCP

## 🤖 Vue d'ensemble

L'Agent de Découverte MCP est un système autonome qui analyse votre projet chaque semaine pour découvrir et recommander les meilleurs serveurs MCP disponibles. Il compare automatiquement avec ce qui est déjà installé et ne suggère que les nouveaux outils pertinents.

## 🎯 Fonctionnalités principales

### 1. Analyse hebdomadaire automatique
- **Fréquence** : Tous les lundis à 3h00 du matin
- **Durée** : ~5-10 minutes selon la connexion internet
- **Impact** : Aucun sur les performances (exécution en arrière-plan)

### 2. Recherche intelligente
- Parcourt **7+ sources** : GitHub, NPM, Docker Hub, mcpservers.org
- Identifie les **100 serveurs MCP les plus populaires**
- Extrait jusqu'à **10 outils utiles par serveur**

### 3. Analyse de pertinence
L'agent évalue chaque serveur selon :
- **Correspondance technologique** (30%) : Match avec votre stack
- **Domaine métier** (25%) : Pertinence pour la gestion d'événements
- **Défis actuels** (20%) : Résolution de problèmes identifiés
- **Potentiel de croissance** (15%) : Opportunités futures
- **Popularité** (10%) : Stars, téléchargements, mentions

### 4. Recommandations priorisées
- **Haute priorité** : Score > 70% (installation recommandée)
- **Priorité moyenne** : Score 40-70% (à considérer)
- **Basse priorité** : Score < 40% (optionnel)

## 🚀 Installation et démarrage

### Installation rapide
```bash
# 1. Installer les dépendances (si nécessaire)
cd /Volumes/AI_Project/AttitudesFramework
npm install node-cron axios cheerio

# 2. Démarrer l'agent
./scripts/start-mcp-discovery.sh start

# 3. Vérifier le statut
./scripts/start-mcp-discovery.sh status
```

### Installation comme service système (Linux/macOS)
```bash
# Installer comme service systemd
./scripts/start-mcp-discovery.sh install-service

# Démarrer le service
sudo systemctl start mcp-discovery-agent

# Activer au démarrage
sudo systemctl enable mcp-discovery-agent
```

## 📋 Commandes disponibles

### Gestion de l'agent
```bash
# Démarrer l'agent
./scripts/start-mcp-discovery.sh start

# Arrêter l'agent
./scripts/start-mcp-discovery.sh stop

# Redémarrer
./scripts/start-mcp-discovery.sh restart

# Voir le statut
./scripts/start-mcp-discovery.sh status

# Voir les logs en temps réel
./scripts/start-mcp-discovery.sh logs
```

### Exécution manuelle
```bash
# Lancer une découverte immédiatement
./scripts/start-mcp-discovery.sh run

# Ou directement avec Node.js
node src/agents/mcp-discovery-scheduler.js run
```

## 📊 Comprendre les rapports

### Structure des rapports
Les rapports sont générés dans `data/mcp-discovery/` :
- `discovery-report-YYYY-MM-DD.json` : Rapport détaillé JSON
- `discovery-report-YYYY-MM-DD.md` : Version Markdown lisible

### Exemple de rapport
```markdown
# 📊 Rapport de Découverte MCP - 27/06/2025

## 🎯 Résumé
- **Total découvert**: 45 nouveaux outils
- **Haute priorité**: 8 outils essentiels
- **Priorité moyenne**: 15 outils utiles

## 🚀 Top 10 Recommandations

### 1. mcp-server-stripe-enhanced (Score: 92%)
**Raison**: Haute correspondance avec les besoins du projet

**Outils disponibles**:
- payment_processor
- subscription_manager
- invoice_generator
- webhook_handler
- fraud_detection

**Installation**:
```bash
npm install -g @mcp/server-stripe-enhanced
```
```

### Interprétation des scores
- **90-100%** : Installation fortement recommandée
- **70-89%** : Très utile pour votre projet
- **50-69%** : Peut apporter de la valeur
- **< 50%** : Optionnel ou pour exploration

## 🔧 Configuration

### Variables d'environnement
```bash
# Auto-installation des outils haute priorité
export MCP_AUTO_INSTALL=true

# Utiliser un intervalle plutôt que cron
export MCP_DISCOVERY_USE_INTERVAL=true

# Démarrer immédiatement au lancement
export MCP_DISCOVERY_AUTO_START=true
```

### Personnalisation dans le code
Éditez `src/agents/mcp-discovery-agent.js` :

```javascript
config: {
  searchInterval: 7 * 24 * 60 * 60 * 1000, // Fréquence
  maxServers: 100,                         // Nombre de serveurs
  maxToolsPerServer: 10,                   // Outils par serveur
  
  // Sources de recherche
  searchSources: [
    'https://github.com/topics/mcp-server',
    // Ajouter vos sources ici
  ]
}
```

## 📁 Structure des données

### Fichiers générés
```
data/
├── mcp-discovery/
│   ├── agent-state.json          # État de l'agent
│   ├── discovery-report-*.json   # Rapports JSON
│   ├── discovery-report-*.md     # Rapports Markdown
│   └── errors.log               # Logs d'erreurs
├── installed-mcp.json           # Serveurs installés
├── project-analysis.json        # Analyse du projet
└── notifications/               # Notifications importantes
```

### Format des données

#### installed-mcp.json
```json
{
  "mcp-server-filesystem": {
    "version": "1.2.0",
    "installedAt": "2025-06-27T10:00:00Z",
    "tools": ["read", "write", "list"]
  }
}
```

#### project-analysis.json
```json
{
  "technologies": ["node.js", "postgresql", "redis"],
  "businessDomain": ["wedding_management", "event_planning"],
  "currentChallenges": ["payment_integration", "real_time_sync"]
}
```

## 🎯 Cas d'usage

### 1. Découverte de nouveaux outils
L'agent identifie automatiquement :
- Nouveaux serveurs MCP populaires
- Mises à jour de serveurs existants
- Outils spécialisés pour votre domaine

### 2. Veille technologique
- Reste informé des tendances MCP
- Découvre des solutions à des problèmes non identifiés
- Anticipe les besoins futurs

### 3. Optimisation continue
- Identifie les outils manquants
- Suggère des remplacements plus performants
- Alerte sur les outils obsolètes

## 🛠️ Maintenance

### Logs et monitoring
```bash
# Voir les logs du planificateur
tail -f logs/mcp-discovery-scheduler.log

# Voir les erreurs
tail -f data/mcp-discovery/errors.log

# Vérifier l'état
cat data/mcp-discovery/agent-state.json | jq
```

### Nettoyage
```bash
# Nettoyer les anciens rapports (> 30 jours)
find data/mcp-discovery -name "discovery-report-*.json" -mtime +30 -delete

# Réinitialiser l'état
rm data/mcp-discovery/agent-state.json
```

### Dépannage

#### L'agent ne démarre pas
```bash
# Vérifier les permissions
ls -la scripts/start-mcp-discovery.sh

# Vérifier Node.js
node --version  # Doit être >= 18

# Vérifier les dépendances
npm list node-cron axios cheerio
```

#### Pas de nouveaux rapports
```bash
# Vérifier le statut
./scripts/start-mcp-discovery.sh status

# Forcer une exécution
./scripts/start-mcp-discovery.sh run

# Vérifier les erreurs
cat data/mcp-discovery/errors.log
```

## 📈 Métriques et KPIs

### Métriques suivies
- **Serveurs découverts** : Total et nouveaux
- **Taux d'adoption** : Outils installés vs recommandés
- **Temps d'exécution** : Performance de l'agent
- **Taux d'erreur** : Fiabilité des sources

### Dashboard de suivi
```bash
# Script pour générer un dashboard
node -e "
const fs = require('fs');
const reports = fs.readdirSync('data/mcp-discovery')
  .filter(f => f.startsWith('discovery-report-') && f.endsWith('.json'));

console.log('📊 Dashboard MCP Discovery');
console.log('Total rapports:', reports.length);

// Analyser le dernier rapport
if (reports.length > 0) {
  const latest = JSON.parse(fs.readFileSync('data/mcp-discovery/' + reports.sort().pop()));
  console.log('Dernier rapport:', latest.generatedAt);
  console.log('Découvertes haute priorité:', latest.summary.highPriority);
}
"
```

## 🚀 Évolutions futures

### Court terme
1. Interface web de visualisation
2. Notifications Slack/Discord
3. API REST pour intégration

### Moyen terme
1. Machine Learning pour scoring
2. Analyse de code pour suggestions
3. Installation automatique sécurisée

### Long terme
1. Marketplace MCP intégré
2. Création automatique de serveurs custom
3. Orchestration de workflows MCP

## 💡 Bonnes pratiques

1. **Revue hebdomadaire** : Consultez les rapports chaque semaine
2. **Test avant production** : Testez les nouveaux outils en dev
3. **Documentation** : Documentez les outils adoptés
4. **Feedback** : Ajustez les scores selon vos besoins

## 🆘 Support

Pour toute question ou problème :
1. Consultez les logs : `logs/mcp-discovery-*.log`
2. Vérifiez la documentation : `docs/`
3. Ouvrez une issue sur le repository

---

*L'Agent de Découverte MCP - Votre veille technologique automatisée pour rester à la pointe de l'innovation*