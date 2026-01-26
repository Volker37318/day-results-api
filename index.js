import express from "express";

const app = express();

/* =========================
   ✅ CORS – MINIMAL & SICHER
   ========================= */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight (Browser-Vorabprüfung)
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

/* =========================
   API ENDPOINT
   ========================= */
app.post("/day-results", (req, res) => {
  console.log("📥 Received day results:");
  console.log(JSON.stringify(req.body, null, 2));

  // später: Supabase-Insert
  res.status(200).json({ ok: true });
});

/* =========================
   HEALTH / ROOT
   ========================= */
app.get("/", (_req, res) => {
  res.send("day-results-api running");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("🚀 Server listening on port", PORT);
});
