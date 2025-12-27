// /api/push-daily.js
// Vercel Serverless Function (Node.js)
// Kirim notifikasi harian ke semua subscriber aktif di Supabase

const webpush = require("web-push");

/**
 * WIB date string: YYYY-MM-DD
 */
function getWIBDateString(d = new Date()) {
  // WIB = UTC+7
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);

  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function supabaseGet(path, serviceRoleKey, supabaseUrl) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase GET failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function supabasePatch(path, body, serviceRoleKey, supabaseUrl) {
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

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase PATCH failed: ${res.status} ${txt}`);
  }
}

module.exports = async (req, res) => {
  try {
    // (Opsional tapi disarankan) kunci endpoint biar tidak sembarang orang spam kirim push:
    // panggil /api/push-daily?key=SECRET dan cek env PUSH_CRON_KEY
    const cronKey = process.env.PUSH_CRON_KEY;
    if (cronKey) {
      const got = req.query?.key;
      if (got !== cronKey) return res.status(401).json({ error: "Unauthorized" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({
        error: "Missing env vars",
        required: [
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "VAPID_PUBLIC_KEY",
          "VAPID_PRIVATE_KEY",
        ],
      });
    }

    // Set VAPID (email ini bebas, cuma identitas pengirim)
    webpush.setVapidDetails("mailto:admin@yaumiyah.local", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const todayWIB = getWIBDateString();

    // 1) Ambil konten hari ini
    const contents = await supabaseGet(
      `daily_content?content_date=eq.${todayWIB}&select=title,body,source,url,kind`,
      SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL
    );

    // fallback kalau hari ini belum ada konten
    const content = contents?.[0] || {
      title: "Pesan Harian",
      body: "Konten hari ini belum diisi. Buka aplikasi untuk update.",
      source: null,
      url: "/rekap.html",
      kind: "pesan",
    };

    // 2) Ambil semua subscriber aktif
    const subs = await supabaseGet(
      `push_subscriptions?is_active=eq.true&select=id,endpoint,p256dh,auth`,
      SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL
    );

    let sent = 0;
    let failed = 0;

    // 3) Kirim push satu-satu
    for (const s of subs) {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };

      const payload = JSON.stringify({
        title: content.title,
        body: content.body,
        url: content.url || "/rekap.html",
      });

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (e) {
        failed++;

        // Kalau endpoint sudah mati/expired → nonaktifkan biar bersih
        // 404/410 biasanya "gone"
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          try {
            await supabasePatch(
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
      subscribers: subs.length,
      sent,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
};
