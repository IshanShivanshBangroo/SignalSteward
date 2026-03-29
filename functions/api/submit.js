import { evaluateParticipant } from '../../lib/evaluator.js';

function nowIso() {
  return new Date().toISOString();
}

export async function onRequestPost(context) {
  const payload = await context.request.json();
  const sessionId = String(payload?.sessionId || context.env.SESSION_ID || 'signal_edit_support_live');
  const name = String(payload?.name || '').trim().slice(0, 50);
  const transcript = Array.isArray(payload?.transcript) ? payload.transcript : [];

  if (!name) {
    return Response.json({ ok: false, error: 'Name is required.' }, { status: 400 });
  }
  if (!transcript.filter((item) => item?.role === 'user').length) {
    return Response.json({ ok: false, error: 'Transcript is empty.' }, { status: 400 });
  }

  const evaluation = await evaluateParticipant({ env: context.env, transcript });
  const updatedAt = nowIso();

  await context.env.DB.prepare(`
    INSERT INTO participants (
      session_id, name, transcript_json, public_excerpt, short_summary, compliment,
      situational_score, coordination_score, social_score,
      open_index, curated_index, stance_score, temporary_lean,
      final_group, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(session_id, name) DO UPDATE SET
      transcript_json = excluded.transcript_json,
      public_excerpt = excluded.public_excerpt,
      short_summary = excluded.short_summary,
      compliment = excluded.compliment,
      situational_score = excluded.situational_score,
      coordination_score = excluded.coordination_score,
      social_score = excluded.social_score,
      open_index = excluded.open_index,
      curated_index = excluded.curated_index,
      stance_score = excluded.stance_score,
      temporary_lean = excluded.temporary_lean,
      final_group = NULL,
      updated_at = excluded.updated_at
  `)
    .bind(
      sessionId,
      name,
      JSON.stringify(transcript),
      evaluation.publicExcerpt,
      evaluation.shortSummary,
      evaluation.compliment,
      evaluation.situationalScore,
      evaluation.coordinationScore,
      evaluation.socialScore,
      evaluation.openIndex,
      evaluation.curatedIndex,
      evaluation.stanceScore,
      evaluation.temporaryLean,
      updatedAt
    )
    .run();

  return Response.json({
    ok: true,
    participant: {
      name,
      finalGroup: null,
      ...evaluation
    }
  });
}
