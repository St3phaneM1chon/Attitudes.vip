/**
 * Query Optimizer - Optimisation des requêtes PostgreSQL
 * Améliore les performances des requêtes complexes
 */

const { Pool } = require('pg')
const { getRedisCacheService } = require('../cache/redis-cache-service')

class QueryOptimizer {
  constructor () {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    })

    this.cache = getRedisCacheService()

    // Configuration des stratégies d'optimisation
    this.strategies = {
      indexHints: true,
      queryRewrite: true,
      resultCaching: true,
      connectionPooling: true,
      preparedStatements: true
    }

    // Cache des plans d'exécution
    this.queryPlans = new Map()

    // Prepared statements
    this.preparedStatements = new Map()
  }

  /**
   * Exécuter une requête optimisée avec cache
   */
  async query (sql, params = [], options = {}) {
    const {
      cacheable = true,
      cacheKey = null,
      cacheTTL = 300,
      namespace = 'queries'
    } = options

    try {
      // Vérifier le cache si applicable
      if (cacheable && cacheKey) {
        const cached = await this.cache.get(cacheKey, namespace)
        if (cached) {
          return cached
        }
      }

      // Optimiser la requête
      const optimizedSQL = this.optimizeQuery(sql)

      // Exécuter la requête
      const start = Date.now()
      const result = await this.pool.query(optimizedSQL, params)
      const duration = Date.now() - start

      // Logger les requêtes lentes
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, sql)
      }

      // Mettre en cache si applicable
      if (cacheable && cacheKey && result.rows.length > 0) {
        await this.cache.set(cacheKey, result.rows, namespace, cacheTTL)
      }

      return result.rows
    } catch (error) {
      console.error('Query error:', error)
      throw error
    }
  }

  /**
   * Optimiser une requête SQL
   */
  optimizeQuery (sql) {
    let optimized = sql

    // Ajouter des hints d'index si nécessaire
    if (this.strategies.indexHints) {
      optimized = this.addIndexHints(optimized)
    }

    // Réécrire certaines parties de la requête
    if (this.strategies.queryRewrite) {
      optimized = this.rewriteQuery(optimized)
    }

    return optimized
  }

  /**
   * Ajouter des hints d'index pour PostgreSQL
   */
  addIndexHints (sql) {
    // Exemples de patterns à optimiser
    const optimizations = [
      // Forcer l'utilisation d'index pour les jointures sur users
      {
        pattern: /JOIN users u ON/gi,
        replacement: 'JOIN users u USE INDEX (idx_users_id) ON'
      },
      // Optimiser les requêtes sur les dates
      {
        pattern: /WHERE (.+?)created_at BETWEEN/gi,
        replacement: 'WHERE $1created_at::date BETWEEN'
      }
    ]

    let optimized = sql
    optimizations.forEach(opt => {
      optimized = optimized.replace(opt.pattern, opt.replacement)
    })

    return optimized
  }

  /**
   * Réécrire des parties de requête pour améliorer les performances
   */
  rewriteQuery (sql) {
    let optimized = sql

    // Remplacer NOT IN par NOT EXISTS (plus performant)
    optimized = optimized.replace(
      /WHERE\s+(\w+)\s+NOT\s+IN\s*\(([^)]+)\)/gi,
      'WHERE NOT EXISTS ($2 WHERE $1 = subquery.id)'
    )

    // Optimiser COUNT(*) en COUNT(1)
    optimized = optimized.replace(/COUNT\(\*\)/gi, 'COUNT(1)')

    // Ajouter LIMIT si pas présent pour éviter les full scans
    if (!optimized.match(/LIMIT\s+\d+/i) && optimized.match(/^SELECT/i)) {
      optimized += ' LIMIT 1000'
    }

    return optimized
  }

  /**
   * Requêtes optimisées pour les dashboards
   */
  async getDashboardStats (userId, role) {
    const cacheKey = `dashboard:${role}:${userId}`

    return this.query(
      `
      WITH user_stats AS (
        SELECT 
          COUNT(DISTINCT w.id) as total_weddings,
          COUNT(DISTINCT CASE WHEN w.status = 'active' THEN w.id END) as active_weddings,
          COUNT(DISTINCT v.id) as total_vendors,
          SUM(p.amount) as total_revenue
        FROM users u
        LEFT JOIN weddings w ON w.user_id = u.id
        LEFT JOIN wedding_vendors wv ON wv.wedding_id = w.id
        LEFT JOIN vendors v ON v.id = wv.vendor_id
        LEFT JOIN payments p ON p.wedding_id = w.id
        WHERE u.id = $1
      )
      SELECT * FROM user_stats
      `,
      [userId],
      { cacheKey, cacheTTL: 600 }
    )
  }

  /**
   * Recherche optimisée avec full-text search
   */
  async searchVendors (query, filters = {}) {
    const { type, location, minRating, maxPrice, limit = 20, offset = 0 } = filters

    let sql = `
      SELECT 
        v.*,
        AVG(r.rating) as avg_rating,
        COUNT(DISTINCT r.id) as review_count,
        ts_rank(to_tsvector('french', v.name || ' ' || v.description), plainto_tsquery('french', $1)) as rank
      FROM vendors v
      LEFT JOIN reviews r ON r.vendor_id = v.id
      WHERE 1=1
    `

    const params = [query]
    let paramIndex = 2

    if (type) {
      sql += ` AND v.type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (location) {
      sql += ` AND v.location @> $${paramIndex}`
      params.push(location)
      paramIndex++
    }

    if (minRating) {
      sql += ` AND avg_rating >= $${paramIndex}`
      params.push(minRating)
      paramIndex++
    }

    if (maxPrice) {
      sql += ` AND v.price <= $${paramIndex}`
      params.push(maxPrice)
      paramIndex++
    }

    sql += `
      GROUP BY v.id
      ORDER BY rank DESC, avg_rating DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    params.push(limit, offset)

    const cacheKey = `vendors:search:${JSON.stringify({ query, filters })}`
    return this.query(sql, params, { cacheKey, cacheTTL: 300 })
  }

  /**
   * Batch insert optimisé
   */
  async batchInsert (table, records) {
    if (!records.length) return []

    // Validate table name to prevent SQL injection
    if (!this.isValidTableName(table)) {
      throw new Error(`Invalid table name: ${table}`)
    }

    const columns = Object.keys(records[0])

    // Validate column names to prevent SQL injection
    if (!this.areValidColumnNames(columns)) {
      throw new Error('Invalid column names detected')
    }

    const values = []
    const placeholders = []

    records.forEach((record, i) => {
      const rowPlaceholders = columns.map((col, j) => {
        values.push(record[col])
        return `$${i * columns.length + j + 1}`
      })
      placeholders.push(`(${rowPlaceholders.join(', ')})`)
    })

    // Use identifier quoting for table and column names
    const quotedTable = this.quoteIdentifier(table)
    const quotedColumns = columns.map(col => this.quoteIdentifier(col)).join(', ')

    const sql = `
      INSERT INTO ${quotedTable} (${quotedColumns})
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `

    return this.query(sql, values, { cacheable: false })
  }

  /**
   * Mise à jour optimisée avec invalidation de cache
   */
  async update (table, id, updates, invalidateTags = []) {
    // Validate table name to prevent SQL injection
    if (!this.isValidTableName(table)) {
      throw new Error(`Invalid table name: ${table}`)
    }

    const columns = Object.keys(updates)
    const values = Object.values(updates)

    // Validate column names to prevent SQL injection
    if (!this.areValidColumnNames(columns)) {
      throw new Error('Invalid column names detected')
    }

    // Use quoted identifiers for column names
    const setClause = columns.map((col, i) => `${this.quoteIdentifier(col)} = $${i + 2}`).join(', ')
    const quotedTable = this.quoteIdentifier(table)

    const sql = `
      UPDATE ${quotedTable}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `

    const result = await this.query(sql, [id, ...values], { cacheable: false })

    // Invalider le cache
    for (const tag of invalidateTags) {
      await this.cache.invalidateTag(tag)
    }

    // Invalider le cache de l'entité
    await this.cache.invalidate(id, table)

    return result[0]
  }

  /**
   * Transaction optimisée
   */
  async transaction (callback) {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Analyser les performances d'une requête
   */
  async explain (sql, params = []) {
    // Validate that the SQL starts with a safe command
    const safeSqlRegex = /^\s*(SELECT|WITH)\s+/i
    if (!safeSqlRegex.test(sql)) {
      throw new Error('EXPLAIN is only allowed for SELECT and WITH statements')
    }

    const explainSQL = `EXPLAIN (ANALYZE, BUFFERS) ${sql}`
    const result = await this.pool.query(explainSQL, params)

    // Parser les résultats EXPLAIN
    const plan = result.rows.map(row => row['QUERY PLAN']).join('\n')

    // Extraire les métriques importantes
    const metrics = {
      totalTime: plan.match(/Total runtime: ([\d.]+) ms/)?.[1],
      planningTime: plan.match(/Planning time: ([\d.]+) ms/)?.[1],
      executionTime: plan.match(/Execution time: ([\d.]+) ms/)?.[1],
      buffers: plan.match(/Buffers: (.+)/)?.[1],
      hasSeqScan: plan.includes('Seq Scan'),
      hasIndexScan: plan.includes('Index Scan'),
      estimatedCost: plan.match(/cost=([\d.]+)\.\.([\d.]+)/)?.[2]
    }

    return {
      plan,
      metrics,
      recommendations: this.getOptimizationRecommendations(metrics)
    }
  }

  /**
   * Obtenir des recommandations d'optimisation
   */
  getOptimizationRecommendations (metrics) {
    const recommendations = []

    if (metrics.hasSeqScan) {
      recommendations.push('Consider adding indexes to avoid sequential scans')
    }

    if (parseFloat(metrics.totalTime) > 1000) {
      recommendations.push('Query is slow, consider optimization')
    }

    if (!metrics.hasIndexScan && metrics.hasSeqScan) {
      recommendations.push('No index scans detected, verify index usage')
    }

    return recommendations
  }

  /**
   * Validate table name to prevent SQL injection
   */
  isValidTableName (table) {
    // Allow only alphanumeric characters, underscores, and hyphens
    // Must start with a letter or underscore
    const validTableRegex = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

    // Additional check for common reserved words and SQL keywords
    const reservedWords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
      'TABLE', 'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION',
      'UNION', 'ORDER', 'GROUP', 'HAVING', 'WHERE', 'FROM', 'JOIN'
    ]

    return validTableRegex.test(table) &&
           !reservedWords.includes(table.toUpperCase()) &&
           table.length <= 63 // PostgreSQL identifier limit
  }

  /**
   * Validate column names to prevent SQL injection
   */
  areValidColumnNames (columns) {
    const validColumnRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/

    return columns.every(col =>
      validColumnRegex.test(col) &&
      col.length <= 63 // PostgreSQL identifier limit
    )
  }

  /**
   * Quote identifier for safe SQL composition
   */
  quoteIdentifier (identifier) {
    // PostgreSQL identifier quoting - escape double quotes and wrap in double quotes
    return `"${identifier.replace(/"/g, '""')}"`
  }

  /**
   * Nettoyer les connexions
   */
  async close () {
    await this.pool.end()
  }
}

// Singleton
let instance = null

module.exports = {
  getQueryOptimizer: () => {
    if (!instance) {
      instance = new QueryOptimizer()
    }
    return instance
  },
  QueryOptimizer
}
