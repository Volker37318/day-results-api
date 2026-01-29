import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();

/* ======================================================
   BASIS-MIDDLEWARE
   ====================================================== */

// CORS – bewusst offen (für Netlify, Browser, Tests)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// JSON Body Parser
app.use(express.json({ limit: "2mb" }));

/* ======================================================
   SUPABASE CLIENT
   ====================================================== */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   API: DAY RESULTS
   ====================================================== */

app.post("/day-results", async (req, res) => {
  try {
    // 🔒 Pflichtwerte sauber absichern
    const lesson_id = req.body.lesson_id ?? "UNKNOWN";
    const participant_id = req.body.participant_id ?? "unknown";

   const payload = {
  klassencode: req.body.klassencode ?? "UNKNOWN",
  teilnehmer_code: participant_id,
  lektion_id: lesson_id,   // ✅ RICHTIGER SPALTENNAME
  tag_id: lesson_id,       // ✅ NOT NULL erfüllt
  completed_at: req.body.completed_at ?? new Date().toISOString(),
  results: req.body.results ?? {}
};


    const { data, error } = await supabase
      .from("daily_results")
      .insert(payload)
      .select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      data
    });

  } catch (err) {
    console.error("❌ Server crash:", err);
    return res.status(500).json({
      ok: false,
      error: String(err.message || err)
    });
  }
});

/* ======================================================
   HEALTH CHECK
   ====================================================== */

app.get("/", (_req, res) => {
  res.status(200).send("day-results-api running");
});

/* ======================================================
   START SERVER
   ====================================================== */

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("🚀 day-results-api listening on port", PORT);
});
