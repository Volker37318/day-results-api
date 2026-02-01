import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

/* =========================================
   IDENTISCHE ZEIT-LOGIK WIE IM FRONTEND
========================================= */
function pickDurationMs(obj) {
  if (!obj || typeof obj !== "object") return 0;
  const cands = [
    obj.durationMs,
    obj.duration_ms,
    obj.timeMs,
    obj.ms,
    obj.duration,
    obj.time
  ];
  for (const v of cands) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) {
      return n < 1000 ? n * 1000 : n;
    }
  }
  return 0;
}

app.post("/day-results", async (req, res) => {
  try {
    const { klassencode, participant_id, day_results } = req.body || {};

    if (!klassencode || !participant_id || !day_results) {
      return res.status(400).json({
        ok: false,
        reason: "MISSING_FIELDS"
      });
    }

    // 🔒 GENAU EINE ÜBUNG
    const exerciseCode = Object.keys(day_results)[0];
    const exerciseData = day_results[exerciseCode];

    const now = new Date().toISOString();

    // 🔒 FINALER, FEST VERDRAHTETER PAYLOAD
    // 🔒 1:1 zu den Spalten in Supabase
    const payload = {
      "Klassencode": klassencode,
      "Teilnehmer-ID": participant_id,
      set_id: crypto.randomUUID(),
      "Übungscode": exerciseCode,
      begann_am: now,
      "abgeschlossen am": now,
      "Dauer_ms": pickDurationMs(exerciseData),
      "Ergebnis": exerciseData
      // empfangen_am → wird automatisch von Supabase gesetzt
    };

    const { error } = await supabase
      .from("exercise_results")
      .insert(payload);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({
        ok: false,
        reason: "DB_INSERT_FAILED",
        details: error.message
      });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

app.get("/", (_, res) => res.send("OK"));

app.listen(process.env.PORT || 8000);
