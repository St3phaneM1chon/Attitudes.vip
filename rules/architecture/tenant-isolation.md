# 🏢 Isolation Multi-Tenant - Règles Critiques

## 🎯 Principe Fondamental

**ISOLATION ABSOLUE ENTRE TENANTS**

Aucune donnée, configuration ou ressource ne doit être partagée entre les tenants sans autorisation explicite.

## 🗄️ Isolation Base de Données

### ✅ OBLIGATOIRE - Row Level Security (RLS)
```sql
-- Politique RLS obligatoire sur TOUTES les tables
CREATE POLICY tenant_isolation ON wedding_events
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant_id')::uuid
);

-- Fonction pour définir le tenant courant
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_uuid uuid) 
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

-- Trigger automatique pour injecter tenant_id
CREATE OR REPLACE FUNCTION inject_tenant_id()
RETURNS trigger AS $$
BEGIN
  NEW.tenant_id := current_setting('app.current_tenant_id')::uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer sur toutes les tables multi-tenant
CREATE TRIGGER inject_tenant_id_trigger
  BEFORE INSERT ON wedding_events
  FOR EACH ROW EXECUTE FUNCTION inject_tenant_id();
```

### ✅ OBLIGATOIRE - Validation Tenant ID
```javascript
// Middleware obligatoire pour définir le tenant
const tenantMiddleware = async (req, res, next) => {
  try {
    // 1. Extraire le tenant ID du token JWT
    const token = req.headers.authorization?.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // 2. Valider que l'utilisateur appartient au tenant
    const userTenant = await validateUserTenant(payload.sub, payload.tenant_id);
    if (!userTenant) {
      throw new Error('User does not belong to tenant');
    }
    
    // 3. Définir le tenant dans la session DB
    await db.query('SELECT set_current_tenant($1)', [payload.tenant_id]);
    
    // 4. Ajouter au contexte de la requête
    req.tenant = {
      id: payload.tenant_id,
      slug: userTenant.slug,
      config: userTenant.config
    };
    
    next();
    
  } catch (error) {
    res.status(403).json({ 
      error: 'Tenant isolation violation',
      message: 'Access denied' 
    });
  }
};

// Valider appartenance utilisateur-tenant
async function validateUserTenant(userId, tenantId) {
  const result = await db.query(`
    SELECT t.*, ut.role, ut.permissions
    FROM tenants t
    JOIN user_tenants ut ON t.id = ut.tenant_id
    WHERE t.id = $1 AND ut.user_id = $2 AND t.active = true
  `, [tenantId, userId]);
  
  return result.rows[0] || null;
}
```

## 🔒 Isolation des Ressources

### ✅ OBLIGATOIRE - Namespace par Tenant
```javascript
// Système de namespace automatique
const tenantNamespace = {
  // Storage (S3/MinIO)
  storage: {
    getBucket: (tenantId, resourceType) => {
      return `tenant-${tenantId}-${resourceType}`;
    },
    
    getPath: (tenantId, resourceId, filename) => {
      return `${tenantId}/${resourceId}/${filename}`;
    }
  },
  
  // Cache Redis
  cache: {
    getKey: (tenantId, key) => {
      return `tenant:${tenantId}:${key}`;
    }
  },
  
  // Queues (Bull/BullMQ)
  queue: {
    getName: (tenantId, queueType) => {
      return `tenant-${tenantId}-${queueType}`;
    }
  },
  
  // WebSockets
  websocket: {
    getRoom: (tenantId, eventId) => {
      return `tenant:${tenantId}:event:${eventId}`;
    }
  }
};

// Service d'upload avec isolation
class TenantFileService {
  async uploadFile(tenantId, file, resourceId) {
    // Vérifier quota tenant
    await this.checkQuota(tenantId, file.size);
    
    const bucket = tenantNamespace.storage.getBucket(tenantId, 'uploads');
    const path = tenantNamespace.storage.getPath(tenantId, resourceId, file.name);
    
    // Upload avec métadonnées tenant
    const result = await s3.upload({
      Bucket: bucket,
      Key: path,
      Body: file.buffer,
      Metadata: {
        tenant_id: tenantId,
        resource_id: resourceId,
        uploaded_by: req.user.id
      }
    });
    
    // Logger pour audit
    await auditLog.record({
      event: 'FILE_UPLOADED',
      tenantId,
      resourceId,
      fileSize: file.size,
      fileName: file.name
    });
    
    return result;
  }
  
  async getFile(tenantId, resourceId, filename) {
    const bucket = tenantNamespace.storage.getBucket(tenantId, 'uploads');
    const path = tenantNamespace.storage.getPath(tenantId, resourceId, filename);
    
    // Vérifier propriété
    const metadata = await s3.headObject({ Bucket: bucket, Key: path });
    if (metadata.Metadata.tenant_id !== tenantId) {
      throw new Error('Tenant isolation violation');
    }
    
    return s3.getObject({ Bucket: bucket, Key: path });
  }
}
```

## 🎨 Personnalisation Tenant

### ✅ OBLIGATOIRE - Configuration Isolée
```javascript
// Configuration par tenant avec validation
class TenantConfigService {
  constructor() {
    this.defaultConfig = {
      branding: {
        primary_color: '#3B82F6',
        secondary_color: '#10B981',
        logo_url: null,
        favicon_url: null
      },
      features: {
        advanced_analytics: false,
        white_label: false,
        custom_domain: false,
        api_access: false
      },
      limits: {
        max_events: 10,
        max_guests_per_event: 200,
        max_vendors: 5,
        storage_gb: 1
      },
      integrations: {
        stripe_connect: false,
        google_calendar: false,
        mailchimp: false
      }
    };
  }
  
  async getTenantConfig(tenantId) {
    // Cache avec namespace tenant
    const cacheKey = tenantNamespace.cache.getKey(tenantId, 'config');
    let config = await redis.get(cacheKey);
    
    if (!config) {
      const result = await db.query(`
        SELECT config FROM tenants WHERE id = $1
      `, [tenantId]);
      
      config = { 
        ...this.defaultConfig, 
        ...result.rows[0]?.config 
      };
      
      await redis.setex(cacheKey, 3600, JSON.stringify(config));
    } else {
      config = JSON.parse(config);
    }
    
    return config;
  }
  
  async updateTenantConfig(tenantId, updates) {
    // Valider les limites du plan
    const tenant = await this.getTenant(tenantId);
    const allowedUpdates = this.validateConfigUpdates(tenant.plan, updates);
    
    // Mettre à jour avec validation
    const newConfig = await db.query(`
      UPDATE tenants 
      SET 
        config = config || $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING config
    `, [tenantId, JSON.stringify(allowedUpdates)]);
    
    // Invalider le cache
    const cacheKey = tenantNamespace.cache.getKey(tenantId, 'config');
    await redis.del(cacheKey);
    
    return newConfig.rows[0].config;
  }
  
  validateConfigUpdates(plan, updates) {
    const planLimits = {
      basic: {
        branding: false,
        white_label: false,
        custom_domain: false
      },
      premium: {
        branding: true,
        white_label: false,
        custom_domain: false
      },
      enterprise: {
        branding: true,
        white_label: true,
        custom_domain: true
      }
    };
    
    const allowed = planLimits[plan];
    const filtered = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowed[key] === true) {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }
}
```

## 🌐 Domaines et Routage

### ✅ OBLIGATOIRE - Isolation par Domaine
```javascript
// Middleware de résolution tenant par domaine
const domainTenantResolver = async (req, res, next) => {
  const host = req.get('Host');
  const subdomain = host.split('.')[0];
  
  try {
    let tenant;
    
    // 1. Domaine personnalisé
    if (await isCustomDomain(host)) {
      tenant = await getTenantByCustomDomain(host);
    }
    // 2. Sous-domaine
    else if (subdomain !== 'www' && subdomain !== 'api') {
      tenant = await getTenantBySlug(subdomain);
    }
    // 3. Header tenant (pour API)
    else if (req.headers['x-tenant-id']) {
      tenant = await getTenantById(req.headers['x-tenant-id']);
    }
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    if (!tenant.active) {
      return res.status(403).json({ error: 'Tenant suspended' });
    }
    
    // Injecter dans le contexte
    req.tenant = tenant;
    res.locals.tenant = tenant;
    
    next();
    
  } catch (error) {
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
};

// DNS et certificats SSL automatiques
class TenantDomainService {
  async setupCustomDomain(tenantId, domain) {
    // 1. Valider le domaine
    if (!this.isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }
    
    // 2. Vérifier disponibilité
    const existing = await this.isDomainTaken(domain);
    if (existing) {
      throw new Error('Domain already in use');
    }
    
    // 3. Configurer DNS (Cloudflare API)
    await this.createDNSRecord(domain);
    
    // 4. Générer certificat SSL (Let's Encrypt)
    await this.generateSSLCert(domain);
    
    // 5. Mettre à jour configuration tenant
    await db.query(`
      UPDATE tenants 
      SET custom_domain = $2, ssl_cert_status = 'pending'
      WHERE id = $1
    `, [tenantId, domain]);
    
    // 6. Programmer vérification SSL
    await this.scheduleSSLVerification(tenantId, domain);
  }
  
  async createDNSRecord(domain) {
    const cloudflare = new CloudflareAPI();
    
    return cloudflare.dns.create({
      type: 'CNAME',
      name: domain,
      content: 'attitudes.vip',
      ttl: 300
    });
  }
}
```

## 📊 Métriques et Quotas

### ✅ OBLIGATOIRE - Surveillance par Tenant
```javascript
// Système de quotas en temps réel
class TenantQuotaService {
  constructor() {
    this.quotaKeys = [
      'api_requests_per_hour',
      'storage_used_bytes',
      'events_created',
      'guests_total',
      'vendors_total'
    ];
  }
  
  async checkQuota(tenantId, quotaType, increment = 1) {
    const config = await tenantConfigService.getTenantConfig(tenantId);
    const limit = config.limits[quotaType];
    
    if (!limit) return true;
    
    const current = await this.getCurrentUsage(tenantId, quotaType);
    
    if (current + increment > limit) {
      // Logger violation
      await auditLog.record({
        event: 'QUOTA_EXCEEDED',
        tenantId,
        quotaType,
        current,
        limit,
        attempted: increment
      });
      
      throw new QuotaExceededError(quotaType, current, limit);
    }
    
    return true;
  }
  
  async incrementUsage(tenantId, quotaType, amount = 1) {
    const key = tenantNamespace.cache.getKey(tenantId, `usage:${quotaType}`);
    const current = await redis.incrby(key, amount);
    
    // Expiration basée sur le type de quota
    const ttl = this.getQuotaTTL(quotaType);
    await redis.expire(key, ttl);
    
    return current;
  }
  
  async getCurrentUsage(tenantId, quotaType) {
    const key = tenantNamespace.cache.getKey(tenantId, `usage:${quotaType}`);
    const usage = await redis.get(key);
    return parseInt(usage) || 0;
  }
  
  getQuotaTTL(quotaType) {
    const ttls = {
      api_requests_per_hour: 3600,
      storage_used_bytes: 86400,    // 24h
      events_created: 2592000,      // 30 jours
      guests_total: 86400,
      vendors_total: 86400
    };
    
    return ttls[quotaType] || 3600;
  }
}

// Middleware de vérification quota
const quotaMiddleware = (quotaType) => {
  return async (req, res, next) => {
    try {
      await quotaService.checkQuota(req.tenant.id, quotaType);
      
      // Incrémenter après succès
      req.on('finish', () => {
        if (res.statusCode < 400) {
          quotaService.incrementUsage(req.tenant.id, quotaType);
        }
      });
      
      next();
      
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        res.status(429).json({
          error: 'Quota exceeded',
          quotaType: error.quotaType,
          current: error.current,
          limit: error.limit
        });
      } else {
        next(error);
      }
    }
  };
};
```

## 🔍 Audit et Compliance

### ✅ OBLIGATOIRE - Traçabilité Multi-Tenant
```javascript
// Audit spécialisé multi-tenant
class TenantAuditService {
  async logTenantEvent(tenantId, event, data) {
    const auditEntry = {
      id: uuidv4(),
      tenant_id: tenantId,
      timestamp: new Date().toISOString(),
      event_type: event,
      user_id: data.userId,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      action: data.action,
      details: data.details,
      ip_address: data.ip,
      user_agent: data.userAgent,
      
      // Empreinte pour détection de modification
      checksum: this.generateChecksum(tenantId, event, data)
    };
    
    // Stockage dans table partitionnée par tenant
    await db.query(`
      INSERT INTO audit_logs_${this.getTenantPartition(tenantId)} 
      (${Object.keys(auditEntry).join(', ')})
      VALUES (${Object.keys(auditEntry).map((_, i) => `$${i + 1}`).join(', ')})
    `, Object.values(auditEntry));
    
    // Stream temps réel pour SIEM
    await this.streamToSIEM(auditEntry);
  }
  
  async getTenantAuditLogs(tenantId, filters = {}) {
    // Sécurité: seuls les logs du tenant demandé
    const query = `
      SELECT * FROM audit_logs_${this.getTenantPartition(tenantId)}
      WHERE tenant_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
      ORDER BY timestamp DESC
      LIMIT $4
    `;
    
    const params = [
      tenantId,
      filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      filters.endDate || new Date(),
      filters.limit || 1000
    ];
    
    const result = await db.query(query, params);
    return result.rows;
  }
  
  // Partitioning pour performance
  getTenantPartition(tenantId) {
    const hash = crypto.createHash('md5').update(tenantId).digest('hex');
    const partition = parseInt(hash.substring(0, 2), 16) % 16;
    return partition.toString().padStart(2, '0');
  }
}
```

## 🧪 Tests d'Isolation

### ✅ OBLIGATOIRE - Tests Automatisés
```javascript
// Suite de tests d'isolation multi-tenant
describe('Tenant Isolation', () => {
  let tenant1, tenant2, user1, user2;
  
  beforeEach(async () => {
    tenant1 = await createTestTenant('tenant1');
    tenant2 = await createTestTenant('tenant2');
    user1 = await createTestUser(tenant1.id);
    user2 = await createTestUser(tenant2.id);
  });
  
  describe('Data Isolation', () => {
    it('should not allow cross-tenant data access', async () => {
      // Créer une ressource dans tenant1
      const event1 = await createWeddingEvent(tenant1.id, user1.id);
      
      // Tenter d'accéder depuis tenant2
      const token2 = generateJWT(user2.id, tenant2.id);
      const response = await request(app)
        .get(`/api/events/${event1.id}`)
        .set('Authorization', `Bearer ${token2}`);
      
      expect(response.status).toBe(404);
    });
    
    it('should enforce RLS at database level', async () => {
      await db.query('SELECT set_current_tenant($1)', [tenant1.id]);
      const events1 = await db.query('SELECT * FROM wedding_events');
      
      await db.query('SELECT set_current_tenant($1)', [tenant2.id]);
      const events2 = await db.query('SELECT * FROM wedding_events');
      
      // Les résultats doivent être différents
      const ids1 = events1.rows.map(e => e.id);
      const ids2 = events2.rows.map(e => e.id);
      
      expect(intersection(ids1, ids2)).toHaveLength(0);
    });
  });
  
  describe('Resource Isolation', () => {
    it('should use different storage buckets', () => {
      const bucket1 = tenantNamespace.storage.getBucket(tenant1.id, 'uploads');
      const bucket2 = tenantNamespace.storage.getBucket(tenant2.id, 'uploads');
      
      expect(bucket1).not.toBe(bucket2);
      expect(bucket1).toContain(tenant1.id);
      expect(bucket2).toContain(tenant2.id);
    });
    
    it('should use different cache namespaces', () => {
      const key1 = tenantNamespace.cache.getKey(tenant1.id, 'test');
      const key2 = tenantNamespace.cache.getKey(tenant2.id, 'test');
      
      expect(key1).not.toBe(key2);
      expect(key1).toContain(tenant1.id);
      expect(key2).toContain(tenant2.id);
    });
  });
  
  describe('Configuration Isolation', () => {
    it('should have separate configurations', async () => {
      await tenantConfigService.updateTenantConfig(tenant1.id, {
        branding: { primary_color: '#FF0000' }
      });
      
      const config1 = await tenantConfigService.getTenantConfig(tenant1.id);
      const config2 = await tenantConfigService.getTenantConfig(tenant2.id);
      
      expect(config1.branding.primary_color).toBe('#FF0000');
      expect(config2.branding.primary_color).not.toBe('#FF0000');
    });
  });
});
```

## 📋 Checklist Isolation Tenant

### Base de Données
- [ ] RLS activé sur toutes les tables
- [ ] Triggers d'injection tenant_id
- [ ] Validation tenant dans requêtes
- [ ] Partitioning pour performance

### Ressources
- [ ] Namespacing storage par tenant
- [ ] Cache Redis isolé
- [ ] Queues séparées
- [ ] WebSocket rooms isolées

### Configuration
- [ ] Config par tenant validée
- [ ] Limites par plan appliquées
- [ ] Personnalisation sécurisée
- [ ] Cache invalidation correct

### Domaines et Routage
- [ ] Résolution tenant par domaine
- [ ] Support domaines personnalisés
- [ ] Certificats SSL automatiques
- [ ] Redirection correcte

### Métriques et Quotas
- [ ] Quotas en temps réel
- [ ] Surveillance par tenant
- [ ] Alertes sur dépassement
- [ ] Facturation basée usage

### Audit et Compliance
- [ ] Logs isolés par tenant
- [ ] Partitioning audit
- [ ] Traçabilité complète
- [ ] Export données tenant

---

**L'isolation multi-tenant est la fondation de la confiance!** 🏢