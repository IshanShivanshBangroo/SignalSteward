export async function onRequestPost(context) {
  const sessionId = context.env.SESSION_ID || 'signal_edit_support_live';
  await context.env.DB.prepare('DELETE FROM participants WHERE session_id = ?').bind(sessionId).run();
  return Response.json({ ok: true, sessionId });
}
