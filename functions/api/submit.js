import { readSession, jsonError } from '../../lib/session.js';
import { evaluateParticipant, withLabels } from '../../lib/evaluator.js';

function nowIso() {
  return new Date().toISOString();
}

export async function onRequestPost(context) {
  const payload = await context.request.json();
  const sessionId = readSession(context);
  if (!sessionId) return jsonError('Invalid room link.', 400);
  if (payload.sessionId && payload.sessionId !== sessionId) return jsonError('Refresh the participant page and try again.', 400);
  const name = String(payload?.name || '').trim().slice(0, 50);
  const transcript = Array.isArray(payload?.transcript) ? payload.transcript : [];

  if (!name) {
    return Response.json({ ok: false, error: 'Name is required.' }, { status: 400 });
  }
  if (transcript.filter(item => item?.role === 'user' && typeof item.content === 'string' && item.content.trim()).length !== 3) {
    return Response.json({ ok: false, error: 'Answer all three prompts before finishing.' }, { status: 400 });
  }

  const evaluation = await evaluateParticipant({ env: context.env, transcript });
  const updatedAt = nowIso();

  const inserted = await context.env.DB.prepare(`
    INSERT INTO participants (
      session_id, name, transcript_json, public_excerpt, short_summary, compliment,
      situational_score, coordination_score, social_score,
      open_index, curated_index, stance_score, temporary_lean,
      final_group, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(session_id, name) DO NOTHING
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

  if ((inserted.meta?.changes ?? inserted.changes) === 0) {
    const rows = await context.env.DB.prepare(`
      SELECT name, transcript_json AS transcript, public_excerpt AS publicExcerpt,
             short_summary AS shortSummary, compliment, situational_score AS situationalScore,
             coordination_score AS coordinationScore, social_score AS socialScore,
             open_index AS openIndex, curated_index AS curatedIndex, stance_score AS stanceScore,
             temporary_lean AS temporaryLean, final_group AS finalGroup
      FROM participants WHERE session_id = ? AND name = ?
    `).bind(sessionId, name).all();
    const existing = rows.results?.[0];
    if (!existing || existing.transcript !== JSON.stringify(transcript)) {
      return jsonError('That name already has a card. Enter a different nickname, then press Finish again.', 409);
    }
    const { transcript: savedTranscript, ...card } = existing;
    return Response.json({ ok: true, participant: withLabels(card) });
  }

  return Response.json({
    ok: true,
    participant: {
      name,
      finalGroup: null,
      ...evaluation
    }
  });
}
