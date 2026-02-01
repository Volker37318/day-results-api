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
   TEST 1 + ZEITFELDER
   - sichere Inserts
   - kein Frontend-Zwang
========================================= */

app.post("/day-results", async (req, res) => {
  try {
    const {
      klassencode,      // Text
      participant_id,   // Text → Teilnehmer-ID
      day_results       // Objekt mit genau 1 Übung
    } = req.body || {};

    if (!klassencode || !participant_id || !day_results) {
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

    // 🔒 Server erzeugt IDs & Zeiten
    const now = new Date().toISOString();

   const payload = {
  "Ausweis": crypto.randomUUID(),
  "Nutzlast": day_results,        // 🔒 NOT NULL
  empfangen_am: now,              // 🔒 NOT NULL

  // bestehende Test-Spalten
  "Klassencode": klassencode,
  "Teilnehmer-ID": participant_id,
  set_id: crypto.randomUUID(),
  "Übungscode": exerciseCode,
  begann_am: now,
  "abgeschlossen am": now
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
