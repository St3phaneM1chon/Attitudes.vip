/**
 * Vendor Controller - Gestion des fournisseurs
 * Recherche, filtres, gestion des vendors
 */

const { Pool } = require('pg')
const Joi = require('joi')
const { v4: uuidv4 } = require('uuid')

// Configuration base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Schémas de validation
const vendorSchema = Joi.object({
  vendor_type: Joi.string().valid(
    'photographer', 'dj', 'caterer', 'florist', 'planner',
    'venue', 'baker', 'musician', 'decorator', 'transportation'
  ).required(),
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  address: Joi.string().max(500).optional(),
  services: Joi.object().optional(),
  pricing: Joi.number().precision(2).min(0).optional(),
  notes: Joi.string().max(1000).optional()
})

const updateVendorSchema = Joi.object({
  vendor_type: Joi.string().valid(
    'photographer', 'dj', 'caterer', 'florist', 'planner',
    'venue', 'baker', 'musician', 'decorator', 'transportation'
  ).optional(),
  name: Joi.string().min(2).max(255).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  address: Joi.string().max(500).optional(),
  services: Joi.object().optional(),
  pricing: Joi.number().precision(2).min(0).optional(),
  status: Joi.string().valid('contacted', 'quoted', 'booked', 'completed', 'cancelled').optional(),
  notes: Joi.string().max(1000).optional()
})

const searchSchema = Joi.object({
  q: Joi.string().min(1).max(100).optional(),
  filters: Joi.object({
    vendor_types: Joi.array().items(Joi.string()).optional(),
    location: Joi.string().max(100).optional(),
    min_price: Joi.number().min(0).optional(),
    max_price: Joi.number().min(0).optional(),
    min_rating: Joi.number().min(1).max(5).optional(),
    available_dates: Joi.array().items(Joi.date()).optional(),
    max_distance: Joi.number().min(0).optional()
  }).optional(),
  sort: Joi.string().valid('price_asc', 'price_desc', 'rating_desc', 'distance', 'name').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional()
})

class VendorController {
  // Créer un nouveau vendor
  async createVendor (req, res) {
    try {
      const { error, value } = vendorSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { wedding_id } = req.body
      const { customer_id } = req.user
      const id = uuidv4()

      // Vérifier que le wedding appartient à l'utilisateur
      if (wedding_id) {
        const weddingCheck = await pool.query(
          'SELECT id FROM weddings WHERE id = $1 AND customer_id = $2',
          [wedding_id, customer_id]
        )

        if (weddingCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Wedding not found or access denied'
          })
        }
      }

      const query = `
        INSERT INTO vendors (
          id, wedding_id, vendor_type, name, email, phone,
          address, services, pricing, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `

      const values = [
        id,
        wedding_id,
        value.vendor_type,
        value.name,
        value.email,
        value.phone,
        value.address,
        value.services ? JSON.stringify(value.services) : null,
        value.pricing,
        value.notes
      ]

      const result = await pool.query(query, values)

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Vendor created successfully'
      })
    } catch (error) {
      console.error('Error creating vendor:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Recherche avancée de vendors
  async searchVendors (req, res) {
    try {
      const { error, value } = searchSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const {
        q = '',
        filters = {},
        sort = 'name',
        limit = 20,
        offset = 0
      } = value

      // Construction de la requête dynamique
      let baseQuery = `
        SELECT DISTINCT v.*,
               AVG(r.rating) as average_rating,
               COUNT(r.id) as review_count,
               COUNT(DISTINCT vp.id) as package_count,
               json_agg(DISTINCT jsonb_build_object(
                 'id', vp.id,
                 'name', vp.name,
                 'price', vp.price,
                 'duration_hours', vp.duration_hours
               )) FILTER (WHERE vp.id IS NOT NULL) as packages
        FROM vendors v
        LEFT JOIN reviews r ON v.id = r.vendor_id AND r.is_published = true
        LEFT JOIN vendor_packages vp ON v.id = vp.vendor_id AND vp.is_active = true
        LEFT JOIN vendor_availability va ON v.id = va.vendor_id
      `

      const conditions = []
      const queryParams = []
      let paramCount = 0

      // Recherche textuelle
      if (q) {
        paramCount++
        conditions.push(`(
          v.name ILIKE $${paramCount} OR 
          v.vendor_type ILIKE $${paramCount} OR
          v.address ILIKE $${paramCount}
        )`)
        queryParams.push(`%${q}%`)
      }

      // Filtres
      if (filters.vendor_types && filters.vendor_types.length > 0) {
        paramCount++
        conditions.push(`v.vendor_type = ANY($${paramCount})`)
        queryParams.push(filters.vendor_types)
      }

      if (filters.location) {
        paramCount++
        conditions.push(`v.address ILIKE $${paramCount}`)
        queryParams.push(`%${filters.location}%`)
      }

      if (filters.min_price) {
        paramCount++
        conditions.push(`v.pricing >= $${paramCount}`)
        queryParams.push(filters.min_price)
      }

      if (filters.max_price) {
        paramCount++
        conditions.push(`v.pricing <= $${paramCount}`)
        queryParams.push(filters.max_price)
      }

      // Disponibilité pour des dates spécifiques
      if (filters.available_dates && filters.available_dates.length > 0) {
        paramCount++
        conditions.push(`
          NOT EXISTS (
            SELECT 1 FROM vendor_availability va2 
            WHERE va2.vendor_id = v.id 
            AND va2.date = ANY($${paramCount}) 
            AND va2.is_available = false
          )
        `)
        queryParams.push(filters.available_dates)
      }

      // Construction de la clause WHERE
      if (conditions.length > 0) {
        baseQuery += ` WHERE ${conditions.join(' AND ')}`
      }

      // GROUP BY
      baseQuery += `
        GROUP BY v.id, v.wedding_id, v.user_id, v.vendor_type, v.name, 
                 v.email, v.phone, v.address, v.services, v.pricing, 
                 v.status, v.notes, v.created_at, v.updated_at
      `

      // Filtre par rating (après GROUP BY)
      if (filters.min_rating) {
        paramCount++
        baseQuery += ` HAVING AVG(r.rating) >= $${paramCount}`
        queryParams.push(filters.min_rating)
      }

      // Tri
      const sortMap = {
        price_asc: 'v.pricing ASC NULLS LAST',
        price_desc: 'v.pricing DESC NULLS LAST',
        rating_desc: 'AVG(r.rating) DESC NULLS LAST',
        name: 'v.name ASC',
        distance: 'v.address ASC' // TODO: implémenter calcul distance géographique
      }

      baseQuery += ` ORDER BY ${sortMap[sort] || sortMap.name}`

      // Pagination
      paramCount += 2
      baseQuery += ` LIMIT $${paramCount - 1} OFFSET $${paramCount}`
      queryParams.push(limit, offset)

      const result = await pool.query(baseQuery, queryParams)

      // Compter le total pour la pagination
      let countQuery = `
        SELECT COUNT(DISTINCT v.id) as total
        FROM vendors v
        LEFT JOIN reviews r ON v.id = r.vendor_id AND r.is_published = true
        LEFT JOIN vendor_availability va ON v.id = va.vendor_id
      `

      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`
      }

      const countParams = queryParams.slice(0, -2) // Enlever limit et offset
      const countResult = await pool.query(countQuery, countParams)

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(countResult.rows[0].total / limit)
        },
        filters_applied: filters,
        search_query: q
      })
    } catch (error) {
      console.error('Error searching vendors:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir tous les vendors d'un mariage
  async getWeddingVendors (req, res) {
    try {
      const { wedding_id } = req.params
      const { customer_id } = req.user
      const { status, vendor_type } = req.query

      // Vérifier que le wedding appartient à l'utilisateur
      const weddingCheck = await pool.query(
        'SELECT id FROM weddings WHERE id = $1 AND customer_id = $2',
        [wedding_id, customer_id]
      )

      if (weddingCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Wedding not found'
        })
      }

      let query = `
        SELECT v.*,
               AVG(r.rating) as average_rating,
               COUNT(r.id) as review_count,
               json_agg(DISTINCT jsonb_build_object(
                 'id', b.id,
                 'status', b.status,
                 'service_date', b.service_date,
                 'booking_amount', b.booking_amount
               )) FILTER (WHERE b.id IS NOT NULL) as bookings
        FROM vendors v
        LEFT JOIN reviews r ON v.id = r.vendor_id AND r.is_published = true
        LEFT JOIN bookings b ON v.id = b.vendor_id
        WHERE v.wedding_id = $1
      `

      const values = [wedding_id]
      let paramCount = 1

      if (status) {
        paramCount++
        query += ` AND v.status = $${paramCount}`
        values.push(status)
      }

      if (vendor_type) {
        paramCount++
        query += ` AND v.vendor_type = $${paramCount}`
        values.push(vendor_type)
      }

      query += `
        GROUP BY v.id
        ORDER BY v.vendor_type, v.name
      `

      const result = await pool.query(query, values)

      res.json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching wedding vendors:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir un vendor spécifique
  async getVendor (req, res) {
    try {
      const { id } = req.params

      const query = `
        SELECT v.*,
               AVG(r.rating) as average_rating,
               COUNT(r.id) as review_count,
               json_agg(DISTINCT jsonb_build_object(
                 'id', vp.id,
                 'name', vp.name,
                 'description', vp.description,
                 'price', vp.price,
                 'duration_hours', vp.duration_hours,
                 'included_services', vp.included_services,
                 'max_guests', vp.max_guests
               )) FILTER (WHERE vp.id IS NOT NULL) as packages,
               json_agg(DISTINCT jsonb_build_object(
                 'id', r.id,
                 'rating', r.rating,
                 'review_text', r.review_text,
                 'customer_name', u.first_name || ' ' || u.last_name,
                 'created_at', r.created_at
               )) FILTER (WHERE r.id IS NOT NULL AND r.is_published = true) as reviews
        FROM vendors v
        LEFT JOIN vendor_packages vp ON v.id = vp.vendor_id AND vp.is_active = true
        LEFT JOIN reviews r ON v.id = r.vendor_id AND r.is_published = true
        LEFT JOIN users u ON r.customer_id = u.id
        WHERE v.id = $1
        GROUP BY v.id
      `

      const result = await pool.query(query, [id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        })
      }

      res.json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error fetching vendor:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Vérifier disponibilité vendor
  async checkAvailability (req, res) {
    try {
      const { id } = req.params
      const { date, start_time, end_time } = req.query

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date is required'
        })
      }

      const query = `
        SELECT 
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM vendor_availability va 
              WHERE va.vendor_id = $1 
              AND va.date = $2 
              AND va.is_available = false
            ) THEN false
            WHEN EXISTS (
              SELECT 1 FROM bookings b 
              WHERE b.vendor_id = $1 
              AND b.service_date = $2 
              AND b.status IN ('confirmed', 'pending')
              ${start_time && end_time
? `
                AND (
                  (b.start_time, b.end_time) OVERLAPS ($3::time, $4::time)
                )
              `
: ''}
            ) THEN false
            ELSE true
          END as is_available,
          json_agg(DISTINCT jsonb_build_object(
            'start_time', b.start_time,
            'end_time', b.end_time,
            'status', b.status
          )) FILTER (WHERE b.id IS NOT NULL) as existing_bookings
        FROM vendors v
        LEFT JOIN bookings b ON v.id = b.vendor_id AND b.service_date = $2
        WHERE v.id = $1
        GROUP BY v.id
      `

      const values = [id, date]
      if (start_time && end_time) {
        values.push(start_time, end_time)
      }

      const result = await pool.query(query, values)

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        })
      }

      res.json({
        success: true,
        data: {
          vendor_id: id,
          date,
          is_available: result.rows[0].is_available,
          existing_bookings: result.rows[0].existing_bookings || []
        }
      })
    } catch (error) {
      console.error('Error checking availability:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Mettre à jour un vendor
  async updateVendor (req, res) {
    try {
      const { id } = req.params
      const { customer_id } = req.user

      const { error, value } = updateVendorSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      // Vérifier que le vendor appartient à un wedding de l'utilisateur
      const checkQuery = `
        SELECT v.* FROM vendors v
        JOIN weddings w ON v.wedding_id = w.id
        WHERE v.id = $1 AND w.customer_id = $2
      `
      const checkResult = await pool.query(checkQuery, [id, customer_id])

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        })
      }

      // Construire la requête de mise à jour
      const updates = []
      const values = [id]
      let paramCount = 1

      Object.keys(value).forEach(key => {
        if (value[key] !== undefined) {
          paramCount++
          if (key === 'services') {
            updates.push(`${key} = $${paramCount}`)
            values.push(JSON.stringify(value[key]))
          } else {
            updates.push(`${key} = $${paramCount}`)
            values.push(value[key])
          }
        }
      })

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        })
      }

      const query = `
        UPDATE vendors 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `

      const result = await pool.query(query, values)

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Vendor updated successfully'
      })
    } catch (error) {
      console.error('Error updating vendor:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Supprimer un vendor
  async deleteVendor (req, res) {
    try {
      const { id } = req.params
      const { customer_id } = req.user

      // Vérifier que le vendor appartient à un wedding de l'utilisateur
      const checkQuery = `
        SELECT v.* FROM vendors v
        JOIN weddings w ON v.wedding_id = w.id
        WHERE v.id = $1 AND w.customer_id = $2
      `
      const checkResult = await pool.query(checkQuery, [id, customer_id])

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found'
        })
      }

      // Vérifier qu'il n'y a pas de bookings confirmés
      const bookingCheck = await pool.query(
        'SELECT id FROM bookings WHERE vendor_id = $1 AND status = $2',
        [id, 'confirmed']
      )

      if (bookingCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete vendor with confirmed bookings'
        })
      }

      // Supprimer
      const deleteQuery = 'DELETE FROM vendors WHERE id = $1'
      await pool.query(deleteQuery, [id])

      res.json({
        success: true,
        message: 'Vendor deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting vendor:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

module.exports = new VendorController()
