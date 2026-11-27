import { readSession, jsonError, canManage } from '../../lib/session.js';
import { withLabels } from '../../lib/evaluator.js';

export async function onRequestPost(context) {
  const sessionId = readSession(context);
  if (!sessionId) return jsonError('Invalid room link.', 400);
  if (!await canManage(context, sessionId)) return jsonError('Open this room in its facilitator browser to manage teams.', 403);
  // Rank and assign against the same snapshot. Tied scores retain entry order.
  await context.env.DB.prepare(`
    WITH ranked AS MATERIALIZED (
      SELECT id, ROW_NUMBER() OVER (ORDER BY stance_score DESC, id ASC) AS position,
             COUNT(*) OVER () AS total
      FROM participants WHERE session_id = ?
    )
    UPDATE participants SET final_group = (
      SELECT CASE WHEN position <= (total + 1) / 2 THEN 'signal' ELSE 'stewardship' END
      FROM ranked WHERE ranked.id = participants.id
    ) WHERE session_id = ?
  `).bind(sessionId, sessionId).run();

  const updatedRows = await context.env.DB.prepare(`
    SELECT name, public_excerpt as publicExcerpt, short_summary as shortSummary, compliment,
           situational_score as situationalScore,
           coordination_score as coordinationScore,
           social_score as socialScore,
           open_index as openIndex,
           curated_index as curatedIndex,
           stance_score as stanceScore,
           temporary_lean as temporaryLean,
           final_group as finalGroup,
           updated_at as updatedAt
    FROM participants
    WHERE session_id = ?
    ORDER BY stance_score DESC, updated_at ASC
  `).bind(sessionId).all();

  return Response.json({
    ok: true,
    sessionId,
    participants: (updatedRows.results || []).map((item) => withLabels(item))
  });
}
