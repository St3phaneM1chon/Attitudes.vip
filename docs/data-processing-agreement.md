# ACCORD DE TRAITEMENT DES DONNÉES (DPA) - ATTITUDES.VIP

**Document** : Data Processing Agreement (DPA)  
**Date** : 28 juin 2025  
**Version** : 1.0  

## 1. PARTIES CONTRACTANTES

### 1.1 Responsable de traitement
**Attitudes.vip Inc.**  
Adresse : [À compléter]  
Représentant légal : [À compléter]  
Email : legal@attitudes.vip  

### 1.2 Sous-traitant
Ce document s'applique à tous les sous-traitants d'Attitudes.vip

## 2. OBJET ET DURÉE

### 2.1 Objet
Le présent accord définit les conditions dans lesquelles le Sous-traitant traite les données personnelles pour le compte d'Attitudes.vip.

### 2.2 Durée
Durée du contrat principal + période de restitution/destruction des données

## 3. NATURE ET FINALITÉ DU TRAITEMENT

### 3.1 Nature du traitement
- Collecte de données utilisateurs
- Stockage et organisation
- Traitement et analyse
- Communication et diffusion
- Suppression et destruction

### 3.2 Finalités du traitement
- Gestion de la plateforme de mariage
- Service client et support
- Amélioration des services
- Conformité réglementaire

### 3.3 Catégories de données personnelles
- **Données d'identification** : nom, prénom, email, téléphone
- **Données de mariage** : date, lieu, budget, préférences
- **Données techniques** : logs, IP, cookies
- **Données financières** : transactions, factures

### 3.4 Catégories de personnes concernées
- Clients (futurs mariés)
- Invités aux mariages
- Prestataires de services
- Visiteurs du site web

## 4. OBLIGATIONS DU SOUS-TRAITANT

### 4.1 Traitement conforme
- Traiter les données uniquement sur instruction documentée
- Ne pas traiter les données à ses propres fins
- Respecter strictement les finalités définies
- Notifier toute instruction illégale

### 4.2 Confidentialité
- Garantir la confidentialité des données
- Former et sensibiliser le personnel
- Limiter l'accès aux seules personnes autorisées
- Maintenir un registre des accès

### 4.3 Sécurité technique et organisationnelle

#### 4.3.1 Mesures techniques
```yaml
Sécurité:
  Chiffrement:
    - AES-256 pour données au repos
    - TLS 1.3 pour données en transit
  Accès:
    - Authentification multi-facteurs
    - Principe du moindre privilège
    - Rotation régulière des mots de passe
  Infrastructure:
    - Réseaux sécurisés et isolés
    - Surveillance 24/7
    - Sauvegardes chiffrées
```

#### 4.3.2 Mesures organisationnelles
- Politique de sécurité documentée
- Procédures d'incident de sécurité
- Audits de sécurité réguliers
- Certification ISO 27001 recommandée

### 4.4 Assistance au responsable de traitement
- Faciliter l'exercice des droits des personnes
- Assister dans les analyses d'impact (DPIA)
- Coopérer lors des contrôles des autorités
- Fournir toute information nécessaire

## 5. SOUS-TRAITANCE ULTÉRIEURE

### 5.1 Autorisation
- Autorisation générale avec liste des sous-traitants
- Notification préalable de tout changement
- Droit d'opposition du responsable de traitement

### 5.2 Sous-traitants autorisés actuels
| Sous-traitant | Service | Localisation | Garanties |
|---------------|---------|--------------|-----------|
| Stripe | Paiements | USA | Clauses contractuelles types |
| Twilio | Communications | USA | Privacy Shield |
| Supabase | Base de données | Canada | Décision d'adéquation |
| Cloudflare | Sécurité/CDN | Global | Clauses contractuelles types |

### 5.3 Conditions de la sous-traitance
- Mêmes obligations de protection des données
- Responsabilité solidaire du sous-traitant initial
- Contrôle régulier de la conformité

## 6. TRANSFERTS INTERNATIONAUX

### 6.1 Mécanismes de transfert
- **Décisions d'adéquation** (Canada, Japon, etc.)
- **Clauses contractuelles types** de la Commission européenne
- **Privacy Shield** (États-Unis) - en remplacement
- **Codes de conduite** sectoriels

### 6.2 Garanties supplémentaires
- Évaluation des lois locales
- Mesures de sécurité renforcées
- Notification des demandes gouvernementales
- Plan de continuité en cas de conflit juridique

## 7. DROITS DES PERSONNES CONCERNÉES

### 7.1 Obligation d'assistance
Le sous-traitant aide le responsable de traitement à :
- Répondre aux demandes dans les délais (1 mois)
- Fournir les données dans un format structuré
- Effectuer les rectifications nécessaires
- Supprimer les données sur demande

### 7.2 Procédures techniques
```javascript
// Interface API pour exercice des droits
const rightsAPI = {
  access: (userId) => exportUserData(userId),
  rectify: (userId, corrections) => updateUserData(userId, corrections),
  erase: (userId) => deleteUserData(userId),
  portability: (userId) => exportStructuredData(userId)
};
```

## 8. NOTIFICATION DES VIOLATIONS

### 8.1 Délais
- **Détection** : Immédiate
- **Notification au responsable** : 24h maximum
- **Rapport détaillé** : 72h maximum

### 8.2 Informations à fournir
- Nature de la violation
- Catégories et nombre de personnes concernées
- Conséquences probables
- Mesures prises ou envisagées

### 8.3 Procédure d'incident
1. **Détection et confinement** (0-2h)
2. **Évaluation des risques** (2-12h)
3. **Notification** (12-24h)
4. **Investigation complète** (24-72h)
5. **Mesures correctives** (immédiat)
6. **Rapport final** (1 semaine)

## 9. AUDIT ET CONTRÔLE

### 9.1 Droit d'audit
- Audits documentaires annuels
- Inspections sur site si nécessaire
- Accès aux procédures et registres
- Vérification des certifications

### 9.2 Certifications recommandées
- **ISO 27001** : Sécurité de l'information
- **SOC 2 Type II** : Contrôles opérationnels
- **ISAE 3402** : Contrôles des services
- **Certification GDPR** : Conformité spécifique

## 10. FIN DE CONTRAT

### 10.1 Restitution des données
- **Délai** : 30 jours après fin de contrat
- **Format** : Structuré et lisible par machine
- **Méthode** : Transmission sécurisée
- **Vérification** : Certificat de restitution

### 10.2 Destruction des données
- **Délai** : Immédiat après restitution
- **Méthode** : Destruction sécurisée (NIST 800-88)
- **Preuve** : Certificat de destruction
- **Exceptions** : Obligations légales de conservation

### 10.3 Procédure de fin de contrat
```bash
# Script de fin de contrat
./scripts/data-export-secure.sh --client-id $CLIENT_ID
./scripts/data-verification.sh --export-id $EXPORT_ID
./scripts/data-destruction.sh --confirm-destruction
./scripts/generate-certificates.sh --destruction-cert
```

## 11. RESPONSABILITÉ ET ASSURANCE

### 11.1 Responsabilité du sous-traitant
- Dommages causés par non-respect du DPA
- Sanctions des autorités de contrôle
- Préjudices subis par les personnes concernées

### 11.2 Limitation de responsabilité
- Maximum contractuel selon le contrat principal
- Exclusion des dommages indirects
- Force majeure et cas fortuits

### 11.3 Assurance professionnelle
- Couverture cyber-risques minimum : 10M€
- Responsabilité civile professionnelle
- Police d'assurance à jour

## 12. DISPOSITIONS GÉNÉRALES

### 12.1 Droit applicable
Droit français et règlements européens (GDPR)

### 12.2 Juridiction compétente
Tribunaux de Paris, France

### 12.3 Modifications
Modifications par avenant écrit uniquement

### 12.4 Nullité partielle
Clause de sauvegarde en cas de nullité partielle

## 13. ANNEXES TECHNIQUES

### Annexe A : Catégories de données détaillées
### Annexe B : Mesures de sécurité techniques
### Annexe C : Procédures d'exercice des droits
### Annexe D : Plan de continuité d'activité
### Annexe E : Registre des transferts internationaux

---

**Signatures**

**Pour le Responsable de traitement**  
Nom : [À compléter]  
Fonction : [À compléter]  
Date : ___________  
Signature : ___________  

**Pour le Sous-traitant**  
Nom : [À compléter]  
Fonction : [À compléter]  
Date : ___________  
Signature : ___________  

---

*Ce document est conforme aux exigences de l'article 28 du RGPD et aux recommandations de la CNIL.*