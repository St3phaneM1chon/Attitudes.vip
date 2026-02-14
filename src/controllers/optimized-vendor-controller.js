/**
 * Contrôleur Vendor optimisé avec cache et monitoring
 * Exemple d'utilisation des optimisations de performance
 */

const { withCache, withOptimizedQuery, dashboardOptimizations } = require('../config/performance-config')
const { getRedisCacheService } = require('../services/cache/redis-cache-service')
const { getQueryOptimizer } = require('../services/database/query-optimizer')

const cache = getRedisCacheService()
const db = getQueryOptimizer()

class OptimizedVendorController {
  /**
   * Obtenir la liste des vendors avec cache et pagination
   */
  static getVendors = [
    withCache('vendor', (req) => `vendors:list:${JSON.stringify(req.query)}`),
    withOptimizedQuery(),
    async (req, res) => {
      try {
        const {
          page = 1,
          limit = 20,
          type,
          location,
          minRating,
          maxPrice,
          search
        } = req.query

        // Vérifier le cache
        let vendors = await req.cache.get()

        if (!vendors) {
          // Construire la requête optimisée
          let sql = `
            WITH vendor_stats AS (
              SELECT 
                v.*,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as review_count,
                COUNT(DISTINCT wv.wedding_id) as booking_count,
                ARRAY_AGG(DISTINCT vi.image_url) FILTER (WHERE vi.image_url IS NOT NULL) as images
              FROM vendors v
              LEFT JOIN reviews r ON r.vendor_id = v.id
              LEFT JOIN wedding_vendors wv ON wv.vendor_id = v.id
              LEFT JOIN vendor_images vi ON vi.vendor_id = v.id
              WHERE v.active = true
          `

          const params = []
          let paramIndex = 1

          // Filtres dynamiques
          if (type) {
            sql += ` AND v.type = $${paramIndex}`
            params.push(type)
            paramIndex++
          }

          if (location) {
            sql += ` AND v.location_id = $${paramIndex}`
            params.push(location)
            paramIndex++
          }

          if (search) {
            sql += ` AND (v.name ILIKE $${paramIndex} OR v.description ILIKE $${paramIndex})`
            params.push(`%${search}%`)
            paramIndex++
          }

          sql += `
              GROUP BY v.id
            )
            SELECT * FROM vendor_stats
            WHERE 1=1
          `

          // Filtres sur les agrégations
          if (minRating) {
            sql += ` AND avg_rating >= ${parseFloat(minRating)}`
          }

          if (maxPrice) {
            sql += ` AND base_price <= ${parseFloat(maxPrice)}`
          }

          // Tri et pagination
          sql += `
            ORDER BY avg_rating DESC, booking_count DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
          `

          params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))

          // Exécuter la requête optimisée
          vendors = await req.db.query(sql, params, {
            cacheKey: req.cache.key,
            cacheTTL: 300 // 5 minutes
          })

          // Enrichir avec des données additionnelles en parallèle
          const enrichedVendors = await Promise.all(
            vendors.map(async (vendor) => {
              // Obtenir la disponibilité (avec cache individuel)
              const availability = await cache.getOrSet(
                `vendor:${vendor.id}:availability`,
                async () => {
                  const result = await db.query(
                    'SELECT date FROM vendor_availability WHERE vendor_id = $1 AND available = true AND date >= CURRENT_DATE',
                    [vendor.id]
                  )
                  return result.map(row => row.date)
                },
                'vendors',
                1800 // 30 minutes
              )

              return {
                ...vendor,
                availability: availability.slice(0, 10) // 10 prochaines dates
              }
            })
          )

          // Mettre en cache le résultat enrichi
          await req.cache.set(enrichedVendors)
          vendors = enrichedVendors
        }

        // Obtenir le nombre total pour la pagination
        const totalCount = await cache.getOrSet(
          `vendors:count:${type || 'all'}`,
          async () => {
            const result = await db.query(
              'SELECT COUNT(*) as count FROM vendors WHERE active = true' +
              (type ? ' AND type = $1' : ''),
              type ? [type] : []
            )
            return result[0].count
          },
          'vendors',
          3600 // 1 heure
        )

        res.json({
          success: true,
          data: vendors,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(totalCount),
            pages: Math.ceil(totalCount / limit)
          }
        })
      } catch (error) {
        console.error('Error fetching vendors:', error)
        res.status(500).json({
          success: false,
          error: 'Failed to fetch vendors'
        })
      }
    }
  ]

  /**
   * Obtenir un vendor par ID avec toutes ses données
   */
  static getVendorById = [
    withCache('vendor', (req) => `vendor:${req.params.id}:full`),
    withOptimizedQuery(),
    async (req, res) => {
      try {
        const { id } = req.params

        // Vérifier le cache
        let vendor = await req.cache.get()

        if (!vendor) {
          // Charger toutes les données en parallèle
          const [vendorData, reviews, packages, portfolio] = await Promise.all([
            // Données de base du vendor
            db.query(
              `SELECT v.*, 
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as review_count
              FROM vendors v
              LEFT JOIN reviews r ON r.vendor_id = v.id
              WHERE v.id = $1
              GROUP BY v.id`,
              [id]
            ),

            // Reviews récentes
            db.query(
              `SELECT r.*, u.name as user_name, u.avatar_url
              FROM reviews r
              JOIN users u ON u.id = r.user_id
              WHERE r.vendor_id = $1
              ORDER BY r.created_at DESC
              LIMIT 10`,
              [id]
            ),

            // Packages/Services
            db.query(
              'SELECT * FROM vendor_packages WHERE vendor_id = $1 AND active = true',
              [id]
            ),

            // Portfolio
            db.query(
              'SELECT * FROM vendor_portfolio WHERE vendor_id = $1 ORDER BY display_order',
              [id]
            )
          ])

          if (!vendorData || vendorData.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'Vendor not found'
            })
          }

          vendor = {
            ...vendorData[0],
            reviews,
            packages,
            portfolio
          }

          // Mettre en cache
          await req.cache.set(vendor)
        }

        // Tracker la vue (async, pas besoin d'attendre)
        db.query(
          'UPDATE vendors SET view_count = view_count + 1 WHERE id = $1',
          [id]
        ).catch(console.error)

        res.json({
          success: true,
          data: vendor
        })
      } catch (error) {
        console.error('Error fetching vendor:', error)
        res.status(500).json({
          success: false,
          error: 'Failed to fetch vendor'
        })
      }
    }
  ]

  /**
   * Créer un nouveau vendor
   */
  static createVendor = [
    withOptimizedQuery(),
    async (req, res) => {
      try {
        const vendorData = req.body
        const userId = req.user.id

        // Transaction pour créer le vendor et les données associées
        const vendor = await req.db.transaction(async (client) => {
          // Créer le vendor
          const vendorResult = await client.query(
            `INSERT INTO vendors (
              user_id, name, type, description, base_price, 
              location_id, phone, email, website
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
              userId,
              vendorData.name,
              vendorData.type,
              vendorData.description,
              vendorData.base_price,
              vendorData.location_id,
              vendorData.phone,
              vendorData.email,
              vendorData.website
            ]
          )

          const vendor = vendorResult.rows[0]

          // Créer les packages si fournis
          if (vendorData.packages && vendorData.packages.length > 0) {
            const packageValues = vendorData.packages.map((pkg, index) =>
              `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`
            ).join(', ')

            const packageParams = [vendor.id]
            vendorData.packages.forEach(pkg => {
              packageParams.push(pkg.name, pkg.description, pkg.price, pkg.features)
            })

            await client.query(
              `INSERT INTO vendor_packages (vendor_id, name, description, price, features)
              VALUES ${packageValues}`,
              packageParams
            )
          }

          return vendor
        })

        // Invalider les caches pertinents
        await Promise.all([
          cache.invalidatePattern('vendors:list:*', 'vendors'),
          cache.invalidatePattern('vendors:count:*', 'vendors'),
          cache.invalidateTag('vendor-list')
        ])

        res.status(201).json({
          success: true,
          data: vendor
        })
      } catch (error) {
        console.error('Error creating vendor:', error)
        res.status(500).json({
          success: false,
          error: 'Failed to create vendor'
        })
      }
    }
  ]

  /**
   * Mettre à jour un vendor
   */
  static updateVendor = [
    withOptimizedQuery(),
    async (req, res) => {
      try {
        const { id } = req.params
        const updates = req.body

        // Vérifier les permissions
        const vendorCheck = await db.query(
          'SELECT user_id FROM vendors WHERE id = $1',
          [id]
        )

        if (!vendorCheck.length || vendorCheck[0].user_id !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden'
          })
        }

        // Mettre à jour avec invalidation du cache
        const vendor = await req.db.update('vendors', id, updates, [
          'vendor-list',
          `vendor-${id}`
        ])

        // Invalider les caches spécifiques
        await Promise.all([
          cache.invalidate(`vendor:${id}:full`, 'vendors'),
          cache.invalidatePattern('vendors:list:*', 'vendors')
        ])

        res.json({
          success: true,
          data: vendor
        })
      } catch (error) {
        console.error('Error updating vendor:', error)
        res.status(500).json({
          success: false,
          error: 'Failed to update vendor'
        })
      }
    }
  ]

  /**
   * Recherche avancée de vendors avec scoring
   */
  static searchVendors = [
    withOptimizedQuery(),
    async (req, res) => {
      try {
        const { q, filters = {} } = req.body

        // Utiliser la recherche optimisée avec full-text search
        const vendors = await db.searchVendors(q, filters)

        // Enrichir avec score de pertinence
        const scoredVendors = vendors.map(vendor => ({
          ...vendor,
          relevanceScore: calculateRelevanceScore(vendor, q, filters)
        }))

        // Trier par pertinence
        scoredVendors.sort((a, b) => b.relevanceScore - a.relevanceScore)

        res.json({
          success: true,
          data: scoredVendors,
          query: q,
          filters
        })
      } catch (error) {
        console.error('Error searching vendors:', error)
        res.status(500).json({
          success: false,
          error: 'Failed to search vendors'
        })
      }
    }
  ]
}

/**
 * Calculer le score de pertinence pour le tri
 */
function calculateRelevanceScore (vendor, query, filters) {
  let score = vendor.rank || 0 // Score de recherche full-text

  // Bonus pour rating élevé
  score += vendor.avg_rating * 2

  // Bonus pour nombre de reviews
  score += Math.log(vendor.review_count + 1)

  // Bonus si correspond exactement au type recherché
  if (filters.type && vendor.type === filters.type) {
    score += 5
  }

  // Bonus pour disponibilité
  if (vendor.availability && vendor.availability.length > 0) {
    score += 3
  }

  return score
}

module.exports = OptimizedVendorController
