import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

// --------------------------------------------------
// CORS
// --------------------------------------------------
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --------------------------------------------------
// Supabase
// --------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --------------------------------------------------
// Helper
// --------------------------------------------------
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

const ALLOWED_EXERCISES = ["A", "B", "C", "D", "E"];

// --------------------------------------------------
// POST /day-results
// --------------------------------------------------
app.post("/day-results", async (req, res) => {
  try {
    const body = req.body;

    // 0. Body
    if (!isPlainObject(body)) {
      return res.status(400).json({ ok: false, reason: "INVALID_BODY" });
    }

    // 1. lesson_id
    if (!isNonEmptyString(body.lesson_id)) {
      return res.status(400).json({ ok: false, reason: "MISSING_LESSON_ID" });
    }

    // 2. klassencode
    const klassencode = isNonEmptyString(body.klassencode)
      ? body.klassencode.trim()
      : "UNDEFINED_CLASS";

    // 3. participant_id
    const participant_id = isNonEmptyString(body.participant_id)
      ? body.participant_id.trim()
      : "UNDEFINED_PARTICIPANT";

    // 4. day_results (MEHRERE Übungen erlaubt)
    if (!isPlainObject(body.day_results)) {
      return res.status(400).json({ ok: false, reason: "INVALID_DAY_RESULTS" });
    }

    const exerciseKeys = Object.keys(body.day_results);

    if (
      exerciseKeys.length === 0 ||
      !exerciseKeys.every(k => ALLOWED_EXERCISES.includes(k))
    ) {
      return res.status(400).json({
        ok: false,
        reason: "INVALID_EXERCISE_KEYS",
        keys: exerciseKeys
      });
    }

    // --------------------------------------------------
    // Payload (NICHT verändern!)
    // --------------------------------------------------
    const nowIso = new Date().toISOString();

    const payload = {
      lesson_id: body.lesson_id,
      klassencode,
      participant_id,
      completed_at: isNonEmptyString(body.completed_at)
        ? body.completed_at
        : nowIso,
      day_results: body.day_results, // ✅ D + E bleiben erhalten
      summary: isPlainObject(body.summary) ? body.summary : null
    };

    // --------------------------------------------------
    // Insert
    // --------------------------------------------------
    const row = {
      id: crypto.randomUUID(),
      payload,
      received_at: nowIso,
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

// --------------------------------------------------
app.get("/", (_, res) => res.send("OK"));
app.listen(process.env.PORT || 8000);
