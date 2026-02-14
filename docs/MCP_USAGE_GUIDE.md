# 🚀 Guide d'Utilisation des MCP - Attitudes.vip

## ✅ MCP Installés et Configurés

### 1. **Perplexity** ✅ Opérationnel
- **Fonction** : Recherches avancées avec IA
- **Commande** : `attitudes-perplexity`
- **Déclencheurs** : "perplexity", "search", "research", "question"
- **Utilisation** : "Je veux faire une recherche avec Perplexity sur..."

### 2. **Figma** ⚠️ Nécessite Token
- **Fonction** : Design et prototypage
- **Credentials requis** : `FIGMA_TOKEN`
- **Déclencheurs** : "figma", "design", "prototype", "ui", "ux"

### 3. **OpenAI O3** ⚠️ Nécessite API Key
- **Fonction** : Raisonnement avancé
- **Credentials requis** : `OPENAI_API_KEY`
- **Déclencheurs** : "o3", "reasoning", "analysis", "complex"

### 4. **CodeRabbit** ⚠️ Nécessite Token
- **Fonction** : Révision de code automatisée
- **Credentials requis** : `CODERABBIT_TOKEN`
- **Déclencheurs** : "coderabbit", "code review", "analysis", "security"

### 5. **Stripe** ⚠️ Nécessite API Key
- **Fonction** : Paiements en ligne
- **Credentials requis** : `STRIPE_SECRET_KEY`
- **Déclencheurs** : "stripe", "payment", "paiement", "checkout", "subscription"

### 6. **PayPal** ⚠️ Nécessite Credentials
- **Fonction** : Paiements alternatifs
- **Credentials requis** : `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- **Déclencheurs** : "paypal", "payment", "paiement"

## 🔧 Configuration Claude Desktop

La configuration a été automatiquement mise à jour dans :
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**⚠️ IMPORTANT** : Redémarrez Claude Desktop pour activer les nouveaux MCP !

## 🎯 Comment Utiliser les MCP

### Méthode 1: Via les Tools MCP
Si vous redémarrez Claude Desktop, les MCP apparaîtront comme des outils disponibles dans l'interface.

### Méthode 2: Via le Self-Check V2
```javascript
// Dans le code, le système détecte automatiquement :
"I need to search with Perplexity" → Déclenche le MCP Perplexity
"Process a Stripe payment" → Déclenche le MCP Stripe
"Review this code with CodeRabbit" → Déclenche le MCP CodeRabbit
```

### Méthode 3: Via les Services Docker
Les services MCP Docker sont actifs et accessibles :
```bash
# Vérifier les services
docker-compose -f docker-compose.mcp.yml ps

# Voir les logs
docker-compose -f docker-compose.mcp.yml logs -f
```

## 🔑 Configuration des Credentials

Pour activer les MCP qui nécessitent des credentials, ajoutez-les à votre configuration :

### 1. Figma Token
```bash
export FIGMA_TOKEN="your_figma_token_here"
```

### 2. OpenAI API Key
```bash
export OPENAI_API_KEY="your_openai_api_key_here"
```

### 3. CodeRabbit Token
```bash
export CODERABBIT_TOKEN="your_coderabbit_token_here"
```

### 4. Stripe API Key
```bash
export STRIPE_SECRET_KEY="sk_test_your_stripe_key_here"
```

### 5. PayPal Credentials
```bash
export PAYPAL_CLIENT_ID="your_paypal_client_id"
export PAYPAL_CLIENT_SECRET="your_paypal_client_secret"
```

## 🧪 Tests des MCP

### Test Perplexity (Disponible maintenant)
```javascript
require('./src/utils/mcp-self-check-v2');
global.checkMCPv2('search with perplexity about wedding trends 2025')
  .then(result => console.log(result));
```

### Test Discovery Agent
```bash
# Voir les MCP découverts
node src/agents/mcp-discovery-scheduler.js run

# Voir le statut
./scripts/start-mcp-discovery.sh status
```

### Test Integration Bridge
```bash
# Synchroniser les configurations
./scripts/start-mcp-integration.sh sync

# Tester l'intégration
./scripts/start-mcp-integration.sh test
```

## 📊 Monitoring et Logs

### Voir les services actifs
```bash
# Docker services
docker-compose -f docker-compose.mcp.yml ps

# Discovery Agent
./scripts/start-mcp-discovery.sh status

# Integration Bridge
./scripts/start-mcp-integration.sh status
```

### Logs détaillés
```bash
# Discovery Agent
tail -f logs/mcp-discovery-agent.out

# Integration logs
tail -f logs/mcp-sync.log

# Docker services
docker-compose -f docker-compose.mcp.yml logs -f
```

## 🔄 Prochaines Étapes Automatiques

### Lundi prochain (3h00)
- Discovery Agent cherchera 100+ nouveaux MCP
- Ajout automatique des MCP pertinents (score > 50%)
- Synchronisation automatique avec Self-Check V2

### Chaque semaine
- Mise à jour des MCP existants
- Découverte de nouveaux outils
- Optimisation des configurations

## 🆘 Dépannage

### MCP non détecté
1. Vérifier la configuration : `cat data/mcp-selfcheck-config.json`
2. Redémarrer Claude Desktop
3. Forcer la synchronisation : `./scripts/start-mcp-integration.sh sync`

### Credentials non reconnus
1. Vérifier les variables d'environnement : `env | grep -E "(FIGMA|OPENAI|STRIPE)"`
2. Redémarrer Claude Desktop après ajout des credentials

### Services Docker non actifs
```bash
# Redémarrer les services
docker-compose -f docker-compose.mcp.yml restart

# Vérifier les logs
docker-compose -f docker-compose.mcp.yml logs
```

## 🎯 Utilisation Recommandée

### Pour les recherches
- **Utilisez Perplexity** : "search with perplexity about..."
- **Ou WebSearch** : Disponible immédiatement sans configuration

### Pour les paiements
- **Configurez Stripe** : Le plus adapté pour Attitudes.vip
- **PayPal en backup** : Pour diversifier les options

### Pour le code
- **CodeRabbit** : Révision automatisée
- **O3** : Analyse complexe et raisonnement

### Pour le design
- **Figma** : Intégration directe avec vos designs

---

**🔥 Le système MCP est maintenant opérationnel !**

- ✅ 1 MCP actif (Perplexity)
- ⚙️ 5 MCP configurés (nécessitent credentials)
- 🔄 Discovery automatique active
- 🚀 Prêt pour l'expansion hebdomadaire