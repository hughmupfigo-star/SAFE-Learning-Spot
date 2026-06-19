import express from 'express';
import { pool } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Save progress for a course
router.post('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;
    const { completed } = req.body;

    // Check if progress record exists
    const existingProgress = await pool.query(
      'SELECT id FROM course_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existingProgress.rows.length > 0) {
      // Update existing progress
      await pool.query(
        'UPDATE course_progress SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND course_id = $3',
        [completed, userId, courseId]
      );
    } else {
      // Create new progress record
      await pool.query(
        'INSERT INTO course_progress (user_id, course_id, completed) VALUES ($1, $2, $3)',
        [userId, courseId, completed]
      );
    }

    res.json({ success: true, courseId, completed });
  } catch (err) {
    console.error('Progress save error:', err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Get progress for a specific course
router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT completed, updated_at FROM course_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (result.rows.length === 0) {
      return res.json({ courseId, completed: false });
    }

    res.json({
      courseId,
      completed: result.rows[0].completed,
      lastUpdated: result.rows[0].updated_at
    });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get all progress for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT course_id, completed, updated_at FROM course_progress WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get all progress error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

export default router;
