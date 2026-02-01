import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();

/* =========================
   BASIS
========================= */
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* =========================
   SUPABASE
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   API
========================= */
app.post("/day-results", async (req, res) => {
  try {
    const payload = {
      klassencode: String(req.body?.klassencode || "UNKNOWN"),
      participant_id: String(req.body?.participant_id || "unknown"),
      lesson_id: String(req.body?.lesson_id || "UNKNOWN"),
      completed_at: req.body?.completed_at
        ? new Date(req.body.completed_at).toISOString()
        : new Date().toISOString(),
      day_results:
        req.body?.day_results && typeof req.body.day_results === "object"
          ? req.body.day_results
          : {},
      summary:
        req.body?.summary && typeof req.body.summary === "object"
          ? req.body.summary
          : {}
    };

    const { error } = await supabase
      .from("day_results_v2")
      .insert(payload);

    if (error) {
      console.error("❌ SUPABASE ERROR:", error);
      return res.status(500).json({
        ok: false,
        reason: "DB_INSERT_FAILED",
        details: error.message
      });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({
      ok: false,
      reason: "SERVER_CRASH",
      details: String(err)
    });
  }
});

/* =========================
   HEALTH
========================= */
app.get("/", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("🚀 day-results-api running on", PORT);
});
