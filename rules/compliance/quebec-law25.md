# 🇨🇦 Loi 25 Québec - Protection des Renseignements Personnels

## ⚖️ Exigences Spécifiques au Québec

### 1. Responsable de la Protection

```javascript
// ✅ OBLIGATOIRE - Désigner un responsable
const privacyOfficer = {
  title: "Responsable de la protection des renseignements personnels",
  name: "À désigner",
  contact: "privacy@attitudes.vip",
  published: true, // Doit être publié sur le site
  
  responsibilities: [
    "Assurer la conformité à la Loi 25",
    "Traiter les demandes d'accès",
    "Former le personnel",
    "Répondre aux plaintes"
  ]
};
```

### 2. Politique de Confidentialité

```javascript
// ✅ OBLIGATOIRE - En français, claire et accessible
const privacyPolicy = {
  language: 'fr-CA',
  location: '/politique-confidentialite',
  
  requiredSections: [
    {
      title: "Renseignements collectés",
      content: "Liste exhaustive des données"
    },
    {
      title: "Finalités de la collecte",
      content: "Pourquoi nous collectons"
    },
    {
      title: "Communication des renseignements",
      content: "À qui nous partageons"
    },
    {
      title: "Conservation",
      content: "Durée de conservation"
    },
    {
      title: "Mesures de sécurité",
      content: "Comment nous protégeons"
    },
    {
      title: "Vos droits",
      content: "Accès, rectification, etc."
    }
  ],
  
  lastUpdated: new Date(),
  versionHistory: true
};
```

### 3. Consentement Explicite

```javascript
// ✅ OBLIGATOIRE - Plus strict que RGPD
async function obtainQuebecConsent(userId, purpose) {
  const consent = await showConsentDialog({
    title: "Demande de consentement",
    message: "Nous souhaitons utiliser vos renseignements personnels pour:",
    purpose: purpose,
    
    // Requis par la Loi 25
    information: {
      categories: "Nom, courriel, téléphone",
      usage: "Marketing direct",
      sharing: "Aucun partage avec des tiers",
      duration: "3 ans",
      withdrawal: "Vous pouvez retirer votre consentement en tout temps"
    },
    
    buttons: {
      accept: "J'accepte",
      refuse: "Je refuse" // Doit être aussi visible
    }
  });
  
  if (!consent.accepted) {
    // Ne PAS pénaliser le refus
    await provideServiceWithoutConsent(userId);
  }
}
```

### 4. Incidents de Confidentialité

```javascript
// ✅ OBLIGATOIRE - Notification rapide
async function handlePrivacyIncident(incident) {
  const risk = assessRiskLevel(incident);
  
  if (risk === 'SERIOUS') {
    // 1. Notifier la Commission d'accès à l'information
    await notifyCAI({
      description: incident.description,
      date: incident.occurredAt,
      affected: incident.affectedCount,
      categories: incident.dataTypes,
      measures: incident.mitigationSteps
    });
    
    // 2. Notifier les personnes concernées
    await notifyAffectedPersons(incident.affectedUsers, {
      nature: incident.description,
      recommendations: [
        "Changez vos mots de passe",
        "Surveillez vos comptes"
      ]
    });
    
    // 3. Publier un avis si risque de préjudice sérieux
    if (incident.seriousHarmRisk) {
      await publishPublicNotice(incident);
    }
  }
  
  // 4. Tenir un registre
  await incidentRegistry.record(incident);
}
```

### 5. Évaluation des Facteurs de Vie Privée (ÉFVP)

```javascript
// ✅ OBLIGATOIRE pour nouveaux systèmes
class PrivacyImpactAssessment {
  async conduct(project) {
    return {
      // 1. Description du projet
      project: {
        name: project.name,
        description: project.description,
        personalInfo: project.collectsPersonalInfo
      },
      
      // 2. Renseignements personnels concernés
      dataInventory: {
        categories: project.dataCategories,
        sensitivity: project.sensitivityLevel,
        volume: project.expectedVolume
      },
      
      // 3. Analyse des risques
      risks: {
        unauthorized_access: this.assessRisk('access'),
        data_breach: this.assessRisk('breach'),
        improper_use: this.assessRisk('misuse'),
        retention: this.assessRisk('over-retention')
      },
      
      // 4. Mesures de protection
      safeguards: {
        technical: ['Chiffrement', 'Contrôle d\'accès'],
        administrative: ['Formation', 'Politiques'],
        physical: ['Accès sécurisé', 'Destruction sécurisée']
      },
      
      // 5. Recommandations
      recommendations: await this.generateRecommendations(project)
    };
  }
}
```

### 6. Droit à la Portabilité

```javascript
// ✅ OBLIGATOIRE - Format structuré
async function handlePortabilityRequest(userId) {
  const userData = await collectUserData(userId);
  
  // Format technologique structuré et couramment utilisé
  const formats = {
    json: {
      data: userData,
      metadata: {
        exported: new Date(),
        format: 'JSON',
        version: '1.0'
      }
    },
    csv: await convertToCSV(userData),
    xml: await convertToXML(userData)
  };
  
  // Permettre le transfert direct si demandé
  if (request.transferTo) {
    await transferToThirdParty(formats.json, request.transferTo);
  }
  
  return formats[request.preferredFormat || 'json'];
}
```

### 7. Décisions Automatisées

```javascript
// ✅ OBLIGATOIRE - Transparence sur l'IA
const automatedDecisionPolicy = {
  // Informer si décision automatisée
  disclosure: {
    uses_automation: true,
    description: "Nous utilisons l'IA pour personnaliser",
    
    factors: [
      "Historique de navigation",
      "Préférences déclarées",
      "Comportement similaire d'autres utilisateurs"
    ],
    
    rights: [
      "Demander une révision humaine",
      "Contester la décision",
      "Opt-out du traitement automatisé"
    ]
  },
  
  // Permettre l'intervention humaine
  humanReview: async (userId, decision) => {
    await assignToHuman(userId, decision);
    return { status: 'Under human review' };
  }
};
```

### 8. Technologies de Traçage

```javascript
// ✅ OBLIGATOIRE - Paramètres de confidentialité
const cookieCompliance = {
  // Désactivés par défaut
  defaultState: {
    necessary: true,      // Seuls les essentiels
    analytics: false,     // Opt-in requis
    marketing: false,     // Opt-in requis
    preferences: false    // Opt-in requis
  },
  
  // Interface de gestion
  privacySettings: {
    accessible: true,
    granular: true,
    persistent: true,
    clear_descriptions: true
  }
};
```

### 9. Communication Commerciale

```javascript
// ✅ OBLIGATOIRE - Opt-in explicite
const marketingCompliance = {
  // Consentement préalable
  requiresConsent: true,
  
  // Identification claire
  senderIdentification: {
    name: "Attitudes.vip",
    address: "123 rue Example, Montréal, QC",
    contact: "info@attitudes.vip"
  },
  
  // Mécanisme de retrait facile
  unsubscribe: {
    method: 'one-click',
    link_in_every_email: true,
    process_immediately: true,
    confirm_unsubscribe: true
  }
};
```

### 10. Conservation et Destruction

```javascript
// ✅ OBLIGATOIRE - Calendrier de conservation
const retentionSchedule = {
  // Par catégorie
  categories: {
    contracts: {
      active: 'Durée du contrat',
      after: '5 ans',
      destruction: 'Déchiquetage/suppression sécurisée'
    },
    
    marketing: {
      active: 'Jusqu\'au retrait du consentement',
      after: '3 ans sans interaction',
      destruction: 'Anonymisation'
    },
    
    logs: {
      active: '1 an',
      after: 'Destruction immédiate',
      destruction: 'Suppression définitive'
    }
  },
  
  // Processus de destruction
  destruction: async (data) => {
    await secureDelete(data);
    await logDestruction(data);
    await notifyIfRequired(data);
  }
};
```

## 📋 Checklist Loi 25

- [ ] Responsable de la protection désigné et publié
- [ ] Politique de confidentialité conforme et en français
- [ ] Consentements explicites avec refus visible
- [ ] Procédure d'incident établie
- [ ] ÉFVP pour nouveaux projets
- [ ] Portabilité en format structuré
- [ ] Transparence sur l'IA et décisions automatisées
- [ ] Cookies désactivés par défaut
- [ ] Marketing avec opt-in seulement
- [ ] Calendrier de conservation établi

## 🚨 Sanctions

Non-conformité peut entraîner :
- 💸 Amendes jusqu'à 10M$ ou 2% du CA mondial
- 📰 Publication de la sanction
- ⚖️ Actions collectives facilitées
- 🚫 Ordonnances de cessation

## 📅 Dates Importantes

- **22 septembre 2022** : Plusieurs obligations en vigueur
- **22 septembre 2023** : Toutes les obligations en vigueur
- **22 septembre 2024** : Fin de la période de transition