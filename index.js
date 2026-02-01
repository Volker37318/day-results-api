import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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
   API: 1 ÜBUNG = 1 ZEILE
========================= */
app.post("/day-results", async (req, res) => {
  try {
    const {
      klassencode,
      participant_id,
      lesson_id,
      completed_at,
      day_results
    } = req.body || {};

    if (!klassencode || !participant_id || !lesson_id || !day_results) {
      return res.status(400).json({
        ok: false,
        reason: "MISSING_FIELDS"
      });
    }

    // Wir speichern GENAU EINE Übung pro Request
    const exerciseCode = Object.keys(day_results)[0];
    const exerciseData = day_results[exerciseCode];

    const payload = {
      klassencode,
      participant_id,
      exercise_code: exerciseCode,      // A, B, C, D, E
      completed_at: completed_at
        ? new Date(completed_at).toISOString()
        : new Date().toISOString(),
      result: exerciseData
    };

    const { error } = await supabase
      .from("exercise_results")
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
  console.log("🚀 exercise-results-api running on", PORT);
});
