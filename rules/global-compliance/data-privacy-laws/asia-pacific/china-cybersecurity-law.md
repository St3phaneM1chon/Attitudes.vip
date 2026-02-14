# 🇨🇳 Loi sur la Cybersécurité de Chine + PIPL (Personal Information Protection Law)

## 🚨 CRITICITÉ : EXTRÊME
**Non-conformité = Amendes jusqu'à 50M CNY ou 5% CA + Blocage opérations + Responsabilité pénale**

## 📋 Vue d'Ensemble du Cadre Légal Chinois

La Chine a établi un cadre réglementaire complexe et strict pour la protection des données:
- **Cybersecurity Law (CSL)** - 2017
- **Data Security Law (DSL)** - 2021
- **Personal Information Protection Law (PIPL)** - 2021

### Applicabilité
```yaml
territorialité:
  ✅ S'APPLIQUE SI:
    - Traitement de données de citoyens chinois
    - Activités en Chine continentale
    - Fourniture de produits/services en Chine
    - Analyse du comportement de résidents chinois
  
  seuils:
    opérateur_critique: 
      - "Infrastructure critique d'information (CII)"
      - "100,000+ personnes concernées"
      - "Données sensibles"
    
    volume_important:
      - "1 million+ personnes"
      - "Transferts fréquents hors Chine"
```

## 1. CLASSIFICATION DES DONNÉES

### 1.1 Hiérarchie des Données
```javascript
// ✅ OBLIGATOIRE - Classification stricte
const DataClassification = {
  // Données d'État (国家数据)
  state_data: {
    level: 'TOP SECRET',
    examples: [
      'Sécurité nationale',
      'Infrastructure critique',
      'Secrets d'État'
    ],
    rules: 'INTERDICTION ABSOLUE de transfert/accès étranger'
  },
  
  // Données Importantes (重要数据)
  important_data: {
    level: 'RESTRICTED',
    examples: [
      'Données économiques sensibles',
      'Ressources stratégiques',
      'Santé publique grande échelle',
      'Infrastructure publique'
    ],
    requirements: [
      'Évaluation sécurité obligatoire',
      'Approbation CAC pour export',
      'Localisation en Chine'
    ]
  },
  
  // Données Personnelles (个人信息)
  personal_information: {
    level: 'PROTECTED',
    categories: {
      general: [
        'Nom',
        'Date de naissance',
        'ID number',
        'Adresse',
        'Téléphone'
      ],
      sensitive: [
        'Biométrie',
        'Religion',
        'Santé',
        'Finance',
        'Localisation précise',
        'Mineurs < 14 ans'
      ]
    },
    consent: 'Requis pour toute collecte'
  }
};
```

### 1.2 Obligations de Localisation
```javascript
// ✅ OBLIGATOIRE - Stockage local
class DataLocalization {
  constructor() {
    this.mandatory_local_storage = [
      'critical_information_infrastructure',
      'personal_info_over_1million',
      'sensitive_personal_information',
      'important_data'
    ];
  }
  
  async validateStorage(data) {
    const requirements = {
      // Localisation OBLIGATOIRE en Chine
      storage_location: {
        primary: 'Mainland China datacenter',
        backup: 'Mainland China only',
        disaster_recovery: 'Hong Kong allowed with approval'
      },
      
      // Fournisseurs approuvés
      approved_providers: [
        'Alibaba Cloud',
        'Tencent Cloud',
        'Huawei Cloud',
        'China Telecom Cloud'
      ],
      
      // Interdictions
      prohibited: [
        'Foreign cloud providers',
        'Cross-border backup',
        'Foreign access without approval'
      ]
    };
    
    return requirements;
  }
}
```

## 2. CONSENTEMENT ET NOTIFICATION

### 2.1 Exigences de Consentement PIPL
```javascript
// ✅ OBLIGATOIRE - Consentement explicite
class PIPLConsent {
  async collectConsent(user, purpose, dataType) {
    const consent = {
      // Consentement séparé pour chaque finalité
      purpose_specific: true,
      
      // Langue obligatoire
      language: 'zh-CN', // Chinois simplifié
      
      // Format clair
      format: {
        font_size: '14px minimum',
        highlight: 'Données sensibles en rouge',
        structure: 'Bullet points obligatoires',
        examples: 'Requis pour clarification'
      },
      
      // Consentement renforcé pour données sensibles
      sensitive_data: {
        separate_consent: true,
        explicit_risks: true,
        necessity_explanation: true,
        alternatives_provided: true
      },
      
      // Mineurs
      minors: {
        age_threshold: 14,
        parental_consent: 'Obligatoire si < 14 ans',
        verification: 'ID parent requis'
      }
    };
    
    // Enregistrement avec horodatage
    await this.recordConsent({
      user_id: user.id,
      purpose: purpose,
      timestamp: new Date().toISOString(),
      ip_address: request.ip,
      consent_text: consent.text_shown,
      version: consent.version,
      withdrawal_method: 'Disponible dans paramètres'
    });
  }
}
```

### 2.2 Notification de Collecte
```yaml
notification_obligatoire:
  ✅ CONTENU MINIMUM:
    identité:
      - Nom de l'entreprise
      - Coordonnées
      - Responsable protection données
    
    traitement:
      - Finalités spécifiques
      - Types de données collectées
      - Méthodes de collecte
      - Règles de traitement
    
    partage:
      - Destinataires en Chine
      - Transferts internationaux (si autorisés)
      - Finalités du partage
      - Mesures de sécurité
    
    droits:
      - Accès aux données
      - Correction
      - Suppression
      - Portabilité
      - Opposition
      - Plainte CAC
    
    conservation:
      - Durées spécifiques
      - Critères de détermination
      - Suppression automatique
```

## 3. TRANSFERTS TRANSFRONTALIERS

### 3.1 Mécanismes d'Approbation
```javascript
// ✅ OBLIGATOIRE - Évaluation avant transfert
class CrossBorderTransfer {
  async evaluateTransfer(data, destination) {
    const mechanisms = {
      // 1. Évaluation de Sécurité CAC
      security_assessment: {
        required_if: [
          'CII operator',
          'Important data',
          '1M+ personal records',
          '100k+ sensitive records'
        ],
        process: {
          application: 'Submit to CAC',
          review_time: '45-60 days',
          validity: '2 years',
          renewal: 'Required before expiry'
        }
      },
      
      // 2. Certification Protection Données Personnelles
      pi_certification: {
        applicable: 'Non-CII operators',
        certifiers: ['Approved certification bodies'],
        validity: '3 years',
        audit: 'Annual'
      },
      
      // 3. Contrat Standard
      standard_contract: {
        template: 'CAC-approved template',
        filing: 'Within 10 days of signing',
        requirements: [
          'Equal protection abroad',
          'Individual rights preserved',
          'Audit rights',
          'Liability allocation'
        ]
      }
    };
    
    // Documentation requise
    const documentation = {
      risk_assessment: await this.conductPIA(data, destination),
      legal_basis: await this.validateLegalBasis(data.purpose),
      individual_consent: await this.verifyConsent(data.subjects),
      security_measures: await this.documentSecurity(destination),
      government_filing: await this.prepareCAC_filing()
    };
    
    return {
      mechanism: this.selectMechanism(data.type, data.volume),
      documentation: documentation,
      approval_required: true,
      timeline: '60-90 days'
    };
  }
}
```

### 3.2 Restrictions et Interdictions
```yaml
transferts_interdits:
  ❌ INTERDICTION ABSOLUE:
    - Données d'État
    - Infrastructure critique sans approbation
    - Données affectant sécurité nationale
    - Volume massif (définition CAC)
  
  ⚠️ APPROBATION OBLIGATOIRE:
    - Toutes données personnelles
    - Données importantes
    - Données sensibles
    - Transferts réguliers
  
  pays_restreints:
    - "Liste noire CAC (mise à jour régulière)"
    - "Pays sans protection adéquate"
    - "Juridictions hostiles"
```

## 4. DROITS DES PERSONNES CONCERNÉES

### 4.1 Droits PIPL
```javascript
// ✅ OBLIGATOIRE - Portail des droits
class PIRightsPortal {
  constructor() {
    this.response_deadline = 15; // jours ouvrables
    this.extension_allowed = 30; // jours max si complexe
  }
  
  // Droit de Savoir (知情权)
  async handleAccessRequest(request) {
    const response = {
      personal_data: await this.retrieveAllData(request.user_id),
      processing_rules: this.getProcessingRules(),
      sharing_records: await this.getSharingHistory(request.user_id),
      cross_border_transfers: await this.getTransferRecords(request.user_id),
      retention_periods: this.getRetentionPolicy(),
      automated_decisions: await this.getAutomatedDecisions(request.user_id)
    };
    
    return {
      data: response,
      format: request.preferred_format || 'JSON',
      language: 'zh-CN',
      deadline: addWorkingDays(15)
    };
  }
  
  // Droit de Décision (决定权)
  async handleDeletionRequest(request) {
    // Vérifier si suppression permise
    const legal_holds = await this.checkLegalObligations(request.user_id);
    
    if (legal_holds.can_delete) {
      await db.transaction(async (trx) => {
        // Suppression complète
        await trx.users.delete(request.user_id);
        await trx.user_data.delete({ user_id: request.user_id });
        
        // Notification aux tiers
        const third_parties = await this.getDataRecipients(request.user_id);
        for (const party of third_parties) {
          await this.notifyDeletion(party, request.user_id);
        }
      });
    }
  }
  
  // Droit de Portabilité (可携带权)
  async handlePortabilityRequest(request) {
    const data = await this.collectPortableData(request.user_id);
    
    return {
      format: ['JSON', 'CSV', 'XML'],
      content: data,
      transfer_to_third_party: request.direct_transfer || false,
      encryption: 'Required for transfer'
    };
  }
}
```

## 5. SÉCURITÉ ET PROTECTION

### 5.1 Exigences Techniques Minimales
```yaml
sécurité_obligatoire:
  ✅ MESURES TECHNIQUES:
    chiffrement:
      - Au repos: "SM4 ou AES-256"
      - En transit: "TLS 1.3 avec certificats chinois"
      - Clés: "Gestion par HSM approuvé"
    
    accès:
      - Authentification: "Multi-facteurs obligatoire"
      - Autorisation: "RBAC granulaire"
      - Monitoring: "Temps réel avec alertes"
    
    réseau:
      - Segmentation: "Isolation complète par type"
      - Firewall: "WAF + IPS/IDS"
      - VPN: "Approuvé par CAC uniquement"
    
    audit:
      - Logs: "Conservation 6 mois minimum"
      - Intégrité: "Hash chain immutable"
      - Analyse: "SIEM avec ML/AI"
```

### 5.2 Plan de Réponse aux Incidents
```javascript
// ✅ OBLIGATOIRE - Gestion incidents
class IncidentResponsePlan {
  async handleSecurityIncident(incident) {
    const timeline = {
      // T+0: Détection
      detection: incident.detected_at,
      
      // T+1h: Évaluation initiale
      assessment: await this.assessImpact(incident),
      
      // T+24h: Rapport interne
      internal_report: await this.notifyManagement(incident),
      
      // T+72h: Notification autorités SI REQUIS
      authority_notification: null,
      
      // T+5j: Notification individus SI risque élevé
      individual_notification: null
    };
    
    // Critères de notification CAC
    if (this.meetsCACCriteria(incident)) {
      timeline.authority_notification = await this.notifyCAC({
        incident: incident,
        impact: assessment,
        measures: containment_actions,
        prevention: future_prevention
      });
    }
    
    // Notification individus
    if (assessment.risk_level === 'HIGH') {
      timeline.individual_notification = await this.notifyAffected({
        channels: ['app_notification', 'sms', 'email'],
        language: 'zh-CN',
        content: {
          incident_nature: incident.type,
          data_affected: incident.data_categories,
          potential_harm: assessment.harm_types,
          protective_actions: recommendations
        }
      });
    }
  }
}
```

## 6. GOUVERNANCE ET ORGANISATION

### 6.1 Responsable Protection des Données
```yaml
dpo_requirements:
  ✅ OBLIGATOIRE SI:
    - Traitement > 100,000 personnes
    - Données sensibles comme activité principale
    - Opérateur d'infrastructure critique
  
  qualifications:
    - Expertise lois chinoises données
    - Expérience cybersécurité
    - Mandarin courant
    - Compréhension contexte local
  
  responsabilités:
    - Liaison avec CAC
    - Supervision conformité
    - Formation personnel
    - Gestion incidents
    - Audits réguliers
  
  indépendance:
    - Rapport direct CEO
    - Budget autonome
    - Protection contre licenciement
    - Accès toutes données
```

### 6.2 Documentation et Registres
```javascript
// ✅ OBLIGATOIRE - Registres détaillés
const ComplianceRegistry = {
  // Registre des traitements
  processing_registry: {
    controller: {
      name: 'Company China Ltd.',
      registration: 'ICP License number',
      address: 'Registered address in China',
      dpo_contact: 'dpo@company.cn'
    },
    
    activities: [
      {
        name: 'Customer Data Processing',
        legal_basis: 'Consent + Contract',
        data_categories: ['identity', 'contact', 'behavioral'],
        purposes: ['Service delivery', 'Improvement'],
        recipients: ['Internal teams', 'Approved processors'],
        cross_border: ['Details of approved transfers'],
        retention: '3 years after relationship end',
        security: ['Encryption', 'Access control', 'Monitoring']
      }
    ]
  },
  
  // Registre des incidents
  incident_registry: {
    format: 'Standardized CAC template',
    retention: '5 years minimum',
    content: ['Date', 'Nature', 'Impact', 'Response', 'Lessons']
  },
  
  // Registre des consentements
  consent_registry: {
    retention: 'Duration + 3 years',
    audit_trail: 'Complete history required',
    format: 'Machine-readable for inspection'
  }
};
```

## 7. AUDITS ET INSPECTIONS

### 7.1 Audits CAC
```yaml
inspections_cac:
  fréquence:
    - Routine: "Annuelle pour CII"
    - Ciblée: "Suite à incidents"
    - Aléatoire: "Sans préavis"
  
  préparation:
    ✅ DOCUMENTS REQUIS:
      - Registres de traitement
      - Évaluations de sécurité
      - Incidents et réponses
      - Formations du personnel
      - Contrats sous-traitants
      - Approbations transferts
  
  coopération:
    - Accès complet systèmes
    - Personnel disponible
    - Réponses sous 24h
    - Pas d'obstruction
  
  conséquences:
    - Ordres de rectification
    - Amendes
    - Suspension opérations
    - Révocation licences
```

## 8. SANCTIONS ET PÉNALITÉS

### 8.1 Échelle des Sanctions
```yaml
sanctions_pipl:
  violations_graves:
    amendes:
      - "Jusqu'à 50M CNY ou 5% CA annuel"
      - "Confiscation gains illégaux"
      - "Suspension activités"
    
    responsables:
      - "DPO: 100k-1M CNY personnel"
      - "Dirigeants: Responsabilité pénale"
      - "Interdiction exercer 5 ans"
  
  violations_standard:
    - "Avertissement + rectification"
    - "1-10M CNY"
    - "Publication publique"
  
  facteurs_aggravants:
    - Volume données important
    - Données sensibles/mineurs
    - Récidive
    - Non-coopération
    - Intention malveillante
```

### 8.2 Blacklists
```yaml
listes_noires:
  credit_social:
    - "Inscription système crédit social"
    - "Restrictions voyages dirigeants"
    - "Exclusion marchés publics"
    - "Restrictions bancaires"
  
  publication:
    - "Site CAC"
    - "Médias nationaux"
    - "Registres permanents"
```

## 9. CONSIDÉRATIONS SECTORIELLES

### 9.1 Secteur Financier
```yaml
finance_requirements:
  régulateurs_additionnels:
    - CBIRC (China Banking and Insurance)
    - CSRC (Securities)
    - PBOC (People's Bank)
  
  exigences_spéciales:
    - KYC/AML renforcé
    - Localisation absolue
    - Audit temps réel
    - Reporting quotidien
```

### 9.2 Santé
```yaml
healthcare_requirements:
  données_génétiques:
    - "Approbation spéciale requise"
    - "Interdiction export absolue"
    - "Consentement écrit notarié"
  
  recherche_clinique:
    - "Comité éthique obligatoire"
    - "Approbation NMPA"
    - "Anonymisation irréversible"
```

## 10. IMPLÉMENTATION PRATIQUE

### 10.1 Architecture Technique
```javascript
// ✅ OBLIGATOIRE - Stack de conformité
class ChinaComplianceStack {
  constructor() {
    this.infrastructure = {
      // Cloud providers locaux UNIQUEMENT
      cloud: ['Alibaba Cloud', 'Tencent Cloud', 'Huawei Cloud'],
      
      // Chiffrement national
      encryption: {
        symmetric: 'SM4',
        asymmetric: 'SM2',
        hash: 'SM3',
        fallback: 'AES-256-GCM' // Si approuvé
      },
      
      // Monitoring
      monitoring: {
        siem: 'Local solution required',
        logs: 'Must remain in China',
        alerts: 'Real-time to DPO',
        retention: '180 days minimum'
      }
    };
  }
  
  async deployCompliantArchitecture() {
    // 1. Vérifier localisation
    await this.verifyDataCenterLocation();
    
    // 2. Implémenter séparation données
    await this.implementDataSegregation();
    
    // 3. Configurer chiffrement
    await this.setupEncryption();
    
    // 4. Établir monitoring
    await this.configureMonitoring();
    
    // 5. Tester conformité
    await this.runComplianceTests();
  }
}
```

### 10.2 Checklist d'Implémentation
```yaml
immediate_actions:
  ✅ JOUR 1:
    - [ ] Identifier toutes données chinoises
    - [ ] Stopper transferts non autorisés
    - [ ] Nommer DPO local
    - [ ] Commencer localisation données
  
  ✅ SEMAINE 1:
    - [ ] Audit complet données
    - [ ] Plan de localisation
    - [ ] Mise à jour contrats
    - [ ] Formation équipe urgente
  
  ✅ MOIS 1:
    - [ ] Migration données en Chine
    - [ ] Implémentation consentements
    - [ ] Processus droits individus
    - [ ] Préparation dossiers CAC
  
  ✅ TRIMESTRE 1:
    - [ ] Certification sécurité
    - [ ] Audit externe
    - [ ] Tests incident response
    - [ ] Approbations transferts

monitoring_continu:
  - Dashboard conformité temps réel
  - Audits mensuels internes
  - Rapports trimestriels CAC
  - Formation continue personnel
```

---

**⚠️ AVERTISSEMENT CRITIQUE : La non-conformité aux lois chinoises peut entraîner le BLOCAGE IMMÉDIAT de toutes opérations en Chine, des amendes massives, et des poursuites pénales contre les dirigeants. Aucune tolérance n'est accordée.**