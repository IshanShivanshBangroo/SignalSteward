import { withLabels } from '../../lib/evaluator.js';

export async function onRequestGet(context) {
  const sessionId = context.env.SESSION_ID || 'signal_edit_support_live';
  const rows = await context.env.DB.prepare(`
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

  const participants = (rows.results || []).map((item) => withLabels(item));
  return Response.json({ ok: true, sessionId, participants });
}
