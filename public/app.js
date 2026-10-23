/* =====================================================================
   APP.JS - Dhund poster ka code. Hissay:
     1. Shuru ki cheezein (variables)
     2. Internet se cheezein lana (XML, article page, images)
     3. XML ko parhna (parse)
     4. Poster banana (canvas par draw)
     5. Khabron ki list (cards) aur download
     6. Photo / template / logo / font controls
     7. Channel list aur "Sab feeds check karo"
   ===================================================================== */

/* ---------- 1. Shuru ki cheezein ---------- */
const $ = id => document.getElementById(id);
const canvas = $('cv');
const enc = encodeURIComponent;
const isFile = location.protocol === 'file:';   // file ki tarah khola ho to proxy nahi chalti

// Worker ka poora address. Is se page kahin se bhi khule (file, localhost, doosra link) CORS nahi aata.
// Worker ka naam/link badle to sirf yeh ek line badlein.
const PROXY_HOST = 'https://dhund-poster.hassanshah33093.workers.dev';
const PROXY = PROXY_HOST + '/proxy?url=';

let items = [];        // load hui khabrein
let selected = -1;     // abhi kaun si khabar poster par hai
let bg = null;         // background photo (apni upload ki hui)
let tpl = null;        // template / frame
let logo = null;       // tayar logo (green screen hata kar)
let logoRaw = null;    // logo asal halat mein
const imgCache = {};   // ek image dobara download na ho
const feedStatus = {}; // url -> 'ok' ya 'bad' ("Sab feeds check karo" ke baad)

const fileToImage = f => new Promise(res => {
  const i = new Image();
  i.onload = () => res(i);
  i.src = URL.createObjectURL(f);
});
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));

/* ---------- 2. Internet se cheezein lana ---------- */

// Jab apni proxy fail ho to yeh free relays try hote hain
const RELAYS = [
  u => 'https://api.allorigins.win/raw?url=' + enc(u),
  u => 'https://api.codetabs.com/v1/proxy/?quest=' + enc(u),
  u => 'https://corsproxy.io/?' + enc(u),
];

// timeout ke saath fetch
async function fetchTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
}

const looksLikeFeed = text => /<(rss|feed|rdf)[\s>:]/i.test(text);

// XML link se feed ka text lao. Pehle apni proxy, phir relays.
async function getXml(feedUrl) {
  const tries = [];
  tries.push(['proxy', PROXY + enc(feedUrl)]);
  RELAYS.forEach((make, i) => tries.push(['relay' + (i + 1), make(feedUrl)]));

  const errors = [];
  for (const [name, url] of tries) {
    try {
      const r = await fetchTimeout(url, 20000);
      if (!r.ok) { errors.push(name + ': HTTP ' + r.status); continue; }
      const text = await r.text();
      if (looksLikeFeed(text)) return text;
      errors.push(name + ': feed nahi (HTML/khali aaya)');
    } catch (e) {
      errors.push(name + ': ' + (e.name === 'AbortError' ? 'time out' : 'network'));
    }
  }
  throw Error('Feed nahi mili [' + errors.join(' | ') + ']');
}

// Article ka HTML (og:image dhoondne ke liye)
async function getHtml(url) {
  try {
    const r = await fetchTimeout(PROXY + enc(url), 12000);
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

// Chhoti image ke link ko bari image ke link mein badalna
function biggerUrl(u) {
  try {
    let s = u.replace(/^http:/, 'https:');
    s = s.replace(/([-_])\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp)(\?|$))/i, '');       // -150x150.jpg hatao
    s = s.replace(/(i\.dawn\.com\/)(thumbnail|small|medium)\//, '$1large/');        // Dawn
    s = s.replace(/(ichef\.bbci\.co\.uk\/(?:news|ace\/standard))\/\d+\//,           // BBC
      (m, a) => a + (a.includes('ace') ? '/976/' : '/1024/'));
    const o = new URL(s);
    ['w', 'width', 'resize', 'fit', 'h', 'height', 'quality'].forEach(k => o.searchParams.delete(k));
    return o.href;
  } catch { return u; }
}

// Image load karo. Ek link fail ho to agla try hota hai.
function loadImg(u) {
  if (imgCache[u]) return imgCache[u];
  const candidates = [...new Set([biggerUrl(u), u])];
  if (/^https?:/.test(u)) {
    candidates.push(PROXY + enc(u));
    candidates.push('https://images.weserv.nl/?url=' + enc(u));
  }
  imgCache[u] = new Promise(res => {
    const next = k => {
      if (k >= candidates.length) return res(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => next(k + 1);
      img.src = candidates[k];
    };
    next(0);
  });
  return imgCache[u];
}

// Khabar ki sab se achi image: feed wali, na ho ya chhoti ho to article ki og:image
async function bestImg(item) {
  let im = item.img ? await loadImg(item.img) : null;
  if ((!im || im.width < 900) && item.link) {
    const html = await getHtml(item.link);
    if (html) {
      const meta = new DOMParser().parseFromString(html, 'text/html')
        .querySelector('meta[property="og:image"],meta[name="twitter:image"]');
      const u = meta && meta.content;
      if (u) {
        const og = await loadImg(new URL(u, item.link).href).catch(() => null);
        if (og && (!im || og.width > im.width)) im = og;
      }
    }
  }
  return im;
}

/* ---------- 3. XML ko parhna ---------- */
const textOf = (el, tag) => { const a = el.getElementsByTagName(tag)[0]; return a ? a.textContent : ''; };
const stripHtml = s => (new DOMParser().parseFromString(s, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
const normQuotes = s => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
const firstImgInHtml = h => {
  const m = new DOMParser().parseFromString(h, 'text/html').querySelector('img');
  return (m && (m.getAttribute('src') || m.getAttribute('data-src'))) || '';
};

// Kharab XML ko theek karna (ganda & ya chhupe huay control characters)
function repairXml(x) {
  return x.replace(/^\uFEFF/, '')
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
          .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, '&amp;');
}

function xmlToDoc(xml) {
  const start = xml.search(/<(\?xml|rss|feed|rdf)/i);
  xml = xml.slice(Math.max(0, start));
  let doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {            // pehli koshish fail -> repair karke dobara
    doc = new DOMParser().parseFromString(repairXml(xml), 'text/xml');
    if (doc.querySelector('parsererror')) throw Error('XML sahi nahi hai (kharab ya adhoori feed)');
  }
  return doc;
}

// XML text -> [{title, desc, img, link}]
function parse(xml) {
  const doc = xmlToDoc(xml);
  let nodes = [...doc.getElementsByTagName('item')];                    // RSS
  if (!nodes.length) nodes = [...doc.getElementsByTagName('entry')];    // Atom

  return nodes.map(e => {
    const linkEl = e.getElementsByTagName('link')[0];
    const link = linkEl ? (linkEl.textContent.trim() || linkEl.getAttribute('href') || '') : '';

    // image ke saare umeedwar links jama karo
    const found = [];
    for (const tag of ['content', 'thumbnail', 'enclosure']) {
      for (const a of e.getElementsByTagNameNS('*', tag)) {
        const u = a.getAttribute('url');
        const kind = a.getAttribute('type') || a.getAttribute('medium') || '';
        if (u && !/video|audio/.test(kind) && !/\.(mp3|mp4|m4a|mov)(\?|$)/i.test(u)) found.push(u);
      }
    }
    for (const tag of ['content:encoded', 'description', 'summary', 'content']) {
      const u = firstImgInHtml(textOf(e, tag));
      if (u) found.push(u);
    }
    // Kuch feeds (jaise Express) image seedha XML tag mein deti hain: <image><img src="..."/></image>
    for (const im of e.getElementsByTagName('img')) {
      const u = im.getAttribute('src') || im.getAttribute('data-src');
      if (u) found.push(u);
    }
    for (const im of e.getElementsByTagName('image')) {
      const u = (im.getAttribute('url') || textOf(im, 'url') || (im.children.length ? '' : im.textContent) || '').trim();
      if (/^(https?:)?\/\//.test(u)) found.push(u);
    }
    let img = found.find(u => !/thumb|[-_]\d{2,3}x\d{2,3}\.|small|icon|avatar/i.test(u)) || found[0] || '';
    if (img) {
      try { img = new URL(img.startsWith('//') ? 'https:' + img : img, link || undefined).href; } catch {}
    }

    const title = stripHtml(textOf(e, 'title'));
    let desc = stripHtml(textOf(e, 'description') || textOf(e, 'summary') ||
                         textOf(e, 'content:encoded') || textOf(e, 'content'));
    // description agar title se hi shuru ho to title hata do
    if (normQuotes(desc).toLowerCase().startsWith(normQuotes(title).toLowerCase())) {
      desc = desc.slice(title.length).trim();
    }
    return { title, desc: desc.slice(0, 700), img, link };
  }).filter(i => i.title);
}

// headline ke shuru ke 2 lafz *star* mein (highlight ke liye)
function addStars(t) {
  const w = t.split(/\s+/);
  return w.length < 4 ? t : '*' + w.slice(0, 2).join(' ') + '* ' + w.slice(2).join(' ');
}

/* ---------- 4. Poster banana ---------- */
function posterSize() {
  const v = $('sz').value;
  if (v === 'tpl' && tpl) return [tpl.width, tpl.height];
  if (v === 'c') return [+$('cw').value || 1080, +$('ch').value || 1350];
  if (v === 'tpl') return [1080, 1350];
  return v.split('x').map(Number);
}

function fillRoundRect(x, a, b, w, h, r) {
  x.beginPath();
  x.roundRect ? x.roundRect(a, b, w, h, r) : x.rect(a, b, w, h);
  x.fill();
}

// Bari image ko aadha aadha karke chhota karna (saaf nazar aaye)
function drawSmooth(x, img, dx, dy, w, h) {
  let src = img, sw = img.width, sh = img.height;
  while (sw / 2 > w && sh / 2 > h) {
    const c = document.createElement('canvas');
    c.width = sw = Math.ceil(sw / 2);
    c.height = sh = Math.ceil(sh / 2);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, sw, sh);
    src = c;
  }
  x.drawImage(src, dx, dy, w, h);
}

async function draw(c, headline, photo, scale = 1) {
  let [W, H] = posterSize();
  W = Math.round(W * scale);
  H = Math.round(H * scale);
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';

  // (a) background
  x.fillStyle = '#1a1a1a';
  x.fillRect(0, 0, W, H);

  // (b) photo
  const img = photo || bg;
  if (img) {
    const s = Math.max(W / img.width, H / img.height) * $('ps').value / 100;
    const w = img.width * s, h = img.height * s;
    drawSmooth(x, img, (W - w) / 2 + $('px').value * W / 100, (H - h) / 2 + $('py').value * H / 100, w, h);
  }

  // (c) template / frame
  if (tpl) {
    x.globalAlpha = $('tplo').value / 100;
    x.drawImage(tpl, 0, 0, W, H);
    x.globalAlpha = 1;
  }

  // (d) neeche dark shade
  if ($('shade').checked) {
    const g = x.createLinearGradient(0, H * .35, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.88)');
    x.fillStyle = g;
    x.fillRect(0, H * .35, W, H * .65);
  }

  // (e) logo
  if (logo && $('lon').checked) {
    const s = Math.min(W * .26 / logo.width, H * .12 / logo.height) * $('ls').value / 100;
    const w = logo.width * s, h = logo.height * s, m = W * .025;
    const [px, py] = $('lpos').value.split(',');
    x.globalAlpha = $('lo').value / 100;
    x.drawImage(logo,
      px == 0 ? m : px == 1 ? (W - w) / 2 : W - w - m,
      py == 0 ? m : py == 1 ? (H - h) / 2 : H - h - m, w, h);
    x.globalAlpha = 1;
  }

  // (f) headline text
  const rtl = /[\u0600-\u06FF]/.test(headline);                       // Urdu / Arabic?
  const pick = $('ff').value;
  const fam = pick === 'auto' ? (rtl ? '"Noto Nastaliq Urdu"' : 'Poppins') : pick;
  const fs = $('fs').value * W / 1080;
  const font = `700 ${fs}px ${fam},sans-serif`;
  try { await document.fonts.load(font, headline || 'a'); } catch {}
  x.font = font;
  x.textBaseline = 'middle';
  x.textAlign = 'left';

  // lafz alag karo; *star* ke andar wale highlight honge
  const space = x.measureText(' ').width, hlOn = $('hle').checked, words = [];
  let inHl = false;
  for (const t of headline.split(/(\*|\s+)/)) {
    if (t === '*') inHl = !inHl;
    else if (t && t.trim()) words.push({ t, h: inHl && hlOn, w: x.measureText(t).width });
  }

  // lines mein todo
  const lines = [[]];
  let lineW = 0;
  for (const d of words) {
    if (lineW + d.w > W * .86 && lines.at(-1).length) { lines.push([]); lineW = 0; }
    lines.at(-1).push(d);
    lineW += d.w + space;
  }

  const lh = fs * (rtl ? 1.9 : 1.35);
  const handle = $('hdl').value.trim(), pos = $('pos').value, align = $('al').value;
  let y = pos === 'top' ? H * .12
        : pos === 'middle' ? (H - lines.length * lh) / 2
        : H - lines.length * lh - H * (handle ? .14 : .08);

  for (const line of lines) {
    const lw = line.reduce((a, d) => a + d.w + space, -space);
    const vis = rtl ? [...line].reverse() : line;                     // Urdu: daen se baen
    const startX = align === 'center' ? (W - lw) / 2 : align === 'left' ? W * .07 : W * .93 - lw;

    // highlight ke peeche rang ka dabba
    let q = startX;
    for (let i = 0; i < vis.length;) {
      if (!vis[i].h) { q += vis[i].w + space; i++; continue; }
      let j = i, end = q;
      while (j < vis.length && vis[j].h) {
        end += vis[j].w + (j + 1 < vis.length && vis[j + 1].h ? space : 0);
        j++;
      }
      x.fillStyle = $('c2').value;
      fillRoundRect(x, q - fs * .14, y + lh * .08, end - q + fs * .28, lh * .84, fs * .14);
      q = end + space;
      i = j;
    }

    // lafz likho
    let p = startX;
    for (const d of vis) {
      x.fillStyle = d.h ? $('c3').value : $('c1').value;
      x.fillText(d.t, p, y + lh * .5);
      p += d.w + space;
    }
    y += lh;
  }

  // (g) neeche handle / website
  if (handle) {
    x.font = `700 ${W * .03}px ${fam},sans-serif`;
    x.fillStyle = $('c1').value;
    x.globalAlpha = .85;
    x.textAlign = 'center';
    x.fillText(handle, W / 2, H * .955);
    x.globalAlpha = 1;
  }
}

let drawing = false, redrawAgain = false;
async function preview() {
  if (drawing) { redrawAgain = true; return; }
  drawing = true;
  do {
    redrawAgain = false;
    const it = items[selected];
    await draw(canvas, it ? it.headline : $('hl').value, it && it.im ? await it.im : null);
  } while (redrawAgain);
  drawing = false;
  $('dim').textContent = canvas.width + ' x ' + canvas.height;
}

/* ---------- 5. Khabron ki list aur download ---------- */
const smallBtn = (label, onClick) => {
  const b = document.createElement('button');
  b.textContent = label; b.onclick = onClick; b.className = 'g sm';
  return b;
};
const copyText = s => navigator.clipboard.writeText(s).then(() => $('st').textContent = 'Copy ho gaya');

function buildList() {
  const list = $('list');
  list.textContent = '';
  items.forEach((it, i) => {
    const card = document.createElement('div');
    card.className = 'card';

    const thumb = document.createElement('img');
    thumb.referrerPolicy = 'no-referrer';
    if (it.img) {
      thumb.onerror = () => { thumb.onerror = null; thumb.src = PROXY + enc(it.img); };  // seedhi na aaye to proxy se
      thumb.src = it.img.replace(/^http:/, 'https:');
    }
    thumb.onclick = () => pickItem(i);

    const right = document.createElement('div');
    const head = document.createElement('textarea');
    const text = document.createElement('textarea');
    const acts = document.createElement('div');
    acts.className = 'acts';

    head.dir = text.dir = 'auto';
    head.rows = 2; head.value = it.headline;
    head.oninput = () => { it.headline = head.value; if (selected === i) { $('hl').value = head.value; preview(); } };
    text.rows = 4; text.value = it.text;
    text.oninput = () => it.text = text.value;

    acts.append(smallBtn('Dekho', () => pickItem(i)),
                smallBtn('PNG', () => downloadOne(i)),
                smallBtn('Text copy', () => copyText(text.value)));
    right.append(head, text, acts);
    card.append(thumb, right);
    list.append(card);
    it.headEl = head;
  });
}

function pickItem(i) {
  selected = i;
  $('hl').value = items[i].headline;
  document.querySelectorAll('.card').forEach((c, j) => c.classList.toggle('on', j === i));
  preview();
}

$('hl').oninput = () => {
  if (selected >= 0) { items[selected].headline = $('hl').value; items[selected].headEl.value = $('hl').value; }
  preview();
};

// "Khabrein lao" button
$('load').onclick = async () => {
  const st = $('st');
  st.textContent = 'Load ho raha hai...';
  try {
    let xml = $('xml').value.trim();                 // paste kiya hua XML ho to wohi
    if (!xml) {
      const url = $('feed').value.trim();
      if (!url) throw Error('RSS link ya XML daalein');
      xml = await getXml(url);
    }
    const n = Math.max(1, Math.min(30, +$('cnt').value || 10));
    const news = parse(xml).slice(0, n);
    if (!news.length) throw Error('Feed mein koi khabar nahi mili');

    items = news.map(i => ({
      ...i,
      headline: addStars(i.title),
      text: i.desc ? i.title + '\n\n' + i.desc : i.title,
      im: bestImg(i),                                // promise: image peeche load hoti rehti hai
    }));
    buildList();
    pickItem(0);
    st.textContent = items.length + ' khabrein mil gayin';
  } catch (e) { st.textContent = 'Error: ' + e.message; }
};

/* download */
const tmpCanvas = document.createElement('canvas');
async function posterBlob(i) {
  const it = items[i];
  await draw(tmpCanvas, it.headline, it.im ? await it.im : null, +$('xq').value);
  return new Promise(r => tmpCanvas.toBlob(r, 'image/png'));
}
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function downloadOne(i) { saveBlob(await posterBlob(i), 'dhund-poster-' + (i + 1) + '.png'); }
$('dlp').onclick = () => canvas.toBlob(b => saveBlob(b, 'dhund-poster.png'), 'image/png');

let zipBusy = false;
async function makeZip(withText) {
  if (!items.length) { $('st').textContent = 'Pehle khabrein load karein'; return; }
  if (zipBusy) return;
  zipBusy = true;
  const zip = new JSZip(), st = $('st'), bar = $('pg'), barWrap = $('pgw');
  const num = i => String(i + 1).padStart(2, '0');
  barWrap.hidden = false; bar.style.width = '0';
  try {
    for (let i = 0; i < items.length; i++) {
      st.textContent = 'Poster ' + (i + 1) + '/' + items.length + '...';
      bar.style.width = (i / items.length * 90) + '%';
      zip.file('poster-' + num(i) + '.png', await posterBlob(i));
      if (withText) zip.file('poster-' + num(i) + '.txt', items[i].text);
    }
    st.textContent = 'ZIP ban raha hai...';
    saveBlob(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'dhund-posters.zip');
    bar.style.width = '100%';
    st.textContent = 'ZIP tayar ✓ (' + items.length + ' images)';
  } catch (e) { st.textContent = 'Error: ' + e.message; }
  setTimeout(() => barWrap.hidden = true, 1500);
  zipBusy = false;
}
$('zip').onclick = () => makeZip(true);
$('zipi').onclick = () => makeZip(false);
$('cpall').onclick = () => copyText(items.map((it, i) => (i + 1) + '.\n' + it.text).join('\n\n----------\n\n'));
$('prv').onclick = () => items.length && pickItem((selected - 1 + items.length) % items.length);
$('nxt').onclick = () => items.length && pickItem((selected + 1) % items.length);

/* ---------- 6. Photo / template / logo / font ---------- */
$('bgf').onchange  = async e => { if (e.target.files[0]) { bg  = await fileToImage(e.target.files[0]); preview(); } };
$('tplf').onchange = async e => { if (e.target.files[0]) { tpl = await fileToImage(e.target.files[0]); preview(); } };
$('rbg').onclick   = () => { bg = null;  preview(); };
$('rtpl').onclick  = () => { tpl = null; preview(); };

// logo: chhota karo aur (agar chahiye) green screen hatao
function makeLogo() {
  if (!logoRaw) return;
  const m = Math.min(1, 1200 / Math.max(logoRaw.width, logoRaw.height));
  const c = document.createElement('canvas');
  c.width = Math.round(logoRaw.width * m);
  c.height = Math.round(logoRaw.height * m);
  const g = c.getContext('2d');
  g.drawImage(logoRaw, 0, 0, c.width, c.height);

  if ($('lkey').checked) {
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    const key = hexToRgb($('lkc').value), t = +$('lkt').value;
    const cb = (r, g, b) => -.1687 * r - .3313 * g + .5 * b;
    const cr = (r, g, b) => .5 * r - .4187 * g - .0813 * b;
    const kb = cb(...key), kr = cr(...key);
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const dist = Math.hypot(cb(r, gg, b) - kb, cr(r, gg, b) - kr);
      if (dist < t) d[i + 3] = 0;                                      // bilkul green -> ghaib
      else if (dist < t * 1.5) {                                       // kinara naram karo
        d[i + 3] *= (dist - t) / (t * .5);
        const mx = Math.max(r, b);
        if (gg > mx) d[i + 1] = mx;
      }
    }
    g.putImageData(id, 0, 0);
  }
  logo = c;
  preview();
}
$('logof').onchange = async e => {
  if (!e.target.files[0]) return;
  logoRaw = await fileToImage(e.target.files[0]);
  // kone ka rang green ho to green screen khud on kar do
  const t = document.createElement('canvas');
  t.width = t.height = 1;
  const tg = t.getContext('2d');
  tg.drawImage(logoRaw, 2, 2, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = tg.getImageData(0, 0, 1, 1).data;
  if (g > r + 30 && g > b + 30) {
    $('lkc').value = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    $('lkey').checked = true;
  }
  makeLogo();
};
['lkey', 'lkc', 'lkt'].forEach(id => $(id).addEventListener('input', makeLogo));
loadImg('assets/dhund-logo.png').then(i => { if (i) { logoRaw = i; makeLogo(); } });   // default logo

$('fontf').onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  const name = 'U' + Date.now(), face = new FontFace(name, await f.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  const opt = new Option(f.name, '"' + name + '"');
  $('ff').add(opt);
  $('ff').value = opt.value;
  preview();
};
$('sz').onchange = () => { $('cs').hidden = $('sz').value !== 'c'; };
document.querySelectorAll('#ctl input,#ctl select').forEach(e => e.addEventListener('input', preview));

/* ---------- 7. Channel list aur feed check ---------- */
let region = 'All';

function renderChannels() {
  const q = $('fsrch').value.toLowerCase(), box = $('chs');
  box.textContent = '';
  FEEDS.filter(f => (region === 'All' || f.r === region) && (f.name + ' ' + f.section).toLowerCase().includes(q))
    .forEach(f => {
      const b = document.createElement('button');
      b.className = 'ch' + ($('feed').value === f.url ? ' on' : '') + (feedStatus[f.url] ? ' ' + feedStatus[f.url] : '');
      b.textContent = f.name + ' · ' + f.section;
      b.title = f.url;
      b.onclick = () => {
        $('feed').value = f.url;
        $('xml').value = '';
        box.querySelectorAll('.ch').forEach(c => c.classList.toggle('on', c === b));
        $('load').click();
      };
      box.append(b);
    });
}
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  region = t.dataset.r;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
  renderChannels();
});
$('fsrch').oninput = renderChannels;

// "Sab feeds check karo": har feed ko aazmata hai. Hara = chal rahi, kata hua = nahi chal rahi
$('chk').onclick = async () => {
  const btn = $('chk'), st = $('st'), queue = [...FEEDS];
  let done = 0, good = 0, firstErr = '';
  btn.disabled = true;
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      try { parse(await getXml(f.url)); feedStatus[f.url] = 'ok'; good++; }
      catch (e) { feedStatus[f.url] = 'bad'; if (!firstErr) firstErr = f.name + ' -> ' + e.message; }
      st.textContent = 'Check ho raha hai ' + (++done) + '/' + FEEDS.length + ' (chal rahi: ' + good + ')';
      renderChannels();
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);   // 4 ek saath
  st.textContent = 'Check mukammal: ' + good + ' chal rahi, ' + (FEEDS.length - good) + ' nahi chal rahi' + (firstErr ? '\nPehli galti: ' + firstErr : '');
  btn.disabled = false;
};

renderChannels();
preview();