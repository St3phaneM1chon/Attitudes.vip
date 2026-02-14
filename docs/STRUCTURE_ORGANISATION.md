# 📁 ORGANISATION DE LA STRUCTURE DU PROJET

**Date de réorganisation** : 28 juin 2025  
**Objectif** : Maintenir une structure de projet claire et organisée  

## 🗂️ STRUCTURE DES RÉPERTOIRES

### 📄 Fichiers à la racine (NE PAS DÉPLACER)
- **CLAUDE.md** - Mémoire persistante du projet (requis par le système)
- **package.json / package-lock.json** - Configuration npm
- **docker-compose*.yml** - Configurations Docker
- **Dockerfile*** - Images Docker
- **jest.config.js** - Configuration des tests
- **playwright.config.js** - Configuration E2E
- **nginx.conf / redis.conf** - Configurations services
- **env.example** - Template variables d'environnement

### 📚 Documentation (/docs)

#### 📊 /docs/reports
- Rapports d'audit et de sécurité
- Plans d'optimisation
- Statuts et métriques
- `AUDIT_COMPLET_FINAL_2025-06-28.md`
- `SECURITY_AUDIT_COMPLETED.md`
- `OPTIMISATIONS_EXHAUSTIVES_RECOMMANDEES.md`
- `PLAN_ACTION_PRIORITAIRE.md`
- `docker-services-status.md`

#### 🔍 /docs/analysis
- Analyses techniques approfondies
- Rapports CodeRabbit
- Analyses d'architecture
- `COMPREHENSIVE_APPLICATION_ANALYSIS.md`
- `CODERABBIT_ANALYSIS_REPORT.md`
- `CUSTOMER_DASHBOARD_COMPLETION_REPORT.md`
- `CLAUDE_FULL_CONTROL_ANALYSIS.md`

#### 💾 /docs/sessions
- Sauvegardes de sessions
- Mémoire du projet
- Historiques de conversation
- `SESSION_MEMORY_COMPLETE.md`
- `SESSION_MEMORY_WEEK5.md`
- `MEMORY_COMPLETE_PROJECT.md`
- `Derniere-Session/` (répertoire complet)
- `conversation-summary.md`

#### 📖 /docs/guides
- Guides d'utilisation
- Documentation technique
- Procédures et tutoriels
- `TASKMASTER_QUICKSTART.md`
- `README-TESTS.md`
- `WEEKLY_STATUS.md`
- `API_KEYS_CONFIGURATION.md`

### 🛠️ Scripts (/scripts)
- Tous les scripts d'automatisation
- Scripts de déploiement
- Scripts de test
- Scripts d'initialisation
- `priorite1.sh`
- `monscript.sh`
- `tests-critiques.sh`
- `suite-de-tests.sh`
- `start-autonomous-claude.sh`

### 🔧 Outils (/tools)
- Utilitaires standalone
- Interfaces de configuration
- `UI.html`
- `configure-api-keys.html`

## 📋 RÈGLES D'ORGANISATION

### ✅ À FAIRE
1. **Nouveaux fichiers MD** → Placer dans `/docs/` selon la catégorie
2. **Scripts shell/JS** → Placer dans `/scripts/`
3. **Utilitaires HTML** → Placer dans `/tools/`
4. **Rapports générés** → `/docs/reports/`
5. **Analyses** → `/docs/analysis/`

### ❌ À NE PAS FAIRE
1. **Ne jamais déplacer** `CLAUDE.md` de la racine
2. **Ne pas toucher** aux fichiers de configuration à la racine
3. **Ne pas déplacer** package.json ou fichiers Docker
4. **Ne pas créer** de fichiers à la racine sans nécessité absolue

## 🔄 MAINTENANCE

### Hebdomadaire
- Vérifier les nouveaux fichiers à la racine
- Organiser selon cette structure
- Mettre à jour ce document si nécessaire

### Mensuelle
- Nettoyer les fichiers temporaires
- Archiver les vieilles sessions
- Réviser la structure si besoin

## 📊 BÉNÉFICES

1. **Clarté** : Structure logique et prévisible
2. **Maintenance** : Facilite la gestion du projet
3. **Performance** : Moins de fichiers à scanner à la racine
4. **Professionnalisme** : Projet bien organisé
5. **Onboarding** : Nouveaux développeurs comprennent rapidement

---

*Cette organisation a été mise en place pour maintenir un projet propre et professionnel. Respectez ces conventions pour la cohérence du projet.*