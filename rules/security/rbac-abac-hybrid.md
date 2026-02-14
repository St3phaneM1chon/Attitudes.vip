# 🛡️ Système RBAC-ABAC Hybride - Permissions Avancées

## 🎯 Architecture Hybride

**RBAC (Role-Based) + ABAC (Attribute-Based) = Contrôle Total**

Combine la simplicité des rôles avec la flexibilité des attributs pour un contrôle d'accès ultra-granulaire.

## 🏗️ Structure des Permissions

### ✅ OBLIGATOIRE - Modèle de Données
```sql
-- Table des rôles (RBAC)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  tenant_id UUID REFERENCES tenants(id),
  is_system_role BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des attributs (ABAC)
CREATE TABLE attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- string, number, boolean, array, object
  category VARCHAR(50) NOT NULL, -- user, resource, environment, action
  required BOOLEAN DEFAULT false,
  validation_rules JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des politiques (ABAC)
CREATE TABLE access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  tenant_id UUID REFERENCES tenants(id),
  effect VARCHAR(10) CHECK (effect IN ('allow', 'deny')),
  priority INTEGER DEFAULT 100,
  conditions JSONB NOT NULL,
  resource_pattern VARCHAR(500),
  actions JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Association utilisateur-rôles avec contexte
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID REFERENCES roles(id),
  tenant_id UUID REFERENCES tenants(id),
  context JSONB DEFAULT '{}', -- Contexte spécifique (ex: événement)
  active BOOLEAN DEFAULT true,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Attributs utilisateur
CREATE TABLE user_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  attribute_name VARCHAR(100) NOT NULL,
  attribute_value JSONB NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ✅ OBLIGATOIRE - Rôles Système AttitudesFramework
```javascript
// Définition des rôles métier
const systemRoles = {
  // Rôles administratifs
  'system:admin': {
    name: 'Administrateur Système',
    permissions: ['*'],
    tenant_scope: 'all',
    immutable: true
  },
  
  'tenant:admin': {
    name: 'Administrateur Tenant',
    permissions: [
      'tenant:read', 'tenant:write', 'tenant:config',
      'users:read', 'users:write', 'users:invite',
      'roles:read', 'roles:write',
      'events:read', 'events:write', 'events:delete'
    ],
    tenant_scope: 'own'
  },
  
  // Rôles mariage
  'wedding:planner': {
    name: 'Wedding Planner',
    permissions: [
      'events:read', 'events:write',
      'guests:read', 'guests:write',
      'vendors:read', 'vendors:coordinate',
      'timeline:read', 'timeline:write',
      'budget:read', 'budget:write'
    ],
    attributes_required: ['certified_planner']
  },
  
  'couple:owner': {
    name: 'Couple Propriétaire',
    permissions: [
      'events:read', 'events:write',
      'guests:read', 'guests:write',
      'vendors:read',
      'budget:read', 'budget:write',
      'photos:upload', 'photos:organize'
    ]
  },
  
  'couple:partner': {
    name: 'Partenaire Couple',
    permissions: [
      'events:read',
      'guests:read', 'guests:write',
      'vendors:read',
      'budget:read',
      'photos:upload'
    ]
  },
  
  // Rôles fournisseurs
  'vendor:dj': {
    name: 'DJ',
    permissions: [
      'events:read',
      'music:read', 'music:write',
      'timeline:read',
      'guests:read',
      'announcements:create'
    ],
    tablet_interface: true
  },
  
  'vendor:photographer': {
    name: 'Photographe',
    permissions: [
      'events:read',
      'photos:upload', 'photos:organize',
      'albums:create', 'albums:manage',
      'timeline:read'
    ]
  },
  
  'vendor:caterer': {
    name: 'Traiteur',
    permissions: [
      'events:read',
      'guests:read',
      'menu:read', 'menu:write',
      'allergies:read',
      'seating:read'
    ]
  },
  
  // Rôles invités
  'guest:vip': {
    name: 'Invité VIP',
    permissions: [
      'events:read',
      'rsvp:write',
      'photos:upload', 'photos:view',
      'guestbook:write',
      'games:participate',
      'music:request'
    ],
    special_features: ['priority_support', 'exclusive_content']
  },
  
  'guest:standard': {
    name: 'Invité Standard',
    permissions: [
      'events:read',
      'rsvp:write',
      'photos:upload',
      'guestbook:write',
      'games:participate',
      'music:request'
    ]
  }
};
```

## 🔄 Moteur de Décision Hybride

### ✅ OBLIGATOIRE - Engine d'Évaluation
```javascript
class HybridAccessEngine {
  constructor() {
    this.rbacEngine = new RBACEngine();
    this.abacEngine = new ABACEngine();
    this.cache = new PermissionCache();
  }
  
  async checkAccess(request) {
    const {
      userId,
      tenantId,
      resource,
      action,
      context = {}
    } = request;
    
    // 1. Vérifier cache
    const cacheKey = this.generateCacheKey(userId, resource, action, context);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached.result;
    }
    
    // 2. Évaluation RBAC (base)
    const rbacResult = await this.rbacEngine.evaluate({
      userId,
      tenantId,
      resource,
      action
    });
    
    // 3. Évaluation ABAC (affinement)
    const abacResult = await this.abacEngine.evaluate({
      userId,
      tenantId,
      resource,
      action,
      context,
      userAttributes: await this.getUserAttributes(userId, tenantId),
      resourceAttributes: await this.getResourceAttributes(resource),
      environmentAttributes: this.getEnvironmentAttributes(context)
    });
    
    // 4. Combinaison des résultats
    const finalDecision = this.combineResults(rbacResult, abacResult);
    
    // 5. Cache du résultat
    await this.cache.set(cacheKey, {
      result: finalDecision,
      ttl: this.getDecisionTTL(finalDecision)
    });
    
    // 6. Audit
    await this.auditDecision({
      userId,
      tenantId,
      resource,
      action,
      rbacResult,
      abacResult,
      finalDecision,
      context
    });
    
    return finalDecision;
  }
  
  combineResults(rbacResult, abacResult) {
    // Règles de combinaison
    if (rbacResult.effect === 'deny' || abacResult.effect === 'deny') {
      return {
        allowed: false,
        effect: 'deny',
        reason: 'Explicit deny rule',
        details: {
          rbac: rbacResult,
          abac: abacResult
        }
      };
    }
    
    if (rbacResult.allowed && abacResult.allowed) {
      return {
        allowed: true,
        effect: 'allow',
        conditions: [...(rbacResult.conditions || []), ...(abacResult.conditions || [])],
        details: {
          rbac: rbacResult,
          abac: abacResult
        }
      };
    }
    
    return {
      allowed: false,
      effect: 'deny',
      reason: 'No explicit allow',
      details: {
        rbac: rbacResult,
        abac: abacResult
      }
    };
  }
}
```

### ✅ OBLIGATOIRE - Moteur RBAC
```javascript
class RBACEngine {
  async evaluate({ userId, tenantId, resource, action }) {
    // 1. Récupérer rôles utilisateur
    const userRoles = await this.getUserRoles(userId, tenantId);
    
    // 2. Évaluer permissions pour chaque rôle
    const rolePermissions = [];
    
    for (const userRole of userRoles) {
      const role = await this.getRole(userRole.role_id);
      
      // Vérifier expiration
      if (userRole.expires_at && new Date(userRole.expires_at) < new Date()) {
        continue;
      }
      
      // Vérifier contexte si spécifié
      if (userRole.context && !this.matchContext(userRole.context, resource)) {
        continue;
      }
      
      // Évaluer permissions du rôle
      const hasPermission = await this.checkRolePermission(
        role,
        resource,
        action
      );
      
      if (hasPermission) {
        rolePermissions.push({
          role: role.name,
          permission: `${resource}:${action}`,
          context: userRole.context
        });
      }
    }
    
    return {
      allowed: rolePermissions.length > 0,
      effect: rolePermissions.length > 0 ? 'allow' : 'neutral',
      matchedRoles: rolePermissions,
      evaluatedAt: new Date()
    };
  }
  
  async checkRolePermission(role, resource, action) {
    const requiredPermission = `${resource}:${action}`;
    
    // Vérifier permissions explicites
    if (role.permissions.includes(requiredPermission)) {
      return true;
    }
    
    // Vérifier permissions wildcard
    if (role.permissions.includes(`${resource}:*`)) {
      return true;
    }
    
    // Vérifier permissions globales
    if (role.permissions.includes('*')) {
      return true;
    }
    
    // Vérifier permissions hiérarchiques
    const hierarchy = this.getPermissionHierarchy(requiredPermission);
    for (const parentPermission of hierarchy) {
      if (role.permissions.includes(parentPermission)) {
        return true;
      }
    }
    
    return false;
  }
  
  getPermissionHierarchy(permission) {
    // Exemple: 'events:guests:write' -> ['events:guests:*', 'events:*']
    const parts = permission.split(':');
    const hierarchy = [];
    
    for (let i = parts.length - 1; i > 0; i--) {
      const parentParts = parts.slice(0, i);
      hierarchy.push([...parentParts, '*'].join(':'));
    }
    
    return hierarchy;
  }
}
```

### ✅ OBLIGATOIRE - Moteur ABAC
```javascript
class ABACEngine {
  async evaluate(request) {
    const {
      userId,
      tenantId,
      resource,
      action,
      context,
      userAttributes,
      resourceAttributes,
      environmentAttributes
    } = request;
    
    // 1. Récupérer politiques applicables
    const policies = await this.getApplicablePolicies(
      tenantId,
      resource,
      action
    );
    
    // 2. Évaluer chaque politique
    const evaluationResults = [];
    
    for (const policy of policies) {
      const result = await this.evaluatePolicy(policy, {
        user: userAttributes,
        resource: resourceAttributes,
        environment: environmentAttributes,
        action
      });
      
      evaluationResults.push({
        policyId: policy.id,
        policyName: policy.name,
        effect: policy.effect,
        result,
        priority: policy.priority
      });
    }
    
    // 3. Appliquer règles de combinaison
    return this.combinePolicyResults(evaluationResults);
  }
  
  async evaluatePolicy(policy, attributes) {
    const evaluator = new PolicyEvaluator();
    
    try {
      // Utiliser un DSL pour les conditions
      const result = evaluator.evaluate(policy.conditions, attributes);
      
      return {
        matched: result,
        conditions: policy.conditions,
        evaluatedAt: new Date()
      };
      
    } catch (error) {
      // Logger erreur d'évaluation
      console.error('Policy evaluation error:', {
        policyId: policy.id,
        error: error.message
      });
      
      return {
        matched: false,
        error: error.message,
        evaluatedAt: new Date()
      };
    }
  }
  
  combinePolicyResults(results) {
    // Trier par priorité (plus bas = plus prioritaire)
    results.sort((a, b) => a.priority - b.priority);
    
    // Appliquer première règle correspondante
    for (const result of results) {
      if (result.result.matched) {
        return {
          allowed: result.effect === 'allow',
          effect: result.effect,
          matchedPolicy: result.policyName,
          conditions: result.result.conditions,
          evaluatedPolicies: results.length
        };
      }
    }
    
    // Aucune politique correspondante
    return {
      allowed: false,
      effect: 'neutral',
      reason: 'No matching policies',
      evaluatedPolicies: results.length
    };
  }
}
```

## 🔧 Langage de Politique (DSL)

### ✅ OBLIGATOIRE - Syntaxe Conditions ABAC
```javascript
// Exemples de politiques ABAC pour AttitudesFramework
const weddingPolicies = [
  {
    name: 'Guest Access to Own Wedding Only',
    effect: 'allow',
    priority: 10,
    conditions: {
      and: [
        { eq: ['user.role', 'guest'] },
        { eq: ['user.wedding_id', 'resource.wedding_id'] },
        { in: ['action', ['read', 'rsvp']] }
      ]
    }
  },
  
  {
    name: 'DJ Tablet Access During Event',
    effect: 'allow',
    priority: 20,
    conditions: {
      and: [
        { eq: ['user.role', 'vendor:dj'] },
        { eq: ['user.wedding_id', 'resource.wedding_id'] },
        { gte: ['environment.current_time', 'resource.event_start'] },
        { lte: ['environment.current_time', 'resource.event_end'] },
        { eq: ['environment.device_type', 'tablet'] }
      ]
    }
  },
  
  {
    name: 'Photographer Access with Time Restriction',
    effect: 'allow',
    priority: 30,
    conditions: {
      and: [
        { eq: ['user.role', 'vendor:photographer'] },
        { eq: ['user.wedding_id', 'resource.wedding_id'] },
        { or: [
          { gte: ['environment.current_time', 'resource.event_start'] },
          { lte: ['environment.time_to_event', 86400] } // 24h avant
        ] }
      ]
    }
  },
  
  {
    name: 'Budget Access with Amount Limit',
    effect: 'allow',
    priority: 40,
    conditions: {
      and: [
        { in: ['user.role', ['couple:owner', 'couple:partner', 'wedding:planner']] },
        { eq: ['resource.type', 'budget'] },
        { or: [
          { eq: ['user.role', 'couple:owner'] },
          { lte: ['resource.amount', 'user.spending_limit'] }
        ] }
      ]
    }
  },
  
  {
    name: 'Vendor Data Access Restriction',
    effect: 'deny',
    priority: 5, // Haute priorité pour deny
    conditions: {
      and: [
        { startsWith: ['user.role', 'vendor:'] },
        { eq: ['resource.type', 'guest_personal_data'] },
        { not: { in: ['user.vendor_id', 'resource.authorized_vendors'] } }
      ]
    }
  }
];

// Évaluateur de conditions
class PolicyEvaluator {
  evaluate(condition, attributes) {
    if (typeof condition !== 'object') {
      return this.getValue(condition, attributes);
    }
    
    if (condition.and) {
      return condition.and.every(c => this.evaluate(c, attributes));
    }
    
    if (condition.or) {
      return condition.or.some(c => this.evaluate(c, attributes));
    }
    
    if (condition.not) {
      return !this.evaluate(condition.not, attributes);
    }
    
    if (condition.eq) {
      const [left, right] = condition.eq;
      return this.getValue(left, attributes) === this.getValue(right, attributes);
    }
    
    if (condition.in) {
      const [value, array] = condition.in;
      const arrayValue = this.getValue(array, attributes);
      return arrayValue.includes(this.getValue(value, attributes));
    }
    
    if (condition.gte) {
      const [left, right] = condition.gte;
      return this.getValue(left, attributes) >= this.getValue(right, attributes);
    }
    
    if (condition.lte) {
      const [left, right] = condition.lte;
      return this.getValue(left, attributes) <= this.getValue(right, attributes);
    }
    
    if (condition.startsWith) {
      const [value, prefix] = condition.startsWith;
      return this.getValue(value, attributes).startsWith(this.getValue(prefix, attributes));
    }
    
    return false;
  }
  
  getValue(path, attributes) {
    if (typeof path !== 'string') {
      return path;
    }
    
    const parts = path.split('.');
    let value = attributes;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }
    
    return value;
  }
}
```

## 🚀 Middleware d'Autorisation

### ✅ OBLIGATOIRE - Middleware Express
```javascript
// Middleware principal d'autorisation
const authorize = (resource, action, options = {}) => {
  return async (req, res, next) => {
    try {
      // 1. Extraire contexte de la requête
      const context = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        timestamp: new Date(),
        ...options.context
      };
      
      // 2. Résoudre resource dynamique si nécessaire
      const resolvedResource = typeof resource === 'function' 
        ? await resource(req) 
        : resource;
      
      // 3. Vérifier autorisation
      const decision = await accessEngine.checkAccess({
        userId: req.user.id,
        tenantId: req.tenant.id,
        resource: resolvedResource,
        action,
        context
      });
      
      if (!decision.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          reason: decision.reason,
          required_permission: `${resolvedResource}:${action}`
        });
      }
      
      // 4. Appliquer conditions si présentes
      if (decision.conditions) {
        req.accessConditions = decision.conditions;
      }
      
      // 5. Logger accès autorisé
      await auditLogger.log('ACCESS_GRANTED', {
        userId: req.user.id,
        tenantId: req.tenant.id,
        resource: resolvedResource,
        action,
        conditions: decision.conditions,
        ip: req.ip
      });
      
      next();
      
    } catch (error) {
      console.error('Authorization middleware error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// Exemples d'utilisation
app.get('/api/events/:eventId', 
  authenticate,
  authorize('events', 'read'),
  getEventDetails
);

app.post('/api/events/:eventId/guests',
  authenticate,
  authorize((req) => `events:${req.params.eventId}:guests`, 'write'),
  createGuest
);

app.put('/api/events/:eventId/budget',
  authenticate,
  authorize('budget', 'write', {
    context: { 
      eventId: (req) => req.params.eventId,
      amount: (req) => req.body.amount 
    }
  }),
  updateBudget
);
```

## 📊 Gestion des Rôles Dynamiques

### ✅ OBLIGATOIRE - Attribution Contextuelle
```javascript
class DynamicRoleService {
  async assignEventRole(userId, eventId, roleName, options = {}) {
    // 1. Valider le rôle
    const role = await this.getRole(roleName);
    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }
    
    // 2. Vérifier autorisation d'attribution
    await this.checkAssignmentPermission(
      options.assignedBy,
      userId,
      roleName,
      eventId
    );
    
    // 3. Créer attribution contextuelle
    const assignment = await db.query(`
      INSERT INTO user_roles (
        user_id, role_id, tenant_id, context, 
        granted_by, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      userId,
      role.id,
      options.tenantId,
      { event_id: eventId, scope: 'event' },
      options.assignedBy,
      options.expiresAt
    ]);
    
    // 4. Invalider cache permissions
    await this.invalidateUserPermissionCache(userId);
    
    // 5. Notifier utilisateur
    await notificationService.send({
      userId,
      type: 'role_assigned',
      data: {
        roleName: role.name,
        eventId,
        assignedBy: options.assignedBy
      }
    });
    
    return assignment.rows[0];
  }
  
  async elevatePermissionsTemporarily(userId, permissions, duration) {
    // Attribution temporaire pour actions d'urgence
    const temporaryRole = await this.createTemporaryRole({
      name: `temp_${Date.now()}`,
      permissions,
      duration
    });
    
    return this.assignRole(userId, temporaryRole.id, {
      expiresAt: new Date(Date.now() + duration),
      reason: 'temporary_elevation'
    });
  }
  
  async revokeRole(userId, roleId, reason) {
    await db.query(`
      UPDATE user_roles 
      SET active = false, revoked_at = NOW(), revoked_reason = $3
      WHERE user_id = $1 AND role_id = $2 AND active = true
    `, [userId, roleId, reason]);
    
    await this.invalidateUserPermissionCache(userId);
  }
}
```

## 🔄 Tests d'Autorisation

### ✅ OBLIGATOIRE - Suite de Tests
```javascript
describe('RBAC-ABAC Hybrid Authorization', () => {
  describe('Role-Based Access Control', () => {
    it('should grant access based on user role', async () => {
      const user = await createTestUser({ role: 'couple:owner' });
      const decision = await accessEngine.checkAccess({
        userId: user.id,
        tenantId: user.tenant_id,
        resource: 'events',
        action: 'write'
      });
      
      expect(decision.allowed).toBe(true);
      expect(decision.details.rbac.matchedRoles).toContain('couple:owner');
    });
    
    it('should deny access for insufficient role', async () => {
      const user = await createTestUser({ role: 'guest:standard' });
      const decision = await accessEngine.checkAccess({
        userId: user.id,
        tenantId: user.tenant_id,
        resource: 'events',
        action: 'delete'
      });
      
      expect(decision.allowed).toBe(false);
    });
  });
  
  describe('Attribute-Based Access Control', () => {
    it('should enforce time-based access restrictions', async () => {
      const user = await createTestUser({ role: 'vendor:dj' });
      const event = await createTestEvent({ 
        start_time: new Date(Date.now() + 3600000) // 1h dans le futur
      });
      
      const decision = await accessEngine.checkAccess({
        userId: user.id,
        tenantId: user.tenant_id,
        resource: `events:${event.id}:music`,
        action: 'write',
        context: { 
          event_id: event.id,
          current_time: new Date()
        }
      });
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('time restriction');
    });
    
    it('should allow access within time window', async () => {
      const user = await createTestUser({ role: 'vendor:dj' });
      const event = await createTestEvent({ 
        start_time: new Date(Date.now() - 1800000), // 30min dans le passé
        end_time: new Date(Date.now() + 1800000)    // 30min dans le futur
      });
      
      const decision = await accessEngine.checkAccess({
        userId: user.id,
        tenantId: user.tenant_id,
        resource: `events:${event.id}:music`,
        action: 'write',
        context: { 
          event_id: event.id,
          current_time: new Date()
        }
      });
      
      expect(decision.allowed).toBe(true);
    });
  });
  
  describe('Policy Evaluation', () => {
    it('should evaluate complex conditions correctly', async () => {
      const condition = {
        and: [
          { eq: ['user.role', 'guest'] },
          { in: ['action', ['read', 'rsvp']] },
          { gte: ['user.age', 18] }
        ]
      };
      
      const attributes = {
        user: { role: 'guest', age: 25 },
        action: 'read'
      };
      
      const evaluator = new PolicyEvaluator();
      const result = evaluator.evaluate(condition, attributes);
      
      expect(result).toBe(true);
    });
  });
});
```

## 📋 Checklist RBAC-ABAC

### Modèle de Données
- [ ] Tables rôles et permissions créées
- [ ] Attributs utilisateur configurés
- [ ] Politiques ABAC définies
- [ ] Associations contextuelles implémentées

### Moteurs d'Évaluation
- [ ] Moteur RBAC opérationnel
- [ ] Moteur ABAC fonctionnel
- [ ] Combinaison des résultats correcte
- [ ] Cache des décisions optimisé

### Politiques Métier
- [ ] Rôles AttitudesFramework définis
- [ ] Politiques temps réel configurées
- [ ] Restrictions par contexte appliquées
- [ ] Conditions d'urgence gérées

### Intégration
- [ ] Middleware Express configuré
- [ ] Validation des requêtes active
- [ ] Audit des accès complet
- [ ] Tests d'autorisation passants

### Performance
- [ ] Cache des permissions optimisé
- [ ] Évaluation des politiques rapide
- [ ] Invalidation cache sélective
- [ ] Métriques de performance suivies

### Sécurité
- [ ] Principe du moindre privilège appliqué
- [ ] Escalade temporaire sécurisée
- [ ] Révocation immédiate possible
- [ ] Audit trail complet

---

**Un système de permissions granulaire est la clé de la confiance utilisateur!** 🛡️