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

/* ======================================================
   STUFE 2 – GESCHÜTZTE EINTRAGUNGEN
   - validiert Pflichtfelder
   - verhindert kaputte Datensätze
====================================================== */

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

app.post("/day-results", async (req, res) => {
  try {
    const body = req.body;

    // 🔒 0. Grundprüfung
    if (!isPlainObject(body)) {
      return res.status(400).json({
        ok: false,
        reason: "INVALID_BODY"
      });
    }

    // 🔒 1. lesson_id
    if (!isNonEmptyString(body.lesson_id)) {
      return res.status(400).json({
        ok: false,
        reason: "MISSING_LESSON_ID"
      });
    }

    // 🔒 2. participant_id
    if (!isNonEmptyString(body.participant_id)) {
      return res.status(400).json({
        ok: false,
        reason: "MISSING_PARTICIPANT_ID"
      });
    }

    // 🔒 3. day_results
    if (!isPlainObject(body.day_results)) {
      return res.status(400).json({
        ok: false,
        reason: "INVALID_DAY_RESULTS"
      });
    }

    const exerciseKeys = Object.keys(body.day_results);
    if (exerciseKeys.length === 0) {
      return res.status(400).json({
        ok: false,
        reason: "EMPTY_DAY_RESULTS"
      });
    }

    // optional: nur A–E erlauben
    const invalidKey = exerciseKeys.find(
      k => !["A", "B", "C", "D", "E"].includes(k)
    );
    if (invalidKey) {
      return res.status(400).json({
        ok: false,
        reason: "INVALID_EXERCISE_KEY",
        key: invalidKey
      });
    }

    // 🔒 INSERT (wie STUFE 1)
    const row = {
      id: crypto.randomUUID(),
      payload: body,
      received_at: new Date().toISOString(),
      source: "frontend",
      schema_version: 1
    };

    const { error } = await supabase
      .from("day_results")
      .insert(row);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({
        ok: false,
        reason: "DB_INSERT_FAILED"
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
