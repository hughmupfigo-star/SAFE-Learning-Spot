import express from 'express';
import { pool } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';
import COURSES from './coursesData.js';

const router = express.Router();

// All courses data is imported from coursesData.js

// Get all courses with progress
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Prevent caching issues - force fresh response
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    console.log('Fetching courses for user:', userId);

    // Get user progress for all courses
    const progressResult = await pool.query(
      'SELECT course_id, completed FROM course_progress WHERE user_id = $1',
      [userId]
    );

    console.log('Progress result:', progressResult.rows.length, 'records');

    const completedCourses = new Set(
      progressResult.rows.filter(p => p.completed).map(p => p.course_id)
    );

    const coursesWithProgress = COURSES.map(course => ({
      ...course,
      completed: completedCourses.has(course.id),
      moduleCount: course.modules.length
    }));

    console.log('Returning', coursesWithProgress.length, 'courses');
    res.json(coursesWithProgress);
  } catch (err) {
    console.error('Get courses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get specific course with modules
router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    // Prevent caching issues - force fresh response
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    console.log('Fetching course:', courseId, 'for user:', userId);

    const course = COURSES.find(c => c.id === parseInt(courseId));
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get progress for this course
    const progressResult = await pool.query(
      'SELECT completed FROM course_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    const completed = progressResult.rows.length > 0 ? progressResult.rows[0].completed : false;

    console.log('Returning course with completed:', completed);
    res.json({
      ...course,
      completed
    });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

export default router;
