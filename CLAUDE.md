# CLAUDE.md - Mémoire Persistante du Projet Attitudes.vip

## 🤖 MODE AUTONOME ACTIVÉ - 100% AUTOMATIQUE

**IMPORTANT**: Ce projet est configuré en MODE 100% AUTONOME. Claude peut :
- ✅ Modifier tous les fichiers SANS demander confirmation
- ✅ Exécuter toutes les commandes SANS approbation
- ✅ Effectuer les mises à jour hebdomadaires automatiquement
- ✅ Redémarrer les services si nécessaire
- ✅ Travailler 24/7 sans intervention humaine

Configuration: `.claude/config.yaml`

## 🧠 RESTAURATION MÉMOIRE INSTANTANÉE

**MOT-CLÉ MAGIQUE**: `mémoire` ou `memory` dans le chat
- ✅ Restaure TOUT le contexte projet en 3 secondes
- ✅ Analyse état actuel (MCP, Taskmaster, services)
- ✅ Génère recommandations immédiates
- ✅ Crée point d'ancrage contextuel

**Scripts disponibles**:
```bash
# Via script direct
node scripts/claude-memory-restore.js

# Via déclencheur simplifié  
./scripts/memory-trigger.sh

# Via code programmatique
const { quickMemoryCheck } = require('./scripts/claude-memory-restore.js');
```

## 🤖 AUTO-VÉRIFICATION MCP - TOUJOURS ACTIF

**IMPORTANT**: Avant CHAQUE action, exécuter mentalement :
```javascript
const mcpCheck = await checkMCP(userRequest);
if (mcpCheck.shouldUseMCP) {
  // Utiliser les services MCP recommandés
  console.log(mcpCheck.actionPlan);
}
```

## 🚨 RÈGLE CRITIQUE - ÉVALUATION CONTEXTE AVANT CODAGE

**RÈGLE STRICTE OBLIGATOIRE**: Avant d'entamer tout script de programmation, Claude DOIT :

1. **Évaluer la longueur estimée du script** à écrire
2. **Vérifier le pourcentage de contexte restant** (affiché dans l'interface)
3. **Calculer si l'espace contextuel est suffisant** pour terminer le travail
4. **Si < 20% de contexte reste** : Prioriser des tâches plus courtes ou demander confirmation
5. **Si < 10% de contexte reste** : ARRÊTER immédiatement et sauvegarder l'état

**Procédure d'évaluation**:
```
AVANT CHAQUE SCRIPT:
1. Taille estimée: [Petit/Moyen/Grand]
2. Contexte restant: [%]
3. Risque de coupure: [Faible/Moyen/Élevé]
4. Action: [Continuer/Reporter/Fragmenter]
```

**Cette règle empêche la perte de contexte et de travail lors de l'auto-compact automatique.**

### Services MCP Disponibles
- ✅ **filesystem** - Opérations fichiers/répertoires
- ✅ **postgres** - Requêtes base de données  
- ✅ **redis** - Cache et sessions
- ✅ **git** - Contrôle de version
- ✅ **perplexity** - Recherche avancée IA
- ✅ **coderabbit** - Revue de code IA (mot-clé: "Rabbit")
- ✅ **stripe** - Paiements (configuré)
- ⏳ **twilio** - SMS (à configurer)
- ⏳ **memory** - Mémoire persistante (à installer)

## 🎯 Contexte du Projet

**Projet**: Attitudes.vip - Plateforme SaaS de gestion de mariages
**Type**: Application web multi-tenant, multilingue
**Stack**: Node.js, PostgreSQL, Redis, Docker, Kubernetes
**État**: En développement (40% complété)

## 📊 Architecture Technique Clé

### Services Principaux
- **Auth Service**: OAuth2 multi-providers (Google, Facebook, Twitter, Apple)
- **Database**: PostgreSQL 15 via Supabase
- **Cache**: Redis 7
- **API Gateway**: Nginx
- **Container**: Docker Compose / Kubernetes

### Dashboards par Rôle (13 types)
1. CIO - `/dashboard/cio` - Accès total
2. Admin - `/dashboard/admin` - Support Attitudes.vip
3. Client - `/dashboard/client` - Marque blanche
4. Customer - `/dashboard/customer` - Couples mariés
5. Invite - `/dashboard/invite` - Invités
6. DJ - `/dashboard/dj` - Animation
7. Wedding Planner - `/dashboard/wedding-planner`
8. Photographe - `/dashboard/photographe`
9. Traiteur - `/dashboard/traiteur`
10. Pâtissier - `/dashboard/patissier`
11. Location - `/dashboard/location`

## 🐰 CodeRabbit - Revue de Code IA

**MOT-CLÉ MAGIQUE**: `Rabbit` dans le chat
- ✅ Déclenche automatiquement CodeRabbit
- ✅ Revue de code instantanée
- ✅ Analyse de sécurité
- ✅ Suggestions d'amélioration

**Exemples d'utilisation**:
```
Rabbit, analyse ce code
Rabbit vérifie la sécurité de cette fonction
Rabbit suggère des améliorations
Rabbit vérifie les standards
```

## 🔧 Commandes Essentielles

```bash
# Développement
npm install              # Installer dépendances
npm run dev             # Lancer en mode dev
npm run lint            # Vérifier le code
npm run typecheck       # Vérifier les types
npm test                # Lancer les tests

# Docker
docker-compose up -d    # Lancer tous les services
docker-compose down     # Arrêter les services
docker-compose logs -f  # Voir les logs

# Base de données
npm run db:init         # Initialiser la DB
npm run db:migrate      # Migrations
npm run db:seed         # Données de test

# Déploiement
./scripts/deploy.sh     # Déployer en production
./scripts/health-check.sh # Vérifier santé système
```

## 📁 Structure Importante

```
/src/
├── auth/           # Authentification OAuth2/JWT
├── dashboards/     # UI par type utilisateur
├── services/       # Logique métier
├── i18n/          # 100+ langues
└── styles/        # Tailwind CSS

/ops/kubernetes/    # Config K8s, Zero Trust
/supabase/         # Backend config
/docs/             # Documentation complète
```

## 🌍 Spécificités Régionales

### 9 Régions Supportées
- Amérique du Nord, Europe, Moyen-Orient
- Asie, Afrique, Amérique Latine
- Caraïbes, Océanie, Océan Indien

### 6 Religions Adaptées
- Adaptations culturelles pour cérémonies
- Restrictions alimentaires
- Musiques et décorations appropriées

## 🔐 Sécurité - Standards Enterprise

### Implémentés
- JWT avec refresh tokens (24h)
- Bcrypt 12 rounds
- Rate limiting (100/15min)
- Helmet.js headers
- CORS strict
- Network policies K8s

### À Implémenter
- [ ] WAF (Web Application Firewall)
- [ ] DDoS protection
- [ ] Secrets management (Vault)
- [ ] Compliance scanning
- [ ] Penetration testing

## 📝 État Actuel et Priorités

### Complété ✅
1. Architecture de base
2. Service authentification
3. Configuration infrastructure
4. Documentation technique

### En Cours 🚧
1. Dashboard Customer UI
2. Intégration WebSockets
3. Service notifications

### Priorité Haute 🔴
1. Finaliser auth flow complet
2. Dashboard Customer fonctionnel
3. Service paiement Stripe
4. Tests automatisés

### Prochaines Étapes
1. Implémenter UI Tailwind complète
2. Services temps réel (Socket.io)
3. Intégrations externes (SMS, Email)
4. CI/CD pipeline

## 💡 Patterns et Conventions

### Code
- Async/await privilégié
- Error handling centralisé
- Logging avec Winston
- Tests Jest (80% coverage min)

### Git
- Branches: feature/*, bugfix/*
- Commits: type(scope): message
- PR obligatoires avec review

### API
- RESTful standards
- Versioning: /api/v1/
- JSON responses
- HTTP status codes standards

## 🚨 Points d'Attention

1. **Multi-tenancy**: Isolation stricte données clients
2. **Performance**: Cache Redis obligatoire
3. **i18n**: Toujours utiliser clés traduction
4. **Sécurité**: Jamais de secrets en code
5. **Tests**: Aucun merge sans tests

## 📊 Métriques Cibles

- Temps réponse API: < 200ms
- Uptime: 99.9%
- Concurrent users: 10k
- Page load: < 3s
- Test coverage: > 80%

## 🔗 Ressources Rapides

- Supabase Dashboard: [À configurer]
- Monitoring: Prometheus + Grafana
- Logs: Fluentd aggregation
- CI/CD: GitHub Actions
- Staging: [À déployer]

## 🎯 Vision Produit

Devenir LA plateforme mondiale de gestion de mariages, culturellement adaptée, avec expérience utilisateur exceptionnelle pour tous les acteurs d'un mariage, du couple aux fournisseurs.

---
*Ce fichier sert de mémoire persistante pour Claude. Mettre à jour régulièrement avec les changements importants du projet.*

## 🤖 Taskmaster Integration

### Capacités d'Automatisation
Claude peut maintenant utiliser Taskmaster pour:
- Créer et gérer des workflows automatisés
- Planifier des tâches récurrentes
- Orchestrer des processus complexes
- Analyser et optimiser les workflows
- Générer des rapports d'automatisation

### Commandes Taskmaster
```javascript
// Créer une tâche automatisée
const task = await taskmaster.createTask({
  title: "Titre de la tâche",
  automation: { enabled: true, executor: "type" }
});

// Lancer un workflow
const execution = await taskmaster.executeWorkflow('wedding_planning');

// Analyser les performances
const metrics = await taskmaster.getMetrics();
```

### Workflows Disponibles
1. **completePlanning** - Planification complète du mariage
2. **guestManagement** - Gestion automatisée des invités
3. **vendorCoordination** - Coordination des fournisseurs
4. **budgetManagement** - Suivi et optimisation du budget
5. **weddingDay** - Orchestration du jour J
6. **postWedding** - Suivi post-mariage
7. **emergencyResponse** - Gestion de crise

### Intégration IA
Taskmaster utilise l'IA pour:
- Prioriser intelligemment les tâches
- Prédire les délais et risques
- Suggérer des optimisations
- Détecter les anomalies
- Apprendre des patterns d'utilisation
