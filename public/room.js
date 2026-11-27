const roomFormat = /^room_[0-9a-f]{48}$/;
const hex = bytes => Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
const memory = new Map();
function stored(key, value) {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    if (value !== undefined) memory.set(key, value);
    return memory.get(key);
  }
}
function ownerKey(room) {
  return stored('signal-steward-facilitator-' + room);
}
export async function newRoom() {
  const key = hex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const room = 'room_' + hex(new Uint8Array(digest)).slice(0,48);
  stored('signal-steward-facilitator-' + room, key);
  stored('signal-steward-current-room', room);
  return room;
}
export async function openRoom() {
  const url = new URL(window.location.href);
  let room = url.searchParams.get('room');
  if (room === null) {
    const last = stored('signal-steward-current-room');
    room = roomFormat.test(last) && ownerKey(last) ? last : await newRoom();
    url.searchParams.set('room', room);
    history.replaceState(null,'',url);
  }
  if (room !== 'classroom' && !roomFormat.test(room)) throw new Error('This room link is incomplete. Open the participant or facilitator page again.');
  const key = ownerKey(room);
  const participant = new URL('/',url.origin);
  participant.searchParams.set('room',room);
  const facilitator = new URL('/facilitator',url.origin);
  facilitator.searchParams.set('room',room);
  return {
    room, owner:Boolean(key), participant:participant.href, facilitator:facilitator.href,
    async request(path, options = {}, manage = false) {
      const endpoint = new URL('/api/' + path,url.origin);
      endpoint.searchParams.set('room',room);
      const headers = new Headers(options.headers);
      if (manage && key) headers.set('Authorization','Bearer ' + key);
      const response = await fetch(endpoint,{...options,headers,cache:'no-store'});
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'The request did not finish. Please try again.');
      return data;
    }
  };
}
