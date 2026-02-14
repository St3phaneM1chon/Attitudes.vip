# 🔐 Règles de Protection des Données

## 🚨 CRITIQUES - Non-négociables

### 1. Chiffrement Obligatoire

#### Au repos (Base de données)
```sql
-- ✅ OBLIGATOIRE pour données sensibles
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) ENCRYPTED,
  ssn VARCHAR(255) ENCRYPTED USING AES256,
  credit_card BYTEA ENCRYPTED
);
```

#### En transit
- ✅ **TLS 1.3** minimum pour toutes les communications
- ✅ **HTTPS** obligatoire (HSTS activé)
- ✅ **Certificats** : Let's Encrypt ou mieux

### 2. Données Personnelles (PII)

#### Jamais en clair
```javascript
// ❌ INTERDIT
console.log(`User email: ${user.email}`);
localStorage.setItem('ssn', user.ssn);

// ✅ OBLIGATOIRE
console.log(`User: ${user.id}`);
sessionStorage.setItem('token', encryptedToken);
```

#### Masquage obligatoire
```javascript
// Fonction OBLIGATOIRE pour logs
function maskPII(data) {
  return {
    email: data.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    phone: data.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-****'),
    ssn: '***-**-' + data.ssn.slice(-4)
  };
}
```

### 3. Stockage Sécurisé

#### Base de données
- ✅ Chiffrement transparent (TDE)
- ✅ Backups chiffrés
- ✅ Rotation des clés tous les 90 jours

#### Fichiers
```javascript
// ✅ OBLIGATOIRE pour fichiers uploadés
const encryptFile = async (file) => {
  const key = await generateKey();
  const encrypted = await crypto.encrypt(file, key);
  await secureKeyStorage.store(file.id, key);
  return encrypted;
};
```

### 4. Accès aux Données

#### Principe du moindre privilège
```javascript
// ✅ OBLIGATOIRE - Vérification des permissions
async function getUserData(requesterId, targetUserId) {
  const permissions = await checkPermissions(requesterId, targetUserId);
  
  if (!permissions.canRead) {
    throw new ForbiddenError('Access denied');
  }
  
  // Retourner seulement les champs autorisés
  return filterFields(userData, permissions.allowedFields);
}
```

#### Audit Trail
```javascript
// ✅ OBLIGATOIRE pour toute lecture de données sensibles
await auditLog.record({
  action: 'READ_USER_DATA',
  actor: requesterId,
  target: targetUserId,
  timestamp: new Date(),
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

### 5. Durée de Conservation

```javascript
// ✅ OBLIGATOIRE - Suppression automatique
const dataRetentionPolicy = {
  userLogs: 90,        // jours
  tempFiles: 24,       // heures
  backups: 365,        // jours
  auditLogs: 2555,     // jours (7 ans)
  
  // Données anonymisées après
  analytics: 730       // jours (2 ans)
};
```

### 6. Anonymisation

```javascript
// ✅ OBLIGATOIRE pour analytics
function anonymizeUser(user) {
  return {
    id: hash(user.id + SALT),
    age: Math.floor(user.age / 5) * 5, // Tranches de 5 ans
    country: user.country,
    // PAS d'email, nom, adresse, etc.
  };
}
```

### 7. Droit à l'Oubli (RGPD)

```javascript
// ✅ OBLIGATOIRE - Suppression complète
async function deleteUserCompletely(userId) {
  await db.transaction(async (trx) => {
    // 1. Anonymiser les données historiques
    await trx('orders').where({ userId }).update({ 
      userId: 'DELETED_USER',
      customerData: null 
    });
    
    // 2. Supprimer les données personnelles
    await trx('users').where({ id: userId }).delete();
    await trx('user_profiles').where({ userId }).delete();
    
    // 3. Purger les caches
    await redis.del(`user:${userId}:*`);
    
    // 4. Logger la suppression
    await auditLog.recordDeletion(userId);
  });
}
```

### 8. Partage de Données

```javascript
// ✅ OBLIGATOIRE - Consentement explicite
async function shareDataWithThirdParty(userId, thirdPartyId, dataTypes) {
  // 1. Vérifier le consentement
  const consent = await getConsent(userId, thirdPartyId, dataTypes);
  if (!consent.granted) {
    throw new Error('No consent for data sharing');
  }
  
  // 2. Logger le partage
  await dataShareLog.record({
    userId,
    thirdPartyId,
    dataTypes,
    consentId: consent.id,
    timestamp: new Date()
  });
  
  // 3. Partager seulement les données autorisées
  return filterDataByConsent(userData, consent);
}
```

### 9. Sécurité des Tokens

```javascript
// ✅ OBLIGATOIRE
const tokenConfig = {
  access: {
    expiresIn: '15m',
    algorithm: 'RS256'
  },
  refresh: {
    expiresIn: '7d',
    rotate: true
  },
  passwordReset: {
    expiresIn: '1h',
    singleUse: true
  }
};
```

### 10. Monitoring et Alertes

```javascript
// ✅ OBLIGATOIRE - Détection d'anomalies
const securityMonitor = {
  maxLoginAttempts: 5,
  unusualAccessPatterns: true,
  dataExfiltration: {
    maxRecordsPerMinute: 100,
    alertThreshold: 1000
  }
};
```

## 📋 Checklist de Conformité

- [ ] Toutes les PII sont chiffrées
- [ ] Aucun log ne contient de données sensibles
- [ ] Les tokens expirent correctement
- [ ] L'audit trail est complet
- [ ] Les backups sont chiffrés
- [ ] La suppression RGPD fonctionne
- [ ] Les consentements sont trackés
- [ ] Les accès sont limités par rôle

## 🚨 Violations

Toute violation entraîne :
1. **Blocage immédiat** du déploiement
2. **Audit de sécurité** obligatoire
3. **Notification** aux autorités si breach
4. **Amendes** potentielles (RGPD: 4% CA)