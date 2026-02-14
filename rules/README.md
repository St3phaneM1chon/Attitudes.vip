# 📋 Système de Règles et Conformité

Ce répertoire contient toutes les règles critiques qui DOIVENT être respectées lors du développement. Ces règles sont automatiquement chargées et vérifiées à chaque redémarrage.

## 📁 Structure des Règles

```
rules/
├── README.md                    # Ce fichier
├── development/                 # Règles de développement
│   ├── coding-standards.md      # Standards de code
│   ├── git-workflow.md          # Workflow Git obligatoire
│   └── testing-requirements.md  # Exigences de tests
├── security/                    # Règles de sécurité
│   ├── authentication.md        # Auth & OAuth2
│   ├── data-protection.md       # Protection des données
│   └── encryption.md            # Chiffrement obligatoire
├── compliance/                  # Conformité réglementaire
│   ├── gdpr.md                 # RGPD Europe
│   ├── ccpa.md                 # CCPA Californie
│   ├── pci-dss.md              # Standards cartes bancaires
│   └── iso-27001.md            # ISO 27001
├── vendor/                      # Exigences fournisseurs
│   ├── stripe-requirements.md   # Stripe
│   ├── apple-guidelines.md      # Apple App Store
│   ├── google-policies.md       # Google Play
│   └── aws-compliance.md        # AWS
└── government/                  # Exigences gouvernementales
    ├── canada-pipeda.md         # Loi canadienne
    ├── quebec-law25.md          # Loi 25 Québec
    └── usa-regulations.md       # Régulations US

```

## 🚨 IMPORTANT

- Ces règles sont **OBLIGATOIRES** et non négociables
- Elles sont vérifiées automatiquement à chaque redémarrage
- Toute violation bloque le développement
- Les mises à jour nécessitent une approbation

## 🔄 Chargement Automatique

À chaque redémarrage ou backup, le système :
1. Charge toutes les règles de ce répertoire
2. Vérifie la conformité du code existant
3. Configure les garde-fous pour le développement futur
4. Génère un rapport de conformité

## ✅ Validation

Pour valider manuellement la conformité :
```bash
node scripts/compliance-checker.js validate
```