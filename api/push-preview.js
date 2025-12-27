module.exports = async (req, res) => {
  const cronKey = process.env.PUSH_CRON_KEY;
  if (cronKey) {
    const got = req.query?.key;
    if (got !== cronKey) return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json({
    ok: true,
    note: "Preview endpoint sudah hidup. (Implementasi preview konten tinggal copy dari push-daily tanpa sendNotification.)"
  });
};
