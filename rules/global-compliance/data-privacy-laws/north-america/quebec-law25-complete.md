# 🍁 Loi 25 Québec - Modernisation de la Protection des Renseignements Personnels

## 🚨 CRITICITÉ : MAXIMALE
**Non-conformité = Amendes jusqu'à 25M$ CAD ou 4% du CA mondial + Sanctions pénales**

## 📋 Exigences Techniques Complètes Loi 25

### 1. GOUVERNANCE ET RESPONSABILITÉ

#### 1.1 Responsable de la Protection des Renseignements Personnels (RPRP)
```yaml
rprp_obligatoire:
  seuil: "Toute entreprise collectant des RP au Québec"
  
  requirements:
    nomination:
      - Titre et fonction publiés
      - Coordonnées accessibles
      - Délégation écrite si externe
    
    qualifications:
      - Formation juridique OU
      - Certification privacy (CIPP/C, CIPM)
      - Expérience 3+ ans protection données
    
    responsabilités:
      - Mise en œuvre programme protection
      - Point contact pour CAI et individus
      - Rapports annuels direction
      - Formation du personnel
```

#### 1.2 Politique de Protection Obligatoire
```javascript
// ✅ OBLIGATOIRE - Politique détaillée
const PrivacyPolicy = {
  mandatory_sections: {
    purposes: "Finalités de collecte détaillées",
    categories: "Types de RP collectés",
    sources: "Origines des données",
    disclosure: "Communications à des tiers",
    retention: "Durées de conservation",
    security: "Mesures de protection",
    rights: "Droits et recours",
    contact: "Coordonnées RPRP"
  },
  
  languages: ["français", "anglais"], // Obligatoire bilingue
  
  accessibility: {
    location: "Page d'accueil + chaque collecte",
    format: "HTML + PDF téléchargeable",
    readability: "Niveau 8e année maximum"
  }
};
```

### 2. CONSENTEMENT ET TRANSPARENCE

#### 2.1 Consentement Manifeste
```javascript
// ✅ OBLIGATOIRE - Consentement explicite
class ConsentManager {
  async collectConsent(userId, purpose) {
    // Validation du consentement
    if (!this.isManifest(consent)) {
      throw new Error("Consentement non manifeste");
    }
    
    const record = {
      user_id: userId,
      purpose: purpose,
      timestamp: new Date(),
      ip_address: request.ip,
      mechanism: consent.method, // click, signature, verbal
      text_presented: consent.notice,
      language: consent.language,
      version: this.policy_version,
      withdrawal_method: "Accessible en 2 clics max"
    };
    
    await db.consents.create(record);
    
    // Preuve de consentement
    await this.generateConsentProof(record);
  }
  
  isManifest(consent) {
    return (
      consent.action === 'affirmative' &&
      consent.clear === true &&
      consent.informed === true &&
      consent.specific === true &&
      !consent.pre_checked
    );
  }
}
```

#### 2.2 Avis de Collecte
```yaml
avis_obligatoire:
  moment: "Au moment de la collecte"
  
  contenu_minimum:
    ✅ OBLIGATOIRE:
      - Finalités de la collecte
      - Moyens de collecte
      - Droits d'accès et rectification
      - Catégories de personnes ayant accès
      - Lieu de conservation (si hors Québec)
      - Mesures de sécurité
      - Contact du RPRP
  
  format:
    - Clair et simple
    - Accessible avant collecte
    - Langue de l'utilisateur
```

### 3. ÉVALUATION DES FACTEURS RELATIFS À LA VIE PRIVÉE (EFVP)

```javascript
// ✅ OBLIGATOIRE - Pour projets à risque
class PrivacyImpactAssessment {
  constructor() {
    this.triggers = [
      'biometric_data',
      'ai_profiling',
      'large_scale_processing',
      'systematic_monitoring',
      'cross_border_transfer',
      'sensitive_data',
      'minors_data'
    ];
  }
  
  async conductPIA(project) {
    const assessment = {
      project_id: project.id,
      date: new Date(),
      
      // 1. Description du projet
      description: {
        nature: project.description,
        purposes: project.purposes,
        necessity: project.justification,
        proportionality: project.proportionality_analysis
      },
      
      // 2. Flux de données
      data_flow: {
        collection: project.data_sources,
        processing: project.processing_activities,
        storage: project.storage_locations,
        sharing: project.third_parties,
        retention: project.retention_periods,
        disposal: project.deletion_methods
      },
      
      // 3. Analyse des risques
      risks: await this.identifyRisks(project),
      
      // 4. Mesures d'atténuation
      mitigations: await this.defineMitigations(project.risks),
      
      // 5. Risques résiduels
      residual_risks: await this.assessResidualRisks(),
      
      // 6. Recommandations
      recommendations: await this.generateRecommendations(),
      
      // 7. Approbation
      approval: {
        rprp_review: null,
        management_approval: null,
        implementation_date: null
      }
    };
    
    return assessment;
  }
}
```

### 4. INCIDENTS DE CONFIDENTIALITÉ

#### 4.1 Détection et Classification
```javascript
// ✅ OBLIGATOIRE - Système de détection
class IncidentDetection {
  constructor() {
    this.severity_matrix = {
      critical: {
        criteria: [
          'sensitive_data_exposed',
          'large_scale_breach',
          'malicious_access',
          'data_modification'
        ],
        response_time: 'immediate'
      },
      high: {
        criteria: [
          'personal_data_exposed',
          'unauthorized_access',
          'system_compromise'
        ],
        response_time: '24_hours'
      },
      medium: {
        criteria: [
          'potential_exposure',
          'security_weakness',
          'process_failure'
        ],
        response_time: '72_hours'
      }
    };
  }
  
  async assessIncident(incident) {
    const assessment = {
      id: generateIncidentId(),
      detected_at: new Date(),
      
      // Nature de l'incident
      type: incident.type,
      description: incident.description,
      
      // Données affectées
      data_categories: incident.affected_data,
      record_count: incident.affected_count,
      
      // Évaluation du risque
      risk_level: this.calculateRiskLevel(incident),
      harm_assessment: this.assessPotentialHarm(incident),
      
      // Mesures immédiates
      containment: incident.containment_actions,
      investigation: incident.investigation_status
    };
    
    return assessment;
  }
}
```

#### 4.2 Notification Obligatoire
```javascript
// ✅ OBLIGATOIRE - Notifications
class IncidentNotification {
  async notifyCAI(incident) {
    if (incident.risk_level >= 'MEDIUM') {
      const notification = {
        // Informations obligatoires
        incident_date: incident.detected_at,
        discovery_date: incident.discovered_at,
        
        // Description
        nature: incident.description,
        cause: incident.root_cause || 'Under investigation',
        
        // Personnes affectées
        categories: incident.affected_categories,
        approximate_number: incident.affected_count,
        
        // Mesures prises
        immediate_measures: incident.containment,
        planned_measures: incident.remediation_plan,
        
        // Contact
        contact_person: this.rprp_info,
        case_number: incident.id
      };
      
      // Envoi à la CAI
      await this.sendToCAI(notification);
      
      // Log de notification
      await this.logNotification({
        type: 'CAI',
        incident_id: incident.id,
        sent_at: new Date(),
        content: notification
      });
    }
  }
  
  async notifyIndividuals(incident) {
    if (incident.harm_assessment === 'HIGH') {
      const template = {
        subject: "Avis d'incident de confidentialité",
        
        content: {
          greeting: "Madame, Monsieur,",
          
          incident: `Nous vous informons qu'un incident impliquant 
                     vos renseignements personnels est survenu le 
                     ${incident.date}.`,
          
          nature: incident.public_description,
          
          risks: incident.potential_consequences,
          
          measures: incident.protective_measures,
          
          recommendations: [
            "Surveiller vos comptes",
            "Changer vos mots de passe",
            "Activer l'authentification à deux facteurs"
          ],
          
          support: this.support_contact,
          
          rights: "Vous pouvez porter plainte à la CAI..."
        }
      };
      
      await this.sendMassNotification(
        incident.affected_users,
        template
      );
    }
  }
}
```

### 5. DROITS DES PERSONNES CONCERNÉES

#### 5.1 Droit d'Accès
```javascript
// ✅ OBLIGATOIRE - Portail d'accès
class AccessRightsHandler {
  async handleAccessRequest(request) {
    // Validation de l'identité
    await this.verifyIdentity(request.user_id);
    
    // Collecte des données
    const userData = {
      // Renseignements détenus
      personal_info: await this.getPersonalInfo(request.user_id),
      
      // Provenance
      sources: await this.getDataSources(request.user_id),
      
      // Communications
      disclosures: await this.getDisclosureHistory(request.user_id),
      
      // Durée de conservation
      retention: await this.getRetentionInfo(request.user_id),
      
      // Décisions automatisées
      automated_decisions: await this.getAutomatedDecisions(request.user_id)
    };
    
    // Format de réponse
    const response = {
      request_id: request.id,
      requested_date: request.date,
      
      // Délai légal : 30 jours
      response_deadline: addDays(request.date, 30),
      
      // Données structurées
      data: userData,
      
      // Formats disponibles
      formats: {
        pdf: await this.generatePDF(userData),
        json: userData,
        csv: await this.generateCSV(userData)
      }
    };
    
    return response;
  }
}
```

#### 5.2 Droit de Rectification
```javascript
// ✅ OBLIGATOIRE - Corrections
async function handleRectification(request) {
  const validation = await validateRectificationRequest(request);
  
  if (validation.valid) {
    // Appliquer les corrections
    await db.transaction(async (trx) => {
      // Sauvegarder l'historique
      await trx.data_history.create({
        user_id: request.user_id,
        field: request.field,
        old_value: request.old_value,
        new_value: request.new_value,
        reason: request.reason,
        changed_by: 'user_request',
        changed_at: new Date()
      });
      
      // Mettre à jour
      await trx.users.update(
        request.user_id,
        { [request.field]: request.new_value }
      );
    });
    
    // Notifier les tiers si nécessaire
    if (await wasSharedWithThirdParties(request.user_id, request.field)) {
      await notifyThirdParties(request.user_id, request.changes);
    }
  }
}
```

### 6. TECHNOLOGIES ET IA

#### 6.1 Décisions Automatisées
```yaml
decisions_automatisees:
  ✅ OBLIGATOIRE:
    information:
      - Existence du traitement automatisé
      - Logique sous-jacente
      - Conséquences pour la personne
      - Paramètres utilisés
    
    droits:
      - Intervention humaine
      - Expression du point de vue
      - Contestation de la décision
      - Obtenir une révision
    
    documentation:
      - Algorithmes utilisés
      - Données d'entraînement
      - Taux d'erreur
      - Biais identifiés
```

#### 6.2 Profilage et IA
```javascript
// ✅ OBLIGATOIRE - Transparence IA
class AITransparency {
  async documentAISystem(system) {
    return {
      // Description du système
      name: system.name,
      purpose: system.purpose,
      type: system.ai_type, // ML, DL, Rule-based
      
      // Données utilisées
      training_data: {
        sources: system.data_sources,
        volume: system.data_volume,
        categories: system.data_types,
        bias_mitigation: system.bias_measures
      },
      
      // Performance
      metrics: {
        accuracy: system.accuracy,
        false_positive_rate: system.fpr,
        false_negative_rate: system.fnr,
        fairness_metrics: system.fairness
      },
      
      // Utilisation
      decisions: {
        types: system.decision_types,
        impact: system.impact_assessment,
        human_oversight: system.human_review_process,
        appeal_process: system.appeal_mechanism
      },
      
      // Audit
      last_audit: system.last_audit_date,
      next_audit: system.next_audit_date,
      auditor: system.audit_firm
    };
  }
}
```

### 7. TRANSFERTS HORS QUÉBEC

```javascript
// ✅ OBLIGATOIRE - Évaluation des transferts
class CrossBorderTransfer {
  async evaluateTransfer(destination) {
    const evaluation = {
      jurisdiction: destination.country,
      
      // Évaluation juridique
      legal_framework: {
        data_protection_laws: destination.laws,
        enforcement: destination.enforcement_level,
        individual_rights: destination.rights_available,
        remedies: destination.legal_remedies
      },
      
      // Risques identifiés
      risks: {
        government_access: destination.surveillance_laws,
        data_breach: destination.security_standards,
        third_party_sharing: destination.onward_transfer_rules,
        retention: destination.retention_requirements
      },
      
      // Mesures d'atténuation
      safeguards: {
        contractual: "Standard contractual clauses",
        technical: "Encryption, pseudonymization",
        organizational: "Access controls, training"
      },
      
      // Décision
      recommendation: this.makeRecommendation(evaluation),
      approval_required: evaluation.risk_level > 'MEDIUM'
    };
    
    return evaluation;
  }
}
```

### 8. MESURES DE SÉCURITÉ

```yaml
mesures_obligatoires:
  administratives:
    ✅ OBLIGATOIRE:
      - Politiques de sécurité documentées
      - Formation annuelle du personnel
      - Contrôles d'accès basés sur rôles
      - Processus de gestion des incidents
      - Audits de sécurité réguliers
  
  techniques:
    ✅ OBLIGATOIRE:
      - Chiffrement AES-256 au repos
      - TLS 1.3 en transit
      - Authentification multi-facteurs
      - Journalisation complète
      - Détection d'intrusion
      - Sauvegarde chiffrée
  
  physiques:
    ✅ OBLIGATOIRE:
      - Accès contrôlé aux serveurs
      - Destruction sécurisée des médias
      - Protection contre les sinistres
```

### 9. REGISTRE DES COMMUNICATIONS

```javascript
// ✅ OBLIGATOIRE - Registre détaillé
const CommunicationRegistry = {
  mandatory_info: {
    recipient: {
      name: "Organization name",
      country: "Jurisdiction",
      purpose: "Why shared",
      legal_basis: "Consent/Contract/Law"
    },
    
    data_shared: {
      categories: ["personal", "financial", "behavioral"],
      volume: "Number of records",
      frequency: "One-time/Recurring",
      method: "API/SFTP/Email"
    },
    
    safeguards: {
      contractual: "NDA/DPA signed",
      technical: "Encryption used",
      access: "Limited to specific personnel"
    },
    
    retention: {
      period: "How long kept",
      deletion: "Deletion confirmation required"
    }
  }
};
```

### 10. SANCTIONS ET PÉNALITÉS

```yaml
sanctions:
  administratives:
    personnes:
      - 50$ à 5,000$ (première infraction)
      - 100$ à 10,000$ (récidive)
    
    entreprises:
      - 10,000$ à 10M$ ou 2% CA mondial
      - 20,000$ à 25M$ ou 4% CA mondial (récidive)
  
  pénales:
    - Amendes ci-dessus
    - Emprisonnement jusqu'à 1 an
    - Responsabilité personnelle des dirigeants
  
  autres_conséquences:
    - Ordonnances de conformité
    - Publicité négative
    - Interdiction de collecte
    - Dommages-intérêts civils
```

## 🔧 Implementation Checklist

```yaml
immediate_actions:
  ✅ TODO:
    - [ ] Nommer RPRP avec coordonnées publiques
    - [ ] Publier politique de confidentialité conforme
    - [ ] Implémenter consentement manifeste
    - [ ] Créer processus EFVP
    - [ ] Établir procédure incidents
    - [ ] Développer portail droits d'accès
    - [ ] Former tout le personnel
    - [ ] Auditer transferts hors Québec
    - [ ] Documenter mesures de sécurité
    - [ ] Créer registre communications

monitoring:
  daily:
    - Incidents de sécurité
    - Demandes d'accès
    - Consentements
  
  monthly:
    - Revue des transferts
    - Audit des accès
    - Formation complétée
  
  annually:
    - Révision EFVP
    - Audit externe
    - Mise à jour politiques
```

---

**⚠️ ATTENTION : La Loi 25 est EN VIGUEUR. La non-conformité entraîne des sanctions IMMÉDIATES.**