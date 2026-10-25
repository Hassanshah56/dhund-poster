// Cloudflare Worker: static files (public/) + /proxy?url=... (RSS/XML, article page, images)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PRIVATE = /^(localhost|127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
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

// ---------- /translate : Workers AI se Roman Urdu / Urdu / English ----------
const MODELS = ['@cf/google/gemma-3-12b-it', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
const RULES = 'Output ONLY the translation, nothing else: no quotes, no notes, no explanations. Keep the same number of lines. ' +
  'Keep names, numbers, currency symbols and abbreviations (AI, UK, PhD, GDP) exactly as they are.';
const PROMPTS = {
  ru: 'You are a Pakistani news editor. Translate the text into natural Roman Urdu: Urdu written in English (Latin) letters, ' +
      'the way Pakistanis write on WhatsApp and social media (e.g. "Hukumat ne budget mein izafa kar diya hai"). ' +
      'Keep common English words that Urdu speakers already use in English spelling (budget, lab, million, police, minister, AI, school, report, etc.) ' +
      'instead of forcing them into Urdu. Use simple spellings: hai, hain, mein, ka, ki, ke, ko, ne, se, nahin, aur. No diacritics, no Hindi words, no Urdu script. ' +
      'If the text is already Roman Urdu, just fix spelling. ' + RULES,
  ur: 'You are a Pakistani news editor. Translate the text into natural, fluent Urdu in Urdu script (Nastaliq style wording, as used in Pakistani news). ' +
      'Common English terms may be written in Urdu script phonetically (e.g. بجٹ، لیب، ملین). If the text is Roman Urdu, convert it to Urdu script. ' + RULES,
  en: 'You are a news editor. Translate the text into clear, natural English suitable for a news headline or short report. ' +
      'The source may be Urdu script or Roman Urdu (Urdu in Latin letters). ' + RULES
};

async function translate(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method === 'GET') {            // browser mein link khol kar check karein: deploy theek hai ya nahi
    return new Response(JSON.stringify({ ok: true, ai: !!env.AI, models: MODELS }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
  if (req.method !== 'POST') return bad('POST only', 405);
  if (!env.AI) return bad('AI binding missing (wrangler.jsonc mein "ai" daalein)', 501);
  let b;
  try { b = await req.json(); } catch { return bad('bad json', 400); }
  const text = String(b.text || '').slice(0, 3000);
  if (!text.trim() || !PROMPTS[b.mode]) return bad('bad input', 400);

  const errs = [];
  for (const model of MODELS) {
    try {
      const r = await env.AI.run(model, {
        messages: [{ role: 'system', content: PROMPTS[b.mode] }, { role: 'user', content: text }],
        max_tokens: 1500,
        temperature: 0.2,
      });
      const raw = r && (r.response || (r.result && r.result.response) ||
                        (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) || r.result);
      const out = String(raw || '').replace(/^```\w*\n?|\n?```$/g, '').trim();
      if (out) {
        return new Response(JSON.stringify({ text: out, model }), {
          headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
        });
      }
      errs.push(model.split('/').pop() + ': khali jawab');
    } catch (e) { errs.push(model.split('/').pop() + ': ' + String(e && e.message || e).slice(0, 160)); }
  }
  return bad('ai failed | ' + errs.join(' | '), 502);
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/proxy') {
      try { return await proxy(req); }
      catch (e) { return bad('worker error: ' + e.message, 500); }   // error mein bhi CORS headers jayen
    }
    if (u.pathname === '/translate') {
      try { return await translate(req, env); }
      catch (e) { return bad('worker error: ' + e.message, 500); }
    }
    return env.ASSETS.fetch(req);
  },
};
