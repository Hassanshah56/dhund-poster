/* =====================================================================
   FEEDS.JS  -  yahan sirf channels ki list hai.

   Nayi XML/RSS feed add karni ho to ek line copy karke yeh badlein:
     { r:"Pakistan", name:"Channel ka naam", section:"Category", url:"https://.../feed.xml" },

   r  = "Pakistan" ya "International"  (tab ke liye)
   url = seedha RSS/XML link (website ka rss PAGE nahi, asal XML)

   Ek feed ko hatana ho to uski line delete kar dein.
   Kaun si feed chal rahi hai, yeh page par "Sab feeds check karo" se pata chalta hai.
   ===================================================================== */
const FEEDS = [
  /* ---------- Pakistan (English) ---------- */
  { r:"Pakistan", name:"Dawn",                 section:"Top Stories",   url:"https://www.dawn.com/feeds/home" },
  { r:"Pakistan", name:"Dawn",                 section:"Pakistan",      url:"https://www.dawn.com/feeds/pakistan/" },
  { r:"Pakistan", name:"Express Tribune",      section:"Latest",        url:"https://tribune.com.pk/feed/home" },
  { r:"Pakistan", name:"The News",             section:"Latest",        url:"https://www.thenews.com.pk/rss/1/1" },
  { r:"Pakistan", name:"The News",             section:"World",         url:"https://www.thenews.com.pk/rss/1/2" },
  { r:"Pakistan", name:"The News",             section:"Sports",        url:"https://www.thenews.com.pk/rss/1/3" },
  { r:"Pakistan", name:"ARY News",             section:"Latest",        url:"https://arynews.tv/feed/" },
  { r:"Pakistan", name:"Geo News",             section:"Pakistan",      url:"https://www.geo.tv/rss/1/1" },
  { r:"Pakistan", name:"Business Recorder",    section:"Business",      url:"https://www.brecorder.com/feeds/latest-news" },
  { r:"Pakistan", name:"ProPakistani",         section:"Tech",          url:"https://propakistani.pk/feed/" },
  { r:"Pakistan", name:"Pakistan Today",       section:"Latest",        url:"https://www.pakistantoday.com.pk/feed/" },
  { r:"Pakistan", name:"Daily Times",          section:"Latest",        url:"https://dailytimes.com.pk/feed/" },
  { r:"Pakistan", name:"Pakistan Observer",    section:"Latest",        url:"https://pakobserver.net/feed/" },
  { r:"Pakistan", name:"The Nation",           section:"Newspaper",     url:"https://www.nation.com.pk/rss/newspaper" },
  { r:"Pakistan", name:"Arab News Pakistan",   section:"Latest",        url:"https://www.arabnews.pk/rss.xml" },

  /* ---------- Pakistan (Urdu) ---------- */
  { r:"Pakistan", name:"Daily Jang",           section:"Urdu",          url:"https://feeds.feedburner.com/com/Yeor" },
  { r:"Pakistan", name:"Express Urdu",         section:"Urdu",          url:"https://www.express.pk/feed/" },
  { r:"Pakistan", name:"Daily Khabrain",       section:"Urdu",          url:"https://dailykhabrain.com.pk/feed" },
  { r:"Pakistan", name:"Independent Urdu",     section:"Urdu",          url:"https://www.independenturdu.com/rss.xml" },
  { r:"Pakistan", name:"BOL News",             section:"Urdu",          url:"https://www.bolnews.com/urdu/feed" },
  { r:"Pakistan", name:"Daily Qudrat",         section:"Urdu",          url:"https://dailyqudrat.pk/feed" },
  { r:"Pakistan", name:"UrduPoint",            section:"Urdu",          url:"https://www.urdupoint.com/rss/urdupoint.rss" },
  { r:"Pakistan", name:"UrduPoint",            section:"National",      url:"https://www.urdupoint.com/rss/urdupoint-national.rss" },
  { r:"Pakistan", name:"UrduPoint",            section:"Sports",        url:"https://www.urdupoint.com/rss/urdupoint-sports.rss" },
  { r:"Pakistan", name:"UrduPoint",            section:"Important",     url:"https://www.urdupoint.com/rss/urdupoint-imp.rss" },

  /* ---------- International ---------- */
  { r:"International", name:"BBC News",   section:"Top Stories",   url:"https://feeds.bbci.co.uk/news/rss.xml" },
  { r:"International", name:"BBC News",   section:"World",         url:"https://feeds.bbci.co.uk/news/world/rss.xml" },
  { r:"International", name:"BBC News",   section:"Asia",          url:"https://feeds.bbci.co.uk/news/world/asia/rss.xml" },
  { r:"International", name:"BBC News",   section:"Business",      url:"https://feeds.bbci.co.uk/news/business/rss.xml" },
  { r:"International", name:"BBC News",   section:"Technology",    url:"https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { r:"International", name:"BBC News",   section:"Health",        url:"https://feeds.bbci.co.uk/news/health/rss.xml" },
  { r:"International", name:"BBC News",   section:"Entertainment", url:"https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml" },
  { r:"International", name:"BBC Sport",  section:"Sports",        url:"https://feeds.bbci.co.uk/sport/rss.xml" },
  { r:"International", name:"Al Jazeera", section:"All News",      url:"https://www.aljazeera.com/xml/rss/all.xml" },
  { r:"International", name:"DW News",    section:"Top Stories",   url:"https://rss.dw.com/rdf/rss-en-top" },
  { r:"International", name:"DW News",    section:"World",         url:"https://rss.dw.com/rdf/rss-en-world" },
  { r:"International", name:"France 24",  section:"All News",      url:"https://www.france24.com/en/rss" },
  { r:"International", name:"France 24",  section:"Sports",        url:"https://www.france24.com/en/sport/rss" },
  { r:"International", name:"Guardian",   section:"World",         url:"https://www.theguardian.com/world/rss" },
  { r:"International", name:"Guardian",   section:"Business",      url:"https://www.theguardian.com/uk/business/rss" },
  { r:"International", name:"Guardian",   section:"Technology",    url:"https://www.theguardian.com/uk/technology/rss" },
  { r:"International", name:"Sky News",   section:"Top Stories",   url:"https://feeds.skynews.com/feeds/rss/home.xml" },
  { r:"International", name:"Sky News",   section:"World",         url:"https://feeds.skynews.com/feeds/rss/world.xml" },
  { r:"International", name:"NY Times",   section:"Top Stories",   url:"https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { r:"International", name:"NY Times",   section:"World",         url:"https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { r:"International", name:"NPR",        section:"US News",       url:"https://feeds.npr.org/1001/rss.xml" },
  { r:"International", name:"NPR",        section:"World",         url:"https://feeds.npr.org/1004/rss.xml" },
  { r:"International", name:"Politico",   section:"Politics",      url:"https://rss.politico.com/politics-news.xml" },
  { r:"International", name:"TechCrunch", section:"Tech",          url:"https://techcrunch.com/feed/" },
  { r:"International", name:"The Verge",  section:"Tech",          url:"https://www.theverge.com/rss/index.xml" },
  { r:"International", name:"Ars Technica", section:"Tech",        url:"https://feeds.arstechnica.com/arstechnica/index" },
  { r:"International", name:"WIRED",      section:"Tech",          url:"https://www.wired.com/feed/rss" },
  { r:"International", name:"CNBC",       section:"Business",      url:"https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { r:"International", name:"Reuters (Google News)", section:"Reuters", url:"https://news.google.com/rss/search?q=when:24h+site:reuters.com&ceid=US:en&hl=en-US&gl=US" },
  { r:"International", name:"AP (Google News)",      section:"AP",      url:"https://news.google.com/rss/search?q=site%3Aapnews.com&hl=en-US&gl=US&ceid=US:en" },
  { r:"International", name:"CNN (Google News)",     section:"CNN",     url:"https://news.google.com/rss/search?q=site%3Acnn.com&hl=en-US&gl=US&ceid=US:en" },
];
