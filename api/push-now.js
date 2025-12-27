module.exports = async (req, res) => {
  const cronKey = process.env.PUSH_CRON_KEY;
  if (cronKey) {
    const got = req.query?.key;
    if (got !== cronKey) return res.status(401).json({ error: "Unauthorized" });
  }

  // Redirect ke push-daily biar reuse logic
  return res.writeHead(302, { Location: `/api/push-daily?key=${encodeURIComponent(req.query.key)}` }).end();
};
