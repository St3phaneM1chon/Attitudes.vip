/**
 * Wedding Controller - Gestion des mariages
 * CRUD complet pour les weddings
 */

const { Pool } = require('pg')
const Joi = require('joi')
const { v4: uuidv4 } = require('uuid')

// Configuration base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Schémas de validation
const weddingSchema = Joi.object({
  partner_name: Joi.string().min(2).max(100).required(),
  wedding_date: Joi.date().min('now').required(),
  venue_name: Joi.string().min(2).max(255).optional(),
  venue_address: Joi.string().max(500).optional(),
  guest_count: Joi.number().integer().min(1).max(10000).optional(),
  budget: Joi.number().precision(2).min(0).optional(),
  theme: Joi.string().max(100).optional()
})

const updateWeddingSchema = Joi.object({
  partner_name: Joi.string().min(2).max(100).optional(),
  wedding_date: Joi.date().min('now').optional(),
  venue_name: Joi.string().min(2).max(255).optional(),
  venue_address: Joi.string().max(500).optional(),
  guest_count: Joi.number().integer().min(1).max(10000).optional(),
  budget: Joi.number().precision(2).min(0).optional(),
  status: Joi.string().valid('planning', 'in_progress', 'completed', 'cancelled').optional(),
  theme: Joi.string().max(100).optional()
})

class WeddingController {
  // Créer un nouveau mariage
  async createWedding (req, res) {
    try {
      const { error, value } = weddingSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      const { customer_id } = req.user // Depuis le middleware auth
      const id = uuidv4()

      const query = `
        INSERT INTO weddings (
          id, customer_id, partner_name, wedding_date, venue_name,
          venue_address, guest_count, budget, theme
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `

      const values = [
        id,
        customer_id,
        value.partner_name,
        value.wedding_date,
        value.venue_name,
        value.venue_address,
        value.guest_count,
        value.budget,
        value.theme
      ]

      const result = await pool.query(query, values)

      // Log de création
      await this.logAudit(customer_id, 'CREATE', 'weddings', id, null, result.rows[0], req)

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Wedding created successfully'
      })
    } catch (error) {
      console.error('Error creating wedding:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir tous les mariages d'un utilisateur
  async getWeddings (req, res) {
    try {
      const { customer_id } = req.user
      const { status, limit = 10, offset = 0 } = req.query

      let query = `
        SELECT w.*, 
               COUNT(g.id) as guest_count_actual,
               COUNT(v.id) as vendor_count,
               COUNT(t.id) as task_count,
               COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
        FROM weddings w
        LEFT JOIN guests g ON w.id = g.wedding_id
        LEFT JOIN vendors v ON w.id = v.wedding_id
        LEFT JOIN tasks t ON w.id = t.wedding_id
        WHERE w.customer_id = $1
      `

      const values = [customer_id]
      let paramCount = 1

      if (status) {
        paramCount++
        query += ` AND w.status = $${paramCount}`
        values.push(status)
      }

      query += `
        GROUP BY w.id, w.customer_id, w.partner_name, w.wedding_date, 
                 w.venue_name, w.venue_address, w.guest_count, w.budget, 
                 w.status, w.theme, w.created_at, w.updated_at
        ORDER BY w.wedding_date ASC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `

      values.push(parseInt(limit), parseInt(offset))

      const result = await pool.query(query, values)

      // Compter le total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM weddings w 
        WHERE w.customer_id = $1 ${status ? 'AND w.status = $2' : ''}
      `
      const countValues = status ? [customer_id, status] : [customer_id]
      const countResult = await pool.query(countQuery, countValues)

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      })
    } catch (error) {
      console.error('Error fetching weddings:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Obtenir un mariage spécifique
  async getWedding (req, res) {
    try {
      const { id } = req.params
      const { customer_id } = req.user

      const query = `
        SELECT w.*,
               json_agg(DISTINCT jsonb_build_object(
                 'id', g.id,
                 'first_name', g.first_name,
                 'last_name', g.last_name,
                 'email', g.email,
                 'rsvp_status', g.rsvp_status,
                 'plus_one', g.plus_one
               )) FILTER (WHERE g.id IS NOT NULL) as guests,
               json_agg(DISTINCT jsonb_build_object(
                 'id', v.id,
                 'vendor_type', v.vendor_type,
                 'name', v.name,
                 'status', v.status,
                 'pricing', v.pricing
               )) FILTER (WHERE v.id IS NOT NULL) as vendors,
               json_agg(DISTINCT jsonb_build_object(
                 'id', t.id,
                 'title', t.title,
                 'status', t.status,
                 'due_date', t.due_date,
                 'priority', t.priority
               )) FILTER (WHERE t.id IS NOT NULL) as tasks
        FROM weddings w
        LEFT JOIN guests g ON w.id = g.wedding_id
        LEFT JOIN vendors v ON w.id = v.wedding_id
        LEFT JOIN tasks t ON w.id = t.wedding_id
        WHERE w.id = $1 AND w.customer_id = $2
        GROUP BY w.id
      `

      const result = await pool.query(query, [id, customer_id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Wedding not found'
        })
      }

      res.json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error fetching wedding:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Mettre à jour un mariage
  async updateWedding (req, res) {
    try {
      const { id } = req.params
      const { customer_id } = req.user

      const { error, value } = updateWeddingSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        })
      }

      // Vérifier que le mariage appartient à l'utilisateur
      const checkQuery = 'SELECT * FROM weddings WHERE id = $1 AND customer_id = $2'
      const checkResult = await pool.query(checkQuery, [id, customer_id])

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Wedding not found'
        })
      }

      const oldValues = checkResult.rows[0]

      // Construire la requête dynamiquement
      const updates = []
      const values = [id, customer_id]
      let paramCount = 2

      Object.keys(value).forEach(key => {
        if (value[key] !== undefined) {
          paramCount++
          updates.push(`${key} = $${paramCount}`)
          values.push(value[key])
        }
      })

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        })
      }

      const query = `
        UPDATE weddings 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND customer_id = $2
        RETURNING *
      `

      const result = await pool.query(query, values)

      // Log de modification
      await this.logAudit(customer_id, 'UPDATE', 'weddings', id, oldValues, result.rows[0], req)

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Wedding updated successfully'
      })
    } catch (error) {
      console.error('Error updating wedding:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Supprimer un mariage
  async deleteWedding (req, res) {
    try {
      const { id } = req.params
      const { customer_id } = req.user

      // Vérifier que le mariage appartient à l'utilisateur
      const checkQuery = 'SELECT * FROM weddings WHERE id = $1 AND customer_id = $2'
      const checkResult = await pool.query(checkQuery, [id, customer_id])

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Wedding not found'
        })
      }

      const oldValues = checkResult.rows[0]

      // Supprimer (les contraintes CASCADE supprimeront les données liées)
      const deleteQuery = 'DELETE FROM weddings WHERE id = $1 AND customer_id = $2'
      await pool.query(deleteQuery, [id, customer_id])

      // Log de suppression
      await this.logAudit(customer_id, 'DELETE', 'weddings', id, oldValues, null, req)

      res.json({
        success: true,
        message: 'Wedding deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting wedding:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Statistiques du mariage
  async getWeddingStats (req, res) {
    try {
      const { id } = req.params
      const { customer_id } = req.user

      const query = `
        SELECT 
          w.id,
          w.wedding_date,
          w.guest_count as estimated_guests,
          COUNT(DISTINCT g.id) as confirmed_guests,
          COUNT(DISTINCT CASE WHEN g.rsvp_status = 'confirmed' THEN g.id END) as rsvp_confirmed,
          COUNT(DISTINCT CASE WHEN g.rsvp_status = 'declined' THEN g.id END) as rsvp_declined,
          COUNT(DISTINCT CASE WHEN g.rsvp_status = 'pending' THEN g.id END) as rsvp_pending,
          COUNT(DISTINCT v.id) as total_vendors,
          COUNT(DISTINCT CASE WHEN v.status = 'booked' THEN v.id END) as vendors_booked,
          COUNT(DISTINCT t.id) as total_tasks,
          COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as tasks_completed,
          COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as tasks_pending,
          COUNT(DISTINCT b.id) as total_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as bookings_confirmed,
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount END), 0) as total_paid,
          COALESCE(w.budget, 0) as budget,
          EXTRACT(DAYS FROM (w.wedding_date - CURRENT_DATE)) as days_until_wedding
        FROM weddings w
        LEFT JOIN guests g ON w.id = g.wedding_id
        LEFT JOIN vendors v ON w.id = v.wedding_id
        LEFT JOIN tasks t ON w.id = t.wedding_id
        LEFT JOIN bookings b ON w.id = b.wedding_id
        LEFT JOIN payments p ON w.id = p.wedding_id
        WHERE w.id = $1 AND w.customer_id = $2
        GROUP BY w.id, w.wedding_date, w.guest_count, w.budget
      `

      const result = await pool.query(query, [id, customer_id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Wedding not found'
        })
      }

      const stats = result.rows[0]

      // Calculer les pourcentages
      const completion_percentage = stats.total_tasks > 0
        ? Math.round((stats.tasks_completed / stats.total_tasks) * 100)
        : 0

      const budget_spent_percentage = stats.budget > 0
        ? Math.round((stats.total_paid / stats.budget) * 100)
        : 0

      const rsvp_response_rate = stats.confirmed_guests > 0
        ? Math.round(((stats.rsvp_confirmed + stats.rsvp_declined) / stats.confirmed_guests) * 100)
        : 0

      res.json({
        success: true,
        data: {
          ...stats,
          completion_percentage,
          budget_spent_percentage,
          rsvp_response_rate,
          budget_remaining: stats.budget - stats.total_paid
        }
      })
    } catch (error) {
      console.error('Error fetching wedding stats:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // Log d'audit
  async logAudit (userId, action, tableName, recordId, oldValues, newValues, req) {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `

      await pool.query(query, [
        userId,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req.ip,
        req.get('User-Agent')
      ])
    } catch (error) {
      console.error('Error logging audit:', error)
    }
  }
}

module.exports = new WeddingController()
