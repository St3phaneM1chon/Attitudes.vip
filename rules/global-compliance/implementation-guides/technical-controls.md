# 🔧 Guide d'Implémentation Technique - Contrôles de Conformité Mondiale

## 🚨 UTILISATION PAR CLAUDE
**Ce guide DOIT être appliqué automatiquement lors de toute génération de code**

## 📋 Vue d'Ensemble

Ce guide technique fournit l'implémentation concrète des contrôles de sécurité et de conformité pour assurer le respect de toutes les réglementations mondiales.

### Architecture de Référence
```yaml
architecture_conforme:
  frontend:
    frameworks: ["React", "Vue", "Angular", "Next.js"]
    sécurité: "CSP, SRI, HTTPS only"
    
  backend:
    langages: ["Node.js", "Python", "Java", "Go"]
    frameworks: ["Express", "FastAPI", "Spring", "Gin"]
    
  infrastructure:
    cloud: ["AWS", "Azure", "GCP"]
    containers: "Docker + Kubernetes"
    
  data:
    databases: ["PostgreSQL", "MongoDB", "Redis"]
    encryption: "At rest + In transit"
```

## 1. CONTRÔLES DE SÉCURITÉ TECHNIQUES

### 1.1 Chiffrement
```javascript
// ✅ OBLIGATOIRE - Module de chiffrement universel
const crypto = require('crypto');
const { KMS } = require('@aws-sdk/client-kms');

class UniversalEncryption {
  constructor() {
    this.kms = new KMS({ region: process.env.AWS_REGION });
    this.algorithm = 'aes-256-gcm';
  }
  
  // Chiffrement des données sensibles
  async encryptSensitiveData(data, classification) {
    // Déterminer niveau de protection requis
    const protectionLevel = this.getProtectionLevel(classification);
    
    if (protectionLevel === 'MAXIMUM') {
      // Double chiffrement pour données très sensibles
      return await this.doubleEncrypt(data);
    }
    
    // Chiffrement standard AES-256-GCM
    const key = await this.getDataKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key.Plaintext, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: key.KeyId,
      algorithm: this.algorithm,
      classification: classification,
      timestamp: new Date().toISOString()
    };
  }
  
  // Déchiffrement sécurisé
  async decryptSensitiveData(encryptedData) {
    // Audit de l'accès
    await this.auditDataAccess(encryptedData);
    
    // Vérifier permissions
    if (!await this.checkDecryptPermission(encryptedData.classification)) {
      throw new Error('Insufficient permissions for decryption');
    }
    
    const key = await this.getDataKey(encryptedData.keyId);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key.Plaintext,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.ciphertext, 'base64')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }
  
  // Gestion des clés via KMS
  async getDataKey(keyId = null) {
    if (keyId) {
      return await this.kms.decrypt({
        CiphertextBlob: keyId
      });
    }
    
    return await this.kms.generateDataKey({
      KeyId: process.env.KMS_MASTER_KEY,
      KeySpec: 'AES_256'
    });
  }
}
```

### 1.2 Authentification et Autorisation
```typescript
// ✅ OBLIGATOIRE - Système d'auth complet
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import { OAuth2Client } from 'google-auth-library';

interface AuthConfig {
  mfaRequired: boolean;
  sessionTimeout: number;
  passwordPolicy: PasswordPolicy;
  allowedAuthMethods: AuthMethod[];
}

class EnterpriseAuth {
  private config: AuthConfig;
  private refreshTokens: Map<string, RefreshToken>;
  
  constructor(config: AuthConfig) {
    this.config = config;
    this.refreshTokens = new Map();
  }
  
  // Authentification multi-facteurs
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // 1. Vérifier identifiants
    const user = await this.verifyCredentials(credentials);
    
    // 2. Vérifier statut compte
    if (user.locked || user.suspended) {
      await this.logFailedAttempt(user.id, 'Account locked');
      throw new Error('Account unavailable');
    }
    
    // 3. MFA obligatoire pour comptes sensibles
    if (this.requiresMFA(user)) {
      const mfaToken = await this.initiateMFA(user);
      return {
        status: 'mfa_required',
        mfaToken: mfaToken,
        methods: user.mfaMethods
      };
    }
    
    // 4. Générer tokens
    return await this.generateTokens(user);
  }
  
  // Vérification MFA
  async verifyMFA(mfaToken: string, code: string, method: string): Promise<AuthResult> {
    const session = await this.getMFASession(mfaToken);
    
    switch (method) {
      case 'totp':
        const verified = speakeasy.totp.verify({
          secret: session.user.totpSecret,
          encoding: 'base32',
          token: code,
          window: 2
        });
        
        if (!verified) {
          throw new Error('Invalid TOTP code');
        }
        break;
        
      case 'sms':
      case 'email':
        if (session.code !== code || Date.now() > session.expiry) {
          throw new Error('Invalid or expired code');
        }
        break;
        
      case 'webauthn':
        await this.verifyWebAuthn(session.challenge, code);
        break;
    }
    
    return await this.generateTokens(session.user);
  }
  
  // Génération tokens JWT sécurisés
  private async generateTokens(user: User): Promise<AuthResult> {
    // Access token - Durée courte
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        permissions: await this.getUserPermissions(user),
        sessionId: crypto.randomUUID()
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '15m',
        algorithm: 'RS256',
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE
      }
    );
    
    // Refresh token - Durée longue, révocable
    const refreshToken = crypto.randomBytes(32).toString('hex');
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 jours
      deviceId: this.getDeviceId(),
      ipAddress: this.getClientIP()
    });
    
    // Audit trail
    await this.logSuccessfulLogin(user.id);
    
    return {
      status: 'authenticated',
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles
      }
    };
  }
}

// Middleware d'autorisation
export function authorize(requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Vérifier token
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      // Vérifier signature et expiration
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      
      // Vérifier permissions
      const hasPermissions = requiredPermissions.every(permission => 
        payload.permissions.includes(permission)
      );
      
      if (!hasPermissions) {
        await auditUnauthorizedAccess(payload.sub, requiredPermissions);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Ajouter user au contexte
      req.user = payload;
      next();
      
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
```

### 1.3 Validation et Sanitisation
```javascript
// ✅ OBLIGATOIRE - Validation stricte des entrées
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');
const { body, validationResult } = require('express-validator');

class InputValidation {
  // Schémas de validation par type de donnée
  static schemas = {
    email: [
      body('email')
        .isEmail().withMessage('Email invalide')
        .normalizeEmail()
        .custom(async (email) => {
          // Vérifier domaine jetable
          if (await this.isDisposableEmail(email)) {
            throw new Error('Domaine email non autorisé');
          }
          return true;
        })
    ],
    
    password: [
      body('password')
        .isLength({ min: 12 }).withMessage('Minimum 12 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Doit contenir majuscule, minuscule, chiffre et caractère spécial')
        .custom((password) => {
          // Vérifier contre liste mots de passe compromis
          if (this.isCompromisedPassword(password)) {
            throw new Error('Mot de passe compromis, choisissez-en un autre');
          }
          return true;
        })
    ],
    
    phoneNumber: [
      body('phone')
        .isMobilePhone('any')
        .withMessage('Numéro de téléphone invalide')
        .customSanitizer((value) => {
          // Normaliser format international
          return value.replace(/[^+\d]/g, '');
        })
    ],
    
    creditCard: [
      body('cardNumber')
        .isCreditCard()
        .withMessage('Numéro de carte invalide')
        .customSanitizer((value) => {
          // Masquer pour logs
          return value.replace(/\d(?=\d{4})/g, '*');
        })
    ],
    
    html: [
      body('content')
        .customSanitizer((value) => {
          // Sanitize HTML contre XSS
          return DOMPurify.sanitize(value, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
            ALLOWED_ATTR: ['href', 'target']
          });
        })
    ]
  };
  
  // Validation SQL Injection
  static preventSQLInjection(query) {
    // Utiliser TOUJOURS des requêtes préparées
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\|\|)|(\*)|(\?)|(%))/, // Caractères dangereux
      /(union|select|insert|update|delete|drop|create)/i, // Mots-clés SQL
      /(script|javascript|vbscript|onload|onerror)/i // XSS
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(query)) {
        throw new Error('Input contains potentially malicious content');
      }
    }
    
    return query;
  }
  
  // Validation fichiers upload
  static validateFileUpload(file) {
    const config = {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
      
      // Signatures magiques des fichiers
      magicNumbers: {
        'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
        'image/png': ['89504e47'],
        'image/gif': ['47494638'],
        'application/pdf': ['25504446']
      }
    };
    
    // Vérifier taille
    if (file.size > config.maxSize) {
      throw new Error('Fichier trop volumineux');
    }
    
    // Vérifier type MIME
    if (!config.allowedTypes.includes(file.mimetype)) {
      throw new Error('Type de fichier non autorisé');
    }
    
    // Vérifier extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      throw new Error('Extension non autorisée');
    }
    
    // Vérifier signature du fichier (magic number)
    const buffer = file.buffer;
    const magic = buffer.toString('hex', 0, 4);
    const validMagic = config.magicNumbers[file.mimetype]?.some(sig => 
      magic.startsWith(sig)
    );
    
    if (!validMagic) {
      throw new Error('Fichier corrompu ou type incorrect');
    }
    
    // Scanner virus si disponible
    if (process.env.CLAMAV_ENABLED === 'true') {
      return this.scanVirus(file);
    }
    
    return true;
  }
}
```

## 2. PRIVACY BY DESIGN

### 2.1 Gestion du Consentement
```typescript
// ✅ OBLIGATOIRE - Système de consentement global
interface ConsentRecord {
  userId: string;
  purposes: ConsentPurpose[];
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  version: string;
  withdrawable: boolean;
}

class GlobalConsentManager {
  private consentStore: ConsentStore;
  private jurisdictionDetector: JurisdictionDetector;
  
  async collectConsent(userId: string, request: ConsentRequest): Promise<ConsentRecord> {
    // 1. Détecter juridiction
    const jurisdiction = await this.jurisdictionDetector.detect(request.ipAddress);
    
    // 2. Appliquer règles spécifiques
    const requirements = this.getJurisdictionRequirements(jurisdiction);
    
    // 3. Valider consentement selon juridiction
    if (!this.isValidConsent(request, requirements)) {
      throw new Error('Invalid consent for jurisdiction');
    }
    
    // 4. Enregistrer avec toutes métadonnées
    const record: ConsentRecord = {
      userId,
      purposes: request.purposes,
      timestamp: new Date(),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      version: this.getCurrentPolicyVersion(),
      withdrawable: true,
      
      // Métadonnées supplémentaires
      jurisdiction,
      legalBasis: this.determineLegalBasis(request.purposes, jurisdiction),
      parentalConsent: request.age < this.getMinorAge(jurisdiction),
      
      // Preuve technique
      consentProof: {
        method: request.method, // click, checkbox, signature
        screenshot: request.uiState, // État UI au moment du consentement
        sessionId: request.sessionId,
        formData: this.sanitizeFormData(request.formData)
      }
    };
    
    // 5. Stocker de manière immuable
    await this.consentStore.create(record);
    
    // 6. Propager aux systèmes
    await this.propagateConsent(record);
    
    return record;
  }
  
  // Retrait du consentement
  async withdrawConsent(userId: string, purposes?: string[]): Promise<void> {
    // Retrait immédiat
    const withdrawn = await this.consentStore.withdraw(userId, purposes);
    
    // Arrêter tout traitement
    await this.stopProcessing(userId, purposes);
    
    // Notifier tous les systèmes
    await this.notifySystemsOfWithdrawal(userId, purposes);
    
    // Notifier tiers si données partagées
    const sharedWith = await this.getDataRecipients(userId);
    for (const recipient of sharedWith) {
      await this.notifyThirdPartyWithdrawal(recipient, userId, purposes);
    }
    
    // Audit trail
    await this.auditConsentWithdrawal(userId, purposes, withdrawn);
  }
  
  // Vérification périodique
  async refreshConsentIfNeeded(userId: string): Promise<boolean> {
    const consent = await this.consentStore.getCurrent(userId);
    
    // Vérifier expiration
    const maxAge = this.getMaxConsentAge(consent.jurisdiction);
    if (Date.now() - consent.timestamp.getTime() > maxAge) {
      return true; // Re-consentement requis
    }
    
    // Vérifier changements politique
    if (consent.version !== this.getCurrentPolicyVersion()) {
      const changes = this.getPolicyChanges(consent.version);
      if (changes.requiresReconsent) {
        return true;
      }
    }
    
    return false;
  }
}
```

### 2.2 Minimisation des Données
```javascript
// ✅ OBLIGATOIRE - Collecte minimale
class DataMinimization {
  // Configuration par type d'utilisateur
  static dataRequirements = {
    guest: {
      required: [],
      optional: ['preferredLanguage', 'timezone'],
      forbidden: ['email', 'phone', 'address', 'payment']
    },
    
    registered: {
      required: ['email', 'password'],
      optional: ['firstName', 'lastName', 'phone'],
      forbidden: ['ssn', 'driverLicense', 'passport']
    },
    
    premium: {
      required: ['email', 'password', 'paymentMethod'],
      optional: ['firstName', 'lastName', 'phone', 'address'],
      forbidden: ['ssn', 'medicalInfo']
    },
    
    business: {
      required: ['email', 'companyName', 'taxId', 'address'],
      optional: ['phone', 'website', 'industry'],
      forbidden: ['personalIdNumbers']
    }
  };
  
  // Validation stricte
  static validateDataCollection(userType, requestedData) {
    const requirements = this.dataRequirements[userType];
    const violations = [];
    
    // Vérifier données interdites
    for (const field of requirements.forbidden) {
      if (requestedData[field] !== undefined) {
        violations.push({
          field,
          type: 'forbidden',
          message: `${field} ne peut pas être collecté pour ${userType}`
        });
      }
    }
    
    // Vérifier données non nécessaires
    const allowedFields = [...requirements.required, ...requirements.optional];
    for (const field in requestedData) {
      if (!allowedFields.includes(field)) {
        violations.push({
          field,
          type: 'unnecessary',
          message: `${field} n'est pas nécessaire pour ${userType}`
        });
      }
    }
    
    if (violations.length > 0) {
      throw new DataMinimizationError(violations);
    }
    
    return true;
  }
  
  // Nettoyage automatique
  static scheduleDataCleanup() {
    // Exécution quotidienne
    cron.schedule('0 2 * * *', async () => {
      // Supprimer données expirées
      await this.deleteExpiredData();
      
      // Anonymiser données anciennes
      await this.anonymizeOldData();
      
      // Purger logs
      await this.purgeLogs();
      
      // Rapport de nettoyage
      await this.generateCleanupReport();
    });
  }
}
```

### 2.3 Droits des Utilisateurs
```typescript
// ✅ OBLIGATOIRE - Portail des droits RGPD/CCPA/etc
class UserRightsPortal {
  // Droit d'accès
  async handleAccessRequest(userId: string): Promise<UserDataPackage> {
    // Authentifier la demande
    await this.verifyIdentity(userId);
    
    // Collecter TOUTES les données
    const userData = await this.collectAllUserData(userId);
    
    // Package structuré
    const dataPackage: UserDataPackage = {
      metadata: {
        requestId: crypto.randomUUID(),
        userId: userId,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      
      personalData: userData.personal,
      activityData: userData.activity,
      derivedData: userData.derived,
      sharedWith: userData.shares,
      
      // Format export
      formats: {
        json: await this.generateJSON(userData),
        csv: await this.generateCSV(userData),
        pdf: await this.generatePDF(userData)
      }
    };
    
    // Audit et notification
    await this.auditDataAccess(userId, dataPackage.metadata.requestId);
    
    return dataPackage;
  }
  
  // Droit à l'effacement
  async handleDeletionRequest(userId: string, scope?: DeletionScope): Promise<DeletionResult> {
    // Vérifier obligations légales
    const legalHolds = await this.checkLegalHolds(userId);
    if (legalHolds.length > 0) {
      return {
        status: 'partial',
        deleted: [],
        retained: legalHolds,
        reason: 'Legal retention requirements'
      };
    }
    
    // Stratégie de suppression
    const strategy = scope?.type || 'complete';
    
    switch (strategy) {
      case 'complete':
        // Suppression totale
        await this.deleteUserAccount(userId);
        await this.deleteUserData(userId);
        await this.deleteUserLogs(userId);
        await this.notifyThirdParties(userId, 'delete');
        break;
        
      case 'selective':
        // Suppression sélective
        for (const dataType of scope.dataTypes) {
          await this.deleteSpecificData(userId, dataType);
        }
        break;
        
      case 'anonymize':
        // Anonymisation au lieu de suppression
        await this.anonymizeUser(userId);
        break;
    }
    
    return {
      status: 'complete',
      deleted: ['all'],
      retained: [],
      completedAt: new Date()
    };
  }
  
  // Droit à la portabilité
  async handlePortabilityRequest(userId: string, targetService?: string): Promise<PortableData> {
    const data = await this.collectPortableData(userId);
    
    // Format standard (JSON-LD)
    const portableData = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      identifier: userId,
      
      // Données structurées
      ...this.structureDataForPortability(data),
      
      // Métadonnées
      exportMetadata: {
        exportDate: new Date(),
        dataTypes: Object.keys(data),
        format: 'application/ld+json',
        signature: await this.signData(data)
      }
    };
    
    // Transfert direct si demandé
    if (targetService) {
      await this.initiateDataTransfer(portableData, targetService);
    }
    
    return portableData;
  }
}
```

## 3. MONITORING ET AUDIT

### 3.1 Logging Sécurisé
```javascript
// ✅ OBLIGATOIRE - Logging conforme et sécurisé
const winston = require('winston');
const crypto = require('crypto');

class SecureLogger {
  constructor() {
    // Configuration multi-transport
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      
      defaultMeta: {
        service: process.env.SERVICE_NAME,
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION
      },
      
      transports: [
        // Fichier pour audit trail
        new winston.transports.File({
          filename: 'logs/security-audit.log',
          level: 'info',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 30,
          tailable: true
        }),
        
        // SIEM integration
        new WinstonSyslog({
          host: process.env.SIEM_HOST,
          port: process.env.SIEM_PORT,
          protocol: 'tls',
          facility: 'local0',
          type: 'RFC5424'
        })
      ]
    });
  }
  
  // Log sécurisé avec hash pour intégrité
  async logSecurityEvent(event, metadata = {}) {
    // Sanitize données sensibles
    const sanitized = this.sanitizeLogData(metadata);
    
    // Ajouter contexte sécurité
    const logEntry = {
      eventType: event,
      timestamp: new Date().toISOString(),
      
      // Contexte utilisateur
      user: {
        id: metadata.userId || 'anonymous',
        ip: this.hashIP(metadata.ipAddress),
        userAgent: metadata.userAgent,
        sessionId: metadata.sessionId
      },
      
      // Détails événement
      details: sanitized,
      
      // Chaîne d'intégrité
      previousHash: this.lastHash,
      hash: null
    };
    
    // Calculer hash pour intégrité
    logEntry.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(logEntry))
      .digest('hex');
    
    this.lastHash = logEntry.hash;
    
    // Logger selon criticité
    switch (event) {
      case 'AUTH_FAILURE':
      case 'UNAUTHORIZED_ACCESS':
      case 'DATA_BREACH':
        this.logger.error(logEntry);
        await this.alertSecurityTeam(logEntry);
        break;
        
      case 'LOGIN_SUCCESS':
      case 'DATA_ACCESS':
        this.logger.info(logEntry);
        break;
        
      default:
        this.logger.debug(logEntry);
    }
    
    return logEntry.hash;
  }
  
  // Sanitization des données sensibles
  sanitizeLogData(data) {
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret',
      'creditCard', 'ssn', 'driverLicense',
      'medicalRecord', 'bankAccount'
    ];
    
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    // Masquer données PII
    if (sanitized.email) {
      sanitized.email = this.maskEmail(sanitized.email);
    }
    
    if (sanitized.phone) {
      sanitized.phone = this.maskPhone(sanitized.phone);
    }
    
    return sanitized;
  }
}
```

### 3.2 Monitoring Temps Réel
```typescript
// ✅ OBLIGATOIRE - Monitoring de sécurité
import { MetricRegistry, Counter, Histogram, Meter } from 'metrics';
import { AlertManager } from './alerting';

class SecurityMonitoring {
  private metrics: MetricRegistry;
  private alerts: AlertManager;
  private thresholds: SecurityThresholds;
  
  constructor() {
    this.metrics = new MetricRegistry();
    this.alerts = new AlertManager();
    this.setupMetrics();
    this.setupAlerts();
  }
  
  private setupMetrics() {
    // Métriques d'authentification
    this.metrics.register('auth.attempts', new Counter());
    this.metrics.register('auth.failures', new Counter());
    this.metrics.register('auth.success', new Counter());
    this.metrics.register('auth.mfa.required', new Counter());
    this.metrics.register('auth.mfa.failures', new Counter());
    
    // Métriques d'accès
    this.metrics.register('access.granted', new Counter());
    this.metrics.register('access.denied', new Counter());
    this.metrics.register('access.suspicious', new Counter());
    
    // Métriques de performance
    this.metrics.register('api.latency', new Histogram());
    this.metrics.register('api.errors', new Counter());
    this.metrics.register('api.rate', new Meter());
    
    // Métriques de données
    this.metrics.register('data.encryption.operations', new Counter());
    this.metrics.register('data.access.requests', new Counter());
    this.metrics.register('data.deletion.requests', new Counter());
  }
  
  // Détection d'anomalies
  async detectAnomalies() {
    const rules = [
      {
        name: 'Brute Force Detection',
        condition: () => {
          const failures = this.metrics.getCounter('auth.failures');
          return failures.getCount() > 10 && 
                 failures.getFifteenMinuteRate() > 0.5;
        },
        action: async (incident) => {
          await this.blockIP(incident.sourceIP);
          await this.alerts.critical('Brute force attack detected', incident);
        }
      },
      
      {
        name: 'Data Exfiltration Detection',
        condition: () => {
          const dataAccess = this.metrics.getCounter('data.access.requests');
          return dataAccess.getFifteenMinuteRate() > 100;
        },
        action: async (incident) => {
          await this.revokeUserAccess(incident.userId);
          await this.alerts.critical('Possible data exfiltration', incident);
        }
      },
      
      {
        name: 'Geographic Anomaly',
        condition: async (user) => {
          const lastLocation = await this.getLastLocation(user);
          const currentLocation = await this.getCurrentLocation(user);
          const timeDiff = Date.now() - lastLocation.timestamp;
          const distance = this.calculateDistance(lastLocation, currentLocation);
          
          // Vitesse impossible (> 1000 km/h)
          return (distance / timeDiff) > 1000;
        },
        action: async (incident) => {
          await this.requireMFA(incident.userId);
          await this.alerts.warning('Geographic anomaly detected', incident);
        }
      }
    ];
    
    // Exécuter règles
    for (const rule of rules) {
      if (await rule.condition()) {
        await rule.action(this.createIncident(rule.name));
      }
    }
  }
  
  // Dashboard temps réel
  getSecurityDashboard() {
    return {
      authentication: {
        successRate: this.calculateRate('auth.success', 'auth.attempts'),
        mfaAdoption: this.calculateRate('auth.mfa.required', 'auth.success'),
        failureRate: this.metrics.getCounter('auth.failures').getFifteenMinuteRate()
      },
      
      threats: {
        activeIncidents: this.alerts.getActiveCount(),
        blockedIPs: this.getBlockedIPCount(),
        suspiciousActivity: this.metrics.getCounter('access.suspicious').getCount()
      },
      
      compliance: {
        encryptionRate: 100, // Devrait toujours être 100%
        dataRequests: {
          access: this.metrics.getCounter('data.access.requests').getCount(),
          deletion: this.metrics.getCounter('data.deletion.requests').getCount()
        },
        auditCompleteness: this.calculateAuditCompleteness()
      },
      
      performance: {
        apiLatency: this.metrics.getHistogram('api.latency').getSnapshot().getMedian(),
        errorRate: this.calculateRate('api.errors', 'api.requests'),
        availability: this.calculateUptime()
      }
    };
  }
}
```

## 4. INCIDENT RESPONSE

### 4.1 Plan de Réponse Automatisé
```javascript
// ✅ OBLIGATOIRE - Réponse aux incidents
class IncidentResponsePlan {
  constructor() {
    this.severityLevels = {
      CRITICAL: {
        description: 'Breach confirmé, données exposées',
        responseTime: '15 minutes',
        escalation: ['CISO', 'CEO', 'Legal', 'DPO'],
        actions: ['contain', 'assess', 'notify', 'remediate']
      },
      HIGH: {
        description: 'Tentative de breach, vulnérabilité exploitée',
        responseTime: '1 heure',
        escalation: ['Security Manager', 'IT Director'],
        actions: ['investigate', 'contain', 'patch']
      },
      MEDIUM: {
        description: 'Activité suspecte, vulnérabilité découverte',
        responseTime: '4 heures',
        escalation: ['Security Team Lead'],
        actions: ['monitor', 'investigate', 'mitigate']
      },
      LOW: {
        description: 'Anomalie mineure, faux positif probable',
        responseTime: '24 heures',
        escalation: ['Security Analyst'],
        actions: ['log', 'review', 'update_rules']
      }
    };
  }
  
  async handleIncident(incident) {
    // 1. Classification automatique
    const severity = await this.classifyIncident(incident);
    incident.severity = severity;
    incident.id = this.generateIncidentId();
    
    // 2. Containment immédiat
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      await this.containThreat(incident);
    }
    
    // 3. Notification et escalade
    await this.notifyStakeholders(incident);
    
    // 4. Investigation
    const investigation = await this.investigate(incident);
    
    // 5. Réponse
    const response = await this.executeResponse(incident, investigation);
    
    // 6. Documentation
    await this.documentIncident(incident, investigation, response);
    
    // 7. Post-mortem (si critique)
    if (severity === 'CRITICAL') {
      await this.schedulePostMortem(incident);
    }
    
    return response;
  }
  
  async containThreat(incident) {
    const actions = [];
    
    switch (incident.type) {
      case 'UNAUTHORIZED_ACCESS':
        actions.push(
          this.revokeUserAccess(incident.userId),
          this.terminateActiveSessions(incident.userId),
          this.blockIPAddress(incident.sourceIP)
        );
        break;
        
      case 'DATA_EXFILTRATION':
        actions.push(
          this.blockDataAccess(incident.affectedData),
          this.revokeAPIKeys(incident.suspectKeys),
          this.enableReadOnlyMode()
        );
        break;
        
      case 'MALWARE_DETECTED':
        actions.push(
          this.isolateSystem(incident.affectedSystem),
          this.blockNetworkAccess(incident.affectedSystem),
          this.initiateForensics(incident.affectedSystem)
        );
        break;
    }
    
    await Promise.all(actions);
    
    // Log containment
    await this.auditLog({
      action: 'INCIDENT_CONTAINED',
      incident: incident.id,
      measures: actions.map(a => a.name),
      timestamp: new Date()
    });
  }
  
  // Notification conforme RGPD/etc
  async notifyDataBreach(incident) {
    const assessment = {
      scope: incident.affectedRecords,
      dataTypes: incident.compromisedDataTypes,
      riskLevel: this.assessRiskToIndividuals(incident),
      timeline: {
        discovered: incident.discoveredAt,
        contained: incident.containedAt,
        notificationDeadline: this.calculateDeadline(incident)
      }
    };
    
    // Notification autorités (72h max)
    if (assessment.riskLevel >= 'MEDIUM') {
      await this.notifyAuthorities({
        gdpr: this.notifyCNIL(incident, assessment),
        ccpa: this.notifyCaliforniaAG(incident, assessment),
        canada: this.notifyOPC(incident, assessment),
        // Autres juridictions...
      });
    }
    
    // Notification individus si risque élevé
    if (assessment.riskLevel === 'HIGH') {
      await this.notifyAffectedIndividuals({
        incident: incident,
        template: this.getBreachNotificationTemplate(incident.jurisdiction),
        channels: ['email', 'app_notification', 'postal_mail'],
        languages: this.getRequiredLanguages(incident.affectedUsers)
      });
    }
  }
}
```

## 5. TESTS ET VALIDATION

### 5.1 Tests de Sécurité Automatisés
```javascript
// ✅ OBLIGATOIRE - Suite de tests sécurité
const request = require('supertest');
const { expect } = require('chai');

describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should enforce strong passwords', async () => {
      const weakPasswords = [
        'password123',
        '12345678',
        'qwertyuiop',
        'admin@123',
        'P@ssw0rd' // Trop commun
      ];
      
      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ email: 'test@example.com', password });
          
        expect(res.status).to.equal(400);
        expect(res.body.error).to.include('password');
      }
    });
    
    it('should rate limit login attempts', async () => {
      const attempts = [];
      
      // 10 tentatives rapides
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' })
        );
      }
      
      const results = await Promise.all(attempts);
      const blocked = results.filter(r => r.status === 429);
      
      expect(blocked.length).to.be.greaterThan(0);
    });
    
    it('should require MFA for sensitive operations', async () => {
      const token = await getAuthToken();
      
      const res = await request(app)
        .post('/api/user/delete-account')
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).to.equal(403);
      expect(res.body.mfaRequired).to.be.true;
    });
  });
  
  describe('Data Protection', () => {
    it('should encrypt sensitive data at rest', async () => {
      // Créer utilisateur
      const user = await createTestUser();
      
      // Vérifier en base
      const dbUser = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [user.id]
      );
      
      // Données sensibles chiffrées
      expect(dbUser.ssn).to.not.equal(user.ssn);
      expect(dbUser.creditCard).to.not.equal(user.creditCard);
      expect(dbUser.ssn).to.match(/^encrypted:/);
    });
    
    it('should use HTTPS for all endpoints', async () => {
      const endpoints = [
        '/api/auth/login',
        '/api/user/profile',
        '/api/payment/process'
      ];
      
      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(endpoint)
          .set('X-Forwarded-Proto', 'http');
          
        expect(res.status).to.equal(301);
        expect(res.headers.location).to.include('https://');
      }
    });
  });
  
  describe('Input Validation', () => {
    it('should prevent SQL injection', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "1; DROP TABLE users; --",
        "admin'--",
        "1' UNION SELECT * FROM users--"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        const res = await request(app)
          .get(`/api/search?q=${encodeURIComponent(payload)}`);
          
        expect(res.status).to.not.equal(500);
        expect(res.body).to.not.include('SQL');
      }
    });
    
    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(document.cookie)',
        '<svg onload=alert(1)>'
      ];
      
      for (const payload of xssPayloads) {
        const res = await request(app)
          .post('/api/comments')
          .send({ content: payload });
          
        const saved = await getComment(res.body.id);
        expect(saved.content).to.not.include('<script>');
        expect(saved.content).to.not.include('javascript:');
      }
    });
  });
});

// Tests de conformité RGPD
describe('GDPR Compliance', () => {
  it('should allow data export within 30 days', async () => {
    const userId = await createTestUser();
    
    const res = await request(app)
      .post('/api/privacy/export')
      .set('Authorization', `Bearer ${getToken(userId)}`);
      
    expect(res.status).to.equal(202);
    expect(res.body.estimatedTime).to.be.lessThan(30 * 24 * 60 * 60 * 1000);
  });
  
  it('should allow complete data deletion', async () => {
    const userId = await createTestUser();
    
    const res = await request(app)
      .delete('/api/privacy/delete-me')
      .set('Authorization', `Bearer ${getToken(userId)}`);
      
    expect(res.status).to.equal(200);
    
    // Vérifier suppression
    const userData = await findUserData(userId);
    expect(userData).to.be.null;
  });
});
```

## CHECKLIST D'IMPLÉMENTATION

```yaml
checklist_technique:
  ✅ SÉCURITÉ:
    - [ ] Chiffrement AES-256-GCM implémenté
    - [ ] TLS 1.3 configuré
    - [ ] MFA disponible pour tous
    - [ ] Tokens JWT sécurisés
    - [ ] Rate limiting activé
    - [ ] WAF configuré
    - [ ] Validation entrées stricte
    - [ ] Tests sécurité automatisés
  
  ✅ PRIVACY:
    - [ ] Consentement implémenté
    - [ ] Minimisation données respectée
    - [ ] Droits utilisateurs fonctionnels
    - [ ] Anonymisation disponible
    - [ ] Retention automatique
    - [ ] Audit trail complet
  
  ✅ MONITORING:
    - [ ] Logs sécurisés
    - [ ] SIEM intégré
    - [ ] Alertes configurées
    - [ ] Dashboard temps réel
    - [ ] Détection anomalies
  
  ✅ COMPLIANCE:
    - [ ] Tests WCAG AA passés
    - [ ] Documentation à jour
    - [ ] Incident response testé
    - [ ] Backup vérifié
    - [ ] DR plan validé

validation:
  automated:
    - Run security scanner
    - Check dependencies
    - Validate configs
    - Test all endpoints
  
  manual:
    - Code review sécurité
    - Pentest trimestriel
    - Audit conformité
    - Formation équipe
```

---

**🔧 RAPPEL : Ce guide doit être appliqué SYSTÉMATIQUEMENT. Aucune exception n'est permise. La sécurité et la conformité ne sont pas négociables.**