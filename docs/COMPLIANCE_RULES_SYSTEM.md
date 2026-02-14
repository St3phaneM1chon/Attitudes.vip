# 📋 Système de Règles et Conformité Automatique

## 🎯 Vue d'ensemble

Le système charge et vérifie automatiquement TOUTES les règles de conformité à chaque:
- 🔄 Redémarrage du système
- 💾 Backup de discussion
- ⚓ Création de point d'ancrage
- 📅 Mise à jour hebdomadaire (lundi 3h)

## 🚨 Fonctionnement

### 1. Au Démarrage

```bash
./start-autonomous-claude.sh
```

Le système :
1. ✅ Charge toutes les règles depuis `/rules`
2. ✅ Vérifie la conformité du code existant
3. ❌ BLOQUE le démarrage si non-conforme
4. ✅ Crée un point d'ancrage avec les règles
5. ✅ Configure les garde-fous pour le développement

### 2. Structure des Règles

```
rules/
├── development/           # Standards de code
│   ├── coding-standards.md
│   ├── git-workflow.md
│   └── testing-requirements.md
├── security/             # Sécurité
│   ├── authentication.md
│   ├── data-protection.md    ✅ Créé
│   └── encryption.md
├── compliance/           # Conformité légale
│   ├── gdpr.md              ✅ Créé
│   ├── quebec-law25.md      ✅ Créé
│   ├── ccpa.md
│   └── pci-dss.md
├── vendor/              # Fournisseurs
│   ├── stripe-requirements.md ✅ Créé
│   ├── apple-guidelines.md
│   └── aws-compliance.md
└── government/          # Gouvernements
    ├── canada-pipeda.md
    └── usa-regulations.md
```

## 🔍 Vérifications Automatiques

### Standards de Développement
- ✅ ESLint sans erreurs
- ✅ Tests passent à 100%
- ✅ Coverage > 80%
- ✅ Pas de code dupliqué
- ✅ Documentation à jour

### Sécurité
- ✅ Pas de secrets dans le code
- ✅ Chiffrement des données sensibles
- ✅ HTTPS partout
- ✅ Authentification forte
- ✅ Audit trail complet

### Conformité Légale
- ✅ RGPD (Europe)
- ✅ Loi 25 (Québec)
- ✅ Consentements explicites
- ✅ Droit à l'oubli
- ✅ Portabilité des données

### Vendors
- ✅ Stripe: Jamais stocker de cartes
- ✅ Apple: Guidelines App Store
- ✅ Google: Policies Play Store
- ✅ AWS: Well-Architected Framework

## 📊 Rapport de Conformité

À chaque vérification, génération de :
```
compliance-reports/
└── report-2025-06-27.json
```

Contenu :
```json
{
  "timestamp": "2025-06-27T22:00:00Z",
  "summary": {
    "totalRules": 45,
    "violations": 0,
    "warnings": 2,
    "status": "COMPLIANT"
  },
  "violations": [],
  "warnings": [...]
}
```

## 🚫 Blocage si Non-Conforme

Si violations détectées :
1. ❌ Création du fichier `.compliance-block`
2. ❌ Arrêt du processus de démarrage
3. ❌ Liste des violations à corriger
4. ❌ Développement impossible

Pour débloquer :
1. Corriger TOUTES les violations
2. Relancer `node scripts/compliance-checker.js check`
3. Si OK, le blocage est levé

## 🤖 Intégration Claude

Claude reçoit automatiquement :
- 📋 Liste complète des règles
- ⚠️ Violations actuelles
- ✅ Standards à respecter
- 🚨 Conséquences du non-respect

## 📝 Ajouter de Nouvelles Règles

1. Créer un fichier `.md` dans la bonne catégorie
2. Utiliser le format :
   ```markdown
   # Titre de la Règle
   
   ## ✅ OBLIGATOIRE - Description
   ```javascript
   // Code conforme
   ```
   
   ## ❌ INTERDIT - Description
   ```javascript
   // Code non conforme
   ```
   ```

3. Le système les chargera au prochain démarrage

## 🔄 Mise à Jour des Règles

Les règles sont mises à jour :
- Manuellement par l'équipe
- Automatiquement depuis les vendors (API)
- Lors des changements réglementaires

## 📈 Métriques de Conformité

Le système track :
- Nombre de violations par catégorie
- Temps de résolution
- Tendances de conformité
- Coût des non-conformités évitées

## 🎯 Bénéfices

1. **Sécurité** : Aucun code non-sécurisé en production
2. **Légalité** : Conformité garantie (RGPD, Loi 25)
3. **Qualité** : Standards élevés maintenus
4. **Automatisation** : Pas d'oublis humains
5. **Tranquillité** : Audits toujours prêts

## 💡 Commandes Utiles

```bash
# Vérifier la conformité manuellement
node scripts/compliance-checker.js check

# Voir le dernier rapport
cat compliance-reports/report-$(date +%Y-%m-%d).json | jq

# Lister toutes les règles
find rules -name "*.md" | sort

# Rechercher une règle spécifique
grep -r "OBLIGATOIRE" rules/
```

## 🚨 Alertes

Notifications automatiques si :
- ❌ Violation critique détectée
- ⚠️ Nouvelle réglementation publiée
- 📋 Mise à jour de règle vendor
- 🔄 Changement de conformité

---

**Le système garantit que TOUT code développé respecte TOUTES les règles, TOUT le temps!** 🛡️