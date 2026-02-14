# 🇪🇺 Conformité RGPD (GDPR) - Règles Strictes

## ⚖️ Obligations Légales OBLIGATOIRES

### 1. Base Légale du Traitement

```javascript
// ✅ OBLIGATOIRE - Toujours vérifier la base légale
const legalBases = {
  CONSENT: 'consent',                    // Consentement explicite
  CONTRACT: 'contract',                  // Nécessaire au contrat
  LEGAL_OBLIGATION: 'legal_obligation',  // Obligation légale
  VITAL_INTERESTS: 'vital_interests',    // Intérêts vitaux
  PUBLIC_TASK: 'public_task',           // Mission publique
  LEGITIMATE_INTERESTS: 'legitimate_interests' // Intérêts légitimes
};

// Avant TOUT traitement
async function processData(userId, purpose, legalBasis) {
  if (!Object.values(legalBases).includes(legalBasis)) {
    throw new Error('Invalid legal basis for processing');
  }
  
  await recordProcessing(userId, purpose, legalBasis);
}
```

### 2. Consentement Explicite

```javascript
// ✅ OBLIGATOIRE - Interface de consentement
const consentRequirements = {
  // Doit être :
  freely_given: true,      // Librement donné
  specific: true,          // Spécifique
  informed: true,          // Informé
  unambiguous: true,       // Sans ambiguïté
  
  // Format
  separate_from_terms: true,
  clear_language: true,
  easy_withdrawal: true,
  granular_options: true
};

// Implémentation
async function obtainConsent(userId, purposes) {
  const consent = await showConsentDialog({
    title: "Nous respectons votre vie privée",
    purposes: [
      {
        id: 'marketing',
        description: 'Envoi d\'emails promotionnels',
        required: false,
        checked: false // JAMAIS pré-coché
      },
      {
        id: 'analytics',
        description: 'Analyse de votre utilisation',
        required: false,
        checked: false
      }
    ],
    withdrawalInfo: "Vous pouvez retirer votre consentement à tout moment"
  });
  
  // Enregistrer avec timestamp
  await db.consent.create({
    userId,
    purposes: consent.accepted,
    timestamp: new Date(),
    ip: req.ip,
    version: 'v1.0'
  });
}
```

### 3. Droits des Personnes Concernées

```javascript
// ✅ OBLIGATOIRE - Implémenter TOUS les droits
class GDPRRights {
  // 1. Droit d'accès (Article 15)
  async accessRequest(userId) {
    const data = await collectAllUserData(userId);
    return {
      personalData: data,
      processingPurposes: await getProcessingPurposes(userId),
      recipients: await getDataRecipients(userId),
      retentionPeriod: await getRetentionPeriod(userId),
      rights: this.getAllRights()
    };
  }
  
  // 2. Droit de rectification (Article 16)
  async rectifyData(userId, corrections) {
    await validateCorrections(corrections);
    await db.users.update(userId, corrections);
    await auditLog.record('RECTIFICATION', userId, corrections);
  }
  
  // 3. Droit à l'effacement (Article 17)
  async eraseData(userId, reason) {
    // Vérifier si légalement possible
    if (await hasLegalObligationToKeep(userId)) {
      throw new Error('Cannot delete: legal obligation');
    }
    
    await anonymizeHistoricalData(userId);
    await deletePersonalData(userId);
    await notifyThirdParties(userId, 'DELETION');
  }
  
  // 4. Droit à la limitation (Article 18)
  async restrictProcessing(userId, scope) {
    await db.users.update(userId, { 
      processingRestricted: true,
      restrictionScope: scope 
    });
  }
  
  // 5. Droit à la portabilité (Article 20)
  async exportData(userId) {
    const data = await collectAllUserData(userId);
    return {
      format: 'JSON', // Format machine-readable
      data: data,
      timestamp: new Date()
    };
  }
  
  // 6. Droit d'opposition (Article 21)
  async objectToProcessing(userId, processingType) {
    await db.objections.create({
      userId,
      processingType,
      timestamp: new Date()
    });
    
    await stopProcessing(userId, processingType);
  }
}
```

### 4. Privacy by Design

```javascript
// ✅ OBLIGATOIRE dès la conception
const privacyByDesign = {
  // Minimisation des données
  dataMinimization: {
    collectOnlyNecessary: true,
    noExcessiveData: true,
    regularReview: '6months'
  },
  
  // Pseudonymisation
  pseudonymization: {
    enabled: true,
    reversible: false,
    saltRotation: '90days'
  },
  
  // Sécurité par défaut
  securityDefaults: {
    encryption: 'AES-256',
    accessControl: 'RBAC',
    auditLogging: true
  }
};
```

### 5. Registre des Traitements

```javascript
// ✅ OBLIGATOIRE - Article 30
const processingRecord = {
  controller: {
    name: "Attitudes.vip SAS",
    contact: "dpo@attitudes.vip",
    representative: "DPO Name"
  },
  
  activities: [
    {
      name: "Gestion des mariages",
      purposes: ["Organisation d'événements", "Facturation"],
      legalBasis: "CONTRACT",
      dataCategories: ["Identité", "Contact", "Paiement"],
      recipients: ["Prestataires", "Comptabilité"],
      transfers: [], // Pays tiers
      retention: "5 ans après l'événement",
      security: ["Chiffrement", "Access Control", "Backup"]
    }
  ],
  
  lastUpdated: new Date()
};
```

### 6. Notification de Violation

```javascript
// ✅ OBLIGATOIRE - 72h maximum
async function notifyDataBreach(breach) {
  const severity = assessBreachSeverity(breach);
  
  if (severity === 'HIGH') {
    // Notification CNIL sous 72h
    await notifyDPA({
      nature: breach.type,
      categories: breach.affectedData,
      approximateNumber: breach.affectedUsers,
      consequences: breach.potentialConsequences,
      measures: breach.mitigationMeasures,
      timestamp: breach.detectedAt
    });
    
    // Notification des personnes concernées
    if (breach.highRiskToIndividuals) {
      await notifyAffectedUsers(breach.affectedUserIds, {
        description: breach.description,
        consequences: breach.consequences,
        measures: breach.measures,
        recommendations: breach.userActions
      });
    }
  }
  
  // Logger pour le registre
  await breachRegister.record(breach);
}
```

### 7. Transferts Internationaux

```javascript
// ✅ OBLIGATOIRE pour transferts hors UE
const internationalTransfers = {
  // Vérifier l'adéquation
  checkAdequacy: async (country) => {
    const adequateCountries = [
      'CA', // Canada
      'JP', // Japon
      'CH', // Suisse
      // etc.
    ];
    
    if (!adequateCountries.includes(country)) {
      // Besoin de garanties supplémentaires
      return {
        needsSCC: true, // Standard Contractual Clauses
        needsBCR: false // Binding Corporate Rules
      };
    }
  }
};
```

### 8. DPO et Gouvernance

```javascript
// ✅ OBLIGATOIRE si traitement à grande échelle
const dataProtectionOfficer = {
  appointed: true,
  contact: "dpo@attitudes.vip",
  independence: true,
  
  responsibilities: [
    'Informer et conseiller',
    'Contrôler le respect du RGPD',
    'Coopérer avec la CNIL',
    'Point de contact'
  ]
};
```

### 9. Impact Assessment (DPIA)

```javascript
// ✅ OBLIGATOIRE pour traitements à risque
async function conductDPIA(processing) {
  if (requiresDPIA(processing)) {
    return {
      description: processing.description,
      necessity: processing.necessityAssessment,
      risks: await identifyRisks(processing),
      measures: await defineMitigations(processing),
      residualRisk: await assessResidualRisk(processing),
      dpoOpinion: await getDPOOpinion(processing),
      approved: false // Nécessite validation
    };
  }
}
```

### 10. Amendes et Sanctions

```javascript
// ⚠️ RAPPEL DES RISQUES
const gdprPenalties = {
  administrative: {
    max: "20M EUR ou 4% du CA mondial",
    examples: [
      "Non-respect des droits",
      "Transferts illégaux",
      "Absence de base légale"
    ]
  },
  
  other: {
    reputational: "Dommage à la marque",
    operational: "Interdiction de traitement",
    civil: "Dommages et intérêts"
  }
};
```

## 📋 Checklist RGPD

- [ ] Base légale définie pour chaque traitement
- [ ] Consentements correctement collectés
- [ ] Tous les droits implémentés (accès, rectif, etc.)
- [ ] Privacy by Design appliqué
- [ ] Registre des traitements à jour
- [ ] Procédure de breach notification
- [ ] DPO nommé si nécessaire
- [ ] DPIA réalisées
- [ ] Formation du personnel
- [ ] Audits réguliers

## 🚨 NON-CONFORMITÉ = RISQUE MAJEUR

La non-conformité RGPD peut entraîner :
- 💸 Amendes jusqu'à 20M€ ou 4% CA
- 🚫 Interdiction de traitement
- 📰 Dommage réputationnel
- ⚖️ Actions en justice