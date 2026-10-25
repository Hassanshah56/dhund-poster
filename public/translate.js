/* =====================================================================
   TRANSLATE.JS - Translation buttons (Roman Urdu / اردو / English)
   Hissay:
     1. Offline Urdu -> Roman Urdu (net na chale tab bhi kaam kare)
     2. Online translation (Google, phir MyMemory) + Roman Urdu
     3. Headline / khabar ki text translate karna (undo ke saath)
     4. Buttons: headline wale, har card wale, aur "Sab khabrein"
   Zaroorat: app.js pehle load ho (items, selected, $, enc, PROXY ...)
   ===================================================================== */

/* ---------- 1. Offline Urdu -> Roman Urdu ---------- */
const URDU_WORDS = {
  'اور': 'aur', 'کی': 'ki', 'کا': 'ka', 'کے': 'ke', 'کو': 'ko', 'ہے': 'hai', 'ہیں': 'hain', 'ہوں': 'hoon',
  'تھا': 'tha', 'تھی': 'thi', 'تھے': 'the', 'میں': 'mein', 'نے': 'ne', 'سے': 'se', 'پر': 'par', 'یہ': 'yeh',
  'وہ': 'woh', 'اس': 'is', 'ان': 'in', 'جو': 'jo', 'کہ': 'ke', 'ایک': 'ek', 'بھی': 'bhi', 'نہیں': 'nahin',
  'کیا': 'kya', 'گیا': 'gaya', 'گئی': 'gayi', 'گئے': 'gaye', 'ہوا': 'hua', 'ہوئی': 'hui', 'ہوئے': 'huye',
  'لیے': 'liye', 'لئے': 'liye', 'ساتھ': 'saath', 'بعد': 'baad', 'پہلے': 'pehle', 'تک': 'tak', 'کر': 'kar',
  'کرنے': 'karne', 'کرتے': 'karte', 'کریں': 'karen', 'ہو': 'ho', 'ہوگا': 'hoga', 'ہوگی': 'hogi', 'تو': 'to',
  'بھارت': 'bharat', 'پاکستان': 'pakistan', 'حکومت': 'hukumat', 'وزیر': 'wazir', 'اعظم': 'azam',
  'وزیراعظم': 'wazir-e-azam', 'صدر': 'sadar', 'عدالت': 'adalat', 'پولیس': 'police', 'خبر': 'khabar',
  'آج': 'aaj', 'کل': 'kal', 'اب': 'ab', 'جب': 'jab', 'جس': 'jis', 'جن': 'jin', 'ہم': 'hum', 'آپ': 'aap',
  'مگر': 'magar', 'لیکن': 'lekin', 'اگر': 'agar', 'یا': 'ya', 'سب': 'sab', 'کچھ': 'kuch', 'بہت': 'bohat',
  'ملک': 'mulk', 'لوگ': 'log', 'دن': 'din', 'رات': 'raat', 'شہر': 'shehar', 'نیوز': 'news'
};
const URDU_MAP = {
  'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ڈ': 'd',
  'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'ہ': 'h', 'ۃ': 'h',
  'ء': '', 'ك': 'k', 'ي': 'i', 'ى': 'i', 'ه': 'h', 'ة': 'h'
};
const URDU_PUNCT = { '،': ',', '۔': '.', '؟': '?', '؛': ';', '٪': '%' };
const URDU_WORD_RE = /[\u0621-\u063A\u0641-\u065F\u0670-\u06D3\u06D5]+/g;
const VOWEL_LETTERS = 'اآوی';

function romanizeWord(w) {
  const core = w.replace(/[\u064B-\u065F\u0670]/g, '');
  if (URDU_WORDS[core]) return URDU_WORDS[core];

  const L = [...w];
  const it = [];                       // [{s: roman, v: vowel hai?}]
  for (let k = 0; k < L.length; k++) {
    const c = L[k], next = L[k + 1], first = it.length === 0, last = k === L.length - 1;
    if (c === 'ا') it.push({ s: 'a', v: true });
    else if (c === 'آ') it.push({ s: 'aa', v: true });
    else if (c === 'و') it.push(first ? { s: 'w', v: false } : { s: 'o', v: true });
    else if (c === 'ی') it.push(first ? { s: 'y', v: false } : { s: 'i', v: true });
    else if (c === 'ے' || c === 'ۓ') it.push({ s: 'e', v: true });
    else if (c === 'ئ') it.push(next === 'ی' || next === 'ے' ? { s: '', v: false } : { s: 'i', v: true });
    else if (c === 'ع') it.push(next && VOWEL_LETTERS.includes(next) ? { s: '', v: false } : { s: 'a', v: true });
    else if (c === 'ھ') {              // aspirated: bh, kh, ph ...
      const p = it[it.length - 1];
      if (p && !p.v) p.s += 'h'; else it.push({ s: 'h', v: false });
    }
    else if (c === 'ہ' && last && it.length && !it[it.length - 1].v) it.push({ s: 'a', v: true });   // bacha
    else if (c === '\u064E' || c === '\u0670') it.push({ s: 'a', v: true });
    else if (c === '\u0650') it.push({ s: 'i', v: true });
    else if (c === '\u064F') it.push({ s: 'u', v: true });
    else if (c === '\u0651') { const p = it[it.length - 1]; if (p && !p.v) p.s += p.s; }
    else if (/[\u064B-\u065F]/.test(c)) { /* baaqi nishan chhor do */ }
    else if (URDU_MAP[c] !== undefined) it.push({ s: URDU_MAP[c], v: false });
  }

  // do consonant ke beech 'a' daalo (kar-ta, wa-qt). Aakhri jorr ke beech nahi.
  let out = '', justAdded = false;
  for (let k = 0; k < it.length; k++) {
    out += it[k].s;
    const n = it[k + 1];
    if (n && !it[k].v && !n.v && it[k].s && n.s) {
      const endsCluster = k + 1 === it.length - 1 && it.length >= 3;
      if (!endsCluster && !justAdded) { out += 'a'; justAdded = true; continue; }   // ka-r|ta (karta)
    }
    justAdded = false;
  }
  return out;
}

function romanize(text) {
  return text
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(URDU_WORD_RE, romanizeWord)
    .replace(/[،۔؟؛٪]/g, c => URDU_PUNCT[c]);
}

// Google ka roman aksar diacritics (ā, ṭ ...) ke saath aata hai - saaf karke seedha Roman Urdu banao
function cleanRoman(s) {
  s = (s || '').replace(/(^|\s)meñ(?=\s|$|[.,!?])/gi, '$1mein').replace(/(^|\s)haiñ(?=\s|$|[.,!?])/gi, '$1hain').replace(/ñ/g, 'n')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ʼʻʿʾ’`]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/\bhay\b/gi, 'hai').replace(/\bkah\b/gi, 'ke').replace(/\bor\b/gi, 'aur').replace(/\byaa\b/gi, 'ya');
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ---------- 2. Online translation ---------- */
const hasUrdu = s => /[\u0600-\u06FF]/.test(s);
let usedOfflineRoman = false;       // status mein batane ke liye

const GT_URL = (q, tl) => 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + tl +
                          '&dt=t&dt=rm&q=' + enc(q);
const MM_URL = (q, tl) => 'https://api.mymemory.translated.net/get?q=' + enc(q) +
                          '&langpair=' + (hasUrdu(q) ? 'ur' : 'en') + '|' + tl;

// pehle seedha, na chale to apni proxy se
async function getJson(url) {
  for (const u of [url, PROXY + enc(url)]) {
    try {
      const r = await fetchTimeout(u, 15000);
      if (r.ok) return await r.json();
    } catch {}
  }
  throw Error('network');
}

async function googleChunk(q, tl) {
  const d = await getJson(GT_URL(q, tl));
  const segs = d[0] || [];
  const text = segs.map(s => s[0] || '').join('').trim();
  const rm = segs.filter(s => s[0] == null);
  return {
    text,
    rmTarget: rm.map(s => s[2] || '').join(' '),
    rmSource: rm.map(s => s[3] || '').join(' ')
  };
}

async function memoryChunk(q, tl) {
  const d = await getJson(MM_URL(q, tl));
  const t = d.responseData && d.responseData.translatedText;
  if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw Error('limit');
  return { text: t, rmTarget: '', rmSource: '' };
}

// mode: 'ru' = Roman Urdu, 'ur' = اردو, 'en' = English
async function convertChunk(q, mode) {
  if (mode === 'ru' && hasUrdu(q)) {                    // Urdu -> Roman: translate ki zaroorat nahi
    try {
      const r = await googleChunk(q, 'en');
      if (r.rmSource.trim()) return cleanRoman(r.rmSource);
    } catch {}
    usedOfflineRoman = true;
    return cleanRoman(romanize(q));
  }
  const tl = mode === 'en' ? 'en' : 'ur';
  let r;
  try { r = await googleChunk(q, tl); } catch { r = await memoryChunk(q, tl); }
  if (mode !== 'ru') return r.text;
  if (r.rmTarget.trim()) return cleanRoman(r.rmTarget);  // English -> Urdu -> Roman
  usedOfflineRoman = true;
  return cleanRoman(romanize(r.text));
}

// lambi line ko jumlon ke tukron mein todo (~400 harf)
function chunkLine(line, max = 400) {
  const parts = line.match(/[^.!?۔؟]+[.!?۔؟]*\s*/g) || [line], out = [];
  let cur = '';
  for (const p of parts) {
    if (cur && (cur + p).length > max) { out.push(cur.trim()); cur = p; } else cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// AI translate (worker.js /translate). Band ho to 60 second tak dobara na try karo
let aiDownUntil = 0, usedFallback = false, aiWhy = '';
async function aiConvert(text, mode) {
  if (Date.now() < aiDownUntil) return null;
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 40000);
  try {
    const r = await fetch(PROXY_HOST + '/translate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, mode }), signal: ctrl.signal
    });
    if (!r.ok) {
      aiWhy = r.status === 404 || r.status === 405 ? 'Worker deploy nahi hua (/translate nahi mila)'
            : r.status === 501 ? 'wrangler.jsonc mein "ai" binding nahi'
            : 'AI error (HTTP ' + r.status + ') ' + (await r.text().catch(() => '')).slice(0, 300);
      throw Error(aiWhy);
    }
    const d = await r.json();
    if (d && d.text) return d.text.trim();
    aiWhy = 'AI ka jawab khali aaya';
    throw Error(aiWhy);
  } catch (e) {
    if (!aiWhy || e.name === 'AbortError') aiWhy = 'Worker tak pahunch nahi saka (net ya time out)';
    aiDownUntil = Date.now() + 60000;
    return null;
  }
  finally { clearTimeout(timer); }
}

async function convert(text, mode) {
  const ai = await aiConvert(text, mode);          // pehle AI (behtareen Roman Urdu)
  if (ai) return ai;
  usedFallback = true;                             // warna Google / MyMemory / offline
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) { out.push(''); continue; }
    const parts = [];
    for (const c of chunkLine(line)) parts.push(await convertChunk(c, mode));
    out.push(parts.join(' '));
  }
  return out.join('\n');
}

// headline mein *star* (highlight) ho to translate ke baad dobara laga do
async function convertHeadline(h, mode) {
  const out = await convert(h.replace(/\*/g, ''), mode);
  return h.includes('*') ? addStars(out) : out;
}

/* ---------- 3. Headline / text translate (undo ke saath) ---------- */
// store = {orig:{}, last:{}}: asal text yaad rehta hai taake hamesha asal se translate ho
// (Roman Urdu se English karna Google ko samajh nahi aata, asal English/Urdu se sahi aata hai)
const newStore = () => ({ orig: {}, last: {} });
const freeStore = newStore();          // jab koi khabar select na ho (sirf headline box)

async function trField(store, key, cur, mode, isHead) {
  if (mode === 'undo') {
    const o = store.orig[key] !== undefined ? store.orig[key] : cur;
    store.last[key] = o;
    return o;
  }
  const src = store.orig[key] !== undefined && store.last[key] === cur ? store.orig[key] : cur;
  const out = isHead ? await convertHeadline(src, mode) : await convert(src, mode);
  store.orig[key] = src;
  store.last[key] = out;
  return out;
}

const MODE_NAME = { ru: 'Roman Urdu', ur: 'Urdu', en: 'English', undo: 'Asal' };
let trBusy = false;

async function runTr(statusEl, job, mode) {
  if (trBusy) { statusEl.textContent = 'Ruko, translate chal raha hai...'; return; }
  trBusy = true;
  document.body.classList.add('tbusy');
  usedOfflineRoman = false; usedFallback = false; aiWhy = '';
  statusEl.textContent = mode === 'undo' ? 'Asal text wapis...' : 'Translate ho raha hai...';
  try {
    await job();
    statusEl.textContent = mode === 'undo' ? 'Asal text wapis aa gaya ✓'
      : MODE_NAME[mode] + ' mein ho gaya ✓' + (usedOfflineRoman ? ' (Roman andaza offline se)' : usedFallback && mode !== 'undo' ? ' ⚠ AI nahi chala: ' + (aiWhy || 'wajah maloom nahi') + '. Google se kiya, Roman kamzor ho sakta hai.' : '');
  } catch (e) {
    statusEl.textContent = 'Translate nahi hua (internet ya service band). Dobara koshish karein.';
  }
  trBusy = false;
  document.body.classList.remove('tbusy');
}

function applyItem(i) {
  const it = items[i];
  it.headEl.value = it.headline;
  it.textEl.value = it.text;
  if (selected === i) $('hl').value = it.headline;
}

async function translateItem(i, mode) {
  const it = items[i];
  it.tr = it.tr || newStore();
  const [h, t] = await Promise.all([
    trField(it.tr, 'h', it.headline, mode, true),
    trField(it.tr, 't', it.text, mode, false)
  ]);
  it.headline = h;
  it.text = t;
  applyItem(i);
}

/* ---------- 4. Buttons ---------- */
// (a) Headline wale buttons (section 03)
document.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => {
  const mode = b.dataset.tr;
  runTr($('tst'), async () => {
    if (selected >= 0) {
      const it = items[selected];
      it.tr = it.tr || newStore();
      it.headline = await trField(it.tr, 'h', it.headline, mode, true);
      applyItem(selected);
    } else {
      $('hl').value = await trField(freeStore, 'h', $('hl').value, mode, true);
    }
    preview();
  }, mode);
});

// (b) Har card ke buttons (headline + text dono)
function trButtons(i) {
  const row = document.createElement('div');
  row.className = 'acts';
  [['Roman Urdu', 'ru'], ['اردو', 'ur'], ['English', 'en'], ['↺', 'undo']].forEach(([label, mode]) => {
    const b = smallBtn(label, () => runTr($('st'), async () => {
      await translateItem(i, mode);
      if (selected === i) preview();
    }, mode));
    b.dataset.m = mode;
    b.title = mode === 'undo' ? 'Asal text wapis' : 'Is khabar ko ' + MODE_NAME[mode] + ' mein karo';
    row.append(b);
  });
  return row;
}

// (c) Sab khabrein ek saath (section 01)
document.querySelectorAll('[data-all]').forEach(b => b.onclick = () => {
  if (!items.length) { $('st').textContent = 'Pehle khabrein load karein'; return; }
  const mode = b.dataset.all, queue = items.map((_, i) => i);
  let done = 0, fail = 0;
  runTr($('st'), async () => {
    const worker = async () => {
      while (queue.length) {
        const i = queue.shift();
        try { await translateItem(i, mode); } catch { fail++; }
        $('st').textContent = MODE_NAME[mode] + ': ' + (++done) + '/' + items.length + (fail ? ' (' + fail + ' fail)' : '');
      }
    };
    await Promise.all([worker(), worker(), worker()]);   // 3 ek saath
    if (fail === items.length) throw Error('sab fail');
    if (selected >= 0) preview();
  }, mode).then(() => {
    if (fail && fail < items.length) $('st').textContent += '\n' + fail + ' khabrein translate nahi hui';
  });
});
