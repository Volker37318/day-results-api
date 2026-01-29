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
   NORMALISIERUNG
========================= */
function normalize(body = {}) {
  const lesson = String(body.lesson_id || "UNKNOWN");

  return {
    klassencode: String(body.klassencode || "UNKNOWN"),
    teilnehmer_code: String(body.participant_id || "unknown"),
    tag_id: lesson,
    lektion_id: lesson,
    startzeit: new Date().toISOString(),
    completed_at: body.completed_at
      ? new Date(body.completed_at).toISOString()
      : new Date().toISOString(),
    results:
      body.results && typeof body.results === "object"
        ? body.results
        : {}
  };
}

/* =========================
   API
========================= */
app.post("/day-results", async (req, res) => {
  try {
    const payload = normalize(req.body);

    const { error } = await supabase
      .from("daily_results")
      .insert(payload);

    if (error) {
      console.error("❌ SUPABASE ERROR:", error);
      return res.status(500).json({
        ok: false,
        reason: "DB_INSERT_FAILED",
        details: error.message
      });
    }

    return res.json({ ok: true });

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
