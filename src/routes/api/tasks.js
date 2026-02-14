const express = require('express');
const router = express.Router();
const { authenticate } = require('../../auth/middleware/security');
const db = require('../../services/database/db-service');

// PATCH /api/v1/tasks/:taskId
router.patch('/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Vérifier l'accès à la tâche
    const taskAccess = await db.query(`
      SELECT t.*, w.id as wedding_id
      FROM tasks t
      JOIN weddings w ON t.wedding_id = w.id
      JOIN user_weddings uw ON uw.wedding_id = w.id
      WHERE t.id = $1 AND uw.user_id = $2 AND uw.is_active = true
    `, [taskId, userId]);

    if (taskAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Construire la requête de mise à jour dynamiquement
    const allowedFields = ['title', 'description', 'status', 'priority', 'due_date', 'assigned_to', 'category'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Ajouter updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Ajouter l'ID de la tâche à la fin
    values.push(taskId);

    const updateQuery = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    io.to(`wedding:${taskAccess.rows[0].wedding_id}`).emit('task_updated', {
      task: result.rows[0],
      updatedBy: userId
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/tasks/:taskId
router.delete('/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Vérifier l'accès et obtenir l'ID du mariage
    const taskAccess = await db.query(`
      SELECT t.*, w.id as wedding_id, uw.role
      FROM tasks t
      JOIN weddings w ON t.wedding_id = w.id
      JOIN user_weddings uw ON uw.wedding_id = w.id
      WHERE t.id = $1 AND uw.user_id = $2 AND uw.is_active = true
    `, [taskId, userId]);

    if (taskAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Seuls les propriétaires du mariage ou les admins peuvent supprimer
    const userRole = taskAccess.rows[0].role;
    if (!['owner', 'admin', 'wedding_planner'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Supprimer la tâche
    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    io.to(`wedding:${taskAccess.rows[0].wedding_id}`).emit('task_deleted', {
      taskId,
      deletedBy: userId
    });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/tasks/:taskId/assign
router.post('/:taskId/assign', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assignedTo } = req.body;
    const userId = req.user.id;

    // Vérifier l'accès
    const taskAccess = await db.query(`
      SELECT t.*, w.id as wedding_id
      FROM tasks t
      JOIN weddings w ON t.wedding_id = w.id
      JOIN user_weddings uw ON uw.wedding_id = w.id
      WHERE t.id = $1 AND uw.user_id = $2 AND uw.is_active = true
    `, [taskId, userId]);

    if (taskAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Vérifier que la personne assignée a accès au mariage
    const assigneeAccess = await db.query(`
      SELECT 1 FROM user_weddings 
      WHERE user_id = $1 AND wedding_id = $2 AND is_active = true
    `, [assignedTo, taskAccess.rows[0].wedding_id]);

    if (assigneeAccess.rows.length === 0) {
      return res.status(400).json({ error: 'Assigned user does not have access to this wedding' });
    }

    // Mettre à jour l'assignation
    const result = await db.query(`
      UPDATE tasks 
      SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [assignedTo, taskId]);

    // Notification à la personne assignée
    const io = req.app.get('io');
    io.to(`user:${assignedTo}`).emit('task_assigned', {
      task: result.rows[0],
      assignedBy: userId
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/tasks/:taskId/complete
router.post('/:taskId/complete', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Vérifier l'accès
    const taskAccess = await db.query(`
      SELECT t.*, w.id as wedding_id
      FROM tasks t
      JOIN weddings w ON t.wedding_id = w.id
      JOIN user_weddings uw ON uw.wedding_id = w.id
      WHERE t.id = $1 AND uw.user_id = $2 AND uw.is_active = true
    `, [taskId, userId]);

    if (taskAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Marquer comme complété
    const result = await db.query(`
      UPDATE tasks 
      SET 
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        completed_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [userId, taskId]);

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    io.to(`wedding:${taskAccess.rows[0].wedding_id}`).emit('task_completed', {
      task: result.rows[0],
      completedBy: userId
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;