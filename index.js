import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

console.log("🔥🔥🔥 EXERCISE_RESULTS VERSION ACTIVE 🔥🔥🔥");

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/day-results", async (req, res) => {
  console.log("➡️ REQUEST HIT /day-results");

  try {
    const {
      klassencode,
      participant_id,
      lesson_id,
      completed_at,
      day_results
    } = req.body || {};

    // 🟡 Fehlende Pflichtfelder → ruhig abbrechen
    if (!klassencode || !participant_id || !lesson_id || !day_results) {
      console.warn("⚠️ MISSING_FIELDS – skipped");
      return res.status(200).json({ ok: false, skipped: true });
    }

    // 🟡 genau EINE Übung
    const exerciseCode = Object.keys(day_results)[0];
    const exerciseData = day_results[exerciseCode];
    if (!exerciseData) {
      console.warn("⚠️ NO_EXERCISE_DATA – skipped");
      return res.status(200).json({ ok: false, skipped: true });
    }

    const completedAt = completed_at
      ? new Date(completed_at).toISOString()
      : new Date().toISOString();

    // 🟡 Normalisieren
    const durationMs =
      exerciseData.duration_ms ??
      exerciseData.durationMs ??
      exerciseData.timeMs ??
      exerciseData.ms ??
      null;

    const score =
      exerciseData.score ??
      exerciseData.scoreAvg ??
      exerciseData.percent ??
      exerciseData.pct ??
      null;

    const payload = {
      klassencode,
      participant_id,

      set_id: crypto.randomUUID(),
      exercise_code: exerciseCode,

      started_at: completedAt,
      completed_at: completedAt,

      duration_ms: durationMs,
      score: score,

      result: exerciseData
    };

    const { error } = await supabase
      .from("exercise_results")
      .insert(payload);

    // 🔕 KEIN 500 MEHR – API BLEIBT RUHIG
    if (error) {
      console.warn("⚠️ SUPABASE INSERT SKIPPED:", error.message);
      return res.status(200).json({ ok: false, skipped: true });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    // 🔕 Auch hier: kein 500 nach außen
    console.warn("⚠️ SERVER ERROR SKIPPED:", err?.message);
    return res.status(200).json({ ok: false, skipped: true });
  }
});

app.get("/", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("🚀 exercise-results-api running on", PORT);
});

