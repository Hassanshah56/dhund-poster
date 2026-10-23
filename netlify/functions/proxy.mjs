// RSS/XML, article page aur images laane ke liye (browser CORS se bachne ke liye)
export default async (req) => {
  let t;
  try { t = new URL(new URL(req.url).searchParams.get('url') || ''); } catch { return new Response('bad url', { status: 400 }); }
  if (!/^https?:$/.test(t.protocol) || /^(localhost|127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(t.hostname))
    return new Response('blocked', { status: 400 });
  try {
    const r = await fetch(t, { redirect: 'follow', headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'accept': 'application/rss+xml,application/xml,text/xml,text/html,image/*,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9,ur;q=0.8' } });
    return new Response(r.body, { status: r.status, headers: {
      'access-control-allow-origin': '*',
      'content-type': r.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'public,max-age=300' } });
  } catch (e) { return new Response('fetch failed', { status: 502 }); }
};
