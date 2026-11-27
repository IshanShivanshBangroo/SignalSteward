import { readSession, jsonError, canManage } from '../../lib/session.js';
export async function onRequestPost(context) {
  const sessionId = readSession(context);
  if (!sessionId) return jsonError('Invalid room link.', 400);
  if (!await canManage(context, sessionId)) return jsonError('Open this room in its facilitator browser to manage teams.', 403);
  await context.env.DB.prepare('DELETE FROM participants WHERE session_id = ?').bind(sessionId).run();
  return Response.json({ ok: true, sessionId });
}
