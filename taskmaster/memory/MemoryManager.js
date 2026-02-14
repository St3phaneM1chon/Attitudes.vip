const { EventEmitter } = require('events');
const Redis = require('ioredis');
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const { OpenAI } = require('openai');
const crypto = require('crypto');

/**
 * Gestionnaire de mémoire avancé pour TaskMaster
 * Gère la persistance multi-niveaux et l'apprentissage contextuel
 */
class AdvancedMemoryManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.contexts = new Map();
    this.storages = {};
    this.initialized = false;
  }

  /**
   * Initialise les différents systèmes de stockage
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Redis pour cache et mémoire court terme
      this.storages.redis = new Redis({
        host: this.config.redis?.host || 'localhost',
        port: this.config.redis?.port || 6379,
        password: this.config.redis?.password,
        keyPrefix: 'taskmaster:memory:',
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      // PostgreSQL pour mémoire de travail
      this.storages.postgres = new Pool({
        host: this.config.postgres?.host || 'localhost',
        port: this.config.postgres?.port || 5432,
        database: this.config.postgres?.database || 'taskmaster',
        user: this.config.postgres?.user || 'postgres',
        password: this.config.postgres?.password,
        max: 20,
        idleTimeoutMillis: 30000
      });

      // S3 pour stockage long terme (optionnel)
      if (this.config.s3?.enabled) {
        this.storages.s3 = new AWS.S3({
          endpoint: this.config.s3.endpoint,
          accessKeyId: this.config.s3.accessKey,
          secretAccessKey: this.config.s3.secretKey,
          s3ForcePathStyle: true,
          signatureVersion: 'v4'
        });
      }

      // OpenAI pour embeddings (optionnel)
      if (this.config.openai?.apiKey) {
        this.openai = new OpenAI({
          apiKey: this.config.openai.apiKey
        });
      }

      // Créer les tables si nécessaire
      await this.createTables();

      this.initialized = true;
      this.emit('initialized');

      // Démarrer la consolidation périodique
      this.startConsolidation();

    } catch (error) {
      console.error('Failed to initialize MemoryManager:', error);
      throw error;
    }
  }

  /**
   * Crée les tables nécessaires dans PostgreSQL
   */
  async createTables() {
    const queries = [
      // Table des contextes
      `CREATE TABLE IF NOT EXISTS memory_contexts (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50),
        parent_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des mémoires
      `CREATE TABLE IF NOT EXISTS memories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        context_id VARCHAR(255) REFERENCES memory_contexts(id),
        key VARCHAR(255),
        value JSONB,
        importance FLOAT DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(context_id, key)
      )`,

      // Table des patterns appris
      `CREATE TABLE IF NOT EXISTS learned_patterns (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        context_id VARCHAR(255) REFERENCES memory_contexts(id),
        pattern JSONB,
        outcome JSONB,
        confidence FLOAT DEFAULT 0.5,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des embeddings
      `CREATE TABLE IF NOT EXISTS memory_embeddings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        memory_id UUID REFERENCES memories(id),
        embedding vector(1536),
        model VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Index pour performance
      `CREATE INDEX IF NOT EXISTS idx_memories_context ON memories(context_id)`,
      `CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(last_accessed DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_patterns_context ON learned_patterns(context_id)`,
      `CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON learned_patterns(confidence DESC)`
    ];

    for (const query of queries) {
      try {
        await this.storages.postgres.query(query);
      } catch (error) {
        console.error('Failed to create table:', error.message);
      }
    }
  }

  /**
   * Obtient ou crée un contexte de mémoire
   */
  async getContext(contextId, options = {}) {
    if (!this.contexts.has(contextId)) {
      const context = new MemoryContext(contextId, {
        ...options,
        manager: this
      });
      await context.initialize();
      this.contexts.set(contextId, context);
    }
    return this.contexts.get(contextId);
  }

  /**
   * Sauvegarde une information dans la mémoire
   */
  async remember(contextId, key, value, options = {}) {
    const context = await this.getContext(contextId);
    const importance = options.importance || await this.calculateImportance(value, context);
    
    const memory = {
      key,
      value,
      importance,
      metadata: {
        ...options.metadata,
        timestamp: new Date().toISOString(),
        source: options.source || 'manual'
      }
    };

    // Déterminer le niveau de stockage selon l'importance
    const level = this.determineStorageLevel(importance);
    
    try {
      switch (level) {
        case 'SHORT_TERM':
          await this.saveToShortTerm(context, memory);
          break;
        
        case 'WORKING':
          await this.saveToWorking(context, memory);
          // Aussi en cache pour accès rapide
          await this.saveToShortTerm(context, memory);
          break;
        
        case 'LONG_TERM':
          await this.saveToLongTerm(context, memory);
          await this.saveToWorking(context, memory);
          await this.saveToShortTerm(context, memory);
          break;
        
        case 'PERMANENT':
          await this.saveToPermanent(context, memory);
          // Générer embedding si disponible
          if (this.openai) {
            await this.generateAndSaveEmbedding(context, memory);
          }
          break;
      }

      // Mettre à jour les patterns d'accès
      await context.updateAccessPattern(key, { importance, level });

      this.emit('memory:saved', { contextId, key, importance, level });
      
      return { success: true, memory, level };

    } catch (error) {
      console.error('Failed to save memory:', error);
      throw error;
    }
  }

  /**
   * Rappelle une information depuis la mémoire
   */
  async recall(contextId, query, options = {}) {
    const context = await this.getContext(contextId);
    let result = null;

    try {
      // 1. Essayer la mémoire court terme (Redis)
      result = await this.recallFromShortTerm(context, query);
      if (result && this.isResultSatisfactory(result, options)) {
        this.emit('memory:recalled', { contextId, query, level: 'SHORT_TERM' });
        return result;
      }

      // 2. Essayer la mémoire de travail (PostgreSQL)
      result = await this.recallFromWorking(context, query);
      if (result && this.isResultSatisfactory(result, options)) {
        // Promouvoir en cache
        await this.promoteToShortTerm(context, result);
        this.emit('memory:recalled', { contextId, query, level: 'WORKING' });
        return result;
      }

      // 3. Essayer la mémoire long terme (S3)
      if (this.storages.s3) {
        result = await this.recallFromLongTerm(context, query);
        if (result && this.isResultSatisfactory(result, options)) {
          await this.promoteToWorking(context, result);
          this.emit('memory:recalled', { contextId, query, level: 'LONG_TERM' });
          return result;
        }
      }

      // 4. Recherche sémantique si disponible
      if (options.semantic && this.openai) {
        result = await this.semanticSearch(context, query, options);
        if (result) {
          await this.promoteBasedOnRelevance(context, result);
          this.emit('memory:recalled', { contextId, query, level: 'SEMANTIC' });
          return result;
        }
      }

      // 5. Recherche dans les contextes liés
      if (options.searchRelated) {
        result = await this.searchRelatedContexts(context, query, options);
        if (result) {
          this.emit('memory:recalled', { contextId, query, level: 'RELATED' });
          return result;
        }
      }

      return null;

    } catch (error) {
      console.error('Failed to recall memory:', error);
      throw error;
    }
  }

  /**
   * Apprend d'un pattern et de son résultat
   */
  async learn(contextId, pattern, outcome, options = {}) {
    const context = await this.getContext(contextId);
    
    try {
      const learning = {
        pattern,
        outcome,
        confidence: options.confidence || 0.5,
        metadata: {
          timestamp: new Date().toISOString(),
          source: options.source || 'experience',
          ...options.metadata
        }
      };

      // Sauvegarder le pattern appris
      const result = await this.storages.postgres.query(
        `INSERT INTO learned_patterns (context_id, pattern, outcome, confidence)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (context_id, pattern) DO UPDATE
         SET outcome = $2, confidence = GREATEST(learned_patterns.confidence, $4),
             usage_count = learned_patterns.usage_count + 1,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [contextId, JSON.stringify(pattern), JSON.stringify(outcome), learning.confidence]
      );

      // Mettre à jour les modèles de prédiction
      await this.updatePredictionModels(context, learning);

      this.emit('memory:learned', { contextId, pattern, outcome });
      
      return result.rows[0];

    } catch (error) {
      console.error('Failed to learn pattern:', error);
      throw error;
    }
  }

  /**
   * Calcule l'importance d'une donnée
   */
  async calculateImportance(value, context) {
    const factors = {
      // Complexité de la donnée
      complexity: this.calculateComplexity(value),
      
      // Fréquence d'accès prévue
      accessFrequency: await this.predictAccessFrequency(value, context),
      
      // Valeur métier
      businessValue: this.assessBusinessValue(value),
      
      // Unicité
      uniqueness: await this.assessUniqueness(value, context),
      
      // Fraîcheur
      recency: 1.0 // Les nouvelles données ont une importance maximale
    };

    // Moyenne pondérée
    const weights = {
      complexity: 0.2,
      accessFrequency: 0.3,
      businessValue: 0.3,
      uniqueness: 0.1,
      recency: 0.1
    };

    let importance = 0;
    for (const [factor, value] of Object.entries(factors)) {
      importance += value * weights[factor];
    }

    return Math.min(1.0, Math.max(0.0, importance));
  }

  /**
   * Détermine le niveau de stockage selon l'importance
   */
  determineStorageLevel(importance) {
    if (importance >= 0.9) return 'PERMANENT';
    if (importance >= 0.7) return 'LONG_TERM';
    if (importance >= 0.4) return 'WORKING';
    return 'SHORT_TERM';
  }

  /**
   * Sauvegarde en mémoire court terme (Redis)
   */
  async saveToShortTerm(context, memory) {
    const key = `${context.id}:${memory.key}`;
    const ttl = memory.metadata.ttl || 86400; // 24h par défaut
    
    await this.storages.redis.setex(
      key,
      ttl,
      JSON.stringify(memory)
    );
  }

  /**
   * Sauvegarde en mémoire de travail (PostgreSQL)
   */
  async saveToWorking(context, memory) {
    await this.storages.postgres.query(
      `INSERT INTO memories (context_id, key, value, importance, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (context_id, key) DO UPDATE
       SET value = $3, importance = $4, metadata = $5,
           updated_at = CURRENT_TIMESTAMP`,
      [context.id, memory.key, memory.value, memory.importance, memory.metadata]
    );
  }

  /**
   * Sauvegarde en mémoire long terme (S3)
   */
  async saveToLongTerm(context, memory) {
    if (!this.storages.s3) return;

    const key = `memories/${context.id}/${memory.key}.json`;
    await this.storages.s3.putObject({
      Bucket: this.config.s3.bucket || 'taskmaster-memories',
      Key: key,
      Body: JSON.stringify(memory),
      ContentType: 'application/json',
      Metadata: {
        contextId: context.id,
        importance: String(memory.importance),
        timestamp: new Date().toISOString()
      }
    }).promise();
  }

  /**
   * Sauvegarde permanente avec toutes les métadonnées
   */
  async saveToPermanent(context, memory) {
    // Sauvegarder dans tous les niveaux
    await Promise.all([
      this.saveToLongTerm(context, memory),
      this.saveToWorking(context, memory),
      this.saveToShortTerm(context, memory)
    ]);
  }

  /**
   * Génère et sauvegarde un embedding pour la recherche sémantique
   */
  async generateAndSaveEmbedding(context, memory) {
    if (!this.openai) return;

    try {
      const text = typeof memory.value === 'string' 
        ? memory.value 
        : JSON.stringify(memory.value);

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      const embedding = response.data[0].embedding;

      // Sauvegarder l'embedding
      await this.storages.postgres.query(
        `INSERT INTO memory_embeddings (memory_id, embedding, model)
         SELECT id, $2::vector, $3
         FROM memories
         WHERE context_id = $1 AND key = $4`,
        [context.id, `[${embedding.join(',')}]`, 'text-embedding-ada-002', memory.key]
      );

    } catch (error) {
      console.error('Failed to generate embedding:', error);
    }
  }

  /**
   * Rappel depuis la mémoire court terme
   */
  async recallFromShortTerm(context, query) {
    const key = `${context.id}:${query}`;
    const data = await this.storages.redis.get(key);
    
    if (data) {
      const memory = JSON.parse(data);
      // Rafraîchir le TTL
      await this.storages.redis.expire(key, 86400);
      return memory;
    }
    
    return null;
  }

  /**
   * Rappel depuis la mémoire de travail
   */
  async recallFromWorking(context, query) {
    const result = await this.storages.postgres.query(
      `UPDATE memories 
       SET access_count = access_count + 1,
           last_accessed = CURRENT_TIMESTAMP
       WHERE context_id = $1 AND key = $2
       RETURNING *`,
      [context.id, query]
    );

    if (result.rows.length > 0) {
      const memory = result.rows[0];
      return {
        key: memory.key,
        value: memory.value,
        importance: memory.importance,
        metadata: memory.metadata
      };
    }

    return null;
  }

  /**
   * Rappel depuis la mémoire long terme
   */
  async recallFromLongTerm(context, query) {
    if (!this.storages.s3) return null;

    try {
      const key = `memories/${context.id}/${query}.json`;
      const result = await this.storages.s3.getObject({
        Bucket: this.config.s3.bucket || 'taskmaster-memories',
        Key: key
      }).promise();

      return JSON.parse(result.Body.toString());
    } catch (error) {
      if (error.code !== 'NoSuchKey') {
        console.error('Failed to recall from S3:', error);
      }
      return null;
    }
  }

  /**
   * Recherche sémantique utilisant les embeddings
   */
  async semanticSearch(context, query, options = {}) {
    if (!this.openai) return null;

    try {
      // Générer embedding pour la requête
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query
      });

      const queryEmbedding = response.data[0].embedding;

      // Recherche par similarité cosinus
      const result = await this.storages.postgres.query(
        `SELECT m.*, 
                1 - (e.embedding <=> $1::vector) as similarity
         FROM memories m
         JOIN memory_embeddings e ON m.id = e.memory_id
         WHERE m.context_id = $2
         ORDER BY similarity DESC
         LIMIT $3`,
        [`[${queryEmbedding.join(',')}]`, context.id, options.limit || 5]
      );

      if (result.rows.length > 0 && result.rows[0].similarity > (options.minSimilarity || 0.7)) {
        return {
          key: result.rows[0].key,
          value: result.rows[0].value,
          importance: result.rows[0].importance,
          metadata: {
            ...result.rows[0].metadata,
            similarity: result.rows[0].similarity
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Semantic search failed:', error);
      return null;
    }
  }

  /**
   * Vérifie si un résultat est satisfaisant
   */
  isResultSatisfactory(result, options) {
    if (!result) return false;
    
    if (options.minImportance && result.importance < options.minImportance) {
      return false;
    }
    
    if (options.maxAge) {
      const age = Date.now() - new Date(result.metadata.timestamp).getTime();
      if (age > options.maxAge) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Promeut une mémoire vers un niveau supérieur
   */
  async promoteToShortTerm(context, memory) {
    await this.saveToShortTerm(context, memory);
  }

  /**
   * Promeut selon la pertinence
   */
  async promoteBasedOnRelevance(context, result) {
    const relevance = result.metadata?.similarity || result.importance;
    
    if (relevance > 0.9) {
      await this.saveToShortTerm(context, result);
    } else if (relevance > 0.7) {
      // Juste mettre à jour le timestamp d'accès
      await this.storages.postgres.query(
        `UPDATE memories 
         SET last_accessed = CURRENT_TIMESTAMP
         WHERE context_id = $1 AND key = $2`,
        [context.id, result.key]
      );
    }
  }

  /**
   * Recherche dans les contextes liés
   */
  async searchRelatedContexts(context, query, options) {
    // Obtenir les contextes liés
    const relatedContexts = await this.getRelatedContexts(context.id);
    
    for (const relatedId of relatedContexts) {
      const relatedContext = await this.getContext(relatedId);
      const result = await this.recall(relatedId, query, {
        ...options,
        searchRelated: false // Éviter la récursion
      });
      
      if (result) {
        return {
          ...result,
          metadata: {
            ...result.metadata,
            sourceContext: relatedId
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Obtient les contextes liés
   */
  async getRelatedContexts(contextId) {
    // Logique simple : contextes avec le même parent ou les enfants
    const parts = contextId.split(':');
    const related = [];
    
    // Parent
    if (parts.length > 1) {
      related.push(parts.slice(0, -1).join(':'));
    }
    
    // Frères et sœurs (même niveau)
    if (parts.length > 2) {
      const parent = parts.slice(0, -1).join(':');
      // Ici on pourrait chercher en DB tous les contextes avec ce parent
    }
    
    return related;
  }

  /**
   * Calcule la complexité d'une valeur
   */
  calculateComplexity(value) {
    if (typeof value === 'object') {
      const json = JSON.stringify(value);
      // Complexité basée sur la taille et la profondeur
      const size = json.length;
      const depth = this.getObjectDepth(value);
      return Math.min(1.0, (size / 10000) * 0.5 + (depth / 10) * 0.5);
    }
    return 0.1;
  }

  /**
   * Obtient la profondeur d'un objet
   */
  getObjectDepth(obj) {
    if (typeof obj !== 'object' || obj === null) return 0;
    
    let maxDepth = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = this.getObjectDepth(obj[key]) + 1;
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    
    return maxDepth;
  }

  /**
   * Prédit la fréquence d'accès
   */
  async predictAccessFrequency(value, context) {
    // Basé sur les patterns historiques
    const patterns = await this.storages.postgres.query(
      `SELECT AVG(access_count) as avg_access
       FROM memories
       WHERE context_id = $1
       AND created_at > NOW() - INTERVAL '30 days'`,
      [context.id]
    );
    
    const avgAccess = patterns.rows[0]?.avg_access || 0;
    return Math.min(1.0, avgAccess / 100);
  }

  /**
   * Évalue la valeur métier
   */
  assessBusinessValue(value) {
    // Heuristiques simples
    const keywords = ['critical', 'important', 'urgent', 'payment', 'customer', 'deadline'];
    const text = JSON.stringify(value).toLowerCase();
    
    let score = 0.3; // Base
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 0.1;
      }
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Évalue l'unicité
   */
  async assessUniqueness(value, context) {
    // Vérifier si des valeurs similaires existent
    const hash = crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
    
    const similar = await this.storages.postgres.query(
      `SELECT COUNT(*) as count
       FROM memories
       WHERE context_id = $1
       AND metadata->>'valueHash' = $2`,
      [context.id, hash]
    );
    
    return similar.rows[0].count === 0 ? 1.0 : 0.3;
  }

  /**
   * Met à jour les modèles de prédiction
   */
  async updatePredictionModels(context, learning) {
    // Placeholder pour l'intégration ML future
    // Ici on pourrait entraîner un modèle léger ou mettre à jour des statistiques
    this.emit('models:updated', { contextId: context.id, learning });
  }

  /**
   * Démarre le processus de consolidation périodique
   */
  startConsolidation() {
    // Consolidation toutes les heures
    this.consolidationInterval = setInterval(async () => {
      try {
        await this.consolidateMemories();
      } catch (error) {
        console.error('Consolidation failed:', error);
      }
    }, 3600000); // 1 heure
  }

  /**
   * Consolide les mémoires pour optimiser le stockage
   */
  async consolidateMemories() {
    this.emit('consolidation:start');
    
    for (const [contextId, context] of this.contexts) {
      try {
        // 1. Archiver les mémoires anciennes peu utilisées
        await this.archiveOldMemories(context);
        
        // 2. Compresser les mémoires similaires
        await this.compressSimilarMemories(context);
        
        // 3. Mettre à jour les importances basées sur l'usage
        await this.updateImportanceScores(context);
        
        // 4. Nettoyer le cache Redis
        await this.cleanupCache(context);
        
      } catch (error) {
        console.error(`Consolidation failed for context ${contextId}:`, error);
      }
    }
    
    this.emit('consolidation:complete');
  }

  /**
   * Archive les vieilles mémoires peu utilisées
   */
  async archiveOldMemories(context) {
    if (!this.storages.s3) return;
    
    const oldMemories = await this.storages.postgres.query(
      `SELECT * FROM memories
       WHERE context_id = $1
       AND last_accessed < NOW() - INTERVAL '90 days'
       AND access_count < 5
       AND importance < 0.5`,
      [context.id]
    );
    
    for (const memory of oldMemories.rows) {
      await this.saveToLongTerm(context, memory);
      
      // Supprimer de la DB active
      await this.storages.postgres.query(
        `DELETE FROM memories WHERE id = $1`,
        [memory.id]
      );
    }
  }

  /**
   * Compresse les mémoires similaires
   */
  async compressSimilarMemories(context) {
    // Grouper par patterns similaires
    const patterns = await this.storages.postgres.query(
      `SELECT COUNT(*) as count, 
              jsonb_object_keys(value) as keys,
              AVG(importance) as avg_importance
       FROM memories
       WHERE context_id = $1
       GROUP BY keys
       HAVING COUNT(*) > 10`,
      [context.id]
    );
    
    // Logique de compression à implémenter selon les besoins
  }

  /**
   * Met à jour les scores d'importance
   */
  async updateImportanceScores(context) {
    await this.storages.postgres.query(
      `UPDATE memories
       SET importance = LEAST(1.0, 
         importance * 0.9 + 
         (access_count::float / GREATEST(1, EXTRACT(DAY FROM NOW() - created_at))) * 0.1
       )
       WHERE context_id = $1`,
      [context.id]
    );
  }

  /**
   * Nettoie le cache Redis
   */
  async cleanupCache(context) {
    const keys = await this.storages.redis.keys(`${context.id}:*`);
    
    for (const key of keys) {
      const ttl = await this.storages.redis.ttl(key);
      if (ttl < 0) {
        await this.storages.redis.del(key);
      }
    }
  }

  /**
   * Ferme proprement les connexions
   */
  async close() {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
    }
    
    await this.storages.redis?.quit();
    await this.storages.postgres?.end();
    
    this.emit('closed');
  }
}

/**
 * Contexte de mémoire spécifique
 */
class MemoryContext {
  constructor(id, options) {
    this.id = id;
    this.options = options;
    this.manager = options.manager;
    this.metadata = {};
    this.accessPatterns = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Créer ou récupérer le contexte en DB
      const result = await this.manager.storages.postgres.query(
        `INSERT INTO memory_contexts (id, type, metadata)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE
         SET updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [this.id, this.options.type || 'default', this.options.metadata || {}]
      );

      this.metadata = result.rows[0];
      
      // Charger les patterns d'accès depuis Redis
      await this.loadAccessPatterns();
      
      this.initialized = true;
    } catch (error) {
      console.error(`Failed to initialize context ${this.id}:`, error);
      throw error;
    }
  }

  async loadAccessPatterns() {
    const data = await this.manager.storages.redis.get(`patterns:${this.id}`);
    if (data) {
      const patterns = JSON.parse(data);
      this.accessPatterns = new Map(patterns);
    }
  }

  async updateAccessPattern(key, data) {
    const pattern = this.accessPatterns.get(key) || {
      count: 0,
      lastAccess: null,
      avgImportance: 0
    };

    pattern.count++;
    pattern.lastAccess = new Date().toISOString();
    pattern.avgImportance = (pattern.avgImportance * (pattern.count - 1) + data.importance) / pattern.count;

    this.accessPatterns.set(key, pattern);

    // Sauvegarder périodiquement
    if (pattern.count % 10 === 0) {
      await this.saveAccessPatterns();
    }
  }

  async saveAccessPatterns() {
    await this.manager.storages.redis.setex(
      `patterns:${this.id}`,
      604800, // 7 jours
      JSON.stringify([...this.accessPatterns])
    );
  }
}

module.exports = AdvancedMemoryManager;