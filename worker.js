// Cloudflare Worker: static files (public/) + /proxy?url=... (RSS/XML, article page, images)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PRIVATE = /^(localhost|127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': '*',
};

function bad(msg, status) {
  return new Response(msg, { status, headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8' } });
}

async function direct(t, isImage) {
  const headers = {
    'user-agent': UA,
    'accept': isImage
      ? 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      : 'application/rss+xml,application/atom+xml,application/xml,text/xml,text/html;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9,ur;q=0.8',
    'referer': t.origin + '/',
  };
  return fetch(t.href, { redirect: 'follow', headers, cf: { cacheTtl: 300, cacheEverything: true } });
}

// Agar site Cloudflare IP ko 403 de, to in public relays se try karo
async function viaRelay(t) {
  const enc = encodeURIComponent(t.href);
  const relays = [
    'https://api.allorigins.win/raw?url=' + enc,
    'https://api.codetabs.com/v1/proxy/?quest=' + enc,
  ];
  for (const u of relays) {
    try {
      const r = await fetch(u, { headers: { 'user-agent': UA } });
      if (r.ok) return r;
    } catch {}
  }
  return null;
}

async function proxy(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  let t;
  try { t = new URL(new URL(req.url).searchParams.get('url') || ''); } catch { return bad('bad url', 400); }
  if (!/^https?:$/.test(t.protocol) || PRIVATE.test(t.hostname)) return bad('blocked', 400);

  const isImage = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(t.pathname + t.search) || /\/(images?|ichef|thumbnail)\b/i.test(t.href);
  let r;
  try { r = await direct(t, isImage); } catch { r = null; }

  if ((!r || !r.ok) && !isImage) {
    const alt = await viaRelay(t);
    if (alt) r = alt;
  }
  if (!r) return bad('fetch failed', 502);

  const h = new Headers(CORS);
  h.set('content-type', r.headers.get('content-type') || 'application/octet-stream');
  h.set('cache-control', 'public,max-age=300');
  return new Response(r.body, { status: r.status, headers: h });
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/proxy') {
      try { return await proxy(req); }
      catch (e) { return bad('worker error: ' + e.message, 500); }   // error mein bhi CORS headers jayen
    }
    return env.ASSETS.fetch(req);
  },
};
