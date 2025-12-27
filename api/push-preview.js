// /api/push-preview.js
function getWIBDayOfWeek(d = new Date()) {
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  return new Date(wibMs).getUTCDay(); // 0..6
}

async function fetchRandomAyah(base) {
  const res = await fetch(`${base}/random`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Quran API error: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const data = j?.data ?? j ?? {};

  const surahName =
    data?.surah?.name?.transliteration?.id ??
    data?.surah?.name?.short ??
    data?.surah?.name ??
    "Al-Qur'an";

  const surahNo = data?.surah?.number ?? data?.surah_number;
  const ayahNo = data?.number?.inSurah ?? data?.ayah_number ?? data?.number;

  const idTrans =
    data?.translation ??
    data?.text?.translation ??
    data?.translation?.id ??
    "";

  const ref = surahNo && ayahNo ? `QS. ${surahName} ${surahNo}:${ayahNo}` : `QS. ${surahName}`;
  const clean = (idTrans || "").toString().replace(/\s+/g, " ").trim();
  const short = clean.length > 170 ? clean.slice(0, 170).trim() + "…" : clean;

  return { title: "Ayat Hari Ini", body: `“${short}”\n(${ref})`, type: "quran" };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchHadithBooks(base) {
  const res = await fetch(`${base}/hadith`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Hadith API books error: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j?.data ?? j ?? [];
}

async function fetchHadithByNumber(base, slug, number) {
  const res = await fetch(`${base}/hadith/${slug}/${number}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Hadith API hadith error: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j?.data ?? j ?? {};
}

async function fetchRandomHadith(base) {
  const books = await fetchHadithBooks(base);
  const fallbackSlugs = ["bukhari","muslim","abu-dawud","tirmidzi","nasai","ibnu-majah","malik","ahmad","darimi"];

  let candidates = books
    .map((b) => ({ slug: b?.slug || b?.id || b?.key, name: b?.name || b?.title || b?.slug, total: b?.total || b?.count }))
    .filter((x) => x.slug);

  if (candidates.length === 0) candidates = fallbackSlugs.map((s) => ({ slug: s, name: s, total: null }));

  const chosen = pickRandom(candidates);
  const max = Number.isFinite(Number(chosen.total)) ? Number(chosen.total) : 3000;
  const nomor = Math.max(1, Math.floor(Math.random() * max) + 1);

  const hadith = await fetchHadithByNumber(base, chosen.slug, nomor);
  const teks = hadith?.id || hadith?.hadith || hadith?.text || hadith?.content || "";
  const clean = (teks || "").toString().replace(/\s+/g, " ").trim();
  const short = clean.length > 170 ? clean.slice(0, 170).trim() + "…" : clean;

  return { title: "Hadis Hari Ini", body: `“${short}”\n(HR. ${chosen.name || chosen.slug} no. ${nomor})`, type: "hadits" };
}

module.exports = async (req, res) => {
  const cronKey = process.env.PUSH_CRON_KEY;
  if (cronKey) {
    const got = req.query?.key;
    if (got !== cronKey) return res.status(401).json({ error: "Unauthorized" });
  }

  const QURAN_API_BASE = process.env.QURAN_API_BASE || "https://quran-api-id.vercel.app";
  const HADITH_API_BASE = process.env.HADITH_API_BASE || "https://hadis-api-id.vercel.app";

  const dow = getWIBDayOfWeek();
  const shouldQuran = [1, 3, 5, 0].includes(dow);

  try {
    const content = shouldQuran ? await fetchRandomAyah(QURAN_API_BASE) : await fetchRandomHadith(HADITH_API_BASE);
    return res.status(200).json({ ok: true, ...content, url: "/rekap.html" });
  } catch (e) {
    return res.status(200).json({ ok: true, type: "fallback", title: "Pesan Harian", body: "API sumber sedang bermasalah.", url: "/rekap.html", error: e.message });
  }
};
