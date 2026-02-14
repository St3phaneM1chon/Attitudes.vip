const express = require('express');
const router = express.Router();
const { authenticate } = require('../../auth/middleware/security');
const { query, validationResult } = require('express-validator');
const db = require('../../services/database/db-service');

// GET /api/v1/weddings/:weddingId
router.get('/:weddingId', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;

    // Vérifier l'accès au mariage
    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Récupérer les données complètes du mariage
    const wedding = await db.query(`
      SELECT 
        w.*,
        EXTRACT(DAY FROM (w.wedding_date - CURRENT_DATE)) as days_until_wedding,
        COUNT(DISTINCT g.id) as total_guests,
        COUNT(DISTINCT CASE WHEN g.status = 'confirmed' THEN g.id END) as confirmed_guests,
        COUNT(DISTINCT v.id) as total_vendors,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
      FROM weddings w
      LEFT JOIN guests g ON g.wedding_id = w.id
      LEFT JOIN wedding_vendors v ON v.wedding_id = w.id
      LEFT JOIN tasks t ON t.wedding_id = w.id
      WHERE w.id = $1
      GROUP BY w.id
    `, [weddingId]);

    if (!wedding.rows[0]) {
      return res.status(404).json({ error: 'Wedding not found' });
    }

    const weddingData = wedding.rows[0];

    // Récupérer les données supplémentaires en parallèle
    const [tasks, vendors, guests, budget, expenses] = await Promise.all([
      getWeddingTasks(weddingId),
      getWeddingVendors(weddingId),
      getWeddingGuestsOverview(weddingId),
      getWeddingBudget(weddingId),
      getWeddingExpenses(weddingId)
    ]);

    // Formater la réponse
    const response = {
      ...weddingData,
      daysUntilWedding: weddingData.days_until_wedding,
      tasks,
      vendors,
      guests,
      budget,
      expenses,
      statistics: {
        totalGuests: parseInt(weddingData.total_guests),
        confirmedGuests: parseInt(weddingData.confirmed_guests),
        totalVendors: parseInt(weddingData.total_vendors),
        totalTasks: parseInt(weddingData.total_tasks),
        completedTasks: parseInt(weddingData.completed_tasks),
        taskProgress: weddingData.total_tasks > 0 
          ? Math.round((weddingData.completed_tasks / weddingData.total_tasks) * 100) 
          : 0
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching wedding data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/weddings/:weddingId/tasks
router.get('/:weddingId/tasks', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = await getWeddingTasks(weddingId);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/weddings/:weddingId/tasks
router.post('/:weddingId/tasks', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;
    const { title, description, dueDate, priority, category, assignedTo } = req.body;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      INSERT INTO tasks (
        wedding_id, title, description, due_date, 
        priority, category, assigned_to, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [weddingId, title, description, dueDate, priority, category, assignedTo, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/weddings/:weddingId/vendors
router.get('/:weddingId/vendors', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const vendors = await getWeddingVendors(weddingId);
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/weddings/:weddingId/guests
router.get('/:weddingId/guests', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const guests = await db.query(`
      SELECT 
        g.*,
        CASE 
          WHEN g.meal_preference IS NOT NULL THEN g.meal_preference
          ELSE 'regular'
        END as meal_preference,
        g.table_number,
        g.responded_at
      FROM guests g
      WHERE g.wedding_id = $1
      ORDER BY g.name ASC
    `, [weddingId]);

    res.json(guests.rows);
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/weddings/:weddingId/emergency
router.post('/:weddingId/emergency', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;
    const { message, priority = 'urgent' } = req.body;

    const hasAccess = await checkWeddingAccess(userId, weddingId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Envoyer la notification d'urgence via WebSocket
    const io = req.app.get('io');
    io.to(`wedding:${weddingId}`).emit('emergency_broadcast', {
      message,
      priority,
      senderId: userId,
      senderName: req.user.name,
      timestamp: new Date()
    });

    // Enregistrer dans la base de données
    await db.query(`
      INSERT INTO emergency_broadcasts (
        wedding_id, sender_id, message, priority
      ) VALUES ($1, $2, $3, $4)
    `, [weddingId, userId, message, priority]);

    // Envoyer des notifications push/SMS si configuré
    // TODO: Implémenter les notifications

    res.json({ success: true, message: 'Emergency broadcast sent' });
  } catch (error) {
    console.error('Error sending emergency broadcast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
async function checkWeddingAccess(userId, weddingId) {
  const result = await db.query(`
    SELECT 1 FROM user_weddings 
    WHERE user_id = $1 AND wedding_id = $2 AND is_active = true
  `, [userId, weddingId]);
  
  return result.rows.length > 0;
}

async function getWeddingTasks(weddingId) {
  const result = await db.query(`
    SELECT 
      t.*,
      u.first_name || ' ' || u.last_name as assigned_to_name,
      EXTRACT(DAY FROM (t.due_date - CURRENT_DATE)) as days_until_due
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.wedding_id = $1
    ORDER BY 
      CASE 
        WHEN t.status = 'completed' THEN 3
        WHEN t.priority = 'urgent' THEN 0
        WHEN t.priority = 'high' THEN 1
        ELSE 2
      END,
      t.due_date ASC
  `, [weddingId]);
  
  return result.rows;
}

async function getWeddingVendors(weddingId) {
  const result = await db.query(`
    SELECT 
      wv.*,
      v.name,
      v.email,
      v.phone,
      v.category,
      v.description,
      v.rating,
      wv.contract_status,
      wv.payment_status,
      wv.price,
      wv.notes
    FROM wedding_vendors wv
    JOIN vendors v ON wv.vendor_id = v.id
    WHERE wv.wedding_id = $1 AND wv.is_active = true
    ORDER BY v.category, v.name
  `, [weddingId]);
  
  return result.rows;
}

async function getWeddingGuestsOverview(weddingId) {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
      COUNT(CASE WHEN meal_preference = 'vegetarian' THEN 1 END) as vegetarian,
      COUNT(CASE WHEN meal_preference = 'vegan' THEN 1 END) as vegan,
      COUNT(CASE WHEN meal_preference = 'halal' THEN 1 END) as halal,
      COUNT(CASE WHEN meal_preference = 'kosher' THEN 1 END) as kosher
    FROM guests
    WHERE wedding_id = $1
  `, [weddingId]);
  
  return result.rows[0];
}

async function getWeddingBudget(weddingId) {
  const result = await db.query(`
    SELECT * FROM wedding_budgets
    WHERE wedding_id = $1
  `, [weddingId]);
  
  return result.rows[0] || { total: 0, currency: 'EUR' };
}

async function getWeddingExpenses(weddingId) {
  const result = await db.query(`
    SELECT 
      e.*,
      v.name as vendor_name
    FROM expenses e
    LEFT JOIN vendors v ON e.vendor_id = v.id
    WHERE e.wedding_id = $1
    ORDER BY e.date DESC
    LIMIT 20
  `, [weddingId]);
  
  return result.rows;
}

module.exports = router;