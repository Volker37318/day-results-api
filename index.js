import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();

/* =========================
   CORS – MINIMAL & SICHER
   ========================= */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight Requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

/* =========================
   SUPABASE CLIENT
   ========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   API ENDPOINT
   ========================= */
app.post("/day-results", async (req, res) => {
  try {
    console.log("📥 Received day results:");
    console.log(JSON.stringify(req.body, null, 2));

    const payload = {
      participant_id: req.body.participant_id ?? "unknown",
      lesson_id: req.body.lesson_id,
      completed_at: req.body.completed_at ?? new Date().toISOString(),
      results: req.body.results ?? req.body.Ergebnisse ?? {}
    };

    if (!payload.lesson_id) {
      return res.status(400).json({
        ok: false,
        error: "lesson_id missing"
      });
    }

    const { error } = await supabase
      .from("daily_results")
      .insert(payload);

    if (error) {
      console.error("❌ Supabase insert failed:", error);
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    console.log("✅ Supabase insert successful");
    res.json({ ok: true });

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    res.status(500).json({
      ok: false,
      error: "internal server error"
    });
  }
});

/* =========================
   HEALTH / ROOT
   ========================= */
app.get("/", (_req, res) => {
  res.send("day-results-api running");
});

/* =========================
   SERVER START
   ========================= */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("🚀 Server listening on port", PORT);
});
