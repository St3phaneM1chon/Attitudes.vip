# Intégration Complète Discovery Agent ↔ Self-Check

## 🔄 Vue d'ensemble de l'intégration

L'intégration automatique garantit que **TOUS les nouveaux MCP découverts chaque semaine sont automatiquement ajoutés et considérés par le système MCP Self-Check**.

### Architecture de l'intégration

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   Discovery Agent       │     │   Integration Bridge    │
│ (Recherche hebdomadaire)│────▶│  (Synchronisation)      │
└─────────────────────────┘     └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │   MCP Self-Check V2     │
                                │ (Détection automatique) │
                                └─────────────────────────┘
```

## 🚀 Flux de travail complet

### 1. **Découverte hebdomadaire** (Lundi 3h00)
```
Discovery Agent:
├── Analyse le projet
├── Recherche 100 top MCP
├── Score d'utilité (0-100%)
├── Génère rapport
└── Déclenche sync automatique
```

### 2. **Synchronisation automatique**
```
Integration Bridge:
├── Lit les rapports de découverte
├── Filtre score > 50%
├── Compare avec l'existant
├── Génère configurations
└── Met à jour Self-Check
```

### 3. **Intégration dans Self-Check**
```
MCP Self-Check V2:
├── Charge configs au démarrage
├── Fusionne avec inventaire
├── Active health checks
├── Disponible immédiatement
└── Apprentissage continu
```

## 📋 Configuration et démarrage

### Installation complète
```bash
# 1. Installer les dépendances
npm install node-cron axios cheerio

# 2. Démarrer l'agent de découverte
./scripts/start-mcp-discovery.sh start

# 3. Activer l'intégration automatique
./scripts/start-mcp-integration.sh start

# 4. Vérifier le statut
./scripts/start-mcp-integration.sh status
```

### Test de l'intégration
```bash
# Tester que tout fonctionne
./scripts/start-mcp-integration.sh test

# Résultat attendu:
# ✅ TEST RÉUSSI - Le MCP test a été intégré dans Self-Check!
```

## 🔍 Exemple concret

### Semaine 1 : Découverte
L'agent découvre **mcp-server-stripe-enhanced** avec un score de 92% :

```json
{
  "name": "mcp-server-stripe-enhanced",
  "score": 0.92,
  "tools": [
    "payment_processor",
    "subscription_manager",
    "invoice_generator"
  ]
}
```

### Synchronisation automatique
Le Bridge génère la configuration :

```javascript
{
  "stripe-enhanced": {
    service: "stripe-enhanced",
    capabilities: ["payment_processor", "subscription_manager"],
    triggers: ["stripe", "payment", "paiement", "subscription"],
    patterns: [
      { regex: /\b(payment|checkout|invoice)\b/i, weight: 0.9 }
    ],
    command: "npm install -g mcp-server-stripe-enhanced",
    available: true,
    autoDiscovered: true
  }
}
```

### Utilisation immédiate
Dès la prochaine requête, Self-Check le détecte :

```javascript
const check = await checkMCPv2("Je veux intégrer les paiements Stripe");
// Résultat: stripe-enhanced (92% confiance)
```

## 📊 Données synchronisées

### Fichiers de configuration
```
data/
├── mcp-selfcheck-config.json    # Config pour Self-Check
├── installed-mcp.json           # MCP installés
└── mcp-discovery/
    ├── discovery-report-*.json  # Rapports hebdomadaires
    └── sync-report-*.json       # Rapports de sync
```

### Structure d'un MCP synchronisé
```json
{
  "service": "nom-du-mcp",
  "capabilities": ["cap1", "cap2"],
  "triggers": ["mot1", "mot2"],
  "patterns": [
    { "regex": "pattern", "weight": 0.9 }
  ],
  "semanticConcepts": ["concept1"],
  "command": "installation command",
  "available": true,
  "autoDiscovered": true,
  "utilityScore": 0.85,
  "discoveredAt": "2025-06-27T10:00:00Z"
}
```

## 🎯 Fonctionnalités clés

### 1. **Détection intelligente**
- Génération automatique de triggers
- Patterns regex adaptés au type
- Concepts sémantiques extraits
- Health checks automatiques

### 2. **Filtrage intelligent**
- Score minimum : 50%
- Pas de doublons
- Validation de disponibilité
- Priorisation par utilité

### 3. **Apprentissage continu**
- Feedback sur utilisation
- Ajustement des poids
- Amélioration des patterns
- Historique conservé

## 📈 Monitoring

### Dashboard de synchronisation
```bash
# Voir le statut complet
./scripts/start-mcp-integration.sh status

# Output:
État: ✅ Actif
Dernière sync: 2025-06-27T10:30:00Z
Statistiques:
  - Total synchronisations: 5
  - MCP ajoutés: 23
  - MCP mis à jour: 12
Prochaine sync: 2025-06-28T10:30:00Z
```

### Logs détaillés
```bash
# Voir les logs en temps réel
tail -f logs/mcp-sync.log

# Exemple de log:
[2025-06-27T10:30:00Z] Synchronisation: 5 ajoutés, 2 mis à jour
[2025-06-27T10:30:01Z] ✅ Ajouté: stripe-enhanced (3 capacités)
[2025-06-27T10:30:02Z] ✅ Ajouté: email-advanced (4 capacités)
```

## 🛠️ Personnalisation

### Ajuster les seuils
Dans `mcp-integration-bridge.js` :

```javascript
config: {
  minUtilityScore: 0.5,    // Augmenter pour plus de sélectivité
  syncInterval: 24*60*60*1000, // Fréquence de sync
  requireHealthCheck: true  // Vérifier disponibilité
}
```

### Filtres personnalisés
Ajouter des règles dans `generateSelfCheckConfigs()` :

```javascript
// Exclure certains types
if (mcp.name.includes('experimental')) {
  continue; // Skip experimental MCPs
}

// Forcer l'inclusion
if (mcp.name.includes('critical')) {
  config.priority = 'high';
}
```

## 🔧 Dépannage

### Les MCP découverts n'apparaissent pas
```bash
# 1. Vérifier la synchronisation
./scripts/start-mcp-integration.sh sync

# 2. Vérifier les fichiers
cat data/mcp-selfcheck-config.json | jq

# 3. Redémarrer Self-Check
# Le rechargement se fait au prochain appel
```

### Problèmes de performance
```bash
# Nettoyer les anciens rapports
find data/mcp-discovery -name "*.json" -mtime +30 -delete

# Réinitialiser le cache
rm data/mcp-learning-model.json
```

## ✅ Avantages de l'intégration

1. **Zéro maintenance** : Tout est automatique
2. **Toujours à jour** : Nouveaux MCP chaque semaine
3. **Intelligent** : Seuls les MCP pertinents
4. **Performant** : Cache et optimisations
5. **Traçable** : Logs et rapports complets

## 🚀 Évolutions futures

### Court terme
- Interface web de visualisation
- Notifications des nouvelles découvertes
- API REST pour contrôle externe

### Long terme
- ML pour prédiction de besoins
- Auto-installation sécurisée
- Marketplace intégré

---

**L'intégration est maintenant complète !** Les nouveaux MCP découverts chaque semaine sont automatiquement disponibles dans le système Self-Check, garantissant que vous avez toujours accès aux meilleurs outils pour votre projet.