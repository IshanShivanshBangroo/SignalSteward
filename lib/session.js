// A join link identifies a room. Only the browser holding the corresponding
// random key may assign teams or clear that room.
const roomId = /^room_[0-9a-f]{48}$/;
const privateKey = /^[0-9a-f]{64}$/;

export function readSession(context) {
  const id = new URL(context.request.url).searchParams.get('room');
  if (id === null || id === 'classroom') return context.env.SESSION_ID || 'signal_edit_support_live';
  if (roomId.test(id)) return id;
  return null;
}

export function jsonError(message, status) {
  return Response.json({ok:false, error:message}, {status, headers:{'Cache-Control':'no-store'}});
}

export async function canManage(context, session) {
  if (!session) return false;
  const credential = context.request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!credential) return false;
  if (roomId.test(session)) {
    if (!privateKey.test(credential)) return false;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential));
    const digest = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,'0')).join('');
    return session === 'room_' + digest.slice(0,48);
  }
  const key = context.env.LEGACY_FACILITATOR_KEY;
  if (typeof key !== 'string' || !key) return false;
  const digest = text => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const [actual,expected] = await Promise.all([digest(credential),digest(key)]);
  return crypto.subtle.timingSafeEqual
    ? crypto.subtle.timingSafeEqual(actual,expected)
    : new Uint8Array(actual).reduce((diff,n,i)=>diff | (n ^ new Uint8Array(expected)[i]),0) === 0;
}
