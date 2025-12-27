// /api/push-daily.js
const webpush = require("web-push");

// WIB date string: YYYY-MM-DD
function getWIBDateString(d = new Date()) {
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWIBDayOfWeek(d = new Date()) {
  // 0=Sunday ... 6=Saturday
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  return new Date(wibMs).getUTCDay();
}

async function sbGet(path, serviceRoleKey, supabaseUrl) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase GET failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPatch(path, body, serviceRoleKey, supabaseUrl) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH failed: ${res.status} ${await res.text()}`);
}

// ---------- Quran API ID ----------
async function fetchRandomAyah(quranBase) {
  const res = await fetch(`${quranBase}/random`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Quran API error: ${res.status} ${await res.text()}`);
  const j = await res.json();

  // Defensif: coba ambil dari beberapa bentuk struktur yang mungkin
  const data = j?.data ?? j ?? {};
  const arab =
    data?.arab ??
    data?.text?.arab ??
    data?.text_arab ??
    data?.ayah?.arab ??
    data?.verse?.text?.arab ??
    "";

  const idTrans =
    data?.translation ??
    data?.text?.translation ??
    data?.translation?.id ??
    data?.ayah?.translation ??
    data?.verse?.translation ??
    data?.id ??
    "";

  const surahName =
    data?.surah?.name?.transliteration?.id ??
    data?.surah?.name?.short ??
    data?.surah?.name ??
    data?.surat?.nama ??
    data?.surah ??
    "Al-Qur'an";

  const surahNo = data?.surah?.number ?? data?.surah_number ?? data?.surat?.nomor ?? data?.surahNo;
  const ayahNo = data?.number?.inSurah ?? data?.ayah_number ?? data?.nomorAyat ?? data?.ayah ?? data?.number;

  const ref = surahNo && ayahNo ? `QS. ${surahName} ${surahNo}:${ayahNo}` : `QS. ${surahName}`;

  // body push jangan kepanjangan
  const cleanTrans = (idTrans || "").toString().replace(/\s+/g, " ").trim();
  const short = cleanTrans.length > 170 ? cleanTrans.slice(0, 170).trim() + "…" : cleanTrans;

  return {
    title: "Ayat Hari Ini",
    body: short ? `“${short}”\n(${ref})` : `(${ref})`,
    url: "/rekap.html",
    meta: { type: "quran", ref, arab },
  };
}

// ---------- Hadis API ID ----------
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchHadithBooks(hadithBase) {
  const res = await fetch(`${hadithBase}/hadith`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Hadith API books error: ${res.status} ${await res.text()}`);
  const j = await res.json();
  // Bentuk umum: { data: [...] } atau langsung [...]
  return j?.data ?? j ?? [];
}

async function fetchHadithByNumber(hadithBase, slug, number) {
  const res = await fetch(`${hadithBase}/hadith/${slug}/${number}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Hadith API hadith error: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j?.data ?? j ?? {};
}

async function fetchRandomHadith(hadithBase) {
  // Ambil daftar perawi dari API (lebih aman daripada hardcode)
  const books = await fetchHadithBooks(hadithBase);

  // Kalau API tidak ngasih struktur lengkap, fallback ke daftar slug umum
  const fallbackSlugs = [
    "bukhari",
    "muslim",
    "abu-dawud",
    "tirmidzi",
    "nasai",
    "ibnu-majah",
    "malik",
    "ahmad",
    "darimi",
  ];

  // Coba ambil slug + total dari API
  let candidates = books
    .map((b) => ({
      slug: b?.slug || b?.id || b?.name || b?.key,
      name: b?.name || b?.title || b?.arab || b?.slug || "Hadis",
      total:
        b?.total ||
        b?.count ||
        b?.hadiths ||
        b?.available ||
        b?.jumlah ||
        null,
    }))
    .filter((x) => x.slug);

  if (candidates.length === 0) {
    candidates = fallbackSlugs.map((s) => ({ slug: s, name: s, total: null }));
  }

  const chosen = pickRandom(candidates);

  // Tentukan nomor hadis random
  // Kalau ada total → random 1..total
  // Kalau tidak ada → pakai range aman 1..3000 (defensif)
  const max = Number.isFinite(Number(chosen.total)) ? Number(chosen.total) : 3000;
  const nomor = Math.max(1, Math.floor(Math.random() * max) + 1);

  const hadith = await fetchHadithByNumber(hadithBase, chosen.slug, nomor);

  const teks =
    hadith?.id ??
    hadith?.hadith ??
    hadith?.text ??
    hadith?.content ??
    hadith?.terjemah ??
    "";

  const clean = (teks || "").toString().replace(/\s+/g, " ").trim();
  const short = clean.length > 170 ? clean.slice(0, 170).trim() + "…" : clean;

  const ref = `HR. ${chosen.name || chosen.slug} no. ${nomor}`;

  return {
    title: "Hadis Hari Ini",
    body: short ? `“${short}”\n(${ref})` : `(${ref})`,
    url: "/rekap.html",
    meta: { type: "hadith", ref, slug: chosen.slug, nomor },
  };
}

// ---------- Main ----------
module.exports = async (req, res) => {
  try {
    // Kunci endpoint (opsional tapi recommended)
    const cronKey = process.env.PUSH_CRON_KEY;
    if (cronKey) {
      const got = req.query?.key;
      if (got !== cronKey) return res.status(401).json({ error: "Unauthorized" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    const QURAN_API_BASE = process.env.QURAN_API_BASE || "https://quran-api-id.vercel.app";
    const HADITH_API_BASE = process.env.HADITH_API_BASE || "https://hadis-api-id.vercel.app";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({
        error: "Missing env vars",
        required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"],
      });
    }

    webpush.setVapidDetails("mailto:admin@yaumiyah.local", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const todayWIB = getWIBDateString();
    const dow = getWIBDayOfWeek(); // 0..6

    // Pola rotasi (simple & enak):
    // Senin/Rabu/Jumat: Ayat
    // Selasa/Kamis/Sabtu: Hadis
    // Ahad: Ayat (tadabbur)
    const shouldQuran = [1, 3, 5, 0].includes(dow);

    // 1) Siapkan konten dari API luar (dengan fallback)
    let content;
    try {
      content = shouldQuran
        ? await fetchRandomAyah(QURAN_API_BASE)
        : await fetchRandomHadith(HADITH_API_BASE);
    } catch (e) {
      // fallback ke daily_content Supabase kalau API luar lagi down
      const rows = await sbGet(
        `daily_content?content_date=eq.${todayWIB}&select=title,body,url,kind`,
        SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_URL
      );
      const row = rows?.[0];
      content = row
        ? { title: row.title, body: row.body, url: row.url || "/rekap.html", meta: { type: row.kind || "fallback" } }
        : { title: "Pesan Harian", body: "Buka aplikasi untuk membaca pesan hari ini.", url: "/rekap.html", meta: { type: "fallback" } };
    }

    // 2) Ambil semua subscriber aktif
    const subs = await sbGet(
      `push_subscriptions?is_active=eq.true&select=id,endpoint,p256dh,auth`,
      SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL
    );

    let sent = 0;
    let failed = 0;

    // 3) Kirim push
    const payload = JSON.stringify({
      title: content.title,
      body: content.body,
      url: content.url || "/rekap.html",
    });

    for (const s of subs) {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (e) {
        failed++;
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          // endpoint mati → nonaktifkan
          try {
            await sbPatch(
              `push_subscriptions?id=eq.${s.id}`,
              { is_active: false },
              SUPABASE_SERVICE_ROLE_KEY,
              SUPABASE_URL
            );
          } catch (_) {}
        }
      }
    }

    return res.status(200).json({
      ok: true,
      date_wib: todayWIB,
      type: content?.meta?.type || (shouldQuran ? "quran" : "hadith"),
      subscribers: subs.length,
      sent,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
};
