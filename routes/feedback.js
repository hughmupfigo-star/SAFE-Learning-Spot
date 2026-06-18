import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Submit feedback for a course
router.post('/', authenticateToken, [
  body('courseId').isInt(),
  body('feedback').trim().notEmpty().isLength({ max: 5000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { courseId, feedback } = req.body;

    const result = await pool.query(
      'INSERT INTO course_feedback (user_id, course_id, feedback) VALUES ($1, $2, $3) RETURNING id, created_at',
      [userId, courseId, feedback]
    );

    res.status(201).json({
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
      message: 'Thank you for your feedback. We use it to keep improving.'
    });
  } catch (err) {
    console.error('Feedback submit error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get feedback for a course (admin only - in production, implement proper admin check)
router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      'SELECT id, feedback, created_at FROM course_feedback WHERE course_id = $1 ORDER BY created_at DESC',
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;
