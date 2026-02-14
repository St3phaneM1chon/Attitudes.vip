# 🧪 Guide d'Utilisation des Tests

## 🚀 Commandes Rapides

### 🔴 Tests Critiques (2-3 minutes)
```bash
./tests-critiques.sh
```
- **10 tests essentiels** (score 90-100)
- **Blocage si échec** - Arrête le développement  
- **Tests** : Auth, RBAC, vidéo streaming, WebSocket, charge
- **Idéal pour** : validation rapide avant commit

### 🔧 Tests Standard (5-8 minutes)  
```bash
./tests.sh
```
- **30 tests** (Critiques + Essentiels + Importants)
- **Score 70-100** - Tests de qualité standard
- **Avertissement si échec** mais continue
- **Idéal pour** : validation complète quotidienne

### 🏆 Suite Complète (15-30 minutes)
```bash
./suite-de-tests.sh  
```
- **TOUS les 150 types** de tests
- **Conformité + Spécialisés + Émergents**
- **Coverage maximale** - blockchain, AR/VR, quantum
- **Idéal pour** : validation pré-production, certification

## 📊 Différences Détaillées

| Commande | Tests | Durée | Blocage | Usage |
|----------|-------|--------|---------|-------|
| `tests-critiques` | 10 | 2-3 min | ✅ | Commit rapide |
| `tests` | 30 | 5-8 min | ⚠️ | Validation quotidienne |
| `suite-de-tests` | 150 | 15-30 min | ℹ️ | Pré-production |

## 🎯 Que Teste Chaque Niveau ?

### 🔴 Tests Critiques (10)
- Auth Multi-Facteurs (100/100)
- Permissions RBAC (99/100)  
- Streaming Vidéo Adaptatif (98/100)
- WebSocket Temps Réel (97/100)
- Charge Concurrente (96/100)
- E2E Cross-Platform (95/100)
- Sécurité OWASP (94/100)
- Performance Mobile (93/100)
- Sync Multi-Devices (92/100)
- Interruptions Mobile (91/100)

### 🟠 Tests Essentiels (+10)
- Régression Automatisée
- Accessibilité WCAG 2.1
- Localisation i18n
- Contrats API
- Qualité Vidéo
- Latence Réseau
- Intégrité Base de Données
- Notifications Push
- Conformité GDPR
- Monétisation

### 🟡 Tests Importants (+10)  
- Chaos Engineering
- Performance Audio
- Optimisation Cache
- Régression Visuelle
- Sécurité Mobile
- Migration Données
- Analytics
- Géolocalisation
- Mode Offline
- Memory Leaks

### 🟢 Tests Recommandés (+60)
- Compatibilité navigateurs
- Mode sombre
- Optimisation bande passante
- Deep linking
- Authentification biométrique
- Rate limiting
- Fonctionnalités de recherche
- Passerelles de paiement
- Upload de fichiers
- Intégration SSO
- ... et 50 autres

### 🔵 Tests Spécialisés (+60)
- WebRTC
- GraphQL
- Blockchain
- Machine Learning
- AR/VR
- IoT
- Gamification
- Interface vocale
- Streaming live
- Orchestration Kubernetes
- ... et 50 autres technologies émergentes

## 🛡️ Tests de Conformité Intégrés

Tous les niveaux incluent automatiquement :
- ✅ GDPR (Europe)
- ✅ Loi 25 (Québec)  
- ✅ WCAG 2.2 (Accessibilité)
- ✅ ISO 27001 (Sécurité)
- ✅ SOC 2 (Contrôles)
- ✅ PCI DSS (Paiements)

## 📈 Scores de Réussite

- **Tests Critiques** : 100% requis (blocage sinon)
- **Tests Standard** : 90% recommandé  
- **Suite Complète** : 85% excellent

## 🔧 Options Avancées

```bash
# Tests sans conformité
./tests.sh --no-compliance

# Niveau personnalisé
node src/testing-framework/master-test-orchestrator.js --level=critical

# Mode debug
DEBUG=1 ./tests.sh
```

## 📄 Rapports

Les rapports sont automatiquement sauvegardés dans :
- `/test-reports/` - Rapports d'exécution
- `/compliance-reports/` - Rapports de conformité

Format JSON détaillé avec métriques de performance, recommandations et prochaines étapes.