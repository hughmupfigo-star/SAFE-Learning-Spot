// Per-course progress: GET single course, GET all, POST update.

import { json, error, readJson } from '../lib/response.js';
import { getUserFromRequest } from '../lib/auth-middleware.js';

export async function listProgress(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return error('Unauthorized', 401);

  const rs = await env.DB.prepare(
    'SELECT course_id, completed, updated_at FROM course_progress WHERE user_id = ?1 ORDER BY updated_at DESC'
  ).bind(user.userId).all();

  return json(rs.results || []);
}

export async function getCourseProgress(request, env, params) {
  const user = await getUserFromRequest(request, env);
  if (!user) return error('Unauthorized', 401);

  const courseId = Number(params.courseId);
  if (!Number.isFinite(courseId)) return error('Invalid course id', 400);

  const row = await env.DB.prepare(
    'SELECT completed, updated_at FROM course_progress WHERE user_id = ?1 AND course_id = ?2'
  ).bind(user.userId, courseId).first();

  if (!row) return json({ courseId, completed: false });
  return json({ courseId, completed: !!row.completed, lastUpdated: row.updated_at });
}

export async function setCourseProgress(request, env, params) {
  const user = await getUserFromRequest(request, env);
  if (!user) return error('Unauthorized', 401);

  const courseId = Number(params.courseId);
  if (!Number.isFinite(courseId)) return error('Invalid course id', 400);

  const body = await readJson(request);
  const completed = body && body.completed ? 1 : 0;
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO course_progress (user_id, course_id, completed, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(user_id, course_id)
     DO UPDATE SET completed = excluded.completed, updated_at = excluded.updated_at`
  ).bind(user.userId, courseId, completed, now).run();

  return json({ success: true, courseId, completed: !!completed });
}
