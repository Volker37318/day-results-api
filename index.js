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
   TEST 1 – NUR DIE ERSTEN 5 SPALTEN
========================================= */

app.post("/day-results", async (req, res) => {
  try {
    const {
      ausweis,          // uuid
      klassencode,      // text
      participant_id,   // text → Teilnehmer-ID
      day_results       // object mit genau 1 Übung
    } = req.body || {};

    if (!ausweis || !klassencode || !participant_id || !day_results) {
      return res.status(400).json({
        ok: false,
        reason: "MISSING_FIELDS"
      });
    }

    // 🔒 GENAU EINE ÜBUNG
    const exerciseCode = Object.keys(day_results)[0];

    if (!exerciseCode) {
      return res.status(400).json({
        ok: false,
        reason: "NO_EXERCISE_CODE"
      });
    }

    // 🔒 TEST-1-PAYLOAD
    // 🔒 EXAKT DIE ERSTEN 5 SPALTEN
    const payload = {
      "Ausweis": ausweis,
      "Klassencode": klassencode,
      "Teilnehmer-ID": participant_id,
      set_id: crypto.randomUUID(),
      "Übungscode": exerciseCode
    };

    const { error } = await supabase
      .from("day_results")
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
